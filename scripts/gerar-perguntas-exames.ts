// Gera perguntas do quiz a partir das provas discursivas transcritas em content/exames.
//
//   content/perguntas/exames-reais.yaml          "Peça e fundamento" com o enunciado real da peça (sai como rascunho
//                                                e precisa ser resumido à mão: o quiz só usa casos de até 700
//                                                caracteres, ver MAX_CASO_PECA em src/quiz/banco.ts)
//   content/perguntas/discursivas/<exame>.yaml   "Por dentro da peça" (um item da tabela por pergunta)
//                                                e "Questões discursivas" (um subitem A/B por pergunta), no formato
//                                                de teses (PerguntaTese em src/quiz/types.ts)
//
// Só vira pergunta o item que tem artigo (o fácil pergunta o artigo da tese, e o difícil pede os dois): endereçamento,
// prazo e os itens sem dispositivo ficam de fora. A pergunta, a tese e a introdução de cada parte saem como rascunho
// e precisam ser escritas à mão (ver docs/COMO-ADICIONAR.md): a tese nomeia o instituto e se lê sem a pergunta.
//
// Ao rodar de novo, o que já estiver com revisao.status: revisado é preservado, assim como as introduções escritas e a
// lista `fora` (itens deixados de fora de propósito, que não são recriados).
//
// Uso: node scripts/gerar-perguntas-exames.ts
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse, stringify } from "yaml";
import { ExameSchema, type Exame, type Item, type Leis } from "../src/content/schema.ts";
import { buildLexico, extrairCitacoes, type Citacao } from "../src/lib/correcao/citacoes.ts";
import { normalize } from "../src/lib/correcao/normalize.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const CONTENT = join(ROOT, "content");
const DIR_DISC = join(CONTENT, "perguntas", "discursivas");
const ARQ_REAIS = join(CONTENT, "perguntas", "exames-reais.yaml");

const semMarkdown = (s: string) => s.replace(/\*\*|\*|__/g, "").replace(/\n{3,}/g, "\n\n").trim();
const semPontos = (s: string) => s.replace(/\s*\(\s*\d,\d{2}(?:\s*\/\s*\d,\d{2})*\s*\)/g, "").replace(/\s+([.,;:])/g, "$1").trim();
const idSeguro = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const RASCUNHO = { status: "rascunho" };

type Tipo = "enderecamento" | "prazo" | "fundamento" | "preliminar" | "merito" | "pedido" | "fechamento";

const DATA = /\b\d{1,2}[./]\d{1,2}[./]\d{2,4}\b|\b\d{1,2} de [a-zç]+ de \d{4}\b|[úu]ltimo dia do prazo/;

/** Tipo do item pela descrição; a seção (de grafia muito variada) só desempata. */
function tipoDoItem(i: Item): Tipo {
  const d = i.descricao.toLowerCase();
  const s = (i.secao ?? "").toLowerCase();
  if (/fundament(o|a[çc][ãa]o) legal|dispositivos? lega(l|is) que|^cabimento|cabimento do recurso|^fundamento:/.test(d)) return "fundamento";
  if (/^(endere[çc]amento|ju[ií]zo|excelent|a pe[çc]a deve ser (endere[çc]ada|encaminhada|dirigida)|a peti[çc][ãa]o deve ser|interposi[çc][ãa]o:)/.test(d)) return "enderecamento";
  if (/fechamento|local,? data|assinatura|^estrutura|^oab|advogad[oa],? oab/.test(d) || (DATA.test(d) && !/dias/.test(d))) return "fechamento";
  if (/^(prazo|tempestiv)/.test(d)) return "prazo";
  if (/^(pedido|requer|o pedido|conhecimento e provimento)/.test(d)) return "pedido";
  if (/^(preliminar|nulidade|incompet[eê]ncia|extin[çc][ãa]o da punibilidade|prescri|in[eé]pcia)/.test(d)) return "preliminar";
  if (/endere[çc]amento/.test(s)) return "enderecamento";
  if (/fechamento|estrutura/.test(s)) return "fechamento";
  if (/prazo|tempestiv/.test(s)) return "prazo";
  if (/pedido/.test(s)) return "pedido";
  if (/preliminar/.test(s)) return "preliminar";
  return "merito";
}

const COMANDO: Record<Exclude<Tipo, "fundamento" | "fechamento">, (razoes: boolean) => string> = {
  enderecamento: (razoes) => (razoes ? "A quem devem ser endereçadas as razões?" : "A quem deve ser endereçada a peça?"),
  prazo: () => "Qual o prazo da peça e o seu fundamento?",
  preliminar: () => "Que tese preliminar deve ser alegada na peça, e com qual fundamento?",
  merito: () => "Que tese de mérito deve ser desenvolvida na peça, e com qual fundamento?",
  pedido: () => "Que pedido deve ser formulado na peça?",
};

const dispositivosDe = (itens: Item[]) => [...new Set(itens.flatMap((i) => i.componentes.flatMap((c) => c.dispositivo ?? [])))];
const soArtigos = (specs: string[]) => specs.filter((s) => !/s[úu]mula/i.test(s));

