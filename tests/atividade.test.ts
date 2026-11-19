import { describe, expect, it } from "vitest";
import { ATIVIDADE_VAZIA, contarResposta, DIAS_ATIVIDADE } from "../src/lib/atividade";

describe("contarResposta", () => {
  it("conta um acerto no dia, com a categoria e a peça", () => {
    const at = contarResposta(ATIVIDADE_VAZIA, { acertou: true, categorias: ["peca"], peca: "apelacao", tempoMs: 5000 }, new Date(2026, 0, 10, 9));
    expect(at.dias["2026-01-10"]).toEqual({ a: 1, e: 0, ms: 5000, c: { peca: [1, 0] }, p: { apelacao: [1, 0] } });
  });

  it("soma um erro no mesmo dia, por categoria e sem peça", () => {
    let at = contarResposta(ATIVIDADE_VAZIA, { acertou: true, categorias: ["peca"], peca: "apelacao", tempoMs: 5000 }, new Date(2026, 0, 10, 9));
    at = contarResposta(at, { acertou: false, categorias: ["peca", "peca-detalhe"], tempoMs: 2000 }, new Date(2026, 0, 10, 18));
    const d = at.dias["2026-01-10"]!;
    expect(d.a).toBe(1);
    expect(d.e).toBe(1);
    expect(d.ms).toBe(7000);
    expect(d.c.peca).toEqual([1, 1]);
    expect(d.c["peca-detalhe"]).toEqual([0, 1]);
    expect(d.p.apelacao).toEqual([1, 0]);
  });

  it("limita o tempo de uma resposta a 10 minutos", () => {
    const at = contarResposta(ATIVIDADE_VAZIA, { acertou: true, categorias: ["objetiva"], tempoMs: 3_600_000 }, new Date(2026, 0, 10, 9));
    expect(at.dias["2026-01-10"]!.ms).toBe(600_000);
  });

  it("tempo negativo não soma", () => {
    const at = contarResposta(ATIVIDADE_VAZIA, { acertou: false, categorias: ["objetiva"], tempoMs: -5000 }, new Date(2026, 0, 10, 9));
    expect(at.dias["2026-01-10"]!.ms).toBe(0);
  });

  it("não muda a atividade de entrada", () => {
    contarResposta(ATIVIDADE_VAZIA, { acertou: true, categorias: ["peca"], peca: "apelacao", tempoMs: 5000 }, new Date(2026, 0, 10, 9));
    expect(ATIVIDADE_VAZIA.dias).toEqual({});
  });

  it("guarda no máximo DIAS_ATIVIDADE dias, saindo os mais antigos", () => {
    let at = ATIVIDADE_VAZIA;
    for (let i = 0; i < DIAS_ATIVIDADE + 5; i++) {
      at = contarResposta(at, { acertou: true, categorias: ["objetiva"], tempoMs: 1000 }, new Date(2025, 0, 1 + i, 12));
    }
    expect(Object.keys(at.dias)).toHaveLength(DIAS_ATIVIDADE);
    expect(Object.keys(at.dias).sort()[0]).toBe("2025-01-06");
  });
});
