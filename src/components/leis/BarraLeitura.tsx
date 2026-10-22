"use client";

import { type CSSProperties, useEffect, useState } from "react";
import { fracaoLida, LEITURA_INICIAL, lerLeitura, type Leitura, TEMPO_LEITURA_MS } from "@/lib/leis/leitura";
import styles from "./barraLeitura.module.css";

/**
 * Quantidade da lei lida. A cor preenche a barra toda e fica mais forte conforme a leitura se completa,
 * com um degradê de tonalidade. A legenda diz o último artigo lido e como um artigo conta como lido.
 */
export function BarraLeitura({ n, total, cor, rotulo, explicar = false }: { n: number; total: number; cor: string; rotulo: string | null; explicar?: boolean }) {
  const pct = fracaoLida(n, total);
  return (
    <div className={`${styles.leitura} ${pct >= 1 ? styles.completa : ""}`} style={{ "--cor": cor } as CSSProperties}>
      <div className={styles.trilho} role="progressbar" aria-label="Quantidade da lei lida" aria-valuemin={0} aria-valuemax={total} aria-valuenow={n}>
        <span className={styles.preenchimento} style={{ width: `${pct * 100}%`, "--intensidade": `${Math.round(35 + 65 * pct)}%` } as CSSProperties} />
      </div>
      <p className={styles.legenda}>
        <span>{textoPercentual(pct)}</span>
        {" · "}
        {rotulo ? (
          <>
            Último artigo lido: <strong>{rotulo}</strong>
          </>
        ) : (
          "Nenhum artigo lido ainda"
        )}
        {explicar && (
          <span className={styles.regra}>
            Conta como lido o artigo que fica na tela por {TEMPO_LEITURA_MS / 1000} s, depois de todos os anteriores.
          </span>
        )}
      </p>
    </div>
  );
}

/** Percentual da legenda: "menos de 1%" no começo, para a leitura ter um número visível antes de chegar a 1%. */
export function textoPercentual(pct: number): string {
  if (pct === 0) return "0%";
  if (pct < 0.01) return "menos de 1%";
  return `${Math.round(pct * 100)}%`;
}

/** Barra de uma lei na lista da aba: lê o progresso guardado neste navegador depois de montar. */
export function ProgressoLei({ lei, total, cor }: { lei: string; total: number; cor: string }) {
  const [l, setL] = useState<Leitura>(LEITURA_INICIAL);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lê o localStorage depois de montar (site estático)
    setL(lerLeitura(lei));
  }, [lei]);
  return <BarraLeitura n={l.n} total={total} cor={cor} rotulo={l.rotulo} />;
}

/**
 * Leitura de todas as leis somadas. Cada lei conta até o próprio total, então uma lei lida não compensa as outras
 * e o percentual geral é a soma das unidades lidas sobre a soma de todas as unidades.
 */
export function ProgressoGeral({ leis, cor }: { leis: { id: string; total: number }[]; cor: string }) {
  const [n, setN] = useState(0);
  const total = leis.reduce((soma, l) => soma + l.total, 0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lê o localStorage depois de montar (site estático)
    setN(leis.reduce((soma, l) => soma + Math.min(lerLeitura(l.id).n, l.total), 0));
  }, [leis]);
  const pct = fracaoLida(n, total);
  return (
    <div className={`${styles.leitura} ${pct >= 1 ? styles.completa : ""}`} style={{ "--cor": cor } as CSSProperties}>
      <div className={styles.trilho} role="progressbar" aria-label="Quantidade lida de todas as leis" aria-valuemin={0} aria-valuemax={total} aria-valuenow={n}>
        <span className={styles.preenchimento} style={{ width: `${pct * 100}%`, "--intensidade": `${Math.round(35 + 65 * pct)}%` } as CSSProperties} />
      </div>
      <p className={styles.legenda}>
        <span>{textoPercentual(pct)}</span>
        {" · "}
        {n.toLocaleString("pt-BR")} de {total.toLocaleString("pt-BR")} dispositivos lidos em {leis.length} leis
      </p>
    </div>
  );
}
