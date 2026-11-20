// Os comandos de voz: o reconhecimento de fala do navegador (SpeechRecognition; no Chrome e no Edge, o áudio vai para o
// serviço de reconhecimento do navegador), ligado sem parar enquanto a leitura em voz alta está aberta. O navegador encerra
// o reconhecimento sozinho depois de um silêncio: ele é religado, com uma espera maior a cada falha seguida. No Chrome do
// computador, o microfone pode ser escolhido (start(trilha)): assim o do fone Bluetooth fica desligado e o som não piora.
// Quando é o do fone que ouve (não há outro, ou foi o escolhido), ele fecha enquanto a voz lê (src/lib/fala/vez.ts): a
// leitura sai com o som normal, e o fone só fica no modo de chamada enquanto o microfone ouve. No celular, também: lá o
// microfone ouviria a própria leitura, e o Android bipa a cada vez que o reconhecimento liga e desliga. Pelo mesmo bipe,
// no celular o microfone entra em pausa depois de 5 minutos sem ouvir nada, e volta com um toque ou ao fim da leitura.
// A pessoa também pode silenciá-lo (o toque no microfone das barras): ele fica fechado até ela tocar de novo.
import { ehBluetooth, microfonesParaTentar, rotuloDoPadrao, type Microfone, type PreferenciaMicrofone } from "./microfone";
import { aoMudarVoz, microfoneFechou, vozNoAr } from "./vez";

/**
 * "em-espera": o microfone fechou enquanto a voz lê, e volta quando ela para; "em-pausa": no celular, depois de 5 minutos
 * sem ouvir nada, o microfone parou de religar (o Android bipa a cada vez) e volta com acordar() ou ao fim da leitura;
 * "silenciada": a pessoa fechou o microfone, e ele só volta com retomar()
 */
export type EstadoEscuta = "desligada" | "ouvindo" | "em-espera" | "em-pausa" | "silenciada" | "negada" | "sem-microfone" | "indisponivel" | "erro";

interface Alternativa {
  transcript: string;
}
interface Resultado {
  readonly isFinal: boolean;
  readonly length: number;
  [k: number]: Alternativa;
}
interface EventoResultado {
  resultIndex: number;
  results: { length: number; [k: number]: Resultado };
}
interface Reconhecimento {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(trilha?: MediaStreamTrack): void;
  stop(): void;
  abort(): void;
  onresult: ((e: EventoResultado) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  // o que o reconhecimento percebe (sem a medida do som, no celular, é o que diz se ele está ouvindo algo)
  onsoundstart?: (() => void) | null;
  onsoundend?: (() => void) | null;
  onspeechstart?: (() => void) | null;
  onspeechend?: (() => void) | null;
}
type ConstrutorReconhecimento = new () => Reconhecimento;

function construtor(): ConstrutorReconhecimento | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: ConstrutorReconhecimento; webkitSpeechRecognition?: ConstrutorReconhecimento };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** O navegador reconhece fala? (Chrome, Edge e Safari sim; Firefox não.) */
export const escutaDisponivel = () => construtor() !== null;

