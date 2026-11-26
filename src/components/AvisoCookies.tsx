"use client";

// O aviso de cookies: aparece na primeira visita ao domínio publicado (onde a tag do Google existe) até a pessoa
// escolher, e de novo pelo botão "Cookies" do rodapé. Aceitar e recusar têm o mesmo peso (o mesmo botão). Com ?aviso-cookies no
// endereço, aparece em qualquer lugar (para ver no servidor de desenvolvimento).
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { EVENTO_REABRIR, escolher, lerEscolha, reabrirAviso, tagNesteSite, type Escolha } from "@/lib/consentimento";
import styles from "./AvisoCookies.module.css";

export function AvisoCookies() {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLElement>(null);
  useEffect(() => {
    const forcado = new URLSearchParams(location.search).has("aviso-cookies");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lê o armazenamento depois de montar (site estático)
    if (forcado || (tagNesteSite() && !lerEscolha())) setAberto(true);
    const reabrir = () => {
      setAberto(true);
      // reaberto por um botão: o foco vai para o aviso, para quem usa o teclado
      requestAnimationFrame(() => caixa.current?.focus());
    };
    window.addEventListener(EVENTO_REABRIR, reabrir);
    return () => window.removeEventListener(EVENTO_REABRIR, reabrir);
  }, []);
  if (!aberto) return null;
  const decidir = (e: Escolha) => {
    escolher(e);
    setAberto(false);
  };
  return (
    <section ref={caixa} className={styles.aviso} aria-labelledby="aviso-cookies-titulo" tabIndex={-1} data-aviso-cookies>
      <p id="aviso-cookies-titulo" className={styles.titulo}>
        Cookies de estatística
      </p>
      <p className={styles.texto}>
        Com a sua permissão, o Grifo usa cookies do Google para contar as visitas e saber quais partes do site são mais
        usadas. Sem ela, a tag do Google nem carrega. O seu progresso e as suas preferências ficam só neste navegador.{" "}
        <Link href="/privacidade/#cookies">Política de privacidade</Link>
      </p>
      <div className={styles.botoes}>
        <button type="button" className="btn btn-primary" onClick={() => decidir("recusado")}>
          Recusar
        </button>
        <button type="button" className="btn btn-primary" onClick={() => decidir("aceito")}>
          Aceitar
        </button>
      </div>
    </section>
  );
}

/** O botão que reabre o aviso (rodapé, política). */
export function BotaoCookies({ className, children = "Cookies" }: { className?: string; children?: React.ReactNode }) {
  return (
    <button type="button" className={className} onClick={reabrirAviso}>
      {children}
    </button>
  );
}
