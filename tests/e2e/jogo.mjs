// Fluxo do Flap Suitcase: menu → jogar → poder → pergunta (com anúncio) → estilos.
// Uso: node tests/e2e/jogo.mjs [baseURL] [pastaScreenshots]
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://100.80.118.27:3100";
const OUT = process.argv[3] ?? "/tmp";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 860 } });
const errs = [];
p.on("pageerror", (e) => errs.push(String(e)));
p.on("console", (m) => m.type() === "error" && errs.push(m.text()));

await p.goto(`${BASE}/jogos/flap-suitcase/?debug=1`, { waitUntil: "networkidle" });
await p.getByRole("button", { name: "▶ Jogar" }).waitFor();
await p.screenshot({ path: `${OUT}/jogo-menu.png` });
await p.getByRole("button", { name: "▶ Jogar" }).click();
const canvas = p.locator("canvas").first();
let quiz = false;
const voar = async () => {
  const y = await p.evaluate(() => window.__jogador?.y ?? 0);
  if (y > 330) await p.keyboard.press("Space");
};
await p.keyboard.press("Space");
for (let i = 0; i < 400 && !quiz; i++) {
  await voar();
  await p.waitForTimeout(40);
  if (i === 40) await p.screenshot({ path: `${OUT}/jogo-voo.png` });
  quiz = await p.getByRole("dialog").isVisible().catch(() => false);
}
console.log("pergunta apareceu:", quiz);
if (quiz) {
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${OUT}/jogo-pergunta.png` });
  await p.locator("[role=dialog] button").first().click();
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${OUT}/jogo-feedback.png` });
  await p.getByRole("button", { name: "Continuar" }).click();
}
// troca de estilos (volta ao menu pela pausa)
for (const estilo of ["Fofo", "Retrofuturista", "Steampunk", "Pixel 8-bit", "Noir Tribunal", "Papiro"]) {
  await p.keyboard.press("KeyP");
  await p.waitForTimeout(150);
  const menu = p.getByRole("button", { name: "Menu" });
  if (await menu.isVisible().catch(() => false)) await menu.click();
  await p.getByRole("button", { name: estilo }).click();
  await p.getByRole("button", { name: "▶ Jogar" }).click();
  await p.keyboard.press("Space");
  for (let i = 0; i < 60; i++) {
    await voar();
    await p.waitForTimeout(40);
  }
  const d = await p.getByRole("dialog").isVisible().catch(() => false);
  if (d) {
    await p.locator("[role=dialog] button").first().click();
    await p.getByRole("button", { name: "Continuar" }).click();
    for (let i = 0; i < 4; i++) { await p.keyboard.press("Space"); await p.waitForTimeout(200); }
  }
  await p.screenshot({ path: `${OUT}/jogo-${estilo.split(" ")[0].toLowerCase()}.png` });
}
console.log("erros:", errs.length ? errs : "nenhum");
await b.close();
