"use client";

import { useEffect, useState } from "react";
import promosJson from "@/content/generated/promos.json";
import type { Promo, Promos } from "@/content/schema";
import { ADS, courseHref } from "@/config/site";
import { Logo } from "./Logo";
import styles from "./PromoSlot.module.css";

const DATA = promosJson as Promos;

function sortear(local: string, excluir?: string): Promo | null {
  const ids = DATA.locais[local] ?? [];
  let pool = DATA.promos.filter((p) => ids.includes(p.id) && p.id !== excluir);
  // Sem rede de anúncios configurada, espaços "ad" viram anúncio da casa.
  if (ADS.provider === "none") pool = pool.filter((p) => p.tipo !== "ad");
  if (!pool.length) return null;
  const total = pool.reduce((s, p) => s + p.peso, 0);
  let r = Math.random() * total;
  for (const p of pool) if ((r -= p.peso) <= 0) return p;
  return pool[0];
}

/**
 * Espaço promocional discreto: anúncio da casa, rede de anúncios ou vídeo do YouTube.
 * O sorteio acontece no cliente (a cada montagem), então o HTML estático é neutro.
 */
export function PromoSlot({ local, variant = "card", seed }: { local: string; variant?: "card" | "compact"; seed?: unknown }) {
  const [promo, setPromo] = useState<Promo | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sorteio no cliente, de propósito
    setPromo(sortear(local));
  }, [local, seed]);

  if (!promo) return <div className={styles.placeholder} aria-hidden />;
  return (
    <aside className={`${styles.slot} ${styles[variant]}`} aria-label={promo.tipo === "ad" ? "Publicidade" : "Conteúdo do Grifo"}>
      {promo.tipo === "house" && <House promo={promo} />}
      {promo.tipo === "ad" && <AdUnit slot={promo.slot} />}
      {promo.tipo === "youtube" && <YouTubeLite video={promo.video} titulo={promo.titulo} />}
    </aside>
  );
}

function House({ promo }: { promo: Extract<Promo, { tipo: "house" }> }) {
  return (
    <a className={styles.house} href={promo.href || courseHref()} target="_blank" rel="noopener noreferrer">
      <span className={styles.tag}>Grifo</span>
      <Logo size={40} className={styles.houseLogo} title="" />
      <strong className={styles.houseTitle}>{promo.titulo}</strong>
      <span className={styles.houseText}>{promo.texto}</span>
      <span className={styles.houseCta}>{promo.cta} →</span>
    </a>
  );
}

function AdUnit({ slot }: { slot: string }) {
  useEffect(() => {
    if (ADS.provider !== "adsense") return;
    try {
      // @ts-expect-error — injetado pelo script do AdSense
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* bloqueador de anúncios */
    }
  }, []);
  return (
    <div className={styles.ad}>
      <span className={styles.tag}>Publicidade</span>
      <ins
        className="adsbygoogle"
        style={{ display: "block", minHeight: 250 }}
        data-ad-client={ADS.client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}

function YouTubeLite({ video, titulo }: { video: string; titulo: string }) {
  const [play, setPlay] = useState(false);
  return (
    <div className={styles.video}>
      <span className={styles.tag}>Aula Grifo</span>
      {play ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${video}?autoplay=1&rel=0`}
          title={titulo}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button type="button" className={styles.videoThumb} onClick={() => setPlay(true)} aria-label={`Assistir: ${titulo}`}>
          <img src={`https://i.ytimg.com/vi/${video}/hqdefault.jpg`} alt="" loading="lazy" />
          <span className={styles.play} aria-hidden>▶</span>
        </button>
      )}
      <span className={styles.videoTitle}>{titulo}</span>
    </div>
  );
}
