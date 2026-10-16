import { describe, expect, it } from "vitest";
import { itensComoJogar, ordenarPersonagens, type Progresso } from "@/games/progresso";
import type { ItemJogo } from "@/games/types";

const SEM_PROGRESSO: Progresso = { xp: 0, moedas: 0, comprados: [] };
const comprados = (ids: string[]): Progresso => ({ ...SEM_PROGRESSO, comprados: ids });

// mesma ordem do módulo: a Maleta é liberada de início; Balança e Delegado por XP; Peçasus por regra; Corujuris é secreto
const personagens: ItemJogo[] = [
  { id: "maleta", nome: "Maleta", descricao: "", xp: 0 },
  { id: "balanca", nome: "Balança", descricao: "", xp: 60 },
  { id: "delegado", nome: "Delegado", descricao: "", xp: 150 },
  { id: "pecasus", nome: "Peçasus", descricao: "", regras: [{ tipo: "sequencia", acertos: 20 }] },
  { id: "corujuris", nome: "Corujuris", descricao: "", secreto: true, regras: [{ tipo: "horario", de: 0, ate: 6 }] },
];
const ids = (lista: ItemJogo[]) => lista.map((p) => p.id);

describe("ordem dos personagens no seletor", () => {
  it("sem progresso: o liberado vem primeiro, os bloqueados por último, e o secreto some", () => {
    expect(ids(ordenarPersonagens(personagens, SEM_PROGRESSO))).toEqual(["maleta", "balanca", "delegado", "pecasus"]);
  });

  it("personagem liberado fora da ordem vai antes dos bloqueados, na posição normal entre os liberados", () => {
    expect(ids(ordenarPersonagens(personagens, comprados(["pecasus"])))).toEqual(["maleta", "pecasus", "balanca", "delegado"]);
  });

  it("secreto liberado aparece antes de um bloqueado", () => {
    expect(ids(ordenarPersonagens(personagens, comprados(["pecasus", "corujuris"])))).toEqual([
      "maleta",
      "pecasus",
      "corujuris",
      "balanca",
      "delegado",
    ]);
  });

  it("com tudo liberado, a ordem volta a ser a normal do módulo", () => {
    const tudo: Progresso = { xp: 10_000, moedas: 0, comprados: ["pecasus", "corujuris"] };
    expect(ids(ordenarPersonagens(personagens, tudo))).toEqual(ids(personagens));
  });

  it("não altera a lista recebida", () => {
    const antes = ids(personagens);
    ordenarPersonagens(personagens, comprados(["pecasus"]));
    expect(ids(personagens)).toEqual(antes);
  });
});

describe("Como jogar: poderes de personagens bloqueados não aparecem", () => {
  const itens = [
    { texto: "Vade Mecum: atrai as moedas próximas.", personagem: undefined },
    { texto: "Inquérito: recolhe as moedas (poder do personagem Delegado)", personagem: "delegado" },
    { texto: "Sabedoria da noite: XP em dobro (poder do personagem Corujuris)", personagem: "corujuris" },
    { texto: "Poder órfão (dono que não existe)", personagem: "fantasma" },
  ];
  const textos = (lista: { texto: string }[]) => lista.map((it) => it.texto);

  it("sem progresso: só os poderes gerais", () => {
    expect(textos(itensComoJogar(itens, personagens, SEM_PROGRESSO))).toEqual(["Vade Mecum: atrai as moedas próximas."]);
  });

  it("o poder de um secreto aparece só depois que ele é liberado", () => {
    expect(textos(itensComoJogar(itens, personagens, comprados(["corujuris"])))).toEqual([
      "Vade Mecum: atrai as moedas próximas.",
      "Sabedoria da noite: XP em dobro (poder do personagem Corujuris)",
    ]);
  });

  it("um poder cujo dono não está na lista fica escondido", () => {
    const tudo: Progresso = { xp: 10_000, moedas: 0, comprados: ["corujuris"] };
    expect(textos(itensComoJogar(itens, personagens, tudo))).not.toContain("Poder órfão (dono que não existe)");
  });
});
