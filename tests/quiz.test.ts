import { describe, expect, it, vi } from "vitest";

// O quiz usa os JSON gerados; o cliente de correção lê leis/peças de lá.
vi.mock("@/lib/storage", () => ({ lerJSON: (_: string, d: unknown) => d, gravarJSON: () => true }));

const { GERADORES } = await import("../src/quiz/geradores/index.ts");
const { gerarPergunta } = await import("../src/quiz/banco.ts");
const { corrigirResposta, nomePeca } = await import("../src/quiz/verificar.ts");
const { contextoCorrecao } = await import("../src/lib/correcao/cliente.ts");
const { parseDispositivo } = await import("../src/lib/correcao/citacoes.ts");

describe.each(GERADORES.map((g) => g.id))("gerador %s", (id) => {
  const perguntas = Array.from({ length: 30 }, (_, s) => gerarPergunta(id, s * 7919 + 1));

  it("gera casos variados", () => {
    expect(new Set(perguntas.map((p) => p.caso)).size).toBeGreaterThan(5);
  });
  it("peça existe no catálogo e fundamentos são reconhecidos", () => {
    const ctx = contextoCorrecao();
    for (const p of perguntas) {
      expect(ctx.pecas[p.resposta.peca], p.resposta.peca).toBeTruthy();
      for (const f of p.resposta.fundamentos) {
        const c = parseDispositivo(f, ctx.lex);
        expect(c, f).toBeTruthy();
        if (c?.tipo === "art") expect(c.diploma, f).toBeTruthy();
      }
      for (const d of p.distratores ?? []) expect(ctx.pecas[d], d).toBeTruthy();
    }
  });
  it("está completo: sem TODO e com distratores para o nível fácil", () => {
    for (const p of perguntas) {
      expect(JSON.stringify(p), "texto com TODO").not.toMatch(/\bTODO\b/);
      expect(p.distratores?.length ?? 0, "distratores").toBeGreaterThanOrEqual(2);
    }
  });
  it("a resposta esperada, digitada, é aceita no nível difícil", () => {
    for (const p of perguntas.slice(0, 5)) {
      const r = corrigirResposta(p, 3, { peca: nomePeca(p.resposta.peca), fundamento: p.resposta.fundamentos[0] });
      expect(r.acertou, `${p.id} ${p.resposta.fundamentos[0]}`).toBe(true);
    }
  });
});

describe("corrigirResposta", () => {
  const p = gerarPergunta("rese", 12345);
  it("médio aceita só o artigo; difícil exige o inciso", () => {
    expect(corrigirResposta(p, 2, { peca: "RESE", fundamento: "art. 581 do CPP" }).acertou).toBe(true);
    expect(corrigirResposta(p, 3, { peca: "RESE", fundamento: "art. 581 do CPP" }).acertou).toBe(false);
  });
  it("peça errada não passa", () => {
    expect(corrigirResposta(p, 2, { peca: "apelação", fundamento: "art. 581 do CPP" }).acertou).toBe(false);
  });
  it("contrarrazões não é aceita como apelação", () => {
    const a = gerarPergunta("apelacao", 1);
    expect(corrigirResposta(a, 2, { peca: "contrarrazões de apelação", fundamento: "art. 593 CPP" }).acertouPeca).toBe(false);
    expect(corrigirResposta(a, 2, { peca: "recurso de apelação", fundamento: "Art. 593, I, CPP" }).acertou).toBe(true);
  });
});

describe("perguntas fixas (content/perguntas)", async () => {
  const fixas = (await import("../src/content/generated/perguntas.json")).default as { id: string; caso: string; peca: string; fundamentos: string[]; comando: string; explicacao: string; distratores: string[] }[];
  it.each(fixas.map((q) => [q.id, q]))("%s: resposta esperada é aceita no difícil", (_, q) => {
    const p = { id: q.id, caso: q.caso, comando: q.comando, resposta: { peca: q.peca, fundamentos: q.fundamentos }, explicacao: q.explicacao, fonte: "", distratores: q.distratores };
    expect(corrigirResposta(p, 3, { peca: nomePeca(q.peca), fundamento: q.fundamentos[0] }).acertou).toBe(true);
  });
});
