import { describe, expect, it } from "vitest";
import { diffLinhas } from "@/lib/diff-linhas";

const so = (antes: string, depois: string) => diffLinhas(antes, depois).filter((t) => t.tipo !== "igual").map((t) => `${t.tipo === "mais" ? "+" : "-"}${t.texto}`);

describe("diffLinhas", () => {
  it("texto igual não tem diferença", () => {
    expect(so("a\nb", "a\nb")).toEqual([]);
  });
  it("troca de uma linha no meio", () => {
    expect(so("a\nb\nc", "a\nX\nc")).toEqual(["-b", "+X"]);
  });
  it("inclusão e remoção", () => {
    expect(so("a\nb", "a\nb\nc")).toEqual(["+c"]);
    expect(so("a\nb\nc", "a\nc")).toEqual(["-b"]);
  });
  it("reconstrói o texto novo a partir das linhas iguais e adicionadas", () => {
    const antes = "x\ny\nz\nw";
    const depois = "y\nq\nz\nr\nw";
    const d = diffLinhas(antes, depois);
    expect(d.filter((t) => t.tipo !== "menos").map((t) => t.texto).join("\n")).toBe(depois);
    expect(d.filter((t) => t.tipo !== "mais").map((t) => t.texto).join("\n")).toBe(antes);
  });
});
