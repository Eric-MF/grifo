// A questão lida em voz alta no treino (responder falando): o caso, o comando e as alternativas, e depois da resposta a
// correção. Usa o narrador do Ouvir (a voz do navegador, nenhum arquivo de som), com a voz, a velocidade e o volume
// escolhidos lá. Guarda as palavras recém-ditas: o microfone que ouve a própria leitura (o eco) não vira resposta. Diz
// também que parte da questão está lendo, e onde no texto dela (o treino destaca o trecho e o mantém à vista).
import { palavrasDe } from "@/lib/fala/comandos-voz";
import { Narrador, vozesEmPortugues, type EstadoNarrador, type Fala, type ItemFala, type Sintese } from "@/lib/fala/narrador";
import { pecasDoTexto } from "@/lib/fala/texto";
import nomes from "@/content/generated/nomes-mitologia.json";
import { LETRAS, type Letra, type Pergunta } from "./types";
import type { Correcao } from "./verificar";

/** O que ler da questão: o caso, o comando e as alternativas (vazias nas de digitar). */
export interface LeituraDaQuestao {
  caso: string;
  comando: string;
  alternativas: string[];
}

/** As preferências da voz do Ouvir (grifo:leitor:ouvir) que valem aqui. */
export interface VozDoOuvir {
  voz?: string | null;
  velocidade?: number;
  tom?: number;
  volume?: number;
}

const temVoz = () => typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
/** O navegador lê em voz alta? */
export const leituraDisponivel = temVoz;

let desbloqueado = false;
/** No iPhone, a primeira fala precisa sair dentro de um toque: uma fala muda no toque (Começar) libera as seguintes. */
export function desbloquearVoz() {
  if (desbloqueado || !temVoz()) return;
  desbloqueado = true;
  if (window.speechSynthesis.speaking || window.speechSynthesis.pending) return;
  const u = new SpeechSynthesisUtterance(" ");
  u.volume = 0;
  window.speechSynthesis.speak(u);
}

// os nomes da mitologia que a escrita engana, como a voz deve dizê-los (content/nomes-mitologia.yaml, "pronuncia")
const PRONUNCIA: Record<string, string> = (nomes as { pronuncia?: Record<string, string> }).pronuncia ?? {};
const NOMES_A_CORRIGIR = Object.keys(PRONUNCIA).sort((a, b) => b.length - a.length);
const RE_NOMES = NOMES_A_CORRIGIR.length ? new RegExp(`(?<![\\p{L}])(${NOMES_A_CORRIGIR.join("|")})(?![\\p{L}])`, "gu") : null;
/** O texto com os nomes escritos como a voz deve dizê-los ("Medeia" → "Medéia"). */
export const comPronuncia = (texto: string) => (RE_NOMES ? texto.replace(RE_NOMES, (n) => PRONUNCIA[n] ?? n) : texto);

/** As letras como a voz deve dizê-las ("Letra bê"). */
const LETRA_FALADA = ["á", "bê", "cê", "dê", "é"];

/**
 * Um texto a ler e a parte da tela a que ele corresponde: "caso", "comando", "alt0"… (a alternativa A…), "correcao".
 * Sem parte, o texto não está na tela (a ajuda, o exemplo da voz).
 */
export interface ParteLida {
  texto: string;
  parte?: string;
  /** onde o texto está escrito na tela, se é ele mesmo (o caso e o comando); sem isso, a parte inteira é destacada */
  naTela?: boolean;
}
/** As partes de uma questão, como a voz as lê: o caso, o comando e cada alternativa ("Letra bê: Apelação"). */
export function partesDaQuestao(l: LeituraDaQuestao, so: "tudo" | "alternativas" = "tudo"): ParteLida[] {
  const alternativas = l.alternativas.map((t, k): ParteLida => ({ texto: `Letra ${LETRA_FALADA[k] ?? k + 1}: ${t}`, parte: `alt${k}` }));
  if (so === "alternativas") return alternativas;
  return [{ texto: l.caso, parte: "caso", naTela: true }, { texto: l.comando, parte: "comando", naTela: true }, ...alternativas].filter((t) => t.texto.trim());
}
/** O que dizer de uma questão, item a item: o caso, o comando e cada alternativa ("Letra bê: Apelação."). */
export function textosDaQuestao(l: LeituraDaQuestao, so: "tudo" | "alternativas" = "tudo"): string[] {
  return partesDaQuestao(l, so).map((p) => p.texto);
}

