// Contas da aba "Meu desempenho": os simulados, o treino, o calendário de estudo e a sugestão do próximo simulado.
// Funções puras sobre o que o navegador guardou (tentativas, atividade, erros por artigo).
import { NOTA_CORTE, type ResultadoExame } from "@/lib/correcao/grader";
import type { Atividade, Placar } from "@/lib/atividade";
import type { Evento } from "@/lib/erros";
import type { Categoria } from "@/quiz/types";
import type { ExameEstat } from "./tipos";

const DIA_MS = 86_400_000;

export interface Fracao {
  /** pontos obtidos */
  o: number;
  /** pontos possíveis */
  v: number;
}

/** As partes da tabela de pontos da peça, juntadas pelo que o aluno treina. */
export type SecaoPeca = "enderecamento" | "preliminares" | "merito" | "pedidos" | "fechamento";
export const SECOES_PECA: { id: SecaoPeca; nome: string }[] = [
  { id: "enderecamento", nome: "Endereçamento e cabimento" },
  { id: "preliminares", nome: "Preliminares" },
  { id: "merito", nome: "Teses de mérito" },
  { id: "pedidos", nome: "Pedidos" },
  { id: "fechamento", nome: "Prazo e fechamento" },
];

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Em que parte da peça fica um item: pela seção da tabela da FGV ("Endereçamento", "Pedidos"…) e, sem seção (ou com
 * uma seção que é o nome da peça inteira), pela descrição do item.
 */
export function secaoDoItem(secao: string | undefined, descricao: string): SecaoPeca {
  const s = semAcento(secao ?? "");
  if (/endere|interposi|juntada|cabimento/.test(s)) return "enderecamento";
  if (/prelimin/.test(s)) return "preliminares";
  if (/pedido/.test(s)) return "pedidos";
  if (/prazo|tempestiv|fechamento|estrutura/.test(s)) return "fechamento";
  if (/merito|razo|fundament|teses|recursa|contrarraz/.test(s)) return "merito";
  const d = semAcento(descricao);
  if (/endere[cç]|interposi|^fundamento\b|cabimento|peti[cç][aã]o de juntada/.test(d)) return "enderecamento";
  if (/prelimin/.test(d)) return "preliminares";
  if (/^pedido|\bpedidos?\b/.test(d.slice(0, 40))) return "pedidos";
  if (/^(prazo|data|tempestiv|fechamento|local|assinatura)|ultimo dia do prazo/.test(d)) return "fechamento";
  return "merito";
}

export interface ResumoTentativa {
  id: string;
  exameId: string;
  quando: number;
  total: number;
  maximo: number;
  aprovado: boolean;
  peca: Fracao;
  questoes: Fracao[];
  duracaoSeg: number;
  /** a peça por partes da tabela */
  secoes: Partial<Record<SecaoPeca, Fracao>>;
  /** a peça foi zerada (peça inadequada) */
  pecaZerada: boolean;
}

interface TentativaMinima {
  id: string;
  exameId: string;
  criadaEm: number;
  duracaoSeg: number;
  resultado: ResultadoExame;
}

export function resumirTentativa(t: TentativaMinima): ResumoTentativa {
  const partes = t.resultado.partes;
  const peca = partes.find((p) => p.parte === "peca");
  const secoes: Partial<Record<SecaoPeca, Fracao>> = {};
  // a peça inadequada zera a nota, mas os itens mostram o que a pessoa acertou: aqui vale a nota que ficou
  const zerada = !!peca && peca.obtido === 0 && peca.obtidoBruto > 0;
  for (const it of peca?.itens ?? []) {
    const s = secaoDoItem(it.secao, it.descricao);
    const f = (secoes[s] ??= { o: 0, v: 0 });
    f.o += zerada ? 0 : it.obtido;
    f.v += it.valor;
  }
  return {
    id: t.id,
    exameId: t.exameId,
    quando: t.criadaEm,
    total: t.resultado.total,
    maximo: t.resultado.maximo,
    aprovado: t.resultado.total >= NOTA_CORTE,
    peca: { o: peca?.obtido ?? 0, v: peca?.valor ?? 5 },
    questoes: partes.filter((p) => p.parte !== "peca").map((p) => ({ o: p.obtido, v: p.valor })),
    duracaoSeg: t.duracaoSeg,
    secoes,
    pecaZerada: zerada,
  };
}

