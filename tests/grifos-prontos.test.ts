import { describe, expect, it } from "vitest";
import {
  acharPalavra,
  aparenciaDaFaixa,
  blocosComProntos,
  dobrar,
  faixasVisiveis,
  fatiarFaixas,
  grifosDoSistema,
  prontosDosBlocos,
  ROTULO_DA_COR,
  tituloDoGrifo,
  type CorGrifo,
  type GrifoPronto,
} from "@/lib/leis/grifos";
import { blocosDoItem } from "@/lib/leis/vademecum";
import type { Bloco } from "@/lib/leis/linha-do-tempo";

const pronto = (o: Partial<GrifoPronto> & Pick<GrifoPronto, "disp" | "palavras">): GrifoPronto => ({
  cor: "teses",
  grupo: "principais",
  tema: "Tema",
  lei: "cpp",
  essencial: true,
  vide: [],
  ...o,
});

describe("acharPalavra", () => {
  it("ignora maiúsculas e acentos", () => {
    const texto = "A prisão ilegal deve ser relaxada";
    const achado = acharPalavra(texto, "prisao ilegal");
    expect(achado).not.toBeNull();
    const [ini, fim] = achado!;
    expect(texto.slice(ini, fim)).toBe("prisão ilegal");
  });

  it("junta espaços e quebras de linha da palavra e do texto", () => {
    const texto = "a prisão\n  ilegal fica";
    const [ini, fim] = acharPalavra(texto, "prisão   ilegal")!;
    expect(texto.slice(ini, fim)).toBe("prisão\n  ilegal");
  });

  it("prefere a palavra inteira a uma que está dentro de outra palavra", () => {
    const texto = "Penal e pena";
    expect(acharPalavra(texto, "pena")).toEqual([8, 12]);
  });

  it("devolve null quando a palavra não está no texto ou está vazia", () => {
    expect(acharPalavra("nada aqui", "prisão")).toBeNull();
    expect(acharPalavra("nada aqui", "   ")).toBeNull();
  });
});

describe("dobrar", () => {
  it("mantém o tamanho do texto", () => {
    const texto = "Art. 1º — “x”";
    expect(dobrar(texto)).toHaveLength(texto.length);
  });

  it("tira acentos e minúsculas, e troca as aspas e os travessões", () => {
    expect(dobrar("AÇÃO")).toBe("acao");
    expect(dobrar("“x” — º")).toBe('"x" - o');
  });
});

describe("prontosDosBlocos", () => {
  it("marca só as palavras do grifo, não o dispositivo inteiro", () => {
    const texto = "Art. 386. O juiz absolverá o réu quando estiver provada a inexistência do fato.";
    const blocos = [{ disp: "art386", tipo: "artigo", texto }];
    const grifos = [pronto({ disp: "art386", palavras: ["inexistência do fato"] })];
    const m = prontosDosBlocos(blocos, grifos);
    const ini = texto.indexOf("inexistência do fato");
    expect(m.size).toBe(1);
    expect(m.get(0)?.faixas).toEqual([{ ini, fim: ini + "inexistência do fato".length, grifos: [0] }]);
  });

  it("procura a palavra dentro dos blocos do dispositivo quando não está no próprio", () => {
    const blocos = [
      { disp: "art386", tipo: "artigo", texto: "Art. 386. O juiz absolverá o réu:" },
      { disp: "art386.i7", tipo: "inciso", texto: "VII - não existir prova suficiente para a condenação;" },
    ];
    const grifos = [pronto({ disp: "art386", palavras: ["não existir prova suficiente"] })];
    const m = prontosDosBlocos(blocos, grifos);
    const texto = blocos[1].texto;
    const ini = texto.indexOf("não existir prova suficiente");
    expect([...m.keys()]).toEqual([1]);
    expect(m.get(1)?.faixas).toEqual([{ ini, fim: ini + "não existir prova suficiente".length, grifos: [0] }]);
  });

  it("nunca marca nem leva o vide para o texto superado", () => {
    const blocos = [
      { disp: "art386", tipo: "artigo", texto: "Art. 386. inexistência do fato", superada: true },
      { disp: "art386", tipo: "artigo", texto: "Art. 386. sem o trecho" },
    ];
    const vide = [{ lei: "cpp", disp: "art5", rotulo: "CPP, art. 5" }];
    const m = prontosDosBlocos(blocos, [pronto({ disp: "art386", palavras: ["inexistência do fato"], vide })]);
    expect(m.has(0)).toBe(false);
    expect(m.get(1)?.faixas).toEqual([]);
    expect(m.get(1)?.vide).toEqual(vide);
  });

  it("o vide vai para o bloco do próprio dispositivo (o que não é rubrica) e não repete o mesmo destino", () => {
    const blocos = [
      { disp: "art69", tipo: "texto", texto: "Competência" },
      { disp: "art69", tipo: "artigo", texto: "Art. 69. Compete ao juiz." },
    ];
    const vide = [{ lei: "cpp", disp: "art70", rotulo: "CPP, art. 70" }];
    const grifos = [
      pronto({ disp: "art69", palavras: ["Compete ao juiz"], vide }),
      pronto({ disp: "art69", palavras: ["Compete ao juiz"], vide, cor: "pedidos" }),
    ];
    const m = prontosDosBlocos(blocos, grifos);
    expect(m.get(0)).toBeUndefined();
    expect(m.get(1)?.vide).toEqual(vide);
  });
});

