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
}

type IdPoder =
  | keyof Efeitos
  | "prescricao"
  | "revisao"
  | "arquivamento"
  | "inquerito"
  | "denuncia"
  | "tipificacao"
  | "voo";

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
  { id: "leve", nome: "Asas de Ouro", icone: arte("leve"), descricao: "A justiça guiará o seu rumo.", duracao: 10, cor: "#f0c77e" },
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
];

export const poderPorId = (id: string) => PODERES.find((p) => p.id === id)!;
