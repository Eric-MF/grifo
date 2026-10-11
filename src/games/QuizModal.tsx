"use client";

import { useMemo } from "react";
import { PromoSlot } from "@/components/PromoSlot";
import { sortearPergunta } from "@/quiz/banco";
import { PerguntaCorpo } from "@/quiz/PerguntaCorpo";
import type { Categoria, Nivel, Pergunta } from "@/quiz/types";
import styles from "@/quiz/quiz.module.css";

interface Props {
  nivel: Nivel;
  categorias: Categoria[];
  titulo: string;
  subtitulo: string;
  poder?: { icone: string; descricao: string; duracao: number };
  onFim: (acertou: boolean) => void;
  seed: number;
}

/** Pergunta de 2ª fase com espaço promocional discreto ao lado. Serve a qualquer jogo. */
export function QuizModal({ nivel, categorias, titulo, subtitulo, poder, onFim, seed }: Props) {
  const pergunta = useMemo<Pergunta>(() => sortearPergunta({ categorias }), [seed]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={styles.quizOverlay} role="dialog" aria-modal="true" aria-labelledby="quiz-titulo">
      <div className={styles.quizLayout}>
        <PerguntaCorpo
          pergunta={pergunta}
          nivel={nivel}
          rotuloContinuar="Continuar"
          aoContinuar={(r) => onFim(r.acertou)}
          cabecalho={
            <>
              <p className={styles.quizEyebrow}>{subtitulo}</p>
              <h2 id="quiz-titulo" className={styles.quizTitulo}>
                {titulo}
              </h2>
              {poder && (
                <p className={styles.quizPoder}>
                  <img src={poder.icone} alt="" /> {poder.descricao}
                  {poder.duracao > 0 && ` Dura ${poder.duracao} s.`}
                </p>
              )}
            </>
          }
        />
        <div className={styles.quizAd}>
          <PromoSlot local="quiz-lateral" seed={seed} variant="card" />
        </div>
      </div>
    </div>
  );
}
