import { describe, expect, it } from "vitest";
import { vigenciasDaLei } from "@/lib/leis/vigencias";
import type { Bloco, Datas } from "@/lib/leis/linha-do-tempo";

const bloco = (over: Partial<Bloco>): Bloco => ({ tipo: "artigo", texto: "", superada: false, atos: [], ...over });

const datas: Datas = {
  "lei-14155": { vigencia: "2021-05-28" },
};

describe("vigenciasDaLei", () => {
  it("marca artigo revogado quando todos os blocos são superados, mesmo sem marco puro", () => {
    const blocos = [
      bloco({ disp: "art214", rotulo: "Art. 214.", texto: "Art. 214. Atentado violento ao pudor. (Revogado pela Lei nº 12.015, de 2009)", superada: true, atos: [{ tipo: "revogado", bruto: "Revogado pela Lei nº 12.015, de 2009", lei: "lei-12015", ano: 2009 }] }),
      bloco({ disp: "art214", rotulo: "Art. 214.", texto: "Art. 214. (Revogado pela Lei nº 12.015, de 2009)", superada: true, atos: [{ tipo: "revogado", bruto: "Revogado pela Lei nº 12.015, de 2009", lei: "lei-12015", ano: 2009 }] }),
    ];
    expect(vigenciasDaLei("cp", blocos, datas)).toEqual({ "cp:214": { situacao: "revogado", lei: "Lei nº 12.015/2009" } });
  });

  it("marca parágrafo revogado com a chave do parágrafo", () => {
    const blocos = [bloco({ disp: "art8.p2", texto: "§ 2º (Revogado)", superada: true, atos: [{ tipo: "revogado", bruto: "Revogado pela Lei nº 13.964, de 2019", lei: "lei-13964" }] })];
    expect(vigenciasDaLei("lei-x", blocos, datas)).toEqual({ "lei-x:8§2": { situacao: "revogado", lei: "Lei nº 13.964/2019" } });
  });

  it("marca artigo alterado com a data de vigência da lei que deu a redação vigente", () => {
    const blocos = [
      bloco({ disp: "art154-A", texto: "Art. 154-A. Versão anterior", superada: true, atos: [{ tipo: "redacao", bruto: "Redação dada pela Lei nº 14.155, de 2021", lei: "lei-14155", ano: 2021 }] }),
      bloco({ disp: "art154-A", texto: "Art. 154-A. Versão vigente", atos: [{ tipo: "redacao", bruto: "Redação dada pela Lei nº 14.155, de 2021", lei: "lei-14155", ano: 2021 }] }),
    ];
    expect(vigenciasDaLei("cp", blocos, datas)).toEqual({ "cp:154-A": { situacao: "alterado", lei: "Lei nº 14.155/2021", desde: "2021-05-28" } });
  });

  it("nomeia emenda constitucional e usa a lei da redação quando a marca de revogação não traz o nome", () => {
    const blocos = [
      bloco({ disp: "art111.p1", texto: "§ 1º. Dezessete Ministros.", superada: true, atos: [{ tipo: "revogado", bruto: "(Revogado pela Emenda Constitucional nº 45, de 2004)", lei: "ec-45" }] }),
      bloco({ disp: "art110.p2", rotulo: "§ 2º", texto: "§ 2º . .", atos: [{ tipo: "revogado", bruto: "(Revogado)" }, { tipo: "redacao", bruto: "(Redação dada pela Lei nº 12.234, de 2010)", lei: "lei-12234", ano: 2010 }] }),
    ];
    expect(vigenciasDaLei("cf", blocos.slice(0, 1), datas)).toEqual({ "cf:111§1": { situacao: "revogado", lei: "Emenda Constitucional nº 45/2004" } });
    expect(vigenciasDaLei("cp", blocos.slice(1), datas)).toEqual({ "cp:110§2": { situacao: "revogado", lei: "Lei nº 12.234/2010" } });
  });

  it("nomeia a lei quando a data vem no formato do Planalto (1º.4.1996) ou com número de milhar separado por espaço", () => {
    const blocos = [
      bloco({ disp: "art51", texto: "Art. 51. (Revogado)", superada: true, atos: [{ tipo: "revogado", bruto: "(Revogado pela Lei nº 9.268, de 1º.4.1996)" }] }),
      bloco({ disp: "art262", texto: "Art. 262. (Revogado)", superada: true, atos: [{ tipo: "revogado", bruto: "(Revogado pela Lei nº 13 281, de 2016)" }] }),
    ];
    expect(vigenciasDaLei("cp", blocos.slice(0, 1), datas)).toEqual({ "cp:51": { situacao: "revogado", lei: "Lei nº 9.268/1996" } });
    expect(vigenciasDaLei("cp", blocos.slice(1), datas)).toEqual({ "cp:262": { situacao: "revogado", lei: "Lei nº 13.281/2016" } });
  });

  it("separa parágrafo único e inciso do caput, com chave própria", () => {
    const blocos = [
      bloco({ disp: "art7.pu", texto: "Parágrafo único. (Revogado)", superada: true, atos: [{ tipo: "revogado", bruto: "(Revogado pela Lei nº 9.268, de 1996)" }] }),
      bloco({ disp: "art7.i12", texto: "XII - (Revogado)", superada: true, atos: [{ tipo: "revogado", bruto: "(Revogado pela Lei nº 9.268, de 1996)" }] }),
    ];
    expect(vigenciasDaLei("cf", blocos, datas)).toEqual({
      "cf:7§único": { situacao: "revogado", lei: "Lei nº 9.268/1996" },
      "cf:7,XII": { situacao: "revogado", lei: "Lei nº 9.268/1996" },
    });
  });

  it("não emite nada para artigo sem ato de alteração ou revogação", () => {
    const blocos = [bloco({ disp: "art121", texto: "Art. 121. Matar alguém." })];
    expect(vigenciasDaLei("cp", blocos, datas)).toEqual({});
  });
});
