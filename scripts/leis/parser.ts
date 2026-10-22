// Lê o HTML compilado de uma lei no Planalto e devolve os blocos (um por parágrafo HTML),
// com o dispositivo a que pertencem, o texto riscado (redação superada) e as anotações
// "(Redação dada pela Lei nº …)", "(Incluído …)", "(Revogado …)", "(Vide …)".
//
// O Planalto publica HTML gerado pelo Word, com marcação irregular; por isso a leitura é
// por texto e por estilo (riscado), não por classes.
import { parse } from "parse5";

import type { Ato, Bloco, TipoAto } from "../../src/lib/leis/linha-do-tempo.ts";

export type { Ato, Bloco };
type TipoBloco = Bloco["tipo"];

export interface Relatorio {
  blocos: number;
  porTipo: Record<string, number>;
  /** parênteses que parecem anotação mas não foram reconhecidos */
  anotacoesNaoReconhecidas: string[];
  /** blocos de texto solto antes do primeiro artigo ou sem dispositivo */
  semDispositivo: number;
  artigos: string[];
}

interface No {
  nodeName: string;
  value?: string;
  attrs?: { name: string; value: string }[];
  childNodes?: No[];
}

const attr = (n: No, nome: string) => n.attrs?.find((a) => a.name === nome)?.value;
const riscado = (n: No) =>
  ["strike", "s", "del"].includes(n.nodeName) || /line-through/i.test(attr(n, "style") ?? "");

interface Pedaco {
  texto: string;
  riscado: boolean;
  negrito: boolean;
  href?: string;
}

/** Texto do parágrafo em pedaços, com o estado de riscado/negrito/link herdado dos ancestrais. */
function pedacos(n: No, estado: { riscado: boolean; negrito: boolean; href?: string }, saida: Pedaco[], ancoras: string[]) {
  if (n.nodeName === "#text") {
    // cada espaço em branco (inclusive quebra de linha do HTML e &nbsp;) vira um espaço: as posições não mudam
    saida.push({ texto: (n.value ?? "").replace(/[\u00a0\s]/g, " "), ...estado });
    return;
  }
  if (n.nodeName === "#comment" || n.nodeName === "script" || n.nodeName === "style") return;
  if (n.nodeName === "a" && attr(n, "name")) ancoras.push(attr(n, "name")!);
  if (n.nodeName === "br") saida.push({ texto: " ", ...estado });
  const novo = {
    riscado: estado.riscado || riscado(n),
    negrito: estado.negrito || n.nodeName === "b" || n.nodeName === "strong",
    href: n.nodeName === "a" && attr(n, "href") ? attr(n, "href") : estado.href,
  };
  for (const c of n.childNodes ?? []) pedacos(c, novo, saida, ancoras);
}

/** Parágrafos em ordem de documento (inclusive os que estão dentro de tabelas e centers). */
function paragrafos(raiz: No): No[] {
  const lista: No[] = [];
  const andar = (n: No) => {
    if (n.nodeName === "p" || /^h[1-6]$/.test(n.nodeName)) {
      lista.push(n);
      return;
    }
    for (const c of n.childNodes ?? []) andar(c);
  };
  andar(raiz);
  return lista;
}

const espacos = (s: string) => s.replace(/[ \s]+/g, " ").trim();

const ANOTACAO = /\((?:[^()]|\([^()]*\))*?\b(Reda[çc][ãa]o\s+(?:dada|pela)|Transformad[oa]|Numerad[oa]|Express[ãa]o\s+substitu[íi]da|Substitu[íi]d[oa]|Inclu[íi]d[oa]|Revogad[oa]|Vide|Vig[êe]ncia|Renumerad[oa]|Acrescid[oa]|Revigorad[oa]|Promulga[çc][ãa]o|Express[ãa]o\s+suprimida|Suprimid[oa]|Vetad[oa]|Produ[çc][ãa]o\s+de\s+efeito|Regulamento|Execu[çc][ãa]o\s+suspensa|Declara[çc][ãa]o\s+de\s+inconstitucionalidade)\b(?:[^()]|\([^()]*\))*\)/gi;
// "(Algo pelo/pela Lei nº …)": forma de anotação que a lista acima não conhece. Citações do próprio texto,
// como "(Decreto-Lei nº 2.848, de 1940)", não têm o "pelo/pela" e ficam de fora.
const PARECE_ANOTACAO = /\(\s*[A-ZÀ-Ú][a-zà-ú]+(?:\s+[a-zà-ú]+){0,3}\s+pel[oa]s?\s+(?:Lei|Decreto|Medida Provis[óo]ria|Emenda)[^()]*\)/g;

