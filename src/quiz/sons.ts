// Sons do treino sintetizados (WebAudio): nada de arquivos, só osciladores.

/** Nota base da fanfarra do strike: dó (C5). */
const DO = 523.25;

export class SonsDoTreino {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
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

  private ruido(dur: number, vol = 0.5, atraso = 0) {
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

  /** strike: arpejo ascendente, acorde sustentado e um brilho de ruído */
  strike(): void {
    if (!this.garantir()) return;
    [1, 1.25, 1.5, 2, 2.5].forEach((m, i) => this.tom(DO * m, 0.2, { vol: 0.3, atraso: i * 0.09 }));
    const acorde = 0.45;
    [1, 1.25, 1.5].forEach((m) => {
      this.tom(DO * m, 0.8, { vol: 0.05, tipo: "square", atraso: acorde });
      this.tom(DO * m, 0.8, { vol: 0.15, atraso: acorde });
    });
    this.ruido(0.12, 0.06, acorde);
  }

  fechar(): void {
    void this.ctx?.close();
    this.ctx = null;
    this.master = null;
  }
}
