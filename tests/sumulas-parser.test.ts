import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { detalheSTF, listaSTF, listaSTJ, lerPrecedentes, lerReferenciaSTJ } from "../scripts/sumulas/parser";

const fixture = (nome: string) => readFileSync(join(__dirname, "fixtures", "sumulas", nome), "utf8");

describe("STF: lista de súmulas (base=30)", () => {
  const lista = listaSTF(fixture("stf-lista.html"));

  it("lê o número, o identificador do portal e o status de cada súmula", () => {
    expect(lista.map((s) => s.numero)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(lista[0]).toEqual({ numero: 1, status: "vigente", id: "1451" });
  });

  it("marca as superadas e as canceladas como o portal marca", () => {
    expect(lista.find((s) => s.numero === 3)?.status).toBe("superada");
    expect(lista.find((s) => s.numero === 4)?.status).toBe("cancelada");
  });
});

describe("STF: detalhe de uma súmula", () => {
  const det = detalheSTF(fixture("stf-sumula-1.html"));

  it("traz o enunciado", () => {
    expect(det.enunciado).toBe("É vedada a expulsão de estrangeiro casado com brasileira, ou que tenha filho brasileiro, dependente da economia paterna.");
  });

  it("separa a jurisprudência selecionada em entradas, com título quando há e a referência entre colchetes", () => {
    expect(det.jurisprudencia.length).toBeGreaterThanOrEqual(5);
    const primeira = det.jurisprudencia[0]!;
    expect(primeira.titulo).toBe("Condições para expulsão em caso de casamento ou paternidade de filho brasileiro");
    expect(primeira.referencia).toMatch(/RHC 122\.682/);
    expect(primeira.ementa).toMatch(/^Recurso em habeas corpus\./);
  });

  it("mantém a observação comum e o 'Vide' com o alvo da súmula citada", () => {
    const vide = det.observacoes.find((o) => /^Vide/.test(o.texto));
    expect(vide?.vide).toEqual({ tribunal: "stf", numero: 421 });
    expect(det.observacoes.find((o) => /Tema 373/.test(o.texto))?.vide).toBeUndefined();
  });

  it("lê a data de aprovação do enunciado, fora das observações", () => {
    expect(det.dataAprovacao).toBe("Sessão Plenária de 13-12-1963");
    expect(det.observacoes.some((o) => /Data de aprovação/.test(o.texto))).toBe(false);
  });
});

describe("STJ: lista de súmulas (100 por página), com o detalhe de cada uma", () => {
  const lista = listaSTJ(fixture("stj-lista.html"));
  const s676 = lista.find((s) => s.numero === 676)!;

  it("lê todas as súmulas da página, em ordem, sem repetir", () => {
    const numeros = lista.map((s) => s.numero);
    // o recorte salvo no fixture tem 98 itens (a página completa tem 100)
    expect(numeros.length).toBe(98);
    expect(new Set(numeros).size).toBe(98);
    expect(numeros).toEqual([...numeros].sort((a, b) => a - b));
    expect(numeros).toContain(579);
    expect(numeros).toContain(676);
  });

  it("separa o ramo, o enunciado e o julgamento", () => {
    expect(s676.ramo).toBe("DIREITO PROCESSUAL PENAL - PRISÃO");
    expect(s676.enunciado).toMatch(/^Em razão da Lei n\. 13\.964\/2019, não é mais possível/);
    expect(s676.julgamento).toBe("TERCEIRA SEÇÃO, julgado em 11/12/2024, DJe de 17/12/2024");
  });

  it("traz a fonte, a referência legislativa e os precedentes do modal", () => {
    expect(s676.fonte).toBe("DJe 17/12/2024");
    expect(s676.referenciaLegislativa).toContainEqual({ norma: "LEI MARIA DA PENHA", artigos: ["20"] });
    expect(s676.precedentes.length).toBeGreaterThanOrEqual(2);
    expect(s676.precedentes[0]).toMatch(/HOMICÍDIO QUALIFICADO/);
  });

  it("uma súmula sem modal na página fica com os campos extras vazios", () => {
    const s579 = lista.find((s) => s.numero === 579)!;
    expect(s579.referenciaLegislativa).toEqual([]);
    expect(s579.precedentes).toEqual([]);
  });
});

describe("texto auxiliar", () => {
  it("lerReferenciaSTJ: uma norma com o artigo; a linha sem código vira norma sem artigo", () => {
    expect(lerReferenciaSTJ(["LEG:FED LEI:013964 ANO:2019", "***** LPAC-2019 LEI DO PACOTE ANTICRIME", "ART:00311"])).toEqual([
      { norma: "LEI DO PACOTE ANTICRIME", artigos: ["311"] },
    ]);
  });

  it("lerPrecedentes separa cada trecho pelo 'Inteiro Teor do Acórdão'", () => {
    expect(lerPrecedentes("“um trecho” ( AgRg ) Inteiro Teor do Acórdão Consulta Processual “outro” (HC) Inteiro Teor do Acórdão")).toEqual([
      "“um trecho” ( AgRg )",
      "“outro” (HC)",
    ]);
  });
});
