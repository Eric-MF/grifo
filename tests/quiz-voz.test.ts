import { describe, expect, it } from "vitest";
import { dicaDaVoz, comandoDeLeitura, interpretarResposta, numerosEmAlgarismos, separarArtigo, type AcaoVoz, type ContextoVoz, type Reconhecedores } from "../src/quiz/voz.ts";
import { artigoFalado, pecasFaladas } from "../src/quiz/verificar.ts";

const R: Reconhecedores = { peca: pecasFaladas, artigo: artigoFalado };

const ALT: ContextoVoz = { tipo: "alternativas", textos: ["Revisão Criminal", "Apelação", "Agravo em Execução", "Habeas Corpus"], pecas: true };
const OBJ: ContextoVoz = {
  tipo: "alternativas",
  textos: [
    "O réu deve ser absolvido por legítima defesa.",
    "O réu deve ser condenado por homicídio qualificado.",
    "Cabe a desclassificação para lesão corporal.",
    "Ocorreu a prescrição da pretensão punitiva.",
  ],
};
const PECA: ContextoVoz = { tipo: "peca", peca: "", fundamento: "" };
const TESE2: ContextoVoz = { tipo: "tese", comArtigo: false, tese: "", artigo: "" };
const TESE3: ContextoVoz = { tipo: "tese", comArtigo: true, tese: "", artigo: "" };
const RESP: ContextoVoz = { tipo: "respondida" };

/** A ação de uma fala só, no contexto dado. */
const ouvir = (fala: string, ctx: ContextoVoz, rec?: Reconhecedores): AcaoVoz | null => interpretarResposta([fala], ctx, rec);

describe("interpretarResposta: alternativas pela letra, ordem ou número", () => {
  it.each([
    ["letra b", 1],
    ["Letra C", 2],
    ["alternativa dê", 3],
    ["dê", 3],
    ["bê", 1],
    ["é a letra a", 0],
    ["a segunda", 1],
    ["opção 3", 2],
  ])("“%s” escolhe a alternativa %i", (fala, indice) => {
    expect(ouvir(fala, ALT, R)).toEqual({ tipo: "alternativa", indice });
  });

  it("uma letra além da lista não escolhe nada", () => {
    expect(ouvir("letra e", ALT, R)).toBeNull();
  });

  it("“hum”, “próxima” e frases sem alternativa não escolhem nada", () => {
    expect(ouvir("hum", ALT, R)).toBeNull();
    expect(ouvir("próxima", ALT, R)).toBeNull();
  });

  it("“desligar o microfone” desliga, em qualquer contexto", () => {
    expect(ouvir("desligar o microfone", ALT, R)).toEqual({ tipo: "desligar" });
  });
});

describe("interpretarResposta: alternativas pelo nome da peça", () => {
  it.each([
    ["agravo em execução", 2],
    ["habeas corpus", 3],
    ["HC", 3],
    ["apelação", 1],
    ["acho que é apelação", 1],
  ])("“%s” escolhe a alternativa %i", (fala, indice) => {
    expect(ouvir(fala, ALT, R)).toEqual({ tipo: "alternativa", indice });
  });
});

describe("interpretarResposta: alternativas pelo texto da resposta", () => {
  it.each([
    ["prescrição da pretensão punitiva", 3],
    ["desclassificação para lesão corporal", 2],
    ["legítima defesa", 0],
  ])("“%s” escolhe a alternativa %i", (fala, indice) => {
    expect(ouvir(fala, OBJ)).toEqual({ tipo: "alternativa", indice });
  });

  it("um trecho que serve a duas alternativas é ambíguo e não escolhe", () => {
    expect(ouvir("o réu deve ser", OBJ)).toBeNull();
  });
});

