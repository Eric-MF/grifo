// Personagens (liberados por XP), preços dos estilos (em moedas) e penalidades da coluna rachada.

import type { Regra } from "../types";

export interface Personagem {
  id: string;
  nome: string;
  descricao: string;
  /** XP para liberar (personagens clássicos) */
  xp?: number;
  /** condições de desbloqueio; basta uma */
  regras?: Regra[];
  /** XP que liberava o personagem antes das regras: quem já tinha o XP continua com ele */
  xpLegado?: number;
  /** secreto: não aparece no seletor até ser liberado */
  secreto?: boolean;
  /** resumo de como foi conseguido, mostrado na dica do personagem (começa com "Desbloqueado para") */
  comoObter?: string;
  /** tem moedas no desenho: as batidas de asas soltam mini moedas de ouro, no lugar das partículas comuns */
  moedas?: boolean;
  /** tem o esquema de vidas extras: quanto mais vidas, mais rápido o mundo (para equilibrar) */
  vidasAceleram?: boolean;
}

export const PERSONAGENS: Personagem[] = [
  { id: "maleta", nome: "Maleta do estagiário", descricao: "Ponto de partida.", xp: 0 },
  { id: "balanca", nome: "Balança da Justiça", descricao: "Equilíbrio entre as partes.", xp: 60 },
  { id: "delegado", nome: "Delegado", descricao: "Inquérito policial em mãos.", xp: 150 },
  { id: "defensor", nome: "Defensor", descricao: "Presunção de inocência.", xp: 300 },
  { id: "juiz", nome: "Juiz", descricao: "Sentença de primeiro grau.", xp: 500 },
  { id: "promotor", nome: "Promotor", descricao: "Denúncia oferecida.", xp: 800 },
  { id: "codigo", nome: "Código Penal", descricao: "Parte geral e especial.", xp: 1200 },
  {
    id: "grifo",
    nome: "Grifo",
    descricao: "O símbolo do curso.",
    regras: [{ tipo: "categoria", categoria: "peca", acertos: 20 }],
    xpLegado: 2000,
  },
  {
    id: "pecasus",
    nome: "Peçasus",
    descricao: "Por dentro da peça: endereçamento, prazo e pedidos.",
    regras: [{ tipo: "categoria", categoria: "peca-detalhe", acertos: 20 }],
  },
  {
    id: "gabaruda",
    nome: "Gabaruda",
    descricao: "Questões discursivas: tese e dispositivo.",
    regras: [{ tipo: "categoria", categoria: "discursiva", acertos: 20 }],
  },
  {
    id: "fenixame",
    vidasAceleram: true,
    nome: "Fênixame",
    descricao: "Objetivas da 1ª fase: múltipla escolha.",
    regras: [{ tipo: "categoria", categoria: "objetiva", acertos: 20 }],
  },
  {
    id: "corujuris",
    nome: "Corujuris",
    descricao: "Só aparece de madrugada.",
    secreto: true,
    comoObter: "Desbloqueado para quem joga de madrugada, entre 0h e 6h.",
    regras: [{ tipo: "horario", de: 0, ate: 6 }],
  },
  {
    id: "dracofisco",
    moedas: true,
    nome: "Dracofisco",
    descricao: "Guarda ouro e cobra o imposto.",
    secreto: true,
    comoObter: "Desbloqueado para quem junta 1\u00a0mil moedas; elas são cobradas ao liberar.",
    regras: [{ tipo: "moedas", minimo: 1000, cobra: 1000 }],
  },
  {
    id: "harpia-corpus",
    vidasAceleram: true,
    nome: "Harpia Corpus",
    descricao: "Liberdade para quem acerta sem parar.",
    secreto: true,
    comoObter: "Desbloqueado para quem acerta 20\u00a0perguntas seguidas.",
    regras: [{ tipo: "sequencia", acertos: 20 }],
  },
  {
    id: "morcegravo",
    nome: "Morcegravo",
    descricao: "Vive no escuro, como o recurso.",
    secreto: true,
    comoObter: "Desbloqueado para quem usa o tema escuro 7\u00a0dias seguidos.",
    regras: [{ tipo: "modo-escuro", dias: 7 }],
  },
  {
    id: "icaro-liminar",
    nome: "Ícaro Liminar",
    descricao: "Decisão rápida, antes que derreta.",
    secreto: true,
    comoObter: "Desbloqueado para quem responde rápido: menos de 3\u00a0s.",
    regras: [{ tipo: "resposta-rapida", ms: 3000 }],
  },
  {
    id: "prescritodactilo",
    nome: "Prescritodáctilo",
    descricao: "Voltou depois de uma longa pausa.",
    secreto: true,
    comoObter: "Desbloqueado para quem pausa o jogo por mais de 10\u00a0min e volta.",
    regras: [{ tipo: "pausa-longa", ms: 600000 }],
  },
  {
    id: "pombodoro",
    nome: "Pombodoro",
    descricao: "Estuda 25 minutos sem trocar de aba.",
    secreto: true,
    comoObter: "Desbloqueado para quem estuda 25\u00a0min seguidos na tela do jogo.",
    regras: [{ tipo: "foco", ms: 1500000 }],
  },
  {
    id: "agraviao",
    nome: "Agravião",
    descricao: "Clica em todos os artigos.",
    secreto: true,
    comoObter: "Desbloqueado para quem clica em 30\u00a0artigos nas respostas.",
    regras: [{ tipo: "artigos", cliques: 30 }],
  },
  {
    id: "sumulicornio",
    nome: "Súmulicórnio",
    descricao: "Cinco acertos seguidos, uma súmula.",
    secreto: true,
    comoObter: "Desbloqueado para quem acerta 5\u00a0perguntas seguidas.",
    regras: [{ tipo: "sequencia", acertos: 5 }],
  },
  {
    id: "falcao-falimentar",
    moedas: true,
    nome: "Falcão Falimentar",
    descricao: "Tenta comprar sem dinheiro.",
    secreto: true,
    comoObter: "Desbloqueado para quem tenta comprar sem ter moedas suficientes.",
    regras: [{ tipo: "tentativa-compra" }, { tipo: "todas-compras" }],
  },
  {
    id: "gafanhoto-mora",
    moedas: true,
    nome: "Gafanhoto de Mora",
    descricao: "Cobra juros de quem some.",
    secreto: true,
    comoObter: "Desbloqueado para quem volta depois de 7\u00a0dias sem abrir o site.",
    regras: [{ tipo: "ausencia", dias: 7, juros: 0.05 }],
  },
];

