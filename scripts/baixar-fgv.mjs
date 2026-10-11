// Baixa de oab.fgv.br os cadernos e padrões de resposta de cada Exame de Ordem.
// Uso: node scripts/baixar-fgv.mjs [--keys=643,642]
// Proxy: se o acesso direto falhar, usa PJE_PROXY de ../.env (raiz acima do projeto).
import { chromium } from "playwright";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const OUT = join(ROOT, ".examples", "fgv");
const BASE = "https://oab.fgv.br";
const SECCIONAL = "OAB / SP";
const PAUSA_MS = 800;

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const normalizarTexto = (s) => s.replace(/\s+/g, " ").trim();

function lerProxy() {
  const env = join(ROOT, "..", ".env");
  if (!existsSync(env)) return null;
  const m = readFileSync(env, "utf8").match(/^PJE_PROXY=(.*)$/m);
  const valor = m?.[1].trim().replace(/^['"]|['"]$/g, "");
  if (!valor) return null;
  const u = new URL(valor.includes("://") ? valor : `http://${valor}`);
  return {
    server: `${u.protocol}//${u.host}`,
    ...(u.username ? { username: decodeURIComponent(u.username), password: decodeURIComponent(u.password) } : {}),
  };
}

async function abrirNavegador() {
  const direto = await chromium.launch({ headless: true });
  const page = await direto.newPage();
  try {
    await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 });
    return { browser: direto, via: "direto" };
  } catch (e) {
    await direto.close();
    const proxy = lerProxy();
    if (!proxy) throw new Error(`acesso direto falhou e PJE_PROXY não está definido: ${e.message}`);
    const comProxy = await chromium.launch({ headless: true, proxy });
    return { browser: comProxy, via: "proxy PJE_PROXY" };
  }
}

async function listarExames(page) {
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 90000 });
  const links = await page.$$eval("a", (as) => as.map((a) => [a.textContent.trim(), a.href]));
  const mapa = new Map();
  for (const [texto, href] of links) {
    const m = href.match(/home\.aspx\?key=(\d+)/);
    if (m && /EXAME/i.test(texto)) mapa.set(m[1], normalizarTexto(texto));
  }
  return mapa;
}

const ROMANOS = { I: 1, V: 5, X: 10, L: 50 };
function romanoParaInt(r) {
  let total = 0;
  for (let i = 0; i < r.length; i++) {
    const v = ROMANOS[r[i]], prox = ROMANOS[r[i + 1]];
    total += prox && prox > v ? -v : v;
  }
  return total;
}

function numeroDoExame(texto) {
  const arabico = texto.match(/(\d+)º/);
  if (arabico) return String(Number(arabico[1]));
  const romano = texto.match(/\b([IVXL]+)\s+EXAME/i);
  if (romano) return String(romanoParaInt(romano[1].toUpperCase()));
  const ano = texto.match(/(\d{4}\.\d)/);
  if (ano) return ano[1];
  return null;
}

function classificar(titulo, arquivo) {
  const t = normalizarTexto(titulo);
  const a = normalizarTexto(arquivo);
  if (/Gabaritos? Preliminares? da Prova Objetiva/i.test(t)) return { tipo: "objetiva-gabarito-preliminar" };
  if (/Gabaritos? Definitivos? da Prova Objetiva/i.test(t)) return { tipo: "objetiva-gabarito-definitivo" };
  const tipoCaderno = t.match(/Caderno de Prova\s*(?:-\s*Tipo\s*|\s+)0?(\d)$/i);
  if (tipoCaderno) return { tipo: "objetiva-caderno", tipoProva: Number(tipoCaderno[1]) };
  const gabaritoCaderno = t.match(/^Gabarito do Caderno de Prova\s+0?(\d)$/i);
  if (gabaritoCaderno) return { tipo: "objetiva-gabarito-indefinido", tipoProva: Number(gabaritoCaderno[1]) };
  const caderno = t.match(/^Caderno de Provas?\s*\((.+)\)$/i);
  if (caderno) return { tipo: "pratica-caderno", area: caderno[1], tipoProva: Number(a.match(/Tipo (\d)/i)?.[1] ?? 0) };
  const definitivo = t.match(/^Padrão de respostas definitivo\s*(?:\((.+)\)|-\s*(.+))$/i);
  if (definitivo) return { tipo: "pratica-padrao-definitivo", area: definitivo[1] ?? definitivo[2] };
  const preliminar = t.match(/^Padrão de respostas\s*\((.+)\)$/i);
  if (preliminar) return { tipo: "pratica-padrao-preliminar", area: preliminar[1] };
  const indefinido = t.match(/^Padrão de respostas\s*-\s*(.+)$/i);
  if (indefinido) return { tipo: "pratica-padrao-indefinido", area: indefinido[1] };
  return null;
}

