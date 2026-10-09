"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ExameResumo } from "@/content/load";
import styles from "./provas.module.css";

function Baixar({ href, label, destaque }: { href: string | null; label: string; destaque?: boolean }) {
  if (!href) return <span className={styles.na} title="Não disponível">—</span>;
  return (
    <a className={`${styles.dl} ${destaque ? styles.dlGold : ""}`} href={href} download aria-label={label}>
      ⬇ PDF
    </a>
  );
}

export function TabelaProvas({ exames, pecas }: { exames: ExameResumo[]; pecas: string[] }) {
  const [peca, setPeca] = useState("");
  const [busca, setBusca] = useState("");
  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return exames.filter(
      (e) => (!peca || e.peca === peca) && (!q || `${e.numero} ${e.numeral} ${e.peca} ${e.variante ?? ""}`.toLowerCase().includes(q)),
    );
  }, [exames, peca, busca]);

  return (
    <>
      <div className={styles.filtros}>
        <label>
          <span className="sr-only">Buscar</span>
          <input type="search" placeholder="Buscar exame ou peça…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </label>
        <label>
          <span className="sr-only">Filtrar por peça</span>
          <select value={peca} onChange={(e) => setPeca(e.target.value)}>
            <option value="">Todas as peças</option>
            {pecas.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <span className="muted">{lista.length} exame(s)</span>
      </div>
      <div className={styles.scroll}>
        <table className={styles.tabela}>
          <thead>
            <tr>
              <th scope="col">Exame</th>
              <th scope="col">Peça cobrada</th>
              <th scope="col" className={styles.c}>Caderno original</th>
              <th scope="col" className={styles.c}>Gabarito original</th>
              <th scope="col" className={styles.c}>Caderno atualizado</th>
              <th scope="col" className={styles.c}>Gabarito atualizado</th>
              <th scope="col" className={styles.c}>Simulado</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((e) => (
              <tr key={e.id} id={`exame-${e.id}`}>
                <th scope="row">
                  <span className={styles.num}>{e.numeral}</span>
                  <span className={styles.sub}>
                    {e.numero}º Exame{e.variante ? ` · ${e.variante}` : ""}
                    {e.aplicacao ? ` · ${e.aplicacao.slice(0, 4)}` : ""}
                  </span>
                </th>
                <td data-label="Peça cobrada">{e.peca === "—" ? <span className="muted">Gabarito não divulgado</span> : e.peca}</td>
                <td className={styles.c} data-label="Caderno original"><Baixar href={e.downloads.cadernoOriginal} label={`Caderno original do ${e.numeral} Exame`} /></td>
                <td className={styles.c} data-label="Gabarito original"><Baixar href={e.downloads.gabaritoOriginal} label={`Gabarito original do ${e.numeral} Exame`} /></td>
                <td className={styles.c} data-label="Caderno atualizado"><Baixar href={e.downloads.cadernoAtualizado} label={`Caderno atualizado do ${e.numeral} Exame`} destaque /></td>
                <td className={styles.c} data-label="Gabarito atualizado"><Baixar href={e.downloads.gabaritoAtualizado} label={`Gabarito atualizado do ${e.numeral} Exame`} destaque /></td>
                <td className={styles.c} data-label="Simulado">
                  {e.corrigivel ? (
                    <Link className={styles.sim} href={`/simulados/${e.id}/`}>
                      Fazer
                    </Link>
                  ) : (
                    <span className={styles.na}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
