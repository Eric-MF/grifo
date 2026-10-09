"use client";

import { fmtNota } from "@/lib/formato";
import Link from "next/link";
import { useEffect, useState } from "react";
import { NOTA_CORTE } from "@/lib/correcao/grader";
import { listarTentativas, type Tentativa } from "@/lib/tentativas";
import styles from "./simulados.module.css";

export function HistoricoSimulados() {
  const [lista, setLista] = useState<Tentativa[]>([]);
  useEffect(() => setLista(listarTentativas().slice(0, 8)), []);
  if (!lista.length) return null;
  return (
    <section className={styles.hist} aria-labelledby="hist-titulo">
      <h2 id="hist-titulo">Seus últimos simulados</h2>
      <ul className={styles.histList}>
        {lista.map((t) => (
          <li key={t.id}>
            <Link className={styles.histItem} href={`/simulados/${t.exameId}/resultado/?t=${t.id}`}>
              <span>Exame {t.exameId}</span>
              <strong className={t.resultado.total >= NOTA_CORTE ? styles.ok : styles.bad}>
                {fmtNota(t.resultado.total)}
              </strong>
              <span className="muted">{new Date(t.criadaEm).toLocaleDateString("pt-BR")}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
