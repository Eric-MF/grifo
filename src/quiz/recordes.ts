// Os recordes do treino de questões e a página final de cada um, guardados só no navegador.
//
// Cada modo tem o seu recorde de pontos: o "Eu escolho" por nível e quantidade (como sempre foi), o modo automático por
// quantidade, e o modo infinito, com e sem o automático. Na quantidade fixa, só o treino completo conta; no infinito,
// qualquer um, e o recorde é gravado a cada resposta (fechar a página no meio não o perde). À parte, a maior sequência
// de acertos de qualquer treino. Cada recorde aponta para a sessão que o fez, guardada em pouco espaço (a questão vai
// pelo id e pelos nomes sorteados, e é refeita do acervo), para rever a página final dela.
import type { AlternativaVista, Revisao } from "./PerguntaCorpo";
import { textoParaCopiar, textoResposta } from "./copiar";
import { maximoTreino, NOME_NIVEL, TAMANHO_TREINO } from "./pontuacao";
import type { Categoria, Nivel, Pergunta } from "./types";
import { nomePeca, type Correcao } from "./verificar";
import { gravarJSON, lerJSON, remover } from "@/lib/storage";

/** Quantas questões: um número fixo ou "infinito" (uma atrás da outra, até encerrar). */
export type Tamanho = number | "infinito";
export interface ModoTreino {
  automatico: boolean;
  tamanho: Tamanho;
  /** o nível escolhido (no automático, quem escolhe é o modo) */
  nivel: Nivel;
}

/** Uma questão respondida no treino. */
export interface Rodada {
  pergunta: Pergunta;
  /** o nível em que a questão foi respondida (no modo infinito ele pode mudar no meio) */
  nivel: Nivel;
  acertou: boolean;
  segundos: number;
  pontos: number;
  /** a questão como ficou depois de respondida, para revê-la no resultado */
  revisao: Revisao;
  /** no modo automático, a recapitulação de um tipo já vencido */
  recapitulacao?: boolean;
}

/** Uma linha da página final: a rodada, com a questão refeita (null quando ela saiu do acervo). */
export interface LinhaResultado {
  titulo: string;
  categoria: Categoria;
  nivel: Nivel;
  acertou: boolean;
  segundos: number;
  pontos: number;
  recapitulacao?: boolean;
  pergunta: Pergunta | null;
  revisao: Revisao | null;
}

/** Na peça, o nome dela (a resposta); nas outras, de onde a questão saiu ("XL Exame · 1ª fase, questão 57"). */
const tituloDa = (p: Pergunta) => (p.formato === "peca" ? nomePeca(p.resposta.peca) : p.fonte);

export const linhaDaRodada = (r: Rodada): LinhaResultado => ({
  titulo: tituloDa(r.pergunta),
  categoria: r.pergunta.categorias[0]!,
  nivel: r.nivel,
  acertou: r.acertou,
  segundos: r.segundos,
  pontos: r.pontos,
  ...(r.recapitulacao ? { recapitulacao: true } : {}),
  pergunta: r.pergunta,
  revisao: r.revisao,
});

/** "2" é o Médio com 10 questões (a chave de antes), "2:20" com 20; "auto:20", "auto:infinito" e "infinito". */
export function chaveDoModo({ automatico, tamanho, nivel }: ModoTreino): string {
  if (automatico) return `auto:${tamanho}`;
  if (tamanho === "infinito") return "infinito";
  return tamanho === TAMANHO_TREINO ? String(nivel) : `${nivel}:${tamanho}`;
}

/** "Modo automático · infinito", "Modo automático · 20 questões", "Modo infinito", "Médio · 10 questões". */
export function rotuloDaChave(chave: string): string {
  const [a, b] = chave.split(":");
  if (a === "auto") return b === "infinito" ? "Modo automático · infinito" : `Modo automático · ${b} questões`;
  if (a === "infinito") return "Modo infinito";
  return `${NOME_NIVEL[Number(a) as Nivel] ?? a} · ${b ?? TAMANHO_TREINO} questões`;
}

/** Os pontos possíveis no "Eu escolho" com quantidade fixa; null nos outros (o nível muda, ou não há fim). */
export function maximoDaChave(chave: string): number | null {
  const [a, b] = chave.split(":");
  const nivel = Number(a);
  if (!(nivel >= 1 && nivel <= 3)) return null;
  return maximoTreino(nivel as Nivel, b ? Number(b) : TAMANHO_TREINO);
}

