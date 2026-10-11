// Extrai as questões de Direito Penal e Processo Penal do caderno Tipo 1 da 1ª fase
// (.examples/fgv/<NN>/objetiva/) para content/objetivas/<NN>.yaml, com o gabarito definitivo.
//
// A faixa de cada disciplina é sugerida por palavras-chave e precisa ser conferida à mão:
// o arquivo sai como rascunho. Um arquivo que já existe só é refeito com --force.
//
// Uso: node scripts/extrair-objetivas.ts 47 46 … [--force]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { parse, stringify } from "yaml";
import { LeisSchema, PecasCatalogoSchema } from "../src/content/schema.ts";
import { buildLexico, extrairCitacoes, toRoman } from "../src/lib/correcao/citacoes.ts";
import { normalize, termToRegex } from "../src/lib/correcao/normalize.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const FGV = join(ROOT, ".examples", "fgv");
const OUT = join(ROOT, "content", "objetivas");
const args = process.argv.slice(2);
const forcar = args.includes("--force");
const exames = args.filter((a) => /^\d+$/.test(a));

const leis = LeisSchema.parse(parse(readFileSync(join(ROOT, "content/leis.yaml"), "utf8")));
const pecas = PecasCatalogoSchema.parse(parse(readFileSync(join(ROOT, "content/pecas.yaml"), "utf8")));
const lex = buildLexico(leis);

async function linhasDoPdf(caminho: string): Promise<string[]> {
  const doc = await getDocument({ data: new Uint8Array(readFileSync(caminho)), verbosity: 0 }).promise;
  const linhas: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const { items } = await (await doc.getPage(i)).getTextContent();
    const texto = items.map((it) => ("str" in it ? it.str + (it.hasEOL ? "\n" : "") : "")).join("");
    linhas.push(...texto.split("\n").map((l) => l.trim()).filter(Boolean));
  }
  return linhas;
}

/** Linha cifrada (fonte sem mapa de caracteres): muitos símbolos fora do alfabeto latino. */
const cifrada = (linha: string) => {
  const estranhos = [...linha].filter((c) => /[^\x20-\x7EÀ-ÿ–—“”‘’ºª°§•]/.test(c)).length;
  return estranhos / Math.max(1, linha.length) > 0.05;
};

const juntar = (linhas: string[]) =>
  linhas.reduce((acc, l) => (acc.endsWith("-") && /^[a-zà-ú]/.test(l) ? acc.slice(0, -1) + l : acc ? `${acc} ${l}` : l), "");

/** "(A) texto" ou "A) texto" */
const ALTERNATIVA = /^\(?([A-D])\)\s*(.*)$/;

interface Bruta {
  n: number;
  enunciado: string;
  alternativas: Record<"A" | "B" | "C" | "D", string>;
}

function questoes(linhas: string[]): Bruta[] {
  const cabecalho = /EXAME D[EO] ORDEM UNIFICADO|^[IVXL]+ EX$|^Tipo .*P[áa]gina \d+|^P[áa]gina \d+/i;
  const uteis = linhas.filter((l) => !cabecalho.test(l));
  const saida: Bruta[] = [];
  let atual: { n: number; partes: string[] } | null = null;
  let ultimo = 0;
  const fechar = () => {
    if (!atual) return;
    const texto = atual.partes;
    const ini = texto.findIndex((l) => ALTERNATIVA.test(l) && l.match(ALTERNATIVA)![1] === "A");
    if (ini > 0) {
      const enunciado = juntar(texto.slice(0, ini));
      const alt: Record<string, string[]> = { A: [], B: [], C: [], D: [] };
      let letra = "";
      for (const l of texto.slice(ini)) {
        const m = l.match(ALTERNATIVA);
        if (m) {
          letra = m[1];
          alt[letra].push(m[2]);
        } else if (letra) alt[letra].push(l);
      }
      if (Object.values(alt).every((v) => v.length))
        saida.push({ n: atual.n, enunciado, alternativas: { A: juntar(alt.A), B: juntar(alt.B), C: juntar(alt.C), D: juntar(alt.D) } });
    }
    atual = null;
  };
  for (const l of uteis) {
    const cabeca = l.match(/^(?:Quest[ãa]o )?(\d+)$/);
    const n = cabeca ? Number(cabeca[1]) : 0;
    if (n > ultimo && n <= ultimo + 3 && (!atual || atual.partes.some((x) => x.match(ALTERNATIVA)?.[1] === "D"))) {
      fechar();
      ultimo = n;
      atual = { n, partes: [] };
      continue;
    }
    atual?.partes.push(l);
  }
  fechar();
  return saida;
}

