import { describe, expect, it } from "vitest";
import { infoTeses, TESES, tesesNoTexto } from "../src/lib/estatisticas/teses";

describe("tesesNoTexto", () => {
  it("acha a prescrição pela palavra", () => {
    expect(tesesNoTexto("Prescrição da pretensão punitiva (art. 109 do CP)")).toContain("prescricao");
  });

  it("acha a absolvição sumária, e também a absolvição", () => {
    const r = tesesNoTexto("Pedido de absolvição sumária, nos termos do art. 397 do CPP");
    expect(r).toContain("absolvicao");
    expect(r).toContain("absolvicao-sumaria");
  });

  it("ignora caixa e acento na legítima defesa", () => {
    expect(tesesNoTexto("Reconhecimento da legítima defesa")).toContain("legitima-defesa");
    expect(tesesNoTexto("Excesso na LEGÍTIMA DEFESA")).toContain("legitima-defesa");
  });

  it("não acha tentativa em 'tentativas'", () => {
    expect(tesesNoTexto("várias tentativas de contato")).not.toContain("tentativa");
  });

  it("acha tentativa em 'tentada'", () => {
    expect(tesesNoTexto("crime na forma tentada")).toContain("tentativa");
  });

  it("acha nulidade pela palavra e pelo verbo anular", () => {
    expect(tesesNoTexto("Nulidade por falta de citação")).toContain("nulidade");
    expect(tesesNoTexto("anular o processo")).toContain("nulidade");
  });

  it("devolve as teses na ordem de TESES", () => {
    const r = tesesNoTexto("Prescrição; nulidade da citação");
    expect(r).toEqual(["nulidade", "prescricao"]);
  });

  it("texto sem tese devolve lista vazia", () => {
    expect(tesesNoTexto("Endereçamento ao juízo competente")).toEqual([]);
  });
});

describe("TESES e infoTeses", () => {
  it("cada id é único", () => {
    const ids = TESES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("cada tese está em um dos grupos", () => {
    const grupos = ["processo", "crime", "pena", "execucao"];
    for (const t of TESES) expect(grupos).toContain(t.grupo);
  });

  it("infoTeses não expõe a regex", () => {
    for (const t of infoTeses()) expect(t).not.toHaveProperty("re");
  });

  it("a prescrição tem a busca 'prescrição'", () => {
    expect(infoTeses().find((t) => t.id === "prescricao")?.busca).toBe("prescrição");
  });
});
