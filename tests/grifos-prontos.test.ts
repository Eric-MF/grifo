import { describe, expect, it } from "vitest";
import { prontosDosBlocos, type GrifosProntos } from "@/lib/leis/grifos";
import { blocosDoItem } from "@/lib/leis/vademecum";
import type { Bloco } from "@/lib/leis/linha-do-tempo";

const prontos: GrifosProntos = {
  materias: [{ rotulo: "Competência", lei: "cpp", artigos: "69-91", nota: "Da competência" }],
};
const cores = (rotulo: string) => (rotulo === "Competência" ? "#fde047" : undefined);
const blocos = [
  { disp: "art69" },
  { disp: "art100" },
  { disp: "art70", superada: true },
  { disp: "art85.p1" },
];

describe("grifos prontos por bloco", () => {
  it("marca o dispositivo da área, com a cor do sistema, e deixa de fora o revogado e o que não tem cor", () => {
    const m = prontosDosBlocos(blocos, prontos, "materias", "cpp", cores);
    expect([...m.keys()]).toEqual([0, 3]);
    expect(m.get(0)).toEqual({ tipo: "area", rotulo: "Competência", cor: "#fde047", nota: "Da competência" });
  });

  it("sem cor para o rótulo no sistema, nenhum bloco recebe o grifo", () => {
    expect(prontosDosBlocos(blocos, prontos, "materias", "cpp", () => undefined).size).toBe(0);
  });
});

describe("filtro de grifos automáticos no vade-mécum", () => {
  const lei: Bloco[] = [
    { tipo: "estrutura", texto: "TÍTULO II", superada: false, atos: [] },
    { tipo: "artigo", disp: "art69", rotulo: "Art. 69", texto: "Art. 69. Compete ao juiz.", superada: false, atos: [] },
    { tipo: "artigo", disp: "art70", rotulo: "Art. 70", texto: "Art. 70. Outro assunto.", superada: false, atos: [] },
  ];
  it("mostra só o artigo com grifo automático (e o título antes dele)", () => {
    const itens = blocosDoItem(lei, { filtro: "automaticos" }, false, new Set([1]));
    expect(itens.map((x) => x.bloco.disp ?? x.bloco.tipo)).toEqual(["estrutura", "art69"]);
  });
  it("sem nenhum grifo automático, nada entra", () => {
    expect(blocosDoItem(lei, { filtro: "automaticos" }, false, new Set())).toEqual([]);
  });
});
