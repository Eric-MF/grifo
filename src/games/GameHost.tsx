"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ShareCard } from "@/components/ShareCard";
import { gerarCodigo, impressao } from "@/lib/codigo/codigo";
import { useModoCelular, useRetratoToque } from "@/lib/modo";
import type { DadosCard } from "@/lib/share/card";
import { gravarJSON, lerJSON } from "@/lib/storage";
import { NOME_NIVEL } from "@/quiz/pontuacao";
import type { Nivel } from "@/quiz/types";
import { Aviso } from "./Aviso";
import { QuizModal } from "./QuizModal";
import { desbloqueado, PROGRESSO_INICIAL, type Progresso } from "./progresso";
import { jogoPorSlug, type JogoInfo } from "./registry";
import type { Estatisticas, GameInstance, GameModule, GameOptions, Hud, ItemJogo } from "./types";
import styles from "./games.module.css";
import quizCss from "@/quiz/quiz.module.css";

type Fase = "carregando" | "menu" | "pronto" | "jogando" | "pausado" | "pergunta" | "fim";
const NIVEIS: { n: Nivel; desc: string }[] = [
  { n: 1, desc: "Alternativas, só o nome da peça" },
  { n: 2, desc: "Digite a peça e o artigo" },
  { n: 3, desc: "Peça + artigo + parágrafo/inciso" },
];

interface Recordes { [nivel: string]: number }

// Espaço é "bater as asas": não pode acionar um botão do palco (opção da pergunta, HUD, menu).
const bloquearEspaco = (e: KeyboardEvent<HTMLElement>) => {
  if (e.code === "Space" && e.target instanceof HTMLButtonElement) e.preventDefault();
};
const soltar = (e: { currentTarget: HTMLButtonElement }) => e.currentTarget.blur();

/** Texto que some para o jogador até clicar: nomes de peça aparecem censurados por padrão. */
function Censurado({ children }: { children: string }) {
  const [aberto, setAberto] = useState(false);
  return (
    <button
      type="button"
      className={`${styles.censura} ${aberto ? styles.revelado : ""}`}
      onClick={(e) => {
        soltar(e);
        setAberto((a) => !a);
      }}
      aria-pressed={aberto}
      title={aberto ? undefined : "Clique para revelar"}
    >
      {children}
    </button>
  );
}

/** Item ainda não liberado: não mostra nome, descrição nem visual, só o requisito. */
function ItemBloqueado({ item, progresso, onComprar }: { item: ItemJogo; progresso: Progresso; onComprar: () => void }) {
  const comprável = item.custo !== undefined && progresso.moedas >= item.custo;
  return (
    <button
      type="button"
      className={styles.bloqueado}
      disabled={item.custo === undefined || !comprável}
      onClick={(e) => {
        soltar(e);
        onComprar();
      }}
      title={item.custo === undefined ? `Libera com ${item.xp} XP` : `Comprar por ${item.custo} moedas`}
    >
      <span aria-hidden>🔒</span>
      <span className={styles.estiloNome}>???</span>
      <small>{item.custo !== undefined ? `${item.custo} moedas` : `${item.xp} XP`}</small>
    </button>
  );
}

/** Balão com o poder do personagem; posicionado pelo GameHost em relação ao palco. */
function DicaPoder({ item, x, y, abaixo }: { item: ItemJogo; x: number; y: number; abaixo: boolean }) {
  const poder = item.poder;
  if (!poder) return null;
  return (
    <div
      role="tooltip"
      id="dica-poder"
      className={styles.dicaPoder}
      style={{ left: x, top: y, transform: abaixo ? "translateX(-50%)" : "translate(-50%, -100%)" }}
    >
      <img className={styles.poderIcone} src={poder.icone} alt="" />
      <div>
        <strong>{poder.nome}</strong>
        <span>
          {poder.descricao}
          {poder.duracao > 0 && ` Dura ${poder.duracao} s.`}
        </span>
      </div>
    </div>
  );
}

