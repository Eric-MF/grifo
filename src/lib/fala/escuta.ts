// Os comandos de voz: o reconhecimento de fala do navegador (SpeechRecognition; no Chrome e no Edge, o áudio vai para o
// serviço de reconhecimento do navegador), ligado sem parar enquanto a leitura em voz alta está aberta. O navegador encerra
// o reconhecimento sozinho depois de um silêncio: ele é religado, com uma espera maior a cada falha seguida. No Chrome do
// computador, o microfone pode ser escolhido (start(trilha)): assim o do fone Bluetooth fica desligado e o som não piora.
import { escolherMicrofone, type Microfone, type PreferenciaMicrofone } from "./microfone";

export type EstadoEscuta = "desligada" | "ouvindo" | "negada" | "sem-microfone" | "indisponivel" | "erro";

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
}
type ConstrutorReconhecimento = new () => Reconhecimento;

function construtor(): ConstrutorReconhecimento | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: ConstrutorReconhecimento; webkitSpeechRecognition?: ConstrutorReconhecimento };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** O navegador reconhece fala? (Chrome, Edge e Safari sim; Firefox não.) */
export const escutaDisponivel = () => construtor() !== null;

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

export interface OpcoesEscuta {
  /** "auto" (evita o microfone do fone Bluetooth), "padrao" ou o deviceId */
  microfone?: PreferenciaMicrofone;
  sensibilidade?: Sensibilidade;
  /** o nome do microfone aberto; null: o padrão do sistema, aberto pelo próprio navegador */
  aoMicrofone?: (rotulo: string | null) => void;
}

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
    const doNavegador = (this.opcoes.microfone ?? "auto") === "padrao" && (this.opcoes.sensibilidade ?? "alta") === "normal";
    if (!doNavegador && ouveMicrofoneEscolhido())
      void this.abrirMicrofone().then((ok) => {
        if (ok) this.iniciar(C);
      });
    else {
      this.opcoes.aoMicrofone?.(null);
      this.iniciar(C);
    }
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
   * Abre o microfone escolhido (ou, no automático, outro que não o do fone Bluetooth) com o som reforçado pela
   * sensibilidade; false se o microfone foi negado.
   */
  private async abrirMicrofone(): Promise<boolean> {
    const md = navigator.mediaDevices;
    try {
      let lista = await listarMicrofones();
      if (!lista.some((m) => m.rotulo) && md?.getUserMedia) {
        // sem a permissão, os nomes vêm vazios: o pedido abre o microfone padrão por um instante, e a lista vem com nomes
        const s = await md.getUserMedia({ audio: true });
        s.getTracks().forEach((t) => t.stop());
        lista = await listarMicrofones();
      }
      if (!this.ligada) return false;
      if (!md?.getUserMedia) {
        this.opcoes.aoMicrofone?.(null);
        return true;
      }
      // null: o padrão do sistema, aberto aqui para o som passar pelo reforço
      const id = escolherMicrofone(lista, this.opcoes.microfone ?? "auto");
      const s = await md.getUserMedia({ audio: { ...(id ? { deviceId: { exact: id } } : {}), echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      const t = s.getAudioTracks()[0] ?? null;
      if (!this.ligada || !t) {
        t?.stop();
        return this.ligada;
      }
      this.bruta = t;
      const r = await reforcar(t, GANHOS[this.opcoes.sensibilidade ?? "alta"]);
      if (!this.ligada) {
        t.stop();
        void r?.ctx.close().catch(() => {});
        return false;
      }
      this.trilha = r?.trilha ?? t;
      this.audio = r?.ctx ?? null;
      this.analisador = r?.analisador ?? null;
      this.opcoes.aoMicrofone?.((id && lista.find((m) => m.id === id)?.rotulo) || t.label || null);
      return true;
    } catch (e) {
      if (e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError")) {
        this.ligada = false;
        this.aoEstado("negada");
        return false;
      }
      // o microfone escolhido sumiu ou não abriu: fica o padrão
      this.opcoes.aoMicrofone?.(null);
      return this.ligada;
    }
  }

  desligar() {
    this.ligada = false;
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
    if (r) {
      r.onend = r.onerror = r.onresult = r.onstart = null;
      try {
        r.abort();
      } catch {
        // já estava parado
      }
    }
    this.aoEstado("desligada");
  }

  private iniciar(C: ConstrutorReconhecimento) {
    if (!this.ligada) return;
    const r = new C();
    this.rec = r;
    const sessao = ++sessoes;
    r.lang = "pt-BR";
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 3;
    r.onstart = () => {
      this.aoEstado("ouvindo");
    };
    r.onresult = (e) => {
      this.falhas = 0;
      for (let k = e.resultIndex; k < e.results.length; k++) {
        const res = e.results[k]!;
        const alternativas: string[] = [];
        for (let j = 0; j < res.length; j++) if (res[j]?.transcript) alternativas.push(res[j]!.transcript);
        if (alternativas.length) this.aoOuvir(alternativas, res.isFinal, `${sessao}:${k}`);
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
      if (!this.ligada) return;
      if (this.falhas >= 6) {
        this.ligada = false;
        return this.aoEstado("erro");
      }
      // religa logo depois do silêncio; depois de falhas seguidas (sem internet), espera mais
      const espera = this.falhas ? Math.min(8000, 600 * 2 ** this.falhas) : 250;
      this.religar = setTimeout(() => {
        this.religar = null;
        this.iniciar(C);
      }, espera);
    };
    try {
      if (this.trilha?.readyState === "live") r.start(this.trilha);
      else r.start();
    } catch {
      this.falhas++;
      r.onend?.();
    }
  }
}
