import { describe, expect, it } from "vitest";
import { aplicarNomes, comNomes } from "../src/quiz/nomes.ts";
import { gerarPergunta, perguntaPorId } from "../src/quiz/banco.ts";
import { textoParaCopiar, textoResposta } from "../src/quiz/copiar.ts";
import { GERADORES } from "../src/quiz/geradores/index.ts";
import { maximoTreino } from "../src/quiz/pontuacao.ts";
import {
  chaveDoModo,
  guardarRodada,
  juntarRecordes,
  linhasDaSessao,
  maximoDaChave,
  melhorSequencia,
  ordemDasChaves,
  registrarSessao,
  rotuloDaChave,
  sessoesUsadas,
  type Recordes,
  type Rodada,
  type RodadaGuardada,
  type SessaoGuardada,
} from "../src/quiz/recordes.ts";
import type { CorrecaoTese, Correcao } from "../src/quiz/verificar.ts";
import type { Pergunta } from "../src/quiz/types.ts";

const itens = (await import("../src/content/generated/perguntas-itens.json")).default as unknown as Pergunta[];

/** Uma rodada guardada com o acerto e os pontos dados. */
function rodada(acertou: boolean, pontos: number): RodadaGuardada {
  const correcao: Correcao = { formato: "objetiva", acertou, escolhida: "A", correta: acertou ? "A" : "B" };
  return {
    id: "q",
    titulo: "Fonte",
    categoria: "peca",
    nivel: 1,
    acertou,
    segundos: 5,
    pontos,
    comando: "c",
    alternativas: [],
    correcao,
  };
}

/** Uma sessão guardada com as rodadas de [acertou, pontos]. */
function sessao(id: string, pares: [boolean, number][], chave = "2", fim = 1000): SessaoGuardada {
  return {
    v: 1,
    id,
    chave,
    automatico: false,
    tamanho: 10,
    nivel: 2,
    inicio: 0,
    fim,
    strikes: 0,
    rodadas: pares.map(([a, p]) => rodada(a, p)),
  };
}

describe("chaveDoModo", () => {
  it("o Eu escolho com 10 questões é só o nível; com outra quantidade, nível e quantidade", () => {
    expect(chaveDoModo({ automatico: false, tamanho: 10, nivel: 2 })).toBe("2");
    expect(chaveDoModo({ automatico: false, tamanho: 20, nivel: 3 })).toBe("3:20");
  });
  it("o automático traz a quantidade; o infinito, a palavra", () => {
    expect(chaveDoModo({ automatico: true, tamanho: 20, nivel: 1 })).toBe("auto:20");
    expect(chaveDoModo({ automatico: true, tamanho: "infinito", nivel: 3 })).toBe("auto:infinito");
    expect(chaveDoModo({ automatico: false, tamanho: "infinito", nivel: 2 })).toBe("infinito");
  });
});

describe("rotuloDaChave", () => {
  it("nomeia cada chave do modo", () => {
    expect(rotuloDaChave("2")).toBe("Médio · 10 questões");
    expect(rotuloDaChave("3:20")).toBe("Difícil · 20 questões");
    expect(rotuloDaChave("auto:20")).toBe("Modo automático · 20 questões");
    expect(rotuloDaChave("auto:infinito")).toBe("Modo automático · infinito");
    expect(rotuloDaChave("infinito")).toBe("Modo infinito");
  });
});

describe("maximoDaChave", () => {
  it("dá o máximo do Eu escolho com quantidade fixa e null nos outros", () => {
    expect(maximoDaChave("2")).toBe(maximoTreino(2, 10));
    expect(maximoDaChave("3:20")).toBe(maximoTreino(3, 20));
    expect(maximoDaChave("auto:20")).toBeNull();
    expect(maximoDaChave("auto:infinito")).toBeNull();
    expect(maximoDaChave("infinito")).toBeNull();
  });
});

describe("ordemDasChaves", () => {
  it("põe o automático e o infinito primeiro, depois cada nível das menores quantidades às maiores", () => {
    const chaves = ["3:20", "1", "infinito", "auto:10", "auto:infinito", "2", "1:50", "auto:50"];
    expect([...chaves].sort(ordemDasChaves)).toEqual(["auto:infinito", "auto:10", "auto:50", "infinito", "1", "1:50", "2", "3:20"]);
  });
});

describe("melhorSequencia", () => {
  it("é zero sem rodadas", () => {
    expect(melhorSequencia([])).toBe(0);
  });
  it("conta a maior série de acertos seguidos", () => {
    const acertos = [true, true, false, true, true, true, false].map((acertou) => ({ acertou }));
    expect(melhorSequencia(acertos)).toBe(3);
  });
});

