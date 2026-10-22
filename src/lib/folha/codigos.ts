// Códigos da folha de respostas: Code 128 (conjunto B), número do download, código e canto.

/** Larguras dos padrões Code 128, índice = valor (0..105; 103 = Start A, 104 = Start B, 105 = Start C). */
export const PADROES: string[] = `
212222 222122 222221 121223 121322 131222 122213 122312 132212 221213
221312 231212 112232 122132 122231 113222 123122 123221 223211 221132
221231 213212 223112 312131 311222 321122 321221 312212 322112 322211
212123 212321 232121 111323 131123 131321 112313 132113 132311 211313
231113 231311 112133 112331 132131 113123 113321 133121 313121 211331
231131 213113 213311 213131 311123 311321 331121 312113 312311 332111
314111 221411 431111 111224 111422 121124 121421 141122 141221 112214
112412 122114 122411 142112 142211 241211 221114 413111 241112 134111
111242 121142 121241 114212 124112 124211 411212 421112 421211 212141
214121 412121 111143 111341 131141 114113 114311 411113 411311 113141
114131 311141 411131 211412 211214 211232
`
  .trim()
  .split(/\s+/);

const START_B = 104;
const PARADA = "2331112";

const padraoDe = (valor: number): number[] => PADROES[valor].split("").map(Number);

/** Larguras dos módulos do Code 128 (conjunto B) de `texto`, alternando barra e espaço e começando por barra:
 * início B, os caracteres, o dígito verificador e o fim. Sem a zona de silêncio. */
export function code128B(texto: string): number[] {
  const valores: number[] = [];
  for (const c of texto) {
    const cod = c.charCodeAt(0);
    if (cod < 32 || cod > 127) throw new Error(`Caractere fora do Code 128 B: "${c}"`);
    valores.push(cod - 32);
  }
  const soma = valores.reduce((total, v, i) => total + v * (i + 1), START_B);
  const verificador = soma % 103;
  return [
    ...padraoDe(START_B),
    ...valores.flatMap(padraoDe),
    ...padraoDe(verificador),
    ...PARADA.split("").map(Number),
  ];
}

/** Total de módulos de code128B(texto) (soma das larguras). */
export function modulosCode128(larguras: number[]): number {
  return larguras.reduce((total, l) => total + l, 0);
}

const doisDigitos = (n: number) => String(n).padStart(2, "0");

/** Minuto, hora, dia, mês e ano do download (cada parte com 2 dígitos, o ano com 4) e o número do exame, se houver:
 * 20/10/2026 14:05, exame 41 → "05142010202641"; sem exame → "051420102026". */
export function numeroDoDownload(agora: Date, exame?: number | null): string {
  const base = [
    doisDigitos(agora.getMinutes()),
    doisDigitos(agora.getHours()),
    doisDigitos(agora.getDate()),
    doisDigitos(agora.getMonth() + 1),
    String(agora.getFullYear()).padStart(4, "0"),
  ].join("");
  return exame != null ? base + String(exame) : base;
}

/** Algarismo sorteado: de 1 a 9 se `inicial`, de 0 a 9 se não. */
function algarismo(sorteio: () => number, inicial: boolean): string {
  const base = inicial ? 9 : 10;
  const n = Math.min(base - 1, Math.floor(sorteio() * base));
  return String(inicial ? n + 1 : n);
}

/** Grupo de `n` algarismos, o primeiro nunca 0. */
function grupo(sorteio: () => number, n: number): string {
  return Array.from({ length: n }, (_, i) => algarismo(sorteio, i === 0)).join("");
}

/** Código da folha "x/xxxxx - xxxxxxxxxxxxxx": 1, 5 e 14 algarismos; nenhum grupo começa por 0. `sorteio` devolve
 * um número em [0, 1), como Math.random. */
export function codigoDaFolha(sorteio: () => number): string {
  return `${grupo(sorteio, 1)}/${grupo(sorteio, 5)} - ${grupo(sorteio, 14)}`;
}

/** Número do canto do cabeçalho: inteiro de 1 a 15. */
export function numeroDoCanto(sorteio: () => number): number {
  return Math.min(14, Math.floor(sorteio() * 15)) + 1;
}
