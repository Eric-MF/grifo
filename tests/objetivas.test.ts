import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { ObjetivasArquivoSchema } from "../src/content/schema.ts";

const DIR = join(import.meta.dirname, "..", "content", "objetivas");
const arquivos = existsSync(DIR) ? readdirSync(DIR).filter((f) => f.endsWith(".yaml")) : [];

describe.each(arquivos)("objetivas/%s", (f) => {
  const dados = ObjetivasArquivoSchema.parse(parse(readFileSync(join(DIR, f), "utf8")));

  it("cada questão tem 4 alternativas com texto e a correta entre A e D", () => {
    for (const q of dados.questoes) {
      for (const l of ["A", "B", "C", "D"] as const) expect(q.alternativas[l].trim().length, `${q.n}${l}`).toBeGreaterThan(0);
      expect(["A", "B", "C", "D"]).toContain(q.correta);
    }
  });

  it("total = tamanho das faixas menos as anuladas", () => {
    const tamanho = ([a, b]: [number, number]) => b - a + 1;
    expect(dados.questoes.length).toBe(tamanho(dados.faixa.penal) + tamanho(dados.faixa.processoPenal) - dados.anuladas.length);
  });

  it("cada questão está na faixa da sua disciplina", () => {
    for (const q of dados.questoes) {
      const [a, b] = q.disciplina === "penal" ? dados.faixa.penal : dados.faixa.processoPenal;
      expect(q.n >= a && q.n <= b, `questão ${q.n}`).toBe(true);
    }
  });
});