describe("juntarRecordes", () => {
  it("só com os recordes de antes, guarda os pontos e deixa de fora o zero e o que não é número", () => {
    const r = juntarRecordes({ "2": 900, "3:20": 0, x: "a" }, {});
    expect(r).toEqual({ modos: { "2": { pontos: 900 } } });
    expect(r).not.toHaveProperty("sequencia");
  });
  it("na mesma chave, fica o novo no empate e no maior; o antigo, quando ele é o maior", () => {
    const novo1 = { pontos: 500, questoes: 10, sessao: "a" };
    const r = juntarRecordes(
      { "1": 500, "2": 700 },
      { modos: { "1": novo1, "2": { pontos: 600, sessao: "b" } } },
    ) as Recordes;
    expect(r.modos["1"]).toBe(novo1);
    expect(r.modos["1"]).toEqual({ pontos: 500, questoes: 10, sessao: "a" });
    expect(r.modos["2"]).toEqual({ pontos: 700 });
  });
  it("dados inválidos não lançam erro e dão só modos vazios", () => {
    expect(juntarRecordes(null, null)).toEqual({ modos: {} });
    expect(juntarRecordes("x", "x")).toEqual({ modos: {} });
    expect(juntarRecordes(null, { modos: 3, sequencia: { seguidos: "x" } })).toEqual({ modos: {} });
  });
  it("mantém uma sequência válida", () => {
    const seq = { seguidos: 5, chave: "auto:infinito", quando: 1, sessao: "s" };
    expect(juntarRecordes({}, { sequencia: seq })).toEqual({ modos: {}, sequencia: seq });
  });
});

describe("registrarSessao", () => {
  const vazio: Recordes = { modos: {} };

  it("sem recordes, a sessão com pontos vira o recorde da chave e da sequência", () => {
    const s = sessao("s1", [
      [true, 100],
      [true, 80],
      [false, 0],
      [true, 60],
    ]);
    const r = registrarSessao(vazio, s, true);
    expect(r.pontos).toBe(true);
    expect(r.sequencia).toBe(true);
    expect(r.recordes.modos["2"]).toEqual({ pontos: 240, questoes: 4, acertos: 3, quando: 1000, sessao: "s1" });
    expect(r.recordes.sequencia).toEqual({ seguidos: 2, chave: "2", quando: 1000, sessao: "s1" });
  });

  it("uma sessão com menos pontos que o recorde não o troca", () => {
    const antes: Recordes = { modos: { "2": { pontos: 500, sessao: "velha" } } };
    const r = registrarSessao(antes, sessao("s2", [[true, 100]]), true);
    expect(r.pontos).toBe(false);
    expect(r.recordes.modos).toEqual(antes.modos);
  });

  it("um empate não bate o recorde: fica o mais antigo", () => {
    const antes: Recordes = { modos: { "2": { pontos: 200, sessao: "velha", quando: 5 } } };
    const r = registrarSessao(antes, sessao("nova", [[true, 200]]), true);
    expect(r.pontos).toBe(false);
    expect(r.recordes.modos["2"]).toEqual({ pontos: 200, sessao: "velha", quando: 5 });
  });

  it("com contaPontos falso, não bate o recorde de pontos, mas pode bater a sequência", () => {
    const r = registrarSessao(vazio, sessao("s3", [[true, 300], [true, 300]]), false);
    expect(r.pontos).toBe(false);
    expect(r.sequencia).toBe(true);
    expect(r.recordes.modos).toEqual({});
    expect(r.recordes.sequencia).toEqual({ seguidos: 2, chave: "2", quando: 1000, sessao: "s3" });
  });

  it("a sessão dona do recorde o atualiza mesmo sem mais pontos (uma resposta errada a mais)", () => {
    const antes = registrarSessao(vazio, sessao("dona", [[true, 100], [true, 100]], "infinito"), true).recordes;
    const depois = registrarSessao(antes, sessao("dona", [[true, 100], [true, 100], [false, 0]], "infinito"), true);
    expect(depois.pontos).toBe(true);
    expect(depois.recordes.modos["infinito"]).toEqual({ pontos: 200, questoes: 3, acertos: 2, quando: 1000, sessao: "dona" });
  });

  it("uma sessão só de erros não leva nada e não cria sequência", () => {
    const r = registrarSessao(vazio, sessao("erro", [[false, 0], [false, 0]]), true);
    expect(r.pontos).toBe(false);
    expect(r.sequencia).toBe(false);
    expect(r.recordes).toEqual({ modos: {} });
    expect(r.recordes).not.toHaveProperty("sequencia");
  });

  it("uma sequência de outra sessão, maior, é mantida", () => {
    const seq = { seguidos: 9, chave: "auto:20", quando: 1, sessao: "outra" };
    const r = registrarSessao({ modos: {}, sequencia: seq }, sessao("s4", [[true, 50], [true, 50]]), true);
    expect(r.sequencia).toBe(false);
    expect(r.recordes.sequencia).toEqual(seq);
  });
});

