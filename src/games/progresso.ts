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
  if (item.regras?.length && !p.comprados.includes(item.id)) return false;
  if (item.xp !== undefined && p.xp < item.xp) return false;
  if (item.custo !== undefined && !p.comprados.includes(item.id)) return false;
  return true;
}

/** Itens que já tinham sido liberados por XP (antes de terem regras) continuam liberados. */
export function migrarXpLegado(itens: ItemJogo[], p: Progresso): Progresso {
  const novos = itens.filter((i) => i.xpLegado !== undefined && p.xp >= i.xpLegado && !p.comprados.includes(i.id)).map((i) => i.id);
  return novos.length ? { ...p, comprados: [...p.comprados, ...novos] } : p;
}

/**
 * Personagens na ordem do seletor: os liberados primeiro, na ordem normal, e os bloqueados por último.
 * Um secreto bloqueado não entra na lista: ele só aparece depois de liberado.
 */
export function ordenarPersonagens(personagens: ItemJogo[], p: Progresso): ItemJogo[] {
  const visiveis = personagens.filter((i) => !i.secreto || desbloqueado(i, p));
  return [...visiveis.filter((i) => desbloqueado(i, p)), ...visiveis.filter((i) => !desbloqueado(i, p))];
}

/**
 * Itens do "Como jogar" que o jogador pode ver: os sem personagem dono e os poderes de personagens já liberados.
 * O poder de um personagem bloqueado some junto, sem revelar que ele existe.
 */
export function itensComoJogar<T extends { personagem?: string }>(itens: T[], personagens: ItemJogo[], p: Progresso): T[] {
  return itens.filter((it) => {
    if (it.personagem === undefined) return true;
    const dono = personagens.find((q) => q.id === it.personagem);
    return dono !== undefined && desbloqueado(dono, p);
  });
}
