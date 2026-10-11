// Grifos prontos (content/grifos.yaml): que cor do sistema ativo cada dispositivo da lei recebe.
// A área do tema leva só a cor na margem; os destaques são grifados de verdade.
import { artigoNaFaixa, faixas } from "./vademecum";

export interface RegraGrifo {
  rotulo: string;
  lei: string;
  artigos?: string;
  dispositivos?: string[];
  destaques?: string;
  destaquesDispositivos?: string[];
  nota?: string;
}
export type GrifosProntos = Record<string, RegraGrifo[]>;

const casaDispositivo = (lista: string[] | undefined, disp: string) => !!lista?.some((d) => disp === d || disp.startsWith(`${d}.`));

/** Para a lei e o sistema dados: dispositivo → regra que o alcança (a primeira) e se é um destaque. */
export function grifoDe(prontos: GrifosProntos, sistema: string, lei: string): (disp: string) => { regra: RegraGrifo; destaque: boolean } | null {
  const regras = (prontos[sistema] ?? [])
    .filter((r) => r.lei === lei)
    .map((r) => ({ r, area: r.artigos ? faixas(r.artigos) : null, destaques: r.destaques ? faixas(r.destaques) : null }));
  return (disp) => {
    for (const { r, area, destaques } of regras) {
      const destaque = casaDispositivo(r.destaquesDispositivos, disp) || (!!destaques && artigoNaFaixa(disp, destaques));
      if (destaque || casaDispositivo(r.dispositivos, disp) || (area && artigoNaFaixa(disp, area))) return { regra: r, destaque };
    }
    return null;
  };
}
