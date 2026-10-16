// Contadores de conquista do usuário: valem entre jogos e sessões e alimentam as regras de desbloqueio
// (ver src/games/regras.ts). Ficam em localStorage, na chave `grifo:conquistas`. As funções `registrar*`
// são puras; `atualizarConquistas` grava e avisa a página (evento `grifo:conquistas`).
import { gravarJSON, lerJSON } from "./storage";

export const CHAVE_CONQUISTAS = "grifo:conquistas";
export const EVENTO_CONQUISTAS = "grifo:conquistas";

const DIA_MS = 86_400_000;
const SETE_DIAS_MS = 7 * DIA_MS;

export interface Conquistas {
  /** respostas certas seguidas (qualquer tipo de pergunta, no jogo ou no treino); zera ao errar */
  acertosSeguidos: number;
  /** respostas certas por categoria de pergunta */
  acertosPorCategoria: Record<string, number>;
  /** a resposta mais rápida já dada, em milissegundos (null se nenhuma) */
  menorTempoRespostaMs: number | null;
  /** dias seguidos com o tema escuro do site; `dia` é o último dia registrado */
  diasEscuro: { sequencia: number; dia: string | null; escuro: boolean };
  /** última abertura do site (ISO) */
  ultimaVisita: string | null;
  /** voltou depois de mais de 7 dias sem abrir; a cobrança sai uma vez, ao ser processada */
  ausenciaPendente: boolean;
  /** cliques em artigos citados nas respostas */
  cliquesArtigos: number;
  /** a pausa mais longa do jogo, em milissegundos */
  maiorPausaMs: number;
  /** o maior tempo seguido na tela do jogo, sem trocar de aba, em milissegundos */
  maiorFocoMs: number;
  /** tentativas de compra sem moedas suficientes */
  tentativasCompra: number;
}

export const CONQUISTAS_INICIAL: Conquistas = {
  acertosSeguidos: 0,
  acertosPorCategoria: {},
  menorTempoRespostaMs: null,
  diasEscuro: { sequencia: 0, dia: null, escuro: false },
  ultimaVisita: null,
  ausenciaPendente: false,
  cliquesArtigos: 0,
  maiorPausaMs: 0,
  maiorFocoMs: 0,
  tentativasCompra: 0,
};

/** Data local no formato AAAA-MM-DD. */
export function diaISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Dia anterior de uma data AAAA-MM-DD. */
function diaAnterior(dia: string): string {
  return new Date(Date.parse(dia) - DIA_MS).toISOString().slice(0, 10);
}

export function registrarResposta(c: Conquistas, r: { acertou: boolean; categorias: string[]; tempoMs: number }): Conquistas {
  const porCategoria = { ...c.acertosPorCategoria };
  if (r.acertou) for (const cat of r.categorias) porCategoria[cat] = (porCategoria[cat] ?? 0) + 1;
  return {
    ...c,
    acertosSeguidos: r.acertou ? c.acertosSeguidos + 1 : 0,
    acertosPorCategoria: porCategoria,
    menorTempoRespostaMs: c.menorTempoRespostaMs === null ? r.tempoMs : Math.min(c.menorTempoRespostaMs, r.tempoMs),
  };
}

export const registrarArtigo = (c: Conquistas): Conquistas => ({ ...c, cliquesArtigos: c.cliquesArtigos + 1 });
export const registrarPausa = (c: Conquistas, ms: number): Conquistas => ({ ...c, maiorPausaMs: Math.max(c.maiorPausaMs, ms) });
export const registrarFoco = (c: Conquistas, ms: number): Conquistas => ({ ...c, maiorFocoMs: Math.max(c.maiorFocoMs, ms) });
export const registrarTentativaCompra = (c: Conquistas): Conquistas => ({ ...c, tentativasCompra: c.tentativasCompra + 1 });
export const consumirAusencia = (c: Conquistas): Conquistas => ({ ...c, ausenciaPendente: false });

/**
 * Abertura do site: registra a visita, marca a ausência longa e conta o dia do tema escuro.
 * Só a primeira visita de cada dia decide o dia; a sequência continua quando o dia anterior também foi escuro.
 */
export function registrarVisita(c: Conquistas, agora: Date, escuro: boolean): Conquistas {
  const hoje = diaISO(agora);
  const ausente = c.ultimaVisita !== null && agora.getTime() - Date.parse(c.ultimaVisita) > SETE_DIAS_MS;
  let diasEscuro = c.diasEscuro;
  if (diasEscuro.dia !== hoje) {
    const seguido = diasEscuro.dia === diaAnterior(hoje) && diasEscuro.escuro && escuro;
    diasEscuro = { sequencia: escuro ? (seguido ? diasEscuro.sequencia + 1 : 1) : 0, dia: hoje, escuro };
  }
  return { ...c, ultimaVisita: agora.toISOString(), ausenciaPendente: c.ausenciaPendente || ausente, diasEscuro };
}

export function lerConquistas(): Conquistas {
  const salvo = lerJSON<Partial<Conquistas>>(CHAVE_CONQUISTAS, {});
  return {
    ...CONQUISTAS_INICIAL,
    ...salvo,
    acertosPorCategoria: { ...(salvo.acertosPorCategoria ?? {}) },
    diasEscuro: { ...CONQUISTAS_INICIAL.diasEscuro, ...(salvo.diasEscuro ?? {}) },
  };
}

/** Aplica uma mudança, grava e avisa a página. */
export function atualizarConquistas(mudar: (c: Conquistas) => Conquistas): Conquistas {
  const novo = mudar(lerConquistas());
  gravarJSON(CHAVE_CONQUISTAS, novo);
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENTO_CONQUISTAS));
  return novo;
}
