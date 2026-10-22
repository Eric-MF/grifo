"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { ShareCard } from "@/components/ShareCard";
import { SITE } from "@/config/site";
import { BITS_IMPRESSAO_JOGO, gerarCodigo, impressao } from "@/lib/codigo/codigo";
import { useModoCelular, useRetratoToque } from "@/lib/modo";
import type { DadosCard } from "@/lib/share/card";
import { gravarJSON, lerJSON } from "@/lib/storage";
import { CATEGORIAS_PADRAO, mascaraCategorias } from "@/quiz/categorias";
import { atualizarConquistas, consumirAusencia, EVENTO_CONQUISTAS, lerConquistas, registrarFoco, registrarPausa, registrarTentativaCompra } from "@/lib/conquistas";
import { NOME_NIVEL } from "@/quiz/pontuacao";
import { SeletorCategorias } from "@/quiz/SeletorCategorias";
import type { Nivel } from "@/quiz/types";
import { Aviso } from "./Aviso";
import { QuizModal } from "./QuizModal";
import { desbloqueado, itensComoJogar, migrarXpLegado, ordenarPersonagens, PROGRESSO_INICIAL, type Progresso } from "./progresso";
import { avaliarItens } from "./regras";
import { liberadaEm } from "./toques";
import { jogoPorSlug, type JogoInfo } from "./registry";
import type { Estatisticas, GameInstance, GameModule, GameOptions, Hud, ItemJogo, PoderProprioHud } from "./types";
import styles from "./games.module.css";
import { abreviarMoedas, abreviarNumero, formatarMoedas, formatarXp, numeroContador, textoContador } from "./contadores";
import quizCss from "@/quiz/quiz.module.css";

type Fase = "carregando" | "menu" | "pronto" | "jogando" | "pausado" | "pergunta" | "fim" | "recorde";
const NIVEIS: { n: Nivel; desc: string }[] = [
  { n: 1, desc: "Alternativas, só o nome da peça" },
  { n: 2, desc: "Digite a peça e o artigo" },
  { n: 3, desc: "Peça + artigo + parágrafo/inciso" },
];

interface Recordes { [nivel: string]: number }
/** Partida que quebrou o recorde de um nível: "Ver recorde" mostra a tela de fim dela. */
interface DadoRecorde { est: Estatisticas; codigo: string; data: string }

// Espaço é "bater as asas": não pode acionar um botão do palco (opção da pergunta, HUD, menu).
const bloquearEspaco = (e: KeyboardEvent<HTMLElement>) => {
  if (e.code === "Space" && e.target instanceof HTMLButtonElement) e.preventDefault();
};
const soltar = (e: { currentTarget: HTMLButtonElement }) => e.currentTarget.blur();

/** Item ainda não liberado: não mostra nome, descrição nem visual, só o requisito. */
function ItemBloqueado({ item, progresso, onComprar }: { item: ItemJogo; progresso: Progresso; onComprar: () => void }) {
  const comprável = item.custo !== undefined && progresso.moedas >= item.custo;
  return (
    <button
      type="button"
      className={styles.bloqueado}
      // sem moedas suficientes o botão continua tocável: a tentativa de compra conta para uma regra
      disabled={item.custo === undefined}
      aria-disabled={item.custo !== undefined && !comprável}
      onClick={(e) => {
        soltar(e);
        onComprar();
      }}
      title={item.requisito ?? (item.custo === undefined ? `Libera com ${formatarXp(item.xp ?? 0)}` : `Comprar por ${formatarMoedas(item.custo)}`)}
    >
      <span aria-hidden>🔒</span>
      <span className={styles.estiloNome}>???</span>
      <small>{item.requisito ?? (item.custo !== undefined ? formatarMoedas(item.custo) : formatarXp(item.xp ?? 0))}</small>
    </button>
  );
}

