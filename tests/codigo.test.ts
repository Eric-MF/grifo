import { describe, expect, it } from "vitest";
import { digitoVerificador, gerarCodigo, gerarCodigoV2ParaTeste, verificarCodigo, type DadosSimulado } from "../src/lib/codigo/codigo.ts";

const base: DadosSimulado = {
  tipo: "simulado", exame: 38, variante: 0, atualizado: false, total: 7.35, peca: 3.9,
  modo: "auto", data: new Date(Date.UTC(2026, 8, 27)), duracaoMin: 212, impressao: 0xbeef,
};

describe("código de verificação", () => {
  it("ida e volta", async () => {
    const c = await gerarCodigo(base);
    expect(c).toMatch(/^[0-9A-Z]{4}(-[0-9A-Z]{1,4})+$/);
    const v = await verificarCodigo(c);
    expect(v).toMatchObject({ ok: true, dados: { ...base } });
  });
  it("aceita minúsculas, espaços e sem hífens", async () => {
    const c = await gerarCodigo(base);
    expect((await verificarCodigo(` ${c.replace(/-/g, " ").toLowerCase()} `)).ok).toBe(true);
  });
  it("jogo: ida e volta", async () => {
    const d = { tipo: "jogo" as const, jogo: 1, pontos: 12345, nivel: 3, estilo: 5, acertos: 17, perguntas: 20, data: new Date(Date.UTC(2026, 0, 2)), impressao: 1500 };
    expect(await verificarCodigo(await gerarCodigo(d))).toMatchObject({ ok: true, dados: d });
  });
  it("jogo com categorias (v3): ida e volta", async () => {
    const d = { tipo: "jogo" as const, jogo: 1, pontos: 9876, nivel: 2, estilo: 3, categorias: 0b1011, acertos: 9, perguntas: 12, data: new Date(Date.UTC(2026, 9, 10)), impressao: 100 };
    expect(await verificarCodigo(await gerarCodigo(d))).toMatchObject({ ok: true, dados: d });
  });
  it("v3: estilo até 127 e pontos até 131.071", async () => {
    const d = { tipo: "jogo" as const, jogo: 1, pontos: 131071, nivel: 3, estilo: 100, categorias: 0b0110, acertos: 30, perguntas: 31, data: new Date(Date.UTC(2026, 10, 1)), impressao: 77 };
    expect(await verificarCodigo(await gerarCodigo(d))).toMatchObject({ ok: true, dados: d });
    const max = { ...d, estilo: 127 };
    expect(await verificarCodigo(await gerarCodigo(max))).toMatchObject({ ok: true, dados: max });
  });
  it("código v2 antigo continua válido", async () => {
    const d = { tipo: "jogo" as const, jogo: 1, pontos: 500000, nivel: 2, estilo: 9, categorias: 0b1011, acertos: 9, perguntas: 12, data: new Date(Date.UTC(2026, 9, 10)), impressao: 100 };
    expect(await verificarCodigo(await gerarCodigoV2ParaTeste(d))).toMatchObject({ ok: true, dados: d });
  });
  it("código de jogo v1 continua válido e sem categorias", async () => {
    const d = { tipo: "jogo" as const, jogo: 1, pontos: 50, nivel: 1, estilo: 0, acertos: 1, perguntas: 1, data: new Date(Date.UTC(2025, 5, 1)), impressao: 2000 };
    const r = await verificarCodigo(await gerarCodigo(d));
    expect(r.ok && r.dados.tipo === "jogo" && r.dados.categorias).toBe(undefined);
  });
  it("troca de um caractere quebra o dígito verificador", async () => {
    const c = (await gerarCodigo(base)).replace(/-/g, "");
    for (let i = 0; i < c.length - 1; i++) {
      const alt = c[i] === "7" ? "8" : "7";
      const mut = c.slice(0, i) + alt + c.slice(i + 1);
      expect((await verificarCodigo(mut)).ok, `pos ${i}`).toBe(false);
    }
  });
  it("transposição de vizinhos é detectada", async () => {
    const c = (await gerarCodigo(base)).replace(/-/g, "");
    for (let i = 0; i < c.length - 2; i++) {
      if (c[i] === c[i + 1]) continue;
      const mut = c.slice(0, i) + c[i + 1] + c[i] + c.slice(i + 2);
      expect((await verificarCodigo(mut)).ok, `pos ${i}`).toBe(false);
    }
  });
  it("nota alterada com dígito recalculado falha na assinatura", async () => {
    const outro = (await gerarCodigo({ ...base, total: 9.9 })).replace(/-/g, "");
    const orig = (await gerarCodigo(base)).replace(/-/g, "");
    // cola a carga da nota 9,9 com o MAC do original e recalcula o dígito
    const corpo = outro.slice(0, 16) + orig.slice(16, -1);
    const forjado = corpo + digitoVerificador(corpo);
    expect(await verificarCodigo(forjado)).toMatchObject({ ok: false, motivo: "assinatura" });
  });
});

import { createHash, createHmac } from "node:crypto";
import { hmacSha256, sha256 } from "../src/lib/codigo/sha256.ts";
describe("sha256 puro", () => {
  it.each(["", "abc", "a".repeat(55), "a".repeat(56), "a".repeat(64), "Grifo çãõ ✓ ".repeat(40)])("confere com node:crypto (%#)", (s) => {
    const buf = new TextEncoder().encode(s);
    expect(Buffer.from(sha256(buf)).toString("hex")).toBe(createHash("sha256").update(buf).digest("hex"));
    expect(Buffer.from(hmacSha256(new TextEncoder().encode("chave"), buf)).toString("hex")).toBe(createHmac("sha256", "chave").update(buf).digest("hex"));
  });
});
