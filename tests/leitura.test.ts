import { describe, expect, it } from "vitest";
import { fracaoLida, LEITURA_INICIAL, proximaUnidade, registrarLeitura, TEMPO_LEITURA_MS, unidadesDeLeitura } from "@/lib/leis/leitura";
import type { Bloco } from "@/lib/leis/linha-do-tempo";

const bloco = (tipo: Bloco["tipo"], disp?: string, rotulo?: string, superada = false): Bloco => ({ tipo, disp, rotulo, texto: "", superada, atos: [] });

describe("unidades de leitura", () => {
  const blocos: Bloco[] = [
    bloco("estrutura"),
    bloco("artigo", "art1", "Art. 1º"),
    bloco("paragrafo", "art1.p1"),
    bloco("artigo", "art2", "Art. 2º", true),
    bloco("paragrafo", "art2.p1", undefined, true),
    bloco("artigo", "art3", "Art. 3º"),
  ];

  it("são os dispositivos com identificador que não foram superados, na ordem do texto", () => {
    expect(unidadesDeLeitura(blocos).ids).toEqual(["art1", "art1.p1", "art3"]);
  });

  it("os rótulos vêm dos artigos", () => {
    expect(unidadesDeLeitura(blocos).rotulos).toEqual({ art1: "Art. 1º", art3: "Art. 3º" });
  });
});

describe("ordem da leitura", () => {
  const ids = ["art1", "art1.p1", "art2"];
  const rotulos = { art1: "Art. 1º", art2: "Art. 2º" };

  it("só a próxima unidade da ordem conta", () => {
    expect(proximaUnidade(LEITURA_INICIAL, ids)).toBe("art1");
    const l = registrarLeitura(LEITURA_INICIAL, ids, "art1", rotulos);
    expect(l.n).toBe(1);
    expect(l.ultimo).toBe("art1");
  });

  it("uma unidade fora de ordem não muda nada", () => {
    const fora = registrarLeitura(LEITURA_INICIAL, ids, "art2", rotulos);
    expect(fora).toBe(LEITURA_INICIAL);
  });

  it("o último artigo lido é o do último dispositivo contado, mesmo que seja um parágrafo", () => {
    let l = LEITURA_INICIAL;
    l = registrarLeitura(l, ids, "art1", rotulos);
    l = registrarLeitura(l, ids, "art1.p1", rotulos);
    expect(l.n).toBe(2);
    expect(l.rotulo).toBe("Art. 1º");
    l = registrarLeitura(l, ids, "art2", rotulos);
    expect(l.rotulo).toBe("Art. 2º");
  });

  it("depois da última unidade não há próxima", () => {
    let l = LEITURA_INICIAL;
    for (const id of ids) l = registrarLeitura(l, ids, id, rotulos);
    expect(proximaUnidade(l, ids)).toBeNull();
  });
});

describe("fração lida e tempo", () => {
  it("vai de 0 a 1 e não passa do total", () => {
    expect(fracaoLida(0, 10)).toBe(0);
    expect(fracaoLida(5, 10)).toBe(0.5);
    expect(fracaoLida(12, 10)).toBe(1);
    expect(fracaoLida(1, 0)).toBe(0);
  });

  it("um dispositivo conta depois de dois segundos na tela", () => {
    expect(TEMPO_LEITURA_MS).toBe(2000);
  });
});
