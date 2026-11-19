import { describe, expect, it } from "vitest";
import type { Citacao, Lexico } from "../src/lib/correcao/citacoes.ts";
import type { BlocoDoGrifo, EntradaGrifo } from "../src/lib/leis/grifos.ts";
import {
  chaveDoTema,
  compilarGrifos,
  dispositivosCitados,
  dispositivosDaCitacao,
  ehEssencial,
  problemasDaEntrada,
  rotuloDoDispositivo,
  videsDasEntradas,
} from "../src/lib/leis/grifos-compilar.ts";

const artigo = (o: Partial<Extract<Citacao, { tipo: "art" }>>): Citacao => ({
  tipo: "art",
  art: "386",
  pars: [],
  incs: [],
  als: [],
  caput: false,
  diploma: "cpp",
  pos: 0,
  fim: 0,
  ...o,
});
const sumula = (o: Partial<Extract<Citacao, { tipo: "sumula" }>>): Citacao => ({
  tipo: "sumula",
  n: "718",
  tribunal: "stf",
  vinculante: false,
  pos: 0,
  fim: 0,
  ...o,
});

const lex: Lexico = {
  diplomas: [
    { id: "cpp", tokens: ["cpp"] },
    { id: "cp", tokens: ["cp"] },
    { id: "cf", tokens: ["cf"] },
  ],
  tribunais: [
    { id: "stf", tokens: ["stf"] },
    { id: "stj", tokens: ["stj"] },
  ],
};

describe("dispositivosDaCitacao", () => {
  it("súmula do STF, do STJ e vinculante vão para a lista da própria corte", () => {
    expect(dispositivosDaCitacao(sumula({ n: "718" }))).toEqual([{ lei: "sumulas-stf", disp: "s-718" }]);
    expect(dispositivosDaCitacao(sumula({ n: "7", tribunal: "stj" }))).toEqual([{ lei: "sumulas-stj", disp: "s-7" }]);
    expect(dispositivosDaCitacao(sumula({ n: "11", vinculante: true }))).toEqual([{ lei: "sumulas-vinculantes", disp: "s-11" }]);
  });

  it("súmula sem tribunal não vira dispositivo", () => {
    expect(dispositivosDaCitacao(sumula({ tribunal: null }))).toEqual([]);
  });

  it("artigo com inciso vira o dispositivo do inciso", () => {
    expect(dispositivosDaCitacao(artigo({ art: "386", incs: ["7"] }))).toEqual([{ lei: "cpp", disp: "art386.i7" }]);
  });

  it("parágrafo com alíneas expande cada alínea", () => {
    expect(dispositivosDaCitacao(artigo({ art: "33", pars: ["2"], als: ["b", "c"], diploma: "cp" }))).toEqual([
      { lei: "cp", disp: "art33.p2.ab" },
      { lei: "cp", disp: "art33.p2.ac" },
    ]);
  });

  it("parágrafos e incisos viram todas as combinações, e o parágrafo único é .pu", () => {
    expect(dispositivosDaCitacao(artigo({ art: "5", pars: ["1", "2"], incs: ["1"], diploma: "cf" }))).toEqual([
      { lei: "cf", disp: "art5.p1.i1" },
      { lei: "cf", disp: "art5.p2.i1" },
    ]);
    expect(dispositivosDaCitacao(artigo({ art: "404", pars: ["unico"] }))).toEqual([{ lei: "cpp", disp: "art404.pu" }]);
  });

  it("artigo sem diploma não vira dispositivo", () => {
    expect(dispositivosDaCitacao(artigo({ diploma: null }))).toEqual([]);
  });
});

describe("dispositivosCitados", () => {
  it("a citação do inciso também conta o artigo; textos vazios não contam", () => {
    const citados = dispositivosCitados(["Conforme o art. 386, VII, do CPP", ""], lex);
    expect(citados).toEqual(new Set(["cpp|art386", "cpp|art386.i7"]));
    expect(dispositivosCitados([""], lex).size).toBe(0);
  });

  it("uma súmula citada vira a súmula da lista", () => {
    expect(dispositivosCitados(["Súmula 718 do STF"], lex)).toEqual(new Set(["sumulas-stf|s-718"]));
  });
});

