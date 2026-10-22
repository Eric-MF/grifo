import { describe, expect, it } from "vitest";
import { achadosDoNumero } from "@/lib/leis/busca";

const artigos: [string, string, string][] = [
  ["art98", "Art. 98", "Art. 98. Texto do artigo noventa e oito."],
  ["art98-a", "Art. 98-A", "Art. 98-A. Outro artigo."],
  ["art980", "Art. 980", "Art. 980. Fora da busca."],
  ["art12", "Art. 12", "Art. 12. Texto."],
];

describe("achadosDoNumero: número de artigo nas outras leis", () => {
  it("acha o artigo exato e os que começam com o mesmo número, com o texto de início", () => {
    const achados = achadosDoNumero("98", artigos);
    expect(achados.map((a) => a.rotulo)).toEqual(["Art. 98", "Art. 98-A", "Art. 980"]);
    expect(achados[0]!.depois).toBe("Texto do artigo noventa e oito.");
  });

  it("não acha nada quando nenhum artigo tem o número", () => {
    expect(achadosDoNumero("77", artigos)).toEqual([]);
  });

  it("texto que não é número não produz achados por número", () => {
    expect(achadosDoNumero("furto", artigos)).toEqual([]);
  });
});
