// "Vide" que o Grifo acrescenta entre dispositivos do leitor (leis e súmulas), de content/vides.yaml: em cada grupo,
// cada membro ganha um "Vide" para cada um dos outros, como o "(Vide …)" do Planalto, com link e prévia.
import type { Ato, Bloco } from "./linha-do-tempo";

export interface MembroVide {
  /** id da lei no leitor ("cpp") ou da lista de súmulas ("sumulas-stj") */
  lei: string;
  /** o dispositivo: "art366", "art564.i4", "s-455" */
  disp: string;
  /** como o "Vide" o chama: "art. 564, IV, do CPP", "Súmula 455 do STJ" */
  rotulo: string;
}
export interface GrupoVide {
  tema: string;
  membros: MembroVide[];
}

/** Os blocos da lei com os "Vide" dos grupos; o bloco vigente de cada dispositivo recebe os do seu grupo. */
export function aplicarVides(blocos: Bloco[], lei: string, grupos: readonly GrupoVide[]): Bloco[] {
  const extras = new Map<string, Ato[]>();
  for (const g of grupos)
    for (const m of g.membros) {
      if (m.lei !== lei) continue;
      const lista = extras.get(m.disp) ?? [];
      for (const o of g.membros)
        if (o !== m && !lista.some((a) => a.lei === o.lei && a.art === o.disp)) lista.push({ tipo: "vide", bruto: `(Vide ${o.rotulo})`, lei: o.lei, art: o.disp });
      extras.set(m.disp, lista);
    }
  if (!extras.size) return blocos;
  const feitos = new Set<string>();
  return blocos.map((b) => {
    const novos = b.disp && !b.superada && !feitos.has(b.disp) ? extras.get(b.disp) : undefined;
    if (!novos) return b;
    feitos.add(b.disp!);
    // o "Vide" que o texto já traz para o mesmo dispositivo não se repete
    const faltam = novos.filter((a) => !b.atos.some((x) => x.tipo === "vide" && x.lei === a.lei && x.art === a.art));
    return faltam.length ? { ...b, atos: [...b.atos, ...faltam] } : b;
  });
}

/** Os membros cujo dispositivo vigente não está no texto da lei (para o build avisar). */
export function membrosSemDispositivo(blocos: Bloco[], lei: string, grupos: readonly GrupoVide[]): MembroVide[] {
  const vigentes = new Set(blocos.filter((b) => b.disp && !b.superada).map((b) => b.disp));
  return grupos.flatMap((g) => g.membros.filter((m) => m.lei === lei && !vigentes.has(m.disp)));
}
