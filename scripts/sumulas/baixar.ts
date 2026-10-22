// Baixa as súmulas do STF (base=30) e do STJ e monta content/sumulas/{stf,stj}.json, que o Vade Mecum lê.
//
//   node scripts/sumulas/baixar.ts                  baixa o que falta (cache em .cache/sumulas/) e monta o conteúdo
//   node scripts/sumulas/baixar.ts --somente-cache  só monta, com o que já está no cache
//   node scripts/sumulas/baixar.ts --visivel        abre o navegador na tela (o STJ pode pedir para provar que é humano)
//   node scripts/sumulas/baixar.ts --sem-proxy      não usa o proxy do projeto (PJE_PROXY, em ../.env) mesmo que ele exista
//
// O STJ e o STF bloqueiam o acesso direto de fora: por isso, quando PJE_PROXY existe, o navegador sai por ele.
//   node scripts/sumulas/baixar.ts --importar <pasta> [--somente-cache]
//                                                   copia para o cache as páginas salvas no navegador (.mhtml ou .html) da pasta:
//                                                   a página de cada súmula ou de cada página do STJ é reconhecida pelo endereço
//                                                   salvo dentro do arquivo, então pode ser qualquer página do STJ (2, 3…).
//
// Os sites bloqueiam acesso automatizado (Cloudflare); por isso o coletor usa o Chromium do patchright (Playwright
// com as marcas de automação removidas), navega antes por outros sites, guarda cada página no cache e não repete o que já foi baixado. As páginas salvas à mão (.mhtml)
// podem ser copiadas para o cache com os nomes abaixo, e o modo --somente-cache as aproveita.
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { detalheSTF, listaSTF, listaSTJ, type JurisprudenciaSTF, type NormaSTJ, type ObservacaoSTF, type SumulaSTJ } from "./parser.ts";

const ROOT = new URL("../..", import.meta.url).pathname;
const CACHE = join(ROOT, ".cache", "sumulas");
const SAIDA = join(ROOT, "content", "sumulas");
const args = new Set(process.argv.slice(2));
const somenteCache = args.has("--somente-cache");
const visivel = args.has("--visivel");
const semProxy = args.has("--sem-proxy");
const posImportar = process.argv.indexOf("--importar");
const pastaImportar = posImportar >= 0 ? process.argv[posImportar + 1] : undefined;

// as páginas que o usuário indicou
export const URL_STF_LISTA = "https://portal.stf.jus.br/jurisprudencia/sumariosumulas.asp?base=30&sumula=3345y";
export const URL_STF_SUMULA = (id: string) => `https://portal.stf.jus.br/jurisprudencia/sumariosumulas.asp?base=30&sumula=${id}`;
export const URL_STJ = (pagina: number) =>
  `https://scon.stj.jus.br/SCON/sumstj/toc.jsp?documentosSelecionadosParaPDF=&numDocsPagina=100&tipo_visualizacao=&data=&p=false&b=SUMU&h=true&i=${pagina}&l=10&ordenacao=-%40NUM%2C-%40DOCN`;
export const URL_STJ_PAGINA_MAX = 20;

// nomes no cache: stf-lista.html, stf/<id>.html, stj/pagina-<n>.html
const arquivoCache = (...partes: string[]) => join(CACHE, ...partes);

/** Tipo de uma súmula no conteúdo do site: o que o Vade Mecum mostra, com os extras à parte. */
export interface VideSumula {
  texto: string;
  alvo?: { tribunal: "stf" | "stj"; numero: number };
}
export interface SumulaConteudo {
  tribunal: "stf" | "stj";
  numero: number;
  status: "vigente" | "superada" | "cancelada";
  /** false quando só a lista foi baixada: o enunciado ainda não existe no Grifo */
  baixada: boolean;
  /** de onde veio o texto: o site (coletor) ou o PDF importado (importar-pdf.ts) */
  origem?: "site" | "pdf";
  enunciado: string;
  url: string;
  /** o "Vide" (e as remissões): o que aparece por padrão */
  vide: VideSumula[];
  /** as informações que aparecem só quando o usuário pede */
  extras: {
    ramo?: string;
    julgamento?: string;
    fonte?: string;
    dataAprovacao?: string;
    jurisprudencia?: JurisprudenciaSTF[];
    observacoes?: string[];
    referenciaLegislativa?: NormaSTJ[];
    precedentes?: string[];
  };
}

