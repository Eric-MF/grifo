import { describe, expect, it, vi } from "vitest";
import {
  copiarSistema,
  corDoGrifo,
  corDoPronto,
  corUnicas,
  idDosProntos,
  lerLegendas,
  migrarLegendas,
  migrarSistema,
  prontosNoSistema,
  rotuloDoGrifo,
  SISTEMAS_PRONTOS,
  type Sistema,
} from "../src/lib/leis/legendas.ts";
import { grifosDoJson } from "../src/lib/leis/grifos.ts";
import realJson from "../src/content/generated/grifos.json";

const [essenciais, geral] = SISTEMAS_PRONTOS as [Sistema, Sistema];

describe("copiar um sistema pronto", () => {
  it("traz id e nome novos, a base, as mesmas cores e rótulos, e a origem de cada cor", () => {
    const copia = copiarSistema(geral!, { id: "meu-1", nome: "Minhas teses" });
    expect(copia.id).toBe("meu-1");
    expect(copia.nome).toBe("Minhas teses");
    expect(copia.base).toBe("geral");
    expect(copia.cores.map((c) => [c.cor, c.rotulo])).toEqual(geral!.cores.map((c) => [c.cor, c.rotulo]));
    expect(copia.cores.map((c) => c.origem)).toEqual(geral!.cores.map((c) => c.rotulo));
  });

  it("a cópia não compartilha objetos com o pronto", () => {
    const copia = copiarSistema(geral!, { id: "meu-1", nome: "Minhas teses" });
    copia.cores[0]!.cor = "#000000";
    copia.cores[0]!.rotulo = "Outro";
    expect(geral!.cores[0]).toEqual({ cor: "#86efac", rotulo: "Peças" });
    expect(SISTEMAS_PRONTOS[1]!.cores[0]!.rotulo).toBe("Peças");
  });

  it("depois de trocar rótulo e cor na cópia, o grifo pronto continua com a cor nova", () => {
    const copia = copiarSistema(geral!, { id: "meu-1", nome: "Minhas teses" });
    copia.cores[0] = { ...copia.cores[0]!, cor: "#000001", rotulo: "Foro" };
    expect(corDoPronto(copia, "Peças")).toBe("#000001");
    expect(idDosProntos(copia)).toBe("geral");
    expect(idDosProntos(essenciais!)).toBe("essenciais");
  });

  it("copiar de um sistema do usuário com base mantém a base e as origens", () => {
    const copia1 = copiarSistema(essenciais!, { id: "meu-1", nome: "Um" });
    copia1.cores[1] = { ...copia1.cores[1]!, rotulo: "Teses da defesa" };
    const copia2 = copiarSistema(copia1, { id: "meu-2", nome: "Dois" });
    expect(copia2.base).toBe("essenciais");
    expect(copia2.cores.map((c) => c.origem)).toEqual(["Peças", "Teses", "Súmulas", "Pedidos"]);
    expect(corDoPronto(copia2, "Teses")).toBe(essenciais!.cores[1]!.cor);
  });

  it("copiar de um sistema do usuário sem base não cria base nem origem", () => {
    const proprio: Sistema = { id: "meu-3", nome: "Próprio", cores: [{ cor: "#111111", rotulo: "Algo" }] };
    const copia = copiarSistema(proprio, { id: "meu-4", nome: "Cópia" });
    expect("base" in copia).toBe(false);
    expect("origem" in copia.cores[0]!).toBe(false);
    expect(idDosProntos(copia)).toBe("meu-4");
  });
});

describe("preservação de origem e base", () => {
  it("corUnicas preserva origem, inclusive na cor que recebe cor nova", () => {
    const cores = [
      { cor: "#fde047", rotulo: "Teses", origem: "Teses" },
      { cor: "#FDE047", rotulo: "Outra", origem: "Teses" },
    ];
    const unicas = corUnicas(cores);
    expect(unicas[0]!.origem).toBe("Teses");
    expect(unicas[1]!.origem).toBe("Teses");
    expect(unicas[1]!.cor).not.toBe("#FDE047");
  });

  it("lerLegendas preserva base e origem dos sistemas salvos", () => {
    const salvo = {
      ativo: "meu-1",
      porLei: {},
      meus: [
        { id: "meu-1", nome: "Minhas", base: "geral", cores: [{ cor: "#93c5fd", rotulo: "Foro", origem: "Súmulas" }] },
      ],
    };
    // o ambiente de teste é node: um localStorage de mentira, só com a chave dos grifos
    vi.stubGlobal("localStorage", { getItem: () => JSON.stringify(salvo), setItem: () => {}, removeItem: () => {} });
    try {
      const e = lerLegendas();
      expect(e.meus[0]!.base).toBe("geral");
      expect(e.meus[0]!.cores[0]).toEqual({ cor: "#93c5fd", rotulo: "Foro", origem: "Súmulas" });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("grifos prontos de uma cópia", () => {
  const grifos = grifosDoJson(realJson);

  it("a cópia do Geral com outra cor de Teses pinta os grifos de teses com ela", () => {
    const copia = copiarSistema(geral!, { id: "meu-1", nome: "Minhas teses" });
    copia.cores[1] = { ...copia.cores[1]!, cor: "#123456", rotulo: "Minhas teses" };
    const prontos = prontosNoSistema(grifos, copia, "cpp");
    expect(prontos.length).toBeGreaterThan(0);
    expect(prontos.every((g) => corDoGrifo(copia, g))).toBe(true);
    expect(corDoGrifo(copia, { cor: "teses" })).toBe("#123456");
    expect(rotuloDoGrifo(copia, { cor: "teses" })).toBe("Minhas teses");
  });

  it("uma cópia sem a cor de Pedidos não mostra grifos de pedidos", () => {
    const copia = copiarSistema(geral!, { id: "meu-2", nome: "Sem pedidos" });
    copia.cores = copia.cores.filter((c) => c.origem !== "Pedidos");
    expect(prontosNoSistema(grifos, geral!, "cpp").some((g) => g.cor === "pedidos")).toBe(true);
    expect(prontosNoSistema(grifos, copia, "cpp").some((g) => g.cor === "pedidos")).toBe(false);
  });
});

describe("migração dos sistemas antigos", () => {
  const antigo = {
    ativo: "materias",
    porLei: { cp: "teses", cpp: "meu-1" },
    meus: [
      {
        id: "meu-1",
        nome: "x",
        base: "teses",
        cores: [
          { cor: "#111111", rotulo: "Foro", origem: "Teses principais" },
          { cor: "#222222", rotulo: "Rec", origem: "Recursos" },
          { cor: "#333333", rotulo: "Outra", origem: "Competência" },
        ],
      },
    ],
  };

  it("troca os ids antigos pelos de agora: ativo, escolha da lei e base", () => {
    const m = migrarLegendas(antigo);
    expect(m.ativo).toBe("essenciais");
    expect(m.porLei.cp).toBe("essenciais");
    expect(m.porLei.cpp).toBe("meu-1");
    expect(m.meus[0]!.base).toBe("essenciais");
  });

  it("traduz as origens antigas e deixa sem equivalente como está", () => {
    const m = migrarLegendas(antigo);
    expect(m.meus[0]!.cores.map((c) => c.origem)).toEqual(["Teses", "Peças", "Competência"]);
  });

  it("um sistema sem base antiga volta igual", () => {
    const proprio: Sistema = { id: "meu-5", nome: "Próprio", base: "geral", cores: [{ cor: "#444444", rotulo: "Algo", origem: "Pedidos" }] };
    expect(migrarSistema(proprio)).toEqual(proprio);
  });
});
