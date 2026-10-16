// Contadores dos jogos: moedas e XP abreviados (3k são 3 mil) e a aceleração do mundo pelas vidas extras do Flap Suitcase.

/** Cada vida extra acelera o mundo em 19%: com 5 vidas, a velocidade fica quase no dobro. */
export const FATOR_VIDAS = 0.19;

/** Multiplicador de velocidade de quem tem `vidas` vidas extras (1 quando não há nenhuma). */
export const fatorVelocidadeVidas = (vidas: number) => 1 + FATOR_VIDAS * Math.max(0, vidas);

/**
 * Número abreviado, igual em todo o jogo (HUD, menu, preços, requisitos, fim de jogo):
 * até 999 exato; depois "k" (mil), "M" (milhão) e "B" (bilhão), com uma casa decimal só abaixo de 10 ("1,5k", "3k", "12k", "1,2M").
 * A casa decimal é truncada, nunca arredondada para cima: 1.460 moedas aparecem como "1,4k", e não como o
 * preço "1,5k" que o jogador ainda não alcançou.
 */
export function abreviarNumero(n: number): string {
  const v = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  if (v < 1000) return String(v);
  if (v < 1_000_000) return escala(v, 1000, "k");
  if (v < 1_000_000_000) return escala(v, 1_000_000, "M");
  return escala(v, 1_000_000_000, "B");
}

/** Só o número de moedas, abreviado (o contador do HUD já tem o ícone da moeda ao lado). */
export const abreviarMoedas = abreviarNumero;

/** Moedas com a unidade: "1 moeda", "0 moedas", "850 moedas", "3k moedas". */
export function formatarMoedas(n: number): string {
  const numero = abreviarNumero(n);
  return `${numero} ${numero === "1" ? "moeda" : "moedas"}`;
}

/** XP com a unidade (sigla, invariável): "0 XP", "1 XP", "1,2k XP". */
export function formatarXp(n: number): string {
  return `${abreviarNumero(n)} XP`;
}

/** Abaixo de 10 unidades da escala, uma casa decimal quando ela existe ("1,5k"); acima, só o inteiro ("12k"). */
function escala(v: number, base: number, sufixo: string): string {
  const decimos = Math.floor(v / (base / 10));
  if (decimos >= 100) return `${Math.floor(v / base)}${sufixo}`;
  const inteiro = Math.floor(decimos / 10);
  const fracao = decimos % 10;
  return `${inteiro}${fracao ? `,${fracao}` : ""}${sufixo}`;
}

/** Contagens que seguem a abreviação; as demais (pontos, acertos) saem por extenso. */
export type FormatoContador = "moedas" | "xp";

/** Valor de um contador com a unidade ("3k moedas", "1,2k XP"); sem formato, o número por extenso e o rótulo. */
export function textoContador(valor: number, rotulo: string, formato?: FormatoContador): string {
  if (formato === "moedas") return formatarMoedas(valor);
  if (formato === "xp") return formatarXp(valor);
  return `${valor.toLocaleString("pt-BR")} ${rotulo.toLowerCase()}`;
}

/** Só o número de um contador, para quando o rótulo vem ao lado ("1,2k" sob "Experiência"). */
export function numeroContador(valor: number, formato?: FormatoContador): string {
  return formato ? abreviarNumero(valor) : valor.toLocaleString("pt-BR");
}
