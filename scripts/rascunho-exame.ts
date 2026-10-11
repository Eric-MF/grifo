// Gera um RASCUNHO de content/exames/NN/exame.yaml a partir do texto extraído do
// padrão de resposta da FGV (.examples/_text, via scripts/extract-text.mjs).
//
//   node scripts/rascunho-exame.ts 30                 → content/exames/30/exame.yaml
//   node scripts/rascunho-exame.ts 25 "Porto Alegre"  → content/exames/25-porto-alegre/exame.yaml
//   --force  sobrescreve se já existir
//
// O que sai pronto: enunciados, gabarito comentado, itens da tabela com descrição e
// valores, componentes com valor e — quando o trecho cita artigo/súmula — o
// `dispositivo` com `requer`. O que precisa de mão humana: os `termos` das teses
// (marcados com "TODO"), revisar e rodar `npm run validar` + `npm test`.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Document, isMap, isSeq, parse, visit } from "yaml";
import { LeisSchema } from "../src/content/schema.ts";
import { buildLexico, extrairCitacoes, toRoman, type Citacao } from "../src/lib/correcao/citacoes.ts";
import { normalize } from "../src/lib/correcao/normalize.ts";
import { enunciadosDoCaderno } from "./enunciados-caderno.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const [numArg, varArg] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const force = process.argv.includes("--force");
const numero = Number(numArg);
if (!numero) {
  console.error("uso: node scripts/rascunho-exame.ts <número> [variante]");
  process.exit(1);
}
const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const id = String(numero).padStart(2, "0") + (varArg ? `-${slug(varArg)}` : "");
const dir = join(ROOT, ".examples/_text");
const arq = readdirSync(dir).find(
  (f) => f.startsWith(`gabarito - Exame da Ordem ${String(numero).padStart(2, "0")}º`) && (varArg ? f.includes(`(${varArg})`) : !f.includes("(")),
);
if (!arq) {
  console.error(`texto do gabarito ${id} não encontrado em .examples/_text`);
  process.exit(1);
}
const pecaNome = process.argv.find((a) => a.startsWith("--peca="))?.slice("--peca=".length) ?? arq.match(/º - (.+?)(?: \(|\.txt)/)?.[1];
if (!pecaNome) {
  console.error(`nome da peça não está no arquivo ${arq}: informe --peca="Nome da Peça"`);
  process.exit(1);
}

const leis = LeisSchema.parse(parse(readFileSync(join(ROOT, "content/leis.yaml"), "utf8")));
const pecas = parse(readFileSync(join(ROOT, "content/pecas.yaml"), "utf8")) as Record<string, { nome: string; aliases: string[] }>;
const lex = buildLexico(leis);

// ---------------------------------------------------------------- limpeza
const RUIDO = [
  /^=== PÁGINA/,
  /^ORDEM DOS ADVOGADOS/i,
  /EXAME DE ORDEM UNIFICADO\s*$/i,
  /^[IVXL]+ Exame de Ordem Unificado/i,
  /^PROVA PRÁTICO-PROFISSIONAL/i,
  /^Prova Prático-Profissional/i,
  /^ÁREA:/i,
  /^Padrão de Resposta da Prova/i,
  /gabarito preliminar da prova/i,
  /^podendo ser alterado até a divulgação/i,
  /^Qualquer semelhança nominal/i,
  /^Aplicada em/i,
  /Página \d+ de \d+$/i,
  /^ORDEM DOS ADVOGADOS DO BRASIL/i,
  /^[IVXL]+ EXAME DE ORDEM$/i,
  /^EXAME DE ORDEM$/i,
  /^DISCIPLINA:/i,
  /^TIPO DE QUESTÃO:/i,
  /EXAME DE ORDEM \d+ de \d+$/i,
  /^QUESTÃO\s+DIFICULDADE/i,
  /^[A-Z]\d{6}$/,
  /^QUESTÃO Nº:/i,
  /^Padrão de Resposta\s*$/i,
];
let pularProxima = false;
const linhas = readFileSync(join(dir, arq), "utf8")
  .normalize("NFC")
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => {
    // formato antigo: "CONTEÚDO PROGRAMÁTICO" seguido do assunto numa linha própria
    if (pularProxima) return (pularProxima = false);
    if (/^CONTEÚDO PROGRAMÁTICO/i.test(l)) return !(pularProxima = true);
    return l && !RUIDO.some((r) => r.test(l));
  });
