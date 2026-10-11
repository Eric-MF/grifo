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

  it("total = questões das duas listas menos as anuladas, e as listas não se repetem", () => {
    const { penal, processoPenal } = dados.faixa;
    expect(new Set([...penal, ...processoPenal]).size).toBe(penal.length + processoPenal.length);
    expect(dados.questoes.length).toBe(penal.length + processoPenal.length - dados.anuladas.length);
  });

  it("cada questão está na lista da sua disciplina", () => {
    for (const q of dados.questoes) {
      const lista = q.disciplina === "penal" ? dados.faixa.penal : dados.faixa.processoPenal;
      expect(lista.includes(q.n), `questão ${q.n}`).toBe(true);
    }
  });
});
