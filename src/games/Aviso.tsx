"use client";

import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import styles from "./games.module.css";

interface Props {
  titulo: string;
  texto: string;
  rotuloOk: string;
  rotuloCancelar?: string;
  onOk: () => void;
  onCancelar: () => void;
}

/** Pop-up de confirmação dentro do palco, no lugar de alert/confirm do navegador. */
export function Aviso({ titulo, texto, rotuloOk, rotuloCancelar = "Cancelar", onOk, onCancelar }: Props) {
  const id = useId();
  const okRef = useRef<HTMLButtonElement>(null);

  // Foco vai para o botão principal e volta para quem abriu ao fechar.
  useEffect(() => {
    const origem = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    okRef.current?.focus();
    return () => {
      if (origem?.isConnected) origem.focus();
    };
  }, []);

  const aoTeclar = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onCancelar();
    }
  };

  return (
    <div className={styles.avisoFundo} onClick={(e) => e.target === e.currentTarget && onCancelar()}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-titulo`}
        aria-describedby={`${id}-texto`}
        className={styles.avisoCaixa}
        onKeyDown={aoTeclar}
      >
        <h2 id={`${id}-titulo`} className={styles.avisoTitulo}>
          {titulo}
        </h2>
        <p id={`${id}-texto`}>{texto}</p>
        <div className={styles.avisoAcoes}>
          <button ref={okRef} type="button" className="btn btn-gold" onClick={onOk}>
            {rotuloOk}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onCancelar}>
            {rotuloCancelar}
          </button>
        </div>
      </div>
    </div>
  );
}