const cespe = /CESPE/.test(readFileSync(join(dir, arq), "utf8"));
const temMarcadores = linhas.some((l) => /PADRÃO DE RESPOSTAS?\s*[–-]\s*(PEÇA|QUESTÃO)/i.test(l));
const aplicacao = readFileSync(join(dir, arq), "utf8").match(/Aplicada em (\d{2})\/(\d{2})\/(\d{4})/);

// ---------------------------------------------------------------- seções
interface Secao { tipo: "peca" | number; enunciado: string[]; gabarito: string[]; tabela: string[] }
const secoes: Secao[] = [];
let atual: Secao | null = null;
let parte: "enunciado" | "gabarito" | "tabela" = "enunciado";
for (const l of linhas) {
  const mPeca = /PADRÃO DE RESPOSTAS?\s*[–-]\s*PEÇA/i.test(l);
  const mQ = l.match(/PADRÃO DE RESPOSTAS?\s*[–-]\s*QUESTÃO\s*0?(\d)/i);
  if (mPeca || mQ) {
    atual = { tipo: mPeca ? "peca" : Number(mQ![1]), enunciado: [], gabarito: [], tabela: [] };
    secoes.push(atual);
    parte = "enunciado";
    continue;
  }
  const esp = l.match(/^Espelho\s*[–-]\s*Penal\s*[–-]\s*(Peça|Questão\s*(\d))/i);
  const mVi = !temMarcadores && (l.match(/^Questão\s+(\d)$/i) || (/^(Peça|PEÇA PRÁTICO[ -]PROFISSIONAL|PEÇA PROFISSIONAL)$/i.test(l) ? ["", "peca"] : null) || (esp ? ["", esp[2] ?? "peca"] : null));
  if (mVi && !secoes.some((x) => x.tipo === (mVi[1] === "peca" ? "peca" : Number(mVi[1])))) {
    atual = { tipo: mVi[1] === "peca" ? "peca" : Number(mVi[1]), enunciado: [], gabarito: [], tabela: [] };
    secoes.push(atual);
    parte = esp || cespe ? "gabarito" : "enunciado"; // "Espelho"/CESPE já começam pelo gabarito
    continue;
  }
  if (!temMarcadores && /^Enunciado:?$/i.test(l)) {
    // formato antigo: cada "ENUNCIADO" abre uma seção (1ª = peça, depois questões)
    atual = { tipo: secoes.length === 0 ? "peca" : secoes.length, enunciado: [], gabarito: [], tabela: [] };
    secoes.push(atual);
    parte = esp || cespe ? "gabarito" : "enunciado"; // "Espelho"/CESPE já começam pelo gabarito
    continue;
  }
  if (!atual) continue;
  if (/^Enunciado:?$/i.test(l)) { parte = "enunciado"; continue; }
  if (/^Gabarito Comentado:?$/i.test(l)) { parte = "gabarito"; continue; }
  if (/^Distribuição d[eo]s? Pontos:?$/i.test(l)) { parte = "tabela"; continue; }
  if (/^ITEM\s+PONTUAÇÃO$/i.test(l) || /^Quesito Avaliado/i.test(l)) { parte = "tabela"; continue; }
  if (/^(PEÇA PRÁTICO-PROFISSIONAL|QUESTÃO \d)$/i.test(l)) continue;
  atual[parte].push(l);
}

// Junta linhas quebradas em parágrafos (heurística: linha que termina em pontuação final fecha parágrafo).
function paragrafos(ls: string[], destacar = true) {
  const out: string[] = [];
  let cur = "";
  for (const l of ls) {
    cur = cur ? `${cur}${cur.endsWith("-") ? "" : " "}${l}` : l;
    if (/[.:;)”"]$/.test(l) && !/\b(art|arts|inc|al|n|nº)\.$/i.test(l)) {
      out.push(cur);
      cur = "";
    }
  }
  if (cur) out.push(cur);
  // "(Valor: 0,60)" que caiu em linha própria volta para o parágrafo anterior
  for (let i = out.length - 1; i > 0; i--) if (/^\(Valor/.test(out[i])) out.splice(i - 1, 2, `${out[i - 1]} ${out[i]}`);
  return out
    .map((p) => (!destacar ? p : /^[A-E]\)\s/.test(p) || /^(Na qualidade|Considerando|Com base|Como advogad|Você, como|Redija|Elabore)/.test(p) ? `**${p.replace(/\*/g, "")}**` : p))
    .map((p) => (destacar && /^Obs\.?:/.test(p) ? `*${p}*` : p))
    .join("\n\n");
}

