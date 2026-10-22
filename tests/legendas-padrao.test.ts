import { describe, expect, it } from "vitest";
import { sistemaDaLei, type Estado } from "../src/lib/leis/legendas.ts";

const vazio: Estado = { ativo: "materias", meus: [], porLei: {} };

describe("sistema de cores por lei", () => {
  it("sem escolha, a lei usa o padrão que recebe (o do sistema com grifos prontos dela)", () => {
    expect(sistemaDaLei(vazio, "cp", "teses").id).toBe("teses");
    expect(sistemaDaLei(vazio, "lei-10826", "materias").id).toBe("materias");
  });

  it("a escolha do usuário numa lei vale só nela", () => {
    const e: Estado = { ...vazio, porLei: { cp: "materias" } };
    expect(sistemaDaLei(e, "cp", "teses").id).toBe("materias");
    expect(sistemaDaLei(e, "cpp", "teses").id).toBe("teses");
  });

  it("um sistema apagado cai no padrão da lei", () => {
    const e: Estado = { ...vazio, porLei: { cp: "sumido" } };
    expect(sistemaDaLei(e, "cp", "teses").id).toBe("teses");
  });
});
