import { describe, expect, it } from "vitest";
import { apagarMarca, type Marcacao } from "@/lib/leis/marcacoes";

const marca = (id: string, extra: Partial<Marcacao> = {}): Marcacao => ({ id, i: 0, exato: "x", prefixo: "", sufixo: "", cor: "#fde047", em: 0, ...extra });

describe("apagar uma marcação", () => {
  it("apaga a seleção inteira quando ela atravessa parágrafos (todas as partes do grupo)", () => {
    const ms = [marca("a", { grupo: "a" }), marca("b", { grupo: "a", inteiro: true }), marca("c", { grupo: "a" }), marca("z")];
    expect(apagarMarca(ms, "b").map((m) => m.id)).toEqual(["z"]);
    expect(apagarMarca(ms, "a").map((m) => m.id)).toEqual(["z"]);
  });

  it("apaga só a marcação quando ela não faz parte de um grupo", () => {
    const ms = [marca("a"), marca("b")];
    expect(apagarMarca(ms, "a").map((m) => m.id)).toEqual(["b"]);
  });

  it("não muda nada quando o id não existe", () => {
    const ms = [marca("a")];
    expect(apagarMarca(ms, "nada")).toBe(ms);
  });
});
