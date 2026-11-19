// O compartilhar do card do resultado.
// - Computador: as 13 redes têm o ícone (SVG) e o nome; cada uma abre o site dela (o link de compartilhar, com o
//   texto e o endereço quando a rede deixa), sem baixar nem copiar nada; Copiar imagem e Baixar PNG levam a imagem.
// - Celular: tocar numa rede abre a lista de apps do sistema com o arquivo PNG (navigator.share com `files`), sem sair
//   da página.
// - Sem imagem (o canvas não gera o PNG): no celular, a rede vai pelo link, com o texto.
// - O link que vai nas redes é o da prévia da pessoa (/c/nota/<nota>/?exame=…), com a imagem da nota dela: a página
//   tem a og:image certa e leva quem clica ao simulado. O site também tem a imagem geral, para as outras páginas.
// Uso: node tests/e2e/compartilhar.mjs [baseURL]
import { chromium, devices } from "playwright";

const BASE = process.argv[2] ?? "http://100.80.118.27:3100";
// a área de transferência e o compartilhar do sistema só existem em contexto seguro (HTTPS ou localhost): o servidor
// de desenvolvimento, pelo IP em HTTP, é tratado como seguro só neste navegador de teste (no "chromium" completo: o
// headless shell ignora essa opção)
const b = await chromium.launch({ channel: "chromium", args: [`--unsafely-treat-insecure-origin-as-secure=${new URL(BASE).origin}`] });
let falhas = 0;
const ok = (c, m) => {
  if (!c) falhas++;
  console.log(c ? "OK  " : "FAIL", m);
};

/** As redes de fora não são abertas de verdade: a página delas vira um "ok". */
async function semRedesDeFora(ctx) {
  await ctx.route(
    (u) => u.origin !== new URL(BASE).origin && !/fonts\.(googleapis|gstatic)\.com/.test(u.host),
    (r) => r.fulfill({ status: 200, contentType: "text/html", body: "ok" }),
  );
}

/** Faz um simulado curto e chega ao resultado, onde fica o card. */
async function irAoResultado(p, esperarImagem = true) {
  await p.goto(`${BASE}/simulados/38/`, { waitUntil: "networkidle" });
  for (const nome of [/Começar a prova/, /Continuar de onde parei/]) {
    const bt = p.getByRole("button", { name: nome });
    if (await bt.isVisible().catch(() => false)) {
      await bt.click();
      break;
    }
  }
  await p.locator("#folha-peca").fill("AGRAVO EM EXECUÇÃO\nNa forma do art. 197 da LEP, no prazo de 5 dias. Local, data, advogado, OAB.");
  await p.getByRole("button", { name: "Entregar", exact: true }).click();
  await p.getByRole("button", { name: /Entregar e ver a nota/ }).click();
  await p.waitForURL(/resultado/);
  await p.getByRole("button", { name: "Baixar PNG" }).waitFor();
  if (!esperarImagem) return p.waitForTimeout(1500);
  // a imagem do card fica pronta (os botões habilitam)
  await p.waitForFunction(() => [...document.querySelectorAll("button")].some((x) => x.textContent?.includes("Baixar PNG") && !x.disabled), null, { timeout: 15000 });
}

const REDES = [
  ["WhatsApp", "https://wa.me/?text="],
  ["Instagram", "https://www.instagram.com/"],
  ["Facebook", "https://www.facebook.com/sharer/sharer.php?u="],
  ["X", "https://x.com/intent/post?text="],
  ["TikTok", "https://www.tiktok.com/"],
  ["LinkedIn", "https://www.linkedin.com/sharing/share-offsite/?url="],
  ["Telegram", "https://t.me/share/url?url="],
  ["Threads", "https://www.threads.net/intent/post?text="],
  ["Bluesky", "https://bsky.app/intent/compose?text="],
  ["Pinterest", "https://www.pinterest.com/pin/create/button/?url="],
  ["Reddit", "https://www.reddit.com/submit?url="],
  ["Discord", "https://discord.com/app"],
  ["E-mail", "mailto:?subject="],
];