describe("sessoesUsadas", () => {
  it("junta as sessões dos modos e da sequência, sem os registros que não têm sessão", () => {
    const r: Recordes = {
      modos: {
        "2": { pontos: 1, sessao: "a" },
        "1": { pontos: 2 },
        infinito: { pontos: 3, sessao: "b" },
      },
      sequencia: { seguidos: 4, chave: "2", quando: 1, sessao: "c" },
    };
    expect(sessoesUsadas(r)).toEqual(new Set(["a", "b", "c"]));
  });
  it("sem registros com sessão, é vazio", () => {
    expect(sessoesUsadas({ modos: { "1": { pontos: 1 } } })).toEqual(new Set());
  });
});

describe("treino: a questão guardada e refeita", () => {
  // uma questão do acervo com pessoas (marcas {p1}…), sorteada com os nomes em ordem fixa
  const q = itens.find((p) => p.pessoas?.length)!;
  const named = comNomes(q, () => 0.5);

  const correcao: CorrecaoTese = {
    formato: "tese",
    acertou: false,
    acertouTese: null,
    acertouArtigo: null,
    teseEsperada: "Desclassificação para furto simples",
    artigoEsperado: "art. 419 CPP",
    respondida: { artigos: [] },
  };

  const rodadaDoTreino = (): Rodada => ({
    pergunta: named,
    nivel: 2,
    acertou: false,
    segundos: 12.345,
    pontos: 0,
    revisao: { comando: named.comando, alternativas: [], copia: "ignored", correcao },
  });

  it("com pessoas, os nomes sorteados ficam em nomes e não sobra marca", () => {
    expect(Array.isArray(named.nomes)).toBe(true);
    expect(named.nomes).toHaveLength(q.pessoas!.length);
    expect(JSON.stringify(named)).not.toMatch(/\{p\d+\}/);
  });

  it("refazer a questão com os mesmos nomes dá a mesma questão", () => {
    expect(perguntaPorId(q.id, named.nomes)).toEqual(named);
    expect(aplicarNomes(q, named.nomes!)).toEqual(named);
  });

  it("um id que não existe dá null; uma questão gerada é refeita pelo id com a semente", () => {
    expect(perguntaPorId("nao-existe")).toBeNull();
    const id = GERADORES[0]!.id;
    expect(perguntaPorId(`${id}:123`)).toEqual(gerarPergunta(id, 123));
  });

  it("a rodada guardada leva o id, os nomes e os segundos arredondados, e não o texto da questão", () => {
    const guardada = guardarRodada(rodadaDoTreino());
    expect(guardada.id).toBe(named.id);
    expect(guardada.nomes).toEqual(named.nomes);
    expect(guardada.segundos).toBe(12.3);
    expect(JSON.stringify(guardada).length).toBeLessThan(JSON.stringify(named).length);
    expect(JSON.stringify(guardada)).not.toContain(named.caso);
  });

  it("a linha da página final refaz a questão e a cópia com a resposta", () => {
    const guardada = guardarRodada(rodadaDoTreino());
    const s = sessao("treino", []);
    s.rodadas = [guardada];
    const [linha] = linhasDaSessao(s, perguntaPorId);
    expect(linha!.pergunta).toEqual(named);
    expect(linha!.revisao!.copia).toBe(textoParaCopiar(named, 2, named.comando, [], [], textoResposta(named, correcao)));
    expect(linha!.titulo).toBe(guardada.titulo);
    expect(linha!.categoria).toBe(guardada.categoria);
    expect(linha!.acertou).toBe(false);
  });

  it("sem a questão (saiu do acervo), a linha fica com pergunta e revisão nulas, e mantém título, pontos e acerto", () => {
    const guardada: RodadaGuardada = { ...guardarRodada(rodadaDoTreino()), acertou: true, pontos: 120 };
    const s = sessao("sumida", []);
    s.rodadas = [guardada];
    const [linha] = linhasDaSessao(s, () => null);
    expect(linha!.pergunta).toBeNull();
    expect(linha!.revisao).toBeNull();
    expect(linha!.titulo).toBe(guardada.titulo);
    expect(linha!.pontos).toBe(120);
    expect(linha!.acertou).toBe(true);
  });
});
