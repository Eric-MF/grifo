import { describe, expect, it } from "vitest";
import { remissivoDasSumulas } from "../src/lib/leis/sumulas.ts";
import type { SumulasDoTribunal } from "../src/lib/leis/dados.ts";

const s = (numero: number, enunciado: string, extras: Record<string, unknown> = {}, status = "vigente") => ({ tribunal: "stj", numero, status, baixada: true, enunciado, url: "", vide: [], extras });
const dados = {
  tribunal: "stj",
  fonte: "https://stj",
  coletadoEm: "2026-10-17",
  total: 4,
  baixadas: 4,
  sumulas: [
    s(231, "A incidência da circunstância atenuante não pode conduzir à redução da pena abaixo do mínimo legal.", { ramo: "DIREITO PENAL - APLICAÇÃO DA PENA" }),
    s(191, "A pronúncia é causa interruptiva da prescrição, ainda que o Tribunal do Júri venha a desclassificar o crime."),
    s(415, "O período de suspensão do prazo prescricional é regulado pelo máximo da pena cominada."),
    s(9, "A exigência da prisão provisória, para apelar, não ofende a garantia constitucional.", {}, "cancelada"),
  ],
} as unknown as SumulasDoTribunal;

describe("índice alfabético das súmulas", () => {
  const r = remissivoDasSumulas(dados, ["PRESCRIÇÃO", "JÚRI", "ATENUANTE(S)", "PENA", "PRISÃO", "DIREITO"]);
  const entrada = (p: string) => r.entradas.find((e) => e.palavra === p);
  it("cada palavra lista as súmulas em que aparece, em ordem, com a referência 'Súmula N'", () => {
    expect(entrada("PENA")?.subitens.map((x) => x.ref)).toEqual(["Súmula 231", "Súmula 415"]);
    expect(entrada("JÚRI")?.subitens.map((x) => x.ref)).toEqual(["Súmula 191"]);
    // "ATENUANTE(S)" vira "ATENUANTE"
    expect(entrada("ATENUANTE")?.total).toBe(1);
  });
  it("o assunto do ramo do STJ também entra, e a súmula cancelada é marcada", () => {
    expect(entrada("APLICAÇÃO DA PENA")?.subitens[0]?.ref).toBe("Súmula 231");
    expect(entrada("PRISÃO")?.subitens[0]?.texto).toMatch(/^\(Cancelada\) A exigência/);
  });
  it("palavra genérica fica de fora, e as entradas saem em ordem alfabética", () => {
    expect(entrada("DIREITO")).toBeUndefined();
    const nomes = r.entradas.map((e) => e.palavra);
    expect(nomes).toEqual([...nomes].sort((a, b) => a.normalize("NFD").localeCompare(b.normalize("NFD"))));
    expect(r.palavras).toBe(r.entradas.length);
  });
});
