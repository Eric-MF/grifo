import { describe, expect, it } from "vitest";
import { artigoCerto, artigoErrado, trechoDoArtigo, type BlocoDoArtigo } from "../src/quiz/artigosFalados.ts";
import type { PerguntaObjetiva, PerguntaPeca } from "../src/quiz/types.ts";
import type { ArtigoCitado, CorrecaoObjetiva, CorrecaoPeca, CorrecaoTese } from "../src/quiz/verificar.ts";

const blocos: BlocoDoArtigo[] = [
  { disp: "art593", tipo: "artigo", texto: "Art. 593. Caberá apelação no prazo de 5 (cinco) dias: (Redação dada pela Lei nº 263, de 23.2.1948)" },
  { disp: "art593.i1", tipo: "inciso", texto: "I - das sentenças definitivas de condenação ou absolvição proferidas por juiz singular;" },
  { disp: "art593.i3", tipo: "inciso", texto: "III - das decisões do Tribunal do Júri, quando:" },
  { disp: "art593.i3.aa", tipo: "alinea", texto: "a) ocorrer nulidade posterior à pronúncia;" },
  { disp: "art593.i3.ad", tipo: "alinea", texto: "d) for a decisão dos jurados manifestamente contrária à prova dos autos." },
  { disp: "art593.p1", tipo: "paragrafo", texto: "§ 1º Se a sentença do juiz-presidente for contrária à lei expressa..." },
];

const peca: PerguntaPeca = {
  formato: "peca",
  id: "y",
  caso: "",
  comando: "",
  explicacao: "",
  fonte: "",
  categorias: ["peca"],
  resposta: { peca: "memoriais", fundamentos: ["art. 403, § 3º, CPP"] },
};

const objetiva: PerguntaObjetiva = {
  formato: "objetiva",
  id: "x",
  caso: "",
  comando: "",
  explicacao: "",
  fonte: "",
  categorias: ["objetiva"],
  alternativas: { A: "a1", B: "b1", C: "c1", D: "d1" },
  correta: "C",
  dispositivos: [],
};

const ARTIGO_A: ArtigoCitado = { texto: "Art. 581, inciso IV — Código de Processo Penal", lei: "cpp", art: "art581", disps: ["art581.i4"] };
const ARTIGO_B: ArtigoCitado = { texto: "Art. 24 — Código Penal", lei: "cp", art: "art24", disps: [] };

describe("trechoDoArtigo: o caput e o que foi citado", () => {
  it("lê o caput e o inciso e a alínea citados, sem a nota de redação, sem os outros dispositivos", () => {
    expect(trechoDoArtigo(blocos, { art: "art593", disps: ["art593.i3.ad"] })).toBe(
      "Art. 593. Caberá apelação no prazo de 5 (cinco) dias: III - das decisões do Tribunal do Júri, quando: d) for a decisão dos jurados manifestamente contrária à prova dos autos.",
    );
  });

  it("sem nada citado, lê o caput e o que vem logo depois, até o limite", () => {
    expect(trechoDoArtigo(blocos, { art: "art593", disps: [] }, 200)).toBe(
      "Art. 593. Caberá apelação no prazo de 5 (cinco) dias: I - das sentenças definitivas de condenação ou absolvição proferidas por juiz singular;",
    );
  });

  it("a rubrica do artigo não é lida", () => {
    const comRubrica: BlocoDoArtigo[] = [{ disp: "art593", tipo: "rubrica", texto: "Apelação" }, ...blocos];
    expect(trechoDoArtigo(comRubrica, { art: "art593", disps: [] }, 200)).toBe(
      "Art. 593. Caberá apelação no prazo de 5 (cinco) dias: I - das sentenças definitivas de condenação ou absolvição proferidas por juiz singular;",
    );
  });
});

describe("artigoCerto: o artigo da resposta certa", () => {
  it("na peça, o fundamento da peça, citado", () => {
    expect(artigoCerto(peca)).toEqual({ texto: "Art. 403, § 3º — Código de Processo Penal", lei: "cpp", art: "art403", disps: ["art403.p3"] });
  });

  it("na objetiva sem dispositivo, não há artigo", () => {
    expect(artigoCerto(objetiva)).toBeNull();
  });
});

describe("artigoErrado: o artigo que a pessoa deu de errado", () => {
  const pecaErrada: CorrecaoPeca = {
    formato: "peca",
    acertou: false,
    acertouPeca: true,
    acertouFundamento: false,
    pecaEsperada: "Memoriais",
    fundamentoEsperado: "Art. 403, § 3º — Código de Processo Penal",
    respondida: { peca: "Memoriais", tipo: "memoriais", fundamentoDaPeca: [], fundamento: "art. 581, IV, CPP", artigos: [ARTIGO_A] },
  };

  it("na peça com o fundamento errado, o artigo citado", () => {
    expect(artigoErrado(pecaErrada)).toEqual(ARTIGO_A);
  });

  it("na peça com o fundamento certo, nenhum", () => {
    expect(artigoErrado({ ...pecaErrada, acertouFundamento: true })).toBeNull();
  });

  it("nas alternativas, com a peça errada, o artigo do fundamento dela", () => {
    const porAlternativa: CorrecaoPeca = {
      ...pecaErrada,
      acertouFundamento: null,
      acertouPeca: false,
      respondida: { peca: "Apelação", tipo: "apelacao", fundamentoDaPeca: ["art. 593, III, d, CPP"], artigos: [] },
    };
    expect(artigoErrado(porAlternativa)).toEqual(expect.objectContaining({ art: "art593" }));
  });

  it("na tese com o artigo errado, o artigo citado", () => {
    const tese: CorrecaoTese = {
      formato: "tese",
      acertou: false,
      acertouTese: true,
      acertouArtigo: false,
      teseEsperada: "Legítima defesa",
      artigoEsperado: "art. 25 do CP",
      respondida: { artigos: [ARTIGO_B] },
    };
    expect(artigoErrado(tese)).toEqual(ARTIGO_B);
  });

  it("na objetiva, nenhum", () => {
    const obj: CorrecaoObjetiva = { formato: "objetiva", acertou: false, escolhida: "A", correta: "C" };
    expect(artigoErrado(obj)).toBeNull();
  });
});
