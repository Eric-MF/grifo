// Formatação de números para exibição (pt-BR).

/** Nota com duas casas e vírgula decimal: 7.5 → "7,50". */
export const fmtNota = (n: number) => n.toFixed(2).replace(".", ",");
