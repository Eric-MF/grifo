import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Narrador, notaDaVoz, vozesEmPortugues, type ConfigNarrador, type Fala, type FonteFala, type ItemFala, type Sintese } from "../src/lib/fala/narrador.ts";

/** A voz do navegador de mentira: guarda a fila; o teste diz quando cada fala começa e termina. */
class SinteseFalsa implements Sintese {
  fila: Fala[] = [];
  atual: Fala | null = null;
  paused = false;
  ditos: string[] = [];
  cancelamentos = 0;
  get speaking() {
    return !!this.atual;
  }
  get pending() {
    return this.fila.length > 0;
  }
  speak(f: Fala) {
    this.fila.push(f);
  }
  /** a voz começa a próxima fala da fila (se não está falando) */
  comecar() {
    if (this.atual) return;
    const f = this.fila.shift();
    if (!f) return;
    this.atual = f;
    f.onstart?.({});
  }
  /** a fala atual termina e a próxima começa */
  terminar() {
    const f = this.atual;
    if (!f) return this.comecar();
    this.atual = null;
    this.ditos.push(f.text);
    f.onend?.({});
    this.comecar();
  }
  /** fala tudo o que estiver na fila, até `limite` falas */
  falarTudo(limite = 200) {
    this.comecar();
    for (let k = 0; k < limite && this.atual; k++) this.terminar();
  }
  cancel() {
    const todas = [this.atual, ...this.fila].filter((f): f is Fala => !!f);
    this.atual = null;
    this.fila = [];
    this.cancelamentos++;
    for (const f of todas) f.onerror?.({ error: "interrupted" });
  }
  pause() {}
  resume() {}
}

const fala = (texto: string): Fala => ({ text: texto, lang: "", voice: null, rate: 1, pitch: 1, volume: 1, onstart: null, onend: null, onerror: null });

// a lei de mentira: art1 (caput + § único), um título, art2 (rubrica, caput e dois incisos), art3
function lei(): ItemFala[] {
  const it = (i: number, art: string | null, falar: string[]): ItemFala => ({ i, art, tipo: "texto", pecas: falar.map((f) => ({ ini: 0, fim: 1, falar: f })) });
  return [
    it(0, "art1", ["a1-caput"]),
    it(1, "art1", ["a1-pu-1", "a1-pu-2"]),
    it(2, null, ["titulo"]),
    it(3, "art2", ["a2-rubrica"]),
    it(4, "art2", ["a2-caput"]),
    it(5, "art2", ["a2-i1"]),
    it(6, "art2", ["a2-i2"]),
    it(7, "art3", ["a3-caput"]),
  ];
}
const fonteDe = (itens: ItemFala[]): FonteFala => ({
  depois: (x) => itens[itens.indexOf(x) + 1] ?? null,
  antes: (x) => itens[itens.indexOf(x) - 1] ?? null,
});
const CONFIG: ConfigNarrador = { voz: null, lingua: "pt-BR", velocidade: 1, tom: 1, pausaArtigo: 0, aoFimDoArtigo: "seguir", manterViva: false };

