"use client";

import { fmtNota } from "@/lib/formato";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnswerSheet } from "@/components/AnswerSheet";
import { PromoSlot } from "@/components/PromoSlot";
import { RichText } from "@/components/RichText";
import { contextoCorrecao } from "@/lib/correcao/cliente";
import { contarLinhas, corrigirExame } from "@/lib/correcao/grader";
import { eventosDoSimulado, migrarTentativas, registrar as registrarErros } from "@/lib/erros";
import type { ExameSimulado } from "@/lib/correcao/simulado";
import { gravarJSON, lerJSON } from "@/lib/storage";
import { apagarRascunho, lerRascunho, salvarRascunho, salvarTentativa } from "@/lib/tentativas";
import styles from "./simulador.module.css";

const DURACAO = 5 * 60 * 60; // 5 horas, como na prova
type Aba = "peca" | `q${number}`;
type Layout = "lado" | "empilhado";

// Enunciado e folha só mudam quando o texto muda: o cronômetro re-renderiza o resto a cada 500 ms.
const EnunciadoMemo = memo(RichText);
const FolhaMemo = memo(AnswerSheet);

function valorDe(a: Aba, peca: string, questoes: string[]) {
  return a === "peca" ? peca : questoes[Number(a.slice(1)) - 1] ?? "";
}

