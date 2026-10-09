// Extrai o texto dos PDFs de .examples para .examples/_text/*.txt (apoio à transcrição
// das rubricas em content/exames). Mantém quebras de linha aproximadas por posição Y.
// Uso: node scripts/extract-text.mjs
import { readdirSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const ROOT = new URL("../.examples/", import.meta.url).pathname;
const OUT = join(ROOT, "_text");
mkdirSync(OUT, { recursive: true });

const dirs = ["PDF's Gabaritos", "Caderno de Provas", "."];
for (const d of dirs) {
  const dir = join(ROOT, d);
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".pdf"))) {
    const doc = await getDocument({ data: new Uint8Array(readFileSync(join(dir, f))), verbosity: 0 }).promise;
    let text = "";
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const { items } = await page.getTextContent();
      let lastY = null;
      let line = "";
      const lines = [];
      for (const it of items) {
        const y = Math.round(it.transform[5]);
        if (lastY !== null && Math.abs(y - lastY) > 2) {
          lines.push(line);
          line = "";
        }
        line += it.str;
        lastY = y;
      }
      lines.push(line);
      text += `\n\n=== PÁGINA ${i} ===\n` + lines.map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n");
    }
    const prefix = d.startsWith("PDF") ? "gabarito" : d.startsWith("Caderno") ? "caderno" : "raiz";
    writeFileSync(join(OUT, `${prefix} - ${f.replace(/\.pdf$/, "")}.txt`), text.trim() + "\n");
    process.stdout.write(`${prefix}: ${f} (${doc.numPages}p, ${text.length}c)\n`);
  }
}
