// Copia os PDFs originais de .examples/ para public/downloads/originais/ com nomes
// padronizados e gera manifest.json (exame, variante, peça) — usado pela página /provas
// mesmo para exames ainda sem transcrição em content/exames.
//
//   caderno-38.pdf, gabarito-38.pdf, caderno-25-porto-alegre.pdf …
//   objetiva-caderno-40.pdf, objetiva-gabarito-40.pdf (1ª fase, Tipo 1)
//
// Fontes: primeiro os arquivos postos à mão em .examples/; o que faltar vem de
// .examples/fgv/<NN>/ (scripts/baixar-fgv.mjs).
//
// Uso: node scripts/sync-originais.ts
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PDFArray, PDFDict, PDFDocument, PDFName } from "pdf-lib";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = join(ROOT, ".examples");
const FGV = join(SRC, "fgv");
const OUT = join(ROOT, "public/downloads/originais");
mkdirSync(OUT, { recursive: true });

const slug = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

interface Entrada {
  id: string;
  numero: number;
  variante: string | null;
  peca: string | null;
  caderno: string | null;
  gabarito: string | null;
  objetivaCaderno: string | null;
  objetivaGabarito: string | null;
  /** o gabarito é o preliminar: a FGV ainda não publicou o definitivo */
  gabaritoPreliminar?: boolean;
  objetivaGabaritoPreliminar?: boolean;
  /** a página do exame no site da FGV, na lista de documentos */
  fgv?: string;
  fase2: "aplicada" | "em-breve";
}
const exames = new Map<string, Entrada>();
const entrada = (numero: number, variante: string | null) => {
  const id = String(numero).padStart(2, "0") + (variante ? `-${slug(variante)}` : "");
  if (!exames.has(id))
    exames.set(id, { id, numero, variante, peca: null, caderno: null, gabarito: null, objetivaCaderno: null, objetivaGabarito: null, fase2: "aplicada" });
  return exames.get(id)!;
};
const md5 = (f: string) => createHash("md5").update(readFileSync(f)).digest("hex");
const vistos = new Map<string, string>();
const duplicado = (full: string, nome: string) => {
  const h = md5(full);
  if (vistos.has(h)) {
    console.warn(`! ${nome} é idêntico a ${vistos.get(h)} — ignorado (arquivo duplicado na fonte)`);
    return true;
  }
  vistos.set(h, nome);
  return false;
};

// As marcações de estudo (realce, sublinhado, tachado, caneta, notas) que alguém fez no PDF: saem da cópia do site,
// que fica igual ao original. Caixas de texto (FreeText) ficam: a FGV usa (ex.: "REAPLICAÇÃO PORTO VELHO").
const MARCACOES = new Set(["/Highlight", "/Underline", "/StrikeOut", "/Squiggly", "/Ink", "/Text", "/Caret", "/Popup"]);
async function copiarSemMarcacoes(origem: string, destino: string) {
  const bytes = readFileSync(origem);
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  } catch {
    return copyFileSync(origem, destino);
  }
  let tiradas = 0;
  for (const pagina of doc.getPages()) {
    const annots = pagina.node.lookup(PDFName.of("Annots"));
    if (!(annots instanceof PDFArray)) continue;
    const ficam = annots.asArray().filter((ref) => {
      const a = doc.context.lookup(ref);
      const marcacao = a instanceof PDFDict && MARCACOES.has(String(a.get(PDFName.of("Subtype"))));
      if (marcacao) tiradas++;
      return !marcacao;
    });
    if (ficam.length !== annots.size()) pagina.node.set(PDFName.of("Annots"), doc.context.obj(ficam));
  }
  if (!tiradas) return copyFileSync(origem, destino);
  writeFileSync(destino, await doc.save());
  console.warn(`! ${origem.slice(SRC.length + 1)}: ${tiradas} marcação(ões) de estudo tirada(s) da cópia do site`);
}

// Gabaritos: "Exame da Ordem 38º - Agravo em Execução (Porto Alegre).pdf" ou "Exame da Ordem 41º.pdf"
const dirGab = join(SRC, "PDF's Gabaritos");
for (const f of readdirSync(dirGab).sort()) {
  const m = f.match(/^Exame da Ordem (\d+)º(?: - (.+?))?(?: \(([^)]+)\))?\.pdf$/);
  if (!m) continue;
  const full = join(dirGab, f);
  if (duplicado(full, f)) continue;
  const e = entrada(Number(m[1]), m[3] ?? null);
  e.peca = m[2] ?? null;
  e.gabarito = `gabarito-${e.id}.pdf`;
  await copiarSemMarcacoes(full, join(OUT, e.gabarito));
}

