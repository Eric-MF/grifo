// Tipos do banco de perguntas (compartilhado por todos os jogos).

export type Nivel = 1 | 2 | 3; // 1 fácil (alternativas, só a peça) · 2 médio (digita peça + artigo) · 3 difícil (+ parágrafo/inciso/alínea)

export interface Resposta {
  /** chave do catálogo content/pecas.yaml */
  peca: string;
  /** fundamentos aceitos, do mais esperado para o alternativo (ex.: ["art. 581, IV, CPP"]) */
  fundamentos: string[];
}

export interface Pergunta {
  id: string;
  /** narrativa do caso */
  caso: string;
  /** pergunta feita ao jogador */
  comando: string;
  resposta: Resposta;
  explicacao: string;
  /** "gerada" ou exame de origem ("XXXVIII Exame") */
  fonte: string;
  /** peças plausíveis para usar como alternativas erradas no nível fácil */
  distratores?: string[];
}

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
  gerar(rng: Rng): Omit<Pergunta, "id" | "fonte">;
}
