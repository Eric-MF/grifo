// Coleta o texto compilado das leis do leitor (content/leis.yaml, `ler: true`) no Planalto e grava
// content/leis-texto/<id>.json, mais as datas das leis alteradoras em content/leis-alteradoras.yaml.
//
//   node scripts/baixar-leis.ts             usa o cache em .cache/planalto/ quando existe
//   node scripts/baixar-leis.ts --atualizar baixa tudo de novo
//   node scripts/baixar-leis.ts --check     só compara com a coleta anterior e falha se a estrutura mudou demais
//
// Se o acesso direto falhar, usa o proxy PJE_PROXY de ../.env (via Playwright).
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse, stringify } from "yaml";
import { LeisSchema } from "../src/content/schema.ts";
import { datasDaLei, textoDaPagina, type DatasLei } from "./leis/alteradora.ts";
import { lerHtml, type Bloco } from "./leis/parser.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const CACHE = join(ROOT, ".cache", "planalto");
const OUT = join(ROOT, "content", "leis-texto");
const ARQ_ALTERADORAS = join(ROOT, "content", "leis-alteradoras.yaml");
const args = new Set(process.argv.slice(2));
const atualizar = args.has("--atualizar");
const soChecar = args.has("--check");
const PAUSA_MS = 400;

const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

