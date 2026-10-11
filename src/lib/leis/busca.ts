// Busca no texto das leis: por número de artigo ("121", "art. 155-A") ou por palavras.

/** [id do artigo, rótulo, texto vigente] — formato de public/dados/leis/<id>.artigos.json */
export type ArtigoTexto = [string, string, string];

export const semAcento = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** "121", "art. 121", "Art 155-A", "5º" → id do artigo procurado, ou null se não for número de artigo. */
export function artigoDigitado(consulta: string): string | null {
  const m = consulta.trim().match(/^(?:arts?\.?\s*)?(\d{1,4})\s*[ºo°]?\s*(?:-\s*([a-z]{1,2}))?$/i);
  return m ? `art${m[1]}${m[2] ? `-${m[2].toLowerCase()}` : ""}` : null;
}

/** Artigos cujo número começa pelo que foi digitado; o exato primeiro. */
export function sugerirArtigos(consulta: string, artigos: ArtigoTexto[], limite = 8): ArtigoTexto[] {
  const alvo = artigoDigitado(consulta);
  if (!alvo) return [];
  const exato = artigos.filter((a) => a[0] === alvo);
  const comeca = artigos.filter((a) => a[0] !== alvo && a[0].startsWith(alvo.replace(/-.*/, "")) && !a[0].startsWith("adct"));
  return [...exato, ...comeca].slice(0, limite);
}

export interface Achado {
  art: string;
  rotulo: string;
  antes: string;
  achado: string;
  depois: string;
}

/**
 * Artigos que têm todas as palavras (sem acento, sem diferença de maiúsculas);
 * entre aspas, procura a expressão exata. O trecho mostrado é o da primeira ocorrência.
 */
export function buscarTexto(consulta: string, artigos: ArtigoTexto[], limite = 60): Achado[] {
  const frases = [...consulta.matchAll(/"([^"]+)"/g)].map((m) => semAcento(m[1]).trim()).filter(Boolean);
  const palavras = semAcento(consulta.replace(/"[^"]*"/g, " "))
    .split(/[^a-z0-9§-]+/)
    .filter((p) => p.length >= 2);
  const termos = [...frases, ...palavras];
  if (!termos.length) return [];
  const saida: Achado[] = [];
  for (const [art, rotulo, texto] of artigos) {
    const t = semAcento(texto);
    if (!termos.every((p) => t.includes(p))) continue;
    // semAcento não muda o comprimento do texto em português, então as posições valem no original
    const k = t.indexOf(termos[0]);
    saida.push({
      art,
      rotulo,
      antes: (k > 60 ? "…" : "") + texto.slice(Math.max(0, k - 60), k),
      achado: texto.slice(k, k + termos[0].length),
      depois: texto.slice(k + termos[0].length, k + termos[0].length + 90) + (k + termos[0].length + 90 < texto.length ? "…" : ""),
    });
    if (saida.length >= limite) break;
  }
  return saida;
}
