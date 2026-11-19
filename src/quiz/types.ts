// Tipos do banco de perguntas (compartilhado por todos os jogos).

export type Nivel = 1 | 2 | 3; // 1 fácil (alternativas) · 2 médio (digita a resposta) · 3 difícil (+ artigo com parágrafo/inciso/alínea)

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
  /** os nomes sorteados para essas pessoas, na ordem: guardados para refazer a questão igual (o resultado guardado) */
  nomes?: string[];
}

/** Qual a peça cabível e o seu fundamento. */
export interface PerguntaPeca extends Base {
  formato: "peca";
  resposta: Resposta;
  /** peças plausíveis para usar como alternativas erradas no nível fácil */
  distratores?: string[];
}

/**
 * Uma tese da tabela de pontos da FGV (da peça ou de uma questão discursiva), com o artigo em que ela se apoia. O `caso`
 * é a introdução curta (sem a resposta); o caso inteiro da prova fica em `enunciado`, para quem quiser ler.
 *   - Fácil: alternativas. Ou o artigo da tese dada, ou a tese do artigo dado (o texto do artigo não aparece).
 *   - Médio: digitar o ponto central (`comando` pergunta; `aceitos` corrige), como "homicídio culposo".
 *   - Difícil: o ponto central e o artigo, com parágrafo, inciso ou alínea.
 */
export interface PerguntaTese extends Base {
  formato: "tese";
  secao?: string;
  /** o caso completo, como está na prova */
  enunciado: string;
  /** o ponto central, como aparece na correção ("Desclassificação para homicídio culposo") */
  tese: string;
  /** o que o ponto central digitado precisa ter: grupos de termos (basta um grupo inteiro), na sintaxe da correção */
  aceitos: string[][];
  /** os dispositivos aceitos, do esperado para os alternativos */
  artigos: string[];
  /** quanto o item vale na tabela da FGV (o peso dele no sorteio de "Por dentro da peça") */
  valor: number;
  /** alternativas erradas do nível fácil: outros artigos e outras teses, das mais parecidas para as outras */
  erradas: { artigos: string[]; teses: string[] };
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

export type Pergunta = PerguntaPeca | PerguntaTese | PerguntaObjetiva;

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
