import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Locutor, partesDaQuestao, textosDaQuestao, type LeituraDaQuestao, type ParteLida, type TrechoLido } from "../src/quiz/locutor.ts";
import { pecasDoTexto } from "../src/lib/fala/texto.ts";
import { zerarVez } from "../src/lib/fala/vez.ts";
import type { Fala, Sintese } from "../src/lib/fala/narrador.ts";

/** A voz do navegador de mentira: guarda a fila; o teste diz quando cada fala começa e termina. */
class SinteseFalsa implements Sintese {
  fila: Fala[] = [];
  atual: Fala | null = null;
  paused = false;
  ditos: string[] = [];
  get speaking() {
    return !!this.atual;
  }
  get pending() {
    return this.fila.length > 0;
  }
  speak(f: Fala) {
    this.fila.push(f);
  }
  getVoices() {
    return [];
  }
  /** a voz começa a próxima fala da fila (se não está falando) */
  comecar() {
    if (this.atual) return;
    const f = this.fila.shift();
    if (!f) return;
    this.atual = f;
    f.onstart?.({});
  }
  /** a fala atual termina e a próxima começa */
  terminar() {
    const f = this.atual;
    if (!f) return this.comecar();
    this.atual = null;
    this.ditos.push(f.text);
    f.onend?.({});
    this.comecar();
  }
  /** fala tudo o que estiver na fila, até `limite` falas */
  falarTudo(limite = 200) {
    this.comecar();
    for (let k = 0; k < limite && this.atual; k++) this.terminar();
  }
  cancel() {
    const todas = [this.atual, ...this.fila].filter((f): f is Fala => !!f);
    this.atual = null;
    this.fila = [];
    for (const f of todas) f.onerror?.({ error: "interrupted" });
  }
  pause() {}
  resume() {}
}

// a questão de teste: o caso com duas frases longas (cada uma vira um pedaço), um comando e duas alternativas
const LEITURA: LeituraDaQuestao = {
  caso:
    "Tício foi denunciado pelo Ministério Público por furto qualificado praticado em concurso de pessoas durante a madrugada. " +
    "A sentença\no condenou a dois anos de reclusão, em regime aberto, e o réu recorreu no prazo legal, pedindo a absolvição.",
  comando: "Qual peça processual cabível contra a sentença e qual o fundamento legal correto?",
  alternativas: ["Apelação", "Memoriais"],
};
const CASO = LEITURA.caso;
const COMANDO = LEITURA.comando;

// os pedaços de cada parte, como o Locutor os corta (o caso tem dois; o comando e cada alternativa, um)
const pecasCaso = pecasDoTexto(CASO, "texto");
const pecasComando = pecasDoTexto(COMANDO, "texto");

const g = globalThis as unknown as Record<string, unknown>;

