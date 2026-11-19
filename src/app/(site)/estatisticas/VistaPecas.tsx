"use client";

// As peças do topo, no formato que a pessoa escolher: a pirâmide, o pódio, a pizza ou o mosaico, com 3, 5 ou 7 peças,
// pelas vezes que caíram ou pelo palpite do próximo exame. Ao lado, a lista das mesmas peças, com os números.
import { type CSSProperties, type ReactNode } from "react";
import { mosaico } from "@/lib/estatisticas/mosaico";
import { dica } from "@/lib/estatisticas/rotulos";
import { Barra } from "./Graficos";
import styles from "./estatisticas.module.css";

export type Formato = "piramide" | "podio" | "pizza" | "mosaico";
export type Criterio = "vezes" | "palpite";
export const FORMATOS: { id: Formato; nome: string }[] = [
  { id: "piramide", nome: "Pirâmide" },
  { id: "podio", nome: "Pódio" },
  { id: "pizza", nome: "Pizza" },
  { id: "mosaico", nome: "Mosaico" },
];
export const QUANTAS = [3, 5, 7] as const;
export type Quantas = (typeof QUANTAS)[number];
export const CRITERIOS: { id: Criterio; nome: string }[] = [
  { id: "vezes", nome: "Mais cobradas" },
  { id: "palpite", nome: "Palpite do próximo" },
];

export interface ItemVista {
  tipo: string;
  nome: string;
  /** o número que ordena e dá o tamanho (vezes, ou a chance de 0 a 1) */
  valor: number;
  /** o valor escrito: "14×", "44%" */
  rotulo: string;
  /** a linha de baixo na lista: "14 exames · 30% · última há 3" */
  detalhe: string;
  /** a cor da peça (na pizza e no mosaico) */
  cor: string;
  /** o medalhão do artigo, na lista */
  medalha: ReactNode;
}

const MEDALHAS = ["var(--podio-ouro)", "var(--podio-prata)", "var(--podio-bronze)"];

/** As `quantas` primeiras e, na pizza e no mosaico, as outras juntas (o círculo e o retângulo fecham em 100%). */
function topo(itens: ItemVista[], quantas: number) {
  const primeiras = itens.slice(0, quantas);
  const resto = itens.slice(quantas);
  const outras = resto.length
    ? {
        nome: `Outras ${resto.length} ${resto.length === 1 ? "peça" : "peças"}`,
        valor: resto.reduce((s, i) => s + i.valor, 0),
        nomes: resto.map((i) => i.nome),
      }
    : null;
  return { primeiras, outras };
}

