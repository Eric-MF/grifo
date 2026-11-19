// A leitura em voz alta, com a voz do próprio navegador (speechSynthesis): nenhum arquivo de som. O texto vem em itens (um
// por dispositivo) partidos em pedaços curtos; alguns pedaços ficam na fila da voz à frente do que está sendo dito, então a
// leitura não para entre um e outro, e o que está sendo dito chega pelo `onstart` de cada pedaço.
// Pausar é cancelar e lembrar o pedaço: o pause() da voz não funciona no Android. Um vigia recupera a voz que se perde
// (o Chrome às vezes não avisa o fim de uma fala, ou corta as longas).
import type { Peca, TipoBloco } from "./texto";

export interface ItemFala {
  /** o bloco do texto (data-i) */
  i: number;
  /** o artigo a que o item pertence ("art121"); títulos e capítulos não pertencem a nenhum (null) */
  art: string | null;
  tipo: TipoBloco;
  disp?: string;
  pecas: Peca[];
}

/** De onde vêm os itens, na ordem da lei (no leitor, o texto que está na tela). */
export interface FonteFala {
  depois(item: ItemFala): ItemFala | null;
  antes(item: ItemFala): ItemFala | null;
}

export type EstadoNarrador = "parado" | "lendo" | "pausado";
export type AoFimDoArtigo = "seguir" | "repetir" | "parar";

export interface ConfigNarrador {
  voz: SpeechSynthesisVoice | null;
  lingua: string;
  velocidade: number;
  tom: number;
  /** o volume da voz, de 0 a 1 (o do aparelho continua valendo por cima) */
  volume?: number;
  /** pausa entre um artigo e outro, em ms */
  pausaArtigo: number;
  aoFimDoArtigo: AoFimDoArtigo;
  /** pausar e retomar a voz a cada 10 s: as vozes do Google no Chrome do computador param sozinhas depois de uns 15 s */
  manterViva: boolean;
}

export interface EventosNarrador {
  estado?(e: EstadoNarrador): void;
  /** começou a falar o pedaço `p` do item */
  falando?(item: ItemFala, p: number): void;
  fimDaLei?(): void;
  /** parou no fim do artigo (ao terminar o artigo, "parar") ou pelo tempo ("parar depois de") */
  parou?(motivo: "artigo" | "tempo"): void;
  erro?(mensagem: string, codigo?: string): void;
}

/** O pedaço de fala que o navegador recebe (SpeechSynthesisUtterance, ou um falso nos testes). */
export interface Fala {
  text: string;
  lang: string;
  voice: SpeechSynthesisVoice | null;
  rate: number;
  pitch: number;
  volume: number;
  onstart: ((e: unknown) => void) | null;
  onend: ((e: unknown) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
}
export interface Sintese {
  speak(f: Fala): void;
  cancel(): void;
  pause(): void;
  resume(): void;
  readonly speaking: boolean;
  readonly pending: boolean;
  readonly paused: boolean;
}

interface Entrada {
  item: ItemFala;
  p: number;
  fala: Fala;
  gen: number;
  inicio: number;
}
interface Cursor {
  item: ItemFala;
  p: number;
  /** o item é o começo de outro artigo (a pausa entre artigos, o "repetir" e o "parar" valem aqui) */
  novoArtigo: boolean;
  /** o item anterior (para o "repetir": o artigo que acabou) */
  vindoDe?: ItemFala;
}

/** quantos pedaços ficam na fila da voz à frente do que está sendo dito */
const NA_FILA = 3;
/** letras por segundo na velocidade 1 (para saber quando uma fala demorou demais) */
const LETRAS_POR_SEGUNDO = 13;

export const ehMesmoArtigo = (a: ItemFala, b: ItemFala) => a.art === b.art;

export class Narrador {
  estado: EstadoNarrador = "parado";
  /** o pedaço que está sendo dito (ou de onde a leitura continua, se pausada) */
  atual: { item: ItemFala; p: number } | null = null;
  private fila: Entrada[] = [];
  private cursor: Cursor | null = null;
  private gen = 0;
  private espera: ReturnType<typeof setTimeout> | null = null;
  private vigia: ReturnType<typeof setInterval> | null = null;
  private viva: ReturnType<typeof setInterval> | null = null;
  private semVoz = 0;
  private recuperacoes = 0;
  private falhas = 0;
  /** parar no fim do dispositivo depois deste instante (o "parar depois de") */
  prazo: number | null = null;
  private ultimoFalado: ItemFala | null = null;
  private retomadaEm = -Infinity;
  private enchendo = false;

