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
  it("sigla HC no campo de peça do quiz (nível 2) conta como habeas corpus", () => {
    const h = gerarPergunta("habeas-corpus", 1);
    expect(corrigirResposta(h, 2, { peca: "HC", fundamento: "art. 648, I, CPP" }).acertouPeca).toBe(true);
  });
});

describe("perguntas fixas (content/perguntas)", async () => {
  const fixas = (await import("../src/content/generated/perguntas.json")).default as { id: string; caso: string; peca: string; fundamentos: string[]; comando: string; explicacao: string; distratores: string[] }[];
  it.each(fixas.map((q) => [q.id, q]))("%s: resposta esperada é aceita no difícil", (_, q) => {
    const p = { formato: "peca" as const, categorias: ["peca" as const], id: q.id, caso: q.caso, comando: q.comando, resposta: { peca: q.peca, fundamentos: q.fundamentos }, explicacao: q.explicacao, fonte: "", distratores: q.distratores };
    expect(corrigirResposta(p, 3, { peca: nomePeca(q.peca), fundamento: q.fundamentos[0] }).acertou).toBe(true);
  });
});

describe("categorias e formatos novos", async () => {
  const { sortearPergunta, tamanhoAcervo } = await import("../src/quiz/banco.ts");
  const { corrigirTese, corrigirObjetiva } = await import("../src/quiz/verificar.ts");
  const { mascaraCategorias, categoriasDaMascara } = await import("../src/quiz/categorias.ts");
  const { limiteSeg } = await import("../src/quiz/pontuacao.ts");
  type PerguntaTese = import("../src/quiz/types.ts").PerguntaTese;
  type PerguntaObjetiva = import("../src/quiz/types.ts").PerguntaObjetiva;

  const pTese: PerguntaTese = {
    formato: "tese", id: "t-tese", categorias: ["peca-detalhe"], caso: "Caso.", enunciado: "Caso completo.", comando: "?", explicacao: "", fonte: "",
    tese: "Desclassificação para furto simples", aceitos: [["furto simples"]], artigos: ["art. 155, CP"], valor: 0.5,
    erradas: { artigos: ["art. 157, CP", "art. 171, CP", "art. 180, CP"], teses: ["Legítima defesa", "Estado de necessidade", "Crime impossível"] },
  };
  const pObj: PerguntaObjetiva = {
    formato: "objetiva", id: "t-obj", categorias: ["objetiva"], caso: "", comando: "", explicacao: "", fonte: "", dispositivos: [],
    alternativas: { A: "a", B: "b", C: "c", D: "d" }, correta: "C",
  };

  it("tese no nível fácil é corrigida pela alternativa", () => {
    expect(corrigirTese(pTese, 1, { alternativa: { modo: "artigo", texto: "art. 155 do CP", correta: true } })).toMatchObject({
      acertou: true,
      acertouArtigo: true,
      acertouTese: null,
    });
    expect(corrigirTese(pTese, 1, { alternativa: { modo: "artigo", texto: "art. 157 do CP", correta: false } }).acertou).toBe(false);
  });

  it("tese no nível médio: basta o ponto central", () => {
    expect(corrigirTese(pTese, 2, { tese: "cabe a desclassificação para furto simples" })).toMatchObject({
      acertou: true,
      acertouTese: true,
      acertouArtigo: null,
    });
    expect(corrigirTese(pTese, 2, { tese: "" }).acertou).toBe(false);
    expect(corrigirTese(pTese, 2, { tese: "legítima defesa" }).acertou).toBe(false);
  });

  it("tese no nível difícil: o ponto central e o artigo", () => {
    expect(corrigirTese(pTese, 3, { tese: "furto simples", artigo: "art. 155 do CP" }).acertou).toBe(true);
    expect(corrigirTese(pTese, 3, { tese: "furto simples", artigo: "art. 157 do CP" })).toMatchObject({
      acertou: false,
      acertouTese: true,
      acertouArtigo: false,
    });
  });

  it("objetiva compara a letra", () => {
    expect(corrigirObjetiva(pObj, "C").acertou).toBe(true);
    expect(corrigirObjetiva(pObj, "A")).toMatchObject({ acertou: false, correta: "C" });
  });

  it("categoria sem acervo cai para peça e fundamento", () => {
    if (tamanhoAcervo("objetiva") > 0) return;
    expect(sortearPergunta({ categorias: ["objetiva"] }).formato).toBe("peca");
  });

  it("máscara das categorias faz ida e volta", () => {
    expect(categoriasDaMascara(mascaraCategorias(["peca", "objetiva"]))).toEqual(["peca", "objetiva"]);
  });

  it("objetiva tem menos tempo nos níveis altos; tese digitada, mais", () => {
    expect(limiteSeg(pObj, 3)).toBeLessThan(limiteSeg(pObj, 1));
    expect(limiteSeg(pTese, 2)).toBeGreaterThan(limiteSeg(pTese, 1));
  });
});