function lerProxy() {
  const env = join(ROOT, "..", ".env");
  if (!existsSync(env)) return null;
  const valor = readFileSync(env, "utf8").match(/^PJE_PROXY=(.*)$/m)?.[1].trim().replace(/^['"]|['"]$/g, "");
  if (!valor) return null;
  const u = new URL(valor.includes("://") ? valor : `http://${valor}`);
  return { server: `${u.protocol}//${u.host}`, ...(u.username ? { username: decodeURIComponent(u.username), password: decodeURIComponent(u.password) } : {}) };
}

let viaProxy = false;
async function baixarComProxy(url: string): Promise<Buffer> {
  const proxy = lerProxy();
  if (!proxy) throw new Error(`acesso direto a ${url} falhou e PJE_PROXY não está definido`);
  const { chromium } = await import("playwright");
  const b = await chromium.launch({ headless: true, proxy });
  try {
    const r = await (await b.newContext()).request.get(url, { timeout: 120_000 });
    if (!r.ok()) throw new Error(`HTTP ${r.status()} em ${url}`);
    return await r.body();
  } finally {
    await b.close();
  }
}

/** O Planalto serve windows-1252 na maioria das páginas, mas há UTF-16 (com BOM) e UTF-8. */
export function decodificar(buf: Uint8Array): string {
  if (buf[0] === 0xff && buf[1] === 0xfe) return new TextDecoder("utf-16le").decode(buf);
  if (buf[0] === 0xfe && buf[1] === 0xff) return new TextDecoder("utf-16be").decode(buf);
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return new TextDecoder("utf-8").decode(buf);
  const cabeca = new TextDecoder("latin1").decode(buf.subarray(0, 4096));
  const charset = cabeca.match(/charset\s*=\s*["']?([\w-]+)/i)?.[1].toLowerCase();
  return new TextDecoder(charset === "utf-8" ? "utf-8" : "windows-1252").decode(buf);
}

/** HTML decodificado, com cache em disco. */
async function pagina(url: string, cache: string): Promise<string> {
  if (!atualizar && existsSync(cache)) return decodificar(readFileSync(cache));
  let corpo: Buffer;
  let r: Response | null = null;
  if (!viaProxy) {
    try {
      r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (Grifo; coleta de legislação)" }, redirect: "follow" });
    } catch {
      // só falha de rede (bloqueio, DNS, conexão) leva ao proxy; um 404 é do link, não do acesso
      viaProxy = true;
    }
  }
  if (r) {
    if (!r.ok) throw new Error(`HTTP ${r.status} em ${url}`);
    corpo = Buffer.from(await r.arrayBuffer());
  } else corpo = await baixarComProxy(url);
  mkdirSync(join(cache, ".."), { recursive: true });
  writeFileSync(cache, corpo);
  await pausa(PAUSA_MS);
  return decodificar(corpo);
}

interface LeiTexto {
  id: string;
  nome: string;
  url: string;
  coletadoEm: string;
  sha256: string;
  blocos: Bloco[];
}

const leis = LeisSchema.parse(parse(readFileSync(join(ROOT, "content/leis.yaml"), "utf8")));
const alvo = Object.entries(leis.diplomas).filter(([, d]) => d.ler && d.planalto);
mkdirSync(OUT, { recursive: true });

const relatorio: Record<string, unknown> = {};
const falhas: string[] = [];
const alteradoras = new Map<string, string>(); // lei → URL absoluta da página

for (const [id, d] of alvo) {
  const html = await pagina(d.planalto!, join(CACHE, `${id}.html`));
  const { blocos, relatorio: r } = lerHtml(html);
  const arquivo = join(OUT, `${id}.json`);
  const anterior: LeiTexto | null = existsSync(arquivo) ? JSON.parse(readFileSync(arquivo, "utf8")) : null;
  const antes = new Set(anterior?.blocos.filter((b) => b.tipo === "artigo" && !b.superada).map((b) => b.disp!) ?? []);
  const agora = new Set(r.artigos);
  const novos = [...agora].filter((a) => !antes.has(a));
  const sumiram = [...antes].filter((a) => !agora.has(a));
  const textoSolto = r.semDispositivo / Math.max(1, r.blocos);
  relatorio[id] = { ...r, artigos: r.artigos.length, novos: anterior ? novos : [], sumiram, textoSolto: Number(textoSolto.toFixed(4)) };
  if (r.anotacoesNaoReconhecidas.length) falhas.push(`${id}: ${r.anotacoesNaoReconhecidas.length} anotação(ões) não reconhecida(s)`);
  if (textoSolto > 0.01) falhas.push(`${id}: ${(textoSolto * 100).toFixed(1)}% dos blocos sem dispositivo (limite 1%)`);
  if (anterior && sumiram.length > 5) falhas.push(`${id}: ${sumiram.length} artigos sumiram desde a coleta anterior`);
  if (!r.artigos.length) falhas.push(`${id}: nenhum artigo reconhecido`);
  for (const b of blocos)
    for (const a of b.atos) if (a.lei && a.href && !alteradoras.has(a.lei)) alteradoras.set(a.lei, new URL(a.href, d.planalto).href);
  if (!soChecar) {
    const saida: LeiTexto = { id, nome: d.nome, url: d.planalto!, coletadoEm: new Date().toISOString().slice(0, 10), sha256: sha256(html), blocos };
    writeFileSync(arquivo, JSON.stringify(saida));
  }
  console.log(`${id}: ${r.artigos.length} artigos, ${r.blocos} blocos${novos.length && anterior ? `, ${novos.length} novos` : ""}${sumiram.length ? `, ${sumiram.length} sumiram` : ""}`);
}

if (!soChecar) {
  writeFileSync(join(OUT, "_relatorio.json"), JSON.stringify(relatorio, null, 1) + "\n");

  // Datas das leis alteradoras; entradas com `manual: true` não são tocadas.
  type Entrada = DatasLei & { url?: string; manual?: boolean; nota?: string };
  const existentes: Record<string, Entrada> = existsSync(ARQ_ALTERADORAS) ? (parse(readFileSync(ARQ_ALTERADORAS, "utf8")) ?? {}) : {};
  const datas: Record<string, Entrada> = { ...existentes };
  let pendentes = 0;
  for (const [lei, url] of [...alteradoras].sort()) {
    if (existentes[lei]?.manual) continue;
    if (existentes[lei]?.vigencia && !atualizar) continue;
    try {
      const html = await pagina(url, join(CACHE, "alteradoras", `${lei}.html`));
      datas[lei] = { ...datasDaLei(textoDaPagina(html)), url };
    } catch (e) {
      datas[lei] = { pendencia: `não foi possível baixar: ${(e as Error).message}`, url };
    }
    if (!datas[lei].vigencia) pendentes++;
  }
  writeFileSync(
    ARQ_ALTERADORAS,
    "# Datas das leis que alteraram os diplomas do leitor, usadas na linha do tempo.\n" +
      "# Geradas por scripts/baixar-leis.ts a partir do Planalto. Para corrigir à mão, edite e marque `manual: true`.\n" +
      stringify(Object.fromEntries(Object.entries(datas).sort(([a], [b]) => a.localeCompare(b))), { lineWidth: 0 }),
  );
  console.log(`leis alteradoras: ${alteradoras.size} · sem vigência deduzida: ${pendentes}${viaProxy ? " · via proxy" : ""}`);
}

if (falhas.length) {
  console.error(falhas.map((f) => `✗ ${f}`).join("\n"));
  process.exit(1);
}
console.log("estrutura das leis ok ✓");