async function baixar(context, url, destino) {
  if (existsSync(destino) && statSync(destino).size > 0) return "já existia";
  const resp = await context.request.get(new URL(url).href, { timeout: 120000 });
  if (!resp.ok()) return `HTTP ${resp.status()}`;
  const corpo = await resp.body();
  if (corpo.subarray(0, 4).toString() !== "%PDF") return `não é PDF (${resp.headers()["content-type"] ?? "?"})`;
  mkdirSync(join(destino, ".."), { recursive: true });
  writeFileSync(destino, corpo);
  return "ok";
}

async function textoDoPdf(caminho) {
  const doc = await getDocument({ data: new Uint8Array(readFileSync(caminho)), verbosity: 0 }).promise;
  let texto = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const { items } = await (await doc.getPage(i)).getTextContent();
    texto += items.map((it) => it.str + (it.hasEOL ? "\n" : "")).join("") + "\n";
  }
  return texto;
}

function gabaritoPorTipo(texto) {
  const porTipo = new Map();
  let tipo = null;
  let numeros = null;
  for (const linha of texto.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const cabecalho = linha.match(/TIPO\s+(\d+)$/i);
    if (cabecalho) {
      tipo = Number(cabecalho[1]);
      if (!porTipo.has(tipo)) porTipo.set(tipo, new Map());
      numeros = null;
      continue;
    }
    if (tipo === null) continue;
    const tokens = linha.split(/\s+/);
    if (tokens.every((t) => /^\d+$/.test(t))) {
      numeros = tokens.map(Number);
      continue;
    }
    if (numeros && tokens.length === numeros.length && tokens.every((t) => /^([A-E]|\*)$/.test(t))) {
      numeros.forEach((n, i) => porTipo.get(tipo).set(n, tokens[i]));
      numeros = null;
    }
  }
  return porTipo;
}

async function compararGabaritos(pastaObjetiva) {
  const pre = join(pastaObjetiva, "gabarito-preliminar.pdf");
  const def = join(pastaObjetiva, "gabarito-definitivo.pdf");
  if (!existsSync(pre) || !existsSync(def)) return { erro: "gabarito preliminar ou definitivo ausente" };
  const gPre = gabaritoPorTipo(await textoDoPdf(pre)).get(1);
  const gDef = gabaritoPorTipo(await textoDoPdf(def)).get(1);
  if (!gPre || !gDef) return { erro: "Tipo 1 não encontrado em um dos gabaritos" };
  const numeros = [...new Set([...gPre.keys(), ...gDef.keys()])].sort((a, b) => a - b);
  const diferencas = numeros
    .filter((n) => gPre.get(n) !== gDef.get(n))
    .map((n) => ({ questao: n, preliminar: gPre.get(n) ?? null, definitivo: gDef.get(n) ?? null }));
  const resultado = { tipo: 1, questoesPreliminar: gPre.size, questoesDefinitivo: gDef.size, diferencas };
  writeFileSync(join(pastaObjetiva, "diferencas.json"), JSON.stringify(resultado, null, 2) + "\n");
  const linhas = diferencas.map((d) => `| ${d.questao} | ${d.preliminar ?? "—"} | ${d.definitivo ?? "—"} |`);
  writeFileSync(
    join(pastaObjetiva, "diferencas.md"),
    [
      `# Diferenças entre gabarito preliminar e definitivo (Tipo 1)`,
      "",
      `Questões no preliminar: ${gPre.size}. No definitivo: ${gDef.size}. Diferenças: ${diferencas.length}.`,
      "",
      "| Questão | Preliminar | Definitivo |",
      "|---|---|---|",
      ...linhas,
      "",
    ].join("\n"),
  );
  return { questoesPreliminar: gPre.size, questoesDefinitivo: gDef.size, diferencas: diferencas.length };
}