function lerExames(): Exame[] {
  const dir = join(CONTENT, "exames");
  return readdirSync(dir)
    .filter((d) => existsSync(join(dir, d, "exame.yaml")))
    .sort()
    .map((d) => ExameSchema.parse(parse(readFileSync(join(dir, d, "exame.yaml"), "utf8"))))
    .filter((e) => e.corrigivel);
}

/** Divide o enunciado nos subitens em negrito: "**A) …**". */
function subitens(enunciado: string): { caso: string; partes: { letra: string; comando: string }[] } {
  const re = /\*\*\s*([A-D])\)\s*([\s\S]*?)\*\*/g;
  const partes: { letra: string; comando: string }[] = [];
  let inicio = -1;
  for (const m of enunciado.matchAll(re)) {
    if (inicio < 0) inicio = m.index ?? 0;
    partes.push({ letra: m[1], comando: semMarkdown(m[2]).replace(/\s*\(\s*valor:[^)]*\)/i, "").trim() });
  }
  return { caso: semMarkdown(inicio < 0 ? enunciado : enunciado.slice(0, inicio)), partes };
}

/** Trecho do gabarito comentado que começa em "A)" até o próximo subitem. */
function trechoGabarito(gabarito: string, letra: string): string {
  const m = gabarito.match(new RegExp(`(?:^|\\n)\\s*\\**${letra}\\)\\**\\s*([\\s\\S]*?)(?=\\n\\s*\\**[A-D]\\)|$)`));
  return semMarkdown(m ? m[1] : gabarito);
}

const exames = lerExames();
const frequencia = new Map<string, number>();
for (const e of exames) frequencia.set(e.peca.tipo, (frequencia.get(e.peca.tipo) ?? 0) + 1);
const pecasComuns = [...frequencia.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);

// Os artigos de um item: os dispositivos da rubrica ou, sem eles, os citados na descrição ou no padrão de respostas.
const leis = JSON.parse(readFileSync(join(ROOT, "src", "content", "generated", "leis.json"), "utf8")) as Leis;
const lexico = buildLexico(leis);
const ROMANOS = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]] as const;
const romano = (n: number) => ROMANOS.reduce((s, [v, r]) => { for (; n >= v; n -= v) s += r; return s; }, "");
const SIGLAS: Record<string, string> = { cp: "CP", cpp: "CPP", lep: "LEP", cf: "CRFB", lcp: "LCP" };
const sigla = (d: string) => SIGLAS[d] ?? (leis.diplomas[d]?.numero ? `Lei ${leis.diplomas[d].numero}` : d);
/** Uma citação vira uma spec por combinação: "art. 386, III ou VI" são duas alternativas. */
function specs(c: Citacao): string[] {
  if (c.tipo === "sumula") return [`Súmula ${c.vinculante ? "Vinculante " : ""}${c.n} ${c.tribunal?.toUpperCase() ?? ""}`.trim()];
  if (!c.diploma) return [];
  const out: string[] = [];
  for (const p of c.pars.length ? c.pars : [""])
    for (const i of c.incs.length ? c.incs : [""])
      for (const a of c.als.length ? c.als : [""])
        out.push([`art. ${c.art}`, p && (p === "unico" ? "parágrafo único" : `§ ${p}º`), i && romano(Number(i)), a, sigla(c.diploma)].filter(Boolean).join(", "));
  return out;
}
const citados = (texto: string) => [...new Set(extrairCitacoes(normalize(texto), lexico).flatMap(specs))];
function artigosDo(item: Item, gabarito: string): string[] {
  const daRubrica = dispositivosDe([item]);
  if (daRubrica.length) return daRubrica;
  const daDescricao = citados(item.descricao);
  return daDescricao.length ? daDescricao : citados(gabarito);
}
/** O componente do ponto central (o que não é o dispositivo) dá a tese e os termos aceitos. */
function pontoCentral(item: Item) {
  const c = item.componentes.find((x) => !x.dispositivo && (x.termos || x.alternativas)) ?? item.componentes.find((x) => x.termos || x.alternativas);
  return {
    tese: semPontos(c?.rotulo ?? item.descricao).replace(/\.$/, ""),
    aceitos: c ? (c.alternativas ?? [c.termos!]) : [["TODO"]],
  };
}

/**
 * As revisadas substituem as geradas de mesmo id, e as que o gerador não produziria (um artigo posto à mão, por
 * exemplo) continuam no arquivo, logo depois da pergunta que as precedia.
 */
function preservarRevisadas<T extends { id: string; revisao?: { status?: string } }>(antigas: T[], novas: T[]): T[] {
  const revisadas = new Map(antigas.filter((p) => p.revisao?.status === "revisado").map((p) => [p.id, p]));
  const final = novas.map((p) => revisadas.get(p.id) ?? p);
  const ids = new Set(final.map((p) => p.id));
  antigas.forEach((p, k) => {
    if (ids.has(p.id) || p.revisao?.status !== "revisado") return;
    const anterior = antigas.slice(0, k).reverse().find((a) => ids.has(a.id));
    final.splice(anterior ? final.findIndex((f) => f.id === anterior.id) + 1 : 0, 0, p);
    ids.add(p.id);
  });
  return final;
}
const lerYaml = (arquivo: string) => (existsSync(arquivo) ? parse(readFileSync(arquivo, "utf8")) : null) ?? {};
const resumoRascunho = (enunciado: string) => `RASCUNHO: ${semMarkdown(enunciado).replace(/\s+/g, " ").slice(0, 300)}`;