const PENAL = /\b(crime|delito|pena|dolo|culpa|tipicidade|imputabilidade|leg[ií]tima defesa|homic[ií]dio|furto|roubo|estelionato|c[óo]digo penal|reincid|prescri[çc][ãa]o|tentativa)\b/gi;
const PROCESSO = /\b(den[úu]ncia|inqu[ée]rito|c[óo]digo de processo penal|a[çc][ãa]o penal|pris[ãa]o (preventiva|tempor[áa]ria|em flagrante)|recurso|habeas corpus|tribunal do j[úu]ri|jurisdi[çc][ãa]o|compet[êe]ncia|nulidade|queixa|audi[êe]ncia|testemunha|prova)\b/gi;
const conta = (re: RegExp, t: string) => (t.match(re) ?? []).length;

/**
 * Janela de 12 questões com mais termos de Penal e Processo Penal. Dentro dela, cada questão vai para a
 * disciplina de mais termos; empate fica com a posição (as 6 primeiras, Penal; as outras, Processo Penal).
 */
function faixas(qs: Bruta[]): { penal: number[]; processoPenal: number[] } {
  const sp = qs.map((q) => conta(PENAL, q.enunciado));
  const spp = qs.map((q) => conta(PROCESSO, q.enunciado) + (/processo penal/i.test(q.enunciado) ? 3 : 0));
  const pontos = (i: number) => sp.slice(i, i + 12).reduce((a, b) => a + b, 0) + spp.slice(i, i + 12).reduce((a, b) => a + b, 0);
  let melhor = { ini: 0, score: -1 };
  for (let i = 0; i + 12 <= qs.length; i++) if (pontos(i) > melhor.score) melhor = { ini: i, score: pontos(i) };
  // Nas provas recentes o bloco é 57–68: fica com ele se pontuar quase tanto quanto a melhor janela.
  const usual = qs.findIndex((q) => q.n === 57);
  if (usual >= 0 && usual + 12 <= qs.length && pontos(usual) >= 0.85 * melhor.score) melhor = { ini: usual, score: pontos(usual) };
  const saida = { penal: [] as number[], processoPenal: [] as number[] };
  for (let k = 0; k < 12; k++) {
    const i = melhor.ini + k;
    const disciplina = sp[i] !== spp[i] ? (sp[i] > spp[i] ? "penal" : "processoPenal") : k < 6 ? "penal" : "processoPenal";
    saida[disciplina].push(qs[i].n);
  }
  return saida;
}

/** Gabarito do Tipo 1: linhas de números seguidas de linhas de letras ("*" = anulada). */
function gabaritoTipo1(linhas: string[]): Map<number, string> {
  const res = new Map<number, string>();
  let tipo: number | null = null;
  let numeros: number[] | null = null;
  for (const l of linhas) {
    const cab = l.match(/(?:TIPO|PROVA)\s+(\d+)\b/i);
    if (cab) {
      tipo = Number(cab[1]);
      numeros = null;
      continue;
    }
    if (tipo !== 1) continue;
    const t = l.split(/\s+/);
    if (t.every((x) => /^\d+$/.test(x))) numeros = t.map(Number);
    else if (numeros && t.length === numeros.length && t.every((x) => /^([A-D]|\*)$/.test(x))) {
      numeros.forEach((n, i) => res.set(n, t[i]));
      numeros = null;
    }
  }
  return res;
}

