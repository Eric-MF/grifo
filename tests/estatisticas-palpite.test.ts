import { describe, expect, it } from "vitest";
import { ATRASO_MAXIMO, HISTORIA_MINIMA, palpite, testarPalpite } from "../src/lib/estatisticas/palpite";
import type { ExameEstat } from "../src/lib/estatisticas/tipos";

const ex = (o: Partial<ExameEstat> & { id: string; ordem: number }): ExameEstat => ({
  numero: o.ordem,
  numeral: String(o.ordem),
  titulo: `${o.ordem} Exame`,
  apelido: null,
  ano: null,
  anoEstimado: false,
  data: null,
  quando: null,
  era: "fgv",
  variante: null,
  pecas: ["apelacao"],
  pecaNaProva: null,
  noSite: true,
  corrigivel: true,
  preliminar: false,
  questoes: 4,
  links: {},
  teses: { peca: [], questoes: [] },
  ...o,
});

/** Uma lista de exames em ordem cronológica, cada um com uma peça: seq("a", "b") = dois exames. */
const seq = (...tipos: string[]) => tipos.map((t, i) => ex({ id: `e${i}`, ordem: i, pecas: [t] }));

const porTipo = (linhas: ReturnType<typeof palpite>, tipo: string) => linhas.find((l) => l.tipo === tipo)!;

describe("palpite", () => {
  const lista = seq("a", "b", "a", "c", "a", "b");

  it("sem peso, a chance é a fração das vezes normalizada, na ordem da mais provável", () => {
    const p = palpite(lista, 0);
    expect(p.map((l) => l.tipo)).toEqual(["a", "b", "c"]);
    expect(p[0]!.chance).toBeCloseTo(0.5, 10);
    expect(p[1]!.chance).toBeCloseTo(1 / 3, 10);
    expect(p[2]!.chance).toBeCloseTo(1 / 6, 10);
  });

  it("os números de cada peça: vezes, fração, desde a última, esperado e atraso", () => {
    const a = porTipo(palpite(lista, 0), "a");
    expect(a.vezes).toBe(3);
    expect(a.fracao).toBeCloseTo(0.5, 10);
    expect(a.desdeUltima).toBe(1);
    expect(a.esperado).toBeCloseTo(2, 10);
    expect(a.atraso).toBeCloseTo(1, 10);
  });

  it("a peça que caiu uma vez espera o número de exames inteiro para voltar", () => {
    const c = porTipo(palpite(lista, 0), "c");
    expect(c.vezes).toBe(1);
    expect(c.desdeUltima).toBe(2);
    expect(c.esperado).toBeCloseTo(6, 10);
    expect(c.atraso).toBeCloseTo(0.5, 10);
  });

  it("com peso 1, a chance é a fração vezes o atraso, normalizada pela soma", () => {
    const p = palpite(lista, 1);
    // a = 0,5 × 1; b = (2/6) × (1/3); c = (1/6) × 0,5; a soma dos três é 0,69444…
    const a = 0.5;
    const b = (2 / 6) * (1 / 3);
    const c = (1 / 6) * 0.5;
    const soma = a + b + c;
    expect(porTipo(p, "a").chance).toBeCloseTo(a / soma, 10);
    expect(porTipo(p, "b").chance).toBeCloseTo(b / soma, 10);
    expect(porTipo(p, "c").chance).toBeCloseTo(c / soma, 10);
    expect(porTipo(p, "a").chance).toBeCloseTo(0.72, 10);
    expect(porTipo(p, "b").chance).toBeCloseTo(0.16, 10);
    expect(porTipo(p, "c").chance).toBeCloseTo(0.12, 10);
  });

  it("a soma das chances dá 1", () => {
    const soma = palpite(lista, 1).reduce((s, l) => s + l.chance, 0);
    expect(soma).toBeCloseTo(1, 10);
  });

  it("o atraso na chance para em ATRASO_MAXIMO, mas o campo atraso mostra o valor sem limite", () => {
    expect(ATRASO_MAXIMO).toBe(3);
    // "x" cai nos 4 primeiros de 20 exames; "y" nos 16 seguintes
    const grande = [...[0, 1, 2, 3].map((i) => ex({ id: `x${i}`, ordem: i, pecas: ["x"] })), ...Array.from({ length: 16 }, (_, i) => ex({ id: `y${i}`, ordem: i + 4, pecas: ["y"] }))];
    const p = palpite(grande, 1);
    const x = porTipo(p, "x");
    // desde a última: 19 - 3 = 16; esperado: 20 / 4 = 5; atraso: (16 + 1) / 5 = 3,4 (acima de 3)
    expect(x.atraso).toBeCloseTo(3.4, 10);
    // a chance usa 3 no lugar de 3,4: fração 0,2 × 3 = 0,6; y: 0,8 × 0,8 = 0,64
    expect(x.chance).toBeCloseTo(0.6 / 1.24, 10);
    expect(porTipo(p, "y").chance).toBeCloseTo(0.64 / 1.24, 10);
  });

  it("as reaplicações não mudam o palpite", () => {
    const com = [...seq("a", "b"), ex({ id: "var", ordem: 2, variante: "Porto Velho", pecas: ["c"] }), ...seq("a", "a", "c").map((e, i) => ({ ...e, id: `f${i}`, ordem: i + 3 }))];
    const sem = com.filter((e) => !e.variante);
    expect(palpite(com, 1)).toEqual(palpite(sem, 1));
  });

  it("uma lista vazia dá []", () => {
    expect(palpite([])).toEqual([]);
    expect(palpite([ex({ id: "v", ordem: 0, variante: "Porto Alegre" })])).toEqual([]);
  });
});