/** O trecho que a voz está dizendo: a parte, e o começo e o fim dele no texto da parte (null: a parte inteira). */
export interface TrechoLido {
  parte: string;
  /** o trecho no texto da parte, quando o texto é o da tela */
  faixa: { ini: number; fim: number } | null;
}

// por quanto tempo as palavras ditas contam como eco: o reconhecimento entrega a frase com uns segundos de atraso
const JANELA_ECO_MS = 5000;
// depois de a voz parar, o eco ainda pode chegar por um instante
const RABO_ECO_MS = 1000;

export class Locutor {
  private n: Narrador | null = null;
  /** o que está sendo lido: a questão ou, depois da resposta, a correção */
  private lista: ItemFala[] = [];
  /** de cada item da lista: o texto de que ele veio (o índice), a parte da tela e o trecho escrito */
  private origem: { j: number; parte?: string; naTela: boolean; trecho: string }[] = [];
  private eco: { t: number; palavras: string[] }[] = [];
  private fimEm = 0;
  private prefs: VozDoOuvir = {};
  /** o que fazer quando a leitura da vez termina sozinha (parada ou trocada por outra, não) */
  private aoFim: (() => void) | null = null;

  /** `aoMudar`: lendo, pausada (continua de onde parou) ou parada; `aoTrecho`: o trecho dito agora (null: parou) */
  constructor(
    private aoMudar: (estado: EstadoNarrador) => void = () => {},
    private aoTrecho: (t: TrechoLido | null) => void = () => {},
  ) {}

  configurar(p: VozDoOuvir) {
    this.prefs = p;
    this.n?.configurar(this.config());
  }

  private config() {
    const vozes = temVoz() ? vozesEmPortugues(window.speechSynthesis.getVoices()) : [];
    const voz = vozes.find((v) => v.voiceURI === this.prefs.voz) ?? vozes[0] ?? null;
    const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
    // as vozes do Google no Chrome do computador param sozinhas depois de uns 15 s de fala: pausar e retomar evita
    const manterViva = !!voz && !voz.localService && /google/i.test(voz.name) && /Chrome\//.test(ua) && !/Android|Mobile/i.test(ua);
    return {
      voz,
      lingua: "pt-BR",
      velocidade: this.prefs.velocidade ?? 1,
      tom: this.prefs.tom ?? 1,
      volume: this.prefs.volume ?? 1,
      pausaArtigo: 0,
      aoFimDoArtigo: "seguir" as const,
      manterViva,
    };
  }

  /**
   * Lê os textos, um depois do outro, cortando o que estava sendo lido. `aoFim`: chamado quando a leitura termina
   * sozinha (não quando é parada ou trocada por outra). Cada frase é um trecho: "volta" e "avança" andam de frase em frase.
   * `aPartirDe`: começa na primeira frase da parte cujo nome começa assim ("alt": as alternativas).
   */
  ler(textos: (string | ParteLida)[], opcoes: { aoFim?: () => void; aPartirDe?: string } = {}) {
    this.aoFim = null;
    if (!temVoz()) return void opcoes.aoFim?.();
    const itens: ItemFala[] = [];
    const origem: Locutor["origem"] = [];
    textos.forEach((t, j) => {
      const { texto, parte, naTela = false } = typeof t === "string" ? { texto: t } : t;
      // os pedaços saem do texto como está na tela (o destaque acha o trecho nele); a pronúncia vale só no que é dito
      for (const peca of pecasDoTexto(texto, "texto")) {
        itens.push({ i: itens.length, art: "questao", tipo: "texto", pecas: [{ ...peca, falar: comPronuncia(peca.falar) }] });
        origem.push({ j, parte, naTela, trecho: texto.slice(peca.ini, peca.fim) });
      }
    });
    if (!itens.length) return void opcoes.aoFim?.();
    this.aoFim = opcoes.aoFim ?? null;
    this.lista = itens;
    this.origem = origem;
    const n = this.narrador();
    // a voz pode ter carregado depois (as vozes do navegador chegam aos poucos)
    n.configurar(this.config());
    const k = opcoes.aPartirDe ? origem.findIndex((o) => o.parte?.startsWith(opcoes.aPartirDe!)) : 0;
    n.ler(itens[Math.max(0, k)]!, 0);
  }

