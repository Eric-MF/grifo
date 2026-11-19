"use client";

import { fmtNota, fmtTempo } from "@/lib/formato";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AnswerSheet } from "@/components/AnswerSheet";
import { PreviaSwitch } from "@/components/PreviaSwitch";
import { PromoSlot } from "@/components/PromoSlot";
import { RichText } from "@/components/RichText";
import { assinarPrevia, lerPrevia } from "@/lib/previa";
import { numeralComArabico } from "@/content/titulo";
import { contextoCorrecao } from "@/lib/correcao/cliente";
import { contarLinhas, corrigirExame } from "@/lib/correcao/grader";
import { eventosDoSimulado, migrarTentativas, registrar as registrarErros } from "@/lib/erros";
import type { ExameSimulado } from "@/lib/correcao/simulado";
import { gravarJSON, lerJSON } from "@/lib/storage";
import { apagarRascunho, lerRascunho, salvarRascunho, salvarTentativa, type VersaoSimulado } from "@/lib/tentativas";
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

/** O que muda na versão atualizada deste exame, para a escolha antes de começar (montado no servidor). */
export interface MudancasAtualizada {
  nomes: boolean;
  correcoes: number;
  /** as partes com aviso de lei nova ("Peça", "Questão 4") */
  avisos: string[];
}

