"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type CSSProperties, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import indice from "@/content/generated/leis-indice.json";
import prontosJson from "@/content/generated/grifos.json";
import { gravarJSON, lerJSON } from "@/lib/storage";
import { achadosDoNumero, alvoDigitado, artigoDigitado, buscarTexto, leiDigitada, leiNaBusca, semPalavraSumula, sugerirArtigos, type Achado, type ArtigoTexto } from "@/lib/leis/busca";
import { IrParaArtigo, rotuloDoDispositivo } from "./IrParaArtigo";
import type { IdComando } from "@/lib/leis/comandos";
import { BarraLeitura, textoPercentual } from "./BarraLeitura";
import { Logo } from "@/components/Logo";
import { fracaoLida } from "@/lib/leis/leitura";
import { useLeitura } from "./useLeitura";
import { codificar, decodificar, LIMITE_LINK, pareceCompartilhado, type Compartilhado } from "@/lib/leis/compartilhar";
import { carregarArtigos, carregarCitacoes, carregarDatas, carregarInfoSumulas, carregarLei, carregarManifesto, carregarParte, carregarRemissivo, carregarVersoes, type CitacoesGerais, type ParteLei, type Remissivo, type RemissivoSubitem } from "@/lib/leis/dados";
import { agregar, lerEventos, maisErrados, type Agregado } from "@/lib/erros";
import { blocosComProntos, CORES_GRIFO, grifosDoJson, noArtigo, ROTULO_DA_COR } from "@/lib/leis/grifos";
import { desmarcarProntos, pintarProntos } from "./prontos-dom";
import { contextoDaLei, htmlComContexto, htmlInfo, type ContextoLei } from "@/lib/leis/html";
import { corrigirBlocos } from "@/lib/leis/texto";
import {
  copiarSistema,
  corDoGrifo,
  corUnicas,
  gravarLegendas,
  lerLegendas,
  novaCorPara,
  prontosNoSistema,
  rotuloDoGrifo,
  SISTEMAS_PRONTOS,
  sistemaDoLeitor,
  todosSistemas,
  type CorLegenda,
  type Estado,
  type Sistema,
} from "@/lib/leis/legendas";
import { datasComLocal, textoEm, type Bloco, type Datas } from "@/lib/leis/linha-do-tempo";
import { LISTAS_SUMULAS, ehSumulas, rotaDaLei } from "@/lib/leis/sumulas";
import { apagarMarca, gravarMarcacoes, gruposTocados, lerMarcacoes, localizar, novaMarcacao, pedeConfirmacao, type Marcacao } from "@/lib/leis/marcacoes";
import {
  ehDivisao,
  imantar,
  indicePorPosicao,
  modoPorPosicao,
  mover as moverIndice,
  proximoPonto,
  PX_POR_MARCA,
  secoesDosArtigos,
  type Modo,
} from "@/lib/leis/rolagem";
import { CLASSES } from "./classes";
import styles from "./leitor.module.css";
import { DiagSelecao } from "./DiagSelecao";
import { OpcaoCartao } from "./OpcaoCartao";
import { useOuvir } from "./useOuvir";
import { AjustesOuvir, BarraOuvir, BolhaLerDaqui } from "./OuvirLei";
import { copiarTexto } from "@/lib/copiar";
import { CORES_TEXTO, type CorTexto } from "@/lib/leis/opcoes";
import { ordemNoRemissivo, tituloTemTermo } from "@/lib/leis/remissivo-busca";
import { artigoDaRef, coresPorArtigo } from "@/lib/leis/remissivo-cores";

/** "tudo": o texto inteiro; "grifos": só os parágrafos grifados pelo usuário; "erros": só os artigos em que ele errou */
export type FiltroTexto = "tudo" | "grifos" | "erros" | "automaticos";
const FILTROS: { id: FiltroTexto; titulo: string; dica: string }[] = [
  { id: "tudo", titulo: "Mostrar tudo", dica: "O texto inteiro da lei." },
  { id: "grifos", titulo: "Mostrar somente grifos", dica: "Só os parágrafos que você grifou, com o caput do artigo de cada um. O resto fica oculto." },
  { id: "erros", titulo: "Mostrar apenas os erros", dica: "Só os artigos em que você errou nesta lei. O resto fica oculto." },
  { id: "automaticos", titulo: "Mostrar somente grifos automáticos", dica: "Só os dispositivos com grifo pronto do Grifo (temas de prova). Precisa de “Grifos prontos do Grifo” ligado." },
];

export interface PrefsLeitor {
  /** a redação do Planalto como veio ("Art. 1o", "freqüente"), sem as correções do Grifo */
  original: boolean;
  fonte: "sans" | "serif" | "mono";
  tamanho: number;
  entrelinha: number;
  /** "livre": o texto ocupa a largura da tela, com o espaço lateral abaixo; "padrao": a coluna de sempre */
  largura: "padrao" | "livre";
  /** espaço de cada lado do texto, em px (só no modo livre) */
  laterais: number;
  fundo: "papel" | "branco" | "sepia" | "escuro" | "verde";
  revogados: boolean;
  anotacoes: boolean;
  /** as informações adicionais de cada súmula (julgamento, jurisprudência, observações…); só nas súmulas */
  informacoes: boolean;
  /** remissões entre parênteses ("(Vide EC 132/2023)"); não são as notas de revogação */
  vide: boolean;
  /** a barra de rolagem do navegador; oculta por padrão, porque o slide da direita faz esse papel */
  barraNavegador: boolean;
  /** cor das letras; "padrao" segue o fundo */
  corTexto: CorTexto;
  /** marcar os artigos em que o usuário mais erra */
  erros: boolean;
  /** o que mostrar no texto: tudo, só os grifos ou só os artigos em que o usuário errou (um por vez) */
  filtro: FiltroTexto;
  /** nos filtros de grifos (meus ou automáticos), só os das cores escolhidas do sistema ativo (vazio = todas) */
  filtroCores: string[];
  destino: "grifo" | "planalto";
  /** grifos prontos do Grifo (content/grifos.yaml) */
  prontos: boolean;
  /** local escolhido para leis com vigência por região, por id da alteradora */
  locais: Record<string, string>;
  /** onde fica o slide de artigos: na borda direita (padrão), na esquerda, no alto ou embaixo */
  trilhoLado: LadoTrilho;
}
export type LadoTrilho = "direita" | "esquerda" | "cima" | "baixo";
export const PREFS_PADRAO: PrefsLeitor = {
  original: false,
  fonte: "sans",
  tamanho: 18,
  entrelinha: 1.7,
  largura: "padrao",
  laterais: 0,
  fundo: "papel",
  revogados: false,
  anotacoes: true,
  informacoes: false,
  vide: true,
  barraNavegador: false,
  corTexto: "padrao",
  erros: true,
  filtro: "tudo",
  filtroCores: [],
  destino: "grifo",
  prontos: true,
  locais: {},
  trilhoLado: "direita",
};
const K_PREFS = "grifo:leitor";
const K_IMPORTANTES = "grifo:leis:importantes";
const K_HISTORICO = "grifo:leis:historico";
const K_POSICOES = "grifo:leitor:posicoes";
const FUNDOS: { id: PrefsLeitor["fundo"]; nome: string }[] = [
  { id: "papel", nome: "Papel" },
  { id: "branco", nome: "Branco" },
  { id: "sepia", nome: "Sépia" },
  { id: "verde", nome: "Verde" },
  { id: "escuro", nome: "Escuro" },
];
const PRONTOS = grifosDoJson(prontosJson);
const LOTE = 200;
// prévia do artigo (PopupArtigos, no body): o mouse pode ir do "citado por" até ela sem fechar o cartão
const PREVIA = '[role="dialog"][aria-label="Texto do artigo"]';

type Painel = "leis" | "buscar" | "grifos" | "aa" | "mais" | "navegar" | "ouvir";
/** abas do menu "Ir para", aberto pelo botão do slide */
type AbaNavegar = "divisoes" | "prontos" | "grifos" | "remissivo" | "erros";
// as abas do "Ir para": nas súmulas, a primeira é a lista das súmulas (não há títulos nem capítulos)
const ABAS_LEIS: readonly [AbaNavegar, string][] = [
  ["divisoes", "Títulos e capítulos"],
  ["prontos", "Grifos prontos"],
  ["grifos", "Meus Grifos"],
  ["remissivo", "Índice alfabético"],
  ["erros", "Erros"],
];
const ABAS_SUMULAS: readonly [AbaNavegar, string][] = [
  ["divisoes", "Súmulas"],
  ["prontos", "Grifos prontos"],
  ["grifos", "Meus Grifos"],
  ["remissivo", "Índice alfabético"],
  ["erros", "Erros"],
];
/** O id no leitor do artigo de um erro registrado: "art121" nas leis, "s-145" nas súmulas (o registro guarda só o número). */
const idDoErro = (lei: string, artigo: string) => (ehSumulas(lei) ? `s-${artigo}` : `art${artigo}`);
/** Os ícones das abas do "Ir para" (o nome da aba aparece ao passar o mouse). */
const ICONES_ABA: Record<AbaNavegar, React.ReactNode> = {
  divisoes: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M4 6h16M4 12h10M4 18h13" />
    </svg>
  ),
  prontos: <Logo size={18} title="Grifos prontos" className={styles.logoAba} />,
  grifos: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M15.2 4.8l4 4L8.4 19.6 4 20.6l1-4.4z" />
      <path d="M13.2 6.8l4 4" />
    </svg>
  ),
  remissivo: <span className={styles.abaLetra} aria-hidden>A–Z</span>,
  erros: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </svg>
  ),
};
/** um grifo do usuário, com as partes de uma seleção que atravessa parágrafos somadas num grifo só */
interface GrupoGrifo {
  k: number;
  cor: string;
  nota?: string;
  primeiroId: string;
  texto: string;
  partes: number;
}
type Posicoes = Record<string, { art: string; rotulo: string; em: number }>;

const blocosDe = (raiz: HTMLElement) => Array.from(raiz.querySelectorAll<HTMLElement>("[data-i]"));
/** Troca o texto dos blocos já desenhados pelo HTML novo, sem trocar os elementos (a altura e os atributos ficam). */
function trocarNoLugar(raiz: HTMLElement, indices: Iterable<number>, html: (i: number) => string) {
  const porIndice = new Map(blocosDe(raiz).map((b) => [Number(b.dataset.i), b]));
  const molde = document.createElement("template");
  for (const i of indices) {
    const b = porIndice.get(i);
    if (!b) continue;
    molde.innerHTML = html(i);
    const novo = molde.content.firstElementChild;
    if (!novo) continue;
    b.innerHTML = novo.innerHTML;
    // os atributos do bloco também: o id (âncora) só existe quando a lei já chegou inteira; os que o leitor põe
    // depois (filtro, tempo, grifos prontos) não vêm no HTML e ficam
    if (!novo.id) b.removeAttribute("id");
    for (const a of novo.attributes) if (a.name !== "class") b.setAttribute(a.name, a.value);
  }
}
const txtDe = (el: HTMLElement) => el.querySelector<HTMLElement>(`:scope > .${CLASSES.txt}`);
/**
 * A faixa da tela em que um cartão flutuante (as cores da seleção, o cartão do grifo) aparece inteiro: abaixo do que
 * fica fixo no alto (cabeçalho e barras da leitura, --topo-livre) e acima da barra de baixo (o dock), em px da janela.
 */
function faixaVisivel(): { topo: number; fundo: number } {
  const topo = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--topo-livre")) || 90;
  const dock = document.querySelector<HTMLElement>(`.${styles.dock}`)?.getBoundingClientRect();
  const fundo = dock && dock.height && dock.top < window.innerHeight ? dock.top - 8 : window.innerHeight - 8;
  return { topo, fundo };
}
const proximoQuadro = () => new Promise<void>((r) => requestAnimationFrame(() => setTimeout(r, 0)));

// grifos apagados que ainda podem voltar: as três últimas apagadas (menu Desfazer; Ctrl+Z só logo depois)
const LIMITE_DESFAZER = 3;
const JANELA_CTRL_Z = 30_000;
interface Apagamento {
  marcas: Marcacao[];
  em: number;
}
// uma seleção que atravessa parágrafos é um grupo só de grifos
const grupoDe = (m: Marcacao) => m.grupo ?? m.id;
const contarGrupos = (ms: Marcacao[]) => new Set(ms.map(grupoDe)).size;

/** Marcações de uma seleção: uma por bloco; a seleção que atravessa parágrafos tem as partes com o mesmo grupo. */
function montarMarcas(el: HTMLElement, segmentos: Segmento[], cor: string): Marcacao[] {
  const criadas: Marcacao[] = [];
  for (const sg of segmentos) {
    const bloco = el.querySelector<HTMLElement>(`[data-i="${sg.i}"]`);
    if (!bloco) continue;
    criadas.push({ ...novaMarcacao(txtDe(bloco)?.textContent ?? "", sg.ini, sg.fim, sg.i, bloco.dataset.disp, cor), inteiro: sg.inteiro || undefined });
  }
  if (criadas.length > 1) for (const m of criadas) m.grupo = criadas[0]!.id;
  return criadas;
}

/**
 * Medida do que fica fixo no alto da tela (cabeçalho do site e as barras da leitura), para que um salto para um
 * artigo pare logo abaixo deles: visível, colado na borda de baixo do que está na frente.
 */
function medirTopo() {
  const fixos = [document.querySelector<HTMLElement>("header"), ...document.querySelectorAll<HTMLElement>(`.${styles.secaoAtual}, .${styles.nomeLei}`)];
  const base = Math.max(0, ...fixos.map((el) => (el ? el.getBoundingClientRect().bottom : 0)));
  document.documentElement.style.setProperty("--topo-livre", `${Math.ceil(base) + 8}px`);
}

/** Nó de texto e deslocamento dentro de `el` para a posição `pos` do texto (depois do fim, vai para o último nó). */
function noTexto(el: HTMLElement, pos: number): { no: Text; off: number } | null {
  const andar = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let acumulado = 0;
  let ultimo: Text | null = null;
  for (let n = andar.nextNode() as Text | null; n; n = andar.nextNode() as Text | null) {
    ultimo = n;
    if (pos <= acumulado + n.data.length) return { no: n, off: pos - acumulado };
    acumulado += n.data.length;
  }
  return ultimo ? { no: ultimo, off: ultimo.data.length } : null;
}

function desmarcar(raiz: HTMLElement) {
  raiz.querySelectorAll("mark[data-m]").forEach((m) => m.replaceWith(...Array.from(m.childNodes)));
  raiz.normalize();
  raiz.querySelectorAll<HTMLElement>("[data-marca-bloco], [data-liga-antes], [data-liga-depois]").forEach((b) => {
    delete b.dataset.marcaBloco;
    delete b.dataset.marcaId;
    delete b.dataset.marcaNota;
    delete b.dataset.ligaAntes;
    delete b.dataset.ligaDepois;
    b.style.removeProperty("--c");
  });
}

/** Parágrafo inteiro marcado: um retângulo único no bloco, sem cortes por linha. */
function pintarBloco(b: HTMLElement, m: Marcacao) {
  b.dataset.marcaBloco = "1";
  // o bloco não tem <mark>: o id fica nele para o clique (abrir ou apagar) achar a marcação
  b.dataset.marcaId = m.id;
  if (m.cor === "nota") b.dataset.marcaNota = "1";
  else b.style.setProperty("--c", m.cor);
}

/** Bloco que não tem texto a grifar (só a nota "(Incluído pela Lei…)", ou vazio) ou que não aparece (oculto). */
const semTextoAGrifar = (b: HTMLElement) => !txtDe(b)?.textContent?.trim() || !b.getClientRects().length;

/**
 * Parágrafos marcados em sequência, com a mesma cor, encostam uns nos outros: a marca vira uma forma só. Olha para o
 * marcado anterior, não só para o vizinho: um bloco sem texto a grifar entre os dois (a nota "(Incluído pela Lei…)"
 * entre a alínea d e a e, um revogado oculto) vira ponte, pintado com a mesma cor, e a forma não se parte nele.
 */
function ligarBlocos(bs: HTMLElement[]) {
  let anterior = -1;
  for (let k = 0; k < bs.length; k++) {
    const b = bs[k]!;
    if (!b.dataset.marcaBloco) continue;
    const a = anterior >= 0 ? bs[anterior]! : null;
    anterior = k;
    if (!a || a.style.getPropertyValue("--c") !== b.style.getPropertyValue("--c") || (a.dataset.marcaNota ?? "") !== (b.dataset.marcaNota ?? "")) continue;
    const meio = bs.slice(bs.indexOf(a) + 1, k);
    if (!meio.every(semTextoAGrifar)) continue;
    for (const p of meio) {
      p.dataset.marcaBloco = "ponte";
      if (a.dataset.marcaId) p.dataset.marcaId = a.dataset.marcaId;
      if (a.dataset.marcaNota) p.dataset.marcaNota = "1";
      else p.style.setProperty("--c", a.style.getPropertyValue("--c"));
    }
    for (const [x, y] of [a, ...meio, b].slice(1).map((y, j, l) => [j ? l[j - 1]! : a, y] as const)) {
      x.dataset.ligaDepois = "1";
      y.dataset.ligaAntes = "1";
    }
  }
}

/** Envolve o intervalo [ini, fim) do texto de `el` em <mark>, atravessando links e outros nós. */
function envolver(el: HTMLElement, ini: number, fim: number, m: Marcacao, rotulo: string, nova: boolean) {
  const andar = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const pedacos: { no: Text; a: number; b: number }[] = [];
  let pos = 0;
  for (let n = andar.nextNode() as Text | null; n; n = andar.nextNode() as Text | null) {
    const len = n.data.length;
    const a = Math.max(ini, pos);
    const b = Math.min(fim, pos + len);
    if (a < b) pedacos.push({ no: n, a: a - pos, b: b - pos });
    pos += len;
  }
  for (const { no, a, b } of pedacos) {
    const alvo = no.splitText(a);
    alvo.splitText(b - a);
    const mark = document.createElement("mark");
    mark.dataset.m = m.id;
    mark.className = `${styles.marca}${nova ? ` ${styles.nova}` : ""}`;
    if (m.cor === "nota") mark.dataset.soNota = "1";
    else mark.style.setProperty("--c", m.cor);
    if (m.nota) mark.dataset.nota = "1";
    mark.title = [rotulo, m.nota].filter(Boolean).join(" — ");
    alvo.replaceWith(mark);
    mark.append(alvo);
  }
}

interface Historico {
  pilha: string[];
  pos: number;
}
const HISTORICO_VAZIO: Historico = { pilha: [], pos: -1 };

// Como voltar e avançar do navegador: deslizar percorre as leis já abertas, não a ordem do índice.
function registrarVisita(lei: string) {
  const h = lerJSON<Historico>(K_HISTORICO, HISTORICO_VAZIO);
  if (h.pilha[h.pos] === lei) return;
  if (h.pilha[h.pos - 1] === lei) h.pos--;
  else if (h.pilha[h.pos + 1] === lei) h.pos++;
  else {
    h.pilha = [...h.pilha.slice(0, h.pos + 1), lei].slice(-30);
    h.pos = h.pilha.length - 1;
  }
  gravarJSON(K_HISTORICO, h);
}

/** Trecho selecionado dentro de um bloco; uma seleção que atravessa parágrafos tem um trecho por bloco. */
interface Segmento {
  i: number;
  ini: number;
  fim: number;
  inteiro: boolean;
}

