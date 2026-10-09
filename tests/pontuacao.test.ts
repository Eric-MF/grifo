import { describe, expect, it } from "vitest";
import { LIMITE_SEG, maximoTreino, pontuar } from "../src/quiz/pontuacao.ts";

describe("pontuar", () => {
  it("erro não pontua, qualquer que seja o tempo", () => {
    expect(pontuar(3, false, 0)).toBe(0);
  });
  it("acerto instantâneo vale o máximo do nível", () => {
    expect(pontuar(1, true, 0)).toBe(100);
    expect(pontuar(2, true, 0)).toBe(150);
    expect(pontuar(3, true, 0)).toBe(200);
  });
  it("no limite do nível, só os 60 pontos base", () => {
    expect(pontuar(1, true, LIMITE_SEG[1])).toBe(60);
    expect(pontuar(3, true, LIMITE_SEG[3] * 2)).toBe(120);
  });
  it("rapidez pesa menos que acertar", () => {
    expect(pontuar(2, true, 60)).toBeGreaterThan(pontuar(2, false, 0));
    expect(pontuar(2, true, 10)).toBeGreaterThan(pontuar(2, true, 60));
  });
  it("máximo do treino cresce com o nível", () => {
    expect(maximoTreino(1)).toBe(1000);
    expect(maximoTreino(3)).toBe(2000);
  });
});