describe("interpretarResposta: peça e fundamento (digitar)", () => {
  it("peça e artigo ditos juntos, sem enviar", () => {
    expect(ouvir("apelação com fundamento no artigo 593 inciso 3 alínea d do CPP", PECA, R)).toEqual({
      tipo: "preencher",
      campos: { fundamento: "Art. 593, inciso III, alínea d — Código de Processo Penal", peca: "Apelação" },
      enviar: false,
    });
  });

  it("“responder” no fim preenche e envia", () => {
    expect(ouvir("Apelação, artigo 593, III, d, do Código de Processo Penal. Responder", PECA, R)).toEqual({
      tipo: "preencher",
      campos: { fundamento: "Art. 593, inciso III, alínea d — Código de Processo Penal", peca: "Apelação" },
      enviar: true,
    });
  });

  it("“a peça é … com base no artigo …”, com o número por extenso", () => {
    expect(ouvir("a peça é recurso em sentido estrito com base no artigo 581 inciso quarto do CPP", PECA, R)).toEqual({
      tipo: "preencher",
      campos: { fundamento: "Art. 581, inciso IV — Código de Processo Penal", peca: "Recurso em Sentido Estrito" },
      enviar: false,
    });
  });

  it("só o artigo, com o número por extenso", () => {
    expect(ouvir("artigo quinhentos e oitenta e um inciso quatro do CPP", PECA, R)).toEqual({
      tipo: "preencher",
      campos: { fundamento: "Art. 581, inciso IV — Código de Processo Penal" },
      enviar: false,
    });
  });

  it("“Peça:” preenche só a peça, pelo nome da peça", () => {
    expect(ouvir("Peça: habeas corpus", PECA, R)).toEqual({ tipo: "preencher", campos: { peca: "Habeas Corpus" }, enviar: false });
  });

  it("“fundamento” preenche só o fundamento", () => {
    expect(ouvir("fundamento artigo 648 inciso 1 do CPP", PECA, R)).toEqual({
      tipo: "preencher",
      campos: { fundamento: "Art. 648, inciso I — Código de Processo Penal" },
      enviar: false,
    });
  });

  it("começando por número, tudo é o artigo", () => {
    expect(ouvir("593 inciso III do CPP", PECA, R)).toEqual({
      tipo: "preencher",
      campos: { fundamento: "Art. 593, inciso III — Código de Processo Penal" },
      enviar: false,
    });
  });

  it("“responder” envia; “apagar” limpa; “apagar o fundamento” limpa só o fundamento", () => {
    expect(ouvir("responder", PECA, R)).toEqual({ tipo: "enviar" });
    expect(ouvir("apagar o fundamento", PECA, R)).toEqual({ tipo: "apagar", campo: "fundamento" });
    expect(ouvir("apagar", PECA, R)).toEqual({ tipo: "apagar" });
  });

  it("“próxima” antes de responder não vira resposta", () => {
    expect(ouvir("próxima", PECA, R)).toBeNull();
  });

  it("“hum deixa eu ver” e “recurso” (de várias peças) não preenchem nada", () => {
    expect(ouvir("hum deixa eu ver", PECA, R)).toBeNull();
    expect(ouvir("recurso", PECA, R)).toBeNull();
  });

  it("“apelação ou memoriais” preenche a primeira peça reconhecida", () => {
    expect(ouvir("apelação ou memoriais", PECA, R)).toEqual({ tipo: "preencher", campos: { peca: "Apelação" }, enviar: false });
  });

  it("uma peça escrita de um jeito aproximado é reconhecida: “Memorias” e “Resposta Acusação”", () => {
    expect(ouvir("Memorias", PECA, R)).toEqual({ tipo: "preencher", campos: { peca: "Memoriais" }, enviar: false });
    expect(ouvir("Resposta Acusação", PECA, R)).toEqual({ tipo: "preencher", campos: { peca: "Resposta à Acusação" }, enviar: false });
  });

  it("“artigo 403 parágrafo 3º do CPP” preenche só o fundamento", () => {
    expect(ouvir("artigo 403 parágrafo 3º do CPP", PECA, R)).toEqual({
      tipo: "preencher",
      campos: { fundamento: "Art. 403, § 3º — Código de Processo Penal" },
      enviar: false,
    });
  });

  it("sem o reconhecedor, nenhuma peça nem artigo é reconhecido", () => {
    expect(interpretarResposta(["apelação artigo 593 do CPP"], PECA)).toBeNull();
  });
});

