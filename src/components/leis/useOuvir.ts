"use client";

// "Ouvir": a lei lida em voz alta pela voz do próprio aparelho (speechSynthesis), sem nenhum arquivo de som. Lê o que está à
// mostra no leitor (o filtro do texto, o texto revogado e a linha do tempo valem), do ponto da tela ou de um parágrafo
// tocado, destaca o trecho dito e rola junto. Com os comandos de voz ligados, o microfone ouve "pausa", "próximo artigo",
// "último artigo do título 2", "procura motivo torpe", "ir para o RESE"… (e "… do CPP" abre a outra lei).
import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { avisoDaTela, useTelaAcesa, type EstadoTela } from "@/lib/tela-acesa";
import { gravarJSON, lerJSON } from "@/lib/storage";
import type { Bloco } from "@/lib/leis/linha-do-tempo";
import { ajustarAlvo, alvoDigitado, semPalavraSumula, type ArtigoTexto } from "@/lib/leis/busca";
import { LISTAS_SUMULAS } from "@/lib/leis/sumulas";
import indice from "@/content/generated/leis-indice.json";
import { paraFala, pecasDoTexto, type TipoBloco } from "@/lib/fala/texto";
import { Narrador, vozesEmPortugues, type AoFimDoArtigo, type EstadoNarrador, type Fala, type ItemFala, type Sintese } from "@/lib/fala/narrador";
import { Escuta, escutaDisponivel, type EstadoEscuta, type NaLeitura, type Sensibilidade } from "@/lib/fala/escuta";
import { bipe, silencioWav, type AcaoDoFone } from "@/lib/fala/fone";
import { AJUDA_FALADA, interpretarComando, palavrasDe, pareceComando, type Alcance, type ComandoVoz, type IdDoLeitor, type Ordem } from "@/lib/fala/comandos-voz";
import { corDita, corParaGrifar, type CorDaLegenda } from "@/lib/fala/cores-faladas";
import { destacarFaixa, faixaDoTexto } from "@/lib/fala/destaque";
import {
  NIVEIS,
  acharDivisao,
  acharPeloNome,
  apelidoDe,
  artigoNaFaixa,
  caminhoDaDivisao,
  divisaoFalada,
  divisaoMaisFunda,
  divisaoVizinha,
  divisoesDaLei,
  nomesDaLei,
  procurarNaLista,
  type Acerto,
  type Divisao,
  type Nomeado,
  type PassoCaminho,
} from "@/lib/fala/navegar";
import { rotuloDoDispositivo } from "./IrParaArtigo";
import { CLASSES } from "./classes";

export interface PrefsOuvir {
  /** a voz escolhida (voiceURI); null: a melhor em português do aparelho */
  voz: string | null;
  velocidade: number;
  tom: number;
  /** pausa entre artigos, em ms */
  pausaArtigo: number;
  aoFimDoArtigo: AoFimDoArtigo;
  /** ler os títulos, capítulos e seções */
  titulos: boolean;
  /** ler o nome do crime acima do artigo ("Homicídio simples") */
  rubricas: boolean;
  /** ler as anotações entre parênteses que estiverem à mostra ("Redação dada pela Lei…", "Vide…") */
  notas: boolean;
  /** rolar o texto junto com a leitura */
  acompanhar: boolean;
  /** não deixar a tela apagar enquanto lê */
  telaLigada: boolean;
  /** ouvir os comandos de voz pelo microfone */
  comandos: boolean;
  /** o microfone dos comandos: "auto" (evita o do fone Bluetooth), "padrao" ou o deviceId */
  microfone: string;
  /** o reforço do som do microfone (com o microfone longe, a voz chega fraca) */
  sensibilidade: Sensibilidade;
  /** o microfone enquanto a voz lê: "auto" fecha o do fone Bluetooth (que põe o som no modo de chamada) */
  microfoneNaLeitura: NaLeitura;
  /** o volume da voz, de 0,2 a 1 */
  volume: number;
  /** os botões do fone e as teclas de mídia controlam a leitura */
  botoesDoFone: boolean;
  /** o que os dois toques no fone fazem (a "próxima faixa") */
  doisToques: AcaoDoFone;
  /** o que os três toques fazem (a "faixa anterior") */
  tresToques: AcaoDoFone;
}
export const PREFS_OUVIR: PrefsOuvir = {
  voz: null,
  velocidade: 1,
  tom: 1,
  pausaArtigo: 700,
  aoFimDoArtigo: "seguir",
  titulos: true,
  rubricas: true,
  notas: false,
  acompanhar: true,
  telaLigada: true,
  comandos: false,
  microfone: "auto",
  sensibilidade: "alta",
  microfoneNaLeitura: "auto",
  volume: 1,
  botoesDoFone: true,
  doisToques: "comando",
  tresToques: "repetirArtigo",
};
const K_OUVIR = "grifo:leitor:ouvir";
const K_DICA = "grifo:leitor:ouvir:dica";
export const VELOCIDADE_MIN = 0.5;
export const VELOCIDADE_MAX = 2.5;
export const AMOSTRA = "Artigo cento e vinte e um. Matar alguém. Pena: reclusão, de seis a vinte anos.";
/** comandos que valem antes de a frase terminar (quem pede para pausar não quer esperar) */
const URGENTES = new Set<ComandoVoz["tipo"]>(["pausar", "encerrar"]);
const PROBLEMAS_DA_ESCUTA: Partial<Record<EstadoEscuta, string>> = {
  negada: "O microfone está bloqueado para este site. Libere-o nas permissões do navegador para usar os comandos de voz.",
  "sem-microfone": "Nenhum microfone encontrado: os comandos de voz foram desligados.",
  indisponivel: "Este navegador não reconhece comandos de voz. No Chrome, no Edge e no Safari eles funcionam.",
  erro: "O reconhecimento de voz parou de responder (ele precisa de internet). Os comandos de voz foram desligados.",
};
/** por quanto tempo o que a voz disse conta como eco no microfone */
const JANELA_ECO_MS = 40_000;
/** depois de o microfone ouvir a própria leitura (o alto-falante), por quanto tempo o eco é temido */
const ECO_OUVIDO_MS = 60_000;

const temVoz = () => typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
const limitar = (v: number) => Math.round(Math.min(VELOCIDADE_MAX, Math.max(VELOCIDADE_MIN, v)) * 100) / 100;
/** a faixa da tela livre: abaixo do que fica fixo no alto e acima da barra do Ouvir */
function faixaLivre() {
  const topo = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--topo-livre")) || 90;
  const barra = document.querySelector<HTMLElement>("[data-barra-ouvir]")?.getBoundingClientRect();
  return { topo, fundo: barra && barra.height ? barra.top - 8 : window.innerHeight - 8 };
}
const visivel = (r: DOMRect) => {
  const { topo, fundo } = faixaLivre();
  return r.bottom > topo && r.top < fundo;
};
// no iPhone a voz só fala depois de um toque: a primeira fala sai dentro dele
let desbloqueado = false;
function desbloquear() {
  if (desbloqueado || !temVoz()) return;
  desbloqueado = true;
  if (window.speechSynthesis.speaking || window.speechSynthesis.pending) return;
  const u = new SpeechSynthesisUtterance(" ");
  u.volume = 0;
  window.speechSynthesis.speak(u);
}
/** "Código de Processo Penal", "Lei de Drogas", "Súmulas do STJ": o nome da lei para dizer e mostrar */
function nomeDaLei(id: string): string {
  const nome = (indice as { id: string; nome: string }[]).find((l) => l.id === id)?.nome ?? LISTAS_SUMULAS.find((l) => l.id === id)?.nome ?? id;
  return nome.replace(/\s*\(.*\)\s*$/, "");
}
/** "do capítulo", "da seção": o artigo contraído antes da divisão */
const doDa = (nivel: number) => (nivel === 0 || nivel >= 4 ? "da" : "do");
const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** "o capítulo", "a seção" */
const oA = (nivel: number) => (doDa(nivel) === "da" ? "a" : "o");
/** "DO RECURSO EM SENTIDO ESTRITO" → "Do recurso em sentido estrito" */
const frase = (s: string) => maiuscula(s.trim().toLowerCase());
/**
 * O que dizer antes do cabeçalho de uma divisão: as de cima ("Livro terceiro, título segundo."); sem a leitura dos títulos,
 * a própria divisão e o nome dela também.
 */
function avisoDaDivisao(div: Divisao, titulos: boolean): string | undefined {
  const dizer = [...div.pais, ...(titulos ? [] : [div])].map(divisaoFalada).join(", ");
  return dizer ? `${maiuscula(dizer)}.${!titulos && div.nome ? ` ${paraFala(div.nome)}.` : ""}` : undefined;
}
/** os comandos que não mudam o lugar da leitura: depois deles, a leitura pausada para ouvir o comando continua */
const SEGUE_LENDO = new Set<ComandoVoz["tipo"]>([
  "maisRapido",
  "maisDevagar",
  "velocidadeNormal",
  "maisAlto",
  "maisBaixo",
  "ondeEstou",
  "ajuda",
  "velocidade",
  "volume",
  "tom",
  "info",
  "grifar",
  "desgrifar",
  "pararEm",
  "aoFimDoArtigo",
  "lerTambem",
  "pausaEntre",
  "acompanhar",
]);

