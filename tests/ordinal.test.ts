import { describe, expect, it } from "vitest";
import { ordinal } from "@/lib/leis/texto";

describe("ordinal: o no lugar do º", () => {
  it("troca em artigos e parágrafos", () => {
    expect(ordinal("Art. 1o São considerados hediondos")).toBe("Art. 1º São considerados hediondos");
    expect(ordinal("§ 2o Aplica-se")).toBe("§ 2º Aplica-se");
    expect(ordinal("arts. 12o e 13o")).toBe("arts. 12º e 13º");
  });

  it("não troca o O que começa o caput nem outras palavras", () => {
    expect(ordinal("Art. 1o O crime é hediondo.")).toBe("Art. 1º O crime é hediondo.");
    expect(ordinal("Art. 10. O juiz decide.")).toBe("Art. 10. O juiz decide.");
    expect(ordinal("Art. 5º O Estado.")).toBe("Art. 5º O Estado.");
    expect(ordinal("pelo Ministério Público, nos termos do art. 3o-A")).toBe("pelo Ministério Público, nos termos do art. 3º-A");
  });

  it("mantém o comprimento do texto (os índices das marcações continuam valendo)", () => {
    const original = "Art. 1o O crime, § 2o e Art. 3o.";
    expect(ordinal(original)).toHaveLength(original.length);
  });
});
