import { describe, expect, it } from "vitest";
import { CONTATO, linkContato } from "@/config/site";

describe("contato por e-mail", () => {
  it("os endereços são os da casa, com a marcação do Gmail", () => {
    expect(CONTATO.sugestao).toBe("contatos.grifo+sugestoes@gmail.com");
    expect(CONTATO.erro).toBe("contatos.grifo+erro@gmail.com");
  });

  it("o link de erro vai para o endereço de erro, sem corpo quando não há questão", () => {
    const url = new URL(linkContato("erro"));
    expect(url.protocol).toBe("mailto:");
    expect(url.pathname).toBe(CONTATO.erro);
    expect(url.searchParams.get("subject")).toBe("Grifo: erro");
    expect(url.searchParams.has("body")).toBe(false);
  });

  it("o link de sugestão leva o id da questão no corpo", () => {
    const url = new URL(linkContato("sugestao", "peca-123"));
    expect(url.pathname).toBe(CONTATO.sugestao);
    expect(url.searchParams.get("subject")).toBe("Grifo: sugestão — Questão: peca-123");
    expect(url.searchParams.get("body")).toBe("Questão: peca-123\n\n");
  });
});
