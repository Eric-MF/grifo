import { describe, expect, it } from "vitest";
import { CONQUISTAS_INICIAL, diaISO, registrarResposta, registrarVisita, type Conquistas } from "../src/lib/conquistas";

const base = (extra: Partial<Conquistas> = {}): Conquistas => ({ ...CONQUISTAS_INICIAL, ...extra });
const dia = (d: number, h = 10) => new Date(2026, 9, d, h); // outubro de 2026, hora local

describe("respostas: sequência e categorias", () => {
  it("soma acertos seguidos e zera ao errar", () => {
    let c = base();
    for (let i = 0; i < 3; i++) c = registrarResposta(c, { acertou: true, categorias: ["peca"], tempoMs: 5000 });
    expect(c.acertosSeguidos).toBe(3);
    c = registrarResposta(c, { acertou: false, categorias: ["peca"], tempoMs: 5000 });
    expect(c.acertosSeguidos).toBe(0);
  });

  it("conta acerto por categoria só quando acerta", () => {
    let c = base();
    c = registrarResposta(c, { acertou: true, categorias: ["objetiva"], tempoMs: 9000 });
    c = registrarResposta(c, { acertou: false, categorias: ["objetiva"], tempoMs: 9000 });
    expect(c.acertosPorCategoria.objetiva).toBe(1);
  });

  it("guarda a resposta mais rápida", () => {
    let c = base();
    c = registrarResposta(c, { acertou: true, categorias: ["peca"], tempoMs: 4200 });
    c = registrarResposta(c, { acertou: false, categorias: ["peca"], tempoMs: 2600 });
    c = registrarResposta(c, { acertou: true, categorias: ["peca"], tempoMs: 7000 });
    expect(c.menorTempoRespostaMs).toBe(2600);
  });
});

describe("visitas: ausência e tema escuro", () => {
  it("primeira visita não marca ausência", () => {
    expect(registrarVisita(base(), dia(16), false).ausenciaPendente).toBe(false);
  });

  it("mais de 7 dias sem abrir marca ausência; 7 dias exatos não", () => {
    const antes = base({ ultimaVisita: dia(1).toISOString() });
    expect(registrarVisita(antes, dia(8, 10), false).ausenciaPendente).toBe(false);
    expect(registrarVisita(antes, dia(8, 11), false).ausenciaPendente).toBe(true);
  });

  it("conta dias seguidos com o tema escuro", () => {
    let c = base();
    c = registrarVisita(c, dia(10), true);
    c = registrarVisita(c, dia(11), true);
    c = registrarVisita(c, dia(12), true);
    expect(c.diasEscuro.sequencia).toBe(3);
  });

  it("uma visita no mesmo dia não conta de novo", () => {
    let c = base();
    c = registrarVisita(c, dia(10, 9), true);
    c = registrarVisita(c, dia(10, 18), true);
    expect(c.diasEscuro.sequencia).toBe(1);
  });

  it("um dia sem tema escuro, ou um intervalo de dias, zera a sequência", () => {
    let c = base();
    c = registrarVisita(c, dia(10), true);
    c = registrarVisita(c, dia(11), false);
    expect(c.diasEscuro.sequencia).toBe(0);
    c = registrarVisita(c, dia(12), true);
    expect(c.diasEscuro.sequencia).toBe(1);
    c = registrarVisita(c, dia(14), true);
    expect(c.diasEscuro.sequencia).toBe(1);
  });

  it("guarda o dia pelo calendário local", () => {
    expect(diaISO(dia(16))).toBe("2026-10-16");
  });
});
