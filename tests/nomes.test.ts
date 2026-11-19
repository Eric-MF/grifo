import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { criarLeitor, marcarPessoas, nomesDesconhecidos, type DicionarioPessoas } from "../src/lib/nomes/marcar.ts";

const { comNomes } = await import("../src/quiz/nomes.ts");
const nomes = (await import("../src/content/generated/nomes-mitologia.json")).default;
const itens = (await import("../src/content/generated/perguntas-itens.json")).default as unknown as Record<string, unknown>[];
const objetivas = (await import("../src/content/generated/objetivas.json")).default as unknown as Record<string, unknown>[];
const fixas = (await import("../src/content/generated/perguntas.json")).default as unknown as Record<string, unknown>[];

const dic = parse(readFileSync("content/nomes-pessoas.yaml", "utf8")) as DicionarioPessoas;
const leitor = criarLeitor(dic);

describe("marcar as pessoas (build)", () => {
  it("a mesma pessoa tem a mesma marca; o cliente é a {p1}", () => {
    const { questao } = marcarPessoas(
      { caso: "Maria Campos foi agredida por João, que fugiu. Como advogado de João, você recorre; Maria Campos depôs. Maria chorou.", comando: "Qual a tese de João?" },
      leitor,
    );
    expect(questao.caso).toBe("{p2} foi agredida por {p1}, que fugiu. Como advogado de {p1}, você recorre; {p2} depôs. {p2} chorou.");
    expect(questao.comando).toBe("Qual a tese de {p1}?");
    expect(questao.pessoas).toEqual(["m", "f"]);
  });
  it("lugares e leis com nome de pessoa ficam como estão", () => {
    const { questao } = marcarPessoas({ caso: "Na Comarca de São Paulo, invocando a Lei Maria da Penha, na cidade de Orlando, por incapacidade de José." }, leitor);
    expect(questao.caso).toBe("Na Comarca de São Paulo, invocando a Lei Maria da Penha, na cidade de Orlando, por incapacidade de {p1}.");
  });
  it("a alternativa errada de outra prova ganha as pessoas desta, do mesmo gênero", () => {
    const { questao, marcacao } = marcarPessoas(
      {
        caso: "Ana, advogada de Pedro, e Rita conversaram.",
        opcoes: [
          { texto: "Absolvição de Pedro.", correta: true },
          { texto: "Gabriela era menor de 21 anos; Tício a ajudou.", correta: false },
        ],
      },
      leitor,
    );
    const opcoes = questao.opcoes as { texto: string }[];
    // "advogada de Pedro": Pedro é o cliente, a {p1}
    expect(questao.pessoas).toEqual(["m", "f", "f"]);
    expect(opcoes[0]!.texto).toBe("Absolvição de {p1}.");
    // Gabriela vira a primeira mulher da questão (Ana) e Tício, o homem (Pedro)
    expect(opcoes[1]!.texto).toBe("{p2} era menor de 21 anos; {p1} a ajudou.");
    expect(marcacao.alheios.map((a) => a.chave)).toEqual(["Gabriela", "Tício"]);
  });
  it("os termos da correção, em minúsculas, também viram marca", () => {
    const { questao } = marcarPessoas(
      { caso: "Leila não foi ouvida.", itens: [{ descricao: "Falta das declarações de Leila.", componentes: [{ termos: ["leila | menor", "re:leila"] }] }] },
      leitor,
    );
    const termos = (questao.itens as { componentes: { termos: string[] }[] }[])[0]!.componentes[0]!.termos;
    expect(termos).toEqual(["{p1} | menor", "re:leila"]);
  });
  it("avisa palavra com maiúscula que não está em lista nenhuma", () => {
    expect(nomesDesconhecidos(["O réu, Teodoro, fugiu com Zeca para o Brasil."], { ...dic, nao_pessoas: ["Brasil"] })).toEqual(["Teodoro", "Zeca"]);
  });
});

describe("os nomes na tela", () => {
  const todas = [...itens, ...objetivas, ...fixas];
  it("toda marca de cada questão tem gênero, e a troca não deixa marca nenhuma", () => {
    for (const q of todas) {
      const maior = Math.max(0, ...[...JSON.stringify(q).matchAll(/\{p(\d+)\}/g)].map((m) => Number(m[1])));
      expect((q.pessoas as string[] | undefined)?.length ?? 0, String(q.id)).toBeGreaterThanOrEqual(maior);
      expect(JSON.stringify(comNomes(q as never)), String(q.id)).not.toMatch(/\{p\d+\}/);
    }
  });
  it("um nome diferente por pessoa, do gênero dela, igual em todos os campos", () => {
    const q = { id: "x", caso: "{p1} e {p2} discutiram; {p3} viu.", comando: "O que {p1} fez?", explicacao: "{p2} errou.", pessoas: ["m", "f", "m"] } as never;
    for (let s = 0; s < 30; s++) {
      const r = comNomes(q) as unknown as { caso: string; comando: string; explicacao: string };
      const [a, b, c] = r.caso.match(/^(\S+) e (\S+) discutiram; (\S+) viu\.$/)!.slice(1);
      expect(new Set([a, b, c]).size).toBe(3);
      expect(nomes.masculinos).toContain(a);
      expect(nomes.femininos).toContain(b);
      expect(nomes.masculinos).toContain(c);
      expect(r.comando).toBe(`O que ${a} fez?`);
      expect(r.explicacao).toBe(`${b} errou.`);
    }
  });
  it("não usa nome que já aparece no texto", () => {
    const q = { id: "x", caso: `${nomes.masculinos.slice(1).join(", ")} e {p1}.`, comando: "", pessoas: ["m"] } as never;
    expect((comNomes(q) as unknown as { caso: string }).caso.endsWith(`e ${nomes.masculinos[0]}.`)).toBe(true);
  });
});

describe("Por dentro da peça: o sorteio segue o valor do item", async () => {
  const { pesoNoSorteio } = await import("../src/quiz/banco.ts");
  it("o item que vale mais pesa mais", () => {
    const de = (v: number) => ({ formato: "tese", categorias: ["peca-detalhe"], valor: v }) as never;
    expect(pesoNoSorteio(de(0.6), "peca-detalhe") / pesoNoSorteio(de(0.1), "peca-detalhe")).toBeCloseTo(6);
    expect(pesoNoSorteio(de(0.6), "discursiva")).toBe(1);
    expect(pesoNoSorteio(de(0.01), "peca-detalhe")).toBe(0.05);
  });
});
