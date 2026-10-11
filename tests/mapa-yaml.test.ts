import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { caminhoDoItem, caminhoEm, caminhoDeTexto, inserirComponente, intervaloDe, textoDeCaminho } from "../src/lib/revisao/mapa";
import { indexarLeis, pesquisarDispositivos } from "../src/lib/revisao/busca";

const yaml = `peca:
  nome: Resposta
  itens:
    - n: 1
      descricao: Pedir a absolvição sumária.
      componentes:
        - { id: c1, valor: 0.5, termos: [ absolvicao, absolver ] }
questoes:
  - itens:
      - n: 1
        descricao: Indicar o prazo.
        componentes: []
`;

const posDe = (trecho: string) => yaml.indexOf(trecho) + 2;

describe("caminhoEm", () => {
  it("acha o campo descricao dentro de um item", () => {
    expect(caminhoEm(yaml, posDe("Pedir"))).toEqual(["peca", "itens", 0, "descricao"]);
  });
  it("acha o termo dentro de uma lista em fluxo", () => {
    expect(caminhoEm(yaml, posDe("absolver"))).toEqual(["peca", "itens", 0, "componentes", 0, "termos", 1]);
  });
  it("devolve null fora do documento", () => {
    expect(caminhoEm(yaml, yaml.length + 10)).toBeNull();
  });
});

describe("caminhoDoItem", () => {
  it("sobe até o item da peça", () => {
    expect(caminhoDoItem(["peca", "itens", 0, "descricao"])).toEqual(["peca", "itens", 0]);
  });
  it("sobe até o item de uma questão", () => {
    expect(caminhoDoItem(["questoes", 0, "itens", 0, "componentes", 1])).toEqual(["questoes", 0, "itens", 0]);
  });
  it("devolve null fora de item", () => {
    expect(caminhoDoItem(["peca", "nome"])).toBeNull();
  });
});

describe("intervaloDe", () => {
  it("devolve a faixa do valor", () => {
    const [ini, fim] = intervaloDe(yaml, ["peca", "itens", 0, "descricao"]) ?? [0, 0];
    expect(yaml.slice(ini, fim)).toBe("Pedir a absolvição sumária.");
  });
});

describe("texto e caminho", () => {
  it("ida e volta", () => {
    const c = ["peca", "itens", 0, "componentes", 1];
    expect(caminhoDeTexto(textoDeCaminho(c))).toEqual(c);
  });
});

describe("inserirComponente", () => {
  it("acrescenta componente com dispositivo em fluxo e id livre", () => {
    const novo = inserirComponente(yaml, ["peca", "itens", 0], { valor: 0.1, dispositivo: ["art. 157, CPP"] });
    expect(novo).not.toBeNull();
    const comps = (parse(novo ?? "") as { peca: { itens: { componentes: unknown[] }[] } }).peca.itens[0].componentes;
    expect(comps).toHaveLength(2);
    expect(comps[1]).toEqual({ id: "c2", valor: 0.1, dispositivo: ["art. 157, CPP"] });
    expect(novo).toContain("{ id: c2");
  });
  it("cria a lista quando o item não tem componentes", () => {
    const novo = inserirComponente(yaml, ["questoes", 0, "itens", 0], { valor: 0.2, dispositivo: ["art. 109, IV, CP"] });
    const comps = (parse(novo ?? "") as { questoes: { itens: { componentes: unknown[] }[] }[] }).questoes[0].itens[0].componentes;
    expect(comps).toEqual([{ id: "c1", valor: 0.2, dispositivo: ["art. 109, IV, CP"] }]);
  });
  it("devolve null para item inexistente", () => {
    expect(inserirComponente(yaml, ["peca", "itens", 9], { valor: 0.1, dispositivo: ["art. 1, CP"] })).toBeNull();
  });
});

describe("busca de dispositivos", () => {
  const leis = [
    {
      id: "cpp",
      sigla: "CPP",
      nome: "Código de Processo Penal",
      planalto: "https://x/cpp.htm",
      blocos: [
        { tipo: "artigo", texto: "Art. 157 São inadmissíveis as provas ilícitas.", rotulo: "Art. 157" },
        { tipo: "paragrafo", texto: "§ 1º São ilícitas as derivadas.", rotulo: "§ 1º" },
        { tipo: "artigo", texto: "Art. 157-A antigo.", rotulo: "Art. 157-A", superada: true },
        { tipo: "artigo", texto: "Art. 403 Memoriais.", rotulo: "Art. 403" },
      ],
    },
    {
      id: "cp",
      sigla: "CP",
      nome: "Código Penal",
      planalto: "https://x/cp.htm",
      blocos: [{ tipo: "artigo", texto: "Art. 121 Matar alguem.", rotulo: "Art. 121" }],
    },
  ];
  const indice = indexarLeis(leis);

  it("indexa só artigos vigentes, com citação no formato do gabarito", () => {
    expect(indice.map((d) => d.citacao)).toEqual(["art. 157, CPP", "art. 403, CPP", "art. 121, CP"]);
  });
  it("acha pelo artigo e pela sigla", () => {
    expect(pesquisarDispositivos(indice, "art. 157 cpp").map((d) => d.artigo)).toEqual(["157"]);
  });
  it("acha pelo nome da lei", () => {
    expect(pesquisarDispositivos(indice, "processo penal 403").map((d) => d.citacao)).toEqual(["art. 403, CPP"]);
  });
  it("acha pelo texto com todas as palavras", () => {
    expect(pesquisarDispositivos(indice, "provas ilicitas").map((d) => d.citacao)).toEqual(["art. 157, CPP"]);
  });
  it("devolve vazio sem termo útil", () => {
    expect(pesquisarDispositivos(indice, "a de")).toEqual([]);
  });
});
