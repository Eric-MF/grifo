// Poderes do Flap Suitcase. Cada poder tem nome jurídico, ícone (SVG em /public/poderes), duração e efeito
// (os efeitos são lidos pelo engine através das flags em `Efeitos`). Cada personagem liberado tem um poder próprio.

export interface Efeitos {
  escudo: boolean;
  ima: boolean;
  lento: boolean;
  mini: boolean;
  fantasma: boolean;
  dobro: boolean;
  leve: boolean;
  congelar: boolean;
  equilibrio: boolean;
  presuncao: boolean;
  dosimetria: boolean;
  galope: boolean;
  eco: boolean;
  sabedoria: boolean;
  pterossauro: boolean;
  foco: boolean;
  agravo: boolean;
}

export type IdPoder =
  | "escudo"
  | "ima"
  | "lento"
  | "mini"
  | "fantasma"
  | "dobro"
  | "leve"
  | "congelar"
  | "equilibrio"
  | "presuncao"
  | "dosimetria"
  | "galope"
  | "eco"
  | "sabedoria"
  | "asas-de-cera"
  | "pterossauro"
  | "foco"
  | "agravo"
  | "prescricao"
  | "revisao"
  | "arquivamento"
  | "inquerito"
  | "denuncia"
  | "tipificacao"
  | "voo"
  | "garras"
  | "renascer"
  | "tesouro"
  | "liberdade"
  | "chifre"
  | "penhora"
  | "praga";

export interface Poder {
  id: IdPoder;
  nome: string;
  icone: string;
  descricao: string;
  /** segundos; 0 = instantâneo */
  duracao: number;
  cor: string;
  /** poder próprio de um personagem; ausente = poder geral */
  personagem?: string;
}

const arte = (id: IdPoder) => `/poderes/${id}.svg`;

