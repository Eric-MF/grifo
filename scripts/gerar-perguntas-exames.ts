// Gera perguntas do quiz a partir das provas discursivas transcritas em content/exames.
//
//   content/perguntas/exames-reais.yaml          "Peça e fundamento" com o enunciado real da peça (sai como rascunho
//                                                e precisa ser resumido à mão: o quiz só usa casos de até 700
//                                                caracteres, ver MAX_CASO_PECA em src/quiz/banco.ts)
//   content/perguntas/discursivas/<exame>.yaml   "Por dentro da peça" (um item da tabela por pergunta)
//                                                e "Questões discursivas" (um subitem A/B por pergunta)
//
// Tudo sai como rascunho. Ao rodar de novo, o que já estiver com revisao.status: revisado é preservado.
//
// Uso: node scripts/gerar-perguntas-exames.ts
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse, stringify } from "yaml";
import { ExameSchema, type Exame, type Item } from "../src/content/schema.ts";

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

// Banco de descrições por tipo de item, para as alternativas erradas do nível fácil.
const banco = new Map<string, { exame: string; pecaTipo: string; texto: string }[]>();
for (const e of exames) {
  for (const i of e.peca.itens) {
    const t = tipoDoItem(i);
    if (!banco.has(t)) banco.set(t, []);
    banco.get(t)!.push({ exame: e.id, pecaTipo: e.peca.tipo, texto: semPontos(i.descricao) });
  }
  e.questoes.forEach((q) =>
    q.itens.forEach((i) => {
      if (!banco.has("questao")) banco.set("questao", []);
      banco.get("questao")!.push({ exame: e.id, pecaTipo: e.peca.tipo, texto: semPontos(i.descricao) });
    }),
  );
}
const palavras = (t: string) =>
  new Set(
    t
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 4),
  );
/** Alternativas erradas não podem dizer quase o mesmo que a certa. */
function parecida(a: string, b: string) {
  const x = palavras(a);
  const y = palavras(b);
  const comum = [...x].filter((w) => y.has(w)).length;
  return comum / Math.max(1, Math.min(x.size, y.size)) >= 0.6;
}
function erradas(tipo: string, exame: string, pecaTipo: string, correta: string, n = 5): string[] {
  const pool = (banco.get(tipo) ?? []).filter((x) => x.exame !== exame && x.texto.length > 15 && !parecida(x.texto, correta));
  const mesmaPeca = pool.filter((x) => x.pecaTipo === pecaTipo);
  const ordem = [...mesmaPeca, ...pool.filter((x) => x.pecaTipo !== pecaTipo)];
  // determinístico: espalha pela lista em vez de sortear, para a regeração não mudar à toa
  const passo = Math.max(1, Math.floor(ordem.length / n));
  return [...new Set(ordem.filter((_, k) => k % passo === 0).map((x) => x.texto))].slice(0, n);
}

function preservarRevisadas<T extends { id: string; revisao?: { status?: string } }>(arquivo: string, chave: string, novas: T[]): T[] {
  if (!existsSync(arquivo)) return novas;
  const antigas: T[] = parse(readFileSync(arquivo, "utf8"))?.[chave] ?? [];
  const revisadas = new Map(antigas.filter((p) => p.revisao?.status === "revisado").map((p) => [p.id, p]));
  return novas.map((p) => revisadas.get(p.id) ?? p);
}

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

  const perguntas: Record<string, unknown>[] = [];
  // Por dentro da peça
  for (const i of e.peca.itens) {
    const tipo = tipoDoItem(i);
    if (tipo === "fundamento" || tipo === "fechamento" || !i.componentes.length) continue;
    const correta = semPontos(i.descricao);
    const opcoesErradas = erradas(tipo, e.id, e.peca.tipo, correta);
    if (opcoesErradas.length < 2) continue;
    perguntas.push({
      id: `${idSeguro(e.id)}-peca-${idSeguro(String(i.n))}`,
      categoria: "peca-detalhe",
      parte: "peca",
      item: String(i.n),
      secao: tipo,
      caso: casoPeca,
      comando: COMANDO[tipo](/raz/i.test(i.secao ?? "")),
      gabarito: correta,
      opcoes: { correta, erradas: opcoesErradas },
      revisao: RASCUNHO,
    });
  }
  // Questões discursivas
  e.questoes.forEach((q, k) => {
    const { caso, partes } = subitens(q.enunciado);
    for (const { letra, comando } of partes) {
      const itens = q.itens.filter((i) => String(i.n).replace(/[.\d]+$/, "") === letra);
      if (!itens.length || !itens.some((i) => i.componentes.length)) continue;
      const correta = itens.map((i) => semPontos(i.descricao)).join(" ");
      const opcoesErradas = erradas("questao", e.id, e.peca.tipo, correta);
      if (opcoesErradas.length < 2) continue;
      // a pergunta usa o item do subitem; com vários (A1, A2), o primeiro com componentes
      const item = itens.find((i) => i.componentes.length)!;
      perguntas.push({
        id: `${idSeguro(e.id)}-q${k + 1}-${letra.toLowerCase()}`,
        categoria: "discursiva",
        parte: `q${k + 1}`,
        item: String(item.n),
        caso,
        comando,
        gabarito: trechoGabarito(q.gabarito_comentado, letra),
        opcoes: { correta, erradas: opcoesErradas },
        revisao: RASCUNHO,
      });
    }
  });

  const arquivo = join(DIR_DISC, `${e.id}.yaml`);
  const finais = preservarRevisadas(arquivo, "perguntas", perguntas as { id: string }[]);
  totalItens += finais.length;
  writeFileSync(
    arquivo,
    `# Gerado por scripts/gerar-perguntas-exames.ts.\n` +
      stringify({ exame: e.id, perguntas: finais }, { lineWidth: 0 }),
  );
}

const finaisReais = preservarRevisadas(ARQ_REAIS, "perguntas", reais as { id: string }[]);
writeFileSync(
  ARQ_REAIS,
  `# Gerado por scripts/gerar-perguntas-exames.ts: "Peça e fundamento" com o enunciado real de cada exame.\n` +
    stringify({ perguntas: finaisReais }, { lineWidth: 0 }),
);
console.log(`${exames.length} exames · ${finaisReais.length} perguntas de peça · ${totalItens} perguntas de itens e questões`);
