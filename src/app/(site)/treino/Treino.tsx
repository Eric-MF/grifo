"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { lerJSON, gravarJSON } from "@/lib/storage";
import { sortearPergunta } from "@/quiz/banco";
import { PerguntaCorpo } from "@/quiz/PerguntaCorpo";
import { LIMITE_SEG, maximoTreino, NOME_NIVEL, pontuar, TAMANHO_TREINO } from "@/quiz/pontuacao";
import type { Nivel, Pergunta } from "@/quiz/types";
import { nomePeca, type Correcao } from "@/quiz/verificar";
import styles from "./treino.module.css";

type Fase = "inicio" | "pergunta" | "resultado";
interface Rodada {
  pergunta: Pergunta;
  acertou: boolean;
  segundos: number;
  pontos: number;
}
type Recordes = Partial<Record<Nivel, number>>;

/** Tempo da pergunta. Fica num componente próprio para o intervalo de 250 ms não re-renderizar a pergunta. */
function Tempo({ inicio, limite, ultima }: { inicio: number; limite: number; ultima: Rodada | null }) {
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
      ) : segundos > limite ? (
        "sem bônus de rapidez"
      ) : (
        `bônus de rapidez até ${fmt(limite)}`
      )}
    </p>
  );
}

const CHAVE = "grifo:treino";
const NIVEIS: { n: Nivel; desc: string }[] = [
  { n: 1, desc: "Alternativas; só o nome da peça" },
  { n: 2, desc: "Digite a peça e o artigo" },
  { n: 3, desc: "Digite a peça e o artigo com parágrafo, inciso ou alínea" },
];

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function Treino() {
  const [fase, setFase] = useState<Fase>("inicio");
  const [nivel, setNivel] = useState<Nivel>(1);
  const [recordes, setRecordes] = useState<Recordes>({});
  const [rodadas, setRodadas] = useState<Rodada[]>([]);
  const [indice, setIndice] = useState(0);
  const [pergunta, setPergunta] = useState<Pergunta | null>(null);
  const [inicio, setInicio] = useState(0);
  const [respondida, setRespondida] = useState(false);
  const [novoRecorde, setNovoRecorde] = useState(false);
  const vistas = useRef(new Set<string>());

  useEffect(() => {
    setRecordes(lerJSON<Recordes>(CHAVE, {}));
  }, []);

  const proximaPergunta = (): Pergunta => {
    for (let i = 0; i < 20; i++) {
      const p = sortearPergunta();
      if (!vistas.current.has(p.id)) {
        vistas.current.add(p.id);
        return p;
      }
    }
    return sortearPergunta();
  };

  const comecar = () => {
    vistas.current = new Set();
    const t = performance.now();
    setRodadas([]);
    setIndice(0);
    setPergunta(proximaPergunta());
    setInicio(t);
    setRespondida(false);
    setNovoRecorde(false);
    setFase("pergunta");
  };

  const aoResponder = (c: Correcao) => {
    if (!pergunta) return;
    const segundos = (performance.now() - inicio) / 1000;
    const rodada: Rodada = { pergunta, acertou: c.acertou, segundos, pontos: pontuar(nivel, c.acertou, segundos) };
    setRodadas((r) => [...r, rodada]);
    setRespondida(true);
  };

  const finalizar = () => {
    const total = rodadas.reduce((s, r) => s + r.pontos, 0);
    const anterior = recordes[nivel] ?? 0;
    const recorde = total > anterior;
    if (recorde) {
      const novos = { ...recordes, [nivel]: total };
      setRecordes(novos);
      gravarJSON(CHAVE, novos);
    }
    setNovoRecorde(recorde);
    setFase("resultado");
  };

  const aoContinuar = () => {
    if (rodadas.length >= TAMANHO_TREINO) return finalizar();
    const t = performance.now();
    setIndice((i) => i + 1);
    setPergunta(proximaPergunta());
    setInicio(t);
    setRespondida(false);
  };

  const nomeNivel = NOME_NIVEL[nivel];

  if (fase === "inicio") {
    return (
      <div className={styles.painel}>
        <h2 className={styles.subtitulo}>Escolha o nível</h2>
        <div className={styles.niveis}>
          {NIVEIS.map((x) => (
            <button key={x.n} type="button" aria-pressed={nivel === x.n} onClick={() => setNivel(x.n)}>
              <strong>{NOME_NIVEL[x.n]}</strong>
              <small>{x.desc}</small>
              <span className={styles.recorde}>
                Recorde: {recordes[x.n] ?? "—"} de {maximoTreino(x.n)}
              </span>
            </button>
          ))}
        </div>
        <p className={styles.regras}>
          Acertar vale 60 pontos, mais até 40 pela rapidez: a bonificação zera depois de {fmt(LIMITE_SEG[nivel])}. O nível
          multiplica o total por 1, 1,5 ou 2. São {TAMANHO_TREINO} perguntas sorteadas entre todas as peças.
        </p>
        <button type="button" className="btn btn-gold" onClick={comecar}>
          Começar treino
        </button>
      </div>
    );
  }

  if (fase === "pergunta" && pergunta) {
    const n = indice + 1;
    const ultima = rodadas[rodadas.length - 1];
    const limite = LIMITE_SEG[nivel];
    return (
      <>
        <PerguntaCorpo
          key={n}
          pergunta={pergunta}
          nivel={nivel}
          aoResponder={aoResponder}
          rotuloContinuar={rodadas.length === TAMANHO_TREINO ? "Ver resultado" : "Próxima pergunta"}
          aoContinuar={aoContinuar}
          cabecalho={
            <>
              <p className={styles.eyebrow}>
                Pergunta {n} de {TAMANHO_TREINO} · nível {nomeNivel}
              </p>
              <Tempo key={n} inicio={inicio} limite={limite} ultima={respondida && ultima ? ultima : null} />
            </>
          }
        />
        <p className={styles.abandonar}>
          <button type="button" className={styles.linkBotao} onClick={() => setFase("inicio")}>
            Abandonar treino (não grava pontos)
          </button>
        </p>
      </>
    );
  }

  const total = rodadas.reduce((s, r) => s + r.pontos, 0);
  const acertos = rodadas.filter((r) => r.acertou).length;
  const media = rodadas.reduce((s, r) => s + r.segundos, 0) / Math.max(1, rodadas.length);
  return (
    <div className={styles.painel}>
      <p className={styles.eyebrow}>Resultado · nível {nomeNivel}</p>
      <p className={styles.total}>
        {total} <span>de {maximoTreino(nivel)} pontos</span>
      </p>
      {novoRecorde && <p className="badge badge-gold">Novo recorde neste nível!</p>}
      <p>
        {acertos} de {TAMANHO_TREINO} acertos · tempo médio {fmt(media)}
      </p>
      <div className={styles.tabelaWrap}>
        <table className={styles.tabela}>
          <thead>
            <tr>
              <th>#</th>
              <th>Peça</th>
              <th>Resultado</th>
              <th>Tempo</th>
              <th>Pontos</th>
            </tr>
          </thead>
          <tbody>
            {rodadas.map((r, i) => (
              <tr key={r.pergunta.id}>
                <td>{i + 1}</td>
                <td>{nomePeca(r.pergunta.resposta.peca)}</td>
                <td>{r.acertou ? "✓ acerto" : "✗ erro"}</td>
                <td>{fmt(r.segundos)}</td>
                <td>{r.pontos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.acoes}>
        <button type="button" className="btn btn-gold" onClick={comecar}>
          Treinar de novo
        </button>
        <button type="button" className="btn" onClick={() => setFase("inicio")}>
          Escolher outro nível
        </button>
        <Link href="/jogos/" className="btn">
          Voltar aos jogos
        </Link>
      </div>
    </div>
  );
}
