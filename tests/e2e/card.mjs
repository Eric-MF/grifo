// Captura o canvas do card de compartilhamento da última tentativa (após simulado.mjs).
import { chromium } from "playwright";
const [BASE, OUT] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.goto(`${BASE}/simulados/38/`, { waitUntil: "networkidle" });
await p.getByRole("button", { name: /Começar a prova/ }).click();
await p.locator("#folha-peca").fill("AGRAVO EM EXECUÇÃO\nNa forma do art. 197 da LEP, no prazo de 5 dias. Continuidade delitiva, art. 71 do CP. Local, data, advogado, OAB.");
await p.getByRole("button", { name: "Entregar", exact: true }).click();
await p.getByRole("button", { name: /Entregar e ver a nota/ }).click();
await p.waitForURL(/resultado/);
await p.waitForTimeout(2500);
const url = await p.evaluate(() => document.querySelector("canvas[role=img]").toDataURL("image/png"));
const fs = await import("node:fs");
fs.writeFileSync(`${OUT}/card.png`, Buffer.from(url.split(",")[1], "base64"));
await b.close();
console.log("card ok");
