"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SITE } from "@/config/site";
import { type CSSProperties, useEffect, useId, useRef, useState } from "react";
import { lerJSON, gravarJSON } from "@/lib/storage";
import { palavrasDe } from "@/lib/fala/comandos-voz";
import { Escuta, escutaDisponivel, type EstadoEscuta, type Sensibilidade } from "@/lib/fala/escuta";
import { useTelaAcesa } from "@/lib/tela-acesa";
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
import { avancarNoToque, ehToque, focarCampoDaQuestao, PerguntaCorpo, QuestaoRevista, type Revisao, type TratadorVoz } from "@/quiz/PerguntaCorpo";
import { FOLGA_SEG, folgaSeg, janelaSeg, maximoTreino, NOME_NIVEL, pontuar, TAMANHO_TREINO, TAMANHOS_TREINO } from "@/quiz/pontuacao";
import {
  chaveDoModo,
  gravarSessao,
  guardarRodada,
  lerRecordes,
  linhaDaRodada,
  type ModoTreino,
  type Recordes,
  type Rodada,
  type Tamanho,
} from "@/quiz/recordes";
import { SeletorCategorias } from "@/quiz/SeletorCategorias";
import { SonsDoTreino } from "@/quiz/sons";
import { progressoDoStrike, registrarStrike, STRIKE_ZERO, tamanhoDoStrike, type EstadoStrike } from "@/quiz/strike";
import type { Categoria, Nivel, Pergunta } from "@/quiz/types";
import type { Correcao } from "@/quiz/verificar";
import { artigosParaLer } from "@/quiz/artigosFalados";
import { correcaoFalada, desbloquearVoz, leituraDisponivel, Locutor, textosDaQuestao, type LeituraDaQuestao, type VozDoOuvir } from "@/quiz/locutor";
import { comandoDeLeitura, dicaDaVoz, interpretarResposta, pareceEco, type ContextoVoz } from "@/quiz/voz";
import { BarrasDoNivel, DURACAO_REVOADA, ItemMenu, MenuFoco, RevoadaStrike, SomDoMenu, XpFoco } from "./MenuFoco";
import { fmt, ResultadoTreino } from "./ResultadoTreino";
import { IconeMicrofone, LinhaDaVoz, OpcaoVoz, type Ouvido } from "./RespostaFalada";
import { AvisoRecorde, SeuRecorde } from "./SeuRecorde";
import { Comemoracao, DURACAO_COMEMORACAO, fraseDoStrike, PlacarStrike } from "./Strike";
import styles from "./treino.module.css";

type Fase = "inicio" | "pergunta" | "resultado";
// quantas questões (Tamanho, em recordes.ts): um número fixo ou "infinito" (uma atrás da outra, até o usuário
// encerrar). O modo automático (o tipo e o nível escolhidos conforme o aluno acerta: src/quiz/automatico.ts) vale com
// qualquer um dos dois.

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

// os recordes ficam em grifo:treino e grifo:treino:recordes (src/quiz/recordes.ts)
const CHAVE_TAMANHO = "grifo:treino:tamanho";
/** o modo automático continua de onde parou: o tipo, o nível e os últimos resultados */
const CHAVE_AUTOMATICO = "grifo:treino:automatico";
const CHAVE_AUTOMATICO_TIPOS = "grifo:treino:automatico:tipos";
const CHAVE_AUTOMATICO_DESCER = "grifo:treino:automatico:descer";
const CHAVE_PULAR_ACERTOS = "grifo:treino:pularAcertos";
/** se o modo automático está ligado (o progresso dele fica em CHAVE_AUTOMATICO, de um treino para o outro) */
const CHAVE_AUTOMATICO_LIGADO = "grifo:treino:automatico:ligado";
const CHAVE_SONS = "grifo:treino:sons";
/** responder falando (o microfone ouve durante as questões) */
const CHAVE_VOZ = "grifo:treino:voz";
/** respondendo falando, a questão é lida em voz alta (e a correção, depois da resposta) */
const CHAVE_VOZ_LER = "grifo:treino:voz:ler";
/** o microfone e a sensibilidade escolhidos no Ouvir (a leitura em voz alta das leis) valem também aqui */
const CHAVE_OUVIR = "grifo:leitor:ouvir";
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

/** O ícone de voltar à questão anterior: uma seta curva para trás. */
function IconeAnterior() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </svg>
  );
}

