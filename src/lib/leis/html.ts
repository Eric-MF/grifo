// HTML dos blocos da lei, como texto: o servidor manda o começo pronto na página e o navegador
// acrescenta o resto. Como não passa pelo React, o texto não pesa na hidratação e o leitor pode
// grifar e anotar mexendo direto no DOM.
import { marcoDeRevogacao, type Bloco, type InfoBloco } from "./linha-do-tempo";
import { type Apoio, destinoDoPlanalto, diplomaDaAlteracao, idArtigo, MSG_NAO_ENCONTRADO, trechos, type Trecho } from "./referencias";
import { rotaDaLei } from "./sumulas";
import { corrigido } from "./texto";

const ESCAPE: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESCAPE[c]);

const numeroDoRotulo = (rotulo?: string) => Number(rotulo?.match(/\d+/)?.[0] ?? NaN);

/**
 * Blocos que copiam a redação de outra lei: o texto que um artigo altera ("Art. 6º ... passam a vigorar com a seguinte
 * redação: Art. 159 ..."). Não são dispositivos desta lei, então não ganham âncora, e "art. 159" da 8.072 vai ao Código
 * Penal, não ao trecho copiado. A cópia termina no artigo seguinte ao que altera (o próximo artigo desta lei).
 */
export function blocosCitados(blocos: Bloco[], lei: string): Set<number> {
  const citados = new Set<number>();
  let alterante: number | null = null;
  blocos.forEach((b, i) => {
    if (b.tipo === "artigo") {
      const n = numeroDoRotulo(b.rotulo);
      if (alterante !== null && (n <= alterante || n === alterante + 1)) alterante = null;
      if (alterante !== null) {
        citados.add(i);
        return;
      }
      const alvo = diplomaDaAlteracao(b.texto);
      if (alvo && alvo !== lei && !Number.isNaN(n)) alterante = n;
      return;
    }
    if (alterante !== null) citados.add(i);
  });
  return citados;
}

/** Em que bloco fica a âncora de cada dispositivo: a primeira redação vigente (ou a primeira, se nenhuma). */
export function mapaAncoras(blocos: Bloco[], lei: string): Map<string, number> {
  const m = new Map<string, number>();
  const citados = blocosCitados(blocos, lei);
  blocos.forEach((b, i) => {
    if (!b.disp || b.tipo === "texto" || citados.has(i)) return;
    const atual = m.get(b.disp);
    if (atual === undefined || (blocos[atual].superada && !b.superada)) m.set(b.disp, i);
  });
  return m;
}

/**
 * Textos da lei para achar o diploma de um "art. N" que a lei não tem: o caput de cada artigo (pelo identificador),
 * o caput do primeiro artigo vigente e o preâmbulo (o que vem antes do primeiro artigo).
 */
export function apoioDaLei(blocos: Bloco[]): { caputs: Map<string, string>; caputPrimeiro?: string; preambulo: string } {
  const caputs = new Map<string, string>();
  let caputPrimeiro: string | undefined;
  let primeiro: number | null = null;
  blocos.forEach((b, i) => {
    if (b.tipo !== "artigo" || !b.disp) return;
    primeiro ??= i;
    if (b.superada) return;
    if (!caputs.has(b.disp)) caputs.set(b.disp, b.texto);
    caputPrimeiro ??= b.texto;
  });
  const preambulo = blocos
    .slice(0, primeiro ?? blocos.length)
    .map((b) => b.texto)
    .join(" ");
  return { caputs, caputPrimeiro, preambulo };
}

/**
 * Rótulo do artigo ("Art. 1º") separado do resto do texto. O rótulo do próprio artigo (vigente ou revogado) pode
 * ser destacado, se alguém o cita: é ele que mostra quem cita o artigo.
 */
function separarRotulo(b: Bloco): { rotulo: string | undefined; corpo: string; ehRotulo: boolean } {
  const rotulo = rotuloNoTexto(b);
  const texto = b.texto;
  const ehRotulo = b.tipo === "artigo" && !!b.disp && !!rotulo;
  return ehRotulo ? { rotulo, corpo: texto.slice(rotulo!.length), ehRotulo } : { rotulo: rotulo ?? b.rotulo, corpo: texto, ehRotulo };
}

