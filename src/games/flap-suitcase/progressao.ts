// Personagens (liberados por XP), preços dos estilos (em moedas) e penalidades da coluna rachada.

export interface Personagem {
  id: string;
  nome: string;
  descricao: string;
  xp: number;
}

export const PERSONAGENS: Personagem[] = [
  { id: "maleta", nome: "Maleta do estagiário", descricao: "Ponto de partida.", xp: 0 },
  { id: "balanca", nome: "Balança da Justiça", descricao: "Equilíbrio entre as partes.", xp: 60 },
  { id: "delegado", nome: "Delegado", descricao: "Inquérito policial em mãos.", xp: 150 },
  { id: "defensor", nome: "Defensor", descricao: "Presunção de inocência.", xp: 300 },
  { id: "juiz", nome: "Juiz", descricao: "Sentença de primeiro grau.", xp: 500 },
  { id: "promotor", nome: "Promotor", descricao: "Denúncia oferecida.", xp: 800 },
  { id: "codigo", nome: "Código Penal", descricao: "Parte geral e especial.", xp: 1200 },
  { id: "grifo", nome: "Grifo", descricao: "O símbolo do curso.", xp: 2000 },
];

/** Moedas para comprar cada estilo. O clássico é grátis. */
export const CUSTO_ESTILOS: Record<string, number> = {
  fofo: 40,
  retro: 60,
  steampunk: 60,
  pixel: 80,
  noir: 90,
  papiro: 50,
};

/** XP por coluna passada, conforme o nível: níveis mais difíceis rendem mais. */
export const MULTIPLICADOR_XP: Record<1 | 2 | 3, number> = { 1: 1, 2: 1.5, 3: 2 };

/** Chance de uma coluna rachada por nível. */
export const CHANCE_RACHADA: Record<1 | 2 | 3, number> = { 1: 0.06, 2: 0.12, 3: 0.3 };

type EfeitoPenalidade = "cancelar" | "pontos" | "vida" | "moedas";

/** Peças que prejudicam a defesa; cada uma vira um efeito negativo ao bater na coluna rachada. */
export const PENALIDADES: { peca: string; texto: string; efeito: EfeitoPenalidade; valor: number }[] = [
  { peca: "Apelação do Ministério Público", texto: "Os benefícios ativos são suspensos.", efeito: "cancelar", valor: 0 },
  { peca: "Recurso em Sentido Estrito", texto: "A pronúncia foi mantida: você perde pontos.", efeito: "pontos", valor: 15 },
  { peca: "Revogação da liberdade provisória", texto: "A prisão foi decretada: você perde uma vida extra.", efeito: "vida", valor: 1 },
  { peca: "Queixa-crime", texto: "Multa a pagar: você perde moedas desta partida.", efeito: "moedas", valor: 5 },
];