describe("testarPalpite", () => {
  it("com HISTORIA_MINIMA exames ou menos, não testa nada", () => {
    expect(HISTORIA_MINIMA).toBe(10);
    const r = testarPalpite(seq(...Array.from({ length: 10 }, () => "a")));
    expect(r).toEqual({ testados: 0, desde: null, acertos: 0, entreTres: 0, acertosEm: [], entreTresEm: [] });
  });

  it("com 12 exames, testa os de índice 10 e 11 a partir do 10º", () => {
    const lista = seq(...Array.from({ length: 12 }, () => "a"));
    const r = testarPalpite(lista);
    expect(r.testados).toBe(2);
    expect(r.desde).toBe(lista[10]);
    expect(r.acertos).toBe(2);
    expect(r.entreTres).toBe(2);
    expect(r.acertosEm).toEqual([lista[10], lista[11]]);
    expect(r.entreTresEm).toEqual([lista[10], lista[11]]);
  });

  it("uma peça que nunca caiu antes só entra no palpite depois da primeira vez", () => {
    // 10 "a", depois "z" duas vezes: o exame 10 é "z" (ainda não caiu); no 11, "z" já caiu uma vez
    const r = testarPalpite(seq(...Array.from({ length: 10 }, () => "a"), "z", "z"));
    expect(r.testados).toBe(2);
    expect(r.acertos).toBe(0);
    expect(r.entreTres).toBe(1);
  });

  it("num exame com várias peças, acertar qualquer uma conta", () => {
    // 10 "a"; o exame 10 tem "z" e "a": o palpite é "a", que está entre as peças do exame
    const lista = [...seq(...Array.from({ length: 10 }, () => "a")), ex({ id: "multi", ordem: 10, pecas: ["z", "a"] })];
    const r = testarPalpite(lista);
    expect(r.testados).toBe(1);
    expect(r.acertos).toBe(1);
  });

  it("com janela, cada palpite usa só os exames anteriores dentro dela", () => {
    // 7 "a" e 4 "b": sem janela, o palpite do exame 10 (que é "b") é "a"; com janela 3, só vê os três "b" antes
    const lista = seq(...Array.from({ length: 7 }, () => "a"), "b", "b", "b", "b");
    expect(testarPalpite(lista, 1, null).acertos).toBe(0);
    const comJanela = testarPalpite(lista, 1, 3);
    expect(comJanela.testados).toBe(1);
    expect(comJanela.acertos).toBe(1);
  });
});
