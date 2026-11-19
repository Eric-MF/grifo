"use client";
// As perguntas do jogo no menu: o modo (escolhido ou automático), a dificuldade e os tipos de pergunta, em botões
// pequenos com ícone. A explicação de cada opção só aparece quando ela é tocada (uma faixa embaixo do grupo), para o
// menu caber no celular.

import { useState, useSyncExternalStore, type JSX } from "react";
import { comRascunhos, tamanhoAcervo } from "@/quiz/banco";
import { CATEGORIAS, nomeCategoria } from "@/quiz/categorias";
import { noFinal, type EstadoAutomatico } from "@/quiz/automatico";
import { NOME_NIVEL } from "@/quiz/pontuacao";
import type { Categoria, Nivel } from "@/quiz/types";
import { ICONES_CATEGORIA, IconeAutomatico, IconeEscolhido, IconeNivel } from "./IconesMenu";
import styles from "./games.module.css";

const NIVEIS: { n: Nivel; desc: string }[] = [
  { n: 1, desc: "Alternativas, só o nome da peça." },
  { n: 2, desc: "Digite a peça e o artigo." },
  { n: 3, desc: "Peça, artigo e parágrafo ou inciso." },
];

const semInscricao = () => () => {};
/** O nome curto de cada tipo, para os botões caberem no celular (o nome inteiro vai na explicação). */
const CURTO: Record<Categoria, string> = { peca: "Peça", "peca-detalhe": "Por dentro", discursiva: "Discursivas", objetiva: "Objetivas" };

interface Props {
  automatico: boolean;
  nivel: Nivel;
  categorias: Categoria[];
  recordes: Record<string, number>;
  /** o estado do modo automático (o tipo e o nível da vez) */
  auto: EstadoAutomatico | null;
  onMudar: (patch: { automatico?: boolean; nivel?: Nivel; categorias?: Categoria[] }) => void;
  /** recomeça o automático do Fácil (só aparece com o automático já adiantado) */
  onRecomecar: () => void;
}

/** A explicação de uma opção: o título, o texto e, no automático, a etapa da vez. */
interface Explicacao {
  titulo: string;
  texto: string;
  extra?: JSX.Element | null;
}

