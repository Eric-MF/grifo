import { describe, expect, it } from "vitest";
import { interpretarComando, palavrasDe } from "../src/lib/fala/comandos-voz.ts";
import { ajusteDaVoz, comandoDaLeitura, comandoDeLeitura, pareceEco } from "../src/quiz/voz.ts";
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

describe("comandoDaLeitura: os comandos do Ouvir na leitura do treino", () => {
  const leia = (fala: string, estado: "lendo" | "pausado" | "parado", recentes: ReadonlySet<string> = new Set()) => comandoDaLeitura([fala], estado, recentes, interpretarComando);

  it.each([
    ["pausa", "pausar"],
    ["pare", "pausar"],
    ["espera", "pausar"],
    ["parar a leitura", "parar"],
    ["chega", "parar"],
    ["volta", "trechoAnterior"],
    ["avança", "proximoTrecho"],
    ["repete", "repetirTrecho"],
    ["mais rápido", "maisRapido"],
    ["mais devagar", "maisDevagar"],
    ["velocidade normal", "velocidadeNormal"],
    ["mais alto", "maisAlto"],
    ["ajuda", "ajuda"],
    ["ler a questão", "reler"],
    ["ler as alternativas", "alternativas"],
  ])("lendo, “%s” → %s", (fala, cmd) => {
    expect(leia(fala, "lendo")).toBe(cmd);
  });

  it("lendo, o comando vale no meio da frase que o microfone ouviu junto com a leitura", () => {
    const recentes = new Set(palavrasDe("O réu foi condenado por furto qualificado"));
    expect(leia("condenado por furto pausa", "lendo", recentes)).toBe("pausar");
    expect(leia("furto qualificado ler as alternativas", "lendo", recentes)).toBe("alternativas");
  });

  it("a palavra que a própria voz acabou de dizer não vira comando", () => {
    const recentes = new Set(palavrasDe("o recurso anterior foi negado"));
    expect(leia("recurso anterior foi negado", "lendo", recentes)).toBeNull();
  });

  it("pausada: “continua” continua, e “repete” repete o trecho", () => {
    expect(leia("continua", "pausado")).toBe("continuar");
    expect(leia("pode continuar", "pausado")).toBe("continuar");
    expect(leia("repete", "pausado")).toBe("repetirTrecho");
  });

  it("parada: “repete” relê a questão toda; “continua” e “próximo” ficam para a questão (a próxima)", () => {
    expect(leia("repete", "parado")).toBe("reler");
    expect(leia("continua", "parado")).toBeNull();
    expect(leia("próximo", "parado")).toBeNull();
  });

  it.each([
    ["ver a questão", "reler"],
    ["ver questão", "reler"],
    ["ler questão", "reler"],
    ["rever a pergunta", "reler"],
    ["ver as alternativas", "alternativas"],
    ["ver os artigos", "artigos"],
  ])("parada, “%s” → %s (o reconhecimento ouve “ler” como “ver”)", (fala, cmd) => {
    expect(leia(fala, "parado")).toBe(cmd);
  });

  it.each(["letra b", "apelação", "recurso em sentido estrito", "apelação artigo 593 inciso terceiro alínea d do CPP", "legítima defesa artigo 25 do código penal"])(
    "pausada ou parada, a resposta “%s” não é comando",
    (fala) => {
      expect(leia(fala, "pausado")).toBeNull();
      expect(leia(fala, "parado")).toBeNull();
    },
  );
});

describe("ajusteDaVoz: a velocidade, o volume e o tom ditos no treino", () => {
  const a = (fala: string, estado: "lendo" | "pausado" | "parado" = "lendo") => ajusteDaVoz([fala], estado, new Set(), interpretarComando);
  it.each([
    ["velocidade máxima", { tipo: "velocidade", extremo: "max" }],
    ["velocidade 2", { tipo: "velocidade", valor: 2 }],
    ["velocidade um e meio", { tipo: "velocidade", valor: 1.5 }],
    ["muito mais rápido", { tipo: "velocidade", passo: 0.5 }],
    ["volume 50%", { tipo: "volume", valor: 0.5 }],
    ["voz mais grave", { tipo: "tom", passo: -1 }],
    ["qual é a velocidade", { tipo: "info", sobre: "velocidade" }],
  ])("“%s”", (fala, esperado) => {
    expect(a(fala)).toEqual(esperado);
  });

  it("o resto não é ajuste: a resposta, a navegação do Ouvir, os grifos", () => {
    expect(a("letra b", "parado")).toBeNull();
    expect(a("apelação artigo 593", "parado")).toBeNull();
    expect(a("próximo grifo")).toBeNull();
    expect(a("que lei é essa")).toBeNull();
  });
});