  constructor(
    private sintese: Sintese,
    private criarFala: (texto: string) => Fala,
    private fonte: FonteFala,
    public config: ConfigNarrador,
    private eventos: EventosNarrador = {},
    private agora: () => number = () => Date.now(),
  ) {}

  /** Lê a partir do pedaço `p` do item. */
  ler(item: ItemFala, p = 0) {
    const ocupada = this.sintese.speaking || this.sintese.pending;
    this.cancelarTudo();
    this.atual = { item, p };
    this.cursor = { item, p, novoArtigo: false };
    this.recuperacoes = 0;
    this.mudarEstado("lendo");
    this.ligarVigia();
    // depois de cancelar uma fala, o Safari ignora a próxima se ela vier logo; sem nada falando, vai na hora (no iPhone a
    // primeira fala precisa sair dentro do toque)
    if (ocupada) this.espera = setTimeout(() => this.liberarEEncher(), 120);
    else this.encher();
  }

  pausar() {
    if (this.estado !== "lendo") return;
    this.cancelarTudo();
    this.mudarEstado("pausado");
  }

  continuar() {
    if (this.estado === "lendo" || !this.atual) return;
    this.ler(this.atual.item, this.atual.p);
  }

  alternar() {
    if (this.estado === "lendo") this.pausar();
    else this.continuar();
  }

  parar() {
    this.cancelarTudo();
    this.atual = null;
    this.cursor = null;
    this.mudarEstado("parado");
  }

  /** O dispositivo seguinte (1) ou o anterior (-1). Sem para onde ir, false. */
  pular(passo: 1 | -1): boolean {
    const base = this.atual?.item;
    if (!base) return false;
    const alvo = passo > 0 ? this.fonte.depois(base) : this.fonte.antes(base);
    if (!alvo) return false;
    this.ler(alvo);
    return true;
  }

  /** O começo do artigo do item: o primeiro item com o mesmo artigo (a rubrica que vem antes dele entra). */
  inicioDoArtigo(item: ItemFala): ItemFala {
    let k = item;
    for (let n = 0; n < 5000; n++) {
      const a = this.fonte.antes(k);
      if (!a || !ehMesmoArtigo(a, item)) break;
      k = a;
    }
    return k;
  }

  /** O começo do artigo seguinte (1) ou do anterior (-1), sem os títulos e capítulos do meio. */
  artigoVizinho(item: ItemFala, passo: 1 | -1): ItemFala | null {
    if (passo > 0) {
      let k: ItemFala | null = item;
      for (let n = 0; n < 5000 && k; n++) {
        k = this.fonte.depois(k);
        if (k && k.art !== null && k.art !== item.art) return k;
      }
      return null;
    }
    let k: ItemFala | null = this.fonte.antes(this.inicioDoArtigo(item));
    while (k && k.art === null) k = this.fonte.antes(k);
    return k ? this.inicioDoArtigo(k) : null;
  }

  pularArtigo(passo: 1 | -1): boolean {
    const base = this.atual?.item;
    if (!base) return false;
    const alvo = this.artigoVizinho(base, passo);
    if (!alvo) return false;
    this.ler(alvo);
    return true;
  }

  /** De novo o pedaço que está sendo dito; com `artigo`, desde o começo do artigo. */
  repetir(artigo = false) {
    if (!this.atual) return;
    if (artigo) this.ler(this.inicioDoArtigo(this.atual.item));
    else this.ler(this.atual.item, this.atual.p);
  }