describe("fatiarFaixas", () => {
  it("corta trechos sobrepostos em pedaços sem sobreposição, cada um com os grifos que o cobrem", () => {
    const faixas = fatiarFaixas([
      { ini: 0, fim: 10, grifo: 0 },
      { ini: 5, fim: 15, grifo: 1 },
    ]);
    expect(faixas).toEqual([
      { ini: 0, fim: 5, grifos: [0] },
      { ini: 5, fim: 10, grifos: [0, 1] },
      { ini: 10, fim: 15, grifos: [1] },
    ]);
  });

  it("deixa de fora os intervalos sem grifo", () => {
    const faixas = fatiarFaixas([
      { ini: 0, fim: 3, grifo: 0 },
      { ini: 10, fim: 12, grifo: 1 },
    ]);
    expect(faixas).toEqual([
      { ini: 0, fim: 3, grifos: [0] },
      { ini: 10, fim: 12, grifos: [1] },
    ]);
  });
});

describe("blocosComProntos", () => {
  it("devolve o dispositivo e o que fica dentro dele, sem os superados nem os títulos", () => {
    const blocos = [
      { disp: "art386", tipo: "artigo" },
      { disp: "art386.i7", tipo: "inciso" },
      { disp: "art387", tipo: "artigo" },
      { disp: "art386", tipo: "artigo", superada: true },
      { disp: "art386.i9", tipo: "inciso", superada: true },
      { tipo: "estrutura", texto: "TÍTULO II" },
    ];
    expect(blocosComProntos(blocos, [pronto({ disp: "art386", palavras: ["x"] })])).toEqual(new Set([0, 1]));
    expect(blocosComProntos(blocos, [pronto({ disp: "art386", palavras: ["x"] }), pronto({ disp: "art387", palavras: ["x"] })])).toEqual(new Set([0, 1, 2]));
  });
});

describe("aparência e títulos das faixas", () => {
  const grifos = [
    pronto({ cor: "teses", grupo: "principais", tema: "Absolvição", disp: "art386", palavras: ["x"], nota: "Nota A" }),
    pronto({ cor: "pedidos", grupo: "Código Penal", tema: "Absolvição pedida", disp: "art386", palavras: ["x"], essencial: false }),
    pronto({ cor: "pecas", grupo: "Código de Processo Penal", tema: "Sem cor", disp: "art386", palavras: ["x"] }),
  ];
  const CORES: Partial<Record<CorGrifo, string>> = { teses: "#fde047", pedidos: "#fca5a5" };
  const corDe = (g: GrifoPronto) => CORES[g.cor];

  it("a faixa de teses é o fundo e a de pedidos, a linha", () => {
    expect(aparenciaDaFaixa({ ini: 0, fim: 10, grifos: [0, 1] }, grifos, corDe)).toEqual({ fundo: "#fde047", linha: "#fca5a5" });
  });

  it("um grifo sem cor no sistema não pinta, e a faixa só com ele some", () => {
    expect(aparenciaDaFaixa({ ini: 20, fim: 30, grifos: [2] }, grifos, corDe)).toEqual({});
    const visiveis = faixasVisiveis({ faixas: [{ ini: 20, fim: 30, grifos: [2] }], vide: [] }, grifos, corDe);
    expect(visiveis).toEqual([]);
  });

  it("o título vem do rótulo dado, e o grifo sem cor não entra nos títulos", () => {
    const [faixa] = faixasVisiveis({ faixas: [{ ini: 0, fim: 10, grifos: [2, 0] }], vide: [] }, grifos, corDe);
    expect(faixa?.titulos).toEqual(["Teses · Principais — Absolvição"]);
    const rotulado = faixasVisiveis(
      { faixas: [{ ini: 0, fim: 10, grifos: [0] }], vide: [] },
      grifos,
      corDe,
      (g) => (g.cor === "teses" ? "Minhas teses" : ROTULO_DA_COR[g.cor]),
    );
    expect(rotulado[0]?.titulos).toEqual(["Minhas teses · Principais — Absolvição"]);
  });

  it("junta os títulos e as notas de todos os grifos que cobrem a faixa", () => {
    const [faixa] = faixasVisiveis({ faixas: [{ ini: 0, fim: 10, grifos: [0, 1] }], vide: [] }, grifos, corDe);
    expect(faixa).toMatchObject({
      ini: 0,
      fim: 10,
      fundo: "#fde047",
      linha: "#fca5a5",
      titulos: ["Teses · Principais — Absolvição", "Pedidos — Absolvição pedida"],
      notas: ["Nota A"],
      essencial: true,
    });
  });

  it("é essencial só se algum grifo que a cobre já caiu em prova", () => {
    const [faixa] = faixasVisiveis({ faixas: [{ ini: 0, fim: 10, grifos: [1] }], vide: [] }, grifos, corDe);
    expect(faixa?.essencial).toBe(false);
  });
});