/** O começo do texto do PDF (as duas primeiras páginas), para reconhecer o que ele é. */
async function comecoDoTexto(arquivo: string): Promise<string> {
  try {
    const doc = await getDocument({ data: new Uint8Array(readFileSync(arquivo)), verbosity: 0 }).promise;
    let texto = "";
    for (let i = 1; i <= Math.min(2, doc.numPages); i++) texto += (await (await doc.getPage(i)).getTextContent()).items.map((it) => ("str" in it ? it.str : "")).join(" ");
    await doc.loadingTask.destroy();
    return texto;
  } catch (erro) {
    console.warn(`! não li o texto de ${arquivo}: ${(erro as Error).message}`);
    return "";
  }
}
// um "caderno" que na verdade é o padrão de resposta (já aconteceu: o padrão preliminar salvo com o nome do caderno)
const ehPadraoDeResposta = async (arquivo: string) => /PADR[ÃA]O DE RESPOSTA/i.test(await comecoDoTexto(arquivo));

// Cadernos: "OAB 25º [ Penal ] - Caderno de Provas (Porto Alegre).pdf"
const dirCad = join(SRC, "Caderno de Provas");
const cadernos = readdirSync(dirCad).map((f) => join(dirCad, f));
for (const f of readdirSync(SRC)) if (/Caderno de Prova.*\.pdf$/.test(f)) cadernos.push(join(SRC, f));
for (const full of cadernos.sort()) {
  const f = full.split("/").pop()!;
  const m = f.match(/^(?:OAB|Exame da Ordem) (\d+)º.*?Caderno de Provas?(?: \(([^)]+)\))?\.pdf$/);
  if (!m) continue;
  const e = entrada(Number(m[1]), m[2] ?? null);
  if (e.caderno) continue;
  if (await ehPadraoDeResposta(full)) {
    console.warn(`! ${f} é um padrão de resposta, não o caderno — ignorado (o caderno vem da FGV, se houver)`);
    continue;
  }
  e.caderno = `caderno-${e.id}.pdf`;
  await copiarSemMarcacoes(full, join(OUT, e.caderno));
}

// Material baixado da FGV: completa o que faltou e traz a 1ª fase (Tipo 1).
const numeroFgv = (pasta: string) => {
  if (/^\d+$/.test(pasta)) return Number(pasta);
  const edicao2010 = pasta.match(/^2010\.(\d)$/);
  return edicao2010 ? Number(edicao2010[1]) : null;
};
const copiar = (origem: string, destino: string) => {
  if (!existsSync(origem) || duplicado(origem, origem.slice(SRC.length + 1))) return null;
  copyFileSync(origem, join(OUT, destino));
  return destino;
};
if (existsSync(FGV)) {
  for (const pasta of readdirSync(FGV).sort()) {
    const numero = numeroFgv(pasta);
    if (numero === null) continue;
    const dir = join(FGV, pasta);
    const manifesto = existsSync(join(dir, "manifesto.json")) ? JSON.parse(readFileSync(join(dir, "manifesto.json"), "utf8")) : null;
    const temPratica = (manifesto?.baixados ?? []).some((b: { tipo: string }) => b.tipo.startsWith("pratica-"));
    const penal = join(dir, "pratica", "direito-penal");
    const e = entrada(numero, null);
    if (manifesto?.pagina) for (const x of exames.values()) if (x.numero === numero) x.fgv = manifesto.pagina;
    e.caderno ??= copiar(join(penal, "caderno.pdf"), `caderno-${e.id}.pdf`);
    // sem o definitivo, vale o preliminar (marcado como tal na página de provas)
    if (!e.gabarito) {
      e.gabarito = copiar(join(penal, "padrao-definitivo.pdf"), `gabarito-${e.id}.pdf`);
      if (!e.gabarito && (e.gabarito = copiar(join(penal, "padrao-preliminar.pdf"), `gabarito-${e.id}.pdf`))) e.gabaritoPreliminar = true;
    }
    e.objetivaCaderno = copiar(join(dir, "objetiva", "caderno-tipo1.pdf"), `objetiva-caderno-${e.id}.pdf`);
    e.objetivaGabarito = copiar(join(dir, "objetiva", "gabarito-definitivo.pdf"), `objetiva-gabarito-${e.id}.pdf`);
    if (!e.objetivaGabarito && (e.objetivaGabarito = copiar(join(dir, "objetiva", "gabarito-preliminar.pdf"), `objetiva-gabarito-${e.id}.pdf`))) e.objetivaGabaritoPreliminar = true;
    if (!temPratica && !e.caderno && !e.gabarito) e.fase2 = "em-breve";
  }
}

const lista = [...exames.values()].sort((a, b) => a.numero - b.numero || (a.variante ?? "").localeCompare(b.variante ?? ""));
writeFileSync(join(OUT, "manifest.json"), JSON.stringify(lista, null, 1));
console.log(
  `${lista.length} exames · ${lista.filter((e) => e.caderno).length} cadernos · ${lista.filter((e) => e.gabarito).length} gabaritos · ` +
    `${lista.filter((e) => e.objetivaCaderno).length} cadernos da 1ª fase`,
);
for (const e of lista) {
  if (e.fase2 === "em-breve") console.log(`  ${e.id}: 2ª fase ainda não aplicada`);
  else if (!e.caderno || !e.gabarito) console.log(`  ${e.id}: falta ${!e.caderno ? "caderno" : "gabarito"}`);
}
