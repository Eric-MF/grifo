// Texto da lei: um elemento por bloco, com âncora no dispositivo vigente, links das referências e as
// anotações do Planalto. O que é riscado ou revogado vai no HTML, marcado com data-sup / data-marco:
// o leitor esconde ou mostra só com CSS. Serve ao leitor (servidor) e ao vade-mécum (cliente).
import type { ReactNode } from "react";
import { marcoDeRevogacao, type Bloco } from "@/lib/leis/linha-do-tempo";
import { trechos, type Trecho } from "@/lib/leis/referencias";
import styles from "./leitor.module.css";

interface Props {
  id: string;
  url: string;
  blocos: Bloco[];
  /** só estes blocos (índices em `blocos`); sem isso, todos */
  itens?: { i: number; bloco: Bloco }[];
  /** prefixo das âncoras, quando várias leis dividem a página */
  prefixo?: string;
  /** reescreve o destino de cada referência */
  resolver?: (t: Trecho) => Trecho;
  /** conteúdo extra logo depois do texto de cada artigo */
  aposArtigo?: (b: Bloco) => ReactNode;
  estrelas?: boolean;
}

export function TextoLei({ id, url, blocos, itens, prefixo = "", resolver, aposArtigo, estrelas = true }: Props) {
  const lista = itens ?? blocos.map((bloco, i) => ({ i, bloco }));
  // a âncora do dispositivo fica na primeira redação vigente (ou na primeira, se todas forem superadas)
  const ancoraEm = new Map<string, number>();
  for (const { i, bloco: b } of lista) {
    if (!b.disp || b.tipo === "texto") continue;
    const atual = ancoraEm.get(b.disp);
    if (atual === undefined || (blocos[atual].superada && !b.superada)) ancoraEm.set(b.disp, i);
  }

  return (
    <div className={styles.folha} data-lei={id}>
      {lista.map(({ i, bloco: b }) => {
        const props = {
          "data-i": i,
          "data-disp": b.disp,
          "data-sup": b.superada ? 1 : 0,
          "data-marco": marcoDeRevogacao(b) ? 1 : 0,
          id: b.disp && ancoraEm.get(b.disp) === i ? prefixo + b.disp : undefined,
          className: `${styles.b} ${styles[b.tipo]}`,
        };
        const conteudo = (
          <>
            {estrelas && b.tipo === "artigo" && !b.superada && (
              <button type="button" className={styles.estrela} data-estrela={b.disp} aria-label={`Marcar ${b.rotulo ?? "artigo"} como importante`} aria-pressed="false">
                ☆
              </button>
            )}
            <span className={styles.txt}>
              {trechos(b.texto, id, b.rotulo).map((bruto, k) => {
                const t = resolver && bruto.href ? resolver(bruto) : bruto;
                return t.href ? (
                  <a key={k} className={styles.ref} href={t.href} data-grifo={t.href} data-planalto={t.planalto}>
                    {t.texto}
                  </a>
                ) : (
                  t.texto
                );
              })}
            </span>
            {b.atos.length > 0 && (
              <span className={styles.atos}>
                {b.atos.map((a, k) => {
                  const href = a.href ? new URL(a.href, url).href : undefined;
                  return href ? (
                    <a key={k} href={href} className={styles.ato} rel="noopener" target="_blank">
                      {a.bruto}
                    </a>
                  ) : (
                    <span key={k} className={styles.ato}>
                      {a.bruto}
                    </span>
                  );
                })}
              </span>
            )}
            {aposArtigo && b.tipo === "artigo" && !b.superada && aposArtigo(b)}
          </>
        );
        if (b.tipo === "estrutura") return <h3 key={i} {...props}>{conteudo}</h3>;
        if (b.tipo === "rubrica") return <h4 key={i} {...props}>{conteudo}</h4>;
        return <p key={i} {...props}>{conteudo}</p>;
      })}
    </div>
  );
}
