// Lê as páginas de súmulas do STF (portal.stf.jus.br) e do STJ (scon.stj.jus.br) já baixadas ou salvas.
// Sem rede: é só HTML → dados. O coletor (baixar.ts) busca as páginas e chama estas funções.
import { parse, type DefaultTreeAdapterMap } from "parse5";

type No = DefaultTreeAdapterMap["element"] | DefaultTreeAdapterMap["textNode"] | DefaultTreeAdapterMap["parentNode"] | DefaultTreeAdapterMap["document"];
type Elemento = DefaultTreeAdapterMap["element"];

const attr = (n: No, nome: string) => (n.nodeName === "#text" ? "" : ((n as Elemento).attrs ?? []).find((a) => a.name === nome)?.value ?? "");
const classes = (n: No) => attr(n, "class").split(/\s+/).filter(Boolean);
const filhos = (n: No): No[] => (("childNodes" in n ? n.childNodes : []) as No[]) ?? [];
const tem = (n: No, classe: string) => classes(n).includes(classe);

function todos(n: No, pred: (x: No) => boolean, saida: Elemento[] = []): Elemento[] {
  if (n.nodeName !== "#text" && pred(n)) saida.push(n as Elemento);
  for (const c of filhos(n)) todos(c, pred, saida);
  return saida;
}

/** Texto do nó, com quebra de linha em <br> e entre blocos (p, div, li, tr, h1–h6). */
function linhas(n: No): string[] {
  let bruto = "";
  const andar = (x: No) => {
    if (x.nodeName === "#text") return void (bruto += (x as DefaultTreeAdapterMap["textNode"]).value);
    if (x.nodeName === "br") return void (bruto += "\n");
    const bloco = /^(p|div|li|tr|h[1-6]|section)$/.test(x.nodeName);
    if (bloco) bruto += "\n";
    for (const c of filhos(x)) andar(c);
    if (bloco) bruto += "\n";
  };
  andar(n);
  return bruto
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}
const limpo = (s: string) => s.replace(/\s+/g, " ").trim();
const textoDe = (n: No) => limpo(linhas(n).join(" "));
const doc = (html: string) => parse(html) as unknown as No;

// ---------- STF: lista (base=30) ----------

export interface SumulaSTFLista {
  numero: number;
  status: "vigente" | "superada" | "cancelada";
  /** o identificador do portal (sumula=ID), que leva à página de detalhe */
  id: string;
}

/** A lista de súmulas do STF: um link por súmula, com "(superada)" ou "(cancelada)" quando for o caso. */
export function listaSTF(html: string): SumulaSTFLista[] {
  const saida: SumulaSTFLista[] = [];
  const vistos = new Set<number>();
  for (const item of todos(doc(html), (n) => tem(n, "sumula-item"))) {
    const a = todos(item, (n) => n.nodeName === "a")[0];
    if (!a) continue;
    const nome = textoDe(a);
    const numero = Number(nome.match(/Súmula\s+(\d+)/i)?.[1]);
    const id = attr(a, "href").match(/sumula=(\d+)/)?.[1];
    if (!numero || !id || vistos.has(numero)) continue;
    vistos.add(numero);
    const texto = textoDe(item);
    const status = /cancelad/i.test(texto) ? "cancelada" : /superad/i.test(texto) ? "superada" : "vigente";
    saida.push({ numero, status, id });
  }
  return saida.sort((a, b) => a.numero - b.numero);
}

// ---------- STF: detalhe ----------

export interface JurisprudenciaSTF {
  /** o título em negrito, quando a entrada tem um ("● Condições para expulsão…") */
  titulo?: string;
  ementa: string;
  /** a referência entre colchetes: tribunal, relator, turma, data e DJe */
  referencia: string;
}

/** Uma remissão dentro das observações: "Vide Súmula 421", com o número da súmula citada quando dá para ler. */
export interface ObservacaoSTF {
  texto: string;
  /** "Vide …": a súmula indicada, do mesmo tribunal (STF) ou de outro, quando o texto diz */
  vide?: { tribunal: "stf" | "stj" | "stf-vinculante" | "outro"; numero: number };
}

export interface DetalheSTF {
  enunciado: string;
  jurisprudencia: JurisprudenciaSTF[];
  observacoes: ObservacaoSTF[];
  dataAprovacao?: string;
}

