import { describe, expect, it } from "vitest";
import { textoParaCopiar } from "@/quiz/copiar";
import type { PerguntaObjetiva, PerguntaPeca, PerguntaTese } from "@/quiz/types";

const enunciado = { caso: "Caso de teste.", comando: "Qual a peça?", explicacao: "", fonte: "gerada" };

describe("texto da questão para copiar", () => {
  it("objetiva: id, enunciado, comando e as quatro alternativas", () => {
    const p: PerguntaObjetiva = {
      ...enunciado,
      id: "obj-1",
      formato: "objetiva",
      categorias: ["objetiva"],
      alternativas: { A: "Primeira", B: "Segunda", C: "Terceira", D: "Quarta" },
      correta: "A",
      dispositivos: [],
    };
    expect(textoParaCopiar(p, 1, p.comando, [], [])).toBe(
      "Questão: obj-1\n\nCaso de teste.\n\nQual a peça?\n\nA) Primeira\nB) Segunda\nC) Terceira\nD) Quarta",
    );
  });

  it("peça no nível fácil: as alternativas saem na ordem recebida (a mesma da tela)", () => {
    const p: PerguntaPeca = { ...enunciado, id: "peca-1", formato: "peca", categorias: ["peca"], resposta: { peca: "x", fundamentos: [] } };
    const alts = [
      { tipo: "b", nome: "Apelação" },
      { tipo: "a", nome: "Recurso em Sentido Estrito" },
    ];
    expect(textoParaCopiar(p, 1, p.comando, alts, [])).toBe(
      "Questão: peca-1\n\nCaso de teste.\n\nQual a peça?\n\nA) Apelação\nB) Recurso em Sentido Estrito",
    );
  });

  it("tese no nível fácil: as alternativas saem na ordem recebida (a mesma da tela)", () => {
    const p: PerguntaTese = {
      ...enunciado,
      id: "tese-1",
      formato: "tese",
      categorias: ["peca-detalhe"],
      enunciado: "Caso completo.",
      tese: "Desclassificação para furto simples",
      aceitos: [["furto simples"]],
      artigos: ["art. 155, CP"],
      valor: 0.5,
      erradas: { artigos: [], teses: [] },
    };
    expect(textoParaCopiar(p, 1, p.comando, [], [{ texto: "três" }, { texto: "um" }])).toBe(
      "Questão: tese-1\n\nCaso de teste.\n\nQual a peça?\n\nA) três\nB) um",
    );
  });

  it("nível difícil: resposta digitada, sem alternativas", () => {
    const p: PerguntaPeca = { ...enunciado, id: "peca-2", formato: "peca", categorias: ["peca"], resposta: { peca: "x", fundamentos: [] } };
    expect(textoParaCopiar(p, 3, p.comando, [{ nome: "A" }], [])).toBe("Questão: peca-2\n\nCaso de teste.\n\nQual a peça?");
  });
});
