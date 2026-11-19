// O texto de um PDF no formato de scripts/extract-text.mjs (uma linha por posição Y, "=== PÁGINA N ===").
//   node scripts/texto-do-pdf.mjs <arquivo.pdf> <saida.txt>
import { readFileSync, writeFileSync } from "node:fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const [pdf, saida] = process.argv.slice(2);
if (!pdf || !saida) {
  console.error("uso: node scripts/texto-do-pdf.mjs <arquivo.pdf> <saida.txt>");
  process.exit(1);
}
const doc = await getDocument({ data: new Uint8Array(readFileSync(pdf)), verbosity: 0 }).promise;
let text = "";
for (let i = 1; i <= doc.numPages; i++) {
  const { items } = await (await doc.getPage(i)).getTextContent();
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
writeFileSync(saida, text.trim() + "\n");
console.log(`${saida}: ${doc.numPages} páginas`);
