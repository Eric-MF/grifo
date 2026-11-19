import { describe, expect, it } from "vitest";
import { palavrasDe } from "../src/lib/fala/comandos-voz.ts";
import { comandoDeLeitura, pareceEco } from "../src/quiz/voz.ts";
import { comPronuncia, correcaoFalada, textosDaQuestao } from "../src/quiz/locutor.ts";
import type { PerguntaObjetiva, PerguntaPeca, PerguntaTese } from "../src/quiz/types.ts";
import type { CorrecaoObjetiva, CorrecaoPeca, CorrecaoTese } from "../src/quiz/verificar.ts";

const recentesDaLeitura = new Set(palavrasDe("Letra bê: Apelação. Letra cê: Agravo em Execução."));

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

const peca: PerguntaPeca = {
  formato: "peca",
  id: "y",
  caso: "",
  comando: "",
  explicacao: "",
  fonte: "",
  categorias: ["peca"],
  resposta: { peca: "apelacao", fundamentos: ["art. 593, III, d, CPP"] },
};

const tese: PerguntaTese = {
  formato: "tese",
  id: "z",
  caso: "",
  comando: "",
  explicacao: "",
  fonte: "",
  categorias: ["discursiva"],
  enunciado: "",
  tese: "Legítima defesa",
  aceitos: [["legitima defesa"]],
  artigos: ["art. 25 do CP"],
  valor: 1,
  erradas: { artigos: [], teses: [] },
};

const correcaoObjetiva: CorrecaoObjetiva = { formato: "objetiva", acertou: false, escolhida: "A", correta: "C" };
const correcaoTese: CorrecaoTese = {
  formato: "tese",
  acertou: false,
  acertouTese: false,
  acertouArtigo: null,
  teseEsperada: "Legítima defesa",
  artigoEsperado: "art. 25 do CP",
  respondida: { artigos: [] },
};

describe("comandoDeLeitura: o que a pessoa pede à voz", () => {
  it.each(["repetir", "Repete", "ler de novo", "leia a questão", "repetir a pergunta", "de novo"])("“%s” relê a questão", (fala) => {
    expect(comandoDeLeitura([fala])).toEqual("reler");
  });

  it.each(["ler as alternativas", "quais são as alternativas", "alternativas", "repetir as alternativas"])("“%s” lê só as alternativas", (fala) => {
    expect(comandoDeLeitura([fala])).toEqual("alternativas");
  });

  it.each(["parar", "Pare", "silêncio", "chega", "para de ler", "pausa"])("“%s” para a leitura", (fala) => {
    expect(comandoDeLeitura([fala])).toEqual("parar");
  });

  it.each(["letra b", "apelação", "próxima", "repetir o artigo 121"])("“%s” não é comando de leitura", (fala) => {
    expect(comandoDeLeitura([fala])).toBeNull();
  });

  it("qualquer uma das alternativas reconhecidas conta", () => {
    expect(comandoDeLeitura(["hum", "parar"])).toEqual("parar");
  });
});

describe("pareceEco: o microfone ouvindo a própria leitura", () => {
  it.each(["letra b apelação", "agravo em execução"])("“%s” é eco do que acabou de ser lido", (fala) => {
    expect(pareceEco(palavrasDe(fala), recentesDaLeitura)).toBe(true);
  });

  it.each(["parar", "habeas corpus"])("“%s” não é eco do que foi lido", (fala) => {
    expect(pareceEco(palavrasDe(fala), recentesDaLeitura)).toBe(false);
  });

  it("sem leitura em curso (conjunto vazio), nada é eco", () => {
    expect(pareceEco(palavrasDe("agravo em execução"), new Set())).toBe(false);
  });

  it("frase só com palavras vazias conta como eco", () => {
    expect(pareceEco(palavrasDe("o a de"), recentesDaLeitura)).toBe(true);
  });
});

describe("textosDaQuestao: o que a voz lê", () => {
  const questao = { caso: "O caso.", comando: "Qual a peça?", alternativas: ["Apelação", "Habeas Corpus"] };

  it("lê o caso, o comando e cada alternativa, com a letra falada", () => {
    expect(textosDaQuestao(questao)).toEqual(["O caso.", "Qual a peça?", "Letra á: Apelação", "Letra bê: Habeas Corpus"]);
  });

  it("“alternativas” lê só as alternativas", () => {
    expect(textosDaQuestao(questao, "alternativas")).toEqual(["Letra á: Apelação", "Letra bê: Habeas Corpus"]);
  });

  it("descarta os textos vazios", () => {
    expect(textosDaQuestao({ caso: "", comando: "Qual a peça?", alternativas: [] })).toEqual(["Qual a peça?"]);
  });
});

