"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Citado } from "@/components/Citacoes";
import { alternativas, registrarResultado } from "./banco";
import type { Nivel, Pergunta } from "./types";
import { corrigirResposta, type Correcao } from "./verificar";
import styles from "./quiz.module.css";

interface Props {
  pergunta: Pergunta;
  nivel: Nivel;
  cabecalho?: ReactNode;
  aoResponder?: (c: Correcao) => void;
  rotuloContinuar: string;
  aoContinuar: (c: Correcao) => void;
}

/** Caso, comando, resposta (alternativas ou digitada) e feedback. Serve ao jogo e ao treino. */
export function PerguntaCorpo({ pergunta, nivel, cabecalho, aoResponder, rotuloContinuar, aoContinuar }: Props) {
  const alts = useMemo(() => alternativas(pergunta), [pergunta]);
  const [peca, setPeca] = useState("");
  const [fund, setFund] = useState("");
  const [res, setRes] = useState<Correcao | null>(null);
  const caixa = useRef<HTMLDivElement>(null);

  // Foco na caixa, não em botão ou campo: com a barra de espaço para bater as asas, um botão
  // focado seria acionado sem querer.
  useEffect(() => {
    caixa.current?.focus();
  }, [pergunta]);

  const responder = (pecaEscolhida?: string) => {
    const r = corrigirResposta(pergunta, nivel, { peca: pecaEscolhida ?? peca, fundamento: fund });
    registrarResultado(pergunta, r.acertou);
    setRes(r);
    aoResponder?.(r);
  };

  return (
    <div ref={caixa} className={styles.quizBox} tabIndex={-1}>
      {cabecalho}
      <p className={styles.caso}>{pergunta.caso}</p>
      <p className={styles.comando}>
        {nivel === 1 ? pergunta.comando.replace(/ e o seu fundamento.*\?$/, "?") : pergunta.comando}
      </p>

      {!res && nivel === 1 && (
        <div className={styles.alts}>
          {alts.map((a, i) => (
            <button key={a.tipo} type="button" className={styles.alt} onClick={() => responder(a.tipo)}>
              <span className={styles.altLetra}>{"ABCD"[i]}</span>
              {a.nome}
            </button>
          ))}
        </div>
      )}

      {!res && nivel > 1 && (
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            responder();
          }}
        >
          <label>
            <span>Peça</span>
            <input
              value={peca}
              onChange={(e) => setPeca(e.target.value)}
              placeholder="ex.: Recurso em Sentido Estrito"
              autoComplete="off"
              required
            />
          </label>
          <label>
            <span>Fundamento legal {nivel === 3 ? "(com parágrafo, inciso ou alínea)" : "(artigo e lei)"}</span>
            <input
              value={fund}
              onChange={(e) => setFund(e.target.value)}
              placeholder={nivel === 3 ? "ex.: art. 581, IV, do CPP" : "ex.: art. 581 do CPP"}
              autoComplete="off"
              required
            />
          </label>
          <button type="submit" className="btn btn-gold">
            Responder
          </button>
        </form>
      )}

      {res && (
        <div className={`${styles.feedback} ${res.acertou ? styles.fbOk : styles.fbErro}`} aria-live="assertive">
          <strong className={styles.fbTitulo}>{res.acertou ? "✓ Correto!" : "✗ Não foi dessa vez"}</strong>
          {!res.acertou && nivel > 1 && (
            <p className={styles.fbDetalhe}>
              Peça: {res.acertouPeca ? "certa" : "errada"} · Fundamento: {res.acertouFundamento ? "certo" : "errado"}
            </p>
          )}
          <p>
            <strong>{res.pecaEsperada}</strong> — <Citado texto={res.fundamentoEsperado} />
          </p>
          <p className={styles.fbExp}>
            <Citado texto={pergunta.explicacao} />
          </p>
          <button type="button" className="btn btn-primary" onClick={() => aoContinuar(res)}>
            {rotuloContinuar}
          </button>
        </div>
      )}
    </div>
  );
}
