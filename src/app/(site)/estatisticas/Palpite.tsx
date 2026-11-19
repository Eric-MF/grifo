"use client";

// "E no próximo exame?": o palpite da peça, com o peso do tempo sem cair que a pessoa escolhe, o porquê de cada
// chance e o teste do mesmo palpite nos exames passados. O aviso de que é só uma estimativa vem antes dos números.
import { useId, type CSSProperties } from "react";
import { toRoman } from "@/lib/correcao/citacoes";
import { fmtMedia, fmtPct } from "@/lib/estatisticas/exames";
import { palpite, testarPalpite, type LinhaPalpite } from "@/lib/estatisticas/palpite";
import { dica } from "@/lib/estatisticas/rotulos";
import type { ExameEstat, PecaInfo } from "@/lib/estatisticas/tipos";
import { Barra, corDoGrupo, Numeral } from "./Graficos";
import styles from "./estatisticas.module.css";

const PESOS = [
  { v: 0, nome: "Só a frequência" },
  { v: 1, nome: "Em partes iguais" },
  { v: 2, nome: "O atraso pesa o dobro" },
];

/** "atrasada", "no ritmo" ou "caiu há pouco", pelo tempo sem cair comparado com o intervalo médio; com uma vez só, não
 * há intervalo para comparar. */
export function ritmo(l: LinhaPalpite): { id: "atrasada" | "ritmo" | "recente" | "rara"; nome: string } {
  if (l.vezes === 1) return { id: "rara", nome: "caiu uma vez só" };
  if (l.atraso >= 1.25) return { id: "atrasada", nome: "atrasada" };
  if (l.atraso >= 0.75) return { id: "ritmo", nome: "no ritmo" };
  return { id: "recente", nome: "caiu há pouco" };
}

