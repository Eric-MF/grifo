import { describe, expect, it } from "vitest";
import {
  DURACAO_SURPRESA,
  passoSurpresa,
  progressoSurpresa,
  SURPRESA_A_CADA_PONTOS,
  SURPRESA_A_CADA_S,
  SURPRESA_INICIAL,
  type EstadoSurpresa,
} from "@/games/flap-suitcase/surpresa";

describe("surpresa", () => {
  it("no começo da partida não há surpresa", () => {
    const s = passoSurpresa(SURPRESA_INICIAL, 10, 3);
    expect(s.inicio).toBeNull();
    expect(progressoSurpresa(s, 10)).toBeNull();
  });

  it("aos 40 s começa uma surpresa, mesmo com poucos pontos", () => {
    expect(passoSurpresa(SURPRESA_INICIAL, 40, 3).inicio).toBe(40);
  });

  it("com 25 pontos aos 12 s, já começa", () => {
    expect(passoSurpresa(SURPRESA_INICIAL, 12, 25).inicio).toBe(12);
  });

  it("durante a surpresa o estado não muda e o progresso vai de 0 a 1", () => {
    const s: EstadoSurpresa = { inicio: 40, ultimoFim: 0, pontosBase: 0 };
    expect(passoSurpresa(s, 43, 30)).toEqual(s);
    expect(progressoSurpresa(s, 40)).toBe(0);
    expect(progressoSurpresa(s, 44)).toBe(0.5);
    expect(progressoSurpresa(s, 48)).toBe(1);
  });

  it("depois de 8 s a surpresa acaba e grava o relógio e os pontos desse passo", () => {
    const s: EstadoSurpresa = { inicio: 40, ultimoFim: 0, pontosBase: 0 };
    expect(passoSurpresa(s, 48, 30)).toEqual({ inicio: null, ultimoFim: 48, pontosBase: 30 });
  });

  it("a próxima só vem 40 s depois do fim, ou com mais 25 pontos a partir de pontosBase", () => {
    const fim: EstadoSurpresa = { inicio: null, ultimoFim: 48, pontosBase: 30 };
    // pelo tempo
    expect(passoSurpresa(fim, 48 + SURPRESA_A_CADA_S - 1, 30).inicio).toBeNull();
    expect(passoSurpresa(fim, 48 + SURPRESA_A_CADA_S, 30).inicio).toBe(48 + SURPRESA_A_CADA_S);
    // pelos pontos
    expect(passoSurpresa(fim, 50, 30 + SURPRESA_A_CADA_PONTOS - 1).inicio).toBeNull();
    expect(passoSurpresa(fim, 50, 30 + SURPRESA_A_CADA_PONTOS).inicio).toBe(50);
  });

  it("as constantes valem 40, 25 e 8", () => {
    expect(SURPRESA_A_CADA_S).toBe(40);
    expect(SURPRESA_A_CADA_PONTOS).toBe(25);
    expect(DURACAO_SURPRESA).toBe(8);
  });
});