/**
 * O rótulo como está no começo do texto do bloco, ou undefined se o texto não começa por ele. O rótulo é guardado
 * corrigido ("Art. 1º") e, na redação original, o texto vem como no Planalto ("Art. 1o"): a comparação é na forma
 * corrigida, e o que volta é o pedaço do próprio texto (a correção troca um caractere por um, então o tamanho é o mesmo).
 */
function rotuloNoTexto(b: Bloco): string | undefined {
  const r = b.rotulo;
  if (!r) return undefined;
  const inicio = b.texto.slice(0, r.length);
  return inicio === r || corrigido(inicio) === corrigido(r) ? inicio : undefined;
}

/** Uma citação: um artigo de uma lei do leitor (`para`) que é citado pelo artigo `de` de outra (ou da mesma). */
export interface Citacao {
  para: [lei: string, art: string];
  de: [lei: string, art: string, rotulo: string];
}

/**
 * Citações de artigos de leis do leitor feitas pelos artigos vigentes desta lei. Alimenta o "citado por":
 * o mesmo resolvedor dos links do texto, então o que aparece como link é o que aparece como citação.
 * Os trechos copiados de outra lei (citados) não contam: as referências deles são da lei que eles alteram.
 */
/**
 * O dispositivo de uma âncora do Planalto: "art81§1ii" → "art81.p1.i2", "art5xi" → "art5.i11", "art10p" ou
 * "art10§u" → parágrafo único. Sem forma conhecida, null (vale só o artigo).
 */
export function dispositivoDaAncora(ancora: string): string | null {
  const m = ancora.toLowerCase().match(/^art(\d+)(?:-?([abdefghjkmnopqrstuwyz]))?(?:§(\d+|[úu]nico|u))?([ivxl]+)?$/);
  if (!m || (!m[3] && !m[4])) return null;
  let d = `art${m[1]}${m[2] ? `-${m[2]}` : ""}`;
  if (m[3]) d += /^\d+$/.test(m[3]) ? `.p${m[3]}` : ".pu";
  if (m[4]) d += `.i${romanoParaNumero(m[4])}`;
  return d;
}
/** A âncora de um endereço ("…del2848.htm#art81§1ii" → "art81§1ii"), decodificada; vazia se não houver. */
function ancoraDe(endereco: string): string {
  const bruta = endereco.split("#")[1] ?? "";
  try {
    return decodeURIComponent(bruta);
  } catch {
    return bruta;
  }
}
function romanoParaNumero(r: string): number {
  const v: Record<string, number> = { i: 1, v: 5, x: 10, l: 50 };
  let n = 0;
  for (let k = 0; k < r.length; k++) {
    const a = v[r[k]!]!;
    const b = v[r[k + 1]!] ?? 0;
    n += a < b ? -a : a;
  }
  return n;
}

