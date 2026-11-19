// Sons do treino sintetizados (WebAudio): nada de arquivos, só osciladores.

/** Nota base da fanfarra do strike: dó (C5). */
const DO = 523.25;

/** multiplicadores (sobre DO) dos brilhos de sino do strike */
const PENTATONICA = [2, 2.25, 2.5, 3, 10 / 3, 4];

export class SonsDoTreino {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  /** entrada do eco compartilhado (criado sob demanda, só para os brilhos) */
  private entradaEco: AudioNode | null = null;
  ligado = true;
  /** volume geral dos sons, de 0 a 1 (multiplica o ganho base do master) */
  volume = 1;

  /** ajusta o volume geral; valores fora de 0..1 são limitados e, se o áudio já existir, vale na hora */
  definirVolume(v: number): void {
    this.volume = Math.min(1, Math.max(0, v));
    if (this.master) this.master.gain.value = 0.16 * this.volume;
  }

  private garantir(): AudioContext | null {
    if (typeof window === "undefined" || !this.ligado) return null;
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      try {
        this.ctx = new AC();
      } catch {
        return null;
      }
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.16 * this.volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  /** eco simples (0.18 s, realimentação 0.32) ligado ao master; devolve a entrada, criada só na primeira vez */
  private eco(): AudioNode | null {
    const ctx = this.garantir();
    if (!ctx || !this.master) return null;
    if (!this.entradaEco) {
      const atraso = ctx.createDelay(1);
      atraso.delayTime.value = 0.18;
      const realimenta = ctx.createGain();
      realimenta.gain.value = 0.32;
      const saida = ctx.createGain();
      saida.gain.value = 0.5;
      atraso.connect(realimenta).connect(atraso);
      atraso.connect(saida).connect(this.master);
      this.entradaEco = atraso;
    }
    return this.entradaEco;
  }

  private tom(freq: number, dur: number, opts: { tipo?: OscillatorType; vol?: number; ate?: number; atraso?: number } = {}) {
    const ctx = this.garantir();
    if (!ctx || !this.master) return;
    const t = ctx.currentTime + (opts.atraso ?? 0);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = opts.tipo ?? "triangle";
    o.frequency.setValueAtTime(freq, t);
    if (opts.ate) o.frequency.exponentialRampToValueAtTime(opts.ate, t + dur);
    g.gain.setValueAtTime(opts.vol ?? 0.6, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  /** uma nota com ataque linear e queda exponencial; filtro lowpass opcional e envio ao eco opcional */
  private nota(
    freq: number,
    dur: number,
    opts: { tipo?: OscillatorType; vol?: number; atraso?: number; ataque?: number; filtro?: number; eco?: boolean } = {},
  ) {
    const ctx = this.garantir();
    if (!ctx || !this.master) return;
    const t = ctx.currentTime + (opts.atraso ?? 0);
    const vol = opts.vol ?? 0.2;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = opts.tipo ?? "sine";
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + (opts.ataque ?? 0.01));
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    let saida: AudioNode = o;
    if (opts.filtro) {
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = opts.filtro;
      o.connect(f);
      saida = f;
    }
    saida.connect(g).connect(this.master);
    if (opts.eco) {
      const entrada = this.eco();
      if (entrada) g.connect(entrada);
    }
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  /** ruído com envelope que cai; passaAlta (Hz) filtra os graves, bom para um chiado de prato */
  private ruido(dur: number, vol = 0.5, atraso = 0, passaAlta?: number) {
    const ctx = this.garantir();
    if (!ctx || !this.master) return;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = ctx.createBufferSource();
    const g = ctx.createGain();
    g.gain.value = vol;
    s.buffer = buf;
    let entrada: AudioNode = s;
    if (passaAlta) {
      const f = ctx.createBiquadFilter();
      f.type = "highpass";
      f.frequency.value = passaAlta;
      s.connect(f);
      entrada = f;
    }
    entrada.connect(g).connect(this.master);
    s.start(ctx.currentTime + atraso);
  }

  /** acerto: um "plim" curto, mais agudo quanto mais perto do strike (progresso 0..1) */
  acerto(progresso: number): void {
    const p = Math.min(1, Math.max(0, progresso));
    const f = 660 * (1 + p);
    this.tom(f, 0.09, { vol: 0.2 });
    this.tom(f * 1.5, 0.09, { vol: 0.14, atraso: 0.05 });
  }

  /** erro com bolinhas perdidas: um tom que desce (mais longo se perdeu muitas) */
  perdeu(bolinhas: number): void {
    if (bolinhas <= 0) return;
    this.tom(330, Math.min(0.6, 0.25 + 0.02 * bolinhas), { ate: 110, vol: 0.3, tipo: "sawtooth" });
  }

  /** strike (~3,4 s): glissando de brilho, fanfarra de metais, sinos com eco e acorde final com prato */
  strike(): void {
    if (!this.garantir()) return;

    // a) glissando de brilho: escala maior de DO*2 a DO*4, notas de seno com eco
    [1, 9 / 8, 5 / 4, 4 / 3, 3 / 2, 5 / 3, 15 / 8, 2].forEach((m, i) =>
      this.nota(DO * 2 * m, 0.12, { vol: 0.12, atraso: i * 0.04, eco: true }),
    );

    // b) fanfarra de metais: serra filtrada mais triângulo uma oitava abaixo, em cada nota
    const metal = (f: number, dur: number, atraso: number) => {
      this.nota(f, dur, { tipo: "sawtooth", filtro: 2200, vol: 0.16, ataque: 0.02, atraso });
      this.nota(f / 2, dur, { tipo: "triangle", vol: 0.12, atraso });
    };
    [DO * 0.75, DO, DO * 1.25, DO * 1.5].forEach((f, i) => metal(f, 0.16, 0.35 + i * 0.15));
    // C6 segurado, sobre um acorde de dó maior grave em triângulo
    const longa = 0.95;
    metal(DO * 2, 0.9, longa);
    [0.5, 0.625, 0.75].forEach((m) => this.nota(DO * m, 1.2, { tipo: "triangle", vol: 0.07, ataque: 0.05, atraso: longa }));

    // c) brilhos de sino: notas da pentatônica em instantes sorteados, com eco
    for (let i = 0; i < 10; i++) {
      const m = PENTATONICA[Math.floor(Math.random() * PENTATONICA.length)];
      this.nota(DO * m, 0.5, { vol: 0.06, ataque: 0.005, atraso: 0.6 + Math.random() * 2.2, eco: true });
    }

    // d) acorde final de dó maior aberto, com baixo sustentado
    const acordeFinal = 1.8;
    [0.5, 0.75, 1, 1.25, 1.5].forEach((m) => this.nota(DO * m, 1.6, { tipo: "triangle", vol: 0.09, ataque: 0.03, atraso: acordeFinal }));
    this.nota(DO * 0.25, 1.4, { vol: 0.25, atraso: acordeFinal });

    // e) prato suave (ruído agudo) no começo da fanfarra e no acorde final
    this.ruido(0.9, 0.05, 0.35, 6000);
    this.ruido(0.9, 0.05, acordeFinal, 6000);
  }

  fechar(): void {
    void this.ctx?.close();
    this.ctx = null;
    this.master = null;
    this.entradaEco = null;
  }
}