/** Balão com o poder do personagem; posicionado pelo GameHost em relação ao palco. */
function DicaPoder({ item, x, y, abaixo }: { item: ItemJogo; x: number; y: number; abaixo: boolean }) {
  const poder = item.poder;
  if (!poder && !item.comoObter) return null;
  return (
    <div
      role="tooltip"
      id="dica-poder"
      className={styles.dicaPoder}
      style={{ left: x, top: y, transform: abaixo ? "translateX(-50%)" : "translate(-50%, -100%)" }}
    >
      {poder && <img className={styles.poderIcone} src={poder.icone} alt="" />}
      <div>
        {item.comoObter && (
          <div className={styles.comoObter}>
            <strong>{item.nome}</strong>
            <small>{item.comoObter}</small>
          </div>
        )}
        {poder && (
          <>
            <strong>{poder.nome}</strong>
            <span>
              {poder.descricao}
              {poder.duracao > 0 && ` Dura ${poder.duracao} s.`}
            </span>
          </>
        )}
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

/** Ícone do XP: uma estrela, do mesmo tamanho do ícone de moedas (a cor e o contorno vêm do CSS). */
function IconeXp() {
  return (
    <svg className={styles.xpIcone} viewBox="0 0 24 24" aria-hidden>
      <path d="M12 2.5L15.53 7.65 21.51 9.41 17.71 14.35 17.88 20.59 12 18.5 6.12 20.59 6.29 14.35 2.49 9.41 8.47 7.65z" />
      <text x="12" y="14" textAnchor="middle">xp</text>
    </svg>
  );
}

/** Ícones do menu: traço simples, na cor do texto (ver `.atalho svg` e `.chip svg` no CSS). */
const IconeTrofeu = () => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
    <path d="M8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3M12 13v4M8 20h8M9 17h6" />
  </svg>
);
const IconeHistorico = () => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <path d="M3 12a9 9 0 1 0 2.6-6.4" />
    <path d="M3 4v5h5" />
    <path d="M12 7v5l3 2" />
  </svg>
);
const IconeLiberado = () => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 7.7-1.5" />
  </svg>
);
const IconeFechar = () => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

/** Plataforma genérica: carrega o jogo do registro e cuida de menus, perguntas, HUD e fim de jogo. */
/** Compara dois HUDs campo a campo, para o motor não forçar re-render a cada 0,1 s sem mudança. */
function PoderProprio({ poder, onUsar }: { poder: PoderProprioHud; onUsar: () => void }) {
  const pronto = poder.estado === "pronto";
  const rotulo =
    poder.estado === "ativo" ? `Ativo · ${poder.segundos} s` : pronto ? "Pronto" : `${Math.floor(poder.barra * 100)}%`;
  const destaque = poder.estado === "ativo" ? styles.proprioAtivo : pronto ? styles.proprioPronto : "";
  return (
    <button
      type="button"
      className={`${styles.poder} ${styles.proprio} ${destaque}`}
      style={{ "--cor": poder.cor } as CSSProperties}
      disabled={!pronto}
      onClick={(e) => {
        soltar(e);
        onUsar();
      }}
      title={pronto ? `${poder.nome}: pronto. Toque ou aperte E para usar.` : `${poder.nome}: ${rotulo.toLowerCase()}`}
    >
      <img className={styles.poderIcone} src={poder.icone} alt="" />
      <span className={styles.rotuloProprio}>{rotulo}</span>
      <span className={styles.barra}>
        <span style={{ width: `${poder.barra * 100}%` }} />
      </span>
    </button>
  );
}

function hudIgual(a: Hud, b: Hud) {
  return (
    a.pontos === b.pontos &&
    a.vidas === b.vidas &&
    a.aviso?.titulo === b.aviso?.titulo &&
    a.aviso?.texto === b.aviso?.texto &&
    a.poderes.length === b.poderes.length &&
    a.poderes.every((p, i) => p.id === b.poderes[i].id && p.restante === b.poderes[i].restante) &&
    (a.poderProprio === b.poderProprio ||
      (!!a.poderProprio &&
        !!b.poderProprio &&
        a.poderProprio.estado === b.poderProprio.estado &&
        a.poderProprio.barra === b.poderProprio.barra &&
        a.poderProprio.segundos === b.poderProprio.segundos))
  );
}