describe("ehEssencial", () => {
  it("o dispositivo está no conjunto dos citados", () => {
    const citados = new Set(["cf|art5.i65"]);
    expect(ehEssencial({ lei: "cf", disp: "art5.i65" }, citados)).toBe(true);
    expect(ehEssencial({ lei: "cf", disp: "art5.i66" }, citados)).toBe(false);
  });
});

describe("chaveDoTema", () => {
  it("ignora acentos, maiúsculas e espaços sobrando", () => {
    expect(chaveDoTema("  Ação  Penal Privada ")).toBe("acao penal privada");
    expect(chaveDoTema("Ação penal privada")).toBe(chaveDoTema("ACAO PENAL PRIVADA"));
  });
});

describe("rotuloDoDispositivo", () => {
  it("artigo, inciso, parágrafo e alínea", () => {
    expect(rotuloDoDispositivo("cpp", "art310.i1", "CPP")).toBe("CPP, art. 310, I");
    expect(rotuloDoDispositivo("cf", "art5.i65", "CF")).toBe("CF, art. 5º, LXV");
    expect(rotuloDoDispositivo("cp", "art100.p2", "CP")).toBe("CP, art. 100, § 2º");
    expect(rotuloDoDispositivo("cf", "art102.i2.aa", "CF")).toBe("CF, art. 102, II, a");
  });

  it("parágrafo único", () => {
    expect(rotuloDoDispositivo("cpp", "art404.pu", "CPP")).toBe("CPP, art. 404, parágrafo único");
  });

  it("súmulas do STF e vinculantes", () => {
    expect(rotuloDoDispositivo("sumulas-stf", "s-700", "")).toBe("Súmula 700 do STF");
    expect(rotuloDoDispositivo("sumulas-vinculantes", "s-11", "")).toBe("Súmula Vinculante 11");
  });
});

describe("videsDasEntradas", () => {
  const rotulo = (lei: string, disp: string) => `${lei} ${disp}`;

  it("o mesmo tema em duas leis aponta uma para a outra", () => {
    const vides = videsDasEntradas(
      [
        { tema: "Relaxamento de prisão", lei: "cf", disp: "art5.i65" },
        { tema: "relaxamento de  prisão", lei: "cpp", disp: "art310.i1" },
      ],
      rotulo,
    );
    expect(vides).toEqual([
      [{ lei: "cpp", disp: "art310.i1", rotulo: "cpp art310.i1" }],
      [{ lei: "cf", disp: "art5.i65", rotulo: "cf art5.i65" }],
    ]);
  });

  it("um inciso e o próprio artigo, na mesma lei, não apontam um para o outro", () => {
    const vides = videsDasEntradas(
      [
        { tema: "Provas", lei: "cpp", disp: "art386" },
        { tema: "Provas", lei: "cpp", disp: "art386.i7" },
      ],
      rotulo,
    );
    expect(vides).toEqual([[], []]);
  });

  it("dois dispositivos do mesmo artigo (as alíneas b e c do art. 33, § 2º) não apontam um para o outro, só para fora", () => {
    const vides = videsDasEntradas(
      [
        { tema: "Regime de cumprimento da pena", lei: "cp", disp: "art33.p2.ab" },
        { tema: "Regime de cumprimento da pena", lei: "cp", disp: "art33.p2.ac" },
        { tema: "Regime de cumprimento da pena", lei: "cp", disp: "art59.i3" },
      ],
      rotulo,
    );
    expect(vides[0]).toEqual([{ lei: "cp", disp: "art59.i3", rotulo: "cp art59.i3" }]);
    expect(vides[1]).toEqual([{ lei: "cp", disp: "art59.i3", rotulo: "cp art59.i3" }]);
    expect(vides[2]!.map((v) => v.disp)).toEqual(["art33.p2.ab", "art33.p2.ac"]);
  });

  it("quando o alvo é um artigo e um inciso dele, fica só o artigo", () => {
    const vides = videsDasEntradas(
      [
        { tema: "Provas", lei: "cf", disp: "art5.i65" },
        { tema: "Provas", lei: "cpp", disp: "art310.i1" },
        { tema: "Provas", lei: "cpp", disp: "art310" },
      ],
      rotulo,
    );
    expect(vides[0]).toEqual([{ lei: "cpp", disp: "art310", rotulo: "cpp art310" }]);
    expect(vides[1]).toEqual([{ lei: "cf", disp: "art5.i65", rotulo: "cf art5.i65" }]);
  });

  it("a mesma entrada em duas cores não aponta para si mesma", () => {
    const vides = videsDasEntradas(
      [
        { tema: "Competência", lei: "cpp", disp: "art386" },
        { tema: "Competência", lei: "cpp", disp: "art386" },
      ],
      rotulo,
    );
    expect(vides).toEqual([[], []]);
  });
});

