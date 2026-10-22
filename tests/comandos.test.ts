import { describe, expect, it } from "vitest";
import { COMANDOS, comandoExato, comandosPara, ehComando, normalizarComando } from "../src/lib/leis/comandos.ts";

const LEIS = { sumula: false };
const SUMULAS = { sumula: true };

describe("normalizarComando", () => {
  it("tira acento, maiúscula, hífen e espaço", () => {
    expect(normalizarComando("Tela-Cheia")).toBe("telacheia");
    expect(normalizarComando("TELA cheia")).toBe("telacheia");
    expect(normalizarComando("Sépia")).toBe("sepia");
  });
});

describe("ehComando", () => {
  it("reconhece o começo com barra, com espaços antes ou não", () => {
    expect(ehComando("/x")).toBe(true);
    expect(ehComando("  /x")).toBe(true);
    expect(ehComando("121")).toBe(false);
    expect(ehComando("absolvição")).toBe(false);
  });
});

describe("comandoExato", () => {
  it("acha o comando pelo nome, com qualquer grafia", () => {
    expect(comandoExato("/TelaCheia", LEIS)?.id).toBe("telacheia");
    expect(comandoExato("/tela cheia", LEIS)?.id).toBe("telacheia");
    expect(comandoExato("/ESCURO", LEIS)?.id).toBe("escuro");
  });

  it("acha pelo apelido exato", () => {
    expect(comandoExato("/claro", LEIS)?.id).toBe("papel");
  });

  it("respeita o filtro de lei e súmula", () => {
    expect(comandoExato("/informacoes", LEIS)).toBeNull();
    expect(comandoExato("/informacoes", SUMULAS)?.id).toBe("informacoes");
    expect(comandoExato("/original", SUMULAS)).toBeNull();
  });
});

describe("comandosPara", () => {
  it("só a barra mostra todos os comandos da lei, sem os de súmula", () => {
    const ids = comandosPara("/", LEIS).map((c) => c.id);
    for (const c of COMANDOS.filter((c) => c.soLeis)) expect(ids).toContain(c.id);
    expect(ids).not.toContain("informacoes");
  });

  it("prefixo: o nome que começa pelo texto vem primeiro", () => {
    expect(comandosPara("/es", LEIS)[0]?.id).toBe("escuro");
  });

  it("prefixo ambíguo: nome que começa antes de apelido e na ordem da lista", () => {
    const ids = comandosPara("/in", LEIS).map((c) => c.id);
    // indice e inicio começam por "in" (nome); remissivo só pelo apelido "indiceremissivo"
    expect(ids.slice(0, 2)).toEqual(["indice", "inicio"]);
    expect(ids.indexOf("remissivo")).toBeGreaterThan(ids.indexOf("inicio"));
  });

  it("sem número ou texto de comando, não há resultado", () => {
    expect(comandosPara("121", LEIS)).toEqual([]);
  });
});

describe("COMANDOS", () => {
  const textos = COMANDOS.flatMap((c) => [c.nome, ...c.apelidos]);

  it("todo nome e apelido já está normalizado", () => {
    for (const t of textos) expect(normalizarComando(t)).toBe(t);
  });

  it("nenhum nome ou apelido se repete", () => {
    expect(new Set(textos).size).toBe(textos.length);
  });
});
