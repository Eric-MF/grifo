"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Citado } from "@/components/Citacoes";
import { linkContato } from "@/config/site";
import { contextoCorrecao } from "@/lib/correcao/cliente";
import { atualizarConquistas, registrarArtigo, registrarResposta } from "@/lib/conquistas";
import { eventosDeDispositivos, registrar as registrarErros } from "@/lib/erros";
import { alternativas, opcoesDoItem, registrarResultado } from "./banco";
import { nomeCategoria } from "./categorias";
import { copiarTexto, textoParaCopiar, textoResposta } from "./copiar";
import { LETRAS, type Letra, type Nivel, type Pergunta, type PerguntaItem, type PerguntaObjetiva, type PerguntaPeca } from "./types";
import { corrigirItem, corrigirObjetiva, corrigirResposta, type Correcao } from "./verificar";
import styles from "./quiz.module.css";

interface Props {
  pergunta: Pergunta;
  nivel: Nivel;
  cabecalho?: ReactNode;
  aoResponder?: (c: Correcao) => void;
  rotuloContinuar: string;
  aoContinuar: (c: Correcao) => void;
  /** instante (performance.now) a partir do qual as alternativas podem ser tocadas; sem isso, sempre podem */
  liberadaEm?: () => number;
}

function registrarArtigos(p: Pergunta, c: Correcao) {
  const lex = contextoCorrecao().lex;
  if (p.formato === "peca" && c.formato === "peca") {
    const acertouArtigo = (c.acertouFundamento ?? c.acertouPeca) ? 1 : 0;
    registrarErros(eventosDeDispositivos(p.resposta.fundamentos, acertouArtigo, "quiz", lex, { q: p.id }));
  } else if (p.formato !== "peca") {
    registrarErros(eventosDeDispositivos(p.dispositivos, c.acertou ? 1 : 0, p.formato === "objetiva" ? "objetiva" : "discursiva", lex, { q: p.id }));
  }
}

/**
 * Clique numa alternativa responde a questão, mas um arraste sobre o botão (para selecionar o texto dele)
 * não: o mouse precisa ter ficado parado entre o aperto e a soltura.
 */
const origens = new WeakMap<Element, { x: number; y: number }>();
function alternativa(acao: () => void) {
  return {
    onPointerDown(e: { currentTarget: Element; clientX: number; clientY: number }) {
      origens.set(e.currentTarget, { x: e.clientX, y: e.clientY });
    },
    onClick(e: { currentTarget: Element; detail: number; clientX: number; clientY: number }) {
      const origem = origens.get(e.currentTarget);
      // detail 0 é o clique do teclado (Enter/Espaço): não tem movimento e sempre responde
      if (e.detail > 0 && origem && Math.hypot(e.clientX - origem.x, e.clientY - origem.y) > 4) return;
      acao();
    },
  };
}

/**
 * Copia o texto da questão com um clique. Ao copiar, o ícone de folhas vira um visto e o botão ganha um tom verde por
 * instantes; depois volta ao normal, e pode copiar de novo. Se o navegador não deixar copiar, o botão diz isso.
 */
function CopiarQuestao({ texto }: { texto: string }) {
  const [estado, setEstado] = useState<"parado" | "copiada" | "falhou">("parado");
  const [rodada, setRodada] = useState(0);
  useEffect(() => {
    if (estado === "parado") return;
    const id = setTimeout(() => setEstado("parado"), 2200);
    return () => clearTimeout(id);
  }, [estado, rodada]);
  const copiar = () => {
    setRodada((r) => r + 1);
    void copiarTexto(texto).then((ok) => setEstado(ok ? "copiada" : "falhou"));
  };
  const rotulo = estado === "copiada" ? "Questão copiada" : estado === "falhou" ? "Não foi possível copiar" : "Copiar questão";
  return (
    <button type="button" className={styles.copiar} data-estado={estado} onClick={copiar}>
      <svg className={styles.copiarIcone} viewBox="0 0 24 24" aria-hidden="true">
        <rect className={styles.copiarFolha} x="8" y="8" width="12" height="12" rx="2.5" />
        <path className={styles.copiarFolha} d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8" />
        <path className={styles.copiarVisto} d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
      <span key={estado} className={styles.copiarRotulo}>
        {rotulo}
      </span>
    </button>
  );
}

