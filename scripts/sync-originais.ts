// Copia os PDFs originais de .examples/ para public/downloads/originais/ com nomes
// padronizados e gera manifest.json (exame, variante, peça) — usado pela página /provas
// mesmo para exames ainda sem transcrição em content/exames.
//
//   caderno-38.pdf, gabarito-38.pdf, caderno-25-porto-alegre.pdf …
//
// Uso: node scripts/sync-originais.ts
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = join(ROOT, ".examples");
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
}
const exames = new Map<string, Entrada>();
const entrada = (numero: number, variante: string | null) => {
  const id = String(numero).padStart(2, "0") + (variante ? `-${slug(variante)}` : "");
  if (!exames.has(id)) exames.set(id, { id, numero, variante, peca: null, caderno: null, gabarito: null });
  return exames.get(id)!;
};
const md5 = (f: string) => createHash("md5").update(readFileSync(f)).digest("hex");
const vistos = new Map<string, string>();

// Gabaritos: "Exame da Ordem 38º - Agravo em Execução (Porto Alegre).pdf"
const dirGab = join(SRC, "PDF's Gabaritos");
for (const f of readdirSync(dirGab).sort()) {
  const m = f.match(/^Exame da Ordem (\d+)º - (.+?)(?: \(([^)]+)\))?\.pdf$/);
  if (!m) continue;
  const full = join(dirGab, f);
  const h = md5(full);
  if (vistos.has(h)) {
    console.warn(`! ${f} é idêntico a ${vistos.get(h)} — ignorado (arquivo duplicado na fonte)`);
    continue;
  }
  vistos.set(h, f);
  const e = entrada(Number(m[1]), m[3] ?? null);
  e.peca = m[2];
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
  e.caderno = `caderno-${e.id}.pdf`;
  copyFileSync(full, join(OUT, e.caderno));
}

const lista = [...exames.values()].sort((a, b) => a.numero - b.numero || (a.variante ?? "").localeCompare(b.variante ?? ""));
writeFileSync(join(OUT, "manifest.json"), JSON.stringify(lista, null, 1));
console.log(`${lista.length} exames · ${lista.filter((e) => e.caderno).length} cadernos · ${lista.filter((e) => e.gabarito).length} gabaritos`);
for (const e of lista) if (!e.caderno || !e.gabarito) console.log(`  ${e.id}: falta ${!e.caderno ? "caderno" : "gabarito"}`);
