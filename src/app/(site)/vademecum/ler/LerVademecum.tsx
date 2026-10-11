"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PaginaLeis } from "@/components/leis/PaginaLeis";
import { decodificar } from "@/lib/leis/compartilhar";
import { lerVademecuns, salvarVademecum, type ItemVade } from "@/lib/leis/vademecum";
import styles from "../vademecum.module.css";

interface Carga {
  t: string;
  d: ItemVade[];
}

export function LerVademecum() {
  const [carga, setCarga] = useState<Carga | null | "invalido">(null);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    const ler = () => {
      const h = location.hash.match(/^#v=(v1\..+)$/);
      if (!h) return setCarga("invalido");
      decodificar<Carga>(h[1]).then((c) => {
        setCarga(c && Array.isArray(c.d) ? c : "invalido");
        if (c) setSalvo(lerVademecuns().some((v) => v.titulo === c.t && JSON.stringify(v.itens) === JSON.stringify(c.d)));
      });
    };
    ler();
    window.addEventListener("hashchange", ler);
    return () => window.removeEventListener("hashchange", ler);
  }, []);

  const secoes = useMemo(() => (carga && carga !== "invalido" ? carga.d.map((i) => ({ lei: i.lei, artigos: i.artigos })) : []), [carga]);

  if (carga === null) return <p className="muted">Abrindo o vade-mécum…</p>;
  if (carga === "invalido")
    return (
      <p>
        Este link de vade-mécum não pôde ser lido. <Link href="/vademecum/">Monte um novo</Link>.
      </p>
    );

  return (
    <>
      <div className={styles.acoes}>
        <button type="button" className="btn btn-gold" onClick={() => window.print()}>
          Imprimir / salvar em PDF
        </button>
        {!salvo && (
          <button
            type="button"
            className="btn"
            onClick={() => {
              salvarVademecum({ id: Date.now().toString(36), titulo: carga.t, itens: carga.d, em: Date.now() });
              setSalvo(true);
            }}
          >
            Salvar no meu Grifo
          </button>
        )}
        <Link className="btn" href="/vademecum/">
          Meus vade-mécuns
        </Link>
      </div>
      <p className={`muted ${styles.naoImprimir}`}>
        No PDF, os links entre artigos deste vade-mécum levam a outro ponto do próprio arquivo; os demais abrem no Grifo. Ao lado de cada
        artigo impresso há links para o Grifo e para o texto original do Planalto. Use o Chrome ou o Edge para manter os links no PDF.
      </p>
      <PaginaLeis secoes={secoes} titulo={carga.t} />
    </>
  );
}