describe("grifosDoSistema", () => {
  const grifos = [
    pronto({ disp: "art1", palavras: ["x"], lei: "cpp", essencial: true }),
    pronto({ disp: "art2", palavras: ["x"], lei: "cpp", essencial: false }),
    pronto({ disp: "art5", palavras: ["x"], lei: "cf", essencial: true }),
  ];

  it("o geral traz todos e o essenciais só os que já caíram em prova", () => {
    expect(grifosDoSistema(grifos, "geral")).toHaveLength(3);
    expect(grifosDoSistema(grifos, "essenciais").map((g) => g.disp)).toEqual(["art1", "art5"]);
  });

  it("outro id não traz nada e a lei filtra", () => {
    expect(grifosDoSistema(grifos, "materias")).toEqual([]);
    expect(grifosDoSistema(grifos, "geral", "cpp").map((g) => g.disp)).toEqual(["art1", "art2"]);
    expect(grifosDoSistema(grifos, "essenciais", "cpp").map((g) => g.disp)).toEqual(["art1"]);
  });
});

describe("tituloDoGrifo", () => {
  it("mostra o grupo só nas teses e nas súmulas, com o nome por extenso", () => {
    expect(tituloDoGrifo({ cor: "teses", grupo: "subsidiarias", tema: "Absolvição" })).toBe("Teses · Subsidiárias — Absolvição");
    expect(tituloDoGrifo({ cor: "sumulas", grupo: "Competência", tema: "Foro" })).toBe("Súmulas · Competência — Foro");
    expect(tituloDoGrifo({ cor: "pecas", grupo: "Código Penal", tema: "Queixa-crime" })).toBe("Peças — Queixa-crime");
    expect(tituloDoGrifo({ cor: "pedidos", grupo: "Código Penal", tema: "Pena" })).toBe("Pedidos — Pena");
  });

  it("acrescenta a nota e aceita outro rótulo", () => {
    expect(tituloDoGrifo({ cor: "teses", grupo: "preliminares", tema: "Competência", nota: "STF: foro" })).toBe(
      "Teses · Preliminares — Competência (STF: foro)",
    );
    expect(tituloDoGrifo({ cor: "teses", grupo: "preliminares", tema: "Competência" }, "Minhas")).toBe("Minhas · Preliminares — Competência");
  });
});

describe("filtro de grifos automáticos no vade-mécum", () => {
  const lei: Bloco[] = [
    { tipo: "estrutura", texto: "TÍTULO II", superada: false, atos: [] },
    { tipo: "artigo", disp: "art69", rotulo: "Art. 69", texto: "Art. 69. Compete ao juiz.", superada: false, atos: [] },
    { tipo: "artigo", disp: "art70", rotulo: "Art. 70", texto: "Art. 70. Outro assunto.", superada: false, atos: [] },
  ];
  it("mostra só o artigo com grifo automático (e o título antes dele)", () => {
    const itens = blocosDoItem(lei, { filtro: "automaticos" }, false, new Set([1]));
    expect(itens.map((x) => x.bloco.disp ?? x.bloco.tipo)).toEqual(["estrutura", "art69"]);
  });
  it("sem nenhum grifo automático, nada entra", () => {
    expect(blocosDoItem(lei, { filtro: "automaticos" }, false, new Set())).toEqual([]);
  });
});
