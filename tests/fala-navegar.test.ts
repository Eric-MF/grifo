import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { alvoDigitado } from "../src/lib/leis/busca.ts";
import {
  APELIDOS,
  acharDivisao,
  acharPeloNome,
  apelidoDe,
  artigoNaFaixa,
  caminhoDaDivisao,
  divisaoFalada,
  divisaoMaisFunda,
  divisaoVizinha,
  divisoesDaLei,
  nomesDaLei,
  procurarNaLista,
  type BlocoLeve,
} from "../src/lib/fala/navegar.ts";

type Bloco = BlocoLeve & { disp?: string };
const lei = (id: string) => (JSON.parse(readFileSync(join(process.cwd(), "content/leis-texto", `${id}.json`), "utf8")) as { blocos: Bloco[] }).blocos;
const cpp = lei("cpp");
const cp = lei("cp");
const divsCpp = divisoesDaLei(cpp);
const divsCp = divisoesDaLei(cp);
const blocoDo = (blocos: Bloco[], disp: string) => blocos.findIndex((b) => b.disp === disp && !b.superada);

describe("divisões da lei", () => {
  it("o CPP: livros, títulos e capítulos com nome e caminho", () => {
    const rese = divsCpp.find((d) => d.nome === "DO RECURSO EM SENTIDO ESTRITO")!;
    expect(rese.rotulo).toBe("Capítulo II");
    expect(caminhoDaDivisao(rese)).toBe("Livro III, Título II, Capítulo II");
    expect(divisaoFalada(rese)).toBe("capítulo segundo");
    // a divisão acaba no capítulo seguinte: o art. 581 está dentro, o 593 (apelação) não
    expect(blocoDo(cpp, "art581")).toBeGreaterThan(rese.i);
    expect(blocoDo(cpp, "art581")).toBeLessThan(rese.fim);
    expect(blocoDo(cpp, "art593")).toBeGreaterThanOrEqual(rese.fim);
  });

  it("o CP: a parte geral e a especial; o índice antigo (superado) fica de fora", () => {
    expect(divsCp[0]!.rotulo).toBe("Parte GERAL");
    expect(divisaoFalada(divsCp[0]!)).toBe("parte geral");
    expect(divsCp.filter((d) => d.nivel === 0).map((d) => d.n)).toEqual(["geral", "especial"]);
  });

  it("“capítulo II do título II” no CPP: três; com o livro, ou lendo no livro III, um só", () => {
    const caminho = [
      { nivel: "capitulo", n: "2" },
      { nivel: "titulo", n: "2" },
    ] as const;
    const varios = acharDivisao(divsCpp, [...caminho], null);
    expect(varios && "opcoes" in varios ? varios.opcoes.map((d) => d.pais.find((p) => p.nivel === 1)?.rotulo) : null).toEqual(["Livro II", "Livro III", "Livro IV"]);
    const comLivro = acharDivisao(divsCpp, [...caminho, { nivel: "livro", n: "3" }], null);
    expect(comLivro && "div" in comLivro ? comLivro.div.nome : null).toBe("DO RECURSO EM SENTIDO ESTRITO");
    // lendo o art. 574 (Livro III), fica o do mesmo livro
    const lendo = acharDivisao(divsCpp, [...caminho], blocoDo(cpp, "art574"));
    expect(lendo && "div" in lendo ? lendo.div.nome : null).toBe("DO RECURSO EM SENTIDO ESTRITO");
    expect(acharDivisao(divsCpp, [{ nivel: "titulo", n: "99" }], null)).toBeNull();
  });

  it("“último artigo do título II do livro III” e “deste capítulo”", () => {
    const t = acharDivisao(
      divsCpp,
      [
        { nivel: "titulo", n: "2" },
        { nivel: "livro", n: "3" },
      ],
      null,
    );
    const titulo = t && "div" in t ? t.div : null;
    expect(titulo?.nome).toBe("DOS RECURSOS EM GERAL");
    const ultimo = artigoNaFaixa(cpp, titulo!.i, titulo!.fim, "ultimo")!;
    // o artigo seguinte já é do Livro IV
    const seguinte = artigoNaFaixa(cpp, ultimo + 1, cpp.length, "primeiro")!;
    expect(divisaoMaisFunda(divsCpp, seguinte)?.pais[0]?.rotulo).toBe("Livro IV");
    expect(cpp[ultimo]!.disp).toMatch(/^art6\d\d/);
    const aqui = acharDivisao(divsCpp, [{ nivel: "capitulo", n: null }], blocoDo(cpp, "art583"));
    expect(aqui && "div" in aqui ? aqui.div.nome : null).toBe("DO RECURSO EM SENTIDO ESTRITO");
    expect(cpp[artigoNaFaixa(cpp, 0, cpp.length, "ultimo")!]!.disp).toBe("art811");
  });

  it("próximo capítulo e capítulo anterior", () => {
    const de581 = blocoDo(cpp, "art581");
    expect(divisaoVizinha(divsCpp, "capitulo", 1, de581)?.nome).toBe("DA APELAÇÃO");
    expect(divisaoVizinha(divsCpp, "capitulo", -1, de581)?.nome).toBe("DISPOSIÇÕES GERAIS");
  });
});

