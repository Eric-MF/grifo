import { describe, expect, it } from "vitest";
import {
  ajustarTipos,
  faltamParaDescer,
  faltamParaSubir,
  iniciarAutomatico,
  lerAutomatico,
  noFinal,
  proximaDoAutomatico,
  registrarNoAutomatico,
  type Avanco,
  type EstadoAutomatico,
} from "../src/quiz/automatico.ts";

/** Responde n questões com o mesmo resultado, seguindo o que o modo pede. */
function responder(e: EstadoAutomatico, n: number, acertou: boolean | ((q: ReturnType<typeof proximaDoAutomatico>) => boolean), log: string[] = []) {
  for (let i = 0; i < n; i++) {
    const q = proximaDoAutomatico(e, () => 0);
    log.push(`${q.categoria}:${q.nivel}${q.recapitulacao ? ":r" : ""}`);
    e = registrarNoAutomatico(e, q, typeof acertou === "function" ? acertou(q) : acertou).estado;
  }
  return e;
}

describe("modo automático", () => {
  it("começa no Fácil da Peça e fundamento e sobe com 4 acertos nas últimas 5", () => {
    let e = iniciarAutomatico([]);
    expect(proximaDoAutomatico(e)).toEqual({ categoria: "peca", nivel: 1, recapitulacao: false });
    e = responder(e, 3, true);
    expect(e.nivel).toBe(1);
    e = responder(e, 1, false);
    e = responder(e, 1, true);
    // 4 de 5
    expect(e.nivel).toBe(2);
    expect(faltamParaSubir(e)).toBe(4);
  });
  it("passa por todos os tipos, em ordem, e chega ao modo final no Difícil", () => {
    let e = iniciarAutomatico(["objetiva", "peca", "discursiva", "peca-detalhe"]);
    expect(e.tipos).toEqual(["peca", "peca-detalhe", "discursiva", "objetiva"]);
    const log: string[] = [];
    e = responder(e, 80, true, log);
    expect(noFinal(e)).toBe(true);
    expect(log.slice(0, 12)).toEqual(["peca:1", "peca:1", "peca:1", "peca:1", "peca:2", "peca:2", "peca:2", "peca:2", "peca:3", "peca:3", "peca:3", "peca:3"]);
    expect(log[12]).toBe("peca-detalhe:1");
    // no modo final, os tipos se alternam, todos no Difícil
    const fim: string[] = [];
    responder(e, 4, true, fim);
    expect(new Set(fim).size).toBe(4);
    expect(fim.every((x) => x.endsWith(":3"))).toBe(true);
  });
  it("recapitula um tipo vencido: 1 em 10 no 2º tipo, 1 em 20 no 3º, 1 em 30 no 4º", () => {
    const e: EstadoAutomatico = { ...iniciarAutomatico([]), etapa: 1 };
    const log: string[] = [];
    responder(e, 20, false, log);
    expect(log.filter((x) => x.endsWith(":r"))).toEqual(["peca:3:r", "peca:3:r"]);
    expect(log[9]).toBe("peca:3:r");
    const log3: string[] = [];
    responder({ ...e, etapa: 2 }, 40, false, log3);
    expect(log3.filter((x) => x.endsWith(":r")).length).toBe(2);
    expect(log3[19]).toMatch(/:r$/);
    const log4: string[] = [];
    responder({ ...e, etapa: 3 }, 30, false, log4);
    expect(log4.filter((x) => x.endsWith(":r")).length).toBe(1);
  });
  it("a recapitulação não conta para subir", () => {
    let e: EstadoAutomatico = { ...iniciarAutomatico([]), etapa: 1, naEtapa: 9 };
    const q = proximaDoAutomatico(e);
    expect(q.recapitulacao).toBe(true);
    e = registrarNoAutomatico(e, q, true).estado;
    expect(e.ultimas).toEqual([]);
  });
  it("tirar tipos: só os escolhidos, na ordem; sem o tipo da vez, segue para o próximo", () => {
    let e = iniciarAutomatico(["peca", "discursiva"]);
    expect(e.tipos).toEqual(["peca", "discursiva"]);
    e = { ...iniciarAutomatico([]), etapa: 1, nivel: 2 };
    expect(ajustarTipos(e, ["peca", "discursiva", "objetiva"])).toMatchObject({ etapa: 1, nivel: 1, tipos: ["peca", "discursiva", "objetiva"] });
    expect(ajustarTipos(e, ["peca-detalhe", "objetiva"])).toMatchObject({ etapa: 0, nivel: 2 });
    expect(noFinal(ajustarTipos(e, ["peca"]))).toBe(true);
  });
  it("o estado gravado volta, e o inválido é descartado", () => {
    const e = { ...iniciarAutomatico([]), etapa: 2, nivel: 3 as const, ultimas: [true] };
    expect(lerAutomatico(JSON.parse(JSON.stringify(e)))).toEqual(e);
    expect(lerAutomatico({ tipos: ["xyz"], etapa: 0, nivel: 1 })).toBeNull();
    expect(lerAutomatico(null)).toBeNull();
  });
  it("faltam: conta os acertos que a janela ainda guarda", () => {
    const e = iniciarAutomatico([]);
    expect(faltamParaSubir(e)).toBe(4);
    expect(faltamParaSubir({ ...e, ultimas: [false, true, true, true, false] })).toBe(1);
    expect(faltamParaSubir({ ...e, ultimas: [true, true, false, true, false] })).toBe(3);
  });
});

