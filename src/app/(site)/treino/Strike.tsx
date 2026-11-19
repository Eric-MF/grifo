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

/** Frases curtas, de referência jurídica, para o strike: uma sorteada a cada vez. */
const FRASES = [
  "Trânsito em julgado!",
  "Recurso provido!",
  "Ordem concedida!",
  "Tese acolhida!",
  "Decisão unânime!",
  "Pedido deferido!",
  "Liminar concedida!",
  "Coisa julgada!",
  "Nada a reformar!",
  "Data venia, impecável!",
  "Notório saber jurídico!",
  "Sentença irretocável!",
  "Ex positis: brilhante!",
  "Acórdão por unanimidade!",
  "Jurisprudência firmada!",
  "Parecer favorável!",
  "Mérito reconhecido!",
  "Embargos? Desnecessários!",
];
export const fraseDoStrike = (antes?: string) => {
  const outras = FRASES.filter((f) => f !== antes);
  return outras[Math.floor(Math.random() * outras.length)]!;
};
/** quanto dura a comemoração do strike (o CSS usa o mesmo tempo, em --duracao) */
export const DURACAO_COMEMORACAO = 5800;

/** Um número entre 0 e 1 que só depende das entradas: o mesmo desenho a cada renderização, outro a cada strike. */
const sorte = (strike: number, i: number, k: number) => {
  const x = Math.sin(strike * 91.7 + i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

const OUROS = ["var(--festa-claro)", "var(--festa-ouro)", "var(--festa-medio)", "var(--festa-brilho)", "var(--festa-escuro)"];

/** o pó dourado que cai depois da explosão: pontos, losangos e estrelinhas que piscam */
function poDourado(strike: number) {
  return Array.from({ length: 60 }, (_, i) => ({
    x: sorte(strike, i, 1) * 100,
    atraso: 0.35 + sorte(strike, i, 2) * 1.6,
    duracao: 2.6 + sorte(strike, i, 3) * 1.8,
    giro: (sorte(strike, i, 4) - 0.5) * 720,
    deriva: (sorte(strike, i, 5) - 0.5) * 24,
    cor: OUROS[i % OUROS.length]!,
    forma: i % 3,
  }));
}

/**
 * As bolinhas do strike explodindo: cada uma voa do centro numa direção e estoura em faíscas. Do meio da tela, em
 * círculo; do menu (no canto de cima, à direita), num leque para baixo e para a esquerda, para não sair da tela.
 */
function estilhacos(strike: number, n: number, doCanto: boolean) {
  const [de, ate] = doCanto ? [0.52 * Math.PI, 1.06 * Math.PI] : [0, 2 * Math.PI];
  return Array.from({ length: n }, (_, i) => {
    const ang = de + ((i + sorte(strike, i, 6) * 0.6) / n) * (ate - de);
    const dist = (doCanto ? 30 : 22) + sorte(strike, i, 7) * (doCanto ? 34 : 20); // em vmin
    return { x: Math.cos(ang) * dist, y: Math.sin(ang) * dist, atraso: sorte(strike, i, 8) * 0.12, cor: cor(i, n) };
  });
}

/**
 * A comemoração do strike: as bolinhas explodem (do menu, no modo foco; do meio da tela, fora dele) e estouram em
 * faíscas, um clarão e raios dourados se abrem, uma frase curta salta em ouro com um brilho que corre, e um pó dourado
 * cai devagar. Não bloqueia a questão (o clique passa) e some sozinha. Com "reduzir movimento", só a frase aparece.
 */
export function Comemoracao({ total, tamanho, proximo, frase, origem }: { total: number; tamanho: number; proximo: number; frase: string; origem?: { x: number; y: number } | null }) {
  const po = useMemo(() => poDourado(total), [total]);
  const pedacos = useMemo(() => estilhacos(total, tamanho, !!origem), [total, tamanho, origem]);
  const estilo: Record<string, string> = { "--duracao": `${DURACAO_COMEMORACAO}ms` };
  if (origem) Object.assign(estilo, { "--ox": `${origem.x}px`, "--oy": `${origem.y}px` });
  return (
    <div className={styles.comemoracao} role="status" aria-live="polite" style={estilo as CSSProperties}>
      <div className={styles.clarao} />
      <div className={styles.raios} />
      <div className={styles.explosao} aria-hidden>
        <span className={styles.onda} />
        {pedacos.map((p, i) => (
          <span key={i} className={styles.estilhaco} style={{ "--x": `${p.x}vmin`, "--y": `${p.y}vmin`, "--atraso": `${p.atraso}s`, "--cor": p.cor } as CSSProperties} />
        ))}
      </div>
      <div className={styles.letreiro}>
        <strong className={styles.frase}>
          {frase.split(" ").map((p, i) => (
            <span key={i} style={{ "--i": i } as CSSProperties}>
              {p}
            </span>
          ))}
        </strong>
        <span className={styles.detalhe}>
          {tamanho} acertos seguidos{total > 1 ? ` · ★ ${total}` : ""}
        </span>
        {proximo > tamanho && <span className={styles.proximo}>Agora, {proximo} seguidas</span>}
      </div>
      <div className={styles.confetes} aria-hidden>
        {po.map((c, i) => (
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
