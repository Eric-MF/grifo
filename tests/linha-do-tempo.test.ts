import { describe, expect, it } from "vitest";
import { dataDoAto, datasComLocal, versoes, type Datas } from "@/lib/leis/linha-do-tempo";

const ato = { tipo: "redacao" as const, lei: "ec-132", bruto: "Redação dada pela Emenda Constitucional nº 132, de 2023", ano: 2023 };

const datas: Datas = {
  "ec-132": {
    vigencia: "2023-12-21",
    marcos: [
      { data: "2027-01-01", aproximada: true, disp: ["art146", "art195"] },
      { data: "2033-01-01", aproximada: true, disp: ["art212-a"] },
    ],
  },
  "lei-263": {
    padrao: "demais",
    locais: {
      df: { vigencia: "1948-02-29", rotulo: "Distrito Federal" },
      "rj-sp-mg": { vigencia: "1948-03-07", rotulo: "Rio de Janeiro, São Paulo e Minas Gerais" },
      demais: { vigencia: "1948-03-17", rotulo: "Demais Estados e Territórios" },
    },
  },
};

describe("dataDoAto com marcos", () => {
  it("usa o marco do artigo, comparando pelo artigo base do dispositivo", () => {
    expect(dataDoAto(ato, datas, "art146.p1.i2")).toEqual({ data: "2027-01-01", aproximado: true });
    expect(dataDoAto(ato, datas, "art212-a")).toEqual({ data: "2033-01-01", aproximado: true });
  });

  it("cai na vigência geral quando o artigo não está em nenhum marco", () => {
    expect(dataDoAto(ato, datas, "art121")).toEqual({ data: "2023-12-21", aproximado: false });
    expect(dataDoAto(ato, datas)).toEqual({ data: "2023-12-21", aproximado: false });
  });

  it("não confunde artigo com prefixo parecido", () => {
    expect(dataDoAto(ato, datas, "art1460")).toEqual({ data: "2023-12-21", aproximado: false });
  });

  it("ordena as versões de um artigo alterado em fases diferentes", () => {
    const blocos = [
      { tipo: "artigo" as const, disp: "art146", texto: "Art. 146. Antiga", superada: true, atos: [{ tipo: "redacao" as const, lei: "ec-132", bruto: "" }] },
      { tipo: "artigo" as const, disp: "art146", texto: "Art. 146. Vigente", superada: false, atos: [{ tipo: "redacao" as const, lei: "ec-132", bruto: "" }] },
    ];
    const v = versoes(blocos, datas).get("art146")!;
    expect(v.map((x) => x.inicio.data)).toEqual(["2027-01-01", "2027-01-01"]);
  });
});

describe("datasComLocal", () => {
  it("usa o local padrão quando não há escolha", () => {
    expect(datasComLocal(datas)["lei-263"]?.vigencia).toBe("1948-03-17");
  });

  it("usa o local escolhido", () => {
    expect(datasComLocal(datas, { "lei-263": "df" })["lei-263"]?.vigencia).toBe("1948-02-29");
  });

  it("ignora escolha que não existe e volta ao padrão", () => {
    expect(datasComLocal(datas, { "lei-263": "bahia" })["lei-263"]?.vigencia).toBe("1948-03-17");
  });

  it("não altera diplomas sem locais", () => {
    expect(datasComLocal(datas)["ec-132"]).toBe(datas["ec-132"]);
  });
});
