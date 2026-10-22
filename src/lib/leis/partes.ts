// Divide o texto de uma lei grande em partes para download (sem imports de node: roda no navegador e no build).

export const LIMITE_PARTE = 1024 * 1024; // 1 MB

/** Bloco de partes [de, ate) do texto da lei. */
export interface Parte {
  de: number;
  ate: number;
  rotulo: string;
}

const LIVRO = /^LIVRO\b/;
const TITULO = /^T[ÍI]TULO\b/;
const ADCT = /^ATO DAS DISPOSI[ÇC][ÕO]ES CONSTITUCIONAIS TRANSIT[ÓO]RIAS$/;

/** Vazio quando cabe no limite (ou não há como dividir em 2+ partes); senão, uma parte por LIVRO (ou TÍTULO). */
export function dividirEmPartes(blocos: { texto: string; superada?: boolean; tipo?: string }[], limite = LIMITE_PARTE): Parte[] {
  if (new TextEncoder().encode(JSON.stringify(blocos)).length <= limite) return [];
  const achar = (re: RegExp) => blocos.flatMap((b, i) => (!b.superada && re.test(b.texto) ? [i] : []));
  let cortes = achar(LIVRO);
  if (!cortes.length) cortes = achar(TITULO);
  // o Ato das Disposições Constitucionais Transitórias sempre abre parte própria
  blocos.forEach((b, i) => {
    if (ADCT.test(b.texto)) cortes.push(i);
  });
  cortes = [...new Set(cortes)].sort((a, b) => a - b);
  if (cortes.length < 2) return [];
  // o que vem antes do primeiro corte fica na primeira parte, junto da primeira divisão
  return cortes.map((inicio, k) => ({
    de: k === 0 ? 0 : inicio,
    ate: k + 1 < cortes.length ? cortes[k + 1] : blocos.length,
    rotulo: blocos[inicio].texto,
  }));
}
