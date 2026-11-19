import { describe, expect, it } from "vitest";
import { buscarExames, contarArtigos, contarTeses, filtrarExames, fmtMedia, fmtPct, origemDosArtigos, rankingDePecas } from "../src/lib/estatisticas/exames";
import type { ArtigoEstat, ExameEstat } from "../src/lib/estatisticas/tipos";

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

describe("filtrarExames", () => {
  const a = ex({ id: "a", ordem: 0, era: "vunesp" });
  const b = ex({ id: "b", ordem: 1, numero: 1 });
  const c = ex({ id: "c", ordem: 2, numero: 2, variante: "Porto Alegre" });
  const d = ex({ id: "d", ordem: 3, numero: 2 });
  const e = ex({ id: "e", ordem: 4, numero: 3 });
  const ids = (l: ExameEstat[]) => l.map((x) => x.id);

  it("filtra pela época e tira as reaplicações", () => {
    expect(ids(filtrarExames([a, b, c, d, e], { eras: ["fgv"], ultimos: null, reaplicacoes: false }))).toEqual(["b", "d", "e"]);
  });

  it("inclui as reaplicações quando pedido", () => {
    expect(ids(filtrarExames([a, b, c, d, e], { eras: ["fgv"], ultimos: null, reaplicacoes: true }))).toEqual(["b", "c", "d", "e"]);
  });

  it("os últimos N levam a reaplicação junto do exame de mesmo número", () => {
    expect(ids(filtrarExames([a, b, c, d, e], { eras: ["fgv"], ultimos: 2, reaplicacoes: true }))).toEqual(["c", "d", "e"]);
  });

  it("junta mais de uma época", () => {
    expect(ids(filtrarExames([a, b, c, d, e], { eras: ["vunesp", "fgv"], ultimos: null, reaplicacoes: false }))).toEqual(["a", "b", "d", "e"]);
  });

  it("devolve em ordem cronológica mesmo com a entrada embaralhada", () => {
    expect(ids(filtrarExames([e, b, d, a], { eras: ["vunesp", "fgv"], ultimos: null, reaplicacoes: false }))).toEqual(["a", "b", "d", "e"]);
  });
});

describe("rankingDePecas", () => {
  const lista = [
    ex({ id: "1", ordem: 0, pecas: ["apelacao"] }),
    ex({ id: "2", ordem: 1, pecas: ["memoriais"] }),
    ex({ id: "3", ordem: 2, pecas: ["apelacao", "apelacao"] }),
    ex({ id: "4", ordem: 3, pecas: ["rese"] }),
    ex({ id: "5", ordem: 4, pecas: ["apelacao"] }),
    ex({ id: "6", ordem: 5, pecas: ["memoriais"] }),
  ];
  const nomes: Record<string, string> = { apelacao: "Apelação", memoriais: "Memoriais", rese: "Recurso em Sentido Estrito" };
  const tipos = (ordem: Parameters<typeof rankingDePecas>[2]) => rankingDePecas(lista, (t) => nomes[t]!, ordem).map((l) => l.tipo);

  it("conta cada peça uma vez por exame, com posições e fração", () => {
    const apelacao = rankingDePecas(lista)[0]!;
    expect(apelacao.tipo).toBe("apelacao");
    expect(apelacao.vezes).toBe(3);
    expect(apelacao.fracao).toBe(0.5);
    expect(apelacao.posicoes).toEqual([0, 2, 4]);
    expect(apelacao.desdeUltima).toBe(1);
    expect(apelacao.intervaloMedio).toBe(2);
    expect(apelacao.maiorJejum).toBe(2);
    expect(apelacao.ultima.id).toBe("5");
  });

  it("calcula os intervalos de memoriais e de rese", () => {
    const porTipo = Object.fromEntries(rankingDePecas(lista).map((l) => [l.tipo, l]));
    expect(porTipo.memoriais).toMatchObject({ vezes: 2, posicoes: [1, 5], desdeUltima: 0, intervaloMedio: 4, maiorJejum: 4 });
    expect(porTipo.rese).toMatchObject({ vezes: 1, intervaloMedio: null, maiorJejum: null, desdeUltima: 2 });
  });

  it("ordena por vezes", () => {
    expect(tipos("vezes")).toEqual(["apelacao", "memoriais", "rese"]);
  });

  it("ordena por jejum (a peça que faz mais tempo que não cai vem primeiro)", () => {
    expect(tipos("jejum")).toEqual(["rese", "apelacao", "memoriais"]);
  });

  it("ordena pelas mais recentes", () => {
    expect(tipos("recentes")).toEqual(["memoriais", "apelacao", "rese"]);
  });

  it("ordena pelo nome da peça", () => {
    expect(tipos("nome")).toEqual(["apelacao", "memoriais", "rese"]);
  });

  it("lista vazia devolve vazio", () => {
    expect(rankingDePecas([])).toEqual([]);
  });
});