describe("problemasDaEntrada", () => {
  const blocos: BlocoDoGrifo[] = [
    { disp: "art310", tipo: "artigo", texto: "Art. 310. Após receber o auto de prisão em flagrante, o juiz deverá fundamentadamente:" },
    { disp: "art310.i1", tipo: "inciso", texto: "I - relaxar a prisão ilegal; " },
    { disp: "art311", tipo: "artigo", texto: "Art. 311. antigo", superada: true },
  ];
  const entrada = (o: Partial<EntradaGrifo>): EntradaGrifo => ({
    cor: "pecas",
    grupo: "Código de Processo Penal",
    tema: "Relaxamento de prisão",
    lei: "cpp",
    disp: "art310.i1",
    palavras: ["relaxar a prisão ilegal"],
    ...o,
  });

  it("uma entrada certa não tem problemas", () => {
    expect(problemasDaEntrada(entrada({}), blocos)).toEqual([]);
  });

  it("a palavra pode estar num bloco de dentro do dispositivo", () => {
    expect(problemasDaEntrada(entrada({ disp: "art310", palavras: ["relaxar a prisão ilegal"] }), blocos)).toEqual([]);
  });

  it("cor que não existe", () => {
    const [p] = problemasDaEntrada(entrada({ cor: "azul" as EntradaGrifo["cor"] }), blocos);
    expect(p).toContain('cor "azul" não existe');
  });

  it("lei que não está no leitor", () => {
    expect(problemasDaEntrada(entrada({}), undefined)).toEqual(['a lei "cpp" não está no leitor']);
  });

  it("dispositivo que não existe ou está superado", () => {
    const esperado = (disp: string) => [`o dispositivo "${disp}" não existe (ou não está vigente) em cpp`];
    expect(problemasDaEntrada(entrada({ disp: "art999" }), blocos)).toEqual(esperado("art999"));
    expect(problemasDaEntrada(entrada({ disp: "art311" }), blocos)).toEqual(esperado("art311"));
  });

  it("palavra que não está no texto", () => {
    expect(problemasDaEntrada(entrada({ palavras: ["relaxar a prisão ilegal", "inexistente"] }), blocos)).toEqual([
      'a palavra "inexistente" não está no texto de cpp art310.i1',
    ]);
  });
});

describe("compilarGrifos", () => {
  const entradas: EntradaGrifo[] = [
    { cor: "teses", grupo: "principais", tema: "Provas ilícitas", lei: "cpp", disp: "art386.i7", palavras: ["x"], nota: "Nota" },
    { cor: "pecas", grupo: "Constituição Federal", tema: "Provas ilícitas", lei: "cf", disp: "art5.i56", palavras: ["y"] },
    { cor: "sumulas", grupo: "Provas", tema: "Outro", lei: "sumulas-stf", disp: "s-700", palavras: ["z"] },
  ];
  const sigla = (lei: string) => (lei === "cpp" ? "CPP" : "CF");
  const rotulo = (lei: string, disp: string) => rotuloDoDispositivo(lei, disp, sigla(lei));

  it("marca essencial pelos citados e preenche o vide com os rótulos", () => {
    const [a, b, c] = compilarGrifos(entradas, new Set(["cpp|art386.i7"]), rotulo);
    expect(a).toMatchObject({ cor: "teses", grupo: "principais", tema: "Provas ilícitas", lei: "cpp", disp: "art386.i7", palavras: ["x"], nota: "Nota", essencial: true });
    expect(a?.vide).toEqual([{ lei: "cf", disp: "art5.i56", rotulo: "CF, art. 5º, LVI" }]);
    expect(b).toMatchObject({ essencial: false });
    expect(b?.vide).toEqual([{ lei: "cpp", disp: "art386.i7", rotulo: "CPP, art. 386, VII" }]);
    expect(c).toMatchObject({ essencial: false, vide: [] });
  });

  it("sem nota, a entrada não ganha o campo", () => {
    const [, b] = compilarGrifos(entradas, new Set(), rotulo);
    expect("nota" in b!).toBe(false);
  });
});
