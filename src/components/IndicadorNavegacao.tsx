"use client";

// Dentro de um <Link> do menu: uma barrinha que corre sob o rótulo do link clicado enquanto a página nova carrega. O
// clique sempre vale; o que demora é baixar a página (num celular com rede lenta, ou logo depois de abrir o site, antes
// de o Next ter pré-carregado os links). A barrinha confirma o clique na hora, e só aparece se a espera passa de um
// instante (a navegação rápida não pisca).
import { useLinkStatus } from "next/link";
import styles from "./IndicadorNavegacao.module.css";

export function IndicadorNavegacao() {
  const { pending } = useLinkStatus();
  return <span aria-hidden className={styles.indicador} data-pendente={pending ? "" : undefined} />;
}

/** O rótulo do link com a barrinha embaixo, da largura do texto. */
export function RotuloComIndicador({ children }: { children: React.ReactNode }) {
  return (
    <span className={styles.rotulo}>
      {children}
      <IndicadorNavegacao />
    </span>
  );
}
