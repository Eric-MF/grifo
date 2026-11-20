// Os gestos dos botões das barras da leitura em voz alta (a do Ouvir, no Vade Mecum, e a do microfone, no treino): o
// toque, os dois toques, segurar (abre o menu do botão; deslizando até um item e soltando, ele é escolhido) e deslizar
// (ajusta um valor, como a velocidade, ou anda pelos trechos). Só a máquina de estados, sem o navegador: quem a liga aos
// eventos do ponteiro é src/components/BotaoGesto.tsx.

/** Quanto tempo o dedo fica parado para valer como segurar. */
export const SEGURAR_MS = 420;
/** Quanto o dedo anda antes de o gesto deixar de ser um toque (e virar o deslizar, se o botão tiver). */
export const TOLERANCIA_PX = 10;
/** O segundo toque, até este tempo depois do primeiro, faz os dois toques. */
export const DUPLO_MS = 280;
/** Quanto o dedo anda a cada passo do deslizar. */
export const PASSO_PX = 14;

export type Eixo = "x" | "y";

export interface OpcoesGesto {
  /** o botão tem os dois toques: o toque simples espera um instante, para ver se vem o segundo */
  duplo?: boolean;
  /** o botão tem o que fazer ao segurar (sem isso, segurar e soltar é um toque) */
  segurar?: boolean;
  /** o eixo em que o botão desliza ("xy": o primeiro movimento escolhe); sem isso, mover o dedo desfaz o toque */
  deslizar?: Eixo | "xy" | null;
  passoPx?: number;
}

export type EventoGesto =
  | { tipo: "toque" }
  | { tipo: "duplo" }
  /** o dedo ficou parado o bastante: o menu abre */
  | { tipo: "segurou"; x: number; y: number }
  /** segurando, o dedo anda (pelos itens do menu) */
  | { tipo: "moveuSegurando"; x: number; y: number }
  /** soltou depois de segurar; `moveu`: andou depois de o menu abrir (soltar parado deixa o menu aberto) */
  | { tipo: "soltouSegurando"; x: number; y: number; moveu: boolean }
  /** deslizando: os passos andados desde o começo (para a direita e para cima, positivos) */
  | { tipo: "deslizou"; eixo: Eixo; passos: number; x: number; y: number }
  | { tipo: "soltouDeslizando"; eixo: Eixo; passos: number }
  /** o gesto não vale (o dedo andou num botão sem deslizar, ou o sistema cancelou o toque) */
  | { tipo: "cancelou" };

export interface Relogio {
  agendar(f: () => void, ms: number): unknown;
  cancelar(id: unknown): void;
}

const RELOGIO: Relogio = {
  agendar: (f, ms) => setTimeout(f, ms),
  cancelar: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
};

type Estado =
  | { fase: "solto" }
  | { fase: "apertado"; x0: number; y0: number; x: number; y: number; timer: unknown }
  | { fase: "segurando"; x0: number; y0: number; moveu: boolean }
  | { fase: "deslizando"; eixo: Eixo; x0: number; y0: number; passos: number }
  /** o resto deste toque não conta (o segundo dos dois toques, ou um gesto cancelado) */
  | { fase: "ignorando" };

/**
 * Um gesto de cada vez, de um ponteiro: `apertar`, `mover` e `soltar` vêm dos eventos do ponteiro, e cada coisa que o
 * gesto faz sai em `emitir`.
 */
export class Gesto {
  private estado: Estado = { fase: "solto" };
  /** o primeiro toque, à espera do segundo (o toque simples sai quando o tempo acaba) */
  private esperaDuplo: unknown = null;

  constructor(
    private opcoes: OpcoesGesto,
    private emitir: (e: EventoGesto) => void,
    private relogio: Relogio = RELOGIO,
  ) {}

  configurar(o: OpcoesGesto) {
    this.opcoes = o;
  }

