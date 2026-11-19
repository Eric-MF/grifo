"use client";
// Seleção de personagem do menu: só o desenho de cada um, em quadrados, e uma ficha fixa embaixo com o nome, se é o
// personagem atual, o poder (que leva ao painel de Poderes) e os efeitos.
//
// Tocar escolhe. Segurar (um instante parado) e deslizar o dedo pelos quadrados mostra cada um na ficha; ao soltar,
// fica o último em que o dedo estava; soltar fora da grade volta ao que estava. Com o mouse, passar por cima mostra.

import { useEffect, useRef, useState } from "react";
import { desbloqueado, type Progresso } from "./progresso";
import { Retrato } from "./Retrato";
import { IconeCadeado, IconeSeta } from "./IconesMenu";
import type { ItemJogo } from "./types";
import { useDeslizar } from "./useDeslizar";
import styles from "./games.module.css";

interface Props {
  /** na ordem do menu */
  personagens: ItemJogo[];
  progresso: Progresso;
  atual: string;
  estilo: string;
  onEscolher: (id: string) => void;
  /** tocar no poder da ficha: abre esse poder no painel de Poderes */
  onVerPoder?: (personagem: ItemJogo) => void;
}

export function SeletorPersonagens({ personagens, progresso, atual, estilo, onEscolher, onVerPoder }: Props) {
  // o bloqueado que foi tocado (a ficha mostra como liberar)
  const [tocado, setTocado] = useState<string | null>(null);
  const { ref: grade, previa, balao, deslizando, handlers, consumirClique } = useDeslizar({
    atributo: "personagem",
    aoPassar: true,
    onSoltar: (id) => {
      const item = personagens.find((p) => p.id === id);
      if (item && desbloqueado(item, progresso)) {
        onEscolher(item.id);
        setTocado(null);
      }
    },
  });

  // escolher (ou tocar num bloqueado) muda a ficha: se ela estiver fora da vista, a rolagem anda o mínimo para mostrá-la
  const fichaRef = useRef<HTMLDivElement>(null);
  const montou = useRef(false);
  useEffect(() => {
    if (!montou.current) {
      montou.current = true;
      return;
    }
    const quadro = requestAnimationFrame(() => fichaRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
    return () => cancelAnimationFrame(quadro);
  }, [atual, tocado]);

  const exibido = personagens.find((p) => p.id === (previa ?? tocado ?? atual)) ?? personagens.find((p) => p.id === atual);
  const liberado = !!exibido && desbloqueado(exibido, progresso);
  const ehAtual = exibido?.id === atual;
  const previaItem = previa ? personagens.find((p) => p.id === previa) : undefined;

  return (
    <fieldset className={`${styles.grupo} ${styles.grupoPersonagens}`}>
      <legend>Personagem</legend>
      <div ref={grade} className={styles.personagens} data-deslizando={deslizando || undefined} {...handlers}>
        {personagens.map((p) => {
          const livre = desbloqueado(p, progresso);
          return (
            <button
              key={p.id}
              type="button"
              data-personagem={p.id}
              className={styles.quadro}
              aria-pressed={p.id === atual}
              aria-label={livre ? p.nome : `Bloqueado: ${p.requisito ?? "ainda não liberado"}`}
              data-bloqueado={!livre || undefined}
              data-mostrado={exibido?.id === p.id || undefined}
              onClick={() => {
                if (consumirClique()) return;
                if (livre) {
                  onEscolher(p.id);
                  setTocado(null);
                } else setTocado((t) => (t === p.id ? null : p.id));
              }}
            >
              {livre && p.desenhar ? (
                <Retrato desenhar={p.desenhar} estilo={estilo} className={styles.quadroRetrato} />
              ) : (
                <span className={styles.icone}>
                  <IconeCadeado />
                </span>
              )}
            </button>
          );
        })}
        {/* deslizando, o dedo cobre a ficha: o nome e o resumo do personagem sob ele aparecem num balão acima */}
        {deslizando && balao && previaItem && (
          <div className={styles.balao} style={{ left: balao.left, top: balao.top }} aria-hidden>
            {desbloqueado(previaItem, progresso) ? (
              <>
                <strong>{previaItem.nome}</strong>
                {previaItem.poder && (
                  <span>
                    {previaItem.poder.nome}: {previaItem.poder.descricao}
                  </span>
                )}
              </>
            ) : (
              <>
                <strong>???</strong>
                <span>{previaItem.requisito ?? "Ainda não liberado."}</span>
              </>
            )}
          </div>
        )}
      </div>
      {exibido && (
        <div ref={fichaRef} className={styles.ficha} aria-live="polite">
          {liberado && exibido.desenhar ? (
            <Retrato desenhar={exibido.desenhar} estilo={estilo} className={styles.fichaRetrato} />
          ) : (
            <span className={`${styles.icone} ${styles.fichaRetrato}`}>
              <IconeCadeado />
            </span>
          )}
          <div className={styles.fichaTexto}>
            <span className={styles.fichaNome}>
              <strong>{liberado ? exibido.nome : "???"}</strong>
              <span className={styles.fichaEtiqueta} data-atual={ehAtual || undefined}>
                {ehAtual ? "✓ Personagem atual" : !liberado ? "Bloqueado" : deslizando ? "Solte para escolher" : "Toque para escolher"}
              </span>
            </span>
            {!liberado && <small>{exibido.requisito ?? "Ainda não liberado."}</small>}
            {liberado && exibido.comoObter && <small>{exibido.comoObter}</small>}
            {liberado && exibido.poder && (
              <button type="button" className={styles.fichaPoder} onClick={() => onVerPoder?.(exibido)} title="Ver e melhorar este poder">
                <img src={exibido.poder.icone} alt="" />
                <span>
                  <b>{exibido.poder.nome}</b> {exibido.poder.descricao}
                  {exibido.poder.duracao > 0 && ` Dura ${exibido.poder.duracao} s.`}
                </span>
                {onVerPoder && (
                  <span className={styles.icone} aria-hidden>
                    <IconeSeta />
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </fieldset>
  );
}
