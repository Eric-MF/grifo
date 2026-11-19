// Os links do menu navegam na hora, com ou sem o cartão de resumo: o clique desarma o cartão que ia abrir, e a
// barrinha sob o rótulo mostra que a página está vindo. As páginas chegam 1,5 s depois de pedidas (rede lenta), e o
// clique vem logo que a página fica interativa: antes de o Next terminar de pré-carregar os links (no site publicado,
// com os links já pré-carregados, a navegação é imediata e a barrinha nem aparece).
// node tests/e2e/menu-navegacao.mjs [BASE]
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const falhas = [];
const checar = (ok, msg) => {
  if (!ok) falhas.push(msg);
};

const b = await chromium.launch();
const erros = [];
/** As páginas (o HTML e o conteúdo que o Next baixa na navegação) chegam 1,5 s depois de pedidas. */
async function redeLenta(p) {
  await p.route(
    (u) => u.pathname.endsWith(".txt") || u.searchParams.has("_rsc") || /^\/(provas|simulados|estatisticas|jogos)\/$/.test(u.pathname),
    async (r) => {
      await new Promise((ok) => setTimeout(ok, 1500));
      await r.continue().catch(() => {});
    },
  );
}

/** Abre a página inicial (com a rede lenta) e espera o React assumir os links do menu. */
async function abrirInicio(pg, menu) {
  await pg.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await pg.waitForFunction(
    (sel) => {
      const a = document.querySelector(sel);
      return !!a && Object.keys(a).some((k) => k.startsWith("__reactFiber"));
    },
    `nav[aria-label="${menu}"] a, button[aria-label="${menu}"]`,
    { timeout: 20_000 },
  );
}

// 1. Computador: passar o mouse e clicar antes de o cartão abrir (160 ms)
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
p.on("pageerror", (e) => erros.push(e.message));
await redeLenta(p);
for (const [nome, caminho, cartao] of [
  ["Provas", "/provas/", "Resumo das provas"],
  ["Estatísticas", "/estatisticas/", "Resumo do seu desempenho"],
]) {
  await abrirInicio(p, "Principal");
  const link = p.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: nome, exact: true });
  await link.hover();
  await p.waitForTimeout(60);
  await link.click({ noWaitAfter: true });
  await p.waitForTimeout(400);
  checar(await link.locator("[data-pendente]").isVisible().catch(() => false), `${nome}: a barrinha não mostra que a página está vindo`);
  checar((await p.getByRole("dialog", { name: cartao }).count()) === 0, `${nome}: o cartão de resumo abriu depois do clique`);
  await p.waitForURL((u) => u.pathname === caminho, { timeout: 15_000 }).catch(() => checar(false, `${nome}: o clique não levou a ${caminho} (${p.url()})`));
  await p.waitForTimeout(300);
  checar((await p.locator("[data-pendente]").count()) === 0, `${nome}: a barrinha ficou depois de a página chegar`);
}
// com o cartão já aberto, o clique fecha o cartão e vai à página
await abrirInicio(p, "Principal");
const jogos = p.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Jogos", exact: true });
await jogos.hover();
await p.getByRole("dialog", { name: "Resumo dos jogos" }).waitFor();
await jogos.click({ noWaitAfter: true });
await p.waitForTimeout(250);
checar((await p.getByRole("dialog", { name: "Resumo dos jogos" }).count()) === 0, "Jogos: o cartão aberto não fechou no clique");
await p.waitForURL((u) => u.pathname === "/jogos/", { timeout: 15_000 }).catch(() => checar(false, `Jogos: o clique com o cartão aberto não navegou (${p.url()})`));
await p.close();

// 2. Celular (modo "Celular"): o menu fica aberto, com a barrinha no item tocado, até a página chegar
const c = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
c.on("pageerror", (e) => erros.push(e.message));
await c.goto(`${BASE}/`, { waitUntil: "networkidle" });
await c.evaluate(() => localStorage.setItem("grifo:prefs", JSON.stringify({ layout: "celular" })));
await redeLenta(c);
await abrirInicio(c, "Menu");
await c.getByRole("button", { name: "Menu" }).tap();
const menu = c.getByRole("navigation", { name: "Menu principal" });
await menu.getByRole("link", { name: "Simulados", exact: true }).tap();
await c.waitForTimeout(400);
checar(await menu.isVisible().catch(() => false), "celular: o menu fechou antes de a página chegar (sem aviso de que ela está vindo)");
checar(await menu.getByRole("link", { name: "Simulados", exact: true }).locator("[data-pendente]").isVisible().catch(() => false), "celular: o item tocado não mostra a barrinha");
await c.waitForURL((u) => u.pathname === "/simulados/", { timeout: 15_000 }).catch(() => checar(false, `celular: o toque não levou a /simulados/ (${c.url()})`));
await c.waitForTimeout(300);
checar((await menu.count()) === 0, "celular: o menu não fechou depois de a página chegar");

await b.close();
checar(erros.length === 0, `erros na página: ${erros.join(" | ")}`);
if (falhas.length) {
  console.error(`menu-navegacao: ${falhas.length} falha(s)\n- ${falhas.join("\n- ")}`);
  process.exit(1);
}
console.log("menu-navegacao: ok (clique antes e depois do cartão, barrinha de carregamento, menu do celular)");