export function Leitor({
  lei,
  nome,
  url,
  total,
  inicial,
  ids,
  rotulos,
  cor,
}: {
  lei: string;
  nome: string;
  url: string;
  total: number;
  inicial: string;
  /** unidades de leitura da lei, na ordem do texto (ver unidadesDeLeitura) */
  ids: string[];
  rotulos: Record<string, string>;
  /** cor do tipo da lei (Códigos, Constituição, Estatutos ou Leis) */
  cor: string;
}) {
  const router = useRouter();
  const folha = useRef<HTMLDivElement>(null);
  // as súmulas usam o mesmo leitor; o que não cabe nelas (datas, divisões, anotações de redação) fica de fora
  const sumula = ehSumulas(lei);
  const html = useMemo(() => ({ __html: inicial }), [inicial]);
  const [prefs, setPrefs] = useState<PrefsLeitor>(PREFS_PADRAO);
  const raizRef = useRef<HTMLDivElement>(null);
  const valorLateralRef = useRef<HTMLSpanElement>(null);
  const sliderRef = useRef<HTMLInputElement>(null);
  const abrirRef = useRef<HTMLInputElement>(null);
  const [painel, setPainel] = useState<Painel | null>(null);
  // atalho "Ir para o artigo" (o texto já digitado; null = fechado) e o texto que abre a busca completa
  const [atalho, setAtalho] = useState<string | null>(null);
  const [buscaInicial, setBuscaInicial] = useState("");
  const [abaNavegar, setAbaNavegar] = useState<AbaNavegar>("divisoes");
  const [remissivo, setRemissivo] = useState<Remissivo | "sem" | null>(null);
  const [buscaRemissivo, setBuscaRemissivo] = useState("");
  const [buscaTitulos, setBuscaTitulos] = useState("");
  // o slide de divisões (até que nível mostrar: livros, títulos, capítulos, seções ou tudo) e o de erros
  const [nivelMax, setNivelMax] = useState(5);
  const [minErros, setMinErros] = useState(1);
  // espaço lateral que dá a largura de texto padrão (a coluna de sempre), medido na tela: é o número que o
  // controle mostra no padrão, para o leitor chegar a essa largura arrastando até ele
  const [larguraPadrao, setLarguraPadrao] = useState(0);
  useEffect(() => {
    const medir = () => {
      const folha = raizRef.current?.querySelector<HTMLElement>("[data-lei]");
      if (!folha || raizRef.current?.getAttribute("data-largura") !== "padrao") return;
      setLarguraPadrao(Math.max(0, Math.round((window.innerWidth - folha.getBoundingClientRect().width) / 2)));
    };
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [prefs.largura, lei]);
  // Modo livre: o leitor ocupa a largura da tela sem a barra de rolagem do navegador, e começa exatamente na borda
  // da tela (o recuo do site fica para trás). Medido aqui, porque 100vw inclui a barra de rolagem e cortava o texto.
  const ajustarLargura = useCallback(() => {
    const raiz = raizRef.current;
    if (!raiz) return;
    raiz.style.width = "";
    raiz.style.marginLeft = "";
    if (raiz.dataset.largura !== "livre") return;
    const esquerda = raiz.getBoundingClientRect().left;
    raiz.style.width = `${document.documentElement.clientWidth}px`;
    raiz.style.marginLeft = `${-esquerda}px`;
  }, []);
  useLayoutEffect(() => {
    ajustarLargura();
    window.addEventListener("resize", ajustarLargura);
    return () => window.removeEventListener("resize", ajustarLargura);
  }, [ajustarLargura, prefs.largura, prefs.laterais]);
  // o controle e o número acompanham o modo (fora do arrasto, sem redesenhar o leitor)
  useEffect(() => {
    const alvo = prefs.largura === "padrao" ? larguraPadrao : prefs.laterais;
    if (sliderRef.current) sliderRef.current.value = String(alvo);
    if (valorLateralRef.current) valorLateralRef.current.textContent = prefs.largura === "padrao" ? `padrão · ${alvo}px` : `${alvo}px`;
  }, [prefs.largura, prefs.laterais, larguraPadrao, painel]);
  const [pronto, setPronto] = useState(false);
  const [versaoTextos, setVersaoTextos] = useState(0);
  const [artigos, setArtigos] = useState<ArtigoTexto[]>([]);
  // a forma do texto: "Art. 1º" e sem trema, ou a redação do Planalto (prefs.original); os rótulos seguem a mesma forma
  const original = prefs.original;
  const rotulosVistos = useMemo(
    () => (original && artigos.length ? { ...rotulos, ...Object.fromEntries(artigos.map(([id, r]) => [id, r])) } : rotulos),
    [original, artigos, rotulos],
  );
  const leitura = useLeitura(lei, folha, ids, rotulosVistos);
  const [atual, setAtual] = useState(0);
  // posição contínua do leitor, em artigos (artigo atual + fração já rolada dentro dele): o pino da barra acompanha a rolagem
  const [progresso, setProgresso] = useState(0);
  const [oculto, setOculto] = useState(false);
  const [data, setData] = useState("");
  const [datas, setDatas] = useState<Datas | null>(null);
  const [tempo, setTempo] = useState<{ carregando: boolean; aprox: number; erro?: string } | null>(null);
  const [marcas, setMarcas] = useState<Marcacao[]>([]);
  // grifos apagados para desfazer, e a lista atual para os atalhos (que são registrados uma vez e não veem a lista nova)
  const pilhaApagadas = useRef<Apagamento[]>([]);
  const [desfaziveis, setDesfaziveis] = useState(0);
  const marcasAtuais = useRef<Marcacao[]>([]);
  const [confirmacao, setConfirmacao] = useState<{ titulo: string; texto: string; rotulo: string; fazer: () => void } | null>(null);
  const [legendas, setLegendas] = useState(() => ({ ativo: "materias", meus: [] as Sistema[], porLei: {} as Record<string, string> }));
  const [marcador, setMarcador] = useState<{ ativo: boolean; cor: string }>({ ativo: false, cor: "" });
  // `topo`: onde a barra de cores fica (px do contêiner), já dentro da parte visível da tela
  const [selecao, setSelecao] = useState<{ x: number; y: number; fundo: number; topo: number; toque: boolean; segmentos: Segmento[] } | null>(null);
  const [errados, setErrados] = useState<Agregado[]>([]);
  const [secaoVisivel, setSecaoVisivel] = useState(false);
  // seleção feita por toque: enquanto ela existir, os controles, o cabeçalho e as barras de título saem da frente
  // das bordas da tela, para a rolagem do navegador (ao arrastar a alça) alcançar o texto nas duas bordas
  const [selecaoPorToque, setSelecaoPorToque] = useState(false);
  const [nomeVisivel, setNomeVisivel] = useState(false);
  const [telaCheia, setTelaCheia] = useState(false);
  const [aberta, setAberta] = useState<{ id: string; x: number; y: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  // grifo em edição de tamanho: o trecho novo é guardado aqui até "Concluir"
  const [ajuste, setAjuste] = useState<{ id: string; segmentos: Segmento[] | null } | null>(null);
  const ajusteRef = useRef<string | null>(null);
  const [estrelas, setEstrelas] = useState<string[]>([]);
  const [mapa, setMapa] = useState<ReturnType<typeof secoesDosArtigos>>({ secoes: [], marcos: [], divisoes: [] });
  const [regra, setRegra] = useState<{ x: number; y: number; rotulo: string; nota?: string; essencial: boolean } | null>(null);
  const [compartilhar, setCompartilhar] = useState<{ comMarcas: boolean; link: string; carga?: Compartilhado } | null>(null);
  const [recebido, setRecebido] = useState<Compartilhado | null>(null);
  const [vendoRecebido, setVendoRecebido] = useState(false);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  const [perdidas, setPerdidas] = useState(0);
  const [editandoSistema, setEditandoSistema] = useState<Sistema | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; acao?: { rotulo: string; fazer: () => void } } | null>(null);
  const [posicoes, setPosicoes] = useState<Posicoes>({});
  const blocos = useRef<Bloco[] | null>(null);
  const versoesPedidas = useRef<Promise<void> | null>(null);
  // âncoras, caputs e alterações da lei inteira (ver contextoDaLei): calculado uma vez, quando a lei chega inteira
  const contextoRef = useRef<ContextoLei | null>(null);
  // a leitura em voz alta ("Ouvir"): lê o que está à mostra, do ponto da tela ou do parágrafo tocado
  const avisarOuvir = useCallback((texto: string, acao?: { rotulo: string; fazer: () => void }) => setAviso({ texto, acao }), []);
  const trocarDeLeiPelaVoz = useCallback((id: string) => router.push(rotaDaLei(id)), [router]);
  const ouvir = useOuvir({ lei, folha, blocos, artigos, sumula, avisar: avisarOuvir, pronto, trocarDeLei: trocarDeLeiPelaVoz });
  const ouvirRef = useRef(ouvir);
  useEffect(() => {
    ouvirRef.current = ouvir;
  });
  const novaMarca = useRef<string | null>(null);
  const antesDoSalto = useRef<number | null>(null);
  const barraFixa = useRef(0);
  // Saltos do próprio leitor não devem recolher a barra: ela fica para trocar de artigo.
  const saltoFixo = () => {
    barraFixa.current = Date.now() + 2000;
  };

  // o padrão: as leis com grifos automáticos do sistema "Teses da peça" abrem com ele; as outras, com o ativo.
  // Quem escolhe outro sistema numa lei mantém a escolha dela.
  const sistema = sistemaDoLeitor(legendas, lei, PRONTOS);
  const corMarcador = marcador.cor === "borracha" ? "borracha" : marcador.cor && sistema.cores.some((c) => c.cor === marcador.cor) ? marcador.cor : sistema.cores[0]?.cor;

  // ---------- preferências e estado salvo ----------
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- lê localStorage e o link após montar (site estático) */
    // preferências antigas tinham o interruptor soErros: quem o tinha ligado passa a ver "Mostrar apenas os erros"
    const salvo = lerJSON<Partial<PrefsLeitor> & { soErros?: boolean }>(K_PREFS, {});
    setPrefs({ ...PREFS_PADRAO, ...salvo, filtro: salvo.filtro ?? (salvo.soErros ? "erros" : "tudo"), filtroCores: Array.isArray(salvo.filtroCores) ? salvo.filtroCores : [] });
    setMarcas(lerMarcacoes(lei));
    setLegendas(lerLegendas());
    setPosicoes(lerJSON<Posicoes>(K_POSICOES, {}));
    setErrados(maisErrados(agregar(lerEventos().filter((e) => e.d === lei), { janelaDias: null }), "baixo"));
    const h = location.hash.match(/^#c=(v1\..+)$/);
    if (h) decodificar<unknown>(h[1]).then((c) => pareceCompartilhado(c) && c.lei === lei && setRecebido(c));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [lei]);
  const mudarPrefs = (p: Partial<PrefsLeitor>) =>
    setPrefs((a) => {
      const n = { ...a, ...p };
      gravarJSON(K_PREFS, n);
      return n;
    });

  // As informações adicionais das súmulas vêm comprimidas e à parte: baixam só quando o leitor as pede, e entram em cada
  // súmula que aparece (também as que chegam depois, quando o texto cresce ou muda de versão)
  useEffect(() => {
    const el = folha.current;
    if (!sumula || !prefs.informacoes || !el) return;
    let vivo = true;
    let observador: MutationObserver | null = null;
    carregarInfoSumulas(lei)
      .then((infos) => {
        if (!vivo) return;
        const pendurar = () => {
          for (const b of el.querySelectorAll<HTMLElement>("[data-disp]")) {
            if (b.dataset.infoOk) continue;
            b.dataset.infoOk = "1";
            b.insertAdjacentHTML("beforeend", htmlInfo(infos[b.dataset.disp!], CLASSES));
          }
        };
        pendurar();
        observador = new MutationObserver(pendurar);
        observador.observe(el, { childList: true, subtree: true });
      })
      .catch(() => {
        if (vivo) setAviso({ texto: "Não consegui carregar as informações adicionais. Tente de novo daqui a pouco." });
      });
    return () => {
      vivo = false;
      observador?.disconnect();
    };
  }, [sumula, prefs.informacoes, lei]);

  useEffect(() => {
    registrarVisita(lei);
  }, [lei]);
  useEffect(() => {
    carregarDatas().then(setDatas, () => {});
  }, []);
  useEffect(() => {
    const h = lerJSON<Historico>(K_HISTORICO, HISTORICO_VAZIO);
    for (const vizinha of [h.pilha[h.pos - 1], h.pilha[h.pos + 1]]) if (vizinha && vizinha !== lei) router.prefetch(rotaDaLei(vizinha));
  }, [lei, router]);

  // A página toda fica na cor da leitura: sem moldura de outra cor e sem clarão ao rolar rápido.
  useLayoutEffect(() => {
    const raiz = document.documentElement;
    raiz.dataset.leitorFundo = prefs.fundo;
    return () => {
      delete raiz.dataset.leitorFundo;
    };
  }, [prefs.fundo]);
  // a barra de rolagem do navegador some na leitura, a menos que o usuário a ligue em "Mais"
  useLayoutEffect(() => {
    const raiz = document.documentElement;
    raiz.dataset.barraNavegador = prefs.barraNavegador ? "1" : "0";
    return () => {
      delete raiz.dataset.barraNavegador;
    };
  }, [prefs.barraNavegador]);

  // Leva o artigo ao topo livre (abaixo do que fica fixo). Os blocos fora da tela ainda têm altura estimada e
  // ganham a altura real ao serem desenhados, então a posição é corrigida por alguns quadros. O salto é
  // instantâneo: um salto suave cruzaria o texto inteiro, e a posição de chegada ficaria errada.
  const alinharAoArtigo = useCallback((alvo: HTMLElement) => {
    const alinhar = () => {
      medirTopo();
      const dif = alvo.getBoundingClientRect().top - parseFloat(document.documentElement.style.getPropertyValue("--topo-livre"));
      if (Math.abs(dif) > 1) window.scrollTo({ top: window.scrollY + dif, behavior: "instant" });
    };
    medirTopo();
    alvo.scrollIntoView({ block: "start", behavior: "instant" });
    alinhar();
    let quadros = 0;
    const passo = () => {
      alinhar();
      if (++quadros < 20) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
    window.setTimeout(alinhar, 300);
    window.setTimeout(alinhar, 800);
  }, []);

  // o salto a um artigo que o filtro do texto esconde avisa e oferece mostrar o texto todo (preenchido mais abaixo,
  // onde a lista de artigos já existe)
  const avisarForaDoFiltro = useRef<(alvo: HTMLElement) => boolean>(() => false);
  // Âncora do endereço ou volta para onde o leitor parou; "avisar" nos saltos pedidos pelo usuário
  const irParaArtigo = useCallback((art: string, avisar = false) => {
    const alvo = document.getElementById(art);
    if (!alvo) return false;
    // escondido, não há para onde rolar: fica o aviso
    if (avisar && avisarForaDoFiltro.current(alvo)) return true;
    alinharAoArtigo(alvo);
    alvo.classList.add(styles.destaque);
    setTimeout(() => alvo.classList.remove(styles.destaque), 1600);
    return true;
  }, [alinharAoArtigo]);

  // Com posição salva ou âncora, o texto fica escondido até o salto: o começo da lei não aparece antes.
  useLayoutEffect(() => {
    const h = decodeURIComponent(location.hash.slice(1));
    const salvo = lerJSON<Posicoes>(K_POSICOES, {})[lei];
    if (((h && !h.startsWith("c=")) || salvo) && folha.current) folha.current.style.visibility = "hidden";
  }, [lei]);

  // ---------- texto: o começo veio pronto do servidor; o resto chega aos poucos ----------
  // A abertura é imediata: baixa só a parte da lei que vai aparecer (a do artigo salvo ou da âncora) e desenha em volta
  // dele. O resto da lei (as outras partes, quando a lei é dividida) chega em segundo plano: o que fica abaixo é
  // acrescentado no fim, e o que fica acima entra antes, com a tela segurada no mesmo ponto.
  useEffect(() => {
    let vivo = true;
    (async () => {
      const el = folha.current!;
      // o começo veio pronto do servidor; o que uma execução anterior deste efeito desenhou (desenvolvimento) sai
      el.dataset.servidor ??= String(blocosDe(el).length);
      const doServidor = Number(el.dataset.servidor);
      for (const b of blocosDe(el).slice(doServidor)) b.remove();
      el.querySelector("[data-reserva]")?.remove();
      el.dataset.forma = "grifo";

      // o texto chega na forma do Grifo, a mesma do começo que veio do servidor; a "Redação original" troca depois, no lugar
      const m = await carregarManifesto(lei);
      if (!vivo) return;
      const dividida = !!m.partes?.length;
      const partes: ParteLei[] = dividida ? m.partes! : [{ de: 0, ate: m.blocos.length, rotulo: "", arquivo: "" }];
      const lista: Bloco[] = new Array(total);
      blocos.current = lista;
      const pedidos: Promise<void>[] = [];
      const pedir = (k: number) =>
        (pedidos[k] ??= (dividida ? carregarParte(partes[k]!) : Promise.resolve(corrigirBlocos(m.blocos))).then((bs) => {
          bs.forEach((b, j) => {
            lista[partes[k]!.de + j] = b;
          });
        }));
      const parteDe = (i: number) => Math.max(0, partes.findIndex((p) => i >= p.de && i < p.ate));
      const esperar = async (ini: number, fim: number) => {
        for (let k = parteDe(ini); k <= parteDe(Math.max(ini, fim - 1)); k++) await pedir(k);
      };

      const h = decodeURIComponent(location.hash.slice(1));
      const porAncora = !!h && !h.startsWith("c=");
      const salvo = lerJSON<Posicoes>(K_POSICOES, {})[lei];
      const primeiroArtigo = dividida ? partes[0]?.artigos?.find((x) => x.startsWith("art")) : m.blocos.find((b) => b.tipo === "artigo" && b.disp)?.disp;
      let destino = porAncora ? h : salvo && salvo.art !== primeiroArtigo ? salvo.art : null;
      const artDoDestino = destino?.split(".")[0];
      const parteDoDestino = artDoDestino && dividida ? partes.findIndex((p) => p.artigos?.includes(artDoDestino)) : -1;
      // primeiro, a parte que vai aparecer; as outras vêm em seguida, em segundo plano
      await Promise.all([
        pedir(parteDoDestino >= 0 ? parteDoDestino : parteDe(doServidor)),
        carregarCitacoes()
          .then((cit) => {
            citadosRef.current = new Set(Object.keys(cit?.citacoes ?? {}));
          })
          .catch(() => {}),
      ]);
      if (!vivo) return;
      let chegou = !dividida;
      const todas = Promise.all(partes.map((_, k) => pedir(k))).then(() => {
        chegou = true;
      });
      const artigosDaLei = carregarArtigos(lei).then((a) => {
        if (vivo) setArtigos(a.artigos);
        return a.artigos;
      });
      Promise.all([todas, artigosDaLei])
        .then(([, a]) => vivo && setMapa(secoesDosArtigos(lista, a)))
        .catch(() => {});
      setEstrelas(lerJSON<string[]>(K_IMPORTANTES, []));

      // enquanto faltam partes, os links para artigos delas ainda não se resolvem: esses blocos são refeitos no lugar
      // quando a lei chega inteira
      let ctx = contextoDaLei(lista, lei);
      let completo = chegou;
      const parciais: number[] = [];
      const desenhar = (ini: number, fim: number) => {
        if (!completo) for (let k = ini; k < fim; k++) parciais.push(k);
        return htmlComContexto(ctx, lista, ini, fim, lei, url, CLASSES, citadosRef.current);
      };
      const completar = () => {
        if (completo || !chegou) return;
        completo = true;
        ctx = contextoDaLei(lista, lei);
        trocarNoLugar(el, parciais, (i) => htmlComContexto(ctx, lista, i, i + 1, lei, url, CLASSES, citadosRef.current));
      };

      // um dispositivo que a lei não tem ("#art5.i99", vindo do "100 cp" de outra lei) leva ao artigo
      if (destino && !ctx.ancoras.has(destino) && ctx.ancoras.has(destino.split(".")[0]!)) destino = destino.split(".")[0]!;
      const alvo = destino ? ctx.ancoras.get(destino) : undefined;
      let posicionado = false;
      const posicionar = () => {
        posicionado = true;
        el.style.visibility = "";
        saltoFixo();
        if (!destino || !irParaArtigo(destino)) return;
        if (!porAncora && salvo) setAviso({ texto: `Você parou no ${salvo.rotulo}.`, acao: { rotulo: "Ir para o início", fazer: () => window.scrollTo({ top: 0, behavior: "instant" }) } });
      };
      if (!destino) el.style.visibility = "";
      if (alvo !== undefined && alvo >= doServidor) {
        // desenha primeiro em volta do alvo (na parte já baixada); uma reserva vazia marca onde entra o texto de cima
        const p = partes[parteDe(alvo)]!;
        const r0 = Math.max(doServidor, p.de, alvo - 20);
        const r1 = Math.min(p.ate, alvo + LOTE);
        const reserva = document.createElement("div");
        reserva.dataset.reserva = "1";
        el.append(reserva);
        el.insertAdjacentHTML("beforeend", desenhar(r0, r1));
        posicionar();
        let acima = doServidor;
        let abaixo = r1;
        while (vivo && (acima < r0 || abaixo < total)) {
          if (acima < r0) {
            const fim = Math.min(r0, acima + LOTE);
            await esperar(acima, fim);
            if (!vivo) return;
            // o texto entra acima do que está na tela: a tela é segurada pelo primeiro bloco visível
            const ancora = blocosDe(el).find((b) => b.getBoundingClientRect().bottom > 0);
            const antes = ancora?.getBoundingClientRect().top ?? 0;
            reserva.insertAdjacentHTML("beforebegin", desenhar(acima, fim));
            if (ancora) window.scrollBy({ top: ancora.getBoundingClientRect().top - antes, behavior: "instant" });
            acima = fim;
          }
          if (abaixo < total) {
            const fim = Math.min(total, abaixo + LOTE);
            await esperar(abaixo, fim);
            if (!vivo) return;
            el.insertAdjacentHTML("beforeend", desenhar(abaixo, fim));
            abaixo = fim;
          }
          completar();
          await proximoQuadro();
        }
        reserva.remove();
      } else {
        if (alvo !== undefined) posicionar();
        let i = doServidor;
        while (vivo && i < total) {
          const fim = Math.min(total, i + LOTE);
          await esperar(i, fim);
          if (!vivo) return;
          el.insertAdjacentHTML("beforeend", desenhar(i, fim));
          i = fim;
          completar();
          await proximoQuadro();
        }
      }
      if (!posicionado && destino) posicionar();
      await todas;
      if (!vivo) return;
      completar();
      contextoRef.current = ctx;
      setPronto(true);
    })().catch(() => {
      if (folha.current) folha.current.style.visibility = "";
      if (vivo) setAviso({ texto: "Não foi possível carregar o restante do texto. Verifique a conexão e recarregue." });
    });
    return () => {
      vivo = false;
    };
  }, [lei, url, total, irParaArtigo]);

  // "Redação original" ligada ou desligada: o texto troca dentro de cada bloco já desenhado, sem apagar nada. Os blocos
  // continuam os mesmos elementos (com a altura que o navegador já conhece), então a leitura fica no mesmo ponto,
  // como ao mostrar o texto revogado. A troca é de um caractere por um: a altura do texto não muda.
  useEffect(() => {
    const el = folha.current;
    if (!el || !pronto) return;
    const forma = original ? "original" : "grifo";
    if ((el.dataset.forma ?? "grifo") === forma) return;
    let vivo = true;
    (async () => {
      const [l, a] = await Promise.all([carregarLei(lei, original), carregarArtigos(lei, original)]);
      const superadas = versoesPedidas.current ? await carregarVersoes(lei, original) : null;
      if (!vivo) return;
      // cópia: a lista recebe as redações superadas, e a da redação original é a mesma guardada no cache
      const lista = [...l.blocos];
      if (superadas) for (const [k, b] of Object.entries(superadas)) lista[Number(k)] = b;
      blocos.current = lista;
      if (superadas) versoesPedidas.current = Promise.resolve();
      setArtigos(a.artigos);
      setMapa(secoesDosArtigos(lista, a.artigos));
      const naTela = blocosDe(el).find((b) => b.getBoundingClientRect().bottom > 0);
      const desvio = naTela?.getBoundingClientRect().top ?? 0;
      const ctx = contextoDaLei(lista, lei);
      contextoRef.current = ctx;
      trocarNoLugar(
        el,
        blocosDe(el).map((b) => Number(b.dataset.i)),
        (i) => htmlComContexto(ctx, lista, i, i + 1, lei, url, CLASSES, citadosRef.current),
      );
      el.dataset.forma = forma;
      // marcas, grifos prontos, links, estrelas e erros são pintados de novo sobre o texto trocado
      setVersaoTextos((v) => v + 1);
      if (!naTela) return;
      const manter = () => {
        const dif = naTela.getBoundingClientRect().top - desvio;
        if (Math.abs(dif) > 1) window.scrollBy({ top: dif, behavior: "instant" });
      };
      manter();
      let quadros = 0;
      const passo = () => {
        manter();
        if (++quadros < 20) requestAnimationFrame(passo);
      };
      requestAnimationFrame(passo);
      window.setTimeout(manter, 300);
      window.setTimeout(manter, 800);
    })().catch(() => {
      if (vivo) setAviso({ texto: "Não foi possível trocar a redação do texto. Tente de novo." });
    });
    return () => {
      vivo = false;
    };
  }, [original, pronto, lei, url]);

  // Texto superado sai do arquivo principal: carrega na primeira vez e troca os dispositivos já desenhados.
  const garantirVersoes = useCallback(() => {
    if (!versoesPedidas.current)
      versoesPedidas.current = carregarVersoes(lei, original)
        .then((superadas) => {
          const lista = blocos.current;
          const el = folha.current;
          if (!lista || !el) return;
          for (const [k, b] of Object.entries(superadas)) lista[Number(k)] = b;
          const ctx = contextoDaLei(lista, lei);
          contextoRef.current = ctx;
          for (const antigo of blocosDe(el)) {
            const i = Number(antigo.dataset.i);
            if (superadas[i]) antigo.outerHTML = htmlComContexto(ctx, lista, i, i + 1, lei, url, CLASSES, citadosRef.current);
          }
          setVersaoTextos((v) => v + 1);
        })
        .catch(() => {
          versoesPedidas.current = null;
          setAviso({ texto: "Não foi possível carregar o texto revogado. Tente de novo." });
        });
    return versoesPedidas.current;
  }, [lei, url, original]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 6000);
    return () => clearTimeout(t);
  }, [aviso]);

  // Botão direito num link de artigo abre o outro destino: o Planalto (ou o Grifo, quando o Planalto é o padrão)
  useEffect(() => {
    const el = folha.current;
    if (!el) return;
    const aoAbrirMenu = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest<HTMLAnchorElement>("a[data-planalto]");
      if (!a) return;
      const noPlanalto = prefs.destino === "planalto" || !a.dataset.grifo;
      const outro = noPlanalto ? a.dataset.grifo : a.dataset.planalto;
      if (!outro) return;
      e.preventDefault();
      window.open(new URL(outro, location.href).href, "_blank", "noopener");
    };
    el.addEventListener("contextmenu", aoAbrirMenu);
    return () => el.removeEventListener("contextmenu", aoAbrirMenu);
  }, [prefs.destino]);

  // Links: Grifo ou Planalto
  useEffect(() => {
    if (!pronto) return;
    folha.current?.querySelectorAll<HTMLAnchorElement>("a[data-planalto]").forEach((a) => {
      const planalto = prefs.destino === "planalto" || !a.dataset.grifo;
      a.href = (planalto ? a.dataset.planalto : a.dataset.grifo) ?? a.href;
      if (planalto) a.target = "_blank";
      else a.removeAttribute("target");
    });
  }, [prefs.destino, pronto, versaoTextos]);

  // Artigos importantes (estrela)
  useEffect(() => {
    const el = folha.current;
    if (!el || !pronto) return;
    const importantes = new Set(lerJSON<string[]>(K_IMPORTANTES, []));
    const pintar = () =>
      el.querySelectorAll<HTMLButtonElement>("button[data-estrela]").forEach((b) => {
        const on = importantes.has(`${lei}:${b.dataset.estrela}`);
        b.setAttribute("aria-pressed", String(on));
        b.textContent = on ? "★" : "☆";
      });
    pintar();
    const clique = (e: MouseEvent) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-estrela]");
      if (!b) return;
      const k = `${lei}:${b.dataset.estrela}`;
      if (importantes.has(k)) importantes.delete(k);
      else importantes.add(k);
      gravarJSON(K_IMPORTANTES, [...importantes]);
      setEstrelas([...importantes]);
      pintar();
    };
    el.addEventListener("click", clique);
    return () => el.removeEventListener("click", clique);
  }, [lei, pronto, versaoTextos]);

  // Grifos prontos do sistema de cores ativo: as palavras-chave de cada entrada dentro do texto do dispositivo (marca-texto;
  // nos Pedidos, sublinhado) e o "vide" para o mesmo tema em outro dispositivo (ver src/lib/leis/grifos.ts)
  useEffect(() => {
    const el = folha.current;
    if (!el || !pronto) return;
    desmarcarProntos(el);
    if (!prefs.prontos) return;
    pintarProntos(
      blocosDe(el),
      txtDe,
      prontosNoSistema(PRONTOS, sistema, lei),
      (g) => corDoGrifo(sistema, g),
      (g) => rotuloDoGrifo(sistema, g),
      lei,
      { marca: styles.pronto, vide: styles.prontoVide },
      (b) => blocos.current?.[Number(b.dataset.i)]?.tipo,
    );
  }, [pronto, prefs.prontos, sistema, lei, versaoTextos]);

  // Marcações do usuário
  // o nome da cor vem primeiro do sistema da lei (a mesma cor pode ter outro significado em outro sistema)
  const rotuloDaCor = useCallback(
    (cor: string) => (cor === "nota" ? "Anotação" : ([sistema, ...todosSistemas(legendas)].flatMap((s) => s.cores).find((c) => c.cor === cor)?.rotulo ?? "")),
    [legendas, sistema],
  );
  // A altura da faixa de um grifo de trecho é a da fonte (não a da linha); com a folga certa em cima e embaixo, as
  // linhas de um grifo que passa de uma linha encostam umas nas outras e formam uma forma só. A altura da fonte, em
  // "em", é medida num grifo de teste, para cada fonte.
  useEffect(() => {
    const el = folha.current;
    const raiz = raizRef.current;
    if (!el || !raiz || !pronto) return;
    const teste = document.createElement("mark");
    teste.className = styles.marca;
    teste.style.padding = "0";
    teste.textContent = "Ág";
    el.append(teste);
    const tamanho = parseFloat(getComputedStyle(teste).fontSize);
    const altura = teste.getBoundingClientRect().height;
    teste.remove();
    if (tamanho > 0 && altura > 0) raiz.style.setProperty("--grifo-altura", (altura / tamanho).toFixed(3));
  }, [pronto, prefs.fonte]);
  const exibidas = useMemo<Marcacao[]>(
    () => (vendoRecebido && recebido ? recebido.m.map((m, k) => ({ ...m, id: `r${k}`, em: 0 })) : marcas),
    [vendoRecebido, recebido, marcas],
  );
  useEffect(() => {
    const el = folha.current;
    if (!el || !pronto) return;
    desmarcar(el);
    const bs = blocosDe(el);
    const textos = bs.map((b) => txtDe(b)?.textContent ?? "");
    const disps = bs.map((b) => b.dataset.disp);
    let faltaram = 0;
    for (const m of exibidas) {
      const onde = localizar(m, textos, disps);
      const txt = onde ? txtDe(bs[onde.i]) : null;
      if (!onde || !txt) faltaram++;
      else if (m.inteiro) pintarBloco(bs[onde.i]!, m);
      else envolver(txt, onde.ini, onde.fim, m, rotuloDaCor(m.cor), m.id === novaMarca.current);
    }
    ligarBlocos(bs);
    novaMarca.current = null;
    setPerdidas(faltaram);
  }, [exibidas, rotuloDaCor, pronto, versaoTextos]);
  useEffect(() => {
    if (pronto && (prefs.revogados || exibidas.some((m) => blocos.current?.[m.i]?.superada))) void garantirVersoes();
  }, [pronto, prefs.revogados, exibidas, garantirVersoes]);
  const salvarMarcas = (ms: Marcacao[]) => {
    setMarcas(ms);
    gravarMarcacoes(lei, ms);
  };
  useEffect(() => {
    marcasAtuais.current = marcas;
  }, [marcas]);

  // desfaz a última apagada: os grifos voltam (sem repetir os que já existem)
  const desfazerUltimo = useCallback(() => {
    const ultima = pilhaApagadas.current[pilhaApagadas.current.length - 1];
    if (!ultima) return setAviso({ texto: "Nada para desfazer." });
    pilhaApagadas.current = pilhaApagadas.current.slice(0, -1);
    setDesfaziveis(pilhaApagadas.current.length);
    const ids = new Set(marcasAtuais.current.map((m) => m.id));
    const n = [...marcasAtuais.current, ...ultima.marcas.filter((m) => !ids.has(m.id))];
    marcasAtuais.current = n;
    setMarcas(n);
    gravarMarcacoes(lei, n);
    setAviso({ texto: "Grifos restaurados." });
  }, [lei]);
  // apaga os grifos que `sai` escolher; a apagada vai para a pilha de desfazer e o aviso oferece "Desfazer"
  const apagarGrifos = useCallback(
    (sai: (m: Marcacao) => boolean) => {
      const atuais = marcasAtuais.current;
      const apagadas = atuais.filter((m) => sai(m));
      if (apagadas.length === 0) return;
      const restantes = atuais.filter((m) => !sai(m));
      pilhaApagadas.current = [...pilhaApagadas.current.slice(-(LIMITE_DESFAZER - 1)), { marcas: apagadas, em: Date.now() }];
      setDesfaziveis(pilhaApagadas.current.length);
      marcasAtuais.current = restantes;
      setMarcas(restantes);
      gravarMarcacoes(lei, restantes);
      const k = contarGrupos(apagadas);
      setAviso({ texto: k === 1 ? "Grifo apagado." : `${k} grifos apagados.`, acao: { rotulo: "Desfazer", fazer: desfazerUltimo } });
    },
    [lei, desfazerUltimo],
  );
  // Ctrl+Z desfaz a última apagada só nos primeiros 30 s; depois disso, use o botão Desfazer do menu
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey || e.key.toLowerCase() !== "z") return;
      if (e.target instanceof Element && e.target.closest("input, textarea, select, [contenteditable]")) return;
      const ultima = pilhaApagadas.current[pilhaApagadas.current.length - 1];
      if (!ultima || Date.now() - ultima.em > JANELA_CTRL_Z) return;
      e.preventDefault();
      desfazerUltimo();
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [desfazerUltimo]);
  // Apagar os grifos que um trecho selecionado toca. Vem de dois lugares, com o mesmo comportamento: a barra que
  // aparece sobre a seleção (lixeira) e o modo borracha do botão Grifar (a seleção apaga em vez de grifar).
  // Pede confirmação quando são muitos (mais de 5) ou quando o trecho cobre todos os grifos da lei (se ela tem mais de 3).
  const apagarTrechos = useCallback(
    (segmentos: Segmento[]) => {
      const el = folha.current;
      if (!el) return;
      const bs = blocosDe(el);
      const textos = bs.map((b) => txtDe(b)?.textContent ?? "");
      const disps = bs.map((b) => b.dataset.disp);
      const tocados = gruposTocados(marcasAtuais.current, textos, disps, segmentos);
      setSelecao(null);
      getSelection()?.removeAllRanges();
      if (tocados.size === 0) return setAviso({ texto: "Não há grifos nesta seleção." });
      const sai = (m: Marcacao) => tocados.has(grupoDe(m));
      const total = contarGrupos(marcasAtuais.current);
      const desfazer = "Você pode desfazer nas três últimas apagadas: pelo botão Desfazer do menu, ou com Ctrl+Z nos primeiros 30 segundos.";
      const pedido = pedeConfirmacao(tocados.size, total);
      if (pedido === "todos")
        return setConfirmacao({
          titulo: "Apagar todos os grifos desta lei?",
          texto: `Esta seleção cobre todos os ${total} grifos de ${nome}. Se confirmar, todos os grifos e anotações desta lei serão apagados. ${desfazer}`,
          rotulo: `Apagar os ${total} grifos da lei`,
          fazer: () => apagarGrifos(sai),
        });
      if (pedido === "muitos")
        return setConfirmacao({
          titulo: `Apagar ${tocados.size} grifos de uma vez?`,
          texto: `Esta seleção tem ${tocados.size} grifos. Se confirmar, todos serão apagados. ${desfazer}`,
          rotulo: `Apagar ${tocados.size} grifos`,
          fazer: () => apagarGrifos(sai),
        });
      apagarGrifos(sai);
    },
    [nome, apagarGrifos],
  );
  const criarMarca = useCallback(
    (segmentos: Segmento[], cor: string) => {
      if (!folha.current) return null;
      const criadas = montarMarcas(folha.current, segmentos, cor);
      if (criadas.length === 0) return null;
      novaMarca.current = criadas[0]!.id;
      setMarcas((ms) => {
        const n = [...ms, ...criadas];
        gravarMarcacoes(lei, n);
        return n;
      });
      getSelection()?.removeAllRanges();
      return criadas[0]!;
    },
    [lei],
  );

  // Editar o tamanho do grifo: a seleção vai para o trecho grifado; ao arrastá-la, o novo trecho fica guardado
  // até "Concluir", que troca a marcação (mesma cor e anotação); "Cancelar" deixa o grifo como estava.
  const iniciarEdicao = (m: Marcacao) => {
    const el = folha.current;
    if (!el) return;
    const bs = blocosDe(el);
    const textos = bs.map((b) => txtDe(b)?.textContent ?? "");
    const disps = bs.map((b) => b.dataset.disp);
    const grupo = m.grupo ?? m.id;
    const partes = marcas
      .filter((x) => (x.grupo ?? x.id) === grupo)
      .map((x) => localizar(x, textos, disps))
      .filter((x): x is { i: number; ini: number; fim: number } => x !== null)
      .sort((a, b) => a.i - b.i || a.ini - b.ini);
    const primeira = partes[0];
    const ultima = partes[partes.length - 1];
    const inicio = primeira && noTexto(txtDe(bs[primeira.i]!)!, primeira.ini);
    const fim = ultima && noTexto(txtDe(bs[ultima.i]!)!, ultima.fim);
    if (!inicio || !fim) return;
    const r = document.createRange();
    r.setStart(inicio.no, inicio.off);
    r.setEnd(fim.no, fim.off);
    getSelection()?.removeAllRanges();
    getSelection()?.addRange(r);
    setAberta(null);
    setSelecao(null);
    setAjuste({ id: m.id, segmentos: null });
  };
  const redimensionarMarca = (id: string, segmentos: Segmento[]) => {
    const el = folha.current;
    const antiga = marcas.find((m) => m.id === id);
    if (!el || !antiga) return;
    const criadas = montarMarcas(el, segmentos, antiga.cor).map((m) => (antiga.nota ? { ...m, nota: antiga.nota } : m));
    if (criadas.length === 0) return;
    novaMarca.current = criadas[0]!.id;
    salvarMarcas([...apagarMarca(marcas, id), ...criadas]);
  };
  const concluirAjuste = () => {
    if (ajuste?.segmentos) redimensionarMarca(ajuste.id, ajuste.segmentos);
    getSelection()?.removeAllRanges();
    setAjuste(null);
  };
  const cancelarAjuste = () => {
    getSelection()?.removeAllRanges();
    setAjuste(null);
  };
  useEffect(() => {
    ajusteRef.current = ajuste?.id ?? null;
  }, [ajuste]);

  // Seleção: no modo marca-texto grifa na hora; fora dele, mostra as cores
  const marcadorRef = useRef({ ativo: false, cor: "" });
  useEffect(() => {
    marcadorRef.current = { ativo: marcador.ativo, cor: corMarcador ?? "" };
  }, [marcador.ativo, corMarcador]);
  useEffect(() => {
    const el = folha.current;
    if (!el) return;
    const soltar = () => {
      const sel = getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) return setSelecao(null);
      const r = sel.getRangeAt(0);
      const txtIni = r.startContainer.parentElement?.closest<HTMLElement>(`.${CLASSES.txt}`);
      const txtFim = r.endContainer.parentElement?.closest<HTMLElement>(`.${CLASSES.txt}`);
      if (!txtIni || !txtFim || !el.contains(txtIni) || !el.contains(txtFim)) return setSelecao(null);
      const blocos = blocosDe(el);
      const kIni = blocos.indexOf(txtIni.closest<HTMLElement>("[data-i]")!);
      const kFim = blocos.indexOf(txtFim.closest<HTMLElement>("[data-i]")!);
      if (kIni < 0 || kFim < kIni) return setSelecao(null);
      const segmentos: Segmento[] = [];
      for (let k = kIni; k <= kFim; k++) {
        const bloco = blocos[k]!;
        const txt = txtDe(bloco);
        if (!txt) continue;
        const total = txt.textContent?.length ?? 0;
        let ini = 0;
        let fim = total;
        if (k === kIni) {
          const antes = document.createRange();
          antes.setStart(txt, 0);
          antes.setEnd(r.startContainer, r.startOffset);
          ini = antes.toString().length;
        }
        if (k === kFim) {
          const ate = document.createRange();
          ate.setStart(txt, 0);
          ate.setEnd(r.endContainer, r.endOffset);
          fim = ate.toString().length;
        }
        if (fim - ini < 1) continue;
        segmentos.push({ i: Number(bloco.dataset.i), ini, fim, inteiro: ini === 0 && fim === total });
      }
      if (segmentos.reduce((n, sg) => n + (sg.fim - sg.ini), 0) < 2) return setSelecao(null);
      // editando o tamanho de um grifo: o trecho novo fica guardado até "Concluir"
      if (ajusteRef.current) {
        const id = ajusteRef.current;
        setAjuste((a) => (a && a.id === id ? { ...a, segmentos } : a));
        return setSelecao(null);
      }
      const { ativo, cor } = marcadorRef.current;
      if (ativo && cor && cor !== "borracha") {
        criarMarca(segmentos, cor);
        return setSelecao(null);
      }
      // borracha ativa (botão Grifar): a seleção apaga os grifos que toca, como a lixeira da barra de seleção
      if (ativo && cor === "borracha") return apagarTrechos(segmentos);
      const ret = r.getBoundingClientRect();
      const base = el.offsetParent?.getBoundingClientRect();
      const toque = matchMedia("(pointer: coarse)").matches;
      // a barra vai acima da seleção (no toque, abaixo, se em cima não couber o menu do sistema); numa seleção maior
      // que a tela, o começo ou o fim ficam fora dela: a barra fica na borda visível mais perto (embaixo, onde a
      // seleção terminou, quando o começo sumiu lá em cima)
      const ALTURA = toque ? 108 : 58;
      const vis = faixaVisivel();
      const acima = !toque || ret.top > 170;
      let topo = acima ? ret.top - ALTURA : ret.bottom + 64;
      if (topo < vis.topo) topo = ret.bottom + 12 <= vis.fundo - 50 ? ret.bottom + 12 : vis.fundo - 50;
      topo = Math.max(vis.topo, Math.min(topo, vis.fundo - 50));
      setSelecao({
        x: ret.left + ret.width / 2 - (base?.left ?? 0),
        y: ret.top - (base?.top ?? 0),
        fundo: ret.bottom - (base?.top ?? 0),
        topo: topo - (base?.top ?? 0),
        toque,
        segmentos,
      });
    };
    // A seleção por toque muda enquanto as alças são arrastadas (e o toque nem sempre dispara mouseup/touchend
    // no fim): por isso ela é lida quando para de mudar, e não em um evento de soltar.
    let tocando = false;
    let adiar: ReturnType<typeof setTimeout> | undefined;
    const agendar = (ms: number) => {
      clearTimeout(adiar);
      adiar = setTimeout(() => {
        if (!tocando) soltar();
      }, ms);
    };
    const aoMudar = () => agendar(tocando ? 500 : 200);
    const inicioToque = () => {
      tocando = true;
    };
    const fimToque = () => {
      tocando = false;
      agendar(350);
    };
    const soltarMouse = () => agendar(0);
    document.addEventListener("selectionchange", aoMudar);
    el.addEventListener("touchstart", inicioToque, { passive: true });
    el.addEventListener("touchend", fimToque);
    el.addEventListener("touchcancel", fimToque);
    el.addEventListener("mouseup", soltarMouse);
    return () => {
      clearTimeout(adiar);
      document.removeEventListener("selectionchange", aoMudar);
      el.removeEventListener("touchstart", inicioToque);
      el.removeEventListener("touchend", fimToque);
      el.removeEventListener("touchcancel", fimToque);
      el.removeEventListener("mouseup", soltarMouse);
    };
  }, [criarMarca, apagarTrechos]);

  // Salto para um artigo da mesma lei (links do texto e do "citado por"): barras à mostra, alinhamento
  // e destaque do artigo de destino por um instante
  const irParaLink = useCallback((id: string) => {
    const alvo = document.getElementById(id);
    if (!alvo) return;
    setOculto(false);
    barraFixa.current = Date.now() + 2000;
    if (avisarForaDoFiltro.current(alvo)) return;
    alinharAoArtigo(alvo);
    // o artigo de destino fica destacado por um instante, para ficar claro para onde o leitor foi levado
    alvo.classList.add(styles.destaque);
    window.setTimeout(() => alvo.classList.remove(styles.destaque), 1600);
  }, [alinharAoArtigo]);

  // Atalho "Ir para o artigo": um número (ou "/") digitado em qualquer ponto da leitura abre a caixa, já com ele.
  // Enquanto o número é digitado a leitura vai até o artigo; o Esc devolve a leitura ao ponto em que estava.
  const pontoAntesDoAtalho = useRef<{ el: HTMLElement; top: number } | null>(null);
  useEffect(() => {
    if (painel || atalho !== null) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented || e.isComposing) return;
      if (!/^[0-9]$/.test(e.key) && e.key !== "/") return;
      if (e.target instanceof Element && e.target.closest("input, textarea, select, [contenteditable], [role='dialog']")) return;
      const el = folha.current;
      if (!el) return;
      e.preventDefault();
      medirTopo();
      const topo = parseFloat(document.documentElement.style.getPropertyValue("--topo-livre")) || 0;
      const b = blocosDe(el).find((x) => x.getBoundingClientRect().bottom > topo);
      pontoAntesDoAtalho.current = b ? { el: b, top: b.getBoundingClientRect().top } : null;
      setAtalho(e.key === "/" ? "" : e.key);
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [painel, atalho]);
  // Shift + rolagem: a leitura salta de divisão em divisão (Título, Capítulo, Seção…), para cima ou para baixo; na lei
  // sem divisões (e nas súmulas), de artigo em artigo. Divisões seguidas ("TÍTULO I" e logo "CAPÍTULO I") são uma
  // parada só. Com Shift o navegador manda a rolagem na horizontal, então vale o eixo que mexeu mais.
  useEffect(() => {
    const el = folha.current;
    if (!el || !pronto) return;
    let ultimoSalto = 0;
    let acumulado = 0;
    let salto = 0;
    const visivel = (b: HTMLElement) => b.getClientRects().length > 0 && !b.closest("[hidden]");
    const paradas = () => {
      const bs = blocosDe(el).filter(visivel);
      const divisoes = bs.filter((b, k) => b.tagName === "H3" && ehDivisao(b.textContent ?? "") && bs[k - 1]?.tagName !== "H3");
      return divisoes.length ? divisoes : bs.filter((b) => b.id && !b.id.includes("."));
    };
    // como alinharAoArtigo, com correção por alguns quadros (as alturas estimadas se acertam), mas um salto novo
    // cancela as correções do anterior
    const alinhar = (alvo: HTMLElement) => {
      const meu = ++salto;
      const acertar = () => {
        if (meu !== salto) return false;
        medirTopo();
        const dif = alvo.getBoundingClientRect().top - (parseFloat(document.documentElement.style.getPropertyValue("--topo-livre")) || 0);
        if (Math.abs(dif) > 1) window.scrollTo({ top: window.scrollY + dif, behavior: "instant" });
        return true;
      };
      alvo.scrollIntoView({ block: "start", behavior: "instant" });
      acertar();
      let quadros = 0;
      const passo = () => {
        if (acertar() && ++quadros < 20) requestAnimationFrame(passo);
      };
      requestAnimationFrame(passo);
      window.setTimeout(acertar, 300);
    };
    const roda = (e: WheelEvent) => {
      if (!e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target instanceof Element && e.target.closest('[role="dialog"], input, textarea, select')) return;
      const d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (!d) return;
      e.preventDefault();
      // o touchpad manda muitos eventos pequenos: um salto por gesto (e no máximo um a cada 350 ms)
      if (Math.sign(d) !== Math.sign(acumulado)) acumulado = 0;
      acumulado += e.deltaMode ? d * 40 : d;
      const agora = performance.now();
      if (Math.abs(acumulado) < 30 || agora - ultimoSalto < 350) return;
      ultimoSalto = agora;
      const desce = acumulado > 0;
      acumulado = 0;
      medirTopo();
      const topo = (parseFloat(document.documentElement.style.getPropertyValue("--topo-livre")) || 0) + 4;
      const ps = paradas();
      const alvo = desce ? ps.find((b) => b.getBoundingClientRect().top > topo) : ps.findLast((b) => b.getBoundingClientRect().top < topo - 8);
      if (!alvo) return;
      saltoFixo();
      alinhar(alvo);
    };
    window.addEventListener("wheel", roda, { passive: false });
    return () => {
      salto++;
      window.removeEventListener("wheel", roda);
    };
  }, [pronto, lei]);
  // vai a um artigo ou dispositivo ("art5.i11"); se o dispositivo não tem âncora, vai ao artigo
  const irAoDestino = useCallback(
    (destino: string, final: boolean) => {
      const id = document.getElementById(destino) ? destino : destino.split(".")[0]!;
      if (final) irParaLink(id);
      else irParaArtigo(id);
    },
    [irParaArtigo, irParaLink],
  );
  const fecharAtalho = useCallback((voltar: boolean) => {
    setAtalho(null);
    const p = pontoAntesDoAtalho.current;
    pontoAntesDoAtalho.current = null;
    if (!voltar || !p?.el.isConnected) return;
    // o bloco que estava no alto volta à mesma altura (corrigido por alguns quadros, enquanto as alturas se acertam)
    const alinhar = () => {
      const dif = p.el.getBoundingClientRect().top - p.top;
      if (Math.abs(dif) > 1) window.scrollBy({ top: dif, behavior: "instant" });
    };
    alinhar();
    let quadros = 0;
    const passo = () => {
      alinhar();
      if (++quadros < 12) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  }, []);
  // Link para outro artigo da mesma lei: o salto é feito aqui, com as barras à mostra, e é corrigido depois que o
  // layout estabiliza (os blocos acima do alvo ganham altura real ao entrar na tela e empurram o alvo para baixo).
  useEffect(() => {
    const el = folha.current;
    if (!el) return;
    const aoLink = (e: MouseEvent) => {
      const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
      if (!a || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const id = decodeURIComponent(a.getAttribute("href")!.slice(1));
      if (!document.getElementById(id)) return;
      e.preventDefault();
      history.pushState(null, "", `#${id}`);
      irParaLink(id);
    };
    el.addEventListener("click", aoLink, true);
    return () => el.removeEventListener("click", aoLink, true);
  }, [lei, irParaLink]);

  // "Citado por": passando o mouse (ou tocando) no rótulo de um artigo, mostra quem cita esse artigo
  const [citado, setCitado] = useState<{ lei: string; art: string; rotulo: string; x: number; y: number; t: number } | null>(null);
  const [citacoes, setCitacoes] = useState<CitacoesGerais | null>(null);
  const timerCitado = useRef<number | undefined>(undefined);
  const cartaoRef = useRef<HTMLDivElement>(null);
  const rotuloRef = useRef<HTMLElement | null>(null);
  // artigos citados por artigos do leitor: só esses têm o rótulo destacado e abrem o "citado por"
  const citadosRef = useRef<ReadonlySet<string>>(new Set());
  useEffect(() => {
    const el = folha.current;
    if (!el) return;
    const rotuloDe = (e: Event) => (e.target as Element).closest<HTMLElement>("[data-rotulo-art]");
    const dadosDe = (r: HTMLElement) => {
      const b = r.getBoundingClientRect();
      return { lei: r.dataset.rotuloLei!, art: r.dataset.rotuloArt!, rotulo: r.textContent ?? "", x: b.left + b.width / 2, y: b.bottom, t: b.top };
    };
    const abrir = (r: HTMLElement) => {
      rotuloRef.current = r;
      setCitado(dadosDe(r));
    };
    const sobre = (e: PointerEvent) => {
      const r = rotuloDe(e);
      if (!r || e.pointerType !== "mouse") return;
      window.clearTimeout(timerCitado.current);
      timerCitado.current = window.setTimeout(() => abrir(r), 250);
    };
    const sai = (e: PointerEvent) => {
      if (!rotuloDe(e) || e.pointerType !== "mouse") return;
      window.clearTimeout(timerCitado.current);
      timerCitado.current = window.setTimeout(() => setCitado(null), 250);
    };
    // toque (ou clique): abre ou fecha o cartão do rótulo tocado
    const toque = (e: MouseEvent) => {
      const r = rotuloDe(e);
      if (!r || marcadorRef.current.ativo) return;
      window.clearTimeout(timerCitado.current);
      rotuloRef.current = r;
      setCitado((c) => (c?.art === r.dataset.rotuloArt ? null : dadosDe(r)));
    };
    el.addEventListener("pointerover", sobre);
    el.addEventListener("pointerout", sai);
    el.addEventListener("click", toque);
    return () => {
      el.removeEventListener("pointerover", sobre);
      el.removeEventListener("pointerout", sai);
      el.removeEventListener("click", toque);
      window.clearTimeout(timerCitado.current);
    };
  }, [lei]);
  // o cartão segue o rótulo (ao abrir, ao rolar e ao mudar a janela) e fica inteiro na tela: na horizontal e,
  // se não couber abaixo, acima. A posição é gravada direto no elemento, sem redesenhar o leitor.
  useLayoutEffect(() => {
    if (!citado) return;
    const posicionar = () => {
      const r = rotuloRef.current;
      const c = cartaoRef.current;
      if (!r || !c) return;
      const b = r.getBoundingClientRect();
      const meia = Math.min(150, window.innerWidth * 0.44);
      c.style.left = `${Math.min(Math.max(b.left + b.width / 2, meia + 8), window.innerWidth - meia - 8)}px`;
      // abre do lado que tem mais espaço e nunca passa da altura disponível (o cartão rola por dentro)
      const abaixo = window.innerHeight - b.bottom >= b.top;
      c.style.maxHeight = `${Math.max(120, (abaixo ? window.innerHeight - b.bottom : b.top) - 16)}px`;
      if (abaixo) {
        c.style.top = `${b.bottom + 8}px`;
        c.style.bottom = "auto";
      } else {
        c.style.bottom = `${window.innerHeight - b.top + 8}px`;
        c.style.top = "auto";
      }
    };
    posicionar();
    window.addEventListener("scroll", posicionar, { passive: true });
    window.addEventListener("resize", posicionar);
    return () => {
      window.removeEventListener("scroll", posicionar);
      window.removeEventListener("resize", posicionar);
    };
  }, [citado]);
  // com o "citado por" aberto, sair da prévia para fora dos dois fecha o cartão (a prévia se fecha sozinha)
  useEffect(() => {
    if (!citado) return;
    const sai = (e: PointerEvent) => {
      if (!(e.target as Element | null)?.closest?.(PREVIA)) return;
      if ((e.relatedTarget as Element | null)?.closest?.(`[data-citado-por], ${PREVIA}`)) return;
      window.clearTimeout(timerCitado.current);
      timerCitado.current = window.setTimeout(() => setCitado(null), 250);
    };
    document.addEventListener("pointerout", sai);
    return () => document.removeEventListener("pointerout", sai);
  }, [citado]);
  useEffect(() => {
    if (!citado) return;
    if (!citacoes) carregarCitacoes().then(setCitacoes, () => setCitacoes({ nomes: {}, citacoes: {} }));
    // fora do cartão e fora dos rótulos, toque ou clique fecha o cartão
    const fora = (e: Event) => {
      const alvo = e.target as Element;
      // a prévia do artigo citante também não fecha o cartão: os links dela abrem outros artigos nela mesma
      if (alvo.closest(`[data-citado-por], [data-rotulo-art], ${PREVIA}`)) return;
      setCitado(null);
    };
    document.addEventListener("pointerdown", fora);
    return () => document.removeEventListener("pointerdown", fora);
  }, [citado, citacoes]);

  // Seleção por toque: o toque longo cria a seleção e o navegador passa a arrastar a alça sozinho (sem eventos de
  // toque para a página). Por isso só o ponteiro e a mudança da seleção são observados aqui.
  useEffect(() => {
    let ultimoToque = 0;
    const aoTocar = (e: PointerEvent) => {
      if (e.pointerType === "touch") ultimoToque = performance.now();
    };
    const aoSelecionar = () => {
      const sel = getSelection();
      if (!sel || sel.isCollapsed) setSelecaoPorToque(false);
      else if (performance.now() - ultimoToque < 2500) setSelecaoPorToque(true);
    };
    window.addEventListener("pointerdown", aoTocar, { passive: true });
    document.addEventListener("selectionchange", aoSelecionar);
    return () => {
      window.removeEventListener("pointerdown", aoTocar);
      document.removeEventListener("selectionchange", aoSelecionar);
    };
  }, []);

  // Seleção no celular: arrastar uma alça de seleção até perto da área visível de leitura (abaixo do cabeçalho e
  // acima da barra de controles) rola a página sozinha, e a seleção acompanha o dedo. O leitor estende a seleção
  // (não o navegador) e prende o ponto dentro da área visível: com o dedo sobre a barra de controles, a seleção
  // continua indo até a borda visível, em vez de parar.
  useEffect(() => {
    const el = folha.current;
    if (!el) return;
    type Arrasto = { x: number; y: number; ancoraNo: Node; ancoraOff: number; topo: number; fundo: number };
    let arrasto: Arrasto | null = null;
    let vel = 0;
    let quadro = 0;
    const VELOCIDADE_MAXIMA = 9;
    const ponto = (x: number, y: number): { no: Node; off: number } | null => {
      const r = document.caretRangeFromPoint(x, y);
      if (r) return { no: r.startContainer, off: r.startOffset };
      const p = document.caretPositionFromPoint(x, y);
      return p ? { no: p.offsetNode, off: p.offset } : null;
    };
    const limites = () => {
      medirTopo();
      const topo = parseFloat(document.documentElement.style.getPropertyValue("--topo-livre"));
      const dock = document.querySelector<HTMLElement>('nav[aria-label="Controles de leitura"]');
      const fundo = Math.min(window.innerHeight, dock ? dock.getBoundingClientRect().top : window.innerHeight);
      return { topo, fundo };
    };
    // a seleção vai até o ponto sob o dedo, preso à área visível (acima ou abaixo dela não há texto a alcançar)
    const estender = () => {
      if (!arrasto) return;
      const y = Math.min(Math.max(arrasto.y, arrasto.topo + 6), arrasto.fundo - 6);
      const p = ponto(arrasto.x, y);
      const sel = getSelection();
      if (p && sel && el.contains(p.no)) sel.setBaseAndExtent(arrasto.ancoraNo, arrasto.ancoraOff, p.no, p.off);
    };
    const passo = () => {
      quadro = 0;
      if (!arrasto || vel === 0) return;
      window.scrollBy({ top: vel, behavior: "instant" });
      estender();
      quadro = requestAnimationFrame(passo);
    };
    const inicio = (e: TouchEvent) => {
      const sel = getSelection();
      const t = e.touches[0];
      if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !t) return;
      const r = sel.getRangeAt(0);
      const ini = document.createRange();
      ini.setStart(r.startContainer, r.startOffset);
      ini.collapse(true);
      const fim = document.createRange();
      fim.setEnd(r.endContainer, r.endOffset);
      fim.collapse(false);
      const a = ini.getBoundingClientRect();
      const b = fim.getBoundingClientRect();
      const dA = Math.hypot(t.clientX - a.left, t.clientY - a.bottom);
      const dB = Math.hypot(t.clientX - b.left, t.clientY - b.bottom);
      if (Math.min(dA, dB) > 56) return;
      // a alça arrastada é a mais próxima do dedo; a outra ponta da seleção fica fixa
      const { topo, fundo } = limites();
      arrasto =
        dB <= dA
          ? { x: t.clientX, y: t.clientY, ancoraNo: r.startContainer, ancoraOff: r.startOffset, topo, fundo }
          : { x: t.clientX, y: t.clientY, ancoraNo: r.endContainer, ancoraOff: r.endOffset, topo, fundo };
    };
    const mover = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!arrasto || !t) return;
      // com a alça sendo arrastada, o navegador não rola a página nem move a alça: quem faz isso é o leitor
      if (e.cancelable) e.preventDefault();
      arrasto.x = t.clientX;
      arrasto.y = t.clientY;
      const { topo, fundo } = limites();
      arrasto.topo = topo;
      arrasto.fundo = fundo;
      const zona = Math.max(110, (fundo - topo) * 0.28);
      // rampa suave: a velocidade cresce à medida que o dedo avança para a borda, e começa devagar
      const sentido = t.clientY < topo + zona ? -1 : t.clientY > fundo - zona ? 1 : 0;
      const f = sentido === 0 ? 0 : Math.min(1, (sentido < 0 ? topo + zona - t.clientY : t.clientY - (fundo - zona)) / zona);
      vel = sentido * VELOCIDADE_MAXIMA * f * f * (3 - 2 * f);
      estender();
      if (vel !== 0 && !quadro) quadro = requestAnimationFrame(passo);
    };
    const fim = () => {
      arrasto = null;
      vel = 0;
      cancelAnimationFrame(quadro);
      quadro = 0;
    };
    document.addEventListener("touchstart", inicio, { passive: true });
    document.addEventListener("touchmove", mover, { passive: false });
    document.addEventListener("touchend", fim);
    document.addEventListener("touchcancel", fim);
    return () => {
      document.removeEventListener("touchstart", inicio);
      document.removeEventListener("touchmove", mover);
      document.removeEventListener("touchend", fim);
      document.removeEventListener("touchcancel", fim);
      cancelAnimationFrame(quadro);
    };
  }, [lei]);

  // Toque no texto: abre o grifo, apaga (borracha) ou mostra/esconde os controles
  useEffect(() => {
    const el = folha.current;
    if (!el) return;
    const clique = (e: MouseEvent) => {
      const alvo = e.target as HTMLElement;
      if (getSelection()?.toString()) return;
      setRegra(null);
      const doPronto = alvo.closest<HTMLElement>("mark[data-pronto]");
      if (doPronto && !alvo.closest("mark[data-m]") && !marcadorRef.current.ativo) {
        const ret = doPronto.getBoundingClientRect();
        setRegra({ x: ret.left, y: ret.bottom, rotulo: doPronto.dataset.regra ?? "", nota: doPronto.dataset.regraNota, essencial: doPronto.dataset.essencial === "1" });
        return;
      }
      const mark = alvo.closest<HTMLElement>("mark[data-m]");
      // parágrafo inteiro grifado: não tem <mark>, o id fica no próprio bloco
      const paragrafo = alvo.closest<HTMLElement>("[data-marca-bloco]");
      const id = mark?.dataset.m ?? paragrafo?.dataset.marcaId;
      if (id) {
        // a borracha apaga a seleção inteira, com todas as partes que a compõem
        if (marcadorRef.current.ativo && marcadorRef.current.cor === "borracha") {
          const achada = marcasAtuais.current.find((m) => m.id === id);
          if (achada) apagarGrifos((m) => grupoDe(m) === grupoDe(achada));
          return;
        }
        const ancora = mark ?? (paragrafo && (txtDe(paragrafo) ?? paragrafo));
        const ret = (ancora || alvo).getBoundingClientRect();
        const base = el.offsetParent?.getBoundingClientRect();
        // o cartão abre embaixo do grifo; num grifo maior que a tela, fica na parte visível (até 240 px do fim)
        const vis = faixaVisivel();
        const y = Math.max(vis.topo, Math.min(ret.bottom, vis.fundo - 240));
        setAberta({ id, x: ret.left + ret.width / 2 - (base?.left ?? 0), y: y - (base?.top ?? 0) });
        return;
      }
      if (alvo.closest("a, button, [data-rotulo-art]")) return;
      // com a leitura em voz alta aberta, o parágrafo tocado ganha o "▶ Ler daqui"
      ouvirRef.current.tocouNoTexto(alvo, e.clientX, e.clientY);
      setOculto((o) => !o);
    };
    el.addEventListener("click", clique);
    return () => el.removeEventListener("click", clique);
  }, [lei, apagarGrifos]);
  const marcaAberta = marcas.find((m) => m.id === aberta?.id);
  // clicar fora do grifo aberto fecha o pop-up; clicar em outro grifo troca para ele (esse clique é tratado no texto)
  useEffect(() => {
    if (!aberta) return;
    const fora = (e: MouseEvent) => {
      const alvo = e.target as Element;
      if (popoverRef.current?.contains(alvo) || alvo.closest("mark[data-m], [data-marca-bloco]")) return;
      setAberta(null);
    };
    // adiado: o clique que abriu o grifo (ex.: "Anotar" na barra de seleção) ainda está se propagando
    const adiar = window.setTimeout(() => document.addEventListener("click", fora), 0);
    return () => {
      window.clearTimeout(adiar);
      document.removeEventListener("click", fora);
    };
  }, [aberta]);
  // o pop-up do grifo fica inteiro na tela: centrado no grifo, mas empurrado para dentro quando o grifo está perto da
  // borda (no celular ele saía pela esquerda ou pela direita). Medido depois de pintado, com a largura real do cartão.
  const popoverAberto = !!(aberta && marcaAberta);
  useLayoutEffect(() => {
    const c = popoverRef.current;
    if (!c || !popoverAberto) return;
    const ajustar = () => {
      const r = c.getBoundingClientRect();
      const meia = r.width / 2;
      const centro = r.left + meia;
      const alvo = Math.min(Math.max(centro, meia + 8), window.innerWidth - meia - 8);
      if (Math.abs(alvo - centro) > 0.5) c.style.left = `${parseFloat(c.style.left) + (alvo - centro)}px`;
    };
    ajustar();
    // o cartão muda de largura (ex.: o campo de anotação cresce): reajusta; e a janela pode mudar de tamanho
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(ajustar) : null;
    ro?.observe(c);
    window.addEventListener("resize", ajustar);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", ajustar);
    };
  }, [aberta, popoverAberto]);
  // a barra da seleção (cores, lixeira e anotação) segue o mesmo critério: inteira na tela, mesmo com o trecho na borda
  const flutuanteRef = useRef<HTMLDivElement>(null);
  const barraAberta = !!(selecao && !marcador.ativo);
  useLayoutEffect(() => {
    const c = flutuanteRef.current;
    if (!c || !barraAberta) return;
    const ajustar = () => {
      const r = c.getBoundingClientRect();
      const meia = r.width / 2;
      const centro = r.left + meia;
      const alvo = Math.min(Math.max(centro, meia + 8), window.innerWidth - meia - 8);
      if (Math.abs(alvo - centro) > 0.5) c.style.left = `${parseFloat(c.style.left) + (alvo - centro)}px`;
    };
    ajustar();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(ajustar) : null;
    ro?.observe(c);
    window.addEventListener("resize", ajustar);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", ajustar);
    };
  }, [selecao, barraAberta]);
  // texto do grifo inteiro: as partes de uma seleção que atravessa parágrafos, na ordem do texto
  const textoDoGrifo = (m: Marcacao) => {
    const grupo = m.grupo ?? m.id;
    return marcas
      .filter((x) => (x.grupo ?? x.id) === grupo)
      .sort((a, b) => a.i - b.i)
      .map((x) => x.exato)
      .join("\n");
  };
  // Copiar: o texto inteiro do grifo. Com o botão direito: antes, o nome da lei e o trecho entre aspas.
  const copiarMarca = async (m: Marcacao, comNome = false) => {
    const texto = textoDoGrifo(m);
    const ok = await copiarTexto(comNome ? `${nome}\n“${texto}”` : texto);
    setAviso({ texto: ok ? "Grifo copiado." : "Não foi possível copiar." });
  };

  // ---------- rolagem: esconde os controles, acompanha o artigo atual e guarda a posição ----------
  const artigosRef = useRef<ArtigoTexto[]>([]);
  useEffect(() => {
    artigosRef.current = artigos;
  }, [artigos]);
  const artigoNaTela = useCallback(() => {
    const lista = artigosRef.current;
    let lo = 0;
    let hi = lista.length - 1;
    let achado = 0;
    while (lo <= hi) {
      const meio = (lo + hi) >> 1;
      const el = document.getElementById(lista[meio][0]);
      if (!el) {
        hi = meio - 1;
        continue;
      }
      if (el.getBoundingClientRect().top <= 140) {
        achado = meio;
        lo = meio + 1;
      } else hi = meio - 1;
    }
    return achado;
  }, []);
  // o artigo da tela mais a fração dele que já passou pela linha de leitura (140 px do topo)
  const posicaoNaTela = useCallback(() => {
    const k = artigoNaTela();
    const lista = artigosRef.current;
    const topo = (i: number) => (lista[i] ? document.getElementById(lista[i][0])?.getBoundingClientRect().top : undefined);
    const inicio = topo(k);
    const fim = k + 1 < lista.length ? topo(k + 1) : undefined;
    if (inicio === undefined || fim === undefined || fim <= inicio) return k;
    return k + Math.min(1, Math.max(0, (140 - inicio) / (fim - inicio)));
  }, [artigoNaTela]);
  useEffect(() => {
    let ultimoY = window.scrollY;
    let quadro = 0;
    let medir: ReturnType<typeof setTimeout> | null = null;
    let salvar: ReturnType<typeof setTimeout> | null = null;
    let esconder: ReturnType<typeof setTimeout> | null = null;
    // Achar o artigo da tela força o navegador a calcular o layout: no máximo a cada 150 ms, nunca a cada quadro.
    const acompanhar = () => {
      medir = null;
      if (!artigosRef.current.length) return;
      const k = artigoNaTela();
      setAtual(k);
      setProgresso(posicaoNaTela());
      if (salvar) clearTimeout(salvar);
      salvar = setTimeout(() => {
        const a = artigosRef.current[k];
        if (!a) return;
        const todas = lerJSON<Posicoes>(K_POSICOES, {});
        todas[lei] = { art: a[0], rotulo: a[1], em: Date.now() };
        gravarJSON(K_POSICOES, todas);
      }, 800);
    };
    const rolar = () => {
      setSecaoVisivel(true);
      setNomeVisivel(!!folha.current && folha.current.getBoundingClientRect().top < 80);
      if (esconder) clearTimeout(esconder);
      esconder = setTimeout(() => setSecaoVisivel(false), 2500);
      cancelAnimationFrame(quadro);
      quadro = requestAnimationFrame(() => {
        const y = window.scrollY;
        if (Date.now() < barraFixa.current) {
          setOculto(false);
          ultimoY = y;
        } else if (Math.abs(y - ultimoY) > 6) {
          setOculto(y > ultimoY && y > 240);
          ultimoY = y;
        }
      });
      medir ??= setTimeout(acompanhar, 150);
    };
    window.addEventListener("scroll", rolar, { passive: true });
    return () => {
      window.removeEventListener("scroll", rolar);
      cancelAnimationFrame(quadro);
      if (medir) clearTimeout(medir);
      if (salvar) clearTimeout(salvar);
      if (esconder) clearTimeout(esconder);
    };
  }, [lei, artigoNaTela, posicaoNaTela]);
  // no computador, levar o mouse para perto da barra a traz de volta
  useEffect(() => {
    const mover = (e: PointerEvent) => e.pointerType === "mouse" && e.clientY > window.innerHeight - 130 && setOculto(false);
    window.addEventListener("pointermove", mover, { passive: true });
    return () => window.removeEventListener("pointermove", mover);
  }, []);
  // o cabeçalho do site some junto com os controles
  // a barra de cores da seleção não impede esconder os controles quando a seleção é por toque
  const escondido = ((oculto && !selecao) || selecaoPorToque) && !painel && !aberta && !regra;
  const barrasVisiveis = secaoVisivel && !selecaoPorToque;
  useEffect(() => {
    if (!regra) return;
    const fechar = () => setRegra(null);
    window.addEventListener("scroll", fechar, { passive: true, once: true });
    return () => window.removeEventListener("scroll", fechar);
  }, [regra]);
  useEffect(() => {
    document.body.toggleAttribute("data-leitor-oculto", escondido);
    return () => document.body.removeAttribute("data-leitor-oculto");
  }, [escondido]);

  // ---------- linha do tempo ----------
  useEffect(() => {
    const el = folha.current;
    if (!el || !pronto) return;
    if (!data) {
      delete el.dataset.tempo;
      setTempo(null); // eslint-disable-line react-hooks/set-state-in-effect -- volta ao texto atual
      return;
    }
    let vivo = true;
    setTempo({ carregando: true, aprox: 0 });
    carregarDatas()
      .then(async (carregadas) => {
        await garantirVersoes();
        if (!vivo || !blocos.current) return;
        const visiveis = textoEm(blocos.current, data, datasComLocal(carregadas, prefs.locais));
        const porIndice = new Map(visiveis.map((v) => [v.i, v.aproximado]));
        for (const b of blocosDe(el)) {
          const i = Number(b.dataset.i);
          b.dataset.vis = porIndice.has(i) ? "1" : "0";
          b.dataset.aprox = porIndice.get(i) ? "1" : "0";
        }
        el.dataset.tempo = "1";
        setTempo({ carregando: false, aprox: visiveis.filter((v) => v.aproximado).length });
      })
      .catch(() => vivo && setTempo({ carregando: false, aprox: 0, erro: "Não foi possível carregar o histórico desta lei." }));
    return () => {
      vivo = false;
    };
  }, [data, pronto, prefs.locais, garantirVersoes, versaoTextos]);

  // ---------- compartilhar ----------
  const gerarLink = async (comMarcas: boolean) => {
    const base = `${location.origin}/leis/${lei}/`;
    if (!comMarcas) return setCompartilhar({ comMarcas, link: base });
    const carga: Compartilhado = {
      lei,
      m: marcas.map(({ i, disp, exato, prefixo, sufixo, cor, nota }) => ({ i, disp, exato, prefixo, sufixo, cor, ...(nota ? { nota } : {}) })),
      s: sistema,
    };
    setCompartilhar({ comMarcas, link: `${base}#c=${await codificar(carga)}`, carga });
  };
  const baixarArquivo = () => {
    if (!compartilhar?.carga) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(compartilhar.carga)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${lei}.grifo.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const abrirArquivo = async (arquivo: File) => {
    setErroArquivo(null);
    let c: unknown;
    try {
      c = JSON.parse(await arquivo.text());
    } catch {
      return setErroArquivo("Esse arquivo não é um grifo do Grifo.");
    }
    if (!pareceCompartilhado(c)) return setErroArquivo("Esse arquivo não é um grifo do Grifo.");
    if (c.lei !== lei) return setErroArquivo(`Esse arquivo é de outra lei (${c.lei}).`);
    setRecebido(c);
    setVendoRecebido(false);
  };
  const mudarLegendas = (n: typeof legendas) => {
    setLegendas(n);
    gravarLegendas(n);
  };
  const descartarRecebido = () => {
    setRecebido(null);
    setVendoRecebido(false);
    history.replaceState(null, "", location.pathname);
  };
  const importarRecebido = () => {
    if (!recebido) return;
    const ja = new Set(marcas.map((m) => `${m.i}|${m.exato}`));
    const novas = recebido.m.filter((m) => !ja.has(`${m.i}|${m.exato}`)).map((m, k) => ({ ...m, id: `${Date.now().toString(36)}${k}`, em: Date.now() }));
    salvarMarcas([...marcas, ...novas]);
    if (recebido.s && !todosSistemas(legendas).some((s) => s.id === recebido.s!.id)) mudarLegendas({ ...legendas, meus: [...legendas.meus, recebido.s] });
    descartarRecebido();
  };

  const abrir = (p: Painel) => {
    setPainel((a) => (a === p ? null : p));
    setSelecao(null);
  };
  // o menu "Ir para" (botão do slide e nome da seção): abre numa aba
  const abrirNavegar = (aba: AbaNavegar) => {
    setAbaNavegar(aba);
    setPainel("navegar");
    setSelecao(null);
  };
  // pelo comando ("/remissivo", "/indice"), o painel abre com o cursor no campo de busca dele; o índice remissivo
  // chega depois (é carregado quando a aba abre), por isso o efeito espera o campo aparecer
  const focarBusca = useRef(false);
  useEffect(() => {
    if (!focarBusca.current) return;
    if (painel !== "navegar" || (abaNavegar === "remissivo" && remissivo === "sem")) {
      focarBusca.current = false;
      return;
    }
    const campo = document.querySelector<HTMLInputElement>(`.${styles.folhaPainel} input[type="search"]`);
    if (!campo) return;
    focarBusca.current = false;
    campo.focus();
  });
  // o índice remissivo da lei é carregado só quando a aba é aberta (e uma vez)
  useEffect(() => {
    if (painel !== "navegar" || abaNavegar !== "remissivo" || remissivo) return;
    let vivo = true;
    carregarRemissivo(lei)
      .then((d) => vivo && setRemissivo(d))
      .catch(() => vivo && setRemissivo("sem"));
    return () => {
      vivo = false;
    };
  }, [painel, abaNavegar, lei, remissivo]);
  const fecharPainel = useCallback(() => setPainel(null), []);
  useEffect(() => {
    const sincronizar = () => setTelaCheia(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", sincronizar);
    return () => document.removeEventListener("fullscreenchange", sincronizar);
  }, []);
  const semTelaCheia = () =>
    setAviso({ texto: "Este navegador não abre a página em tela cheia. Para ler sem as barras, adicione o Grifo à tela inicial do aparelho." });
  const entrarTelaCheia = () => {
    if (document.fullscreenElement) return setAviso({ texto: "Já está em tela cheia." });
    if (!document.fullscreenEnabled) return semTelaCheia();
    document.documentElement.requestFullscreen().catch(semTelaCheia);
  };
  const sairTelaCheia = () => {
    if (!document.fullscreenElement) return setAviso({ texto: "Já está fora da tela cheia." });
    document.exitFullscreen().catch(() => {});
  };
  const alternarTelaCheia = () => (document.fullscreenElement ? sairTelaCheia() : entrarTelaCheia());
  // volta à última posição salva nesta lei (segurar o botão da tela cheia, ou "/parei")
  const irOndeParei = () => {
    const p = lerJSON<Posicoes>(K_POSICOES, {})[lei];
    if (!p) return setAviso({ texto: "Ainda não há posição salva nesta lei." });
    saltoFixo();
    if (!irParaArtigo(p.art)) return setAviso({ texto: "Não encontrei onde você parou." });
    setAviso({ texto: `Você parou no ${p.rotulo}.` });
  };

  // Comandos da caixa "Ir para" ("/telacheia", "/escuro"…; ver src/lib/leis/comandos.ts). As opções que ligam e
  // desligam dizem, num aviso, como ficaram.
  const executarComando = (id: IdComando) => {
    const alternar = <K extends "original" | "revogados" | "vide" | "anotacoes" | "informacoes" | "prontos" | "erros" | "barraNavegador">(chave: K, nome: string) => {
      const ligar = !prefs[chave];
      mudarPrefs({ [chave]: ligar } as Partial<PrefsLeitor>);
      setAviso({ texto: `${nome}: ${ligar ? "ligado" : "desligado"}.` });
    };
    const fundo = (f: PrefsLeitor["fundo"]) => {
      mudarPrefs({ fundo: f });
      setAviso({ texto: `Fundo: ${FUNDOS.find((x) => x.id === f)?.nome ?? f}.` });
    };
    const letra = (fonte: PrefsLeitor["fonte"], nome: string) => {
      mudarPrefs({ fonte });
      setAviso({ texto: `Letra ${nome}.` });
    };
    const tamanho = (passo: number) => {
      const t = Math.min(28, Math.max(14, prefs.tamanho + passo));
      mudarPrefs({ tamanho: t });
      setAviso({ texto: `Letra de ${t}px.` });
    };
    const filtro = (f: FiltroTexto) => {
      mudarPrefs({ filtro: f });
      setAviso({ texto: FILTROS.find((x) => x.id === f)!.titulo });
    };
    const ponta = (ultimo: boolean) => {
      const a = ultimo ? artigos.at(-1) : artigos[0];
      if (!a) return;
      saltoFixo();
      irParaArtigo(a[0]);
    };
    switch (id) {
      case "telacheia":
        return alternarTelaCheia();
      case "escuro":
      case "papel":
      case "branco":
      case "sepia":
      case "verde":
        return fundo(id);
      case "maior":
        return tamanho(2);
      case "menor":
        return tamanho(-2);
      case "semserifa":
        return letra("sans", "sem serifa");
      case "serifada":
        return letra("serif", "serifada");
      case "mono":
        return letra("mono", "monoespaçada");
      case "original":
        return alternar("original", "Redação original");
      case "revogados":
        return alternar("revogados", sumula ? "Súmulas superadas e canceladas" : "Texto revogado");
      case "vide":
        return alternar("vide", "“Vide”");
      case "anotacoes":
        return alternar("anotacoes", "Anotações de redação");
      case "informacoes":
        return alternar("informacoes", "Informações adicionais");
      case "prontos":
        return alternar("prontos", "Grifos prontos");
      case "erros":
        return alternar("erros", "Marcar os artigos em que mais errei");
      case "barra":
        return alternar("barraNavegador", "Barra de rolagem do navegador");
      case "planalto": {
        const planalto = prefs.destino !== "planalto";
        mudarPrefs({ destino: planalto ? "planalto" : "grifo" });
        return setAviso({ texto: planalto ? "As referências abrem no Planalto." : "As referências abrem no Grifo." });
      }
      case "tudo":
        return filtro("tudo");
      case "sogrifos":
        return filtro("grifos");
      case "soerros":
        return filtro("erros");
      case "soautomaticos":
        return filtro("automaticos");
      case "grifar": {
        const ligar = !marcador.ativo || marcador.cor === "borracha";
        setMarcador({ ativo: ligar, cor: marcador.cor === "borracha" ? "" : marcador.cor });
        return setAviso({ texto: ligar ? "Grifando: passe o dedo (ou o mouse) sobre o texto." : "Marcador desligado." });
      }
      case "borracha":
        setMarcador({ ativo: true, cor: "borracha" });
        return setAviso({ texto: "Borracha: passe sobre o grifo para apagar." });
      case "grifos":
        return setPainel("grifos");
      case "buscar":
        setBuscaInicial("");
        return setPainel("buscar");
      case "leis":
        return setPainel("leis");
      case "indice":
        focarBusca.current = true;
        return abrirNavegar("divisoes");
      case "remissivo":
        focarBusca.current = true;
        return abrirNavegar("remissivo");
      case "leitura":
        return setPainel("aa");
      case "mais":
        return setPainel("mais");
      case "inicio":
        return ponta(false);
      case "fim":
        return ponta(true);
      case "parei":
        return irOndeParei();
      case "compartilhar":
        return void gerarLink(false);
      case "imprimir":
        return void setTimeout(() => window.print(), 100);
      case "ouvir":
        return ouvir.ativo ? setPainel("ouvir") : ouvir.iniciar();
      case "comandos":
        return;
    }
  };
  // Durante o arrasto do slide, salta sem o realce; o realce fica para o artigo onde o dedo soltou.
  const irPorIndice = useCallback(
    (k: number, marcar = true) => {
      const a = artigosRef.current[k];
      if (!a) return;
      if (marcar) {
        irParaArtigo(a[0], true);
        setAtual(k);
      } else {
        medirTopo();
        document.getElementById(a[0])?.scrollIntoView({ block: "start", behavior: "instant" });
      }
    },
    [irParaArtigo],
  );
  // leva a um artigo do menu "Ir para" (e, se for um grifo, rola até a marca dele)
  const irNavegar = (k: number, marcaId?: string) => {
    setPainel(null);
    window.setTimeout(() => {
      irPorIndice(k);
      if (marcaId) window.setTimeout(() => document.querySelector(`mark[data-m="${marcaId}"]`)?.scrollIntoView({ block: "center", behavior: "instant" }), 80);
    }, 50);
  };
  const voltarDoSlide = useCallback(
    (de: number, para: number) => {
      const a = artigosRef.current[de];
      if (!a || Math.abs(para - de) < 3) return;
      setAviso({ texto: `Você estava no ${a[1]}.`, acao: { rotulo: "Voltar", fazer: () => irPorIndice(de) } });
    },
    [irPorIndice],
  );
  const faixasTrilho = useMemo<FaixaTrilho[]>(() => {
    if (!prefs.prontos) return [];
    const grifos = prontosNoSistema(PRONTOS, sistema, lei);
    const faixas: FaixaTrilho[] = [];
    artigos.forEach(([id], k) => {
      const g = grifos.filter((x) => noArtigo(x, id)).sort((a, b) => CORES_GRIFO.indexOf(a.cor) - CORES_GRIFO.indexOf(b.cor))[0];
      const cor = g && corDoGrifo(sistema, g);
      if (!g || !cor) return;
      const rotulo = ROTULO_DA_COR[g.cor];
      const ult = faixas.at(-1);
      if (ult && ult.cor === cor && ult.rotulo === rotulo && ult.ate === k - 1) ult.ate = k;
      else faixas.push({ de: k, ate: k, cor, rotulo });
    });
    return faixas;
  }, [artigos, prefs.prontos, sistema, lei]);
  // a aba "Grifos prontos": um grupo por tipo de grifo (na ordem das cores do sistema), com os artigos de cada um
  const prontosPorTipo = useMemo(() => {
    const grupos = new Map<string, { rotulo: string; cor: string; ks: number[] }>();
    for (const f of faixasTrilho) {
      // num sistema copiado, o nome é o que o usuário deu à cor (o rótulo do grifo pronto é o da origem)
      const nome = sistema.cores.find((c) => c.cor === f.cor && (c.origem ?? c.rotulo) === f.rotulo)?.rotulo ?? f.rotulo;
      const g = grupos.get(f.rotulo) ?? { rotulo: nome, cor: f.cor, ks: [] };
      for (let k = f.de; k <= f.ate; k++) g.ks.push(k);
      grupos.set(f.rotulo, g);
    }
    return [...grupos.values()].sort((a, b) => ordemDaCor(sistema, a.cor) - ordemDaCor(sistema, b.cor));
  }, [faixasTrilho, sistema]);
  // Grifos do usuário por grupo: uma seleção que atravessa parágrafos é um grifo só, na posição da primeira parte
  const grifosAgrupados = useMemo<GrupoGrifo[]>(() => {
    const ind = new Map(artigos.map((a, k) => [a[0], k]));
    const grupos = new Map<string, { k: number; cor: string; nota?: string; primeiroId: string; partes: { k: number; ordem: number; exato: string }[] }>();
    exibidas.forEach((m, ordem) => {
      const k = m.disp ? ind.get(m.disp.split(".")[0]) : undefined;
      if (k === undefined) return;
      const g = m.grupo ?? m.id;
      const atual = grupos.get(g) ?? { k, cor: m.cor, nota: m.nota, primeiroId: m.id, partes: [] };
      if (k < atual.k) Object.assign(atual, { k, cor: m.cor, nota: m.nota, primeiroId: m.id });
      atual.partes.push({ k, ordem, exato: m.exato });
      grupos.set(g, atual);
    });
    return [...grupos.values()]
      .map((g) => {
        const partes = [...g.partes].sort((a, b) => a.k - b.k || a.ordem - b.ordem);
        return { k: g.k, cor: g.cor, nota: g.nota, primeiroId: g.primeiroId, texto: partes.map((p) => p.exato).join(" […] "), partes: partes.length };
      })
      .sort((a, b) => a.k - b.k);
  }, [artigos, exibidas]);
  const pontosTrilho = useMemo<PontoTrilho[]>(() => {
    const ind = new Map(artigos.map((a, k) => [a[0], k]));
    const pontos = new Map<string, PontoTrilho>();
    // um ponto por grifo, no primeiro artigo dele (um grifo que atravessa parágrafos não vira vários pontos)
    for (const g of grifosAgrupados) if (!pontos.has(`m${g.k}`)) pontos.set(`m${g.k}`, { k: g.k, cor: g.cor === "nota" ? "" : g.cor, tipo: "marca" });
    for (const e of estrelas) {
      const k = e.startsWith(`${lei}:`) ? ind.get(e.slice(lei.length + 1)) : undefined;
      if (k !== undefined) pontos.set(`e${k}`, { k, cor: "#d4a017", tipo: "estrela" });
    }
    const ocupados = new Set([...pontos.values()].map((p) => p.k));
    for (const f of faixasTrilho) if (!ocupados.has(f.de)) pontos.set(`p${f.de}`, { k: f.de, cor: f.cor, tipo: "pronto" });
    // um ponto vermelho por artigo em que o usuário errou
    for (const a of errados) {
      const k = ind.get(idDoErro(lei, a.artigo));
      if (k !== undefined) pontos.set(`x${k}`, { k, cor: "#dc2626", tipo: "erro" });
    }
    return [...pontos.values()].sort((a, b) => a.k - b.k);
  }, [artigos, grifosAgrupados, estrelas, faixasTrilho, errados, lei]);

  const detalhesTrilho = useMemo(() => {
    const porK = new Map<number, Detalhe[]>();
    const adicionar = (k: number, d: Detalhe) => porK.set(k, [...(porK.get(k) ?? []), d]);
    const ind = new Map(artigos.map((a, k) => [a[0], k]));
    // um detalhe por grifo (o texto junta as partes), no primeiro artigo dele
    for (const g of grifosAgrupados) adicionar(g.k, { cor: g.cor === "nota" ? "" : g.cor, texto: `${rotuloDaCor(g.cor) || "Grifo"}: “${resumo(g.texto)}”${g.nota ? ` — ${resumo(g.nota, 60)}` : ""}` });
    for (const e of estrelas) {
      const k = e.startsWith(`${lei}:`) ? ind.get(e.slice(lei.length + 1)) : undefined;
      if (k !== undefined) adicionar(k, { cor: "#d4a017", texto: "Artigo marcado como importante" });
    }
    for (const f of faixasTrilho) adicionar(f.de, { cor: f.cor, texto: `Grifo pronto: ${f.rotulo}` });
    return porK;
  }, [artigos, estrelas, faixasTrilho, grifosAgrupados, lei, rotuloDaCor]);

  const porArtigo = useMemo(() => new Map(errados.map((a) => [idDoErro(lei, a.artigo), a])), [errados, lei]);
  useEffect(() => {
    const el = folha.current;
    if (!el || !pronto) return;
    for (const b of blocosDe(el)) {
      const a = b.dataset.disp && b.dataset.sup === "0" ? porArtigo.get(b.dataset.disp) : undefined;
      let pontos = b.querySelector<HTMLElement>(`:scope > .${styles.pontosErro}`);
      if (!a) {
        pontos?.remove();
      } else {
        if (!pontos) {
          pontos = document.createElement("span");
          pontos.className = styles.pontosErro;
          b.insertBefore(pontos, txtDe(b) ?? null);
        }
        const tentativas = a.erros + a.acertos;
        pontos.textContent = "●".repeat(Math.min(a.erros, 5)) + (a.erros > 5 ? "+" : "");
        pontos.dataset.nivel = a.nivel ?? "";
        pontos.dataset.dica = `${a.erros} ${a.erros === 1 ? "erro" : "erros"} em ${tentativas} ${tentativas === 1 ? "tentativa" : "tentativas"}`;
        pontos.setAttribute("aria-label", pontos.dataset.dica);
      }
    }
  }, [porArtigo, pronto, versaoTextos]);

  // Filtro do texto. "Somente grifos": os parágrafos grifados, cada um com o caput do seu artigo. "Apenas os erros":
  // os artigos em que o usuário errou. Sem grifos ou sem erros, o texto aparece inteiro (o painel explica).
  // as cores escolhidas nos filtros de grifos ("só peças e teses"): valem as que têm grifo no filtro; nenhuma = todas
  const prontosDaLei = useMemo(() => prontosNoSistema(PRONTOS, sistema, lei), [sistema, lei]);
  const coresDoFiltro = useMemo(() => {
    const usadas = new Set(prefs.filtro === "grifos" ? marcas.map((m) => m.cor) : prefs.filtro === "automaticos" ? prontosDaLei.map((g) => corDoGrifo(sistema, g)) : []);
    return sistema.cores.filter((c, i, cs) => usadas.has(c.cor) && cs.findIndex((x) => x.cor === c.cor) === i);
  }, [prefs.filtro, marcas, prontosDaLei, sistema]);
  const coresEscolhidas = useMemo(() => prefs.filtroCores.filter((c) => coresDoFiltro.some((x) => x.cor === c)), [prefs.filtroCores, coresDoFiltro]);
  // todas marcadas filtram o mesmo que nenhuma
  const corFiltro = coresEscolhidas.length > 0 && coresEscolhidas.length < coresDoFiltro.length;
  const naCorDoFiltro = useCallback((cor: string | undefined) => !corFiltro || (cor !== undefined && coresEscolhidas.includes(cor)), [corFiltro, coresEscolhidas]);
  const alternarCorFiltro = (cor: string) =>
    mudarPrefs({ filtroCores: coresEscolhidas.includes(cor) ? coresEscolhidas.filter((c) => c !== cor) : [...coresEscolhidas, cor] });
  const marcasDoFiltro = useMemo(() => (corFiltro ? marcas.filter((m) => naCorDoFiltro(m.cor)) : marcas), [marcas, corFiltro, naCorDoFiltro]);
  const prontosDoFiltro = useMemo(() => (corFiltro ? prontosDaLei.filter((g) => naCorDoFiltro(corDoGrifo(sistema, g))) : prontosDaLei), [prontosDaLei, corFiltro, naCorDoFiltro, sistema]);
  const blocosComGrifo = useMemo(() => new Set(marcasDoFiltro.map((m) => m.i)), [marcasDoFiltro]);
  const artigosComGrifo = useMemo(() => new Set(marcasDoFiltro.flatMap((m) => (m.disp ? [m.disp.split(".")[0]!] : []))), [marcasDoFiltro]);
  const filtroEfetivo: FiltroTexto =
    prefs.filtro === "grifos" && marcas.length
      ? "grifos"
      : prefs.filtro === "erros" && porArtigo.size
        ? "erros"
        : prefs.filtro === "automaticos" && prefs.prontos
          ? "automaticos"
          : "tudo";
  useEffect(() => {
    const el = folha.current;
    if (!el || !pronto) return;
    // os blocos com grifo automático: o dispositivo de cada grifo pronto com cor no sistema ativo (o que o leitor pinta)
    const blocos = blocosDe(el);
    const doPronto = blocosComProntos(
      blocos.map((b) => ({ disp: b.dataset.disp, superada: b.dataset.sup !== "0" })),
      prontosDoFiltro,
    );
    const artigosComPronto = new Set([...doPronto].map((i) => blocos[i]!.dataset.disp!.split(".")[0]));
    for (const [i, b] of blocos.entries()) {
      const comPronto = doPronto.has(i);
      const artigo = b.dataset.disp?.split(".")[0];
      let fora = false;
      if (filtroEfetivo === "grifos") fora = !blocosComGrifo.has(Number(b.dataset.i)) && !(artigo !== undefined && b.dataset.disp === artigo && artigosComGrifo.has(artigo));
      if (filtroEfetivo === "erros") fora = !(artigo !== undefined && porArtigo.has(artigo));
      if (filtroEfetivo === "automaticos") fora = !comPronto && !(artigo !== undefined && b.dataset.disp === artigo && artigosComPronto.has(artigo));
      if (fora) b.dataset.foraFiltro = "1";
      else delete b.dataset.foraFiltro;
    }
  }, [filtroEfetivo, blocosComGrifo, artigosComGrifo, porArtigo, pronto, prontosDoFiltro]);

  useEffect(() => {
    avisarForaDoFiltro.current = (alvo) => {
      if (!alvo.closest("[data-fora-filtro]")) return false;
      const base = alvo.id.split(".")[0]!;
      const rotulo = artigosRef.current.find((a) => a[0] === base)?.[1] ?? "Esse artigo";
      const nome = FILTROS.find((f) => f.id === filtroEfetivo)?.titulo ?? "do texto";
      setAviso({
        texto: `${rotulo} não aparece com o filtro “${nome}”${corFiltro ? " nas cores escolhidas" : ""}.`,
        acao: {
          rotulo: "Mostrar tudo",
          fazer: () => {
            mudarPrefs({ filtro: "tudo" });
            // o filtro sai no próximo desenho; aí o artigo já tem onde estar
            window.setTimeout(() => irParaArtigo(alvo.id), 80);
          },
        },
      });
      return true;
    };
  });

  // o popup "Ir para": as divisões mostradas (só títulos ou tudo) e os erros a partir do mínimo escolhido
  // nas súmulas, a primeira aba lista as súmulas (cada uma é um dispositivo), no lugar dos títulos e capítulos
  const divisoesMostradas = sumula ? artigos.map((a, k) => ({ k, rotulo: a[1], nivel: 1 })) : mapa.divisoes.filter((d) => d.nivel <= nivelMax);
  const errosMostrados = errados.filter((a) => a.erros >= minErros);
  // o trilho acompanha o filtro do texto: só os pontos e os artigos do que está à mostra (grifos, erros ou prontos)
  const alvosTrilho = useMemo<number[] | undefined>(() => {
    if (filtroEfetivo === "tudo") return undefined;
    const idx = new Set<number>();
    artigos.forEach(([id], k) => {
      if (filtroEfetivo === "grifos" && artigosComGrifo.has(id)) idx.add(k);
      if (filtroEfetivo === "erros" && porArtigo.has(id)) idx.add(k);
    });
    if (filtroEfetivo === "automaticos" && !corFiltro) for (const f of faixasTrilho) for (let k = f.de; k <= f.ate; k++) idx.add(k);
    // com cores escolhidas, os artigos que têm um grifo pronto dela (a faixa do trilho mostra só a primeira cor do artigo)
    if (filtroEfetivo === "automaticos" && corFiltro) artigos.forEach(([id], k) => prontosDoFiltro.some((g) => noArtigo(g, id)) && idx.add(k));
    return [...idx].sort((a, b) => a - b);
  }, [filtroEfetivo, artigos, artigosComGrifo, porArtigo, faixasTrilho, corFiltro, prontosDoFiltro]);
  const pontosVisiveis = useMemo<PontoTrilho[]>(() => {
    const tipo: PontoTrilho["tipo"] | null = filtroEfetivo === "grifos" ? "marca" : filtroEfetivo === "erros" ? "erro" : filtroEfetivo === "automaticos" ? "pronto" : null;
    return tipo ? pontosTrilho.filter((p) => p.tipo === tipo && (tipo === "erro" || naCorDoFiltro(p.cor))) : pontosTrilho;
  }, [filtroEfetivo, pontosTrilho, naCorDoFiltro]);
  // o "Buscar" passa só pelos artigos à mostra no filtro
  const proximoVisivel = (de: number, passo: -1 | 1): number => {
    if (!alvosTrilho) return de + passo;
    return passo > 0 ? (alvosTrilho.find((k) => k > de) ?? -1) : ([...alvosTrilho].reverse().find((k) => k < de) ?? -1);
  };
  // a busca da aba "Títulos": títulos e artigos cujo texto contém o termo (sem acento, como no índice remissivo)
  const termoTitulos = semAcentoBusca(buscaTitulos.trim());
  const divisoesBuscadas = termoTitulos
    ? divisoesMostradas.filter((d) => semAcentoBusca(`${d.rotulo} ${artigos[d.k]?.[1] ?? ""}`).includes(termoTitulos))
    : divisoesMostradas;
  const artigosComTermo: { k: number; rotulo: string; trecho: string }[] = [];
  if (painel === "navegar" && abaNavegar === "divisoes" && termoTitulos.length >= 3) {
    for (const [k, a] of artigos.entries()) {
      if (artigosComTermo.length >= 60) break;
      if (semAcentoBusca(a[2]).includes(termoTitulos)) artigosComTermo.push({ k, rotulo: a[1], trecho: a[2] });
    }
  }
  // os grifos agrupados por cor (o nome da cor é o do sistema de cores ativo)
  const grifosPorCor = useMemo(() => {
    const porCor = new Map<string, (typeof grifosAgrupados)>();
    for (const g of grifosAgrupados) porCor.set(g.cor, [...(porCor.get(g.cor) ?? []), g]);
    return [...porCor];
  }, [grifosAgrupados]);
  // o índice remissivo sem acento e em minúsculas: a entrada cuja palavra contém o termo mostra todos os subitens; as demais, só os subitens cujo texto ou referência contém o termo
  const idsDosArtigos = useMemo(() => new Set(artigos.map((a) => a[0])), [artigos]);
  const remissivoFiltrado = useMemo(() => {
    if (!remissivo || remissivo === "sem") return [];
    const termo = semAcentoBusca(buscaRemissivo.trim());
    const itens: { palavra: string; subitens: RemissivoSubitem[]; ordem: number }[] = [];
    for (const e of remissivo.entradas) {
      const palavra = semAcentoBusca(e.palavra);
      if (!termo || tituloTemTermo(palavra, termo)) {
        itens.push({ palavra: e.palavra, subitens: e.subitens, ordem: termo ? ordemNoRemissivo(palavra, termo) : 0 });
        continue;
      }
      const subitens = e.subitens.filter((s) => semAcentoBusca(s.texto).includes(termo) || semAcentoBusca(s.ref).includes(termo));
      if (subitens.length) itens.push({ palavra: e.palavra, subitens, ordem: 3 });
    }
    // o título que é o termo buscado vem primeiro ("prova" ou "provas" → "PROVA(S)"); a ordem alfabética fica dentro de cada grupo
    return itens.sort((a, b) => a.ordem - b.ordem);
  }, [remissivo, buscaRemissivo]);
  // a referência do índice remissivo grifada com a cor dos grifos do artigo: os do usuário e os prontos (quando ligados)
  const coresDoRemissivo = useMemo(
    () =>
      painel === "navegar" && abaNavegar === "remissivo"
        ? coresPorArtigo({
            marcas,
            prontos: prefs.prontos ? prontosDaLei : [],
            corDoPronto: (g) => corDoGrifo(sistema, g),
            rotuloDoPronto: (g) => rotuloDoGrifo(sistema, g),
            rotuloDaMarca: (cor) => rotuloDaCor(cor) || "Grifo",
            ordem: (cor) => ordemDaCor(sistema, cor),
          })
        : null,
    [painel, abaNavegar, marcas, prefs.prontos, prontosDaLei, sistema, rotuloDaCor],
  );
  // as abas do "Ir para", em ícones (o nome aparece ao passar o mouse), ao lado do botão de fechar
  const abasIcones = (
    <div className={styles.abasIcones} role="tablist" aria-label="Ir para">
      {(sumula ? ABAS_SUMULAS : ABAS_LEIS).map(([id, nome]) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={abaNavegar === id}
          aria-label={nome}
          data-tip={nome}
          title={nome}
          className={styles.abaIcone}
          onClick={() => setAbaNavegar(id)}
        >
          {ICONES_ABA[id]}
        </button>
      ))}
    </div>
  );
  return (
    <div
      ref={raizRef}
      className={styles.leitor}
      data-leitor
      data-fonte={prefs.fonte}
      data-fundo={prefs.fundo}
      data-revogados={prefs.revogados ? "1" : "0"}
      data-anotacoes={!sumula && !prefs.anotacoes ? "0" : "1"}
      data-informacoes={sumula && prefs.informacoes ? "1" : "0"}
      data-vide={prefs.vide ? "1" : "0"}
      data-erros={prefs.erros ? "1" : "0"}
      data-marcador={marcador.ativo ? "1" : "0"}
      data-largura={prefs.largura}
      data-ouvindo={ouvir.ativo ? "1" : undefined}
      style={{ "--leitor-tamanho": `${prefs.tamanho}px`, "--leitor-entrelinha": prefs.entrelinha, "--leitor-laterais": `${prefs.laterais}px`, ...(CORES_TEXTO[prefs.corTexto].cor ? { "--leitor-fg": CORES_TEXTO[prefs.corTexto].cor } : {}) } as CSSProperties}
    >
      <DiagSelecao />
      {recebido && (
        <div className={styles.aviso} role="status">
          Este link traz {recebido.m.length} grifo(s){recebido.s ? ` no sistema “${recebido.s.nome}”` : ""}.
          <button type="button" className="btn btn-sm" onClick={() => setVendoRecebido((v) => !v)}>
            {vendoRecebido ? "Ver os meus" : "Ver os do link"}
          </button>
          <button type="button" className="btn btn-sm btn-gold" onClick={importarRecebido}>
            Importar para meu Grifo
          </button>
          <button type="button" className={styles.link} onClick={descartarRecebido}>
            descartar
          </button>
        </div>
      )}
      {data && tempo && (
        <div className={`${styles.aviso} ${styles.avisoTempo}`} role="status">
          <span>
            {tempo.carregando
              ? "Montando o texto da data…"
              : (tempo.erro ?? `Texto vigente em ${data.split("-").reverse().join("/")}${tempo.aprox ? ` · ${tempo.aprox} trecho(s) com data aproximada (≈)` : ""}.`)}
          </span>
          <button type="button" className={styles.link} onClick={() => setData("")}>
            voltar ao texto atual
          </button>
        </div>
      )}
      {perdidas > 0 && <p className={styles.aviso}>{perdidas} grifo(s) não foram reencontrados no texto atual (a lei pode ter mudado).</p>}

      {nomeVisivel && (
        <p className={`${styles.nomeLei} ${barrasVisiveis ? styles.nomeLeiVisivel : ""}`}>
          {/* o fundo mostra a leitura da lei, na cor dela; o texto fica por cima */}
          <span
            className={`${styles.nomeLeiFundo} ${fracaoLida(leitura.n, ids.length) >= 1 ? styles.nomeLeiCompleta : ""}`}
            aria-hidden
            style={{ width: `${fracaoLida(leitura.n, ids.length) * 100}%`, "--cor": cor, "--alfa": `${Math.round(15 + 25 * fracaoLida(leitura.n, ids.length))}%` } as CSSProperties}
          />
          <span className={styles.nomeLeiTexto}>
            {nome}
            {ids.length > 0 && <span> · {textoPercentual(fracaoLida(leitura.n, ids.length))} lida</span>}
          </span>
        </p>
      )}

      {mapa.secoes[atual] && (
        <button
          type="button"
          className={`${styles.secaoAtual} ${barrasVisiveis ? styles.secaoAtualVisivel : ""}`}
          onClick={() => abrirNavegar("divisoes")}
          tabIndex={secaoVisivel ? 0 : -1}
          aria-label={`Ver as divisões da lei. Agora: ${mapa.secoes[atual]}`}
        >
          {mapa.secoes[atual]}
        </button>
      )}

      {ids.length > 0 && (
        <div className={styles.barraTexto}>
          <BarraLeitura n={leitura.n} total={ids.length} cor={cor} rotulo={leitura.rotulo} explicar />
        </div>
      )}

      <div className={styles.corpo}>
        <div ref={folha} className={styles.folha} data-lei={lei} dangerouslySetInnerHTML={html} />
        {!pronto && <p className={styles.carregandoResto}>Carregando o restante da lei…</p>}
      </div>

      {artigos.length > 1 && (
        <Trilho
          artigos={artigos}
          atual={atual}
          progresso={progresso}
          oculto={escondido}
          aoIr={irPorIndice}
          aoSoltar={voltarDoSlide}
          pontos={pontosVisiveis}
          faixas={filtroEfetivo === "tudo" ? faixasTrilho : filtroEfetivo === "automaticos" ? faixasTrilho.filter((f) => naCorDoFiltro(f.cor)) : []}
          alvos={alvosTrilho}
          secoes={mapa.secoes}
          marcos={mapa.marcos}
          detalhes={detalhesTrilho}
          aoMenu={() => abrirNavegar("divisoes")}
          lado={prefs.trilhoLado}
          aoMudarLado={(trilhoLado) => mudarPrefs({ trilhoLado })}
        />
      )}

      {/* Barra de controles: sempre ao alcance, some ao rolar para baixo e volta ao tocar no texto */}
      <nav className={`${styles.dock} ${escondido ? styles.dockOculto : ""}`} aria-label="Controles de leitura">
        {marcador.ativo && (
          <div className={styles.paleta} role="radiogroup" aria-label="Cor do marca-texto">
            {sistema.cores.map((c) => (
              <button
                key={c.cor + c.rotulo}
                type="button"
                role="radio"
                aria-checked={corMarcador === c.cor}
                aria-label={c.rotulo}
                title={c.rotulo}
                style={{ "--c": c.cor } as CSSProperties}
                onClick={() => setMarcador({ ativo: true, cor: c.cor })}
              />
            ))}
            <button
              type="button"
              role="radio"
              aria-checked={corMarcador === "borracha"}
              aria-label="Apagar: toque num grifo ou selecione um trecho para apagar os grifos dele"
              title="Apagar grifos (toque num grifo ou selecione um trecho)"
              className={styles.borracha}
              onClick={() => setMarcador({ ativo: true, cor: "borracha" })}
            >
              ⌫
            </button>
          </div>
        )}
        <div className={styles.botoes}>
          <BotaoDock
            icone="☰"
            rotulo="Leis"
            ativo={painel === "leis"}
            onClick={() => abrir("leis")}
            aoDeslizar={(sentido) => {
              const h = lerJSON<Historico>(K_HISTORICO, HISTORICO_VAZIO);
              const destino = h.pilha[h.pos + (sentido === "direita" ? -1 : 1)];
              if (!destino) return setAviso({ texto: sentido === "direita" ? "Nenhuma lei lida antes desta." : "Nenhuma lei lida depois desta." });
              router.push(rotaDaLei(destino));
            }}
            aoSegurar={() => {
              saltoFixo();
              window.scrollTo({ top: 0, behavior: "instant" });
              setAviso({ texto: "Início da lei." });
            }}
          />
          <BotaoDock
            icone="⌕"
            rotulo="Buscar"
            ativo={painel === "buscar"}
            onClick={() => abrir("buscar")}
            aoDeslizar={(sentido) => {
              const k = proximoVisivel(atual, sentido === "direita" ? -1 : 1);
              const a = artigos[k];
              if (!a) return setAviso({ texto: sentido === "direita" ? "Este é o primeiro artigo." : "Este é o último artigo." });
              antesDoSalto.current = window.scrollY;
              saltoFixo();
              irPorIndice(k);
              setAviso({ texto: a[1] });
            }}
            aoSegurar={() => {
              const y = antesDoSalto.current;
              if (y === null) return setAviso({ texto: "Nenhum salto de artigo para desfazer." });
              antesDoSalto.current = null;
              saltoFixo();
              window.scrollTo({ top: y, behavior: "instant" });
              setAviso({ texto: "Voltou ao ponto anterior." });
            }}
          />
          <BotaoDock
            icone="🖍"
            rotulo={marcador.ativo ? "Grifando" : "Grifar"}
            ativo={marcador.ativo}
            destaque
            onClick={() => {
              setMarcador((m) => ({ ativo: !m.ativo, cor: m.cor === "borracha" ? "" : m.cor }));
              setPainel(null);
            }}
            aoDeslizar={(sentido) => {
              const cores = sistema.cores;
              const passo = sentido === "direita" ? 1 : -1;
              const k = cores.findIndex((c) => c.cor === corMarcador);
              const n = cores.length;
              const j = k < 0 ? (passo > 0 ? 0 : n - 1) : (k + passo + n) % n;
              const nova = cores[j];
              if (!nova) return;
              setMarcador({ ativo: true, cor: nova.cor });
              setAviso({ texto: `Grifo: ${nova.rotulo || "cor " + (j + 1)}` });
            }}
            aoSegurar={() => {
              setMarcador({ ativo: true, cor: "borracha" });
              setPainel(null);
              setAviso({ texto: "Apagar: toque num grifo ou selecione um trecho." });
            }}
          />
          {desfaziveis > 0 && <BotaoDock icone="↶" rotulo="Desfazer" ativo={false} onClick={desfazerUltimo} />}
          <BotaoDock
            icone="Aa"
            rotulo="Leitura"
            ativo={painel === "aa"}
            onClick={() => abrir("aa")}
            aoDeslizar={(_sentido, dx) => {
              const tamanho = tamanhoComPasso(prefs.tamanho, dx);
              if (tamanho === prefs.tamanho) return;
              mudarPrefs({ tamanho });
              setAviso({ texto: `Texto: ${tamanho}px` });
            }}
            previa={(dx) => {
              if (Math.abs(dx) < 12) return null;
              const tamanho = tamanhoComPasso(prefs.tamanho, dx);
              return { texto: "Aa", tamanho, rotulo: `${tamanho}px` };
            }}
            aoSegurar={() => {
              mudarPrefs({ tamanho: PREFS_PADRAO.tamanho });
              setAviso({ texto: `Texto: ${PREFS_PADRAO.tamanho}px (padrão)` });
            }}
          />
          <BotaoDock
            icone={
              // fones de ouvido, no traço dos outros ícones (o emoji 🎧 sai colorido)
              <svg viewBox="0 0 24 24" className={styles.iconeSvg} aria-hidden>
                <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
                <rect x="3" y="14" width="4.5" height="7" rx="1.6" />
                <rect x="16.5" y="14" width="4.5" height="7" rx="1.6" />
              </svg>
            }
            rotulo={ouvir.ativo ? "Ouvindo" : "Ouvir"}
            ativo={ouvir.ativo || painel === "ouvir"}
            // a primeira vez lê do ponto da tela; com a leitura aberta, abre os ajustes dela
            onClick={() => (ouvir.ativo ? abrir("ouvir") : ouvir.iniciar())}
            aoDeslizar={(sentido) => ouvir.mudarVelocidade(sentido === "direita" ? 0.1 : -0.1)}
            aoSegurar={() => abrir("ouvir")}
          />
          <BotaoDock
            icone="⛶"
            rotulo="Tela cheia"
            ativo={telaCheia}
            onClick={alternarTelaCheia}
            aoDeslizar={(sentido) => (sentido === "direita" ? entrarTelaCheia() : sairTelaCheia())}
            aoSegurar={irOndeParei}
          />
          <BotaoDock
            icone="⋯"
            rotulo="Mais"
            ativo={painel === "mais" || painel === "grifos"}
            onClick={() => abrir("mais")}
            aoDeslizar={(sentido) => {
              const k = FUNDOS.findIndex((f) => f.id === prefs.fundo);
              const nova = FUNDOS[(k + (sentido === "direita" ? 1 : -1) + FUNDOS.length) % FUNDOS.length];
              mudarPrefs({ fundo: nova.id });
              setAviso({ texto: `Fundo: ${nova.nome}` });
            }}
            aoSegurar={() => {
              setPainel("grifos");
              setSelecao(null);
            }}
          />
        </div>
      </nav>

      <BarraOuvir ouvir={ouvir} dockVisivel={!escondido} painelAberto={!!painel} abrirAjustes={() => abrir("ouvir")} />
      <BolhaLerDaqui ouvir={ouvir} />

      {atalho !== null && (
        <IrParaArtigo
          inicial={atalho}
          lei={lei}
          artigos={artigos}
          original={original}
          sumula={sumula}
          aoComando={(id) => {
            setAtalho(null);
            pontoAntesDoAtalho.current = null;
            executarComando(id);
          }}
          aoPrever={(d) => irAoDestino(d, false)}
          aoIr={(d) => {
            setAtalho(null);
            pontoAntesDoAtalho.current = null;
            irAoDestino(d, true);
          }}
          aoIrLei={(l, d) => {
            setAtalho(null);
            pontoAntesDoAtalho.current = null;
            router.push(`${rotaDaLei(l)}#${d}`);
          }}
          aoFechar={fecharAtalho}
          aoBuscarTudo={(q) => {
            setAtalho(null);
            pontoAntesDoAtalho.current = null;
            setBuscaInicial(q);
            setPainel("buscar");
          }}
        />
      )}

      {painel && (
        <Folha
          titulo={
            painel === "navegar"
              ? ((sumula ? ABAS_SUMULAS : ABAS_LEIS).find(([id]) => id === abaNavegar)?.[1] ?? "")
              : { leis: "Leis", buscar: "Buscar", grifos: "Grifos", aa: "Leitura", mais: "Mais", navegar: "", ouvir: "Ouvir em voz alta" }[painel]
          }
          acoes={painel === "navegar" ? abasIcones : undefined}
          onFechar={fecharPainel}
        >
          {painel === "leis" && <PainelLeis atual={lei} posicoes={posicoes} />}
          {painel === "ouvir" && <AjustesOuvir ouvir={ouvir} sumula={sumula} fecharPainel={fecharPainel} />}
          {painel === "buscar" && (
            <PainelBusca
              lei={lei}
              artigos={artigos}
              original={original}
              inicial={buscaInicial}
              aoIr={(art) => {
                setPainel(null);
                setBuscaInicial("");
                setTimeout(() => irAoDestino(art, true), 50);
              }}
            />
          )}
          {painel === "navegar" && (
            <div className={styles.navegar}>
              {abaNavegar === "divisoes" && (
                <>
                  <input
                    className={styles.buscaNavegar}
                    type="search"
                    aria-label="Buscar nos títulos e no texto dos artigos"
                    placeholder={sumula ? "Buscar nas súmulas" : "Buscar nos títulos e no texto dos artigos"}
                    value={buscaTitulos}
                    onChange={(e) => setBuscaTitulos(e.target.value)}
                  />
                  {!sumula && !termoTitulos && (
                    <label className={styles.slide}>
                      <span className={styles.slideRotulo}>{ATE_NIVEL[nivelMax]}</span>
                      <input
                        type="range"
                        min={1}
                        max={5}
                        step={1}
                        value={nivelMax}
                        onChange={(e) => setNivelMax(Number(e.target.value))}
                        aria-label="Até que nível mostrar as divisões"
                        aria-valuetext={ATE_NIVEL[nivelMax]}
                      />
                    </label>
                  )}
                  {divisoesBuscadas.length > 0 && (
                    <>
                      {!sumula && !termoTitulos && (
                        <p className={styles.miuda}>
                          {divisoesMostradas.length} de {mapa.divisoes.length}
                        </p>
                      )}
                      <ol className={styles.divisoes}>
                        {divisoesBuscadas.map((d, n) => (
                          <li key={n} data-nivel={d.nivel}>
                            <button type="button" onClick={() => irNavegar(d.k)}>
                              <span>{d.rotulo}</span>
                              <em>{sumula ? resumo(artigos[d.k]?.[2] ?? "", 90) : artigos[d.k]?.[1]}</em>
                            </button>
                          </li>
                        ))}
                      </ol>
                    </>
                  )}
                  {termoTitulos && artigosComTermo.length > 0 && (
                    <>
                      <h3 className={styles.subtitulo}>Artigos com “{buscaTitulos.trim()}”</h3>
                      <ul className={styles.navegarLista}>
                        {artigosComTermo.map((a) => (
                          <li key={a.k}>
                            <button type="button" onClick={() => irNavegar(a.k)}>
                              <span>
                                <strong>{a.rotulo}</strong>
                                <span className={styles.navegarTexto}>{resumo(a.trecho, 120)}</span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  {!divisoesBuscadas.length && !artigosComTermo.length && (
                    <p className={styles.miuda}>
                      {termoTitulos
                        ? `Nada com “${buscaTitulos.trim()}”.`
                        : sumula
                          ? "Nenhuma súmula com texto nesta lista."
                          : "Esta lei não tem títulos nem capítulos."}
                    </p>
                  )}
                </>
              )}
              {abaNavegar === "prontos" &&
                (!prefs.prontos ? (
                  <p className={styles.miuda}>Os grifos prontos estão desligados. Ligue “Grifos prontos do Grifo” na Leitura para vê-los aqui.</p>
                ) : prontosPorTipo.length ? (
                  prontosPorTipo.map((g) => (
                    <section key={g.rotulo} className={styles.grupoCor}>
                      <h3 className={styles.grupoCorTitulo}>
                        <span className={styles.amostra} style={{ "--c": g.cor } as CSSProperties} />
                        {g.rotulo}
                        <em>
                          {g.ks.length} {sumula ? (g.ks.length === 1 ? "súmula" : "súmulas") : g.ks.length === 1 ? "artigo" : "artigos"}
                        </em>
                      </h3>
                      <ul className={styles.artigosDoGrupo}>
                        {g.ks.map((k) => (
                          <li key={k}>
                            <button type="button" onClick={() => irNavegar(k)} title={resumo(semRotulo(artigos[k]?.[2] ?? ""), 140)}>
                              {artigos[k]?.[1]}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))
                ) : (
                  <p className={styles.miuda}>{sumula ? "Estas súmulas não têm" : "Esta lei não tem"} grifos prontos no sistema de cores ativo.</p>
                ))}
              {abaNavegar === "grifos" &&
                (grifosAgrupados.length ? (
                  [...grifosPorCor].sort(([a], [b]) => ordemDaCor(sistema, a) - ordemDaCor(sistema, b)).map(([cor, lista]) => (
                    <GrupoCorGrifos key={cor} cor={cor} nome={rotuloDaCor(cor) || "Grifo"} lista={lista} artigos={artigos} aoIrPara={irNavegar} />
                  ))
                ) : (
                  <p className={styles.miuda}>Você ainda não grifou nada {sumula ? "nestas súmulas" : "nesta lei"}.</p>
                ))}
              {abaNavegar === "remissivo" &&
                (remissivo === null ? (
                  <p className="muted">Carregando o índice…</p>
                ) : remissivo === "sem" ? (
                  <p className={styles.miuda}>Este diploma não tem índice remissivo no Grifo.</p>
                ) : (
                  <>
                    <input
                      className={styles.buscaNavegar}
                      type="search"
                      aria-label="Buscar no índice remissivo"
                      placeholder="Palavra-chave"
                      value={buscaRemissivo}
                      onChange={(e) => setBuscaRemissivo(e.target.value)}
                    />
                    {coresDoRemissivo && coresDoRemissivo.size > 0 && (
                      <p className={styles.legendaRemissivo}>
                        <span className={styles.refGrifada} data-meu="1" style={{ "--c": sistema.cores[0]?.cor } as CSSProperties}>
                          art. 1
                        </span>{" "}
                        seu grifo ·{" "}
                        <span className={styles.refGrifada} style={{ "--c": sistema.cores[0]?.cor } as CSSProperties}>
                          art. 1
                        </span>{" "}
                        grifo pronto · a cor é a do grifo no artigo
                      </p>
                    )}
                    {remissivoFiltrado.length === 0 && buscaRemissivo.trim() ? (
                      <p className={styles.miuda}>Nada com “{buscaRemissivo.trim()}” no índice.</p>
                    ) : (
                      <dl className={styles.remissivoNavegar}>
                        {remissivoFiltrado.map((e) => (
                            <div key={e.palavra}>
                              <dt>{e.palavra}</dt>
                              {e.subitens.map((sub, n) => {
                                const id = artigoDaRef(sub.ref, idsDosArtigos);
                                const k = id ? artigos.findIndex((a) => a[0] === id) : -1;
                                const cores = (id && coresDoRemissivo?.get(id)) || [];
                                const principal = cores.find((c) => c.meu) ?? cores[0];
                                const nomesDasCores = cores.map((c) => `${c.rotulo} (${c.meu ? "seu grifo" : "grifo pronto"})`).join(", ");
                                return (
                                  <dd key={n}>
                                    {/* nas súmulas, o número vem antes do começo do enunciado */}
                                    {!sumula && sub.texto ? `${sub.texto}: ` : ""}
                                    {k >= 0 ? (
                                      // a prévia do artigo é o pop-up de link de artigo (data-lei/data-art), em qualquer página
                                      <a
                                        href={`#${artigos[k]![0]}`}
                                        data-lei={lei}
                                        data-art={artigos[k]![0]}
                                        className={principal ? styles.refGrifada : undefined}
                                        data-meu={principal?.meu ? "1" : undefined}
                                        style={principal ? ({ "--c": principal.cor } as CSSProperties) : undefined}
                                        aria-label={principal ? `${sub.ref} — grifado: ${nomesDasCores}` : undefined}
                                        onClick={(e) => { e.preventDefault(); irNavegar(k); }}
                                      >
                                        {sub.ref}
                                      </a>
                                    ) : (
                                      sub.ref
                                    )}
                                    {/* mais de uma cor no artigo: as outras em bolinhas, com o nome ao passar o mouse */}
                                    {cores.length > 1 && (
                                      <span className={styles.coresRef} aria-hidden>
                                        {cores.map((c) => (
                                          <span key={c.cor} data-meu={c.meu ? "1" : undefined} style={{ "--c": c.cor } as CSSProperties} title={`${c.rotulo} (${c.meu ? "seu grifo" : "grifo pronto"})`} />
                                        ))}
                                      </span>
                                    )}
                                    {sumula && sub.texto ? ` — ${sub.texto}` : ""}
                                  </dd>
                                );
                              })}
                            </div>
                          ))}
                      </dl>
                    )}
                  </>
                ))}
              {abaNavegar === "erros" && errados.length > 0 && (
                <label className={styles.slide}>
                  <span className={styles.slideRotulo}>
                    A partir de <strong>{minErros}</strong> {minErros === 1 ? "erro" : "erros"}
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={Math.max(1, ...errados.map((a) => a.erros))}
                    step={1}
                    value={Math.min(minErros, Math.max(1, ...errados.map((a) => a.erros)))}
                    onChange={(e) => setMinErros(Number(e.target.value))}
                    aria-label="Mostrar a partir de quantos erros"
                    aria-valuetext={`${minErros} ${minErros === 1 ? "erro" : "erros"} ou mais`}
                  />
                </label>
              )}
              {abaNavegar === "erros" &&
                (errados.length ? (
                  errosMostrados.length ? (
                    <>
                      <p className={styles.miuda}>
                        {errosMostrados.length} de {errados.length} {sumula ? (errados.length === 1 ? "súmula" : "súmulas") : errados.length === 1 ? "artigo" : "artigos"}
                      </p>
                      <ul className={styles.navegarLista}>
                        {errosMostrados.map((a) => {
                          const k = artigos.findIndex((x) => x[0] === idDoErro(lei, a.artigo));
                          return (
                            <li key={a.artigo}>
                              <button type="button" disabled={k < 0} onClick={() => irNavegar(k)}>
                                <span>
                                  <strong>{artigos[k]?.[1] ?? (sumula ? `Súmula ${a.artigo}` : `Art. ${a.artigo}`)}</strong>
                                  <span className={styles.navegarTexto}>
                                    {a.erros} {a.erros === 1 ? "erro" : "erros"} em {a.erros + a.acertos} {a.erros + a.acertos === 1 ? "tentativa" : "tentativas"}
                                  </span>
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  ) : (
                    <p className={styles.miuda}>Nenhum artigo com {minErros} {minErros === 1 ? "erro" : "erros"} ou mais.</p>
                  )
                ) : (
                  <p className={styles.miuda}>Nenhum erro registrado {sumula ? "nestas súmulas" : "nesta lei"}. Os erros do quiz, dos simulados e das objetivas aparecem aqui.</p>
                ))}
            </div>
          )}
          {painel === "aa" && (
            <div className={styles.grupos}>
              <fieldset>
                <legend>Letra</legend>
                <div className={styles.chips}>
                  {(
                    [
                      ["sans", "Sem serifa"],
                      ["serif", "Serifada"],
                      ["mono", "Monoespaçada"],
                    ] as const
                  ).map(([id, n]) => (
                    <button key={id} type="button" aria-pressed={prefs.fonte === id} data-fonte-amostra={id} onClick={() => mudarPrefs({ fonte: id })}>
                      {n}
                    </button>
                  ))}
                </div>
                <label>
                  Tamanho · {prefs.tamanho}px
                  <input type="range" min={14} max={28} value={prefs.tamanho} onChange={(e) => mudarPrefs({ tamanho: Number(e.target.value) })} />
                </label>
                <label>
                  Espaçamento lateral · <span ref={valorLateralRef}>padrão · {larguraPadrao}px</span>
                  <input
                    ref={sliderRef}
                    type="range"
                    min={0}
                    max={480}
                    step={1}
                    defaultValue={larguraPadrao}
                    onInput={(e) => {
                      // só o elemento raiz muda enquanto o controle é arrastado: o leitor não é redesenhado a cada passo
                      const v = Number(e.currentTarget.value);
                      raizRef.current?.setAttribute("data-largura", "livre");
                      raizRef.current?.style.setProperty("--leitor-laterais", `${v}px`);
                      ajustarLargura();
                      if (valorLateralRef.current) valorLateralRef.current.textContent = `${v}px`;
                    }}
                    onPointerUp={(e) => mudarPrefs({ largura: "livre", laterais: Number(e.currentTarget.value) })}
                    onKeyUp={(e) => mudarPrefs({ largura: "livre", laterais: Number(e.currentTarget.value) })}
                  />
                  <span className={styles.miuda}>
                    O padrão é o número mostrado. Zere para o texto encostar nas laterais da tela.{" "}
                    {prefs.largura === "livre" && (
                      <button type="button" className={styles.link} onClick={() => mudarPrefs({ largura: "padrao" })}>
                        voltar ao padrão
                      </button>
                    )}
                  </span>
                </label>
                <label>
                  Entrelinha · {prefs.entrelinha.toFixed(1)}
                  <input type="range" min={1.3} max={2.4} step={0.1} value={prefs.entrelinha} onChange={(e) => mudarPrefs({ entrelinha: Number(e.target.value) })} />
                </label>
              </fieldset>
              <fieldset>
                <legend>Fundo</legend>
                <div className={styles.chips}>
                  {FUNDOS.map((f) => (
                    <button key={f.id} type="button" data-fundo-amostra={f.id} aria-pressed={prefs.fundo === f.id} onClick={() => mudarPrefs({ fundo: f.id })}>
                      {f.nome}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend>Cor do texto</legend>
                <div className={styles.chips}>
                  {(Object.keys(CORES_TEXTO) as CorTexto[]).map((c) => (
                    <button key={c} type="button" aria-pressed={prefs.corTexto === c} onClick={() => mudarPrefs({ corTexto: c })}>
                      {CORES_TEXTO[c].nome}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend>Mostrar no texto</legend>
                <div className={styles.opcoesCartao}>
                  {FILTROS.map((f) => (
                    <OpcaoCartao key={f.id} tipo="radio" nome="filtro-texto" marcada={prefs.filtro === f.id} titulo={f.titulo} dica={f.dica} onChange={() => mudarPrefs({ filtro: f.id })} />
                  ))}
                </div>
                {(filtroEfetivo === "grifos" || filtroEfetivo === "automaticos") && coresDoFiltro.length > 1 && (
                  <div className={styles.chips} role="group" aria-label="Só os grifos das cores escolhidas">
                    <button type="button" aria-pressed={!corFiltro} onClick={() => mudarPrefs({ filtroCores: [] })}>
                      Todas as cores
                    </button>
                    {coresDoFiltro.map((c) => (
                      <button key={c.cor} type="button" aria-pressed={coresEscolhidas.includes(c.cor)} onClick={() => alternarCorFiltro(c.cor)}>
                        <span className={styles.amostraCor} style={{ background: c.cor }} aria-hidden />
                        {c.rotulo}
                      </button>
                    ))}
                  </div>
                )}
                {prefs.filtro === "grifos" && !marcas.length && <p className={styles.miuda}>Você ainda não grifou nada nesta lei: o texto aparece inteiro.</p>}
                {prefs.filtro === "erros" && !porArtigo.size && <p className={styles.miuda}>Nenhum erro nesta lei ainda: o texto aparece inteiro.</p>}
                {prefs.filtro === "automaticos" && !prefs.prontos && (
                  <p className={styles.miuda}>Os grifos automáticos estão desligados: ligue “Grifos prontos do Grifo” para vê-los.</p>
                )}
              </fieldset>
              <fieldset>
                <legend>Marcações do Grifo</legend>
                <div className={styles.opcoesCartao}>
                  <OpcaoCartao
                    tipo="checkbox"
                    marcada={prefs.prontos}
                    titulo="Grifos prontos do Grifo"
                    dica="Temas de prova destacados pelo Grifo. Não são seus grifos."
                    onChange={(v) => mudarPrefs({ prontos: v })}
                  />
                  <OpcaoCartao
                    tipo="checkbox"
                    marcada={prefs.erros}
                    titulo={sumula ? "Marcar as súmulas em que mais errei" : "Marcar os artigos em que mais errei"}
                    dica={`Um ● ao lado ${sumula ? "da súmula" : "do artigo"} para cada erro (até 5): vermelho, alto; âmbar, médio; cinza, baixo.`}
                    onChange={(v) => mudarPrefs({ erros: v })}
                  />
                </div>
              </fieldset>
              <fieldset>
                <legend>{sumula ? "Texto das súmulas" : "Texto da lei"}</legend>
                <div className={styles.opcoesCartao}>
                  {!sumula && (
                    <OpcaoCartao
                      tipo="checkbox"
                      marcada={prefs.original}
                      titulo="Redação original"
                      dica="O texto como está no Planalto: “Art. 1o” e “freqüente”, sem as correções do Grifo."
                      onChange={(v) => mudarPrefs({ original: v })}
                    />
                  )}
                  <OpcaoCartao
                    tipo="checkbox"
                    marcada={prefs.revogados}
                    titulo={sumula ? "Súmulas superadas e canceladas" : "Texto revogado e redações anteriores"}
                    dica={sumula ? "Mostra as súmulas que já não valem. Por padrão ficam fora da leitura." : "Mostra o que já não vale e as redações antigas de cada artigo."}
                    onChange={(v) => mudarPrefs({ revogados: v })}
                  />
                  <OpcaoCartao
                    tipo="checkbox"
                    marcada={prefs.vide}
                    titulo="“Vide” (remissões entre parênteses)"
                    dica="Notas como “(Vide EC 132/2023)” e “(Vide art. 5º…)”, que remetem a outro dispositivo. Não são as de revogação."
                    onChange={(v) => mudarPrefs({ vide: v })}
                  />
                  {!sumula && (
                    <OpcaoCartao
                      tipo="checkbox"
                      marcada={prefs.anotacoes}
                      titulo="Anotações de redação"
                      dica="“Redação dada pela Lei…”, “Incluído…” e “Revogado…”, abaixo de cada artigo."
                      onChange={(v) => mudarPrefs({ anotacoes: v })}
                    />
                  )}
                  {sumula && (
                    <OpcaoCartao
                      tipo="checkbox"
                      marcada={prefs.informacoes}
                      titulo="Informações adicionais"
                      dica="Julgamento, fonte, ramo, jurisprudência selecionada, observações, referência legislativa e precedentes de cada súmula."
                      onChange={(v) => mudarPrefs({ informacoes: v })}
                    />
                  )}
                  {!sumula && (
                    <OpcaoCartao
                      tipo="checkbox"
                      marcada={prefs.destino === "planalto"}
                      titulo="Abrir referências no texto do Planalto"
                      dica="Os links de “art. N” vão para o Planalto, e não para a lei seca do Grifo."
                      onChange={(v) => mudarPrefs({ destino: v ? "planalto" : "grifo" })}
                    />
                  )}
                </div>
              </fieldset>
            </div>
          )}
          {painel === "grifos" && (
            <PainelGrifos
              legendas={legendas}
              escolher={(id) => mudarLegendas({ ...legendas, porLei: { ...legendas.porLei, [lei]: id } })}
              sistema={sistema}
              marcas={marcas}
              rotuloDaCor={rotuloDaCor}
              prontos={prefs.prontos}
              mudarProntos={(v) => mudarPrefs({ prontos: v })}
              editar={setEditandoSistema}
              aoIr={(m) => {
                setPainel(null);
                setTimeout(() => document.querySelector(`mark[data-m="${m.id}"]`)?.scrollIntoView({ block: "center", behavior: "instant" }), 50);
              }}
              remover={(m) => apagarGrifos((x) => grupoDe(x) === grupoDe(m))}
            />
          )}
          {painel === "mais" && (
            <div className={styles.grupos}>
              <fieldset>
                <legend>Tela</legend>
                <OpcaoCartao
                  tipo="checkbox"
                  marcada={prefs.barraNavegador}
                  titulo="Barra de rolagem do navegador"
                  dica="Escondida na leitura: o slide da direita faz esse papel. Ligue para ver também a barra do navegador."
                  onChange={(v) => mudarPrefs({ barraNavegador: v })}
                />
              </fieldset>
              <fieldset>
                <legend>Slide de artigos</legend>
                <div className={styles.opcoesCartao}>
                  {LADOS_TRILHO.map(([l, titulo, dica]) => (
                    <OpcaoCartao key={l} tipo="radio" nome="lado-trilho" marcada={prefs.trilhoLado === l} titulo={titulo} dica={dica} onChange={() => mudarPrefs({ trilhoLado: l })} />
                  ))}
                </div>
                <p className={styles.miuda}>Também dá para arrastar: o botão do slide com o clique direito (no celular, segure o botão) e solte perto da borda.</p>
              </fieldset>
              <fieldset>
                <legend>Grifos e cores</legend>
                <button type="button" className="btn btn-sm btn-gold" onClick={() => setPainel("grifos")}>
                  Meus grifos e sistemas de cores
                </button>
              </fieldset>
              {!sumula && (
              <fieldset>
                <legend>Linha do tempo</legend>
                <label>
                  Ver a lei como estava em
                  <input type="date" value={data} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setData(e.target.value)} />
                </label>
                {Object.entries(datas ?? {}).map(([id, d]) =>
                  d?.locais ? (
                    <label key={id}>
                      Vigência da {d.nome ?? id} onde o fato ocorreu
                      <select
                        value={prefs.locais[id] && d.locais[prefs.locais[id]] ? prefs.locais[id] : (d.padrao ?? "")}
                        onChange={(e) => mudarPrefs({ locais: { ...prefs.locais, [id]: e.target.value } })}
                      >
                        {Object.entries(d.locais).map(([k, l]) => (
                          <option key={k} value={k}>
                            {l.rotulo}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null,
                )}
                <p className={styles.miuda}>
                  Por exemplo, a data do fato. Reconstruído das anotações do compilado do Planalto: redações intermediárias omitidas, suspensões do STF e vetos
                  derrubados não aparecem.
                </p>
              </fieldset>
              )}
              <fieldset>
                <legend>Levar a lei</legend>
                <div className={styles.levarGrade}>
                  <button type="button" className={styles.levarAcao} onClick={() => gerarLink(false)}>
                    <ConteudoAcao titulo="Compartilhar" dica="Link da lei; seus grifos entram se você quiser">
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
                    </ConteudoAcao>
                  </button>
                  <button
                    type="button"
                    className={styles.levarAcao}
                    onClick={() => {
                      setPainel(null);
                      setTimeout(() => window.print(), 100);
                    }}
                  >
                    <ConteudoAcao titulo="Imprimir / PDF" dica="Abre a impressão; escolha salvar como PDF">
                      <path d="M7 9V3h10v6" />
                      <rect x="3" y="9" width="18" height="8" rx="2" />
                      <path d="M7 14h10v7H7z" />
                    </ConteudoAcao>
                  </button>
                  <button type="button" className={styles.levarAcao} onClick={() => abrirRef.current?.click()}>
                    <ConteudoAcao titulo="Abrir arquivo .grifo.json" dica="Recebido de alguém; só abre se for desta lei">
                      <path d="M12 3v12M7 10l5 5 5-5" />
                      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                    </ConteudoAcao>
                  </button>
                  <input
                    ref={abrirRef}
                    type="file"
                    accept=".json,application/json"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f) abrirArquivo(f);
                    }}
                  />
                  <Link href="/vademecum/" className={styles.levarAcao}>
                    <ConteudoAcao titulo="Vade Mecum" dica="Monte uma coletânea de leis e artigos">
                      <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" />
                      <path d="M5 17a3 3 0 0 1 3-3h11" />
                    </ConteudoAcao>
                  </Link>
                  <Link href="/leis/minha-leitura/" className={styles.levarAcao}>
                    <ConteudoAcao titulo="Minha leitura" dica="Os artigos em que você mais erra">
                      <path d="M4 19V5M4 19h16" />
                      <path d="M8 15l3-4 3 2 5-6" />
                    </ConteudoAcao>
                  </Link>
                </div>
                {erroArquivo && (
                  <p className={styles.miuda} role="alert">
                    {erroArquivo}
                  </p>
                )}
              </fieldset>
              <fieldset>
                <legend>Artigos em que mais errei</legend>
                {errados.length ? (
                  <ol className={styles.errados}>
                    {errados.slice(0, 12).map((a) => {
                      const id = idDoErro(lei, a.artigo);
                      const rotulo = artigos.find((x) => x[0] === id)?.[1] ?? `Art. ${a.artigo.replace("-", "-")}`;
                      return (
                        <li key={id} data-nivel={a.nivel}>
                          <button
                            type="button"
                            onClick={() => {
                              setPainel(null);
                              setTimeout(() => irParaArtigo(id, true), 50);
                            }}
                          >
                            <strong>{rotulo}</strong>
                            <span>
                              {a.erros} {a.erros === 1 ? "erro" : "erros"} em {a.erros + a.acertos} {a.erros + a.acertos === 1 ? "tentativa" : "tentativas"}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <p className={styles.miuda}>Nenhum erro registrado {sumula ? "nestas súmulas" : "nesta lei"}. Os erros do quiz, dos simulados e das objetivas aparecem aqui.</p>
                )}
                <div className={styles.chips}>
                  <Link href="/leis/minha-leitura/">Minha leitura (todas as leis)</Link>
                </div>
              </fieldset>
            </div>
          )}
        </Folha>
      )}

      {selecao && !marcador.ativo && (
        <div
          ref={flutuanteRef}
          className={styles.flutuante}
          style={{ left: selecao.x, top: selecao.topo }}
          role="toolbar"
          aria-label="Grifar trecho"
        >
          {sistema.cores.map((c) => (
            <button
              key={c.cor + c.rotulo}
              type="button"
              style={{ "--c": c.cor } as CSSProperties}
              title={c.rotulo}
              aria-label={`Grifar como ${c.rotulo || c.cor}`}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => {
                criarMarca(selecao.segmentos, c.cor);
                setSelecao(null);
              }}
            />
          ))}
          <button
            type="button"
            className={styles.apagarSelecao}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => selecao && apagarTrechos(selecao.segmentos)}
            aria-label="Apagar os grifos desta seleção"
            title="Apagar os grifos desta seleção"
          >
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
            </svg>
          </button>
          <button
            type="button"
            className={styles.nota}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              const m = criarMarca(selecao.segmentos, "nota");
              if (m) setAberta({ id: m.id, x: selecao.x, y: selecao.y });
              setSelecao(null);
            }}
            aria-label="Anotar sem cor"
          >
            ✎
          </button>
        </div>
      )}

      {regra && (
        <div
          className={styles.regra}
          style={{ left: Math.max(8, Math.min(regra.x + 12, window.innerWidth - 336)), top: Math.min(regra.y + 6, window.innerHeight - 170) }}
          role="dialog"
          aria-label={`Grifo pronto: ${regra.rotulo}`}
        >
          {regra.rotulo.split("\n").map((r) => (
            <strong key={r}>{r}</strong>
          ))}
          {regra.nota && <span>{regra.nota}</span>}
          <small>{regra.essencial ? "Essencial: este dispositivo já caiu em prova." : "Geral: ainda não caiu em prova."}</small>
        </div>
      )}

      {aberta && marcaAberta && (
        <div
          ref={popoverRef}
          className={styles.popover}
          style={{ left: aberta.x, top: aberta.y + 8, "--c": marcaAberta.cor === "nota" ? "var(--leitor-muted)" : marcaAberta.cor } as CSSProperties}
          role="dialog"
          aria-label="Grifo"
        >
          <span className={styles.grifoRotulo}>
            {[rotuloDaCor(marcaAberta.cor) || "Grifo", artigos.find((a) => a[0] === marcaAberta.disp?.split(".")[0])?.[1]].filter(Boolean).join(" · ")}
          </span>
          <p className={styles.grifoCitacao}>“{textoDoGrifo(marcaAberta)}”</p>
          <div className={styles.grifoCores}>
            {sistema.cores.map((c) => (
              <button
                key={c.cor + c.rotulo}
                type="button"
                style={{ "--c": c.cor } as CSSProperties}
                aria-pressed={marcaAberta.cor === c.cor}
                title={c.rotulo}
                aria-label={c.rotulo}
                onClick={() => salvarMarcas(marcas.map((m) => (m.id === marcaAberta.id ? { ...m, cor: c.cor } : m)))}
              />
            ))}
          </div>
          <textarea
            defaultValue={marcaAberta.nota ?? ""}
            placeholder="Anotação"
            rows={3}
            onBlur={(e) => salvarMarcas(marcas.map((m) => (m.id === marcaAberta.id ? { ...m, nota: e.target.value || undefined } : m)))}
          />
          <div className={styles.grifoAcoes}>
            <button
              type="button"
              className={`${styles.grifoAcao} ${styles.grifoPrincipal}`}
              onClick={() => copiarMarca(marcaAberta)}
              onContextMenu={(e) => {
                e.preventDefault();
                copiarMarca(marcaAberta, true);
              }}
              title="Clique com o botão direito para copiar com o nome da lei"
            >
              <svg viewBox="0 0 24 24" aria-hidden>
                <rect x="9" y="9" width="11" height="11" rx="2" />
                <path d="M5 15V5a2 2 0 0 1 2-2h10" />
              </svg>
              Copiar
            </button>
            <button type="button" className={styles.grifoAcao} onClick={() => iniciarEdicao(marcaAberta)}>
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d="M4 20h4L19 9l-4-4L4 16v4z" />
                <path d="M13 6l4 4" />
              </svg>
              Editar
            </button>
            <button
              type="button"
              className={`${styles.grifoAcao} ${styles.grifoPerigo}`}
              onClick={() => {
                apagarGrifos((m) => grupoDe(m) === grupoDe(marcaAberta));
                setAberta(null);
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
              </svg>
              Apagar
            </button>
            <button type="button" className={styles.grifoAcao} onClick={() => setAberta(null)}>
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
              Fechar
            </button>
          </div>
        </div>
      )}

      {citado && (
        <div
          ref={cartaoRef}
          className={styles.citadoPor}
          data-citado-por
          role="tooltip"
          onPointerEnter={() => window.clearTimeout(timerCitado.current)}
          onPointerLeave={(e) => {
            // indo para a prévia do artigo citado, o cartão continua aberto
            if ((e.relatedTarget as Element | null)?.closest?.(PREVIA)) return;
            window.clearTimeout(timerCitado.current);
            timerCitado.current = window.setTimeout(() => setCitado(null), 250);
          }}
        >
          <span className={styles.grifoRotulo}>Citado por · {citado.rotulo}</span>
          {!citacoes ? (
            <p>Carregando…</p>
          ) : (
            <ol>
              {(citacoes.citacoes[`${citado.lei}|${citado.art}`] ?? []).slice(0, 12).map((x) => (
                <li key={`${x.d}|${x.a}`}>
                  <a
                    href={`${rotaDaLei(x.d)}#${x.a}`}
                    data-lei={x.d}
                    data-art={x.a}
                    // o que este artigo cita: a prévia destaca o link da citação
                    data-cita={`${citado.lei}|${citado.art}`}
                    onClick={(e) => {
                      // mesma lei: o salto é feito aqui, com o mesmo destaque dos links do texto
                      if (x.d !== lei) return;
                      e.preventDefault();
                      setCitado(null);
                      history.pushState(null, "", `#${x.a}`);
                      irParaLink(x.a);
                    }}
                  >
                    <strong>{x.r}</strong>
                    <span>{citacoes.nomes[x.d] ?? x.d}</span>
                  </a>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
      {ajuste && (
        <div className={styles.ajusteGrifo} role="region" aria-label="Ajustar o tamanho do grifo">
          <span>Arraste a seleção para mudar o tamanho do grifo.</span>
          <div className={styles.ajusteAcoes}>
            <button type="button" className={`${styles.grifoAcao} ${styles.grifoPrincipal}`} onClick={concluirAjuste}>
              Concluir
            </button>
            <button type="button" className={styles.grifoAcao} onClick={cancelarAjuste}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {compartilhar && (
        <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="compartilhar-titulo">
          <div className={styles.modalCaixa}>
            <h2 id="compartilhar-titulo">Compartilhar {nome}</h2>
            <label className={styles.opcao}>
              <input type="checkbox" checked={compartilhar.comMarcas} disabled={!marcas.length} onChange={(e) => gerarLink(e.target.checked)} /> Incluir meus{" "}
              {marcas.length} grifo(s) e anotações
            </label>
            <input readOnly value={compartilhar.link} onFocus={(e) => e.target.select()} aria-label="Link" />
            <p className="muted">
              {compartilhar.link.length > LIMITE_LINK
                ? `O link ficou com ${Math.round(compartilhar.link.length / 1024)} KB, grande demais para apps de mensagem. Baixe o arquivo e envie-o; quem receber usa "Abrir arquivo .grifo.json" na lei.`
                : "O conteúdo vai no próprio link (depois do #) e não passa por nenhum servidor. Quem abrir o link vê as anotações."}
            </p>
            <div className={styles.acoes}>
              <button type="button" className="btn btn-sm btn-gold" disabled={compartilhar.link.length > LIMITE_LINK} onClick={() => navigator.clipboard?.writeText(compartilhar.link)}>
                Copiar link
              </button>
              {compartilhar.carga && (
                <button type="button" className={compartilhar.link.length > LIMITE_LINK ? "btn btn-sm btn-gold" : "btn btn-sm"} onClick={baixarArquivo}>
                  Baixar .grifo.json
                </button>
              )}
              <button type="button" className="btn btn-sm" onClick={() => setCompartilhar(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmacao && (
        <div className={styles.modal} role="alertdialog" aria-modal="true" aria-labelledby="apagar-titulo" aria-describedby="apagar-texto">
          <div className={styles.modalCaixa}>
            <h2 id="apagar-titulo">{confirmacao.titulo}</h2>
            <p id="apagar-texto">{confirmacao.texto}</p>
            <div className={styles.acoes}>
              <button type="button" className="btn btn-sm" onClick={() => setConfirmacao(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className={styles.btnPerigo}
                onClick={() => {
                  confirmacao.fazer();
                  setConfirmacao(null);
                }}
              >
                {confirmacao.rotulo}
              </button>
            </div>
          </div>
        </div>
      )}

      {editandoSistema && (
        <EditorSistema
          sistema={editandoSistema}
          copiaveis={[...SISTEMAS_PRONTOS, ...legendas.meus.filter((x) => x.id !== editandoSistema.id)]}
          onCancelar={() => setEditandoSistema(null)}
          onSalvar={(s) => {
            const meus = legendas.meus.some((x) => x.id === s.id) ? legendas.meus.map((x) => (x.id === s.id ? s : x)) : [...legendas.meus, s];
            mudarLegendas({ ...legendas, ativo: s.id, meus, porLei: { ...legendas.porLei, [lei]: s.id } });
            setEditandoSistema(null);
          }}
          onExcluir={() => {
            mudarLegendas({ ...legendas, ativo: "materias", meus: legendas.meus.filter((x) => x.id !== editandoSistema.id) });
            setEditandoSistema(null);
          }}
        />
      )}

      {aviso && (
        <div className={styles.toast} role="status">
          {aviso.texto}
          {aviso.acao && (
            <button
              type="button"
              className={styles.link}
              onClick={() => {
                aviso.acao!.fazer();
                setAviso(null);
              }}
            >
              {aviso.acao.rotulo}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

type Sentido = "direita" | "esquerda";
const DISTANCIA_SWIPE = 36;
const PASSO_TEXTO_PX = 36;
const TEMPO_SEGURAR = 500;

function tamanhoComPasso(atual: number, dx: number) {
  return Math.min(28, Math.max(14, atual + Math.trunc(dx / PASSO_TEXTO_PX)));
}

export function BotaoDock({
  icone,
  rotulo,
  ativo,
  destaque,
  onClick,
  aoDeslizar,
  aoSegurar,
  previa,
}: {
  icone: React.ReactNode;
  rotulo: string;
  ativo: boolean;
  destaque?: boolean;
  onClick: () => void;
  aoDeslizar?: (sentido: Sentido, dx: number) => void;
  aoSegurar?: () => void;
  previa?: (dx: number) => { texto: string; tamanho: number; rotulo: string } | null;
}) {
  const inicio = useRef<{ x: number; y: number } | null>(null);
  const eixo = useRef<"x" | "y" | null>(null);
  const deslizou = useRef(false);
  const segurou = useRef(false);
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [arrasto, setArrasto] = useState<number | null>(null);
  const cancelarSegurar = () => {
    if (relogio.current) clearTimeout(relogio.current);
    relogio.current = null;
  };
  const pv = arrasto !== null && previa ? previa(arrasto) : null;
  return (
    <button
      type="button"
      className={`${styles.botaoDock} ${destaque ? styles.botaoGrifar : ""}`}
      aria-pressed={ativo}
      onPointerDown={(e) => {
        inicio.current = { x: e.clientX, y: e.clientY };
        eixo.current = null;
        deslizou.current = false;
        segurou.current = false;
        cancelarSegurar();
        if (aoSegurar)
          relogio.current = setTimeout(() => {
            relogio.current = null;
            segurou.current = true;
            inicio.current = null;
            setArrasto(null);
            aoSegurar();
          }, TEMPO_SEGURAR);
      }}
      onPointerMove={(e) => {
        const i = inicio.current;
        if (!i) return;
        const dx = e.clientX - i.x;
        const dy = e.clientY - i.y;
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) cancelarSegurar();
        if (!eixo.current && (Math.abs(dx) >= 12 || Math.abs(dy) >= 12)) eixo.current = Math.abs(dx) > Math.abs(dy) * 1.5 ? "x" : "y";
        if (previa && eixo.current === "x") setArrasto(dx);
      }}
      onPointerUp={(e) => {
        const i = inicio.current;
        inicio.current = null;
        cancelarSegurar();
        setArrasto(null);
        if (!i || !aoDeslizar || eixo.current !== "x") return;
        const dx = e.clientX - i.x;
        if (Math.abs(dx) < DISTANCIA_SWIPE) return;
        deslizou.current = true;
        aoDeslizar(dx > 0 ? "direita" : "esquerda", dx);
      }}
      onPointerCancel={() => {
        inicio.current = null;
        cancelarSegurar();
        setArrasto(null);
      }}
      onContextMenu={aoSegurar ? (e) => e.preventDefault() : undefined}
      onClick={() => {
        if (segurou.current) return void (segurou.current = false);
        if (deslizou.current) return void (deslizou.current = false);
        onClick();
      }}
    >
      <span aria-hidden className={styles.icone}>
        {icone}
      </span>
      <span>{rotulo}</span>
      {pv && (
        <span className={styles.previa} aria-hidden>
          <span className={styles.previaTexto} style={{ fontSize: `${pv.tamanho}px` }}>
            {pv.texto}
          </span>
          <span className={styles.previaRotulo}>{pv.rotulo}</span>
        </span>
      )}
    </button>
  );
}

/** Conteúdo de uma ação de "Levar a lei": ícone, título e uma linha dizendo o que ela faz. */
function ConteudoAcao({ titulo, dica, children }: { titulo: string; dica: string; children: React.ReactNode }) {
  return (
    <>
      <svg className={styles.levarIcone} viewBox="0 0 24 24" aria-hidden>
        {children}
      </svg>
      <span className={styles.levarTexto}>
        <strong>{titulo}</strong>
        <small>{dica}</small>
      </span>
    </>
  );
}

export function Folha({ titulo, onFechar, acoes, children }: { titulo: string; onFechar: () => void; acoes?: React.ReactNode; children: React.ReactNode }) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [onFechar]);
  const { folha, veu, alca } = useArrastarParaFechar(onFechar);
  return (
    <>
      <div ref={veu} className={styles.veu} onClick={onFechar} aria-hidden />
      <section ref={folha} className={styles.folhaPainel} role="dialog" aria-label={titulo || "Navegação"}>
        <header className={styles.folhaTopo} {...alca}>
          {titulo && <h2>{titulo}</h2>}
          {acoes && <div className={styles.folhaAcoes}>{acoes}</div>}
          <button type="button" className={styles.fechar} onClick={onFechar} aria-label="Fechar">
            ✕
          </button>
        </header>
        <div className={styles.folhaCorpo}>{children}</div>
      </section>
    </>
  );
}

/**
 * No celular, a barrinha do topo da folha (e o topo todo, fora os botões) arrasta a folha para baixo: solta além de
 * um quarto da altura, ou num puxão rápido, a folha desce e fecha; antes disso, volta ao lugar. No computador a folha
 * fica ao lado, sem a barrinha, e o arrasto não vale.
 */
function useArrastarParaFechar(fechar: () => void) {
  const folha = useRef<HTMLElement>(null);
  const veu = useRef<HTMLDivElement>(null);
  const toque = useRef<{ id: number; y: number; t: number; dy: number } | null>(null);
  const mover = (dy: number, animar: boolean) => {
    const f = folha.current;
    if (!f) return;
    f.style.transition = animar ? "transform 0.18s ease-out" : "none";
    f.style.transform = dy ? `translateY(${dy}px)` : "";
    if (veu.current) {
      veu.current.style.transition = animar ? "opacity 0.18s ease-out" : "none";
      veu.current.style.opacity = dy ? String(Math.max(0, 1 - dy / f.offsetHeight)) : "";
    }
  };
  const alca = {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (window.matchMedia("(min-width: 900px)").matches || (e.pointerType === "mouse" && e.button !== 0)) return;
      if ((e.target as Element).closest("button, a, input, select, textarea, [role='tab']")) return;
      toque.current = { id: e.pointerId, y: e.clientY, t: performance.now(), dy: 0 };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      const t = toque.current;
      if (!t || t.id !== e.pointerId) return;
      t.dy = Math.max(0, e.clientY - t.y);
      mover(t.dy, false);
    },
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
      const t = toque.current;
      if (!t || t.id !== e.pointerId) return;
      toque.current = null;
      const altura = folha.current?.offsetHeight ?? 1;
      const velocidade = t.dy / Math.max(1, performance.now() - t.t);
      if (t.dy > altura / 4 || (t.dy > 30 && velocidade > 0.6)) {
        mover(altura, true);
        window.setTimeout(fechar, 180);
      } else mover(0, true);
    },
    onPointerCancel: () => {
      toque.current = null;
      mover(0, true);
    },
  };
  return { folha, veu, alca };
}

interface PontoTrilho {
  k: number;
  /** "" = anotação sem cor */
  cor: string;
  tipo: "marca" | "estrela" | "pronto" | "erro";
}
interface FaixaTrilho {
  de: number;
  ate: number;
  cor: string;
  rotulo: string;
}
interface Detalhe {
  cor: string;
  texto: string;
}
const NOMES_MODO: Record<Modo, string> = { rapido: "Rápido", fino: "Artigo a artigo", marcas: "Grifos" };
const ORDEM_MODOS: Modo[] = ["marcas", "fino", "rapido"];
const vibrar = () => {
  try {
    navigator.vibrate?.(6);
  } catch {}
};
/** o que cada parada do slide de divisões mostra (até o nível indicado: 0 partes, 1 livros, 2 títulos, 3 capítulos, 4 seções) */
const ATE_NIVEL: Record<number, string> = { 1: "Até livros", 2: "Até títulos", 3: "Até capítulos", 4: "Até seções", 5: "Tudo" };
/** Os grifos de uma cor, na aba "Meus grifos": o nome da cor, quantos são, e o caminho até cada um. */
function GrupoCorGrifos({
  cor,
  nome,
  lista,
  artigos,
  aoIrPara,
}: {
  cor: string;
  nome: string;
  lista: GrupoGrifo[];
  artigos: ArtigoTexto[];
  aoIrPara: (k: number, marcaId?: string) => void;
}) {
  return (
    <section className={styles.grupoCor}>
      <h3 className={styles.grupoCorTitulo}>
        <span className={styles.amostra} style={{ "--c": cor === "nota" ? "transparent" : cor } as CSSProperties} />
        {nome}
        <em>{lista.length}</em>
      </h3>
      <ul className={styles.navegarLista}>
        {lista.map((g) => (
          <li key={g.primeiroId}>
            <button type="button" onClick={() => aoIrPara(g.k, g.primeiroId)}>
              <span>
                <strong>{artigos[g.k]?.[1]}</strong>
                <span className={styles.navegarTexto}>“{resumo(g.texto, 120)}”</span>
                {g.partes > 1 && <small>em {g.partes} parágrafos</small>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

const semAcentoBusca = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
/** Os grifos do usuário por grupo: uma seleção que atravessa parágrafos é um grifo só, com o texto das partes. */
function agruparGrifos(ms: Marcacao[]): { primeiro: Marcacao; texto: string; partes: number }[] {
  const grupos = new Map<string, Marcacao[]>();
  for (const m of ms) grupos.set(grupoDe(m), [...(grupos.get(grupoDe(m)) ?? []), m]);
  return [...grupos.values()].map((ps) => ({ primeiro: ps[0]!, texto: ps.map((p) => p.exato).join(" […] "), partes: ps.length }));
}
const resumo = (t: string, n = 90) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);
/** a posição da cor no sistema de cores (os grupos de grifos seguem a ordem da legenda; cores de fora vão para o fim) */
const ordemDaCor = (s: { cores: { cor: string }[] }, cor: string) => {
  const k = s.cores.findIndex((c) => c.cor.toLowerCase() === cor.toLowerCase());
  return k < 0 ? s.cores.length + (cor === "nota" ? 1 : 0) : k;
};
const semRotulo = (texto: string) => texto.replace(/^(Art\.\s*\S+|Parágrafo único\.?)\s*[-–.:]?\s*/i, "");

/** o botão do slide: o tamanho da área de toque ao longo da barra (CSS .trilhoPino) */
const TAMANHO_PINO = 56;
/** acima e abaixo do botão, uma faixa de 1/4 dele fica sem marcações que peguem o clique: ali o clique é no botão */
const FOLGA_PINO = 0.25;
/** o escorregão do dedo ao tocar no botão que ainda conta como toque (px ao longo da barra): no toque e com o mouse */
const LIMIAR_TOQUE = 14;
const LIMIAR_MOUSE = 4;
/** quanto tempo o dedo fica parado no botão para soltar a barra do lugar (no celular) */
const SEGURAR_MS = 500;
const LADOS: LadoTrilho[] = ["cima", "baixo", "esquerda", "direita"];
const LADOS_TRILHO: [LadoTrilho, string, string][] = [
  ["direita", "Na direita", "Em pé, na borda direita da tela (o padrão)."],
  ["esquerda", "Na esquerda", "Em pé, na borda esquerda."],
  ["cima", "No alto", "Deitado, abaixo do nome da lei."],
  ["baixo", "Embaixo", "Deitado, logo acima da barra de controles."],
];
/** A borda da tela mais perto do ponto: para onde a barra vai quando é solta. */
function ladoMaisPerto(x: number, y: number): LadoTrilho {
  const d: Record<LadoTrilho, number> = { direita: window.innerWidth - x, esquerda: x, cima: y, baixo: window.innerHeight - y };
  return LADOS.reduce((a, b) => (d[b] < d[a] ? b : a));
}

/**
 * Slide de artigos. A distância do dedo até a barra escolhe o modo: perto, o pino acompanha o dedo; no meio, artigo a
 * artigo; longe, só grifos (na barra da direita, são os terços da tela da direita para a esquerda). No toque, só o
 * pino arrasta: no resto da faixa o dedo rola a página, e um toque curto leva ao ponto.
 * A barra fica na borda direita (padrão), na esquerda, no alto ou embaixo (acima da barra de controles): o botão com o
 * clique direito, ou segurado meio segundo no celular, arrasta a barra, que vai para a borda mais perto ao soltar.
 * As marcações bem perto do botão (a altura dele e mais 1/4 acima e abaixo) ficam apagadas e não pegam o clique.
 * Com o mouse, passar sobre uma marcação mostra a prévia do artigo, sem precisar clicar.
 */
export function Trilho({
  artigos,
  atual,
  progresso,
  oculto,
  aoIr,
  aoSoltar,
  pontos,
  faixas,
  secoes,
  marcos,
  detalhes,
  aoMenu,
  alvos,
  lado = "direita",
  aoMudarLado,
}: {
  artigos: ArtigoTexto[];
  atual: number;
  /** posição contínua na leitura (ver posicaoNaTela): o pino anda com a rolagem, não só ao trocar de artigo */
  progresso: number;
  oculto: boolean;
  aoIr: (k: number, marcar?: boolean) => void;
  aoSoltar: (de: number, para: number) => void;
  pontos: PontoTrilho[];
  faixas: FaixaTrilho[];
  secoes: string[];
  marcos: { k: number; rotulo: string }[];
  detalhes: Map<number, Detalhe[]>;
  /** um toque no botão, sem arrastar, abre o menu "Ir para" */
  aoMenu: () => void;
  /** os artigos que estão à mostra no filtro (ausente = todos): o deslizar encaixa neles */
  alvos?: number[];
  lado?: LadoTrilho;
  aoMudarLado?: (lado: LadoTrilho) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pino = useRef<HTMLSpanElement>(null);
  const deitado = lado === "cima" || lado === "baixo";
  // o comprimento da barra: a altura em pé, a largura deitada
  const [comprimento, setComprimento] = useState(0);
  // `pos`: onde o cartão fica ao longo da barra (px); `previa`: aberto pelo mouse sobre uma marcação, sem arrastar
  const [info, setInfo] = useState<{ k: number; pos: number; modo: Modo; toque: boolean; emCima: boolean; previa?: boolean } | null>(null);
  const [ativo, setAtivo] = useState(false);
  // arrastando a barra para outra borda: a borda em que ela vai ficar
  const [mudando, setMudando] = useState<LadoTrilho | null>(null);
  const movendoBarra = useRef(false);
  const menuNoToque = useRef(false);
  const segurar = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const estado = useRef<{
    y: number;
    k: number;
    mostrado: number;
    acc: number;
    modo: Modo;
    toque: boolean;
    inicio: number;
    inicioY: number;
    noPino: boolean;
    movido: boolean;
    t0: number;
    /** as marcações que estavam bem perto do botão quando o dedo o pegou: não atraem nem param o pino até o dedo sair dali */
    bloqueados: Set<number>;
  } | null>(null);
  const toqueNaFaixa = useRef<{ y: number; t: number } | null>(null);
  const quadro = useRef(0);
  const pendente = useRef(-1);
  const total = artigos.length;
  const ks = useMemo(() => [...new Set(pontos.map((p) => p.k))], [pontos]);
  const mostrar = ativo && info && !info.previa ? info.k : atual;
  // o pino: enquanto se arrasta, na posição do dedo; fora disso, na posição contínua da leitura
  const posicao = ativo && info ? info.k : progresso;
  const pct = (k: number) => `${(k / Math.max(1, total - 1)) * 100}%`;
  const px = (k: number) => (k / Math.max(1, total - 1)) * comprimento;
  const pinoPx = px(posicao);
  // a faixa do botão: ele e mais 1/4 dele de cada lado
  const raioPino = TAMANHO_PINO * (0.5 + FOLGA_PINO);
  const pertoDoPino = (k: number) => Math.abs(px(k) - pinoPx) <= raioPino;
  // o eixo da barra: a posição do ponteiro ao longo dela
  const eixo = (e: { clientX: number; clientY: number }) => (deitado ? e.clientX : e.clientY);
  const inicioDe = (r: DOMRect) => (deitado ? r.left : r.top);
  const tamanhoDe = (r: DOMRect) => (deitado ? r.width : r.height);
  // o modo pela distância do ponteiro até a barra (na barra da direita, os terços da tela)
  const modoDe = (e: { clientX: number; clientY: number }) => {
    const L = window.innerWidth;
    const A = window.innerHeight;
    const f = lado === "direita" ? e.clientX / L : lado === "esquerda" ? 1 - e.clientX / L : lado === "baixo" ? e.clientY / A : 1 - e.clientY / A;
    return modoPorPosicao(f * L, L, ks.length > 0);
  };
  // com um filtro, o deslizar só para nos artigos que estão à mostra (o mais próximo do ponto tocado)
  const encaixar = (k: number) => {
    if (!alvos?.length) return k;
    let melhor = alvos[0]!;
    for (const a of alvos) if (Math.abs(a - k) < Math.abs(melhor - k)) melhor = a;
    return melhor;
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setComprimento(deitado ? e.contentRect.width : e.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, [deitado]);
  useEffect(
    () => () => {
      cancelAnimationFrame(quadro.current);
      clearTimeout(segurar.current);
    },
    [],
  );

  // no máximo um salto de página por quadro
  const ir = (k: number) => {
    pendente.current = k;
    quadro.current ||= requestAnimationFrame(() => {
      quadro.current = 0;
      aoIr(pendente.current, false);
    });
  };
  const mostrarInfo = (k: number, e: { clientX: number; clientY: number }, modo: Modo, toque: boolean) => {
    const r = ref.current!.getBoundingClientRect();
    setInfo({ k, pos: Math.max(0, Math.min(tamanhoDe(r), eixo(e) - inicioDe(r))), modo, toque, emCima: e.clientY < window.innerHeight / 2 });
  };
  // a barra sai do lugar: o ponteiro leva até a borda em que ela vai ficar
  const comecarMudanca = (x: number, y: number) => {
    movendoBarra.current = true;
    estado.current = null;
    setAtivo(false);
    setInfo(null);
    setMudando(ladoMaisPerto(x, y));
    vibrar();
  };

  const iniciar = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    // no botão: no desenho dele, ou a até 1/4 dele acima ou abaixo (ali as marcações não pegam o clique)
    const noPino = !!pino.current?.contains(e.target as Node) || Math.abs(eixo(e) - inicioDe(r) - pinoPx) <= raioPino;
    const toque = e.pointerType !== "mouse";
    // o clique direito no botão arrasta a barra para outra borda
    if (e.button === 2) {
      if (!noPino) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      comecarMudanca(e.clientX, e.clientY);
      return;
    }
    if (e.button > 0) return;
    if (toque && !noPino) {
      toqueNaFaixa.current = { y: eixo(e), t: e.timeStamp };
      return;
    }
    // com o mouse, o arraste não pode começar uma seleção de texto embaixo do slide
    if (!toque) {
      e.preventDefault();
      window.getSelection()?.removeAllRanges();
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    const k = noPino ? atual : encaixar(indicePorPosicao(eixo(e) - inicioDe(r), tamanhoDe(r), total));
    if (!noPino) ir(k);
    const bloqueados = new Set(noPino ? ks.filter(pertoDoPino) : []);
    estado.current = { y: eixo(e), k, mostrado: k, acc: 0, modo: "rapido", toque, inicio: atual, inicioY: eixo(e), noPino, movido: false, t0: e.timeStamp, bloqueados };
    mostrarInfo(k, e, "rapido", toque);
    setAtivo(true);
    // no celular, o botão segurado parado solta a barra do lugar
    if (toque && noPino) {
      const { clientX, clientY } = e;
      clearTimeout(segurar.current);
      segurar.current = setTimeout(() => {
        if (estado.current && !estado.current.movido) comecarMudanca(clientX, clientY);
      }, SEGURAR_MS);
    }
  };
  // com o mouse, sem arrastar: a prévia do artigo de uma marcação perto do ponteiro (fora da faixa do botão)
  const previaNoMouse = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const ao = eixo(e) - inicioDe(r);
    let k = -1;
    let dist = 7;
    for (const p of ks) {
      const d = Math.abs(px(p) - ao);
      if (d < dist && !pertoDoPino(p)) {
        dist = d;
        k = p;
      }
    }
    if (k < 0) for (const f of faixas) if (ao >= px(f.de) - 4 && ao <= px(f.ate) + 4 && !pertoDoPino(f.de)) k = f.de;
    if (k < 0) {
      if (info?.previa) setInfo(null);
      return;
    }
    if (info?.previa && info.k === k) return;
    setInfo({ k, pos: px(k), modo: "rapido", toque: false, emCima: e.clientY < window.innerHeight / 2, previa: true });
  };
  const mover = (e: React.PointerEvent<HTMLDivElement>) => {
    if (movendoBarra.current) {
      setMudando(ladoMaisPerto(e.clientX, e.clientY));
      return;
    }
    const s = estado.current;
    if (!s) {
      if (e.pointerType === "mouse" && !e.buttons) previaNoMouse(e);
      return;
    }
    // o dedo sempre escorrega um pouco ao tocar no botão: até o limiar, o toque é só um toque (abre o "Ir para") e o
    // pino não sai do lugar; passado o limiar, o arraste conta a partir dele, sem salto
    const desde = eixo(e) - s.inicioY;
    if (!s.movido) {
      const limiar = s.toque ? LIMIAR_TOQUE : LIMIAR_MOUSE;
      if (Math.abs(desde) <= limiar) return;
      s.movido = true;
      s.y = s.inicioY + Math.sign(desde) * limiar;
      clearTimeout(segurar.current);
    }
    const dy = eixo(e) - s.y;
    s.y = eixo(e);
    // perto de onde o botão estava, as marcações dali não contam (nem atraem o pino, nem são paradas do modo Grifos)
    const livres = s.bloqueados.size && Math.abs(desde) < raioPino ? ks.filter((p) => !s.bloqueados.has(p)) : ks;
    const modo = modoDe(e);
    if (modo !== s.modo) {
      s.modo = modo;
      s.acc = 0;
      s.k = s.mostrado;
      vibrar();
    }
    let k: number;
    if (modo === "marcas") {
      s.acc += dy;
      while (Math.abs(s.acc) >= PX_POR_MARCA) {
        const dir = Math.sign(s.acc);
        s.k = proximoPonto(livres, Math.round(s.k), dir);
        s.acc -= dir * PX_POR_MARCA;
      }
      k = Math.round(s.k);
    } else {
      const h = tamanhoDe(e.currentTarget.getBoundingClientRect());
      s.k = moverIndice(s.k, dy, modo, total, h);
      // no rápido, os grifos atraem o pino a até 6 px
      k = encaixar(Math.round((modo === "rapido" ? imantar(s.k, livres, (6 * (total - 1)) / Math.max(1, h)) : null) ?? s.k));
    }
    if (k !== s.mostrado) {
      s.mostrado = k;
      ir(k);
      if (livres.includes(k)) vibrar();
    }
    mostrarInfo(k, e, modo, s.toque);
  };
  const soltar = (e: React.PointerEvent<HTMLDivElement>) => {
    clearTimeout(segurar.current);
    if (movendoBarra.current) {
      movendoBarra.current = false;
      setMudando(null);
      const novo = ladoMaisPerto(e.clientX, e.clientY);
      if (e.type === "pointerup" && novo !== lado) aoMudarLado?.(novo);
      return;
    }
    const t = toqueNaFaixa.current;
    toqueNaFaixa.current = null;
    if (t) {
      if (e.type === "pointerup" && Math.abs(eixo(e) - t.y) < 10 && e.timeStamp - t.t < 500) {
        const r = e.currentTarget.getBoundingClientRect();
        const k = encaixar(indicePorPosicao(eixo(e) - inicioDe(r), tamanhoDe(r), total));
        aoIr(k);
        aoSoltar(atual, k);
      }
      return;
    }
    const s = estado.current;
    estado.current = null;
    if (!s) return;
    cancelAnimationFrame(quadro.current);
    quadro.current = 0;
    setAtivo(false);
    aoIr(s.mostrado);
    aoSoltar(s.inicio, s.mostrado);
    // um toque no botão, sem arrastar, abre o menu "Ir para"
    if (!s.movido && s.noPino && e.type === "pointerup" && e.timeStamp - s.t0 < 600) {
      menuNoToque.current = s.toque;
      aoMenu();
    }
  };
  // no toque, o celular manda um clique depois de soltar o dedo, no ponto do toque: ali já está o véu do menu que
  // acabou de abrir, e o clique o fecharia. Cancelado o fim do toque, o clique não vem.
  const fimDoToque = (e: React.TouchEvent) => {
    if (!menuNoToque.current) return;
    menuNoToque.current = false;
    e.preventDefault();
  };
  const tecla = (e: React.KeyboardEvent) => {
    const passos: Record<string, number> = { ArrowDown: 1, ArrowUp: -1, ArrowRight: 1, ArrowLeft: -1, PageDown: 10, PageUp: -10, Home: -total, End: total };
    if (!(e.key in passos)) return;
    e.preventDefault();
    // as setas andam de artigo à mostra em artigo à mostra; as demais teclas usam a posição
    const passo = passos[e.key]!;
    const seta = /^Arrow/.test(e.key);
    const alvo = alvos?.length && seta ? (passo > 0 ? alvos.find((a) => a > atual) : [...alvos].reverse().find((a) => a < atual)) : undefined;
    aoIr(alvo ?? encaixar(Math.max(0, Math.min(total - 1, atual + passo))));
  };

  const a = info ? artigos[info.k] : undefined;
  const nPonto = info ? ks.indexOf(info.k) : -1;
  const det = info ? (detalhes.get(info.k) ?? []) : [];
  // o cartão, com o mouse, ao lado do ponteiro; deitada a barra, sem passar das bordas da tela
  const posCartao = info ? (deitado ? Math.max(Math.min(180, comprimento / 2), Math.min(comprimento - 180, info.pos)) : info.pos) : 0;
  const visivel = ativo || !!info?.previa;
  return (
    <>
      <div
        ref={ref}
        className={`${styles.trilho} ${oculto && !visivel && !mudando ? styles.trilhoOculto : ""} ${ativo || mudando ? styles.trilhoAtivo : ""}`}
        data-lado={lado}
        data-mudando={mudando ? "1" : undefined}
        role="slider"
        tabIndex={0}
        aria-label="Ir para o artigo"
        aria-orientation={deitado ? "horizontal" : "vertical"}
        aria-valuemin={0}
        aria-valuemax={total - 1}
        aria-valuenow={mostrar}
        aria-valuetext={[artigos[mostrar]?.[1], secoes[mostrar]].filter(Boolean).join(", ")}
        title="Clique com o botão direito no botão (ou segure-o, no celular) e arraste para mudar a barra de lugar"
        onPointerDown={iniciar}
        onPointerMove={mover}
        onPointerUp={soltar}
        onPointerCancel={soltar}
        onTouchEnd={fimDoToque}
        onPointerLeave={() => info?.previa && !estado.current && setInfo(null)}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        onKeyDown={tecla}
      >
        <span className={styles.trilhoLinha} aria-hidden>
          {faixas.map((f) => (
            <span key={f.de} className={styles.trilhoFaixa} style={{ "--pos": pct(f.de), "--tam": `max(3px, ${pct(f.ate - f.de)})`, "--c": f.cor } as CSSProperties} />
          ))}
        </span>
        {marcos.map((m) => (
          <span key={m.k} className={styles.trilhoMarco} data-perto={pertoDoPino(m.k) ? "1" : undefined} style={{ "--pos": pct(m.k) } as CSSProperties} aria-hidden />
        ))}
        {pontos.map((p) => (
          <span
            key={`${p.tipo}${p.k}`}
            className={styles.trilhoPonto}
            data-tipo={p.tipo}
            data-perto={pertoDoPino(p.k) ? "1" : undefined}
            style={{ "--pos": pct(p.k), ...(p.cor ? { "--c": p.cor } : {}) } as CSSProperties}
            aria-hidden
          />
        ))}
        <span ref={pino} className={styles.trilhoPino} style={{ transform: deitado ? `translateX(${pinoPx}px)` : `translateY(${pinoPx}px)` }} aria-hidden />
        {info && a && (
          <div
            className={`${styles.trilhoBalao} ${visivel ? styles.trilhoBalaoVisivel : ""} ${info.toque ? styles.trilhoBalaoToque : ""}`}
            data-em-cima={info.emCima ? "1" : "0"}
            style={info.toque ? undefined : deitado ? { left: posCartao } : { top: posCartao }}
            aria-hidden
          >
            <strong className={styles.trilhoArtigo}>{a[1]}</strong>
            {secoes[info.k] && <span className={styles.trilhoSecao}>{secoes[info.k]}</span>}
            {det.length > 0 && (
              <span className={styles.trilhoDetalhes}>
                {det.slice(0, 3).map((d, n) => (
                  <span key={n} className={styles.trilhoDetalhe} style={d.cor ? ({ "--c": d.cor } as CSSProperties) : undefined}>
                    {d.texto}
                  </span>
                ))}
                {det.length > 3 && <span className={styles.trilhoDetalhe}>e mais {det.length - 3}</span>}
              </span>
            )}
            <span className={styles.trilhoPrevia}>{semRotulo(a[2])}</span>
            {!info.previa && (
              <>
                <span className={styles.trilhoModos}>
                  {ORDEM_MODOS.map((m) => (
                    <span key={m} data-on={info.modo === m ? "1" : "0"} data-off={m === "marcas" && !ks.length ? "1" : "0"}>
                      {NOMES_MODO[m]}
                    </span>
                  ))}
                </span>
                <span className={styles.trilhoDica}>
                  {info.modo === "marcas"
                    ? nPonto >= 0
                      ? `Grifo ${nPonto + 1} de ${ks.length}`
                      : `${ks.length} grifos`
                    : info.modo === "fino"
                      ? ks.length
                        ? "Longe da barra: só os grifos · perto: rápido"
                        : "Perto da barra: rápido"
                      : ks.length
                        ? "Mais longe: artigo a artigo · bem longe: só os grifos"
                        : "Longe da barra: artigo a artigo"}
                </span>
              </>
            )}
          </div>
        )}
      </div>
      {/* mudando a barra de lugar: as quatro bordas, com a que vai receber a barra em destaque */}
      {mudando && (
        <div className={styles.trilhoDestinos} aria-hidden>
          {LADOS.map((l) => (
            <span key={l} data-lado={l} data-alvo={mudando === l ? "1" : undefined} />
          ))}
        </div>
      )}
    </>
  );
}

function PainelLeis({ atual, posicoes }: { atual: string; posicoes: Posicoes }) {
  const recentes = [...indice]
    .filter((l) => posicoes[l.id] && l.id !== atual)
    .sort((a, b) => posicoes[b.id].em - posicoes[a.id].em)
    .slice(0, 3);
  return (
    <>
      {recentes.length > 0 && (
        <>
          <h3 className={styles.subtitulo}>Continuar lendo</h3>
          <ul className={styles.listaLeis}>
            {recentes.map((l) => (
              <li key={l.id}>
                <a href={`${rotaDaLei(l.id)}#${posicoes[l.id].art}`}>
                  <strong>{l.nome}</strong>
                  <span>parou no {posicoes[l.id].rotulo}</span>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
      <h3 className={styles.subtitulo}>Todas as leis</h3>
      <ul className={styles.listaLeis}>
        {indice.map((l) => (
          <li key={l.id}>
            <a href={rotaDaLei(l.id)} aria-current={l.id === atual ? "page" : undefined}>
              <strong>{l.nome}</strong>
              <span>{posicoes[l.id] ? `parou no ${posicoes[l.id].rotulo}` : `${l.artigos} artigos`}</span>
            </a>
          </li>
        ))}
      </ul>
      <h3 className={styles.subtitulo}>Súmulas</h3>
      <ul className={styles.listaLeis}>
        {LISTAS_SUMULAS.map((l) => (
          <li key={l.id}>
            <a href={rotaDaLei(l.id)} aria-current={l.id === atual ? "page" : undefined}>
              <strong>{l.nome}</strong>
              <span>{posicoes[l.id] ? `parou no ${posicoes[l.id].rotulo}` : "Texto e Vide de cada súmula"}</span>
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}

function PainelBusca({ lei, artigos, original, inicial = "", aoIr }: { lei: string; artigos: ArtigoTexto[]; original: boolean; inicial?: string; aoIr: (art: string) => void }) {
  // vindo do atalho ("Buscar em todas as leis"), já abre com o texto e com as outras leis
  const [consulta, setConsulta] = useState(inicial);
  const [todas, setTodas] = useState(!!inicial);
  const [outras, setOutras] = useState<{ id: string; nome: string; achados: Achado[] }[] | "carregando" | null>(null);
  // "100 cp": o número é procurado na lei digitada (a aberta, ou outra, que é baixada); "absolvição cpp": as palavras
  const comLei = alvoDigitado(consulta) ? null : leiDigitada(consulta);
  const comTexto = alvoDigitado(consulta) || comLei ? null : leiNaBusca(consulta);
  const citada = comLei?.lei ?? comTexto?.lei ?? null;
  const outraLei = citada && citada !== lei ? citada : null;
  const [daOutra, setDaOutra] = useState<{ lei: string; artigos: ArtigoTexto[] } | null>(null);
  useEffect(() => {
    if (!outraLei) return;
    let vivo = true;
    carregarArtigos(outraLei, original).then(
      (d) => vivo && setDaOutra({ lei: outraLei, artigos: d.artigos }),
      () => {},
    );
    return () => {
      vivo = false;
    };
  }, [outraLei, original]);
  const referencia = comLei?.resto ?? consulta;
  const base = outraLei ? (daOutra?.lei === outraLei ? daOutra.artigos : null) : artigos;
  const nomeOutra = outraLei ? ([...indice, ...LISTAS_SUMULAS].find((l) => l.id === outraLei)?.nome ?? outraLei) : null;
  const palavras = comTexto?.resto ?? consulta;
  // nas súmulas o número é o da súmula ("145", "súmula 145" → s-145)
  const listaSumulas = ehSumulas(outraLei ?? lei);
  const porNumero = comTexto ? null : artigoDigitado(listaSumulas ? semPalavraSumula(referencia) : referencia);
  const idSumulaDigitada = listaSumulas && porNumero ? porNumero.replace(/^art/, "s-").replace(/-[a-z]+$/, "") : null;
  const sugestoes = porNumero && base
    ? idSumulaDigitada
      ? [...base.filter((a) => a[0] === idSumulaDigitada), ...base.filter((a) => a[0] !== idSumulaDigitada && a[0].startsWith(idSumulaDigitada))].slice(0, 8)
      : sugerirArtigos(referencia, base)
    : [];
  // a palavra num inciso ou parágrafo leva a ele (a.disp), e não ao caput
  const achados = !porNumero && palavras.trim().length >= 3 && base ? buscarTexto(palavras, base) : [];
  const router = useRouter();
  const ir = (art: string) => (outraLei ? router.push(`${rotaDaLei(outraLei)}#${art}`) : aoIr(art));
  // para onde o Enter leva: o número exato vai direto ao artigo, e ao inciso ou parágrafo digitado ("5 XI", "121 § 2º");
  // senão, o primeiro artigo sugerido ou o primeiro texto achado
  const alvoExato = idSumulaDigitada ? null : alvoDigitado(referencia);
  const destino =
    alvoExato && sugestoes[0]?.[0] === alvoExato.art
      ? (alvoExato.disp ?? alvoExato.art)
      : (sugestoes[0]?.[0] ?? (achados[0] ? (achados[0].disp ?? achados[0].art) : null));
  // o Enter dado enquanto a outra lei ainda carrega fica valendo: com ela carregada, abre o resultado (se a consulta
  // não mudou)
  const [esperando, setEsperando] = useState<string | null>(null);
  const aguardando = !!outraLei && !base && esperando === consulta;
  const destinoEsperado = outraLei && base && esperando === consulta ? destino : null;
  useEffect(() => {
    if (outraLei && destinoEsperado) router.push(`${rotaDaLei(outraLei)}#${destinoEsperado}`);
  }, [destinoEsperado]); // eslint-disable-line react-hooks/exhaustive-deps -- só a chegada do resultado conta
  // número de artigo ("98") ou texto com pelo menos três letras; com a lei digitada, só ela
  const buscaOutras = todas && !citada && (porNumero !== null || consulta.trim().length >= 3);

  useEffect(() => {
    if (!buscaOutras) return;
    let vivo = true;
    const t = setTimeout(() => {
      setOutras("carregando");
      const numero = artigoDigitado(consulta) !== null;
      Promise.all(indice.filter((l) => l.id !== lei).map((l) => carregarArtigos(l.id).catch(() => null))).then((ls) => {
        if (!vivo) return;
        setOutras(
          ls
            .flatMap((l) => (l ? [{ id: l.id, nome: l.nome, achados: numero ? achadosDoNumero(consulta, l.artigos) : buscarTexto(consulta, l.artigos, 12) }] : []))
            .filter((x) => x.achados.length),
        );
      });
    }, 250);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [buscaOutras, consulta, lei]);

  const linha = (a: Achado) => (
    <>
      <strong>{a.disp ? `${a.rotulo}, ${rotuloDoDispositivo(a.disp)}` : a.rotulo}</strong>
      <span>
        {a.antes}
        <mark>{a.achado}</mark>
        {a.depois}
      </span>
    </>
  );

  return (
    <div className={styles.busca}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (destino) ir(destino);
          else if (outraLei && !base) setEsperando(consulta);
        }}
      >
        <input
          autoFocus
          type="search"
          enterKeyHint="search"
          value={consulta}
          onChange={(e) => {
            setConsulta(e.target.value);
            setEsperando(null);
          }}
          placeholder="Artigo (121, 5 XI, 100 CP) ou palavras"
          aria-label="Buscar artigo ou texto"
        />
      </form>
      <p className={`${styles.miuda} ${styles.dicaTeclado}`}>Atalho: digite o número do artigo em qualquer ponto da leitura para ir direto a ele.</p>
      <label className={styles.alternar}>
        <input type="checkbox" className={styles.alternarEntrada} checked={todas} onChange={(e) => setTodas(e.target.checked)} />
        <span className={styles.alternarTrilho} aria-hidden>
          <span className={styles.alternarBolinha} />
        </span>
        <span>Procurar também nas outras leis</span>
      </label>
      {(porNumero || comTexto) && nomeOutra && <h3 className={styles.subtitulo}>{nomeOutra}</h3>}
      {porNumero && (
        <ul className={styles.resultados}>
          {sugestoes.length ? (
            sugestoes.map((a) => {
              const linhaDoArtigo = (
                <>
                  <strong>{a[1]}</strong>
                  <span>{a[2].slice(a[1].length).replace(/^[\s.\-–:]+/, "").slice(0, 160)}…</span>
                </>
              );
              return (
                <li key={a[0]}>
                  {outraLei ? (
                    <a href={`${rotaDaLei(outraLei)}#${a[0]}`}>{linhaDoArtigo}</a>
                  ) : (
                    <button type="button" onClick={() => aoIr(a[0])}>
                      {linhaDoArtigo}
                    </button>
                  )}
                </li>
              );
            })
          ) : (
            <li className={styles.miuda}>{outraLei && !base ? `Carregando ${nomeOutra}…${aguardando ? " Abre assim que achar." : ""}` : `Nenhum artigo com esse número ${nomeOutra ? `em ${nomeOutra}` : "nesta lei"}.`}</li>
          )}
        </ul>
      )}
      {!porNumero && palavras.trim().length >= 3 && (
        <>
          <p className={styles.miuda}>
            {outraLei && !base
              ? `Carregando ${nomeOutra}…${aguardando ? " Abre assim que achar." : ""}`
              : achados.length
                ? `${achados.length}${achados.length >= 60 ? "+" : ""} artigo(s) ${nomeOutra ? `em ${nomeOutra}` : "nesta lei"}.`
                : `Nada ${nomeOutra ? `em ${nomeOutra}` : "nesta lei"}.`}{" "}
            Use aspas para a expressão exata.
          </p>
          <ul className={styles.resultados}>
            {achados.map((a) => (
              <li key={a.art}>
                <button type="button" onClick={() => ir(a.disp ?? a.art)}>
                  {linha(a)}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {buscaOutras && outras === "carregando" && <p className={styles.miuda}>Procurando nas outras leis…</p>}
      {buscaOutras && Array.isArray(outras) && outras.length === 0 && <p className={styles.miuda}>Nenhuma outra lei encontrou “{consulta.trim()}”.</p>}
      {buscaOutras &&
        Array.isArray(outras) &&
        outras.map((o) => (
          <section key={o.id}>
            <h3 className={styles.subtitulo}>{o.nome}</h3>
            <ul className={styles.resultados}>
              {o.achados.map((a) => (
                <li key={a.art}>
                  <a href={`/leis/${o.id}/#${a.disp ?? a.art}`}>{linha(a)}</a>
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}

function PainelGrifos(props: {
  legendas: Estado;
  /** escolhe o sistema de cores desta lei */
  escolher: (id: string) => void;
  sistema: Sistema;
  marcas: Marcacao[];
  rotuloDaCor: (c: string) => string;
  prontos: boolean;
  mudarProntos: (v: boolean) => void;
  editar: (s: Sistema) => void;
  aoIr: (m: Marcacao) => void;
  remover: (m: Marcacao) => void;
}) {
  const { legendas, sistema, marcas } = props;
  const grupos = agruparGrifos(marcas);
  return (
    <div className={styles.grupos}>
      <fieldset>
        <legend>Sistema de cores</legend>
        <div className={styles.chips}>
          {todosSistemas(legendas).map((s) => (
            <button key={s.id} type="button" aria-pressed={s.id === sistema.id} onClick={() => props.escolher(s.id)}>
              {s.nome}
            </button>
          ))}
        </div>
        <ul className={styles.legenda}>
          {sistema.cores.map((c) => (
            <li key={c.cor + c.rotulo}>
              <span className={styles.amostra} style={{ "--c": c.cor } as CSSProperties} />
              {c.rotulo}
            </li>
          ))}
        </ul>
        <label className={styles.opcao}>
          <input type="checkbox" checked={props.prontos} onChange={(e) => props.mudarProntos(e.target.checked)} /> Mostrar os grifos prontos deste sistema
        </label>
        <div className={styles.chips}>
          <button type="button" onClick={() => props.editar({ id: `meu-${Date.now().toString(36)}`, nome: "Meu sistema", cores: [{ cor: "#fde047", rotulo: "" }] })}>
            + Criar sistema
          </button>
          {legendas.meus.some((s) => s.id === sistema.id) && (
            <button type="button" onClick={() => props.editar(sistema)}>
              Editar “{sistema.nome}”
            </button>
          )}
        </div>
      </fieldset>
      <fieldset>
        <legend>Meus grifos nesta lei ({grupos.length})</legend>
        {grupos.length === 0 ? (
          <p className={styles.miuda}>Toque em “Grifar”, escolha a cor e passe o dedo (ou o mouse) sobre o texto.</p>
        ) : (
          <ul className={styles.resultados}>
            {grupos.map(({ primeiro: m, texto, partes }) => (
              <li key={grupoDe(m)} className={styles.itemGrifo}>
                <button type="button" onClick={() => props.aoIr(m)}>
                  <span className={styles.amostra} style={{ "--c": m.cor === "nota" ? "transparent" : m.cor } as CSSProperties} />
                  <span>
                    <strong>{props.rotuloDaCor(m.cor) || "Grifo"}</strong> “{texto.slice(0, 90)}”{m.nota ? ` — ${m.nota}` : ""}
                    {partes > 1 && <small> · em {partes} parágrafos</small>}
                  </span>
                </button>
                <button type="button" className={styles.link} onClick={() => props.remover(m)} aria-label="Apagar grifo">
                  apagar
                </button>
              </li>
            ))}
          </ul>
        )}
      </fieldset>
    </div>
  );
}

function EditorSistema({
  sistema,
  copiaveis,
  onSalvar,
  onCancelar,
  onExcluir,
}: {
  sistema: Sistema;
  /** os sistemas de que se podem copiar os grifos (os prontos primeiro) */
  copiaveis: Sistema[];
  onSalvar: (s: Sistema) => void;
  onCancelar: () => void;
  onExcluir: () => void;
}) {
  const [nome, setNome] = useState(sistema.nome);
  const [cores, setCores] = useState<CorLegenda[]>(sistema.cores);
  const [base, setBase] = useState(sistema.base);
  const [aviso, setAviso] = useState<string | null>(null);
  // uma cor só por linha: escolher uma cor que já está em outra linha é recusado
  const mudar = (k: number, p: Partial<CorLegenda>) => {
    if (p.cor && cores.some((c, i) => i !== k && c.cor.toLowerCase() === p.cor!.toLowerCase())) {
      setAviso("Essa cor já está em outra linha deste sistema. Escolha outra.");
      return;
    }
    setAviso(null);
    setCores((cs) => cs.map((c, i) => (i === k ? { ...c, ...p } : c)));
  };
  // copiar de "Matérias" ou "Teses da peça" traz as cores, os significados e os grifos prontos de lá (que passam a
  // aparecer com as cores deste sistema, mesmo depois de trocar o nome ou a cor de cada linha)
  const copiar = (origem: Sistema) => {
    const copia = copiarSistema(origem, { id: sistema.id, nome });
    setCores(copia.cores);
    setBase(copia.base);
    setAviso(null);
    if (!nome.trim() || nome === "Meu sistema") setNome(`${origem.nome} (meu)`);
  };
  const nomeBase = SISTEMAS_PRONTOS.find((s) => s.id === base)?.nome;
  return (
    <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="sistema-titulo">
      <div className={styles.modalCaixa}>
        <h2 id="sistema-titulo">Sistema de cores</h2>
        <label>
          Nome <input value={nome} onChange={(e) => setNome(e.target.value)} />
        </label>
        <div className={styles.copiar}>
          <span className={styles.miuda}>Copiar os grifos de</span>
          <div className={styles.chips}>
            {copiaveis.map((s) => (
              <button key={s.id} type="button" onClick={() => copiar(s)}>
                {s.nome}
              </button>
            ))}
          </div>
          {nomeBase && (
            <p className={styles.miuda}>
              Os grifos prontos de “{nomeBase}” aparecem com as cores deste sistema.{" "}
              <button type="button" className={styles.link} onClick={() => setBase(undefined)}>
                não mostrar
              </button>
            </p>
          )}
        </div>
        {cores.map((c, k) => (
          <div key={k} className={styles.linhaCor}>
            <input type="color" value={c.cor} onChange={(e) => mudar(k, { cor: e.target.value })} aria-label="Cor" />
            <span className={styles.linhaCorTexto}>
              <input value={c.rotulo} placeholder="Significado (ex.: Competência)" onChange={(e) => mudar(k, { rotulo: e.target.value })} />
              {base && c.origem && c.origem !== c.rotulo && <small className={styles.miuda}>pinta os grifos prontos de “{c.origem}”</small>}
            </span>
            <button type="button" className={styles.link} onClick={() => setCores((cs) => cs.filter((_, i) => i !== k))} disabled={cores.length === 1}>
              remover
            </button>
          </div>
        ))}
        {aviso && <p className={styles.miuda} role="status">{aviso}</p>}
        <button type="button" className={styles.link} onClick={() => setCores((cs) => [...cs, { cor: novaCorPara(cs.map((c) => c.cor)), rotulo: "" }])}>
          + cor
        </button>
        <div className={styles.rodape}>
          <button type="button" className={styles.btnPerigo} onClick={onExcluir}>
            Excluir sistema
          </button>
          <div className={styles.rodapeAcoes}>
            <button type="button" className="btn btn-sm btn-ghost" onClick={onCancelar}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-sm btn-gold"
              onClick={() => {
                const salvo: Sistema = { ...sistema, nome: nome.trim() || "Meu sistema", cores: corUnicas(cores.filter((c) => c.cor)) };
                if (base) salvo.base = base;
                else delete salvo.base;
                onSalvar(salvo);
              }}
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