describe("correcaoFalada: a correção dita depois da resposta", () => {
  const artigoDado = { texto: "Art. 593, inciso III, alínea d — Código de Processo Penal", lei: "cpp", art: "art593", disps: ["art593.i3.ad"] };
  const pecaErrada: CorrecaoPeca = {
    formato: "peca",
    acertou: false,
    acertouPeca: false,
    acertouFundamento: false,
    pecaEsperada: "Memoriais",
    fundamentoEsperado: "Art. 403, § 3º — Código de Processo Penal",
    respondida: { peca: "Apelação", tipo: "apelacao", fundamentoDaPeca: [], fundamento: "x", artigos: [artigoDado] },
  };
  const todas = [
    correcaoFalada(objetiva, correcaoObjetiva),
    correcaoFalada(peca, pecaErrada),
    correcaoFalada(peca, { ...pecaErrada, acertouPeca: true }),
    correcaoFalada(peca, { ...pecaErrada, acertouFundamento: true, acertouPeca: false }),
    correcaoFalada(tese, correcaoTese),
    correcaoFalada(tese, { ...correcaoTese, acertouTese: true, acertouArtigo: false }),
    correcaoFalada(tese, { ...correcaoTese, acertouTese: false, acertouArtigo: true }),
  ];

  it("resposta certa diz “Correto!”, em qualquer formato", () => {
    expect(correcaoFalada(objetiva, { ...correcaoObjetiva, acertou: true, escolhida: "C" })).toBe("Correto!");
    expect(correcaoFalada(peca, { ...pecaErrada, acertou: true, acertouPeca: true, acertouFundamento: true })).toBe("Correto!");
    expect(correcaoFalada(tese, { ...correcaoTese, acertou: true, acertouTese: true, acertouArtigo: true })).toBe("Correto!");
  });

  it("objetiva errada diz a letra certa e a marcada, faladas, com a alternativa", () => {
    expect(correcaoFalada(objetiva, correcaoObjetiva)).toBe("Errado. A certa é a letra cê: c1. Você marcou a letra á: a1.");
  });

  it("peça errada diz a peça certa e o fundamento certo, com o que foi dito", () => {
    expect(correcaoFalada(peca, pecaErrada)).toBe(
      "Errado. A peça certa é Memoriais, e não Apelação. O fundamento certo é Art. 403, § 3º — Código de Processo Penal, e não Art. 593, inciso III, alínea d — Código de Processo Penal.",
    );
  });

  it("peça certa diz “A peça está certa” e segue com o fundamento", () => {
    const fala = correcaoFalada(peca, { ...pecaErrada, acertouPeca: true });
    expect(fala.startsWith("A peça está certa: Memoriais.")).toBe(true);
    expect(fala).toContain("O fundamento certo é");
  });

  it("fundamento certo com peça errada diz que o fundamento está certo, no fim", () => {
    expect(correcaoFalada(peca, { ...pecaErrada, acertouFundamento: true, acertouPeca: false })).toBe(
      "Errado. A peça certa é Memoriais, e não Apelação. O fundamento está certo: Art. 403, § 3º — Código de Processo Penal.",
    );
  });

  it("nas alternativas, sem fundamento escrito, diz a peça certa com o fundamento dela", () => {
    expect(correcaoFalada(peca, { ...pecaErrada, acertouFundamento: null, acertouPeca: false, respondida: { ...pecaErrada.respondida!, artigos: [] } })).toBe(
      "Errado. A peça certa é Memoriais, com fundamento no Art. 403, § 3º — Código de Processo Penal, e não Apelação.",
    );
  });

  const teseErrada: CorrecaoTese = {
    formato: "tese",
    acertou: false,
    acertouTese: false,
    acertouArtigo: false,
    teseEsperada: "Legítima defesa",
    artigoEsperado: "art. 25 do CP",
    respondida: { tese: "estado de necessidade", artigos: [{ texto: "Art. 24 — Código Penal", lei: "cp", art: "art24", disps: [] }] },
  };

  it("tese errada e artigo errado dizem o certo e o dado", () => {
    expect(correcaoFalada(tese, teseErrada)).toBe(
      "Errado. O ponto central certo é Legítima defesa, e não estado de necessidade. O artigo certo é art. 25 do CP, e não Art. 24 — Código Penal.",
    );
  });

  it("tese certa e artigo errado", () => {
    expect(correcaoFalada(tese, { ...teseErrada, acertouTese: true })).toBe(
      "O ponto central está certo: Legítima defesa. O artigo certo é art. 25 do CP, e não Art. 24 — Código Penal.",
    );
  });

  it("tese errada sem artigo pedido diz a tese certa e o artigo da questão", () => {
    expect(correcaoFalada(tese, { ...teseErrada, acertouArtigo: null, respondida: { tese: "x", artigos: [] } })).toBe(
      "Errado. O ponto central certo é Legítima defesa, e não x. O artigo é art. 25 do CP.",
    );
  });

  it("nenhuma correção fala “próxima”", () => {
    for (const fala of todas) expect(fala).not.toContain("próxima");
  });
});

describe("comPronuncia: os nomes da mitologia como a voz os diz", () => {
  it("troca os nomes que a escrita engana, por palavra inteira", () => {
    expect(comPronuncia("Medeia e Ájax por Apolo; Apolônio, Hera e Heraclito.")).toBe("Medéia e Ájacs por Apólo; Apolônio, Héra e Heraclito.");
  });
});
