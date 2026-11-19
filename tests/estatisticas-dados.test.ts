import { beforeAll, describe, expect, it, vi } from "vitest";
import { dadosEstatisticas } from "@/content/estatisticas";
import type { DadosEstatisticas } from "../src/lib/estatisticas/tipos";

vi.mock("server-only", () => ({}));

let dados: DadosEstatisticas;
beforeAll(() => {
  dados = dadosEstatisticas();
}, 30_000);

describe("exames", () => {
  it("são 80, em ordem cronológica", () => {
    expect(dados.exames).toHaveLength(80);
    expect(dados.exames.map((e) => e.ordem)).toEqual(Array.from({ length: 80 }, (_, i) => i));
  });

  it("começa no 110º de SP, da VUNESP", () => {
    expect(dados.exames[0]).toMatchObject({ id: "sp-110", era: "vunesp" });
  });

  it("o 140º de SP é do CESPE, 2009.3", () => {
    expect(dados.exames.find((e) => e.id === "sp-140")).toMatchObject({ era: "cespe", apelido: "2009.3" });
  });

  it("o I Exame Unificado é do CESPE, 2010.1; o II é da FGV", () => {
    expect(dados.exames.find((e) => e.id === "01")).toMatchObject({ era: "cespe", apelido: "2010.1" });
    expect(dados.exames.find((e) => e.id === "02")).toMatchObject({ era: "fgv" });
  });

  it("são 46 exames da FGV sem reaplicação", () => {
    expect(dados.exames.filter((e) => e.era === "fgv" && e.variante === null)).toHaveLength(46);
  });

  it("o 45 tem link de simulado e de prova", () => {
    const e = dados.exames.find((x) => x.id === "45");
    expect(e?.links.simulado).toBe("/simulados/45/");
    expect(e?.links.prova?.startsWith("/provas/?ver=45")).toBe(true);
  });

  it("os anos: o 110º estimado (≈2000), o 139º com a data da 2ª fase (2009.2, do CESPE)", () => {
    expect(dados.exames.find((e) => e.id === "sp-110")).toMatchObject({ ano: 2000, anoEstimado: true, data: null });
    expect(dados.exames.find((e) => e.id === "sp-139")).toMatchObject({ ano: 2009, anoEstimado: false, data: "2009-10-25", era: "cespe", apelido: "2009.2" });
  });

  it("todos os exames têm lugar no eixo do tempo, em ordem", () => {
    const naoReaplicados = dados.exames.filter((e) => !e.variante);
    expect(naoReaplicados.every((e) => e.quando !== null)).toBe(true);
    const quandos = naoReaplicados.map((e) => e.quando!);
    expect(quandos).toEqual([...quandos].sort((a, b) => a - b));
  });

  it("o XII e o XIII ganharam a data da 2ª fase", () => {
    expect(dados.exames.find((e) => e.id === "12")).toMatchObject({ ano: 2014, data: "2014-02-09" });
    expect(dados.exames.find((e) => e.id === "13")).toMatchObject({ ano: 2014, data: "2014-06-01" });
  });

  it("os antigos não têm site nem links", () => {
    const antigos = dados.exames.filter((e) => e.id.startsWith("sp-"));
    expect(antigos.length).toBeGreaterThan(0);
    for (const e of antigos) {
      expect(e.noSite).toBe(false);
      expect(e.links).toEqual({});
    }
  });
});

describe("peças", () => {
  it("a apelação tem prazo e o primeiro fundamento com link", () => {
    const p = dados.pecas.apelacao!;
    expect(p.prazo).toContain("5 dias");
    expect(p.fundamentos[0]).toEqual({ texto: "Art. 593 do CPP", url: "/leis/cpp/#art593", previa: { lei: "cpp", art: "art593" } });
  });

  it("a progressão de regime é de execução", () => {
    expect(dados.pecas["progressao-regime"]?.grupo).toBe("execucao");
  });
});

describe("artigos", () => {
  it("o art. 593 do CPP aparece em pelo menos 10 exames na peça", () => {
    const a = dados.artigos.find((x) => x.chave === "cpp:593");
    expect(a).toBeDefined();
    expect(a!.peca.length).toBeGreaterThanOrEqual(10);
  });

  it("não há leis especiais numeradas como lei-9 ou lei-8 no chave", () => {
    for (const a of dados.artigos) {
      expect(a.chave.startsWith("lei-9:")).toBe(false);
      expect(a.chave.startsWith("lei-8:")).toBe(false);
    }
  });

  it("a origem de cada artigo é uma das conhecidas", () => {
    const origens = ["cp", "cpp", "lep", "cf", "leis", "sumulas"];
    for (const a of dados.artigos) expect(origens).toContain(a.origem);
  });

  it("o inciso LVII do art. 5º da CF tem rótulo e link próprios", () => {
    const a = dados.artigos.find((x) => x.chave === "cf:5.i57");
    expect(a).toMatchObject({ rotulo: "Art. 5º, LVII, da CF", url: "/leis/cf/#art5.i57", previa: { lei: "cf", art: "art5", disp: "art5.i57" } });
  });
});

describe("linha do tempo, teses e leis", () => {
  it("a linha tem 9 marcos, o primeiro da VUNESP", () => {
    expect(dados.linha).toHaveLength(9);
    expect(dados.linha[0]?.era).toBe("vunesp");
  });

  it("os marcos ficam em ordem no eixo do tempo", () => {
    const de = dados.linha.map((m) => m.de);
    expect(de).toEqual([...de].sort((a, b) => a - b));
    for (const m of dados.linha) if (m.ate !== null) expect(m.ate).toBeGreaterThan(m.de);
  });

  it("o marco 'Era FGV' aponta para o exame 02", () => {
    expect(dados.linha.find((m) => m.rotulo === "Era FGV")?.exame?.id).toBe("02");
  });

  it("há mais de 30 teses", () => {
    expect(dados.teses.length).toBeGreaterThan(30);
  });

  it("as leis têm id, nome, unidades e cor", () => {
    expect(dados.leis.length).toBeGreaterThan(0);
    for (const l of dados.leis) {
      expect(l.id).toBeTruthy();
      expect(l.nome).toBeTruthy();
      expect(l.unidades).toBeGreaterThan(0);
      expect(l.cor).toBeTruthy();
    }
  });
});