/**
 * Moedas para comprar cada estilo, na ordem do menu. O clássico é grátis. O primeiro pago custa 50 e cada um seguinte
 * custa 2,2 vezes o anterior: round(50 · 2,2ⁿ), com n a partir de 0 no Fofo. O pixel não aparece no menu, então não entra na sequência.
 */
export const CUSTO_ESTILOS: Record<string, number> = {
  fofo: 50,
  retro: 110,
  steampunk: 242,
  noir: 532,
  papiro: 1171,
  recesso: 2577,
  gotico: 5669,
  pixel: 80,
};

/** Estilos que só aparecem no menu depois que todos os anteriores estão liberados (nem o "???" aparece antes). */
export const ESTILOS_EM_SEQUENCIA = ["recesso", "gotico"];

/** Preço de cada estilo dos grupos: o teto da sequência principal (o Gótico). */
export const CUSTO_TETO = CUSTO_ESTILOS.gotico;

/**
 * Grupos de estilos, na ordem do menu e do catálogo. Só aparecem depois que a lista principal está toda liberada;
 * os datados (feriados, datas do Direito, festas) só ficam à venda na semana do evento.
 */
export const GRUPOS_ESTILOS: { id: string; nome: string }[] = [
  { id: "feriados", nome: "Feriados nacionais" },
  { id: "estados", nome: "Estados" },
  { id: "biomas", nome: "Biomas" },
  { id: "constituicoes", nome: "Constituições" },
  { id: "datas-direito", nome: "Datas do Direito" },
  { id: "festas", nome: "Festas populares" },
];

/** XP por coluna passada, conforme o nível: níveis mais difíceis rendem mais. */
export const MULTIPLICADOR_XP: Record<1 | 2 | 3, number> = { 1: 1, 2: 1.5, 3: 2 };

/** Chance de uma coluna rachada por nível. */
export const CHANCE_RACHADA: Record<1 | 2 | 3, number> = { 1: 0.06, 2: 0.12, 3: 0.3 };

type EfeitoPenalidade = "cancelar" | "pontos" | "vida" | "moedas";

/** Efeitos negativos da coluna rachada, sorteados ao bater; a frase de cada um aparece no aviso. */
export const PENALIDADES: { texto: string; efeito: EfeitoPenalidade; valor: number }[] = [
  { texto: "Os benefícios ativos são suspensos.", efeito: "cancelar", valor: 0 },
  { texto: "A pronúncia foi mantida: você perde pontos.", efeito: "pontos", valor: 15 },
  { texto: "A prisão foi decretada: você perde uma vida extra.", efeito: "vida", valor: 1 },
  { texto: "Multa a pagar: você perde moedas desta partida.", efeito: "moedas", valor: 5 },
];
