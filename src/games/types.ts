// Contrato entre a plataforma de jogos (React) e cada jogo (canvas).
// Um jogo novo implementa GameModule; a plataforma fornece os serviços comuns
// (perguntas, anúncios, recordes, compartilhamento) e a interface ao redor.

interface PoderHud {
  id: string;
  nome: string;
  icone: string;
  restante: number; // 0..1
}
export interface Hud {
  pontos: number;
  vidas: number;
  poderes: PoderHud[];
  cenario: string;
  /** aviso passageiro (ex.: penalidade); some quando o jogo deixa de enviá-lo */
  aviso?: { titulo: string; peca?: string; texto: string };
}
export interface Estatisticas {
  pontos: number;
  /** estatísticas próprias do jogo, mostradas no fim e no card */
  extras?: { rotulo: string; valor: number }[];
  /** XP e moedas ganhos na partida, somados ao progresso guardado do jogador */
  progresso?: { xp: number; moedas: number };
  perguntas: number;
  acertos: number;
  duracaoSeg: number;
}

/** Item desbloqueável (estilo, personagem…). Sem `xp` nem `custo`, está sempre liberado. */
export interface ItemJogo {
  id: string;
  nome: string;
  descricao: string;
  /** XP total para liberar; abaixo disso o item aparece como "???" */
  xp?: number;
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
  }): Promise<boolean>;
  hud(h: Hud): void;
  fimDeJogo(s: Estatisticas): void;
  estado(e: "menu" | "pronto" | "jogando" | "pausado" | "pergunta" | "fim"): void;
}

export interface GameOptions {
  estilo: string;
  nivel: 1 | 2 | 3;
  som: boolean;
  movimentoReduzido: boolean;
  /** só em desenvolvimento (?debug=1): invulnerável e poder logo no início */
  debug?: boolean;
  personagem?: string;
}

export interface GameInstance {
  iniciar(): void;
  pausar(): void;
  continuar(): void;
  configurar(o: Partial<GameOptions>): void;
  destruir(): void;
}

export interface GameModule {
  criar(canvas: HTMLCanvasElement, host: GameHostApi, opcoes: GameOptions): GameInstance;
  estilos: ItemJogo[];
  personagens?: ItemJogo[];
  /** "Como jogar" do menu: texto e, opcionalmente, a lista de poderes/itens. */
  comoJogar?: { texto: string; itens?: { icone?: string; texto: string }[] };
}