describe("opcoesDaTese", async () => {
  const { opcoesDaTese } = await import("../src/quiz/banco.ts");
  const { artigoLegivel } = await import("../src/quiz/verificar.ts");
  type PerguntaTese = import("../src/quiz/types.ts").PerguntaTese;
  const p: PerguntaTese = {
    formato: "tese", id: "t-tese", categorias: ["peca-detalhe"], caso: "Caso.", enunciado: "Caso completo.", comando: "?", explicacao: "", fonte: "",
    tese: "Desclassificação para furto simples", aceitos: [["furto simples"]], artigos: ["art. 155, CP"], valor: 0.5,
    erradas: { artigos: ["art. 157, CP", "art. 171, CP", "art. 180, CP"], teses: ["Legítima defesa", "Estado de necessidade", "Crime impossível"] },
  };

  it("modo tese: a correta é a tese, com 4 opções", () => {
    const o = opcoesDaTese(p, () => 0.1);
    expect(o.modo).toBe("tese");
    expect(o.opcoes).toHaveLength(4);
    expect(o.opcoes.filter((x) => x.correta)).toHaveLength(1);
    expect(o.opcoes.find((x) => x.correta)!.texto).toBe(p.tese);
  });

  it("modo artigo: a correta é o artigo legível, com 4 opções", () => {
    const o = opcoesDaTese(p, () => 0.9);
    expect(o.modo).toBe("artigo");
    expect(o.opcoes).toHaveLength(4);
    expect(o.opcoes.filter((x) => x.correta)).toHaveLength(1);
    expect(o.opcoes.find((x) => x.correta)!.texto).toBe(artigoLegivel("art. 155, CP"));
  });

  it("o artigo entra na frase do fácil com o artigo definido e a preposição", async () => {
    const { artigoNaFrase } = await import("../src/quiz/verificar.ts");
    expect(artigoNaFrase("art. 20, § 3º, CP")).toBe("o art. 20, § 3º, do Código Penal");
    expect(artigoNaFrase("art. 4, § 10-A, Lei 12.850")).toMatch(/^o art\. 4, § 10-A, da Lei /);
    expect(artigoNaFrase("Súmula 545 STJ")).toBe("a Súmula 545 do STJ");
  });

  it("sem teses erradas suficientes, o modo é sempre artigo", () => {
    const q = { ...p, erradas: { ...p.erradas, teses: ["Legítima defesa", "Estado de necessidade"] } };
    for (let i = 0; i < 20; i++) expect(opcoesDaTese(q, () => 0.1).modo).toBe("artigo");
  });
});

describe("perguntas de itens das provas (content/perguntas/discursivas)", async () => {
  const { corrigirTese, artigoLegivel } = await import("../src/quiz/verificar.ts");
  const { opcoesDaTese } = await import("../src/quiz/banco.ts");
  const teses = (await import("../src/content/generated/perguntas-itens.json")).default as unknown as import("../src/quiz/types.ts").PerguntaTese[];
  it.each(teses.map((p) => [p.id, p]))("%s: a tese e o artigo esperados passam", (_, p) => {
    expect(p.artigos.length).toBeGreaterThan(0);
    expect(corrigirTese(p, 2, { tese: p.tese }).acertou).toBe(true);
    expect(corrigirTese(p, 3, { tese: p.tese, artigo: artigoLegivel(p.artigos[0]!) }).acertou).toBe(true);
    expect(opcoesDaTese(p).opcoes.filter((o) => o.correta)).toHaveLength(1);
  });
});
