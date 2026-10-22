"use client";

import { type CSSProperties, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { tamanhoDoStrike, type EstadoStrike } from "@/quiz/strike";
import type { Nivel } from "@/quiz/types";
import { cor } from "./Strike";
import styles from "./menuFoco.module.css";

/** Quanto dura a revoada das bolinhas do strike, que saem do menu e voltam a cada acerto. */
export const DURACAO_REVOADA = 1350;
/** Bolinhas por camada da revoada: com mais, o strike se divide em anéis, um por fora do outro. */
const POR_CAMADA = 10;

/**
 * O menu do modo foco (copiar, sons, largura, sair). O botão é também o placar:
 * - o anel em volta é o tempo que ainda não tira pontos, que se esvazia até a folga acabar;
 * - o líquido de dentro é o strike: sobe a cada acerto seguido e esquenta de cor; o erro esvazia (com um tremor).
 */
export function MenuFoco({
  strike,
  fez,
  perdeuEm,
  inicio,
  folga,
  respondida,
  children,
}: {
  strike: EstadoStrike;
  fez: boolean;
  perdeuEm: number;
  /** performance.now() de quando a questão apareceu */
  inicio: number;
  folga: number;
  respondida: boolean;
  children: ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  const painel = useId();
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("pointerdown", fora, true);
    return () => document.removeEventListener("pointerdown", fora, true);
  }, [aberto]);
  // o anel começa já descontado do tempo passado (o menu remonta a cada questão, mas a questão pode ter começado antes)
  const [atraso] = useState(() => -Math.max(0, (performance.now() - inicio) / 1000));
  const n = tamanhoDoStrike(strike.seguidos);
  const cheio = fez ? 1 : strike.acertos / n;
  const corLiquido = cor(Math.max(0, (fez ? n : strike.acertos) - 1), n);
  return (
    <div
      ref={caixa}
      className={styles.menu}
      onKeyDown={(e) => {
        if (e.key === "Escape" && aberto) {
          e.preventDefault();
          e.stopPropagation();
          setAberto(false);
        }
      }}
    >
      <button
        type="button"
        className={styles.botao}
        data-menu-foco
        aria-expanded={aberto}
        aria-controls={painel}
        aria-label={`Opções do modo foco · strike: ${strike.acertos} de ${n}`}
        onClick={() => setAberto((a) => !a)}
        style={{ "--cheio": cheio, "--cor": corLiquido, "--folga": `${folga}s`, "--atraso": `${atraso}s` } as CSSProperties}
      >
        <span key={perdeuEm} className={styles.liquido} data-perdeu={perdeuEm && !fez ? "1" : undefined} data-fez={fez ? "1" : undefined} aria-hidden>
          <span className={styles.nivel} />
          <span className={styles.brilho} />
        </span>
        <svg className={styles.anel} viewBox="0 0 52 52" aria-hidden>
          <circle className={styles.trilho} cx="26" cy="26" r="24" />
          <circle className={styles.tempo} cx="26" cy="26" r="24" data-parado={respondida ? "1" : undefined} />
        </svg>
        <svg className={styles.sanduiche} viewBox="0 0 24 24" aria-hidden>
          <path d="M5 7h14M5 12h14M5 17h14" />
        </svg>
      </button>
      <div id={painel} className={styles.painel} hidden={!aberto} role="group" aria-label="Opções do modo foco">
        {children}
      </div>
    </div>
  );
}

/** Um item do menu: ícone e texto, a linha toda clicável. */
export function ItemMenu({ icone, children, ...props }: { icone: ReactNode; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={styles.item} {...props}>
      {icone}
      <span>{children}</span>
    </button>
  );
}

/** Sons: o botão liga e desliga; ligado, aparece o controle do volume. */
export function SomDoMenu({ sons, volume, aoSom, aoVolume }: { sons: boolean; volume: number; aoSom: () => void; aoVolume: (v: number) => void }) {
  return (
    <div className={styles.som}>
      <ItemMenu
        aria-pressed={sons}
        onClick={aoSom}
        icone={
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
            {sons ? <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /> : <path d="M16 9.5l5 5M21 9.5l-5 5" />}
          </svg>
        }
      >
        {sons ? "Sons ligados" : "Sons desligados"}
      </ItemMenu>
      {sons && (
        <label className={styles.volume}>
          <span className={styles.oculto}>Volume</span>
          <input type="range" min={0} max={100} step={5} value={Math.round(volume * 100)} onChange={(e) => aoVolume(Number(e.target.value) / 100)} />
          <small aria-hidden>{Math.round(volume * 100)}%</small>
        </label>
      )}
    </div>
  );
}

