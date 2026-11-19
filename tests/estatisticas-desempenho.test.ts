import { describe, expect, it } from "vitest";
import type { ResultadoExame } from "../src/lib/correcao/grader";
import { calendario, melhoresPorExame, resumirTentativa, resumoSimulados, resumoTreino, secaoDoItem, sugerirSimulado, type ResumoTentativa } from "../src/lib/estatisticas/desempenho";
import type { ExameEstat } from "../src/lib/estatisticas/tipos";
import type { Atividade } from "../src/lib/atividade";
import type { Evento } from "../src/lib/erros";

const ex = (o: Partial<ExameEstat> & { id: string; ordem: number }): ExameEstat => ({
  numero: o.ordem,
  numeral: String(o.ordem),
  titulo: `${o.ordem} Exame`,
  apelido: null,
  ano: null,
  anoEstimado: false,
  data: null,
  quando: null,
  era: "fgv",
  variante: null,
  pecas: ["apelacao"],
  pecaNaProva: null,
  noSite: true,
  corrigivel: true,
  preliminar: false,
  questoes: 4,
  links: {},
  teses: { peca: [], questoes: [] },
  ...o,
});

/** Uma tentativa mínima: a peça vale 5 (4 obtidos), duas questões de 1,25, e a nota total dada. */
const tentativa = (criadaEm: number, total: number, peca: { obtido: number; obtidoBruto: number } = { obtido: 4, obtidoBruto: 4 }) => ({
  id: `t${criadaEm}`,
  exameId: "45",
  criadaEm,
  duracaoSeg: 3600,
  resultado: {
    exameId: "45",
    total,
    maximo: 10,
    aprovado: total >= 6,
    partes: [
      {
        parte: "peca" as const,
        titulo: "Peça",
        valor: 5,
        obtido: peca.obtido,
        obtidoBruto: peca.obtidoBruto,
        linhasUsadas: 0,
        itens: [
          { n: "1", secao: "Endereçamento", descricao: "", valor: 1, obtido: 1, componentes: [] },
          { n: "2", secao: "Mérito", descricao: "", valor: 4, obtido: 3, componentes: [] },
        ],
      },
      { parte: "q1" as const, titulo: "Questão 1", valor: 1.25, obtido: 1, obtidoBruto: 1, linhasUsadas: 0, itens: [] },
      { parte: "q2" as const, titulo: "Questão 2", valor: 1.25, obtido: 1, obtidoBruto: 1, linhasUsadas: 0, itens: [] },
    ],
  } satisfies ResultadoExame,
});

/** Um resumo de tentativa com nota e momento escolhidos. */
const resumo = (criadaEm: number, total: number, exameId = "45"): ResumoTentativa => ({
  ...resumirTentativa(tentativa(criadaEm, total)),
  exameId,
});

describe("secaoDoItem", () => {
  it("usa a seção da tabela quando há", () => {
    expect(secaoDoItem("Endereçamento", "")).toBe("enderecamento");
    expect(secaoDoItem("Petição de interposição", "")).toBe("enderecamento");
    expect(secaoDoItem("Preliminares", "")).toBe("preliminares");
    expect(secaoDoItem("MÉRITO", "")).toBe("merito");
    expect(secaoDoItem("Razões de apelação", "")).toBe("merito");
    expect(secaoDoItem("Pedidos:", "")).toBe("pedidos");
    expect(secaoDoItem("Prazo e Fechamento", "")).toBe("fechamento");
    expect(secaoDoItem("Tempestividade", "")).toBe("fechamento");
  });

  it("sem seção, usa a descrição do item", () => {
    expect(secaoDoItem(undefined, "Memoriais endereçados ao Juiz do Tribunal do Júri (0,30).")).toBe("enderecamento");
    expect(secaoDoItem(undefined, "Data: 19/7/2010 (0,40).")).toBe("fechamento");
    expect(secaoDoItem(undefined, "Impronúncia por falta de comprovação da materialidade")).toBe("merito");
    expect(secaoDoItem(undefined, "Pedido de absolvição (0,50)")).toBe("pedidos");
  });

  it("seção com o nome da peça inteira cai na descrição", () => {
    expect(secaoDoItem("RESPOSTA À ACUSAÇÃO", "Endereçamento ao Juízo da Vara Criminal")).toBe("enderecamento");
  });
});