// ---------------------------------------------------------------- tabela
interface ItemRasc { n: string; secao?: string; descricao: string; valores?: number[]; bruto?: string }
function itensDaTabela(ls: string[], questao: boolean) {
  const itens: ItemRasc[] = [];
  let secao: string | undefined;
  let cur: ItemRasc | null = null;
  let ignorar = false;
  const inicioItem = questao ? /^([A-Ea-e])(\.?\d+)?(?:[.)]\s*|\s+)(\S.*)$/ : /^(\d{1,2}(?:\.\d{1,2})*[A-Z]?)(?:[.)]|\s*[–-]|\s(?=[A-ZÁÉÍÓÚ]))\s*(?=\D)(\S.*)$/;
  // itens colados na mesma linha ("… (0,20). 9) Afastamento …")
  const partidas = ls.flatMap((l) => l.split(/\s(?=\d{1,2}(?:\.\d)?[A-Z]?(?:\)|\s[–-])\s?[A-ZÁÉÍÓÚ])/));
  for (const l0 of partidas) {
    // "0,00 / 0,20 / 0,40" → "0,00/0,20/0,40"
    let l = /^0(,00)?(\s*\/\s*[\d,]+)+\s*$/.test(l0) || /\s0(,00)?(\s*\/\s*[\d,]+)+\s*$/.test(l0) ? l0.replace(/\s*\/\s*/g, "/") : l0;
    l = l.replace(/(^|\s)0\/(?=[\d,]+)/, "$10,00/");
    if (/^Crit[ée]rios:?$/i.test(l)) {
      ignorar = true;
      continue;
    }
    if (ignorar) continue;
    // subitens "a) … (0,25)" dos pedidos nas tabelas antigas → item "6a"
    const atualItem = cur as ItemRasc | null;
    const tituloPuro: boolean = !!atualItem && /^\d+$/.test(atualItem.n) && !/\(\d+,\d{1,2}\)/.test(atualItem.descricao) && !atualItem.valores;
    const sub: RegExpMatchArray | null | false = !questao && (tituloPuro || (!!atualItem && /^\d+[a-h]$/.test(atualItem.n))) && l.match(/^([a-h])\)\s*(\S.*)$/);
    if (sub) {
      const base: string = atualItem!.n.replace(/[a-h]$/, "");
      const fimSub: RegExpMatchArray | null = sub[2].match(/^(.*?)\s+(0,00(?:\/[\d,]+)+)\/?$/);
      cur = { n: `${base}${sub[1]}`, secao, descricao: fimSub ? fimSub[1] : sub[2] };
      if (fimSub) cur.valores = fimSub[2].split("/").map((v: string) => Number(v.replace(",", ".")));
      itens.push(cur);
      continue;
    }
    if (/^OU$/i.test(l) && cur) {
      cur.descricao += " ‖OU‖";
      continue;
    }
    if (/^0,00(\/[\d,]+)*\/?$/.test(l) || (cur && /^[\d,]+(\/[\d,]+)+\/?$/.test(l))) {
      if (cur) cur.valores = [...(cur.valores ?? []), ...l.split("/").filter(Boolean).map((v) => Number(v.replace(",", ".")))];
      continue;
    }
    // linha com descrição + valores no fim ("... (0,10). 0,00/0,10")
    const fim = l.match(/^(.*?)\s+(0,00(?:\/[\d,]+)+)\/?$/);
    const texto = fim ? fim[1] : l;
    let m = texto.match(inicioItem);
    if (m && questao && /^[a-e]/.test(texto) && !/^[a-e]\d?\)/.test(texto)) m = null; // "a defesa…" não é item
    const nItem = m ? (questao ? m[1].toUpperCase() + (m[2] ?? "") : m[1]) : "";
    const repetido = m && itens.some((i) => i.n === nItem);
    if (m && !repetido && (/\(\d,\d{2}\)/.test(texto) || texto.length > 20)) {
      cur = questao
        ? { n: m[1].toUpperCase() + (m[2] ?? ""), secao, descricao: m[3] }
        : { n: m[1], secao, descricao: m[2] };
      itens.push(cur);
    } else if (!cur && /\(\d,\d{2}\)/.test(texto) && !questao) {
      // item sem número logo após um título de seção ("Fechamento: Data, local… (0,10)")
      const ult = itens.length ? Number(itens[itens.length - 1].n.split(".")[0]) : 0;
      cur = { n: String(ult + 1), secao, descricao: texto };
      itens.push(cur);
    } else if (!cur || (!/\(\d,\d{2}\)/.test(texto) && texto.length < 60 && !/[.,;]$/.test(texto) && /^[A-ZÁÉÍÓÚ]/.test(texto) && !/\(/.test(texto))) {
      secao = texto;
      cur = null;
      continue;
    } else cur.descricao += ` ${texto}`;
    if (fim && cur) cur.valores = fim[2].split("/").map((v) => Number(v.replace(",", ".")));
  }
  for (let i = itens.length - 1; i >= 0; i--) {
    const it = itens[i];
    const temMarcador = /\((\d+),(\d{1,2})\)/.test(it.descricao);
    if (!temMarcador && !(it.valores && Math.max(...it.valores) > 0)) itens.splice(i, 1);
    else if (!temMarcador) it.descricao = `${it.descricao.replace(/\s*Obs\..*$/i, "")} (${Math.max(...it.valores!).toFixed(2).replace(".", ",")})`;
  }
  for (const it of itens) (it.bruto = it.descricao), (it.descricao = it.descricao.replace(/\s*‖OU‖\s*/g, " OU ").replace(/\s*“?Qualquer semelhança.*$/, "").replace(/\s*ITEM DO PROGRAMA:.*$/, "").replace(/\s*0,00(\s*\/\s*\d,\d{2})+\s*/g, " ").replace(/\s*\/?\s*\d,\d{2}(\s*\/\s*\d,\d{2})*\s*$/, "").replace(/\s+\./g, ".").trim());
  return itens;
}

