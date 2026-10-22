import { describe, expect, it } from "vitest";
import { corrigido, corrigirBlocos, ordinal, semTrema } from "../src/lib/leis/texto.ts";

describe("forma do texto: Redação original ou correções do Grifo", () => {
  it("corrige o ordinal e tira o trema por padrão", () => {
    expect(corrigido("Art. 1o Esta lei é freqüente, lingüiça.")).toBe("Art. 1º Esta lei é frequente, linguiça.");
    expect(corrigido("§ 2o e arts. 10-A")).toBe("§ 2º e arts. 10-A");
  });

  it("na redação original, nada muda", () => {
    expect(corrigido("Art. 1o freqüente", true)).toBe("Art. 1o freqüente");
  });

  it("o trema só sai depois de g e q, e a troca mantém o tamanho", () => {
    expect(semTrema("qüinqüênio Ünica")).toBe("quinquênio Ünica");
    expect(semTrema("freqüente").length).toBe("freqüente".length);
  });

  it("corrige os blocos sem mexer no original", () => {
    const blocos = [{ texto: "Art. 1o freqüente", rotulo: "Art. 1o" }, { texto: "sem rótulo" }];
    expect(corrigirBlocos(blocos)[0]).toEqual({ texto: "Art. 1º frequente", rotulo: "Art. 1º" });
    expect(corrigirBlocos(blocos)[1]).toEqual({ texto: "sem rótulo" });
    expect(blocos[0]!.texto).toBe("Art. 1o freqüente");
    expect(corrigirBlocos(blocos, true)).toBe(blocos);
  });
});

describe("ordinal: todo número colado a um \"o\" minúsculo é ordinal", () => {
  it("corrige o ordinal em listas, números soltos e datas", () => {
    expect(ordinal("dos §§ 1o e 2o do art. 383")).toBe("dos §§ 1º e 2º do art. 383");
    expect(ordinal("§§ 2o, 3o, 4o e 5o")).toBe("§§ 2º, 3º, 4º e 5º");
    expect(ordinal("entre o 15o (décimo quinto)")).toBe("entre o 15º (décimo quinto)");
    expect(ordinal("no dia 1o de janeiro")).toBe("no dia 1º de janeiro");
    expect(ordinal("1941; 120o da Independência")).toBe("1941; 120º da Independência");
  });

  it("aceita hífen depois do número e mantém o artigo e o caput", () => {
    expect(ordinal("§ 1o-A")).toBe("§ 1º-A");
    expect(ordinal("Art. 1o O processo")).toBe("Art. 1º O processo");
    expect(ordinal("Art. 1o, § 2o e arts. 10-A")).toBe("Art. 1º, § 2º e arts. 10-A");
  });

  it("não mexe em palavras, em números sem o e em letra colada ao número", () => {
    expect(ordinal("no")).toBe("no");
    expect(ordinal("do 2")).toBe("do 2");
    expect(ordinal("Lei no 5.869")).toBe("Lei no 5.869");
    expect(ordinal("R2o")).toBe("R2o");
    expect(ordinal("10ox")).toBe("10ox");
  });

  it("na redação original, nada muda", () => {
    expect(corrigido("§§ 1o e 2o", true)).toBe("§§ 1o e 2o");
  });

  it("a troca mantém o tamanho do texto", () => {
    const texto = "dos §§ 1o e 2o do art. 383; §§ 2o, 3o, 4o e 5o; Lei no 5.869; R2o; 10ox";
    expect(ordinal(texto).length).toBe(texto.length);
  });
});