describe("resumirTentativa", () => {
  const r = resumirTentativa(tentativa(1000, 7));

  it("soma a peça e as questões", () => {
    expect(r.peca).toEqual({ o: 4, v: 5 });
    expect(r.questoes).toEqual([
      { o: 1, v: 1.25 },
      { o: 1, v: 1.25 },
    ]);
    expect(r.quando).toBe(1000);
    expect(r.aprovado).toBe(true);
  });

  it("separa os itens da peça por seção", () => {
    expect(r.secoes.enderecamento).toEqual({ o: 1, v: 1 });
    expect(r.secoes.merito).toEqual({ o: 3, v: 4 });
    expect(r.pecaZerada).toBe(false);
  });

  it("peça inadequada zera a nota, mas as seções mostram o que foi acertado", () => {
    const z = resumirTentativa(tentativa(1000, 2, { obtido: 0, obtidoBruto: 4 }));
    expect(z.pecaZerada).toBe(true);
    expect(z.secoes.merito).toEqual({ o: 0, v: 4 });
  });
});

describe("resumoSimulados", () => {
  it("resume as tentativas em ordem de tempo", () => {
    const rs = [resumo(3, 8), resumo(1, 4), resumo(4, 9), resumo(2, 5)];
    const s = resumoSimulados(rs);
    expect(s.n).toBe(4);
    expect(s.aprovados).toBe(2);
    expect(s.media).toBe(6.5);
    expect(s.melhor?.total).toBe(9);
    expect(s.tendencia).toBeCloseTo(3.333, 2);
  });

  it("com menos de 4 tentativas não há tendência", () => {
    const s = resumoSimulados([resumo(1, 4), resumo(2, 5), resumo(3, 8)]);
    expect(s.tendencia).toBeNull();
  });

  it("sem tentativas, zera tudo", () => {
    const s = resumoSimulados([]);
    expect(s.n).toBe(0);
    expect(s.media).toBeNull();
    expect(s.melhor).toBeNull();
  });
});

describe("melhoresPorExame", () => {
  it("guarda a melhor nota de cada exame e quantas vezes fez", () => {
    const m = melhoresPorExame([resumo(1, 5), resumo(2, 8), resumo(3, 6), resumo(4, 3, "44")]);
    expect(m.size).toBe(2);
    expect(m.get("45")).toMatchObject({ total: 8, vezes: 3 });
    expect(m.get("44")?.vezes).toBe(1);
  });
});

describe("resumoTreino", () => {
  const at: Atividade = {
    v: 1,
    dias: {
      "2026-01-01": { a: 2, e: 1, ms: 3000, c: { peca: [2, 1] }, p: { apelacao: [2, 1] } },
      "2026-01-05": { a: 1, e: 1, ms: 1000, c: { peca: [1, 0], objetiva: [0, 1] }, p: {} },
    },
  };

  it("soma todos os dias guardados", () => {
    const r = resumoTreino(at, null);
    expect(r.a).toBe(3);
    expect(r.e).toBe(2);
    expect(r.tempoMedioMs).toBe(800);
    expect(r.porCategoria.peca).toEqual([3, 1]);
    expect(r.porCategoria.objetiva).toEqual([0, 1]);
    expect(r.porPeca.apelacao).toEqual([2, 1]);
  });

  it("soma só desde a data pedida, incluída", () => {
    const r = resumoTreino(at, "2026-01-02");
    expect(r.a).toBe(1);
    expect(r.e).toBe(1);
  });

  it("sem dias, não há tempo médio", () => {
    expect(resumoTreino({ v: 1, dias: {} }, null).tempoMedioMs).toBeNull();
  });
});

