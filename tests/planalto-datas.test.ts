import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extrairDatasPlanalto } from "../src/lib/leis/planalto-datas";

const pagina = (nome: string) => new TextDecoder("windows-1252").decode(readFileSync(`tests/fixtures/planalto/${nome}`));

describe("datas das leis do Planalto", () => {
  it("decreto de 1998: assinatura, publicação e vigência", () => {
    const r = extrairDatasPlanalto(pagina("decreto-2799.html"), "decreto-2799");
    expect(r).toMatchObject({ assinatura: "1998-10-08", publicacao: "1998-10-10", vigencia: "1998-10-10" });
  });

  it("decreto de 2026: data numérica do DOU", () => {
    const r = extrairDatasPlanalto(pagina("decreto-13084.html"), "decreto-13084");
    expect(r).toMatchObject({ assinatura: "2026-07-29", publicacao: "2026-07-30", vigencia: "2026-07-30" });
  });

  it("escolhe o título com o número do id, não a primeira lei citada", () => {
    const html = "<p>Redação dada pela Lei nº 13.129, de 13 de novembro de 2014.</p><p>LEI Nº 6.404, DE 15 DE DEZEMBRO DE 1976</p><p>Este texto não substitui o publicado no DOU de 17.12.1976.</p><p>Esta Lei entra em vigor na data de sua publicação.</p>";
    expect(extrairDatasPlanalto(html, "lei-6404")).toMatchObject({ assinatura: "1976-12-15", publicacao: "1976-12-17", vigencia: "1976-12-17" });
  });

  it("sem título com o número do id, deixa assinatura vazia e avisa", () => {
    const r = extrairDatasPlanalto("<p>LEI Nº 9.999, DE 1º DE ABRIL DE 2026</p>", "lei-1234");
    expect(r.assinatura).toBeUndefined();
    expect(r.pendencias).toContain("assinatura não encontrada no título da página");
  });

  it("prazo em dias é calculado a partir da publicação e marcado para conferência", () => {
    const html = "<p>LEI Nº 15.000, DE 1º DE ABRIL DE 2026</p><p>publicado no DOU de 2.4.2026</p><p>Esta Lei entra em vigor após decorridos noventa dias da sua publicação.</p>";
    const r = extrairDatasPlanalto(html, "lei-15000");
    expect(r.vigencia).toBe("2026-07-01");
    expect(r.pendencias.join(" ")).toMatch(/confira/);
  });

  it("cláusulas com datas diferentes não preenchem a vigência", () => {
    const html = "<p>publicado no DOU de 2.4.2026</p><p>Esta Lei entra em vigor na data de sua publicação.</p><p>Art. 9º Este decreto entra em vigor em 1º de janeiro de 2027.</p>";
    const r = extrairDatasPlanalto(html, "lei-15000");
    expect(r.vigencia).toBeUndefined();
    expect(r.pendencias.join(" ")).toMatch(/datas diferentes/);
  });
});
