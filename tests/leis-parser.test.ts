import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { datasDaLei } from "../scripts/leis/alteradora.ts";
import { lerAto, lerHtml } from "../scripts/leis/parser.ts";
import { textoAtual, textoEm, type Datas } from "../src/lib/leis/linha-do-tempo.ts";

const fixture = (f: string) => readFileSync(join(import.meta.dirname, "fixtures", "planalto", f), "utf8");
const datas: Datas = {
  "lei-12737": { vigencia: "2013-04-02" },
  "lei-14155": { vigencia: "2021-05-28" },
  "lei-12015": { vigencia: "2009-08-10" },
  "lei-13964": { vigencia: "2020-01-23" },
};
const textos = (bs: { bloco: { texto: string } }[]) => bs.map((b) => b.bloco.texto);

describe("parser do Planalto: art. 154-A do CP", () => {
  const { blocos, relatorio } = lerHtml(fixture("cp-154a.html"));

  it("reconhece todas as anotações", () => expect(relatorio.anotacoesNaoReconhecidas).toEqual([]));

  it("a redação de 2012 está riscada e a de 2021 vigente", () => {
    const caput = blocos.filter((b) => b.tipo === "artigo" && b.disp === "art154-a");
    expect(caput.map((b) => b.superada)).toEqual([true, false]);
    expect(caput[0].atos[0]).toMatchObject({ tipo: "incluido", lei: "lei-12737", ano: 2012 });
    expect(caput[1].atos[0]).toMatchObject({ tipo: "redacao", lei: "lei-14155", ano: 2021 });
    expect(caput[1].atos[0].href).toContain("L14155.htm");
  });

  it("parágrafos ficam abaixo do artigo e a pena continua o dispositivo", () => {
    expect(blocos.some((b) => b.disp === "art154-a.p1" && b.tipo === "paragrafo")).toBe(true);
    expect(blocos.find((b) => b.texto.startsWith("Pena – reclusão, de 1 (um) a 4"))?.disp).toBe("art154-a");
  });

  it("texto atual não mostra o que está riscado", () => {
    const atual = textos(textoAtual(blocos)).join(" ");
    expect(atual).toContain("dispositivo informático de uso alheio");
    expect(atual).not.toContain("mediante violação indevida de mecanismo de segurança");
  });

  it("linha do tempo: antes de 2013 não existe; até 27/05/2021 vale a redação antiga; depois, a nova", () => {
    expect(textos(textoEm(blocos, "2012-12-31", datas)).some((t) => t.startsWith("Art. 154-A"))).toBe(false);
    const em2020 = textos(textoEm(blocos, "2020-06-01", datas)).join(" ");
    expect(em2020).toContain("mediante violação indevida de mecanismo de segurança");
    expect(em2020).toContain("Pena - detenção, de 3 (três) meses a 1 (um) ano");
    expect(em2020).not.toContain("de uso alheio");
    const em2022 = textos(textoEm(blocos, "2022-01-01", datas)).join(" ");
    expect(em2022).toContain("de uso alheio");
    expect(em2022).toContain("Pena – reclusão, de 1 (um) a 4 (quatro) anos");
    expect(em2022).not.toContain("mediante violação indevida");
  });
});

describe("parser do Planalto: art. 214 do CP (revogado)", () => {
  const { blocos } = lerHtml(fixture("cp-214.html"));

  it("some do texto atual, inclusive a pena que o Planalto não riscou", () => {
    expect(textos(textoAtual(blocos)).some((t) => /Art\. 214|reclusão de dois a sete anos/.test(t))).toBe(false);
  });

  it("aparece com a opção de revogados e na linha do tempo antes da revogação", () => {
    expect(textos(textoAtual(blocos, { revogados: true })).some((t) => t.startsWith("Art. 214"))).toBe(true);
    expect(textos(textoEm(blocos, "2005-01-01", datas)).some((t) => t.startsWith("Art. 214"))).toBe(true);
    expect(textos(textoEm(blocos, "2010-01-01", datas)).some((t) => t.startsWith("Art. 214"))).toBe(false);
  });
});

describe("parser do Planalto: art. 28-A do CPP", () => {
  const { blocos } = lerHtml(fixture("cpp-28a.html"));

  it("o acordo de não persecução não existe antes de 23/01/2020", () => {
    expect(textos(textoEm(blocos, "2020-01-22", datas)).some((t) => t.startsWith("Art. 28-A"))).toBe(false);
    expect(textos(textoEm(blocos, "2020-01-23", datas)).some((t) => t.startsWith("Art. 28-A"))).toBe(true);
  });

  it("os parágrafos e incisos ficam no art. 28-A", () => {
    const disps = blocos.map((b) => b.disp).filter(Boolean);
    expect(disps).toContain("art28-a.i2");
    expect(disps.every((d) => d!.startsWith("art28-a"))).toBe(true);
  });
});

describe("leitura dos atos e das datas das leis alteradoras", () => {
  it("lê a espécie, o número e a data quando vem por extenso", () => {
    expect(lerAto("(Redação dada pela Lei nº 7.209, de 11.7.1984)")).toMatchObject({ tipo: "redacao", lei: "lei-7209", data: "1984-07-11" });
    expect(lerAto("(Incluído pela Lei Complementar nº 64, de 1990)")).toMatchObject({ tipo: "incluido", lei: "lc-64", ano: 1990 });
    expect(lerAto("(Vide ADPF 779)")).toMatchObject({ tipo: "vide" });
  });

  it("vigência na publicação ou após N dias (LC 95, art. 8º, § 1º)", () => {
    expect(datasDaLei("LEI Nº 14.155, DE 27 DE MAIO DE 2021 … Art. 3º Esta Lei entra em vigor na data de sua publicação. … DOU de 28.5.2021")).toMatchObject({
      assinatura: "2021-05-27",
      publicacao: "2021-05-28",
      vigencia: "2021-05-28",
    });
    expect(datasDaLei("LEI Nº 13.964, DE 24 DE DEZEMBRO DE 2019 … Esta Lei entra em vigor após decorridos 30 (trinta) dias de sua publicação oficial. DOU de 24.12.2019")).toMatchObject({
      vigencia: "2020-01-23",
    });
  });
});

describe("vigência: outras redações da cláusula", () => {
  it("DOU sem 'de', promulgação, data explícita, meses e mês seguinte", () => {
    expect(datasDaLei("EMENDA CONSTITUCIONAL Nº 100, DE 26 DE JUNHO DE 2019 … entra em vigor na data de sua promulgação. publicado no DOU 27.6.2019").vigencia).toBe("2019-06-27");
    expect(datasDaLei("LEI Nº 1, DE 1 DE MARÇO DE 2000 … entra em vigor em 1º de janeiro de 2001. DOU de 2.3.2000").vigencia).toBe("2001-01-01");
    expect(datasDaLei("LEI Nº 2, DE 1 DE MARÇO DE 2006 … entra em vigor 3 (três) meses após a sua publicação. DOU de 2.3.2006").vigencia).toBe("2006-06-02");
    expect(datasDaLei("LEI Nº 3, DE 10 DE MARÇO DE 2006 … entra em vigor a partir do primeiro mês subseqüente ao de sua publicação. DOU de 11.3.2006").vigencia).toBe("2006-04-01");
  });
  it("sem DOU usa a assinatura e marca como aproximada", () => {
    expect(datasDaLei("DECRETO-LEI Nº 385, DE 26 DE DEZEMBRO DE 1968 … Este Decreto-lei entrará em vigor na data de sua publicação")).toMatchObject({
      vigencia: "1968-12-26",
      aproximada: true,
    });
  });
});