describe("calendario", () => {
  const dia = (a: number, e = 0) => ({ a, e, ms: 0, c: {}, p: {} });
  const at: Atividade = {
    v: 1,
    dias: { "2026-01-08": dia(1), "2026-01-09": dia(1), "2026-01-10": dia(1), "2025-12-20": dia(1) },
  };
  const hoje = new Date(2026, 0, 10, 15);

  it("monta semanas de domingo a sábado, da mais antiga para a atual", () => {
    const c = calendario(at, [], [], hoje, 2);
    expect(c.semanas).toHaveLength(2);
    for (const s of c.semanas) expect(s).toHaveLength(7);
    expect(c.semanas[0]![0]!.dia).toBe("2025-12-28");
    expect(c.semanas[1]![6]!.dia).toBe("2026-01-10");
  });

  it("conta a sequência e os dias ativos dentro do período", () => {
    const c = calendario(at, [], [], hoje, 2);
    expect(c.sequenciaAtual).toBe(3);
    expect(c.maiorSequencia).toBe(3);
    expect(c.diasAtivos).toBe(3);
  });

  it("a sequência de ontem vale enquanto hoje não tem estudo", () => {
    const c = calendario(at, [], [], new Date(2026, 0, 11, 15), 2);
    expect(c.sequenciaAtual).toBe(3);
    const ultima = c.semanas[1]!;
    expect(ultima.find((x) => x.dia === "2026-01-11")?.futuro).toBe(false);
    expect(ultima.filter((x) => x.dia > "2026-01-11").every((x) => x.futuro)).toBe(true);
  });

  it("um simulado conta no dia e vale o nível máximo", () => {
    const c = calendario({ v: 1, dias: {} }, [{ quando: new Date(2026, 0, 5, 12).getTime() }], [], hoje, 2);
    const d = c.semanas.flat().find((x) => x.dia === "2026-01-05");
    expect(d).toMatchObject({ simulados: 1, nivel: 4 });
  });

  it("o dia guarda os acertos e os erros da atividade", () => {
    const c = calendario({ v: 1, dias: { "2026-01-10": dia(3, 2) } }, [], [], hoje, 2);
    expect(c.semanas.flat().find((x) => x.dia === "2026-01-10")).toMatchObject({ respostas: 5, acertos: 3, erros: 2 });
  });

  it("as tentativas do dia vêm na ordem do horário, mesmo passadas fora de ordem", () => {
    const tentativas = [
      { quando: new Date(2026, 0, 5, 15).getTime(), id: "t2" },
      { quando: new Date(2026, 0, 5, 9).getTime(), id: "t1" },
    ];
    const c = calendario({ v: 1, dias: {} }, tentativas, [], hoje, 2);
    expect(c.semanas.flat().find((x) => x.dia === "2026-01-05")).toMatchObject({ tentativas: ["t1", "t2"], simulados: 2 });
  });

  it("um dia sem atividade conta acertos e erros pelos eventos de erro; simulado não conta", () => {
    const aoMeioDia = new Date(2026, 0, 6, 12).getTime();
    const eventos: Evento[] = [
      { t: aoMeioDia, o: "quiz", d: "cp", a: "155", r: 0 },
      { t: aoMeioDia + 1000, o: "quiz", d: "cp", a: "155", r: 0 },
      { t: aoMeioDia + 2000, o: "quiz", d: "cp", a: "155", r: 1 },
      { t: aoMeioDia + 3000, o: "simulado", d: "cp", a: "155", r: 0 },
    ];
    const c = calendario({ v: 1, dias: {} }, [], eventos, hoje, 2);
    expect(c.semanas.flat().find((x) => x.dia === "2026-01-06")).toMatchObject({ acertos: 1, erros: 2 });
  });

  it("hoje é o dia de hoje no formato AAAA-MM-DD", () => {
    expect(calendario({ v: 1, dias: {} }, [], [], hoje, 2).hoje).toBe("2026-01-10");
    expect(calendario({ v: 1, dias: {} }, [], [], new Date(2026, 2, 1, 8), 2).hoje).toBe("2026-03-01");
  });
});

describe("sugerirSimulado", () => {
  const exames = [
    ex({ id: "1", ordem: 0, pecas: ["apelacao"] }),
    ex({ id: "2", ordem: 1, pecas: ["apelacao"] }),
    ex({ id: "3", ordem: 2, pecas: ["memoriais"] }),
    ex({ id: "4", ordem: 3, pecas: ["apelacao"] }),
  ];
  const nomePeca = (t: string) => (t === "memoriais" ? "Memoriais" : "Apelação");

  it("sugere a peça que ainda não tem simulado e cai mais", () => {
    const melhores = new Map([
      ["1", resumo(1, 7, "1")],
      ["2", resumo(2, 7, "2")],
    ]);
    const s = sugerirSimulado(exames, melhores, nomePeca, true);
    expect(s?.exame.id).toBe("3");
    expect(s?.motivo).toContain("Memoriais caiu 1 vez");
  });

  it("sem mostrar a peça, o motivo não cita o nome", () => {
    const melhores = new Map([
      ["1", resumo(1, 7, "1")],
      ["2", resumo(2, 7, "2")],
    ]);
    const s = sugerirSimulado(exames, melhores, nomePeca, false);
    expect(s?.motivo).not.toContain("Memoriais");
  });

  it("com todos feitos, sugere o de nota mais baixa", () => {
    const melhores = new Map([
      ["1", resumo(1, 7, "1")],
      ["2", resumo(2, 4, "2")],
      ["3", resumo(3, 9, "3")],
      ["4", resumo(4, 8, "4")],
    ]);
    const s = sugerirSimulado(exames, melhores, nomePeca, true);
    expect(s?.exame.id).toBe("2");
    expect(s?.motivo).toContain("4,00");
  });

  it("sem exames corrigíveis, não sugere nada", () => {
    const semCorrigir = exames.map((e) => ({ ...e, corrigivel: false }));
    expect(sugerirSimulado(semCorrigir, new Map(), nomePeca, true)).toBeNull();
  });
});