/** A ordem nas listas: o automático e o infinito primeiro, depois cada nível, das menores quantidades às maiores. */
export function ordemDasChaves(a: string, b: string): number {
  const peso = (k: string) => {
    const [x, y] = k.split(":");
    if (x === "auto") return y === "infinito" ? 0 : 1 + Number(y) / 1000;
    if (x === "infinito") return 2;
    return 2 + Number(x) + Number(y ?? TAMANHO_TREINO) / 1000;
  };
  return peso(a) - peso(b);
}

export interface Recorde {
  pontos: number;
  /** questões respondidas e acertos (os recordes de antes só tinham os pontos) */
  questoes?: number;
  acertos?: number;
  /** quando a sessão terminou (ou, no infinito, a última resposta) */
  quando?: number;
  /** a sessão guardada, para rever a página final */
  sessao?: string;
}
export interface RecordeSequencia {
  /** acertos seguidos */
  seguidos: number;
  /** o modo em que foi feita */
  chave: string;
  quando: number;
  sessao?: string;
}
export interface Recordes {
  modos: Record<string, Recorde>;
  sequencia?: RecordeSequencia;
}

/** Uma questão da sessão guardada: o id e os nomes refazem a questão; o título e o tipo ficam se ela sair do acervo. */
export interface RodadaGuardada {
  id: string;
  nomes?: string[];
  titulo: string;
  categoria: Categoria;
  nivel: Nivel;
  acertou: boolean;
  segundos: number;
  pontos: number;
  recapitulacao?: true;
  comando: string;
  alternativas: AlternativaVista[];
  correcao: Correcao;
}
export interface SessaoGuardada extends ModoTreino {
  v: 1;
  id: string;
  chave: string;
  inicio: number;
  fim: number;
  /** onde o modo automático ficou ("Peça e fundamento · Médio") */
  ondeAuto?: string;
  strikes: number;
  rodadas: RodadaGuardada[];
}

export const pontosDe = (rodadas: readonly { pontos: number }[]) => rodadas.reduce((s, r) => s + r.pontos, 0);

/** A maior sequência de acertos seguidos. */
export function melhorSequencia(rodadas: readonly { acertou: boolean }[]): number {
  let melhor = 0;
  let atual = 0;
  for (const r of rodadas) {
    atual = r.acertou ? atual + 1 : 0;
    melhor = Math.max(melhor, atual);
  }
  return melhor;
}

export function guardarRodada(r: Rodada): RodadaGuardada {
  const p = r.pergunta;
  return {
    id: p.id,
    ...(p.nomes?.length ? { nomes: p.nomes } : {}),
    titulo: tituloDa(p),
    categoria: p.categorias[0]!,
    nivel: r.nivel,
    acertou: r.acertou,
    segundos: Math.round(r.segundos * 10) / 10,
    pontos: r.pontos,
    ...(r.recapitulacao ? { recapitulacao: true as const } : {}),
    comando: r.revisao.comando,
    alternativas: r.revisao.alternativas,
    correcao: r.revisao.correcao,
  };
}

/**
 * As linhas da página final de uma sessão guardada. `achar` refaz a questão pelo id e pelos nomes (perguntaPorId, em
 * banco.ts); o texto copiado pelo ícone é montado de novo, como era na tela.
 */
export function linhasDaSessao(s: SessaoGuardada, achar: (id: string, nomes?: readonly string[]) => Pergunta | null): LinhaResultado[] {
  return s.rodadas.map((g) => {
    const p = achar(g.id, g.nomes);
    const textos = g.alternativas.map((a) => a.texto);
    const revisao: Revisao | null = p
      ? {
          comando: g.comando,
          alternativas: g.alternativas,
          correcao: g.correcao,
          copia: textoParaCopiar(
            p,
            g.nivel,
            g.comando,
            textos.map((nome) => ({ nome })),
            textos.map((texto) => ({ texto })),
            textoResposta(p, g.correcao),
          ),
        }
      : null;
    return {
      titulo: g.titulo,
      categoria: g.categoria,
      nivel: g.nivel,
      acertou: g.acertou,
      segundos: g.segundos,
      pontos: g.pontos,
      ...(g.recapitulacao ? { recapitulacao: true } : {}),
      pergunta: p,
      revisao,
    };
  });
}

/**
 * Os recordes depois desta sessão. `contaPontos`: a sessão vale para o recorde de pontos do modo (na quantidade fixa,
 * só completa). Bate o recorde quem faz mais pontos (o empate fica com o mais antigo); a sessão que já é a dona do
 * recorde (o infinito, gravado a cada resposta) só o atualiza. O mesmo vale para a maior sequência de acertos.
 * `pontos` e `sequencia` dizem se a sessão ficou com cada recorde.
 */