/** Um trecho do texto de um bloco (o bloco inteiro: `inteiro`), para grifar ou apagar os grifos dele. */
export interface TrechoDoBloco {
  i: number;
  ini: number;
  fim: number;
  inteiro: boolean;
}
/** O que a voz pede ao leitor: os comandos dele, as cores da legenda e grifar ou apagar grifos. */
export interface AcoesDoLeitor {
  /** um comando do leitor (o fundo, a letra, os filtros…); `ligar`: o estado pedido, nos que ligam e desligam */
  comando(id: IdDoLeitor, ligar?: boolean): void;
  /** as cores da legenda em uso */
  cores(): CorDaLegenda[];
  /** a cor do marcador (a última escolhida, ou a primeira da legenda) */
  corDoMarcador(): string | null;
  /** grifa os trechos na cor; false se não deu */
  grifar(trechos: TrechoDoBloco[], cor: string): boolean;
  /** apaga os grifos que tocam os trechos; devolve quantos */
  desgrifar(trechos: TrechoDoBloco[]): number;
}
const fmtVel = (v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}×`;
const ORDINAL: Record<Ordem, string> = { primeiro: "Primeiro", ultimo: "Último", proximo: "Próximo", anterior: "Anterior" };
/** "capítulo segundo do título segundo": o caminho falado, como foi pedido */
const caminhoFalado = (caminho: readonly PassoCaminho[]) =>
  caminho
    .map((p, k) => {
      const d = { nivel: NIVEIS.indexOf(p.nivel), n: p.n };
      return `${k ? `${doDa(d.nivel)} ` : ""}${divisaoFalada(d)}`;
    })
    .join(" ");
/**
 * O comando de voz que leva a outra lei ("ir para o artigo 33 da lei de drogas"): a página da outra lei o executa quando o
 * texto dela chegar, com os comandos ainda ligados.
 */
let pendente: { lei: string; comando: ComandoVoz | null; ate: number } | null = null;

export interface Ouvir {
  suportado: boolean;
  ativo: boolean;
  estado: EstadoNarrador;
  /** a trava da tela durante a leitura: acesa, recusada pelo navegador ou indisponível (sem https) */
  tela: EstadoTela;
  /** o que está sendo lido ("Art. 121, § 2º, IV") */
  rotulo: string;
  prefs: PrefsOuvir;
  mudarPrefs(p: Partial<PrefsOuvir>): void;
  vozes: SpeechSynthesisVoice[];
  vozAtual: SpeechSynthesisVoice | null;
  escuta: EstadoEscuta;
  podeEscutar: boolean;
  /** a tela acompanha a leitura (false quando o usuário rolou para longe) */
  seguindo: boolean;
  /** o "▶ Ler daqui" de um parágrafo tocado */
  bolha: { i: number; x: number; y: number; rotulo: string } | null;
  /** quando a leitura para sozinha ("parar depois de"), e o tempo escolhido */
  prazo: { fim: number; minutos: number } | null;
  iniciar(): void;
  lerDaTela(): void;
  lerDoBloco(i: number): void;
  lerDoArtigo(texto: string): boolean;
  alternar(): void;
  pular(passo: 1 | -1): void;
  pularArtigo(passo: 1 | -1): void;
  repetirArtigo(): void;
  fechar(): void;
  mudarVelocidade(passo: number): void;
  testarVoz(): void;
  voltarAoTrecho(): void;
  pararDepoisDe(minutos: number | null): void;
  tocouNoTexto(alvo: HTMLElement, x: number, y: number): void;
  fecharBolha(): void;
  /** liga ou desliga os comandos de voz (sem valor: troca) */
  alternarComandos(ligar?: boolean): void;
  /** o microfone que os comandos estão ouvindo; null: o padrão do sistema; undefined: ainda não se sabe */
  microfoneEmUso: string | null | undefined;
  /** o nível do som que os comandos ouvem, de 0 a 1 (null: não dá para medir) */
  nivelDoMicrofone(): number | null;
  /** quanto som chega ao microfone, para o anel do botão (sem a medida, o que o reconhecimento percebe); null: fechado */
  somDoMicrofone(): number | null;
  /** faz o que o comando de voz faria (os gestos da barra usam os mesmos comandos) */
  comando(c: ComandoVoz): void;
  /** o rótulo do trecho (ou, com `artigo`, do artigo) `n` passos adiante (negativo: para trás); null: nada sendo lido */
  previaAdiante(n: number, artigo: boolean): string | null;
  /** pausa a leitura e ouve um comando (os dois toques no fone); com os comandos desligados, o microfone abre só para ele */
  ouvirUmComando(): void;
  /** o microfone em pausa (no celular, depois de alguns silêncios seguidos) volta a ouvir */
  acordarMicrofone(): void;
  /** esperando o comando dos dois toques */
  esperandoComando: boolean;
}

export function useOuvir({
  lei,
  folha,
  blocos,
  artigos,
  sumula,
  avisar,
  pronto,
  trocarDeLei,
  leitor,
}: {
  lei: string;
  folha: RefObject<HTMLDivElement | null>;
  blocos: RefObject<Bloco[] | null>;
  artigos: ArtigoTexto[];
  sumula: boolean;
  avisar: (texto: string, acao?: { rotulo: string; fazer: () => void }) => void;
  /** o texto inteiro da lei já está na página */
  pronto: boolean;
  /** abre outra lei do leitor (os comandos de voz com "… do CPP") */
  trocarDeLei: (id: string) => void;
  /** os comandos do leitor e os grifos, pela voz */
  leitor?: AcoesDoLeitor;
}): Ouvir {
  const [suportado, setSuportado] = useState(false);
  const [ativo, setAtivo] = useState(false);
  const [estado, setEstado] = useState<EstadoNarrador>("parado");
  const [rotulo, setRotulo] = useState("");
  const [prefs, setPrefs] = useState<PrefsOuvir>(PREFS_OUVIR);
  const [vozes, setVozes] = useState<SpeechSynthesisVoice[]>([]);
  const [escuta, setEscuta] = useState<EstadoEscuta>("desligada");
  const [podeEscutar, setPodeEscutar] = useState(false);
  const [seguindo, setSeguindo] = useState(true);
  const [bolha, setBolha] = useState<Ouvir["bolha"]>(null);
  const [prazo, setPrazo] = useState<Ouvir["prazo"]>(null);
  const prazoRef = useRef(prazo);
  useEffect(() => {
    prazoRef.current = prazo;
  }, [prazo]);
  const [microfoneEmUso, setMicrofoneEmUso] = useState<string | null | undefined>(undefined);

  const prefsRef = useRef(prefs);
  const seguindoRef = useRef(true);
  const narradorRef = useRef<Narrador | null>(null);
  const falandoEl = useRef<HTMLElement | null>(null);
  const eco = useRef<{ t: number; palavras: string[] }[]>([]);
  const ultimoGesto = useRef(0);
  const rolagemNossa = useRef(0);
  const tratadas = useRef(new Set<string>());
  /** quando o microfone ouviu a própria leitura pela última vez (uma frase quase toda do que a voz disse) */
  const ecoOuvidoEm = useRef(-Infinity);
  const parciais = useRef(new Map<string, ComandoVoz["tipo"]>());
  const avisarRef = useRef(avisar);
  useEffect(() => {
    avisarRef.current = avisar;
  }, [avisar]);
  const trocarDeLeiRef = useRef(trocarDeLei);
  useEffect(() => {
    trocarDeLeiRef.current = trocarDeLei;
  }, [trocarDeLei]);
  const leitorRef = useRef(leitor);
  useEffect(() => {
    leitorRef.current = leitor;
  }, [leitor]);
  /** o que dizer antes da próxima leitura (o nome da lei, ao chegar de outra pela voz) */
  const prefixo = useRef("");
  /** a última busca de palavras: "próximo resultado" segue dela */
  const ultimaBusca = useRef<{ texto: string; artigo: string | null; i: number; pos: number } | null>(null);
  const rotulosDosArtigos = useMemo(() => new Map(artigos.map((a) => [a[0], a[1]])), [artigos]);
  const rotulosRef = useRef(rotulosDosArtigos);
  useEffect(() => {
    rotulosRef.current = rotulosDosArtigos;
  }, [rotulosDosArtigos]);
  const artigosRef = useRef(artigos);
  useEffect(() => {
    artigosRef.current = artigos;
  }, [artigos]);

  // ---------- preferências e vozes ----------
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- lê o localStorage e as capacidades do navegador depois de montar */
    setSuportado(temVoz());
    setPodeEscutar(escutaDisponivel());
    const salvo = lerJSON<Partial<PrefsOuvir>>(K_OUVIR, {});
    const p = { ...PREFS_OUVIR, ...salvo, velocidade: limitar(Number(salvo.velocidade ?? 1) || 1) };
    prefsRef.current = p;
    setPrefs(p);
    /* eslint-enable react-hooks/set-state-in-effect */
    if (!temVoz()) return;
    const carregar = () => setVozes(vozesEmPortugues(window.speechSynthesis.getVoices()));
    carregar();
    window.speechSynthesis.addEventListener?.("voiceschanged", carregar);
    // há navegadores que não avisam quando as vozes chegam
    const t = window.setTimeout(carregar, 1500);
    return () => {
      window.speechSynthesis.removeEventListener?.("voiceschanged", carregar);
      window.clearTimeout(t);
    };
  }, []);
  const mudarPrefs = useCallback((p: Partial<PrefsOuvir>) => {
    setPrefs((a) => {
      const n = { ...a, ...p };
      prefsRef.current = n;
      gravarJSON(K_OUVIR, n);
      return n;
    });
  }, []);
  const vozAtual = useMemo(() => vozes.find((v) => v.voiceURI === prefs.voz) ?? vozes[0] ?? null, [vozes, prefs.voz]);

  // ---------- o texto da tela, como itens para a voz ----------
  const tipoDe = useCallback(
    (el: HTMLElement): TipoBloco => blocos.current?.[Number(el.dataset.i)]?.tipo ?? (el.tagName === "H3" ? "estrutura" : el.tagName === "H4" ? "rubrica" : "texto"),
    [blocos],
  );
  /** o artigo do bloco; a rubrica (sem dispositivo) é do artigo que vem logo depois; os títulos não são de nenhum */
  const artigoDoEl = useCallback(
    (el: HTMLElement): string | null => {
      if (tipoDe(el) === "estrutura") return null;
      if (el.dataset.disp) return el.dataset.disp.split(".")[0]!;
      let k = el.nextElementSibling as HTMLElement | null;
      for (let n = 0; k && n < 8; n++, k = k.nextElementSibling as HTMLElement | null) {
        if (k.dataset?.disp) return k.dataset.disp.split(".")[0]!;
        if (k.tagName === "H3") break;
      }
      return null;
    },
    [tipoDe],
  );
  const itemDe = useCallback(
    (el: HTMLElement): ItemFala | null => {
      if (el.dataset.i === undefined) return null;
      const p = prefsRef.current;
      // as redações antigas riscadas não são lidas (na linha do tempo, o que vale na data aparece sem risco e é lido)
      if (el.dataset.sup === "1" && folha.current?.dataset.tempo !== "1") return null;
      // o que está escondido (o filtro do texto, o revogado desligado, a linha do tempo) não é lido
      if (!el.getClientRects().length) return null;
      const tipo = tipoDe(el);
      if ((tipo === "estrutura" && !p.titulos) || (tipo === "rubrica" && !p.rubricas)) return null;
      const texto = el.querySelector<HTMLElement>(`:scope > .${CLASSES.txt}`)?.textContent ?? "";
      const pecas = pecasDoTexto(texto, tipo);
      if (p.notas)
        for (const a of el.querySelectorAll<HTMLElement>(`:scope > .${CLASSES.atos} > .${CLASSES.ato}`)) {
          if (!a.getClientRects().length) continue;
          const falar = paraFala(a.textContent ?? "");
          if (falar) pecas.push({ ini: -1, fim: -1, falar });
        }
      if (!pecas.length) return null;
      return { i: Number(el.dataset.i), art: artigoDoEl(el), tipo, disp: el.dataset.disp, pecas };
    },
    [folha, tipoDe, artigoDoEl],
  );
  const elDe = useCallback((i: number) => folha.current?.querySelector<HTMLElement>(`[data-i="${i}"]`) ?? null, [folha]);
  /** o primeiro item legível a partir de `de` (incluído ou não), no sentido do passo */
  const andar = useCallback(
    (de: HTMLElement, passo: 1 | -1, incluir = false): ItemFala | null => {
      let k: Element | null = incluir ? de : passo > 0 ? de.nextElementSibling : de.previousElementSibling;
      for (let n = 0; k && n < 50_000; n++) {
        if (k instanceof HTMLElement && k.dataset.i !== undefined) {
          const it = itemDe(k);
          if (it) return it;
        }
        k = passo > 0 ? k.nextElementSibling : k.previousElementSibling;
      }
      return null;
    },
    [itemDe],
  );
  /** o bloco na linha de leitura (logo abaixo do que fica fixo no alto) */
  const elNaTela = useCallback((): HTMLElement | null => {
    const raiz = folha.current;
    if (!raiz) return null;
    const caixa = raiz.getBoundingClientRect();
    const { topo } = faixaLivre();
    const x = Math.min(window.innerWidth - 4, Math.max(4, caixa.left + Math.min(caixa.width / 2, 120)));
    for (let y = Math.max(topo + 6, caixa.top + 2); y < window.innerHeight; y += 18) {
      const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-i]");
      if (el && raiz.contains(el)) return el;
    }
    return raiz.querySelector<HTMLElement>("[data-i]");
  }, [folha]);

  /** "Art. 121, § 2º, IV" */
  const rotuloDe = useCallback((art: string, disp: string) => {
    const a = rotulosRef.current.get(art) ?? art.replace(/^art/, "Art. ").replace(/^s-/, "Súmula ");
    const resto = rotuloDoDispositivo(disp);
    return resto ? `${a}, ${resto}` : a;
  }, []);
  const rotuloDoItem = useCallback(
    (item: ItemFala): string => {
      if (!item.disp || !item.art) {
        const t = elDe(item.i)?.textContent?.trim() ?? "";
        return t.length > 48 ? `${t.slice(0, 47)}…` : t;
      }
      return rotuloDe(item.art, item.disp);
    },
    [elDe, rotuloDe],
  );

  // ---------- destaque e rolagem ----------
  const rolarAte = useCallback((el: HTMLElement, r: Range | null) => {
    const onde = () => {
      const caixa = r?.getBoundingClientRect();
      return caixa && caixa.height ? caixa : el.getBoundingClientRect();
    };
    const { topo, fundo } = faixaLivre();
    const alvo = onde();
    if (alvo.top >= topo + 4 && alvo.bottom <= fundo) return;
    const linha = Math.max(topo + 12, window.innerHeight * 0.22);
    const longe = Math.abs(alvo.top - linha) > window.innerHeight * 1.5;
    rolagemNossa.current = Date.now();
    if (!longe && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.scrollTo({ top: window.scrollY + alvo.top - linha, behavior: "smooth" });
      return;
    }
    // longe: o salto é instantâneo, e corrigido por alguns quadros (os blocos fora da tela têm altura estimada e ganham a
    // altura real ao serem desenhados, como no salto do leitor)
    const alinhar = () => {
      const dif = onde().top - linha;
      if (Math.abs(dif) < 2) return;
      rolagemNossa.current = Date.now();
      window.scrollTo({ top: window.scrollY + dif, behavior: "instant" });
    };
    alinhar();
    let quadros = 0;
    const passo = () => {
      alinhar();
      if (++quadros < 12) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
    window.setTimeout(alinhar, 300);
  }, []);
  const destacar = useCallback(
    (item: ItemFala, p: number) => {
      const el = elDe(item.i);
      if (falandoEl.current && falandoEl.current !== el) falandoEl.current.removeAttribute("data-falando");
      falandoEl.current = el;
      if (!el) return;
      el.setAttribute("data-falando", "1");
      const peca = item.pecas[p];
      const txt = el.querySelector<HTMLElement>(`:scope > .${CLASSES.txt}`);
      const r = peca && peca.ini >= 0 && txt ? faixaDoTexto(txt, peca.ini, peca.fim) : null;
      destacarFaixa(r);
      if (seguindoRef.current && prefsRef.current.acompanhar) rolarAte(el, r);
    },
    [elDe, rolarAte],
  );
  const apagarDestaque = useCallback(() => {
    falandoEl.current?.removeAttribute("data-falando");
    falandoEl.current = null;
    destacarFaixa(null);
  }, []);
  const mudarSeguindo = useCallback((v: boolean) => {
    seguindoRef.current = v;
    setSeguindo(v);
  }, []);

  // ---------- a voz ----------
  const configDe = useCallback(
    (p: PrefsOuvir) => {
      const voz = vozes.find((v) => v.voiceURI === p.voz) ?? vozes[0] ?? null;
      const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
      // as vozes do Google no Chrome do computador param sozinhas depois de uns 15 s de fala: pausar e retomar evita
      const manterViva = !!voz && !voz.localService && /google/i.test(voz.name) && /Chrome\//.test(ua) && !/Android|Mobile/i.test(ua);
      return { voz, lingua: "pt-BR", velocidade: p.velocidade, tom: p.tom, volume: p.volume, pausaArtigo: p.pausaArtigo, aoFimDoArtigo: p.aoFimDoArtigo, manterViva };
    },
    [vozes],
  );
  const narrador = useCallback((): Narrador => {
    if (narradorRef.current) return narradorRef.current;
    const n = new Narrador(
      window.speechSynthesis as unknown as Sintese,
      (texto) => new SpeechSynthesisUtterance(texto) as unknown as Fala,
      {
        depois: (it) => {
          const el = elDe(it.i);
          return el ? andar(el, 1) : null;
        },
        antes: (it) => {
          const el = elDe(it.i);
          return el ? andar(el, -1) : null;
        },
      },
      configDe(prefsRef.current),
      {
        estado: (e) => {
          setEstado(e);
          if (e === "parado") apagarDestaque();
        },
        falando: (item, p) => {
          setRotulo(rotuloDoItem(item));
          eco.current.push({ t: Date.now(), palavras: palavrasDe(item.pecas[p]?.falar ?? "") });
          destacar(item, p);
        },
        fimDaLei: () => avisarRef.current(`Fim ${sumula ? "das súmulas" : "da lei"}.`),
        parou: (motivo) => {
          if (motivo === "tempo") setPrazo(null);
          avisarRef.current(motivo === "tempo" ? "O tempo acabou: a leitura foi pausada." : "Fim do artigo: a leitura foi pausada. Toque em ▶ para seguir.");
        },
        erro: (msg, codigo) => {
          if (codigo === "network" || codigo === "synthesis-failed") return void avisarRef.current("A voz escolhida não respondeu (ela pode precisar de internet). Escolha outra em Ouvir ▸ Voz.");
          if (codigo) avisarRef.current(msg);
        },
      },
    );
    narradorRef.current = n;
    return n;
  }, [andar, elDe, configDe, destacar, apagarDestaque, rotuloDoItem, sumula]);

  // a voz, a velocidade e o resto valem na hora, também com a leitura em andamento
  useEffect(() => {
    narradorRef.current?.configurar(configDe(prefs));
  }, [prefs, configDe]);

  /** lê a partir do pedaço `p` do item; `aviso` é dito antes ("Último artigo do título segundo.") */
  const lerItem = useCallback(
    (item: ItemFala, p = 0, aviso?: string) => {
      const dizer = [prefixo.current, aviso].filter(Boolean).join(" ");
      prefixo.current = "";
      // o aviso entra como um pedaço sem lugar no texto (não é destacado)
      const it = dizer ? { ...item, pecas: [...item.pecas.slice(0, p), { ini: -1, fim: -1, falar: dizer }, ...item.pecas.slice(p)] } : item;
      mudarSeguindo(true);
      setBolha(null);
      setAtivo(true);
      narrador().ler(it, p);
    },
    [narrador, mudarSeguindo],
  );
  /** lê a partir do trecho no alto da tela */
  const lerDaTela = useCallback(() => {
    if (!temVoz()) return avisarRef.current("Este navegador não tem voz para ler em voz alta.");
    desbloquear();
    const el = elNaTela();
    const item = el ? andar(el, 1, true) : null;
    if (!item) return avisarRef.current("Não há texto para ler a partir daqui.");
    lerItem(item);
    if (!lerJSON<boolean>(K_DICA, false)) {
      gravarJSON(K_DICA, true);
      avisarRef.current("Lendo em voz alta. Toque num parágrafo para ler a partir dele.");
    }
  }, [elNaTela, andar, lerItem]);
  /** abre a leitura no ponto da tela; aberta e pausada, continua de onde parou */
  const iniciar = useCallback(() => {
    const n = narradorRef.current;
    if (ativo && n?.atual && n.estado === "pausado") {
      desbloquear();
      mudarSeguindo(true);
      return n.continuar();
    }
    lerDaTela();
  }, [ativo, lerDaTela, mudarSeguindo]);
  const lerDoBloco = useCallback(
    (i: number) => {
      const el = elDe(i);
      const item = el ? andar(el, 1, true) : null;
      if (!item) return;
      desbloquear();
      lerItem(item);
    },
    [elDe, andar, lerItem],
  );
  /** "121", "121 § 2º", "Súmula 711": lê a partir do dispositivo; false se não achou (ou se o filtro o esconde) */
  const lerDoArtigo = useCallback(
    (texto: string): boolean => {
      const alvo = alvoDigitado(sumula ? semPalavraSumula(texto) : texto);
      if (!alvo) return false;
      const art = sumula ? alvo.art.replace(/^art/, "s-") : alvo.art;
      const destino = sumula ? art : ajustarAlvo(alvo, artigosRef.current.find((a) => a[0] === art));
      const el = document.getElementById(destino) ?? document.getElementById(art);
      if (!el || !folha.current?.contains(el)) return false;
      if (!el.getClientRects().length) {
        avisarRef.current(`${rotulosRef.current.get(art) ?? "Esse artigo"} não aparece com o filtro do texto.`);
        return false;
      }
      const item = andar(el, 1, true);
      if (!item) return false;
      desbloquear();
      lerItem(item);
      return true;
    },
    [sumula, folha, andar, lerItem],
  );
  const fechar = useCallback(() => {
    narradorRef.current?.parar();
    apagarDestaque();
    setAtivo(false);
    setBolha(null);
    setPrazo(null);
    narradorRef.current?.pararDepoisDe(null);
  }, [apagarDestaque]);
  const alternar = useCallback(() => {
    const n = narradorRef.current;
    if (!n || !n.atual || n.estado === "parado") return iniciar();
    desbloquear();
    if (n.estado === "lendo") n.pausar();
    else {
      mudarSeguindo(true);
      n.continuar();
    }
  }, [iniciar, mudarSeguindo]);
  const pular = useCallback((passo: 1 | -1) => {
    const n = narradorRef.current;
    if (!n?.atual) return;
    mudarSeguindo(true);
    if (!n.pular(passo)) avisarRef.current(passo > 0 ? "Este é o último trecho." : "Este é o primeiro trecho.");
  }, [mudarSeguindo]);
  const pularArtigo = useCallback(
    (passo: 1 | -1) => {
      const n = narradorRef.current;
      if (!n?.atual) return;
      mudarSeguindo(true);
      if (!n.pularArtigo(passo)) avisarRef.current(passo > 0 ? `Este é o último ${sumula ? "enunciado" : "artigo"}.` : `Este é o primeiro ${sumula ? "enunciado" : "artigo"}.`);
    },
    [sumula, mudarSeguindo],
  );
  const repetirArtigo = useCallback(() => {
    mudarSeguindo(true);
    narradorRef.current?.repetir(true);
  }, [mudarSeguindo]);
  const mudarVelocidade = useCallback(
    (passo: number) => {
      const v = limitar(prefsRef.current.velocidade + passo);
      mudarPrefs({ velocidade: v });
      avisarRef.current(`Velocidade ${v.toLocaleString("pt-BR")}×`);
    },
    [mudarPrefs],
  );
  const testarVoz = useCallback(() => {
    if (!temVoz()) return;
    desbloquear();
    const n = narrador();
    n.configurar(configDe(prefsRef.current));
    n.anunciar(AMOSTRA);
  }, [narrador, configDe]);
  const voltarAoTrecho = useCallback(() => {
    mudarSeguindo(true);
    const at = narradorRef.current?.atual;
    if (at) destacar(at.item, at.p);
  }, [destacar, mudarSeguindo]);
  const pararDepoisDe = useCallback(
    (minutos: number | null) => {
      const ms = minutos === null ? null : minutos * 60_000;
      narrador().pararDepoisDe(ms);
      setPrazo(minutos === null ? null : { fim: Date.now() + minutos * 60_000, minutos });
    },
    [narrador],
  );
  const tocouNoTexto = useCallback(
    (alvo: HTMLElement, x: number, y: number) => {
      if (!ativo) return;
      const el = alvo.closest<HTMLElement>("[data-i]");
      if (!el || !folha.current?.contains(el)) return;
      const item = andar(el, 1, true);
      if (!item) return;
      setBolha({ i: item.i, x, y, rotulo: rotuloDoItem(item) });
    },
    [ativo, folha, andar, rotuloDoItem],
  );
  const fecharBolha = useCallback(() => setBolha(null), []);
  const alternarComandos = useCallback(
    (ligar?: boolean) => {
      const v = ligar ?? !prefsRef.current.comandos;
      mudarPrefs({ comandos: v });
      if (!v) return avisarRef.current("Comandos de voz desligados.");
      // a barra abre junto: com ela aberta, o microfone ouve (e “lê” começa a leitura)
      setAtivo(true);
      avisarRef.current("Comandos de voz ligados: diga “pausa”, “continua”, “próximo artigo”, “ir para o artigo 121”…");
    },
    [mudarPrefs],
  );
  useEffect(() => {
    if (!bolha) return;
    const t = window.setTimeout(() => setBolha(null), 6000);
    // some quando a tela anda de verdade (mostrar ou esconder os controles do leitor mexe uns pixels, e não conta)
    const y0 = window.scrollY;
    const sair = () => {
      if (Math.abs(window.scrollY - y0) > 60) setBolha(null);
    };
    window.addEventListener("scroll", sair, { passive: true });
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("scroll", sair);
    };
  }, [bolha]);

  // outra lei: a leitura desta termina; ao sair do leitor, a voz se cala
  useEffect(() => () => fechar(), [lei, fechar]);
  useEffect(
    () => () => {
      narradorRef.current?.destruir();
      narradorRef.current = null;
    },
    [],
  );

  // ---------- a tela acompanha, até o usuário rolar para longe ----------
  useEffect(() => {
    if (!ativo) return;
    // o que move a tela de propósito: rolar, arrastar, teclas e os toques fora do texto (o slide, a busca, o índice); o
    // toque no texto não conta (ele abre o "Ler daqui"), nem os controles do Ouvir
    const gesto = (e: Event) => {
      const alvo = e.target as Element | null;
      if (alvo?.closest?.("[data-ouvir]")) return;
      if (e.type === "pointerdown" && alvo && folha.current?.contains(alvo)) return;
      if (e.type === "pointermove" && !(e as PointerEvent).buttons) return;
      ultimoGesto.current = Date.now();
    };
    let quadro = 0;
    const rolar = () => {
      cancelAnimationFrame(quadro);
      quadro = requestAnimationFrame(() => {
        const el = falandoEl.current;
        if (!el) return;
        const ve = visivel(el.getBoundingClientRect());
        const manual = Date.now() - ultimoGesto.current < 1500 && Date.now() - rolagemNossa.current > 400;
        if (manual && !ve && seguindoRef.current) mudarSeguindo(false);
        else if (ve && !seguindoRef.current && manual) mudarSeguindo(true);
      });
    };
    const opc = { passive: true, capture: true } as const;
    window.addEventListener("wheel", gesto, opc);
    window.addEventListener("touchmove", gesto, opc);
    window.addEventListener("pointerdown", gesto, opc);
    window.addEventListener("pointermove", gesto, opc);
    window.addEventListener("keydown", gesto, opc);
    window.addEventListener("scroll", rolar, { passive: true });
    return () => {
      cancelAnimationFrame(quadro);
      window.removeEventListener("wheel", gesto, opc);
      window.removeEventListener("touchmove", gesto, opc);
      window.removeEventListener("pointerdown", gesto, opc);
      window.removeEventListener("pointermove", gesto, opc);
      window.removeEventListener("keydown", gesto, opc);
      window.removeEventListener("scroll", rolar);
    };
  }, [ativo, folha, mudarSeguindo]);

  // ---------- a tela não apaga enquanto lê (ou enquanto espera um comando de voz) ----------
  const tela = useTelaAcesa(ativo && prefs.telaLigada && (estado === "lendo" || (prefs.comandos && escuta === "ouvindo")));
  // a tela vai apagar (o navegador não deixa mantê-la acesa): avisa uma vez, na primeira leitura em que isso acontece
  const avisouTela = useRef<EstadoTela | null>(null);
  useEffect(() => {
    const aviso = avisoDaTela(tela);
    if (!aviso || avisouTela.current === tela) return;
    avisouTela.current = tela;
    avisarRef.current(aviso);
  }, [tela]);

  // ---------- navegar pela lei: divisões, nomes, palavras e outra lei ----------
  const estrutura = useCallback(() => {
    const lista = blocos.current ?? [];
    return { lista, divs: divisoesDaLei(lista) };
  }, [blocos]);
  /** onde a leitura está (o fim do pedaço dito), ou o bloco no alto da tela */
  const posicaoAtual = useCallback((): { i: number; pos: number } | null => {
    const at = narradorRef.current?.atual;
    if (at) {
      const pc = at.item.pecas[at.p];
      return { i: at.item.i, pos: pc && pc.ini >= 0 ? pc.fim : -1 };
    }
    const el = elNaTela();
    return el ? { i: Number(el.dataset.i), pos: -1 } : null;
  }, [elNaTela]);
  /** diz e mostra uma resposta; a leitura, se estava em andamento, continua depois */
  const responder = useCallback(
    (falar: string, mostrar?: string) => {
      prefixo.current = "";
      avisarRef.current(mostrar ?? falar);
      narrador().anunciar(falar);
    },
    [narrador],
  );
  /** lê do bloco `i` (ou do primeiro legível depois dele); `doArtigo`: desde o começo do artigo (com o nome do crime) */
  const lerDoIndice = useCallback(
    (i: number, aviso?: string, doArtigo = false): boolean => {
      const el = elDe(i);
      let item = el ? andar(el, 1, true) : null;
      if (!item) return false;
      if (doArtigo) item = narrador().inicioDoArtigo(item);
      desbloquear();
      lerItem(item, 0, aviso);
      return true;
    },
    [elDe, andar, narrador, lerItem],
  );
  /** "121" → "art121" (nas súmulas, "s-121") */
  const artigoDoAlvo = useCallback(
    (alvo: string) => {
      const a = alvoDigitado(sumula ? semPalavraSumula(alvo) : alvo);
      return a ? (sumula ? a.art.replace(/^art/, "s-") : a.art) : null;
    },
    [sumula],
  );
  const irParaOutraLei = useCallback((id: string, comando: ComandoVoz | null) => {
    pendente = { lei: id, comando, ate: Date.now() + 30_000 };
    narradorRef.current?.parar();
    avisarRef.current(`Abrindo ${nomeDaLei(id)}…`);
    trocarDeLeiRef.current(id);
  }, []);

  const irParaDivisao = useCallback(
    (c: Extract<ComandoVoz, { tipo: "divisao" }>) => {
      const { lista, divs } = estrutura();
      const pos = posicaoAtual();
      let div: Divisao | null = null;
      if (c.caminho.length) {
        const achada = acharDivisao(divs, c.caminho, pos?.i ?? null);
        if (!achada) {
          const primeiro = NIVEIS.indexOf(c.caminho[0]!.nivel);
          return responder(`Não encontrei ${oA(primeiro)} ${caminhoFalado(c.caminho)} ${sumula ? "nas súmulas" : "nesta lei"}.`);
        }
        if ("opcoes" in achada) {
          // o CPP tem um título II em cada livro: diz quais há e como escolher
          const ditos = new Set(c.caminho.map((p) => NIVEIS.indexOf(p.nivel)));
          const acima = (d: Divisao) => d.pais.filter((p) => !ditos.has(p.nivel)).at(-1);
          const partes = achada.opcoes.map((d) => {
            const x = acima(d);
            const onde = x ? `n${oA(x.nivel)} ${divisaoFalada(x)}` : divisaoFalada(d);
            return d.nome ? `${onde}, ${paraFala(d.nome)}` : onde;
          });
          const x = acima(achada.opcoes[1] ?? achada.opcoes[0]!);
          const qual = x ? `${oA(x.nivel)} ${divisaoFalada(x).split(" ")[0]}` : "o caminho inteiro";
          const exemplo = x ? ` Por exemplo: ${caminhoFalado(c.caminho)} ${doDa(x.nivel)} ${divisaoFalada(x)}.` : "";
          return responder(
            `Há ${achada.opcoes.length}: ${partes.join("; ")}. Diga também ${qual}.${exemplo}`,
            `Há ${achada.opcoes.length}: ${achada.opcoes.map(caminhoDaDivisao).join(" · ")}. Diga também ${qual}.`,
          );
        }
        div = achada.div;
      }
      const mostrar = div ? `${caminhoDaDivisao(div)}${div.nome ? ` · ${frase(div.nome)}` : ""}` : nomeDaLei(lei);
      if (c.onde === "inicio") {
        if (!div) {
          const primeiro = folha.current?.querySelector<HTMLElement>("[data-i]");
          if (primeiro && lerDoIndice(Number(primeiro.dataset.i), sumula ? "Início das súmulas." : "Início da lei.")) avisarRef.current(mostrar);
          return;
        }
        // o cabeçalho da divisão é lido; antes dele, as divisões de cima ("Livro terceiro, título segundo.")
        if (lerDoIndice(div.i, avisoDaDivisao(div, prefsRef.current.titulos))) avisarRef.current(mostrar);
        return;
      }
      const k = artigoNaFaixa(lista, div?.i ?? 0, div?.fim ?? lista.length, c.onde === "ultimoArtigo" ? "ultimo" : "primeiro");
      const qual = c.onde === "ultimoArtigo" ? "Último" : "Primeiro";
      const deQue = div ? `${doDa(div.nivel)} ${divisaoFalada(div)}` : sumula ? "da lista" : "da lei";
      const palavra = sumula ? "enunciado" : "artigo";
      if (k === null) return responder(`Não há ${palavra}s ${deQue}.`);
      if (lerDoIndice(k, `${qual} ${palavra} ${deQue}.`, true)) avisarRef.current(`${qual} ${palavra} · ${mostrar}`);
    },
    [estrutura, posicaoAtual, responder, lerDoIndice, folha, lei, sumula],
  );

  const irParaVizinha = useCallback(
    (c: Extract<ComandoVoz, { tipo: "divisaoVizinha" }>) => {
      const nivel = NIVEIS.indexOf(c.nivel);
      const nome = divisaoFalada({ nivel, n: "1" }).split(" ")[0]!;
      const pos = posicaoAtual();
      const d = pos ? divisaoVizinha(estrutura().divs, c.nivel, c.passo, pos.i) : null;
      if (!d) return responder(c.passo > 0 ? `Não há ${doDa(nivel) === "da" ? "próxima" : "próximo"} ${nome}.` : `Não há ${nome} anterior.`);
      const aviso = prefsRef.current.titulos ? undefined : `${maiuscula(divisaoFalada(d))}.${d.nome ? ` ${paraFala(d.nome)}.` : ""}`;
      if (lerDoIndice(d.i, aviso)) avisarRef.current(`${caminhoDaDivisao(d)}${d.nome ? ` · ${frase(d.nome)}` : ""}`);
    },
    [posicaoAtual, estrutura, responder, lerDoIndice],
  );

  /**
   * Procura as palavras no texto à mostra (só no `artigo`, se veio) e lê a partir do achado: o primeiro depois de `de`
   * (passo 1) ou o último antes (passo -1), dando a volta na lei. false se não achou.
   */
  const procurarTexto = useCallback(
    (texto: string, artigo: string | null, de: { i: number; pos: number }, passo: 1 | -1): boolean => {
      const raiz = folha.current;
      if (!raiz) return false;
      const tempo = raiz.dataset.tempo === "1";
      let els = [...raiz.children].filter(
        (e): e is HTMLElement => e instanceof HTMLElement && e.dataset.i !== undefined && !(e.dataset.sup === "1" && !tempo) && e.getClientRects().length > 0,
      );
      if (artigo) els = els.filter((e) => artigoDoEl(e) === artigo);
      const { acertos, frase: achada } = procurarNaLista(
        els.map((e) => e.querySelector<HTMLElement>(`:scope > .${CLASSES.txt}`)?.textContent ?? ""),
        texto,
      );
      if (!acertos.length) return false;
      const iDe = (a: Acerto) => Number(els[a.k]!.dataset.i);
      const depois = (a: Acerto) => iDe(a) > de.i || (iDe(a) === de.i && a.pos > de.pos);
      const antes = (a: Acerto) => iDe(a) < de.i || (iDe(a) === de.i && a.pos < de.pos);
      const alvo = passo > 0 ? (acertos.find(depois) ?? acertos[0]!) : ([...acertos].reverse().find(antes) ?? acertos.at(-1)!);
      const item = andar(els[alvo.k]!, 1, true);
      if (!item) return false;
      // o pedaço em que está a palavra
      let p = 0;
      if (item.i === iDe(alvo)) item.pecas.forEach((pc, j) => (pc.ini >= 0 && pc.ini <= alvo.pos ? (p = j) : null));
      const unico = acertos.length === 1 && ultimaBusca.current?.i === iDe(alvo) && ultimaBusca.current.pos === alvo.pos;
      ultimaBusca.current = { texto, artigo, i: iDe(alvo), pos: alvo.pos };
      // o lugar, dito antes; lendo do começo do bloco, o rótulo dele já é lido (fica só o de cima: "no artigo 121, § 2º")
      let onde = "";
      if (item.disp && item.art) {
        const segs = item.disp.split(".");
        const disp = p === 0 ? segs.slice(0, -1).join(".") : item.disp;
        if (disp) onde = paraFala(`${sumula ? "na" : "no"} ${rotuloDe(item.art, disp)}`).replace(/\.$/, "");
      }
      const aviso = unico ? "Só há este trecho com essas palavras." : `Encontrado${onde ? ` ${onde.charAt(0).toLowerCase()}${onde.slice(1)}` : ""}.`;
      desbloquear();
      lerItem(item, p, aviso);
      avisarRef.current(`“${achada}”: ${rotuloDoItem(item)} (${acertos.indexOf(alvo) + 1} de ${acertos.length})`);
      return true;
    },
    [folha, artigoDoEl, andar, rotuloDe, rotuloDoItem, lerItem, sumula],
  );

  const irPeloNome = useCallback(
    (nome: string) => {
      const { lista, divs } = estrutura();
      const nomes = nomesDaLei(lista, divs);
      const achado = acharPeloNome(nomes, nome);
      const apelido = apelidoDe(nome);
      const irAo = (n: Nomeado) => {
        const div = n.tipo === "divisao" ? divs.find((d) => d.i === n.i) : undefined;
        if (lerDoIndice(n.i, div && avisoDaDivisao(div, prefsRef.current.titulos))) avisarRef.current(div ? `${caminhoDaDivisao(div)} · ${frase(n.nome)}` : frase(n.nome));
      };
      if (achado && (achado.nota === 100 || !apelido)) return irAo(achado.item);
      if (apelido) {
        const comando: ComandoVoz = apelido.alvo ? { tipo: "irPara", alvo: apelido.alvo, sumula: false } : { tipo: "nome", nome: apelido.nome! };
        if (apelido.lei !== lei) return irParaOutraLei(apelido.lei, comando);
        if (apelido.alvo) {
          if (!lerDoArtigo(apelido.alvo)) responder(`Não encontrei “${nome}” nesta lei.`);
          return;
        }
        const outro = acharPeloNome(nomes, apelido.nome!);
        if (outro) return irAo(outro.item);
      }
      // sem um nome assim: o primeiro trecho da lei com essas palavras
      if (!procurarTexto(nome, null, { i: -1, pos: -1 }, 1)) responder(`Não encontrei “${nome}” ${sumula ? "nas súmulas" : "nesta lei"}.`);
    },
    [estrutura, lerDoIndice, lei, irParaOutraLei, lerDoArtigo, responder, procurarTexto, sumula],
  );

  // ---------- comandos de voz ----------
  const onde = useCallback((): string => {
    const at = narradorRef.current?.atual;
    if (!at) return "A leitura ainda não começou.";
    const r = paraFala(rotuloDoItem(at.item)).replace(/\.$/, "");
    const base = !at.item.disp
      ? `Você está no trecho: ${r}.`
      : sumula
        ? `Você está na ${r.replace(/^Súmula/, "súmula")}.`
        : `Você está no ${r.replace(/^Artigo/, "artigo")}.`;
    const d = divisaoMaisFunda(estrutura().divs, at.item.i);
    return d ? `${base} ${maiuscula(divisaoFalada(d))}${d.nome ? `: ${paraFala(d.nome)}` : ""}.` : base;
  }, [rotuloDoItem, sumula, estrutura]);
  /** o trecho que está sendo lido (o começo e o fim dele no texto do bloco), ou o bloco no alto da tela */
  const trechoAtual = useCallback((): { i: number; ini: number; fim: number } | null => {
    const at = narradorRef.current?.atual;
    if (at) {
      const pc = at.item.pecas[at.p];
      return pc && pc.ini >= 0 ? { i: at.item.i, ini: pc.ini, fim: pc.fim } : { i: at.item.i, ini: 0, fim: Infinity };
    }
    const el = elNaTela();
    return el ? { i: Number(el.dataset.i), ini: -1, fim: -1 } : null;
  }, [elNaTela]);
  /** o item lido, ou, num título ou capítulo, o primeiro do artigo que vem logo depois dele */
  const itemDoArtigo = useCallback((): ItemFala | null => {
    let it: ItemFala | null = narradorRef.current?.atual?.item ?? null;
    for (let n = 0; it && !it.art && n < 12; n++) {
      const el = elDe(it.i);
      it = el ? andar(el, 1) : null;
    }
    return it?.art ? it : null;
  }, [elDe, andar]);
  /** os blocos à mostra (os escondidos pelo filtro, pelo revogado desligado ou pela linha do tempo, não) */
  const blocosAMostra = useCallback((): HTMLElement[] => {
    const raiz = folha.current;
    if (!raiz) return [];
    const tempo = raiz.dataset.tempo === "1";
    return [...raiz.children].filter(
      (e): e is HTMLElement => e instanceof HTMLElement && e.dataset.i !== undefined && !(e.dataset.sup === "1" && !tempo) && e.getClientRects().length > 0,
    );
  }, [folha]);
  /** lê a partir da posição `pos` do texto do bloco `i` (o pedaço em que ela está), dizendo antes o aviso */
  const lerDaPosicao = useCallback(
    (i: number, pos: number, aviso: string): ItemFala | null => {
      const el = elDe(i);
      const item = el ? andar(el, 1, true) : null;
      if (!item) return null;
      let p = 0;
      if (item.i === i) item.pecas.forEach((pc, j) => (pc.ini >= 0 && pc.ini <= pos ? (p = j) : null));
      desbloquear();
      lerItem(item, p, aviso);
      return item;
    },
    [elDe, andar, lerItem],
  );
  /** os grifos à mostra, na ordem do texto: o bloco, onde começam no texto dele e a cor (os do usuário e os prontos) */
  const grifosAMostra = useCallback(
    (de?: "meus" | "prontos"): { i: number; pos: number; cor: string }[] => {
      const saida: { i: number; pos: number; cor: string }[] = [];
      const seletor = de === "meus" ? "mark[data-m]" : de === "prontos" ? "mark[data-pronto]" : "mark[data-m], mark[data-pronto]";
      for (const el of blocosAMostra()) {
        const i = Number(el.dataset.i);
        // o parágrafo inteiro grifado é uma forma só no bloco ("ponte" é o bloco do meio, sem texto a grifar)
        if (de !== "prontos" && el.dataset.marcaBloco === "1") {
          saida.push({ i, pos: 0, cor: el.style.getPropertyValue("--c").trim() });
          continue;
        }
        const txt = el.querySelector<HTMLElement>(`:scope > .${CLASSES.txt}`);
        if (!txt) continue;
        let anterior: HTMLElement | null = null;
        for (const m of txt.querySelectorAll<HTMLElement>(seletor)) {
          // a mesma marca partida (ela atravessa um link) conta uma vez
          const mesma = !!anterior && ((m.dataset.m && anterior.dataset.m === m.dataset.m) || (m.dataset.pronto && anterior.nextSibling === m));
          anterior = m;
          if (mesma) continue;
          const r = document.createRange();
          r.setStart(txt, 0);
          r.setEndBefore(m);
          const cor = (m.style.getPropertyValue("--c") || m.style.getPropertyValue("--pronto-fundo") || m.style.getPropertyValue("--pronto-linha")).trim();
          saida.push({ i, pos: r.toString().length, cor });
        }
      }
      return saida;
    },
    [blocosAMostra],
  );
  const irAoGrifo = useCallback(
    (c: Extract<ComandoVoz, { tipo: "grifo" }>) => {
      let lista = grifosAMostra(c.de);
      let nomeDaCor = "";
      if (c.cor) {
        const legenda = leitorRef.current?.cores() ?? [];
        const dita = corDita(c.cor, legenda);
        if (!dita) return responder(`Não conheço a cor “${c.cor}”.${legenda.length ? ` As da legenda são: ${legenda.map((x) => x.rotulo).join(", ")}.` : ""}`);
        nomeDaCor = dita.nome;
        lista = lista.filter((g) => dita.casa(g.cor));
      }
      const de = c.de === "meus" ? " seus" : c.de === "prontos" ? " prontos" : "";
      const qualCor = nomeDaCor ? ` ${nomeDaCor.toLowerCase()}` : "";
      if (!lista.length) return responder(`Não há grifos${de}${qualCor} à mostra ${sumula ? "nas súmulas" : "nesta lei"}.`);
      const aqui = trechoAtual() ?? { i: -1, ini: -1, fim: -1 };
      const alvo =
        c.qual === "primeiro"
          ? lista[0]
          : c.qual === "ultimo"
            ? lista.at(-1)
            : c.qual === "proximo"
              ? lista.find((g) => g.i > aqui.i || (g.i === aqui.i && g.pos >= aqui.fim))
              : [...lista].reverse().find((g) => g.i < aqui.i || (g.i === aqui.i && g.pos < aqui.ini));
      if (!alvo) return responder(c.qual === "proximo" ? `Não há mais grifos${qualCor} depois daqui.` : `Não há grifos${qualCor} antes daqui.`);
      const item = lerDaPosicao(alvo.i, alvo.pos, `${ORDINAL[c.qual]} grifo${qualCor}.`);
      if (item) avisarRef.current(`Grifo${qualCor} ${lista.indexOf(alvo) + 1} de ${lista.length}: ${rotuloDoItem(item)}`);
    },
    [grifosAMostra, responder, sumula, trechoAtual, lerDaPosicao, rotuloDoItem],
  );
  /** os trechos do que está sendo lido: o pedaço dito, o bloco inteiro ou o artigo inteiro */
  const trechosDe = useCallback(
    (alcance: Alcance): TrechoDoBloco[] => {
      const at = narradorRef.current?.atual;
      if (!at) return [];
      const inteiro = (el: HTMLElement): TrechoDoBloco | null => {
        const n = el.querySelector<HTMLElement>(`:scope > .${CLASSES.txt}`)?.textContent?.length ?? 0;
        return n ? { i: Number(el.dataset.i), ini: 0, fim: n, inteiro: true } : null;
      };
      if (alcance === "artigo" && at.item.art)
        return blocosAMostra()
          .filter((el) => artigoDoEl(el) === at.item.art && tipoDe(el) !== "estrutura")
          .map(inteiro)
          .filter((x): x is TrechoDoBloco => !!x);
      const el = elDe(at.item.i);
      const todo = el ? inteiro(el) : null;
      const pc = at.item.pecas[at.p];
      if (alcance === "dispositivo" || !pc || pc.ini < 0) return todo ? [todo] : [];
      return [{ i: at.item.i, ini: pc.ini, fim: pc.fim, inteiro: !!todo && pc.ini === 0 && pc.fim >= todo.fim }];
    },
    [blocosAMostra, artigoDoEl, tipoDe, elDe],
  );
  /** vai ao artigo (com estrela, com erro) seguinte, anterior, primeiro ou último; `casa`: o bloco do artigo que vale */
  const irAoArtigoMarcado = useCallback(
    (casa: (el: HTMLElement) => boolean, qual: Ordem, nome: string, nenhum: string) => {
      const els = blocosAMostra().filter(casa);
      if (!els.length) return responder(nenhum);
      const at = narradorRef.current?.atual;
      const aqui = at?.item.i ?? trechoAtual()?.i ?? -1;
      const artAqui = at?.item.art ?? null;
      const outro = (el: HTMLElement) => artigoDoEl(el) !== artAqui;
      const alvo =
        qual === "primeiro"
          ? els[0]
          : qual === "ultimo"
            ? els.at(-1)
            : qual === "proximo"
              ? els.find((el) => Number(el.dataset.i) > aqui && outro(el))
              : [...els].reverse().find((el) => Number(el.dataset.i) < aqui && outro(el));
      if (!alvo) return responder(qual === "proximo" ? `Não há ${nome} depois daqui.` : `Não há ${nome} antes daqui.`);
      if (lerDoIndice(Number(alvo.dataset.i), undefined, true)) avisarRef.current(`${rotulosRef.current.get(artigoDoEl(alvo) ?? "") ?? "Artigo"} · ${els.indexOf(alvo) + 1} de ${els.length}`);
    },
    [blocosAMostra, responder, trechoAtual, artigoDoEl, lerDoIndice],
  );
  /** dentro do artigo: o parágrafo, o inciso ou a alínea seguinte, o anterior ou o de número dito */
  const irAoDispositivo = useCallback(
    (c: Extract<ComandoVoz, { tipo: "dispositivo" }>) => {
      const item = itemDoArtigo();
      const NOME = { paragrafo: "parágrafo", inciso: "inciso", alinea: "alínea" }[c.nivel];
      if (!item?.art || !item.disp) return responder(`Comece a leitura de um artigo para ir a um ${NOME} dele.`);
      const at = { item };
      const art = item.art;
      const segs = item.disp.split(".");
      const nivelDe = (seg: string) => (/^p/.test(seg) ? "paragrafo" : /^i\d/.test(seg) ? "inciso" : /^a[a-z]/.test(seg) ? "alinea" : null);
      const doArtigo = blocosAMostra().filter((el) => artigoDoEl(el) === art && el.dataset.disp);
      if (c.passo) {
        const lista = c.passo > 0 ? doArtigo.filter((el) => Number(el.dataset.i) > at.item.i) : [...doArtigo.filter((el) => Number(el.dataset.i) < at.item.i)].reverse();
        // o início de outro dispositivo do nível pedido (o bloco que continua o mesmo dispositivo não conta)
        const alvo = lista.find((el) => {
          const d = el.dataset.disp!;
          if (nivelDe(d.split(".").at(-1)!) !== c.nivel || d === at.item.disp) return false;
          const antes = el.previousElementSibling as HTMLElement | null;
          return antes?.dataset.disp !== d;
        });
        if (!alvo) return responder(c.passo > 0 ? `Não há ${c.nivel === "alinea" ? "próxima" : "próximo"} ${NOME} neste artigo.` : `Não há ${NOME} anterior neste artigo.`);
        lerDoIndice(Number(alvo.dataset.i));
        return;
      }
      // o de número dito: o parágrafo do artigo; o inciso do parágrafo em que se está (ou do caput); a alínea do inciso
      const base = segs[0]!;
      const par = segs.find((x) => /^p/.test(x));
      const inc = segs.find((x) => /^i\d/.test(x));
      const alvoDisp =
        c.nivel === "paragrafo"
          ? `${base}.p${c.n}`
          : c.nivel === "inciso"
            ? [base, par, `i${c.n}`].filter(Boolean).join(".")
            : inc
              ? [base, par, inc, `a${c.n}`].filter(Boolean).join(".")
              : null;
      const el = alvoDisp ? doArtigo.find((x) => x.dataset.disp === alvoDisp) : null;
      const rotuloN = c.nivel === "paragrafo" ? (c.n === "u" ? "único" : `${c.n}º`) : c.n;
      if (!el) return responder(c.nivel === "alinea" && !inc ? "Vá antes a um inciso: as alíneas são dele." : `Não encontrei ${c.nivel === "alinea" ? "a" : "o"} ${NOME} ${rotuloN} aqui.`);
      lerDoIndice(Number(el.dataset.i));
    },
    [responder, blocosAMostra, artigoDoEl, lerDoIndice, itemDoArtigo],
  );
  const executar = useCallback(
    (c: ComandoVoz) => {
      // outra lei: a página dela executa o comando quando o texto chegar
      if ("lei" in c && c.lei && c.lei !== lei) return irParaOutraLei(c.lei, c.tipo === "lei" ? null : ({ ...c, lei: undefined } as ComandoVoz));
      const n = narradorRef.current;
      switch (c.tipo) {
        case "pausar":
          n?.pausar();
          return avisarRef.current("Pausado pela voz. Diga “continua” para seguir.");
        case "continuar":
          if (n?.atual) {
            mudarSeguindo(true);
            n.continuar();
          } else iniciar();
          return;
        case "encerrar":
          fechar();
          return avisarRef.current("Leitura em voz alta encerrada.");
        case "proximo":
          return pular(1);
        case "anterior":
          return pular(-1);
        case "repetir":
          mudarSeguindo(true);
          return n?.repetir();
        case "proximoArtigo":
          return pularArtigo(1);
        case "artigoAnterior":
          return pularArtigo(-1);
        case "repetirArtigo":
          return repetirArtigo();
        case "maisRapido":
          return mudarVelocidade(0.15);
        case "maisDevagar":
          return mudarVelocidade(-0.15);
        case "velocidadeNormal":
          mudarPrefs({ velocidade: 1 });
          return avisarRef.current("Velocidade normal.");
        case "maisAlto":
        case "maisBaixo": {
          const antes = prefsRef.current.volume;
          const v = Math.round(Math.min(1, Math.max(0.2, antes + (c.tipo === "maisAlto" ? 0.2 : -0.2))) * 10) / 10;
          if (v === antes)
            return avisarRef.current(c.tipo === "maisAlto" ? "A voz já está no volume máximo: aumente o volume do aparelho ou do fone." : "A voz já está no volume mínimo.");
          mudarPrefs({ volume: v });
          return avisarRef.current(`Volume da voz: ${Math.round(v * 100)}%`);
        }
        case "ondeEstou":
          return narrador().anunciar(onde());
        case "ajuda":
          return narrador().anunciar(AJUDA_FALADA);
        case "irPara": {
          if (lerDoArtigo(c.alvo)) return;
          const numero = c.alvo.split(" ")[0];
          return responder(`Não encontrei ${c.sumula || sumula ? "a súmula" : "o artigo"} ${numero}.`);
        }
        case "lei":
          return responder(`Já está aberto: ${nomeDaLei(lei)}.`);
        case "divisao":
          return irParaDivisao(c);
        case "divisaoVizinha":
          return irParaVizinha(c);
        case "nome":
          return irPeloNome(c.nome);
        case "procurar": {
          const art = c.artigo ? artigoDoAlvo(c.artigo) : null;
          const noArtigo = art ? ` no ${paraFala(rotulosRef.current.get(art) ?? "artigo").replace(/\.$/, "").toLowerCase()}` : "";
          if (!procurarTexto(c.texto, art, posicaoAtual() ?? { i: -1, pos: -1 }, 1)) responder(`Não encontrei “${c.texto}”${noArtigo}.`);
          return;
        }
        case "procurarDeNovo": {
          const u = ultimaBusca.current;
          if (!u) return responder("Ainda não há uma busca. Diga, por exemplo: procura motivo torpe.");
          if (!procurarTexto(u.texto, u.artigo, u, c.passo)) responder(`Não encontrei mais “${u.texto}”.`);
          return;
        }
        case "velocidade": {
          const antes = prefsRef.current.velocidade;
          const pedida = c.extremo === "max" ? VELOCIDADE_MAX : c.extremo === "min" ? VELOCIDADE_MIN : (c.valor ?? antes + (c.passo ?? 0));
          const v = limitar(pedida);
          const ponta = v === VELOCIDADE_MAX ? " (a máxima)" : v === VELOCIDADE_MIN ? " (a mínima)" : "";
          if (v === antes) return avisarRef.current(`A velocidade já é ${fmtVel(v)}${ponta}.`);
          mudarPrefs({ velocidade: v });
          return avisarRef.current(`Velocidade ${fmtVel(v)}${ponta}.`);
        }
        case "volume": {
          const v = c.extremo === "max" ? 1 : c.extremo === "min" ? 0.2 : Math.round(Math.min(1, Math.max(0.2, c.valor ?? 1)) * 100) / 100;
          mudarPrefs({ volume: v });
          return avisarRef.current(`Volume da voz: ${Math.round(v * 100)}%${v === 1 && c.extremo === "max" ? " (para mais, aumente o volume do aparelho)" : ""}.`);
        }
        case "tom": {
          const t = c.passo ? Math.round(Math.min(1.5, Math.max(0.5, prefsRef.current.tom + c.passo * 0.1)) * 100) / 100 : 1;
          mudarPrefs({ tom: t });
          return avisarRef.current(c.passo ? `Tom da voz: ${t.toLocaleString("pt-BR")} (algumas vozes não mudam de tom).` : "Tom normal.");
        }
        case "info": {
          if (c.sobre === "velocidade") return responder(`Velocidade ${prefsRef.current.velocidade.toLocaleString("pt-BR")} vezes.`, `Velocidade ${fmtVel(prefsRef.current.velocidade)}.`);
          if (c.sobre === "volume") return responder(`Volume da voz: ${Math.round(prefsRef.current.volume * 100)} por cento.`, `Volume da voz: ${Math.round(prefsRef.current.volume * 100)}%.`);
          if (c.sobre === "lei") return responder(`Você está n${sumula ? "as" : "o"} ${nomeDaLei(lei)}.`);
          const pz = prazoRef.current;
          if (!pz) return responder("A leitura não tem hora para parar. Diga, por exemplo: parar daqui a 20 minutos.");
          const min = Math.max(1, Math.ceil((pz.fim - Date.now()) / 60_000));
          return responder(`A leitura para daqui a ${min} ${min === 1 ? "minuto" : "minutos"}, no fim do trecho.`);
        }
        case "grifo":
          return irAoGrifo(c);
        case "grifar":
        case "desgrifar": {
          const L = leitorRef.current;
          if (!L) return responder("Aqui não dá para grifar.");
          const trechos = trechosDe(c.alcance);
          if (!trechos.length) return responder("Comece a leitura: o trecho que estiver sendo lido é o grifado.");
          const qual = { artigo: "artigo", dispositivo: "dispositivo", trecho: "trecho" }[c.alcance];
          if (c.tipo === "desgrifar") {
            const n = L.desgrifar(trechos);
            return avisarRef.current(n ? `${n === 1 ? "Grifo apagado" : `${n} grifos apagados`} do ${qual}. Para desfazer, use o Desfazer do menu.` : `Não há grifo seu neste ${qual}.`);
          }
          const legenda = L.cores();
          const cor = c.cor ? corParaGrifar(c.cor, legenda)?.cor : L.corDoMarcador();
          if (!cor) return responder(c.cor ? `A legenda em uso não tem a cor “${c.cor}”. As cores dela são: ${legenda.map((x) => x.rotulo).join(", ")}.` : "Escolha uma cor da legenda para grifar.");
          if (!L.grifar(trechos, cor)) return responder("Não deu para grifar este trecho.");
          const significado = legenda.find((x) => x.cor === cor)?.rotulo;
          return avisarRef.current(`${qual.charAt(0).toUpperCase()}${qual.slice(1)} grifado${significado ? ` (${significado})` : ""}.`);
        }
        case "importante": {
          const estrelaDe = (el: HTMLElement | null) => el?.querySelector<HTMLButtonElement>(":scope > button[data-estrela]") ?? null;
          if (c.acao === "marcar" || c.acao === "desmarcar") {
            const art = itemDoArtigo()?.art;
            if (!art) return responder("Comece a leitura de um artigo para marcá-lo como importante.");
            const bloco = blocosAMostra().find((el) => el.dataset.disp === art && estrelaDe(el));
            const b = estrelaDe(bloco ?? null);
            if (!b) return responder("Este dispositivo não tem a estrela de importante.");
            const marcado = b.getAttribute("aria-pressed") === "true";
            const nomeArt = rotulosRef.current.get(art) ?? "O artigo";
            if (marcado === (c.acao === "marcar")) return avisarRef.current(`${nomeArt} ${marcado ? "já está" : "não está"} marcado como importante.`);
            b.click();
            return avisarRef.current(`${nomeArt}: ${c.acao === "marcar" ? "marcado como importante" : "a estrela saiu"}.`);
          }
          return irAoArtigoMarcado((el) => estrelaDe(el)?.getAttribute("aria-pressed") === "true", c.acao, "artigo importante", "Não há artigos marcados como importantes (com a estrela) à mostra.");
        }
        case "erro":
          return irAoArtigoMarcado((el) => el.dataset.comErro === "1", c.qual, "artigo com erro", "Não há artigos com erro à mostra (ligue “Marcar os artigos em que mais errei”, em Leitura).");
        case "dispositivo":
          return irAoDispositivo(c);
        case "pularVarios": {
          const nar = narrador();
          const inicio = n?.atual?.item;
          if (!inicio) return responder("Comece a leitura para pular.");
          let item: ItemFala = inicio;
          let k = 0;
          for (; k < c.n; k++) {
            const el = elDe(item.i);
            const prox: ItemFala | null = c.artigo ? nar.artigoVizinho(item, c.passo) : el ? andar(el, c.passo) : null;
            if (!prox) break;
            item = prox;
          }
          if (!k) return responder(c.passo > 0 ? "Não há mais para onde avançar." : "Não há mais para onde voltar.");
          desbloquear();
          lerItem(item, 0, k < c.n ? `Só deu para ${c.passo > 0 ? "avançar" : "voltar"} ${k}.` : undefined);
          return;
        }
        case "pararEm":
          pararDepoisDe(c.minutos);
          return avisarRef.current(c.minutos === null ? "A leitura não tem mais hora para parar." : `A leitura para daqui a ${c.minutos} ${c.minutos === 1 ? "minuto" : "minutos"}, no fim do trecho.`);
        case "aoFimDoArtigo":
          mudarPrefs({ aoFimDoArtigo: c.modo });
          return avisarRef.current(
            c.modo === "repetir" ? `Repetindo ${sumula ? "a súmula" : "o artigo"} sem parar (diga “leitura contínua” para seguir).` : c.modo === "parar" ? `A leitura pausa no fim de cada ${sumula ? "súmula" : "artigo"}.` : "Leitura contínua.",
          );
        case "lerTambem": {
          mudarPrefs({ [c.opcao]: c.ligar } as Partial<PrefsOuvir>);
          const nome = { titulos: "os títulos e capítulos", rubricas: "o nome do crime acima do artigo", notas: "as anotações entre parênteses" }[c.opcao];
          return avisarRef.current(`${c.ligar ? "Lendo também" : "Sem ler"} ${nome}.`);
        }
        case "pausaEntre":
          mudarPrefs({ pausaArtigo: c.ms });
          return avisarRef.current(c.ms ? `Pausa ${c.ms <= 700 ? "curta" : c.ms <= 1500 ? "média" : "longa"} entre ${sumula ? "as súmulas" : "os artigos"}.` : `Sem pausa entre ${sumula ? "as súmulas" : "os artigos"}.`);
        case "acompanhar":
          mudarPrefs({ acompanhar: c.ligar });
          if (c.ligar) voltarAoTrecho();
          return avisarRef.current(c.ligar ? "A tela acompanha a leitura." : "A tela não rola mais com a leitura.");
        case "voltarAoTrecho":
          return voltarAoTrecho();
        case "lerDaTela":
          return lerDaTela();
        case "desligarComandos":
          return alternarComandos(false);
        case "leitor": {
          const L = leitorRef.current;
          if (!L) return responder("Este comando é do leitor das leis.");
          L.comando(c.id, c.ligar);
          // "ler de onde parei": o leitor vai até lá, e a leitura começa dali
          if (c.id === "parei") window.setTimeout(() => lerDaTela(), 500);
          return;
        }
      }
    },
    [
      lei,
      irParaOutraLei,
      iniciar,
      fechar,
      pular,
      pularArtigo,
      repetirArtigo,
      mudarVelocidade,
      mudarPrefs,
      narrador,
      onde,
      lerDoArtigo,
      responder,
      sumula,
      mudarSeguindo,
      irParaDivisao,
      irParaVizinha,
      irPeloNome,
      artigoDoAlvo,
      procurarTexto,
      posicaoAtual,
      irAoGrifo,
      trechosDe,
      blocosAMostra,
      irAoArtigoMarcado,
      irAoDispositivo,
      itemDoArtigo,
      elDe,
      andar,
      lerItem,
      pararDepoisDe,
      voltarAoTrecho,
      lerDaTela,
      alternarComandos,
    ],
  );
  const executarRef = useRef(executar);
  useEffect(() => {
    executarRef.current = executar;
  }, [executar]);

  // ---------- um comando só (os dois toques no fone) ----------
  // a leitura pausa, um bipe avisa que pode falar e o microfone ouve um comando; com os comandos desligados, ele abre só
  // para isso. Sem comando em alguns segundos, outro bipe, e a leitura continua.
  const [escutaAvulsa, setEscutaAvulsa] = useState(false);
  const [esperandoComando, setEsperandoComando] = useState(false);
  const janela = useRef<{ aberta: boolean; retomar: boolean; timer: number } | null>(null);
  /** a pessoa começou a falar um comando: a leitura pausou à espera do fim da frase */
  const tentativa = useRef<{ retomar: boolean; timer: number } | null>(null);
  const semTentativa = useRef(new Set<string>());
  const escutaRef = useRef<Escuta | null>(null);
  const estadoEscutaRef = useRef<EstadoEscuta>("desligada");
  const fecharJanela = useCallback((ouviuComando: boolean) => {
    const j = janela.current;
    if (!j) return;
    window.clearTimeout(j.timer);
    janela.current = null;
    setEsperandoComando(false);
    if (!ouviuComando) {
      bipe("fechar");
      if (j.retomar) narradorRef.current?.continuar();
    }
    if (!prefsRef.current.comandos) setEscutaAvulsa(false);
  }, []);
  const prazoDaJanela = useCallback(
    (ms: number) => {
      const j = janela.current;
      if (!j) return;
      window.clearTimeout(j.timer);
      j.timer = window.setTimeout(() => {
        fecharJanela(false);
        avisarRef.current("Nenhum comando ouvido.");
      }, ms);
    },
    [fecharJanela],
  );
  const abrirJanela = useCallback(() => {
    const j = janela.current;
    if (!j || j.aberta) return;
    j.aberta = true;
    bipe("abrir");
    prazoDaJanela(7000);
  }, [prazoDaJanela]);
  /** a frase acabou (ou não veio): sem comando, a leitura pausada por ela continua */
  const encerrarTentativa = useCallback((retomar: boolean) => {
    const t = tentativa.current;
    if (!t) return;
    window.clearTimeout(t.timer);
    tentativa.current = null;
    if (!janela.current) setEsperandoComando(false);
    if (retomar && t.retomar) narradorRef.current?.continuar();
  }, []);
  const ouvirUmComando = useCallback(() => {
    // de novo os dois toques: desiste
    if (janela.current) return fecharJanela(false);
    const n = narradorRef.current;
    const retomar = n?.estado === "lendo";
    if (retomar) n!.pausar();
    // o microfone em pausa pelos silêncios volta a ouvir (e a janela abre quando ele estiver ouvindo)
    escutaRef.current?.acordar();
    janela.current = { aberta: false, retomar, timer: 0 };
    setEsperandoComando(true);
    setAtivo(true);
    avisarRef.current("Pode falar o comando.");
    if (prefsRef.current.comandos && estadoEscutaRef.current === "ouvindo") abrirJanela();
    else {
      setEscutaAvulsa(true);
      // o microfone não abriu: desiste
      prazoDaJanela(8000);
    }
  }, [abrirJanela, fecharJanela, prazoDaJanela]);

  const ouvindoComandos = ativo && (prefs.comandos || escutaAvulsa);
  useEffect(() => {
    if (!ouvindoComandos) return;
    const ouviu = (alternativas: string[], final: boolean, id: string) => {
      if (tratadas.current.has(id)) return;
      const j = janela.current;
      const naJanela = !!j?.aberta;
      // o microfone aberto só para um comando não ouve nada fora dele
      if (!naJanela && !prefsRef.current.comandos) return;
      const agora = Date.now();
      eco.current = eco.current.filter((x) => agora - x.t < JANELA_ECO_MS);
      const ditas = new Set(eco.current.flatMap((x) => x.palavras));
      // o microfone está ouvindo a leitura (pelo alto-falante): uma frase de 3 palavras ou mais, quase toda do que a voz disse.
      // Sem eco assim há um minuto (o fone de ouvido, ou o microfone fechado enquanto a voz lê), as palavras da leitura não
      // barram os comandos: "parágrafo 2" vale mesmo logo depois de a voz ler "parágrafo segundo"
      if (
        alternativas.some((a) => {
          const ps = palavrasDe(a).filter((x) => x.length > 2);
          return ps.length >= 3 && ps.filter((x) => ditas.has(x)).length / ps.length >= 0.7;
        })
      )
        ecoOuvidoEm.current = agora;
      // na janela, a leitura está pausada: não há eco a temer
      const recentes = naJanela || agora - ecoOuvidoEm.current > ECO_OUVIDO_MS ? new Set<string>() : ditas;
      // ainda falando: a janela espera a frase acabar
      if (naJanela && !final) prazoDaJanela(4000);
      // a pessoa começou um comando: a leitura pausa já, para ela falar sem a voz por cima (e o microfone ouvir melhor)
      if (!naJanela && !final && !semTentativa.current.has(id)) {
        const n = narradorRef.current;
        if (!tentativa.current && n?.estado === "lendo" && alternativas.some((a) => pareceComando(a, recentes))) {
          n.pausar();
          tentativa.current = { retomar: true, timer: 0 };
          setEsperandoComando(true);
        }
        const t = tentativa.current;
        if (t) {
          window.clearTimeout(t.timer);
          // a frase não terminou em alguns segundos: a leitura volta
          t.timer = window.setTimeout(() => encerrarTentativa(true), 5000);
        }
      }
      for (const alt of alternativas) {
        const c = interpretarComando(alt, recentes);
        if (!c) continue;
        if (!final) {
          // na frase ainda parcial, só os urgentes, e só se a mesma leitura se repetir (a parcial muda muito)
          if (!URGENTES.has(c.tipo)) return;
          if (parciais.current.get(id) !== c.tipo) return void parciais.current.set(id, c.tipo);
        }
        tratadas.current.add(id);
        if (tratadas.current.size > 200) tratadas.current = new Set([...tratadas.current].slice(-100));
        const pausada = naJanela ? j!.retomar : !!tentativa.current?.retomar;
        if (naJanela) fecharJanela(true);
        encerrarTentativa(false);
        // o que não muda o lugar da leitura (a velocidade, o volume, "onde estou") deixa a leitura seguir
        if (pausada && SEGUE_LENDO.has(c.tipo)) narradorRef.current?.continuar();
        executarRef.current(c);
        return;
      }
      if (naJanela && final) {
        fecharJanela(false);
        avisarRef.current(`Não entendi: “${alternativas[0]}”.`);
      } else if (final && tentativa.current) {
        // não era um comando: a leitura volta, e esta frase não pausa mais
        semTentativa.current.add(id);
        if (semTentativa.current.size > 200) semTentativa.current = new Set([...semTentativa.current].slice(-100));
        encerrarTentativa(true);
        avisarRef.current(`Não entendi: “${alternativas[0]}”.`);
      }
    };
    const aoEstado = (e: EstadoEscuta) => {
      estadoEscutaRef.current = e;
      setEscuta(e);
      if (e === "ouvindo") abrirJanela();
      const problema = PROBLEMAS_DA_ESCUTA[e];
      if (!problema) return;
      fecharJanela(false);
      avisarRef.current(problema);
      mudarPrefs({ comandos: false });
      setEscutaAvulsa(false);
    };
    const p = prefsRef.current;
    const e = new Escuta(ouviu, aoEstado, { microfone: p.microfone, sensibilidade: p.sensibilidade, naLeitura: p.microfoneNaLeitura, aoMicrofone: setMicrofoneEmUso });
    escutaRef.current = e;
    e.ligar();
    return () => {
      e.desligar();
      escutaRef.current = null;
      estadoEscutaRef.current = "desligada";
    };
  }, [ouvindoComandos, prefs.microfone, prefs.sensibilidade, prefs.microfoneNaLeitura, mudarPrefs, abrirJanela, fecharJanela, prazoDaJanela, encerrarTentativa]);
  const nivelDoMicrofone = useCallback(() => escutaRef.current?.nivel() ?? null, []);
  const somDoMicrofone = useCallback(() => escutaRef.current?.atividade() ?? null, []);
  const comando = useCallback((c: ComandoVoz) => executarRef.current(c), []);
  const previaAdiante = useCallback(
    (n: number, artigo: boolean): string | null => {
      const nar = narradorRef.current;
      let item = nar?.atual?.item ?? null;
      if (!nar || !item) return null;
      const passo = n > 0 ? 1 : -1;
      for (let k = 0; k < Math.abs(n); k++) {
        const el = elDe(item.i);
        const prox: ItemFala | null = artigo ? nar.artigoVizinho(item, passo) : el ? andar(el, passo) : null;
        if (!prox) break;
        item = prox;
      }
      // o artigo pelo número, com o nome do crime quando a leitura começa por ele ("Art. 123 · Infanticídio")
      const nome = artigo && item.art ? rotulosRef.current.get(item.art) : null;
      if (!nome) return rotuloDoItem(item);
      return item.disp ? nome : `${nome} · ${rotuloDoItem(item)}`;
    },
    [elDe, andar, rotuloDoItem],
  );
  const acordarMicrofone = useCallback(() => escutaRef.current?.acordar(), []);
  useEffect(() => {
    if (ativo) return;
    fecharJanela(false);
    encerrarTentativa(false);
  }, [ativo, fecharJanela, encerrarTentativa]);

  // ---------- os botões do fone e as teclas de mídia ----------
  const alternarRef = useRef(alternar);
  const pularRef = useRef(pular);
  const ouvirUmComandoRef = useRef(ouvirUmComando);
  useEffect(() => {
    alternarRef.current = alternar;
    pularRef.current = pular;
    ouvirUmComandoRef.current = ouvirUmComando;
  }, [alternar, pular, ouvirUmComando]);
  const querBotoes = ativo && prefs.botoesDoFone;
  useEffect(() => {
    if (!querBotoes || typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    // o navegador só entrega os botões a quem toca mídia: um silêncio feito em memória, em volta
    const url = URL.createObjectURL(silencioWav());
    const audio = new Audio(url);
    audio.loop = true;
    void audio.play().catch(() => {});
    const toque = (a: AcaoDoFone) => {
      if (a === "nada") return;
      if (a === "comando") return ouvirUmComandoRef.current();
      executarRef.current({ tipo: a });
    };
    // o toque simples: com a janela de comando aberta, desiste dela (e a leitura volta)
    const tocarOuPausar = () => (janela.current ? fecharJanela(false) : alternarRef.current());
    const acoes: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", tocarOuPausar],
      ["pause", tocarOuPausar],
      ["stop", () => narradorRef.current?.pausar()],
      ["nexttrack", () => toque(prefsRef.current.doisToques)],
      ["previoustrack", () => toque(prefsRef.current.tresToques)],
      ["seekforward", () => pularRef.current(1)],
      ["seekbackward", () => pularRef.current(-1)],
    ];
    for (const [a, f] of acoes) {
      try {
        ms.setActionHandler(a, f);
      } catch {
        // ação que o navegador não conhece
      }
    }
    return () => {
      for (const [a] of acoes) {
        try {
          ms.setActionHandler(a, null);
        } catch {
          // idem
        }
      }
      audio.pause();
      audio.removeAttribute("src");
      URL.revokeObjectURL(url);
      ms.metadata = null;
      ms.playbackState = "none";
    };
  }, [querBotoes, fecharJanela]);
  // o que aparece no controle de mídia do sistema (a tela de bloqueio do celular, o painel de mídia do Windows)
  useEffect(() => {
    if (!querBotoes || typeof navigator === "undefined" || !("mediaSession" in navigator) || typeof MediaMetadata === "undefined") return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: rotulo || nomeDaLei(lei),
      artist: nomeDaLei(lei),
      album: "Grifo · Ouvir",
      artwork: [{ src: "/icon-512.png", sizes: "512x512", type: "image/png" }],
    });
    navigator.mediaSession.playbackState = estado === "lendo" ? "playing" : "paused";
  }, [querBotoes, rotulo, estado, lei]);

  // ---------- chegando de outra lei por um comando de voz ----------
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a barra abre já na chegada, com os comandos ouvindo
    if (pendente && pendente.lei === lei && pendente.ate > Date.now()) setAtivo(true);
  }, [lei]);
  useEffect(() => {
    if (!pronto || !pendente || pendente.lei !== lei) return;
    const p = pendente;
    pendente = null;
    if (p.ate < Date.now()) return;
    prefixo.current = `${nomeDaLei(lei)}.`;
    if (p.comando) executarRef.current(p.comando);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- o texto da lei chegou: a leitura pedida pela voz começa
    else lerDaTela();
    prefixo.current = "";
  }, [pronto, lei, lerDaTela]);

  return {
    suportado,
    ativo,
    estado,
    tela,
    rotulo,
    prefs,
    mudarPrefs,
    vozes,
    vozAtual,
    escuta,
    podeEscutar,
    seguindo,
    bolha,
    prazo,
    iniciar,
    lerDaTela,
    lerDoBloco,
    lerDoArtigo,
    alternar,
    pular,
    pularArtigo,
    repetirArtigo,
    fechar,
    mudarVelocidade,
    testarVoz,
    voltarAoTrecho,
    pararDepoisDe,
    tocouNoTexto,
    fecharBolha,
    alternarComandos,
    microfoneEmUso,
    nivelDoMicrofone,
    somDoMicrofone,
    comando,
    previaAdiante,
    ouvirUmComando,
    acordarMicrofone,
    esperandoComando,
  };
}
