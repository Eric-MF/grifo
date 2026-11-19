import { describe, expect, it } from "vitest";
import { CONQUISTAS_INICIAL, type Conquistas } from "../src/lib/conquistas";
import { avaliarItens, textoRequisito, type Contexto } from "../src/games/regras";
import type { ItemJogo } from "../src/games/types";

const base = (extra: Partial<Conquistas> = {}): Conquistas => ({ ...CONQUISTAS_INICIAL, ...extra });
const ctx = (extra: Partial<Contexto> = {}): Contexto => ({
  conquistas: base(),
  moedas: 0,
  comprados: [],
  itens: [],
  agora: new Date(2026, 9, 16, 12),
  ...extra,
});

describe("regras de desbloqueio", () => {
  it("sequência de 20 libera Harpia Corpus e 19 não", () => {
    const harpia: ItemJogo = { id: "harpia", nome: "H", descricao: "", regras: [{ tipo: "sequencia", acertos: 20 }] };
    expect(avaliarItens(ctx({ itens: [harpia], conquistas: base({ acertosSeguidos: 19 }) })).novos).toEqual([]);
    expect(avaliarItens(ctx({ itens: [harpia], conquistas: base({ acertosSeguidos: 20 }) })).novos).toEqual(["harpia"]);
  });

  it("horário: o Corujuris só libera entre 0h e 6h", () => {
    const coruja: ItemJogo = { id: "coruja", nome: "C", descricao: "", regras: [{ tipo: "horario", de: 0, ate: 6 }] };
    expect(avaliarItens(ctx({ itens: [coruja], agora: new Date(2026, 9, 16, 2) })).novos).toEqual(["coruja"]);
    expect(avaliarItens(ctx({ itens: [coruja], agora: new Date(2026, 9, 16, 6) })).novos).toEqual([]);
  });

  it("moedas: 1000 libera o Dracofisco e cobra exatamente 1000", () => {
    const drace: ItemJogo = { id: "drace", nome: "D", descricao: "", regras: [{ tipo: "moedas", minimo: 1000, cobra: 1000 }] };
    expect(avaliarItens(ctx({ itens: [drace], moedas: 999 }))).toEqual({ novos: [], cobrar: 0, consumiuAusencia: false });
    expect(avaliarItens(ctx({ itens: [drace], moedas: 1000 }))).toEqual({ novos: ["drace"], cobrar: 1000, consumiuAusencia: false });
  });

  it("ausência: volta depois de 7 dias libera o Gafanhoto e cobra 5% dos juros uma vez", () => {
    const gafanhoto: ItemJogo = { id: "gafa", nome: "G", descricao: "", regras: [{ tipo: "ausencia", dias: 7, juros: 0.05 }] };
    const r = avaliarItens(ctx({ itens: [gafanhoto], moedas: 250, conquistas: base({ ausenciaPendente: true }) }));
    expect(r).toEqual({ novos: ["gafa"], cobrar: 12, consumiuAusencia: true });
  });

  it("todas as outras compras: o Falcão libera quando os outros itens com custo já foram comprados", () => {
    const estilos: ItemJogo[] = [
      { id: "fofo", nome: "F", descricao: "", custo: 40 },
      { id: "noir", nome: "N", descricao: "", custo: 90 },
    ];
    const falcao: ItemJogo = { id: "falcao", nome: "X", descricao: "", regras: [{ tipo: "todas-compras" }] };
    const itens = [...estilos, falcao];
    expect(avaliarItens(ctx({ itens, comprados: ["fofo"] })).novos).toEqual([]);
    expect(avaliarItens(ctx({ itens, comprados: ["fofo", "noir"] })).novos).toEqual(["falcao"]);
  });

  it("todas-compras ignora os estilos dos grupos", () => {
    const estilos: ItemJogo[] = [
      { id: "fofo", nome: "F", descricao: "", custo: 40 },
      { id: "noir", nome: "N", descricao: "", custo: 90 },
    ];
    const natal: ItemJogo = { id: "natal", nome: "N", descricao: "", custo: 5669, grupo: "feriados" };
    const falcao: ItemJogo = { id: "falcao", nome: "X", descricao: "", regras: [{ tipo: "todas-compras" }] };
    const itens = [...estilos, natal, falcao];
    expect(avaliarItens(ctx({ itens, comprados: ["fofo", "noir"] })).novos).toEqual(["falcao"]);
  });

  it("itens já comprados não são liberados de novo nem cobrados de novo", () => {
    const drace: ItemJogo = { id: "drace", nome: "D", descricao: "", regras: [{ tipo: "moedas", minimo: 1000, cobra: 1000 }] };
    expect(avaliarItens(ctx({ itens: [drace], moedas: 5000, comprados: ["drace"] }))).toEqual({ novos: [], cobrar: 0, consumiuAusencia: false });
  });

  it("textos de requisito", () => {
    const nome = (id: string) => (id === "peca-detalhe" ? "Por dentro da peça" : id);
    const pec: ItemJogo = { id: "p", nome: "P", descricao: "", regras: [{ tipo: "categoria", categoria: "peca-detalhe", acertos: 20 }] };
    expect(textoRequisito(pec, nome)).toBe("20 respostas certas em Por dentro da peça");
    expect(textoRequisito({ id: "x", nome: "X", descricao: "" }, nome)).toBeUndefined();
  });
});
