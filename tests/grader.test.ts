import { describe, expect, it } from "vitest";
import { corrigirExame, identificarPeca } from "../src/lib/correcao/grader.ts";
import { normalize } from "../src/lib/correcao/normalize.ts";
import { ctx, exameIds, loadExame } from "./helpers.ts";

// Para cada exame corrigível: o próprio gabarito comentado, usado como resposta,
// precisa tirar nota alta. Isso pega termos/dispositivos mal transcritos na rubrica.
// (exames sem gabarito, como o 05 e o 40, não têm o que testar)
// Este teste confere se os termos da tabela aparecem no texto oficial. A divisão em parágrafos (regra dos termos no
// mesmo parágrafo) tem testes próprios; aqui o gabarito e as descrições formam um só parágrafo.
const semQuebras = (t: string) => t.replace(/\s*\n\s*/g, " ");

describe.each(exameIds.filter((id) => loadExame(id).corrigivel))("exame %s", (id) => {
  const ex = loadExame(id);

  it("gabarito + tabela atingem ≥ 90% em cada parte", () => {
    const r = corrigirExame(
      ex,
      {
        // gabarito comentado + a própria tabela (nem todo gabarito repete tudo o que a tabela pede)
        peca: `${ex.peca.nome}\n${semQuebras(ex.peca.gabarito_comentado)} ${ex.peca.itens.map((i) => i.descricao).join(" ")}`,
        questoes: ex.questoes.map((q) => `${semQuebras(q.gabarito_comentado)} ${q.itens.map((i) => i.descricao).join(" ")}`),
      },
      ctx,
    );
    for (const p of r.partes) {
      const faltas = p.itens.flatMap((i) => i.componentes.filter((c) => c.obtido === 0).map((c) => `${i.n}.${c.id} ${c.rotulo} ← faltou ${c.faltou.join(", ")}`));
      expect(p.obtidoBruto / p.valor, `${p.titulo}\n${faltas.join("\n")}`).toBeGreaterThanOrEqual(0.9);
    }
  });

  it("resposta vazia tira zero, exceto o que a FGV concede por item anulado", () => {
    const r = corrigirExame(ex, { peca: "", questoes: ["", "", "", ""] }, ctx);
    const concedido = [ex.peca.itens, ...ex.questoes.map((q) => q.itens)].flat().reduce((s, i) => s + (i.anulado ?? 0), 0);
    expect(r.total).toBeCloseTo(concedido, 2);
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
  it("ED é sigla de embargos de declaração (qualquer caixa), só com comSiglas", () => {
    expect(identificarPeca("ED", "embargos-declaracao", [], ctx, true).status).toBe("ok");
    expect(identificarPeca("ed", "embargos-declaracao", [], ctx, true).status).toBe("ok");
  });
  it("HC é sigla de habeas corpus com comSiglas; sem comSiglas não é identificada", () => {
    expect(identificarPeca("HC", "habeas-corpus", [], ctx, true).status).toBe("ok");
    expect(identificarPeca("hc", "habeas-corpus", [], ctx).status).toBe("nao-identificada");
  });
  it("MS em endereço não vira sigla do simulador (sem comSiglas)", () => {
    const r = identificarPeca("Comarca de Campo Grande/MS ... vem interpor RECURSO DE APELAÇÃO", "apelacao", [], ctx);
    expect(r.status).toBe("ok");
  });
  it("RE é sigla de recurso extraordinário com comSiglas", () => {
    expect(identificarPeca("RE", "recurso-extraordinario", [], ctx, true).status).toBe("ok");
  });
  it("\"ré\" (normaliza para \"re\") no texto não vira recurso extraordinário sem comSiglas", () => {
    expect(identificarPeca("A ré foi condenada; interpor APELAÇÃO", "apelacao", [], ctx).status).toBe("ok");
  });
  it("\"c e d\" das alíneas não vira embargos de declaração", () => {
    const r = identificarPeca("APELAÇÃO, art. 593, III, alíneas c e d, do CPP", "apelacao", [], ctx);
    expect(r.status).toBe("ok");
  });
  it("texto de apelação não vira embargos de declaração", () => {
    const r = identificarPeca("vem interpor RECURSO DE APELAÇÃO", "embargos-declaracao", [], ctx);
    expect(r.status).toBe("inadequada");
    expect(r).toMatchObject({ tipo: "apelacao" });
    expect((r as { tipo?: string }).tipo).not.toBe("embargos-declaracao");
  });
  it("nenhuma sigla ou alias aparece em duas peças diferentes (normalizado)", () => {
    const donos = new Map<string, string>();
    const conflitos: string[] = [];
    for (const [tipo, p] of Object.entries(ctx.pecas)) {
      for (const t of [...(p.siglas ?? []), ...p.aliases]) {
        const k = normalize(t).trim();
        const outro = donos.get(k);
        if (outro && outro !== tipo) conflitos.push(`"${k}": ${outro} x ${tipo}`);
        donos.set(k, tipo);
      }
    }
    expect(conflitos).toEqual([]);
  });
  it("CRESE é sigla de contrarrazões de RSE com comSiglas; \"crese\" sem comSiglas não é identificada", () => {
    expect(identificarPeca("CRESE", "contrarrazoes-rese", [], ctx, true).status).toBe("ok");
    expect(identificarPeca("crese", "contrarrazoes-rese", [], ctx).status).not.toBe("ok");
  });
  it("AP é sigla de apelação com comSiglas", () => {
    expect(identificarPeca("AP", "apelacao", [], ctx, true).status).toBe("ok");
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