/** Sites comuns visitados antes do STJ e do STF: a sessão começa como a de um visitante, não direto na súmula. */
const AQUECIMENTO = ["https://www.google.com.br/", "https://pt.wikipedia.org/wiki/Direito_penal", "https://www.gov.br/"];

async function paginaComNavegador(url: string, pronta: (html: string) => boolean, nome: string): Promise<string> {
  // patchright: o Playwright com as marcas de automação removidas (o Cloudflare as reconhece no Playwright comum)
  const { chromium } = await import("patchright");
  const proxy = lerProxy();
  const navegador = await chromium.launch({ channel: "chromium", headless: !visivel, ...(proxy ? { proxy } : {}) });
  try {
    const pagina = await (await navegador.newContext({ locale: "pt-BR", viewport: { width: 1280, height: 900 } })).newPage();
    // o mesmo contexto guarda os cookies e o histórico da navegação de aquecimento
    for (const site of AQUECIMENTO) {
      await pagina.goto(site, { waitUntil: "domcontentloaded", timeout: 60_000 }).catch(() => {});
      await pagina.waitForTimeout(2_000 + Math.random() * 2_000);
    }
    try {
      await pagina.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
    } catch (erro) {
      const motivo = proxy ? `pelo proxy do projeto (${proxy.server}), que não respondeu` : "direto, sem proxy";
      throw new Error(`não consegui abrir ${nome} (${url}) ${motivo}: ${(erro as Error).message.split("\n")[0]}`);
    }
    // o desafio do STJ se resolve sozinho na maioria das vezes; esperamos alguns instantes antes de desistir
    for (let k = 0; k < 15; k++) {
      const html = await pagina.content();
      if (pronta(html)) return html;
      await pagina.waitForTimeout(2000);
    }
    throw new Error(
      `não consegui ler ${nome} (${url}). ${proxy ? `Saí pelo proxy do projeto (${proxy.server}); confira se ele está no ar e aceita conexões.` : "Acesso direto bloqueado: configure PJE_PROXY em ../.env."} Rode de novo com --visivel se o site pedir uma verificação.`,
    );
  } finally {
    await navegador.close();
  }
}

