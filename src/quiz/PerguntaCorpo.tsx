"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Citado } from "@/components/Citacoes";
import { contextoCorrecao } from "@/lib/correcao/cliente";
import { eventosDeDispositivos, registrar as registrarErros } from "@/lib/erros";
import { alternativas, opcoesDoItem, registrarResultado } from "./banco";
import { nomeCategoria } from "./categorias";
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

/** Caso, comando, resposta (alternativas ou digitada) e feedback. Serve ao jogo e ao treino. */
export function PerguntaCorpo({ pergunta, nivel, cabecalho, aoResponder, rotuloContinuar, aoContinuar }: Props) {
  const [res, setRes] = useState<Correcao | null>(null);
  const caixa = useRef<HTMLDivElement>(null);

  // Foco na caixa, não em botão ou campo: com a barra de espaço para bater as asas, um botão
  // focado seria acionado sem querer.
  useEffect(() => {
    caixa.current?.focus();
  }, [pergunta]);

  const concluir = (r: Correcao) => {
    registrarResultado(pergunta, r.acertou);
    registrarArtigos(pergunta, r);
    setRes(r);
    aoResponder?.(r);
  };

  const comando =
    pergunta.formato === "peca" && nivel === 1 ? pergunta.comando.replace(/ e o seu fundamento.*\?$/, "?") : pergunta.comando;

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

      {!res && pergunta.formato === "peca" && <CorpoPeca pergunta={pergunta} nivel={nivel} concluir={concluir} />}
      {!res && pergunta.formato === "item" && <CorpoItem pergunta={pergunta} nivel={nivel} concluir={concluir} />}
      {!res && pergunta.formato === "objetiva" && <CorpoObjetiva pergunta={pergunta} concluir={concluir} />}

      {res && (
        <div className={`${styles.feedback} ${res.acertou ? styles.fbOk : styles.fbErro}`} aria-live="assertive">
          <strong className={styles.fbTitulo}>{res.acertou ? "✓ Correto!" : "✗ Não foi dessa vez"}</strong>
          <Retorno pergunta={pergunta} res={res} nivel={nivel} />
          <button type="button" className="btn btn-primary" onClick={() => aoContinuar(res)}>
            {rotuloContinuar}
          </button>
        </div>
      )}
    </div>
  );
}

function CorpoPeca({ pergunta, nivel, concluir }: { pergunta: PerguntaPeca; nivel: Nivel; concluir: (c: Correcao) => void }) {
  const alts = useMemo(() => alternativas(pergunta), [pergunta]);
  const [peca, setPeca] = useState("");
  const [fund, setFund] = useState("");
  const responder = (escolhida?: string) => concluir(corrigirResposta(pergunta, nivel, { peca: escolhida ?? peca, fundamento: fund }));

  if (nivel === 1) {
    return (
      <div className={styles.alts}>
        {alts.map((a, i) => (
          <button key={a.tipo} type="button" className={styles.alt} onClick={() => responder(a.tipo)}>
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

function CorpoItem({ pergunta, nivel, concluir }: { pergunta: PerguntaItem; nivel: Nivel; concluir: (c: Correcao) => void }) {
  const ordem = useMemo(() => opcoesDoItem(pergunta), [pergunta]);
  const [texto, setTexto] = useState("");

  if (nivel === 1) {
    return (
      <div className={styles.alts}>
        {ordem.map((idx, i) => (
          <button key={idx} type="button" className={styles.alt} onClick={() => concluir(corrigirItem(pergunta, nivel, { opcao: idx }))}>
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

function CorpoObjetiva({ pergunta, concluir }: { pergunta: PerguntaObjetiva; concluir: (c: Correcao) => void }) {
  return (
    <div className={styles.alts}>
      {LETRAS.map((l: Letra) => (
        <button key={l} type="button" className={styles.alt} onClick={() => concluir(corrigirObjetiva(pergunta, l))}>
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
