// O menu do jogo cabe na largura da tela: nada nele pede para deslizar na horizontal. Mede o menu em telas de celular
// (em pé e deitado), tablet e computador, nos dois layouts do site (padrão e "Celular") e nos tamanhos de fonte, com os
// grupos de estilos abertos e o painel de um poder aberto (o pior caso). Falha (código 1) se a caixa do menu, o palco ou
// a página ficarem mais largos que a área visível.
// Uso: node tests/e2e/menu-horizontal.mjs [baseURL]
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://100.80.118.27:3100";
const TELAS = [
  { width: 360, height: 740, celular: true },
  { width: 390, height: 844, celular: true },
  { width: 412, height: 915, celular: true },
  { width: 667, height: 375, celular: true },
  { width: 844, height: 390, celular: true },
  { width: 1024, height: 768, celular: false },
  { width: 1280, height: 800, celular: false },
];
const LAYOUTS = ["padrao", "celular"];
const FONTES = ["m", "g", "gg"];

const falhas = [];
const b = await chromium.launch();
try {
  for (const tela of TELAS) {
    for (const layout of LAYOUTS) {
      for (const fonte of FONTES) {
        const ctx = await b.newContext({
          viewport: { width: tela.width, height: tela.height },
          hasTouch: tela.celular,
          isMobile: tela.celular,
        });
        await ctx.addInitScript(([layout, fonte]) => localStorage.setItem("grifo:prefs", JSON.stringify({ layout, fonte })), [layout, fonte]);
        const p = await ctx.newPage();
        await p.goto(`${BASE}/jogos/flap-suitcase/`, { waitUntil: "networkidle" });
        await p.getByRole("button", { name: "▶ Jogar" }).waitFor();
        // o pior caso: todos os grupos abertos e o painel de um poder aberto
        await p.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));
        const poder = p.getByRole("button", { name: /^Habeas Corpus:/ });
        if (await poder.count()) await poder.click();
        await p.waitForTimeout(300);
        const medidas = await p.evaluate(() => {
          const caixa = document.querySelector('[class*="menuBox"]');
          const palco = document.querySelector('[class*="stage"]');
          const doc = document.documentElement;
          const sobra = (el) => (el ? el.scrollWidth - el.clientWidth : 0);
          return { caixa: sobra(caixa), palco: sobra(palco), pagina: sobra(doc) };
        });
        const nome = `${tela.width}x${tela.height} ${layout} fonte ${fonte}`;
        for (const [onde, px] of Object.entries(medidas)) if (px > 0) falhas.push(`${nome}: ${onde} ${px}px mais larga que a tela`);
        await ctx.close();
      }
    }
  }
} finally {
  await b.close();
}

console.log(`combinações: ${TELAS.length * LAYOUTS.length * FONTES.length}`);
if (falhas.length) {
  console.log(`FALHOU: o menu pede para deslizar na horizontal em ${falhas.length} caso(s):`);
  for (const f of falhas) console.log(`  ${f}`);
  process.exit(1);
}
console.log("ok: o menu cabe na largura em todos os casos");