export function registrarSessao(antes: Recordes, s: SessaoGuardada, contaPontos: boolean): { recordes: Recordes; pontos: boolean; sequencia: boolean } {
  const total = pontosDe(s.rodadas);
  const atual = antes.modos[s.chave];
  const pontos = contaPontos && (atual?.sessao === s.id || total > (atual?.pontos ?? 0));
  const seguidos = melhorSequencia(s.rodadas);
  const seq = antes.sequencia;
  const sequencia = seguidos > 0 && (seq?.sessao === s.id || seguidos > (seq?.seguidos ?? 0));
  const recordes: Recordes = {
    modos: pontos
      ? { ...antes.modos, [s.chave]: { pontos: total, questoes: s.rodadas.length, acertos: s.rodadas.filter((r) => r.acertou).length, quando: s.fim, sessao: s.id } }
      : antes.modos,
    ...(sequencia ? { sequencia: { seguidos, chave: s.chave, quando: s.fim, sessao: s.id } } : antes.sequencia ? { sequencia: antes.sequencia } : {}),
  };
  return { recordes, pontos, sequencia };
}

/** As sessões que algum recorde usa. */
export function sessoesUsadas(r: Recordes): Set<string> {
  const ids = new Set<string>();
  for (const m of Object.values(r.modos)) if (m.sessao) ids.add(m.sessao);
  if (r.sequencia?.sessao) ids.add(r.sequencia.sessao);
  return ids;
}

const numero = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);

/**
 * Lê os recordes gravados: os de antes (`grifo:treino`, só os pontos do "Eu escolho") e os de agora; na mesma chave,
 * fica o maior (no empate, o de agora, que tem os detalhes).
 */
export function juntarRecordes(antigos: unknown, novos: unknown): Recordes {
  const modos: Record<string, Recorde> = {};
  if (antigos && typeof antigos === "object")
    for (const [k, v] of Object.entries(antigos)) if (numero(v) && v > 0) modos[k] = { pontos: v };
  const n = (novos && typeof novos === "object" ? novos : {}) as Partial<Recordes>;
  if (n.modos && typeof n.modos === "object")
    for (const [k, v] of Object.entries(n.modos)) if (v && numero(v.pontos) && v.pontos > 0 && v.pontos >= (modos[k]?.pontos ?? 0)) modos[k] = v;
  const s = n.sequencia;
  return { modos, ...(s && numero(s.seguidos) && s.seguidos > 0 && typeof s.chave === "string" ? { sequencia: s } : {}) };
}

/** Os pontos do "Eu escolho" com quantidade fixa, como eram gravados antes. */
const CHAVE_ANTIGA = "grifo:treino";
const CHAVE_RECORDES = "grifo:treino:recordes";
const chaveDaSessao = (id: string) => `grifo:treino:sessao:${id}`;

/** "1 acerto seguido", "12 acertos seguidos". */
export const acertosSeguidos = (n: number) => `${n} ${n === 1 ? "acerto seguido" : "acertos seguidos"}`;

/** A página que mostra a sessão guardada (a página final do recorde). */
export const enderecoDaSessao = (id: string) => `/treino/resultado/?s=${encodeURIComponent(id)}`;

export const lerRecordes = (): Recordes => juntarRecordes(lerJSON<unknown>(CHAVE_ANTIGA, {}), lerJSON<unknown>(CHAVE_RECORDES, {}));

export function lerSessao(id: string): SessaoGuardada | null {
  const s = lerJSON<SessaoGuardada | null>(chaveDaSessao(id), null);
  return s && s.v === 1 && Array.isArray(s.rodadas) ? s : null;
}

/**
 * Grava os recordes que a sessão bateu e a sessão que eles usam, e apaga as sessões que nenhum recorde usa mais. Sem
 * espaço para a sessão, o recorde fica, sem a página final.
 */
export function gravarSessao(s: SessaoGuardada, contaPontos: boolean): { pontos: boolean; sequencia: boolean } {
  const antes = lerRecordes();
  const r = registrarSessao(antes, s, contaPontos);
  if (!r.pontos && !r.sequencia) return r;
  let recordes = r.recordes;
  if (!gravarJSON(chaveDaSessao(s.id), s)) {
    const sem = ({ sessao, ...x }: { sessao?: string }) => (sessao === s.id ? x : { ...x, sessao });
    recordes = {
      modos: Object.fromEntries(Object.entries(recordes.modos).map(([k, v]) => [k, sem(v) as Recorde])),
      ...(recordes.sequencia ? { sequencia: sem(recordes.sequencia) as RecordeSequencia } : {}),
    };
  }
  gravarJSON(CHAVE_RECORDES, recordes);
  const usadas = sessoesUsadas(recordes);
  for (const id of sessoesUsadas(antes)) if (!usadas.has(id)) remover(chaveDaSessao(id));
  return r;
}