function fmtTempo(seg: number) {
  const s = Math.max(0, Math.floor(seg));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export function Simulador({ exame }: { exame: ExameSimulado }) {
  const router = useRouter();
  const [fase, setFase] = useState<"inicio" | "prova">("inicio");
  const [temRascunho, setTemRascunho] = useState(false);
  const [comTempo, setComTempo] = useState(true);
  const [aba, setAba] = useState<Aba>("peca");
  const [peca, setPeca] = useState("");
  const [questoes, setQuestoes] = useState<string[]>(() => exame.questoes.map(() => ""));
  const [decorrido, setDecorrido] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [pausas, setPausas] = useState(0);
  const [confirmar, setConfirmar] = useState(false);
  const [layout, setLayout] = useState<Layout>("lado");
  const [foco, setFoco] = useState(false);
  const tick = useRef<number | null>(null);

  // Preferências de layout lembradas
  useEffect(() => {
    const p = lerJSON<{ layout?: Layout }>("grifo:simulador", {});
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lê localStorage após montar (site estático)
    if (p.layout) setLayout(p.layout);
    setTemRascunho(!!lerRascunho(exame.id));
  }, [exame.id]);
  useEffect(() => {
    gravarJSON("grifo:simulador", { layout });
  }, [layout]);

  // Modo foco: esconde cabeçalho e rodapé do site
  useEffect(() => {
    document.body.toggleAttribute("data-foco", foco && fase === "prova");
    return () => document.body.removeAttribute("data-foco");
  }, [foco, fase]);

  const esgotado = comTempo && decorrido >= DURACAO;

  // Cronômetro
  useEffect(() => {
    if (fase !== "prova" || pausado || esgotado) return;
    const inicio = performance.now() - decorrido * 1000;
    tick.current = window.setInterval(() => setDecorrido((performance.now() - inicio) / 1000), 500);
    return () => {
      if (tick.current) window.clearInterval(tick.current);
    };
    // decorrido é lido só na (re)partida do cronômetro
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase, pausado, esgotado]);

  // Autosave. O cronômetro muda `decorrido` a cada 500 ms: se ele estivesse nas dependências,
  // o timer de 600 ms seria cancelado antes de disparar. Por isso o salvamento lê o estado por ref.
  const vivo = useRef({ peca, questoes, decorrido });
  useEffect(() => {
    vivo.current = { peca, questoes, decorrido };
  }, [peca, questoes, decorrido]);
  const salvarAgora = useCallback(() => {
    salvarRascunho(exame.id, { ...vivo.current, atualizadoEm: Date.now() });
  }, [exame.id]);

  // 600 ms depois de cada mudança no texto
  useEffect(() => {
    if (fase !== "prova") return;
    const t = window.setTimeout(salvarAgora, 600);
    return () => window.clearTimeout(t);
  }, [peca, questoes, fase, salvarAgora]);

  // Com a prova correndo: a cada 10 s (para o tempo decorrido), ao esconder a aba e ao sair da página
  useEffect(() => {
    if (fase !== "prova") return;
    const aoOcultar = () => {
      if (document.visibilityState === "hidden") salvarAgora();
    };
    const i = window.setInterval(salvarAgora, 10_000);
    document.addEventListener("visibilitychange", aoOcultar);
    window.addEventListener("pagehide", salvarAgora);
    return () => {
      window.clearInterval(i);
      document.removeEventListener("visibilitychange", aoOcultar);
      window.removeEventListener("pagehide", salvarAgora);
    };
  }, [fase, salvarAgora]);

  // Aviso ao sair com a prova em andamento
  useEffect(() => {
    if (fase !== "prova") return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [fase]);

  const iniciar = (continuar: boolean) => {
    if (continuar) {
      const r = lerRascunho(exame.id);
      if (r) {
        setPeca(r.peca);
        setQuestoes(exame.questoes.map((_, i) => r.questoes[i] ?? ""));
        setDecorrido(r.decorrido);
      }
    } else {
      apagarRascunho(exame.id);
      setPeca("");
      setQuestoes(exame.questoes.map(() => ""));
      setDecorrido(0);
    }
    setFase("prova");
    window.scrollTo({ top: 0 });
  };

  const pausar = useCallback(() => {
    setPausado(true);
    setPausas((n) => n + 1);
  }, []);

  // Atalho: Esc pausa/retoma
  useEffect(() => {
    if (fase !== "prova") return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !confirmar) {
        if (pausado) setPausado(false);
        else if (comTempo) pausar();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [fase, pausado, confirmar, comTempo, pausar]);

  useEffect(() => migrarTentativas(exame, contextoCorrecao().lex), [exame]);

  const entregar = () => {
    const respostas = { peca, questoes };
    const ctx = contextoCorrecao();
    const criadaEm = Date.now();
    const resultado = corrigirExame(exame, respostas, ctx);
    registrarErros(eventosDoSimulado(exame, resultado, ctx.lex, criadaEm));
    const id = `${exame.id}-${criadaEm.toString(36)}`;
    salvarTentativa({
      id,
      exameId: exame.id,
      criadaEm,
      duracaoSeg: Math.round(decorrido),
      respostas,
      resultado,
    });
    apagarRascunho(exame.id);
    setFase("inicio");
    router.push(`/simulados/${exame.id}/resultado/?t=${id}`);
  };

  const partes = useMemo(
    () => [
      { aba: "peca" as Aba, titulo: "Peça", enunciado: exame.peca.enunciado, linhas: exame.peca.linhas },
      ...exame.questoes.map((q, i) => ({ aba: `q${i + 1}` as Aba, titulo: `Questão ${q.n}`, enunciado: q.enunciado, linhas: q.linhas })),
    ],
    [exame],
  );
  const atual = partes.find((p) => p.aba === aba)!;
  const setValor = useCallback((a: Aba, v: string) => {
    if (a === "peca") setPeca(v);
    else setQuestoes((qs) => qs.map((q, i) => (i === Number(a.slice(1)) - 1 ? v : q)));
  }, []);
  const aoMudarFolha = useCallback((v: string) => setValor(atual.aba, v), [setValor, atual.aba]);
  // contagem de linhas por parte: calculada só quando o texto muda, não a cada tick do cronômetro
  const linhasPorParte = useMemo(
    () => new Map(partes.map((p) => [p.aba, contarLinhas(valorDe(p.aba, peca, questoes))])),
    [partes, peca, questoes],
  );

  if (fase === "inicio") {
    return (
      <div className={`container section ${styles.inicio}`}>
        <span className="eyebrow">Simulado · Direito Penal</span>
        <h1>{exame.numeral} Exame de Ordem Unificado</h1>
        <p className="lead">
          Peça prático-profissional ({fmtNota(exame.peca.valor)} pontos) e {exame.questoes.length} questões
          discursivas ({(exame.questoes[0] ? fmtNota(exame.questoes[0].valor) : "")} cada). Você escreve na folha pautada:{" "}
          {exame.peca.linhas} linhas para a peça e {exame.questoes[0]?.linhas ?? 30} para cada questão, como no caderno de
          textos definitivos.
        </p>
        {exame.observacoes && <p className={styles.obs}>ℹ️ {exame.observacoes}</p>}
        <div className={`card ${styles.regras}`}>
          <h2>Antes de começar</h2>
          <ul>
            <li>Não se identifique: no fechamento use &quot;Local...&quot;, &quot;Data...&quot;, &quot;Advogado...&quot;, &quot;OAB...&quot;.</li>
            <li>Nomeie a peça. Pelo edital, peça inadequada recebe nota zero.</li>
            <li>A correção procura as teses e os dispositivos de cada item da tabela oficial. Citar só o artigo não pontua.</li>
            <li>Seu texto fica salvo automaticamente neste navegador.</li>
          </ul>
          <label className={styles.check}>
            <input type="checkbox" checked={comTempo} onChange={(e) => setComTempo(e.target.checked)} />
            Cronometrar a prova (5 horas, com pausa)
          </label>
          <div className={styles.ctas}>
            {temRascunho && (
              <button type="button" className="btn btn-gold" onClick={() => iniciar(true)}>
                Continuar de onde parei
              </button>
            )}
            <button type="button" className={`btn ${temRascunho ? "btn-ghost" : "btn-gold"}`} onClick={() => iniciar(false)}>
              {temRascunho ? "Recomeçar do zero" : "Começar a prova"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.shell} ${foco ? styles.focoOn : ""}`}>
      <div className={styles.toolbar} role="toolbar" aria-label="Controles da prova">
        <div className={`container ${styles.toolbarInner}`}>
          <nav className={styles.tabs} aria-label="Partes da prova">
            {partes.map((p) => {
              const n = linhasPorParte.get(p.aba) ?? 0;
              return (
                <button
                  key={p.aba}
                  type="button"
                  className={styles.tab}
                  aria-current={aba === p.aba ? "page" : undefined}
                  onClick={() => setAba(p.aba)}
                >
                  {p.titulo}
                  {n > 0 && <span className={styles.dot} aria-label="respondida" />}
                </button>
              );
            })}
          </nav>
          <div className={styles.controls}>
            {comTempo && (
              <span className={`${styles.timer} ${DURACAO - decorrido < 1800 ? styles.timerLow : ""}`} title="Tempo restante">
                ⏱ {fmtTempo(DURACAO - decorrido)}
              </span>
            )}
            {comTempo && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={pausar} disabled={esgotado} title="Pausar (Esc)" aria-label="Pausar">
                ❚❚ <span className={styles.rotuloPausa}>Pausar</span>
              </button>
            )}
            <button
              type="button"
              className={`btn btn-ghost btn-sm ${styles.soDesktop}`}
              onClick={() => setLayout((l) => (l === "lado" ? "empilhado" : "lado"))}
              title="Alternar layout"
              aria-label={layout === "lado" ? "Empilhar enunciado e folha" : "Enunciado ao lado da folha"}
            >
              {layout === "lado" ? "▤" : "◫"}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFoco((f) => !f)} aria-pressed={foco} title="Modo foco">
              {foco ? "Sair do foco" : "Foco"}
            </button>
            <button type="button" className="btn btn-gold btn-sm" onClick={() => setConfirmar(true)}>
              Entregar
            </button>
          </div>
        </div>
      </div>

      {esgotado && (
        <div className={styles.banner} role="alert">
          Tempo esgotado. A folha foi travada. Entregue a prova para ver sua nota.
        </div>
      )}

      <div
        className={`container ${styles.body} ${layout === "empilhado" ? styles.stacked : ""} ${pausado ? styles.blurred : ""}`}
        inert={pausado || confirmar}
        aria-hidden={pausado}
      >
        <section className={styles.enunciado} aria-label={`Enunciado — ${atual.titulo}`}>
          <h2>{atual.titulo === "Peça" ? "Peça Prático-Profissional" : atual.titulo}</h2>
          <EnunciadoMemo text={atual.enunciado} className={styles.enunciadoTexto} data={exame.aplicacao} />
        </section>
        <section className={styles.folha}>
          <FolhaMemo
            key={atual.aba}
            id={`folha-${atual.aba}`}
            label={`Folha de respostas — ${atual.titulo}`}
            linhas={atual.linhas}
            value={valorDe(atual.aba, peca, questoes)}
            onChange={aoMudarFolha}
            disabled={esgotado}
          />
        </section>
      </div>

      {pausado && (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="pausa-titulo">
          <div className={styles.pauseBox}>
            <p className={styles.pauseEyebrow}>Prova pausada</p>
            <h2 id="pausa-titulo" className={styles.pauseTime}>
              {fmtTempo(DURACAO - decorrido)}
            </h2>
            <p className="muted">O cronômetro está parado e a prova, oculta. Respire, alongue-se e volte quando quiser.</p>
            <PromoSlot local="pausa-simulado" seed={pausas} />
            <button type="button" className="btn btn-gold" onClick={() => setPausado(false)} autoFocus>
              ▶ Continuar a prova
            </button>
          </div>
        </div>
      )}

      {confirmar && (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="entregar-titulo">
          <div className={styles.pauseBox}>
            <h2 id="entregar-titulo">Entregar a prova?</h2>
            <ul className={styles.resumo}>
              {partes.map((p) => {
                const n = linhasPorParte.get(p.aba) ?? 0;
                return (
                  <li key={p.aba}>
                    <span>{p.titulo}</span>
                    <span className={n ? "" : styles.vazio}>{n ? `${n} linha${n > 1 ? "s" : ""}` : "em branco"}</span>
                  </li>
                );
              })}
            </ul>
            <div className={styles.ctas}>
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmar(false)}>
                Voltar à prova
              </button>
              <button type="button" className="btn btn-gold" onClick={entregar}>
                Entregar e ver a nota
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
