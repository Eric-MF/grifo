import { describe, expect, it } from "vitest";
import { avancarVoo, criarVoo, posicaoVoo } from "@/games/flap-suitcase/sucao";

const PASSO = 1 / 120;

describe("moedas sugadas ao contador", () => {
  it("sai do ponto da coleta e chega exatamente ao contador", () => {
    const v = criarVoo(100, 300, 320, 60, 0, 0.5);
    expect(posicaoVoo(v)).toEqual({ x: 100, y: 300 });
    let chegou = false;
    for (let i = 0; i < 600 && !chegou; i++) chegou = avancarVoo(v, PASSO);
    expect(chegou).toBe(true);
    expect(posicaoVoo(v)).toEqual({ x: 320, y: 60 });
  });

  it("espera o atraso antes de sair do lugar", () => {
    const v = criarVoo(0, 0, 100, 0, 0.2, 0);
    avancarVoo(v, 0.1);
    expect(v.t).toBe(0);
    expect(posicaoVoo(v)).toEqual({ x: 0, y: 0 });
    for (let i = 0; i < 30; i++) avancarVoo(v, PASSO);
    expect(v.t).toBeGreaterThan(0);
  });

  it("acelera: no meio do voo, a moeda ainda cobre menos da metade do caminho", () => {
    const v = criarVoo(0, 0, 100, 0, 0, 0);
    v.t = 0.5;
    expect(posicaoVoo(v).x).toBeLessThan(50);
  });

  it("o sorteio muda o arco e a duração de cada moeda do lote", () => {
    const lenta = criarVoo(0, 0, 100, 0, 0, 1);
    const rapida = criarVoo(0, 0, 100, 0, 0, 0);
    expect(lenta.dur).toBeGreaterThan(rapida.dur);
    expect(lenta.cy).toBeLessThan(rapida.cy);
  });
});
