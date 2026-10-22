"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SITE } from "@/config/site";
import { type CSSProperties, useEffect, useId, useRef, useState } from "react";
import { lerJSON, gravarJSON } from "@/lib/storage";
import {
  ACERTOS_PARA_SUBIR,
  ajustarTipos,
  faltamParaDescer,
  faltamParaSubir,
  iniciarAutomatico,
  intervaloDaRecapitulacao,
  lerAutomatico,
  noFinal,
  ORDEM_AUTOMATICO,
  proximaDoAutomatico,
  registrarNoAutomatico,
  tiposNaOrdem,
  type Avanco,
  type EstadoAutomatico,
  type QuestaoAutomatica,
} from "@/quiz/automatico";
import { sortearPergunta, tamanhoAcervo } from "@/quiz/banco";
import { CATEGORIAS_PADRAO, CHAVE_CATEGORIAS, nomeCategoria } from "@/quiz/categorias";
import { avancarNoToque, ehToque, focarCampoDaQuestao, PerguntaCorpo, QuestaoRevista, type Revisao } from "@/quiz/PerguntaCorpo";
import { FOLGA_SEG, folgaSeg, janelaSeg, maximoTreino, NOME_NIVEL, pontuar, TAMANHO_TREINO, TAMANHOS_TREINO } from "@/quiz/pontuacao";
import { SeletorCategorias } from "@/quiz/SeletorCategorias";
import { SonsDoTreino } from "@/quiz/sons";
import { progressoDoStrike, registrarStrike, STRIKE_ZERO, tamanhoDoStrike, type EstadoStrike } from "@/quiz/strike";
import type { Categoria, Nivel, Pergunta } from "@/quiz/types";
import { nomePeca, type Correcao } from "@/quiz/verificar";
import { BarrasDoNivel, DURACAO_REVOADA, ItemMenu, MenuFoco, RevoadaStrike, SomDoMenu, XpFoco } from "./MenuFoco";
import { Comemoracao, PlacarStrike } from "./Strike";
import styles from "./treino.module.css";

type Fase = "inicio" | "pergunta" | "resultado";
/**
 * quantas questões: um número fixo ou "infinito" (uma atrás da outra, até o usuário encerrar). O modo automático (o tipo
 * e o nível escolhidos conforme o aluno acerta: src/quiz/automatico.ts) vale com qualquer um dos dois.
 */
type Tamanho = number | "infinito";
interface Rodada {
  pergunta: Pergunta;
  /** o nível em que a questão foi respondida (no modo infinito ele pode mudar no meio) */
  nivel: Nivel;
  acertou: boolean;
  segundos: number;
  pontos: number;
  /** a questão como ficou depois de respondida, para revê-la no resultado */
  revisao: Revisao;
  /** no modo automático, a recapitulação de um tipo já vencido */
  recapitulacao?: boolean;
}
/** recorde por nível e quantidade: "2" é o de 10 questões (como era gravado antes), "2:20" o de 20 */
type Recordes = Record<string, number>;
const chaveRecorde = (nivel: Nivel, tamanho: number) => (tamanho === TAMANHO_TREINO ? String(nivel) : `${nivel}:${tamanho}`);

/** Tempo da pergunta. Fica num componente próprio para o intervalo de 250 ms não re-renderizar a pergunta. */
function Tempo({ inicio, limite, folga, ultima }: { inicio: number; limite: number; folga: number; ultima: Rodada | null }) {
  const [agora, setAgora] = useState(inicio);
  useEffect(() => {
    if (ultima) return;
    const t = setInterval(() => setAgora(performance.now()), 250);
    return () => clearInterval(t);
  }, [ultima]);
  const segundos = ultima ? ultima.segundos : Math.max(0, (agora - inicio) / 1000);
  return (
    <p className={styles.tempo}>
      Tempo {fmt(segundos)} ·{" "}
      {ultima ? (
        <strong>+{ultima.pontos} pontos</strong>
      ) : segundos <= folga ? (
        `sem perder pontos até ${fmt(folga)}`
      ) : segundos > folga + limite ? (
        "sem bônus de rapidez"
      ) : (
        `bônus de rapidez até ${fmt(folga + limite)}`
      )}
    </p>
  );
}

const CHAVE = "grifo:treino";
const CHAVE_TAMANHO = "grifo:treino:tamanho";
/** o modo automático continua de onde parou: o tipo, o nível e os últimos resultados */
const CHAVE_AUTOMATICO = "grifo:treino:automatico";
const CHAVE_AUTOMATICO_TIPOS = "grifo:treino:automatico:tipos";
const CHAVE_AUTOMATICO_DESCER = "grifo:treino:automatico:descer";
const CHAVE_PULAR_ACERTOS = "grifo:treino:pularAcertos";
/** se o modo automático está ligado (o progresso dele fica em CHAVE_AUTOMATICO, de um treino para o outro) */
const CHAVE_AUTOMATICO_LIGADO = "grifo:treino:automatico:ligado";
const CHAVE_SONS = "grifo:treino:sons";
const CHAVE_VOLUME = "grifo:treino:volume";
/** o modo foco: o caso ao lado da resposta e a largura do texto (em rem) em cada disposição */
const CHAVE_FOCO = "grifo:treino:foco";
interface PrefsFoco {
  lado: boolean;
  larguraLado: number;
  larguraColuna: number;
}
const PREFS_FOCO: PrefsFoco = { lado: true, larguraLado: 88, larguraColuna: 52 };
const LARGURA_MINIMA = 34;
const lerPrefsFoco = (g: Partial<PrefsFoco> | null): PrefsFoco => ({
  lado: typeof g?.lado === "boolean" ? g.lado : PREFS_FOCO.lado,
  larguraLado: typeof g?.larguraLado === "number" ? Math.max(LARGURA_MINIMA, g.larguraLado) : PREFS_FOCO.larguraLado,
  larguraColuna: typeof g?.larguraColuna === "number" ? Math.max(LARGURA_MINIMA, g.larguraColuna) : PREFS_FOCO.larguraColuna,
});
/** quanto tempo a comemoração do strike fica na tela (o CSS some com ela no mesmo tempo) */
const DURACAO_COMEMORACAO = 2900;
/** O aviso de subiu ou desceu de nível aparece e some sozinho. */
const DURACAO_AVANCO = 3600;

