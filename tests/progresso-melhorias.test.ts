import { describe, expect, it } from "vitest";
import { comprarMelhoria, nivelMelhoria, type Progresso } from "@/games/progresso";

const SAVE_ANTIGO: Progresso = { xp: 0, moedas: 10, comprados: [] };

describe("melhorias de poder", () => {
  it("nível é 0 sem o campo melhorias (save antigo)", () => {
    expect(nivelMelhoria(SAVE_ANTIGO, "escudo", "duracao")).toBe(0);
  });

  it("compra sobe o nível e desconta as moedas, de 0 a 1 e de 1 a 2", () => {
    const p1 = comprarMelhoria(SAVE_ANTIGO, "escudo", "duracao", 4, 3);
    expect(p1).not.toBeNull();
    expect(nivelMelhoria(p1!, "escudo", "duracao")).toBe(1);
    expect(p1!.moedas).toBe(6);

    const p2 = comprarMelhoria(p1!, "escudo", "duracao", 5, 3);
    expect(p2).not.toBeNull();
    expect(nivelMelhoria(p2!, "escudo", "duracao")).toBe(2);
    expect(p2!.moedas).toBe(1);
    expect(p2!.melhorias).toEqual({ "escudo:duracao": 2 });
  });

  it("devolve null sem moedas suficientes", () => {
    expect(comprarMelhoria(SAVE_ANTIGO, "escudo", "duracao", 11, 3)).toBeNull();
  });

  it("devolve null no nível máximo", () => {
    const cheio: Progresso = { ...SAVE_ANTIGO, moedas: 1000, melhorias: { "escudo:duracao": 3 } };
    expect(comprarMelhoria(cheio, "escudo", "duracao", 1, 3)).toBeNull();
  });

  it("não muda o progresso original", () => {
    const original: Progresso = { ...SAVE_ANTIGO, melhorias: { "escudo:duracao": 1 } };
    const copia = JSON.parse(JSON.stringify(original));
    const novo = comprarMelhoria(original, "escudo", "duracao", 4, 3);
    expect(novo).not.toBeNull();
    expect(novo).not.toBe(original);
    expect(original).toEqual(copia);
  });
});
