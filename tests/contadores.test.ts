import { describe, expect, it } from "vitest";
import {
  abreviarMoedas,
  abreviarNumero,
  fatorVelocidadeVidas,
  formatarMoedas,
  formatarXp,
  numeroContador,
  textoContador,
} from "@/games/contadores";
import { textoRequisito } from "@/games/regras";

describe("abreviação de números (moedas e XP)", () => {
  it("abaixo de mil, o número exato", () => {
    expect(abreviarNumero(0)).toBe("0");
    expect(abreviarNumero(1)).toBe("1");
    expect(abreviarNumero(999)).toBe("999");
  });

  it("mil viram k, com vírgula quando há fração e sem ',0'", () => {
    expect(abreviarNumero(1000)).toBe("1k");
    expect(abreviarNumero(1200)).toBe("1,2k");
    expect(abreviarNumero(1500)).toBe("1,5k");
    expect(abreviarNumero(3000)).toBe("3k");
    expect(abreviarNumero(3050)).toBe("3k");
  });

  it("a casa decimal é truncada: nunca mostra mais do que há", () => {
    expect(abreviarNumero(1460)).toBe("1,4k");
    expect(abreviarNumero(1999)).toBe("1,9k");
    expect(abreviarNumero(9999)).toBe("9,9k");
  });

  it("de 10 mil em diante, só o inteiro; milhões viram M", () => {
    expect(abreviarNumero(10_000)).toBe("10k");
    expect(abreviarNumero(12_345)).toBe("12k");
    expect(abreviarNumero(999_999)).toBe("999k");
    expect(abreviarNumero(1_000_000)).toBe("1M");
    expect(abreviarNumero(1_234_567)).toBe("1,2M");
    expect(abreviarNumero(12_345_678)).toBe("12M");
    expect(abreviarNumero(999_999_999)).toBe("999M");
  });

  it("de 1 bilhão em diante, B (sem '1000M')", () => {
    expect(abreviarNumero(1_000_000_000)).toBe("1B");
    expect(abreviarNumero(1_234_567_890)).toBe("1,2B");
    expect(abreviarNumero(12_345_678_901)).toBe("12B");
  });

  it("valores inválidos ou negativos saem como 0, frações são descartadas", () => {
    expect(abreviarNumero(-5)).toBe("0");
    expect(abreviarNumero(Number.NaN)).toBe("0");
    expect(abreviarNumero(999.9)).toBe("999");
  });

  it("o contador do HUD usa a mesma abreviação", () => {
    expect(abreviarMoedas(3000)).toBe("3k");
    expect(abreviarMoedas(1500)).toBe("1,5k");
  });
});

describe("moedas com a unidade", () => {
  it("singular só para 1; zero e o resto no plural", () => {
    expect(formatarMoedas(0)).toBe("0 moedas");
    expect(formatarMoedas(1)).toBe("1 moeda");
    expect(formatarMoedas(2)).toBe("2 moedas");
    expect(formatarMoedas(999)).toBe("999 moedas");
  });

  it("milhares e milhões abreviados", () => {
    expect(formatarMoedas(1000)).toBe("1k moedas");
    expect(formatarMoedas(3000)).toBe("3k moedas");
    expect(formatarMoedas(12_345)).toBe("12k moedas");
    expect(formatarMoedas(1_234_567)).toBe("1,2M moedas");
  });
});

describe("XP com a unidade", () => {
  it("sigla invariável", () => {
    expect(formatarXp(0)).toBe("0 XP");
    expect(formatarXp(1)).toBe("1 XP");
    expect(formatarXp(800)).toBe("800 XP");
  });

  it("milhares de XP", () => {
    expect(formatarXp(1200)).toBe("1,2k XP");
    expect(formatarXp(2500)).toBe("2,5k XP");
    expect(formatarXp(5000)).toBe("5k XP");
    expect(formatarXp(15_750)).toBe("15k XP");
    expect(formatarXp(250_000)).toBe("250k XP");
    expect(formatarXp(1_000_000)).toBe("1M XP");
  });
});

describe("contadores do fim de jogo", () => {
  it("moedas e XP abreviados; outras contagens por extenso", () => {
    expect(textoContador(1200, "Experiência", "xp")).toBe("1,2k XP");
    expect(textoContador(3000, "Moedas", "moedas")).toBe("3k moedas");
    expect(textoContador(1234, "Colunas")).toBe("1.234 colunas");
    expect(numeroContador(1200, "xp")).toBe("1,2k");
    expect(numeroContador(1234)).toBe("1.234");
  });
});

describe("requisito de moedas", () => {
  it("usa a abreviação", () => {
    const item = { id: "d", nome: "D", descricao: "", regras: [{ tipo: "moedas" as const, minimo: 1000, cobra: 1000 }] };
    expect(textoRequisito(item, (id) => id)).toBe("juntar 1k moedas");
  });
});

describe("aceleração pelas vidas", () => {
  it("sem vidas extras, a velocidade é a normal", () => {
    expect(fatorVelocidadeVidas(0)).toBe(1);
  });

  it("com 5 vidas, a velocidade fica praticamente no dobro", () => {
    expect(fatorVelocidadeVidas(5)).toBeCloseTo(1.95);
  });
});
