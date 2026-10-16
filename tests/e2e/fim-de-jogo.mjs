// Fim de jogo: a partida termina, o card aparece uma vez e recordes/progresso são gravados.
// Uso: node tests/e2e/fim-de-jogo.mjs http://100.80.118.27:3100
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const erros = [];
p.on("pageerror", (e) => erros.push(String(e)));
await p.goto(`${BASE}/jogos/flap-suitcase/?debug=1`, { waitUntil: "networkidle" });
await p.evaluate(() => localStorage.removeItem("grifo:jogo:flap-suitcase"));
await p.reload({ waitUntil: "networkidle" });
await p.waitForFunction(() => window.__flap);
await p.getByRole("button", { name: "▶ Jogar" }).waitFor();

// Partida até o fim: sem invulnerabilidade, o pássaro cai e perde todas as vidas
await p.getByRole("button", { name: "▶ Jogar" }).click();
await p.evaluate(() => { window.__flap.orbesLigados = false; });
await p.keyboard.press("Space");
await p.waitForFunction(() => window.__flap.estado().estado === "jogando", null, { timeout: 8000 });
// Morte abre o quiz "Última chance": responde a primeira alternativa (certa ou errada, a partida segue até o fim)
for (let i = 0; i < 20; i++) {
  const estado = await p.evaluate(() => window.__flap.estado().estado);
  if (estado === "jogando") {
    await p.evaluate(() => { window.__flap.invulneravel = false; });
    await p.waitForFunction(() => window.__flap.estado().estado !== "jogando", null, { timeout: 60000 });
  } else if (estado === "pergunta") {
    // depois de responder aparece "Continuar"; antes, a alternativa A
    await p.evaluate(() => {
      const bs = [...document.querySelectorAll("button")];
      (bs.find((b) => b.innerText.trim() === "Continuar") ?? bs.find((b) => /^A\s+\S/.test(b.innerText.trim())))?.click();
    });
    await p.waitForTimeout(800);
  } else if (estado === "morrendo") {
    await p.waitForTimeout(300);
  } else if (estado === "pronto") {
    await p.keyboard.press("Space");
    await p.waitForTimeout(300);
  } else break;
}
await p.getByText(/Fim de jogo|Novo recorde!/).first().waitFor({ timeout: 15000 });
await p.waitForTimeout(1500); // gerarCodigo + impressão são assíncronos

const cards = await p.locator("h2").filter({ hasText: /pontos$/ }).count();
const salvo = await p.evaluate(() => JSON.parse(localStorage.getItem("grifo:jogo:flap-suitcase") ?? "null"));
const pontosTela = await p.locator("h2").filter({ hasText: /pontos$/ }).first().innerText().catch(() => "");
const recorde = salvo?.recordes?.[1];
const xp = salvo?.progresso?.xp;
const ok = cards === 1 && typeof recorde === "number" && recorde >= 0 && typeof xp === "number";
console.log(`${ok ? "OK  " : "FAIL"} fim de jogo: card exibido ${cards}x (${pontosTela}); recorde nível 1 gravado = ${recorde}; xp gravado = ${xp}`);

// Recarregar: o recorde volta do localStorage
await p.reload({ waitUntil: "networkidle" });
await p.waitForFunction(() => window.__flap);
const aoRecarregar = await p.evaluate(() => JSON.parse(localStorage.getItem("grifo:jogo:flap-suitcase") ?? "null"));
const same = aoRecarregar?.recordes?.[1] === recorde && aoRecarregar?.progresso?.xp === xp;
console.log(`${same ? "OK  " : "FAIL"} persistência após recarregar: recordes e xp iguais`);

console.log(`Erros de página: ${erros.length}`);
erros.slice(0, 5).forEach((e) => console.log("  ", e));
await b.close();
process.exit(ok && same && erros.length === 0 ? 0 : 1);
