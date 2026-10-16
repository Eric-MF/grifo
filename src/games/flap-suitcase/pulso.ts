// Pulso do fim de Asas de Ouro e de Voo do Grifo: quebra as colunas logo à frente do pássaro.

/** Poderes cujo fim solta um pulso. Voo do Grifo também liga Asas de Ouro, então os dois terminam juntos e o pulso sai uma vez. */
export const PODERES_COM_PULSO = ["leve", "voo"];

/** Alcance do pulso à frente do pássaro, em unidades lógicas (um espaçamento entre colunas). */
export const ALCANCE_PULSO = 260;

/**
 * Colunas que o pulso quebra: as ainda não passadas que estão entre o pássaro e o alcance.
 * Colunas arquivadas não entram (já não existem para o jogo). Quem chama remove as colunas sem pontuar.
 */
export function colunasDoPulso<T extends { x: number; passou: boolean; arquivado?: boolean }>(pilares: T[], jogX: number, alcance = ALCANCE_PULSO): T[] {
  return pilares.filter((q) => !q.passou && !q.arquivado && q.x >= jogX && q.x <= jogX + alcance);
}