describe("contarTeses", () => {
  const lista = [
    ex({ id: "1", ordem: 0, teses: { peca: ["nulidade"], questoes: ["nulidade", "prescricao"] } }),
    ex({ id: "2", ordem: 1, teses: { peca: ["nulidade", "atipicidade"], questoes: [] } }),
  ];

  it("conta as teses da peça", () => {
    expect(contarTeses(lista, "peca")).toEqual([
      { id: "nulidade", exames: ["1", "2"] },
      { id: "atipicidade", exames: ["2"] },
    ]);
  });

  it("conta as teses das questões", () => {
    const r = contarTeses(lista, "questoes");
    expect(r).toHaveLength(2);
    expect(r).toContainEqual({ id: "nulidade", exames: ["1"] });
    expect(r).toContainEqual({ id: "prescricao", exames: ["1"] });
  });

  it("em tudo, cada exame conta uma vez por tese", () => {
    const r = contarTeses(lista, "tudo");
    expect(r).toHaveLength(3);
    expect(r.find((c) => c.id === "nulidade")!.exames).toEqual(["1", "2"]);
  });
});

describe("contarArtigos", () => {
  const a1: ArtigoEstat = { chave: "cpp:593", rotulo: "Art. 593 do CPP", origem: "cpp", peca: ["1", "2"], questoes: ["3"] };
  const a2: ArtigoEstat = { chave: "cp:59", rotulo: "Art. 59 do CP", origem: "cp", peca: ["2"], questoes: ["2", "9"] };
  const artigos = [a1, a2];
  const lista = [ex({ id: "1", ordem: 0 }), ex({ id: "2", ordem: 1 }), ex({ id: "3", ordem: 2 })];

  it("conta os artigos da peça, com o artigo de volta", () => {
    const r = contarArtigos(artigos, lista, "peca", null);
    expect(r.map((c) => [c.id, c.exames])).toEqual([
      ["cpp:593", ["1", "2"]],
      ["cp:59", ["2"]],
    ]);
    expect(r[0]!.artigo).toBe(a1);
    expect(r[1]!.artigo).toBe(a2);
  });

  it("conta os artigos das questões, deixando de fora exames fora da lista (no empate, pela ordem do número)", () => {
    const r = contarArtigos(artigos, lista, "questoes", null);
    expect(r.map((c) => [c.id, c.exames])).toEqual([
      ["cp:59", ["2"]],
      ["cpp:593", ["3"]],
    ]);
  });

  it("filtra pela origem", () => {
    const r = contarArtigos(artigos, lista, "tudo", "cp");
    expect(r.map((c) => [c.id, c.exames])).toEqual([["cp:59", ["2"]]]);
  });

  it("soma de onde vêm os artigos citados", () => {
    expect(origemDosArtigos(contarArtigos(artigos, lista, "peca", null))).toEqual([
      { origem: "cpp", n: 2 },
      { origem: "cp", n: 1 },
    ]);
  });
});

describe("buscarExames", () => {
  const lista = [ex({ id: "1", ordem: 0, titulo: "XLV Exame" }), ex({ id: "2", ordem: 1, titulo: "XX Exame" })];
  const texto = (e: ExameEstat) => e.titulo + (e.id === "1" ? " Prescrição" : " Atipicidade");
  const ids = (q: string) => buscarExames(lista, q, texto).map((e) => e.id);

  it("acha sem acento e sem caixa", () => {
    expect(ids("prescricao")).toEqual(["1"]);
    expect(ids("xx atipic")).toEqual(["2"]);
  });

  it("busca vazia devolve tudo", () => {
    expect(ids("")).toEqual(["1", "2"]);
  });

  it("cada palavra precisa aparecer", () => {
    expect(ids("xlv atipicidade")).toEqual([]);
  });
});

describe("formatação", () => {
  it("fmtMedia usa vírgula e uma casa", () => {
    expect(fmtMedia(2.7)).toBe("2,7");
    expect(fmtMedia(3)).toBe("3");
    expect(fmtMedia(9.25)).toBe("9,3");
  });

  it("fmtPct arredonda para inteiro", () => {
    expect(fmtPct(0.304)).toBe("30%");
    expect(fmtPct(1)).toBe("100%");
  });
});
