"use client";

import { useId, useSyncExternalStore } from "react";
import { comRascunhos, tamanhoAcervo } from "./banco";
import { CATEGORIAS } from "./categorias";
import type { Categoria } from "./types";
import styles from "./seletor.module.css";

interface Props {
  valor: Categoria[];
  onChange: (c: Categoria[]) => void;
  legenda?: string;
  className?: string;
}

const semInscricao = () => () => {};

/** Tipos de pergunta: pelo menos um marcado; categoria sem perguntas aparece desativada. */
export function SeletorCategorias({ valor, onChange, legenda = "Tipos de pergunta", className }: Props) {
  const base = useId();
  // No servidor não há URL: os rascunhos só entram depois de montar, sem divergir da hidratação.
  const rascunhos = useSyncExternalStore(semInscricao, comRascunhos, () => false);
  const tamanho = (c: Categoria) => tamanhoAcervo(c, rascunhos);
  const alternar = (c: Categoria) => {
    const novo = valor.includes(c) ? valor.filter((x) => x !== c) : [...valor, c];
    if (novo.length) onChange(CATEGORIAS.map((x) => x.id).filter((id) => novo.includes(id)));
  };
  return (
    <fieldset className={`${styles.grupo} ${className ?? ""}`}>
      <legend>{legenda}</legend>
      <div className={styles.opcoes}>
        {CATEGORIAS.map((c) => {
          const vazia = tamanho(c.id) === 0;
          const marcada = valor.includes(c.id) && !vazia;
          const dica = `${base}-${c.id}`;
          return (
            <label key={c.id} className={`${styles.opcao} ${vazia ? styles.vazia : ""}`}>
              <input
                type="checkbox"
                checked={marcada}
                disabled={vazia || (marcada && valor.filter((x) => tamanho(x) > 0).length === 1)}
                onChange={() => alternar(c.id)}
                aria-describedby={dica}
              />
              <span>{c.nome}</span>
              {vazia && <small className={styles.breve}>em breve</small>}
              <span id={dica} role="tooltip" className={styles.dica}>
                {c.resumo}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
