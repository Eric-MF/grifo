"use client";

import Link from "next/link";
import { type CSSProperties, useEffect, useState } from "react";
import { carregarResumoSumulas, type ResumoSumulas } from "@/lib/leis/dados";
import { COR_SUMULAS, idSumulas, NOME_SUMULAS, TRIBUNAIS as LISTAS, type Tribunal } from "@/lib/leis/sumulas";
import styles from "@/app/(site)/leis/leis.module.css";
import { ProgressoLei } from "./BarraLeitura";

const TRIBUNAIS = Object.keys(LISTAS) as Tribunal[];

/**
 * A seção das súmulas na página inicial do Vade Mecum. O resumo (quantas há, quantas têm texto) é lido a cada abertura,
 * sem cache: quando a atualização das súmulas muda o conteúdo, a página mostra os números novos sem precisar de deploy.
 */
export function SecaoSumulas() {
  const [resumo, setResumo] = useState<ResumoSumulas | null>(null);
  const [falhou, setFalhou] = useState(false);
  useEffect(() => {
    let vivo = true;
    carregarResumoSumulas().then(
      (r) => vivo && setResumo(r),
      () => vivo && setFalhou(true),
    );
    return () => {
      vivo = false;
    };
  }, []);
  return (
    <section className={styles.grupo} style={{ "--cor": COR_SUMULAS } as CSSProperties}>
      <h2 className={styles.grupoTitulo}>Súmulas</h2>
      {falhou && <p className="muted">Não consegui carregar a lista das súmulas agora. Recarregue a página.</p>}
      {!resumo && !falhou && <p className="muted">Carregando as súmulas…</p>}
      {resumo && (
        <ul className={styles.lista}>
          {TRIBUNAIS.map((t) => {
            const d = resumo[t];
            // o resumo de antes das vinculantes (cache do navegador) não tem a lista
            if (!d) return null;
            return (
              <li key={t} className={styles.item}>
                <Link href={`/leis/sumulas/${t}/`}>
                  <strong>
                    {NOME_SUMULAS(t)}
                    {t === "vinculantes" && <span className="muted"> do STF</span>}
                  </strong>
                  <span className="muted">
                    {d.total} súmulas · {d.baixadas} com texto · lista de {d.coletadoEm.split("-").reverse().join("/")}
                  </span>
                </Link>
                <ProgressoLei lei={idSumulas(t)} total={d.unidades} cor={COR_SUMULAS} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
