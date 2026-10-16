import { describe, expect, it } from "vitest";
import { marcarRecorde, quebrouRecorde } from "@/games/flap-suitcase/recorde";
import { TEMAS } from "@/games/flap-suitcase/themes";

describe("linha do recorde", () => {
  it("quebra quando a pontuação passa do recorde guardado, com a mesma regra do 'Novo recorde!' do fim", () => {
    expect(quebrouRecorde(13, 10)).toBe(true);
    expect(quebrouRecorde(10, 10)).toBe(false);
    expect(quebrouRecorde(1, 0)).toBe(true);
    expect(quebrouRecorde(0, 0)).toBe(false);
  });

  it("salto de mais de um ponto por coluna (Foco, Concurso Material, Dosimetria): marca na coluna do salto", () => {
    // Foco dá 3 pontos por coluna: 9 para 12 com recorde 10 passa na coluna de x = 300
    let marca = marcarRecorde(null, 9, 10, 100);
    marca = marcarRecorde(marca, 12, 10, 300);
    expect(marca).toBe(300);
  });

  it("depois de marcada, a posição não muda, mesmo com penalidade ou mais pontos", () => {
    let marca = marcarRecorde(null, 12, 10, 300);
    marca = marcarRecorde(marca, 3, 10, 500); // a penalidade tirou pontos
    marca = marcarRecorde(marca, 40, 10, 700);
    expect(marca).toBe(300);
  });

  it("sem passar do recorde, não há marca", () => {
    expect(marcarRecorde(null, 10, 10, 200)).toBeNull();
  });

  it("cada estilo tem aviso de recorde com texto próprio", () => {
    expect(TEMAS.every((t) => t.paleta.recorde.aviso.texto.length > 0)).toBe(true);
  });

  it("cada estilo tem a sua linha (cor e traço diferentes)", () => {
    const estilos = TEMAS.map((t) => `${t.paleta.recorde.cor}|${t.paleta.recorde.traco.join(",")}`);
    expect(new Set(estilos).size).toBe(TEMAS.length);
  });
});