async function listarArquivos(page, key) {
  await page.goto(`${BASE}/home.aspx?key=${key}`, { waitUntil: "networkidle", timeout: 90000 });
  await page.selectOption("#ContentPlaceHolder1_listSeccional", { label: SECCIONAL });
  await page.waitForURL(/NovoSec/, { timeout: 60000 });
  await page.waitForLoadState("networkidle").catch(() => {});
  return page.$$eval("a", (as) =>
    as.filter((a) => /\/arq\//.test(a.href)).map((a) => ({ titulo: a.textContent.trim(), href: a.href })),
  );
}

async function processarExame(context, page, key, texto, numero) {
  const pasta = join(OUT, String(numero).padStart(2, "0"));
  const arquivos = await listarArquivos(page, key);
  const temProva = arquivos.some(({ titulo, href }) => classificar(titulo, decodeURIComponent(href.split("/").pop())));
  if (!temProva) return { pulado: true, arquivos: arquivos.length };
  const manifesto = { key, exame: texto, numero, baixados: [], naoClassificados: [] };
  const padroesPraticos = new Map();

  for (const { titulo, href } of arquivos) {
    const nome = decodeURIComponent(href.split("/").pop());
    const cls = classificar(titulo, nome);
    if (!cls || cls.tipo.endsWith("indefinido")) {
      manifesto.naoClassificados.push({ titulo, nome, href, motivo: cls ? "título não diz se é preliminar ou definitivo" : null });
      continue;
    }
    let destino;
    if (cls.tipo === "objetiva-caderno") {
      if (cls.tipoProva !== 1) continue;
      destino = join(pasta, "objetiva", "caderno-tipo1.pdf");
    } else if (cls.tipo === "objetiva-gabarito-preliminar") {
      destino = join(pasta, "objetiva", "gabarito-preliminar.pdf");
    } else if (cls.tipo === "objetiva-gabarito-definitivo") {
      destino = join(pasta, "objetiva", "gabarito-definitivo.pdf");
    } else if (cls.tipo === "pratica-caderno") {
      destino = join(pasta, "pratica", slug(cls.area), "caderno.pdf");
    } else if (cls.tipo === "pratica-padrao-definitivo") {
      destino = join(pasta, "pratica", slug(cls.area), "padrao-definitivo.pdf");
    } else if (cls.tipo === "pratica-padrao-preliminar") {
      padroesPraticos.set(cls.area, { href, nome, titulo });
      continue;
    }
    const status = await baixar(context, href, destino);
    manifesto.baixados.push({ tipo: cls.tipo, area: cls.area ?? null, arquivo: destino.replace(pasta + "/", ""), status, titulo });
    await pausa(PAUSA_MS);
  }

  for (const [area, { href, titulo }] of padroesPraticos) {
    const dir = join(pasta, "pratica", slug(area));
    const definitivo = join(dir, "padrao-definitivo.pdf");
    const preliminar = join(dir, "padrao-preliminar.pdf");
    if (!existsSync(definitivo)) {
      manifesto.naoClassificados.push({ titulo, area, motivo: "padrão preliminar sem definitivo correspondente" });
      continue;
    }
    const tmp = join(dir, "_tmp-preliminar.pdf");
    const status = await baixar(context, href, tmp);
    if (status !== "ok" && status !== "já existia") {
      manifesto.baixados.push({ tipo: "pratica-padrao-preliminar", area, arquivo: null, status, titulo });
      continue;
    }
    const [tDef, tPre] = [normalizarTexto(await textoDoPdf(definitivo)), normalizarTexto(await textoDoPdf(tmp))];
    if (tDef === tPre) {
      rmSync(tmp);
      manifesto.baixados.push({ tipo: "pratica-padrao-preliminar", area, arquivo: null, status: "igual ao definitivo; não guardado", titulo });
    } else {
      renameSync(tmp, preliminar);
      manifesto.baixados.push({ tipo: "pratica-padrao-preliminar", area, arquivo: "padrao-preliminar.pdf", status: "diferente do definitivo; guardado", titulo });
    }
    await pausa(PAUSA_MS);
  }

  if (existsSync(join(pasta, "objetiva"))) {
    manifesto.gabaritos = await compararGabaritos(join(pasta, "objetiva"));
  }
  mkdirSync(pasta, { recursive: true });
  writeFileSync(join(pasta, "manifesto.json"), JSON.stringify(manifesto, null, 2) + "\n");
  return manifesto;
}

async function main() {
  const argKeys = process.argv.find((a) => a.startsWith("--keys="))?.slice("--keys=".length).split(",");
  const { browser, via } = await abrirNavegador();
  console.log(`acesso: ${via}`);
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  const exames = await listarExames(page);
  const escolhidos = [...exames].filter(([key]) => !argKeys || argKeys.includes(key));
  mkdirSync(OUT, { recursive: true });
  for (const [key, texto] of escolhidos) {
    const numero = numeroDoExame(texto) ?? `key-${key}`;
    try {
      const m = await processarExame(context, page, key, texto, numero);
      if (m.pulado) {
        console.log(`${String(numero).padStart(2, "0")} (key ${key}): sem prova objetiva publicada (${m.arquivos} arquivos), pulado`);
        continue;
      }
      console.log(`${String(numero).padStart(2, "0")} (key ${key}): ${m.baixados.length} arquivos, ${m.naoClassificados.length} não classificados`);
    } catch (e) {
      console.log(`${numero} (key ${key}): ERRO ${e.message}`);
    }
  }
  await browser.close();
}

main();
