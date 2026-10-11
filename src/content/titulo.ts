export function tituloExame(e: { numeral: string; variante?: string | null }) {
  return `${e.numeral} Exame de Ordem${e.variante ? ` (${e.variante})` : ""}`;
}
