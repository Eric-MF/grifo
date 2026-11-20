// As cores dos grifos ditas pela voz: "próximo grifo amarelo", "grifa de teses". A cor dita pode ser o nome da cor (pelo
// matiz, para valer em qualquer tom que a pessoa tenha escolhido) ou o significado dela na legenda ("teses", "peças").
// Funções puras; quem acha os grifos no texto é src/components/leis/useOuvir.ts.

/** Uma cor da legenda em uso: o valor (hex) e o significado. */
export interface CorDaLegenda {
  cor: string;
  rotulo: string;
}

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Os nomes que a pessoa diz para cada cor (no masculino, no feminino e no plural). */
const NOMES: Record<string, string[]> = {
  amarelo: ["amarelo", "amarela", "amarelos", "amarelas", "dourado"],
  laranja: ["laranja", "laranjas", "alaranjado"],
  vermelho: ["vermelho", "vermelha", "vermelhos", "vermelhas"],
  rosa: ["rosa", "rosas", "rosado", "pink"],
  roxo: ["roxo", "roxa", "roxos", "roxas", "lilas", "violeta", "lavanda"],
  azul: ["azul", "azuis", "anil", "ciano", "azul claro"],
  verde: ["verde", "verdes", "verde claro", "lima"],
  cinza: ["cinza", "cinzento"],
};

/** O nome da cor de um hex ("#fde047" → "amarelo"), pelo matiz; null se não é um hex. */
export function nomeDaCor(hex: string): string | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d < 0.08) return "cinza";
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  if (h < 15 || h >= 345) return "vermelho";
  if (h < 40) return "laranja";
  if (h < 70) return "amarelo";
  if (h < 175) return "verde";
  if (h < 250) return "azul";
  if (h < 290) return "roxo";
  return "rosa";
}

/** A cor dita como nome de cor ("amarelas" → "amarelo"); null se não é nome de cor. */
export function corPeloNome(dito: string): string | null {
  const t = semAcento(dito);
  for (const [nome, ditos] of Object.entries(NOMES)) if (ditos.some((x) => t === x || t.startsWith(`${x} `))) return nome;
  return null;
}

/** As cores da legenda cujo significado é o dito ("teses", "tese", "as peças"). */
function pelaLegenda(dito: string, legenda: readonly CorDaLegenda[]): CorDaLegenda[] {
  const t = semAcento(dito).replace(/^(?:as|os|a|o)\s+/, "");
  if (t.length < 3) return [];
  const raiz = (s: string) => s.replace(/(?:oes|aes|es|s)$/, "");
  return legenda.filter((c) => {
    const r = semAcento(c.rotulo);
    return r === t || raiz(r) === raiz(t) || (t.length >= 4 && r.startsWith(t));
  });
}

/**
 * Quem casa com a cor dita: a função que diz se um grifo (pela cor dele) é dessa cor, e o nome a mostrar; null se a
 * pessoa disse algo que não é cor nem legenda.
 */
export function corDita(dito: string, legenda: readonly CorDaLegenda[]): { casa: (hex: string) => boolean; nome: string } | null {
  const daLegenda = pelaLegenda(dito, legenda);
  if (daLegenda.length) {
    const valores = new Set(daLegenda.map((c) => c.cor.toLowerCase()));
    return { casa: (hex) => valores.has(hex.trim().toLowerCase()), nome: daLegenda[0]!.rotulo };
  }
  const nome = corPeloNome(dito);
  if (!nome) return null;
  return { casa: (hex) => nomeDaCor(hex) === nome, nome };
}

/** A cor da legenda para grifar com a cor dita: pelo significado ou pelo nome da cor; null se a legenda não tem. */
export function corParaGrifar(dito: string, legenda: readonly CorDaLegenda[]): CorDaLegenda | null {
  const daLegenda = pelaLegenda(dito, legenda)[0];
  if (daLegenda) return daLegenda;
  const nome = corPeloNome(dito);
  return (nome && legenda.find((c) => nomeDaCor(c.cor) === nome)) || null;
}
