import { describe, expect, it } from "vitest";
import { STRIKE_ZERO, progressoDoStrike, registrarStrike, tamanhoDoStrike, type EstadoStrike } from "../src/quiz/strike.ts";
import { SonsDoTreino } from "../src/quiz/sons.ts";

/** Aplica n acertos seguidos a partir de um estado e devolve o último resultado. */
function acertar(e: EstadoStrike, n: number) {
  let r = { estado: e, strike: false, perdeu: 0 };
  for (let i = 0; i < n; i++) r = registrarStrike(r.estado, true);
  return r;
}

describe("tamanhoDoStrike", () => {
  it("cresce 10 → 15 → 20 → 25 → 30 nos degraus 3, 6, 12 e 24, e para em 30", () => {
    expect(tamanhoDoStrike(0)).toBe(10);
    expect(tamanhoDoStrike(2)).toBe(10);
    expect(tamanhoDoStrike(3)).toBe(15);
    expect(tamanhoDoStrike(5)).toBe(15);
    expect(tamanhoDoStrike(6)).toBe(20);
    expect(tamanhoDoStrike(11)).toBe(20);
    expect(tamanhoDoStrike(12)).toBe(25);
    expect(tamanhoDoStrike(23)).toBe(25);
    expect(tamanhoDoStrike(24)).toBe(30);
    expect(tamanhoDoStrike(100)).toBe(30);
  });
});

describe("registrarStrike", () => {
  it("dez acertos seguidos dão strike só no décimo", () => {
    let e = STRIKE_ZERO;
    for (let i = 1; i < 10; i++) {
      const r = registrarStrike(e, true);
      expect(r.strike).toBe(false);
      e = r.estado;
    }
    const decimo = registrarStrike(e, true);
    expect(decimo.strike).toBe(true);
    expect(decimo.estado).toEqual({ acertos: 0, seguidos: 1, total: 1 });
  });

  it("depois de três strikes, o próximo pede 15 questões", () => {
    const tres = acertar(STRIKE_ZERO, 30).estado;
    expect(tres).toEqual({ acertos: 0, seguidos: 3, total: 3 });
    const quatorze = acertar(tres, 14);
    expect(quatorze.strike).toBe(false);
    expect(quatorze.estado.acertos).toBe(14);
    expect(registrarStrike(quatorze.estado, true).strike).toBe(true);
  });

  it("erro com sete bolinhas perde sete e zera a sequência, mantendo o total", () => {
    const um = acertar(STRIKE_ZERO, 10).estado;
    const sete = acertar(um, 7).estado;
    const r = registrarStrike(sete, false);
    expect(r.strike).toBe(false);
    expect(r.perdeu).toBe(7);
    expect(r.estado).toEqual({ acertos: 0, seguidos: 0, total: 1 });
  });

  it("acerto não perde bolinhas", () => {
    expect(registrarStrike(STRIKE_ZERO, true).perdeu).toBe(0);
  });

  it("não altera o estado recebido", () => {
    const e: EstadoStrike = { acertos: 4, seguidos: 1, total: 2 };
    const antes = { ...e };
    registrarStrike(e, true);
    registrarStrike(e, false);
    expect(e).toEqual(antes);
  });
});

describe("progressoDoStrike", () => {
  it("é a fração das bolinhas do strike atual", () => {
    expect(progressoDoStrike({ acertos: 5, seguidos: 0, total: 0 })).toBe(0.5);
  });
});

describe("SonsDoTreino fora do navegador", () => {
  it("cria sem erro e os métodos não fazem nada sem window", () => {
    const sons = new SonsDoTreino();
    expect(() => {
      sons.acerto(0.5);
      sons.perdeu(3);
      sons.strike();
      sons.fechar();
    }).not.toThrow();
  });
});