/** Lê a seção de uma súmula: enunciado, jurisprudência selecionada e observações (com os "Vide"). */
export function detalheSTF(html: string): DetalheSTF {
  const raiz = doc(html);
  const conteudo = todos(raiz, (n) => tem(n, "conteudo"))[0] ?? raiz;
  // a página é uma sequência de <div class="titulo"> seguida de <div class="parCOM">
  let secao = "";
  const blocos: { secao: string; conteudo: No }[] = [];
  const andar = (n: No) => {
    for (const c of filhos(n)) {
      if (c.nodeName === "#text") continue;
      if (tem(c, "titulo")) secao = textoDe(c);
      else if (tem(c, "parCOM")) blocos.push({ secao, conteudo: c });
      else andar(c);
    }
  };
  andar(conteudo);

  const do_ = (nome: RegExp) => blocos.filter((b) => nome.test(b.secao)).map((b) => b.conteudo);
  const enunciado = do_(/^Súmula\s+\d+/i).map(textoDe).join(" ").trim();
  const jurisprudencia = do_(/Jurisprudência selecionada/i).flatMap(entradasDeJurisprudencia);
  const observacoes: ObservacaoSTF[] = [];
  let dataAprovacao: string | undefined;
  for (const nodo of do_(/^Observação/i)) {
    for (const l of linhas(nodo)) {
      const sem = l.replace(/^●\s*/, "").trim();
      const data = sem.match(/^Data de aprovação do enunciado:\s*(.+)$/i);
      if (data) {
        dataAprovacao = data[1].replace(/\.$/, "");
        continue;
      }
      if (/^Para (informações|pesquisar)/i.test(sem)) continue;
      if (!sem) continue;
      observacoes.push(lerObservacao(l, nodo));
    }
  }
  return { enunciado, jurisprudencia, observacoes, ...(dataAprovacao ? { dataAprovacao } : {}) };
}

/** As entradas da jurisprudência: cada uma é um título opcional, a ementa e a referência entre colchetes. */
function entradasDeJurisprudencia(nodo: No): JurisprudenciaSTF[] {
  const saida: JurisprudenciaSTF[] = [];
  let titulo: string | undefined;
  let ementa: string[] = [];
  for (const l of linhas(nodo)) {
    if (/^\[.*\]$/.test(l)) {
      saida.push({ ...(titulo ? { titulo } : {}), ementa: limpo(ementa.join(" ")), referencia: l.slice(1, -1).trim() });
      titulo = undefined;
      ementa = [];
    } else if (l.startsWith("●")) {
      // um título novo começa uma entrada; o que sobrou sem referência vira uma entrada própria
      if (ementa.length) saida.push({ ...(titulo ? { titulo } : {}), ementa: limpo(ementa.join(" ")), referencia: "" });
      titulo = l.replace(/^●\s*/, "");
      ementa = [];
    } else ementa.push(l);
  }
  if (ementa.length) saida.push({ ...(titulo ? { titulo } : {}), ementa: limpo(ementa.join(" ")), referencia: "" });
  return saida;
}

/** Uma observação; "Vide Súmula N" ganha o alvo (o link do portal diz `seq-sumulaN`, o texto diz "Súmula N"). */
function lerObservacao(linha: string, nodo: No): ObservacaoSTF {
  const texto = linha.replace(/^●\s*/, "").replace(/\s+\./, ".").trim();
  if (!/^Vide\b/i.test(texto)) return { texto };
  // o link desta linha é o que tem o texto dela ("Súmula 421"), não o primeiro da observação
  const link = todos(nodo, (n) => n.nodeName === "a" && /seq-sumula\d+/.test(attr(n, "href")) && linha.includes(textoDe(n)))[0];
  const numero = Number(attr(link ?? (nodo as Elemento), "href").match(/seq-sumula(\d+)/)?.[1] ?? texto.match(/Súmula\s+(?:Vinculante\s+)?(\d+)/i)?.[1]);
  const vinculante = /Súmula\s+Vinculante/i.test(texto);
  const outroTribunal = /\bSTJ\b/.test(texto) ? "stj" : null;
  if (!numero) return { texto };
  return { texto, vide: { tribunal: vinculante ? "stf-vinculante" : (outroTribunal ?? "stf"), numero } };
}

// ---------- STJ: lista (toc.jsp) ----------

export interface NormaSTJ {
  norma: string;
  artigos: string[];
}

export interface SumulaSTJ {
  numero: number;
  /** o ramo do direito, como o STJ publica ("DIREITO PROCESSUAL PENAL - PRISÃO") */
  ramo?: string;
  enunciado: string;
  /** "TERCEIRA SEÇÃO, julgado em 11/12/2024, DJe de 17/12/2024" */
  julgamento?: string;
  fonte?: string;
  referenciaLegislativa: NormaSTJ[];
  precedentes: string[];
}

