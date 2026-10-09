import type { ReactNode } from "react";
import { citacoesEm } from "@/lib/leis/planalto";

/** Troca cada citação de artigo por um link para o texto no Planalto. */
export function linkifica(texto: string, chave = "c"): ReactNode[] {
  const out: ReactNode[] = [];
  let ultimo = 0;
  citacoesEm(texto).forEach((c, i) => {
    if (c.inicio > ultimo) out.push(texto.slice(ultimo, c.inicio));
    out.push(
      <a key={`${chave}-${i}`} href={c.url} target="_blank" rel="noopener noreferrer" className="citacao" title={c.aviso}>
        {c.texto}
      </a>,
    );
    ultimo = c.fim;
  });
  if (ultimo < texto.length) out.push(texto.slice(ultimo));
  return out;
}

export function Citado({ texto }: { texto: string }) {
  return <>{linkifica(texto)}</>;
}
