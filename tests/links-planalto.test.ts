import { describe, expect, it } from "vitest";
import { destinoDoPlanalto } from "../src/lib/leis/referencias.ts";
import { htmlBlocos, mapaAncoras } from "../src/lib/leis/html.ts";
import { CLASSES } from "../src/components/leis/classes.ts";
import type { Bloco } from "../src/lib/leis/linha-do-tempo.ts";

const CPP = "https://www.planalto.gov.br/ccivil_03/decreto-lei/del3689compilado.htm";

describe("links do Planalto no texto", () => {
  it("leva o link do Planalto ao leitor do Grifo quando a lei está nele", () => {
    const d = destinoDoPlanalto("https://www.planalto.gov.br/ccivil_03/decreto-lei/Del2848.htm#art81§1ii", "cpp");
    expect(d.href).toBe("/leis/cp/#art81");
    expect(d.lei).toBe("cp");
    expect(d.art).toBe("art81");
    expect(d.planalto).toContain("Del2848.htm#art81");
  });

  it("artigo com letra e inciso em romano", () => {
    expect(destinoDoPlanalto("https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848.htm#art154a", "cpp").art).toBe("art154-a");
    expect(destinoDoPlanalto("https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848.htm#art5ii", "cpp").art).toBe("art5");
  });

  it("âncora que não é de artigo na própria lei fica no Planalto", () => {
    const d = destinoDoPlanalto(`${CPP}#tituloii`, "cpp");
    expect(d.href).toBe(`${CPP}#tituloii`);
  });

  it("lei fora do leitor continua no Planalto", () => {
    const d = destinoDoPlanalto("https://www.planalto.gov.br/ccivil_03/leis/l5869.htm#art227", "cpp");
    expect(d.href).toBe("https://www.planalto.gov.br/ccivil_03/leis/l5869.htm#art227");
    expect(d.lei).toBeUndefined();
  });

  it("o trecho sem link do Grifo recebe o link do Planalto; o do Grifo fica", () => {
    const texto = "Art. 776. Nos exames sucessivos a que se referem o § 1º, II, e § 2º do art. 81 do Código Penal, observar-se-á o disposto.";
    const b: Bloco = {
      tipo: "artigo",
      disp: "art776",
      rotulo: "Art. 776",
      texto,
      superada: false,
      atos: [],
      links: [
        { ini: texto.indexOf("§ 1º, II,"), fim: texto.indexOf("§ 1º, II,") + 9, href: "Del2848.htm#art81§1ii" },
        { ini: texto.indexOf("§ 2º"), fim: texto.indexOf("Penal") + 5, href: "Del2848.htm#art81§2" },
      ],
    };
    const html = htmlBlocos([b], 0, 1, "cpp", CPP, mapaAncoras([b], "cpp"), CLASSES);
    const links = [...html.matchAll(/<a [^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map((m) => [m[2], m[1]]);
    expect(links).toContainEqual(["§ 1º, II,", "/leis/cp/#art81"]);
    // o link do Grifo ("§ 2º do art. 81") fica, e o do Planalto que o cobre não entra
    expect(links).toContainEqual(["§ 2º do art. 81", "/leis/cp/#art81"]);
    expect(links.filter(([t]) => t.includes("Código Penal"))).toEqual([]);
    expect(html).toContain("observar-se-á o disposto.");
  });
});