/** O começo do período (ms), ou null para "tudo". */
export const inicioDoPeriodo = (dias: number | null, agora: number) => (dias === null ? null : agora - dias * DIA_MS);

export const somaFracoes = (fs: Fracao[]): Fracao => fs.reduce((s, f) => ({ o: s.o + f.o, v: s.v + f.v }), { o: 0, v: 0 });
export const pct = (f: Fracao) => (f.v ? f.o / f.v : 0);

export interface ResumoSimulados {
  n: number;
  aprovados: number;
  media: number | null;
  melhor: ResumoTentativa | null;
  /** a média das 3 mais recentes menos a das anteriores (null com menos de 4) */
  tendencia: number | null;
  tempoMedioSeg: number | null;
  /** a peça e as questões, somadas */
  peca: Fracao;
  questoes: Fracao;
  /** cada questão pela posição (Questão 1, 2…) */
  porQuestao: Fracao[];
  secoes: { id: SecaoPeca; nome: string; f: Fracao }[];
}

export function resumoSimulados(rs: ResumoTentativa[]): ResumoSimulados {
  const ordem = [...rs].sort((a, b) => a.quando - b.quando);
  const media = (xs: ResumoTentativa[]) => xs.reduce((s, r) => s + r.total, 0) / xs.length;
  const porQuestao: Fracao[] = [];
  for (const r of rs) r.questoes.forEach((q, i) => (porQuestao[i] = somaFracoes([porQuestao[i] ?? { o: 0, v: 0 }, q])));
  const comTempo = rs.filter((r) => r.duracaoSeg > 0);
  return {
    n: rs.length,
    aprovados: rs.filter((r) => r.aprovado).length,
    media: rs.length ? media(rs) : null,
    melhor: rs.reduce<ResumoTentativa | null>((m, r) => (!m || r.total > m.total ? r : m), null),
    tendencia: ordem.length >= 4 ? media(ordem.slice(-3)) - media(ordem.slice(0, -3)) : null,
    tempoMedioSeg: comTempo.length ? comTempo.reduce((s, r) => s + r.duracaoSeg, 0) / comTempo.length : null,
    peca: somaFracoes(rs.map((r) => r.peca)),
    questoes: somaFracoes(rs.flatMap((r) => r.questoes)),
    porQuestao,
    secoes: SECOES_PECA.map((s) => ({ ...s, f: somaFracoes(rs.map((r) => r.secoes[s.id] ?? { o: 0, v: 0 })) })).filter((s) => s.f.v > 0),
  };
}

/** A melhor tentativa de cada exame. */
export function melhoresPorExame(rs: ResumoTentativa[]): Map<string, ResumoTentativa & { vezes: number }> {
  const m = new Map<string, ResumoTentativa & { vezes: number }>();
  for (const r of rs) {
    const atual = m.get(r.exameId);
    if (!atual) m.set(r.exameId, { ...r, vezes: 1 });
    else m.set(r.exameId, { ...(r.total > atual.total ? r : atual), vezes: atual.vezes + 1 });
  }
  return m;
}

export interface ResumoTreino {
  a: number;
  e: number;
  tempoMedioMs: number | null;
  porCategoria: Partial<Record<Categoria, Placar>>;
  porPeca: Record<string, Placar>;
}

const somarPlacar = (x: Placar | undefined, y: Placar): Placar => [(x?.[0] ?? 0) + y[0], (x?.[1] ?? 0) + y[1]];

/** O treino e os jogos somados desde o dia `desde` (AAAA-MM-DD, incluído), ou de todos os dias guardados. */
export function resumoTreino(at: Atividade, desde: string | null): ResumoTreino {
  const r: ResumoTreino = { a: 0, e: 0, tempoMedioMs: null, porCategoria: {}, porPeca: {} };
  let ms = 0;
  for (const [dia, d] of Object.entries(at.dias)) {
    if (desde && dia < desde) continue;
    r.a += d.a;
    r.e += d.e;
    ms += d.ms;
    for (const [c, p] of Object.entries(d.c) as [Categoria, Placar][]) r.porCategoria[c] = somarPlacar(r.porCategoria[c], p);
    for (const [t, p] of Object.entries(d.p)) r.porPeca[t] = somarPlacar(r.porPeca[t], p);
  }
  if (r.a + r.e) r.tempoMedioMs = ms / (r.a + r.e);
  return r;
}