  /** A frase em que a leitura está (ou de onde ela continua) e quantas há; null: nada sendo lido. */
  posicao(): { k: number; total: number } | null {
    const at = this.n?.atual;
    if (!at || this.n?.estado === "parado") return null;
    const k = this.lista.indexOf(at.item);
    return k < 0 ? null : { k, total: this.lista.length };
  }

  /** O começo da frase `k`, para mostrar ("“Tício foi denunciado…”"), com a parte de que ela é. */
  previa(k: number): { texto: string; parte?: string } | null {
    const o = this.origem[k];
    if (!o) return null;
    const t = o.trecho.replace(/\s+/g, " ").trim();
    if (t.length <= 70) return { texto: t, parte: o.parte };
    // cortado no espaço, sem partir a palavra
    const corte = t.lastIndexOf(" ", 68);
    return { texto: `${t.slice(0, corte > 40 ? corte : 68).replace(/[\s,;:]+$/, "")}…`, parte: o.parte };
  }

  /** Lê a partir da frase `k` (vale também com a leitura pausada). false: não há essa frase. */
  irPara(k: number): boolean {
    const it = this.lista[k];
    if (!it || !this.n) return false;
    this.n.ler(it, 0);
    return true;
  }

  /**
   * A parte seguinte (o caso, a pergunta, cada alternativa) ou, para trás, o começo desta (se já está nele, a anterior).
   * false: não há para onde ir.
   */
  pularParte(passo: 1 | -1): boolean {
    const pos = this.posicao();
    if (!pos) return false;
    const j = this.origem[pos.k]!.j;
    const inicio = this.origem.findIndex((o) => o.j === j);
    const alvo =
      passo > 0
        ? this.origem.findIndex((o) => o.j > j)
        : pos.k > inicio
          ? inicio
          : this.origem.findIndex((o) => o.j === this.origem[inicio - 1]?.j);
    return alvo >= 0 && this.irPara(alvo);
  }

  private narrador(): Narrador {
    if (this.n) return this.n;
    this.n = new Narrador(
      window.speechSynthesis as unknown as Sintese,
      (texto) => new SpeechSynthesisUtterance(texto) as unknown as Fala,
      // a fonte é a lista da vez: o mesmo narrador lê a questão e, depois, a correção
      {
        depois: (it) => this.lista[this.lista.indexOf(it) + 1] ?? null,
        antes: (it) => this.lista[this.lista.indexOf(it) - 1] ?? null,
      },
      this.config(),
      {
        estado: (e) => {
          if (e !== "lendo") this.fimEm = Date.now();
          if (e === "parado") this.aoTrecho(null);
          this.aoMudar(e);
        },
        falando: (item, p) => {
          this.eco.push({ t: Date.now(), palavras: palavrasDe(item.pecas[p]?.falar ?? "") });
          const o = this.origem[this.lista.indexOf(item)];
          const pc = item.pecas[p];
          if (!o?.parte) return this.aoTrecho(null);
          this.aoTrecho({ parte: o.parte, faixa: o.naTela && pc && pc.ini >= 0 ? { ini: pc.ini, fim: pc.fim } : null });
        },
        fimDaLei: () => {
          this.fimEm = Date.now();
          this.aoTrecho(null);
          const f = this.aoFim;
          this.aoFim = null;
          f?.();
        },
      },
    );
    return this.n;
  }

  /** Para de ler (o que faltava não é lido depois). `aPedido`: a pessoa pediu ("parar"), e a resposta já pode vir. */
  parar(aPedido = false) {
    this.aoFim = null;
    this.n?.parar();
    if (aPedido) this.fimEm = 0;
  }

  /** Pausa no trecho em que está ("continua" segue dali). `aPedido`: a pessoa pediu, e a resposta já pode vir. */
  pausar(aPedido = false) {
    this.n?.pausar();
    if (aPedido) this.fimEm = 0;
  }

  /** Continua a leitura pausada. false: não havia o que continuar. */
  continuar(): boolean {
    if (this.n?.estado !== "pausado") return false;
    this.n.continuar();
    return true;
  }

  /** O trecho (a frase) seguinte ou o anterior; pausada, a leitura volta a andar. false: não há para onde ir. */
  pular(passo: 1 | -1): boolean {
    if (!this.n || this.n.estado === "parado") return false;
    return this.n.pular(passo);
  }