describe("interpretarResposta: tese no médio (só o ponto central)", () => {
  it("o ponto central, sem enviar", () => {
    expect(ouvir("desclassificação para furto simples", TESE2)).toEqual({
      tipo: "preencher",
      campos: { tese: "desclassificação para furto simples" },
      enviar: false,
    });
  });

  it("“a tese é … responder” preenche e envia", () => {
    expect(ouvir("a tese é legítima defesa responder", TESE2)).toEqual({
      tipo: "preencher",
      campos: { tese: "legítima defesa" },
      enviar: true,
    });
  });

  it("“o artigo …” não preenche artigo, porque o médio não tem esse campo", () => {
    const acao = ouvir("o artigo 25", TESE2);
    expect(acao?.tipo === "preencher" ? acao.campos.artigo : undefined).toBeUndefined();
  });
});

describe("interpretarResposta: tese no difícil (ponto central e artigo)", () => {
  it("“legítima defesa artigo 25 do CP responder”: o ponto central e o artigo, e envia", () => {
    expect(ouvir("legítima defesa artigo 25 do CP responder", TESE3, R)).toEqual({
      tipo: "preencher",
      campos: { artigo: "Art. 25 — Código Penal", tese: "legítima defesa" },
      enviar: true,
    });
  });

  it("só o ponto central, sem artigo", () => {
    expect(ouvir("desclassificação para furto simples", TESE3, R)).toEqual({
      tipo: "preencher",
      campos: { tese: "desclassificação para furto simples" },
      enviar: false,
    });
  });

  it("só o artigo, pelo nome da lei por extenso", () => {
    expect(ouvir("artigo 155 do código penal", TESE3, R)).toEqual({
      tipo: "preencher",
      campos: { artigo: "Art. 155 — Código Penal" },
      enviar: false,
    });
  });

  it("o parágrafo por extenso vira algarismo, e o artigo é o reconhecido", () => {
    expect(ouvir("artigo 121 parágrafo terceiro do CP", TESE3, R)).toEqual({
      tipo: "preencher",
      campos: { artigo: "Art. 121, § 3º — Código Penal" },
      enviar: false,
    });
  });

  it("“hum” não preenche nada", () => {
    expect(ouvir("hum", TESE3, R)).toBeNull();
  });
});

describe("interpretarResposta: correção (respondida)", () => {
  it.each(["próxima pergunta", "seguinte"])("“%s” segue para a próxima", (fala) => {
    expect(ouvir(fala, RESP)).toEqual({ tipo: "proxima" });
  });

  it("uma letra depois da correção não escolhe nada", () => {
    expect(ouvir("letra b", RESP)).toBeNull();
  });
});

describe("interpretarResposta: falas em ordem de reconhecimento", () => {
  it("a primeira alternativa que dá uma ação vale", () => {
    expect(interpretarResposta(["hum", "letra c"], ALT, R)).toEqual({ tipo: "alternativa", indice: 2 });
  });
});

describe("numerosEmAlgarismos", () => {
  it("troca os números por extenso, mantendo o resto", () => {
    expect(numerosEmAlgarismos("artigo cento e vinte e um, parágrafo segundo, inciso quatro do CP")).toBe(
      "artigo 121, parágrafo 2, inciso 4 do CP",
    );
  });

  it("deixa como está o que já é algarismo", () => {
    expect(numerosEmAlgarismos("artigo 593 do CPP")).toBe("artigo 593 do CPP");
  });
});

describe("separarArtigo", () => {
  it("corta a peça ou a tese do artigo", () => {
    expect(separarArtigo("Resposta à Acusação nos termos do art. 396-A do CPP")).toEqual({
      antes: "Resposta à Acusação",
      artigo: "art. 396-A do CPP",
    });
  });

  it("sem artigo, devolve tudo como antes", () => {
    expect(separarArtigo("legítima defesa")).toEqual({ antes: "legítima defesa", artigo: null });
  });
});

describe("comandoDeLeitura: pedir os artigos da correção", () => {
  it.each([["ler os artigos"], ["ler o artigo"]])("“%s” lê os artigos", (fala) => {
    expect(comandoDeLeitura([fala])).toEqual("artigos");
  });
});

describe("dicaDaVoz", () => {
  it("cada tela tem a sua dica", () => {
    expect(dicaDaVoz(RESP)).toContain("próxima");
    expect(dicaDaVoz(ALT)).toContain("nome da peça");
    expect(dicaDaVoz(PECA)).toContain("responder");
    expect(dicaDaVoz(TESE3)).toContain("artigo");
  });
});
