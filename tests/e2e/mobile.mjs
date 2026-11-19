// Modo "Celular" (visualização adicional ao padrão): node tests/e2e/mobile.mjs http://100.80.118.27:3100
// Cobre: chip no ViewModeMenu e persistência, rolagem lateral nas páginas, menu hambúrguer,
// contagem da folha igual em 360px e 1280px, largura fixa com rolagem, e o jogo em pé (girar no meio pausa).
import { chromium, devices } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const PAGINAS = ["/", "/provas/", "/simulados/", "/simulados/32/", "/treino/", "/jogos/", "/jogos/flap-suitcase/", "/verificar/", "/estatisticas/", "/estatisticas/#desempenho", "/estatisticas/#linha"];
const TEXTO = Array.from({ length: 14 }, (_, i) => `Parágrafo ${i + 1}: o examinando deve fundamentar a tese com a jurisprudência do STJ e com o dispositivo legal aplicável ao caso concreto.`).join("\n");

const b = await chromium.launch();
let falhas = 0;
const ok = (c, m) => {
  if (!c) falhas++;
  console.log(c ? "OK  " : "FAIL", m);
};

// Contexto com o layout definido antes de qualquer script da página (sem piscada)
async function contexto(dispositivo, { layout, folha, largura = 360, altura = 800 } = {}) {
  const base = dispositivo ? devices[dispositivo] : {};
  const ctx = await b.newContext({ ...base, viewport: { width: largura, height: altura }, isMobile: !!dispositivo, hasTouch: !!dispositivo });
  if (layout !== undefined || folha !== undefined) {
    await ctx.addInitScript(([v, f]) => {
      if (v !== undefined) {
        const p = JSON.parse(localStorage.getItem("grifo:prefs") || "{}");
        p.layout = v;
        localStorage.setItem("grifo:prefs", JSON.stringify(p));
      }
      // só define o valor inicial: o init script roda em cada navegação e não pode desfazer a escolha do usuário
      if (f !== undefined && localStorage.getItem("grifo:folha-modo") === null) localStorage.setItem("grifo:folha-modo", f);
    }, [layout, folha]);
  }
  return ctx;
}

// Abre a prova: "Começar a prova" ou, havendo rascunho, "Continuar de onde parei"
const comecarProva = async (p) => {
  for (const nome of ["Começar a prova", "Continuar de onde parei"]) {
    const b = p.getByRole("button", { name: nome });
    if (await b.isVisible().catch(() => false)) return b.click();
  }
};


