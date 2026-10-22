import { describe, expect, it } from "vitest";
import { diplomaDaAlteracao, trechos } from "@/lib/leis/referencias";

const linkDe = (t: ReturnType<typeof trechos>, texto: string) => t.find((x) => x.texto === texto)?.href;

// caput do art. 1º da 8.072, como vem no texto coletado: o diploma é o Código Penal
const caputLei8072 = "Art. 1o São considerados hediondos os seguintes crimes, todos tipificados no Decreto-Lei no 2.848, de 7 de dezembro de 1940 - Código Penal";

describe("art. N sem diploma numa lei que não tem o artigo", () => {
  it("é do Código Penal quando o caput que o contém (ou o do art. 1º) diz isso", () => {
    const t = trechos("homicídio (art. 121), quando praticado em grupo", "lei-8072", undefined, () => false, null, { caputPrimeiro: caputLei8072 });
    expect(linkDe(t, "art. 121")).toBe("/leis/cp/#art121");
  });

  it("continua sendo da própria lei quando ela tem o artigo", () => {
    const t = trechos("nos termos do art. 2º, caput", "lei-8072", undefined, () => true);
    expect(linkDe(t, "art. 2º")).toBe("#art2");
  });

  it("sem diploma identificado em nenhum passo, não há link: a referência fica marcada como não encontrada", () => {
    const t = trechos("o tutor nos termos do art. 37, caput", "lei-8069", undefined, () => false, null, { caputPrimeiro: "Art. 1º Esta Lei dispõe sobre a proteção integral." });
    const r = t.find((x) => x.texto === "art. 37");
    expect(r?.href).toBeUndefined();
    expect(r?.naoEncontrado).toBe(true);
  });

  it("procura no caput do próprio artigo antes do caput do art. 1º", () => {
    const t = trechos("o crime do art. 121, caput", "lei-x", undefined, () => false, null, {
      caput: "Art. 9º Aplica-se o disposto no art. 121 da Lei nº 6.368, de 21 de outubro de 1976.",
      caputPrimeiro: caputLei8072,
    });
    expect(linkDe(t, "art. 121")).toMatch(/^https:\/\/www\.planalto\.gov\.br\/ccivil_03\/leis\/l6368\.htm#art121$/);
  });

  it("procura no preâmbulo quando o caput do art. 1º não traz o diploma", () => {
    const t = trechos("o crime do art. 121, caput", "lei-x", undefined, () => false, null, {
      caputPrimeiro: "Art. 1º Esta Lei define crimes.",
      preambulo: "Dispõe sobre os crimes previstos no Decreto-Lei nº 2.848, de 7 de dezembro de 1940.",
    });
    expect(linkDe(t, "art. 121")).toBe("/leis/cp/#art121");
  });

  it("não se liga à própria lei, mesmo quando ela é citada no caput", () => {
    const t = trechos("o crime do art. 121, caput", "lei-8072", undefined, () => false, null, {
      caputPrimeiro: "Art. 1º Esta Lei, a Lei nº 8.072, de 25 de julho de 1990, define crimes.",
    });
    expect(t.find((x) => x.texto === "art. 121")?.naoEncontrado).toBe(true);
  });

  it("o rótulo de um dispositivo citado ('Art. 17-A.') não vira referência", () => {
    const t = trechos("“Art. 17-A. Fica criado o registro.”", "lei-x", undefined, () => false);
    expect(t.some((x) => x.href || x.naoEncontrado)).toBe(false);
  });

  it("dentro do próprio Código Penal, a referência fica no Código", () => {
    const t = trechos("o crime do art. 121, caput", "cp", undefined, () => true);
    expect(linkDe(t, "art. 121")).toBe("#art121");
  });
});

describe("artigo que altera outra lei", () => {
  const artigo = "Art. 10. O art. 35 da Lei nº 6.368, de 21 de outubro de 1976, passa a vigorar acrescido de parágrafo único, com a seguinte redação:";
  const paragrafo = "Parágrafo único. Os prazos procedimentais deste capítulo serão contados em dobro quando se tratar dos crimes previstos nos arts. 12, 13 e 14.";

  it("identifica a lei alterada", () => {
    expect(diplomaDaAlteracao(artigo)).toBe("lei-6368");
    expect(diplomaDaAlteracao("Art. 5º São crimes hediondos os previstos nesta Lei.")).toBeNull();
  });

  it("as referências sem diploma do parágrafo são da lei alterada, e vão para o Planalto dela", () => {
    const t = trechos(paragrafo, "lei-8072", undefined, () => true, "lei-6368");
    const link = t.find((x) => x.texto.includes("12"))?.href;
    expect(link).toMatch(/^https:\/\/www\.planalto\.gov\.br\/ccivil_03\/leis\/l6368\.htm#art12$/);
  });
});

describe("artigo de outra lei citado pela descrição, sem o número da lei", () => {
  it("'art. 2º da lei que institui o marco legal do combate ao crime organizado' é a Lei 12.850, não o art. 2º do Código Penal", () => {
    const t = trechos("previstas no art. 2º da lei que institui o marco legal do combate ao crime organizado", "cp", undefined, () => true);
    expect(linkDe(t, "art. 2º")).toBe("/leis/lei-12850/#art2");
  });
});

describe("diploma dito antes dos números, dentro do parêntese", () => {
  it("'(Constituição, arts. 86, 89, § 2º, e 100)' no CPP é a Constituição, não o próprio código", () => {
    const t = trechos("nos crimes de responsabilidade (Constituição, arts. 86, 89, § 2º, e 100);", "cpp", undefined, () => true);
    expect(t.find((x) => x.texto.includes("86"))?.href).toBe("/leis/cf/#art86");
    expect(t.find((x) => x.texto.includes("100"))?.href).toBe("/leis/cf/#art100");
  });

  it("'(Código de Processo Penal, art.10, § 1°)' na Lei 9.296 é o CPP", () => {
    const t = trechos("ou na conclusão do processo ao juiz (Código de Processo Penal, art.10, § 1°) ou outro", "lei-9296", undefined, () => true);
    expect(t.find((x) => x.texto.includes("10"))?.href).toBe("/leis/cpp/#art10");
  });
});