/** Caso, comando, resposta (alternativas ou digitada) e feedback. Serve ao jogo e ao treino. */
export function PerguntaCorpo({ pergunta, nivel, cabecalho, aoResponder, rotuloContinuar, aoContinuar, liberadaEm }: Props) {
  const [res, setRes] = useState<Correcao | null>(null);
  const caixa = useRef<HTMLDivElement>(null);
  const inicio = useRef(0);
  const [agora, setAgora] = useState(() => performance.now());
  const aguardando = liberadaEm !== undefined && !res;
  // Tempo até a primeira escolha (Ícaro Liminar) começa quando a pergunta aparece.
  useEffect(() => {
    inicio.current = performance.now();
  }, [pergunta]);
  useEffect(() => {
    if (!aguardando) return;
    const id = setInterval(() => setAgora(performance.now()), 100);
    return () => clearInterval(id);
  }, [aguardando]);
  const bloqueada = aguardando && agora < liberadaEm();

  // Foco na caixa, não em botão ou campo: com a barra de espaço para bater as asas, um botão
  // focado seria acionado sem querer.
  useEffect(() => {
    caixa.current?.focus();
  }, [pergunta]);

  const concluir = (r: Correcao) => {
    const tempoMs = performance.now() - inicio.current;
    registrarResultado(pergunta, r.acertou);
    registrarArtigos(pergunta, r);
    atualizarConquistas((c) => registrarResposta(c, { acertou: r.acertou, categorias: pergunta.categorias, tempoMs }));
    setRes(r);
    aoResponder?.(r);
  };

  const comando =
    pergunta.formato === "peca" && nivel === 1 ? pergunta.comando.replace(/ e o seu fundamento.*\?$/, "?") : pergunta.comando;

  // Ordem das alternativas sorteada uma vez por pergunta: a tela e a cópia mostram a mesma ordem.
  const alts = useMemo(() => (pergunta.formato === "peca" && nivel === 1 ? alternativas(pergunta) : []), [pergunta, nivel]);
  const ordem = useMemo(() => (pergunta.formato === "item" && nivel === 1 ? opcoesDoItem(pergunta) : []), [pergunta, nivel]);

  return (
    <div ref={caixa} className={styles.quizBox} tabIndex={-1}>
      {cabecalho}
      {pergunta.formato !== "peca" && (
        <p className={styles.etiqueta}>
          {nomeCategoria(pergunta.categorias[0])} · {pergunta.fonte}
        </p>
      )}
      <p className={styles.caso}>{pergunta.caso}</p>
      <p className={styles.comando}>{comando}</p>

      {!res && pergunta.formato === "peca" && <CorpoPeca pergunta={pergunta} nivel={nivel} alts={alts} concluir={concluir} bloqueada={bloqueada} />}
      {!res && pergunta.formato === "item" && <CorpoItem pergunta={pergunta} nivel={nivel} ordem={ordem} concluir={concluir} bloqueada={bloqueada} />}
      {!res && pergunta.formato === "objetiva" && <CorpoObjetiva pergunta={pergunta} concluir={concluir} bloqueada={bloqueada} />}

      {res && (
        <div
          className={`${styles.feedback} ${res.acertou ? styles.fbOk : styles.fbErro}`}
          aria-live="assertive"
          onClickCapture={(e) => {
            if ((e.target as Element).closest("a.citacao")) atualizarConquistas(registrarArtigo);
          }}
        >
          <strong className={styles.fbTitulo}>{res.acertou ? "✓ Correto!" : "✗ Não foi dessa vez"}</strong>
          <Retorno pergunta={pergunta} res={res} nivel={nivel} />
          <div className={styles.fbAcoes}>
            <CopiarQuestao texto={textoParaCopiar(pergunta, nivel, comando, alts, ordem, textoResposta(pergunta, res))} />
            <a href={linkContato("erro", pergunta.id)}>Relatar erro</a>
            <a href={linkContato("sugestao", pergunta.id)}>Sugerir melhoria</a>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => aoContinuar(res)}>
            {rotuloContinuar}
          </button>
        </div>
      )}
    </div>
  );
}

