import { describe, expect, it } from "vitest";
import { itensDoMicrofone, velocidadeDeslizada, velocidadeSeguinte, volumeDeslizado } from "../src/components/leis/ControlesDaVoz.tsx";

describe("a velocidade e o volume deslizados no botão da voz", () => {
  it("cada passo muda a velocidade em 0,05, dentro dos limites", () => {
    expect(velocidadeDeslizada(1, 6)).toBe(1.3);
    expect(velocidadeDeslizada(1, -4)).toBe(0.8);
    expect(velocidadeDeslizada(1.15, 1)).toBe(1.2);
    expect(velocidadeDeslizada(2.4, 10)).toBe(2.5);
    expect(velocidadeDeslizada(0.6, -10)).toBe(0.5);
  });

  it("para cima o volume sobe, para baixo desce, de 5 em 5%, entre 20% e 100%", () => {
    expect(volumeDeslizado(1, -5)).toBe(0.75);
    expect(volumeDeslizado(0.5, 3)).toBe(0.65);
    expect(volumeDeslizado(0.9, 8)).toBe(1);
    expect(volumeDeslizado(0.3, -8)).toBe(0.2);
  });

  it("o toque vai para a próxima velocidade e, depois da mais rápida, volta à mais lenta", () => {
    expect(velocidadeSeguinte(1)).toBe(1.2);
    expect(velocidadeSeguinte(1.3)).toBe(1.4);
    expect(velocidadeSeguinte(2)).toBe(0.8);
  });
});

describe("o menu de segurar do microfone", () => {
  it("o que ele faz enquanto a voz lê, com o escolhido marcado; a sensibilidade só onde ela vale", () => {
    const mudancas: unknown[] = [];
    const itens = itensDoMicrofone({ microfoneNaLeitura: "fechar", sensibilidade: "alta" }, (m) => mudancas.push(m), false);
    expect(itens.map((i) => i.grupo)).toEqual(["Enquanto a voz lê", "Enquanto a voz lê", "Enquanto a voz lê"]);
    expect(itens.find((i) => i.marcado)?.id).toBe("ler-fechar");
    itens.find((i) => i.id === "ler-ouvir")!.fazer();
    expect(mudancas).toEqual([{ microfoneNaLeitura: "ouvir" }]);
    const comSensibilidade = itensDoMicrofone({ microfoneNaLeitura: "auto", sensibilidade: "alta" }, () => {}, true);
    expect(comSensibilidade.filter((i) => i.grupo === "Sensibilidade").map((i) => [i.id, !!i.marcado])).toEqual([
      ["sens-normal", false],
      ["sens-alta", true],
      ["sens-maxima", false],
    ]);
  });
});