/** Uma citação com vários incisos/parágrafos vira alternativas ("386, III ou VI"). */
function specsDe(c: Citacao): string[] {
  if (c.tipo === "art" && c.incs.length > 1) return c.incs.map((i) => specDe({ ...c, incs: [i] }));
  if (c.tipo === "art" && c.pars.length > 1) return c.pars.map((p) => specDe({ ...c, pars: [p] }));
  return [specDe(c)];
}

function specDe(c: Citacao): string {
  if (c.tipo === "sumula") return `Súmula${c.vinculante ? " Vinculante" : ""} ${c.n}${c.tribunal && !c.vinculante ? ` ${c.tribunal.toUpperCase()}` : ""}`;
  const partes = [`art. ${c.art.toUpperCase()}`];
  for (const p of c.pars) partes.push(p === "unico" ? "parágrafo único" : `§ ${p}º`);
  for (const i of c.incs) partes.push(toRoman(Number(i)));
  for (const a of c.als) partes.push(a);
  const d = c.diploma ?? "?";
  const alias = d.startsWith("lei-") ? `Lei ${d.slice(4)}` : leis.diplomas[d]?.aliases[0]?.toUpperCase() ?? d;
  return `${partes.join(", ")}, ${alias}`;
}

function componentes(descricaoCompleta: string) {
  const descricao = descricaoCompleta.split("‖OU‖")[0];
  const comps: Record<string, unknown>[] = [];
  const re = /\((\d+),(\d{1,2})\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let ultimaTese: string | undefined;
  let k = 0;
  while ((m = re.exec(descricao))) {
    const seg = descricao.slice(last, m.index);
    last = m.index + m[0].length;
    const valor = Number(`${m[1]}.${m[2]}`);
    const id = `c${++k}`;
    const cits = extrairCitacoes(normalize(seg), lex).filter((c) => c.tipo === "sumula" || c.diploma);
    const antesDaCitacao = seg.split(/\b(art\.|arts\.|artigo|súmula|enunciado)/i)[0].replace(/[\s,;.]+/g, " ").trim();
    const soDispositivo = cits.length > 0 && ((antesDaCitacao.length < 32 && (k > 1 || /^fundament/i.test(antesDaCitacao))) || /^\W*(,|e|ou)?\s*(na forma|nos termos|nos moldes|com fundamento|fundamento legal|fundamentação legal|por aplicação|por força|à luz|em conformidade|conforme|com base|consoante|segundo|de acordo|previst|do|da|dos|art|súmula|enunciado|ou|por força)/i.test(seg.trim()) && k > 1);
    if (soDispositivo) {
      const specs = [...new Set(cits.flatMap(specsDe))];
      comps.push({ id, valor, dispositivo: specs, ...(ultimaTese ? { requer: ultimaTese } : {}) });
    } else {
      comps.push({ id, valor, termos: [`TODO ${seg.replace(/\s+/g, " ").trim().slice(0, 140)}`] });
      ultimaTese = id;
    }
  }
  if (!comps.length) comps.push({ id: "c1", valor: 0.01, termos: ["TODO item sem valores entre parênteses"] });
  return comps;
}

// ---------------------------------------------------------------- saída
// casa o nome do arquivo com o catálogo, preferindo o nome/alias mais longo ("contrarrazões de apelação" > "apelação")
const tipoPeca =
  Object.entries(pecas)
    .flatMap(([tipo, p]) => [p.nome, ...p.aliases].map((a) => ({ tipo, a: normalize(a).trim() })))
    .filter(({ a }) => normalize(pecaNome.replace(/ em apela/i, " de apela")).includes(` ${a} `))
    .sort((x, y) => y.a.length - x.a.length)[0]?.tipo ?? "TODO";

const secPeca = secoes.find((s) => s.tipo === "peca");
const exame = {
  id,
  numero,
  numeral: toRoman(numero),
  ...(varArg ? { variante: varArg } : {}),
  ...(aplicacao ? { aplicacao: `${aplicacao[3]}-${aplicacao[2]}-${aplicacao[1]}` } : {}),
  revisao: { status: "rascunho", por: "", em: "", notas: "Gerado por scripts/rascunho-exame.ts; termos em content/_transcricao/termos." },
  peca: {
    nome: pecaNome,
    tipo: tipoPeca,
    aliases: [],
    enunciado: paragrafos(secPeca?.enunciado ?? []),
    gabarito_comentado: paragrafos(secPeca?.gabarito ?? [], false),
    itens: itensDaTabela(secPeca?.tabela ?? [], false).map(({ bruto, ...it }) => ({ ...it, componentes: componentes(bruto ?? it.descricao) })),
  },
  questoes: secoes
    .filter((s) => s.tipo !== "peca")
    .map((s) => ({
      n: s.tipo as number,
      enunciado: paragrafos(s.enunciado),
      gabarito_comentado: paragrafos(s.gabarito, false),
      itens: itensDaTabela(s.tabela, true).map(({ bruto, ...it }) => ({ ...it, componentes: componentes(bruto ?? it.descricao) })),
    })),
};

// Enunciados ausentes no padrão de resposta → busca no caderno de prova
const cad = enunciadosDoCaderno(numero, varArg);
if (cad) {
  if (exame.peca.enunciado.length < 200 && cad.peca) exame.peca.enunciado = cad.peca;
  exame.questoes.forEach((q, i) => {
    if (q.enunciado.length < 150 && cad.questoes[i]) q.enunciado = cad.questoes[i];
  });
}

const outDir = join(ROOT, "content/exames", id);
const outFile = join(outDir, "exame.yaml");
if (existsSync(outFile) && !force) {
  console.error(`${outFile} já existe (use --force para sobrescrever)`);
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });
const doc = new Document(exame);
// listas curtas e componentes em uma linha só (mais fácil de revisar)
visit(doc, {
  Pair(_, pair) {
    const k = String((pair.key as { value?: unknown })?.value ?? pair.key);
    if (["valores", "termos", "dispositivo", "alternativas", "aliases"].includes(k) && isSeq(pair.value)) pair.value.flow = true;
    if (k === "componentes" && isSeq(pair.value)) for (const it of pair.value.items) if (isMap(it)) it.flow = true;
  },
});
const yaml = doc.toString({ lineWidth: 0, blockQuote: "literal" });
writeFileSync(outFile, `# ${toRoman(numero)} Exame de Ordem Unificado — Direito Penal${varArg ? ` (${varArg})` : ""}\n# Fonte: padrão de resposta FGV. RASCUNHO: revisar e completar os termos marcados com TODO.\n${yaml}`);
const todos = (yaml.match(/TODO/g) ?? []).length;
console.log(`${outFile}: peça "${pecaNome}" (${tipoPeca}), ${exame.peca.itens.length} itens na peça, ${exame.questoes.length} questões, ${todos} TODO`);

if (process.argv.includes("--resumo")) resumo(exame);

/** Resumo compacto para completar os termos: item, descrição e componentes. */
function resumo(ex: typeof exame) {
  const partes = [{ nome: "peca", itens: ex.peca.itens }, ...ex.questoes.map((q) => ({ nome: `q${q.n}`, itens: q.itens }))];
  for (const p of partes) {
    console.log(`## ${p.nome}`);
    for (const it of p.itens) {
      console.log(`${it.n} | ${it.descricao}`);
      for (const c of it.componentes as { id: string; valor: number; termos?: string[]; dispositivo?: string[]; requer?: string }[])
        console.log(`   ${it.n}.${c.id} ${c.valor} ${c.dispositivo ? `DISP ${c.dispositivo.join(" ; ")}${c.requer ? ` req ${c.requer}` : ""}` : "TODO"}`);
    }
  }
}
