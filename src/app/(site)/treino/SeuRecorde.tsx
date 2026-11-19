"use client";

// O recorde do treino: no início, o do modo escolhido (com o link para a página final dele); no fim, o aviso de recorde
// novo ou o recorde que ficou para bater.
import Link from "next/link";
import { useId } from "react";
import { acertosSeguidos, enderecoDaSessao, maximoDaChave, rotuloDaChave, type Recordes } from "@/quiz/recordes";
import styles from "./treino.module.css";

export const dataDoRecorde = (ms: number) => new Date(ms).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
const pts = (n: number) => n.toLocaleString("pt-BR");

/** Um troféu: a taça, as alças e a base. */
export function IconeTrofeu() {
  return (
    <svg className={styles.trofeu} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4z" />
      <path d="M8 6H5v1.5A3.5 3.5 0 0 0 8.5 11M16 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5" />
      <path d="M12 13v4M8.5 20h7M10 17h4" />
    </svg>
  );
}

/** No início do treino: o recorde do modo escolhido e a maior sequência de acertos. */
export function SeuRecorde({ recordes, chave }: { recordes: Recordes; chave: string }) {
  const titulo = useId();
  const r = recordes.modos[chave];
  const maximo = maximoDaChave(chave);
  const seq = recordes.sequencia;
  return (
    <section className={styles.seuRecorde} aria-labelledby={titulo}>
      <IconeTrofeu />
      <div className={styles.seuRecordeCorpo}>
        <h2 id={titulo} className={styles.seuRecordeTitulo}>
          Seu recorde <small>{rotuloDaChave(chave)}</small>
        </h2>
        {r ? (
          <p className={styles.seuRecordeValor}>
            <strong>{pts(r.pontos)}</strong> {maximo ? `de ${pts(maximo)} pontos` : "pontos"}
            <small>
              {r.questoes ? ` · ${r.acertos ?? 0} de ${r.questoes} acertos` : ""}
              {r.quando ? ` · ${dataDoRecorde(r.quando)}` : ""}
            </small>
          </p>
        ) : (
          <p className={styles.regras}>
            Ainda sem recorde neste modo: {chave.endsWith("infinito") ? "o primeiro treino que você encerrar" : "o primeiro treino completo"} marca o recorde.
          </p>
        )}
        {seq && (
          <p className={styles.regras}>
            Maior sequência de acertos: <strong>{seq.seguidos}</strong> ({rotuloDaChave(seq.chave)})
            {seq.sessao && seq.sessao !== r?.sessao && (
              <>
                {" · "}
                <Link href={enderecoDaSessao(seq.sessao)}>ver</Link>
              </>
            )}
          </p>
        )}
        <p className={styles.seuRecordeLinks}>
          {r?.sessao ? (
            <Link href={enderecoDaSessao(r.sessao)}>Ver a página final do recorde</Link>
          ) : r ? (
            <span className={styles.regras}>A página final deste recorde não foi guardada (ele é de antes).</span>
          ) : null}
          <Link href="/estatisticas/#desempenho">Todos os recordes</Link>
        </p>
      </div>
    </section>
  );
}

/**
 * No fim do treino: o recorde novo (de pontos no modo, ou da maior sequência de acertos) ou o recorde que ficou para
 * bater. `conta`: o treino valeu para o recorde de pontos (na quantidade fixa, só o completo).
 */
export function AvisoRecorde({ recordes, chave, sessao, novo, conta }: { recordes: Recordes; chave: string; sessao: string; novo: { pontos: boolean; sequencia: boolean }; conta: boolean }) {
  const r = recordes.modos[chave];
  const seq = recordes.sequencia;
  return (
    <div className={styles.avisoRecorde}>
      {novo.pontos ? (
        <p className="badge badge-gold">Novo recorde: {rotuloDaChave(chave)}!</p>
      ) : !conta ? (
        <p className={styles.regras}>Encerrado antes do fim: o recorde conta só o treino completo.</p>
      ) : r ? (
        <p className={styles.regras}>
          Seu recorde neste modo: <strong>{pts(r.pontos)} pontos</strong>
          {r.sessao && r.sessao !== sessao && (
            <>
              {" · "}
              <Link href={enderecoDaSessao(r.sessao)}>ver a página final</Link>
            </>
          )}
        </p>
      ) : null}
      {novo.sequencia && seq && <p className="badge badge-gold">Nova maior sequência: {acertosSeguidos(seq.seguidos)}!</p>}
    </div>
  );
}
