// A questão lida em voz alta no treino (responder falando): o caso, o comando e as alternativas, e depois da resposta a
// correção. Usa o narrador do Ouvir (a voz do navegador, nenhum arquivo de som), com a voz, a velocidade e o volume
// escolhidos lá. Guarda as palavras recém-ditas: o microfone que ouve a própria leitura (o eco) não vira resposta.
import { palavrasDe } from "@/lib/fala/comandos-voz";
import { Narrador, vozesEmPortugues, type Fala, type ItemFala, type Sintese } from "@/lib/fala/narrador";
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
/** O que dizer de uma questão, item a item: o caso, o comando e cada alternativa ("Letra bê: Apelação."). */
export function textosDaQuestao(l: LeituraDaQuestao, so: "tudo" | "alternativas" = "tudo"): string[] {
  const alternativas = l.alternativas.map((t, k) => `Letra ${LETRA_FALADA[k] ?? k + 1}: ${t}`);
  return so === "alternativas" ? alternativas : [l.caso, l.comando, ...alternativas].filter((t) => t.trim());
}

// por quanto tempo as palavras ditas contam como eco: o reconhecimento entrega a frase com uns segundos de atraso
const JANELA_ECO_MS = 5000;
// depois de a voz parar, o eco ainda pode chegar por um instante
const RABO_ECO_MS = 1000;

export class Locutor {
  private n: Narrador | null = null;
  /** o que está sendo lido: a questão ou, depois da resposta, a correção */
  private lista: ItemFala[] = [];
  private eco: { t: number; palavras: string[] }[] = [];
  private fimEm = 0;
  private prefs: VozDoOuvir = {};
  /** o que fazer quando a leitura da vez termina sozinha (parada ou trocada por outra, não) */
  private aoFim: (() => void) | null = null;

  constructor(private aoMudar: (lendo: boolean) => void = () => {}) {}

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
   * sozinha (não quando é parada ou trocada por outra).
   */
  ler(textos: string[], opcoes: { aoFim?: () => void } = {}) {
    this.aoFim = null;
    if (!temVoz()) return void opcoes.aoFim?.();
    const itens: ItemFala[] = textos
      .map((t, i): ItemFala => ({ i, art: "questao", tipo: "texto", pecas: pecasDoTexto(comPronuncia(t), "texto") }))
      .filter((it) => it.pecas.length);
    if (!itens.length) return void opcoes.aoFim?.();
    this.aoFim = opcoes.aoFim ?? null;
    this.lista = itens;
    const n = this.narrador();
    // a voz pode ter carregado depois (as vozes do navegador chegam aos poucos)
    n.configurar(this.config());
    n.ler(itens[0]!, 0);
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
          this.aoMudar(e === "lendo");
        },
        falando: (item, p) => {
          this.eco.push({ t: Date.now(), palavras: palavrasDe(item.pecas[p]?.falar ?? "") });
        },
        fimDaLei: () => {
          this.fimEm = Date.now();
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

  get lendo(): boolean {
    return this.n?.estado === "lendo";
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
