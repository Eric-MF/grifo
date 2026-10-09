// Registro dos jogos. Para adicionar um jogo: `npm run novo:jogo -- <slug> "Título"`
// (cria src/games/<slug>/ e a entrada aqui). O `id` numérico (1–15) entra no código de
// verificação: nunca reutilize o de um jogo removido.
import type { GameModule } from "./types";

export interface JogoInfo {
  id: number;
  slug: string;
  titulo: string;
  descricao: string;
  capa?: string; // nome da imagem em public/img (opcional)
  emoji: string;
  /** Dica exibida antes do primeiro toque (padrão: a do Flap Suitcase). */
  dica?: string;
  carregar: () => Promise<GameModule>;
}

export const JOGOS: JogoInfo[] = [
  {
    id: 1,
    slug: "flap-suitcase",
    titulo: "Flap Suitcase",
    descricao:
      "Guie a maleta alada entre colunas gregas. Cada poder cobra uma pergunta de 2ª fase: qual a peça cabível, com artigo e parágrafo.",
    capa: "maleta-colunas-1",
    emoji: "💼",
    dica: "Toque, clique ou aperte espaço para voar",
    carregar: () => import("./flap-suitcase").then((m) => m.default),
  },
];

export const jogoPorSlug = (slug: string) => JOGOS.find((j) => j.slug === slug);