/**
 * Tira as anotações do texto. No Planalto o ponto final da frase vem depois da anotação ("ano.  (Redação dada
 * pela Lei…)."): sem tratar, sobra um ". ." no fim do parágrafo. Se o ponto já vinha antes, o de depois some.
 */
function tirarAnotacoes(t: string): string {
  // o texto já sem as anotações anteriores é o que vale para decidir se o ponto cabe (duas anotações seguidas)
  let saida = "";
  let pos = 0;
  for (const m of t.matchAll(new RegExp(`\\s*${ANOTACAO.source}\\s*\\.?`, "gi"))) {
    saida += t.slice(pos, m.index);
    pos = m.index + m[0].length;
    const antes = saida.trimEnd();
    if (!/\.$/.test(m[0])) saida += " ";
    else if (!antes || antes.endsWith(".")) saida += " ";
    else saida = `${antes}.`;
  }
  return saida + t.slice(pos);
}

/** Pontuação que sobra no fim: ". ." vira "."; ";." vira ";"; alínea revogada ("a) (revogada);") fica só com a letra. */
function limparFinal(t: string): string {
  const semPonto = t.replace(/\.\s\.$/, ".").replace(/([;,:])\s*\.$/, "$1");
  return /^[a-z0-9]{1,4}\)\s*[;,:.]*$/i.test(semPonto) ? semPonto.replace(/\s*[;,:.]+$/, "") : semPonto;
}

/**
 * Os links que o próprio Planalto pôs no texto ("§ 1º, II," apontando para o art. 81 do CP), fora das anotações,
 * nas posições do texto final. O leitor os usa onde não tem link próprio.
 */
function linksDoTexto(ps: Pedaco[], texto: string): { ini: number; fim: number; href: string }[] {
  const bruto = ps.map((x) => x.texto).join("");
  const anotacoes = [...bruto.matchAll(ANOTACAO)].map((m) => [m.index, m.index + m[0].length] as const);
  // pedaços seguidos com o mesmo link são um link só
  const corridas: { href: string; ini: number; fim: number }[] = [];
  let pos = 0;
  for (const x of ps) {
    const fim = pos + x.texto.length;
    if (x.href && !/^(javascript|mailto):/i.test(x.href)) {
      const ultima = corridas.at(-1);
      if (ultima && ultima.href === x.href && ultima.fim === pos) ultima.fim = fim;
      else corridas.push({ href: x.href, ini: pos, fim });
    }
    pos = fim;
  }
  const links: { ini: number; fim: number; href: string }[] = [];
  let cursor = 0;
  for (const c of corridas) {
    if (anotacoes.some(([a, b]) => c.ini < b && c.fim > a)) continue;
    const alvo = espacos(bruto.slice(c.ini, c.fim));
    if (alvo.length < 2) continue;
    const achado = texto.indexOf(alvo, cursor);
    if (achado < 0) continue;
    cursor = achado + alvo.length;
    // o Planalto às vezes põe no link a palavra de ligação ("no IV do mesmo artigo", "o § 1º"): ela fica fora
    const ligacao = alvo.match(/^(?:(?:n[oa]s?|d[oa]s?|[oa]s?|e|em|aos?)\s+)+/)?.[0].length ?? 0;
    if (ligacao >= alvo.length) continue;
    links.push({ ini: achado + ligacao, fim: cursor, href: c.href });
  }
  return links;
}

