import { describe, expect, it } from "vitest";
import { contextoCorrecao } from "../src/lib/correcao/cliente.ts";
import { distancia, pecasAproximadas } from "../src/quiz/pecaAproximada.ts";
import { pecasFaladas, previaDaPeca } from "../src/quiz/verificar.ts";

const pecas = contextoCorrecao().pecas;
const nomes = (texto: string) => pecasAproximadas(texto, pecas).map((x) => x.nome);

describe("pecasAproximadas: a peça escrita de um jeito aproximado", () => {
  it.each([
    ["Resposta Acusação", ["Resposta à Acusação"]],
    ["Mem", ["Memoriais"]],
    ["Memorias", ["Memoriais"]],
    ["memorias finais", ["Memoriais"]],
    ["Apelaçao", ["Apelação"]],
    ["Revisao Crimnal", ["Revisão Criminal"]],
    ["Relaxamneto", ["Relaxamento de Prisão"]],
    ["rec sent estr", ["Recurso em Sentido Estrito"]],
    ["Mandado", ["Mandado de Segurança"]],
  ])("“%s” aponta %j", (texto, esperado) => {
    expect(nomes(texto)).toEqual(esperado);
  });

  it("“embargos” é de duas peças: as duas, empatadas", () => {
    const achadas = nomes("embargos");
    expect(achadas).toHaveLength(2);
    expect(achadas).toEqual(expect.arrayContaining(["Embargos de Declaração", "Embargos Infringentes e de Nulidade"]));
  });

  it("“Contrarrazões” também são de duas peças", () => {
    expect(nomes("Contrarrazões")).toHaveLength(2);
  });

  it("“recurso” é de três peças ou mais", () => {
    expect(nomes("recurso").length).toBeGreaterThanOrEqual(3);
  });

  it("“xyz” não é peça nenhuma, e o texto vazio também não", () => {
    expect(pecasAproximadas("xyz", pecas)).toEqual([]);
    expect(pecasAproximadas("", pecas)).toEqual([]);
  });
});

describe("distancia: as letras trocadas, postas ou tiradas", () => {
  it("uma letra a mais ou a menos conta uma", () => {
    expect(distancia("memorias", "memoriais")).toBe(1);
  });

  it("textos iguais não se distanciam", () => {
    expect(distancia("abc", "abc")).toBe(0);
  });

  it("a troca de duas letras vizinhas conta uma", () => {
    expect(distancia("ab", "ba")).toBe(1);
  });
});

describe("verificar: a prévia e a fala usam o nome aproximado", () => {
  it("a prévia da peça aceita o nome aproximado", () => {
    expect(previaDaPeca("Mem")).toEqual(["Memoriais"]);
  });

  it("falando, o nome de várias peças não escolhe nenhuma", () => {
    expect(pecasFaladas("recurso")).toEqual([]);
  });

  it("falando, a primeira de duas peças nomeadas é a que vale", () => {
    expect(pecasFaladas("apelação ou memoriais")[0]).toBe("Apelação");
  });
});
