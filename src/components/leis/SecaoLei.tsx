"use client";

import { useEffect, useState } from "react";
import { carregarLei, type LeiCompleta } from "@/lib/leis/dados";
import { artigoDe } from "@/lib/leis/vademecum";
import type { Trecho } from "@/lib/leis/referencias";
import { SITE } from "@/config/site";
import styles from "./leitor.module.css";

export type DadosLei = LeiCompleta;

export function useLeis(ids: string[]) {
  const [leis, setLeis] = useState<Record<string, DadosLei>>({});
  const [erro, setErro] = useState<string | null>(null);
  const chave = ids.join("|");
  useEffect(() => {
    let vivo = true;
    Promise.all(chave.split("|").filter(Boolean).map((l) => carregarLei(l)))
      .then((ls) => vivo && setLeis(Object.fromEntries(ls.map((l) => [l.id, l]))))
      .catch(() => vivo && setErro("Não foi possível carregar o texto das leis."));
    return () => {
      vivo = false;
    };
  }, [chave]);
  return { leis, erro };
}

/** Âncora de um artigo dentro de uma página com várias leis. */
export const ancoraNaPagina = (lei: string, disp: string) => `${lei}--${artigoDe(disp)}`;

/**
 * Referências apontam para dentro da página quando o artigo citado está nela; senão, para o leitor
 * do Grifo (endereço completo, para funcionar também no PDF) ou para o Planalto.
 */
export function resolverNaPagina(lei: string, presente: (lei: string, art: string) => boolean): (t: Trecho) => Trecho {
  const origem = typeof location !== "undefined" ? location.origin : SITE.url;
  return (t) => {
    const href = t.href!;
    const interno = href.match(/^#(.+)$/);
    const outra = href.match(/^\/leis\/([^/]+)\/(?:#(.+))?$/);
    const [alvoLei, alvoArt] = interno ? [lei, interno[1]] : outra ? [outra[1], outra[2]] : [null, null];
    if (!alvoLei) return t;
    if (alvoArt && presente(alvoLei, alvoArt)) return { ...t, href: `#${alvoLei}--${alvoArt}` };
    return { ...t, href: `${origem}/leis/${alvoLei}/${alvoArt ? `#${alvoArt}` : ""}` };
  };
}

/**
 * Links do artigo: "Grifo" (a lei no leitor) e "Planalto" (o texto original). São chips na tela e somem na impressão,
 * que não tem como seguir link; o arquivo baixado os mantém conforme a opção (atributo data-link-visual).
 */
export function LinksArtigo({ lei, url, disp }: { lei: string; url: string; disp: string }) {
  const origem = typeof location !== "undefined" ? location.origin : SITE.url;
  const art = artigoDe(disp);
  return (
    <span className={styles.linksArtigo} data-link-visual>
      <a className={styles.chipLink} href={`${origem}/leis/${lei}/#${art}`} data-chip="grifo">
        Grifo <span aria-hidden>↗</span>
      </a>
      <a className={styles.chipLink} href={`${url}#${art.replace(/-/g, "")}`} target="_blank" rel="noopener" data-chip="planalto">
        Planalto <span aria-hidden>↗</span>
      </a>
    </span>
  );
}
