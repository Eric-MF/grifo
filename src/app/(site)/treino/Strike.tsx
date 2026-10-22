"use client";

import { type CSSProperties, useMemo } from "react";
import { tamanhoDoStrike, type EstadoStrike } from "@/quiz/strike";
import styles from "./strike.module.css";

/** A cor da bolinha `i` de `n`: do azul ao dourado e ao vermelho, esquentando perto do strike. */
export function cor(i: number, n: number): string {
  const t = n > 1 ? i / (n - 1) : 1;
  // azul 205 → verde 140 → dourado 45 → laranja 25 → vermelho 0
  const paradas = [205, 140, 45, 25, 0];
  const pos = t * (paradas.length - 1);
  const k = Math.min(paradas.length - 2, Math.floor(pos));
  const matiz = paradas[k]! + (paradas[k + 1]! - paradas[k]!) * (pos - k);
  return `hsl(${Math.round(matiz)} 85% ${t > 0.75 ? 52 : 48}%)`;
}

/**
 * O placar do strike, acima da questão: uma bolinha por acerto seguido, até o tamanho do strike (10, depois 15… até 30).
 * As cores esquentam perto do strike; o erro apaga todas (com um tremor). Ao lado, quantos strikes saíram no treino.
 */
export function PlacarStrike({ estado, fez = false, perdeuEm, sons, aoSom }: { estado: EstadoStrike; fez?: boolean; perdeuEm: number; sons: boolean; aoSom: () => void }) {
  const n = tamanhoDoStrike(estado.seguidos);
  const faltam = n - estado.acertos;
  return (
    <div className={styles.placar}>
      <div
        key={perdeuEm}
        className={styles.bolinhas}
        data-perdeu={perdeuEm && !fez ? "1" : undefined}
        data-fez={fez ? "1" : undefined}
        role="img"
        aria-label={`Strike: ${estado.acertos} de ${n} acertos seguidos`}
        style={{ "--n": n } as CSSProperties}
      >
        {Array.from({ length: n }, (_, i) => (
          <span
            key={i}
            className={styles.bolinha}
            data-cheia={i < estado.acertos ? "1" : undefined}
            data-ultima={i === estado.acertos - 1 ? "1" : undefined}
            style={{ "--cor": cor(i, n), "--k": i } as CSSProperties}
          />
        ))}
      </div>
      <p className={styles.legenda}>
        <span className={styles.rotulo} style={{ "--cor": cor(Math.max(0, estado.acertos - 1), n) } as CSSProperties}>
          {fez ? "Strike!" : estado.acertos ? `${estado.acertos} seguidas` : "Strike"}
        </span>
        {!fez && <span className={styles.falta}>{faltam === 1 ? "falta 1 para o strike" : `faltam ${faltam} para o strike`}</span>}
        {estado.total > 0 && (
          <span className={styles.total} title="Strikes neste treino">
            ★ {estado.total} {estado.total === 1 ? "strike" : "strikes"}
          </span>
        )}
        <button type="button" className={styles.som} onClick={aoSom} aria-pressed={sons} aria-label={sons ? "Desligar os sons" : "Ligar os sons"} data-dica={sons ? "Sons ligados" : "Sons desligados"}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
            {sons ? <path className={styles.ondas} d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /> : <path className={styles.ondas} d="M16 9.5l5 5M21 9.5l-5 5" />}
          </svg>
        </button>
      </p>
    </div>
  );
}

const CORES_CONFETE = ["#f5b82e", "#ff6b4a", "#ff3d7f", "#7c5cff", "#2fb7ff", "#2fd38a", "#ffe066"];

/** Um número entre 0 e 1 que só depende das entradas: o mesmo desenho a cada renderização, outro a cada strike. */
const sorte = (strike: number, i: number, k: number) => {
  const x = Math.sin(strike * 91.7 + i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

function confetesDoStrike(strike: number) {
  return Array.from({ length: 70 }, (_, i) => ({
    x: sorte(strike, i, 1) * 100,
    atraso: sorte(strike, i, 2) * 0.5,
    duracao: 1.6 + sorte(strike, i, 3) * 1.3,
    giro: (sorte(strike, i, 4) - 0.5) * 1080,
    deriva: (sorte(strike, i, 5) - 0.5) * 30,
    cor: CORES_CONFETE[i % CORES_CONFETE.length]!,
    forma: i % 3,
  }));
}

/**
 * A comemoração do strike: um clarão, anéis que se abrem, "STRIKE!" que salta e confetes caindo. Não bloqueia a
 * questão (o clique passa) e some sozinha. Com "reduzir movimento", só o letreiro aparece e some.
 */
export function Comemoracao({ total, tamanho, proximo }: { total: number; tamanho: number; proximo: number }) {
  const confetes = useMemo(() => confetesDoStrike(total), [total]);
  return (
    <div className={styles.comemoracao} role="status" aria-live="polite">
      <div className={styles.clarao} />
      <div className={styles.aneis}>
        <span />
        <span />
        <span />
      </div>
      <div className={styles.letreiro}>
        <strong className={styles.strike}>
          {"STRIKE!".split("").map((l, i) => (
            <span key={i} style={{ "--i": i } as CSSProperties}>
              {l}
            </span>
          ))}
        </strong>
        <span className={styles.detalhe}>
          {tamanho} acertos seguidos{total > 1 ? ` · ${total}º strike` : ""}
        </span>
        {proximo > tamanho && <span className={styles.proximo}>O próximo strike pede {proximo} seguidas</span>}
      </div>
      <div className={styles.confetes} aria-hidden>
        {confetes.map((c, i) => (
          <span
            key={i}
            data-forma={c.forma}
            style={{ "--x": `${c.x}%`, "--atraso": `${c.atraso}s`, "--duracao": `${c.duracao}s`, "--giro": `${c.giro}deg`, "--deriva": `${c.deriva}vw`, "--cor": c.cor } as CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}
