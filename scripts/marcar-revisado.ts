// Marca um exame como revisado (ou volta a rascunho) no YAML.
//   npm run revisar -- 38 "Nome do revisor" "observações"      npm run revisar -- 38 --rascunho
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseDocument } from "yaml";

const [id, por = "", notas = ""] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!id) throw new Error('uso: npm run revisar -- <id> "revisor" "notas"');
const f = join(new URL("..", import.meta.url).pathname, "content/exames", id, "exame.yaml");
const doc = parseDocument(readFileSync(f, "utf8"));
const rascunho = process.argv.includes("--rascunho");
doc.setIn(["revisao", "status"], rascunho ? "rascunho" : "revisado");
doc.setIn(["revisao", "por"], rascunho ? "" : por);
doc.setIn(["revisao", "em"], rascunho ? "" : new Date().toISOString().slice(0, 10));
if (notas) doc.setIn(["revisao", "notas"], notas);
writeFileSync(f, doc.toString({ lineWidth: 0, blockQuote: "literal" }));
console.log(`${id}: ${rascunho ? "rascunho" : `revisado por ${por}`}`);