export function VistaPecas({
  itens,
  formato,
  quantas,
  criterio,
  total,
  onAbrir,
}: {
  itens: ItemVista[];
  formato: Formato;
  quantas: Quantas;
  criterio: Criterio;
  /** o número de exames (a legenda da pizza) */
  total: number;
  onAbrir: (tipo: string) => void;
}) {
  const { primeiras, outras } = topo(itens, quantas);
  const soma = itens.reduce((s, i) => s + i.valor, 0) || 1;
  const maior = primeiras[0]?.valor || 1;
  const pos = (i: number) => `${i + 1}º`;
  const fracaoTexto = (v: number) => `${Math.round((v / soma) * 100)}%`;
  // a linha de baixo da dica: o detalhe das vezes já traz a porcentagem; o do palpite, não
  const linhaDica = (it: ItemVista, i: number) => (criterio === "palpite" ? `${pos(i)} · ${it.rotulo} · ${it.detalhe}` : `${pos(i)} · ${it.detalhe}`);
  const rotuloAcessivel = (it: ItemVista, i: number) => `${pos(i)} lugar: ${it.nome}, ${it.detalhe}. Abrir a ficha da peça`;

  let visual: ReactNode;
  if (formato === "piramide") {
    const n = primeiras.length;
    visual = (
      <div className={styles.piramide} style={{ aspectRatio: `1 / ${0.86 + Math.max(0, n - 3) * 0.06}` } as CSSProperties} role="list" aria-label={`As ${n} peças do topo`}>
        {primeiras.map((it, i) => {
          // o nome só entra no andar largo o bastante; nos de cima, ele fica na dica e na lista ao lado
          const comNome = n <= 3 || (i + 1) / n >= 0.4;
          return (
            <button
              key={it.tipo}
              type="button"
              role="listitem"
              className={styles.andar}
              data-andar={i < 3 ? i + 1 : "n"}
              data-topo={i === 0 || undefined}
              style={
                {
                  top: `${(i / n) * 100}%`,
                  height: `${100 / n}%`,
                  "--largura-nome": `${Math.max(30, ((i + 0.5) / n) * 92)}%`,
                  "--tamanho-nome": `${Math.min(0.95, 0.62 + (i / Math.max(1, n - 1)) * 0.33)}rem`,
                } as CSSProperties
              }
              onClick={() => onAbrir(it.tipo)}
              aria-label={rotuloAcessivel(it, i)}
              {...dica(it.nome, `${pos(i)} · ${it.detalhe}`)}
            >
              <span className={styles.andarPos}>{pos(i)}</span>
              {comNome && <span className={styles.andarNome}>{it.nome}</span>}
              <span className={styles.andarVezes}>{it.rotulo}</span>
            </button>
          );
        })}
      </div>
    );
  } else if (formato === "podio") {
    // os três degraus na ordem do pódio: o 2º, o 1º e o 3º
    const degraus = [1, 0, 2].filter((i) => primeiras[i]);
    visual = (
      <div className={styles.podioVisual} role="list" aria-label="O pódio das três peças do topo">
        {degraus.map((i) => {
          const it = primeiras[i]!;
          return (
            <button
              key={it.tipo}
              type="button"
              role="listitem"
              className={styles.degrau}
              style={{ "--podio-cor": MEDALHAS[i], "--altura": `${38 + (it.valor / maior) * 62}%` } as CSSProperties}
              onClick={() => onAbrir(it.tipo)}
              aria-label={rotuloAcessivel(it, i)}
              {...dica(it.nome, `${pos(i)} · ${it.detalhe}`)}
            >
              <span className={styles.degrauNome}>{it.nome}</span>
              <span className={styles.degrauBloco}>
                <span className={styles.degrauPos}>{pos(i)}</span>
                <span className={styles.degrauValor}>{it.rotulo}</span>
              </span>
            </button>
          );
        })}
      </div>
    );
  } else if (formato === "pizza") {
    // as fatias saem do topo, no sentido do relógio; a porcentagem vai dentro das fatias de 6% ou mais
    const R = 92;
    const fatias = [...primeiras.map((it) => ({ it, valor: it.valor, cor: it.cor })), ...(outras ? [{ it: null, valor: outras.valor, cor: "var(--border)" }] : [])];
    let angulo = -Math.PI / 2;
    const ponto = (a: number, r: number) => `${(100 + Math.cos(a) * r).toFixed(2)},${(100 + Math.sin(a) * r).toFixed(2)}`;
    visual = (
      <figure className={styles.pizza}>
        <svg viewBox="0 0 200 200" role="img" aria-label={`A parte de cada peça: ${fatias.map((f) => `${f.it?.nome ?? outras!.nome} ${fracaoTexto(f.valor)}`).join(", ")}`}>
          {fatias.map((f, i) => {
            const fracao = f.valor / soma;
            const a0 = angulo;
            const a1 = angulo + fracao * 2 * Math.PI;
            angulo = a1;
            const meio = (a0 + a1) / 2;
            const d =
              fracao >= 0.9999
                ? `M100,${100 - R} A${R},${R} 0 1 1 99.99,${100 - R} Z`
                : `M100,100 L${ponto(a0, R)} A${R},${R} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${ponto(a1, R)} Z`;
            const props = f.it
              ? { onClick: () => onAbrir(f.it!.tipo), ...dica(f.it.nome, linhaDica(f.it, i)), "data-clicavel": "" }
              : dica(outras!.nome, fracaoTexto(f.valor), outras!.nomes.join(", "));
            return (
              <g key={f.it?.tipo ?? "outras"} style={{ "--dx": `${(Math.cos(meio) * 6).toFixed(2)}px`, "--dy": `${(Math.sin(meio) * 6).toFixed(2)}px` } as CSSProperties} {...props}>
                <path d={d} fill={f.cor} />
                {fracao >= 0.06 && (
                  <text x={100 + Math.cos(meio) * R * 0.62} y={100 + Math.sin(meio) * R * 0.62} textAnchor="middle" dominantBaseline="central">
                    {fracaoTexto(f.valor)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        <figcaption className="muted">
          {criterio === "palpite" ? "chance estimada no próximo exame" : `a parte de cada peça nos ${total} ${total === 1 ? "exame" : "exames"}`}
        </figcaption>
      </figure>
    );
  } else {
    const W = 160;
    const H = 100;
    const blocos = [...primeiras.map((it) => ({ it, valor: it.valor })), ...(outras ? [{ it: null, valor: outras.valor }] : [])];
    const rets = mosaico(
      blocos.map((b) => b.valor),
      W,
      H,
    );
    visual = (
      <div className={styles.mosaico} role="list" aria-label={`As peças pelo tamanho: ${blocos.map((b) => `${b.it?.nome ?? outras!.nome} ${fracaoTexto(b.valor)}`).join(", ")}`}>
        {blocos.map((b, i) => {
          const q = rets[i]!;
          const estilo = { left: `${(q.x / W) * 100}%`, top: `${(q.y / H) * 100}%`, width: `${(q.w / W) * 100}%`, height: `${(q.h / H) * 100}%` };
          // o nome entra no bloco grande; o valor, no médio; no pequeno, só a posição (o resto fica na dica e na lista)
          const grande = (q.w / W > 0.2 && q.h / H > 0.24) || (q.w / W > 0.15 && q.h / H > 0.4);
          const medio = q.w / W > 0.1 && q.h / H > 0.17;
          if (!b.it)
            return (
              <span key="outras" role="listitem" className={styles.bloco} data-outras style={estilo} {...dica(outras!.nome, outras!.nomes.join(", "))}>
                {medio && <span className={styles.blocoValor}>{fracaoTexto(b.valor)}</span>}
                {grande && <span className={styles.blocoNome}>{outras!.nome}</span>}
              </span>
            );
          const it = b.it;
          return (
            <button
              key={it.tipo}
              type="button"
              role="listitem"
              className={styles.bloco}
              style={{ ...estilo, "--cor": it.cor } as CSSProperties}
              onClick={() => onAbrir(it.tipo)}
              aria-label={rotuloAcessivel(it, i)}
              {...dica(it.nome, linhaDica(it, i))}
            >
              {medio && <span className={styles.blocoValor}>{criterio === "palpite" ? it.rotulo : `${it.rotulo} · ${fracaoTexto(b.valor)}`}</span>}
              <span className={styles.blocoNome}>{grande ? it.nome : pos(i)}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`card ${styles.vistaCaixa}`} data-formato={formato}>
      <div className={styles.vistaVisual}>{visual}</div>
      <ol className={styles.podio}>
        {primeiras.map((it, i) => (
          <li key={it.tipo} style={{ "--podio-cor": MEDALHAS[i] ?? "var(--border)" } as CSSProperties} data-andar={i + 1}>
            <button type="button" onClick={() => onAbrir(it.tipo)} aria-label={rotuloAcessivel(it, i)}>
              <span className={styles.podioPos} aria-hidden>
                {pos(i)}
              </span>
              {it.medalha}
              <span className={styles.podioTexto}>
                <strong>{it.nome}</strong>
                <span className="muted">{it.detalhe}</span>
                <Barra fracao={it.valor / maior} cor={it.cor} />
              </span>
              <span className={styles.podioNum}>{it.rotulo}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
