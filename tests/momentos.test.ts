import { describe, expect, it } from "vitest";
import { TEMAS } from "../src/games/flap-suitcase/catalogo";
import { nomesVisual } from "../src/games/flap-suitcase/melhorias";
import {
  type Camada,
  type CenaMomento,
  desenharMecanica,
  desenharMomento,
  type Momento,
  temMecanica,
} from "../src/games/flap-suitcase/momentos";
import { TEXTOS_MOMENTO } from "../src/games/flap-suitcase/momentos-textos";
import { motivoDe } from "../src/games/flap-suitcase/motivos";
import { PODERES, type IdPoder } from "../src/games/flap-suitcase/powers";

/**
 * Contexto de canvas falso: grava o nome de cada método chamado. Propriedades escritas ficam guardadas e voltam
 * quando lidas (globalAlpha começa em 1).
 */
function contextoFalso() {
  const chamadas: string[] = [];
  const estado: Record<string, unknown> = { globalAlpha: 1 };
  const c = new Proxy(estado, {
    get(alvo, prop) {
      if (typeof prop !== "string") return undefined;
      if (prop in alvo) return alvo[prop];
      if (prop === "measureText") {
        return () => {
          chamadas.push(prop);
          return { width: 10 };
        };
      }
      if (prop === "createLinearGradient" || prop === "createRadialGradient") {
        return () => {
          chamadas.push(prop);
          return { addColorStop: () => undefined };
        };
      }
      return () => {
        chamadas.push(prop);
        return undefined;
      };
    },
    set(alvo, prop, valor) {
      if (typeof prop === "string") alvo[prop] = valor;
      return true;
    },
  });
  return { c: c as unknown as CanvasRenderingContext2D, chamadas };
}

/** A cena de um poder: o tema de teste, as cores fixas e a coluna que só registra a chamada. */
function cenaDe(id: string, chamadas: string[]): CenaMomento {
  return {
    tema: TEMAS[0]!,
    cores: ["#ffcc00", "#ffffff", "#ff8800", "#ffeeaa"],
    motivo: motivoDe(id),
    dono: PODERES.find((p) => p.id === id)?.personagem,
    jogador: "maleta",
    t: 1,
    altura: 640,
    largura: 900,
    coluna: () => {
      chamadas.push("coluna");
    },
  };
}

interface Opcoes {
  nivel?: number;
  k?: number;
  camada?: Camada;
  principal?: boolean;
  falhou?: boolean;
}

/** Desenha o momento de `id` numa camada, com o progresso `k` (0 a 1 do tempo do momento). Devolve as chamadas. */
function desenhar(id: IdPoder, o: Opcoes = {}) {
  const { c, chamadas } = contextoFalso();
  const dur = TEXTOS_MOMENTO[id].dur;
  const m: Momento = {
    id,
    x: 300,
    y: 300,
    idade: (o.k ?? 0.3) * dur,
    nivel: o.nivel ?? 1,
    principal: o.principal ?? true,
    ab: 60,
    dx: 120,
    dy: 0,
    n: 1,
    variante: 0,
    alvos: [[40, -10]],
    semente: 7,
    ...(o.falhou ? { falhou: true } : {}),
  };
  desenharMomento(c, m, cenaDe(id, chamadas), o.camada ?? "frente");
  return chamadas;
}

const IDS = PODERES.map((p) => p.id);
const DESENHAM = ["fill", "stroke", "fillRect", "strokeRect", "fillText", "strokeText", "drawImage"];

describe("momentos: textos e tempos", () => {
  it("todo poder tem texto de momento, com tempo entre 0,4 e 2,5 s e âncora válida", () => {
    for (const id of IDS) {
      const t = TEXTOS_MOMENTO[id as IdPoder];
      expect(t, id).toBeDefined();
      expect(t.dur, id).toBeGreaterThanOrEqual(0.4);
      expect(t.dur, id).toBeLessThanOrEqual(2.5);
      expect(["jogador", "coluna", "moeda"], id).toContain(t.ancora);
      for (const nome of t.nomes) expect(nome.length, id).toBeGreaterThan(0);
    }
  });

  it("os nomes do nível 1 são todos diferentes entre si", () => {
    const primeiros = IDS.map((id) => TEXTOS_MOMENTO[id as IdPoder].nomes[0]);
    expect(new Set(primeiros).size).toBe(primeiros.length);
  });
});

describe("momentos: nomes do Visual", () => {
  it("cada poder tem 6 nomes, e os níveis 1, 3 e 5 vêm dos textos do momento", () => {
    for (const id of IDS) {
      const nomes = nomesVisual(id);
      const textos = TEXTOS_MOMENTO[id as IdPoder].nomes;
      expect(nomes, id).toHaveLength(6);
      // o índice é o nível do Visual
      expect(nomes[1], id).toBe(textos[0]);
      expect(nomes[3]!.startsWith(textos[1]), id).toBe(true);
      expect(nomes[5]!.startsWith(textos[2]), id).toBe(true);
      expect(nomes, id).not.toContain("Anel na cor do poder");
    }
  });
});