/** O proxy do projeto (PJE_PROXY, em ../.env), no formato do Playwright; sem ele, o acesso é direto. */
function lerProxy(): { server: string; username?: string; password?: string } | undefined {
  const env = join(ROOT, "..", ".env");
  if (semProxy || !existsSync(env)) return undefined;
  const valor = readFileSync(env, "utf8").match(/^PJE_PROXY=(.*)$/m)?.[1].trim().replace(/^['"]|['"]$/g, "");
  if (!valor) return undefined;
  const u = new URL(valor.includes("://") ? valor : `http://${valor}`);
  return { server: `${u.protocol}//${u.host}`, ...(u.username ? { username: decodeURIComponent(u.username), password: decodeURIComponent(u.password) } : {}) };
}

/** A página do cache, ou a página baixada e guardada nele. */
async function obterPagina(arquivo: string, url: string, pronta: (html: string) => boolean, nome: string): Promise<string | null> {
  if (existsSync(arquivo)) return readFileSync(arquivo, "utf8");
  if (somenteCache) return null;
  const html = await paginaComNavegador(url, pronta, nome);
  mkdirSync(join(arquivo, ".."), { recursive: true });
  writeFileSync(arquivo, html);
  await new Promise((r) => setTimeout(r, 1500));
  return html;
}

export const ehListaSTF = (html: string) => /sumula-item/.test(html);
export const ehDetalheSTF = (html: string) => /Súmula\s+\d+/.test(html) && /parCOM/.test(html);
export const ehListaSTJ = (html: string) => /gridSumula/.test(html);

/** O alvo de um "Vide": só o que o Grifo tem (STF e STJ, por número). Vinculantes e outros tribunais ficam só no texto. */
function alvoDoVide(v: ObservacaoSTF["vide"]): VideSumula["alvo"] {
  if (!v) return undefined;
  if (v.tribunal === "stf") return { tribunal: "stf", numero: v.numero };
  if (v.tribunal === "stj") return { tribunal: "stj", numero: v.numero };
  return undefined;
}

async function montarSTF(): Promise<SumulaConteudo[]> {
  const lista = await obterPagina(arquivoCache("stf-lista.html"), URL_STF_LISTA, ehListaSTF, "a lista de súmulas do STF");
  if (!lista) throw new Error("sem a lista do STF no cache: rode sem --somente-cache");
  const itens = listaSTF(lista);
  const saida: SumulaConteudo[] = [];
  for (const it of itens) {
    const url = URL_STF_SUMULA(it.id);
    const html = await obterPagina(arquivoCache("stf", `${it.id}.html`), url, ehDetalheSTF, `a súmula ${it.numero} do STF`);
    if (!html) {
      saida.push({ tribunal: "stf", numero: it.numero, status: it.status, baixada: false, enunciado: "", url, vide: [], extras: {} });
      continue;
    }
    const det = detalheSTF(html);
    const observacoes = det.observacoes.filter((o) => !o.vide);
    saida.push({
      tribunal: "stf",
      numero: it.numero,
      status: it.status,
      baixada: true,
      enunciado: det.enunciado,
      url,
      vide: det.observacoes.filter((o) => o.vide).map((o) => ({ texto: o.texto, ...(alvoDoVide(o.vide) ? { alvo: alvoDoVide(o.vide) } : {}) })),
      extras: {
        ...(det.dataAprovacao ? { dataAprovacao: det.dataAprovacao } : {}),
        ...(det.jurisprudencia.length ? { jurisprudencia: det.jurisprudencia } : {}),
        ...(observacoes.length ? { observacoes: observacoes.map((o) => o.texto) } : {}),
      },
    });
  }
  return saida;
}

/** O conteúdo de uma súmula do STJ, como o Vade Mecum lê. */
function conteudoSTJ(s: SumulaSTJ): SumulaConteudo {
  return {
    tribunal: "stj",
    numero: s.numero,
    status: "vigente",
    baixada: true,
    enunciado: s.enunciado,
    url: URL_STJ(1),
    vide: [],
    extras: {
      ...(s.ramo ? { ramo: s.ramo } : {}),
      ...(s.julgamento ? { julgamento: s.julgamento } : {}),
      ...(s.fonte ? { fonte: s.fonte } : {}),
      ...(s.referenciaLegislativa.length ? { referenciaLegislativa: s.referenciaLegislativa } : {}),
      ...(s.precedentes.length ? { precedentes: s.precedentes } : {}),
    },
  };
}

/**
 * As súmulas do STJ: baixa as páginas que faltam (a paginação é por JavaScript, então vai até a primeira página vazia)
 * e junta todas as páginas do cache, baixadas e importadas, sem depender do número de cada uma.
 */
async function montarSTJ(): Promise<SumulaConteudo[]> {
  const pasta = arquivoCache("stj");
  if (!somenteCache)
    for (let pagina = 1; pagina <= URL_STJ_PAGINA_MAX; pagina++) {
      const arquivo = join(pasta, `pagina-${pagina}.html`);
      if (existsSync(arquivo)) continue;
      const html = await paginaComNavegador(URL_STJ(pagina), ehListaSTJ, `a página ${pagina} das súmulas do STJ`);
      mkdirSync(pasta, { recursive: true });
      writeFileSync(arquivo, html);
      if (!listaSTJ(html).length) break;
      await new Promise((r) => setTimeout(r, 1500));
    }
  const vistos = new Map<number, SumulaConteudo>();
  if (existsSync(pasta))
    for (const nome of readdirSync(pasta).filter((n) => n.endsWith(".html")).sort())
      for (const s of listaSTJ(readFileSync(join(pasta, nome), "utf8"))) if (!vistos.has(s.numero)) vistos.set(s.numero, conteudoSTJ(s));
  return [...vistos.values()].sort((a, b) => a.numero - b.numero);
}

/** Conteúdo de um .mhtml: a parte HTML (quoted-printable) e o endereço salvo; um .html é ele mesmo. */
function lerSalvo(bytes: Buffer): { html: string; endereco: string | null } {
  const texto = bytes.toString("latin1");
  if (!/^MIME-Version:|multipart\/related/im.test(texto.slice(0, 2000))) return { html: bytes.toString("utf8"), endereco: null };
  const endereco = texto.match(/Snapshot-Content-Location:\s*(\S+)/i)?.[1] ?? null;
  const limite = texto.match(/boundary="([^"]+)"/)?.[1];
  const parte = limite ? texto.split("--" + limite).find((p) => /Content-Type:\s*text\/html/i.test(p)) : undefined;
  if (!parte) return { html: "", endereco };
  const corte = parte.indexOf("\r\n\r\n");
  const cabecalho = parte.slice(0, corte);
  const corpo = parte.slice(corte + 4);
  const bruto = /quoted-printable/i.test(cabecalho)
    ? Buffer.from(corpo.replace(/=\r?\n/g, "").replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))), "latin1")
    : Buffer.from(corpo, "latin1");
  return { html: decodificar(bruto), endereco };
}

