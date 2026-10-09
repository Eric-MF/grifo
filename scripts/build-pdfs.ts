// Gera os PDFs "atualizados" a partir das rotas /print/* do build estático (out/).
//   npm run build && node scripts/build-pdfs.ts [ids…]  (depois rode `npm run build` de novo
//   para a página /provas enxergar os novos arquivos)
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { chromium } from "playwright";

const ROOT = new URL("..", import.meta.url).pathname;
const OUT = join(ROOT, "out");
const DEST = join(ROOT, "public/downloads");
if (!existsSync(OUT)) throw new Error("rode `npm run build` antes (pasta out/ não encontrada)");
mkdirSync(join(DEST, "atualizados"), { recursive: true });
mkdirSync(join(DEST, "folhas"), { recursive: true });

const TIPOS: Record<string, string> = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".webp": "image/webp", ".json": "application/json" };
const srv = createServer((req, res) => {
  let p = decodeURIComponent((req.url ?? "/").split("?")[0]);
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
const filtro = process.argv.slice(2);
const alvos = idx.filter((e) => e.transcrito && (!filtro.length || filtro.includes(e.id)));

const browser = await chromium.launch();
const page = await browser.newPage();
async function imprimir(rota: string, arquivo: string) {
  await page.goto(base + rota, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: arquivo, format: "A4", printBackground: true, preferCSSPageSize: true });
  console.log("✓", arquivo.replace(ROOT, ""));
}
if (!filtro.length) await imprimir("/print/folha-resposta/", join(DEST, "folhas/folha-resposta-penal.pdf"));
for (const e of alvos) {
  await imprimir(`/print/caderno/${e.id}/`, join(DEST, "atualizados", `caderno-${e.id}-atualizado.pdf`));
  if (e.corrigivel) await imprimir(`/print/gabarito/${e.id}/`, join(DEST, "atualizados", `gabarito-${e.id}-atualizado.pdf`));
}
await browser.close();
srv.close();
