"use client";

import { useSyncExternalStore } from "react";
import { assinarPrevia, gravarPrevia, lerPrevia } from "@/lib/previa";
import styles from "./PreviaSwitch.module.css";

/** Interruptor da prévia dos artigos citados: liga e desliga o pop-up dos links, na prova e no gabarito. */
export function PreviaSwitch({ className }: { className?: string }) {
  const ligada = useSyncExternalStore(assinarPrevia, lerPrevia, () => true);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligada}
      aria-label="Prévia dos artigos citados"
      title="Ao passar o mouse (ou tocar) num artigo citado, mostra o texto dele"
      className={`${styles.switch} ${className ?? ""}`}
      onClick={() => gravarPrevia(!ligada)}
    >
      <span className={styles.rotulo}>Prévia dos artigos</span>
      <span className={styles.trilho} data-ligada={ligada ? "1" : "0"} aria-hidden>
        <span className={styles.bolinha} />
      </span>
    </button>
  );
}
