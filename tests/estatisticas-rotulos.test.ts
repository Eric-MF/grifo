import { describe, expect, it } from "vitest";
import { anoDoExame, dataDoExame, detalheDoExame, dica, exameEmAlgarismos } from "../src/lib/estatisticas/rotulos";
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

describe("exameEmAlgarismos", () => {
  it("um exame do site vira '45º Exame'", () => {
    expect(exameEmAlgarismos(ex({ id: "45", ordem: 44, numero: 45, noSite: true }))).toBe("45º Exame");
  });

  it("a reaplicação regional leva o nome da cidade", () => {
    expect(exameEmAlgarismos(ex({ id: "20-pv", ordem: 19, numero: 20, variante: "Porto Velho" }))).toBe("20º Exame · Porto Velho");
  });

  it("um exame antigo da OAB/SP vira '110º Exame da OAB/SP'", () => {
    expect(exameEmAlgarismos(ex({ id: "sp-110", ordem: 0, numero: 110, noSite: false }))).toBe("110º Exame da OAB/SP");
  });
});

describe("anoDoExame", () => {
  it("o ano conhecido aparece sem sinal", () => {
    expect(anoDoExame(ex({ id: "x", ordem: 0, ano: 2026 }))).toBe("2026");
  });

  it("o ano estimado leva ≈", () => {
    expect(anoDoExame(ex({ id: "x", ordem: 0, ano: 2001, anoEstimado: true }))).toBe("≈2001");
  });

  it("sem ano, dá null", () => {
    expect(anoDoExame(ex({ id: "x", ordem: 0, ano: null }))).toBeNull();
  });
});

describe("dataDoExame", () => {
  it("a data da 2ª fase sai como dia/mês/ano, sem zeros à esquerda", () => {
    expect(dataDoExame(ex({ id: "x", ordem: 0, data: "2026-02-22", ano: 2026 }))).toBe("22/2/2026");
  });

  it("sem a data, mostra o ano", () => {
    expect(dataDoExame(ex({ id: "x", ordem: 0, data: null, ano: 2019 }))).toBe("2019");
  });
});

describe("detalheDoExame", () => {
  it("exame do site: título, data e banca", () => {
    const e = ex({ id: "45", ordem: 44, titulo: "XLV Exame", data: "2026-02-22", ano: 2026, apelido: null, noSite: true });
    expect(detalheDoExame(e, "FGV")).toBe("XLV Exame · 22/2/2026 · FGV");
  });

  it("exame antigo: o ano e a banca, sem o título", () => {
    const e = ex({ id: "sp-x", ordem: 0, titulo: "95º Exame da OAB/SP", ano: 2005, apelido: null, noSite: false });
    expect(detalheDoExame(e, "FGV")).toBe("2005 · FGV");
  });
});

describe("dica", () => {
  it("junta as linhas de baixo, pulando as vazias, num só atributo", () => {
    expect(dica("Título", "a", null, "", false, "b")).toEqual({ "data-dica": "Título", "data-dica-mais": "a\nb" });
  });

  it("sem linhas de baixo, só o título", () => {
    const d = dica("Só");
    expect(d).toEqual({ "data-dica": "Só" });
    expect(d).not.toHaveProperty("data-dica-mais");
  });
});