describe("pelo nome", () => {
  const nomesCpp = nomesDaLei(cpp, divsCpp);
  const nomesCp = nomesDaLei(cp, divsCp);
  it.each([
    ["recurso em sentido estrito", "DO RECURSO EM SENTIDO ESTRITO"],
    ["da prisão em flagrante", "DA PRISÃO EM FLAGRANTE"],
  ])("CPP: %s", (q, nome) => {
    expect(acharPeloNome(nomesCpp, q)?.item.nome).toBe(nome);
  });
  it.each([
    ["homicídio", "Homicídio simples"],
    ["legítima defesa", "Legítima defesa"],
    ["crimes contra a vida", "DOS CRIMES CONTRA A VIDA"],
    ["furto", "DO FURTO"],
  ])("CP: %s", (q, nome) => {
    expect(acharPeloNome(nomesCp, q)?.item.nome).toBe(nome);
  });
  it("nada parecido: null", () => {
    expect(acharPeloNome(nomesCp, "xyzw")).toBeNull();
  });

  it("os apelidos levam a um lugar que existe na lei deles", () => {
    expect(apelidoDe("RESE")?.lei).toBe("cpp");
    expect(apelidoDe("o ANPP")?.alvo).toBe("28-a");
    const cache = new Map<string, Bloco[]>();
    for (const a of APELIDOS) {
      const blocos = cache.get(a.lei) ?? lei(a.lei);
      cache.set(a.lei, blocos);
      if (a.alvo) {
        const alvo = alvoDigitado(a.alvo);
        expect(alvo, a.nomes[0]).not.toBeNull();
        expect(blocoDo(blocos, alvo!.disp ?? alvo!.art), `${a.nomes[0]} → ${a.lei} ${a.alvo}`).toBeGreaterThanOrEqual(0);
      } else {
        const achado = acharPeloNome(nomesDaLei(blocos, divisoesDaLei(blocos)), a.nome!);
        expect(achado?.nota, `${a.nomes[0]} → ${a.lei} “${a.nome}”`).toBeGreaterThanOrEqual(80);
      }
    }
  });
});

describe("procurar palavras", () => {
  const textos = cp.filter((b) => !b.superada).map((b) => b.texto);
  const disps = cp.filter((b) => !b.superada).map((b) => b.disp);
  it("a expressão inteira, sem acento e sem maiúsculas", () => {
    const { acertos, frase } = procurarNaLista(textos, "Motivo torpe");
    expect(frase).toBe("motivo torpe");
    expect(acertos.map((a) => disps[a.k])).toContain("art121.p2.i1");
    // a posição é a do texto original
    const a = acertos.find((x) => disps[x.k] === "art121.p2.i1")!;
    expect(textos[a.k]!.slice(a.pos, a.pos + 12).toLowerCase()).toBe("motivo torpe");
  });
  it("sem a expressão, todas as palavras no mesmo bloco", () => {
    const { acertos } = procurarNaLista(textos, "torpe motivo");
    expect(acertos.map((a) => disps[a.k])).toContain("art121.p2.i1");
  });
  it("o que a voz disse junto do comando é deixado de lado", () => {
    const { acertos, frase } = procurarNaLista(textos, "motivo torpe e a pena é de reclusão de doze");
    expect(frase).toBe("motivo torpe");
    expect(acertos.length).toBeGreaterThan(0);
  });
  it("nada: lista vazia", () => {
    expect(procurarNaLista(textos, "xyzw abcd").acertos).toEqual([]);
  });
});
