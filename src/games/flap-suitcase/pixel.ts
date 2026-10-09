import type { Ctx, Paleta } from "./themes";

type Cor = [number, number, number];

function hexParaCor(c: string): Cor {
  const v = c.replace("#", "");
  const n = parseInt(v.length === 3 ? v.split("").map((x) => x + x).join("") : v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function coresDe(valor: unknown, acc: Cor[]): Cor[] {
  if (typeof valor === "string") {
    if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(valor)) acc.push(hexParaCor(valor));
  } else if (Array.isArray(valor)) valor.forEach((v) => coresDe(v, acc));
  else if (valor && typeof valor === "object") Object.values(valor).forEach((v) => coresDe(v, acc));
  return acc;
}

function maisProxima(r: number, g: number, b: number, paleta: Cor[]): Cor {
  let melhor = paleta[0];
  let menor = Infinity;
  for (const c of paleta) {
    const d = (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2;
    if (d < menor) {
      menor = d;
      melhor = c;
    }
  }
  return melhor;
}

// A paleta de cada tema é um objeto fixo: cores e cores mais próximas são calculadas uma vez por tema.
// A cor mais próxima depende só de (r, g, b) e da paleta, então guardar o resultado não muda a imagem.
const memoPorPaleta = new WeakMap<Paleta, { cores: Cor[]; proximas: Map<number, Cor> }>();
const LIMITE_MEMO = 4096;

function memoDe(paleta: Paleta) {
  let m = memoPorPaleta.get(paleta);
  if (!m) {
    m = { cores: coresDe(paleta, []), proximas: new Map() };
    memoPorPaleta.set(paleta, m);
  }
  return m;
}

/**
 * Remove o antisserrilhado do buffer de baixa resolução: cada pixel vira a cor mais próxima
 * da paleta do tema e a transparência parcial vira total ou nenhuma. Sem isso, as bordas das
 * formas ganham pixels com cores intermediárias, que deixam o pixel art borrado.
 */
export function tirarAntisserrilhado(c: Ctx, w: number, h: number, paleta: Paleta) {
  const { cores, proximas } = memoDe(paleta);
  if (!cores.length) return;
  const img = c.getImageData(0, 0, w, h);
  const d = img.data;
  // pixel art tem longas faixas de uma cor só: a última cor resolvida evita a busca no Map
  let ultimaChave = -1;
  let ultima: Cor = cores[0];
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 128) {
      d[i + 3] = 0;
      continue;
    }
    const chave = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
    if (chave !== ultimaChave) {
      let cor = proximas.get(chave);
      if (!cor) {
        cor = maisProxima(d[i], d[i + 1], d[i + 2], cores);
        if (proximas.size >= LIMITE_MEMO) proximas.clear();
        proximas.set(chave, cor);
      }
      ultimaChave = chave;
      ultima = cor;
    }
    d[i] = ultima[0];
    d[i + 1] = ultima[1];
    d[i + 2] = ultima[2];
    d[i + 3] = 255;
  }
  c.putImageData(img, 0, 0);
}
