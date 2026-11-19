// Progresso do jogador por jogo: XP e moedas somam entre partidas e liberam itens.
import { janelaAtual } from "./calendario";
import type { ItemJogo } from "./types";

export interface Progresso {
  xp: number;
  moedas: number;
  comprados: string[];
  /** níveis das melhorias de poder compradas, por `"<poder>:<trilha>"` (os saves antigos não têm) */
  melhorias?: Record<string, number>;
}

export const PROGRESSO_INICIAL: Progresso = { xp: 0, moedas: 0, comprados: [] };

/**
 * Arquivo local `.env.development.local` com NEXT_PUBLIC_GRIFO_DESBLOQUEAR_TUDO=1 libera
 * tudo em `next dev`. O arquivo fica fora do git (`.env*` no .gitignore) e não entra no build.
 */
export const TUDO_LIBERADO =
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
 * Itens que aparecem no seletor. Um item `sequencial` fica escondido enquanto algum item anterior da lista estiver bloqueado;
 * os de um `grupo` só aparecem quando todos os itens sem grupo estão liberados; e um datado (`janela`) bloqueado só aparece
 * na semana do evento.
 */
export function itensVisiveis(itens: ItemJogo[], p: Progresso, agora: Date = new Date()): ItemJogo[] {
  const principaisLiberados = itens.filter((i) => !i.grupo).every((i) => desbloqueado(i, p));
  return itens.filter((item, i) => {
    if (item.grupo && !principaisLiberados) return false;
    if (item.janela && !desbloqueado(item, p) && !janelaAtual(item.janela, agora)) return false;
    return !item.sequencial || itens.slice(0, i).every((anterior) => desbloqueado(anterior, p));
  });
}

/** Um item datado só pode ser comprado na semana do evento; os outros, sempre. */
export const aVendaAgora = (item: ItemJogo, agora: Date = new Date()) => !item.janela || janelaAtual(item.janela, agora) !== null;

/**
 * Itens que o jogador pode ver (os poderes do menu): os sem personagem dono e os de personagens já liberados.
 * O poder de um personagem bloqueado some junto, sem revelar que ele existe.
 */
export function itensComoJogar<T extends { personagem?: string }>(itens: T[], personagens: ItemJogo[], p: Progresso): T[] {
  return itens.filter((it) => {
    if (it.personagem === undefined) return true;
    const dono = personagens.find((q) => q.id === it.personagem);
    return dono !== undefined && desbloqueado(dono, p);
  });
}

/** Nível comprado de uma trilha de melhoria de poder (0 se nunca comprou). */
export const nivelMelhoria = (p: Progresso, poder: string, trilha: string) => p.melhorias?.[`${poder}:${trilha}`] ?? 0;

/**
 * Compra o próximo nível de uma trilha de melhoria: desconta o custo e sobe o nível.
 * Devolve null se não houver moedas ou se a trilha já estiver no nível máximo (`maximo`).
 */
export function comprarMelhoria(p: Progresso, poder: string, trilha: string, custo: number, maximo: number): Progresso | null {
  const nivel = nivelMelhoria(p, poder, trilha);
  if (nivel >= maximo || p.moedas < custo) return null;
  return { ...p, moedas: p.moedas - custo, melhorias: { ...p.melhorias, [`${poder}:${trilha}`]: nivel + 1 } };
}