/** Miniatura do personagem, desenhada com o mesmo código do jogo e no estilo escolhido. */
function Retrato({ desenhar, estilo }: { desenhar: (c: CanvasRenderingContext2D, estilo: string) => void; estilo: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    const c = cv?.getContext("2d");
    if (!cv || !c) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = 72 * dpr;
    cv.height = 64 * dpr;
    c.setTransform(dpr * 0.6, 0, 0, dpr * 0.6, 36 * dpr, 34 * dpr);
    desenhar(c, estilo);
  }, [desenhar, estilo]);
  return <canvas ref={ref} className={styles.retrato} width={72} height={64} aria-hidden />;
}

/** Plataforma genérica: carrega o jogo do registro e cuida de menus, perguntas, HUD e fim de jogo. */
export function GameHost({ slug, fundoCard }: { slug: string; fundoCard?: string }) {
  const info = jogoPorSlug(slug) as JogoInfo;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const jogo = useRef<GameInstance | null>(null);
  const [mod, setMod] = useState<GameModule | null>(null);
  const [fase, setFase] = useState<Fase>("carregando");
  const [opcoes, setOpcoes] = useState<GameOptions>({ estilo: "classico", nivel: 1, som: true, movimentoReduzido: false, personagem: "maleta" });
  const [progresso, setProgresso] = useState<Progresso>(PROGRESSO_INICIAL);
  const progressoRef = useRef(progresso);
  progressoRef.current = progresso;
  const [hud, setHud] = useState<Hud>({ pontos: 0, vidas: 0, poderes: [], cenario: "" });
  const [quiz, setQuiz] = useState<{
    titulo: string;
    subtitulo: string;
    poder?: { icone: string; descricao: string; duracao: number };
    resolve: (ok: boolean) => void;
    seed: number;
  } | null>(null);
  const [fim, setFim] = useState<{ est: Estatisticas; recorde: boolean; codigo: string } | null>(null);
  const [recordes, setRecordes] = useState<Recordes>({});
  const recordesRef = useRef<Recordes>({});
  const [telaCheia, setTelaCheia] = useState(false);
  const celular = useModoCelular();
  const retrato = useRetratoToque();
  const girar = celular && retrato; // celular em retrato: o jogo pede para girar
  const [compraPendente, setCompraPendente] = useState<ItemJogo | null>(null);
  const [dica, setDica] = useState<{ item: ItemJogo; x: number; y: number; abaixo: boolean } | null>(null);
  const chave = `grifo:jogo:${slug}`;

  // Preferências e recordes
  useEffect(() => {
    const salvo = lerJSON<{ opcoes?: Partial<GameOptions>; recordes?: Recordes; progresso?: Progresso }>(chave, {});
    const reduzido = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const debug = process.env.NODE_ENV !== "production" && new URLSearchParams(location.search).has("debug");
    setOpcoes((o) => ({ ...o, movimentoReduzido: reduzido, ...salvo.opcoes, debug }));
    recordesRef.current = salvo.recordes ?? {};
    setRecordes(recordesRef.current);
    setProgresso({ ...PROGRESSO_INICIAL, ...salvo.progresso });
  }, [chave]);
  const salvar = useCallback(
    (o: GameOptions, r: Recordes, p: Progresso) =>
      gravarJSON(chave, {
        opcoes: { estilo: o.estilo, nivel: o.nivel, som: o.som, personagem: o.personagem },
        recordes: r,
        progresso: p,
      }),
    [chave],
  );

  // Carrega o módulo do jogo sob demanda
  useEffect(() => {
    let vivo = true;
    info.carregar().then((m) => {
      if (!vivo) return;
      // estilo salvo (ou o padrão "classico") pode não existir neste jogo
      setOpcoes((o) => (m.estilos.some((e) => e.id === o.estilo) ? o : { ...o, estilo: m.estilos[0]?.id ?? o.estilo }));
      setMod(m);
    });
    return () => {
      vivo = false;
    };
  }, [info]);

  const opcoesRef = useRef(opcoes);
  opcoesRef.current = opcoes;

  // Cria a instância quando o módulo e o canvas estão prontos
  useEffect(() => {
    if (!mod || !canvasRef.current) return;
    const inst = mod.criar(
      canvasRef.current,
      {
        perguntar: ({ tipo, poderNome, poderIcone, poderDescricao, poderDuracao }) =>
          new Promise<boolean>((resolve) => {
            setQuiz({
              titulo: tipo === "reviver" ? "Revisão Criminal: responda para continuar" : `Poder: ${poderNome}`,
              subtitulo: tipo === "reviver" ? "Última chance" : "Acerte para ativar o poder",
              poder:
                tipo === "poder" && poderIcone && poderDescricao !== undefined
                  ? { icone: poderIcone, descricao: poderDescricao, duracao: poderDuracao ?? 0 }
                  : undefined,
              resolve,
              seed: Math.random(),
            });
          }),
        hud: setHud,
        fimDeJogo: (est) => {
          const o = opcoesRef.current;
          const ganho = est.progresso ?? { xp: 0, moedas: 0 };
          const p0 = progressoRef.current;
          const novoProgresso: Progresso = { ...p0, xp: p0.xp + ganho.xp, moedas: p0.moedas + ganho.moedas };
          progressoRef.current = novoProgresso;
          setProgresso(novoProgresso);
          const anterior = recordesRef.current[o.nivel] ?? 0;
          const novo = { ...recordesRef.current, [o.nivel]: Math.max(anterior, est.pontos) };
          recordesRef.current = novo;
          setRecordes(novo);
          salvar(o, novo, novoProgresso);
          (async () => {
            const imp = await impressao({ slug, est, o: [o.estilo, o.nivel] }, 11);
            const estiloIdx = Math.max(0, mod.estilos.findIndex((s) => s.id === o.estilo));
            const codigo = await gerarCodigo({
              tipo: "jogo",
              jogo: info.id,
              pontos: est.pontos,
              nivel: o.nivel,
              estilo: estiloIdx,
              acertos: est.acertos,
              perguntas: est.perguntas,
              data: new Date(),
              impressao: imp,
            });
            setFim({ est, recorde: est.pontos > anterior && est.pontos > 0, codigo });
          })();
        },
        estado: (e) => setFase(e === "menu" ? "menu" : e),
      },
      opcoesRef.current,
    );
    jogo.current = inst;
    setFase("menu");
    return () => {
      inst.destruir();
      jogo.current = null;
    };
  }, [mod, slug, salvar, info.id]);

  useEffect(() => {
    jogo.current?.configurar(opcoes);
  }, [opcoes]);

  const mudar = (patch: Partial<GameOptions>) => {
    const n = { ...opcoesRef.current, ...patch };
    opcoesRef.current = n;
    setOpcoes(n);
    salvar(n, recordesRef.current, progressoRef.current);
  };

  const comprar = (item: ItemJogo) => {
    if (progressoRef.current.moedas < (item.custo ?? 0)) return;
    setCompraPendente(item);
  };

  const confirmarCompra = (item: ItemJogo) => {
    setCompraPendente(null);
    const p = progressoRef.current;
    const custo = item.custo ?? 0;
    if (p.moedas < custo) return;
    const novo: Progresso = { ...p, moedas: p.moedas - custo, comprados: [...p.comprados, item.id] };
    progressoRef.current = novo;
    setProgresso(novo);
    salvar(opcoes, recordes, novo);
  };

  // Abre o balão do poder acima do botão (ou abaixo, se não couber), sempre dentro da largura do palco.
  const mostrarDica = (e: { currentTarget: HTMLElement }, item: ItemJogo) => {
    const palco = wrapRef.current?.getBoundingClientRect();
    if (!palco) return;
    const r = e.currentTarget.getBoundingClientRect();
    const meia = Math.min(130, (palco.width - 16) / 2);
    const x = Math.min(Math.max(r.left - palco.left + r.width / 2, meia + 8), palco.width - meia - 8);
    const abaixo = r.top - palco.top < 150;
    setDica({ item, x, y: abaixo ? r.bottom - palco.top + 8 : r.top - palco.top - 8, abaixo });
  };

  const jogar = () => {
    setDica(null);
    setFim(null);
    jogo.current?.iniciar();
    canvasRef.current?.focus();
  };

  const alternarTelaCheia = async (e: { currentTarget: HTMLButtonElement }) => {
    soltar(e);
    // iPhone não tem requestFullscreen em elementos comuns: o palco ocupa a tela por CSS (.full)
    if (!wrapRef.current?.requestFullscreen) {
      setTelaCheia((t) => !t);
      return;
    }
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await wrapRef.current.requestFullscreen();
    } catch {
      /* não suportado */
    }
  };
  useEffect(() => {
    const h = () => setTelaCheia(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);
  // Em celular, girar para retrato pausa a partida (e a pergunta de início não arranca por toque)
  useEffect(() => {
    if (girar && (fase === "jogando" || fase === "pronto")) jogo.current?.pausar();
  }, [girar, fase]);

  const estiloAtual = mod?.estilos.find((s) => s.id === opcoes.estilo);
  const nivelNome = NOME_NIVEL[opcoes.nivel];

  const cardFim = useMemo<DadosCard | null>(() => (fim
    ? {
        titulo: info.titulo,
        subtitulo: `Nível ${nivelNome} · estilo ${estiloAtual?.nome ?? ""}`,
        nota: fim.est.pontos,
        maximo: recordes[opcoes.nivel] ?? fim.est.pontos,
        aprovado: fim.recorde,
        destaque: fim.recorde ? "Novo recorde!" : `${fim.est.acertos}/${fim.est.perguntas} perguntas certas`,
        rotuloNota: "PONTOS",
        formatoNota: (n) => Math.round(n).toLocaleString("pt-BR"),
        linhas: [
          ...(fim.est.extras ?? []).map((x) => ({ rotulo: x.rotulo, valor: x.valor.toLocaleString("pt-BR") })),
          { rotulo: "Acertos", valor: `${fim.est.acertos}/${fim.est.perguntas}` },
        ],
        rodape: `Recorde neste nível: ${(recordes[opcoes.nivel] ?? 0).toLocaleString("pt-BR")} · ${new Date().toLocaleDateString("pt-BR")}`,
        codigo: `Verifique em grifo.com/verificar · ${fim.codigo}`,
      }
    : null), [fim, info.titulo, nivelNome, estiloAtual, recordes, opcoes.nivel]);

  return (
    <div
      ref={wrapRef}
      className={`${styles.stage} ${telaCheia ? styles.full : ""} ${girar ? styles.girarAtivo : ""}`}
      onKeyDown={bloquearEspaco}
      onKeyUp={bloquearEspaco}
    >
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        tabIndex={0}
        onContextMenu={(e) => e.preventDefault()}
        aria-label={`${info.titulo}: toque, clique ou aperte espaço para voar`}
      />
      {girar && (
        <div className={styles.girar} role="status">
          <span aria-hidden>↻</span> Gire o celular para jogar
        </div>
      )}

      {(fase === "jogando" || fase === "pronto" || fase === "pergunta" || fase === "pausado") && (
        <div className={styles.hud} aria-live="off">
          <span className={styles.pontos}>{hud.pontos}</span>
          <div className={styles.poderes}>
            {hud.vidas > 0 && <span className={styles.poder} title="Vidas extras">❤️ ×{hud.vidas}</span>}
            {hud.poderes.map((p) => (
              <span key={p.id} className={styles.poder} title={p.nome}>
                <img className={styles.poderIcone} src={p.icone} alt="" /> <span className={styles.barra}><span style={{ width: `${p.restante * 100}%` }} /></span>
              </span>
            ))}
          </div>
          <span className={styles.cenario}>{hud.cenario}</span>
          <div className={styles.hudBtns}>
            <button type="button" onClick={(e) => { soltar(e); jogo.current?.pausar(); }} aria-label="Pausar" disabled={fase === "pergunta"}>
              ❚❚
            </button>
            <button type="button" onClick={(e) => { soltar(e); mudar({ som: !opcoes.som }); }} aria-label={opcoes.som ? "Desligar som" : "Ligar som"}>
              {opcoes.som ? "🔊" : "🔇"}
            </button>
          </div>
        </div>
      )}

      {hud.aviso && fase === "jogando" && (
        <div className={styles.aviso} role="status">
          <strong>{hud.aviso.titulo}</strong>
          {hud.aviso.peca && <Censurado key={hud.aviso.peca}>{hud.aviso.peca}</Censurado>}
          <span>{hud.aviso.texto}</span>
        </div>
      )}

      {fase === "pronto" && !quiz && (
        <div className={styles.dica} aria-hidden>
          {info.dica ?? (celular ? "Toque para começar" : "Toque, clique ou aperte espaço para começar")}
        </div>
      )}

      {(fase === "menu" || fase === "carregando") && (
        <div className={styles.menu}>
          <div className={styles.menuBox} onScroll={() => setDica(null)}>
            <h1 className={styles.menuTitulo}>{info.titulo}</h1>
            <p className={styles.menuDesc}>{info.descricao}</p>
            {fase === "carregando" ? (
              <p>Carregando…</p>
            ) : (
              <>
                <button type="button" className={`btn btn-gold ${styles.jogar}`} onClick={jogar} disabled={girar} autoFocus>
                  ▶ Jogar
                </button>
                {mod?.personagens && (
                  <p className={styles.progresso}>
                    Experiência: {progresso.xp} XP · Moedas: {progresso.moedas}
                  </p>
                )}
                <fieldset className={styles.grupo}>
                  <legend>Dificuldade das perguntas</legend>
                  <div className={styles.niveis}>
                    {NIVEIS.map((n) => (
                      <button key={n.n} type="button" aria-pressed={opcoes.nivel === n.n} onClick={() => mudar({ nivel: n.n })}>
                        <strong>{NOME_NIVEL[n.n]}</strong>
                        <small>{n.desc}</small>
                        <small className={styles.rec}>Recorde: {recordes[n.n] ?? 0}</small>
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset className={styles.grupo}>
                  <legend>Estilo</legend>
                  <div className={styles.estilos}>
                    {mod?.estilos.map((s) =>
                      desbloqueado(s, progresso) ? (
                        <button key={s.id} type="button" aria-pressed={opcoes.estilo === s.id} onClick={() => mudar({ estilo: s.id })} title={s.descricao}>
                          <span className={styles.swatch} data-estilo={s.id} aria-hidden />
                          <span className={styles.estiloNome}>{s.nome}</span>
                        </button>
                      ) : (
                        <ItemBloqueado key={s.id} item={s} progresso={progresso} onComprar={() => comprar(s)} />
                      ),
                    )}
                  </div>
                  {estiloAtual && <p className={styles.estiloDesc}>{estiloAtual.descricao}</p>}
                </fieldset>
                {mod?.personagens && (
                  <fieldset className={styles.grupo}>
                    <legend>Personagem</legend>
                    <div className={styles.estilos}>
                      {mod.personagens.map((p) =>
                        desbloqueado(p, progresso) ? (
                          <button
                            key={p.id}
                            type="button"
                            aria-pressed={opcoes.personagem === p.id}
                            aria-describedby={dica?.item.id === p.id ? "dica-poder" : undefined}
                            onClick={() => mudar({ personagem: p.id })}
                            onMouseEnter={(e) => mostrarDica(e, p)}
                            onMouseLeave={() => setDica(null)}
                            onFocus={(e) => mostrarDica(e, p)}
                            onBlur={() => setDica(null)}
                          >
                            {p.desenhar && <Retrato desenhar={p.desenhar} estilo={opcoes.estilo} />}
                            <span className={styles.estiloNome}>{p.nome}</span>
                          </button>
                        ) : (
                          <ItemBloqueado key={p.id} item={p} progresso={progresso} onComprar={() => undefined} />
                        ),
                      )}
                    </div>
                  </fieldset>
                )}
                <div className={styles.toggles}>
                  <label>
                    <input type="checkbox" checked={opcoes.som} onChange={(e) => mudar({ som: e.target.checked })} /> Som
                  </label>
                  <label>
                    <input type="checkbox" checked={opcoes.movimentoReduzido} onChange={(e) => mudar({ movimentoReduzido: e.target.checked })} /> Menos efeitos
                  </label>
                </div>
                {mod?.comoJogar && (
                  <details className={styles.como}>
                    <summary>Como jogar</summary>
                    <p>{mod.comoJogar.texto}</p>
                    {mod.comoJogar.itens && (
                      <ul>
                        {mod.comoJogar.itens.map((it) => (
                          <li key={it.texto}>
                            {it.icone && <img className={styles.poderIcone} src={it.icone} alt="" />}
                            <span>{it.texto}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </details>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {fase === "pausado" && (
        <div className={styles.menu}>
          <div className={styles.menuBox}>
            <h2 className={styles.menuTitulo}>Pausado</h2>
            <button type="button" className="btn btn-gold" onClick={() => jogo.current?.continuar()} disabled={girar} autoFocus>
              ▶ Continuar
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setFase("menu")}>
              Menu
            </button>
          </div>
        </div>
      )}

      {quiz && (
        <QuizModal
          nivel={opcoes.nivel}
          titulo={quiz.titulo}
          subtitulo={quiz.subtitulo}
          poder={quiz.poder}
          seed={quiz.seed}
          onFim={(ok) => {
            const r = quiz.resolve;
            setQuiz(null);
            r(ok);
            canvasRef.current?.focus();
          }}
        />
      )}

      {fase === "menu" && dica && <DicaPoder item={dica.item} x={dica.x} y={dica.y} abaixo={dica.abaixo} />}

      {compraPendente && (
        <Aviso
          titulo="Comprar estilo?"
          texto={`Comprar o estilo ${compraPendente.nome} por ${compraPendente.custo} moedas? Você tem ${progresso.moedas}.`}
          rotuloOk="Comprar"
          onOk={() => confirmarCompra(compraPendente)}
          onCancelar={() => setCompraPendente(null)}
        />
      )}

      <button type="button" className={styles.telaCheia} onClick={alternarTelaCheia} aria-label={telaCheia ? "Sair da tela cheia" : "Tela cheia"} title={telaCheia ? "Sair da tela cheia" : "Tela cheia"}>
        {telaCheia ? "⤡" : "⛶"}
      </button>

      {fase === "fim" && fim && cardFim && (
        <div className={`${styles.menu} ${styles.fimOverlay}`}>
          <div className={`${styles.menuBox} ${styles.fimBox}`}>
            <p className={quizCss.quizEyebrow}>{fim.recorde ? "Novo recorde!" : "Fim de jogo"}</p>
            <h2 className={styles.fimPontos}>{fim.est.pontos.toLocaleString("pt-BR")} pontos</h2>
            <p className="muted">
              {(fim.est.extras ?? []).map((x) => `${x.valor.toLocaleString("pt-BR")} ${x.rotulo.toLowerCase()} · `).join("")}
              {fim.est.acertos} de {fim.est.perguntas} perguntas certas ·
              recorde {(recordes[opcoes.nivel] ?? 0).toLocaleString("pt-BR")}
            </p>
            <div className={styles.fimAcoes}>
              <button type="button" className="btn btn-gold" onClick={jogar} autoFocus>
                ↻ Jogar de novo
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setFase("menu")}>
                Mudar estilo/nível
              </button>
            </div>
            <details className={styles.compartilhar}>
              <summary>Compartilhar pontuação</summary>
              <ShareCard
                dados={cardFim}
                fundo={fundoCard}
                nomeArquivo={`grifo-${slug}-${fim.est.pontos}.png`}
                caminho={`/jogos/${slug}/`}
                textoPost={`Fiz ${fim.est.pontos} pontos no ${info.titulo} do Grifo, acertando ${fim.est.acertos} perguntas de 2ª fase OAB Penal!`}
              />
              <p className={styles.codigo}>Código de verificação: <code>{fim.codigo}</code></p>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}
