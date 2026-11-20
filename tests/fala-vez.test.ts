import { afterEach, describe, expect, it, vi } from "vitest";
import { Narrador, type ConfigNarrador, type Fala, type ItemFala, type Sintese } from "../src/lib/fala/narrador.ts";
import { aoMudarVoz, esperaParaFalar, marcarVoz, microfoneFechou, VOLTA_DO_FONE_MS, vozNoAr, zerarVez } from "../src/lib/fala/vez.ts";

afterEach(() => {
  zerarVez();
  vi.useRealTimers();
});

describe("a vez da voz", () => {
  it("avisa só quando a primeira voz começa e quando a última para", () => {
    const visto: boolean[] = [];
    aoMudarVoz((l) => visto.push(l));
    const a = {};
    const b = {};
    marcarVoz(a, true);
    marcarVoz(b, true);
    marcarVoz(a, false);
    expect(vozNoAr()).toBe(true);
    marcarVoz(b, false);
    marcarVoz(b, false);
    expect(visto).toEqual([true, false]);
    expect(vozNoAr()).toBe(false);
  });

  it("o aviso desligado não chega mais", () => {
    const f = vi.fn();
    const soltar = aoMudarVoz(f);
    soltar();
    marcarVoz({}, true);
    expect(f).not.toHaveBeenCalled();
  });

  it("depois de um microfone fechar, a voz espera o fone voltar ao som normal; sem nenhum, não espera", () => {
    expect(esperaParaFalar(1000)).toBe(0);
    microfoneFechou(1000);
    expect(esperaParaFalar(1000)).toBe(VOLTA_DO_FONE_MS);
    expect(esperaParaFalar(1000 + VOLTA_DO_FONE_MS - 200)).toBe(200);
    expect(esperaParaFalar(1000 + VOLTA_DO_FONE_MS + 1)).toBe(0);
  });
});

/** Uma voz de mentira: guarda o que foi pedido para falar. */
class Sintese1 implements Sintese {
  fila: Fala[] = [];
  paused = false;
  get speaking() {
    return false;
  }
  get pending() {
    return this.fila.length > 0;
  }
  speak(f: Fala) {
    this.fila.push(f);
  }
  cancel() {
    this.fila = [];
  }
  pause() {}
  resume() {}
}
const fala = (texto: string): Fala => ({ text: texto, lang: "", voice: null, rate: 1, pitch: 1, volume: 1, onstart: null, onend: null, onerror: null });
const CONFIG: ConfigNarrador = { voz: null, lingua: "pt-BR", velocidade: 1, tom: 1, pausaArtigo: 0, aoFimDoArtigo: "seguir", manterViva: false };
const item: ItemFala = { i: 0, art: "q", tipo: "texto", pecas: [{ ini: 0, fim: 1, falar: "Olá." }] };

describe("o narrador e o microfone do fone", () => {
  it("lendo, marca a voz no ar; parado, tira", () => {
    const n = new Narrador(new Sintese1(), fala, { depois: () => null, antes: () => null }, CONFIG);
    n.ler(item);
    expect(vozNoAr()).toBe(true);
    n.parar();
    expect(vozNoAr()).toBe(false);
  });

  it("com o microfone do fone fechando quando a voz começa, a primeira fala espera o fone voltar ao som normal", () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    // a escuta que fecha o microfone do fone quando a voz começa
    aoMudarVoz((lendo) => {
      if (lendo) microfoneFechou(Date.now());
    });
    const s = new Sintese1();
    const n = new Narrador(s, fala, { depois: () => null, antes: () => null }, CONFIG);
    n.ler(item);
    expect(s.fila).toHaveLength(0);
    vi.advanceTimersByTime(VOLTA_DO_FONE_MS - 100);
    expect(s.fila).toHaveLength(0);
    vi.advanceTimersByTime(200);
    expect(s.fila.map((f) => f.text)).toEqual(["Olá."]);
  });

  it("sem microfone fechando, a fala vai na hora", () => {
    const s = new Sintese1();
    const n = new Narrador(s, fala, { depois: () => null, antes: () => null }, CONFIG);
    n.ler(item);
    expect(s.fila.map((f) => f.text)).toEqual(["Olá."]);
  });

  it("o aviso curto também é a voz no ar, e espera o fone", () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const visto: boolean[] = [];
    aoMudarVoz((lendo) => {
      visto.push(lendo);
      if (lendo) microfoneFechou(Date.now());
    });
    const s = new Sintese1();
    const n = new Narrador(s, fala, { depois: () => null, antes: () => null }, CONFIG);
    n.anunciar("Você está no artigo 1.");
    expect(vozNoAr()).toBe(true);
    expect(s.fila).toHaveLength(0);
    vi.advanceTimersByTime(VOLTA_DO_FONE_MS + 10);
    expect(s.fila).toHaveLength(1);
    s.fila[0]!.onend?.({});
    expect(vozNoAr()).toBe(false);
    expect(visto).toEqual([true, false]);
  });
});
