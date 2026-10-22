import { describe, expect, it } from "vitest";
import { gruposTocados, novaMarcacao, pedeConfirmacao } from "@/lib/leis/marcacoes";

const textos = ["Art. 1º o réu responde pelo crime, sem prejuízo da pena.", "Art. 2º nada se altera aqui."];
const disps = ["art1", "art2"];

describe("grupos de grifos que uma seleção toca", () => {
  it("só entra o grifo que se sobrepõe ao trecho selecionado", () => {
    const a = novaMarcacao(textos[0]!, 9, 18, 0, "art1", "#fde047");
    const b = novaMarcacao(textos[1]!, 0, 6, 1, "art2", "#fde047");
    const tocados = gruposTocados([a, b], textos, disps, [{ i: 0, ini: 0, fim: 12 }]);
    expect([...tocados]).toEqual([a.id]);
  });

  it("não toca um grifo do mesmo bloco que fica depois do trecho", () => {
    const a = novaMarcacao(textos[0]!, 9, 18, 0, "art1", "#fde047");
    expect(gruposTocados([a], textos, disps, [{ i: 0, ini: 0, fim: 9 }]).size).toBe(0);
  });

  it("uma seleção que atravessa parágrafos é um grupo: tocar uma parte conta o grupo inteiro", () => {
    const a = { ...novaMarcacao(textos[0]!, 9, 18, 0, "art1", "#fde047"), grupo: "g" };
    const b = { ...novaMarcacao(textos[1]!, 0, 6, 1, "art2", "#fde047"), grupo: "g" };
    const tocados = gruposTocados([a, b], textos, disps, [{ i: 1, ini: 0, fim: 3 }]);
    expect([...tocados]).toEqual(["g"]);
  });

  it("sem trecho nenhum, nada é tocado", () => {
    const a = novaMarcacao(textos[0]!, 9, 18, 0, "art1", "#fde047");
    expect(gruposTocados([a], textos, disps, []).size).toBe(0);
  });
});

describe("quando apagar a seleção pede confirmação", () => {
  it("mais de 5 grifos de uma vez: pede", () => {
    expect(pedeConfirmacao(6, 10)).toBe("muitos");
    expect(pedeConfirmacao(5, 10)).toBeNull();
  });

  it("a seleção cobre todos os grifos da lei, e a lei tem mais de 3: pede (mensagem de todos)", () => {
    expect(pedeConfirmacao(4, 4)).toBe("todos");
    expect(pedeConfirmacao(6, 6)).toBe("todos");
  });

  it("a lei tem 3 grifos ou menos: apagar todos não pede", () => {
    expect(pedeConfirmacao(3, 3)).toBeNull();
    expect(pedeConfirmacao(2, 2)).toBeNull();
  });

  it("apagar uma parte da lei, sem ser tudo nem mais de 5, não pede", () => {
    expect(pedeConfirmacao(2, 10)).toBeNull();
  });
});
