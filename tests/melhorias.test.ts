import { describe, expect, it } from "vitest";
import {
  CHANCE_LIBERDADE,
  CHANCE_RENASCER,
  chancesLiberdade,
  empurraoPterossauro,
  valorForca,
  CARGA_BASE,
  chanceRachadaExtra,
  chanceVidaNaRachada,
  chave,
  duracaoPoder,
  ESPECIFICACOES,
  fatorGravidade,
  fatorImpulso,
  fatorMundo,
  fatorXp,
  type IdTrilha,
  NIVEL_MAX,
  nivel,
  nivelVidasFrageis,
  type Niveis,
  PRECOS_NIVEL,
  pesoNoOrbe,
  PROTECAO_VIDA,
  protecaoVida,
  ressacaDe,
  segundosCarga,
  TETO_RACHADA_EXTRA,
  trilhasDoPoder,
} from "../src/games/flap-suitcase/melhorias";
import { MOTIVOS } from "../src/games/flap-suitcase/motivos";
import { PODERES, poderPorId, type Poder } from "../src/games/flap-suitcase/powers";

const TRILHAS: IdTrilha[] = ["duracao", "forca", "recarga", "frequencia", "efeito"];

/** Níveis com uma só trilha de um poder. */
const niveisDe = (id: string, trilha: IdTrilha, n: number): Niveis => ({ [chave(id, trilha)]: n });

/** A trilha pelo id, para não depender da posição na lista. */
const trilhaDe = (p: Poder, id: IdTrilha) => {
  const t = trilhasDoPoder(p).find((x) => x.id === id);
  if (!t) throw new Error(`${p.id} sem a trilha ${id}`);
  return t;
};

describe("melhorias: preços e nível máximo", () => {
  it("os preços são 150, 300, 600, 1200 e 2400 por nível", () => {
    expect(PRECOS_NIVEL).toEqual([150, 300, 600, 1200, 2400]);
  });

  it("o nível máximo é 5", () => {
    expect(NIVEL_MAX).toBe(5);
  });
});

