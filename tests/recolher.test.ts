import { describe, expect, it } from "vitest";
import { alvoRecolhimento, bordasRecolhidas, intersectaCirculo, molaRecolhimento, passoMola } from "@/games/flap-suitcase/recolher";

describe("recolhimento do galope", () => {
  it("o galope recolhe a coluna à medida que ela se aproxima do pássaro", () => {
    expect(alvoRecolhimento(300, true)).toBe(0);
    expect(alvoRecolhimento(160, true)).toBeCloseTo(0.5);
    expect(alvoRecolhimento(60, true)).toBe(1);
    expect(alvoRecolhimento(-20, true)).toBe(1);
  });

  it("sem galope, nada se recolhe por ele", () => {
    expect(alvoRecolhimento(100, false)).toBe(0);
  });

  it("com o recolhimento total, as metades saem pelas bordas da tela", () => {
    expect(bordasRecolhidas(100, 300, 0, 640)).toEqual({ topo: 100, base: 300 });
    const toda = bordasRecolhidas(100, 300, 1, 640);
    expect(toda.topo).toBe(-40);
    expect(toda.base).toBe(680);
  });

  it("a mola do recolhimento passa de 1 (quique) e assenta, sem passar de 1,3", () => {
    let x = 0;
    let v = 0;
    let pico = 0;
    for (let i = 0; i < 240; i++) {
      const s = molaRecolhimento(x, v, 1, 1 / 120);
      x = s.x;
      v = s.v;
      pico = Math.max(pico, x);
    }
    expect(pico).toBeGreaterThan(1.1);
    expect(pico).toBeLessThanOrEqual(1.3);
    expect(x).toBeCloseTo(1, 1);
  });
});

describe("círculo da batida", () => {
  it("o círculo toca o retângulo só quando há sobreposição", () => {
    // pássaro em (0,0), raio 30
    expect(intersectaCirculo(0, 0, 30, 50, -10, 20, 20)).toBe(false);
    expect(intersectaCirculo(0, 0, 30, 25, -10, 20, 20)).toBe(true);
    expect(intersectaCirculo(0, 0, 30, 0, 0, 10, 10)).toBe(true);
    expect(intersectaCirculo(0, 0, 30, 10, 10, 0, 10)).toBe(false);
  });
});

describe("mola com quique para o recuo da batida", () => {
  it("vai ao alvo, passa dele e assenta nele", () => {
    let x = 0;
    let v = 0;
    let pico = 0;
    for (let i = 0; i < 240; i++) {
      const s = passoMola(x, v, 20, 1 / 120, 0, 90);
      x = s.x;
      v = s.v;
      pico = Math.max(pico, x);
    }
    expect(pico).toBeGreaterThan(22);
    expect(pico).toBeLessThanOrEqual(90);
    expect(x).toBeCloseTo(20, 1);
  });

  it("respeita o mínimo e o máximo", () => {
    let x = 5;
    let v = 0;
    let menor = 5;
    for (let i = 0; i < 240; i++) {
      const s = passoMola(x, v, -10, 1 / 120, 0, 90);
      x = s.x;
      v = s.v;
      menor = Math.min(menor, x);
    }
    expect(menor).toBeGreaterThanOrEqual(0);
    expect(x).toBe(0);
  });
});