/**
 * A revoada do strike: a cada acerto, as bolinhas saem do menu, a nova se enche e todas voltam, num só movimento.
 * Com mais de 10, cada camada de até 10 forma um arco, um por fora do outro, todos ao mesmo tempo. O centro é o menu;
 * como ele fica no canto de cima, à direita, o arco é um semicírculo voltado para baixo e para a esquerda, que se
 * fecha mais nas camadas de fora se for preciso para não passar das bordas de cima e da direita.
 */
export function RevoadaStrike({ acertos, n, fez }: { acertos: number; n: number; fez: boolean }) {
  const [centro, setCentro] = useState<{ bx: number; by: number } | null>(null);
  useEffect(() => {
    const r = document.querySelector("[data-menu-foco]")?.getBoundingClientRect();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mede o botão depois de montar
    if (r) setCentro({ bx: r.left + r.width / 2, by: r.top + r.height / 2 });
  }, []);
  if (!centro) return null;
  const camadas = Math.ceil(n / POR_CAMADA);
  const porCamada = Math.ceil(n / camadas);
  const raio = (k: number) => 60 + k * 26;
  const margem = 10;
  // o arco de cada camada: centrado na diagonal para baixo e para a esquerda (135°), com até 180°; fecha de 10 em 10°
  // até as pontas caberem na tela
  const arco = (k: number) => {
    const R = raio(k);
    for (let meio = 90; meio >= 30; meio -= 10) {
      const a = ((135 - meio) * Math.PI) / 180;
      const b = ((135 + meio) * Math.PI) / 180;
      const cabe = centro.bx + R * Math.cos(a) <= window.innerWidth - margem && centro.by + R * Math.sin(b) >= margem;
      if (cabe) return { de: a, ate: b };
    }
    return { de: Math.PI / 2, ate: Math.PI };
  };
  const pontos = Array.from({ length: n }, (_, i) => {
    const k = Math.floor(i / porCamada);
    const j = i % porCamada;
    const naCamada = Math.min(porCamada, n - k * porCamada);
    const { de, ate } = arco(k);
    // de uma ponta à outra; a primeira bolinha fica na ponta de cima
    const ang = ate - (naCamada > 1 ? (j / (naCamada - 1)) * (ate - de) : (ate - de) / 2);
    return { k, x: centro.bx + raio(k) * Math.cos(ang), y: centro.by + raio(k) * Math.sin(ang) };
  });
  return (
    <div className={styles.revoada} aria-hidden data-fez={fez ? "1" : undefined} style={{ "--duracao": `${DURACAO_REVOADA}ms` } as CSSProperties}>
      {pontos.map(({ k, x, y }, i) => {
        return (
          <span
            key={i}
            className={styles.bolinha}
            data-cheia={i < acertos - 1 || fez ? "1" : undefined}
            data-nova={!fez && i === acertos - 1 ? "1" : undefined}
            style={{ left: x, top: y, "--dx": `${centro.bx - x}px`, "--dy": `${centro.by - y}px`, "--cor": cor(i, n), "--k": k } as CSSProperties}
          />
        );
      })}
    </div>
  );
}

/** Os pontos do treino numa estrela com "xp" e, embaixo, uma linha fina dividida: verde nos acertos, vermelho nos erros. */
export function XpFoco({ pontos, acertos, total }: { pontos: number; acertos: number; total: number }) {
  const taxa = total ? acertos / total : 1;
  return (
    <span className={styles.xp} title={`${pontos} pontos · ${acertos} de ${total} acertos`}>
      <span className={styles.xpLinha}>
        <svg className={styles.estrela} viewBox="0 0 24 24" aria-hidden>
          <path d="M12 2.5L15.53 7.65 21.51 9.41 17.71 14.35 17.88 20.59 12 18.5 6.12 20.59 6.29 14.35 2.49 9.41 8.47 7.65z" />
          <text x="12" y="14" textAnchor="middle">
            xp
          </text>
        </svg>
        <strong>{pontos}</strong>
        <span className={styles.oculto}>
          pontos · {acertos} de {total} acertos
        </span>
      </span>
      <span className={styles.taxa} data-vazia={total ? undefined : "1"} style={{ "--taxa": taxa } as CSSProperties} aria-hidden />
    </span>
  );
}

/** Quantos acertos já há e quantos faltam para subir, em barrinhas; a cor esquenta com o nível (Fácil, Médio, Difícil). */
export function BarrasDoNivel({ feitos, total, nivel, rotulo }: { feitos: number; total: number; nivel: Nivel; rotulo: string }) {
  return (
    <span className={styles.barras} data-nivel={nivel} role="img" aria-label={rotulo} title={rotulo}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} data-cheia={i < feitos ? "1" : undefined} style={{ "--i": i } as CSSProperties} />
      ))}
    </span>
  );
}
