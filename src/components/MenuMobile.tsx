"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { NAV } from "@/config/site";
import styles from "./MenuMobile.module.css";

/** Menu hambúrguer do cabeçalho. Só aparece no modo "Celular", abaixo de 640px (ver MenuMobile.module.css). */
export function MenuMobile() {
  const [aberto, setAberto] = useState(false);
  const pathname = usePathname();
  const [rotaVista, setRotaVista] = useState(pathname);
  const painelId = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const primeiroLink = useRef<HTMLAnchorElement>(null);

  // Fecha ao trocar de página (ajuste durante a renderização, sem efeito)
  if (pathname !== rotaVista) {
    setRotaVista(pathname);
    setAberto(false);
  }

  // Foco no primeiro link ao abrir
  useEffect(() => {
    if (aberto) primeiroLink.current?.focus();
  }, [aberto]);

  // Esc fecha e devolve o foco ao botão; clique fora fecha
  useEffect(() => {
    if (!aberto) return;
    const fechar = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent) {
        if (e.key !== "Escape") return;
        setAberto(false);
        botao.current?.focus();
      } else if (!wrap.current?.contains(e.target as Node)) {
        setAberto(false);
      }
    };
    document.addEventListener("mousedown", fechar);
    document.addEventListener("keydown", fechar);
    return () => {
      document.removeEventListener("mousedown", fechar);
      document.removeEventListener("keydown", fechar);
    };
  }, [aberto]);

  return (
    <div className={styles.wrap} ref={wrap}>
      <button
        ref={botao}
        type="button"
        className={styles.trigger}
        aria-expanded={aberto}
        aria-controls={painelId}
        aria-label="Menu"
        onClick={() => setAberto((a) => !a)}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
          <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      {aberto && (
        <nav id={painelId} aria-label="Menu principal" className={styles.panel}>
          {NAV.map((item, i) => (
            <Link
              key={item.href}
              ref={i === 0 ? primeiroLink : undefined}
              href={item.href}
              className={styles.link}
              onClick={() => setAberto(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
