// Os nomes dos exames nas dicas: o número em algarismos primeiro (o romano do "XLV Exame" nem sempre é fácil de ler),
// depois o resto do que a página já mostrava.
import type { ExameEstat } from "./tipos";

/** "45º Exame", "20º Exame · Porto Velho", "110º Exame da OAB/SP" */
export const exameEmAlgarismos = (e: ExameEstat) =>
  e.noSite ? `${e.numero}º Exame${e.variante ? ` · ${e.variante}` : ""}` : `${e.numero}º Exame da OAB/SP`;

/** "2026", "≈2001" (ano estimado pela sequência dos exames) ou null */
export const anoDoExame = (e: ExameEstat) => (e.ano ? `${e.anoEstimado ? "≈" : ""}${e.ano}` : null);

/** "22/2/2026"; sem a data, o ano */
export function dataDoExame(e: ExameEstat): string | null {
  if (!e.data) return anoDoExame(e);
  const [a, m, d] = e.data.split("-").map(Number);
  return `${d}/${m}/${a}`;
}

/** A linha de baixo da dica: "XLV Exame · 22/2/2026 · FGV" (o romano só nos unificados, onde ele é o nome). */
export function detalheDoExame(e: ExameEstat, banca: string): string {
  return [e.noSite ? e.titulo : null, dataDoExame(e), e.apelido, banca].filter(Boolean).join(" · ");
}

/** Os atributos da dica (src/app/(site)/estatisticas/Dicas.tsx): o título em destaque e as linhas de baixo. */
export function dica(titulo: string, ...linhas: (string | null | undefined | false)[]) {
  const mais = linhas.filter(Boolean).join("\n");
  return { "data-dica": titulo, ...(mais ? { "data-dica-mais": mais } : {}) };
}
