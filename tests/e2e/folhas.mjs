// Captura folhas específicas de uma rota de impressão: node tests/e2e/folhas.mjs URL OUT idx1,idx2
import { chromium } from "playwright";
const [url, out, idx] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 900, height: 1300 }, deviceScaleFactor: 1 });
await p.goto(url, { waitUntil: "networkidle" });
const folhas = p.locator(".folha, .fluxo");
for (const i of idx.split(",").map(Number)) await folhas.nth(i).screenshot({ path: `${out}-${i}.png` });
await b.close();
