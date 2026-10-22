import { describe, expect, it } from "vitest";
import { citacoesEm } from "../src/lib/leis/planalto.ts";

// a forma da correção do quiz (formatarCitacao): "Art. N, … — Nome do diploma"
describe("citações na forma da correção", () => {
  it("viram link, com os dispositivos", () => {
    const [c] = citacoesEm("Art. 593, inciso III, alínea b — Código de Processo Penal");
    expect(c).toMatchObject({ texto: "Art. 593, inciso III, alínea b — Código de Processo Penal", url: "/leis/cpp/#art593", disps: ["art593.i3.ab"] });
    expect(citacoesEm("Art. 403, § 3º — Código de Processo Penal")[0]).toMatchObject({ url: "/leis/cpp/#art403", disps: ["art403.p3"] });
    expect(citacoesEm("Art. 609, parágrafo único — Código de Processo Penal")[0]).toMatchObject({ disps: ["art609.pu"] });
    expect(citacoesEm("Art. 5º, inciso LXV — Constituição Federal")[0]).toMatchObject({ url: "/leis/cf/#art5", disps: ["art5.i65"] });
    expect(citacoesEm("Art. 105, inciso II — Constituição Federal")[0]).toMatchObject({ url: "/leis/cf/#art105", disps: ["art105.i2"] });
    expect(citacoesEm("Art. 197 — Lei de Execução Penal")[0]).toMatchObject({ url: "/leis/lep/#art197" });
    expect(citacoesEm("Art. 396-A — Código de Processo Penal")[0]).toMatchObject({ url: "/leis/cpp/#art396-a" });
  });
  it("várias na mesma linha, e a forma antiga continua", () => {
    const cs = citacoesEm("Art. 321 — Código de Processo Penal; Art. 310, inciso III — Código de Processo Penal");
    expect(cs.map((c) => c.url)).toEqual(["/leis/cpp/#art321", "/leis/cpp/#art310"]);
    expect(citacoesEm("art. 581, IV, do CPP")[0]).toMatchObject({ url: "/leis/cpp/#art581" });
  });
  it("travessão sem nome de diploma não vira link", () => {
    expect(citacoesEm("Art. 10 — sem lei")).toEqual([]);
  });
});
