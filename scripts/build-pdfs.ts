// Gera os PDFs "atualizados" a partir das rotas /print/* do build estático (out/).
//   npm run build && node scripts/build-pdfs.ts [ids…]  (depois rode `npm run build` de novo
//   para a página /provas enxergar os novos arquivos)
//   node scripts/build-pdfs.ts --leis   só os PDFs das leis do leitor (public/downloads/leis/)
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { chromium } from "playwright";
import { SITE } from "../src/config/site.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const OUT = join(ROOT, "out");
const DEST = join(ROOT, "public/downloads");
if (!existsSync(OUT)) throw new Error("rode `npm run build` antes (pasta out/ não encontrada)");
mkdirSync(join(DEST, "atualizados"), { recursive: true });
mkdirSync(join(DEST, "folhas"), { recursive: true });

const TIPOS: Record<string, string> = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".webp": "image/webp", ".json": "application/json" };
const srv = createServer((req, res) => {
  const p = decodeURIComponent((req.url ?? "/").split("?")[0]);
  let f = join(OUT, p);
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, "index.html");
  if (!existsSync(f)) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { "Content-Type": TIPOS[extname(f)] ?? "application/octet-stream" }).end(readFileSync(f));
});
await new Promise<void>((r) => srv.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${(srv.address() as { port: number }).port}`;

const idx: { id: string; transcrito: boolean; corrigivel: boolean }[] = JSON.parse(readFileSync(join(ROOT, "src/content/generated/exames-index.json"), "utf8"));
const args = process.argv.slice(2);
const soLeis = args.includes("--leis");
const filtro = args.filter((a) => !a.startsWith("--"));
const alvos = soLeis ? [] : idx.filter((e) => e.transcrito && (!filtro.length || filtro.includes(e.id)));

const browser = await chromium.launch();
const page = await browser.newPage();
async function imprimir(rota: string, arquivo: string) {
  await page.goto(base + rota, { waitUntil: "networkidle" });
  // links do site (ex.: artigos citados, que abrem no leitor do Grifo) viram endereços completos
  await page.evaluate((site) => {
    document.querySelectorAll<HTMLAnchorElement>("a[href^='/']").forEach((a) => (a.href = site + a.getAttribute("href")));
  }, SITE.url);
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: arquivo, format: "A4", printBackground: true, preferCSSPageSize: true });
  console.log("✓", arquivo.replace(ROOT, ""));
}
if (!filtro.length && !soLeis) await imprimir("/print/folha-resposta/", join(DEST, "folhas/folha-resposta-penal.pdf"));
if (soLeis) {
  mkdirSync(join(DEST, "leis"), { recursive: true });
  const leis: { id: string }[] = JSON.parse(readFileSync(join(ROOT, "src/content/generated/leis-indice.json"), "utf8"));
  for (const { id } of leis.filter((l) => !filtro.length || filtro.includes(l.id))) {
    await page.goto(`${base}/leis/${id}/`, { waitUntil: "networkidle", timeout: 180_000 });
    // links do site viram endereços completos: o PDF não roda no servidor local
    await page.evaluate((site) => {
      document.querySelectorAll<HTMLAnchorElement>("a[href^='/']").forEach((a) => (a.href = site + a.getAttribute("href")));
    }, SITE.url);
    await page.evaluate(() => document.fonts.ready);
    const arquivo = join(DEST, "leis", `${id}.pdf`);
    await page.pdf({ path: arquivo, format: "A4", printBackground: false, margin: { top: "16mm", bottom: "16mm", left: "18mm", right: "18mm" } });
    console.log("✓", arquivo.replace(ROOT, ""));
  }
}
for (const e of alvos) {
  await imprimir(`/print/caderno/${e.id}/`, join(DEST, "atualizados", `caderno-${e.id}-atualizado.pdf`));
  if (e.corrigivel) await imprimir(`/print/gabarito/${e.id}/`, join(DEST, "atualizados", `gabarito-${e.id}-atualizado.pdf`));
}
await browser.close();
srv.close();
