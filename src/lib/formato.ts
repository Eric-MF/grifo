// Formatação de números para exibição (pt-BR).

/** Nota com duas casas e vírgula decimal: 7.5 → "7,50". */
export const fmtNota = (n: number) => n.toFixed(2).replace(".", ",");

/** Tempo em horas, minutos e segundos: 3725 → "1:02:05". */
export function fmtTempo(seg: number) {
  const s = Math.max(0, Math.floor(seg));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}
