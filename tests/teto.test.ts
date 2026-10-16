import { describe, expect, it } from "vitest";
import { atingiuBatidas, BATIDAS_JANELA, BATIDAS_LIMITE, registrarBatida } from "@/games/flap-suitcase/teto";

const batidasEm = (instantes: number[]) => instantes.reduce((b, t) => registrarBatida(b, t), [] as number[]);

describe("batidas de cabeça no teto", () => {
  it("cinco batidas dentro de 10 s derretem as asas", () => {
    expect(BATIDAS_LIMITE).toBe(5);
    expect(BATIDAS_JANELA).toBe(10);
    expect(atingiuBatidas(batidasEm([0, 2, 4, 6, 8]))).toBe(true);
  });

  it("quatro batidas não bastam", () => {
    expect(atingiuBatidas(batidasEm([0, 2, 4, 6]))).toBe(false);
  });

  it("batidas espalhadas por mais de 10 s não somam: só as da janela contam", () => {
    expect(atingiuBatidas(batidasEm([0, 3, 6, 9, 12]))).toBe(false);
  });
});
