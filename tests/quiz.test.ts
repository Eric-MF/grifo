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
    const p = { formato: "peca" as const, categorias: ["peca" as const], id: q.id, caso: q.caso, comando: q.comando, resposta: { peca: q.peca, fundamentos: q.fundamentos }, explicacao: q.explicacao, fonte: "", distratores: q.distratores };
    expect(corrigirResposta(p, 3, { peca: nomePeca(q.peca), fundamento: q.fundamentos[0] }).acertou).toBe(true);
  });
});

describe("categorias e formatos novos", async () => {
  const { sortearPergunta, tamanhoAcervo } = await import("../src/quiz/banco.ts");
  const { corrigirItem, corrigirObjetiva } = await import("../src/quiz/verificar.ts");
  const { mascaraCategorias, categoriasDaMascara } = await import("../src/quiz/categorias.ts");
  const { limiteSeg } = await import("../src/quiz/pontuacao.ts");
  const { loadExame } = await import("./helpers.ts");
  type PerguntaItem = import("../src/quiz/types.ts").PerguntaItem;
  type PerguntaObjetiva = import("../src/quiz/types.ts").PerguntaObjetiva;

  const ex = loadExame("38");
  const item = ex.peca.itens.find((i) => i.componentes.some((c) => c.dispositivo?.length))!;
  const pItem: PerguntaItem = {
    formato: "item", id: "t-item", categorias: ["peca-detalhe"], caso: ex.peca.enunciado, comando: "?", explicacao: "", fonte: "",
    itens: [item], dispositivos: [],
    opcoes: [{ texto: item.descricao, correta: true }, { texto: "x", correta: false }, { texto: "y", correta: false }],
  };
  const pObj: PerguntaObjetiva = {
    formato: "objetiva", id: "t-obj", categorias: ["objetiva"], caso: "", comando: "", explicacao: "", fonte: "", dispositivos: [],
    alternativas: { A: "a", B: "b", C: "c", D: "d" }, correta: "C",
  };

  it("item no nível fácil é corrigido pela alternativa", () => {
    expect(corrigirItem(pItem, 1, { opcao: 0 }).acertou).toBe(true);
    expect(corrigirItem(pItem, 1, { opcao: 1 }).acertou).toBe(false);
  });

  it("item digitado com a própria tabela tira a nota inteira; em branco, zero", () => {
    expect(corrigirItem(pItem, 3, { texto: `${item.descricao} ${ex.peca.gabarito_comentado}` })).toMatchObject({ acertou: true, fracao: 1 });
    expect(corrigirItem(pItem, 2, { texto: "" })).toMatchObject({ acertou: false, fracao: 0 });
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

  it("objetiva tem menos tempo nos níveis altos; item digitado, mais", () => {
    expect(limiteSeg(pObj, 3)).toBeLessThan(limiteSeg(pObj, 1));
    expect(limiteSeg(pItem, 2)).toBeGreaterThan(limiteSeg(pItem, 1));
  });
});

describe("opcoesDoItem", async () => {
  const { opcoesDoItem } = await import("../src/quiz/banco.ts");
  it("sempre inclui a correta e no máximo 4 opções", () => {
    const p = {
      opcoes: [{ texto: "certa", correta: true }, ...Array.from({ length: 6 }, (_, i) => ({ texto: `e${i}`, correta: false }))],
    } as import("../src/quiz/types.ts").PerguntaItem;
    for (let i = 0; i < 50; i++) {
      const o = opcoesDoItem(p);
      expect(o).toHaveLength(4);
      expect(o).toContain(0);
    }
  });
});

describe("perguntas de itens das provas (content/perguntas/discursivas)", async () => {
  const { corrigirItem } = await import("../src/quiz/verificar.ts");
  const itens = (await import("../src/content/generated/perguntas-itens.json")).default as unknown as import("../src/quiz/types.ts").PerguntaItem[];
  // Itens cujos termos dependem de dados do caso que a descrição do item não repete.
  const EXCECOES = new Set(["02-peca-9" /* exige os nomes das testemunhas */]);
  it.each(itens.filter((p) => !EXCECOES.has(p.id)).map((p) => [p.id, p]))("%s: o gabarito do item passa no nível médio", (_, p) => {
    const texto = `${p.itens.map((i) => i.descricao).join("\n")}\n${p.explicacao}`;
    expect(corrigirItem(p, 2, { texto }).acertou).toBe(true);
    expect(p.opcoes.filter((o) => o.correta)).toHaveLength(1);
  });
});