// 1) Computador: a rede abre o site dela; copiar e baixar ficam nos botões próprios
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
  await semRedesDeFora(ctx);
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", (e) => erros.push(e.message));
  await irAoResultado(p);
  for (const [nome, inicio] of REDES) {
    const a = p.getByRole("link", { name: `Compartilhar no ${nome}`, exact: true });
    const href = (await a.count()) === 1 ? await a.getAttribute("href") : null;
    ok(href?.startsWith(inicio) && (await a.locator("svg").count()) > 0, `computador: ${nome} com o ícone, abrindo ${inicio}`);
  }
  // o X abre a publicação com o texto e o link, sem baixar a imagem
  let baixou = false;
  p.on("download", () => (baixou = true));
  const [pop] = await Promise.all([p.waitForEvent("popup"), p.getByRole("link", { name: "Compartilhar no X", exact: true }).click()]);
  await pop.waitForLoadState("domcontentloaded").catch(() => {});
  const urlX = decodeURIComponent(pop.url());
  const trecho = urlX.match(/https:\/\/grifo\.net\.br\/c\/nota\/(\d+-\d)\/\?exame=38/)?.[1];
  ok(pop.url().startsWith("https://x.com/intent/post?text=") && !!trecho, `computador: o X abre com o texto e o link da prévia da nota (${trecho})`);
  await pop.close();
  await p.waitForTimeout(400);
  ok(!baixou, "computador: abrir a rede não baixa a imagem");
  ok(/Copiar imagem/.test((await p.locator("[class*='msg'][role=status]").textContent().catch(() => "")) ?? ""), "computador: o aviso diz como levar a imagem do card");
  // Copiar imagem e Baixar PNG levam a imagem
  await p.getByRole("button", { name: "Copiar imagem" }).click();
  await p.waitForTimeout(300);
  const tipos = await p.evaluate(async () => (await navigator.clipboard.read()).flatMap((i) => i.types));
  ok(tipos.includes("image/png"), `computador: Copiar imagem põe o PNG na área de transferência (${tipos.join(", ")})`);
  const [download] = await Promise.all([p.waitForEvent("download"), p.getByRole("button", { name: "Baixar PNG" }).click()]);
  ok(/\.png$/.test(download.suggestedFilename()), `computador: Baixar PNG baixa a imagem (${download.suggestedFilename()})`);
  // a prévia do link: a imagem do Grifo na página
  const og = await p.evaluate(() => ({
    imagem: document.querySelector('meta[property="og:image"]')?.getAttribute("content"),
    cartao: document.querySelector('meta[name="twitter:card"]')?.getAttribute("content"),
  }));
  ok(/\/compartilhar-1200x630\.jpg/.test(og.imagem ?? "") && og.cartao === "summary_large_image", `a página tem a imagem da prévia (${og.imagem}, ${og.cartao})`);
  const r = await p.request.get(`${BASE}/compartilhar-1200x630.jpg`);
  const tamanho = r.ok() ? (await r.body()).length : 0;
  ok(tamanho > 0 && tamanho < 300 * 1024, `a imagem da prévia existe e é leve (${Math.round(tamanho / 1024)} KB)`);
  // a prévia da nota: o Pinterest leva a imagem dela, e a página tem a og:image dela e leva ao simulado
  const pin = await p.getByRole("link", { name: "Compartilhar no Pinterest", exact: true }).getAttribute("href");
  ok(decodeURIComponent(pin ?? "").includes(`media=https://grifo.net.br/c/nota/${trecho}/previa.jpg`), "Pinterest: leva a imagem da prévia da nota");
  // o servidor de desenvolvimento não abre o index.html de uma pasta de public/ (o GitHub Pages abre, como em todo o
  // site): aqui a página vai pelo nome
  const paginaPrevia = `${BASE}/c/nota/${trecho}/index.html?exame=38`;
  const html = await (await p.request.get(paginaPrevia)).text();
  ok(html.includes(`<meta property="og:image" content="https://grifo.net.br/c/nota/${trecho}/previa.jpg">`), "a página da prévia tem a og:image da nota");
  ok(html.includes(`Tirei ${trecho?.replace("-", ",")} no simulado`), "a página da prévia tem o título com a nota");
  const img = await p.request.get(`${BASE}/c/nota/${trecho}/previa.jpg`);
  ok(img.ok() && img.headers()["content-type"]?.includes("image/jpeg"), "a imagem da prévia existe");
  const visita = await ctx.newPage();
  await visita.goto(paginaPrevia);
  await visita.waitForURL(/\/simulados\/38\/$/, { timeout: 10000 }).catch(() => {});
  ok(/\/simulados\/38\/$/.test(visita.url()), `quem clica na prévia vai para o simulado (${visita.url()})`);
  await visita.close();
  ok(erros.length === 0, `computador: sem erros na página (${erros.join(" | ")})`);
  await ctx.close();
}

