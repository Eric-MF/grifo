// Capturas do modo Celular para revisão visual: node tests/e2e/capturas-celular.mjs <baseURL> <pasta>
import { chromium, devices } from "playwright";
import { readFileSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = process.argv[3] ?? "/tmp";
const ex = JSON.parse(readFileSync("src/content/generated/exames/38.json", "utf8"));
const b = await chromium.launch();

async function contexto(largura, altura, folha) {
  const ctx = await b.newContext({ ...devices["Pixel 7"], viewport: { width: largura, height: altura } });
  await ctx.addInitScript((f) => {
    const p = JSON.parse(localStorage.getItem("grifo:prefs") || "{}");
    p.layout = "celular";
    localStorage.setItem("grifo:prefs", JSON.stringify(p));
    if (f && localStorage.getItem("grifo:folha-modo") === null) localStorage.setItem("grifo:folha-modo", f);
  }, folha ?? null);
  return ctx;
}

// Retrato 360x800
{
  const ctx = await contexto(360, 800);
  const p = await ctx.newPage();
  await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await p.screenshot({ path: `${OUT}/m-home.png` });
  await p.getByRole("button", { name: "Menu", exact: true }).click();
  await p.screenshot({ path: `${OUT}/m-menu.png` });
  await p.keyboard.press("Escape");
  await p.goto(`${BASE}/provas/`, { waitUntil: "networkidle" });
  await p.screenshot({ path: `${OUT}/m-provas.png` });
  await p.goto(`${BASE}/jogos/flap-suitcase/`, { waitUntil: "networkidle" });
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${OUT}/m-jogo-retrato.png` });
  await ctx.close();
}

// Folha: ajustar e largura fixa, em 360 px
for (const folha of ["ajustar", "papel"]) {
  const ctx = await contexto(360, 800, folha);
  const p = await ctx.newPage();
  await p.goto(`${BASE}/simulados/38/`, { waitUntil: "networkidle" });
  await p.getByRole("button", { name: /Começar a prova/ }).click();
  await p.locator("#folha-peca").fill(`AGRAVO EM EXECUÇÃO\n${ex.peca.gabarito_comentado.replace(/\*/g, "").slice(0, 900)}`);
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${OUT}/m-folha-${folha}.png` });
  if (folha === "ajustar") {
    // entrega e resultado em 360 px
    await p.getByRole("button", { name: "Entregar", exact: true }).click();
    await p.getByRole("button", { name: /Entregar e ver a nota/ }).click();
    await p.waitForURL(/resultado/);
    await p.waitForSelector("h1");
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `${OUT}/m-resultado.png`, fullPage: true });
  }
  await ctx.close();
}

// Paisagem 800x360: jogo
{
  const ctx = await contexto(800, 360);
  const p = await ctx.newPage();
  await p.goto(`${BASE}/jogos/flap-suitcase/`, { waitUntil: "networkidle" });
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${OUT}/m-jogo-paisagem.png` });
  await ctx.close();
}
await b.close();
console.log("capturas em", OUT);