export interface DiaCalendario {
  dia: string;
  respostas: number;
  /** as respostas certas e erradas do dia (respostas = acertos + erros) */
  acertos: number;
  erros: number;
  simulados: number;
  /** os ids das tentativas de simulado do dia, na ordem em que foram feitas */
  tentativas: string[];
  /** de 0 (nada) a 4 (o dia mais cheio do período) */
  nivel: 0 | 1 | 2 | 3 | 4;
  /** um dia depois de hoje (a semana em curso): fica vazio */
  futuro: boolean;
}

export interface Calendario {
  /** semanas de domingo a sábado, da mais antiga para a atual */
  semanas: DiaCalendario[][];
  /** o dia de hoje (AAAA-MM-DD) */
  hoje: string;
  diasAtivos: number;
  sequenciaAtual: number;
  maiorSequencia: number;
}

const diaLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * O calendário de estudo das últimas `semanas` semanas: as respostas do treino e dos jogos, mais os simulados. Os
 * eventos de erro por artigo (que existem desde antes da atividade) contam o dia quando a atividade não tem nada nele.
 */
export function calendario(at: Atividade, tentativas: { quando: number; id?: string }[], eventos: Evento[], hoje: Date, semanas = 26): Calendario {
  // [acertos, erros] de cada dia
  const placar = new Map<string, Placar>();
  for (const [dia, d] of Object.entries(at.dias)) placar.set(dia, [d.a, d.e]);
  const doErro = new Map<string, Placar>();
  for (const e of eventos) {
    if (e.o === "simulado") continue;
    const dia = diaLocal(new Date(e.t));
    const p = doErro.get(dia) ?? [0, 0];
    p[e.r ? 0 : 1]++;
    doErro.set(dia, p);
  }
  for (const [dia, p] of doErro) if (!placar.has(dia)) placar.set(dia, p);
  const respostas = new Map([...placar].map(([dia, [a, e]]) => [dia, a + e]));
  const simulados = new Map<string, string[]>();
  for (const t of [...tentativas].sort((a, b) => a.quando - b.quando)) {
    const dia = diaLocal(new Date(t.quando));
    simulados.set(dia, [...(simulados.get(dia) ?? []), t.id ?? ""]);
  }
  const ativo = (dia: string) => (respostas.get(dia) ?? 0) > 0 || (simulados.get(dia)?.length ?? 0) > 0;

  const fim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const inicio = new Date(fim);
  inicio.setDate(inicio.getDate() - fim.getDay() - (semanas - 1) * 7);
  const hojeISO = diaLocal(fim);
  const todos: DiaCalendario[] = [];
  for (let d = new Date(inicio); todos.length < semanas * 7; d.setDate(d.getDate() + 1)) {
    const dia = diaLocal(d);
    const [acertos, erros] = placar.get(dia) ?? [0, 0];
    const sims = simulados.get(dia) ?? [];
    todos.push({ dia, respostas: acertos + erros, acertos, erros, simulados: sims.length, tentativas: sims, nivel: 0, futuro: dia > hojeISO });
  }
  // um simulado vale como 20 respostas no peso do dia
  const peso = (x: DiaCalendario) => x.respostas + x.simulados * 20;
  const maximo = Math.max(0, ...todos.map(peso));
  for (const x of todos) {
    const p = peso(x);
    x.nivel = p === 0 || maximo === 0 ? 0 : (Math.min(4, Math.max(1, Math.ceil((p / maximo) * 4))) as 1 | 2 | 3 | 4);
  }

  // sequências: dias seguidos com estudo (a de hoje continua valendo até o fim do dia, contando de ontem)
  const diasAtivos = new Set([...respostas.keys(), ...simulados.keys()].filter(ativo));
  let sequenciaAtual = 0;
  const cursor = new Date(fim);
  if (!diasAtivos.has(hojeISO)) cursor.setDate(cursor.getDate() - 1);
  while (diasAtivos.has(diaLocal(cursor))) {
    sequenciaAtual++;
    cursor.setDate(cursor.getDate() - 1);
  }
  let maiorSequencia = 0;
  let corrente = 0;
  let anterior: string | null = null;
  for (const dia of [...diasAtivos].sort()) {
    const ontem: string | null = anterior;
    const esperado = ontem ? diaLocal(new Date(Date.parse(`${ontem}T12:00:00`) + DIA_MS)) : null;
    corrente = esperado === dia ? corrente + 1 : 1;
    maiorSequencia = Math.max(maiorSequencia, corrente);
    anterior = dia;
  }
  return {
    semanas: Array.from({ length: semanas }, (_, i) => todos.slice(i * 7, i * 7 + 7)),
    hoje: hojeISO,
    diasAtivos: todos.filter((x) => !x.futuro && ativo(x.dia)).length,
    sequenciaAtual,
    maiorSequencia,
  };
}