  /** Diz um aviso curto ("Você está no artigo…") e depois continua a leitura (se ela estava em andamento). */
  anunciar(texto: string) {
    const continuar = this.estado === "lendo";
    const voltar = this.atual;
    this.cancelarTudo();
    const gen = this.gen;
    const f = this.nova(texto);
    let feito = false;
    const depois = () => {
      if (feito || gen !== this.gen) return;
      feito = true;
      if (continuar && voltar) this.ler(voltar.item, voltar.p);
    };
    f.onend = depois;
    f.onerror = depois;
    if (!continuar) this.mudarEstado(this.atual ? "pausado" : "parado");
    this.sintese.speak(f);
  }

  /** Muda a voz, a velocidade ou o tom; lendo, o pedaço atual recomeça com a voz nova. */
  configurar(c: Partial<ConfigNarrador>) {
    const antes = this.config;
    this.config = { ...antes, ...c };
    const audivel =
      (c.voz !== undefined && c.voz !== antes.voz) ||
      (c.velocidade !== undefined && c.velocidade !== antes.velocidade) ||
      (c.tom !== undefined && c.tom !== antes.tom) ||
      (c.volume !== undefined && c.volume !== antes.volume);
    if (audivel && this.estado === "lendo" && this.atual) this.ler(this.atual.item, this.atual.p);
    if (c.manterViva !== undefined) this.ligarVigia();
  }

  /** Para no fim do dispositivo em que estiver daqui a `ms` (null: sem prazo). */
  pararDepoisDe(ms: number | null) {
    this.prazo = ms === null ? null : this.agora() + ms;
  }

  destruir() {
    this.parar();
    if (this.vigia) clearInterval(this.vigia);
    if (this.viva) clearInterval(this.viva);
    this.vigia = this.viva = null;
  }

  // ---------- por dentro ----------

  private mudarEstado(e: EstadoNarrador) {
    if (e !== "lendo" && this.vigia) {
      clearInterval(this.vigia);
      this.vigia = null;
    }
    if (e !== "lendo" && this.viva) {
      clearInterval(this.viva);
      this.viva = null;
    }
    if (this.estado === e) return;
    this.estado = e;
    this.eventos.estado?.(e);
  }

  private cancelarTudo() {
    this.gen++;
    if (this.espera) clearTimeout(this.espera);
    this.espera = null;
    this.fila = [];
    this.semVoz = 0;
    this.sintese.cancel();
    // uma voz pausada (por outra página, ou pelo "manter viva" interrompido) não fala mais nada até ser retomada
    if (this.sintese.paused) this.sintese.resume();
  }

  private nova(texto: string): Fala {
    const f = this.criarFala(texto);
    f.lang = this.config.voz?.lang ?? this.config.lingua;
    if (this.config.voz) f.voice = this.config.voz;
    f.rate = this.config.velocidade;
    f.pitch = this.config.tom;
    f.volume = this.config.volume ?? 1;
    return f;
  }

  private proximo(c: Cursor): Cursor | null {
    if (c.p + 1 < c.item.pecas.length) return { item: c.item, p: c.p + 1, novoArtigo: false };
    const prox = this.fonte.depois(c.item);
    if (!prox) return null;
    return { item: prox, p: 0, novoArtigo: !ehMesmoArtigo(prox, c.item), vindoDe: c.item };
  }

  private liberarEEncher() {
    this.espera = null;
    if (this.cursor) this.cursor.novoArtigo = false;
    this.encher();
  }

  /** Põe pedaços na fila da voz até NA_FILA; na troca de artigo espera a fila acabar (pausa, repetir, parar, prazo). */
  private encher() {
    // o navegador pode avisar o começo de uma fala dentro do speak(): quem já está enchendo continua
    if (this.estado !== "lendo" || this.espera || this.enchendo) return;
    this.enchendo = true;
    try {
      this.encherFila();
    } finally {
      this.enchendo = false;
    }
    if (this.estado === "lendo" && !this.espera && !this.cursor && !this.fila.length) this.fim();
  }

