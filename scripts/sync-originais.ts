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
  copyFileSync(full, join(OUT, e.gabarito));
}

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
  e.caderno = `caderno-${e.id}.pdf`;
  copyFileSync(full, join(OUT, e.caderno));
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
    e.caderno ??= copiar(join(penal, "caderno.pdf"), `caderno-${e.id}.pdf`);
    e.gabarito ??=
      copiar(join(penal, "padrao-definitivo.pdf"), `gabarito-${e.id}.pdf`) ??
      copiar(join(penal, "padrao-preliminar.pdf"), `gabarito-${e.id}.pdf`);
    e.objetivaCaderno = copiar(join(dir, "objetiva", "caderno-tipo1.pdf"), `objetiva-caderno-${e.id}.pdf`);
    e.objetivaGabarito = copiar(join(dir, "objetiva", "gabarito-definitivo.pdf"), `objetiva-gabarito-${e.id}.pdf`);
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