/** "Peça e fundamento · Médio": onde o modo automático está. */
function ondeEsta(e: EstadoAutomatico): string {
  return noFinal(e) ? "modo final, todos os tipos no Difícil" : `${nomeCategoria(e.tipos[e.etapa]!)} · ${NOME_NIVEL[e.nivel]}`;
}

/** O aviso de que o modo automático avançou, no topo da questão seguinte. */
function textoDoAvanco(a: NonNullable<Avanco>): string {
  if (a.tipo === "nivel") return `Subiu para o ${NOME_NIVEL[a.nivel]}!`;
  if (a.tipo === "desceu") return `Desceu para o ${NOME_NIVEL[a.nivel]}. Com 4 acertos em 5, sobe de novo.`;
  if (a.tipo === "etapa") return `Próximo tipo: ${nomeCategoria(a.categoria)}, começando no Fácil.`;
  return "Modo final: todos os tipos se alternam, só no Difícil.";
}
/**
 * A largura do texto (até a tela toda) e o caso ao lado da resposta, no menu do modo foco. Cada disposição guarda a sua
 * largura. No celular some: a largura já é a da tela.
 */
function AjustesLargura({ prefs, onChange }: { prefs: PrefsFoco; onChange: (p: PrefsFoco) => void }) {
  const [maximo, setMaximo] = useState(120);
  useEffect(() => {
    const medir = () => setMaximo(Math.max(LARGURA_MINIMA + 2, Math.floor((window.innerWidth - 32) / 16)));
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, []);
  const largura = Math.min(maximo, prefs.lado ? prefs.larguraLado : prefs.larguraColuna);
  return (
    <div className={styles.ajustesFoco}>
      <hr />
      <label className={styles.largura}>
        <span>
          Largura do texto <small>{largura >= maximo ? "tela toda" : `${Math.round((100 * largura) / maximo)}% da tela`}</small>
        </span>
        <input
          type="range"
          min={LARGURA_MINIMA}
          max={maximo}
          step={1}
          value={largura}
          onChange={(e) => {
            const n = Number(e.target.value);
            // no máximo, guarda um número alto: a tela toda também numa tela maior
            const v = n >= maximo ? 400 : n;
            onChange(prefs.lado ? { ...prefs, larguraLado: v } : { ...prefs, larguraColuna: v });
          }}
        />
      </label>
      <label className={styles.opcao}>
        <input type="checkbox" checked={prefs.lado} onChange={(e) => onChange({ ...prefs, lado: e.target.checked })} />
        <span>
          <strong>Caso ao lado da resposta</strong>
          <small>Com largura para duas colunas: o caso fica parado à esquerda e a pergunta corre à direita.</small>
        </span>
      </label>
    </div>
  );
}

/** A opção de descer de nível no modo automático. */
function OpcaoPular({ valor, onChange }: { valor: boolean; onChange: (p: boolean) => void }) {
  return (
    <label className={styles.opcao}>
      <input type="checkbox" checked={valor} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <strong>Pular para a próxima quando acertar</strong>
        <small>No acerto, a próxima questão vem sozinha, sem o botão. No erro, a correção fica na tela.</small>
      </span>
    </label>
  );
}

/** O ícone do modo foco: os quatro cantos de uma tela (abrem) ou voltados para dentro (fecham). */
function IconeFoco({ ligado }: { ligado: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {ligado ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /> : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
    </svg>
  );
}

function OpcaoDescer({ valor, onChange }: { valor: boolean; onChange: (d: boolean) => void }) {
  return (
    <label className={styles.opcao}>
      <input type="checkbox" checked={valor} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <strong>Descer de nível quando errar muito</strong>
        <small>3 erros nas últimas 5 questões do nível voltam um nível (no Fácil e no modo final, não desce).</small>
      </span>
    </label>
  );
}

const NIVEIS: { n: Nivel; desc: string }[] = [
  { n: 1, desc: "Todas as questões com alternativas" },
  { n: 2, desc: "Digite a resposta: a peça e o artigo, ou a tese e o dispositivo. Objetivas com menos tempo" },
  { n: 3, desc: "Resposta completa, com parágrafo, inciso ou alínea. Objetivas com o tempo mais curto" },
];

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Uma questão do resultado: a linha resume (acerto, tempo e pontos) e abre a questão como ficou depois de respondida. */
function RodadaRevista({ n, rodada, comNivel }: { n: number; rodada: Rodada; comNivel: boolean }) {
  const [aberta, setAberta] = useState(false);
  const corpo = useId();
  const p = rodada.pergunta;
  // na peça, o nome dela (a resposta); nas outras, de onde a questão saiu ("XL Exame · 1ª fase, questão 57")
  const titulo = p.formato === "peca" ? nomePeca(p.resposta.peca) : p.fonte;
  return (
    <li className={styles.rodada} data-acertou={rodada.acertou ? "1" : undefined} data-aberta={aberta ? "1" : undefined}>
      <button type="button" className={styles.rever} aria-expanded={aberta} aria-controls={corpo} onClick={() => setAberta((a) => !a)}>
        <span className={styles.rodadaN}>
          <span className="sr-only">Questão </span>
          {n}
        </span>
        <span className={styles.rodadaTitulo}>
          <strong>{titulo}</strong>
          <small>
            {nomeCategoria(p.categorias[0])}
            {comNivel ? ` · ${NOME_NIVEL[rodada.nivel]}` : ""}
          </small>
        </span>
        <span className={styles.rodadaNumeros}>
          <span className={styles.selo}>{rodada.acertou ? "✓ Acerto" : "✗ Erro"}</span>
          <span>
            {fmt(rodada.segundos)} · {rodada.pontos} pts
          </span>
        </span>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
      <div id={corpo} className={styles.rodadaCorpo} hidden={!aberta}>
        {aberta && <QuestaoRevista pergunta={p} nivel={rodada.nivel} revisao={rodada.revisao} />}
      </div>
    </li>
  );
}

/** Escolha do nível: no início, com o recorde; no modo infinito, compacta, para trocar entre uma questão e outra. */
function BotoesNivel({ valor, onChange, recordes, tamanho, compacto }: { valor: Nivel; onChange: (n: Nivel) => void; recordes?: Recordes; tamanho?: number; compacto?: boolean }) {
  const base = useId();
  return (
    <div className={compacto ? styles.niveisCompactos : styles.niveis}>
      {NIVEIS.map((x) => (
        <button key={x.n} type="button" aria-pressed={valor === x.n} onClick={() => onChange(x.n)} aria-describedby={compacto ? `${base}-${x.n}` : undefined}>
          <strong>{NOME_NIVEL[x.n]}</strong>
          {!compacto && <small>{x.desc}</small>}
          {/* nos ajustes, só o nome aparece: o que o nível cobra fica na dica, com o mouse por cima ou o foco */}
          {compacto && (
            <span id={`${base}-${x.n}`} role="tooltip" className={styles.dicaNivel}>
              {x.desc}
            </span>
          )}
          {recordes && tamanho && (
            <span className={styles.recorde}>
              Recorde: {recordes[chaveRecorde(x.n, tamanho)] ?? "—"} de {maximoTreino(x.n, tamanho)}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

type Filtro = "todas" | "erros" | "acertos";
/** Quantas linhas da revisão aparecem de cada vez: com 50 questões (ou um modo infinito longo) a lista não cansa. */
const POR_VEZ = 20;

/** A maior sequência de acertos seguidos. */
function melhorSequencia(rodadas: Rodada[]): number {
  let melhor = 0;
  let atual = 0;
  for (const r of rodadas) {
    atual = r.acertou ? atual + 1 : 0;
    melhor = Math.max(melhor, atual);
  }
  return melhor;
}

/** Acertos de cada grupo (nível ou tipo de pergunta), na ordem em que aparecem. */
function porGrupo(rodadas: Rodada[], grupo: (r: Rodada) => string): { nome: string; acertos: number; total: number }[] {
  const m = new Map<string, { acertos: number; total: number }>();
  for (const r of rodadas) {
    const g = m.get(grupo(r)) ?? { acertos: 0, total: 0 };
    g.total++;
    if (r.acertou) g.acertos++;
    m.set(grupo(r), g);
  }
  return [...m].map(([nome, g]) => ({ nome, ...g }));
}

export function Treino() {
  const [fase, setFase] = useState<Fase>("inicio");
  const [nivel, setNivel] = useState<Nivel>(1);
  const [tamanho, setTamanho] = useState<Tamanho>(TAMANHO_TREINO);
  const [categorias, setCategorias] = useState<Categoria[]>(CATEGORIAS_PADRAO);
  const [recordes, setRecordes] = useState<Recordes>({});
  const [rodadas, setRodadas] = useState<Rodada[]>([]);
  const [indice, setIndice] = useState(0);
  const [pergunta, setPergunta] = useState<Pergunta | null>(null);
  // o nível da questão na tela: no modo infinito, `nivel` pode mudar e vale a partir da próxima
  const [nivelDaQuestao, setNivelDaQuestao] = useState<Nivel>(1);
  const [inicio, setInicio] = useState(0);
  const [respondida, setRespondida] = useState(false);
  const [novoRecorde, setNovoRecorde] = useState(false);
  const [ajustes, setAjustes] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [mostradas, setMostradas] = useState(POR_VEZ);
  const vistas = useRef(new Set<string>());
  const infinito = tamanho === "infinito";
  const [automatico, setAutomatico] = useState(false);
  // sem número de questões: termina quando o aluno encerra, sem recorde
  const semFim = infinito;
  const [foco, setFoco] = useState(false);
  const [prefsFoco, setPrefsFoco] = useState<PrefsFoco>(PREFS_FOCO);
  // modo automático: os tipos que entram, onde está, a questão da vez e o último avanço (para o aviso)
  const [tiposAuto, setTiposAuto] = useState<Categoria[]>(ORDEM_AUTOMATICO);
  const [auto, setAuto] = useState<EstadoAutomatico | null>(null);
  const [questaoAuto, setQuestaoAuto] = useState<QuestaoAutomatica | null>(null);
  const [avanco, setAvanco] = useState<Avanco>(null);
  // descer de nível com 3 erros nas últimas 5 (pode desligar)
  const [descer, setDescer] = useState(true);
  const [pularAcertos, setPularAcertos] = useState(false);
  // o strike: bolinhas por acerto seguido; o erro apaga tudo
  const [strike, setStrike] = useState<EstadoStrike>(STRIKE_ZERO);
  const [perdeuEm, setPerdeuEm] = useState(0);
  const [comemoracao, setComemoracao] = useState<{ total: number; tamanho: number; proximo: number } | null>(null);
  const [sons, setSons] = useState(true);
  const [volume, setVolume] = useState(1);
  // a revoada das bolinhas do strike no modo foco, a cada acerto
  const [revoada, setRevoada] = useState<{ id: number; acertos: number; n: number; fez: boolean } | null>(null);
  useEffect(() => {
    if (!revoada) return;
    const t = setTimeout(() => setRevoada(null), DURACAO_REVOADA + 300);
    return () => clearTimeout(t);
  }, [revoada]);
  const sonsRef = useRef<SonsDoTreino | null>(null);
  useEffect(() => {
    if (!avanco) return;
    const t = setTimeout(() => setAvanco(null), DURACAO_AVANCO);
    return () => clearTimeout(t);
  }, [avanco]);
  useEffect(() => {
    if (!comemoracao) return;
    const t = setTimeout(() => setComemoracao(null), DURACAO_COMEMORACAO);
    return () => clearTimeout(t);
  }, [comemoracao]);
  useEffect(() => () => sonsRef.current?.fechar(), []);
  const tocar = (f: (s: SonsDoTreino) => void) => {
    if (!sons) return;
    if (!sonsRef.current) {
      sonsRef.current = new SonsDoTreino();
      sonsRef.current.definirVolume(volume);
    }
    f(sonsRef.current);
  };
  const mudarVolume = (v: number) => {
    setVolume(v);
    sonsRef.current?.definirVolume(v);
    gravarJSON(CHAVE_VOLUME, v);
  };
  const alternarSons = () => {
    setSons((s) => !s);
    gravarJSON(CHAVE_SONS, !sons);
  };

  // Modo foco: tela cheia do navegador, sem o cabeçalho, o rodapé e a apresentação da página, só a questão
  useEffect(() => {
    const ligado = foco && fase === "pergunta";
    const b = document.body;
    b.toggleAttribute("data-foco", ligado);
    // caso ao lado só no computador: no celular é sempre uma coluna
    b.toggleAttribute("data-foco-lado", ligado && prefsFoco.lado && !ehToque());
    if (ligado) b.style.setProperty("--foco-largura", `${prefsFoco.lado ? prefsFoco.larguraLado : prefsFoco.larguraColuna}rem`);
    else b.style.removeProperty("--foco-largura");
    return () => {
      b.removeAttribute("data-foco");
      b.removeAttribute("data-foco-lado");
      b.style.removeProperty("--foco-largura");
    };
  }, [foco, fase, prefsFoco]);
  const mudarPrefsFoco = (p: PrefsFoco) => {
    setPrefsFoco(p);
    gravarJSON(CHAVE_FOCO, p);
  };
  // fora das questões (o resultado, o início), o modo foco desliga
  useEffect(() => {
    if (fase === "pergunta" || !foco) return;
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    setFoco(false); // eslint-disable-line react-hooks/set-state-in-effect -- acompanha a troca de fase
  }, [fase, foco]);
  // Esc (ou sair da tela cheia pelo navegador) também desliga o modo foco
  useEffect(() => {
    const aoMudarTela = () => {
      if (!document.fullscreenElement) setFoco(false);
    };
    document.addEventListener("fullscreenchange", aoMudarTela);
    return () => document.removeEventListener("fullscreenchange", aoMudarTela);
  }, []);
  const alternarFoco = () => {
    if (foco) {
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
      setFoco(false);
    } else {
      void document.documentElement.requestFullscreen?.().catch(() => {});
      setFoco(true);
    }
    // o botão clicado some na troca: o foco volta para o campo da questão, não para o começo da página
    requestAnimationFrame(focarCampoDaQuestao);
  };

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- lê localStorage após montar (site estático) */
    setRecordes(lerJSON<Recordes>(CHAVE, {}));
    setCategorias(lerJSON<Categoria[]>(CHAVE_CATEGORIAS, CATEGORIAS_PADRAO));
    // "automatico" já foi uma quantidade (o modo era sem fim): vira o modo infinito com o automático ligado
    const t = lerJSON<Tamanho | "automatico">(CHAVE_TAMANHO, TAMANHO_TREINO);
    setTamanho(t === "infinito" || t === "automatico" ? "infinito" : (TAMANHOS_TREINO as readonly number[]).includes(t) ? t : TAMANHO_TREINO);
    setAutomatico(lerJSON<boolean>(CHAVE_AUTOMATICO_LIGADO, t === "automatico"));
    setTiposAuto(tiposNaOrdem(lerJSON<Categoria[]>(CHAVE_AUTOMATICO_TIPOS, ORDEM_AUTOMATICO)));
    setAuto(lerAutomatico(lerJSON<unknown>(CHAVE_AUTOMATICO, null)));
    setSons(lerJSON<boolean>(CHAVE_SONS, true));
    const v = lerJSON<number>(CHAVE_VOLUME, 1);
    setVolume(typeof v === "number" && v >= 0 && v <= 1 ? v : 1);
    setDescer(lerJSON<boolean>(CHAVE_AUTOMATICO_DESCER, true));
    setPularAcertos(lerJSON<boolean>(CHAVE_PULAR_ACERTOS, false));
    setPrefsFoco(lerPrefsFoco(lerJSON<Partial<PrefsFoco> | null>(CHAVE_FOCO, null)));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const mudarCategorias = (c: Categoria[]) => {
    setCategorias(c);
    gravarJSON(CHAVE_CATEGORIAS, c);
  };
  const mudarTamanho = (t: Tamanho) => {
    setTamanho(t);
    gravarJSON(CHAVE_TAMANHO, t);
  };
  const mudarAutomatico = (a: boolean) => {
    setAutomatico(a);
    gravarJSON(CHAVE_AUTOMATICO_LIGADO, a);
  };

  const proximaPergunta = (cats = categorias): Pergunta => {
    for (let i = 0; i < 20; i++) {
      const p = sortearPergunta({ categorias: cats });
      if (!vistas.current.has(p.id)) {
        vistas.current.add(p.id);
        return p;
      }
    }
    // no modo infinito o acervo acaba: as já vistas voltam ao sorteio
    vistas.current = new Set();
    return sortearPergunta({ categorias: cats });
  };

  // os tipos do modo automático que têm perguntas, na ordem do modo
  const tiposComPerguntas = (cs: Categoria[]) => tiposNaOrdem(cs.filter((c) => tamanhoAcervo(c) > 0));
  const gravarAuto = (e: EstadoAutomatico) => {
    setAuto(e);
    gravarJSON(CHAVE_AUTOMATICO, e);
  };
  /** A próxima questão: no modo automático, o tipo e o nível vêm do modo; nos outros, dos tipos marcados e do nível. */
  const abrirQuestao = (estadoAuto: EstadoAutomatico | null) => {
    if (estadoAuto) {
      const q = proximaDoAutomatico(estadoAuto);
      setQuestaoAuto(q);
      setPergunta(proximaPergunta([q.categoria]));
      setNivelDaQuestao(q.nivel);
    } else {
      setPergunta(proximaPergunta());
      setNivelDaQuestao(nivel);
    }
    setInicio(performance.now());
    setRespondida(false);
  };

  const comecar = () => {
    vistas.current = new Set();
    setRodadas([]);
    setIndice(0);
    setNovoRecorde(false);
    setAjustes(false);
    setStrike(STRIKE_ZERO);
    setPerdeuEm(0);
    setAvanco(null);
    let estadoAuto: EstadoAutomatico | null = null;
    if (automatico) {
      // continua de onde parou, com os tipos marcados agora
      const tipos = tiposComPerguntas(tiposAuto);
      estadoAuto = auto ? ajustarTipos(auto, tipos) : iniciarAutomatico(tipos);
      gravarAuto(estadoAuto);
    }
    abrirQuestao(estadoAuto);
    setFase("pergunta");
  };
  // no celular, o toque em começar já abre o teclado para a primeira questão de digitar
  const comecarDoToque = () => avancarNoToque(comecar);
  const recomecarAutomatico = () => {
    const e = iniciarAutomatico(tiposComPerguntas(tiposAuto));
    gravarAuto(e);
  };
  const mudarTiposAuto = (c: Categoria[]) => {
    const tipos = tiposNaOrdem(c);
    setTiposAuto(tipos);
    gravarJSON(CHAVE_AUTOMATICO_TIPOS, tipos);
    // no meio do modo, vale a partir da próxima questão
    if (auto && fase === "pergunta") gravarAuto(ajustarTipos(auto, tiposComPerguntas(tipos)));
  };

  const mudarDescer = (d: boolean) => {
    setDescer(d);
    gravarJSON(CHAVE_AUTOMATICO_DESCER, d);
  };
  const mudarPular = (p: boolean) => {
    setPularAcertos(p);
    gravarJSON(CHAVE_PULAR_ACERTOS, p);
  };

  const aoResponder = (c: Correcao, revisao: Revisao) => {
    if (!pergunta) return;
    const segundos = (performance.now() - inicio) / 1000;
    const n = nivelDaQuestao;
    const pontos = pontuar(n, c.acertou, segundos, janelaSeg(pergunta, n), folgaSeg(pergunta, n));
    const recapitulacao = automatico && !!questaoAuto?.recapitulacao;
    const rodada: Rodada = { pergunta, nivel: n, acertou: c.acertou, segundos, pontos, revisao, ...(recapitulacao ? { recapitulacao } : {}) };
    setRodadas((r) => [...r, rodada]);
    setRespondida(true);
    // o strike
    const r = registrarStrike(strike, c.acertou);
    setStrike(r.estado);
    // no modo foco, cada acerto faz a revoada (no strike, com todas cheias)
    if (foco && c.acertou)
      setRevoada({ id: performance.now(), acertos: r.strike ? tamanhoDoStrike(strike.seguidos) : r.estado.acertos, n: tamanhoDoStrike(strike.seguidos), fez: r.strike });
    if (r.strike) {
      setComemoracao({ total: r.estado.total, tamanho: tamanhoDoStrike(strike.seguidos), proximo: tamanhoDoStrike(r.estado.seguidos) });
      tocar((s) => s.strike());
    } else if (c.acertou) tocar((s) => s.acerto(progressoDoStrike(r.estado)));
    else if (r.perdeu) {
      setPerdeuEm((k) => k + 1);
      tocar((s) => s.perdeu(r.perdeu));
    }
    // o modo automático anda: sobe o nível, passa ao próximo tipo ou chega ao modo final
    if (automatico && auto && questaoAuto) {
      const { estado, avanco: a } = registrarNoAutomatico(auto, questaoAuto, c.acertou, { descer });
      gravarAuto(estado);
      setAvanco(a);
    }
  };

  /** Fim do treino. `lista` é a das respondidas (no modo infinito, a questão em aberto fica de fora). */
  const finalizar = (lista = rodadas) => {
    const total = lista.reduce((s, r) => s + r.pontos, 0);
    // o recorde é por nível e quantidade; o modo infinito não tem recorde (o nível muda no meio e não tem fim)
    let recorde = false;
    if (typeof tamanho === "number" && !automatico) {
      const chave = chaveRecorde(nivel, tamanho);
      recorde = total > (recordes[chave] ?? 0);
      if (recorde) {
        const novos = { ...recordes, [chave]: total };
        setRecordes(novos);
        gravarJSON(CHAVE, novos);
      }
    }
    const erros = lista.filter((r) => !r.acertou).length;
    // muitas questões: a revisão abre nos erros, que é o que importa rever
    setFiltro(lista.length > TAMANHO_TREINO && erros ? "erros" : "todas");
    setMostradas(POR_VEZ);
    setNovoRecorde(recorde);
    setFase("resultado");
  };

  const encerrar = () => (rodadas.length ? finalizar() : setFase("inicio"));

  const aoContinuar = () => {
    if (typeof tamanho === "number" && rodadas.length >= tamanho) return finalizar();
    setIndice((i) => i + 1);
    abrirQuestao(automatico ? auto : null);
  };

  if (fase === "inicio") {
    const fixo = typeof tamanho === "number" ? tamanho : null;
    const tiposDoAuto = tiposComPerguntas(tiposAuto);
    const ondeComeca = auto ? ajustarTipos(auto, tiposDoAuto) : null;
    return (
      <div className={styles.painel}>
        {automatico ? (
          <section className={styles.automatico} aria-labelledby="auto-titulo">
            <h2 id="auto-titulo" className={styles.subtitulo}>
              Modo automático
            </h2>
            <p className={styles.regras}>
              O treino escolhe o tipo e o nível por você. Começa em Peça e fundamento, no Fácil; com 4 acertos nas últimas 5 questões, sobe para o
              Médio e depois para o Difícil. Vencido o Difícil, passa ao próximo tipo: Por dentro da peça, Questões discursivas e Objetivas da 1ª fase.
              Com 3 erros nas últimas 5, desce um nível (se a opção abaixo estiver ligada). No caminho, uma questão em cada 10 (no 2º tipo), 20 (no
              3º) ou 30 (no 4º) recapitula um tipo já vencido, no Difícil. Depois do último tipo vem o modo final: todos se alternam, só no Difícil. O
              modo continua de onde você parou.
            </p>
            <OpcaoDescer valor={descer} onChange={mudarDescer} />
            {ondeComeca && (ondeComeca.etapa > 0 || ondeComeca.nivel > 1) ? (
              <p className={styles.ondeEsta}>
                Você está em: <strong>{ondeEsta(ondeComeca)}</strong>
                <button type="button" className={styles.linkBotao} onClick={recomecarAutomatico}>
                  Recomeçar do Fácil
                </button>
              </p>
            ) : null}
          </section>
        ) : (
          <>
            <h2 className={styles.subtitulo}>Escolha o nível</h2>
            <BotoesNivel valor={nivel} onChange={setNivel} recordes={fixo ? recordes : undefined} tamanho={fixo ?? undefined} />
          </>
        )}
        <fieldset className={styles.tamanhos}>
          <legend>Tipo e nível</legend>
          <div role="group">
            <button type="button" aria-pressed={!automatico} onClick={() => mudarAutomatico(false)}>
              Eu escolho
            </button>
            <button type="button" aria-pressed={automatico} onClick={() => mudarAutomatico(true)} className={styles.infinito}>
              <span aria-hidden>↗</span> Modo automático
            </button>
          </div>
        </fieldset>
        <fieldset className={styles.tamanhos}>
          <legend>Quantas questões</legend>
          <div role="group">
            {TAMANHOS_TREINO.map((t) => (
              <button key={t} type="button" aria-pressed={tamanho === t} onClick={() => mudarTamanho(t)}>
                {t}
              </button>
            ))}
            <button type="button" aria-pressed={infinito} onClick={() => mudarTamanho("infinito")} className={styles.infinito}>
              <span aria-hidden>∞</span> Modo infinito
            </button>
          </div>
          {infinito && (
            <p className={styles.regras}>
              Uma questão atrás da outra, até você encerrar.{" "}
              {automatico ? "O modo automático segue subindo o tipo e o nível." : "Entre uma questão e outra, dá para trocar o nível e os tipos de pergunta."}
            </p>
          )}
        </fieldset>
        <p className={styles.regras}>
          Acertar vale 60 pontos, mais até 40 pela rapidez. Os primeiros {FOLGA_SEG[nivel]} segundos não tiram pontos (13 no Fácil, 15 no Médio e 20 no
          Difícil); na questão longa, esse tempo cresce para um segundo a cada 4 palavras dela. Depois, a bonificação cai aos poucos até zerar, num
          tempo igual ao que não tira pontos (ou maior, no mínimo o de cada tipo de questão). O tempo de cada questão aparece acima dela. O nível
          multiplica os pontos por 1, 1,5 ou 2.{" "}
          {fixo
            ? automatico
              ? `São ${fixo} questões do modo automático, e no fim você revê cada uma; o próximo treino continua de onde este parar.`
              : `São ${fixo} questões sorteadas entre os tipos marcados abaixo, e no fim você revê cada uma.`
            : "No fim você revê cada questão."}{" "}
          Cada acerto
          seguido enche uma bolinha: 10 seguidos fazem um strike. Depois de 3 strikes sem errar, o próximo pede 15; depois de 6, 20; de 12, 25; e
          de 24, 30. O erro apaga as bolinhas.
        </p>
        {automatico ? (
          <SeletorCategorias valor={tiposAuto} onChange={mudarTiposAuto} legenda="Tipos no modo automático (na ordem)" />
        ) : (
          <SeletorCategorias valor={categorias} onChange={mudarCategorias} />
        )}
        <OpcaoPular valor={pularAcertos} onChange={mudarPular} />
        {/* no celular, o botão sobe para o topo do painel (treino.module.css) */}
        <button type="button" className={`btn btn-gold ${styles.comecar}`} onClick={comecarDoToque}>
          {automatico
            ? `${ondeComeca && (ondeComeca.etapa > 0 || ondeComeca.nivel > 1) ? "Continuar o modo automático" : "Começar o modo automático"}${fixo ? ` · ${fixo} questões` : ""}`
            : infinito
              ? "Começar o modo infinito"
              : "Começar treino"}
        </button>
      </div>
    );
  }

  if (fase === "pergunta" && pergunta) {
    const n = indice + 1;
    const ultima = rodadas[rodadas.length - 1];
    const janela = janelaSeg(pergunta, nivelDaQuestao);
    const folga = folgaSeg(pergunta, nivelDaQuestao);
    const pontos = rodadas.reduce((s, r) => s + r.pontos, 0);
    const acertos = rodadas.filter((r) => r.acertou).length;
    const ultimaDoTreino = typeof tamanho === "number" && rodadas.length === tamanho;
    const estadoDoPlacar = comemoracao ? { ...strike, acertos: comemoracao.tamanho, seguidos: Math.max(0, strike.seguidos - 1) } : strike;
    return (
      <>
        <PerguntaCorpo
          key={n}
          pergunta={pergunta}
          nivel={nivelDaQuestao}
          aoResponder={aoResponder}
          rotuloContinuar={ultimaDoTreino ? "Ver resultado" : "Próxima pergunta"}
          continuo
          pularAcerto={pularAcertos}
          aoContinuar={aoContinuar}
          cabecalho={(copiar) => (
            <div className={styles.cabecalho}>
              {/* na comemoração, as bolinhas do strike feito ficam cheias, piscando; no modo foco o strike é o líquido do menu */}
              {!foco && (
                <PlacarStrike estado={estadoDoPlacar} fez={!!comemoracao} perdeuEm={perdeuEm} sons={sons} aoSom={alternarSons} />
              )}
              <div className={styles.topoQuestao}>
                {foco ? (
                  // no modo foco, uma linha só: o número e o tipo (o resto está no menu, no anel e no XP)
                  <p className={styles.linhaFoco}>
                    <strong>Q{n}</strong>&thinsp;·&thinsp;{nomeCategoria(automatico && questaoAuto ? questaoAuto.categoria : pergunta.categorias[0])}
                    {automatico && questaoAuto?.recapitulacao && <small> · recapitulação</small>}
                    {automatico && questaoAuto?.final && <small> · modo final</small>}
                  </p>
                ) : (
                  <p className={styles.eyebrow}>
                    {infinito ? `Questão ${n}` : `Questão ${n} de ${tamanho}`}
                    {automatico ? " · modo automático" : infinito ? " · modo infinito" : ""} · nível {NOME_NIVEL[nivelDaQuestao]}
                  </p>
                )}
                {/* no celular, o copiar e o modo foco vão para a linha do modo automático (treino.module.css) */}
                <div className={styles.controlesFoco}>
                  {foco ? (
                    <>
                      <XpFoco pontos={pontos} acertos={acertos} total={rodadas.length} />
                      <MenuFoco strike={estadoDoPlacar} fez={!!comemoracao} perdeuEm={perdeuEm} inicio={inicio} folga={folga} respondida={respondida}>
                        {copiar("menu")}
                        <SomDoMenu sons={sons} volume={volume} aoSom={alternarSons} aoVolume={mudarVolume} />
                        <AjustesLargura prefs={prefsFoco} onChange={mudarPrefsFoco} />
                        <hr />
                        <ItemMenu icone={<IconeFoco ligado />} onClick={alternarFoco}>
                          Sair do modo foco
                        </ItemMenu>
                      </MenuFoco>
                    </>
                  ) : (
                    <>
                      {copiar("topo")}
                      <button type="button" className={styles.botaoFoco} onClick={alternarFoco} aria-pressed={false} aria-label="Modo foco">
                        <IconeFoco ligado={false} />
                        <span>Modo foco</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
              {foco && automatico && auto && questaoAuto && !questaoAuto.recapitulacao && !questaoAuto.final && (
                <BarrasDoNivel
                  feitos={ACERTOS_PARA_SUBIR - faltamParaSubir(auto)}
                  total={ACERTOS_PARA_SUBIR}
                  nivel={auto.nivel}
                  rotulo={`${NOME_NIVEL[auto.nivel]}: ${ACERTOS_PARA_SUBIR - faltamParaSubir(auto)} de ${ACERTOS_PARA_SUBIR} acertos para subir (${faltamParaSubir(auto) === 1 ? "falta 1" : `faltam ${faltamParaSubir(auto)}`})`}
                />
              )}
              {!foco && automatico && auto && questaoAuto && (
                <p className={styles.situacaoAuto} data-recapitulacao={questaoAuto.recapitulacao ? "1" : undefined}>
                  {questaoAuto.recapitulacao ? (
                    <>
                      <strong>Recapitulação:</strong> {nomeCategoria(questaoAuto.categoria)}, no Difícil. Não sobe nem desce o nível: só confere se você
                      continua acertando.
                    </>
                  ) : questaoAuto.final ? (
                    <>
                      <strong>Modo final</strong> · {nomeCategoria(questaoAuto.categoria)} · todos os tipos se alternam, no Difícil
                    </>
                  ) : (
                    <>
                      <strong>{nomeCategoria(questaoAuto.categoria)}</strong> ·{" "}
                      {respondida
                        ? ondeEsta(auto)
                        : `${faltamParaSubir(auto) === 1 ? "1 acerto sobe" : `${faltamParaSubir(auto)} acertos seguidos sobem`} ${auto.nivel < 3 ? `para o ${NOME_NIVEL[(auto.nivel + 1) as Nivel]}` : auto.etapa + 1 < auto.tipos.length ? `para ${nomeCategoria(auto.tipos[auto.etapa + 1]!)}` : "para o modo final"}`}
                      {!respondida && descer && auto.nivel > 1 && ` · ${faltamParaDescer(auto) === 1 ? "1 erro desce" : `${faltamParaDescer(auto)} erros descem`} para o ${NOME_NIVEL[(auto.nivel - 1) as Nivel]}`}
                      {intervaloDaRecapitulacao(auto) > 0 && ` · recapitulação a cada ${intervaloDaRecapitulacao(auto)}`}
                    </>
                  )}
                </p>
              )}
              {!foco && (semFim || automatico) && rodadas.length > 0 && (
                <p className={styles.placar}>
                  {pontos} pontos · {acertos} de {rodadas.length} acertos
                </p>
              )}
              {!foco && <Tempo key={n} inicio={inicio} limite={janela} folga={folga} ultima={respondida && ultima ? ultima : null} />}
            </div>
          )}
        />
        {revoada && <RevoadaStrike key={revoada.id} acertos={revoada.acertos} n={revoada.n} fez={revoada.fez} />}
        {/* aparece por instantes, por cima da página, e some sozinho: não empurra a questão */}
        {automatico && avanco && (
          <p className={styles.avanco} data-desceu={avanco.tipo === "desceu" ? "1" : undefined} role="status" style={{ "--duracao": `${DURACAO_AVANCO}ms` } as CSSProperties}>
            {textoDoAvanco(avanco)}
          </p>
        )}
        {automatico && (
          <section className={styles.ajustes} aria-label="Ajustes do modo automático">
            <button type="button" className={styles.linkBotao} aria-expanded={ajustes} onClick={() => setAjustes((a) => !a)}>
              {ajustes ? "Fechar ajustes" : `Tirar ou pôr tipos de pergunta (agora: ${tiposAuto.length} ${tiposAuto.length === 1 ? "tipo" : "tipos"})`}
            </button>
            {ajustes && (
              <div className={styles.ajustesCorpo}>
                <SeletorCategorias valor={tiposAuto} onChange={mudarTiposAuto} legenda="Tipos no modo automático (na ordem)" />
                <OpcaoDescer valor={descer} onChange={mudarDescer} />
                <p className={styles.regras}>Vale a partir da próxima questão. Sem o tipo da vez, o modo segue para o próximo, no Fácil.</p>
              </div>
            )}
          </section>
        )}
        {infinito && !automatico && (
          <section className={styles.ajustes} aria-label="Ajustes do modo infinito">
            <button type="button" className={styles.linkBotao} aria-expanded={ajustes} onClick={() => setAjustes((a) => !a)}>
              {ajustes ? "Fechar ajustes" : `Trocar nível ou tipos de pergunta (agora: ${NOME_NIVEL[nivel]}, ${categorias.length} ${categorias.length === 1 ? "tipo" : "tipos"})`}
            </button>
            {ajustes && (
              <div className={styles.ajustesCorpo}>
                <BotoesNivel valor={nivel} onChange={setNivel} compacto />
                <SeletorCategorias valor={categorias} onChange={mudarCategorias} />
                <p className={styles.regras}>{respondida ? "Vale a partir da próxima questão." : "Vale a partir da próxima questão; esta continua como está."}</p>
              </div>
            )}
          </section>
        )}
        {comemoracao && <Comemoracao {...comemoracao} />}
        <div className={styles.opcaoQuestao}>
          <OpcaoPular valor={pularAcertos} onChange={mudarPular} />
        </div>
        <p className={styles.abandonar}>
          {/* sem fim ou no automático (que não tem recorde), dá para parar e ver o resultado; no treino com recorde, só abandonar */}
          {semFim || automatico ? (
            <button type="button" className="btn" onClick={encerrar}>
              {rodadas.length ? `Encerrar e ver o resultado (${rodadas.length} ${rodadas.length === 1 ? "questão" : "questões"})` : "Encerrar"}
            </button>
          ) : (
            <button type="button" className={styles.linkBotao} onClick={() => setFase("inicio")}>
              Abandonar treino (não grava pontos)
            </button>
          )}
        </p>
        {/* modo foco: o rodapé do site some; este, discreto e alto (1/4 da tela ou mais), dá espaço para a tela descer
            até o último campo com o teclado aberto */}
        {foco && (
          <footer className={styles.rodapeFoco}>
            <Logo size={30} title="" />
            <p>
              {SITE.nome} · {SITE.slogan}
            </p>
            <p>Material de estudo independente, sem vínculo com a OAB ou a FGV. Para sair do modo foco, use o menu.</p>
          </footer>
        )}
      </>
    );
  }

  const total = rodadas.reduce((s, r) => s + r.pontos, 0);
  const acertos = rodadas.filter((r) => r.acertou).length;
  const erros = rodadas.length - acertos;
  const media = rodadas.reduce((s, r) => s + r.segundos, 0) / Math.max(1, rodadas.length);
  const porcentagem = Math.round((100 * acertos) / Math.max(1, rodadas.length));
  const niveisUsados = porGrupo(rodadas, (r) => NOME_NIVEL[r.nivel]);
  const tipos = porGrupo(rodadas, (r) => nomeCategoria(r.pergunta.categorias[0]));
  const filtradas = rodadas.map((r, i) => ({ r, n: i + 1 })).filter(({ r }) => filtro === "todas" || (filtro === "erros" ? !r.acertou : r.acertou));
  const muitas = rodadas.length > TAMANHO_TREINO;
  const recapitulacoes = rodadas.filter((r) => r.recapitulacao);
  return (
    <div className={styles.painel}>
      <p className={styles.eyebrow}>
        Resultado ·{" "}
        {automatico && auto
          ? `${rodadas.length} ${rodadas.length === 1 ? "questão" : "questões"} · modo automático · agora em ${ondeEsta(auto)}`
          : infinito
            ? `modo infinito · ${niveisUsados.map((g) => g.nome).join(", ")}`
            : `${rodadas.length} questões · nível ${NOME_NIVEL[nivel]}`}
      </p>
      <p className={styles.total}>
        {total} <span>{semFim || automatico ? "pontos" : `de ${maximoTreino(nivel, rodadas.length)} pontos`}</span>
      </p>
      {novoRecorde && <p className="badge badge-gold">Novo recorde com {rodadas.length} questões neste nível!</p>}
      <dl className={styles.numeros}>
        <div>
          <dt>Acertos</dt>
          <dd>
            {acertos} de {rodadas.length} <small>({porcentagem}%)</small>
          </dd>
        </div>
        <div>
          <dt>Tempo médio</dt>
          <dd>{fmt(media)}</dd>
        </div>
        <div>
          <dt>Maior sequência</dt>
          <dd>
            {melhorSequencia(rodadas)} {melhorSequencia(rodadas) === 1 ? "acerto" : "acertos"}
          </dd>
        </div>
        <div>
          <dt>Strikes</dt>
          <dd>{strike.total ? `★ ${strike.total}` : "nenhum"}</dd>
        </div>
        {recapitulacoes.length > 0 && (
          <div>
            <dt>Recapitulações</dt>
            <dd>
              {recapitulacoes.filter((r) => r.acertou).length} de {recapitulacoes.length} certas
            </dd>
          </div>
        )}
      </dl>
      {/* com mais questões, o acerto por tipo (e por nível, se mudou no meio) mostra onde está o ponto fraco */}
      {(muitas || semFim || automatico) && (tipos.length > 1 || niveisUsados.length > 1) && (
        <div className={styles.grupos}>
          {[...(niveisUsados.length > 1 ? [{ titulo: "Por nível", lista: niveisUsados }] : []), ...(tipos.length > 1 ? [{ titulo: "Por tipo de pergunta", lista: tipos }] : [])].map(
            ({ titulo, lista }) => (
              <section key={titulo}>
                <h3>{titulo}</h3>
                <ul>
                  {lista.map((g) => (
                    <li key={g.nome}>
                      <span>{g.nome}</span>
                      <span className={styles.barra} style={{ "--p": `${(100 * g.acertos) / g.total}%` } as CSSProperties} aria-hidden />
                      <span>
                        {g.acertos} de {g.total}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ),
          )}
        </div>
      )}
      <section className={styles.revisao} aria-labelledby="revisao-titulo">
        <h2 id="revisao-titulo" className={styles.subtitulo}>
          Reveja as questões
        </h2>
        <p className={styles.regras}>Cada uma abre com o enunciado, as alternativas e a correção.</p>
        {muitas && (
          <div className={styles.filtros} role="group" aria-label="Quais questões mostrar">
            {(
              [
                ["todas", `Todas (${rodadas.length})`],
                ["erros", `Erros (${erros})`],
                ["acertos", `Acertos (${acertos})`],
              ] as [Filtro, string][]
            ).map(([id, rotulo]) => (
              <button
                key={id}
                type="button"
                aria-pressed={filtro === id}
                onClick={() => {
                  setFiltro(id);
                  setMostradas(POR_VEZ);
                }}
              >
                {rotulo}
              </button>
            ))}
          </div>
        )}
        {filtradas.length ? (
          <ol className={styles.rodadas}>
            {filtradas.slice(0, mostradas).map(({ r, n }) => (
              <RodadaRevista key={`${n}-${r.pergunta.id}`} n={n} rodada={r} comNivel={niveisUsados.length > 1} />
            ))}
          </ol>
        ) : (
          <p className={styles.regras}>{filtro === "erros" ? "Nenhum erro. Parabéns!" : "Nenhum acerto desta vez."}</p>
        )}
        {filtradas.length > mostradas && (
          <button type="button" className="btn" onClick={() => setMostradas((m) => m + POR_VEZ)}>
            Mostrar mais {Math.min(POR_VEZ, filtradas.length - mostradas)} de {filtradas.length - mostradas}
          </button>
        )}
      </section>
      <div className={styles.acoes}>
        <button type="button" className="btn btn-gold" onClick={comecarDoToque}>
          {automatico ? "Continuar o modo automático" : infinito ? "Jogar o modo infinito de novo" : "Treinar de novo"}
        </button>
        <button type="button" className="btn" onClick={() => setFase("inicio")}>
          Mudar nível ou quantidade
        </button>
        <Link href="/jogos/" className="btn">
          Voltar aos jogos
        </Link>
      </div>
    </div>
  );
}