export function citacoesDaLei(blocos: Bloco[], lei: string, url?: string): Citacao[] {
  const ancoras = mapaAncoras(blocos, lei);
  const citados = blocosCitados(blocos, lei);
  const apoio = apoioDaLei(blocos);
  const rotulos = new Map<string, string>();
  for (const b of blocos) if (b.tipo === "artigo" && b.disp && !b.superada && !rotulos.has(b.disp)) rotulos.set(b.disp, b.rotulo ?? b.disp);
  const saida: Citacao[] = [];
  let alteracao: string | null = null;
  blocos.forEach((b, i) => {
    if (b.tipo === "artigo") alteracao = diplomaDaAlteracao(b.texto);
    if (b.superada || !b.disp || citados.has(i)) return;
    const base = b.disp.split(".")[0]!;
    const rotulo = rotulos.get(base);
    if (!rotulo) return;
    const { rotulo: cabeca, corpo, ehRotulo } = separarRotulo(b);
    const trechosDoBloco = trechos(corpo, lei, ehRotulo ? undefined : cabeca, (art) => ancoras.has(idArtigo(art)), alteracao, {
      caput: apoio.caputs.get(base),
      caputPrimeiro: apoio.caputPrimeiro,
      preambulo: apoio.preambulo,
      data: b.data,
    });
    const de: Citacao["de"] = [lei, base, rotulo];
    // o artigo citado e, quando a referência os nomeia, o inciso ou o parágrafo ("inciso XI do art. 5º")
    const nossos: [number, number][] = [];
    let pos = 0;
    for (const t of trechosDoBloco) {
      if (t.href) nossos.push([pos, pos + t.texto.length]);
      pos += t.texto.length;
      if (!t.lei || !t.art) continue;
      saida.push({ para: [t.lei, t.art], de });
      for (const d of t.disps ?? []) saida.push({ para: [t.lei, d], de });
    }
    // os links do próprio Planalto onde o Grifo não tem link também contam
    if (!url) return;
    const desvio = ehRotulo ? cabeca!.length : 0;
    for (const l of b.links ?? []) {
      const ini = l.ini - desvio;
      const fim = l.fim - desvio;
      if (fim <= 0 || nossos.some(([a, z]) => ini < z && fim > a)) continue;
      let endereco: string;
      try {
        endereco = new URL(l.href, url).href;
      } catch {
        continue;
      }
      const alvo = destinoDoPlanalto(endereco, lei);
      if (!alvo.lei || !alvo.art) continue;
      saida.push({ para: [alvo.lei, alvo.art], de });
      const d = dispositivoDaAncora(ancoraDe(endereco));
      if (d && d.startsWith(`${alvo.art}.`)) saida.push({ para: [alvo.lei, d], de });
    }
  });
  return saida;
}

export interface Classes {
  b: string;
  txt: string;
  ref: string;
  /** "Art. 1º" do início do artigo: passando o mouse, mostra quem cita o artigo */
  rotulo: string;
  atos: string;
  ato: string;
  /** as informações adicionais de um dispositivo (súmulas), e cada linha delas */
  info: string;
  infoLinha: string;
  estrela: string;
  /** referência sem diploma identificado: sem link, com a mensagem ao passar o mouse ou tocar */
  naoEncontrada: string;
  tipos: Record<Bloco["tipo"], string>;
}