/** Os itens de uma página da lista do STJ (100 por página), com os dados que o modal de cada súmula traz. */
export function listaSTJ(html: string): SumulaSTJ[] {
  const raiz = doc(html);
  const saida: SumulaSTJ[] = [];
  const vistos = new Set<number>();
  for (const grid of todos(raiz, (n) => tem(n, "gridSumula"))) {
    const numero = Number(textoDe(todos(grid, (n) => tem(n, "numeroSumula"))[0] ?? grid).match(/\d+/)?.[0]);
    if (!numero || vistos.has(numero)) continue;
    vistos.add(numero);
    const ramo = textoDe(todos(grid, (n) => tem(n, "ramoSumula"))[0] ?? grid) || undefined;
    const verbete = textoDe(todos(grid, (n) => tem(n, "blocoVerbete"))[0] ?? grid);
    const { enunciado, julgamento } = separarJulgamento(ramo ? verbete.replace(ramo, "").trim() : verbete);
    const modal = todos(raiz, (n) => attr(n, "id") === `modalSum${numero}`)[0];
    const campos = modal ? camposDoModal(modal) : {};
    saida.push({
      numero,
      ...(ramo ? { ramo } : {}),
      enunciado,
      ...(julgamento ? { julgamento } : {}),
      ...(campos.fonte ? { fonte: campos.fonte } : {}),
      referenciaLegislativa: campos.referencia ?? [],
      precedentes: campos.precedentes ?? [],
    });
  }
  return saida.sort((a, b) => a.numero - b.numero);
}

/** Separa "(TERCEIRA SEÇÃO, julgado em …, DJe de …)" do enunciado. */
function separarJulgamento(texto: string): { enunciado: string; julgamento?: string } {
  const m = texto.match(/\(([^()]*julgado em[^()]*)\)\s*$/i);
  if (!m) return { enunciado: texto };
  return { enunciado: texto.slice(0, m.index).trim(), julgamento: m[1].trim() };
}

/** Campos do modal: os pares "docTitulo" (nome da seção) e "docTexto" (conteúdo). */
function camposDoModal(modal: Elemento): { fonte?: string; referencia?: NormaSTJ[]; precedentes?: string[] } {
  const por: Record<string, No> = {};
  for (const bloco of todos(modal, (n) => tem(n, "paragrafoBRS"))) {
    const titulo = textoDe(todos(bloco, (n) => tem(n, "docTitulo"))[0] ?? bloco);
    const corpo = todos(bloco, (n) => tem(n, "docTexto"))[0];
    if (titulo && corpo) por[titulo] = corpo;
  }
  const fonte = por["Fonte(s)"] ? textoDe(por["Fonte(s)"]) : undefined;
  const referencia = por["Referência Legislativa"] ? lerReferenciaSTJ(linhas(por["Referência Legislativa"])) : undefined;
  const precedentes = por["Excerto dos Precedentes Originários"] ? lerPrecedentes(textoDe(por["Excerto dos Precedentes Originários"])) : undefined;
  return { fonte, referencia, precedentes };
}

/**
 * "LEG:FED LEI:011340 ANO:2006 / ***** LMP-06 LEI MARIA DA PENHA / ART:00020" → { norma: "LEI MARIA DA PENHA", artigos: ["20"] }.
 * Linhas que não seguem esse formato ficam como norma sem artigo, com o próprio texto.
 */
export function lerReferenciaSTJ(linhasRef: string[]): NormaSTJ[] {
  const saida: NormaSTJ[] = [];
  let atual: NormaSTJ | null = null;
  for (const l of linhasRef) {
    if (/^LEG:/.test(l)) {
      atual = null;
      continue;
    }
    const nome = l.match(/^\*+\s*\S+\s+(.+)$/);
    if (nome) {
      atual = { norma: nome[1].trim(), artigos: [] };
      saida.push(atual);
      continue;
    }
    const arts = [...l.matchAll(/ART:0*(\d+)/g)].map((x) => x[1]);
    if (arts.length && atual) atual.artigos.push(...arts);
    else if (!arts.length && !atual) saida.push({ norma: l, artigos: [] });
  }
  return saida;
}

/** O "Excerto dos Precedentes Originários" é uma sequência de trechos, cada um termina com "Inteiro Teor do Acórdão". */
export function lerPrecedentes(texto: string): string[] {
  // "Consulta Processual" é o rótulo que o STJ põe antes de cada trecho; sozinho, não é um precedente
  return texto
    .split(/Inteiro Teor do Acórdão/)
    .map((t) => limpo(t.replace(/^\s*Consulta Processual\s*/, "").replace(/\s*Consulta Processual\s*$/, "")))
    .filter((t) => t.length > 3);
}
