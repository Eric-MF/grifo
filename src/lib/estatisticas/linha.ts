// Contas da aba "Linha do tempo": as faixas das bancas, os exames de cada marco e os marcadores do eixo afastados uns
// dos outros (vários marcos caem no mesmo ano). Funções puras.
import type { Era, ExameEstat, MarcoLinha } from "./tipos";

export interface FaixaEra {
  era: Era;
  de: number;
  ate: number;
  exames: number;
}

/** As faixas das bancas no eixo: cada uma do primeiro exame dela até o primeiro da seguinte (a última, até `fim`). */
export function faixasDasEras(exames: ExameEstat[], fim: number): FaixaEra[] {
  const comData = exames.filter((e) => e.quando !== null && !e.variante).sort((a, b) => a.quando! - b.quando!);
  const faixas: FaixaEra[] = [];
  for (const e of comData) {
    const f = faixas.at(-1);
    if (f && f.era === e.era) f.exames++;
    else faixas.push({ era: e.era, de: e.quando!, ate: e.quando!, exames: 1 });
  }
  faixas.forEach((f, i) => (f.ate = faixas[i + 1]?.de ?? fim));
  return faixas;
}

/** Os exames de cada marco: do começo dele até o começo do seguinte (o último vai até o fim). */
export function examesDosMarcos(marcos: MarcoLinha[], exames: ExameEstat[]): ExameEstat[][] {
  const comData = exames.filter((e) => e.quando !== null).sort((a, b) => a.quando! - b.quando! || a.ordem - b.ordem);
  return marcos.map((m, i) => {
    const fim = marcos[i + 1]?.de ?? Infinity;
    return comData.filter((e) => e.quando! >= m.de && e.quando! < fim);
  });
}

/**
 * Afasta os marcadores do eixo para não se cobrirem: cada um fica pelo menos `distancia` depois do anterior, sem sair
 * de [min, max]. Os de pontas apertadas voltam para trás. As posições vêm em ordem; a saída, também.
 */
export function espalhar(xs: number[], distancia: number, min: number, max: number): number[] {
  const out = xs.map((x) => Math.max(min, Math.min(max, x)));
  for (let i = 1; i < out.length; i++) out[i] = Math.max(out[i]!, out[i - 1]! + distancia);
  if (out.length && out.at(-1)! > max) {
    out[out.length - 1] = max;
    for (let i = out.length - 2; i >= 0; i--) out[i] = Math.min(out[i]!, out[i + 1]! - distancia);
  }
  return out.map((x) => Math.max(min, x));
}
