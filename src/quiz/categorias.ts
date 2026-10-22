import type { Categoria } from "./types";

export const CATEGORIAS: { id: Categoria; nome: string; resumo: string }[] = [
  {
    id: "peca",
    nome: "Peça e fundamento",
    resumo:
      "Um caso curto: diga qual peça ou recurso cabe e em que artigo ele se apoia. Inclui questões da 1ª fase sobre peça ou recurso cabível.",
  },
  {
    id: "peca-detalhe",
    nome: "Por dentro da peça",
    resumo: "Tudo o que a peça cobra além do nome: endereçamento e competência, prazo, preliminares, teses de mérito e pedidos.",
  },
  {
    id: "discursiva",
    nome: "Questões discursivas",
    resumo:
      "Perguntas tiradas das 4 questões discursivas de cada exame. Responda a tese e o dispositivo, como no padrão de respostas da FGV.",
  },
  {
    id: "objetiva",
    nome: "Objetivas da 1ª fase",
    resumo: "Múltipla escolha de Penal e Processo Penal das provas objetivas da OAB. Questões anuladas ficam de fora.",
  },
];

export const CATEGORIAS_PADRAO: Categoria[] = ["peca"];
export const CHAVE_CATEGORIAS = "grifo:quiz:categorias";

export const nomeCategoria = (c: Categoria) => CATEGORIAS.find((x) => x.id === c)?.nome ?? c;

/** 4 bits, um por categoria, na ordem de CATEGORIAS (código de verificação do jogo). */
export function mascaraCategorias(cs: Categoria[]): number {
  return CATEGORIAS.reduce((m, c, i) => (cs.includes(c.id) ? m | (1 << i) : m), 0);
}
export function categoriasDaMascara(m: number): Categoria[] {
  return CATEGORIAS.filter((_, i) => m & (1 << i)).map((c) => c.id);
}