/**
 * A questão anterior, como ficou depois de respondida, numa janela por cima da atual (o tempo da atual continua). Fecha
 * no botão, no Esc ou num toque fora; o foco volta para onde estava.
 */
function RespostaAnterior({ n, rodada, aoFechar }: { n: number; rodada: Rodada; aoFechar: () => void }) {
  const janela = useRef<HTMLDialogElement>(null);
  const titulo = useId();
  // sem fechar na limpeza: o "close" avisaria aoFechar (em desenvolvimento o efeito roda duas vezes); a janela sai junto
  // com o componente
  useEffect(() => {
    const d = janela.current;
    if (d && !d.open) d.showModal();
  }, []);
  const p = rodada.pergunta;
  return (
    <dialog
      ref={janela}
      className={styles.anterior}
      aria-labelledby={titulo}
      onClose={aoFechar}
      onClick={(e) => {
        if (e.target === e.currentTarget) janela.current?.close();
      }}
    >
      <div className={styles.anteriorCorpo}>
        <header className={styles.anteriorTopo}>
          <h2 id={titulo}>
            Q{n} · {rodada.acertou ? "✓ Acerto" : "✗ Erro"}
            <small>
              {nomeCategoria(p.categorias[0])} · {NOME_NIVEL[rodada.nivel]} · {rodada.pontos} pts
            </small>
          </h2>
          <button type="button" className="btn" onClick={() => janela.current?.close()} autoFocus>
            Voltar à Q{n + 1}
          </button>
        </header>
        <QuestaoRevista pergunta={p} nivel={rodada.nivel} revisao={rodada.revisao} />
      </div>
    </dialog>
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
              Recorde: {recordes.modos[chaveDoModo({ automatico: false, tamanho, nivel: x.n })]?.pontos.toLocaleString("pt-BR") ?? "—"} de{" "}
              {maximoTreino(x.n, tamanho).toLocaleString("pt-BR")}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Treino() {
  const [fase, setFase] = useState<Fase>("inicio");
  const [nivel, setNivel] = useState<Nivel>(1);
  const [tamanho, setTamanho] = useState<Tamanho>("infinito");
  const [categorias, setCategorias] = useState<Categoria[]>(CATEGORIAS_PADRAO);
  const [recordes, setRecordes] = useState<Recordes>({ modos: {} });
  const [rodadas, setRodadas] = useState<Rodada[]>([]);
  const [indice, setIndice] = useState(0);
  const [pergunta, setPergunta] = useState<Pergunta | null>(null);
  // o nível da questão na tela: no modo infinito, `nivel` pode mudar e vale a partir da próxima
  const [nivelDaQuestao, setNivelDaQuestao] = useState<Nivel>(1);
  const [inicio, setInicio] = useState(0);
  const [respondida, setRespondida] = useState(false);
  // o que o treino que acabou fez com os recordes; `conta`: valeu para o recorde de pontos (na quantidade fixa, completo)
  const [novoRecorde, setNovoRecorde] = useState({ pontos: false, sequencia: false, conta: true });
  // a sessão em andamento: o id (o da página final guardada, se ela fizer recorde), o começo e o modo
  const [sessao, setSessao] = useState<{ id: string; inicio: number; modo: ModoTreino }>({ id: "", inicio: 0, modo: { automatico: true, tamanho: "infinito", nivel: 1 } });
  const [ajustes, setAjustes] = useState(false);
  const vistas = useRef(new Set<string>());
  const infinito = tamanho === "infinito";
  const [automatico, setAutomatico] = useState(true);
  // sem número de questões: termina quando o aluno encerra (o recorde é gravado a cada resposta)
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
  const [pularAcertos, setPularAcertos] = useState(true);
  // o strike: bolinhas por acerto seguido; o erro apaga tudo
  const [strike, setStrike] = useState<EstadoStrike>(STRIKE_ZERO);
  const [perdeuEm, setPerdeuEm] = useState(0);
  const [comemoracao, setComemoracao] = useState<{ total: number; tamanho: number; proximo: number; frase: string; origem: { x: number; y: number } | null } | null>(null);
  const ultimaFrase = useRef<string | undefined>(undefined);
  // a questão anterior, respondida, aberta por cima da atual (menu do modo foco ou o caso arrastado para a direita)
  const [verAnterior, setVerAnterior] = useState(false);
  const [sons, setSons] = useState(true);
  // responder falando: ligado, o microfone ouve durante as questões; a questão da vez trata cada frase (vozRef)
  const [voz, setVoz] = useState(false);
  const [podeFalar, setPodeFalar] = useState(false);
  const [estadoEscuta, setEstadoEscuta] = useState<EstadoEscuta>("desligada");
  const [ouvido, setOuvido] = useState<Ouvido | null>(null);
  const vozRef = useRef<TratadorVoz | null>(null);
  // a leitura em voz alta da questão: com a voz do Ouvir; a última questão lida fica para o "repetir"
  const [lerQuestoes, setLerQuestoes] = useState(true);
  const [podeLer, setPodeLer] = useState(false);
  const [lendoQuestao, setLendoQuestao] = useState(false);
  const locutor = useRef<Locutor | null>(null);
  const leitura = useRef<LeituraDaQuestao | null>(null);
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
    setRecordes(lerRecordes());
    setCategorias(lerJSON<Categoria[]>(CHAVE_CATEGORIAS, CATEGORIAS_PADRAO));
    // padrão: infinito, com o automático e o pulo do acerto ligados. "automatico" já foi uma quantidade: vira o infinito
    const t = lerJSON<Tamanho | "automatico">(CHAVE_TAMANHO, "infinito");
    setTamanho(t === "infinito" || t === "automatico" ? "infinito" : (TAMANHOS_TREINO as readonly number[]).includes(t) ? t : TAMANHO_TREINO);
    setAutomatico(lerJSON<boolean>(CHAVE_AUTOMATICO_LIGADO, true));
    setTiposAuto(tiposNaOrdem(lerJSON<Categoria[]>(CHAVE_AUTOMATICO_TIPOS, ORDEM_AUTOMATICO)));
    setAuto(lerAutomatico(lerJSON<unknown>(CHAVE_AUTOMATICO, null)));
    setSons(lerJSON<boolean>(CHAVE_SONS, true));
    setVoz(lerJSON<boolean>(CHAVE_VOZ, false));
    setPodeFalar(escutaDisponivel());
    setLerQuestoes(lerJSON<boolean>(CHAVE_VOZ_LER, true));
    setPodeLer(leituraDisponivel());
    const v = lerJSON<number>(CHAVE_VOLUME, 1);
    setVolume(typeof v === "number" && v >= 0 && v <= 1 ? v : 1);
    setDescer(lerJSON<boolean>(CHAVE_AUTOMATICO_DESCER, true));
    setPularAcertos(lerJSON<boolean>(CHAVE_PULAR_ACERTOS, true));
    setPrefsFoco(lerPrefsFoco(lerJSON<Partial<PrefsFoco> | null>(CHAVE_FOCO, null)));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // respondendo falando: o microfone ouve durante as questões
  const falando = voz && podeFalar && fase === "pergunta";
  const mudarVoz = (v: boolean) => {
    setVoz(v);
    setOuvido(null);
    gravarJSON(CHAVE_VOZ, v);
    // no toque: no iPhone, a primeira fala precisa sair dentro dele
    if (v && lerQuestoes) desbloquearVoz();
    if (!v) locutor.current?.parar();
    // ligada no meio de uma questão ainda sem resposta: ela é lida
    if (v && lerQuestoes && podeLer && fase === "pergunta" && !respondida && leitura.current) obterLocutor().ler(textosDaQuestao(leitura.current));
  };
  const mudarLer = (v: boolean) => {
    setLerQuestoes(v);
    gravarJSON(CHAVE_VOZ_LER, v);
    if (v) desbloquearVoz();
    else locutor.current?.parar();
    if (v && voz && podeFalar && fase === "pergunta" && !respondida && leitura.current) obterLocutor().ler(textosDaQuestao(leitura.current));
  };
  /** O locutor da questão, criado na primeira leitura, com a voz, a velocidade e o volume do Ouvir. */
  const obterLocutor = () => {
    if (!locutor.current) {
      locutor.current = new Locutor(setLendoQuestao);
      locutor.current.configurar(lerJSON<VozDoOuvir>(CHAVE_OUVIR, {}));
    }
    return locutor.current;
  };
  useEffect(() => () => locutor.current?.fechar(), []);
  // a questão da vez (para o que foi agendado numa questão não valer na seguinte) e a última fala ouvida
  const questaoDaVez = useRef(0);
  const ultimaFala = useRef(0);
  const esperaDoErro = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ultimaCorrecao = useRef<{ pergunta: Pergunta; correcao: Correcao } | null>(null);
  const continuarRef = useRef<() => void>(() => {});
  const lendoEmVoz = falando && lerQuestoes && podeLer;
  /** A questão que abre é lida (ao chegar sozinha, pelo "próxima" ou pelo botão). */
  const lerQuestao = (l: LeituraDaQuestao) => {
    leitura.current = l;
    if (lendoEmVoz) obterLocutor().ler(textosDaQuestao(l));
  };
  /** Segue para a próxima questão, se a pessoa ainda está na mesma (não foi adiante pelo botão ou pela voz). */
  const seguirSozinho = (q: number) => {
    if (questaoDaVez.current === q) continuarRef.current();
  };
  /**
   * Respondida, a correção é dita. No acerto, segue sozinho para a próxima ao terminar. No erro, depois de dizer o
   * certo e o errado, espera 2 s: sem nada dito, lê o artigo certo e o errado e segue; falando, a pessoa conduz
   * ("próxima", "ler os artigos").
   */
  const falarCorrecao = (p: Pergunta, c: Correcao) => {
    const q = questaoDaVez.current;
    ultimaCorrecao.current = { pergunta: p, correcao: c };
    const loc = obterLocutor();
    if (c.acertou) return loc.ler([correcaoFalada(p, c)], { aoFim: () => seguirSozinho(q) });
    loc.ler([correcaoFalada(p, c)], {
      aoFim: () => {
        const fim = Date.now();
        esperaDoErro.current = setTimeout(() => {
          if (questaoDaVez.current !== q || ultimaFala.current > fim) return;
          void artigosParaLer(p, c).then((textos) => {
            if (questaoDaVez.current !== q || ultimaFala.current > fim) return;
            if (!textos.length) return seguirSozinho(q);
            obterLocutor().ler(textos, { aoFim: () => seguirSozinho(q) });
          });
        }, 2000);
      },
    });
  };
  // Uma escuta só, de uma questão para a outra (ligar o microfone a cada questão perderia o começo da fala). A frase
  // final vai para a questão da vez; a parcial só aparece na linha do microfone.
  useEffect(() => {
    if (!falando) return;
    const prefs = lerJSON<{ microfone?: string; sensibilidade?: Sensibilidade }>(CHAVE_OUVIR, {});
    const tratadas = new Set<string>();
    // "repetir", "ler as alternativas", "ler os artigos" e "parar": a leitura da questão
    const comandoDaLeitura = (cmd: NonNullable<ReturnType<typeof comandoDeLeitura>>, texto: string) => {
      const loc = locutor.current;
      if (cmd === "parar") {
        loc?.parar(true);
        return setOuvido({ texto, final: true, retorno: { entendeu: true, texto: "Leitura parada." } });
      }
      if (cmd === "artigos") {
        const u = ultimaCorrecao.current;
        if (!u) return setOuvido({ texto, final: true, retorno: { entendeu: true, texto: "Responda primeiro: depois da correção, os artigos são lidos." } });
        setOuvido({ texto, final: true, retorno: { entendeu: true, texto: "Lendo os artigos." } });
        void artigosParaLer(u.pergunta, u.correcao).then((textos) => {
          if (!textos.length) return setOuvido({ texto, final: true, retorno: { entendeu: true, texto: "Não há artigo do Vade Mecum para ler nesta questão." } });
          if (!locutor.current) {
            locutor.current = new Locutor(setLendoQuestao);
            locutor.current.configurar(lerJSON<VozDoOuvir>(CHAVE_OUVIR, {}));
          }
          locutor.current.ler(textos);
        });
        return;
      }
      const l = leitura.current;
      if (!l) return;
      const lista = textosDaQuestao(l, cmd === "alternativas" ? "alternativas" : "tudo");
      if (!lista.length) return setOuvido({ texto, final: true, retorno: { entendeu: true, texto: "Esta questão não tem alternativas: é de digitar." } });
      if (!locutor.current) {
        locutor.current = new Locutor(setLendoQuestao);
        locutor.current.configurar(lerJSON<VozDoOuvir>(CHAVE_OUVIR, {}));
      }
      locutor.current.ler(lista);
      setOuvido({ texto, final: true, retorno: { entendeu: true, texto: cmd === "alternativas" ? "Lendo as alternativas." : "Lendo a questão de novo." } });
    };
    const escuta = new Escuta(
      (alternativas, final, id) => {
        if (tratadas.has(id)) return;
        // enquanto a voz lê, o microfone pode estar ouvindo a própria leitura: só os comandos dela valem. Logo depois de
        // ela parar, o eco do fim ainda pode chegar: o que repete o que ela acabou de ler fica de fora, o resto vale
        const lendo = !!locutor.current?.lendo;
        const eco = !!locutor.current?.ocupado && pareceEco(palavrasDe(alternativas[0]!), locutor.current.recentes());
        if (!final) {
          if (lendo || eco) return;
          // a pessoa começou a falar (depois do erro, a leitura dos artigos espera por ela)
          ultimaFala.current = Date.now();
          return setOuvido({ texto: alternativas[0]!, final: false });
        }
        tratadas.add(id);
        if (eco) return;
        ultimaFala.current = Date.now();
        const cmd = comandoDeLeitura(alternativas);
        if (cmd) return comandoDaLeitura(cmd, alternativas[0]!);
        if (lendo) {
          // lendo a correção, "próxima" segue (a correção não diz "próxima": não há eco dela); e "desligar o microfone" vale sempre
          const geral = interpretarResposta(alternativas, { tipo: "respondida" })?.tipo;
          if (geral !== "proxima" && geral !== "desligar") return;
          locutor.current?.parar(true);
        }
        const retorno = vozRef.current?.(alternativas) ?? { entendeu: false, texto: "" };
        setOuvido({ texto: alternativas[0]!, final: true, retorno });
        if (retorno.desligar) {
          setVoz(false);
          gravarJSON(CHAVE_VOZ, false);
        }
      },
      setEstadoEscuta,
      { microfone: prefs.microfone ?? "auto", sensibilidade: prefs.sensibilidade ?? "alta" },
    );
    escuta.ligar();
    return () => {
      escuta.desligar();
      locutor.current?.parar();
      if (esperaDoErro.current) clearTimeout(esperaDoErro.current);
      esperaDoErro.current = null;
    };
  }, [falando]);
  // respondendo falando, a tela do celular não apaga
  useTelaAcesa(falando);

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
    // o que estava agendado para a questão anterior (seguir sozinho, ler os artigos) não vale mais
    questaoDaVez.current++;
    if (esperaDoErro.current) clearTimeout(esperaDoErro.current);
    esperaDoErro.current = null;
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
    setOuvido(null);
  };

  const comecar = () => {
    vistas.current = new Set();
    setRodadas([]);
    setIndice(0);
    setNovoRecorde({ pontos: false, sequencia: false, conta: true });
    setSessao({ id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, inicio: Date.now(), modo: { automatico, tamanho, nivel } });
    setAjustes(false);
    setStrike(STRIKE_ZERO);
    setPerdeuEm(0);
    setAvanco(null);
    // respondendo falando, a questão é lida: no iPhone, a primeira fala sai dentro do toque em Começar
    if (voz && lerQuestoes) desbloquearVoz();
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
  // no celular, o toque em começar já abre o teclado para a primeira questão de digitar (respondendo falando, não)
  const comecarDoToque = () => (voz && podeFalar ? comecar() : avancarNoToque(comecar));
  // continuar o modo automático já abre no modo foco (a tela cheia precisa do clique: vai aqui, não num efeito)
  const continuarNoFoco = () => {
    void document.documentElement.requestFullscreen?.().catch(() => {});
    setFoco(true);
    comecarDoToque();
  };
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

  /** O strike saiu (de `antes` para `depois`): a comemoração, com a explosão saindo do menu no modo foco, e a fanfarra. */
  const comemorar = (antes: EstadoStrike, depois: EstadoStrike) => {
    const menu = foco ? document.querySelector("[data-menu-foco]")?.getBoundingClientRect() : null;
    const frase = fraseDoStrike(ultimaFrase.current);
    ultimaFrase.current = frase;
    setComemoracao({
      total: depois.total,
      tamanho: tamanhoDoStrike(antes.seguidos),
      proximo: tamanhoDoStrike(depois.seguidos),
      frase,
      origem: menu ? { x: menu.left + menu.width / 2, y: menu.top + menu.height / 2 } : null,
    });
    tocar((s) => s.strike());
  };

  /**
   * Grava a sessão nos recordes que ela bateu (de pontos no modo e da maior sequência de acertos), com a página final.
   * Na quantidade fixa, só o treino completo conta para o recorde de pontos.
   */
  const guardarNosRecordes = (lista: Rodada[], strikes: number, estadoAuto: EstadoAutomatico | null) => {
    const { id, inicio: comeco, modo } = sessao;
    const conta = modo.tamanho === "infinito" || lista.length >= modo.tamanho;
    const r = gravarSessao(
      {
        v: 1,
        id,
        chave: chaveDoModo(modo),
        ...modo,
        inicio: comeco,
        fim: Date.now(),
        ...(modo.automatico && estadoAuto ? { ondeAuto: ondeEsta(estadoAuto) } : {}),
        strikes,
        rodadas: lista.map(guardarRodada),
      },
      conta,
    );
    if (r.pontos || r.sequencia) setRecordes(lerRecordes());
    return { ...r, conta };
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
    // no modo foco, cada acerto faz a revoada; no strike, as bolinhas explodem a partir do menu (na comemoração)
    if (foco && c.acertou && !r.strike) setRevoada({ id: performance.now(), acertos: r.estado.acertos, n: tamanhoDoStrike(strike.seguidos), fez: false });
    if (r.strike) comemorar(strike, r.estado);
    else if (c.acertou) tocar((s) => s.acerto(progressoDoStrike(r.estado)));
    else if (r.perdeu) {
      setPerdeuEm((k) => k + 1);
      tocar((s) => s.perdeu(r.perdeu));
    }
    // o modo automático anda: sobe o nível, passa ao próximo tipo ou chega ao modo final
    let estadoAuto = auto;
    if (automatico && auto && questaoAuto) {
      const { estado, avanco: a } = registrarNoAutomatico(auto, questaoAuto, c.acertou, { descer });
      gravarAuto(estado);
      setAvanco(a);
      estadoAuto = estado;
    }
    // no modo infinito, o recorde vai sendo gravado a cada resposta: fechar a página no meio não o perde
    if (sessao.modo.tamanho === "infinito") guardarNosRecordes([...rodadas, rodada], r.estado.total, estadoAuto);
    // respondendo falando, com a leitura: a correção dita, e a próxima questão vem sozinha
    if (lendoEmVoz) falarCorrecao(pergunta, c);
  };

  /** Fim do treino. `lista` é a das respondidas (no modo infinito, a questão em aberto fica de fora). */
  const finalizar = (lista = rodadas) => {
    setNovoRecorde(guardarNosRecordes(lista, strike.total, auto));
    setFase("resultado");
  };

  const encerrar = () => (rodadas.length ? finalizar() : setFase("inicio"));

  const aoContinuar = () => {
    if (typeof tamanho === "number" && rodadas.length >= tamanho) return finalizar();
    setIndice((i) => i + 1);
    setVerAnterior(false);
    abrirQuestao(automatico ? auto : null);
  };
  // quem segue sozinho (depois da correção dita) usa o de agora: com as respostas e o modo automático atualizados
  useEffect(() => {
    continuarRef.current = aoContinuar;
  });

  if (fase === "inicio") {
    const fixo = typeof tamanho === "number" ? tamanho : null;
    const tiposDoAuto = tiposComPerguntas(tiposAuto);
    const ondeComeca = auto ? ajustarTipos(auto, tiposDoAuto) : null;
    const continua = automatico && !!ondeComeca && (ondeComeca.etapa > 0 || ondeComeca.nivel > 1);
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
        <OpcaoVoz valor={voz} onChange={mudarVoz} disponivel={podeFalar} ler={lerQuestoes} aoLer={mudarLer} podeLer={podeLer} />
        {/* no celular, o botão sobe para o topo do painel (treino.module.css) */}
        <button type="button" className={`btn btn-gold ${styles.comecar}`} onClick={continua ? continuarNoFoco : comecarDoToque}>
          {automatico
            ? `${continua ? "Continuar o modo automático" : "Começar o modo automático"}${fixo ? ` · ${fixo} questões` : ""}`
            : infinito
              ? "Começar o modo infinito"
              : "Começar treino"}
        </button>
        {/* logo abaixo do botão: o recorde do modo escolhido, com a página final dele */}
        <SeuRecorde recordes={recordes} chave={chaveDoModo({ automatico, tamanho, nivel })} />
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
    // a questão anterior já respondida (a atual, respondida, já está na tela)
    const anterior = indice > 0 ? rodadas[indice - 1] : undefined;
    const estadoDoPlacar = comemoracao ? { ...strike, acertos: comemoracao.tamanho, seguidos: Math.max(0, strike.seguidos - 1) } : strike;
    // o que dizer nesta questão (a linha do microfone)
    const ctxVoz: ContextoVoz = respondida
      ? { tipo: "respondida" }
      : pergunta.formato === "objetiva" || nivelDaQuestao === 1
        ? { tipo: "alternativas", textos: [], pecas: pergunta.formato === "peca" }
        : pergunta.formato === "peca"
          ? { tipo: "peca", peca: "", fundamento: "" }
          : { tipo: "tese", comArtigo: nivelDaQuestao === 3, tese: "", artigo: "" };
    return (
      <>
        <PerguntaCorpo
          key={n}
          pergunta={pergunta}
          nivel={nivelDaQuestao}
          aoResponder={aoResponder}
          rotuloContinuar={ultimaDoTreino ? "Ver resultado" : "Próxima pergunta"}
          continuo
          // respondendo falando, o acerto segue sozinho: com a leitura, depois do "Correto!" (quem segue é o Treino)
          pularAcerto={falando ? !lendoEmVoz : pularAcertos}
          aoContinuar={aoContinuar}
          aoDeslizarCaso={anterior ? () => setVerAnterior(true) : undefined}
          vozRef={falando ? vozRef : undefined}
          aoLerQuestao={lerQuestao}
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
                      <XpFoco pontos={pontos} acertos={acertos} total={rodadas.length} strikes={strike.total} novo={!!comemoracao} />
                      <MenuFoco strike={estadoDoPlacar} fez={!!comemoracao} perdeuEm={perdeuEm} inicio={inicio} folga={folga} respondida={respondida}>
                        {copiar("menu")}
                        <ItemMenu icone={<IconeAnterior />} onClick={() => setVerAnterior(true)} disabled={!anterior} data-fecha-menu>
                          {anterior ? `Ver a resposta da Q${n - 1}` : "Ver a resposta anterior"}
                        </ItemMenu>
                        <SomDoMenu sons={sons} volume={volume} aoSom={alternarSons} aoVolume={mudarVolume} />
                        {podeFalar && (
                          <ItemMenu icone={<IconeMicrofone riscado={!voz} />} aria-pressed={voz} onClick={() => mudarVoz(!voz)}>
                            {voz ? "Responder falando: ligado" : "Responder falando"}
                          </ItemMenu>
                        )}
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
              {falando && (
                <LinhaDaVoz
                  estado={estadoEscuta}
                  ouvido={ouvido}
                  dica={dicaDaVoz(ctxVoz)}
                  depois={respondida ? dicaDaVoz(ctxVoz) : undefined}
                  lendo={lendoQuestao}
                  aoDesligar={() => mudarVoz(false)}
                />
              )}
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
        {verAnterior && anterior && <RespostaAnterior
            n={n - 1}
            rodada={anterior}
            aoFechar={() => {
              setVerAnterior(false);
              // de volta à questão da vez, para seguir digitando
              if (!respondida) requestAnimationFrame(focarCampoDaQuestao);
            }}
          />}
        <div className={styles.opcaoQuestao}>
          <OpcaoPular valor={pularAcertos} onChange={mudarPular} />
          <OpcaoVoz valor={voz} onChange={mudarVoz} disponivel={podeFalar} ler={lerQuestoes} aoLer={mudarLer} podeLer={podeLer} />
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

  return (
    <ResultadoTreino
      linhas={rodadas.map(linhaDaRodada)}
      modo={sessao.modo}
      strikes={strike.total}
      onde={sessao.modo.automatico && auto ? `agora em ${ondeEsta(auto)}` : undefined}
      aviso={<AvisoRecorde recordes={recordes} chave={chaveDoModo(sessao.modo)} sessao={sessao.id} novo={novoRecorde} conta={novoRecorde.conta} />}
      acoes={
        <>
          <button type="button" className="btn btn-gold" onClick={automatico ? continuarNoFoco : comecarDoToque}>
            {automatico ? "Continuar o modo automático" : infinito ? "Jogar o modo infinito de novo" : "Treinar de novo"}
          </button>
          <button type="button" className="btn" onClick={() => setFase("inicio")}>
            Mudar nível ou quantidade
          </button>
          <Link href="/jogos/" className="btn">
            Voltar aos jogos
          </Link>
        </>
      }
    />
  );
}