export function htmlBloco(
  b: Bloco,
  i: number,
  lei: string,
  url: string,
  ancoras: Map<string, number>,
  c: Classes,
  alteracao: string | null = null,
  apoio: Apoio = {},
  comCitacao = false,
  /** o próprio dispositivo (inciso, parágrafo) é citado: o rótulo dele também abre o "citado por" */
  dispCitado = false,
): string {
  const tag = b.tipo === "estrutura" ? "h3" : b.tipo === "rubrica" ? "h4" : "p";
  const id = b.disp && ancoras.get(b.disp) === i ? ` id="${esc(b.disp)}"` : "";
  const attrs = `data-i="${i}"${b.disp ? ` data-disp="${esc(b.disp)}"` : ""} data-sup="${b.superada ? 1 : 0}" data-marco="${marcoDeRevogacao(b) ? 1 : 0}"`;
  const estrela =
    b.tipo === "artigo" && !b.superada
      ? `<button type="button" class="${c.estrela}" data-estrela="${esc(b.disp!)}" aria-label="Marcar ${esc(b.rotulo ?? "artigo")} como importante" aria-pressed="false">☆</button>`
      : "";
  const { rotulo, corpo: corpoInteiro, ehRotulo } = separarRotulo(b);
  const rotuloDoDisp = !ehRotulo && dispCitado && !!b.disp && !!rotulo && rotuloNoTexto(b) === rotulo;
  const corpo = rotuloDoDisp ? b.texto.slice(rotulo!.length) : corpoInteiro;
  // o rótulo só é destacado (e abre o "citado por") quando o artigo é citado por algum artigo do leitor
  const cabeca = rotuloDoDisp
    ? `<span class="${c.rotulo}" data-rotulo-lei="${esc(lei)}" data-rotulo-art="${esc(b.disp!)}">${esc(rotulo!)}</span>`
    : ehRotulo
    ? comCitacao
      ? `<span class="${c.rotulo}" data-rotulo-lei="${esc(lei)}" data-rotulo-art="${esc(b.disp!.split(".")[0]!)}">${esc(rotulo!)}</span>`
      : esc(rotulo!)
    : "";
  // data-disp: o inciso ou parágrafo que a referência nomeia ("inciso XI do art. 5º"); a prévia o destaca
  const link = (t: Trecho) =>
    `<a class="${c.ref}" href="${esc(t.href!)}" data-grifo="${esc(t.href!)}"${t.planalto ? ` data-planalto="${esc(t.planalto)}"` : ""}${
      t.lei && t.art ? ` data-lei="${esc(t.lei)}" data-art="${esc(t.art)}"` : ""
    }${t.lei && t.art && t.disps?.length ? ` data-disp="${esc(t.disps.join(" "))}"` : ""}>${esc(t.texto)}</a>`;
  const semLink = (t: Trecho) =>
    t.naoEncontrado ? `<span class="${c.naoEncontrada}" tabindex="0" data-dica="${esc(MSG_NAO_ENCONTRADO)}">${esc(t.texto)}</span>` : esc(t.texto);
  // os links do próprio Planalto entram onde o Grifo não pôs link (o link do Grifo, quando há, fica)
  const base = ehRotulo || rotuloDoDisp ? rotulo!.length : 0;
  const pecas = trechos(corpo, lei, ehRotulo ? undefined : rotulo, (art) => ancoras.has(idArtigo(art)), alteracao, b.data ? { ...apoio, data: b.data } : apoio);
  const nossos: [number, number][] = [];
  pecas.reduce((p, t) => {
    if (t.href) nossos.push([p, p + t.texto.length]);
    return p + t.texto.length;
  }, 0);
  // um link do Planalto que encosta num link do Grifo fica de fora inteiro (o do Grifo vale para aquele trecho)
  const doPlanalto = (b.links ?? [])
    .map((l) => ({ ini: l.ini - base, fim: l.fim - base, href: l.href }))
    .filter((l) => l.fim > 0 && !nossos.some(([a, z]) => l.ini < z && l.fim > a));
  let pos = 0;
  const texto =
    cabeca +
    pecas
      .map((t) => {
        const ini = pos;
        pos += t.texto.length;
        if (t.href) return link(t);
        const cobrem = doPlanalto.filter((l) => l.ini < pos && l.fim > ini);
        if (!cobrem.length) return semLink(t);
        let s = "";
        let k = ini;
        for (const l of cobrem) {
          const de = Math.max(k, l.ini);
          const ate = Math.min(pos, l.fim);
          if (de >= ate) continue;
          if (de > k) s += semLink({ ...t, texto: t.texto.slice(k - ini, de - ini) });
          let endereco = l.href;
          try {
            endereco = new URL(l.href, url).href;
          } catch {
            // endereço que não se resolve: fica como veio
          }
          const alvo = destinoDoPlanalto(endereco, lei);
          // "#art81§1ii": o inciso II do § 1º do art. 81, que a prévia destaca
          const disp = alvo.art ? dispositivoDaAncora(ancoraDe(endereco)) : null;
          s += link({ texto: t.texto.slice(de - ini, ate - ini), ...alvo, ...(disp?.startsWith(`${alvo.art}.`) ? { disps: [disp] } : {}) });
          k = ate;
        }
        if (k < pos) s += semLink({ ...t, texto: t.texto.slice(k - ini) });
        return s;
      })
      .join("");
  const atos = b.atos.length
    ? `<span class="${c.atos}">${b.atos
        .map((a) => {
          // o "Vide" que aponta para outro dispositivo do leitor (outra súmula): link interno, com a prévia do pop-up
          if (a.lei && a.art)
            return `<a href="${esc(rotaDaLei(a.lei))}#${esc(a.art)}" class="${c.ato}" data-tipo="${a.tipo}" data-lei="${esc(a.lei)}" data-art="${esc(a.art)}">${esc(a.bruto)}</a>`;
          const href = a.href ? new URL(a.href, url).href : null;
          return href ? `<a href="${esc(href)}" class="${c.ato}" data-tipo="${a.tipo}" rel="noopener" target="_blank">${esc(a.bruto)}</a>` : `<span class="${c.ato}" data-tipo="${a.tipo}">${esc(a.bruto)}</span>`;
        })
        .join(" ")}</span>`
    : "";
  return `<${tag}${id} ${attrs} class="${c.b} ${c.tipos[b.tipo]}">${estrela}<span class="${c.txt}">${texto}</span>${atos}${htmlInfo(b.info, c)}</${tag}>`;
}

