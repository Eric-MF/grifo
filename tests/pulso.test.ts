import { describe, expect, it } from "vitest";
import { ALCANCE_PULSO, colunasDoPulso, PODERES_COM_PULSO } from "../src/games/flap-suitcase/pulso";

const coluna = (x: number, extra: { passou?: boolean; arquivado?: boolean } = {}) => ({ x, passou: false, ...extra });

describe("pulso do fim de Asas de Ouro e de Voo do Grifo", () => {
  it("só Asas de Ouro e Voo do Grifo soltam o pulso", () => {
    expect(PODERES_COM_PULSO).toEqual(["leve", "voo"]);
  });

  it("quebra as colunas entre o pássaro e o alcance, sem tocar nas que estão atrás", () => {
    const jogX = 200;
    const pilares = [coluna(120), coluna(200), coluna(300), coluna(200 + ALCANCE_PULSO), coluna(200 + ALCANCE_PULSO + 1)];
    expect(colunasDoPulso(pilares, jogX).map((q) => q.x)).toEqual([200, 300, 200 + ALCANCE_PULSO]);
  });

  it("não quebra colunas já passadas nem arquivadas", () => {
    const pilares = [coluna(260, { passou: true }), coluna(280, { arquivado: true }), coluna(300)];
    expect(colunasDoPulso(pilares, 200).map((q) => q.x)).toEqual([300]);
  });

  it("sem colunas à frente, não há o que quebrar", () => {
    expect(colunasDoPulso([coluna(50), coluna(100)], 200)).toEqual([]);
  });
});