describe("momentos: desenho sem erros", () => {
  it("desenha os níveis 1 a 5, em todo instante e nas duas camadas, sem lançar erro", () => {
    for (const id of IDS) {
      for (let nivel = 1; nivel <= 5; nivel++) {
        for (const k of [0, 0.3, 0.6, 0.99]) {
          for (const camada of ["atras", "frente"] as const) {
            for (const principal of [true, false]) {
              const onde = `${id} nível ${nivel} k ${k} ${camada} principal ${principal}`;
              expect(() => desenhar(id as IdPoder, { nivel, k, camada, principal }), onde).not.toThrow();
            }
          }
        }
      }
    }
  });

  it("a renascer desenha sem erro também quando a fênix não renasce", () => {
    for (const nivel of [1, 3, 5]) {
      for (const k of [0, 0.3, 0.6, 0.99]) {
        for (const camada of ["atras", "frente"] as const) {
          const onde = `renascer falhou nível ${nivel} k ${k} ${camada}`;
          expect(() => desenhar("renascer", { nivel, k, camada, falhou: true }), onde).not.toThrow();
        }
      }
    }
  });

  it("na camada da frente, no nível 1 e em k 0,3, todo poder desenha alguma coisa", () => {
    // a Renascer, no nível 1, só desenha a coluna de fogo na camada de trás: o coração da frente começa no nível 3
    for (const id of IDS.filter((x) => x !== "renascer")) {
      const chamadas = desenhar(id as IdPoder, { nivel: 1, k: 0.3, camada: "frente" });
      expect(
        chamadas.some((n) => DESENHAM.includes(n)),
        id,
      ).toBe(true);
    }
  });

  it("a Renascer, no nível 1, desenha a coluna de fogo na camada de trás", () => {
    const chamadas = desenhar("renascer", { nivel: 1, k: 0.3, camada: "atras" });
    expect(chamadas.some((n) => DESENHAM.includes(n))).toBe(true);
  });
});

describe("momentos: nível 5 e a aparição", () => {
  // Estes poderes não têm camada "atras": o nível 5 é um extra na camada da frente (ver o próximo teste).
  const SEM_ATRAS = ["congelar", "prescricao"];

  it("no nível 5, a camada de trás desenha mais que no nível 1 (a aparição ou o emblema)", () => {
    for (const id of IDS.filter((x) => !SEM_ATRAS.includes(x))) {
      const nivel1 = desenhar(id as IdPoder, { nivel: 1, k: 0.5, camada: "atras", principal: true });
      const nivel5 = desenhar(id as IdPoder, { nivel: 5, k: 0.5, camada: "atras", principal: true });
      expect(nivel5.length, id).toBeGreaterThan(nivel1.length);
    }
  });

  it("os poderes sem camada de trás ganham o nível 5 na frente", () => {
    for (const id of SEM_ATRAS) {
      const nivel1 = desenhar(id as IdPoder, { nivel: 1, k: 0.5, camada: "frente", principal: true });
      const nivel5 = desenhar(id as IdPoder, { nivel: 5, k: 0.5, camada: "frente", principal: true });
      expect(nivel5.length, id).toBeGreaterThan(nivel1.length);
    }
  });

  it("a aparição do Voo do Grifo só vem no primeiro momento", () => {
    const sem = desenhar("voo", { nivel: 5, k: 0.5, camada: "atras", principal: false });
    const com = desenhar("voo", { nivel: 5, k: 0.5, camada: "atras", principal: true });
    expect(sem.length).toBeLessThan(com.length);
  });
});

describe("momentos: mecânica enquanto o poder dura", () => {
  it("tem mecânica o Voo do Grifo, o Asas de Ouro, o Vade Mecum, o Eco, o Tesouro, o Inquérito, o Trânsito e o Arquivamento", () => {
    for (const id of ["leve", "voo", "ima", "eco", "tesouro", "inquerito", "congelar", "arquivamento"] as const) {
      expect(temMecanica(id), id).toBe(true);
    }
  });

  it("não tem mecânica o Habeas Corpus, a Renascer nem as Garras", () => {
    for (const id of ["escudo", "renascer", "garras"] as const) {
      expect(temMecanica(id), id).toBe(false);
    }
  });

  it("a guia das Asas de Ouro desenha o caminho com traço", () => {
    const { c, chamadas } = contextoFalso();
    const d = { x: 100, y: 300, alvos: [[300, 280, 60], [550, 320, 60]] as [number, number, number][] };
    desenharMecanica(c, "leve", 1, d, cenaDe("leve", chamadas));
    expect(chamadas).toContain("stroke");
  });

  it("sem nível, a mecânica não desenha nada", () => {
    const { c, chamadas } = contextoFalso();
    const d = { x: 100, y: 300, alvos: [[300, 280, 60]] as [number, number, number][] };
    desenharMecanica(c, "leve", 0, d, cenaDe("leve", chamadas));
    expect(chamadas).toHaveLength(0);
  });

  it("sem alvos, a guia não traça nada", () => {
    const { c, chamadas } = contextoFalso();
    desenharMecanica(c, "leve", 1, { x: 100, y: 300, alvos: [] }, cenaDe("leve", chamadas));
    expect(chamadas).not.toContain("stroke");
  });

  it("o Arquivamento desenha as duas partes da coluna arquivada", () => {
    const { c, chamadas } = contextoFalso();
    desenharMecanica(c, "arquivamento", 1, { x: 400, y: 300, alvos: [[400, 300, 60, 1]] }, cenaDe("arquivamento", chamadas));
    expect(chamadas.filter((n) => n === "coluna")).toHaveLength(2);
  });
});
