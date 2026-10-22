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

/**
 * Blocos (índices) que recebem um grifo pronto no sistema ativo, com o que o leitor pinta: "area" (a barra na margem)
 * ou "destaque" (o artigo grifado de verdade). Só o texto vigente recebe; a regra precisa de uma cor no sistema.
 */
export function prontosDosBlocos(
  blocos: { disp?: string; superada?: boolean }[],
  prontos: GrifosProntos,
  sistemaId: string,
  lei: string,
  corDo: (rotulo: string) => string | undefined,
): Map<number, { tipo: "area" | "destaque"; rotulo: string; cor: string; nota?: string }> {
  const regra = grifoDe(prontos, sistemaId, lei);
  const saida = new Map<number, { tipo: "area" | "destaque"; rotulo: string; cor: string; nota?: string }>();
  blocos.forEach((b, i) => {
    if (!b.disp || b.superada) return;
    const g = regra(b.disp);
    const cor = g ? corDo(g.regra.rotulo) : undefined;
    if (g && cor) saida.set(i, { tipo: g.destaque ? "destaque" : "area", rotulo: g.regra.rotulo, cor, ...(g.regra.nota ? { nota: g.regra.nota } : {}) });
  });
  return saida;
}