export function OpcoesPerguntas({ automatico, nivel, categorias, recordes, auto, onMudar, onRecomecar }: Props) {
  // a opção cuja explicação está aberta ("automatico", "nivel-2", "tipo-peca"…); o texto é montado aqui, para ficar em dia
  const [aberta, setAberta] = useState<string | null>(null);
  // no servidor não há URL: os rascunhos só entram depois de montar, sem divergir da hidratação
  const rascunhos = useSyncExternalStore(semInscricao, comRascunhos, () => false);
  const tamanho = (c: Categoria) => tamanhoAcervo(c, rascunhos);
  // tocar na mesma opção de novo fecha a explicação
  const explicar = (chave: string) => setAberta((a) => (a === chave ? null : chave));

  const statusAuto = auto && (
    <span className={styles.explicaStatus}>
      Agora: {noFinal(auto) ? "modo final, todos os tipos no Difícil" : `${nomeCategoria(auto.tipos[auto.etapa]!)}, ${NOME_NIVEL[auto.nivel]}`}
      {(auto.etapa > 0 || auto.nivel > 1) && (
        <button type="button" className={styles.explicaAcao} onClick={onRecomecar}>
          Recomeçar do Fácil
        </button>
      )}
    </span>
  );

  const explicacao = (chave: string): Explicacao | null => {
    if (chave === "escolhido") return { titulo: "Escolhido", texto: "Valem os tipos e a dificuldade que você escolher aqui." };
    if (chave === "automatico")
      return { titulo: "Automático", texto: "Como no treino: começa no Fácil e sobe conforme você acerta, um tipo de pergunta de cada vez.", extra: statusAuto };
    const n = NIVEIS.find((x) => chave === `nivel-${x.n}`);
    if (n) {
      const recorde = `Recorde: ${(recordes[n.n] ?? 0).toLocaleString("pt-BR")}.`;
      return { titulo: NOME_NIVEL[n.n], texto: automatico ? `Nível do jogo: vale para os pontos e os recordes. ${recorde}` : `${n.desc} ${recorde}` };
    }
    const c = CATEGORIAS.find((x) => chave === `tipo-${x.id}`);
    if (!c) return null;
    if (tamanho(c.id) === 0) return { titulo: c.nome, texto: "Em breve." };
    const unica = categorias.filter((x) => tamanho(x) > 0).length === 1 && categorias.includes(c.id);
    return { titulo: c.nome, texto: unica ? `${c.resumo} É o único tipo marcado: pelo menos um fica.` : c.resumo };
  };
  const mostrada = aberta ? explicacao(aberta) : null;

  return (
    <fieldset className={`${styles.grupo} ${styles.perguntas}`}>
      <legend>Perguntas</legend>
      <div className={styles.linhaOpcoes} role="group" aria-label="Modo das perguntas">
        <span className={styles.rotuloLinha}>Modo</span>
        <div className={styles.segmentos}>
          <button
            type="button"
            className={styles.segmento}
            aria-pressed={!automatico}
            onClick={() => {
              onMudar({ automatico: false });
              explicar("escolhido");
            }}
          >
            <span className={styles.icone}>
              <IconeEscolhido />
            </span>
            Escolhido
          </button>
          <button
            type="button"
            className={styles.segmento}
            aria-pressed={automatico}
            onClick={() => {
              onMudar({ automatico: true });
              explicar("automatico");
            }}
          >
            <span className={styles.icone}>
              <IconeAutomatico />
            </span>
            Automático
          </button>
        </div>
      </div>
      <div className={styles.linhaOpcoes} role="group" aria-label={automatico ? "Nível do jogo" : "Dificuldade das perguntas"}>
        <span className={styles.rotuloLinha}>{automatico ? "Nível" : "Dificuldade"}</span>
        <div className={styles.segmentos}>
          {NIVEIS.map((x) => (
            <button
              key={x.n}
              type="button"
              className={styles.segmento}
              aria-pressed={nivel === x.n}
              onClick={() => {
                onMudar({ nivel: x.n });
                explicar(`nivel-${x.n}`);
              }}
            >
              <span className={`${styles.icone} ${styles.iconeNivel}`}>
                <IconeNivel n={x.n} />
              </span>
              {NOME_NIVEL[x.n]}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.linhaOpcoes} role="group" aria-label="Tipos de pergunta">
        <span className={styles.rotuloLinha}>Tipos</span>
        <div className={styles.segmentos} data-varios>
          {CATEGORIAS.map((c) => {
            const vazia = tamanho(c.id) === 0;
            const marcada = categorias.includes(c.id) && !vazia;
            // pelo menos um tipo fica marcado
            const ultima = marcada && categorias.filter((x) => tamanho(x) > 0).length === 1;
            const Icone = ICONES_CATEGORIA[c.id];
            return (
              <button
                key={c.id}
                type="button"
                className={styles.segmento}
                aria-pressed={marcada}
                aria-disabled={vazia || ultima || undefined}
                title={vazia ? `${c.nome}: em breve` : c.nome}
                aria-label={c.nome}
                onClick={() => {
                  if (!vazia && !ultima) {
                    const novo = marcada ? categorias.filter((x) => x !== c.id) : [...categorias, c.id];
                    onMudar({ categorias: CATEGORIAS.map((x) => x.id).filter((id) => novo.includes(id)) });
                  }
                  explicar(`tipo-${c.id}`);
                }}
              >
                <span className={styles.icone}>
                  <Icone />
                </span>
                {CURTO[c.id]}
              </button>
            );
          })}
        </div>
      </div>
      {mostrada && (
        <p className={styles.explica} role="status">
          <strong>{mostrada.titulo}.</strong> {mostrada.texto}
          {mostrada.extra}
        </p>
      )}
    </fieldset>
  );
}
