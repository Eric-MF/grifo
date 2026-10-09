// Efeitos sonoros sintetizados (WebAudio): nada de arquivos, só osciladores.
export class Som {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  ligado = true;
  onda: OscillatorType = "triangle";
  base = 440;

  private garantir() {
    if (!this.ligado) return null;
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.18;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }

  private tom(freq: number, dur: number, opts: { tipo?: OscillatorType; vol?: number; ate?: number; atraso?: number } = {}) {
    const ctx = this.garantir();
    if (!ctx || !this.master) return;
    const t = ctx.currentTime + (opts.atraso ?? 0);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = opts.tipo ?? this.onda;
    o.frequency.setValueAtTime(freq, t);
    if (opts.ate) o.frequency.exponentialRampToValueAtTime(opts.ate, t + dur);
    g.gain.setValueAtTime(opts.vol ?? 0.6, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private ruido(dur: number, vol = 0.5) {
    const ctx = this.garantir();
    if (!ctx || !this.master) return;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = ctx.createBufferSource();
    const g = ctx.createGain();
    g.gain.value = vol;
    s.buffer = buf;
    s.connect(g).connect(this.master);
    s.start();
  }

  flap() { this.tom(this.base * 0.9, 0.09, { ate: this.base * 1.4, vol: 0.35 }); }
  moeda() {
    this.tom(this.base * 2, 0.08, { vol: 0.35 });
    this.tom(this.base * 3, 0.12, { vol: 0.3, atraso: 0.06 });
  }
  poder() { [1, 1.25, 1.5, 2].forEach((m, i) => this.tom(this.base * m, 0.12, { vol: 0.35, atraso: i * 0.07 })); }
  certo() { [1.5, 2].forEach((m, i) => this.tom(this.base * m, 0.18, { vol: 0.4, atraso: i * 0.1 })); }
  errado() { this.tom(this.base * 0.6, 0.35, { ate: this.base * 0.35, vol: 0.4, tipo: "sawtooth" }); }
  batida() {
    this.ruido(0.3, 0.6);
    this.tom(this.base * 0.4, 0.3, { ate: 60, vol: 0.5, tipo: "square" });
  }
  trovao() { this.ruido(1.2, 0.35); }
  fechar() { this.ctx?.close(); this.ctx = null; }
}
