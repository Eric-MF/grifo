import type { Rng } from "./types";

/** PRNG determinístico (mulberry32): a mesma semente gera a mesma pergunta. */
export function criarRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = (() => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }) as Rng;
  next.pick = (arr) => arr[Math.floor(next() * arr.length)];
  next.int = (min, max) => min + Math.floor(next() * (max - min + 1));
  return next;
}
