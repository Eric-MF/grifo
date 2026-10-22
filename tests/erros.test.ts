import { describe, expect, it } from "vitest";
import { corrigirExame } from "../src/lib/correcao/grader.ts";
import { agregar, eventosDeDispositivos, eventosDeTentativas, eventosDoSimulado, maisErrados, nivelDe, podar, type Evento } from "../src/lib/erros.ts";
import { ctx, loadExame } from "./helpers.ts";

const DIA = 86_400_000;
const agora = Date.UTC(2026, 9, 10);
const ev = (diasAtras: number, a: string, r: 0 | 1, d = "cpp"): Evento => ({ t: agora - diasAtras * DIA, o: "quiz", d, a, r });

describe("nivelDe", () => {
  it.each([
    [0, 3, null],
    [1, 5, "baixo"],
    [1, 1, "medio"],
    [2, 9, "medio"],
    [4, 20, "alto"],
    [2, 1, "alto"],
  ])("%i erros e %i acertos → %s", (erros, acertos, nivel) => {
    expect(nivelDe(erros, acertos)).toBe(nivel);
  });
});

describe("agregar", () => {
  const eventos = [ev(1, "581", 0), ev(2, "581", 0), ev(3, "581", 1), ev(10, "593", 0), ev(1, "121", 1, "cp")];

  it("soma por artigo dentro da janela", () => {
    const ag = agregar(eventos, { janelaDias: 7, agora });
    expect(ag.get("cpp:581")).toMatchObject({ erros: 2, acertos: 1, nivel: "alto" });
    expect(ag.has("cpp:593")).toBe(false);
  });

  it("sem janela conta tudo", () => {
    expect(agregar(eventos, { janelaDias: null, agora }).get("cpp:593")).toMatchObject({ erros: 1, nivel: "medio" });
  });

  it("maisErrados filtra pelo nível mínimo e ignora quem só acertou", () => {
    const ag = agregar(eventos, { janelaDias: null, agora });
    expect(maisErrados(ag, "medio").map((a) => a.artigo)).toEqual(["581", "593"]);
    expect(maisErrados(ag, "alto").map((a) => a.artigo)).toEqual(["581"]);
  });
});

describe("podar", () => {
  it("descarta eventos com mais de 180 dias e mantém os 3000 mais novos", () => {
    const velhos = [ev(200, "1", 0), ev(10, "2", 0)];
    expect(podar(velhos, agora).map((e) => e.a)).toEqual(["2"]);
    const muitos = Array.from({ length: 3100 }, (_, i) => ev(1, String(i), 0));
    const podados = podar(muitos, agora);
    expect(podados).toHaveLength(3000);
    expect(podados[0].a).toBe("100");
  });
});

describe("eventosDeDispositivos", () => {
  it("um evento por artigo, com súmulas do STF e do STJ", () => {
    const evs = eventosDeDispositivos(["art. 581, XV, CPP", "Súmula 700 STF", "art. 581 CPP", "art. 33, § 4º, Lei 11.343/06"], 0, "quiz", ctx.lex, { t: agora });
    expect(evs.map((e) => `${e.d}:${e.a}`)).toEqual(["cpp:581", "sumulas-stf:700", "lei-11343:33"]);
    expect(evs[0].i).toBe("15");
    expect(evs[2].p).toBe("4");
  });

  it("súmula do STF ou do STJ vira evento só com o número, sem p nem i", () => {
    const evs = eventosDeDispositivos(["Súmula 145 STF", "Súmula 444 do STJ"], 1, "simulado", ctx.lex, { q: "38", t: agora });
    expect(evs).toEqual([
      { t: agora, o: "simulado", d: "sumulas-stf", a: "145", r: 1, q: "38" },
      { t: agora, o: "simulado", d: "sumulas-stj", a: "444", r: 1, q: "38" },
    ]);
  });

  it("deixa de fora súmulas vinculantes e súmulas sem tribunal", () => {
    const evs = eventosDeDispositivos(["Súmula Vinculante 24", "Súmula 711", "art. 121 do CP"], 0, "quiz", ctx.lex, { t: agora });
    expect(evs.map((e) => `${e.d}:${e.a}`)).toEqual(["cp:121"]);
  });

  it("súmulas repetidas entram uma vez, junto com o artigo de mesmo número", () => {
    const evs = eventosDeDispositivos(["Súmula 145 STF", "Súmula 145 do STF", "art. 145 do CP"], 0, "quiz", ctx.lex, { t: agora });
    expect(evs.map((e) => `${e.d}:${e.a}`)).toEqual(["sumulas-stf:145", "cp:145"]);
  });
});

describe("eventosDoSimulado", () => {
  const ex = loadExame("38");

  it("resposta com o gabarito gera acertos nos dispositivos", () => {
    const r = corrigirExame(ex, { peca: `${ex.peca.nome}\n${ex.peca.gabarito_comentado}\n${ex.peca.itens.map((i) => i.descricao).join("\n")}`, questoes: [] }, ctx);
    const evs = eventosDoSimulado(ex, r, ctx.lex, agora);
    expect(evs.length).toBeGreaterThan(0);
    expect(evs.filter((e) => e.r === 1).length).toBeGreaterThan(evs.length / 2);
    expect(evs.every((e) => e.o === "simulado" && e.q === "38")).toBe(true);
  });

  it("partes entregues em branco não geram erros", () => {
    const r = corrigirExame(ex, { peca: "", questoes: ["", "", "", ""] }, ctx);
    expect(eventosDoSimulado(ex, r, ctx.lex, agora)).toEqual([]);
  });
});

describe("eventosDeTentativas", () => {
  const ex = loadExame("38");
  const r = corrigirExame(ex, { peca: `${ex.peca.nome}\n${ex.peca.gabarito_comentado}\n${ex.peca.itens.map((i) => i.descricao).join("\n")}`, questoes: [] }, ctx);
  const tentativa = (exameId: string, criadaEm: number) => ({
    id: `${exameId}-${criadaEm}`,
    exameId,
    criadaEm,
    duracaoSeg: 0,
    respostas: { peca: "", questoes: [] },
    resultado: r,
  });

  it("importa só as tentativas do exame que ainda não têm eventos, uma vez", () => {
    const tents = [tentativa("38", agora), tentativa("39", agora), tentativa("38", agora - DIA)];
    const novos = eventosDeTentativas(ex, tents, [], ctx.lex);
    expect(novos.length).toBeGreaterThan(0);
    expect(novos.every((e) => e.q === "38")).toBe(true);
    expect(new Set(novos.map((e) => e.t))).toEqual(new Set([agora, agora - DIA]));
    expect(eventosDeTentativas(ex, tents, novos, ctx.lex)).toEqual([]);
  });
});
