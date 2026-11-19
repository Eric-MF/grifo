import { describe, expect, it } from "vitest";
import { ordemNoRemissivo, tituloTemTermo } from "../src/lib/leis/remissivo-busca.ts";

describe("ordemNoRemissivo", () => {
  it("o título que é o termo vem primeiro, no singular ou no plural", () => {
    expect(ordemNoRemissivo("prova(s)", "prova")).toBe(0);
    expect(ordemNoRemissivo("prova(s)", "provas")).toBe(0);
    expect(ordemNoRemissivo("provas", "prova")).toBe(0);
    expect(ordemNoRemissivo("prova", "provas")).toBe(0);
  });
  it("depois o que começa pelo termo, e por fim o que só o contém", () => {
    expect(ordemNoRemissivo("prova ilicita", "prova")).toBe(1);
    expect(ordemNoRemissivo("livre apreciacao da prova", "prova")).toBe(2);
  });
  it("o plural entre parênteses conta na busca", () => {
    expect(tituloTemTermo("prova(s)", "provas")).toBe(true);
    expect(tituloTemTermo("acusado (reu)", "acusados")).toBe(false);
  });
});
