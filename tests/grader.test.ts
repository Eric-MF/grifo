import { describe, expect, it } from "vitest";
import { corrigirExame, identificarPeca } from "../src/lib/correcao/grader.ts";
import { ctx, exameIds, loadExame } from "./helpers.ts";

// Para cada exame corrigível: o próprio gabarito comentado, usado como resposta,
// precisa tirar nota alta. Isso pega termos/dispositivos mal transcritos na rubrica.
// (exames sem gabarito, como o 05 e o 40, não têm o que testar)
describe.each(exameIds.filter((id) => loadExame(id).corrigivel))("exame %s", (id) => {
  const ex = loadExame(id);

  it("gabarito + tabela atingem ≥ 90% em cada parte", () => {
    const r = corrigirExame(
      ex,
      {
        // gabarito comentado + a própria tabela (nem todo gabarito repete tudo o que a tabela pede)
        peca: `${ex.peca.nome}\n${ex.peca.gabarito_comentado}\n${ex.peca.itens.map((i) => i.descricao).join("\n")}`,
        questoes: ex.questoes.map((q) => `${q.gabarito_comentado}\n${q.itens.map((i) => i.descricao).join("\n")}`),
      },
      ctx,
    );
    for (const p of r.partes) {
      const faltas = p.itens.flatMap((i) => i.componentes.filter((c) => c.obtido === 0).map((c) => `${i.n}.${c.id} ${c.rotulo} ← faltou ${c.faltou.join(", ")}`));
      expect(p.obtidoBruto / p.valor, `${p.titulo}\n${faltas.join("\n")}`).toBeGreaterThanOrEqual(0.9);
    }
  });

  it("resposta vazia tira zero", () => {
    const r = corrigirExame(ex, { peca: "", questoes: ["", "", "", ""] }, ctx);
    expect(r.total).toBe(0);
  });

  it("só citar artigos não pontua nos componentes de dispositivo", () => {
    const soArtigos = ex.peca.itens
      .flatMap((i) => i.componentes.flatMap((c) => c.dispositivo ?? []))
      .join("; ");
    const r = corrigirExame(ex, { peca: `${ex.peca.nome}. ${soArtigos}`, questoes: [] }, ctx);
    const comRequer = r.partes[0].itens.flatMap((i) =>
      i.componentes.filter((c) => ex.peca.itens.find((x) => x.n === i.n)!.componentes.find((y) => y.id === c.id)!.requer),
    );
    expect(comRequer.every((c) => c.obtido === 0)).toBe(true);
  });
});

describe("identificarPeca", () => {
  it("reconhece a peça esperada", () => {
    expect(identificarPeca("EXCELENTÍSSIMO SENHOR JUIZ... interpor AGRAVO EM EXECUÇÃO", "agravo-execucao", [], ctx).status).toBe("ok");
  });
  it("aponta peça inadequada", () => {
    const r = identificarPeca("EXCELENTÍSSIMO... vem interpor RECURSO DE APELAÇÃO", "agravo-execucao", [], ctx);
    expect(r).toMatchObject({ status: "inadequada", detectada: "Apelação" });
  });
  it("contrarrazões de apelação não é confundida com apelação", () => {
    const r = identificarPeca("vem apresentar CONTRARRAZÕES DE APELAÇÃO", "apelacao", [], ctx);
    expect(r.status).toBe("inadequada");
  });
});

describe("teto do item", () => {
  it("limita a soma dos componentes ao teto (\"no mínimo 3 pedidos, máximo 1,5\")", async () => {
    const { avaliarItens } = await import("../src/lib/correcao/grader.ts");
    const item = {
      n: "8", descricao: "", teto: 1.5,
      componentes: ["pena", "regime", "prova", "agravante"].map((t, i) => ({ id: `c${i + 1}`, valor: 0.5, termos: [t] })),
    };
    const [r] = avaliarItens([item], "pena regime prova agravante", ctx);
    expect(r.valor).toBe(1.5);
    expect(r.obtido).toBe(1.5);
    const [r2] = avaliarItens([item], "pena regime", ctx);
    expect(r2.obtido).toBe(1);
  });
});