  private encherFila() {
    while (this.fila.length < NA_FILA && this.cursor) {
      const c = this.cursor;
      if (c.novoArtigo) {
        const precisaEsperar = this.config.pausaArtigo > 0 || this.config.aoFimDoArtigo !== "seguir" || this.prazo !== null;
        if (precisaEsperar) {
          if (this.fila.length) return;
          if (this.prazo !== null && this.agora() >= this.prazo) return this.pararAqui(c.item, "tempo");
          if (this.config.aoFimDoArtigo === "parar") return this.pararAqui(c.item, "artigo");
          if (this.config.aoFimDoArtigo === "repetir" && c.vindoDe) {
            this.cursor = { item: this.inicioDoArtigo(c.vindoDe), p: 0, novoArtigo: false };
            if (this.config.pausaArtigo > 0) {
              this.espera = setTimeout(() => this.liberarEEncher(), this.config.pausaArtigo);
              return;
            }
            continue;
          }
          if (this.config.pausaArtigo > 0) {
            this.espera = setTimeout(() => this.liberarEEncher(), this.config.pausaArtigo);
            return;
          }
        }
        c.novoArtigo = false;
      }
      this.cursor = this.proximo(c);
      this.enfileirar(c);
    }
  }

  private pararAqui(item: ItemFala, motivo: "artigo" | "tempo") {
    if (motivo === "tempo") this.prazo = null;
    this.cancelarTudo();
    this.atual = { item, p: 0 };
    this.cursor = null;
    this.mudarEstado("pausado");
    this.eventos.parou?.(motivo);
  }

  private fim() {
    this.cancelarTudo();
    this.mudarEstado("parado");
    this.eventos.fimDaLei?.();
  }

  private enfileirar(c: Cursor) {
    const peca = c.item.pecas[c.p];
    if (!peca) return;
    const f = this.nova(peca.falar);
    const e: Entrada = { item: c.item, p: c.p, fala: f, gen: this.gen, inicio: 0 };
    f.onstart = () => this.aoComecar(e);
    f.onend = () => this.aoTerminar(e);
    f.onerror = (ev) => this.aoErro(e, ev?.error);
    this.fila.push(e);
    this.sintese.speak(f);
  }

  private aoComecar(e: Entrada) {
    if (e.gen !== this.gen) return;
    e.inicio = this.agora();
    this.recuperacoes = 0;
    this.falhas = 0;
    // o prazo do "parar depois de" acaba no fim do dispositivo: no começo do próximo, a leitura para
    if (this.prazo !== null && this.agora() >= this.prazo && e.p === 0 && this.ultimoFalado && this.ultimoFalado.i !== e.item.i) {
      this.pararAqui(e.item, "tempo");
      return;
    }
    this.atual = { item: e.item, p: e.p };
    this.ultimoFalado = e.item;
    this.eventos.falando?.(e.item, e.p);
    this.encher();
  }

  private aoTerminar(e: Entrada) {
    if (e.gen !== this.gen) return;
    const k = this.fila.indexOf(e);
    if (k < 0) return;
    // o que vinha antes dele na fila também acabou (o navegador às vezes não avisa)
    this.fila.splice(0, k + 1);
    this.encher();
  }

  private aoErro(e: Entrada, codigo?: string) {
    if (e.gen !== this.gen) return;
    if (codigo === "interrupted" || codigo === "canceled") {
      // outra fala (de outra aba, de outro app, o microfone que liga) tomou a voz: tenta de novo uma vez; se voltar a
      // acontecer logo, a leitura fica pausada neste pedaço
      this.atual = { item: e.item, p: e.p };
      if (this.agora() - this.retomadaEm > 20_000) {
        this.retomadaEm = this.agora();
        this.cancelarTudo();
        this.cursor = { item: e.item, p: e.p, novoArtigo: false };
        this.espera = setTimeout(() => this.liberarEEncher(), 800);
        return;
      }
      this.cancelarTudo();
      this.mudarEstado("pausado");
      this.eventos.erro?.("A leitura foi interrompida por outro som. Toque em ▶ para continuar.", codigo);
      return;
    }
    if (codigo === "not-allowed") {
      this.atual = { item: e.item, p: e.p };
      this.cancelarTudo();
      this.mudarEstado("pausado");
      this.eventos.erro?.("O navegador só deixa a voz começar com um toque. Toque em ▶ para ouvir.", codigo);
      return;
    }
    // a voz falhou neste pedaço: avisa (a voz da internet, sem conexão) e segue para o próximo
    this.eventos.erro?.("A voz falhou num trecho.", codigo);
    if (++this.falhas >= 3) {
      this.atual = { item: e.item, p: e.p };
      this.cancelarTudo();
      this.mudarEstado("pausado");
      this.eventos.erro?.("A voz não está respondendo. Escolha outra voz em Ouvir ▸ Voz, ou toque em ▶ para tentar de novo.", "falhas");
      return;
    }
    this.aoTerminar(e);
  }

