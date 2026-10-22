import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { dividirEmPartes, LIMITE_PARTE, type Parte } from "../src/lib/leis/partes.ts";

type B = { texto: string; superada?: boolean; tipo?: string };
const bytes = (v: unknown) => new TextEncoder().encode(JSON.stringify(v)).length;
const grande = (texto: string) => ({ texto, tipo: "artigo", corpo: "x".repeat(100) });
const ler = (f: string): { blocos: B[] } => JSON.parse(readFileSync(join(process.cwd(), "content/leis-texto", f), "utf8"));

/** Cobre todos os blocos, em ordem, sem buracos nem sobreposição. */
function cobre(partes: Parte[], total: number) {
  expect(partes[0].de).toBe(0);
  expect(partes[partes.length - 1].ate).toBe(total);
  for (let i = 1; i < partes.length; i++) expect(partes[i].de).toBe(partes[i - 1].ate);
  for (const p of partes) expect(p.ate).toBeGreaterThan(p.de);
}

describe("dividirEmPartes", () => {
  it("lei pequena não é dividida", () => {
    const blocos = [{ texto: "LIVRO I" }, { texto: "Art. 1o" }, { texto: "LIVRO II" }];
    expect(dividirEmPartes(blocos)).toEqual([]);
  });

  it("lei grande com LIVROs divide em cada LIVRO", () => {
    const blocos: B[] = [
      { texto: "PREÂMBULO" },
      grande("LIVRO I"),
      grande("Art. 1o"),
      grande("LIVRO II"),
      grande("Art. 2o"),
      grande("LIVRO III"),
      grande("Art. 3o"),
    ];
    const partes = dividirEmPartes(blocos, 300);
    expect(partes.map((p) => p.rotulo)).toEqual(["LIVRO I", "LIVRO II", "LIVRO III"]);
    expect(partes).toEqual([
      { de: 0, ate: 3, rotulo: "LIVRO I" },
      { de: 3, ate: 5, rotulo: "LIVRO II" },
      { de: 5, ate: 7, rotulo: "LIVRO III" },
    ]);
    cobre(partes, blocos.length);
  });

  it("sem LIVRO divide em cada TÍTULO", () => {
    const blocos: B[] = [
      grande("TÍTULO I"),
      grande("Art. 1o"),
      grande("TÍTULO II"),
      grande("Art. 2o"),
      grande("TITULO III"),
      grande("Art. 3o"),
    ];
    const partes = dividirEmPartes(blocos, 300);
    expect(partes.map((p) => p.rotulo)).toEqual(["TÍTULO I", "TÍTULO II", "TITULO III"]);
    cobre(partes, blocos.length);
  });

  it("LIVRO tem prioridade sobre TÍTULO", () => {
    const blocos: B[] = [grande("LIVRO I"), grande("TÍTULO I"), grande("LIVRO II"), grande("TÍTULO I")];
    expect(dividirEmPartes(blocos, 100).map((p) => p.rotulo)).toEqual(["LIVRO I", "LIVRO II"]);
  });

  it("o Ato das Disposições Constitucionais Transitórias é sempre um corte", () => {
    const blocos: B[] = [
      grande("TÍTULO I"),
      grande("Art. 1o"),
      grande("TÍTULO II"),
      grande("Art. 2o"),
      grande("ATO DAS DISPOSIÇÕES CONSTITUCIONAIS TRANSITÓRIAS"),
      grande("Art. 1o do ato"),
    ];
    const partes = dividirEmPartes(blocos, 300);
    expect(partes).toEqual([
      { de: 0, ate: 2, rotulo: "TÍTULO I" },
      { de: 2, ate: 4, rotulo: "TÍTULO II" },
      { de: 4, ate: 6, rotulo: "ATO DAS DISPOSIÇÕES CONSTITUCIONAIS TRANSITÓRIAS" },
    ]);
    cobre(partes, blocos.length);
  });

  it("LIVRO superado não vira corte", () => {
    const blocos: B[] = [
      grande("LIVRO I"),
      grande("Art. 1o"),
      { ...grande("LIVRO II"), superada: true },
      grande("Art. 2o"),
      grande("LIVRO III"),
      grande("Art. 3o"),
    ];
    const partes = dividirEmPartes(blocos, 300);
    expect(partes).toEqual([
      { de: 0, ate: 4, rotulo: "LIVRO I" },
      { de: 4, ate: 6, rotulo: "LIVRO III" },
    ]);
    cobre(partes, blocos.length);
  });

  it("menos de duas partes resultantes não divide", () => {
    const blocos: B[] = [grande("LIVRO I"), grande("Art. 1o"), grande("Art. 2o")];
    expect(dividirEmPartes(blocos, 100)).toEqual([]);
  });

  it("sem LIVRO nem TÍTULO não divide", () => {
    const blocos: B[] = [grande("Art. 1o"), grande("Art. 2o"), grande("Art. 3o")];
    expect(dividirEmPartes(blocos, 100)).toEqual([]);
  });

  it("o limite padrão é 1 MB", () => {
    expect(LIMITE_PARTE).toBe(1024 * 1024);
    expect(dividirEmPartes([{ texto: "LIVRO I" }, { texto: "LIVRO II" }])).toEqual([]);
  });

  it("CF: sem LIVRO, divide em TÍTULOs e cobre todos os blocos", () => {
    const { blocos } = ler("cf.json");
    expect(bytes(blocos)).toBeGreaterThan(LIMITE_PARTE);
    expect(blocos.some((b) => /^LIVRO\b/.test(b.texto))).toBe(false);
    const partes = dividirEmPartes(blocos);
    expect(partes.length).toBeGreaterThanOrEqual(9);
    expect(partes.every((p) => /^T[ÍI]TULO\b|^ATO DAS/.test(p.rotulo))).toBe(true);
    cobre(partes, blocos.length);
  });

  it("CPP: tamanho conferido, e só divide se passar de 1 MB", () => {
    const { blocos } = ler("cpp.json");
    const partes = dividirEmPartes(blocos);
    if (bytes(blocos) <= LIMITE_PARTE) expect(partes).toEqual([]);
    else {
      expect(partes.length).toBeGreaterThanOrEqual(2);
      cobre(partes, blocos.length);
    }
  });
});