/** UTF-8 quando é UTF-8; senão windows-1252 (as páginas do STJ). */
function decodificar(bytes: Buffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

/** Copia para o cache as páginas salvas numa pasta, reconhecendo cada uma pelo conteúdo e pelo endereço. */
function importarSalvos(pasta: string) {
  const nomes = readdirSync(pasta).filter((n) => /\.(mhtml|html?)$/i.test(n));
  const contagem = { stfLista: 0, stfSumulas: 0, stjPaginas: [] as number[] };
  for (const nome of nomes) {
    const caminho = join(pasta, nome);
    if (!statSync(caminho).isFile()) continue;
    const { html, endereco } = lerSalvo(readFileSync(caminho));
    if (ehListaSTJ(html)) {
      // a página do STJ é guardada pela maior súmula que traz: o nome não depende da paginação (feita por JavaScript)
      const maior = Math.max(0, ...listaSTJ(html).map((x) => x.numero));
      mkdirSync(arquivoCache("stj"), { recursive: true });
      writeFileSync(arquivoCache("stj", `importada-${maior}.html`), html);
      contagem.stjPaginas.push(maior);
    } else if (ehListaSTF(html)) {
      mkdirSync(CACHE, { recursive: true });
      writeFileSync(arquivoCache("stf-lista.html"), html);
      contagem.stfLista++;
    } else if (ehDetalheSTF(html) && endereco?.match(/sumula=(\d+)/)) {
      const id = endereco.match(/sumula=(\d+)/)![1];
      mkdirSync(arquivoCache("stf"), { recursive: true });
      writeFileSync(arquivoCache("stf", `${id}.html`), html);
      contagem.stfSumulas++;
    } else console.log(`· ${nome}: não reconheci uma página de súmulas`);
  }
  console.log(`importadas: lista do STF ${contagem.stfLista}, súmulas do STF ${contagem.stfSumulas}, páginas do STJ ${contagem.stjPaginas.length} (a partir da súmula ${contagem.stjPaginas.sort((x, y) => y - x).join(", ") || "nenhuma"})`);
}

async function main() {
  if (pastaImportar) importarSalvos(pastaImportar);
  const stf = await montarSTF();
  const stj = await montarSTJ();
  mkdirSync(SAIDA, { recursive: true });
  const coletadoEm = new Date().toISOString().slice(0, 10);
  writeFileSync(join(SAIDA, "stf.json"), JSON.stringify({ tribunal: "stf", fonte: URL_STF_LISTA, coletadoEm, total: stf.length, baixadas: stf.filter((s) => s.baixada).length, sumulas: stf }, null, 1));
  writeFileSync(join(SAIDA, "stj.json"), JSON.stringify({ tribunal: "stj", fonte: URL_STJ(1), coletadoEm, total: stj.length, baixadas: stj.filter((s) => s.baixada).length, sumulas: stj }, null, 1));
  console.log(`STF: ${stf.length} súmulas na lista, ${stf.filter((s) => s.baixada).length} com texto`);
  console.log(`STJ: ${stj.length} súmulas com texto`);
}

if (import.meta.main) await main();