function montar(config: Partial<ConfigNarrador> = {}) {
  const s = new SinteseFalsa();
  const itens = lei();
  const eventos = { estado: vi.fn(), falando: vi.fn(), fimDaLei: vi.fn(), parou: vi.fn(), erro: vi.fn() };
  const n = new Narrador(s, fala, fonteDe(itens), { ...CONFIG, ...config }, eventos);
  return { s, itens, n, eventos };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("Narrador", () => {
  it("lê tudo na ordem, de um pedaço a outro e de um item a outro, e avisa o fim da lei", () => {
    const { s, itens, n, eventos } = montar();
    n.ler(itens[0]!);
    expect(n.estado).toBe("lendo");
    s.falarTudo();
    expect(s.ditos).toEqual(["a1-caput", "a1-pu-1", "a1-pu-2", "titulo", "a2-rubrica", "a2-caput", "a2-i1", "a2-i2", "a3-caput"]);
    expect(eventos.fimDaLei).toHaveBeenCalledOnce();
    expect(n.estado).toBe("parado");
  });

  it("deixa no máximo três pedaços na fila da voz", () => {
    const { s, itens, n } = montar();
    n.ler(itens[0]!);
    expect(s.fila.length).toBe(3);
    s.comecar();
    // a que está falando conta: uma falando e duas esperando
    expect(s.fila.length).toBe(2);
    s.terminar();
    expect(s.fila.length).toBe(2);
  });

  it("avisa o que está sendo dito pelo começo de cada fala", () => {
    const { s, itens, n, eventos } = montar();
    n.ler(itens[1]!, 1);
    s.comecar();
    expect(eventos.falando).toHaveBeenLastCalledWith(itens[1], 1);
    s.terminar();
    expect(eventos.falando).toHaveBeenLastCalledWith(itens[2], 0);
    expect(n.atual).toEqual({ item: itens[2], p: 0 });
  });

  it("pausa cancelando a voz e continua do mesmo pedaço", () => {
    const { s, itens, n } = montar();
    n.ler(itens[0]!);
    s.comecar();
    s.terminar(); // a1-caput
    n.pausar();
    expect(n.estado).toBe("pausado");
    expect(s.fila.length).toBe(0);
    n.continuar();
    vi.advanceTimersByTime(200);
    s.comecar();
    expect(s.atual?.text).toBe("a1-pu-1");
  });

  it("pula de dispositivo e de artigo, sem parar nos títulos, e repete o artigo desde a rubrica", () => {
    const { s, itens, n } = montar();
    n.ler(itens[0]!);
    s.comecar();
    n.pular(1);
    vi.advanceTimersByTime(200);
    s.comecar();
    expect(s.atual?.text).toBe("a1-pu-1");
    n.pularArtigo(1);
    vi.advanceTimersByTime(200);
    s.comecar();
    expect(s.atual?.text).toBe("a2-rubrica");
    n.pular(1);
    vi.advanceTimersByTime(200);
    s.comecar();
    n.pular(1);
    vi.advanceTimersByTime(200);
    s.comecar();
    expect(s.atual?.text).toBe("a2-i1");
    n.repetir(true);
    vi.advanceTimersByTime(200);
    s.comecar();
    expect(s.atual?.text).toBe("a2-rubrica");
    n.pularArtigo(-1);
    vi.advanceTimersByTime(200);
    s.comecar();
    expect(s.atual?.text).toBe("a1-caput");
    expect(n.pularArtigo(-1)).toBe(false);
  });

  it("“ao terminar o artigo: parar” para no começo do próximo artigo, e continua dali", () => {
    const { s, itens, n, eventos } = montar({ aoFimDoArtigo: "parar" });
    n.ler(itens[3]!);
    s.falarTudo();
    expect(s.ditos).toEqual(["a2-rubrica", "a2-caput", "a2-i1", "a2-i2"]);
    expect(n.estado).toBe("pausado");
    expect(eventos.parou).toHaveBeenCalledWith("artigo");
    expect(n.atual?.item).toBe(itens[7]);
  });

  it("“repetir” volta ao começo do artigo", () => {
    const { s, itens, n } = montar({ aoFimDoArtigo: "repetir" });
    n.ler(itens[5]!);
    s.falarTudo(6);
    expect(s.ditos).toEqual(["a2-i1", "a2-i2", "a2-rubrica", "a2-caput", "a2-i1", "a2-i2"]);
  });

  it("espera a pausa entre artigos antes de seguir", () => {
    const { s, itens, n } = montar({ pausaArtigo: 1500 });
    n.ler(itens[0]!);
    s.falarTudo();
    expect(s.ditos).toEqual(["a1-caput", "a1-pu-1", "a1-pu-2"]);
    vi.advanceTimersByTime(1400);
    s.comecar();
    expect(s.atual).toBeNull();
    vi.advanceTimersByTime(200);
    s.comecar();
    expect(s.atual?.text).toBe("titulo");
  });

  it("“parar depois de” termina o dispositivo e para no começo do seguinte", () => {
    const { s, itens, n, eventos } = montar();
    n.ler(itens[1]!);
    n.pararDepoisDe(1000);
    s.comecar(); // a1-pu-1
    vi.advanceTimersByTime(1200);
    s.terminar(); // a1-pu-2, ainda o mesmo dispositivo
    expect(s.atual?.text).toBe("a1-pu-2");
    s.terminar();
    expect(n.estado).toBe("pausado");
    expect(eventos.parou).toHaveBeenCalledWith("tempo");
    expect(n.atual?.item).toBe(itens[2]);
  });

  it("recomeça quando a voz para sem avisar o fim", () => {
    const { s, itens, n } = montar();
    n.ler(itens[0]!);
    s.comecar();
    // a voz se perde: nada falando e nada na fila, sem o onend
    s.atual = null;
    s.fila = [];
    vi.advanceTimersByTime(3200);
    vi.advanceTimersByTime(200);
    s.comecar();
    // (o TypeScript acha que s.atual continua null depois da linha de cima)
    expect((s.atual as Fala | null)?.text).toBe("a1-caput");
  });

  it("muda a velocidade lendo: o pedaço atual recomeça na velocidade nova", () => {
    const { s, itens, n } = montar();
    n.ler(itens[0]!);
    s.comecar();
    n.configurar({ velocidade: 1.5 });
    vi.advanceTimersByTime(200);
    s.comecar();
    expect(s.atual?.text).toBe("a1-caput");
    expect(s.atual?.rate).toBe(1.5);
  });

  it("anuncia e depois volta à leitura", () => {
    const { s, itens, n } = montar();
    n.ler(itens[4]!);
    s.comecar();
    n.anunciar("Você está no artigo dois.");
    s.comecar();
    expect(s.atual?.text).toBe("Você está no artigo dois.");
    s.terminar();
    vi.advanceTimersByTime(200);
    s.comecar();
    expect(s.atual?.text).toBe("a2-caput");
  });
});

describe("vozes", () => {
  const v = (name: string, lang: string) => ({ name, lang, localService: true });
  it("prefere as neurais do Brasil e deixa as de brincadeira no fim", () => {
    const lista = [v("Eddy (Português (Brasil))", "pt-BR"), v("Joana", "pt-PT"), v("Luciana", "pt-BR"), v("Microsoft Francisca Online (Natural) - Portuguese (Brazil)", "pt-BR"), v("Samantha", "en-US"), v("Google português do Brasil", "pt-BR")];
    expect(vozesEmPortugues(lista).map((x) => x.name)).toEqual([
      "Microsoft Francisca Online (Natural) - Portuguese (Brazil)",
      "Google português do Brasil",
      "Luciana",
      "Joana",
      "Eddy (Português (Brasil))",
    ]);
    expect(notaDaVoz(v("Samantha", "en-US"))).toBeLessThan(0);
  });
});
