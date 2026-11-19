import { describe, expect, it } from "vitest";
import modulo from "@/games/flap-suitcase";
import { TEMAS } from "@/games/flap-suitcase/catalogo";
import { CUSTO_TETO, GRUPOS_ESTILOS } from "@/games/flap-suitcase/progressao";
import { aVendaAgora, itensVisiveis, type Progresso } from "@/games/progresso";
import type { ItemJogo } from "@/games/types";

const SEM_PROGRESSO: Progresso = { xp: 0, moedas: 0, comprados: [] };
const comprados = (ids: string[]): Progresso => ({ ...SEM_PROGRESSO, comprados: ids });
const ids = (lista: ItemJogo[]) => lista.map((e) => e.id);
const dia = (mes: number, d: number) => new Date(2026, mes - 1, d, 12);

// o Natal é datado (25/12): à venda de 22/12 a 28/12
const estilos: ItemJogo[] = [
  { id: "classico", nome: "Clássico", descricao: "" },
  { id: "fofo", nome: "Fofo", descricao: "", custo: 50 },
  { id: "ba", nome: "Bahia", descricao: "", custo: 5669, grupo: "estados" },
  { id: "natal", nome: "Natal", descricao: "", custo: 5669, grupo: "feriados", janela: { tipo: "fixa", dia: 25, mes: 12 } },
];

describe("grupos e datados no seletor", () => {
  it("sem o fofo comprado: os grupos esperam a lista principal", () => {
    expect(ids(itensVisiveis(estilos, SEM_PROGRESSO, dia(12, 24)))).toEqual(["classico", "fofo"]);
  });

  it("com o fofo comprado: o grupo Estados aparece e o Natal só na semana do evento", () => {
    expect(ids(itensVisiveis(estilos, comprados(["fofo"]), dia(12, 24)))).toEqual(["classico", "fofo", "ba", "natal"]);
    expect(ids(itensVisiveis(estilos, comprados(["fofo"]), dia(12, 2)))).toEqual(["classico", "fofo", "ba"]);
  });

  it("bordas da janela: aparece de 22/12 a 28/12", () => {
    const natal = (d: Date) => ids(itensVisiveis(estilos, comprados(["fofo"]), d)).includes("natal");
    expect(natal(dia(12, 22))).toBe(true);
    expect(natal(dia(12, 28))).toBe(true);
    expect(natal(dia(12, 21))).toBe(false);
    expect(natal(dia(12, 29))).toBe(false);
  });

  it("comprado, o datado fica visível fora da semana do evento", () => {
    expect(ids(itensVisiveis(estilos, comprados(["fofo", "natal"]), dia(12, 2)))).toContain("natal");
  });

  it("sem agora, usa a data de hoje e mantém classico, fofo e ba", () => {
    const visiveis = ids(itensVisiveis(estilos, comprados(["fofo"])));
    expect(visiveis).toEqual(expect.arrayContaining(["classico", "fofo", "ba"]));
  });
});

describe("venda de datados", () => {
  it("um datado só se compra na semana do evento", () => {
    const natal = estilos[3];
    expect(aVendaAgora(natal, dia(12, 24))).toBe(true);
    expect(aVendaAgora(natal, dia(12, 2))).toBe(false);
  });

  it("um item sem data está sempre à venda", () => {
    expect(aVendaAgora(estilos[2], dia(12, 2))).toBe(true);
    expect(aVendaAgora(estilos[2], dia(7, 14))).toBe(true);
  });
});

// A posição de cada estilo vai no código de verificação: os já publicados não mudam de lugar, e os novos entram no fim.
const ORDEM_PUBLICADA = [
  "classico", "fofo", "retro", "steampunk", "noir", "papiro", "recesso", "gotico",
  // feriados nacionais
  "ano-novo", "paixao", "tiradentes", "trabalho", "independencia", "aparecida", "finados", "republica", "consciencia-negra", "natal",
  // estados, em ordem alfabética do nome
  "ac", "al", "ap", "am", "ba", "ce", "df", "es", "go", "ma", "mt", "ms", "mg", "pa", "pb", "pr", "pe", "pi", "rj", "rn", "rs", "ro", "rr", "sc", "sp", "se", "to",
  // biomas e Constituições
  "amazonia", "caatinga", "cerrado", "mata-atlantica", "pampa", "pantanal",
  "c1824", "c1891", "c1934", "c1937", "c1946", "c1967", "c1988",
  // datas do Direito e festas populares
  "defensoria", "onze-de-agosto", "dia-da-justica", "ministerio-publico",
  "bonfim", "carnaval", "sao-joao", "parintins", "cirio",
];

describe("estilos do módulo com grupo", () => {
  const comGrupo = modulo.estilos.filter((e) => e.grupo);

  it("os estilos já publicados ficam no mesmo lugar; os novos entram no fim", () => {
    expect(ids(modulo.estilos).slice(0, ORDEM_PUBLICADA.length)).toEqual(ORDEM_PUBLICADA);
  });

  it("os estados são os 26 e o Distrito Federal, em ordem alfabética do nome", () => {
    const estados = comGrupo.filter((e) => e.grupo === "estados").map((e) => e.nome);
    expect(estados).toHaveLength(27);
    expect([...estados].sort((a, b) => a.localeCompare(b, "pt-BR"))).toEqual(estados);
  });

  it("os estilos de cada grupo ficam juntos, na ordem de GRUPOS_ESTILOS", () => {
    const grupos = comGrupo.map((e) => e.grupo!).filter((g, i, a) => a[i - 1] !== g);
    expect(new Set(grupos).size).toBe(grupos.length);
    expect(grupos).toEqual(GRUPOS_ESTILOS.map((g) => g.id).filter((g) => grupos.includes(g)));
  });

  it("todo estilo de grupo custa o teto da sequência, tem amostra e um grupo existente", () => {
    for (const e of comGrupo) {
      expect(e.custo, e.id).toBe(CUSTO_TETO);
      expect(e.amostra, e.id).toBeTruthy();
      expect(GRUPOS_ESTILOS.map((g) => g.id), e.id).toContain(e.grupo);
    }
  });

  it("todo estilo datado tem grupo", () => {
    for (const e of modulo.estilos.filter((e) => e.janela)) {
      expect(e.grupo, e.id).toBeTruthy();
    }
  });

  it("ids dos estilos são únicos", () => {
    const lista = ids(modulo.estilos);
    expect(new Set(lista).size).toBe(lista.length);
  });

  it("cabem em 128 estilos (o código de verificação v3 guarda o índice em 7 bits)", () => {
    expect(modulo.estilos.length).toBeLessThanOrEqual(128);
  });

  it("os grupos do módulo são os de GRUPOS_ESTILOS", () => {
    expect(modulo.gruposEstilos).toEqual(GRUPOS_ESTILOS);
  });
});

describe("surpresas dos estilos", () => {
  it("todo estilo tem a sua surpresa (easter egg)", () => {
    for (const t of TEMAS) expect(typeof t.surpresa, t.id).toBe("function");
  });
});

describe("paletas dos estilos", () => {
  it("céu e camadas em hexadecimal (ciclo() mistura só hexadecimal; rgba() viraria preto)", () => {
    const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
    for (const t of TEMAS) {
      for (const cor of [...t.paleta.ceu.flat(), ...t.paleta.longe, ...t.paleta.perto, t.paleta.chao]) expect(cor, t.id).toMatch(hex);
    }
  });
});