/** o que a sugestão lê de cada exame (as Estatísticas passam o ExameEstat inteiro; os Simulados, só isto) */
type ExameSugerivel = Pick<ExameEstat, "id" | "noSite" | "corrigivel" | "era" | "variante" | "pecas" | "ordem">;

export interface Sugestao<E extends ExameSugerivel = ExameEstat> {
  exame: E;
  motivo: string;
}

/**
 * O próximo simulado: um exame ainda não feito da peça que mais cai entre as que a pessoa menos treinou; com todos
 * feitos, o de nota mais baixa.
 */
export function sugerirSimulado<E extends ExameSugerivel>(
  exames: E[],
  melhores: Map<string, Pick<ResumoTentativa, "exameId" | "total">>,
  nomePeca: (t: string) => string,
  mostrarPeca: boolean,
): Sugestao<E> | null {
  const corrigiveis = exames.filter((e) => e.noSite && e.corrigivel);
  if (!corrigiveis.length) return null;
  const fgv = corrigiveis.filter((e) => e.era === "fgv" && !e.variante);
  const vezes = new Map<string, number>();
  for (const e of fgv) vezes.set(e.pecas[0]!, (vezes.get(e.pecas[0]!) ?? 0) + 1);
  const feitosPorPeca = new Map<string, number>();
  for (const e of corrigiveis) if (melhores.has(e.id)) feitosPorPeca.set(e.pecas[0]!, (feitosPorPeca.get(e.pecas[0]!) ?? 0) + 1);
  const naoFeitos = corrigiveis.filter((e) => !melhores.has(e.id));
  if (naoFeitos.length) {
    const tipos = [...new Set(naoFeitos.map((e) => e.pecas[0]!))].sort(
      (a, b) => (feitosPorPeca.get(a) ?? 0) - (feitosPorPeca.get(b) ?? 0) || (vezes.get(b) ?? 0) - (vezes.get(a) ?? 0),
    );
    const tipo = tipos[0]!;
    const exame = naoFeitos.filter((e) => e.pecas[0] === tipo).sort((a, b) => b.ordem - a.ordem)[0]!;
    const feitos = feitosPorPeca.get(tipo) ?? 0;
    const caiu = vezes.get(tipo) ?? 0;
    const peca = mostrarPeca ? nomePeca(tipo) : "a peça deste exame";
    const motivo =
      feitos === 0
        ? `${mostrarPeca ? `${peca} caiu` : "A peça deste exame caiu"} ${caiu} ${caiu === 1 ? "vez" : "vezes"} na FGV, e você ainda não fez nenhum simulado dela.`
        : `Você fez ${feitos} ${feitos === 1 ? "simulado" : "simulados"} de ${peca}, a peça que você menos treinou entre as que faltam.`;
    return { exame, motivo };
  }
  const pior = [...melhores.values()].sort((a, b) => a.total - b.total)[0];
  const exame = pior && corrigiveis.find((e) => e.id === pior.exameId);
  if (!pior || !exame) return null;
  return { exame, motivo: `Você já fez todos os simulados. Este foi o da nota mais baixa: ${pior.total.toFixed(2).replace(".", ",")}.` };
}