// 2) Celular: a lista de apps do sistema recebe o arquivo PNG
{
  const ctx = await b.newContext({ ...devices["Pixel 7"] });
  await semRedesDeFora(ctx);
  await ctx.addInitScript(() => {
    window.__compartilhado = null;
    navigator.canShare = (d) => !!d?.files?.length;
    navigator.share = async (d) => {
      window.__compartilhado = { arquivos: (d.files ?? []).map((f) => ({ nome: f.name, tipo: f.type, tamanho: f.size })), texto: d.text ?? "" };
    };
  });
  const p = await ctx.newPage();
  await irAoResultado(p);
  const antes = p.url();
  let abriu = false;
  ctx.on("page", () => (abriu = true));
  await p.getByRole("link", { name: "Compartilhar no WhatsApp", exact: true }).tap();
  await p.waitForFunction(() => window.__compartilhado !== null, null, { timeout: 5000 }).catch(() => {});
  const c = await p.evaluate(() => window.__compartilhado);
  ok(c?.arquivos?.length === 1 && c.arquivos[0].tipo === "image/png" && c.arquivos[0].tamanho > 10000, `celular: o WhatsApp recebe a imagem (${JSON.stringify(c?.arquivos)})`);
  ok(/https?:\/\//.test(c?.texto ?? ""), "celular: o texto vai junto, com o link");
  await p.waitForTimeout(300);
  ok(p.url() === antes && !abriu, "celular: não sai da página nem abre o site da rede");
  ok(await p.getByRole("button", { name: "Compartilhar imagem" }).isVisible(), "celular: o botão Compartilhar imagem aparece");
  await ctx.close();
}

// 3) Sem imagem: só então o celular vai pelo link, com o texto
{
  const ctx = await b.newContext({ ...devices["Pixel 7"] });
  await semRedesDeFora(ctx);
  await ctx.addInitScript(() => {
    navigator.canShare = (d) => !!d?.files?.length;
    navigator.share = async () => {};
    HTMLCanvasElement.prototype.toBlob = function (cb) {
      setTimeout(() => cb(null), 0);
    };
  });
  const p = await ctx.newPage();
  await irAoResultado(p, false);
  const [pop] = await Promise.all([ctx.waitForEvent("page"), p.getByRole("link", { name: "Compartilhar no Telegram", exact: true }).tap()]);
  await pop.waitForLoadState("domcontentloaded").catch(() => {});
  ok(pop.url().startsWith("https://t.me/share/url?url="), `sem imagem: o Telegram abre só com o texto e o link (${pop.url().slice(0, 50)}…)`);
  ok(!(await p.getByRole("button", { name: "Compartilhar imagem" }).isVisible().catch(() => false)), "sem imagem: o botão Compartilhar imagem não aparece");
  await ctx.close();
}

console.log(`\n${falhas === 0 ? "ok: o compartilhar leva a imagem pelo sistema e abre o site de cada rede" : `${falhas} verificação(ões) falharam.`}`);
await b.close();
process.exit(falhas === 0 ? 0 : 1);
