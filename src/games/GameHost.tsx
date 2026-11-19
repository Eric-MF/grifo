"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { ShareCard } from "@/components/ShareCard";
import { caminhoPreviaJogo } from "@/lib/share/previas";
import { SITE } from "@/config/site";
import { BITS_IMPRESSAO_JOGO, gerarCodigo, impressao } from "@/lib/codigo/codigo";
import { useModoCelular, useRetratoToque } from "@/lib/modo";
import type { DadosCard } from "@/lib/share/card";
import { gravarJSON, lerJSON } from "@/lib/storage";
import { ajustarTipos, iniciarAutomatico, lerAutomatico, proximaDoAutomatico, registrarNoAutomatico, type EstadoAutomatico, type QuestaoAutomatica } from "@/quiz/automatico";
import { CATEGORIAS_PADRAO, mascaraCategorias, nomeCategoria } from "@/quiz/categorias";
import { atualizarConquistas, consumirAusencia, EVENTO_CONQUISTAS, lerConquistas, registrarFoco, registrarPausa, registrarTentativaCompra } from "@/lib/conquistas";
import { NOME_NIVEL } from "@/quiz/pontuacao";
import { Aviso } from "./Aviso";
import { QuizModal } from "./QuizModal";
import { PainelPoderes } from "./PainelPoderes";
import { OpcoesPerguntas } from "./OpcoesPerguntas";
import { SeletorPersonagens } from "./SeletorPersonagens";
import { Retrato } from "./Retrato";
import { IconeEfeitos, IconeFechar, IconeHistorico, IconeInfo, IconeLiberado, IconePoderAuto, IconeSom, IconeTrofeu } from "./IconesMenu";
import { aVendaAgora, comprarMelhoria, desbloqueado, itensComoJogar, itensVisiveis, migrarXpLegado, nivelMelhoria, ordenarPersonagens, PROGRESSO_INICIAL, TUDO_LIBERADO, type Progresso } from "./progresso";
import { janelaAtual } from "./calendario";
import { avaliarItens } from "./regras";
import { liberadaEm } from "./toques";
import { jogoPorSlug, type JogoInfo } from "./registry";
import type { Estatisticas, GameInstance, GameModule, GameOptions, Hud, ItemJogo, PoderMelhoravel, PoderProprioHud, TrilhaMelhoria } from "./types";
import styles from "./games.module.css";
import { abreviarMoedas, abreviarNumero, formatarMoedas, formatarXp, numeroContador, textoContador } from "./contadores";
import quizCss from "@/quiz/quiz.module.css";

type Fase = "carregando" | "menu" | "pronto" | "jogando" | "pausado" | "pergunta" | "fim" | "recorde";

// o que cada botão do alto do menu faz, no estado em que fica depois do toque (o toque mostra o texto por alguns segundos)
const TEXTO_SOM = (ligado: boolean) =>
  ligado ? "Som ligado: as asas, as moedas, os poderes e as perguntas fazem barulho." : "Som desligado: o jogo fica em silêncio.";
const TEXTO_EFEITOS = (completos: boolean) =>
  completos
    ? "Efeitos completos: partículas, rastros, chuva e neve, a tela tremendo nas batidas, as surpresas dos estilos e os momentos dos poderes."
    : "Menos efeitos: a tela não treme e saem a chuva, a neve, os rastros, as surpresas dos estilos e os momentos dos poderes; as partículas diminuem. Bom para quem se incomoda com movimento.";
const TEXTO_AUTO = (automatico: boolean) =>
  automatico
    ? "Poder automático: o poder do seu personagem é usado sozinho assim que a barra enche."
    : "Poder manual: o poder do seu personagem espera você tocar nele, no alto da tela, ou apertar E.";

interface Recordes { [nivel: string]: number }
/** Partida que quebrou o recorde de um nível: "Ver recorde" mostra a tela de fim dela. */
interface DadoRecorde { est: Estatisticas; codigo: string; data: string }
/** Compra à espera da confirmação: o texto do diálogo, o custo e como fica o progresso depois dela. */
interface CompraPendente {
  titulo: string;
  rotuloOk: string;
  texto: string;
  custo: number;
  /** devolve o progresso depois da compra, ou null se ela não vale mais (ex.: a semana do estilo acabou) */
  aplicar: (p: Progresso) => Progresso | null;
}