/** É celular ou tablet? (Lá o reconhecimento é o do sistema: no Android, ele bipa a cada vez que liga.) */
export function ehCelular(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = (navigator as { userAgentData?: { mobile?: boolean } }).userAgentData;
  return ua?.mobile ?? /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

let ouveTrilha: boolean | null = null;
/**
 * O reconhecimento aceita um microfone escolhido? (Chrome e Edge 133 ou mais novos, no computador.) Quem aceita recusa na
 * hora uma trilha já encerrada; quem não aceita ignora a trilha e começa a ouvir o padrão, e é parado em seguida.
 */
export function ouveMicrofoneEscolhido(): boolean {
  if (ouveTrilha !== null) return ouveTrilha;
  ouveTrilha = false;
  const C = construtor();
  const ua = (navigator as { userAgentData?: { brands?: { brand: string; version: string }[]; mobile?: boolean } }).userAgentData;
  const chromium = ua?.brands?.find((b) => b.brand === "Chromium");
  if (!C || !chromium || Number(chromium.version) < 133 || ua?.mobile || typeof AudioContext === "undefined") return false;
  try {
    const ctx = new AudioContext();
    const trilha = ctx.createMediaStreamDestination().stream.getAudioTracks()[0];
    trilha?.stop();
    const r = new C();
    try {
      r.start(trilha);
      r.abort();
    } catch (e) {
      ouveTrilha = e instanceof DOMException && e.name === "InvalidStateError";
    }
    void ctx.close().catch(() => {});
  } catch {
    // sem áudio no navegador: fica o padrão
  }
  return ouveTrilha;
}

/** Os microfones do aparelho (com nome só depois de o site ter a permissão do microfone). */
export async function listarMicrofones(): Promise<Microfone[]> {
  const md = typeof navigator === "undefined" ? undefined : navigator.mediaDevices;
  if (!md?.enumerateDevices) return [];
  return (await md.enumerateDevices()).filter((d) => d.kind === "audioinput").map((d) => ({ id: d.deviceId, rotulo: d.label, grupo: d.groupId }));
}

/** Quanto o som do microfone é reforçado antes do reconhecimento: com o microfone longe (o do notebook), "alta" ou "maxima". */
export type Sensibilidade = "normal" | "alta" | "maxima";
const GANHOS: Record<Sensibilidade, number> = { normal: 1, alta: 2.5, maxima: 5 };

// o número de cada sessão do reconhecimento, sem repetir entre uma escuta e outra: o id de cada frase ("sessão:k") não pode
// voltar a ser um que a escuta anterior já entregou
let sessoes = 0;

/**
 * O microfone enquanto a voz lê: "auto" fecha o do fone Bluetooth (que muda o som para o modo de chamada) e deixa os
 * outros ouvindo; "ouvir" deixa sempre ouvindo (os comandos valem no meio da leitura); "fechar" fecha sempre.
 */
export type NaLeitura = "auto" | "ouvir" | "fechar";
export const NA_LEITURA: [NaLeitura, string, string][] = [
  [
    "auto",
    "Automático",
    "Desliga quando quem ouve é o microfone do fone Bluetooth (assim a voz não sai no modo de chamada) e no celular (lá ele ouviria a própria leitura, e o Android bipa a cada vez que ele liga).",
  ],
  ["ouvir", "Sempre ligado", "Os comandos valem no meio da leitura. Com o microfone do fone Bluetooth, a voz sai com o som de ligação."],
  ["fechar", "Desligado enquanto lê", "O microfone só ouve quando a voz para: para falar no meio da leitura, pause-a antes (na tela ou nos botões do fone)."],
];

export interface OpcoesEscuta {
  /** "auto" (evita o microfone do fone Bluetooth), "padrao" ou o deviceId */
  microfone?: PreferenciaMicrofone;
  sensibilidade?: Sensibilidade;
  /** o microfone enquanto a voz lê (padrão: "auto") */
  naLeitura?: NaLeitura;
  /** o nome do microfone aberto; null: o padrão do sistema, aberto pelo próprio navegador */
  aoMicrofone?: (rotulo: string | null) => void;
}

/** Os erros de abrir um microfone que valem só para ele (sumiu, está ocupado): tenta-se o próximo. */
const SO_DESTE = new Set(["NotFoundError", "NotReadableError", "OverconstrainedError", "AbortError"]);

/**
 * O som do microfone reforçado: o ganho levanta a voz fraca e o compressor segura a forte (para não estourar); o analisador
 * mede o nível para a tela. Sem o áudio do navegador rodando (falta um toque na página), null: fica a trilha original.
 */
async function reforcar(trilha: MediaStreamTrack, ganho: number) {
  if (typeof AudioContext === "undefined") return null;
  const ctx = new AudioContext();
  if (ctx.state !== "running") await Promise.race([ctx.resume().catch(() => {}), new Promise((r) => setTimeout(r, 800))]);
  if (ctx.state !== "running") {
    void ctx.close().catch(() => {});
    return null;
  }
  const fonte = ctx.createMediaStreamSource(new MediaStream([trilha]));
  const pre = ctx.createGain();
  pre.gain.value = ganho;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -26;
  comp.knee.value = 10;
  comp.ratio.value = 8;
  comp.attack.value = 0.003;
  comp.release.value = 0.2;
  const analisador = ctx.createAnalyser();
  analisador.fftSize = 1024;
  const destino = ctx.createMediaStreamDestination();
  fonte.connect(pre).connect(comp).connect(destino);
  comp.connect(analisador);
  const saida = destino.stream.getAudioTracks()[0];
  return saida ? { ctx, analisador, trilha: saida } : null;
}

/** Depois de a voz parar, quanto esperar antes de abrir o microfone de novo (a próxima leitura pode vir logo). */
const RETOMAR_MS = 400;
/** A mesma frase final, de novo antes disso, é a repetida do Android (não outra vez a mesma resposta). */
const REPETIDA_MS = 600;
/** No celular, quanto tempo sem ouvir nada (o microfone ligado, religando a cada silêncio) antes de ele entrar em pausa. */
export const SILENCIO_ATE_PAUSAR_MS = 5 * 60_000;
/** O tempo de silêncio até a pausa: os testes o encurtam (window.__grifoSilencioMs). */
const silencioAtePausar = () => (globalThis as { __grifoSilencioMs?: number }).__grifoSilencioMs ?? SILENCIO_ATE_PAUSAR_MS;

/**
 * Ouve o que a pessoa diz e entrega as frases reconhecidas (as alternativas de cada uma). `final`: a frase acabou; antes
 * disso, a frase parcial chega para os comandos urgentes ("pausa") não esperarem o fim.
 */
export class Escuta {
  private rec: Reconhecimento | null = null;
  private ligada = false;
  private falhas = 0;
  private religar: ReturnType<typeof setTimeout> | null = null;
  private trilha: MediaStreamTrack | null = null;
  private bruta: MediaStreamTrack | null = null;
  private audio: AudioContext | null = null;
  private analisador: AnalyserNode | null = null;
  private amostras: Float32Array<ArrayBuffer> | null = null;
  /** o microfone que ouve é o do fone Bluetooth (ou "fechar"): fecha enquanto a voz lê */
  private mudaOSom = false;
  /** fechada enquanto a voz lê */
  private emEspera = false;
  private retomada: ReturnType<typeof setTimeout> | null = null;
  private soltarVez: (() => void) | null = null;
  /** conta as aberturas: a que terminou depois de outra começar (ou de a escuta fechar) é descartada */
  private abertura = 0;
  private abriuAgora = false;
  /** quando o microfone começou a ouvir, depois de abrir (ou de voltar da espera) */
  ouvindoDesde = 0;
  /** no celular: em pausa depois do tempo sem ouvir nada */
  private emPausa = false;
  /** desde quando o microfone não ouve nada (a última frase ouvida, ou quando ele abriu) */
  private quietoDesde = 0;
  private ouviuNaSessao = false;
  /** a pessoa fechou o microfone (o toque nele): fica fechado até retomar() */
  private silenciada = false;
  /** o que o reconhecimento percebe agora: som, fala e quando chegou a última palavra */
  private percebido = { som: false, fala: false, palavra: 0 };

  constructor(
    /** `id`: a frase (a mesma frase chega várias vezes, parcial, até ficar final) */
    private aoOuvir: (alternativas: string[], final: boolean, id: string) => void,
    private aoEstado: (e: EstadoEscuta) => void,
    private opcoes: OpcoesEscuta = {},
  ) {}

  ligar() {
    const C = construtor();
    if (!C) return this.aoEstado("indisponivel");
    this.ligada = true;
    this.falhas = 0;
    this.soltarVez ??= aoMudarVoz((lendo) => this.vozMudou(lendo));
    void this.abrir(C);
  }

  /** O nível do som que o reconhecimento está ouvindo, de 0 a 1 (null: o navegador abriu o microfone, e ele não é medido). */
  nivel(): number | null {
    const a = this.analisador;
    if (!a) return null;
    this.amostras ??= new Float32Array(a.fftSize);
    a.getFloatTimeDomainData(this.amostras);
    let soma = 0;
    for (const x of this.amostras) soma += x * x;
    const db = 20 * Math.log10(Math.sqrt(soma / this.amostras.length) || 1e-6);
    // de -60 dB (silêncio) a -6 dB (voz forte)
    return Math.max(0, Math.min(1, (db + 60) / 54));
  }

  /**
   * Quanto som chega ao microfone, de 0 a 1, para o anel do botão: a medida, quando há; sem ela (o navegador abriu o
   * microfone, como no celular), o que o reconhecimento percebe: um som, uma fala, as palavras chegando. null: fechado.
   */
  atividade(): number | null {
    const n = this.nivel();
    if (n !== null) return n;
    if (!this.rec) return null;
    const p = this.percebido;
    if (Date.now() - p.palavra < 260) return 0.8;
    if (p.fala) return 0.5;
    if (p.som) return 0.25;
    return 0.04;
  }

  /** Fecha o microfone até retomar() (o toque no microfone): nem a leitura que acaba, nem a questão nova o abrem. */
  silenciar() {
    if (!this.ligada || this.silenciada) return;
    this.silenciada = true;
    this.emPausa = false;
    this.emEspera = false;
    if (this.retomada) clearTimeout(this.retomada);
    this.retomada = null;
    const aberto = !!this.rec || this.bruta?.readyState === "live";
    this.abertura++;
    this.fecharMicrofone();
    if (aberto) microfoneFechou();
    this.aoEstado("silenciada");
  }

  /** Abre de novo o microfone silenciado (com a voz lendo e o microfone que muda o som, ele espera ela parar). */
  retomar() {
    const C = construtor();
    if (!this.ligada || !this.silenciada || !C) return;
    this.silenciada = false;
    if (this.mudaOSom && vozNoAr()) return this.esperar();
    void this.abrir(C);
  }

  get estaSilenciada(): boolean {
    return this.silenciada;
  }

  /** O microfone deste nome muda o som enquanto ouve? (Pela preferência do "enquanto a voz lê".) */
  private decidir(rotulo: string | null): boolean {
    const n = this.opcoes.naLeitura ?? "auto";
    if (n === "fechar") return true;
    if (n === "ouvir") return false;
    return ehCelular() || (!!rotulo && ehBluetooth(rotulo));
  }

  /** Volta a ouvir depois da pausa dos silêncios (um toque na tela, um comando pelo fone, a leitura que terminou). */
  acordar() {
    const C = construtor();
    if (!this.ligada || !this.emPausa || this.silenciada || !C) return;
    this.emPausa = false;
    if (this.mudaOSom && vozNoAr()) return this.esperar();
    void this.abrir(C);
  }

  /** Abre o microfone (o escolhido ou o do navegador) e começa a ouvir; com a voz lendo e o microfone que muda o som, espera. */
  private async abrir(C: ConstrutorReconhecimento) {
    const vez = ++this.abertura;
    this.abriuAgora = true;
    this.quietoDesde = Date.now();
    const doNavegador = (this.opcoes.microfone ?? "auto") === "padrao" && (this.opcoes.sensibilidade ?? "alta") === "normal";
    if (!doNavegador && ouveMicrofoneEscolhido()) {
      if (!(await this.abrirMicrofone(vez))) return;
    } else {
      this.opcoes.aoMicrofone?.(null);
      // o navegador abre o padrão do sistema: o nome dele (com a permissão já dada) diz se é o do fone
      const lista = await listarMicrofones().catch(() => []);
      if (vez !== this.abertura || !this.ligada) return;
      this.mudaOSom = this.decidir(rotuloDoPadrao(lista) || null);
      if (this.mudaOSom && vozNoAr()) return this.esperar();
    }
    if (vez === this.abertura && this.ligada) this.iniciar(C);
  }

  /**
   * Abre o microfone escolhido (ou, no automático, outro que não o do fone Bluetooth; se ele não abrir, o seguinte) com o
   * som reforçado pela sensibilidade. false: não há o que ouvir agora (negado, fechado no meio, ou à espera da voz).
   */
  private async abrirMicrofone(vez: number): Promise<boolean> {
    const md = navigator.mediaDevices;
    const valendo = () => vez === this.abertura && this.ligada;
    try {
      let lista = await listarMicrofones();
      if (!lista.some((m) => m.rotulo) && md?.getUserMedia) {
        // sem a permissão, os nomes vêm vazios: o pedido abre o microfone padrão por um instante, e a lista vem com nomes
        const s = await md.getUserMedia({ audio: true });
        s.getTracks().forEach((t) => t.stop());
        lista = await listarMicrofones();
      }
      if (!valendo()) return false;
      if (!md?.getUserMedia) {
        this.opcoes.aoMicrofone?.(null);
        return true;
      }
      const ids = microfonesParaTentar(lista, this.opcoes.microfone ?? "auto");
      const rotuloDe = (id: string) => lista.find((m) => m.id === id)?.rotulo ?? "";
      // com a voz lendo, o microfone que muda o som nem abre: espera ela parar (a tela já diz qual vai ouvir)
      const previsto = (ids[0] ? rotuloDe(ids[0]) : rotuloDoPadrao(lista)) || null;
      this.mudaOSom = this.decidir(previsto);
      if (this.mudaOSom && vozNoAr()) {
        this.opcoes.aoMicrofone?.(previsto);
        this.esperar();
        return false;
      }
      const audio = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
      let t: MediaStreamTrack | null = null;
      let id: string | null = null;
      for (const tentar of ids) {
        try {
          t = (await md.getUserMedia({ audio: { ...audio, deviceId: { exact: tentar } } })).getAudioTracks()[0] ?? null;
          id = tentar;
          break;
        } catch (e) {
          if (!(e instanceof DOMException && SO_DESTE.has(e.name))) throw e;
        }
      }
      // nenhum dos escolhidos abriu: o padrão do sistema, aberto aqui para o som passar pelo reforço
      t ??= (await md.getUserMedia({ audio })).getAudioTracks()[0] ?? null;
      if (!valendo() || !t) {
        t?.stop();
        return false;
      }
      // o nome da lista de microfones (o da trilha, aberta sem escolher, pode não ser o do aparelho)
      const rotulo = (id && rotuloDe(id)) || rotuloDoPadrao(lista) || t.label || null;
      this.mudaOSom = this.decidir(rotulo);
      if (this.mudaOSom && vozNoAr()) {
        t.stop();
        this.esperar();
        return false;
      }
      this.bruta = t;
      // o microfone sumiu (o fone desligou, o cabo saiu): abre de novo, sem cair no padrão
      t.addEventListener("ended", () => {
        if (this.bruta !== t || !this.ligada || this.emEspera) return;
        this.fecharMicrofone();
        const C = construtor();
        if (C) void this.abrir(C);
      });
      const r = await reforcar(t, GANHOS[this.opcoes.sensibilidade ?? "alta"]);
      if (!valendo()) {
        t.stop();
        void r?.ctx.close().catch(() => {});
        if (this.bruta === t) this.bruta = null;
        return false;
      }
      this.trilha = r?.trilha ?? t;
      this.audio = r?.ctx ?? null;
      this.analisador = r?.analisador ?? null;
      this.opcoes.aoMicrofone?.(rotulo);
      return true;
    } catch (e) {
      if (e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError")) {
        this.ligada = false;
        this.aoEstado("negada");
        return false;
      }
      // nenhum microfone abriu: fica o que o navegador abrir
      this.opcoes.aoMicrofone?.(null);
      return valendo();
    }
  }

  /** A voz começou ou parou de ler: o microfone que muda o som fecha e, depois, abre de novo. */
  private vozMudou(lendo: boolean) {
    if (!this.ligada || this.silenciada) return;
    if (lendo) {
      if (this.retomada) clearTimeout(this.retomada);
      this.retomada = null;
      // em pausa pelos silêncios, o microfone já está fechado: ao fim da leitura, ele volta
      if (this.mudaOSom && !this.emEspera) {
        this.emPausa = false;
        this.esperar();
      }
      return;
    }
    if ((!this.emEspera && !this.emPausa) || this.retomada) return;
    this.retomada = setTimeout(() => {
      this.retomada = null;
      const C = construtor();
      if (!this.ligada || this.silenciada || vozNoAr() || !C) return;
      if (this.emPausa) return this.acordar();
      if (!this.emEspera) return;
      this.emEspera = false;
      void this.abrir(C);
    }, RETOMAR_MS);
  }

  /** Fecha o microfone enquanto a voz lê: o fone sai do modo de chamada. */
  private esperar() {
    const aberto = !!this.rec || this.bruta?.readyState === "live";
    this.abertura++;
    this.fecharMicrofone();
    this.emEspera = true;
    if (aberto) microfoneFechou();
    this.aoEstado("em-espera");
  }

  /** Para o reconhecimento e solta o microfone (a escuta continua ligada). */
  private fecharMicrofone() {
    if (this.religar) clearTimeout(this.religar);
    this.religar = null;
    this.trilha?.stop();
    this.bruta?.stop();
    this.trilha = this.bruta = null;
    void this.audio?.close().catch(() => {});
    this.audio = null;
    this.analisador = null;
    const r = this.rec;
    this.rec = null;
    this.percebido = { som: false, fala: false, palavra: 0 };
    if (r) {
      r.onend = r.onerror = r.onresult = r.onstart = null;
      r.onsoundstart = r.onsoundend = r.onspeechstart = r.onspeechend = null;
      try {
        r.abort();
      } catch {
        // já estava parado
      }
    }
  }

  desligar() {
    this.ligada = false;
    this.abertura++;
    this.emEspera = false;
    this.emPausa = false;
    this.silenciada = false;
    if (this.retomada) clearTimeout(this.retomada);
    this.retomada = null;
    this.soltarVez?.();
    this.soltarVez = null;
    this.fecharMicrofone();
    this.aoEstado("desligada");
  }

  private iniciar(C: ConstrutorReconhecimento) {
    if (!this.ligada || this.emEspera || this.silenciada) return;
    // o microfone escolhido parou (sumiu, ou o sistema o fechou): abre de novo, em vez de ouvir o padrão
    if ((this.bruta && this.bruta.readyState !== "live") || (this.trilha && this.trilha.readyState !== "live")) {
      this.fecharMicrofone();
      void this.abrir(C);
      return;
    }
    const r = new C();
    this.rec = r;
    const sessao = ++sessoes;
    // a frase ainda parcial (o Chrome do Android às vezes encerra a escuta sem dar a final: ela vale como final) e as
    // finais já entregues (ele também entrega de novo, noutro índice, a frase que acabou de dar)
    let pendente: { alternativas: string[]; id: string } | null = null;
    const finais = new Map<string, number>();
    r.lang = "pt-BR";
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 3;
    r.onstart = () => {
      this.ouviuNaSessao = false;
      if (this.abriuAgora) {
        this.abriuAgora = false;
        this.ouvindoDesde = Date.now();
      }
      this.aoEstado("ouvindo");
    };
    r.onsoundstart = () => (this.percebido.som = true);
    r.onsoundend = () => (this.percebido = { ...this.percebido, som: false, fala: false });
    r.onspeechstart = () => (this.percebido.fala = true);
    r.onspeechend = () => (this.percebido.fala = false);
    r.onresult = (e) => {
      this.falhas = 0;
      this.ouviuNaSessao = true;
      this.quietoDesde = Date.now();
      this.percebido.palavra = Date.now();
      for (let k = e.resultIndex; k < e.results.length; k++) {
        const res = e.results[k]!;
        const alternativas: string[] = [];
        for (let j = 0; j < res.length; j++) if (res[j]?.transcript) alternativas.push(res[j]!.transcript);
        if (!alternativas.length) continue;
        const id = `${sessao}:${k}`;
        if (!res.isFinal) {
          pendente = { alternativas, id };
          this.aoOuvir(alternativas, false, id);
          continue;
        }
        if (pendente?.id === id) pendente = null;
        const chave = alternativas[0]!.trim().toLowerCase();
        const antes = finais.get(chave);
        finais.set(chave, Date.now());
        if (antes !== undefined && Date.now() - antes < REPETIDA_MS) continue;
        this.aoOuvir(alternativas, true, id);
      }
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        this.ligada = false;
        return this.aoEstado("negada");
      }
      if (e.error === "audio-capture") {
        this.ligada = false;
        return this.aoEstado("sem-microfone");
      }
      if (e.error === "language-not-supported") {
        this.ligada = false;
        return this.aoEstado("indisponivel");
      }
      // "no-speech" e "aborted" são o silêncio de sempre; "network" e os outros contam como falha
      if (e.error !== "no-speech" && e.error !== "aborted") this.falhas++;
    };
    r.onend = () => {
      if (this.rec !== r) return;
      this.rec = null;
      this.percebido = { som: false, fala: false, palavra: 0 };
      // a escuta acabou sozinha com a frase ainda parcial: ela vale como dita
      if (pendente && this.ligada) {
        const p = pendente;
        pendente = null;
        this.aoOuvir(p.alternativas, true, p.id);
      }
      if (!this.ligada || this.emEspera || this.silenciada) return;
      if (this.falhas >= 6) {
        this.ligada = false;
        return this.aoEstado("erro");
      }
      // no celular, cada religada bipa: depois de um tempo sem ouvir nada, o microfone espera um toque
      if (!this.ouviuNaSessao && !this.falhas && Date.now() - this.quietoDesde >= silencioAtePausar() && ehCelular()) {
        this.fecharMicrofone();
        this.emPausa = true;
        return this.aoEstado("em-pausa");
      }
      // religa logo depois do silêncio; depois de falhas seguidas (sem internet), espera mais
      const espera = this.falhas ? Math.min(8000, 600 * 2 ** this.falhas) : 250;
      this.religar = setTimeout(() => {
        this.religar = null;
        this.iniciar(C);
      }, espera);
    };
    try {
      if (this.trilha) r.start(this.trilha);
      else r.start();
    } catch {
      this.falhas++;
      r.onend?.();
    }
  }
}
