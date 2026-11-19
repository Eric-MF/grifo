// As cores dos grifos de cada artigo, para o índice alfabético-remissivo: a referência ("art. 366") aparece grifada
// com a cor do grifo que o artigo tem no texto, do usuário ou pronto do Grifo.

export interface CorDaRef {
  cor: string;
  /** o nome da cor no sistema ("Peças", "Teses") */
  rotulo: string;
  /** o usuário grifou o artigo nessa cor (senão, é só grifo pronto) */
  meu: boolean;
}

/** "art366.p1.i2" → "art366"; "s-455" → "s-455" */
export const artigoDoDispositivo = (disp: string) => disp.split(".")[0]!;

/**
 * Por artigo, as cores dos grifos: as marcações do usuário (fora as só de anotação) e os grifos prontos que têm cor no
 * sistema. Cada cor entra uma vez por artigo; a do usuário marca `meu`. A lista segue a ordem das cores do sistema.
 */
export function coresPorArtigo<P extends { disp: string }>(opcoes: {
  marcas: readonly { disp?: string; cor: string }[];
  prontos: readonly P[];
  corDoPronto: (g: P) => string | null | undefined;
  rotuloDoPronto: (g: P) => string;
  rotuloDaMarca: (cor: string) => string;
  ordem: (cor: string) => number;
}): Map<string, CorDaRef[]> {
  const mapa = new Map<string, CorDaRef[]>();
  const por = (disp: string, cor: string, rotulo: string, meu: boolean) => {
    const art = artigoDoDispositivo(disp);
    const lista = mapa.get(art) ?? [];
    const ja = lista.find((c) => c.cor.toLowerCase() === cor.toLowerCase());
    if (ja) ja.meu ||= meu;
    else lista.push({ cor, rotulo, meu });
    mapa.set(art, lista);
  };
  for (const m of opcoes.marcas) if (m.disp && m.cor !== "nota" && m.cor !== "borracha") por(m.disp, m.cor, opcoes.rotuloDaMarca(m.cor), true);
  for (const g of opcoes.prontos) {
    const cor = opcoes.corDoPronto(g);
    if (cor) por(g.disp, cor, opcoes.rotuloDoPronto(g), false);
  }
  for (const lista of mapa.values()) lista.sort((a, b) => opcoes.ordem(a.cor) - opcoes.ordem(b.cor));
  return mapa;
}

/**
 * O artigo (ou a súmula) de uma referência do índice, se a lei o tiver: "art. 200, parágrafo único" → "art200";
 * "art. 154-A" → "art154-a"; "Súmula 145" → "s-145".
 */
export function artigoDaRef(ref: string, ids: Set<string>): string | null {
  // no índice das súmulas a referência é a súmula ("Súmula 145" → "s-145")
  const s = ref.match(/^s[úu]mula\s+(?:vinculante\s+)?(\d+)/i);
  if (s) return ids.has(`s-${s[1]}`) ? `s-${s[1]}` : null;
  const m = ref.match(/\bart(?:igo)?s?\.?\s*(\d{1,4})(?:\s*-\s*([A-Za-z]{1,2})\b)?/i);
  if (!m) return null;
  const com = m[2] ? `art${m[1]}-${m[2].toLowerCase()}` : null;
  if (com && ids.has(com)) return com;
  return ids.has(`art${m[1]}`) ? `art${m[1]}` : null;
}