export function GameHost({ slug, fundoCard }: { slug: string; fundoCard?: string }) {
  const info = jogoPorSlug(slug) as JogoInfo;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const moedaRef = useRef<HTMLSpanElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const jogo = useRef<GameInstance | null>(null);
  const [mod, setMod] = useState<GameModule | null>(null);
  const [fase, setFase] = useState<Fase>("carregando");
  const [opcoes, setOpcoes] = useState<GameOptions>({ estilo: "classico", nivel: 1, som: true, movimentoReduzido: false, autoPoder: true, personagem: "maleta" });
  const [progresso, setProgresso] = useState<Progresso>(PROGRESSO_INICIAL);
  const progressoRef = useRef(progresso);
  useLayoutEffect(() => {
    progressoRef.current = progresso;
  }, [progresso]);
  const [hud, setHud] = useState<Hud>({ pontos: 0, vidas: 0, moedas: 0, poderes: [] });
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
  const [avisoJogo, setAvisoJogo] = useState<{ liberados: ItemJogo[]; cobrado: number } | null>(null);
  const pausaInicio = useRef<number | null>(null);
  // a avaliação de desbloqueios só roda depois de ler o progresso salvo (senão regravaria o inicial)
  const progressoCarregado = useRef(false);
  const [dica, setDica] = useState<{ item: ItemJogo; x: number; y: number; abaixo: boolean } | null>(null);
  const chave = `grifo:jogo:${slug}`;
  const chaveRecorde = `grifo:jogo:${slug}:recorde`;
  const [dadosRecorde, setDadosRecorde] = useState<Record<string, DadoRecorde>>({});
  const dadosRecordeRef = useRef<Record<string, DadoRecorde>>({});

  // Preferências e recordes
  useEffect(() => {
    const salvo = lerJSON<{ opcoes?: Partial<GameOptions>; recordes?: Recordes; progresso?: Progresso }>(chave, {});
    const reduzido = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const debug = process.env.NODE_ENV !== "production" && new URLSearchParams(location.search).has("debug");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lê localStorage após montar (site estático)
    setOpcoes((o) => ({ ...o, movimentoReduzido: reduzido, ...salvo.opcoes, debug }));
    recordesRef.current = salvo.recordes ?? {};
    setRecordes(recordesRef.current);
    dadosRecordeRef.current = lerJSON<Record<string, DadoRecorde>>(chaveRecorde, {});
    setDadosRecorde(dadosRecordeRef.current);
    setProgresso({ ...PROGRESSO_INICIAL, ...salvo.progresso });
    progressoCarregado.current = true;
  }, [chave, chaveRecorde]);
  const salvar = useCallback(
    (o: GameOptions, r: Recordes, p: Progresso) =>
      gravarJSON(chave, {
        opcoes: { estilo: o.estilo, nivel: o.nivel, som: o.som, autoPoder: o.autoPoder, personagem: o.personagem, categorias: o.categorias },
        recordes: r,
        progresso: p,
      }),
    [chave],
  );

  // Fora de tela cheia, arrastar na vertical sobre o palco rola a página (o toque ainda bate as asas).
  // A rolagem é feita aqui, pelo movimento do dedo: assim o gesto não depende do que o navegador faz sobre o canvas.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let y0: number | null = null;
    const inicio = (e: TouchEvent) => {
      y0 = e.touches[0]?.clientY ?? null;
    };
    const mover = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY;
      if (y === undefined || y0 === null) return;
      const dy = y0 - y;
      y0 = y;
      if (el.classList.contains(styles.full) || dy === 0) return;
      window.scrollBy(0, dy);
      e.preventDefault();
    };
    const fim = () => {
      y0 = null;
    };
    el.addEventListener("touchstart", inicio, { passive: true });
    el.addEventListener("touchmove", mover, { passive: false });
    el.addEventListener("touchend", fim, { passive: true });
    el.addEventListener("touchcancel", fim, { passive: true });
    return () => {
      el.removeEventListener("touchstart", inicio);
      el.removeEventListener("touchmove", mover);
      el.removeEventListener("touchend", fim);
      el.removeEventListener("touchcancel", fim);
    };
  }, []);

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
  useLayoutEffect(() => {
    opcoesRef.current = opcoes;
  }, [opcoes]);

  // Regras de desbloqueio: reavalia quando o jogo carrega, quando há um evento de conquista (resposta, clique em
  // artigo, visita...) e depois de cada partida. Itens liberados entram em `comprados`; cobranças descontam moedas.
  const avaliarDesbloqueios = useCallback(() => {
    if (!mod || !progressoCarregado.current) return;
    const itens = [...mod.estilos, ...(mod.personagens ?? [])];
    const p0 = progressoRef.current;
    const p = migrarXpLegado(itens, p0);
    const r = avaliarItens({ conquistas: lerConquistas(), moedas: p.moedas, comprados: p.comprados, itens, agora: new Date() });
    if (!r.novos.length && !r.cobrar && !r.consumiuAusencia && p === p0) return;
    const novo: Progresso = { ...p, moedas: p.moedas - r.cobrar, comprados: [...p.comprados, ...r.novos.filter((id) => !p.comprados.includes(id))] };
    progressoRef.current = novo;
    setProgresso(novo);
    salvar(opcoesRef.current, recordesRef.current, novo);
    if (r.consumiuAusencia) atualizarConquistas(consumirAusencia);
    const liberados = r.novos.map((id) => itens.find((i) => i.id === id)).filter((i): i is ItemJogo => !!i);
    if (liberados.length || r.cobrar) setAvisoJogo({ liberados, cobrado: r.cobrar });
  }, [mod, salvar]);

  useEffect(() => {
    avaliarDesbloqueios();
  }, [avaliarDesbloqueios]);
  useEffect(() => {
    const h = () => avaliarDesbloqueios();
    window.addEventListener(EVENTO_CONQUISTAS, h);
    return () => window.removeEventListener(EVENTO_CONQUISTAS, h);
  }, [avaliarDesbloqueios]);

  // Pombodoro: tempo seguido na tela do jogo; trocar de aba zera a contagem.
  useEffect(() => {
    let acumulado = 0;
    let ultimo = performance.now();
    let visivel = document.visibilityState === "visible";
    const tick = () => {
      const agora = performance.now();
      if (visivel) acumulado += agora - ultimo;
      ultimo = agora;
      if (acumulado >= 1500000) {
        const ms = acumulado;
        acumulado = 0;
        atualizarConquistas((c) => registrarFoco(c, ms));
      }
    };
    const aoMudarAba = () => {
      tick();
      visivel = document.visibilityState === "visible";
      if (!visivel) acumulado = 0;
    };
    const id = setInterval(tick, 1000);
    document.addEventListener("visibilitychange", aoMudarAba);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", aoMudarAba);
    };
  }, []);

  // Cria a instância quando o módulo e o canvas estão prontos
  useEffect(() => {
    if (!mod || !canvasRef.current) return;
    const inst = mod.criar(
      canvasRef.current,
      {
        perguntar: ({ tipo, poderNome, poderIcone, poderDescricao, poderDuracao, carrega }) =>
          new Promise<boolean>((resolve) => {
            setQuiz({
              titulo: tipo === "reviver" ? "Revisão Criminal: responda para continuar" : `Poder: ${poderNome}`,
              subtitulo: tipo === "reviver" ? "Última chance" : carrega ? "Acerte para carregar o seu poder" : "Acerte para ativar o poder",
              poder:
                tipo === "poder" && poderIcone && poderDescricao !== undefined
                  ? { icone: poderIcone, descricao: poderDescricao, duracao: poderDuracao ?? 0 }
                  : undefined,
              resolve,
              seed: Math.random(),
            });
          }),
        // o motor manda o HUD a cada 0,1 s: só re-renderiza quando algo do HUD mudou
        hud: (h) => setHud((anterior) => (hudIgual(anterior, h) ? anterior : h)),
        alvoMoedas: () => moedaRef.current?.getBoundingClientRect() ?? null,
        recorde: () => recordesRef.current[opcoesRef.current.nivel] ?? 0,
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
          window.dispatchEvent(new Event(EVENTO_CONQUISTAS));
          (async () => {
            const categorias = o.categorias ?? CATEGORIAS_PADRAO;
            const imp = await impressao({ slug, est, o: [o.estilo, o.nivel, categorias] }, BITS_IMPRESSAO_JOGO);
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
              categorias: mascaraCategorias(categorias),
            });
            const recorde = est.pontos > anterior && est.pontos > 0;
            setFim({ est, recorde, codigo });
            if (recorde) {
              dadosRecordeRef.current = { ...dadosRecordeRef.current, [o.nivel]: { est, codigo, data: new Date().toISOString() } };
              setDadosRecorde(dadosRecordeRef.current);
              gravarJSON(chaveRecorde, dadosRecordeRef.current);
            }
          })();
        },
        estado: (e) => {
          // Prescritodáctilo: uma pausa longa, depois voltar ao jogo
          if (e === "pausado" && pausaInicio.current === null) pausaInicio.current = performance.now();
          else if (e !== "pausado" && pausaInicio.current !== null) {
            const ms = performance.now() - pausaInicio.current;
            pausaInicio.current = null;
            atualizarConquistas((c) => registrarPausa(c, ms));
          }
          setFase(e === "menu" ? "menu" : e);
        },
      },
      opcoesRef.current,
    );
    jogo.current = inst;
    setFase("menu");
    return () => {
      inst.destruir();
      jogo.current = null;
    };
  }, [mod, slug, salvar, info.id, chaveRecorde]);

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
    if (progressoRef.current.moedas < (item.custo ?? 0)) {
      // tentar comprar sem moedas suficientes conta para o Falcão Falimentar
      atualizarConquistas(registrarTentativaCompra);
      return;
    }
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
  const icones = mod?.iconesHud?.(opcoes.estilo) ?? null;
  const nivelNome = NOME_NIVEL[opcoes.nivel];

  // partida recorde deste nível (para "Ver recorde") e a tela de fim que se mostra: a última partida, ou o recorde guardado
  const recordeGuardado = dadosRecorde[String(opcoes.nivel)];
  const visao = useMemo<{ est: Estatisticas; recorde: boolean; codigo: string; guardado?: boolean } | null>(() => (fase === "recorde"
    ? (recordeGuardado ? { est: recordeGuardado.est, recorde: false, codigo: recordeGuardado.codigo, guardado: true } : null)
    : fim), [fase, fim, recordeGuardado]);
  const cardFim = useMemo<DadosCard | null>(() => (visao
    ? {
        titulo: info.titulo,
        subtitulo: `Nível ${nivelNome} · estilo ${estiloAtual?.nome ?? ""}`,
        nota: visao.est.pontos,
        maximo: recordes[opcoes.nivel] ?? visao.est.pontos,
        aprovado: visao.recorde,
        destaque: visao.guardado ? "Seu recorde neste nível" : visao.recorde ? "Novo recorde!" : `${visao.est.acertos}/${visao.est.perguntas} perguntas certas`,
        rotuloNota: "PONTOS",
        formatoNota: (n) => Math.round(n).toLocaleString("pt-BR"),
        linhas: [
          ...(visao.est.extras ?? []).map((x) => ({ rotulo: x.rotulo, valor: numeroContador(x.valor, x.formato) })),
          { rotulo: "Acertos", valor: `${visao.est.acertos}/${visao.est.perguntas}` },
        ],
        rodape: `Recorde neste nível: ${(recordes[opcoes.nivel] ?? 0).toLocaleString("pt-BR")} · ${new Date().toLocaleDateString("pt-BR")}`,
        codigo: `Verifique em ${SITE.dominio}/verificar · ${visao.codigo}`,
      }
    : null), [visao, info.titulo, nivelNome, estiloAtual, recordes, opcoes.nivel]);

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
          <div className={styles.poderes}>
            {hud.poderProprio && <PoderProprio poder={hud.poderProprio} onUsar={() => jogo.current?.usarPoderProprio()} />}
            {hud.vidas > 0 && <span className={styles.poder} title="Vidas extras">{icones ? <img className={styles.pixelIcone} src={icones.coracao} alt="" /> : "❤️"} ×{hud.vidas}</span>}
            {hud.poderes.map((p) => (
              <span key={p.id} className={styles.poder} title={p.nome}>
                <img className={styles.poderIcone} src={p.icone} alt="" /> <span className={styles.barra}><span style={{ width: `${p.restante * 100}%` }} /></span>
              </span>
            ))}
          </div>
          <div className={styles.direita}>
            <div className={styles.hudBtns}>
              <button type="button" onClick={(e) => { soltar(e); jogo.current?.pausar(); }} aria-label="Pausar" disabled={fase === "pergunta"}>
                {icones ? <img className={styles.pixelIcone} src={icones.pausa} alt="" /> : "❚❚"}
              </button>
              <button type="button" onClick={(e) => { soltar(e); mudar({ som: !opcoes.som }); }} aria-label={opcoes.som ? "Desligar som" : "Ligar som"}>
                {icones ? <img className={styles.pixelIcone} src={opcoes.som ? icones.somLigado : icones.somDesligado} alt="" /> : opcoes.som ? "🔊" : "🔇"}
              </button>
            </div>
            <span className={styles.contador} title="XP nesta partida" aria-label={`${hud.pontos} XP`}>
              <IconeXp />
              {hud.pontos}
            </span>
            <span className={styles.contador} title="Moedas nesta partida" aria-label={`${hud.moedas} moedas`}>
              <span
                ref={moedaRef}
                className={styles.moedaIcone}
                style={hud.moeda ? ({ "--moeda-ouro": hud.moeda[0], "--moeda-borda": hud.moeda[1] } as CSSProperties) : undefined}
                aria-hidden
              />{" "}
              {abreviarMoedas(hud.moedas)}
            </span>
          </div>
        </div>
      )}

      {hud.aviso && fase === "jogando" && (
        <div className={styles.aviso} role="status">
          <strong>{hud.aviso.titulo}</strong>
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
          <div className={icones ? `${styles.menuBox} ${styles.menuPixel}` : styles.menuBox} style={icones ? ({ "--moldura": `url(${icones.moldura})` } as CSSProperties) : undefined} onScroll={() => setDica(null)}>
            <h1 className={styles.menuTitulo}>{info.titulo}</h1>
            <p className={styles.menuDesc}>{info.descricao}</p>
            {fase === "carregando" ? (
              <p>Carregando…</p>
            ) : (
              <>
                <div className={styles.jogarBarra}>
                  <button type="button" className={`btn btn-gold ${styles.jogar}`} onClick={jogar} disabled={girar} autoFocus>
                    ▶ Jogar
                  </button>
                </div>
                {mod?.personagens && (
                  <div className={styles.barraStats}>
                    {recordeGuardado && (
                      <button type="button" className={styles.atalho} onClick={() => setFase("recorde")} title="Ver recorde" aria-label="Ver recorde">
                        <IconeTrofeu />
                      </button>
                    )}
                    <span className={styles.contador} title="Experiência" aria-label={`Experiência: ${abreviarNumero(progresso.xp)}`}>
                      <IconeXp /> {abreviarNumero(progresso.xp)}
                    </span>
                    <span className={styles.contador} title="Moedas" aria-label={`Moedas: ${abreviarMoedas(progresso.moedas)}`}>
                      <span className={styles.moedaIcone} aria-hidden /> {abreviarMoedas(progresso.moedas)}
                    </span>
                    {fim && (
                      <button type="button" className={styles.atalho} onClick={() => setFase("fim")} title="Ver último jogo" aria-label="Ver último jogo">
                        <IconeHistorico />
                      </button>
                    )}
                  </div>
                )}
                {avisoJogo && (
                  <div className={styles.avisoMenu} role="status">
                    {avisoJogo.liberados.map((it) => (
                      <span key={it.id} className={styles.chip} title={`Liberado: ${it.nome}`}>
                        {it.desenhar && <Retrato desenhar={it.desenhar} estilo={opcoes.estilo} />}
                        <IconeLiberado />
                        <strong>{it.nome}</strong>
                      </span>
                    ))}
                    {avisoJogo.cobrado > 0 && (
                      <span className={styles.chip} title="Cobrado ao liberar">
                        <span className={styles.moedaIcone} aria-hidden /> −{abreviarMoedas(avisoJogo.cobrado)}
                      </span>
                    )}
                    <button type="button" className={styles.atalho} onClick={() => setAvisoJogo(null)} title="Fechar" aria-label="Fechar">
                      <IconeFechar />
                    </button>
                  </div>
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
                <SeletorCategorias
                  className={styles.grupo}
                  valor={opcoes.categorias ?? CATEGORIAS_PADRAO}
                  onChange={(categorias) => mudar({ categorias })}
                />
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
                      {ordenarPersonagens(mod.personagens, progresso).map((p) =>
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
                  <label>
                    <input type="checkbox" checked={opcoes.autoPoder ?? true} onChange={(e) => mudar({ autoPoder: e.target.checked })} /> Poder automático
                  </label>
                </div>
                {mod?.comoJogar && (
                  <details className={styles.como}>
                    <summary>Como jogar</summary>
                    <p>{mod.comoJogar.texto}</p>
                    {mod.comoJogar.itens && (
                      <ul>
                        {itensComoJogar(mod.comoJogar.itens, mod.personagens ?? [], progresso).map((it) => (
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
          <div className={icones ? `${styles.menuBox} ${styles.menuPixel}` : styles.menuBox} style={icones ? ({ "--moldura": `url(${icones.moldura})` } as CSSProperties) : undefined}>
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
          categorias={opcoes.categorias ?? CATEGORIAS_PADRAO}
          titulo={quiz.titulo}
          subtitulo={quiz.subtitulo}
          poder={quiz.poder}
          seed={quiz.seed}
          liberadaEm={liberadaEm}
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
          texto={`Comprar o estilo ${compraPendente.nome} por ${formatarMoedas(compraPendente.custo ?? 0)}? Você tem ${formatarMoedas(progresso.moedas)}.`}
          rotuloOk="Comprar"
          onOk={() => confirmarCompra(compraPendente)}
          onCancelar={() => setCompraPendente(null)}
        />
      )}

      <button type="button" className={styles.telaCheia} onClick={alternarTelaCheia} aria-label={telaCheia ? "Sair da tela cheia" : "Tela cheia"} title={telaCheia ? "Sair da tela cheia" : "Tela cheia"}>
        {icones ? <img className={styles.pixelIcone} src={icones.telaCheia} alt="" /> : telaCheia ? "⤡" : "⛶"}
      </button>

      {(fase === "fim" || fase === "recorde") && visao && cardFim && (
        <div className={`${styles.menu} ${styles.fimOverlay}`}>
          <div className={`${styles.menuBox} ${styles.fimBox}`}>
            <p className={quizCss.quizEyebrow}>{visao.guardado ? "Seu recorde neste nível" : visao.est.causa === "sol" ? "VOCÊ VOOU MUITO PERTO DO SOL" : visao.recorde ? "Novo recorde!" : "Fim de jogo"}</p>
            <h2 className={styles.fimPontos}>{visao.est.pontos.toLocaleString("pt-BR")} pontos</h2>
            <p className="muted">
              {(visao.est.extras ?? []).map((x) => `${textoContador(x.valor, x.rotulo, x.formato)} · `).join("")}
              {visao.est.acertos} de {visao.est.perguntas} perguntas certas ·
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
            <div className={styles.compartilhar}>
              <ShareCard
                dados={cardFim}
                fundo={fundoCard}
                nomeArquivo={`grifo-${slug}-${visao.est.pontos}.png`}
                caminho={`/jogos/${slug}/`}
                textoPost={`Fiz ${visao.est.pontos} pontos no ${info.titulo} do Grifo, acertando ${visao.est.acertos} perguntas de 2ª fase OAB Penal!`}
              />
              <p className={styles.codigo}>Código de verificação: <code>{visao.codigo}</code></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