function tipoAto(bruto: string): TipoAto {
  if (/reda[çc][ãa]o\s+(dada|pela)|express[ãa]o\s+(suprimida|substitu)|suprimid|substitu[íi]d/i.test(bruto)) return "redacao";
  if (/inclu[íi]d|acrescid/i.test(bruto)) return "incluido";
  if (/revogad/i.test(bruto)) return "revogado";
  if (/renumerad|transformad|numerad/i.test(bruto)) return "renumerado";
  if (/^\(\s*vide/i.test(bruto)) return "vide";
  if (/vig[êe]ncia/i.test(bruto)) return "vigencia";
  return "outro";
}

const ESPECIES: [RegExp, string][] = [
  [/Lei Complementar/i, "lc"],
  [/Medida Provis[óo]ria/i, "mp"],
  [/Decreto-Lei/i, "decreto-lei"],
  [/Emenda Constitucional/i, "ec"],
  [/Decreto/i, "decreto"],
  [/Lei/i, "lei"],
];

export function lerAto(bruto: string, href?: string): Ato {
  const ato: Ato = { tipo: tipoAto(bruto), bruto: espacos(bruto) };
  const m = bruto.match(/(Lei Complementar|Medida Provis[óo]ria|Decreto-Lei|Emenda Constitucional|Decreto|Lei)\s*n[ºo°.]?\s*([\d.]+(?:-\d+)?)\s*(?:,\s*de\s*([\d.]+|\d{1,2}\s+de\s+[a-zç]+\s+de\s+\d{4}|\d{4}))?/i);
  if (m) {
    const especie = ESPECIES.find(([re]) => re.test(m[1]))![1];
    ato.lei = `${especie}-${m[2].replace(/\./g, "")}`;
    const quando = m[3];
    if (quando) {
      const data = quando.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
      if (data) {
        const ano = data[3].length === 2 ? Number(data[3]) + (Number(data[3]) > 30 ? 1900 : 2000) : Number(data[3]);
        ato.ano = ano;
        ato.data = `${ano}-${data[2].padStart(2, "0")}-${data[1].padStart(2, "0")}`;
      } else {
        const ano = quando.match(/(\d{4})$/);
        if (ano) ato.ano = Number(ano[1]);
      }
    }
  }
  if (href) ato.href = href;
  return ato;
}

const ROTULOS: [TipoBloco, RegExp][] = [
  ["estrutura", /^(PARTE (GERAL|ESPECIAL)|LIVRO\b|T[ÍI]TULO\b|CAP[ÍI]TULO\b|SE[ÇC][ÃA]O\b|Se[çc][ãa]o\b|SUBSE[ÇC][ÃA]O\b|Subse[çc][ãa]o\b|DISPOSI[ÇC][ÕO]ES (FINAIS|TRANSIT[ÓO]RIAS|GERAIS|PRELIMINARES))/],
  // "Art. 154-A." tem letra; "Art. 3º - A lei…" não: o hífen da letra vem colado ao número e a letra fica sozinha
  ["artigo", /^Art\.?\s*(\d+(?:\.\d{3})*)(?:\s*[ºo°])?(?:(-\s?[A-Z]{1,2})(?![A-Za-zÀ-ú]))?(?=[\s.\-–—:,;]|$)/],
  ["paragrafo", /^(?:§\s*(\d+)(?:\s*[ºo°])?(?:(-\s?[A-Z])(?![A-Za-zÀ-ú]))?|Par[áa]grafo [úu]nico)/],
  ["inciso", /^([IVXLC]+)(\s*-\s?[A-Z])?\s*[-–—]\s/],
  ["alinea", /^([a-z])(-[A-Z])?\s*\)/],
];

const VALOR: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100 };
/** "XIV" → 14 (o id do inciso usa o número: art. 5º, XIV → "art5.i14") */
function romano(r: string): number {
  let total = 0;
  for (let i = 0; i < r.length; i++) {
    const v = VALOR[r[i]];
    total += VALOR[r[i + 1]] > v ? -v : v;
  }
  return total;
}

