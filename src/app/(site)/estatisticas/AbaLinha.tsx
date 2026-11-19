"use client";

// A linha do tempo: o panorama (o eixo dos anos com as faixas das bancas, um traço por prova na cor da peça e os marcos
// numerados) e, embaixo, a história de cada marco, com os exames daquele período.
import Link from "next/link";
import { useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { espalhar, examesDosMarcos, faixasDasEras } from "@/lib/estatisticas/linha";
import { dataDoExame, exameEmAlgarismos } from "@/lib/estatisticas/rotulos";
import { ERAS, nomeEra, type DadosEstatisticas, type Era, type ExameEstat, type MarcoLinha } from "@/lib/estatisticas/tipos";
import { corDoGrupo, dicaDoExame, useLargura } from "./Graficos";
import styles from "./estatisticas.module.css";

/** A distância mínima entre dois marcadores, em px (o marcador tem 26 px). */
const ENTRE_MARCADORES = 30;
/** o nome curto da banca, para a faixa estreita */
const CURTOS: Record<Era, string> = { vunesp: "VUNESP", "vunesp-cespe": "V/C", cespe: "CESPE", fgv: "FGV" };

export function AbaLinha({ dados, oculto }: { dados: DadosEstatisticas; oculto: (e: ExameEstat) => boolean }) {
  const nome = (t: string) => dados.pecas[t]?.nome ?? t;
  const ultimo = [...dados.exames].filter((e) => e.noSite && !e.variante && e.quando !== null).sort((a, b) => b.quando! - a.quando!)[0];
  const fgv = dados.exames.filter((e) => e.era === "fgv" && !e.variante);
  const hoje: MarcoLinha | null = ultimo
    ? {
        quando: ultimo.ano ? String(ultimo.ano) : "Hoje",
        de: ultimo.quando!,
        ate: null,
        rotulo: "Hoje",
        era: "fgv",
        titulo: `O ${ultimo.titulo}`,
        texto: `A 2ª fase mais recente no Grifo é a do ${ultimo.titulo} (o ${exameEmAlgarismos(ultimo)})${ultimo.data ? `, aplicada em ${dataDoExame(ultimo)}` : ""}. Desde o II Exame, a FGV aplicou ${fgv.length} provas de Penal, com ${new Set(fgv.flatMap((e) => e.pecas)).size} peças diferentes.`,
        destaque: oculto(ultimo) ? undefined : `Peça: ${ultimo.pecas.map(nome).join(", ")}`,
        exame: { id: ultimo.id, titulo: ultimo.titulo, href: ultimo.links.simulado ?? ultimo.links.prova ?? "/provas/" },
      }
    : null;
  const marcos = hoje ? [...dados.linha, hoje] : dados.linha;
  const doMarco = examesDosMarcos(marcos, dados.exames);

  // o eixo: do primeiro ano com exame até o fim do ano do último
  const comData = dados.exames.filter((e) => e.quando !== null);
  const inicio = Math.floor(Math.min(...comData.map((e) => e.quando!), ...marcos.map((m) => m.de)));
  const fim = Math.floor(Math.max(...comData.map((e) => e.quando!))) + 1;
  const pos = (t: number) => ((t - inicio) / (fim - inicio)) * 100;
  const faixas = faixasDasEras(dados.exames, fim);
  const anos = Array.from({ length: fim - inicio + 1 }, (_, i) => inicio + i);

  const [ref, largura] = useLargura<HTMLDivElement>();
  const reais = marcos.map((m) => (pos(m.de) / 100) * largura);
  const espalhados = largura ? espalhar(reais, ENTRE_MARCADORES, 13, largura - 13) : reais;
  const [atual, setAtual] = useState<number | null>(null);
  const botoes = useRef<(HTMLButtonElement | null)[]>([]);
  const cartoes = useRef<(HTMLLIElement | null)[]>([]);

  const ir = (i: number, focar = false) => {
    const j = Math.max(0, Math.min(marcos.length - 1, i));
    setAtual(j);
    if (focar) botoes.current[j]?.focus();
    const reduzido = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    cartoes.current[j]?.scrollIntoView({ behavior: reduzido ? "auto" : "smooth", block: "nearest" });
  };
  const teclas = (e: KeyboardEvent) => {
    const i = atual ?? -1;
    const prox = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? marcos.length - 1 : null;
    if (prox === null) return;
    e.preventDefault();
    ir(prox, true);
  };
  const porEra = ERAS.map((e) => ({ ...e, n: dados.exames.filter((x) => x.era === e.id && !x.variante).length })).reverse();
  const maior = Math.max(...porEra.map((e) => e.n));
  const corDoExame = (e: ExameEstat) =>
    oculto(e) ? undefined : `linear-gradient(${[...new Set(e.pecas)].map((t, k, l) => `${corDoGrupo(dados.pecas[t])} ${(k / l.length) * 100}% ${((k + 1) / l.length) * 100}%`).join(", ")})`;
  const pecasDe = (e: ExameEstat) => (oculto(e) ? "peça oculta" : [...new Set(e.pecas)].map(nome).join(", "));

  return (
    <>
      <section className={styles.secao} aria-labelledby="t-linha">
        <h2 id="t-linha">Da prova de cada estado ao Exame Unificado</h2>
        <p className="muted">
          De {inicio} a {fim - 1}, cada traço é uma prova de Penal, na cor da peça, e as faixas são as bancas. Os números são os marcos da história, contados
          embaixo: toque num deles para ir até ele. Passe o mouse num traço (ou segure o dedo e deslize) para ver o exame.
        </p>
        <div className={`card ${styles.panorama}`}>
          <div className={styles.panoramaEixo} ref={ref} style={{ "--anos": fim - inicio } as CSSProperties}>
            {largura > 0 && (
              <svg className={styles.panoramaLigacoes} width={largura} height={34} aria-hidden>
                {marcos.map((m, i) => {
                  const x0 = (pos(m.de) / 100) * largura;
                  const x1 = m.ate !== null ? (pos(m.ate) / 100) * largura : x0;
                  return (
                    <g key={m.rotulo} data-era={i === marcos.length - 1 && hoje ? "hoje" : m.era} data-atual={atual === i || undefined}>
                      <path d={`M${espalhados[i]!.toFixed(1)},0 L${x0.toFixed(1)},26`} />
                      {x1 - x0 > 2 && <path d={`M${x0.toFixed(1)},30 L${x0.toFixed(1)},26 L${x1.toFixed(1)},26 L${x1.toFixed(1)},30`} />}
                    </g>
                  );
                })}
              </svg>
            )}
            <ol className={styles.marcadores} onKeyDown={teclas} aria-label="Os marcos da história">
              {marcos.map((m, i) => (
                <li key={m.rotulo} style={{ left: largura ? `${espalhados[i]}px` : `${pos(m.de)}%` }} data-era={i === marcos.length - 1 && hoje ? "hoje" : m.era}>
                  <button
                    ref={(el) => {
                      botoes.current[i] = el;
                    }}
                    type="button"
                    aria-current={atual === i ? "step" : undefined}
                    tabIndex={(atual ?? 0) === i ? 0 : -1}
                    onClick={() => ir(i)}
                    aria-label={`Marco ${i + 1}: ${m.rotulo}, ${m.quando}`}
                    data-dica={m.rotulo}
                    data-dica-mais={`${m.quando} · ${i === marcos.length - 1 && hoje ? "hoje" : nomeEra(m.era)}`}
                  >
                    {i + 1}
                  </button>
                </li>
              ))}
            </ol>
            <div className={styles.faixas} aria-hidden>
              {faixas.map((f) => (
                <span key={`${f.era}${f.de}`} data-era={f.era} style={{ left: `${pos(f.de)}%`, width: `${pos(f.ate) - pos(f.de)}%` }} data-dica={nomeEra(f.era)} data-dica-mais={`${f.exames} ${f.exames === 1 ? "prova" : "provas"} de Penal`}>
                  {/* o nome que cabe na faixa: o inteiro, o curto ou nenhum (fica a dica) */}
                  {(() => {
                    const px = ((pos(f.ate) - pos(f.de)) / 100) * largura;
                    const nomes = [nomeEra(f.era).toUpperCase(), CURTOS[f.era]];
                    const cabe = nomes.find((n) => px >= n.length * 7.5 + 14);
                    return cabe ? <span>{cabe}</span> : null;
                  })()}
                </span>
              ))}
            </div>
            <div className={styles.tracos} role="img" aria-label={`${comData.length} provas de Penal, de ${inicio} a ${fim - 1}`}>
              {comData.map((e) => {
                const estilo = { left: `${pos(e.quando!)}%`, background: corDoExame(e) } as CSSProperties;
                const d = dicaDoExame(e, pecasDe(e));
                return e.links.prova ? (
                  <a key={e.id} href={e.links.prova} tabIndex={-1} style={estilo} data-oculto={oculto(e) || undefined} data-variante={e.variante ? "" : undefined} {...d} />
                ) : (
                  <span key={e.id} style={estilo} {...d} />
                );
              })}
            </div>
            <div className={styles.anos} aria-hidden>
              {anos.map((a) => (
                <span key={a} style={{ left: `${pos(a)}%` }} data-par={(a - inicio) % 2 === 0 || undefined} data-quatro={(a - inicio) % 4 === 0 || undefined}>
                  {a}
                </span>
              ))}
            </div>
          </div>
          <ul className={styles.legendaEras} aria-label="As bancas">
            {ERAS.slice()
              .reverse()
              .map((e) => (
                <li key={e.id} data-era={e.id}>
                  {e.nome}
                </li>
              ))}
          </ul>
        </div>

        <ol className={styles.historia}>
          {marcos.map((m, i) => {
            const ehHoje = hoje !== null && i === marcos.length - 1;
            const exames = doMarco[i] ?? [];
            return (
              <li
                key={m.rotulo}
                ref={(el) => {
                  cartoes.current[i] = el;
                }}
                className={styles.capitulo}
                data-era={ehHoje ? "hoje" : m.era}
                data-atual={atual === i || undefined}
              >
                <button type="button" className={styles.capituloNum} onClick={() => ir(i)} aria-label={`Marco ${i + 1}: mostrar no eixo`}>
                  {i + 1}
                </button>
                <article className={styles.capituloCorpo}>
                  <span className={styles.marcoEra}>
                    {m.quando} · {ehHoje ? "hoje" : nomeEra(m.era)}
                  </span>
                  <h3>{m.titulo}</h3>
                  <p>{m.texto}</p>
                  {(m.destaque || m.exame) && (
                    <p className={styles.marcoDestaque}>
                      {m.destaque && <span>{m.destaque}</span>}
                      {m.exame && (
                        <Link href={m.exame.href}>
                          {m.exame.href.startsWith("/simulados/") ? `Fazer o simulado do ${m.exame.titulo}` : `Ver a prova do ${m.exame.titulo}`} →
                        </Link>
                      )}
                    </p>
                  )}
                  {exames.length > 0 && (
                    <div className={styles.capituloExames}>
                      <span className={styles.rotuloFiltro}>
                        {exames.length} {exames.length === 1 ? "prova" : "provas"} de Penal no período
                      </span>
                      <ul>
                        {exames.map((e) => {
                          const d = dicaDoExame(e, pecasDe(e));
                          const conteudo = [...new Set(e.pecas)].map((t) => <span key={t} style={{ "--cor": oculto(e) ? undefined : corDoGrupo(dados.pecas[t]) } as CSSProperties} />);
                          return (
                            <li key={e.id}>
                              {e.links.prova ? (
                                <Link href={e.links.prova} aria-label={`${e.titulo}: ${pecasDe(e)}. Ver a prova`} data-oculto={oculto(e) || undefined} {...d}>
                                  {conteudo}
                                </Link>
                              ) : (
                                <span role="img" aria-label={`${e.titulo}: ${pecasDe(e)}`} {...d}>
                                  {conteudo}
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </article>
              </li>
            );
          })}
        </ol>
      </section>

      <section className={styles.secao} aria-labelledby="t-bancas">
        <h2 id="t-bancas">Quantas provas cada banca aplicou</h2>
        <p className="muted">Os exames da aba &quot;Exames anteriores&quot;, sem as reaplicações regionais do XX e do XXV.</p>
        <ul className={`card ${styles.bancas}`}>
          {porEra.map((e) => (
            <li key={e.id} data-era={e.id}>
              <span className={styles.bancaNome}>
                <strong>{e.nome}</strong>
                <span className="muted">{e.desc}</span>
              </span>
              <span className={styles.bancaBarra} aria-hidden>
                <span style={{ width: `${(e.n / maior) * 100}%` }} />
              </span>
              <span className={styles.bancaNum}>
                {e.n} {e.n === 1 ? "prova" : "provas"}
              </span>
            </li>
          ))}
        </ul>
        <p className="muted">
          Os exames da OAB/SP (110º a 140º) vêm do levantamento histórico do Grifo e não têm prova no site; os dados podem variar quando um exame trazia mais de
          uma peça. Os anos do 110º ao 124º (marcados com ≈) são estimados pela sequência de três exames por ano; os outros vêm de notícias da época.
        </p>
      </section>
    </>
  );
}
