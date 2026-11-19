// O que os resumos do cabeçalho têm em comum: os números romanos dos exames, as datas curtas e o "há 3 dias".
import { toRoman } from "@/lib/correcao/citacoes";

export const pctTexto = (f: number) => `${Math.round(f * 100)}%`;

/** "45" → "XLV"; "20-porto-velho" → "XX (Porto Velho)" */
export const numeralDe = (id: string) => {
  const [n, ...resto] = id.split("-");
  const lugar = resto.join(" ").replace(/\b\w/g, (c) => c.toUpperCase());
  return `${toRoman(Number(n))}${lugar ? ` (${lugar})` : ""}`;
};

/** "2026-10-18" → "18/10/2026" */
export const dataBR = (iso: string) => iso.split("-").reverse().join("/");

/** "hoje", "ontem", "há 3 dias", "há 2 meses" */
export function haQuanto(quando: number, agora: number): string {
  const inicio = (t: number) => new Date(new Date(t).toDateString()).getTime();
  const dias = Math.round((inicio(agora) - inicio(quando)) / 86_400_000);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 45) return `há ${dias} dias`;
  const meses = Math.round(dias / 30);
  return meses < 12 ? `há ${meses} ${meses === 1 ? "mês" : "meses"}` : `há ${Math.round(meses / 12)} ${Math.round(meses / 12) === 1 ? "ano" : "anos"}`;
}

/** "2026-11-04" → "ter., 4 de nov." */
export function diaCurto(dia: string): string {
  const [a, m, d] = dia.split("-").map(Number) as [number, number, number];
  return new Date(a, m - 1, d).toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" });
}

export const plural = (n: number, um: string, varios: string) => `${n.toLocaleString("pt-BR")} ${n === 1 ? um : varios}`;
