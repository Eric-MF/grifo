import { describe, expect, it } from "vitest";
import { temaPorId } from "../src/games/flap-suitcase/catalogo";

/** Contexto de mentira que guarda os retângulos desenhados (x, y, largura, altura). */
function gravador() {
  const rects: [number, number, number, number][] = [];
  const estado: Record<string | symbol, unknown> = {};
  const ctx = new Proxy(estado, {
    get(alvo, nome) {
      if (nome in alvo) return alvo[nome];
      if (nome === "rect" || nome === "fillRect") return (x: number, y: number, w: number, h: number) => rects.push([x, y, w, h]);
      if (nome === "createRadialGradient" || nome === "createLinearGradient") return () => ({ addColorStop() {} });
      if (nome === "measureText") return () => ({ width: 10 });
      if (nome === "globalAlpha") return 1;
      return () => {};
    },
    set(alvo, nome, valor) {
      alvo[nome] = valor;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, rects };
}

describe("cenário do Noir", () => {
  const noir = temaPorId("noir");
  const W = 1200;
  const H = 640;
  const desenhar = (off: number) => {
    const g = gravador();
    noir.decor?.(g.ctx, W, H, off, 1, 0, noir);
    return g.rects;
  };

  it("os prédios andam com o mundo: o mesmo prédio aparece no mesmo lugar do mundo, com o mesmo tamanho", () => {
    // 400 de deslocamento faz a vaga de 90 da tela dar a volta: com a altura presa à vaga, os prédios trocariam
    const d = 400;
    const antes = desenhar(1000);
    const depois = desenhar(1000 + d);
    // as camadas: a cidade de trás, a da frente (e o letreiro), o fórum e os postes
    const fatores = [0.12, 0.2, 0.35, 0.5];
    const longe = depois.filter(([x, , w]) => x > 120 && x + w < W - 120);
    expect(longe.length).toBeGreaterThan(10);
    const soltos = longe.filter(
      ([x, y, w, h]) => !antes.some(([x0, y0, w0, h0]) => fatores.some((f) => Math.abs(x0 - (x + d * f)) < 1e-6) && y0 === y && w0 === w && h0 === h),
    );
    expect(soltos).toEqual([]);
  });

  it("as alturas dos prédios não sobem em escadinha", () => {
    const alturas = desenhar(0)
      .filter(([, y, , h]) => y + h === H - 40 && h > 60)
      .map(([, , , h]) => h);
    const passos = alturas.slice(1).map((h, i) => h - alturas[i]!);
    // numa escadinha os passos seriam quase todos iguais
    const iguais = passos.filter((p) => p === passos[0]).length;
    expect(iguais).toBeLessThan(passos.length * 0.5);
  });
});

describe("cenários dos estilos base", () => {
  const W = 1200;
  const H = 640;
  // as velocidades das camadas usadas nos cenários (0: o que só anda com o relógio, parado aqui)
  const FATORES = [0, 0.04, 0.05, 0.06, 0.08, 0.1, 0.12, 0.15, 0.16, 0.2, 0.22, 0.25, 0.28, 0.3, 0.35, 0.4, 0.45, 0.5];
  for (const id of ["classico", "fofo", "retro", "steampunk", "noir", "papiro", "recesso", "gotico"]) {
    it(`${id}: o que se repete pelo cenário é sempre o mesmo, só deslocado com a camada (não troca de forma nem reaparece)`, () => {
      const tema = temaPorId(id);
      const desenhar = (off: number) => {
        const g = gravador();
        tema.decor?.(g.ctx, W, H, off, 1, 5, tema);
        return g.rects;
      };
      const d = 400;
      const antes = desenhar(2000);
      const depois = desenhar(2000 + d);
      const meio = depois.filter(([x, , w]) => x > 150 && x + w < W - 150);
      const soltos = meio.filter(
        ([x, y, w, h]) =>
          !antes.some(([x0, y0, w0, h0]) => FATORES.some((f) => Math.abs(x0 - (x + d * f)) < 1e-6) && Math.abs(y0 - y) < 1e-6 && Math.abs(w0 - w) < 1e-6 && Math.abs(h0 - h) < 1e-6),
      );
      expect(soltos).toEqual([]);
    });
  }
});

