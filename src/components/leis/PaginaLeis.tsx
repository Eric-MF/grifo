"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { lerJSON } from "@/lib/storage";
import type { Bloco } from "@/lib/leis/linha-do-tempo";
import { artigoDe, blocosEscolhidos, faixas } from "@/lib/leis/vademecum";
import { PREFS_PADRAO, type PrefsLeitor } from "./Leitor";
import { LinksArtigo, resolverNaPagina, useLeis } from "./SecaoLei";
import { TextoLei } from "./TextoLei";
import styles from "./leitor.module.css";

export interface SecaoPedida {
  lei: string;
  /** faixas ("1-120, 155") ou conjunto de artigos ("art121") */
  artigos?: string | Set<string>;
  /** etiqueta por artigo (ex.: quantos erros) */
  etiqueta?: (artigo: string) => ReactNode;
}

/** Várias leis numa página: sumário, âncoras internas entre elas e links para o Grifo e o Planalto (no PDF). */
export function PaginaLeis({ secoes, titulo }: { secoes: SecaoPedida[]; titulo?: string }) {
  const [prefs, setPrefs] = useState<PrefsLeitor>(PREFS_PADRAO);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lê localStorage após montar (site estático)
    setPrefs({ ...PREFS_PADRAO, ...lerJSON<Partial<PrefsLeitor>>("grifo:leitor", {}) });
  }, []);
  const ids = useMemo(() => [...new Set(secoes.map((s) => s.lei))], [secoes]);
  const { leis, erro } = useLeis(ids);

  // o que está na página: lei → artigos (para as âncoras internas)
  const montadas = useMemo(
    () =>
      secoes.flatMap((s) => {
        const l = leis[s.lei];
        if (!l) return [];
        const filtro = typeof s.artigos === "string" ? { faixas: faixas(s.artigos) } : s.artigos ? { artigos: s.artigos } : undefined;
        return [{ s, l, itens: blocosEscolhidos(l.blocos, filtro) }];
      }),
    [secoes, leis],
  );
  const presentes = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const { s, itens } of montadas) {
      const set = m.get(s.lei) ?? new Set<string>();
      for (const { bloco } of itens) if (bloco.disp) set.add(artigoDe(bloco.disp));
      m.set(s.lei, set);
    }
    return m;
  }, [montadas]);
  const presente = (lei: string, art: string) => !!presentes.get(lei)?.has(artigoDe(art));

  if (erro) return <p className={styles.aviso}>{erro}</p>;
  if (ids.some((id) => !leis[id])) return <p className="muted">Carregando o texto das leis…</p>;

  return (
    <div
      className={styles.leitor}
      data-leitor
      data-fonte={prefs.fonte}
      data-fundo={prefs.fundo}
      data-revogados="0"
      data-anotacoes={prefs.anotacoes ? "1" : "0"}
      style={{ "--leitor-tamanho": `${prefs.tamanho}px`, "--leitor-entrelinha": prefs.entrelinha } as CSSProperties}
    >
      {titulo && <h1>{titulo}</h1>}
      {montadas.length > 1 && (
        <ol className={styles.sumario}>
          {montadas.map(({ s, l }, k) => (
            <li key={k}>
              <a href={`#lei-${k}`}>{l.nome}</a>
              {typeof s.artigos === "string" && <span className="muted"> · arts. {s.artigos}</span>}
            </li>
          ))}
        </ol>
      )}
      {montadas.map(({ s, l, itens }, k) => (
        <section key={k} id={`lei-${k}`} className={styles.secao}>
          <h2>{l.nome}</h2>
          <div className={styles.corpo}>
            {itens.length ? (
              <TextoLei
                id={l.id}
                url={l.url}
                blocos={l.blocos}
                itens={itens}
                prefixo={`${l.id}--`}
                estrelas={false}
                resolver={resolverNaPagina(l.id, presente)}
                aposArtigo={(b: Bloco) => (
                  <>
                    {s.etiqueta?.(artigoDe(b.disp!))}
                    <LinksArtigo lei={l.id} url={l.url} disp={b.disp!} />
                  </>
                )}
              />
            ) : (
              <p className="muted">Nenhum artigo desta lei na seleção.</p>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
