import { describe, expect, it } from "vitest";
import { trechos } from "../src/lib/leis/referencias.ts";

describe("referências de artigos de lei revogada citada em outra lei", () => {
  it("liga 'arts. 227 a 229 da Lei no 5.869' ao Planalto", () => {
    const t = "na forma estabelecida nos arts. 227 a 229 da Lei no 5.869, de 11 de janeiro de 1973 - Código de Processo Civil.";
    const links = trechos(t, "cpp").filter((x) => x.href);
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]!.href).toContain("l5869.htm");
  });
});