function dispositivos(texto: string): string[] {
  const specs = new Set<string>();
  for (const c of extrairCitacoes(normalize(texto), lex)) {
    if (c.tipo !== "art" || !c.diploma) continue;
    const diploma = c.diploma.replace(/^lei-(\d+)$/, "lei $1");
    specs.add(`art. ${c.art.toUpperCase()}${c.pars[0] ? `, § ${c.pars[0] === "unico" ? "único" : `${c.pars[0]}º`}` : ""}${c.incs[0] ? `, ${toRoman(Number(c.incs[0]))}` : ""}, ${diploma}`);
  }
  return [...specs];
}

const PERGUNTA_PECA =
  /(recurso|pe[çc]a|medida|instrumento|a[çc][ãa]o)( processual| jur[ií]dica| judicial)? (cab[ií]vel|adequad[oa]|correta)|(deve|dever[áa]|pode|poder[áa])( a defesa| o advogado| você)? (interpor|impetrar|ajuizar|apresentar|oferecer|opor|manejar)/i;
function pecaDaAlternativa(texto: string): string | undefined {
  const norm = normalize(texto);
  const hits = Object.entries(pecas).flatMap(([tipo, p]) =>
    [p.nome, ...p.aliases].flatMap((a) => {
      const m = termToRegex(a).exec(norm);
      return m ? [{ tipo, len: m[0].length, pos: m.index }] : [];
    }),
  );
  hits.sort((a, b) => a.pos - b.pos || b.len - a.len);
  return hits[0]?.tipo;
}

mkdirSync(OUT, { recursive: true });
for (const exame of exames) {
  const destino = join(OUT, `${exame}.yaml`);
  if (existsSync(destino) && !forcar) {
    console.log(`${exame}: já existe (use --force para refazer)`);
    continue;
  }
  const dir = join(FGV, exame, "objetiva");
  if (!existsSync(join(dir, "caderno-tipo1.pdf")) || !existsSync(join(dir, "gabarito-definitivo.pdf"))) {
    console.log(`${exame}: falta caderno ou gabarito definitivo em ${dir}`);
    continue;
  }
  const todas = await linhasDoPdf(join(dir, "caderno-tipo1.pdf"));
  const linhas = todas.filter((l) => !cifrada(l));
  if (linhas.length < todas.length) console.log(`${exame}: ${todas.length - linhas.length} linhas cifradas ignoradas`);
  const qs = questoes(linhas);
  if (qs.length < 70) {
    console.log(`${exame}: só ${qs.length} questões reconhecidas, ignorado`);
    continue;
  }
  const gabarito = gabaritoTipo1(await linhasDoPdf(join(dir, "gabarito-definitivo.pdf")));
  const faixa = faixas(qs);
  const anuladas: number[] = [];
  const saida = [];
  for (const q of qs) {
    const disciplina = faixa.penal.includes(q.n) ? "penal" : faixa.processoPenal.includes(q.n) ? "processo-penal" : null;
    if (!disciplina) continue;
    const correta = gabarito.get(q.n);
    if (correta === "*") {
      anuladas.push(q.n);
      continue;
    }
    if (!correta) {
      console.log(`${exame}: questão ${q.n} sem gabarito, ignorada`);
      continue;
    }
    const texto = `${q.enunciado} ${Object.values(q.alternativas).join(" ")}`;
    const peca = PERGUNTA_PECA.test(q.enunciado) ? pecaDaAlternativa(q.alternativas[correta as "A"]) : undefined;
    saida.push({ n: q.n, disciplina, enunciado: q.enunciado, alternativas: q.alternativas, correta, ...(peca ? { peca } : {}), dispositivos: dispositivos(texto), revisao: { status: "rascunho" } });
  }
  writeFileSync(
    destino,
    `# Gerado por scripts/extrair-objetivas.ts a partir do caderno Tipo 1 e do gabarito definitivo do ${toRoman(Number(exame))} Exame.\n` +
      `# Confira a faixa de cada disciplina e o texto de cada questão; depois marque revisao.status: revisado.\n` +
      stringify({ exame, faixa, anuladas, questoes: saida }, { lineWidth: 0 }),
  );
  console.log(`${exame}: ${qs.length} questões no caderno · Penal ${faixa.penal.join(", ")} · Processo Penal ${faixa.processoPenal.join(", ")} · ${saida.length} gravadas · anuladas: ${anuladas.join(", ") || "nenhuma"}`);
}
