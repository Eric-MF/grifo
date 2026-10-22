// Tipos do banco de perguntas (compartilhado por todos os jogos).

import type { Item } from "@/content/schema";

export type Nivel = 1 | 2 | 3; // 1 fácil (alternativas, só a peça) · 2 médio (digita peça + artigo) · 3 difícil (+ parágrafo/inciso/alínea)

/** O que a pergunta cobra; o usuário escolhe quais entram no jogo e no treino. */
export type Categoria = "peca" | "peca-detalhe" | "discursiva" | "objetiva";

export interface Resposta {
  /** chave do catálogo content/pecas.yaml */
  peca: string;
  /** fundamentos aceitos, do mais esperado para o alternativo (ex.: ["art. 581, IV, CPP"]) */
  fundamentos: string[];
}

interface Base {
  id: string;
  /** narrativa do caso */
  caso: string;
  /** pergunta feita ao jogador */
  comando: string;
  explicacao: string;
  /** "gerada" ou exame de origem ("XXXVIII Exame") */
  fonte: string;
  categorias: Categoria[];
  /** o gênero de cada pessoa marcada no texto ({p1}, {p2}…), que a tela troca por um nome (src/quiz/nomes.ts) */
  pessoas?: ("m" | "f")[];
}

/** Qual a peça cabível e o seu fundamento. */
export interface PerguntaPeca extends Base {
  formato: "peca";
  resposta: Resposta;
  /** peças plausíveis para usar como alternativas erradas no nível fácil */
  distratores?: string[];
}

/** Um item da tabela de pontos da FGV: alternativas no nível fácil, resposta digitada nos outros. */
export interface PerguntaItem extends Base {
  formato: "item";
  secao?: string;
  itens: Item[];
  opcoes: { texto: string; correta: boolean }[];
  dispositivos: string[];
}

export type Letra = "A" | "B" | "C" | "D";
export const LETRAS: Letra[] = ["A", "B", "C", "D"];

/** Questão de múltipla escolha da 1ª fase, com o gabarito definitivo. */
export interface PerguntaObjetiva extends Base {
  formato: "objetiva";
  alternativas: Record<Letra, string>;
  correta: Letra;
  dispositivos: string[];
}

export type Pergunta = PerguntaPeca | PerguntaItem | PerguntaObjetiva;

export interface Rng {
  (): number;
  pick<T>(arr: readonly T[]): T;
  int(min: number, max: number): number;
}

export interface Gerador {
  id: string;
  peca: string;
  /** peso relativo no sorteio */
  peso?: number;
  gerar(rng: Rng): Omit<PerguntaPeca, "id" | "fonte" | "formato" | "categorias">;
}
