"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { ExameSimulado } from "@/lib/correcao/simulado";
import { NOTA_CORTE, type ResultadoExame, type ResultadoParte } from "@/lib/correcao/grader";
import { fmtNota } from "@/lib/formato";
import styles from "./provas.module.css";

type Textos = { peca: string; questoes: string[] };
type Carga = { exame: ExameSimulado; corrigir: (t: Textos) => ResultadoExame };

function CampoTexto({ rotulo, valor, onChange }: { rotulo: string; valor: string; onChange: (v: string) => void }) {
  return (
    <label className={styles.campoTexto}>
      <span>{rotulo}</span>
      <textarea value={valor} onChange={(e) => onChange(e.target.value)} rows={8} />
    </label>
  );
}

function Parte({ parte }: { parte: ResultadoParte }) {
  return (
    <li className={styles.notaParte}>
      <div>
        <strong>{parte.titulo}</strong>{" "}
        <span>
          {fmtNota(parte.obtido)} / {fmtNota(parte.valor)}
        </span>
      </div>
      {parte.aviso && <p className={styles.aviso}>{parte.aviso.mensagem}</p>}
      <details>
        <summary>Itens</summary>
        <ul className={styles.itensNota}>
          {parte.itens.map((it) => (
            <li key={it.n}>
              <b>{it.n}</b> {it.descricao} <span>{fmtNota(it.obtido)} / {fmtNota(it.valor)}</span>
            </li>
          ))}
        </ul>
      </details>
    </li>
  );
}

export function ConferirTexto({ exameId }: { exameId: string }) {
  const [carga, setCarga] = useState<Carga | null>(null);
  const [falhou, setFalhou] = useState(false);
  const [textos, setTextos] = useState<Textos>({ peca: "", questoes: [] });
  const textosAdiados = useDeferredValue(textos);

  useEffect(() => {
    let cancelado = false;
    Promise.all([
      fetch(`/dados/exames/${exameId}.json`).then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<ExameSimulado>;
      }),
      import("@/lib/correcao/cliente"),
      import("@/lib/correcao/grader"),
    ])
      .then(([exame, cliente, grader]) => {
        if (cancelado) return;
        const ctx = cliente.contextoCorrecao();
        setCarga({ exame, corrigir: (t) => grader.corrigirExame(exame, t, ctx) });
      })
      .catch(() => {
        if (!cancelado) setFalhou(true);
      });
    return () => {
      cancelado = true;
    };
  }, [exameId]);

  const nResultado = useMemo(() => {
    if (!carga) return null;
    const n = carga.exame.questoes.length;
    return carga.corrigir({
      peca: textosAdiados.peca,
      questoes: Array.from({ length: n }, (_, i) => textosAdiados.questoes[i] ?? ""),
    });
  }, [carga, textosAdiados]);

  if (falhou) return <p className={styles.corpo}>Não foi possível carregar este exame.</p>;
  if (!carga) return <p className={styles.corpo}>Carregando…</p>;

  const { exame } = carga;
  return (
    <div className={styles.conferir}>
      <div className={styles.conferirTextos}>
        <p className="muted">
          Cole o texto de cada parte e veja a nota ao lado. Nada disto é salvo, e o resultado não pode ser compartilhado: serve só para conferir textos.
        </p>
        <CampoTexto rotulo={`Peça: ${exame.peca.nome}`} valor={textos.peca} onChange={(v) => setTextos((t) => ({ ...t, peca: v }))} />
        {exame.questoes.map((q, i) => (
          <CampoTexto
            key={q.n}
            rotulo={`Questão ${q.n}`}
            valor={textos.questoes[i] ?? ""}
            onChange={(v) =>
              setTextos((t) => {
                const questoes = [...t.questoes];
                questoes[i] = v;
                return { ...t, questoes };
              })
            }
          />
        ))}
        <button type="button" className={styles.limpar} onClick={() => setTextos({ peca: "", questoes: [] })}>
          Limpar textos
        </button>
      </div>
      <aside className={styles.conferirNota} aria-live="polite" aria-label="Nota do texto">
        {nResultado && (
          <>
            <p className={styles.notaTotal}>
              <span>Nota</span>
              <strong>{fmtNota(nResultado.total)}</strong>
              <span className="muted"> / {fmtNota(nResultado.maximo)}</span>
            </p>
            <p className={nResultado.aprovado ? styles.aprovado : styles.reprovado}>
              {nResultado.aprovado ? "Acima da nota de corte" : `Abaixo da nota de corte (${fmtNota(NOTA_CORTE)})`}
            </p>
            <ul className={styles.listaNota}>
              {nResultado.partes.map((p) => (
                <Parte key={p.parte} parte={p} />
              ))}
            </ul>
          </>
        )}
      </aside>
    </div>
  );
}