for (const dispositivo of ["Pixel 7", "iPhone 13"]) {
  console.log(`\n== ${dispositivo} ==`);

  // 1) Chip "Celular" no ViewModeMenu, persistência após recarregar
  {
    const ctx = await contexto(dispositivo, { largura: 360, altura: 800 });
    const p = await ctx.newPage();
    await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
    ok((await p.getAttribute("html", "data-layout")) === null, "padrão: sem data-layout (layout atual é o padrão)");
    await p.getByRole("button", { name: "Modos de visualização" }).click();
    await p.getByRole("dialog", { name: "Modos de visualização" }).getByRole("button", { name: "Celular", exact: true }).click();
    await p.keyboard.press("Escape");
    ok((await p.getAttribute("html", "data-layout")) === "celular", "chip Celular liga data-layout=celular");
    await p.reload({ waitUntil: "networkidle" });
    ok((await p.getAttribute("html", "data-layout")) === "celular", "após recarregar, o modo Celular continua ligado");
    await ctx.close();
  }

  // 2) Sem rolagem lateral em nenhuma página, nos dois modos
  for (const layout of [undefined, "celular"]) {
    const ctx = await contexto(dispositivo, { layout, largura: 360, altura: 800 });
    const p = await ctx.newPage();
    for (const rota of PAGINAS) {
      await p.goto(`${BASE}${rota}`, { waitUntil: "networkidle" });
      const excesso = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      ok(excesso <= 0, `${layout ?? "padrão"} 360px ${rota}: sem rolagem lateral (excesso ${excesso}px)`);
    }
    await ctx.close();
  }

  // 3) Menu hambúrguer só no modo Celular
  {
    const ctx = await contexto(dispositivo, { layout: "celular", largura: 360, altura: 800 });
    const p = await ctx.newPage();
    await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
    const botao = p.getByRole("button", { name: "Menu", exact: true });
    ok(await botao.isVisible(), "celular: botão Menu visível");
    ok(!(await p.getByRole("navigation", { name: "Menu principal" }).isVisible().catch(() => false)), "celular: painel fechado no início");
    await botao.click();
    const painel = p.getByRole("navigation", { name: "Menu principal" });
    ok(await painel.isVisible(), "celular: painel abre ao tocar no Menu");
    await painel.getByRole("link", { name: "Simulados", exact: true }).click();
    await p.waitForURL(/\/simulados\//, { timeout: 10000 }).catch(() => {});
    ok(/\/simulados\//.test(p.url()), "celular: navegar pelo menu leva à página");
    ok(!(await p.getByRole("navigation", { name: "Menu principal" }).isVisible().catch(() => false)), "celular: painel fecha ao navegar");
    await ctx.close();
  }

  // 4) Folha: mesma contagem de linhas em 360px e 1280px (texto igual, modo "Ajustar à tela")
  {
    const contagens = {};
    for (const largura of [360, 1280]) {
      const ctx = await contexto(dispositivo, { layout: "celular", folha: "ajustar", largura, altura: 900 });
      const p = await ctx.newPage();
      await p.goto(`${BASE}/simulados/32/`, { waitUntil: "networkidle" });
      await p.getByRole("button", { name: "Começar a prova" }).click();
      await p.locator("textarea").first().fill(TEXTO);
      await p.waitForTimeout(400);
      contagens[largura] = (await p.locator("[aria-live=polite]").first().textContent())?.trim();
      await ctx.close();
    }
    ok(contagens[360] === contagens[1280] && /linhas/.test(contagens[360] ?? ""), `folha: contagem igual em 360px (${contagens[360]}) e 1280px (${contagens[1280]})`);
  }

  // 5) Largura fixa: rolagem interna à folha, sem rolagem da página, e a escolha persiste
  {
    const ctx = await contexto(dispositivo, { layout: "celular", folha: "ajustar", largura: 360, altura: 800 });
    const p = await ctx.newPage();
    await p.goto(`${BASE}/simulados/32/`, { waitUntil: "networkidle" });
    await comecarProva(p);
    await p.getByRole("group", { name: "Largura da folha" }).getByRole("button", { name: "Largura fixa" }).click();
    await p.reload({ waitUntil: "networkidle" });
    await comecarProva(p);
    const pressionado = await p.getByRole("group", { name: "Largura da folha" }).getByRole("button", { name: "Largura fixa" }).getAttribute("aria-pressed");
    ok(pressionado === "true", "largura fixa: a escolha persiste após recarregar");
    const rolagemFolha = await p.evaluate(() => {
      const s = document.querySelector("textarea")?.closest("div[class*='scroll']") ?? document.querySelector("textarea")?.parentElement;
      return s ? s.scrollWidth - s.clientWidth : -1;
    });
    const rolagemPagina = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    ok(rolagemFolha > 0 && rolagemPagina <= 0, `largura fixa: a folha rola sozinha (${rolagemFolha}px) e a página não (${rolagemPagina}px)`);
    await ctx.close();
  }

  // 6) Jogo em pé: joga normalmente, com o mundo mais alto (a largura lógica fica em 500); girar no meio da partida
  // pausa, e deitado o mundo volta à altura de 640
  {
    const ctx = await contexto(dispositivo, { layout: "celular", largura: 360, altura: 760 });
    const p = await ctx.newPage();
    await p.goto(`${BASE}/jogos/flap-suitcase/?debug=1`, { waitUntil: "networkidle" });
    await p.waitForTimeout(600);
    ok(!(await p.getByText("Gire o celular").isVisible().catch(() => false)), "jogo em pé: sem aviso para girar");
    const jogar = p.getByRole("button", { name: /Jogar/ }).first();
    ok(await jogar.isEnabled(), "jogo em pé: Jogar habilitado");
    await jogar.click();
    // o resto mexe no jogo pelo window.__flap (?debug=1), que só existe fora de produção: no site publicado (o
    // npm run e2e), fica para o next dev
    const comDepuracao = await p
      .waitForFunction(() => window.__flap !== undefined, null, { timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    if (!comDepuracao) {
      console.log("--   jogo em pé: o resto precisa do next dev (window.__flap); pulado no site publicado");
      await ctx.close();
      continue;
    }
    await p.evaluate(() => {
      window.__flap.orbesLigados = false;
      window.__flap.invulneravel = true;
    });
    const caixa = await p.locator("canvas").first().boundingBox();
    const tocar = () => p.touchscreen.tap(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2);
    await tocar();
    const inicio = Date.now();
    let e = await p.evaluate(() => window.__flap.estado());
    while (Date.now() - inicio < 2500) {
      if (e.jogador.y > e.H * 0.55) await tocar();
      await p.waitForTimeout(60);
      e = await p.evaluate(() => window.__flap.estado());
    }
    ok(e.estado === "jogando", `jogo em pé: a partida corre (${e.estado})`);
    ok(Math.round(e.W) === 500 && e.H > 640, `jogo em pé: mundo alto (${Math.round(e.W)} x ${Math.round(e.H)})`);
    ok(e.pilares.every((q) => q.vao > 0 && q.vao < e.H - 40), "jogo em pé: os vãos ficam dentro da tela");
    await p.setViewportSize({ width: 760, height: 360 });
    await p.waitForTimeout(500);
    e = await p.evaluate(() => window.__flap.estado());
    ok(e.estado === "pausado", `girar no meio da partida pausa (${e.estado})`);
    ok(Math.round(e.H) === 640, `deitado: altura lógica 640 (${Math.round(e.H)})`);
    ok(e.pilares.every((q) => q.vao - q.abertura / 2 > 0 && q.vao + q.abertura / 2 < e.H - 40), "deitado: os vãos voltam para dentro da tela");
    await ctx.close();
  }
}

// 7) Desktop: sem o modo Celular, o layout atual e o menu de navegação continuam como estavam
{
  const ctx = await contexto(undefined, { largura: 1280, altura: 800 });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
  ok((await p.getAttribute("html", "data-layout")) === null, "desktop padrão: sem data-layout");
  ok(!(await p.getByRole("button", { name: "Menu", exact: true }).isVisible().catch(() => false)), "desktop: sem botão hambúrguer");
  await ctx.close();
}

console.log(`\n${falhas === 0 ? "Todas as verificações passaram." : `${falhas} verificação(ões) falharam.`}`);
await b.close();
process.exit(falhas === 0 ? 0 : 1);
