// Contrato entre a plataforma de jogos (React) e cada jogo (canvas).
// Um jogo novo implementa GameModule; a plataforma fornece os serviços comuns
// (perguntas, anúncios, recordes, compartilhamento) e a interface ao redor.
import type { Categoria } from "@/quiz/types";
import type { FormatoContador } from "./contadores";

interface PoderHud {
  id: string;
  nome: string;
  icone: string;
  restante: number; // 0..1
}
export interface PoderProprioHud {
  nome: string;
  icone: string;
  cor: string;
  /** carregando: enchendo a barra; pronto: cheio, pode ser usado; ativo: em efeito */
  estado: "carregando" | "pronto" | "ativo";
  /** 0..1: carga enquanto carrega, tempo restante enquanto ativo */
  barra: number;
  segundos: number;
}
export interface Hud {
  pontos: number;
  vidas: number;
  /** moedas coletadas nesta partida; o HUD mostra abreviado (3k) */
  moedas: number;
  /** cores da moeda do estilo atual (ouro e borda), para o ícone do contador */
  moeda?: [string, string];
  poderes: PoderHud[];
  /** poder próprio do personagem escolhido, sempre visível durante a partida */
  poderProprio?: PoderProprioHud;
  /** aviso passageiro (ex.: penalidade); some quando o jogo deixa de enviá-lo */
  aviso?: { titulo: string; texto: string };
}
export interface Estatisticas {
  pontos: number;
  /** motivo da derrota quando não é a colisão comum: "sol" (Ícaro Liminar batendo no teto) */
  causa?: "sol";
  /** estatísticas próprias do jogo, mostradas no fim e no card */
  /** contagens extras do fim de jogo; `formato` abrevia moedas e XP como no resto do jogo (3k moedas, 1,2k XP) */
  extras?: { rotulo: string; valor: number; formato?: FormatoContador }[];
  /** XP e moedas ganhos na partida, somados ao progresso guardado do jogador */
  progresso?: { xp: number; moedas: number };
  perguntas: number;
  acertos: number;
  duracaoSeg: number;
}

/**
 * Condição que libera um item. Um item pode ter várias: basta uma.
 * Os contadores ficam em `grifo:conquistas` (globais, valem entre jogos e sessões).
 */
export type Regra =
  | { tipo: "categoria"; categoria: string; acertos: number }
  | { tipo: "sequencia"; acertos: number }
  | { tipo: "modo-escuro"; dias: number }
  | { tipo: "resposta-rapida"; ms: number }
  | { tipo: "pausa-longa"; ms: number }
  | { tipo: "foco"; ms: number }
  | { tipo: "artigos"; cliques: number }
  | { tipo: "tentativa-compra" }
  | { tipo: "todas-compras" }
  | { tipo: "horario"; de: number; ate: number }
  | { tipo: "moedas"; minimo: number; cobra: number }
  | { tipo: "ausencia"; dias: number; juros: number };

/** Item desbloqueável (estilo, personagem…). Sem `xp`, `custo` nem `regras`, está sempre liberado. */
export interface ItemJogo {
  id: string;
  nome: string;
  descricao: string;
  /** XP total para liberar; abaixo disso o item aparece como "???" */
  xp?: number;
  /** XP que liberava o item antes das `regras`: quem já tinha o XP continua com o item */
  xpLegado?: number;
  /** condições de desbloqueio (basta uma); o item só fica liberado quando uma delas for cumprida */
  regras?: Regra[];
  /** texto da condição, mostrado no lugar do nome enquanto o item está bloqueado */
  requisito?: string;
  /** secreto: não aparece no seletor enquanto está bloqueado; ao ser liberado aparece sem indicação */
  secreto?: boolean;
  /** resumo de como foi conseguido (dica do personagem) */
  comoObter?: string;
  /** moedas para comprar; só vale para itens que não dependem de XP */
  custo?: number;
  /** desenho do item no seletor (ex.: personagem); devolve false se ainda falta carregar algo */
  desenhar?: (c: CanvasRenderingContext2D, estilo: string) => void;
  /** poder que o item traz; mostrado ao passar o mouse, só quando o item está liberado */
  poder?: { nome: string; descricao: string; icone: string; duracao: number };
}

export interface GameHostApi {
  /** Pede uma pergunta ao jogador. Resolve com true se ele acertou. */
  perguntar(motivo: {
    tipo: "poder" | "reviver";
    poderId?: string;
    poderNome?: string;
    poderIcone?: string;
    poderDescricao?: string;
    poderDuracao?: number;
    carrega?: boolean;
  }): Promise<boolean>;
  hud(h: Hud): void;
  /** Retângulo do ícone de moedas do HUD: as moedas sugadas voam até ele (ver flap-suitcase/sucao.ts) */
  alvoMoedas?(): DOMRect | null;
  /** Recorde guardado do nível atual (0 se não há): a linha do recorde marca quando a partida o passa */
  recorde?(): number;
  fimDeJogo(s: Estatisticas): void;
  estado(e: "menu" | "pronto" | "jogando" | "pausado" | "pergunta" | "fim"): void;
}

export interface GameOptions {
  estilo: string;
  nivel: 1 | 2 | 3;
  som: boolean;
  movimentoReduzido: boolean;
  /** usa o poder do personagem sozinho assim que a barra enche */
  autoPoder?: boolean;
  /** só em desenvolvimento (?debug=1): invulnerável e poder logo no início */
  debug?: boolean;
  personagem?: string;
  /** tipos de pergunta que entram no quiz do jogo */
  categorias?: Categoria[];
}

export interface GameInstance {
  iniciar(): void;
  pausar(): void;
  continuar(): void;
  usarPoderProprio(): void;
  configurar(o: Partial<GameOptions>): void;
  destruir(): void;
}

/** Ícones do HUD em imagem: vidas, pausa, som e tela cheia. */
export interface IconesHud {
  coracao: string;
  pausa: string;
  somLigado: string;
  somDesligado: string;
  telaCheia: string;
  /** moldura 9-slice dos painéis do menu */
  moldura: string;
}

export interface GameModule {
  criar(canvas: HTMLCanvasElement, host: GameHostApi, opcoes: GameOptions): GameInstance;
  estilos: ItemJogo[];
  personagens?: ItemJogo[];
  /** "Como jogar" do menu: texto e, opcionalmente, a lista de poderes/itens. */
  comoJogar?: {
    texto: string;
    /** `personagem`: id do dono do poder; o item só aparece depois que ele for liberado */
    itens?: { icone?: string; texto: string; personagem?: string }[];
  };
  /** Ícones do HUD por estilo (o tema Pixel usa a arte 8-bit). Sem isso, o HUD usa emojis. */
  iconesHud?: (estilo: string) => IconesHud | null;
}
