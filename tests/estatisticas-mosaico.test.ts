import { describe, expect, it } from "vitest";
import { mosaico, type Retangulo } from "../src/lib/estatisticas/mosaico";

const area = (r: Retangulo) => r.w * r.h;

/** A área em comum de dois retângulos (0 se não se tocam). */
const interseccao = (a: Retangulo, b: Retangulo) => {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return Math.max(0, w) * Math.max(0, h);
};

describe("mosaico", () => {
  const valores = [6, 6, 4, 3, 2, 2, 1];
  const r = mosaico(valores, 6, 4);

  it("os retângulos cobrem a área toda (a soma das áreas é w × h)", () => {
    const soma = r.reduce((s, x) => s + area(x), 0);
    expect(soma).toBeCloseTo(24, 9);
  });

  it("cada área é proporcional ao valor", () => {
    valores.forEach((v, i) => expect(area(r[i]!)).toBeCloseTo((v / 24) * 24, 9));
  });

  it("todos os retângulos ficam dentro da área de 6 × 4", () => {
    for (const x of r) {
      expect(x.x).toBeGreaterThanOrEqual(-1e-9);
      expect(x.y).toBeGreaterThanOrEqual(-1e-9);
      expect(x.x + x.w).toBeLessThanOrEqual(6 + 1e-9);
      expect(x.y + x.h).toBeLessThanOrEqual(4 + 1e-9);
    }
  });

  it("os retângulos não se sobrepõem", () => {
    for (let i = 0; i < r.length; i++) {
      for (let j = i + 1; j < r.length; j++) {
        expect(interseccao(r[i]!, r[j]!)).toBeLessThanOrEqual(1e-9);
      }
    }
  });

  it("um valor só ocupa a área toda", () => {
    const [unico] = mosaico([5], 10, 4);
    expect(unico).toEqual({ x: 0, y: 0, w: 10, h: 4 });
  });

  it("zeros ganham retângulo vazio e não atrapalham os outros", () => {
    const [a, zero, b] = mosaico([3, 0, 1], 4, 1);
    expect(zero).toEqual({ x: 0, y: 0, w: 0, h: 0 });
    expect(area(a!)).toBeCloseTo(3, 9);
    expect(area(b!)).toBeCloseTo(1, 9);
  });

  it("negativos também ganham retângulo vazio, sem entrar no total", () => {
    const [a, negativo, b] = mosaico([3, -2, 1], 4, 1);
    expect(negativo).toEqual({ x: 0, y: 0, w: 0, h: 0 });
    expect(area(a!)).toBeCloseTo(3, 9);
    expect(area(b!)).toBeCloseTo(1, 9);
  });

  it("soma zero, largura zero ou altura zero zeram todos, na mesma quantidade", () => {
    const casos: [number[], number, number][] = [
      [[0, 0], 10, 4],
      [[1, 2], 0, 4],
      [[1, 2], 10, 0],
    ];
    for (const [v, w, h] of casos) {
      const todos = mosaico(v, w, h);
      expect(todos).toHaveLength(v.length);
      for (const x of todos) expect(x).toEqual({ x: 0, y: 0, w: 0, h: 0 });
    }
  });
});
