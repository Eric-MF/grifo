"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { BarraLeitura } from "@/components/leis/BarraLeitura";
import { NOME_SUMULAS, type Tribunal } from "@/lib/leis/sumulas";
import { NOTA_CORTE } from "@/lib/correcao/grader";
import { agregar, maisErrados } from "@/lib/erros";
import { fmtNota, fmtTempo } from "@/lib/formato";
import { diaISO } from "@/lib/conquistas";
import {
  calendario,
  inicioDoPeriodo,
  pct,
  resumoSimulados,
  resumoTreino,
  sugerirSimulado,
  type Fracao,
  type ResumoTentativa,
} from "@/lib/estatisticas/desempenho";
import { fmtPct } from "@/lib/estatisticas/exames";
import { exameEmAlgarismos } from "@/lib/estatisticas/rotulos";
import type { DadosEstatisticas, ExameEstat } from "@/lib/estatisticas/tipos";
import { formatarMoedas, formatarXp } from "@/games/contadores";
import { CATEGORIAS } from "@/quiz/categorias";
import { acertosSeguidos, enderecoDaSessao, maximoDaChave, ordemDasChaves, rotuloDaChave } from "@/quiz/recordes";
import type { DadosPessoais } from "./dadosPessoais";
import { Barra, CalendarioEstudo, corDoGrupo, dicaDoExame, GraficoNotas, LinkArtigo, Numeral, resumoDoDia, type PontoNota } from "./Graficos";
import { Sorteio } from "./Sorteio";
import styles from "./estatisticas.module.css";

const PERIODOS: { dias: number | null; nome: string }[] = [
  { dias: 7, nome: "7 dias" },
  { dias: 30, nome: "30 dias" },
  { dias: 90, nome: "90 dias" },
  { dias: null, nome: "Tudo" },
];
type Serie = "total" | "peca" | "questoes";
const SERIES: { id: Serie; nome: string; maximo: number }[] = [
  { id: "total", nome: "Nota", maximo: 10 },
  { id: "peca", nome: "Peça (de 5)", maximo: 5 },
  { id: "questoes", nome: "Questões (de 5)", maximo: 5 },
];
type Mostrar = "todos" | "feitos" | "faltam";

const dataCurta = (ms: number) => new Date(ms).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
const umaCasa = (n: number) => n.toFixed(1).replace(".", ",");

/** "7 de 10 (70%)" de uma fração de pontos. */
const textoFracao = (f: Fracao) => `${fmtNota(f.o)} de ${fmtNota(f.v)} (${fmtPct(pct(f))})`;

