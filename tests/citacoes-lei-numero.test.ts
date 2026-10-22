import { describe, expect, it } from "vitest";
import { citacoesEm } from "../src/lib/leis/planalto.ts";

describe("citações de artigos de leis fora do leitor", () => {
  it("liga 'arts. 227 a 229 da Lei no 5.869, de 1973' ao Planalto da lei", () => {
    const [c] = citacoesEm("na forma estabelecida nos arts. 227 a 229 da Lei no 5.869, de 11 de janeiro de 1973 - Código de Processo Civil.");
    expect(c.texto).toBe("arts. 227 a 229 da Lei no 5.869");
    expect(c.planalto).toBe("https://www.planalto.gov.br/ccivil_03/leis/l5869.htm#art227");
    expect(c.url).toBe(c.planalto);
  });

  it("continua ligando a forma com barra", () => {
    const [c] = citacoesEm("art. 10 da Lei 9.099/1995");
    expect(c.planalto).toBe("https://www.planalto.gov.br/ccivil_03/leis/l9099.htm#art10");
  });
});