describe("melhorias: trilhas dos poderes", () => {
  it("todo poder tem especificação", () => {
    for (const p of PODERES) expect(ESPECIFICACOES[p.id], p.id).toBeDefined();
  });

  it("cada poder tem as 4 trilhas na ordem: principal, recarga ou frequência, efeito e visual", () => {
    for (const p of PODERES) {
      const segunda = p.personagem ? "recarga" : "frequencia";
      expect(
        trilhasDoPoder(p).map((t) => t.id),
        p.id,
      ).toEqual([ESPECIFICACOES[p.id].principal, segunda, "efeito", "visual"]);
    }
  });

  it("cada trilha tem NIVEL_MAX + 1 níveis, todos com ganho em texto não vazio", () => {
    for (const p of PODERES) {
      for (const t of trilhasDoPoder(p)) {
        expect(t.niveis, `${p.id}/${t.id}`).toHaveLength(NIVEL_MAX + 1);
        for (const n of t.niveis) {
          expect(typeof n.ganho, `${p.id}/${t.id}`).toBe("string");
          expect(n.ganho.length, `${p.id}/${t.id}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("o contrapeso é vazio no nível 0 e preenchido do 1 ao 5 na principal e no efeito", () => {
    for (const p of PODERES) {
      for (const id of [ESPECIFICACOES[p.id].principal, "efeito"] as const) {
        const t = trilhaDe(p, id);
        expect(t.niveis[0]?.contrapeso, `${p.id}/${id}`).toBe("");
        for (let n = 1; n <= NIVEL_MAX; n++) {
          expect(t.niveis[n]?.contrapeso.length, `${p.id}/${id}/${n}`).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe("melhorias: nível 0 mantém o jogo de hoje", () => {
  it("a duração de cada poder sem melhorias é a duração original", () => {
    for (const p of PODERES) expect(duracaoPoder(p, {}), p.id).toBe(p.duracao);
  });

  it("a barra do poder próprio sem melhorias são 15 s", () => {
    expect(CARGA_BASE).toBe(15);
    for (const p of PODERES) expect(segundosCarga(p.id, {}), p.id).toBe(CARGA_BASE);
  });

  it("os fatores sem melhorias valem 1", () => {
    const ativos = ["escudo", "ima", "dosimetria"];
    expect(fatorMundo(ativos, {})).toBe(1);
    expect(fatorGravidade(ativos, {})).toBe(1);
    expect(fatorImpulso(ativos, {})).toBe(1);
    expect(fatorXp(ativos, {})).toBe(1);
  });

  it("sem melhorias não há chance extra de coluna rachada", () => {
    expect(chanceRachadaExtra(["presuncao"], {}, "defensor")).toBe(0);
  });

  it("a proteção depois de perder vida é 1,5 s e não há vida extra na rachada", () => {
    expect(PROTECAO_VIDA).toBe(1.5);
    expect(protecaoVida(0)).toBeCloseTo(PROTECAO_VIDA);
    expect(chanceVidaNaRachada(0)).toBeCloseTo(0);
  });

  it("sem melhorias o peso no orbe é 1 e não há ressaca", () => {
    expect(pesoNoOrbe("escudo", {})).toBeCloseTo(1);
    expect(ressacaDe("lento", {})).toBeNull();
  });
});

describe("melhorias: ganho e contrapeso crescem juntos", () => {
  const comDuracao = PODERES.filter((p) => ESPECIFICACOES[p.id].principal === "duracao");

  it("a duração cresce a cada nível em todo poder de Duração", () => {
    for (const p of comDuracao) {
      for (let n = 1; n <= NIVEL_MAX; n++) {
        expect(duracaoPoder(p, niveisDe(p.id, "duracao", n)), `${p.id} nível ${n}`).toBeGreaterThan(
          duracaoPoder(p, niveisDe(p.id, "duracao", n - 1)),
        );
      }
    }
  });

  it("o Habeas Corpus no nível 5 dura 18 s", () => {
    expect(duracaoPoder(poderPorId("escudo"), niveisDe("escudo", "duracao", 5))).toBeCloseTo(18);
  });

  it("o mundo fica mais lento a cada nível do Vade Mecum", () => {
    for (let n = 1; n <= NIVEL_MAX; n++) {
      expect(fatorMundo(["ima"], { "ima:duracao": n })).toBeGreaterThan(fatorMundo(["ima"], { "ima:duracao": n - 1 }));
    }
  });

  it("a barra do Inquérito cresce a cada nível", () => {
    for (let n = 1; n <= NIVEL_MAX; n++) {
      expect(segundosCarga("inquerito", { "inquerito:duracao": n })).toBeGreaterThan(
        segundosCarga("inquerito", { "inquerito:duracao": n - 1 }),
      );
    }
  });
});

describe("melhorias: limites", () => {
  it("o nível nunca passa de 5", () => {
    expect(nivel({ "escudo:duracao": 9 }, "escudo", "duracao")).toBe(5);
  });

  it("nível negativo ou NaN vira 0", () => {
    expect(nivel({ "escudo:duracao": -3 }, "escudo", "duracao")).toBe(0);
    expect(nivel({ "escudo:duracao": Number.NaN }, "escudo", "duracao")).toBe(0);
  });

  it("a barra nunca fica abaixo de 10 s", () => {
    expect(segundosCarga("equilibrio", { "equilibrio:recarga": 5 })).toBeCloseTo(10);
    expect(segundosCarga("equilibrio", { "equilibrio:recarga": 9 })).toBeCloseTo(10);
  });

  it("a proteção depois de perder vida nunca fica abaixo de 0,75 s", () => {
    expect(protecaoVida(5)).toBeCloseTo(0.75);
    expect(protecaoVida(9)).toBeCloseTo(0.75);
  });

  it("as vidas frágeis somam o maior nível, não a soma", () => {
    const niveis = { "revisao:forca": 2, "renascer:forca": 4 };
    expect(nivelVidasFrageis(niveis, "renascer")).toBe(4);
    expect(nivelVidasFrageis(niveis, undefined)).toBe(2);
  });

  it("a chance extra de coluna rachada nunca passa do teto de 0,15", () => {
    const ids = PODERES.map((p) => p.id);
    const todos: Niveis = {};
    for (const id of ids) for (const t of TRILHAS) todos[chave(id, t)] = NIVEL_MAX;

    const chance = chanceRachadaExtra(ids, todos, "defensor", 0.1);
    expect(chance).toBeLessThanOrEqual(TETO_RACHADA_EXTRA);
    expect(chance).toBeCloseTo(0.15);
  });
});

describe("Renascer (Fênixame): chance de vida extra", () => {
  it("começa em 30% e sobe com a Força até 100% no nível 5", () => {
    const forca = trilhasDoPoder(poderPorId("renascer"))[0]!;
    expect(forca.id).toBe("forca");
    expect(CHANCE_RENASCER).toBeCloseTo(0.3);
    expect(forca.niveis[0]!.ganho).toBe("30% de chance de ganhar uma vida extra");
    expect(forca.niveis[5]!.ganho).toBe("100% de chance de ganhar uma vida extra");
    expect(CHANCE_RENASCER + valorForca({ "renascer:forca": 5 }, "renascer")).toBeCloseTo(1);
  });
});

describe("Visual: o motivo de cada poder", () => {
  it("todo poder tem um motivo próprio, e os níveis do Visual dizem qual é", () => {
    for (const p of PODERES) {
      const m = MOTIVOS[p.id];
      expect(m, p.id).toBeDefined();
      expect(m.cores).toHaveLength(2);
      const visual = trilhasDoPoder(p)[3]!;
      expect(visual.id).toBe("visual");
      expect(visual.niveis[2]!.ganho.toLowerCase()).toContain(m.nome.toLowerCase());
      expect(visual.niveis[3]!.ganho).toContain(m.nome);
    }
  });
  it("os poderes dos personagens com símbolo no desenho usam esse símbolo", () => {
    expect(MOTIVOS.renascer.forma).toBe("chama");
    expect(MOTIVOS.tesouro.forma).toBe("moeda");
    expect(MOTIVOS.tipificacao.forma).toBe("paragrafo");
    expect(MOTIVOS.galope.forma).toBe("ferradura");
  });
});

describe("Liberdade (Harpia Corpus): vida por chance", () => {
  it("sem melhorias, 50% de chance de uma vida e nenhuma de duas", () => {
    expect(CHANCE_LIBERDADE).toBeCloseTo(0.5);
    expect(chancesLiberdade(0)).toEqual({ uma: 0.5, outra: 0 });
  });
  it("no nível máximo, a vida é certa e há 20% de chance de mais uma", () => {
    const c = chancesLiberdade(5);
    expect(c.uma).toBeCloseTo(1);
    expect(c.outra).toBeCloseTo(0.2);
  });
  it("as chances só sobem com o nível, e a da vida nunca passa de 100%", () => {
    for (let n = 1; n <= 5; n++) {
      expect(chancesLiberdade(n).uma).toBeGreaterThan(chancesLiberdade(n - 1).uma);
      expect(chancesLiberdade(n).outra).toBeGreaterThan(chancesLiberdade(n - 1).outra);
      expect(chancesLiberdade(n).uma).toBeLessThanOrEqual(1);
    }
  });
  it("o texto da Força diz as duas chances", () => {
    const forca = trilhasDoPoder(poderPorId("liberdade"))[0]!;
    expect(forca.niveis[0]!.ganho).toBe("50% de chance de uma vida extra");
    expect(forca.niveis[5]!.ganho).toBe("100% de chance de uma vida, e 20% de mais uma");
  });
});

describe("Prescritodáctilo: o empurrão da batida", () => {
  it("dura mais e afasta mais a cada nível do Rasante", () => {
    expect(empurraoPterossauro(0)).toEqual({ segundos: 0.4, extra: 24 });
    const max = empurraoPterossauro(5);
    expect(max.segundos).toBeCloseTo(0.9);
    expect(max.extra).toBe(44);
  });
});