  /** De novo o trecho em que está. */
  repetirTrecho(): boolean {
    if (!this.n || this.n.estado === "parado") return false;
    this.n.repetir();
    return true;
  }

  get lendo(): boolean {
    return this.n?.estado === "lendo";
  }

  /** Quando a voz parou de ler pela última vez (0: ainda não leu). */
  get terminouEm(): number {
    return this.fimEm;
  }

  get estado(): EstadoNarrador {
    return this.n?.estado ?? "parado";
  }

  /**
   * A voz está lendo, ou acabou de ler (o eco do fim ainda pode chegar): enquanto isso, o que o microfone ouve pode ser a
   * própria leitura, e só os comandos da leitura valem.
   */
  get ocupado(): boolean {
    return this.lendo || Date.now() - this.fimEm < RABO_ECO_MS;
  }

  /**
   * As palavras ditas há pouco, enquanto a voz lê ou logo depois de ela parar: o que a pessoa disse quase todo nelas é o
   * eco da leitura. Fora disso, vazio (a resposta pode repetir o texto da alternativa à vontade).
   */
  recentes(): Set<string> {
    const agora = Date.now();
    if (!this.lendo && agora - this.fimEm > RABO_ECO_MS) return new Set();
    this.eco = this.eco.filter((x) => agora - x.t < JANELA_ECO_MS);
    return new Set(this.eco.flatMap((x) => x.palavras));
  }

  fechar() {
    this.n?.destruir();
    this.n = null;
  }
}

/**
 * A correção dita depois da resposta: "Correto!" ou, no erro, o certo e o errado de cada parte ("A peça certa é
 * Apelação, e não Memoriais. O fundamento certo é o art. 593…, e não o art. 403…"). Sem "diga próxima": o eco dessa
 * frase seguiria para a próxima questão sozinho (a linha do microfone mostra o que dizer).
 */
export function correcaoFalada(p: Pergunta, r: Correcao): string {
  if (r.acertou) return "Correto!";
  const e = (dito: string | null | undefined) => (dito?.trim() ? `, e não ${dito.trim()}` : "");
  if (r.formato === "objetiva" && p.formato === "objetiva") {
    const letra = (l: Letra) => LETRA_FALADA[LETRAS.indexOf(l)] ?? l;
    return `Errado. A certa é a letra ${letra(r.correta)}: ${p.alternativas[r.correta]}. Você marcou a letra ${letra(r.escolhida)}: ${p.alternativas[r.escolhida]}.`;
  }
  if (r.formato === "peca") {
    const d = r.respondida;
    const pecaDita = d?.peca;
    // as alternativas: sem fundamento escrito, a peça certa e o fundamento dela
    if (r.acertouFundamento === null) return `Errado. A peça certa é ${r.pecaEsperada}, com fundamento no ${r.fundamentoEsperado}${e(pecaDita)}.`;
    const artigoDito = d?.artigos[0]?.texto ?? d?.fundamento;
    const peca = r.acertouPeca ? `A peça está certa: ${r.pecaEsperada}.` : `Errado. A peça certa é ${r.pecaEsperada}${e(pecaDita)}.`;
    const fundamento = r.acertouFundamento ? `O fundamento está certo: ${r.fundamentoEsperado}.` : `O fundamento certo é ${r.fundamentoEsperado}${e(artigoDito)}.`;
    return `${peca} ${fundamento}`;
  }
  if (r.formato === "tese") {
    const d = r.respondida;
    const teseDita = d.tese ?? d.alternativa;
    const artigoDito = d.artigos[0]?.texto ?? d.artigo;
    const partes: string[] = [];
    if (r.acertouTese === true) partes.push(`O ponto central está certo: ${r.teseEsperada}.`);
    else if (r.acertouTese === false) partes.push(`Errado. O ponto central certo é ${r.teseEsperada}${e(teseDita)}.`);
    if (r.acertouArtigo === true) partes.push(`O artigo está certo: ${r.artigoEsperado}.`);
    else if (r.acertouArtigo === false) partes.push(`${partes.length ? "" : "Errado. "}O artigo certo é ${r.artigoEsperado}${e(artigoDito)}.`);
    else partes.push(`O artigo é ${r.artigoEsperado}.`);
    return partes.join(" ");
  }
  return "Errado.";
}
