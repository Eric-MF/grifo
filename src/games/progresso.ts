// Progresso do jogador por jogo: XP e moedas somam entre partidas e liberam itens.
import type { ItemJogo } from "./types";

export interface Progresso {
  xp: number;
  moedas: number;
  comprados: string[];
}

export const PROGRESSO_INICIAL: Progresso = { xp: 0, moedas: 0, comprados: [] };

/**
 * Arquivo local `.env.development.local` com NEXT_PUBLIC_GRIFO_DESBLOQUEAR_TUDO=1 libera
 * tudo em `next dev`. O arquivo fica fora do git (`.env*` no .gitignore) e não entra no build.
 */
const TUDO_LIBERADO =
  process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_GRIFO_DESBLOQUEAR_TUDO === "1";

export function desbloqueado(item: ItemJogo, p: Progresso): boolean {
  if (TUDO_LIBERADO) return true;
  if (item.xp !== undefined && p.xp < item.xp) return false;
  if (item.custo !== undefined && !p.comprados.includes(item.id)) return false;
  return true;
}
