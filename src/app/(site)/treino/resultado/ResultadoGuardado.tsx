"use client";

// A página final guardada de um recorde do treino (/treino/resultado/?s=<sessão>): lida do navegador, com as questões
// refeitas do acervo, os mesmos nomes e a correção de quando foram respondidas.
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { perguntaPorId } from "@/quiz/banco";
import { acertosSeguidos, lerRecordes, lerSessao, linhasDaSessao, rotuloDaChave, type LinhaResultado, type Recordes, type SessaoGuardada } from "@/quiz/recordes";
import { ResultadoTreino } from "../ResultadoTreino";
import { dataDoRecorde, IconeTrofeu } from "../SeuRecorde";
import styles from "../treino.module.css";

/** Enquanto a sessão é lida do navegador (e no HTML estático, antes de a página ganhar vida). */
export function CarregandoResultado() {
  return (
    <p className={`${styles.painel} ${styles.regras}`} role="status">
      Abrindo o resultado…
    </p>
  );
}

const hora = (ms: number) => new Date(ms).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

export function ResultadoGuardado() {
  const id = useSearchParams().get("s");
  const [lido, setLido] = useState<{ sessao: SessaoGuardada | null; linhas: LinhaResultado[]; recordes: Recordes } | null>(null);
  useEffect(() => {
    const sessao = id ? lerSessao(id) : null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lê localStorage após montar (site estático)
    setLido({ sessao, linhas: sessao ? linhasDaSessao(sessao, perguntaPorId) : [], recordes: lerRecordes() });
  }, [id]);

  if (!lido) return <CarregandoResultado />;
  const { sessao, linhas, recordes } = lido;
  if (!sessao)
    return (
      <div className={styles.painel}>
        <p>Este resultado não está guardado neste navegador.</p>
        <p className={styles.regras}>
          Cada recorde guarda a página final do treino que o fez, só neste navegador. Quando outro treino bate o recorde, a página do anterior sai.
        </p>
        <div className={styles.acoes}>
          <Link href="/treino/" className="btn btn-gold">
            Treinar questões
          </Link>
          <Link href="/estatisticas/#desempenho" className="btn">
            Ver os recordes
          </Link>
        </div>
      </div>
    );

  const doModo = recordes.modos[sessao.chave]?.sessao === sessao.id;
  const daSequencia = recordes.sequencia?.sessao === sessao.id;
  return (
    <ResultadoTreino
      linhas={linhas}
      modo={sessao}
      strikes={sessao.strikes}
      onde={sessao.ondeAuto ? `terminou em ${sessao.ondeAuto}` : undefined}
      aviso={
        <div className={styles.seuRecorde}>
          <IconeTrofeu />
          <div className={styles.seuRecordeCorpo}>
            <p className={styles.seuRecordeTitulo}>
              {doModo ? "Recorde" : daSequencia ? "Maior sequência de acertos" : "Treino"} <small>{rotuloDaChave(sessao.chave)}</small>
            </p>
            <p className={styles.regras}>
              {dataDoRecorde(sessao.fim)}, às {hora(sessao.fim)}
              {daSequencia && recordes.sequencia
                ? doModo
                  ? ` · também a maior sequência de acertos (${acertosSeguidos(recordes.sequencia.seguidos)})`
                  : ` · ${acertosSeguidos(recordes.sequencia.seguidos)}`
                : ""}
            </p>
          </div>
        </div>
      }
      acoes={
        <>
          <Link href="/treino/" className="btn btn-gold">
            Treinar questões
          </Link>
          <Link href="/estatisticas/#desempenho" className="btn">
            Todos os recordes
          </Link>
          <Link href="/jogos/" className="btn">
            Voltar aos jogos
          </Link>
        </>
      }
    />
  );
}