function CorpoPeca({
  pergunta,
  nivel,
  alts,
  concluir,
  bloqueada,
}: {
  pergunta: PerguntaPeca;
  nivel: Nivel;
  alts: { tipo: string; nome: string }[];
  concluir: (c: Correcao) => void;
  bloqueada: boolean;
}) {
  const [peca, setPeca] = useState("");
  const [fund, setFund] = useState("");
  const responder = (escolhida?: string) => concluir(corrigirResposta(pergunta, nivel, { peca: escolhida ?? peca, fundamento: fund }));

  if (nivel === 1) {
    return (
      <div className={styles.alts}>
        {alts.map((a, i) => (
          <button key={a.tipo} type="button" className={styles.alt} disabled={bloqueada} {...alternativa(() => responder(a.tipo))}>
            <span className={styles.altLetra}>{"ABCD"[i]}</span>
            {a.nome}
          </button>
        ))}
      </div>
    );
  }
  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        responder();
      }}
    >
      <label>
        <span>Peça</span>
        <input value={peca} onChange={(e) => setPeca(e.target.value)} placeholder="ex.: Recurso em Sentido Estrito" autoComplete="off" required />
      </label>
      <label>
        <span>Fundamento legal {nivel === 3 ? "(com parágrafo, inciso ou alínea)" : "(artigo e lei)"}</span>
        <input
          value={fund}
          onChange={(e) => setFund(e.target.value)}
          placeholder={nivel === 3 ? "ex.: art. 581, IV, do CPP" : "ex.: art. 581 do CPP"}
          autoComplete="off"
          required
        />
      </label>
      <button type="submit" className="btn btn-gold">
        Responder
      </button>
    </form>
  );
}

function CorpoItem({
  pergunta,
  nivel,
  ordem,
  concluir,
  bloqueada,
}: {
  pergunta: PerguntaItem;
  nivel: Nivel;
  ordem: number[];
  concluir: (c: Correcao) => void;
  bloqueada: boolean;
}) {
  const [texto, setTexto] = useState("");

  if (nivel === 1) {
    return (
      <div className={styles.alts}>
        {ordem.map((idx, i) => (
          <button key={idx} type="button" className={styles.alt} disabled={bloqueada} {...alternativa(() => concluir(corrigirItem(pergunta, nivel, { opcao: idx })))}>
            <span className={styles.altLetra}>{"ABCD"[i]}</span>
            {pergunta.opcoes[idx].texto}
          </button>
        ))}
      </div>
    );
  }
  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        concluir(corrigirItem(pergunta, nivel, { texto }));
      }}
    >
      <label>
        <span>Sua resposta {nivel === 3 ? "(tese completa, com o dispositivo legal)" : "(tese e dispositivo legal)"}</span>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={4} required />
      </label>
      <button type="submit" className="btn btn-gold">
        Responder
      </button>
    </form>
  );
}

function CorpoObjetiva({ pergunta, concluir, bloqueada }: { pergunta: PerguntaObjetiva; concluir: (c: Correcao) => void; bloqueada: boolean }) {
  return (
    <div className={styles.alts}>
      {LETRAS.map((l: Letra) => (
        <button key={l} type="button" className={styles.alt} disabled={bloqueada} {...alternativa(() => concluir(corrigirObjetiva(pergunta, l)))}>
          <span className={styles.altLetra}>{l}</span>
          {pergunta.alternativas[l]}
        </button>
      ))}
    </div>
  );
}

function Retorno({ pergunta, res, nivel }: { pergunta: Pergunta; res: Correcao; nivel: Nivel }) {
  if (res.formato === "peca") {
    return (
      <>
        {!res.acertou && nivel > 1 && (
          <p className={styles.fbDetalhe}>
            Peça: {res.acertouPeca ? "certa" : "errada"} · Fundamento: {res.acertouFundamento ? "certo" : "errado"}
          </p>
        )}
        <p>
          <strong>{res.pecaEsperada}</strong> — <Citado texto={res.fundamentoEsperado} />
        </p>
        <p className={styles.fbExp}>
          <Citado texto={pergunta.explicacao} />
        </p>
      </>
    );
  }
  if (res.formato === "objetiva" && pergunta.formato === "objetiva") {
    return (
      <>
        {!res.acertou && (
          <p className={styles.fbDetalhe}>
            Você marcou {res.escolhida}. A resposta é a letra {res.correta}: {pergunta.alternativas[res.correta]}
          </p>
        )}
        <p className={styles.fbExp}>{pergunta.explicacao}</p>
      </>
    );
  }
  if (res.formato !== "item") return null;
  return (
    <>
      {res.fracao !== null && (
        <p className={styles.fbDetalhe}>
          Nota no item: {Math.round(res.fracao * 100)}%{res.faltou.length ? ` · faltou: ${res.faltou.slice(0, 4).join("; ")}` : ""}
        </p>
      )}
      <p className={styles.fbExp}>
        <strong>Padrão de respostas: </strong>
        <Citado texto={pergunta.explicacao} />
      </p>
    </>
  );
}
