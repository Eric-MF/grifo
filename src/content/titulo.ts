export function tituloExame(e: { numeral: string; variante?: string | null }) {
  return `${e.numeral} Exame de Ordem${e.variante ? ` (${e.variante})` : ""}`;
}

/** O número do exame nos simulados: o romano e o arábico ("XXXVII (37)"). */
export function numeralComArabico(e: { numero: number; numeral: string }) {
  return `${e.numeral} (${e.numero})`;
}

/** Título do exame nos simulados, com os dois números: "XXXVII (37) Exame de Ordem (Porto Alegre)". */
export function tituloSimulado(e: { numero: number; numeral: string; variante?: string | null }) {
  return `${numeralComArabico(e)} Exame de Ordem${e.variante ? ` (${e.variante})` : ""}`;
}
