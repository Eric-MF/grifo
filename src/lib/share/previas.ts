// As prévias de compartilhar com a pontuação de cada um. O site não tem servidor, então elas são geradas antes, no
// build (scripts/gerar-previas.ts): uma página e uma imagem para cada nota do simulado, com uma casa (0,0 a 10,0), e
// para cada pontuação do jogo (0 a PONTOS_MAX_PREVIA, e uma para "mais que isso"). O card compartilha o link da
// página da pessoa; a rede lê a imagem dela (og:image), e quem clica é levado ao simulado ou ao jogo.
// Sem importações com "@/": o gerador, fora do Next, também usa este arquivo.

/** A pasta das prévias dentro de public/ (e do site publicado). */
export const PASTA_PREVIAS = "c";
/** Acima disso, os pontos do jogo vão na prévia de "mais de" (uma imagem só). */
export const PONTOS_MAX_PREVIA = 1000;

/**
 * A nota em décimos, de 0 a 100 (10,0), como nas prévias geradas: a segunda casa é cortada, não arredondada (5,95
 * fica 5,9; arredondada, viraria 6,0 e a prévia diria "Aprovado(a)!"). Os centésimos vêm arredondados antes, para
 * o corte não errar por conta da conta em ponto flutuante.
 */
export const decimosDaNota = (nota: number) => Math.max(0, Math.min(100, Math.floor(Math.round(nota * 100) / 10)));

/** A nota com uma casa, como na prévia: 7,55 → "7,5". */
export function notaDaPrevia(nota: number): string {
  const d = decimosDaNota(nota);
  return `${Math.floor(d / 10)},${d % 10}`;
}

/** O trecho da nota no endereço: 7,55 → "7-5". */
export const trechoDaNota = (nota: number) => notaDaPrevia(nota).replace(",", "-");

/** O trecho dos pontos no endereço: 123 → "123"; acima do máximo (1.000), "mais". */
export const trechoDosPontos = (pontos: number) => (pontos > PONTOS_MAX_PREVIA ? "mais" : String(Math.max(0, Math.floor(pontos))));

/** A página da prévia de uma nota de simulado; com o exame, quem clica vai para o simulado dele. */
export function caminhoPreviaNota(nota: number, exame?: string | number): string {
  return `/${PASTA_PREVIAS}/nota/${trechoDaNota(nota)}/${exame !== undefined ? `?exame=${encodeURIComponent(String(exame))}` : ""}`;
}

/** A página da prévia dos pontos num jogo. */
export function caminhoPreviaJogo(slug: string, pontos: number): string {
  return `/${PASTA_PREVIAS}/jogo/${slug}/${trechoDosPontos(pontos)}/`;
}

/** A imagem que fica na pasta de cada página de prévia. */
export const ARQUIVO_PREVIA = "previa.jpg";
