import { describe, expect, it } from "vitest";
import { blocosCitados, mapaAncoras } from "@/lib/leis/html";
import { diplomaDaAlteracao } from "@/lib/leis/referencias";
import type { Bloco } from "@/lib/leis/linha-do-tempo";

const bloco = (tipo: Bloco["tipo"], rotulo: string | undefined, disp: string | undefined, texto: string) =>
  ({ tipo, rotulo, disp, texto, superada: false }) as Bloco;

// Lei 8.072: o art. 6º altera artigos do Código Penal e copia a redação deles antes do art. 7º desta lei
const lei8072: Bloco[] = [
  bloco("artigo", "Art. 6º", "art6", "Art. 6º Os arts. 157, § 3º; 159, caput; 213, todos do Código Penal, passam a vigorar com a seguinte redação:"),
  bloco("texto", undefined, "art6", '"Art. 157. ....'),
  bloco("artigo", "Art. 159", "art159", "Art. 159. ...."),
  bloco("paragrafo", "§ 1º", "art159.p1", "§ 1º ...."),
  bloco("artigo", "Art. 213", "art213", "Art. 213. ...."),
  bloco("artigo", "Art. 7º", "art7", "Art. 7º Os crimes previstos nos arts. 159, caput, são hediondos."),
];

describe("texto copiado de outra lei não ganha âncora da lei que o copia", () => {
  it("reconhece o artigo que altera o Código Penal", () => {
    expect(diplomaDaAlteracao(lei8072[0]!.texto)).toBe("cp");
  });

  it("marca os blocos copiados e deixa de fora o próprio artigo que altera e o art. 7º desta lei", () => {
    const citados = blocosCitados(lei8072, "lei-8072");
    expect([...citados].sort()).toEqual([1, 2, 3, 4]);
  });

  it("art. 159 não tem âncora na 8.072, então a referência sem diploma vai ao Código Penal", () => {
    const ancoras = mapaAncoras(lei8072, "lei-8072");
    expect(ancoras.has("art159")).toBe(false);
    expect(ancoras.has("art213")).toBe(false);
    expect(ancoras.get("art6")).toBe(0);
    expect(ancoras.get("art7")).toBe(5);
  });

  it("pena que é 'acrescida de metade' não é alteração: o art. 6º da própria 8.072 continua sendo dela", () => {
    const pena = "Art. 9º As penas fixadas no art. 6º para os crimes capitulados nos arts. 157, § 3º, todos do Código Penal, são acrescidas de metade.";
    expect(diplomaDaAlteracao(pena)).toBeNull();
  });

  it("o artigo que altera a própria lei não abre cópia", () => {
    const propria: Bloco[] = [
      bloco("artigo", "Art. 2º", "art2", "Art. 2º O art. 3º desta Lei passa a vigorar com a seguinte redação:"),
      bloco("artigo", "Art. 3º", "art3", "Art. 3º Texto."),
    ];
    expect(blocosCitados(propria, "lei-x").size).toBe(0);
  });

  it("a cópia termina no próximo artigo desta lei, mesmo quando a numeração pula (10-A)", () => {
    const pulo: Bloco[] = [
      bloco("artigo", "Art. 10", "art10", "Art. 10. O art. 35 da Lei nº 6.368, de 21 de outubro de 1976, passa a vigorar acrescido de parágrafo único:"),
      bloco("artigo", "Art. 35", "art35", "Art. 35. ...."),
      bloco("artigo", "Art. 10-A", "art10a", "Art. 10-A. Texto."),
    ];
    expect([...blocosCitados(pulo, "lei-8072")]).toEqual([1]);
  });
});
