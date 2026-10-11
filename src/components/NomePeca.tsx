"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./NomePeca.module.css";

const CHAVE = "grifo:mostrarPeca";
const EVENTO = "grifo:mostrar-peca";

/** Oculto por padrão; a escolha vale em todas as listas do site e fica salva neste navegador. */
export function useMostrarPeca() {
  const [mostrar, setMostrarEstado] = useState(false);

  useEffect(() => {
    const ler = () => {
      try {
        setMostrarEstado(localStorage.getItem(CHAVE) === "1");
      } catch {
        setMostrarEstado(false);
      }
    };
    ler();
    window.addEventListener(EVENTO, ler);
    return () => window.removeEventListener(EVENTO, ler);
  }, []);

  const setMostrar = useCallback((valor: boolean) => {
    try {
      localStorage.setItem(CHAVE, valor ? "1" : "0");
    } catch {
      // sem armazenamento: a escolha vale só nesta página
    }
    window.dispatchEvent(new Event(EVENTO));
  }, []);

  return [mostrar, setMostrar] as const;
}

export function ToggleNomePeca() {
  const [mostrar, setMostrar] = useMostrarPeca();
  return (
    <label className={styles.toggle}>
      <input type="checkbox" checked={mostrar} onChange={(e) => setMostrar(e.target.checked)} />
      Mostrar o nome da peça
    </label>
  );
}

export function LinhaDeExame({ nome, ano }: { nome: string; ano?: string }) {
  const [mostrar] = useMostrarPeca();
  return <>{[mostrar ? `Peça: ${nome}` : null, ano].filter(Boolean).join(" · ")}</>;
}