/** As informações adicionais de um dispositivo (súmulas): uma linha por item, escondidas até o leitor pedir. */
export function htmlInfo(info: InfoBloco[] | undefined, c: Classes): string {
  if (!info?.length) return "";
  return `<span class="${c.info}">${info
    .map((l) => {
      // os excertos dos precedentes são longos: ficam recolhidos, e o aluno abre o que quiser ler
      if (l.rotulo === "Precedentes") {
        const excertos = l.texto.split("\n").filter(Boolean);
        return `<details class="${c.infoLinha}"><summary>Excertos dos precedentes (${excertos.length})</summary>${excertos
          .map((e) => `<span class="${c.infoLinha}">${esc(e)}</span>`)
          .join("")}</details>`;
      }
      return `<span class="${c.infoLinha}"><strong>${esc(l.rotulo)}:</strong> ${l.href ? `<a href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.texto)}</a>` : esc(l.texto)}</span>`;
    })
    .join("")}</span>`;
}

/**
 * O que o HTML de um bloco precisa saber da lei inteira, calculado uma vez: âncoras, caputs, preâmbulo e a lei que cada
 * bloco altera. A lista pode ter buracos (partes ainda não baixadas): o que falta fica de fora até a lei chegar inteira.
 */
export interface ContextoLei {
  ancoras: Map<string, number>;
  caputs: Map<string, string>;
  caputPrimeiro?: string;
  preambulo: string;
  alteracoes: (string | null)[];
}
export function contextoDaLei(blocos: Bloco[], lei: string): ContextoLei {
  const { caputs, caputPrimeiro, preambulo } = apoioDaLei(blocos);
  const alteracoes: (string | null)[] = new Array(blocos.length).fill(null);
  let alteracao: string | null = null;
  for (let i = 0; i < blocos.length; i++) {
    const b = blocos[i];
    // o artigo que altera outra lei vale para os blocos até o próximo artigo
    if (!b) alteracao = null;
    else if (b.tipo === "artigo") alteracao = diplomaDaAlteracao(b.texto);
    alteracoes[i] = alteracao;
  }
  return { ancoras: mapaAncoras(blocos, lei), caputs, caputPrimeiro, preambulo, alteracoes };
}

/** HTML dos blocos de `ini` a `fim` com o contexto já calculado (os buracos da lista são pulados). */
export function htmlComContexto(
  ctx: ContextoLei,
  blocos: Bloco[],
  ini: number,
  fim: number,
  lei: string,
  url: string,
  c: Classes,
  citados: ReadonlySet<string> = new Set(),
): string {
  let s = "";
  for (let i = ini; i < Math.min(fim, blocos.length); i++) {
    const b = blocos[i];
    if (!b) continue;
    const art = b.disp?.split(".")[0] ?? "";
    const apoio: Apoio = { caput: ctx.caputs.get(art), caputPrimeiro: ctx.caputPrimeiro, preambulo: ctx.preambulo };
    s += htmlBloco(b, i, lei, url, ctx.ancoras, c, ctx.alteracoes[i] ?? null, apoio, citados.has(`${lei}|${art}`), b.tipo !== "artigo" && !!b.disp && citados.has(`${lei}|${b.disp}`));
  }
  return s;
}

export function htmlBlocos(
  blocos: Bloco[],
  ini: number,
  fim: number,
  lei: string,
  url: string,
  ancoras: Map<string, number>,
  c: Classes,
  citados: ReadonlySet<string> = new Set(),
): string {
  return htmlComContexto({ ...contextoDaLei(blocos, lei), ancoras }, blocos, ini, fim, lei, url, c, citados);
}
