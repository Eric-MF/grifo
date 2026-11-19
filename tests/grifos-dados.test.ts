import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { GrifoEntradaSchema } from "../src/content/schema.ts";
import { grifosDoJson, type EntradaGrifo } from "../src/lib/leis/grifos.ts";
import { chaveDoTema } from "../src/lib/leis/grifos-compilar.ts";
import gerado from "../src/content/generated/grifos.json";

const raiz = join(import.meta.dirname, "..");
const pasta = join(raiz, "content", "grifos");
const arquivos = readdirSync(pasta).filter((f) => f.endsWith(".yaml")).sort();
const porArquivo = Object.fromEntries(
  arquivos.map((f) => [f, parse(readFileSync(join(pasta, f), "utf8")) as unknown]),
) as Record<string, unknown>;
const entradas = arquivos.flatMap((f) => (porArquivo[f] as EntradaGrifo[]).map((e) => ({ arquivo: f, e })));
const grifos = grifosDoJson(gerado);
const achar = (lei: string, disp: string) => grifos.find((g) => g.lei === lei && g.disp === disp);

describe("arquivos de content/grifos", () => {
  it("cada arquivo é uma lista de entradas", () => {
    for (const f of arquivos) expect(Array.isArray(porArquivo[f]), f).toBe(true);
  });

  it("cada entrada passa no esquema", () => {
    for (const { arquivo, e } of entradas) {
      const r = GrifoEntradaSchema.safeParse(e);
      expect(r.success, `${arquivo}: ${JSON.stringify(e)}`).toBe(true);
    }
  });

  it("o nome do arquivo é a cor das entradas", () => {
    for (const { arquivo, e } of entradas) expect(arquivo, JSON.stringify(e)).toBe(`${e.cor}.yaml`);
  });

  it("nenhuma entrada repete o mesmo (cor, lei, disp, tema)", () => {
    const chaves = entradas.map(({ e }) => [e.cor, e.lei, e.disp, e.tema].join("|"));
    expect(chaves.filter((c, k) => chaves.indexOf(c) !== k)).toEqual([]);
  });

  it("toda entrada tem palavras-chave, e nenhuma é um trecho longo (no máximo 15 palavras e 100 caracteres)", () => {
    for (const { e } of entradas) {
      expect(e.palavras.length, e.disp).toBeGreaterThan(0);
      for (const p of e.palavras) {
        expect(p.split(/\s+/).length, `${e.lei} ${e.disp}: ${p}`).toBeLessThanOrEqual(15);
        expect(p.length, `${e.lei} ${e.disp}: ${p}`).toBeLessThanOrEqual(100);
      }
    }
  });

  it("no mesmo dispositivo, cada tipo de grifo marca as suas palavras (a tese e o pedido não repetem o mesmo trecho)", () => {
    const repetidas: string[] = [];
    for (const { e: a } of entradas)
      for (const { e: b } of entradas) {
        if (a.cor >= b.cor || a.lei !== b.lei || a.disp !== b.disp) continue;
        for (const p of a.palavras) if (b.palavras.some((q) => q.toLowerCase() === p.toLowerCase())) repetidas.push(`${a.lei} ${a.disp}: "${p}" em ${a.cor} e ${b.cor}`);
      }
    expect(repetidas).toEqual([]);
  });
});

describe("grifos.json gerado", () => {
  it("tem uma entrada para cada entrada dos YAML", () => {
    expect(grifos).toHaveLength(entradas.length);
  });

  it("essencial é booleano, com essenciais e não essenciais", () => {
    expect(grifos.every((g) => typeof g.essencial === "boolean")).toBe(true);
    expect(grifos.some((g) => g.essencial)).toBe(true);
    expect(grifos.some((g) => !g.essencial)).toBe(true);
  });

  it("cada vide leva a outra entrada com o mesmo tema, em outro dispositivo", () => {
    const erros: string[] = [];
    for (const g of grifos)
      for (const v of g.vide) {
        const alvo = grifos.some((o) => o.lei === v.lei && o.disp === v.disp && chaveDoTema(o.tema) === chaveDoTema(g.tema));
        if (!alvo) erros.push(`${g.lei} ${g.disp} → ${v.lei} ${v.disp}: sem entrada de mesmo tema`);
        if (v.lei === g.lei && v.disp === g.disp) erros.push(`${g.lei} ${g.disp}: vide para si mesmo`);
      }
    expect(erros).toEqual([]);
  });

  it("relaxamento de prisão: a CF art. 5º, LXV e o CPP art. 310, I apontam um para o outro", () => {
    const cf = achar("cf", "art5.i65");
    const cpp = achar("cpp", "art310.i1");
    expect(cf?.tema).toBe("Relaxamento de prisão");
    expect(cpp?.tema).toBe("Relaxamento de prisão");
    expect(cf?.vide.map((v) => [v.lei, v.disp])).toEqual([["cpp", "art310.i1"]]);
    expect(cpp?.vide.map((v) => [v.lei, v.disp])).toEqual([["cf", "art5.i65"]]);
  });
});