  private ligarVigia() {
    if (this.estado !== "lendo") return;
    this.vigia ??= setInterval(() => this.vigiar(), 1000);
    if (this.config.manterViva && !this.viva)
      this.viva = setInterval(() => {
        if (this.sintese.speaking && !this.sintese.paused) {
          this.sintese.pause();
          this.sintese.resume();
        }
      }, 10_000);
    if (!this.config.manterViva && this.viva) {
      clearInterval(this.viva);
      this.viva = null;
    }
  }

  /** A cada segundo: a voz parou sem avisar, ou está presa num pedaço há tempo demais? Então recomeça dali. */
  private vigiar() {
    if (this.estado !== "lendo" || this.espera) return;
    if (!this.fila.length) {
      if (this.cursor) this.encher();
      return;
    }
    const falando = this.sintese.speaking || this.sintese.pending;
    this.semVoz = falando ? 0 : this.semVoz + 1;
    const e = this.fila[0]!;
    const limite = Math.max(12_000, (3 * e.fala.text.length * 1000) / (LETRAS_POR_SEGUNDO * Math.max(0.5, this.config.velocidade)) + 6000);
    if (this.semVoz >= 3) this.recuperar(e, false);
    else if (e.inicio && this.agora() - e.inicio > limite) this.recuperar(e, true);
  }

  private recuperar(e: Entrada, pularEste: boolean) {
    if (++this.recuperacoes > 3) {
      this.atual = { item: e.item, p: e.p };
      this.cancelarTudo();
      this.mudarEstado("pausado");
      this.eventos.erro?.("A voz do aparelho parou de responder. Toque em ▶ para tentar de novo.", "parada");
      return;
    }
    const c: Cursor = { item: e.item, p: e.p, novoArtigo: false };
    const alvo = pularEste ? this.proximo(c) : c;
    this.cancelarTudo();
    if (!alvo) return this.fim();
    this.cursor = { ...alvo, novoArtigo: false };
    this.espera = setTimeout(() => this.liberarEEncher(), 120);
  }
}

// ---------- vozes ----------

// vozes "de brincadeira" da Apple, que existem em português e não servem para ler lei
const VOZES_ENGRACADAS = /\b(eddy|flo|grandma|grandpa|vov[óo]|reed|rocko|sandy|shelley|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|albert|fred|junior|kathy|ralph)\b/i;

/** Nota de qualidade de uma voz em português: as neurais ("Natural", "Online", "Melhorada", "Premium") primeiro, o Brasil antes de Portugal. */
export function notaDaVoz(v: Pick<SpeechSynthesisVoice, "name" | "lang" | "localService">): number {
  const nome = v.name;
  let n = 0;
  if (/^pt[-_]br/i.test(v.lang)) n += 100;
  else if (/^pt/i.test(v.lang)) n += 40;
  else return -1;
  if (VOZES_ENGRACADAS.test(nome)) return n - 90;
  if (/natural|neural|online/i.test(nome)) n += 40;
  if (/premium/i.test(nome)) n += 38;
  if (/enhanced|melhorad|aprimorad/i.test(nome)) n += 30;
  if (/google/i.test(nome)) n += 22;
  if (/microsoft/i.test(nome)) n += 8;
  if (/compact|compacta/i.test(nome)) n -= 10;
  return n;
}

/** As vozes em português, da melhor para a pior. */
export function vozesEmPortugues<V extends Pick<SpeechSynthesisVoice, "name" | "lang" | "localService">>(vozes: readonly V[]): V[] {
  return vozes
    .filter((v) => notaDaVoz(v) >= 0)
    .sort((a, b) => notaDaVoz(b) - notaDaVoz(a) || a.name.localeCompare(b.name));
}