export function Palpite({
  lista,
  historia,
  janela,
  pecas,
  peso,
  onPeso,
  onAbrir,
}: {
  /** os exames do filtro, em ordem: a base do palpite */
  lista: ExameEstat[];
  /** os exames da época, sem o corte dos "últimos N": a base do teste */
  historia: ExameEstat[];
  janela: number | null;
  pecas: Record<string, PecaInfo>;
  peso: number;
  onPeso: (p: number) => void;
  onAbrir: (tipo: string) => void;
}) {
  const id = useId();
  const exames = lista.filter((e) => !e.variante);
  const linhas = palpite(exames, peso);
  const teste = testarPalpite(historia, peso, janela);
  const ultimo = exames.at(-1);
  const nome = (t: string) => pecas[t]?.nome ?? t;
  const proximo = ultimo && ultimo.era === "fgv" ? `${toRoman(ultimo.numero + 1)} Exame (${ultimo.numero + 1}º)` : null;
  const pesoAtual = PESOS.find((p) => p.v === peso)?.nome;

  // as barras do teste: a porcentagem, as contas e os exames em que acertou, na dica
  const numeros = (xs: ExameEstat[]) => xs.map((e) => `${e.numero}º`).join(", ");
  const acaso = linhas.length ? 1 / linhas.length : 0;
  const barras = [
    {
      nome: "1ª do palpite",
      fracao: teste.testados ? teste.acertos / teste.testados : 0,
      cor: "var(--primary)",
      linhas: [`a peça mais provável foi a da prova em ${teste.acertos} de ${teste.testados} exames`, teste.acertos ? `acertou no ${numeros(teste.acertosEm)}` : "não acertou nenhum"],
    },
    {
      nome: "Entre as 3 primeiras",
      fracao: teste.testados ? teste.entreTres / teste.testados : 0,
      cor: "var(--accent)",
      linhas: [`a peça da prova estava entre as 3 mais prováveis em ${teste.entreTres} de ${teste.testados}`, teste.entreTres ? `no ${numeros(teste.entreTresEm)}` : ""],
    },
    {
      nome: "Ao acaso",
      fracao: acaso,
      cor: "var(--muted)",
      linhas: [`escolher 1 das ${linhas.length} peças sem olhar o passado`, `daria cerca de ${Math.round(acaso * teste.testados)} acertos em ${teste.testados}`],
    },
  ];

  if (exames.length < 3)
    return <p className="muted">Com menos de 3 exames no filtro, não dá para fazer um palpite. Escolha mais exames acima.</p>;

  return (
    <>
      <div className={styles.avisoPalpite} role="note">
        <strong>É só uma estimativa.</strong> A conta usa o passado: quantas vezes cada peça caiu e há quanto tempo ela não cai. A FGV não segue rodízio
        nem avisa a peça, e qualquer uma pode cair, até a do último exame. Use o palpite para organizar a revisão, nunca para deixar de estudar uma peça.
      </div>

      <div className={`card ${styles.palpiteCaixa}`}>
        <p className={styles.palpiteTitulo}>
            {proximo ? <>Palpite para o {proximo}</> : <>Palpite para o exame seguinte aos do filtro</>}
            <span className="muted">
              {" "}
              · com {exames.length} exames, do <Numeral e={exames[0]!} /> ao <Numeral e={ultimo!} />
            </span>
          </p>

        {teste.testados > 0 && (
          <div className={styles.teste} style={{ "--acerto": teste.acertos / teste.testados } as CSSProperties}>
            <p className={styles.testeTitulo}>E se esse palpite fosse usado nas provas passadas?</p>
            <p>
              Testado em {teste.testados} {teste.testados === 1 ? "exame" : "exames"}, desde o <Numeral e={teste.desde!} />, cada um só com os exames
              anteriores a ele{janela ? ` (os últimos ${janela})` : ""}: a peça mais provável foi a da prova em{" "}
              <b>
                {teste.acertos} ({fmtPct(teste.acertos / teste.testados)})
              </b>
              , e a peça da prova estava entre as 3 primeiras em{" "}
              <b>
                {teste.entreTres} ({fmtPct(teste.entreTres / teste.testados)})
              </b>
              . Escolher uma peça ao acaso, entre as {linhas.length}, acertaria cerca de {fmtPct(1 / linhas.length)}.
            </p>
            <div className={styles.testeBarras}>
              {barras.map((b) => (
                <span key={b.nome} tabIndex={0} aria-label={[`${b.nome}: ${fmtPct(b.fracao)}`, ...b.linhas].join(". ")} {...dica(`${b.nome}: ${fmtPct(b.fracao)}`, ...b.linhas)}>
                  {b.nome} <Barra fracao={b.fracao} cor={b.cor} />
                </span>
              ))}
            </div>
          </div>
        )}

        <div className={styles.palpiteTopo}>
          <label className={styles.peso} htmlFor={`${id}-peso`}>
            <span>
              Quanto pesa o tempo sem cair: <b>{pesoAtual ?? fmtMedia(peso)}</b>
            </span>
            <input
              id={`${id}-peso`}
              type="range"
              min={0}
              max={2}
              step={0.25}
              value={peso}
              onChange={(e) => onPeso(Number(e.target.value))}
              list={`${id}-marcas`}
              aria-valuetext={pesoAtual ?? `peso ${fmtMedia(peso)}`}
            />
            <datalist id={`${id}-marcas`}>
              {PESOS.map((p) => (
                <option key={p.v} value={p.v} label={p.nome} />
              ))}
            </datalist>
            <span className={styles.pesoMarcas} aria-hidden>
              {PESOS.map((p) => (
                <span key={p.v}>{p.nome}</span>
              ))}
            </span>
          </label>
        </div>

        <ol className={styles.palpite}>
          {linhas.map((l, i) => {
            const r = ritmo(l);
            return (
              <li key={l.tipo} data-topo={i < 3 || undefined}>
                <span className={styles.palpitePos}>{i + 1}º</span>
                <div className={styles.palpiteNome}>
                  <button type="button" className={styles.linkBotao} onClick={() => onAbrir(l.tipo)}>
                    {nome(l.tipo)}
                  </button>
                  <span className={styles.palpitePorque}>
                    caiu {l.vezes} {l.vezes === 1 ? "vez" : "vezes"} em {exames.length} ({fmtPct(l.fracao)}) ·{" "}
                    {l.desdeUltima === 0 ? "caiu no último exame" : `não cai há ${l.desdeUltima} ${l.desdeUltima === 1 ? "exame" : "exames"}`}
                    {l.vezes > 1 && ` · costuma voltar a cada ${fmtMedia(l.esperado)}`} <span className={styles.ritmo} data-ritmo={r.id}>{r.nome}</span>
                  </span>
                </div>
                <div className={styles.palpiteBarra}>
                  <Barra fracao={l.chance / (linhas[0]?.chance || 1)} cor={corDoGrupo(pecas[l.tipo])} rotulo={`Chance estimada de ${nome(l.tipo)}: ${fmtPct(l.chance)}`} />
                  <b>{l.chance < 0.01 ? "<1%" : fmtPct(l.chance)}</b>
                </div>
              </li>
            );
          })}
        </ol>

      </div>
    </>
  );
}
