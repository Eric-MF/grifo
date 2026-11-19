import { describe, expect, it } from "vitest";
import { sistemaDaLei, sistemaDoLeitor, type Estado } from "../src/lib/leis/legendas.ts";

const vazio: Estado = { ativo: "essenciais", meus: [], porLei: {} };

describe("sistema de cores por lei", () => {
  it("sem escolha, a lei usa o padrão que recebe (o do sistema com grifos prontos dela)", () => {
    expect(sistemaDaLei(vazio, "cp", "geral").id).toBe("geral");
    expect(sistemaDaLei(vazio, "lei-10826", "essenciais").id).toBe("essenciais");
  });

  it("a escolha do usuário numa lei vale só nela", () => {
    const e: Estado = { ...vazio, porLei: { cp: "essenciais" } };
    expect(sistemaDaLei(e, "cp", "geral").id).toBe("essenciais");
    expect(sistemaDaLei(e, "cpp", "geral").id).toBe("geral");
  });

  it("um sistema apagado cai no padrão da lei", () => {
    const e: Estado = { ...vazio, porLei: { cp: "sumido" } };
    expect(sistemaDaLei(e, "cp", "geral").id).toBe("geral");
  });
});

describe("sistema com que a lei abre no leitor", () => {
  const prontos = [{ lei: "cp" }];

  it("sem escolha, a lei com grifos prontos abre em Essenciais, mesmo com outro ativo", () => {
    const e: Estado = { ...vazio, ativo: "geral" };
    expect(sistemaDoLeitor(e, "cp", prontos).id).toBe("essenciais");
  });

  it("sem escolha, a lei sem grifos prontos abre no sistema ativo", () => {
    const e: Estado = { ...vazio, ativo: "geral" };
    expect(sistemaDoLeitor(e, "lei-10826", prontos).id).toBe("geral");
  });

  it("a escolha do usuário na lei vence o padrão", () => {
    const e: Estado = { ...vazio, ativo: "essenciais", porLei: { cp: "geral" } };
    expect(sistemaDoLeitor(e, "cp", prontos).id).toBe("geral");
  });
});
