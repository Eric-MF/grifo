import { describe, expect, it } from "vitest";
import { candidatosGrade, reamostrarVotando, reduzir, removerMagenta, transicoes, celulas } from "../scripts/processar-8bit.mjs";

/** Imagem sintética: blocos de `bloco` px com deslocamento (ox, oy) e cores escolhidas por bloco; fundo magenta. */
function imagemEmBlocos(W: number, H: number, bloco: number, ox: number, oy: number) {
  const cores = [[20, 40, 90], [240, 200, 60], [200, 40, 40], [250, 250, 250], [60, 160, 90]];
  const corDo = (bx: number, by: number) => cores[(bx * 7 + by * 13 + ((bx * by) % 5)) % cores.length];
  const px = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const bx = Math.floor((x - ox) / bloco);
      const by = Math.floor((y - oy) / bloco);
      const fundo = bx < 0 || by < 0 || bx * bloco + ox >= W - 5 || by * bloco + oy >= H - 5;
      px.set([...(fundo ? [255, 0, 255] : corDo(bx, by)), 255], (y * W + x) * 4);
    }
  }
  return { img: { w: W, h: H, px }, corDo, bloco, ox, oy, W, H };
}

describe("grade de pixels da arte 8-bit", () => {
  it("acha o período e o deslocamento de uma grade de blocos", () => {
    const { img } = imagemEmBlocos(400, 300, 10, 3, 7);
    removerMagenta(img);
    const [gx] = candidatosGrade(transicoes(img, "x"), 400 / 60, 400 / 20);
    const [gy] = candidatosGrade(transicoes(img, "y"), 300 / 60, 300 / 20);
    expect(gx.P).toBeCloseTo(10, 2);
    expect(gx.o).toBeCloseTo(3, 0);
    expect(gy.P).toBeCloseTo(10, 2);
    expect(gy.o).toBeCloseTo(7, 0);
  });

  it("a votação por bloco devolve a cor de cada bloco e o fundo como transparente", () => {
    const { img, corDo, bloco, ox, oy, W, H } = imagemEmBlocos(400, 300, 10, 3, 7);
    removerMagenta(img);
    const [gx] = candidatosGrade(transicoes(img, "x"), W / 60, W / 20);
    const [gy] = candidatosGrade(transicoes(img, "y"), H / 60, H / 20);
    const g = reduzir(img, { x0: 0, x1: W, y0: 0, y1: H }, gx, gy);
    const cx = celulas(gx, 0, W);
    const cy = celulas(gy, 0, H);
    let erros = 0;
    for (let j = 0; j < g.h; j++) {
      for (let i = 0; i < g.w; i++) {
        const x = Math.floor((cx[i][0] + cx[i][1]) / 2);
        const y = Math.floor((cy[j][0] + cy[j][1]) / 2);
        const bx = Math.floor((x - ox) / bloco);
        const by = Math.floor((y - oy) / bloco);
        const interno = bx >= 0 && by >= 0 && bx * bloco + ox < W - 5 && by * bloco + oy < H - 5;
        const p = (j * g.w + i) * 4;
        if (!interno) {
          if (g.px[p + 3] !== 0) erros++;
          continue;
        }
        const esperado = corDo(bx, by);
        const ok = g.px[p + 3] === 255 && [0, 1, 2].every((c) => Math.abs(g.px[p + c] - esperado[c]) <= 6);
        if (!ok) erros++;
      }
    }
    expect(erros).toBe(0);
  });

  it("reamostragem inteira divide a grade em blocos de 2 células sem misturar cores", () => {
    const px = new Uint8Array(4 * 4 * 4);
    // quatro quadrantes de 2×2 com cores distintas
    const cores = [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0]];
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const q = (y >= 2 ? 2 : 0) + (x >= 2 ? 1 : 0);
      px.set([...cores[q], 255], (y * 4 + x) * 4);
    }
    const r = reamostrarVotando({ w: 4, h: 4, px }, 2, 2);
    expect(Array.from(r.px.slice(0, 4))).toEqual([255, 0, 0, 255]);
    expect(Array.from(r.px.slice(4, 8))).toEqual([0, 255, 0, 255]);
    expect(Array.from(r.px.slice(8, 12))).toEqual([0, 0, 255, 255]);
    expect(Array.from(r.px.slice(12, 16))).toEqual([255, 255, 0, 255]);
  });
});
