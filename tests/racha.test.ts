import { describe, expect, it } from "vitest";
import { COMPRIMENTO_MINIMO, coresDaRacha, geometriaRacha, luminancia, sementeRacha} from "@/games/flap-suitcase/racha";
import { TEMAS } from "@/games/flap-suitcase/catalogo";

const W = 74;
const E = W / 2;
const sementes = Array.from({ length: 200 }, (_, i) => sementeRacha(i % 3, 100 + i * 2.37, i % 2 ? "cima" : "baixo"));

describe("sementeRacha", () => {
  it("é estável e separa as metades e as colunas", () => {
    expect(sementeRacha(1, 312.5, "baixo")).toBe(sementeRacha(1, 312.5, "baixo"));
    expect(sementeRacha(1, 312.5, "baixo")).not.toBe(sementeRacha(1, 312.5, "cima"));
    expect(sementeRacha(1, 312.5, "baixo")).not.toBe(sementeRacha(2, 312.5, "baixo"));
    expect(new Set(sementes).size).toBeGreaterThan(190);
  });
});

describe("geometriaRacha", () => {
  it("é determinística: mesma semente, mesma fratura", () => {
    expect(geometriaRacha(12345, W, 400)).toEqual(geometriaRacha(12345, W, 400));
    expect(geometriaRacha(12345, W, 400)).not.toEqual(geometriaRacha(54321, W, 400));
  });

  it("não racha colunas curtas demais", () => {
    expect(geometriaRacha(1, W, COMPRIMENTO_MINIMO - 1)).toBeNull();
    expect(geometriaRacha(1, W, COMPRIMENTO_MINIMO)).not.toBeNull();
  });

  it("atravessa o fuste de ponta a ponta, perto da passagem e abaixo do capitel", () => {
    for (const s of sementes) {
      for (const len of [COMPRIMENTO_MINIMO, 90, 400]) {
        const g = geometriaRacha(s, W, len)!;
        expect(g.bordaPonta[0].x).toBe(-E);
        expect(g.bordaPonta.at(-1)!.x).toBe(E);
        const xs = g.bordaPonta.map((p) => p.x);
        expect([...xs].sort((a, b) => a - b)).toEqual(xs);
        expect(g.y).toBeLessThanOrEqual(len * 0.5);
        expect(g.y).toBeLessThanOrEqual(68);
        // nenhum ponto sobe até o capitel mais alto (26) nem desce além do comprimento
        for (const p of [...g.bordaPonta, ...g.bordaResto]) {
          expect(p.y).toBeGreaterThan(len >= 90 ? 26 : 0);
          expect(p.y).toBeLessThan(len);
        }
      }
    }
  });

  it("separa as partes: a borda do resto fica sempre abaixo da borda da ponta, em cunha", () => {
    for (const s of sementes) {
      const g = geometriaRacha(s, W, 400)!;
      const vaos = g.bordaPonta.map((p, i) => g.bordaResto[i].y - p.y);
      for (const v of vaos) expect(v).toBeGreaterThan(1);
      // abre mais de um lado que do outro (contando o lascado dos cantos)
      expect(Math.abs(vaos[0] - vaos.at(-1)!)).toBeGreaterThan(5);
      // não é um zigue-zague regular: os vértices internos não ficam igualmente espaçados
      const passos = g.bordaPonta.slice(1).map((p, i) => p.x - g.bordaPonta[i].x);
      expect(Math.max(...passos) - Math.min(...passos)).toBeGreaterThan(1);
      // o resto escorrega de lado
      expect(Math.abs(g.desloc)).toBeGreaterThanOrEqual(2.5);
    }
  });

  it("recorta a coluna inteira: retângulo e faixa estreita no resto, polígono curto na ponta", () => {
    for (const s of sementes) {
      const g = geometriaRacha(s, W, 400)!;
      // cobre o capitel (1,3 × a largura) e as flanges do steampunk (largura + 16)
      expect(g.meiaLargura).toBeGreaterThanOrEqual(Math.max(1.3 * E, E + 8));
      for (const p of g.bordaResto) expect(p.y).toBeLessThanOrEqual(g.corteFundo);
      // as faixas encostam nos retângulos com sobra e não ficam largas demais (o recorte por polígono é caro)
      expect(Math.min(...g.regiaoPonta.map((p) => p.y))).toBeLessThan(0);
      expect(Math.max(...g.faixaResto.map((p) => p.y))).toBeGreaterThan(g.corteFundo);
      expect(g.corteFundo - Math.min(...g.bordaPonta.map((p) => p.y))).toBeLessThan(80);
      for (const f of [g.regiaoPonta, g.faixaResto]) {
        expect(Math.min(...f.map((p) => p.x))).toBe(-g.meiaLargura);
        expect(Math.max(...f.map((p) => p.x))).toBe(g.meiaLargura);
      }
    }
  });

  it("mantém trincas dentro do fuste e lascas soltas fora do contorno", () => {
    for (const s of sementes) {
      const g = geometriaRacha(s, W, 400, s % 2 ? "cima" : "baixo")!;
      for (const t of [...g.trincasPonta, ...g.trincasResto]) {
        expect(t.length).toBeGreaterThan(1);
        for (const p of t) expect(Math.abs(p.x)).toBeLessThanOrEqual(E);
      }
      for (const p of g.trincasPonta.flat()) expect(p.y).toBeGreaterThanOrEqual(26);
      expect(g.lascas.length).toBe(3);
      for (const l of g.lascas) {
        const cx = l.reduce((a, p) => a + p.x, 0) / l.length;
        expect(Math.abs(cx)).toBeGreaterThan(E);
      }
    }
  });
});

describe("coresDaRacha", () => {
  it("usa só a paleta do tema: borda = contorno, face mais escura que o corpo", () => {
    for (const t of TEMAS) {
      const c = coresDaRacha(t.paleta.coluna);
      expect(c.borda).toBe(t.paleta.coluna.contorno);
      expect(c.luz).toBe(t.paleta.coluna.luz);
      expect(c.lasca).toBe(t.paleta.coluna.corpo);
      expect(c.face).toMatch(/^#[0-9a-f]{6}$/);
      expect(luminancia(c.face)).toBeLessThan(luminancia(t.paleta.coluna.corpo));
    }
  });

  it("guarda o resultado por paleta", () => {
    const p = TEMAS[0].paleta.coluna;
    expect(coresDaRacha(p)).toBe(coresDaRacha(p));
  });
});