export const PODERES: Poder[] = [
  { id: "escudo", nome: "Habeas Corpus", icone: arte("escudo"), descricao: "Protege de uma colisão.", duracao: 12, cor: "#5a9ed6" },
  { id: "ima", nome: "Vade Mecum", icone: arte("ima"), descricao: "Atrai as moedas próximas.", duracao: 10, cor: "#e25b5b" },
  { id: "lento", nome: "Prazo em Dobro", icone: arte("lento"), descricao: "O mundo fica mais lento.", duracao: 7, cor: "#8f7ad6" },
  { id: "mini", nome: "Insignificância", icone: arte("mini"), descricao: "A maleta encolhe.", duracao: 10, cor: "#4fb38a" },
  { id: "fantasma", nome: "Absolvição Sumária", icone: arte("fantasma"), descricao: "Atravessa as colunas.", duracao: 6, cor: "#c7d2e0" },
  { id: "dobro", nome: "Concurso Material", icone: arte("dobro"), descricao: "Pontos em dobro.", duracao: 12, cor: "#d69c45" },
  { id: "leve", nome: "Asas de Ouro", icone: arte("leve"), descricao: "A justiça guiará o seu rumo.", duracao: 10, cor: "#f0c97f" },
  { id: "congelar", nome: "Trânsito em Julgado", icone: arte("congelar"), descricao: "Colunas param e se abrem.", duracao: 8, cor: "#9fe0f0" },
  { id: "prescricao", nome: "Prescrição", icone: arte("prescricao"), descricao: "Apaga as colunas da tela.", duracao: 0, cor: "#807059" },
  { id: "revisao", nome: "Revisão Criminal", icone: arte("revisao"), descricao: "Vida extra.", duracao: 0, cor: "#e25b5b" },

  { id: "arquivamento", nome: "Arquivamento", icone: arte("arquivamento"), descricao: "Arquiva a próxima coluna que surgir.", duracao: 7, cor: "#a88a5c", personagem: "maleta" },
  { id: "equilibrio", nome: "Equilíbrio", icone: arte("equilibrio"), descricao: "As colunas abrem passagens maiores.", duracao: 8, cor: "#d9a441", personagem: "balanca" },
  { id: "inquerito", nome: "Inquérito", icone: arte("inquerito"), descricao: "Recolhe as moedas que surgirem.", duracao: 7, cor: "#3f6fa8", personagem: "delegado" },
  { id: "presuncao", nome: "Presunção de Inocência", icone: arte("presuncao"), descricao: "Colunas rachadas não penalizam.", duracao: 8, cor: "#e8e2d0", personagem: "defensor" },
  { id: "dosimetria", nome: "Dosimetria", icone: arte("dosimetria"), descricao: "Cada coluna vale três pontos.", duracao: 10, cor: "#8a6a45", personagem: "juiz" },
  { id: "denuncia", nome: "Denúncia", icone: arte("denuncia"), descricao: "Remove as colunas rachadas da tela.", duracao: 0, cor: "#b3262e", personagem: "promotor" },
  { id: "tipificacao", nome: "Tipificação", icone: arte("tipificacao"), descricao: "Ganha 20 pontos e 5 moedas.", duracao: 0, cor: "#5e7282", personagem: "codigo" },
  { id: "voo", nome: "Voo do Grifo", icone: arte("voo"), descricao: "Escudo e assistência de voo por um tempo.", duracao: 10, cor: "#d69c45", personagem: "grifo" },

  // Poderes próprios dos personagens liberados por tipo de pergunta e pelas regras secretas.
  { id: "galope", nome: "Galope", icone: arte("galope"), descricao: "As colunas à frente se recolhem e abrem passagem.", duracao: 8, cor: "#c8a14a", personagem: "pecasus" },
  { id: "garras", nome: "Garras", icone: arte("garras"), descricao: "Quebra as duas colunas à frente, sem pontuar.", duracao: 0, cor: "#8c6a3f", personagem: "gabaruda" },
  { id: "renascer", nome: "Renascer", icone: arte("renascer"), descricao: "30% de chance de ganhar uma vida extra. Quanto mais vidas, mais rápido o mundo.", duracao: 0, cor: "#e0643a", personagem: "fenixame" },
  { id: "sabedoria", nome: "Sabedoria da noite", icone: arte("sabedoria"), descricao: "XP em dobro por 10 s.", duracao: 10, cor: "#6f63b8", personagem: "corujuris" },
  { id: "tesouro", nome: "Tesouro", icone: arte("tesouro"), descricao: "Ganha 20 moedas e atrai as moedas por 6 s.", duracao: 0, cor: "#e0a526", personagem: "dracofisco" },
  { id: "liberdade", nome: "Liberdade", icone: arte("liberdade"), descricao: "50% de chance de uma vida extra e escudo por 5 s. Quanto mais vidas, mais rápido o mundo.", duracao: 0, cor: "#e8e8e8", personagem: "harpia-corpus" },
  { id: "eco", nome: "Eco", icone: arte("eco"), descricao: "Atrai as moedas e desacelera o mundo por 8 s.", duracao: 8, cor: "#5a4a7a", personagem: "morcegravo" },
  { id: "asas-de-cera", nome: "Asas de cera", icone: arte("asas-de-cera"), descricao: "Cada batida de asas recolhe as colunas por perto.", duracao: 8, cor: "#f5f0d8", personagem: "icaro-liminar" },
  { id: "pterossauro", nome: "Voo de pterossauro", icone: arte("pterossauro"), descricao: "Batidas de asa mais fortes, que afastam as colunas por perto (mais as que estão mais perto).", duracao: 8, cor: "#7f9a78", personagem: "prescritodactilo" },
  { id: "foco", nome: "Foco", icone: arte("foco"), descricao: "Pontos e moedas valem o triplo por 10 s.", duracao: 10, cor: "#d84a3a", personagem: "pombodoro" },
  { id: "agravo", nome: "Agravo", icone: arte("agravo"), descricao: "Absorve a próxima penalidade: coluna rachada ou resposta errada ao bater.", duracao: 30, cor: "#c9a64a", personagem: "agraviao" },
  { id: "chifre", nome: "Chifre de súmula", icone: arte("chifre"), descricao: "Ganha 5 pontos e quebra a próxima coluna.", duracao: 0, cor: "#c7a4e6", personagem: "sumulicornio" },
  { id: "penhora", nome: "Penhora", icone: arte("penhora"), descricao: "Recolhe as moedas da tela; cada uma vale 2 pontos.", duracao: 0, cor: "#b3261e", personagem: "falcao-falimentar" },
  { id: "praga", nome: "Praga", icone: arte("praga"), descricao: "Ganha 10 moedas e o mundo fica lento por 6 s.", duracao: 0, cor: "#8dc63f", personagem: "gafanhoto-mora" },
];

export const poderPorId = (id: string) => PODERES.find((p) => p.id === id)!;