export function Simulador({ original, atualizado, mudancas }: { original: ExameSimulado; atualizado: ExameSimulado; mudancas: MudancasAtualizada }) {
  const router = useRouter();
  // a versão é escolhida antes de começar (a atualizada, se nada disser outra); com a prova correndo, ela não muda
  const [versao, setVersao] = useState<VersaoSimulado>("atualizada");
  const exame = versao === "atualizada" ? atualizado : original;
  // "entregando": a correção já foi gravada e a página do resultado está abrindo (a tela de início não volta a aparecer)
  const [fase, setFase] = useState<"inicio" | "prova" | "entregando">("inicio");
  const [temRascunho, setTemRascunho] = useState(false);
  const [comTempo, setComTempo] = useState(true);
  const [aba, setAba] = useState<Aba>("peca");
  const [peca, setPeca] = useState("");
  const [questoes, setQuestoes] = useState<string[]>(() => exame.questoes.map(() => ""));
  const [decorrido, setDecorrido] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [pausas, setPausas] = useState(0);
  const [confirmar, setConfirmar] = useState(false);
  // o navegador ficou sem espaço para guardar o rascunho: o texto pode não ser salvo
  const [semEspaco, setSemEspaco] = useState(false);
  const [layout, setLayout] = useState<Layout>("lado");
  // a prévia dos artigos citados no enunciado: a mesma preferência do gabarito (src/lib/previa.ts)
  const previa = useSyncExternalStore(assinarPrevia, lerPrevia, () => true);
  const [foco, setFoco] = useState(false);
  const tick = useRef<number | null>(null);
  const retomarFolha = useRef(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const barraRef = useRef<HTMLDivElement>(null);
  // o tempo de cada parte (em segundos), com o cronômetro correndo: a pausa não conta
  const [tempos, setTempos] = useState<Record<string, number>>({});
  const abaRef = useRef<Aba>("peca");
  const relogio = useRef<number | null>(null); // o instante (performance.now) em que o decorrido valia zero
  const contado = useRef(0); // o decorrido (s) até o qual o tempo já foi somado a uma parte
  // soma à parte atual o tempo que passou desde a última contagem
  const contar = useCallback(() => {
    if (relogio.current === null) return;
    const ate = (performance.now() - relogio.current) / 1000;
    const delta = ate - contado.current;
    contado.current = ate;
    if (delta <= 0) return;
    const parte = abaRef.current;
    setTempos((t) => ({ ...t, [parte]: (t[parte] ?? 0) + delta }));
  }, []);

  // O layout lembrado; a versão vem do rascunho ou do endereço ("?versao=original"), senão fica a atualizada
  useEffect(() => {
    const p = lerJSON<{ layout?: Layout }>("grifo:simulador", {});
    const rascunho = lerRascunho(original.id);
    const doEndereco = new URLSearchParams(location.search).get("versao");
    /* eslint-disable react-hooks/set-state-in-effect -- lê localStorage e o endereço após montar (site estático) */
    if (p.layout) setLayout(p.layout);
    setTemRascunho(!!rascunho);
    // o rascunho antigo (sem versão) é da original
    const escolhida = rascunho ? (rascunho.versao ?? "original") : doEndereco === "original" ? "original" : "atualizada";
    setVersao(escolhida);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [original.id]);
  useEffect(() => {
    // grava o layout sem apagar a prévia (que tem a sua própria preferência)
    gravarJSON("grifo:simulador", { ...lerJSON<Record<string, unknown>>("grifo:simulador", {}), layout });
  }, [layout]);
  const escolherVersao = (v: VersaoSimulado) => setVersao(v);

  // A altura real da barra de controles: a folha e o enunciado grudam logo abaixo dela, sem vão
  useEffect(() => {
    const barra = barraRef.current;
    const shell = shellRef.current;
    if (!barra || !shell) return;
    const ajustar = () => shell.style.setProperty("--altura-barra", `${barra.getBoundingClientRect().height}px`);
    ajustar();
    const ro = new ResizeObserver(ajustar);
    ro.observe(barra);
    return () => ro.disconnect();
  }, [fase]);

  // Modo foco: tela cheia do navegador, sem o cabeçalho e o rodapé do site
  useEffect(() => {
    document.body.toggleAttribute("data-foco", foco && fase === "prova");
    return () => document.body.removeAttribute("data-foco");
  }, [foco, fase]);
  const alternarFoco = () => {
    if (foco) {
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
      setFoco(false);
    } else {
      void document.documentElement.requestFullscreen?.().catch(() => {});
      setFoco(true);
    }
  };
  // Esc (ou sair da tela cheia pelo navegador) também desliga o modo foco
  useEffect(() => {
    const aoMudarTela = () => {
      if (!document.fullscreenElement) setFoco(false);
    };
    document.addEventListener("fullscreenchange", aoMudarTela);
    return () => document.removeEventListener("fullscreenchange", aoMudarTela);
  }, []);

  const esgotado = comTempo && decorrido >= DURACAO;

  // Cronômetro
  useEffect(() => {
    if (fase !== "prova" || pausado || esgotado) return;
    const inicio = performance.now() - decorrido * 1000;
    relogio.current = inicio;
    contado.current = decorrido;
    tick.current = window.setInterval(() => {
      setDecorrido((performance.now() - inicio) / 1000);
      contar();
    }, 500);
    return () => {
      if (tick.current) window.clearInterval(tick.current);
      // a última fatia (até a pausa, ou o fim) também é da parte em que o examinando estava
      contar();
      relogio.current = null;
    };
    // decorrido é lido só na (re)partida do cronômetro
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase, pausado, esgotado, contar]);

  // Autosave. O cronômetro muda `decorrido` a cada 500 ms: se ele estivesse nas dependências,
  // o timer de 600 ms seria cancelado antes de disparar. Por isso o salvamento lê o estado por ref.
  const vivo = useRef({ peca, questoes, decorrido, tempos, aba });
  useEffect(() => {
    vivo.current = { peca, questoes, decorrido, tempos, aba };
  }, [peca, questoes, decorrido, tempos, aba]);
  const salvarAgora = useCallback(() => {
    setSemEspaco(!salvarRascunho(exame.id, { ...vivo.current, versao: exame.versao, atualizadoEm: Date.now() }));
  }, [exame.id, exame.versao]);

  // 600 ms depois de cada mudança no texto
  useEffect(() => {
    if (fase !== "prova") return;
    const t = window.setTimeout(salvarAgora, 600);
    return () => window.clearTimeout(t);
  }, [peca, questoes, fase, aba, salvarAgora]);

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
        // o rascunho continua na versão em que foi escrito
        setVersao(r.versao ?? "original");
        setPeca(r.peca);
        setQuestoes(exame.questoes.map((_, i) => r.questoes[i] ?? ""));
        setDecorrido(r.decorrido);
        setTempos(r.tempos ?? {});
        // volta para a parte em que o examinando estava (se ela ainda existe na prova)
        const parte = r.aba === "peca" || /^q[1-9]\d*$/.test(r.aba ?? "") ? (r.aba as Aba) : "peca";
        setAba(parte);
        abaRef.current = parte;
        retomarFolha.current = true;
      }
    } else {
      apagarRascunho(exame.id);
      setPeca("");
      setQuestoes(exame.questoes.map(() => ""));
      setDecorrido(0);
      setTempos({});
      setAba("peca");
      abaRef.current = "peca";
    }
    setFase("prova");
    window.scrollTo({ top: 0 });
  };

  // Ao continuar, o cursor vai para o fim do texto da parte em que o examinando parou: ele já pode digitar
  useEffect(() => {
    if (fase !== "prova" || !retomarFolha.current) return;
    retomarFolha.current = false;
    const folha = document.getElementById(`folha-${aba}`) as HTMLTextAreaElement | null;
    if (folha) {
      folha.focus();
      folha.setSelectionRange(folha.value.length, folha.value.length);
    }
  }, [fase, aba]);

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
    // a última fatia é da parte em que o examinando está agora (o cronômetro ainda corre até a tela trocar)
    const fatia = relogio.current === null ? 0 : (performance.now() - relogio.current) / 1000 - contado.current;
    const parteAtual = abaRef.current;
    const porParte: Record<string, number> = { ...tempos, [parteAtual]: (tempos[parteAtual] ?? 0) + Math.max(0, fatia) };
    const gravou = salvarTentativa({
      id,
      exameId: exame.id,
      criadaEm,
      duracaoSeg: Math.round(decorrido),
      tempos: {
        peca: Math.round(porParte.peca ?? 0),
        questoes: exame.questoes.map((_, i) => Math.round(porParte[`q${i + 1}`] ?? 0)),
      },
      respostas,
      resultado,
      ...(exame.versao === "atualizada" ? { versao: "atualizada" as const } : {}),
    });
    // sem espaço, a nota não pode ser guardada: fica na prova, com o texto, para o aluno liberar espaço
    if (!gravou) {
      setSemEspaco(true);
      return;
    }
    apagarRascunho(exame.id);
    setConfirmar(false);
    setFase("entregando");
    window.scrollTo({ top: 0 });
    router.push(`/simulados/${exame.id}/resultado/?t=${id}`);
  };

  const partes = useMemo(
    () => [
      { aba: "peca" as Aba, titulo: "Peça", enunciado: exame.peca.enunciado, linhas: exame.peca.linhas },
      ...exame.questoes.map((q, i) => ({ aba: `q${i + 1}` as Aba, titulo: `Q${q.n}`, enunciado: q.enunciado, linhas: q.linhas })),
    ],
    [exame],
  );
  const atual = partes.find((p) => p.aba === aba)!;
  const setValor = useCallback((a: Aba, v: string) => {
    if (a === "peca") setPeca(v);
    else setQuestoes((qs) => qs.map((q, i) => (i === Number(a.slice(1)) - 1 ? v : q)));
  }, []);
  const aoMudarFolha = useCallback((v: string) => setValor(atual.aba, v), [setValor, atual.aba]);
  // trocar de parte: o tempo até aqui é da parte em que o examinando estava
  const trocarAba = (a: Aba) => {
    contar();
    abaRef.current = a;
    setAba(a);
  };
  // contagem de linhas por parte: calculada só quando o texto muda, não a cada tick do cronômetro
  const linhasPorParte = useMemo(
    () => new Map(partes.map((p) => [p.aba, contarLinhas(valorDe(p.aba, peca, questoes))])),
    [partes, peca, questoes],
  );

  if (fase === "entregando") return <TelaCorrigindo />;

  if (fase === "inicio") {
    return (
      <div className={`container section ${styles.inicio}`}>
        <span className="eyebrow">Simulado · Direito Penal</span>
        <h1>{numeralComArabico(exame)} Exame de Ordem Unificado</h1>
        <p className="lead">
          Peça prático-profissional ({fmtNota(exame.peca.valor)} pontos) e {exame.questoes.length} questões
          discursivas ({(exame.questoes[0] ? fmtNota(exame.questoes[0].valor) : "")} cada). Você escreve na folha pautada:{" "}
          {exame.peca.linhas} linhas para a peça e {exame.questoes[0]?.linhas ?? 30} para cada questão, como no caderno de
          textos definitivos.
        </p>
        {exame.observacoes && <p className={styles.obs}>ℹ️ {exame.observacoes}</p>}
        <fieldset className={styles.versoes} disabled={temRascunho}>
          <legend>Qual versão da prova?</legend>
          <label className={styles.versao} data-marcada={versao === "atualizada" || undefined}>
            <input type="radio" name="versao" checked={versao === "atualizada"} onChange={() => escolherVersao("atualizada")} />
            <span>
              <strong>
                Atualizada <span className={styles.recomendada}>recomendada</span>
              </strong>
              <small>
                {[
                  mudancas.nomes && "as pessoas ganham nomes novos (da mitologia), para quem já conhece o caso",
                  mudancas.correcoes > 0 && `${mudancas.correcoes === 1 ? "um erro material da prova corrigido" : `${mudancas.correcoes} erros materiais da prova corrigidos`} (explicado na correção)`,
                  mudancas.avisos.length > 0 && `aviso de lei nova em: ${mudancas.avisos.join(", ")}`,
                ]
                  .filter(Boolean)
                  .join("; ")
                  .replace(/^./, (c) => c.toUpperCase()) || "Igual à original."}
              </small>
            </span>
          </label>
          <label className={styles.versao} data-marcada={versao === "original" || undefined}>
            <input type="radio" name="versao" checked={versao === "original"} onChange={() => escolherVersao("original")} />
            <span>
              <strong>Original</strong>
              <small>A prova como a FGV aplicou{exame.aplicacao ? ` em ${new Date(exame.aplicacao + "T12:00:00").toLocaleDateString("pt-BR")}` : ""}, com o gabarito oficial.</small>
            </span>
          </label>
          {temRascunho && <p className={styles.versaoNota}>O rascunho salvo é da versão {versao}. Para trocar de versão, recomece do zero.</p>}
        </fieldset>
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
            <button
              type="button"
              className={`btn ${temRascunho ? "btn-ghost" : "btn-gold"}`}
              onClick={() => {
                // recomeçar libera a escolha da versão
                if (temRascunho) {
                  apagarRascunho(exame.id);
                  setTemRascunho(false);
                  return;
                }
                iniciar(false);
              }}
            >
              {temRascunho ? "Recomeçar do zero" : `Começar a prova ${versao === "atualizada" ? "atualizada" : "original"}`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={shellRef} className={`${styles.shell} ${foco ? styles.focoOn : ""}`}>
      <div ref={barraRef} className={styles.toolbar} role="toolbar" aria-label="Controles da prova">
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
                  onClick={() => trocarAba(p.aba)}
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
                ❚❚
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
            <PreviaSwitch />
            <button type="button" className="btn btn-ghost btn-sm" onClick={alternarFoco} aria-pressed={foco} title="Modo foco">
              {foco ? "Sair do foco" : "Foco"}
            </button>
            <button type="button" className="btn btn-gold btn-sm" onClick={() => setConfirmar(true)}>
              Entregar
            </button>
          </div>
        </div>
      </div>

      {semEspaco && (
        <div className={styles.banner} role="alert">
          Sem espaço para salvar neste navegador: o texto pode não ser guardado. Libere espaço (apagando dados do site ou
          de outras abas) antes de sair; sem isso, a nota também não pode ser gravada ao entregar.
        </div>
      )}
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
        <section className={styles.enunciado} aria-label={`Enunciado — ${atual.titulo}`} data-previa={previa ? "1" : "0"}>
          <h2>{atual.titulo === "Peça" ? "Peça Prático-Profissional" : atual.titulo}</h2>
          {/* com a prévia desligada, as citações são só texto: nem link nem pop-up */}
          <EnunciadoMemo text={atual.enunciado} className={styles.enunciadoTexto} data={exame.aplicacao} citacoes={previa} />
          {/* na versão atualizada, os avisos de lei nova desta parte, depois do enunciado */}
          {(exame.notas ?? [])
            .filter((n) => n.alvo === atual.aba)
            .map((n, i) => (
              <aside key={i} className={styles.notaLei}>
                <b>
                  Atualização{n.item ? ` (item ${n.item})` : ""} — {n.lei}
                </b>
                <RichText text={n.texto} data={exame.aplicacao} citacoes={previa} />
              </aside>
            ))}
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

/** Entre a entrega e a página do resultado: a correção já foi feita e gravada, e o resultado está abrindo. */
function TelaCorrigindo() {
  return (
    <div className={`container section ${styles.corrigindo}`} role="status" aria-live="polite">
      <span className={styles.carregador} aria-hidden />
      <h1>Corrigindo a sua prova…</h1>
      <p className="muted">Conferindo cada item da tabela oficial da FGV. O resultado abre em seguida.</p>
    </div>
  );
}