function rotulo(texto: string): { tipo: TipoBloco; rotulo: string; chave: string } | null {
  for (const [tipo, re] of ROTULOS) {
    const m = texto.match(re);
    if (!m) continue;
    const letra = (m[2] ?? "").replace(/[\s-]/g, "").toLowerCase();
    if (tipo === "artigo") return { tipo, rotulo: m[0].trim(), chave: `art${m[1].replace(/\./g, "")}${letra ? `-${letra}` : ""}` };
    if (tipo === "paragrafo") return { tipo, rotulo: m[0].trim(), chave: m[1] ? `p${m[1]}${letra ? `-${letra}` : ""}` : "pu" };
    if (tipo === "inciso") return { tipo, rotulo: m[1], chave: `i${romano(m[1])}${letra ? `-${letra}` : ""}` };
    if (tipo === "alinea") return { tipo, rotulo: `${m[1]})`, chave: `a${m[1]}${letra ? `-${letra}` : ""}` };
    return { tipo, rotulo: m[0].trim(), chave: "" };
  }
  return null;
}

export function lerHtml(html: string): { blocos: Bloco[]; relatorio: Relatorio } {
  const raiz = parse(html) as unknown as No;
  const blocos: Bloco[] = [];
  const naoReconhecidas = new Set<string>();
  let art: string | undefined;
  let par: string | undefined;
  let inc: string | undefined;
  // o ADCT recomeça a numeração: seus artigos ganham prefixo para não colidir com os da Constituição
  let prefixo = "";
  // depois de "Brasília, <data>" vêm as assinaturas: não pertencem a nenhum artigo
  let fecho = false;

  for (const p of paragrafos(raiz)) {
    const ps: Pedaco[] = [];
    const ancoras: string[] = [];
    pedacos(p, { riscado: false, negrito: false }, ps, ancoras);
    const inteiro = espacos(ps.map((x) => x.texto).join(""));
    if (!inteiro) continue;

    // Anotações saem do texto e viram atos; o link (quando há) vem do pedaço da anotação.
    const atos: Ato[] = [];
    let texto = ps.map((x) => x.texto).join("");
    for (const m of texto.matchAll(ANOTACAO)) {
      const inicio = m.index ?? 0;
      let pos = 0;
      const pedacoLink = ps.find((x) => {
        const fim = pos + x.texto.length;
        const dentro = fim > inicio && pos < inicio + m[0].length && x.href;
        pos = fim;
        return dentro;
      });
      atos.push(lerAto(m[0], pedacoLink?.href));
    }
    // ". ." no fim do parágrafo: o Planalto traz um ponto a mais em alguns textos; ";." é o ponto da anotação
    texto = limparFinal(espacos(tirarAnotacoes(texto).replace(/\s+Vig[êe]ncia\s*$/i, "")));
    for (const m of texto.matchAll(PARECE_ANOTACAO)) naoReconhecidas.add(espacos(m[0]).slice(0, 160));

    const comTexto = ps.filter((x) => espacos(x.texto));
    const caracteres = comTexto.reduce((s, x) => s + x.texto.length, 0);
    const riscados = comTexto.filter((x) => x.riscado).reduce((s, x) => s + x.texto.length, 0);
    const superada = caracteres > 0 && riscados / caracteres > 0.5;
    const negrito = comTexto.length > 0 && comTexto.every((x) => x.negrito);
    if (!texto) {
      // parágrafo só com anotação ("(Vide Lei nº …)"): os atos vão para o bloco anterior
      if (atos.length && blocos.length) blocos[blocos.length - 1].atos.push(...atos);
      continue;
    }

    const r = rotulo(texto);
    const bloco: Bloco = { tipo: "texto", texto, superada, atos, ...(ancoras[0] ? { ancora: ancoras[0] } : {}) };
    // o título do ADCT (em maiúsculas; o do índice no topo da página não conta) abre uma nova numeração
    // e encerra o fecho da Constituição, que vem antes dele
    if (art && /^ATO DAS DISPOSI[ÇC][ÕO]ES CONSTITUCIONAIS TRANSIT[ÓO]RIAS$/.test(texto)) {
      prefixo = "adct-";
      fecho = false;
      art = par = inc = undefined;
      bloco.tipo = "estrutura";
    } else if ((fecho && r?.tipo !== "artigo") || /^(Bras[ií]lia|Rio de Janeiro),?\s+(em\s+)?\d{1,2}/i.test(texto)) {
      // um novo "Art." depois do fecho é texto que continua (partes vetadas e depois promulgadas)
      fecho = true;
    } else if (r?.tipo === "estrutura") {
      bloco.tipo = "estrutura";
    } else if (r?.tipo === "artigo") {
      fecho = false;
      art = prefixo + r.chave;
      par = inc = undefined;
      Object.assign(bloco, { tipo: "artigo", rotulo: r.rotulo, disp: art });
    } else if (r && art && r.tipo === "paragrafo") {
      par = `${art}.${r.chave}`;
      inc = undefined;
      Object.assign(bloco, { tipo: "paragrafo", rotulo: r.rotulo, disp: par });
    } else if (r && art && r.tipo === "inciso") {
      inc = `${par ?? art}.${r.chave}`;
      Object.assign(bloco, { tipo: "inciso", rotulo: r.rotulo, disp: inc });
    } else if (r && art && r.tipo === "alinea") {
      Object.assign(bloco, { tipo: "alinea", rotulo: r.rotulo, disp: `${inc ?? par ?? art}.${r.chave}` });
    } else if (texto.length <= 140 && texto === texto.toUpperCase() && /[A-ZÀ-Ú]{3}/.test(texto) && !/^\(/.test(texto)) {
      // subtítulo em maiúsculas logo abaixo de TÍTULO/CAPÍTULO ("DOS CRIMES CONTRA A PESSOA")
      bloco.tipo = "estrutura";
    } else if (negrito && texto.length < 160 && !/[.;:]$/.test(texto)) {
      bloco.tipo = "rubrica";
    } else {
      // "Pena – …" e outros parágrafos sem rótulo continuam o dispositivo atual
      const atual = [...blocos].reverse().find((b) => b.disp);
      if (art && atual?.disp) bloco.disp = atual.disp;
    }
    const links = linksDoTexto(ps, bloco.texto);
    if (links.length) bloco.links = links;
    blocos.push(bloco);
  }

  // Dispositivo sem nenhuma redação vigente (revogado): as continuações ("Pena – …") também ficam superadas,
  // mesmo quando o Planalto esqueceu de riscá-las.
  const vigentes = new Set(blocos.filter((b) => b.disp && b.tipo !== "texto" && !b.superada).map((b) => b.disp));
  for (const b of blocos) if (b.tipo === "texto" && b.disp && !vigentes.has(b.disp)) b.superada = true;
  // rubrica ("Homicídio simples") de artigo sem redação vigente também sai do texto atual
  blocos.forEach((b, k) => {
    if (b.tipo !== "rubrica") return;
    const prox = blocos.slice(k + 1).find((x) => x.disp);
    if (prox && !vigentes.has(prox.disp)) b.superada = true;
  });

  const primeiroArtigo = blocos.findIndex((b) => b.tipo === "artigo");
  const fechoEm = blocos.findIndex((b) => /^(Bras[ií]lia|Rio de Janeiro),?\s+(em\s+)?\d{1,2}/i.test(b.texto));
  const inicioFecho = fechoEm < 0 ? blocos.length : fechoEm;
  const porTipo: Record<string, number> = {};
  for (const b of blocos) porTipo[b.tipo] = (porTipo[b.tipo] ?? 0) + 1;
  const artigos = [...new Set(blocos.filter((b) => b.tipo === "artigo" && !b.superada).map((b) => b.disp!))];
  return {
    blocos,
    relatorio: {
      blocos: blocos.length,
      porTipo,
      anotacoesNaoReconhecidas: [...naoReconhecidas],
      // preâmbulo (antes do 1º artigo) e fecho (data e assinaturas) não contam
      semDispositivo: blocos.filter((b, k) => b.tipo === "texto" && !b.disp && k > primeiroArtigo && k < inicioFecho).length,
      artigos,
    },
  };
}