mkdirSync(DIR_DISC, { recursive: true });
const reais: Record<string, unknown>[] = [];
let totalItens = 0;

for (const e of exames) {
  const casoPeca = semMarkdown(e.peca.enunciado);
  const fonte = `${e.numeral} Exame`;

  // Peça e fundamento
  const itemFundamento = e.peca.itens.find((i) => tipoDoItem(i) === "fundamento" && soArtigos(dispositivosDe([i])).length);
  const fundamentos = itemFundamento ? soArtigos(dispositivosDe([itemFundamento])) : [];
  if (fundamentos.length) {
    reais.push({
      id: `exame-${idSeguro(e.id)}-peca`,
      caso: casoPeca,
      comando: "Qual a peça cabível e o seu fundamento legal?",
      peca: e.peca.tipo,
      fundamentos,
      explicacao: `Padrão de respostas do ${fonte}: ${semPontos(itemFundamento!.descricao)}`,
      fonte,
      distratores: pecasComuns.filter((t) => t !== e.peca.tipo).slice(0, 5),
      revisao: RASCUNHO,
    });
  }

  const arquivo = join(DIR_DISC, `${e.id}.yaml`);
  const antigo = lerYaml(arquivo);
  const fora = new Set<string>(antigo.fora ?? []);
  const introducoes: Record<string, string> = { ...(antigo.introducoes ?? {}) };
  const perguntas: Record<string, unknown>[] = [];
  const nova = (p: Record<string, unknown>, enunciado: string) => {
    if (fora.has(p.id as string)) return;
    introducoes[p.parte as string] ??= resumoRascunho(enunciado);
    perguntas.push(p);
  };
  // Por dentro da peça
  for (const i of e.peca.itens) {
    const tipo = tipoDoItem(i);
    if (tipo === "fundamento" || tipo === "fechamento" || tipo === "enderecamento" || tipo === "prazo" || !i.componentes.length) continue;
    const artigos = artigosDo(i, i.descricao);
    if (!artigos.length) continue;
    nova(
      {
        id: `${idSeguro(e.id)}-peca-${idSeguro(String(i.n))}`,
        categoria: "peca-detalhe",
        parte: "peca",
        item: String(i.n),
        secao: tipo,
        pergunta: `RASCUNHO: ${COMANDO[tipo](/raz/i.test(i.secao ?? ""))}`,
        ...pontoCentral(i),
        artigos,
        gabarito: semPontos(i.descricao),
        revisao: RASCUNHO,
      },
      e.peca.enunciado,
    );
  }
  // Questões discursivas
  e.questoes.forEach((q, k) => {
    const { partes } = subitens(q.enunciado);
    for (const { letra, comando } of partes) {
      // a pergunta usa o item do subitem; com vários (A1, A2), o primeiro com componentes
      const item = q.itens.find((i) => String(i.n).replace(/[.\d]+$/, "") === letra && i.componentes.length);
      if (!item) continue;
      const gabarito = trechoGabarito(q.gabarito_comentado, letra);
      const artigos = artigosDo(item, gabarito);
      if (!artigos.length) continue;
      nova(
        {
          id: `${idSeguro(e.id)}-q${k + 1}-${letra.toLowerCase()}`,
          categoria: "discursiva",
          parte: `q${k + 1}`,
          item: String(item.n),
          pergunta: `RASCUNHO: ${comando}`,
          ...pontoCentral(item),
          artigos,
          gabarito,
          revisao: RASCUNHO,
        },
        q.enunciado,
      );
    }
  });

  const finais = preservarRevisadas((antigo.perguntas ?? []) as { id: string }[], perguntas as { id: string }[]);
  totalItens += finais.length;
  writeFileSync(
    arquivo,
    `# Teses de "Por dentro da peça" e "Questões discursivas" (ver PerguntaTese em src/quiz/types.ts e docs/COMO-ADICIONAR.md).\n` +
      stringify({ exame: e.id, introducoes, ...(fora.size ? { fora: [...fora] } : {}), perguntas: finais }, { lineWidth: 0 }),
  );
}

const finaisReais = preservarRevisadas((lerYaml(ARQ_REAIS).perguntas ?? []) as { id: string }[], reais as { id: string }[]);
writeFileSync(
  ARQ_REAIS,
  `# Gerado por scripts/gerar-perguntas-exames.ts: "Peça e fundamento" com o enunciado real de cada exame.\n` +
    stringify({ perguntas: finaisReais }, { lineWidth: 0 }),
);
console.log(`${exames.length} exames · ${finaisReais.length} perguntas de peça · ${totalItens} perguntas de itens e questões`);