// Espaço é "bater as asas": não pode acionar um botão do palco (opção da pergunta, HUD, menu).
const bloquearEspaco = (e: KeyboardEvent<HTMLElement>) => {
  if (e.code === "Space" && e.target instanceof HTMLButtonElement) e.preventDefault();
};
const soltar = (e: { currentTarget: HTMLButtonElement }) => e.currentTarget.blur();

/** Item ainda não liberado: não mostra nome, descrição nem visual, só o requisito. */
function ItemBloqueado({ item, progresso, onComprar, prazo }: { item: ItemJogo; progresso: Progresso; onComprar: () => void; prazo?: string }) {
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
      <small>
        {item.requisito ?? (item.custo !== undefined ? formatarMoedas(item.custo) : formatarXp(item.xp ?? 0))}
        {prazo && ` · ${prazo}`}
      </small>
    </button>
  );
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
    /** no modo automático, o tipo e o nível desta pergunta */
    auto?: QuestaoAutomatica;
  } | null>(null);
  // o modo automático das perguntas: o mesmo do treino, com o estado guardado à parte para o jogo
  const chaveAuto = `grifo:jogo:${slug}:automatico`;
  const [auto, setAuto] = useState<EstadoAutomatico | null>(null);
  const autoRef = useRef<EstadoAutomatico | null>(null);
  const gravarAuto = (e: EstadoAutomatico) => {
    autoRef.current = e;
    setAuto(e);
    gravarJSON(chaveAuto, e);
  };
  const [avisoAuto, setAvisoAuto] = useState<string | null>(null);
  const [fim, setFim] = useState<{ est: Estatisticas; recorde: boolean; codigo: string } | null>(null);
  const [recordes, setRecordes] = useState<Recordes>({});
  const recordesRef = useRef<Recordes>({});
  const [telaCheia, setTelaCheia] = useState(false);
  const celular = useModoCelular();
  const retrato = useRetratoToque();
  const [compraPendente, setCompraPendente] = useState<CompraPendente | null>(null);
  // grupos de estilos que o jogador abriu ou fechou no menu (sem entrada: segue o padrão)
  const [gruposAbertos, setGruposAbertos] = useState<Record<string, boolean>>({});
  const [avisoJogo, setAvisoJogo] = useState<{ liberados: ItemJogo[]; cobrado: number } | null>(null);
  const pausaInicio = useRef<number | null>(null);
  // a avaliação de desbloqueios só roda depois de ler o progresso salvo (senão regravaria o inicial)
  const progressoCarregado = useRef(false);
  // o botão de informações (como jogar) e o poder aberto no painel de Poderes (a ficha do personagem abre o dele)
  const [infoAberta, setInfoAberta] = useState(false);
  const [poderAberto, setPoderAberto] = useState<string | null>(null);
  const [pedidoRolarPoder, setPedidoRolarPoder] = useState(0);
  // o que o botão do alto que acabou de ser tocado faz (some sozinho depois de alguns segundos)
  const [avisoBotao, setAvisoBotao] = useState<{ chave: number; texto: string } | null>(null);
  useEffect(() => {
    if (!avisoBotao) return;
    const t = window.setTimeout(() => setAvisoBotao(null), 6000);
    return () => window.clearTimeout(t);
  }, [avisoBotao]);
  const explicarBotao = (texto: string) => setAvisoBotao({ chave: Date.now(), texto });
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
    const a = lerAutomatico(lerJSON<unknown>(chaveAuto, null)) ?? iniciarAutomatico(salvo.opcoes?.categorias ?? CATEGORIAS_PADRAO);
    autoRef.current = a;
    setAuto(a);
  }, [chave, chaveRecorde, chaveAuto]);
  const salvar = useCallback(
    (o: GameOptions, r: Recordes, p: Progresso) =>
      gravarJSON(chave, {
        opcoes: { estilo: o.estilo, nivel: o.nivel, som: o.som, autoPoder: o.autoPoder, personagem: o.personagem, categorias: o.categorias, automatico: o.automatico },
        recordes: r,
        progresso: p,
      }),
    [chave],
  );

  // Fora de tela cheia, arrastar na vertical sobre o palco rola a página (o toque ainda bate as asas).
  // A rolagem é feita aqui, pelo movimento do dedo: assim o gesto não depende do que o navegador faz sobre o canvas.
  // Só sobre o palco: na pergunta e nos menus por cima dele, o dedo rola o que está embaixo dele (o enunciado, as
  // alternativas), como em qualquer página.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let y0: number | null = null;
    const inicio = (e: TouchEvent) => {
      y0 = e.target instanceof HTMLCanvasElement ? (e.touches[0]?.clientY ?? null) : null;
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
            // no automático, a pergunta é a da vez no modo (o tipo e o nível que o jogador alcançou)
            const a = opcoesRef.current.automatico && autoRef.current ? proximaDoAutomatico(autoRef.current) : undefined;
            setQuiz({
              auto: a,
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
      { ...opcoesRef.current, melhorias: progressoRef.current.melhorias ?? {} },
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

  // as melhorias compradas valem já na próxima partida
  useEffect(() => {
    jogo.current?.configurar({ melhorias: progresso.melhorias ?? {} });
  }, [progresso.melhorias]);

  const mudar = (patch: Partial<GameOptions>) => {
    const n = { ...opcoesRef.current, ...patch };
    // os tipos escolhidos valem também no automático (o tipo da vez continua, se ficou)
    if (patch.categorias && autoRef.current) gravarAuto(ajustarTipos(autoRef.current, patch.categorias));
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
    const custo = item.custo ?? 0;
    setCompraPendente({
      titulo: "Comprar estilo?",
      rotuloOk: "Comprar",
      texto: `Comprar o estilo ${item.nome} por ${formatarMoedas(custo)}? Você tem ${formatarMoedas(progressoRef.current.moedas)}.`,
      custo,
      aplicar: (p) => (aVendaAgora(item) && p.moedas >= custo ? { ...p, moedas: p.moedas - custo, comprados: [...p.comprados, item.id] } : null),
    });
  };

  /** Melhoria de poder: o próximo nível da trilha, com o mesmo diálogo de confirmação dos estilos. */
  const pedirMelhoria = (poder: PoderMelhoravel, trilha: TrilhaMelhoria) => {
    const nivel = nivelMelhoria(progressoRef.current, poder.id, trilha.id);
    if (nivel >= trilha.precos.length) return;
    const preco = trilha.precos[nivel];
    if (progressoRef.current.moedas < preco) {
      atualizarConquistas(registrarTentativaCompra);
      return;
    }
    setCompraPendente({
      titulo: "Melhorar poder?",
      rotuloOk: "Melhorar",
      texto: `Melhorar ${poder.nome} (${trilha.nome}, nível ${nivel + 1}) por ${formatarMoedas(preco)}? Você tem ${formatarMoedas(progressoRef.current.moedas)}.`,
      custo: preco,
      aplicar: (p) => comprarMelhoria(p, poder.id, trilha.id, preco, trilha.precos.length),
    });
  };

  const confirmarCompra = (c: CompraPendente) => {
    setCompraPendente(null);
    const novo = c.aplicar(progressoRef.current);
    if (!novo) return; // a compra não vale mais (a semana do evento acabou, ou faltam moedas)
    progressoRef.current = novo;
    setProgresso(novo);
    salvar(opcoes, recordes, novo);
  };

  /** Só no desbloqueio (desenvolvimento): troca a quantidade de moedas guardada, para testar as compras. */
  const definirMoedas = (n: number) => {
    if (!TUDO_LIBERADO || !Number.isFinite(n)) return;
    const novo: Progresso = { ...progressoRef.current, moedas: Math.max(0, Math.floor(n)) };
    if (novo.moedas === progressoRef.current.moedas) return;
    progressoRef.current = novo;
    setProgresso(novo);
    salvar(opcoes, recordes, novo);
  };

  const jogar = () => {
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
  // Joga-se em pé ou deitado; girar o celular no meio da partida pausa (a tela muda de forma e o dedo sai do lugar)
  const retratoAntes = useRef(retrato);
  useEffect(() => {
    if (retratoAntes.current === retrato) return;
    retratoAntes.current = retrato;
    if (fase === "jogando") jogo.current?.pausar();
  }, [retrato, fase]);

  const estiloAtual = mod?.estilos.find((s) => s.id === opcoes.estilo);
  const agora = new Date();
  const estilosVisiveis = mod ? itensVisiveis(mod.estilos, progresso, agora) : [];
  /** "até 28/12" para um estilo datado à venda */
  const prazoDe = (s: ItemJogo) => {
    const j = s.janela && janelaAtual(s.janela, agora);
    return j ? `até ${j.fim.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}` : undefined;
  };
  const botaoEstilo = (s: ItemJogo) =>
    desbloqueado(s, progresso) ? (
      <button key={s.id} type="button" aria-pressed={opcoes.estilo === s.id} onClick={() => mudar({ estilo: s.id })} title={s.descricao}>
        <span className={styles.swatch} data-estilo={s.id} style={s.amostra ? { background: s.amostra } : undefined} aria-hidden />
        <span className={styles.estiloNome}>{s.nome}</span>
      </button>
    ) : (
      <ItemBloqueado key={s.id} item={s} progresso={progresso} onComprar={() => comprar(s)} prazo={prazoDe(s)} />
    );
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
      className={`${styles.stage} ${telaCheia ? styles.full : ""}`}
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
          <div className={icones ? `${styles.menuBox} ${styles.menuPixel}` : styles.menuBox} style={icones ? ({ "--moldura": `url(${icones.moldura})` } as CSSProperties) : undefined} >
            {/* o topo: informações (como jogar) à esquerda, o título e, à direita, som, efeitos e poder automático */}
            <div className={styles.topoMenu}>
              <button
                type="button"
                className={styles.botaoIcone}
                aria-pressed={infoAberta}
                aria-expanded={infoAberta}
                aria-controls="info-jogo"
                onClick={() => setInfoAberta((a) => !a)}
                title="Como jogar"
                aria-label="Como jogar"
              >
                <IconeInfo />
              </button>
              <h1 className={styles.menuTitulo}>{info.titulo}</h1>
              {fase !== "carregando" && (
                <div className={styles.toggles}>
                  <button type="button" className={styles.botaoIcone} aria-pressed={opcoes.som} onClick={() => {
                      mudar({ som: !opcoes.som });
                      explicarBotao(TEXTO_SOM(!opcoes.som));
                    }} title={opcoes.som ? "Som ligado" : "Som desligado"} aria-label="Som">
                    <IconeSom ligado={opcoes.som} />
                  </button>
                  <button
                    type="button"
                    className={styles.botaoIcone}
                    aria-pressed={!opcoes.movimentoReduzido}
                    onClick={() => {
                      mudar({ movimentoReduzido: !opcoes.movimentoReduzido });
                      // depois do toque, os efeitos ficam completos se estavam reduzidos
                      explicarBotao(TEXTO_EFEITOS(opcoes.movimentoReduzido));
                    }}
                    title={opcoes.movimentoReduzido ? "Menos efeitos (ligado)" : "Efeitos completos"}
                    aria-label="Efeitos visuais"
                  >
                    <IconeEfeitos ligado={!opcoes.movimentoReduzido} />
                  </button>
                  <button
                    type="button"
                    className={styles.botaoIcone}
                    aria-pressed={opcoes.autoPoder ?? true}
                    onClick={() => {
                      mudar({ autoPoder: !(opcoes.autoPoder ?? true) });
                      explicarBotao(TEXTO_AUTO(!(opcoes.autoPoder ?? true)));
                    }}
                    title={(opcoes.autoPoder ?? true) ? "Poder automático: o poder do personagem é usado sozinho" : "Poder manual: toque no poder ou aperte E"}
                    aria-label="Poder automático"
                  >
                    <IconePoderAuto ligado={opcoes.autoPoder ?? true} />
                  </button>
                </div>
              )}
            </div>
            {avisoBotao && (
              <p key={avisoBotao.chave} className={styles.explica} role="status">
                {avisoBotao.texto}
              </p>
            )}
            {infoAberta && (
              <div id="info-jogo" className={styles.infoJogo}>
                <p>{info.descricao}</p>
                {mod?.comoJogar && <p>{mod.comoJogar.texto}</p>}
                {/* a legenda dos botões do alto */}
                <ul className={styles.legenda}>
                  <li>
                    <span className={styles.icone}>
                      <IconeSom ligado />
                    </span>
                    <span>
                      <b>Som:</b> liga e desliga os sons do jogo.
                    </span>
                  </li>
                  <li>
                    <span className={styles.icone}>
                      <IconeEfeitos ligado />
                    </span>
                    <span>
                      <b>Efeitos:</b> desligados (menos efeitos), a tela não treme e saem a chuva, a neve, os rastros, as surpresas e os momentos dos poderes.
                    </span>
                  </li>
                  <li>
                    <span className={styles.icone}>
                      <IconePoderAuto ligado />
                    </span>
                    <span>
                      <b>Poder automático:</b> ligado, o poder do personagem é usado sozinho quando a barra enche; desligado, você o usa tocando nele ou apertando E.
                    </span>
                  </li>
                </ul>
              </div>
            )}
            {fase === "carregando" ? (
              <p>Carregando…</p>
            ) : (
              <>
                <div className={styles.jogarBarra}>
                  <button type="button" className={`btn btn-gold ${styles.jogar}`} onClick={jogar} autoFocus>
                    ▶ Jogar
                  </button>
                </div>
                {mod?.personagens && (
                  <div className={styles.barraStats}>
                    <span className={styles.contador} title="Experiência" aria-label={`Experiência: ${abreviarNumero(progresso.xp)}`}>
                      <IconeXp /> {abreviarNumero(progresso.xp)}
                    </span>
                    <span className={styles.contador} title="Moedas" aria-label={`Moedas: ${abreviarMoedas(progresso.moedas)}`}>
                      <span className={styles.moedaIcone} aria-hidden /> {abreviarMoedas(progresso.moedas)}
                    </span>
                    {recordeGuardado && (
                      <button type="button" className={styles.botaoRotulo} onClick={() => setFase("recorde")}>
                        <IconeTrofeu /> Recorde
                      </button>
                    )}
                    {fim && (
                      <button type="button" className={styles.botaoRotulo} onClick={() => setFase("fim")}>
                        <IconeHistorico /> Último jogo
                      </button>
                    )}
                    {/* desbloqueio (só em desenvolvimento): editar as moedas para testar as compras */}
                    {TUDO_LIBERADO && (
                      <label className={styles.editarMoedas} title="Só no desbloqueio (desenvolvimento)">
                        Moedas
                        <input
                          type="number"
                          min={0}
                          step={1}
                          inputMode="numeric"
                          defaultValue={progresso.moedas}
                          key={progresso.moedas}
                          onBlur={(e) => definirMoedas(e.currentTarget.valueAsNumber)}
                          onKeyDown={(e) => { if (e.key === "Enter") definirMoedas(e.currentTarget.valueAsNumber); }}
                        />
                      </label>
                    )}
                  </div>
                )}
                {avisoJogo && (
                  <div className={styles.avisoMenu} role="status">
                    {avisoJogo.liberados.map((it) => (
                      <span key={it.id} className={styles.chip} title={`Liberado: ${it.nome}`}>
                        {it.desenhar && <Retrato desenhar={it.desenhar} estilo={opcoes.estilo} className={styles.retrato} />}
                        <IconeLiberado />
                        <strong>{it.nome}</strong>
                      </span>
                    ))}
                    {avisoJogo.cobrado > 0 && (
                      <span className={styles.chip} title="Cobrado ao liberar">
                        <span className={styles.moedaIcone} aria-hidden /> −{abreviarMoedas(avisoJogo.cobrado)}
                      </span>
                    )}
                    <button type="button" className={styles.botaoIcone} onClick={() => setAvisoJogo(null)} title="Fechar" aria-label="Fechar">
                      <IconeFechar />
                    </button>
                  </div>
                )}
                <OpcoesPerguntas
                  automatico={!!opcoes.automatico}
                  nivel={opcoes.nivel}
                  categorias={opcoes.categorias ?? CATEGORIAS_PADRAO}
                  recordes={recordes}
                  auto={auto}
                  onMudar={mudar}
                  onRecomecar={() => gravarAuto(iniciarAutomatico(opcoes.categorias ?? CATEGORIAS_PADRAO))}
                />
                <fieldset className={styles.grupo}>
                  <legend>Estilo</legend>
                  <div className={styles.estilos}>{estilosVisiveis.filter((s) => !s.grupo).map(botaoEstilo)}</div>
                  {(mod?.gruposEstilos ?? []).map((g) => {
                    const itens = estilosVisiveis.filter((s) => s.grupo === g.id);
                    if (!itens.length) return null;
                    const datado = itens.some((s) => s.janela);
                    // abre sozinho com o estilo escolhido dentro ou com um datado à venda agora
                    const padrao = itens.some((s) => s.id === opcoes.estilo || (s.janela && !desbloqueado(s, progresso)));
                    return (
                      <details
                        key={g.id}
                        className={styles.grupoEstilos}
                        open={gruposAbertos[g.id] ?? padrao}
                        onToggle={(e) => {
                          const aberto = e.currentTarget.open;
                          setGruposAbertos((a) => (a[g.id] === aberto ? a : { ...a, [g.id]: aberto }));
                        }}
                      >
                        {/* nos datados, a contagem revelaria quantos estilos estão escondidos */}
                        <summary>{datado ? g.nome : `${g.nome} · ${itens.filter((s) => desbloqueado(s, progresso)).length} de ${itens.length}`}</summary>
                        <div className={styles.estilos}>{itens.map(botaoEstilo)}</div>
                      </details>
                    );
                  })}
                  {estiloAtual && <p className={styles.estiloDesc}>{estiloAtual.descricao}</p>}
                </fieldset>
                {mod?.personagens && (
                  <SeletorPersonagens
                    personagens={ordenarPersonagens(mod.personagens, progresso)}
                    progresso={progresso}
                    atual={opcoes.personagem ?? "maleta"}
                    estilo={opcoes.estilo}
                    onEscolher={(id) => mudar({ personagem: id })}
                    onVerPoder={
                      mod.poderes
                        ? (p) => {
                            // abre o poder do personagem no painel de Poderes e desce até ele
                            const poder = mod.poderes?.find((x) => x.personagem === p.id);
                            if (!poder) return;
                            setPoderAberto(poder.id);
                            setPedidoRolarPoder((n) => n + 1);
                          }
                        : undefined
                    }
                  />
                )}
                {mod?.poderes && (
                  <fieldset className={styles.grupo}>
                    <legend>Poderes</legend>
                    <PainelPoderes
                      poderes={itensComoJogar(mod.poderes, mod.personagens ?? [], progresso)}
                      progresso={progresso}
                      cores={mod.coresMenu?.(opcoes.estilo)}
                      estilo={opcoes.estilo}
                      personagem={opcoes.personagem ?? "maleta"}
                      desenhar={mod.desenharPoder}
                      pixel={!!icones}
                      onMelhorar={pedirMelhoria}
                      aberto={poderAberto}
                      onAbrir={setPoderAberto}
                      pedidoRolar={pedidoRolarPoder}
                    />
                  </fieldset>
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
            <button type="button" className="btn btn-gold" onClick={() => jogo.current?.continuar()} autoFocus>
              ▶ Continuar
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setFase("menu")}>
              Menu
            </button>
          </div>
        </div>
      )}

      {avisoAuto && (
        <div className={styles.avisoAuto} role="status" onAnimationEnd={() => setAvisoAuto(null)}>
          {avisoAuto}
        </div>
      )}

      {quiz && (
        <QuizModal
          nivel={quiz.auto?.nivel ?? opcoes.nivel}
          categorias={quiz.auto ? [quiz.auto.categoria] : (opcoes.categorias ?? CATEGORIAS_PADRAO)}
          titulo={quiz.titulo}
          subtitulo={quiz.auto ? `${quiz.subtitulo} · Automático: ${nomeCategoria(quiz.auto.categoria)}, ${NOME_NIVEL[quiz.auto.nivel]}${quiz.auto.recapitulacao ? " (revisão)" : ""}` : quiz.subtitulo}
          poder={quiz.poder}
          seed={quiz.seed}
          liberadaEm={liberadaEm}
          aoGanharMoedas={(g) => jogo.current?.ganharMoedas?.(g.moedas, g.xp)}
          onFim={(ok) => {
            const r = quiz.resolve;
            if (quiz.auto && autoRef.current) {
              const { estado, avanco } = registrarNoAutomatico(autoRef.current, quiz.auto, ok);
              gravarAuto(estado);
              if (avanco)
                setAvisoAuto(
                  avanco.tipo === "nivel"
                    ? `Subiu para o ${NOME_NIVEL[avanco.nivel]}`
                    : avanco.tipo === "desceu"
                      ? `Voltou para o ${NOME_NIVEL[avanco.nivel]}`
                      : avanco.tipo === "etapa"
                        ? `Novo tipo de pergunta: ${nomeCategoria(avanco.categoria)}`
                        : "Modo final: todos os tipos, no Difícil",
                );
            }
            setQuiz(null);
            r(ok);
            canvasRef.current?.focus();
          }}
        />
      )}


      {compraPendente && (
        <Aviso
          titulo={compraPendente.titulo}
          texto={compraPendente.texto}
          rotuloOk={compraPendente.rotuloOk}
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
                previa={caminhoPreviaJogo(slug, visao.est.pontos)}
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