export function AbaDesempenho({
  dados,
  pessoais,
  ocultar,
  visivel,
}: {
  dados: DadosEstatisticas;
  pessoais: DadosPessoais | null;
  ocultar: boolean;
  visivel: boolean;
}) {
  const [periodo, setPeriodo] = useState<number | null>(null);
  const [serie, setSerie] = useState<Serie>("total");
  const [mostrar, setMostrar] = useState<Mostrar>("todos");
  // a explicação da sugestão pode dizer a peça: só aparece com o clique (guarda o exame cuja explicação foi aberta)
  const [motivoDe, setMotivoDe] = useState<string | null>(null);
  const [sorteado, setSorteado] = useState<{ id: string; vez: number } | null>(null);

  if (!pessoais) return <p className="muted">Lendo os seus dados…</p>;

  const agora = pessoais.agora;
  const desde = inicioDoPeriodo(periodo, agora);
  const desdeDia = desde === null ? null : diaISO(new Date(desde));
  const tentativas = pessoais.tentativas.filter((t) => desde === null || t.quando >= desde);
  const sim = resumoSimulados(tentativas);
  const treino = resumoTreino(pessoais.atividade, desdeDia);
  const cal = calendario(pessoais.atividade, pessoais.tentativas, pessoais.eventos, new Date(agora), 26);
  const exames = dados.exames.filter((e) => e.noSite && e.corrigivel);
  const exPorId = new Map(dados.exames.map((e) => [e.id, e]));
  const nome = (t: string) => dados.pecas[t]?.nome ?? t;
  const feito = (e: ExameEstat) => pessoais.melhores.has(e.id);
  const sugestao = sugerirSimulado(dados.exames, pessoais.melhores, nome, !ocultar);
  // a epígrafe ou o começo do artigo, quando a tabela de pontos de algum exame o cita
  const resumoDe = (diploma: string, artigo: string) =>
    dados.artigos.find((x) => x.chave === (diploma.startsWith("sumulas-") ? `sumula:${diploma.slice(8)}:${artigo}` : `${diploma}:${artigo}`))?.resumo;
  const errados = maisErrados(agregar(pessoais.eventos, { janelaDias: periodo, agora }), "baixo").slice(0, 8);
  const lidas = dados.leis.filter((l) => (pessoais.leitura[l.id]?.n ?? 0) > 0);
  const jogos = pessoais.jogos.filter((j) => j.xp > 0 || j.recorde > 0 || j.moedas > 0);
  // os recordes do treino: de pontos em cada modo (o automático e o infinito primeiro) e a maior sequência de acertos
  const recordes = Object.entries(pessoais.recordesTreino.modos).sort(([a], [b]) => ordemDasChaves(a, b));
  const sequencia = pessoais.recordesTreino.sequencia;

  const nada =
    !pessoais.tentativas.length && !Object.keys(pessoais.atividade.dias).length && !pessoais.eventos.length && !lidas.length && !jogos.length && !recordes.length && !sequencia;
  if (nada)
    return (
      <div className={`card ${styles.vazio}`}>
        <h2>Ainda não há nada seu por aqui</h2>
        <p className="muted">
          Faça um simulado, treine questões ou jogue: as notas, os acertos e os artigos que você mais erra aparecem nesta aba. Tudo fica só neste navegador.
        </p>
        <div className={styles.vazioAcoes}>
          <Link className="btn btn-gold" href="/simulados/">
            Fazer um simulado
          </Link>
          <Link className="btn btn-ghost" href="/treino/">
            Treinar questões
          </Link>
          <Link className="btn btn-ghost" href="/jogos/">
            Jogar
          </Link>
        </div>
      </div>
    );

  const ordem = [...tentativas].sort((a, b) => a.quando - b.quando);
  const valorDa = (r: ResumoTentativa) => (serie === "total" ? r.total : serie === "peca" ? r.peca.o : r.questoes.reduce((s, q) => s + q.o, 0));
  const pontos: PontoNota[] = ordem.map((r) => {
    const e = exPorId.get(r.exameId);
    const v = valorDa(r);
    return {
      id: r.id,
      valor: v,
      aprovado: serie === "total" ? r.aprovado : undefined,
      rotulo: e?.numeral ?? r.exameId,
      descricao: `${e ? `${exameEmAlgarismos(e)} (${e.numeral})` : `Exame ${r.exameId}`}, ${dataCurta(r.quando)}: ${fmtNota(v)}${serie === "total" ? (r.aprovado ? " (aprovado)" : " (abaixo do corte)") : ""}`,
      href: `/simulados/${r.exameId}/resultado/?t=${r.id}`,
    };
  });
  const serieAtual = SERIES.find((s) => s.id === serie)!;
  const taxa = treino.a + treino.e ? treino.a / (treino.a + treino.e) : null;

  // cada peça: quantas vezes caiu na FGV, os seus simulados e o seu treino de "Peça e fundamento"
  const fgv = dados.exames.filter((e) => e.era === "fgv" && !e.variante);
  const tiposPeca = [...new Set([...fgv.map((e) => e.pecas[0]!), ...Object.keys(treino.porPeca)])].filter((t) => dados.pecas[t]);
  const linhasPeca = tiposPeca
    .map((t) => {
      const caiu = fgv.filter((e) => e.pecas[0] === t).length;
      const doTipo = tentativas.filter((r) => exPorId.get(r.exameId)?.pecas[0] === t);
      const p = treino.porPeca[t];
      return {
        tipo: t,
        caiu,
        simulados: doTipo.length,
        media: doTipo.length ? doTipo.reduce((s, r) => s + r.total, 0) / doTipo.length : null,
        peca: doTipo.length ? pct({ o: doTipo.reduce((s, r) => s + r.peca.o, 0), v: doTipo.reduce((s, r) => s + r.peca.v, 0) }) : null,
        treino: p,
      };
    })
    .sort((a, b) => b.caiu - a.caiu || a.tipo.localeCompare(b.tipo));

  const tiles = exames.filter((e) => (mostrar === "feitos" ? feito(e) : mostrar === "faltam" ? !feito(e) : true));
  const feitos = exames.filter(feito).length;

  return (
    <>
      <div className={`card ${styles.filtros}`}>
        <div className={styles.filtroLinha}>
          <span className={styles.rotuloFiltro} id="rot-periodo-d">
            Período
          </span>
          <div className={styles.segmentado} role="group" aria-labelledby="rot-periodo-d">
            {PERIODOS.map((p) => (
              <button key={p.nome} type="button" aria-pressed={periodo === p.dias} onClick={() => setPeriodo(p.dias)}>
                {p.nome}
              </button>
            ))}
          </div>
        </div>
        <p className={styles.resumoFiltro}>
          Os dados ficam só neste navegador: em outro aparelho, eles não aparecem. Os simulados guardam as 30 tentativas mais recentes.
        </p>
      </div>

      <div className={styles.kpis}>
        <div className={styles.kpi}>
          <span className={styles.kpiRotulo}>Simulados</span>
          <strong className={styles.kpiValor}>{sim.n}</strong>
          <span className={styles.kpiSub}>
            {sim.n ? `${sim.aprovados} com nota de aprovação (${fmtNota(NOTA_CORTE)} ou mais)` : "nenhum no período"}
          </span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiRotulo}>Média</span>
          <strong className={styles.kpiValor} data-estado={sim.media === null ? undefined : sim.media >= NOTA_CORTE ? "ok" : "bad"}>
            {sim.media === null ? "—" : fmtNota(sim.media)}
          </strong>
          <span className={styles.kpiSub}>
            {sim.tendencia === null
              ? sim.melhor
                ? (() => {
                    const e = exPorId.get(sim.melhor.exameId);
                    return (
                      <>
                        melhor: {fmtNota(sim.melhor.total)} no {e ? <Numeral e={e} /> : sim.melhor.exameId}
                      </>
                    );
                  })()
                : ""
              : `${sim.tendencia >= 0 ? "▲" : "▼"} ${fmtNota(Math.abs(sim.tendencia))} nos 3 últimos, contra os anteriores`}
          </span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiRotulo}>Treino e jogos</span>
          <strong className={styles.kpiValor}>{taxa === null ? "—" : fmtPct(taxa)}</strong>
          <span className={styles.kpiSub}>
            {taxa === null
              ? "nenhuma resposta no período"
              : `de acerto em ${(treino.a + treino.e).toLocaleString("pt-BR")} respostas${treino.tempoMedioMs ? ` · ${umaCasa(treino.tempoMedioMs / 1000)} s por resposta` : ""}`}
          </span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiRotulo}>Dias de estudo</span>
          <strong className={styles.kpiValor}>{cal.sequenciaAtual}</strong>
          <span className={styles.kpiSub}>
            {cal.sequenciaAtual === 1 ? "dia seguido" : "dias seguidos"} · recorde: {cal.maiorSequencia} · {cal.diasAtivos} nas últimas 26 semanas
          </span>
        </div>
      </div>

      <section className={styles.secao} aria-labelledby="t-notas">
        <div className={styles.secaoTopo}>
          <h2 id="t-notas">Suas notas nos simulados</h2>
          {ordem.length > 0 && (
            <div className={styles.segmentado} role="group" aria-label="O que o gráfico mostra">
              {SERIES.map((s) => (
                <button key={s.id} type="button" aria-pressed={serie === s.id} onClick={() => setSerie(s.id)}>
                  {s.nome}
                </button>
              ))}
            </div>
          )}
        </div>
        {ordem.length === 0 ? (
          <p className="muted">
            Nenhum simulado no período. <Link href="/simulados/">Fazer um simulado →</Link>
          </p>
        ) : (
          <>
            {visivel && (
              <div className="card">
                <GraficoNotas
                  pontos={pontos}
                  maximo={serieAtual.maximo}
                  corte={serie === "total" ? NOTA_CORTE : undefined}
                  legenda={`${serieAtual.nome} em cada simulado, do mais antigo ao mais recente: ${pontos.map((p) => `${p.rotulo} ${fmtNota(p.valor)}`).join(", ")}`}
                />
              </div>
            )}
            <div className={styles.tabelaRolagem}>
              <table className={styles.tabela}>
                <thead>
                  <tr>
                    <th scope="col">Data</th>
                    <th scope="col">Exame</th>
                    <th scope="col" className={styles.num2}>Nota</th>
                    <th scope="col" className={styles.num2}>Peça</th>
                    <th scope="col" className={styles.num2}>Questões</th>
                    <th scope="col" className={styles.num2}>Tempo</th>
                    <th scope="col">
                      <span className="sr-only">Correção</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...ordem].reverse().map((r) => {
                    const e = exPorId.get(r.exameId);
                    return (
                      <tr key={r.id}>
                        <td>{dataCurta(r.quando)}</td>
                        <td>{e ? <Numeral e={e}>{e.titulo}</Numeral> : r.exameId}</td>
                        <td className={styles.num2} data-estado={r.aprovado ? "ok" : "bad"}>
                          <b>{fmtNota(r.total)}</b> <span aria-hidden>{r.aprovado ? "✓" : "✗"}</span>
                          <span className="sr-only">{r.aprovado ? "aprovado" : "abaixo do corte"}</span>
                        </td>
                        <td className={styles.num2}>
                          {fmtNota(r.peca.o)}
                          {r.pecaZerada && <span className={styles.aviso} title="Peça inadequada: a nota da peça foi zerada"> ⚠</span>}
                        </td>
                        <td className={styles.num2}>{fmtNota(r.questoes.reduce((s, q) => s + q.o, 0))}</td>
                        <td className={styles.num2}>{r.duracaoSeg ? fmtTempo(r.duracaoSeg) : "—"}</td>
                        <td>
                          <Link href={`/simulados/${r.exameId}/resultado/?t=${r.id}`}>Ver a correção</Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className={styles.secao} aria-labelledby="t-calendario">
        <h2 id="t-calendario">Calendário de estudo</h2>
        <p className="muted">
          Cada quadrado é um dia: quanto mais forte, mais respostas e simulados. Passe o mouse (ou segure o dedo) num dia para ver a data; toque para ver o que
          você fez. {cal.diasAtivos} {cal.diasAtivos === 1 ? "dia" : "dias"} com estudo nas últimas 26 semanas.
        </p>
        <div className={`card ${styles.calendarioCaixa}`}>
          <CalendarioEstudo
            cal={cal}
            detalhe={(d) => {
              if (d.futuro) return <p className="muted">Este dia ainda não chegou.</p>;
              const sims = d.tentativas.map((id) => pessoais.tentativas.find((t) => t.id === id)).filter((t): t is ResumoTentativa => !!t);
              if (!d.respostas && !sims.length)
                return (
                  <p className="muted">
                    Nenhum estudo neste dia. <Link href="/treino/">Treinar agora →</Link>
                  </p>
                );
              return (
                <>
                  <p>{resumoDoDia(d)}.</p>
                  {d.respostas > 0 && (
                    <span className={styles.treinoCelula}>
                      <Barra fracao={d.acertos / d.respostas} cor="var(--ok)" fina rotulo={`${d.acertos} certas em ${d.respostas}`} />
                      {fmtPct(d.acertos / d.respostas)} de acerto no treino e nos jogos
                    </span>
                  )}
                  {sims.length > 0 && (
                    <ul className={styles.calSimulados}>
                      {sims.map((t) => {
                        const e = exPorId.get(t.exameId);
                        return (
                          <li key={t.id}>
                            {e ? <Numeral e={e}>{e.titulo}</Numeral> : t.exameId}:{" "}
                            <b data-estado={t.aprovado ? "ok" : "bad"}>{fmtNota(t.total)}</b> ·{" "}
                            <Link href={`/simulados/${t.exameId}/resultado/?t=${t.id}`}>ver a correção</Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </>
              );
            }}
          />
        </div>
      </section>

      <section className={styles.secao} aria-labelledby="t-mapa">
        <div className={styles.secaoTopo}>
          <h2 id="t-mapa">Seus simulados, exame a exame</h2>
          <div className={styles.segmentado} role="group" aria-label="Quais exames mostrar">
            {(
              [
                ["todos", "Todos"],
                ["feitos", "Feitos"],
                ["faltam", "Por fazer"],
              ] as [Mostrar, string][]
            ).map(([id, n]) => (
              <button key={id} type="button" aria-pressed={mostrar === id} onClick={() => setMostrar(id)}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <p className="muted">
          Você fez {feitos} de {exames.length} simulados (a melhor nota de cada um, em qualquer época). Toque num exame para ver a correção ou fazer o simulado.
        </p>
        {sugestao && (
          <div className={styles.sugestao}>
            <span className={styles.sugestaoRotulo}>Próximo simulado sugerido</span>
            <p>
              <strong>
                <Numeral e={sugestao.exame}>{sugestao.exame.titulo}</Numeral>
              </strong>
              {sugestao.exame.ano ? ` (${sugestao.exame.ano})` : ""}.
            </p>
            {motivoDe === sugestao.exame.id ? (
              <p className={styles.sugestaoMotivo}>
                {sugestao.motivo}{" "}
                <button type="button" className={styles.linkBotao} onClick={() => setMotivoDe(null)}>
                  Esconder
                </button>
              </p>
            ) : (
              <p className={styles.sugestaoMotivo}>
                <button type="button" className={styles.linkBotao} onClick={() => setMotivoDe(sugestao.exame.id)} aria-describedby="aviso-motivo">
                  Por que este exame?
                </button>{" "}
                <span id="aviso-motivo" className="muted">
                  {ocultar
                    ? "A explicação não diz a peça."
                    : "Atenção: a explicação diz qual é a peça deste exame. Se quer fazer o simulado sem saber, não abra."}
                </span>
              </p>
            )}
            <Link className="btn btn-gold btn-sm" href={sugestao.exame.links.simulado ?? "/simulados/"}>
              Fazer o simulado
            </Link>
          </div>
        )}
        <Sorteio exames={exames} melhores={pessoais.melhores} pecas={dados.pecas} onSorteado={(id) => setSorteado((x) => ({ id, vez: (x?.vez ?? 0) + 1 }))} />
        <ul className={styles.mapa}>
          {tiles.map((e) => {
            const m = pessoais.melhores.get(e.id);
            const titulo = `${exameEmAlgarismos(e)} (${e.titulo})${e.ano ? `, ${e.ano}` : ""}`;
            return (
              <li key={sorteado?.id === e.id ? `${e.id}-${sorteado.vez}` : e.id}>
                <Link
                  href={m ? `/simulados/${e.id}/resultado/?t=${m.id}` : (e.links.simulado ?? "/simulados/")}
                  className={styles.tile}
                  data-alvo={sorteado?.id === e.id || undefined}
                  data-estado={m ? (m.aprovado ? "ok" : "bad") : undefined}
                  aria-label={m ? `${titulo}: sua melhor nota, ${fmtNota(m.total)}. Ver a correção` : `${titulo}: ainda não feito. Fazer o simulado`}
                  {...dicaDoExame(e, m ? `Sua melhor nota: ${fmtNota(m.total)}${m.vezes > 1 ? ` (em ${m.vezes} tentativas)` : ""}` : "Ainda não feito")}
                >
                  <span className={styles.tileNum}>
                    {e.numeral}
                    {e.variante ? <small> {e.variante}</small> : null}
                  </span>
                  <span className={styles.tileNota}>{m ? fmtNota(m.total) : "fazer"}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className={styles.secao} aria-labelledby="t-por-peca">
        <h2 id="t-por-peca">Peça por peça</h2>
        <p className="muted">
          Quantas vezes cada peça caiu na FGV, a sua média nos simulados dela e os acertos em &quot;Peça e fundamento&quot; no treino e nos jogos
          {periodo ? ", no período" : ""}.
        </p>
        <div className={styles.tabelaRolagem}>
          <table className={styles.tabela}>
            <thead>
              <tr>
                <th scope="col">Peça</th>
                <th scope="col" className={styles.num2}>Caiu na FGV</th>
                <th scope="col" className={styles.num2}>Seus simulados</th>
                <th scope="col" className={styles.num2}>Média</th>
                <th scope="col" className={styles.num2}>Nota da peça</th>
                <th scope="col">Treino: acertos</th>
              </tr>
            </thead>
            <tbody>
              {linhasPeca.map((l) => {
                const t = l.treino;
                const n = t ? t[0] + t[1] : 0;
                return (
                  <tr key={l.tipo}>
                    <th scope="row">
                      <span className={styles.pontoGrupo} style={{ "--cor": corDoGrupo(dados.pecas[l.tipo]) } as CSSProperties} aria-hidden />
                      {nome(l.tipo)}
                    </th>
                    <td className={styles.num2}>{l.caiu || "—"}</td>
                    <td className={styles.num2}>{l.simulados || "—"}</td>
                    <td className={styles.num2} data-estado={l.media === null ? undefined : l.media >= NOTA_CORTE ? "ok" : "bad"}>
                      {l.media === null ? "—" : fmtNota(l.media)}
                    </td>
                    <td className={styles.num2}>{l.peca === null ? "—" : fmtPct(l.peca)}</td>
                    <td>
                      {n ? (
                        <span className={styles.treinoCelula}>
                          <Barra fracao={t![0] / n} cor="var(--ok)" fina rotulo={`${t![0]} acertos em ${n}`} />
                          {t![0]}/{n}
                        </span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.secao} aria-labelledby="t-treino">
        <h2 id="t-treino">Treino e jogos</h2>
        <div className={styles.duasColunas}>
          <div className="card">
            <h3>Por tipo de pergunta</h3>
            {treino.a + treino.e === 0 ? (
              <p className="muted">
                Nenhuma resposta {periodo ? "no período" : "ainda"}. A contagem começou com esta página: as respostas de antes não entram. <Link href="/treino/">Treinar →</Link>
              </p>
            ) : (
              <ul className={styles.barrasLista}>
                {CATEGORIAS.map((c) => {
                  const p = treino.porCategoria[c.id];
                  const n = p ? p[0] + p[1] : 0;
                  return (
                    <li key={c.id}>
                      <span>{c.nome}</span>
                      <Barra fracao={n ? p![0] / n : 0} cor="var(--ok)" />
                      <span className={styles.barraValor}>{n ? `${fmtPct(p![0] / n)} · ${p![0]}/${n}` : "—"}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="card">
            <h3>Recordes</h3>
            {recordes.length === 0 && !sequencia && jogos.length === 0 ? (
              <p className="muted">
                Nenhum recorde ainda. <Link href="/treino/">Treinar →</Link>
              </p>
            ) : (
              <dl className={styles.recordes}>
                {recordes.map(([k, r]) => {
                  const maximo = maximoDaChave(k);
                  return (
                    <div key={k}>
                      <dt>Treino · {rotuloDaChave(k)}</dt>
                      <dd>
                        {r.pontos.toLocaleString("pt-BR")} {maximo ? `de ${maximo.toLocaleString("pt-BR")} pontos` : "pontos"}
                        {r.questoes ? ` · ${r.acertos ?? 0} de ${r.questoes} acertos` : ""}
                        {r.quando ? ` · ${dataCurta(r.quando)}` : ""}
                        {r.sessao && (
                          <>
                            {" · "}
                            <Link href={enderecoDaSessao(r.sessao)}>Ver a página final</Link>
                          </>
                        )}
                      </dd>
                    </div>
                  );
                })}
                {sequencia && (
                  <div>
                    <dt>Treino · maior sequência de acertos</dt>
                    <dd>
                      {acertosSeguidos(sequencia.seguidos)} · {rotuloDaChave(sequencia.chave)} · {dataCurta(sequencia.quando)}
                      {sequencia.sessao && (
                        <>
                          {" · "}
                          <Link href={enderecoDaSessao(sequencia.sessao)}>Ver a página final</Link>
                        </>
                      )}
                    </dd>
                  </div>
                )}
                {jogos.map((j) => (
                  <div key={j.slug}>
                    <dt>
                      <Link href={`/jogos/${j.slug}/`}>{j.titulo}</Link>
                    </dt>
                    <dd>
                      recorde de {j.recorde.toLocaleString("pt-BR")} pontos · {formatarXp(j.xp)} · {formatarMoedas(j.moedas)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      </section>

      {sim.n > 0 && (
        <section className={styles.secao} aria-labelledby="t-pontos">
          <h2 id="t-pontos">Onde você ganha e perde pontos</h2>
          <p className="muted">A soma dos simulados do período: quanto dos pontos possíveis você levou em cada parte.</p>
          <div className={styles.duasColunas}>
            <div className="card">
              <h3>Por parte da prova</h3>
              <ul className={styles.barrasLista}>
                <LinhaFracao nome="Peça" f={sim.peca} />
                {sim.porQuestao.map((f, i) => (
                  <LinhaFracao key={i} nome={`Questão ${i + 1}`} f={f} />
                ))}
              </ul>
            </div>
            <div className="card">
              <h3>Dentro da peça</h3>
              <ul className={styles.barrasLista}>
                {sim.secoes.map((s) => (
                  <LinhaFracao key={s.id} nome={s.nome} f={s.f} />
                ))}
              </ul>
              {(() => {
                const pior = [...sim.secoes].filter((s) => s.f.v >= 0.5).sort((a, b) => pct(a.f) - pct(b.f))[0];
                return pior && pct(pior.f) < 0.75 ? (
                  <p className={styles.dica}>
                    O ponto mais fraco: <b>{pior.nome.toLowerCase()}</b>, com {fmtPct(pct(pior.f))} dos pontos.
                  </p>
                ) : null;
              })()}
            </div>
          </div>
        </section>
      )}

      <section className={styles.secao} aria-labelledby="t-erros">
        <div className={styles.secaoTopo}>
          <h2 id="t-erros">Os artigos que você mais erra</h2>
          <Link className="btn btn-ghost btn-sm" href="/leis/minha-leitura/">
            Abrir a Minha leitura →
          </Link>
        </div>
        {errados.length === 0 ? (
          <p className="muted">Nenhum erro em artigo {periodo ? "no período" : "ainda"}.</p>
        ) : (
          <ol className={styles.artigos}>
            {errados.map((a, i) => {
              const lei = dados.leis.find((l) => l.id === a.diploma);
              const rotulo = a.diploma.startsWith("sumulas-") ? `Súmula ${a.artigo}` : `Art. ${a.artigo.toUpperCase()}`;
              const sumula = a.diploma.startsWith("sumulas-");
              const href = lei ? `/leis/${a.diploma}/#art${a.artigo}` : sumula ? `/leis/sumulas/${a.diploma.slice(8)}/#s-${a.artigo}` : undefined;
              const previa = lei || sumula ? { lei: a.diploma, art: sumula ? `s-${a.artigo}` : `art${a.artigo}` } : undefined;
              return (
                <li key={`${a.diploma}:${a.artigo}`} className={styles.artigo}>
                  <span className={styles.artigoPos}>{i + 1}</span>
                  <div className={styles.artigoTexto}>
                    {href ? (
                      <LinkArtigo href={href} previa={previa} className={styles.artigoNome}>
                        {rotulo}
                      </LinkArtigo>
                    ) : (
                      <span className={styles.artigoNome}>{rotulo}</span>
                    )}
                    <span className={styles.artigoResumo}>
                      {lei?.nome ?? (a.diploma.startsWith("sumulas-") ? NOME_SUMULAS(a.diploma.slice(8) as Tribunal) : a.diploma.toUpperCase())}
                      {resumoDe(a.diploma, a.artigo) && ` · ${resumoDe(a.diploma, a.artigo)}`}
                    </span>
                  </div>
                  <div className={styles.artigoBarra}>
                    <Barra fracao={a.erros / (a.erros + a.acertos)} cor="var(--bad)" rotulo={`${a.erros} erros em ${a.erros + a.acertos} respostas`} />
                    <span className={styles.barraValor} data-nivel={a.nivel ?? undefined}>
                      {a.erros} {a.erros === 1 ? "erro" : "erros"} · {a.acertos} {a.acertos === 1 ? "acerto" : "acertos"}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section className={styles.secao} aria-labelledby="t-leitura">
        <h2 id="t-leitura">Leitura das leis</h2>
        {lidas.length === 0 ? (
          <p className="muted">
            Você ainda não começou a ler nenhuma lei no Vade Mecum. <Link href="/leis/">Abrir o Vade Mecum →</Link>
          </p>
        ) : (
          <ul className={styles.leituras}>
            {lidas.map((l) => (
              <li key={l.id} className="card">
                <Link href={`/leis/${l.id}/`}>{l.nome}</Link>
                <BarraLeitura n={pessoais.leitura[l.id]!.n} total={l.unidades} cor={l.cor} rotulo={pessoais.leitura[l.id]!.rotulo} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function LinhaFracao({ nome, f }: { nome: string; f: Fracao }) {
  const p = pct(f);
  return (
    <li>
      <span>{nome}</span>
      <Barra fracao={p} rotulo={`${nome}: ${textoFracao(f)}`} />
      <span className={styles.barraValor} data-estado={p >= 0.6 ? "ok" : p < 0.4 ? "bad" : undefined}>
        {fmtPct(p)}
      </span>
    </li>
  );
}
