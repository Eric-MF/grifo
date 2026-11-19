import { describe, expect, it } from "vitest";
import { textoParaCopiar, textoResposta } from "@/quiz/copiar";
import type { Correcao } from "@/quiz/verificar";
import type { PerguntaObjetiva, PerguntaPeca, PerguntaTese } from "@/quiz/types";

const enunciado = { caso: "Caso de teste.", comando: "Qual a peça?", explicacao: "A tese principal, com o dispositivo.", fonte: "gerada" };

describe("resposta na cópia da questão", () => {
  it("objetiva: a letra correta e o texto dela", () => {
    const p: PerguntaObjetiva = {
      ...enunciado,
      id: "obj-1",
      formato: "objetiva",
      categorias: ["objetiva"],
      alternativas: { A: "Primeira", B: "Segunda", C: "Terceira", D: "Quarta" },
      correta: "C",
      dispositivos: [],
    };
    const res = { formato: "objetiva", acertou: false, escolhida: "A", correta: "C" } as Correcao;
    expect(textoResposta(p, res)).toBe("Resposta: C) Terceira");
  });

  it("peça: a peça e o fundamento, como aparecem no feedback", () => {
    const p: PerguntaPeca = { ...enunciado, id: "peca-1", formato: "peca", categorias: ["peca"], resposta: { peca: "x", fundamentos: [] } };
    const res = {
      formato: "peca",
      acertou: false,
      acertouPeca: true,
      acertouFundamento: false,
      pecaEsperada: "Recurso em Sentido Estrito",
      fundamentoEsperado: "art. 581, IV, do CPP",
    } as Correcao;
    expect(textoResposta(p, res)).toBe("Resposta: Recurso em Sentido Estrito — art. 581, IV, do CPP");
  });

  it("tese: a tese, o artigo e o padrão de respostas", () => {
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
    const res = {
      formato: "tese",
      acertou: true,
      acertouTese: true,
      acertouArtigo: true,
      teseEsperada: "Desclassificação para furto simples",
      artigoEsperado: "art. 155 do CP",
      respondida: { artigos: [] },
    } as Correcao;
    expect(textoResposta(p, res)).toBe(
      "Resposta: Desclassificação para furto simples — art. 155 do CP\n\nPadrão de respostas: A tese principal, com o dispositivo.",
    );
  });

  it("a resposta entra depois das alternativas, com uma linha em branco", () => {
    const p: PerguntaObjetiva = {
      ...enunciado,
      id: "obj-2",
      formato: "objetiva",
      categorias: ["objetiva"],
      alternativas: { A: "Primeira", B: "Segunda", C: "Terceira", D: "Quarta" },
      correta: "C",
      dispositivos: [],
    };
    expect(textoParaCopiar(p, 1, p.comando, [], [], "Resposta: C) Terceira")).toBe(
      "Questão: obj-2\n\nCaso de teste.\n\nQual a peça?\n\nA) Primeira\nB) Segunda\nC) Terceira\nD) Quarta\n\nResposta: C) Terceira",
    );
  });

  it("sem resposta, o texto não ganha a linha de resposta", () => {
    const p: PerguntaObjetiva = {
      ...enunciado,
      id: "obj-3",
      formato: "objetiva",
      categorias: ["objetiva"],
      alternativas: { A: "Primeira", B: "Segunda", C: "Terceira", D: "Quarta" },
      correta: "A",
      dispositivos: [],
    };
    expect(textoParaCopiar(p, 1, p.comando, [], [])).not.toContain("Resposta");
  });
});
