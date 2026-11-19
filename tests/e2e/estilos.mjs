// Passa por todos os estilos do menu: compra tudo no progresso salvo, joga um pouco com cada um e tira uma captura.
// Uso: node tests/e2e/estilos.mjs [baseURL] [pastaScreenshots]
import { chromium } from "playwright";
import { readFileSync, readdirSync, statSync } from "node:fs";

const BASE = process.argv[2] ?? "http://100.80.118.27:3100";
const OUT = process.argv[3] ?? "/tmp";
const RAIZ = new URL("../../", import.meta.url);

// arquivos .ts de uma pasta, em todas as subpastas (a pasta de estilos pode não existir)
function arquivosTs(dir) {
  let nomes;
  try {
    nomes = readdirSync(dir);
  } catch {
    return [];
  }
  return nomes.flatMap((nome) => {
    const caminho = new URL(nome, dir);
    if (statSync(caminho).isDirectory()) return arquivosTs(new URL(`${nome}/`, dir));
    return nome.endsWith(".ts") ? [caminho] : [];
  });
}

// ids de todos os estilos: os do themes.ts e os dos arquivos da pasta estilos/
const fontes = [new URL("src/games/flap-suitcase/themes.ts", RAIZ), ...arquivosTs(new URL("src/games/flap-suitcase/estilos/", RAIZ))];
const idsEstilos = [...new Set(fontes.flatMap((f) => [...readFileSync(f, "utf8").matchAll(/^  id: "([^"]+)",$/gm)].map((m) => m[1])))];

const b = await chromium.launch();
try {
  const p = await b.newPage({ viewport: { width: 1280, height: 860 } });
  const erros = [];
  p.on("pageerror", (e) => erros.push(String(e)));
  p.on("console", (m) => m.type() === "error" && erros.push(m.text()));

  // compra todos os estilos no progresso salvo (preserva o que já houver), como no jogo.mjs
  await p.addInitScript((comprados) => {
    const salvo = JSON.parse(localStorage.getItem("grifo:jogo:flap-suitcase") ?? "{}");
    salvo.progresso = { ...(salvo.progresso ?? { xp: 0, moedas: 0 }), comprados: [...new Set([...(salvo.progresso?.comprados ?? []), ...comprados])] };
    localStorage.setItem("grifo:jogo:flap-suitcase", JSON.stringify(salvo));
  }, idsEstilos);

  await p.goto(`${BASE}/jogos/flap-suitcase/?debug=1`, { waitUntil: "networkidle" });
  await p.getByRole("button", { name: "▶ Jogar" }).waitFor();

  // os grupos do menu vêm fechados: abre todos antes de ler e clicar nos estilos
  const abrirDetails = () => p.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));
  const fieldsetEstilo = () => p.locator("fieldset", { has: p.locator("legend", { hasText: /^Estilo$/ }) });

  await abrirDetails();
  const nomes = (await fieldsetEstilo().locator("button[aria-pressed]").allInnerTexts()).map((t) => t.trim());

  // se aparecer uma pergunta no meio do voo, responde a primeira alternativa
  const responderPergunta = async () => {
    if (!(await p.getByRole("dialog").isVisible().catch(() => false))) return;
    await p.getByRole("dialog").getByRole("button", { name: /^A\b/ }).click();
    await p.getByRole("button", { name: "Continuar" }).click();
  };

  for (const nome of nomes) {
    await abrirDetails();
    await fieldsetEstilo().getByRole("button", { name: nome, exact: true }).click();
    await p.getByRole("button", { name: "▶ Jogar" }).click();
    await p.keyboard.press("Space");
    const fim = Date.now() + 1500;
    while (Date.now() < fim) {
      const y = await p.evaluate(() => window.__jogador?.y ?? 0);
      if (y > 330) await p.keyboard.press("Space");
      await responderPergunta();
      await p.waitForTimeout(40);
    }
    const slug = nome
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-");
    await p.locator("canvas").first().screenshot({ path: `${OUT}/estilo-${slug}.png` });

    // volta ao menu pela pausa
    await p.keyboard.press("KeyP");
    await p.waitForTimeout(150);
    const menu = p.getByRole("button", { name: "Menu" });
    if (await menu.isVisible().catch(() => false)) await menu.click();
  }

  console.log(`estilos: ${nomes.length}`);
  console.log("erros:", erros.length ? erros : "nenhum");
} finally {
  await b.close();
}
