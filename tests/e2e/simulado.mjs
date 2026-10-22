// Fluxo completo do simulado no navegador (dev server precisa estar rodando).
// Uso: node tests/e2e/simulado.mjs [baseURL] [pastaScreenshots]
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const BASE = process.argv[2] ?? "http://100.80.118.27:3100";
const OUT = process.argv[3] ?? "/tmp";
const ex = JSON.parse(readFileSync("src/content/generated/exames/38.json", "utf8"));

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1366, height: 900 } });
const errs = [];
p.on("pageerror", (e) => errs.push(String(e)));
p.on("console", (m) => m.type() === "error" && errs.push(m.text()));

await p.goto(`${BASE}/simulados/38/`, { waitUntil: "networkidle" });
await p.getByRole("button", { name: /Começar a prova/ }).click();
await p.locator("#folha-peca").fill(`AGRAVO EM EXECUÇÃO\n${ex.peca.gabarito_comentado.replace(/\*/g, "")}`);
await p.screenshot({ path: `${OUT}/prova.png` });
// Pausa
await p.getByRole("button", { name: /Pausar/ }).click();
await p.waitForTimeout(400);
await p.screenshot({ path: `${OUT}/pausa.png` });
await p.getByRole("button", { name: /Continuar a prova/ }).click();
// Questões
for (let i = 0; i < 4; i++) {
  await p.getByRole("button", { name: `Q${i + 1}`, exact: true }).click();
  await p.locator(`#folha-q${i + 1}`).fill(ex.questoes[i].gabarito_comentado.replace(/\*/g, ""));
}
await p.getByRole("button", { name: "Entregar", exact: true }).click();
await p.getByRole("button", { name: /Entregar e ver a nota/ }).click();
await p.waitForURL(/resultado/);
await p.waitForSelector("h1");
await p.waitForTimeout(1500);
const nota = await p.locator("h1").first().innerText();
const codigo = await p.locator("code").first().innerText();
console.log("nota:", nota.replace(/\s+/g, " "), "| código:", codigo);
await p.screenshot({ path: `${OUT}/resultado.png`, fullPage: true });

await p.goto(`${BASE}/verificar/?c=${encodeURIComponent(codigo)}`, { waitUntil: "networkidle" });
await p.waitForTimeout(600);
console.log("verificar:", (await p.locator("[role=status], [role=alert]").first().innerText()).split("\n")[0]);
await p.screenshot({ path: `${OUT}/verificar.png` });
console.log("erros:", errs.length ? errs : "nenhum");
await b.close();
