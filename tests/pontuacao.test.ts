import { describe, expect, it } from "vitest";
import type { Pergunta } from "../src/quiz/types.ts";
import { FOLGA_SEG, LIMITE_SEG, TAMANHO_TREINO, folgaSeg, janelaSeg, maximoTreino, palavrasDaQuestao, pontuar } from "../src/quiz/pontuacao.ts";

describe("pontuar", () => {
  it("erro não pontua, qualquer que seja o tempo", () => {
    expect(pontuar(3, false, 0)).toBe(0);
    expect(pontuar(1, false, FOLGA_SEG[1])).toBe(0);
  });
  it("acerto instantâneo vale o máximo do nível", () => {
    expect(pontuar(1, true, 0)).toBe(100);
    expect(pontuar(2, true, 0)).toBe(150);
    expect(pontuar(3, true, 0)).toBe(200);
  });
  it("até a folga do nível, a rapidez vale inteira", () => {
    expect(pontuar(1, true, FOLGA_SEG[1])).toBe(100);
    expect(pontuar(2, true, FOLGA_SEG[2])).toBe(150);
    expect(pontuar(3, true, FOLGA_SEG[3])).toBe(200);
  });
  it("logo após a folga, o bônus começa a cair", () => {
    expect(pontuar(1, true, FOLGA_SEG[1] + 1)).toBe(99);
    expect(pontuar(2, true, FOLGA_SEG[2] + 1)).toBe(149);
    expect(pontuar(3, true, FOLGA_SEG[3] + 1)).toBe(199);
  });
  it("em folga + limite, só os 60 pontos base (vezes o multiplicador)", () => {
    expect(pontuar(1, true, FOLGA_SEG[1] + LIMITE_SEG[1])).toBe(60);
    expect(pontuar(2, true, FOLGA_SEG[2] + LIMITE_SEG[2])).toBe(90);
    expect(pontuar(3, true, FOLGA_SEG[3] + LIMITE_SEG[3])).toBe(120);
  });
  it("depois do fim da folga + limite, continua nos 60 base", () => {
    expect(pontuar(1, true, 100)).toBe(60);
    expect(pontuar(2, true, 500)).toBe(90);
    expect(pontuar(3, true, LIMITE_SEG[3] * 2)).toBe(120);
  });
  it("rapidez pesa menos que acertar", () => {
    expect(pontuar(2, true, 60)).toBeGreaterThan(pontuar(2, false, 0));
    expect(pontuar(2, true, 10)).toBeGreaterThan(pontuar(2, true, 60));
  });
  it("máximo do treino cresce com o nível", () => {
    expect(maximoTreino(1)).toBe(1000);
    expect(maximoTreino(3)).toBe(2000);
  });
  it("máximo do treino usa o tamanho padrão quando não informado", () => {
    expect(maximoTreino(2)).toBe(maximoTreino(2, TAMANHO_TREINO));
  });
  it("máximo do treino acompanha o número de perguntas", () => {
    expect(maximoTreino(2, 20)).toBe(3000);
  });
});

/** Texto com n palavras, para montar questões de tamanho conhecido. */
const palavras = (n: number) => Array(n).fill("palavra").join(" ");

describe("folga e janela pelo tamanho da questão", () => {
  it("peça curta: a folga é a base do nível e a janela, o limite do formato", () => {
    // 20 + 8 palavras do texto, mais 12 dos quatro nomes de peça no fácil: 40 / 4 = 10 < 13
    const p = { formato: "peca", caso: palavras(20), comando: palavras(8) } as Pergunta;
    expect(palavrasDaQuestao(p, 1)).toBe(40);
    expect(folgaSeg(p, 1)).toBe(13);
    expect(janelaSeg(p, 1)).toBe(LIMITE_SEG[1]);
  });
  it("questão longa: a folga cresce a uma palavra por quarto de segundo, e a janela iguala a folga", () => {
    const p = { formato: "peca", caso: palavras(400), comando: palavras(8) } as Pergunta;
    expect(folgaSeg(p, 1)).toBe(Math.ceil((400 + 8 + 12) / 4));
    expect(janelaSeg(p, 1)).toBe(folgaSeg(p, 1));
  });
  it("com a folga longa, a rapidez vale inteira até ela e zera depois da janela", () => {
    const p = { formato: "peca", caso: palavras(400), comando: palavras(8) } as Pergunta;
    const folga = folgaSeg(p, 1);
    const janela = janelaSeg(p, 1);
    expect(pontuar(1, true, folga, janela, folga)).toBe(100);
    expect(pontuar(1, true, folga + janela, janela, folga)).toBe(60);
  });
  it("objetiva conta as quatro alternativas, em qualquer nível", () => {
    const p = {
      formato: "objetiva",
      caso: "um dois três",
      comando: "qual é a correta?",
      alternativas: { A: "um dois três", B: "quatro", C: "cinco seis", D: "sete oito nove dez" },
    } as Pergunta;
    // 3 + 4 do texto, mais 3 + 1 + 2 + 4 das alternativas
    expect(palavrasDaQuestao(p, 1)).toBe(17);
    expect(palavrasDaQuestao(p, 3)).toBe(17);
  });
});