  apertar(x: number, y: number) {
    this.limparTimer();
    // o segundo toque logo depois do primeiro: os dois toques valem na hora (sem esperar o dedo sair)
    if (this.esperaDuplo !== null) {
      this.relogio.cancelar(this.esperaDuplo);
      this.esperaDuplo = null;
      this.estado = { fase: "ignorando" };
      this.emitir({ tipo: "duplo" });
      return;
    }
    const timer = this.opcoes.segurar ? this.relogio.agendar(() => this.segurou(), SEGURAR_MS) : null;
    this.estado = { fase: "apertado", x0: x, y0: y, x, y, timer };
  }

  private segurou() {
    const e = this.estado;
    if (e.fase !== "apertado") return;
    this.estado = { fase: "segurando", x0: e.x, y0: e.y, moveu: false };
    this.emitir({ tipo: "segurou", x: e.x, y: e.y });
  }

  mover(x: number, y: number) {
    const e = this.estado;
    if (e.fase === "apertado") {
      e.x = x;
      e.y = y;
      const dx = x - e.x0;
      const dy = y - e.y0;
      if (Math.hypot(dx, dy) < TOLERANCIA_PX) return;
      this.limparTimer();
      const d = this.opcoes.deslizar;
      const eixo: Eixo | null = !d ? null : d === "xy" ? (Math.abs(dx) >= Math.abs(dy) ? "x" : "y") : d;
      // o dedo andou no outro eixo (ou o botão não desliza): não é um gesto deste botão
      if (!eixo || (eixo === "x" ? Math.abs(dx) < Math.abs(dy) : Math.abs(dy) < Math.abs(dx))) {
        this.estado = { fase: "ignorando" };
        this.emitir({ tipo: "cancelou" });
        return;
      }
      this.estado = { fase: "deslizando", eixo, x0: e.x0, y0: e.y0, passos: 0 };
      this.mover(x, y);
      return;
    }
    if (e.fase === "deslizando") {
      const d = e.eixo === "x" ? x - e.x0 : e.y0 - y;
      const passo = this.opcoes.passoPx ?? PASSO_PX;
      const passos = Math.trunc(d / passo);
      if (passos === e.passos) return;
      e.passos = passos;
      this.emitir({ tipo: "deslizou", eixo: e.eixo, passos, x, y });
      return;
    }
    if (e.fase === "segurando") {
      if (!e.moveu && Math.hypot(x - e.x0, y - e.y0) >= TOLERANCIA_PX) e.moveu = true;
      this.emitir({ tipo: "moveuSegurando", x, y });
    }
  }

  soltar(x: number, y: number) {
    const e = this.estado;
    this.limparTimer();
    this.estado = { fase: "solto" };
    if (e.fase === "deslizando") return this.emitir({ tipo: "soltouDeslizando", eixo: e.eixo, passos: e.passos });
    if (e.fase === "segurando") return this.emitir({ tipo: "soltouSegurando", x, y, moveu: e.moveu });
    if (e.fase !== "apertado") return;
    if (!this.opcoes.duplo) return this.emitir({ tipo: "toque" });
    this.esperaDuplo = this.relogio.agendar(() => {
      this.esperaDuplo = null;
      this.emitir({ tipo: "toque" });
    }, DUPLO_MS);
  }

  /** O sistema tomou o toque (a rolagem, outra janela): nada do que estava em andamento vale. */
  cancelar() {
    const ativo = this.estado.fase !== "solto" && this.estado.fase !== "ignorando";
    this.limparTimer();
    this.estado = { fase: "solto" };
    if (ativo) this.emitir({ tipo: "cancelou" });
  }

  /** O botão saiu da tela: o toque à espera do segundo também não sai mais. */
  destruir() {
    this.limparTimer();
    if (this.esperaDuplo !== null) this.relogio.cancelar(this.esperaDuplo);
    this.esperaDuplo = null;
    this.estado = { fase: "solto" };
  }

  private limparTimer() {
    const e = this.estado;
    if (e.fase === "apertado" && e.timer !== null) this.relogio.cancelar(e.timer);
  }
}
