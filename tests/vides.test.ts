import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { aplicarVides } = await import("../src/lib/leis/vides.ts");
const { blocosDeSumulas, carregarLei, videsDoGrifo } = await import("../src/content/leis.ts");
const { indiceDeCitacoes } = await import("../src/content/citacoes.ts");

describe("Vide do Grifo (content/vides.yaml)", () => {
  it("cada membro do grupo aponta para todos os outros, sem repetir", () => {
    const blocos = [
      { tipo: "artigo", disp: "art1", superada: true, texto: "velho", atos: [] },
      { tipo: "artigo", disp: "art1", texto: "Art. 1", atos: [{ tipo: "vide", bruto: "(Vide art. 2)", lei: "x", art: "art2" }] },
    ] as Parameters<typeof aplicarVides>[0];
    const grupos = [{ tema: "t", membros: [{ lei: "x", disp: "art1", rotulo: "art. 1" }, { lei: "x", disp: "art2", rotulo: "art. 2" }, { lei: "y", disp: "s-1", rotulo: "Súmula 1" }] }];
    const [velho, novo] = aplicarVides(blocos, "x", grupos);
    expect(velho!.atos).toEqual([]);
    expect(novo!.atos.map((a) => a.bruto)).toEqual(["(Vide art. 2)", "(Vide Súmula 1)"]);
  });

  it("produção antecipada: 225, 366 e 564, IV do CPP e a Súmula 455 do STJ ligados entre si", () => {
    expect(videsDoGrifo().some((g) => g.membros.length === 4)).toBe(true);
    const cpp = carregarLei("cpp").blocos;
    const vides = (disp: string) => cpp.find((b) => b.disp === disp && !b.superada)!.atos.filter((a) => a.tipo === "vide").map((a) => `${a.lei} ${a.art}`);
    expect(vides("art366")).toEqual(expect.arrayContaining(["cpp art225", "cpp art564.i4", "sumulas-stj s-455"]));
    expect(vides("art225")).toEqual(expect.arrayContaining(["cpp art366", "cpp art564.i4", "sumulas-stj s-455"]));
    expect(vides("art564.i4")).toEqual(expect.arrayContaining(["cpp art225", "cpp art366", "sumulas-stj s-455"]));
    const s455 = blocosDeSumulas("stj").find((b) => b.disp === "s-455")!;
    expect(s455.atos.map((a) => `${a.lei} ${a.art}`)).toEqual(expect.arrayContaining(["cpp art225", "cpp art366", "cpp art564.i4"]));
  });
});

describe("citado por", () => {
  it("a súmula que cita o artigo entra no citado por dele", () => {
    const { citacoes, nomes } = indiceDeCitacoes();
    expect(citacoes["cpp|art366"]).toEqual(expect.arrayContaining([expect.objectContaining({ d: "sumulas-stj", a: "s-455" })]));
    expect(nomes["sumulas-stj"]).toBe("Súmulas do STJ");
  });
});