/** Responde uma sequência de resultados no nível atual e devolve o estado e o avanço da última resposta. */
function responderSeq(e: EstadoAutomatico, seq: boolean[], opcoes?: { descer?: boolean }) {
  let avanco: Avanco = null;
  for (const acertou of seq) {
    const r = registrarNoAutomatico(e, proximaDoAutomatico(e), acertou, opcoes);
    e = r.estado;
    avanco = r.avanco;
  }
  return { estado: e, avanco };
}

describe("modo automático: descer de nível", () => {
  it("no Médio, 3 erros nas últimas 5 fazem descer ao Fácil", () => {
    const e: EstadoAutomatico = { ...iniciarAutomatico([]), nivel: 2 };
    const { estado, avanco } = responderSeq(e, [true, false, false, false]);
    expect(estado.nivel).toBe(1);
    expect(estado.ultimas).toEqual([]);
    expect(avanco).toEqual({ tipo: "desceu", nivel: 1 });
  });
  it("no Difícil, erros misturados com acertos descem ao Médio quando as últimas 5 têm 3 erros", () => {
    const e: EstadoAutomatico = { ...iniciarAutomatico([]), nivel: 3 };
    const { estado, avanco } = responderSeq(e, [true, false, true, false, false]);
    expect(estado.nivel).toBe(2);
    expect(estado.ultimas).toEqual([]);
    expect(avanco).toEqual({ tipo: "desceu", nivel: 2 });
  });
  it("no Difícil, os erros que saem da janela deixam de contar", () => {
    const e: EstadoAutomatico = { ...iniciarAutomatico([]), nivel: 3 };
    // [f,f,t,t,t] e depois [f,t,t,t,f]: só 2 erros na janela
    const { estado, avanco } = responderSeq(e, [false, false, true, true, true, false]);
    expect(estado.nivel).toBe(3);
    expect(estado.ultimas).toEqual([false, true, true, true, false]);
    expect(avanco).toBeNull();
  });
  it("no Fácil, 5 erros não descem: fica no Fácil", () => {
    const e = iniciarAutomatico([]);
    const { estado, avanco } = responderSeq(e, [false, false, false, false, false]);
    expect(estado.nivel).toBe(1);
    expect(avanco).toBeNull();
  });
  it("com descer: false, 5 erros no Médio não descem", () => {
    const e: EstadoAutomatico = { ...iniciarAutomatico([]), nivel: 2 };
    const { estado, avanco } = responderSeq(e, [false, false, false, false, false], { descer: false });
    expect(estado.nivel).toBe(2);
    expect(avanco).toBeNull();
  });
  it("uma recapitulação errada não conta para descer", () => {
    const e: EstadoAutomatico = { ...iniciarAutomatico([]), etapa: 1, nivel: 3, ultimas: [false, false] };
    const r = registrarNoAutomatico(e, { categoria: "peca", nivel: 3, recapitulacao: true }, false);
    expect(r.estado.ultimas).toEqual([false, false]);
    expect(r.estado.nivel).toBe(3);
    expect(r.avanco).toBeNull();
  });
  it("no modo final, erros não mudam o nível: só o vez avança", () => {
    const e: EstadoAutomatico = { ...iniciarAutomatico([]), etapa: 4, nivel: 3, vez: 0 };
    const { estado, avanco } = responderSeq(e, [false, false, false, false, false]);
    expect(estado.nivel).toBe(3);
    expect(estado.etapa).toBe(4);
    expect(estado.vez).toBe(5);
    expect(avanco).toBeNull();
  });
  it("faltamParaDescer: conta os erros que a janela ainda guarda", () => {
    const e = iniciarAutomatico([]);
    expect(faltamParaDescer(e)).toBe(3);
    expect(faltamParaDescer({ ...e, ultimas: [false] })).toBe(2);
    // o erro mais antigo sai ao anotar o próximo: ainda faltam 3
    expect(faltamParaDescer({ ...e, ultimas: [false, false, true, true, true] })).toBe(3);
    expect(faltamParaDescer({ ...e, ultimas: [false, true, true, true, false] })).toBe(2);
    expect(faltamParaDescer({ ...e, ultimas: [false, true, false, true] })).toBe(1);
  });
});
