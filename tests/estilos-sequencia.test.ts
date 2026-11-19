import { describe, expect, it } from "vitest";
import modulo from "@/games/flap-suitcase";
import { CUSTO_ESTILOS, ESTILOS_EM_SEQUENCIA } from "@/games/flap-suitcase/progressao";
import { itensVisiveis, type Progresso } from "@/games/progresso";
import type { ItemJogo } from "@/games/types";

const SEM_PROGRESSO: Progresso = { xp: 0, moedas: 0, comprados: [] };
const comprados = (ids: string[]): Progresso => ({ ...SEM_PROGRESSO, comprados: ids });
const ids = (lista: ItemJogo[]) => lista.map((e) => e.id);

// mesma ordem do menu: o clássico é grátis; Recesso e Gótico só aparecem em sequência
const estilos: ItemJogo[] = [
  { id: "classico", nome: "Clássico", descricao: "" },
  { id: "fofo", nome: "Fofo", descricao: "", custo: 50 },
  { id: "retro", nome: "Retrofuturista", descricao: "", custo: 110 },
  { id: "steampunk", nome: "Steampunk", descricao: "", custo: 242 },
  { id: "noir", nome: "Noir Tribunal", descricao: "", custo: 532 },
  { id: "papiro", nome: "Papiro", descricao: "", custo: 1171 },
  { id: "recesso", nome: "Recesso Forense", descricao: "", custo: 2577, sequencial: true },
  { id: "gotico", nome: "Gótico", descricao: "", custo: 5669, sequencial: true },
];

const CINCO_PAGOS = ["fofo", "retro", "steampunk", "noir", "papiro"];

describe("estilos em sequência no seletor", () => {
  it("sem compras: Recesso e Gótico não aparecem, nem como '???'", () => {
    expect(ids(itensVisiveis(estilos, SEM_PROGRESSO))).toEqual(["classico", "fofo", "retro", "steampunk", "noir", "papiro"]);
  });

  it("com os 5 estilos pagos comprados: o Recesso aparece e o Gótico não", () => {
    expect(ids(itensVisiveis(estilos, comprados(CINCO_PAGOS)))).toEqual([
      "classico",
      "fofo",
      "retro",
      "steampunk",
      "noir",
      "papiro",
      "recesso",
    ]);
  });

  it("com o Recesso comprado também: o Gótico aparece", () => {
    expect(ids(itensVisiveis(estilos, comprados([...CINCO_PAGOS, "recesso"])))).toEqual(ids(estilos));
  });

  it("um item sequencial comprado sem os anteriores continua escondido", () => {
    expect(ids(itensVisiveis(estilos, comprados(["recesso"])))).not.toContain("recesso");
  });

  it("não altera a lista recebida", () => {
    const antes = ids(estilos);
    itensVisiveis(estilos, SEM_PROGRESSO);
    expect(ids(estilos)).toEqual(antes);
  });
});

describe("preços dos estilos em sequência", () => {
  it("cada estilo custa 2,2 vezes o anterior, arredondado, a partir de 50", () => {
    const menu = ["fofo", "retro", "steampunk", "noir", "papiro", "recesso", "gotico"];
    menu.forEach((id, n) => {
      expect(CUSTO_ESTILOS[id], id).toBe(Math.round(50 * 2.2 ** n));
    });
  });

  it("ESTILOS_EM_SEQUENCIA lista o Recesso e o Gótico", () => {
    expect(ESTILOS_EM_SEQUENCIA).toEqual(["recesso", "gotico"]);
  });
});

describe("estilos do módulo", () => {
  it("Recesso e Gótico fecham a lista principal (o índice gravado nos códigos antigos não muda) e só eles são sequenciais", () => {
    const menu = modulo.estilos;
    const principais = menu.filter((e) => !e.grupo);
    expect(ids(principais)).toEqual(["classico", "fofo", "retro", "steampunk", "noir", "papiro", "recesso", "gotico"]);
    expect(ids(menu).slice(0, 8)).toEqual(ids(principais));
    expect(menu.filter((e) => e.sequencial).map((e) => e.id)).toEqual(["recesso", "gotico"]);
  });
});