describe("Locutor: partes da questão e trechos lidos", () => {
  let sintese: SinteseFalsa;
  let locutor: Locutor | null;
  let aoTrecho: ReturnType<typeof vi.fn<(t: TrechoLido | null) => void>>;
  let aoFim: ReturnType<typeof vi.fn<() => void>>;
  let criouWindow = false;

  beforeEach(() => {
    vi.useFakeTimers();
    zerarVez();
    if (typeof g.window === "undefined") {
      g.window = globalThis;
      criouWindow = true;
    }
    sintese = new SinteseFalsa();
    g.speechSynthesis = sintese;
    g.SpeechSynthesisUtterance = class {
      text: string;
      lang = "";
      voice: unknown = null;
      rate = 1;
      pitch = 1;
      volume = 1;
      onstart: unknown = null;
      onend: unknown = null;
      onerror: unknown = null;
      constructor(t: string) {
        this.text = t;
      }
    };
    aoTrecho = vi.fn<(t: TrechoLido | null) => void>();
    aoFim = vi.fn<() => void>();
    locutor = new Locutor(() => {}, aoTrecho);
  });

  afterEach(() => {
    locutor?.fechar();
    locutor = null;
    vi.useRealTimers();
    delete g.speechSynthesis;
    delete g.SpeechSynthesisUtterance;
    if (criouWindow) delete g.window;
    criouWindow = false;
  });

  /** Espera a fila da voz (o Narrador espera 120 ms quando já havia fala) e começa a primeira fala da fila. */
  const comecarDepois = () => {
    vi.advanceTimersByTime(200);
    sintese.comecar();
  };
  /** O último trecho que o Locutor anunciou. */
  const ultimo = () => aoTrecho.mock.calls.at(-1)?.[0];
  /** A parte e a faixa de um pedaço da questão, como o Locutor as anuncia. */
  const trechoDe = (parte: string, p: { ini: number; fim: number }): TrechoLido => ({ parte, faixa: { ini: p.ini, fim: p.fim } });
  /** Os pedaços de todas as partes, na ordem em que o Locutor os lê. */
  const todosOsPedacos = (partes: ParteLida[]) => partes.flatMap((p) => pecasDoTexto(p.texto, "texto").map((pc) => ({ parte: p.parte, pc })));

  it("partesDaQuestao dá o caso, o comando e cada alternativa com o nome falado da letra", () => {
    expect(partesDaQuestao(LEITURA)).toEqual([
      { texto: CASO, parte: "caso", naTela: true },
      { texto: COMANDO, parte: "comando", naTela: true },
      { texto: "Letra á: Apelação", parte: "alt0" },
      { texto: "Letra bê: Memoriais", parte: "alt1" },
    ]);
  });

  it("partesDaQuestao deixa o caso de fora quando ele está vazio, e com 'alternativas' só traz as alternativas", () => {
    expect(partesDaQuestao({ ...LEITURA, caso: "" })).toEqual([
      { texto: COMANDO, parte: "comando", naTela: true },
      { texto: "Letra á: Apelação", parte: "alt0" },
      { texto: "Letra bê: Memoriais", parte: "alt1" },
    ]);
    expect(partesDaQuestao(LEITURA, "alternativas")).toEqual([
      { texto: "Letra á: Apelação", parte: "alt0" },
      { texto: "Letra bê: Memoriais", parte: "alt1" },
    ]);
  });

  it("textosDaQuestao devolve só os textos, sem as partes", () => {
    expect(textosDaQuestao(LEITURA)).toEqual([CASO, COMANDO, "Letra á: Apelação", "Letra bê: Memoriais"]);
    expect(textosDaQuestao(LEITURA, "alternativas")).toEqual(["Letra á: Apelação", "Letra bê: Memoriais"]);
  });

  it("ao ler a questão, cada frase avisa a sua parte e a faixa dela no caso; alternativas vêm sem faixa", () => {
    locutor!.ler(partesDaQuestao(LEITURA));
    expect(pecasCaso).toHaveLength(2);

    sintese.comecar();
    expect(aoTrecho).toHaveBeenCalledTimes(1);
    expect(aoTrecho).toHaveBeenNthCalledWith(1, trechoDe("caso", pecasCaso[0]!));
    expect(CASO.slice(pecasCaso[0]!.ini, pecasCaso[0]!.fim)).toMatch(/^Tício foi denunciado/);

    sintese.terminar();
    expect(aoTrecho).toHaveBeenNthCalledWith(2, trechoDe("caso", pecasCaso[1]!));

    sintese.terminar();
    expect(aoTrecho).toHaveBeenNthCalledWith(3, trechoDe("comando", pecasComando[0]!));

    sintese.terminar();
    expect(aoTrecho).toHaveBeenNthCalledWith(4, { parte: "alt0", faixa: null });

    sintese.terminar();
    expect(aoTrecho).toHaveBeenNthCalledWith(5, { parte: "alt1", faixa: null });
  });

  it("posicao() dá a frase que está sendo lida e o total de pedaços; null antes de ler", () => {
    expect(locutor!.posicao()).toBeNull();

    locutor!.ler(partesDaQuestao(LEITURA));
    expect(locutor!.posicao()).toEqual({ k: 0, total: 5 });

    sintese.comecar();
    sintese.terminar();
    expect(locutor!.posicao()).toEqual({ k: 1, total: 5 });
  });

  it("previa(k) dá o começo do pedaço, com os espaços juntos, cortado com '…' e a parte de que ele é", () => {
    locutor!.ler(partesDaQuestao(LEITURA));

    // a primeira frase do caso tem mais de 70 letras: mostra até a última palavra inteira que cabe e termina com reticências
    expect(locutor!.previa(0)).toEqual({
      texto: "Tício foi denunciado pelo Ministério Público por furto qualificado…",
      parte: "caso",
    });
    // a segunda tem a quebra de linha no meio: aparece como um espaço só
    const segunda = locutor!.previa(1);
    expect(segunda?.parte).toBe("caso");
    expect(segunda?.texto).toMatch(/^A sentença o condenou a dois anos/);
    expect(segunda?.texto).not.toContain("\n");
    expect(segunda?.texto.endsWith("…")).toBe(true);

    // o comando também passa de 70 letras: corta do mesmo jeito
    expect(locutor!.previa(2)).toEqual({ texto: "Qual peça processual cabível contra a sentença e qual o fundamento…", parte: "comando" });
    expect(locutor!.previa(99)).toBeNull();
  });

  it("pularParte(1) na primeira frase do caso vai para a primeira frase do comando", () => {
    locutor!.ler(partesDaQuestao(LEITURA));
    sintese.comecar();

    expect(locutor!.pularParte(1)).toBe(true);
    expect(locutor!.posicao()).toEqual({ k: 2, total: 5 });

    comecarDepois();
    expect(ultimo()).toEqual(trechoDe("comando", pecasComando[0]!));
  });

  it("pularParte(-1) na segunda frase do caso vai para a primeira frase do caso", () => {
    locutor!.ler(partesDaQuestao(LEITURA));
    sintese.comecar();
    sintese.terminar();
    expect(locutor!.posicao()).toEqual({ k: 1, total: 5 });

    expect(locutor!.pularParte(-1)).toBe(true);
    expect(locutor!.posicao()).toEqual({ k: 0, total: 5 });

    comecarDepois();
    expect(ultimo()).toEqual(trechoDe("caso", pecasCaso[0]!));
  });

  it("pularParte(-1) na primeira frase do comando vai para a primeira frase do caso", () => {
    locutor!.ler(partesDaQuestao(LEITURA));
    sintese.comecar();
    sintese.terminar();
    sintese.terminar();
    expect(locutor!.posicao()).toEqual({ k: 2, total: 5 });

    expect(locutor!.pularParte(-1)).toBe(true);
    expect(locutor!.posicao()).toEqual({ k: 0, total: 5 });
  });

  it("pularParte(1) na última parte não tem para onde ir", () => {
    locutor!.ler(partesDaQuestao(LEITURA), { aPartirDe: "alt1" });
    expect(locutor!.posicao()).toEqual({ k: 4, total: 5 });

    expect(locutor!.pularParte(1)).toBe(false);
    expect(locutor!.posicao()).toEqual({ k: 4, total: 5 });
  });

  it("irPara(k) continua a leitura a partir da frase k; índice fora da lista dá false", () => {
    locutor!.ler(partesDaQuestao(LEITURA));
    sintese.comecar();

    expect(locutor!.irPara(1)).toBe(true);
    expect(locutor!.posicao()).toEqual({ k: 1, total: 5 });

    comecarDepois();
    expect(ultimo()).toEqual(trechoDe("caso", pecasCaso[1]!));

    expect(locutor!.irPara(5)).toBe(false);
    expect(locutor!.irPara(-1)).toBe(false);
    expect(locutor!.posicao()).toEqual({ k: 1, total: 5 });
  });

  it("ler com aPartirDe 'alt' começa na primeira alternativa", () => {
    const partes = partesDaQuestao(LEITURA);
    const todos = todosOsPedacos(partes);
    const kAlt = todos.findIndex((x) => x.parte === "alt0");
    expect(kAlt).toBeGreaterThan(0);

    locutor!.ler(partes, { aPartirDe: "alt" });
    expect(locutor!.posicao()).toEqual({ k: kAlt, total: todos.length });

    comecarDepois();
    expect(aoTrecho).toHaveBeenCalledTimes(1);
    expect(aoTrecho).toHaveBeenNthCalledWith(1, { parte: "alt0", faixa: null });
  });

  it("parar() avisa aoTrecho(null) e não chama aoFim", () => {
    locutor!.ler(partesDaQuestao(LEITURA), { aoFim });
    sintese.comecar();
    expect(ultimo()).toEqual(trechoDe("caso", pecasCaso[0]!));

    locutor!.parar();
    expect(aoTrecho).toHaveBeenLastCalledWith(null);
    expect(locutor!.posicao()).toBeNull();
    expect(aoFim).not.toHaveBeenCalled();
  });

  it("chegar ao fim da lista avisa aoTrecho(null) e chama aoFim uma vez", () => {
    const partes = partesDaQuestao(LEITURA);
    locutor!.ler(partes, { aoFim });

    sintese.falarTudo();
    expect(sintese.ditos).toHaveLength(todosOsPedacos(partes).length);
    expect(ultimo()).toBeNull();
    expect(aoFim).toHaveBeenCalledTimes(1);
  });

  it("textos simples (sem parte, como a ajuda) são lidos e avisam aoTrecho(null)", () => {
    locutor!.ler(["Ajuda: diga próxima para avançar.", "Outra dica da ajuda."], { aoFim });

    sintese.falarTudo();
    expect(sintese.ditos.length).toBeGreaterThan(0);
    expect(aoTrecho.mock.calls.length).toBeGreaterThan(0);
    for (const [trecho] of aoTrecho.mock.calls) expect(trecho).toBeNull();
    expect(aoFim).toHaveBeenCalledTimes(1);
  });
});
