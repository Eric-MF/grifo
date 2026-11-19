// Registro dos acertos e erros por dispositivo legal (artigo de lei), guardado só no navegador.
// Alimenta a leitura personalizada da lei: os artigos que o usuário mais erra.

import type { ResultadoExame } from "./correcao/grader.ts";
import { parseDispositivo, type Lexico } from "./correcao/citacoes.ts";
import type { ExameSimulado } from "./correcao/simulado.ts";
import type { Item } from "../content/schema.ts";
import { listarTentativas, type Tentativa } from "./tentativas.ts";
import { gravarJSON, lerJSON } from "./storage.ts";

export type Origem = "quiz" | "simulado" | "objetiva" | "discursiva";

export interface Evento {
  /** instante, em ms */
  t: number;
  o: Origem;
  /** diploma (id de content/leis.yaml), ou "sumulas-stf" / "sumulas-stj" / "sumulas-vinculantes" para súmulas */
  d: string;
  /** artigo, normalizado ("154-a") */
  a: string;
  p?: string;
  i?: string;
  /** 1 acerto, 0 erro */
  r: 0 | 1;
  /** id da pergunta ou do exame */
  q?: string;
}

export type NivelErro = "baixo" | "medio" | "alto";
export const NIVEIS_ERRO: NivelErro[] = ["baixo", "medio", "alto"];

export interface Agregado {
  diploma: string;
  artigo: string;
  erros: number;
  acertos: number;
  taxa: number;
  nivel: NivelErro | null;
  ultimo: number;
}

const K = "grifo:erros";
const MAX = 3000;
const DIA = 86_400_000;
const DIAS_GUARDADOS = 180;

export const lerEventos = () => lerJSON<{ v: 1; ev: Evento[] }>(K, { v: 1, ev: [] }).ev;

export function podar(eventos: Evento[], agora: number): Evento[] {
  return eventos.filter((e) => e.t >= agora - DIAS_GUARDADOS * DIA).slice(-MAX);
}

export function registrar(novos: Evento[], agora = Date.now()) {
  if (!novos.length) return;
  gravarJSON(K, { v: 1, ev: podar([...lerEventos(), ...novos], agora) });
}

export function nivelDe(erros: number, acertos: number): NivelErro | null {
  const tentativas = erros + acertos;
  const taxa = tentativas ? erros / tentativas : 0;
  if (erros >= 4 || (tentativas >= 3 && taxa >= 0.6)) return "alto";
  if (erros >= 2 || (erros >= 1 && taxa >= 0.5)) return "medio";
  if (erros >= 1) return "baixo";
  return null;
}

/** Soma por artigo os eventos dos últimos `janelaDias` dias (null = todos). */
export function agregar(eventos: Evento[], { janelaDias, agora = Date.now() }: { janelaDias: number | null; agora?: number }) {
  const desde = janelaDias === null ? -Infinity : agora - janelaDias * DIA;
  const porArtigo = new Map<string, Agregado>();
  for (const e of eventos) {
    if (e.t < desde) continue;
    const chave = `${e.d}:${e.a}`;
    const ag = porArtigo.get(chave) ?? { diploma: e.d, artigo: e.a, erros: 0, acertos: 0, taxa: 0, nivel: null, ultimo: 0 };
    if (e.r) ag.acertos++;
    else ag.erros++;
    ag.ultimo = Math.max(ag.ultimo, e.t);
    porArtigo.set(chave, ag);
  }
  for (const ag of porArtigo.values()) {
    ag.taxa = ag.erros / (ag.erros + ag.acertos);
    ag.nivel = nivelDe(ag.erros, ag.acertos);
  }
  return porArtigo;
}

/** Artigos com nível igual ou acima de `minimo`, do mais errado para o menos. */
export function maisErrados(agregados: Map<string, Agregado>, minimo: NivelErro): Agregado[] {
  const corte = NIVEIS_ERRO.indexOf(minimo);
  return [...agregados.values()]
    .filter((a) => a.nivel !== null && NIVEIS_ERRO.indexOf(a.nivel) >= corte)
    .sort((x, y) => y.erros - x.erros || y.taxa - x.taxa || y.ultimo - x.ultimo);
}

/**
 * Eventos dos dispositivos citados: um por artigo de lei (com diploma) e um por súmula do STF, do STJ ou vinculante
 * ("sumulas-stf" / "sumulas-stj" / "sumulas-vinculantes", pelo número). As súmulas sem tribunal ficam de fora.
 */
export function eventosDeDispositivos(
  specs: string[],
  r: 0 | 1,
  o: Origem,
  lex: Lexico,
  { q, t = Date.now() }: { q?: string; t?: number } = {},
): Evento[] {
  const vistos = new Set<string>();
  const eventos: Evento[] = [];
  for (const spec of specs) {
    const c = parseDispositivo(spec, lex);
    if (!c) continue;
    let d: string;
    let a: string;
    let extra: Pick<Evento, "p" | "i"> = {};
    if (c.tipo === "art" && c.diploma) {
      d = c.diploma;
      a = c.art;
      extra = { ...(c.pars[0] ? { p: c.pars[0] } : {}), ...(c.incs[0] ? { i: c.incs[0] } : {}) };
    } else if (c.tipo === "sumula" && c.vinculante) {
      d = "sumulas-vinculantes";
      a = c.n;
    } else if (c.tipo === "sumula" && (c.tribunal === "stf" || c.tribunal === "stj")) {
      d = `sumulas-${c.tribunal}`;
      a = c.n;
    } else continue;
    const chave = `${d}:${a}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    eventos.push({ t, o, d, a, ...extra, r, ...(q ? { q } : {}) });
  }
  return eventos;
}

/** Um evento por componente com dispositivo: acerto se pontuou inteiro. */
export function eventosDoSimulado(exame: ExameSimulado, resultado: ResultadoExame, lex: Lexico, t = Date.now()): Evento[] {
  const itensDa = (parte: string): Item[] =>
    parte === "peca" ? exame.peca.itens : (exame.questoes.find((q) => `q${q.n}` === parte)?.itens ?? []);
  const eventos: Evento[] = [];
  for (const parte of resultado.partes) {
    if (parte.aviso?.tipo === "vazia") continue;
    const itens = itensDa(parte.parte);
    for (const ri of parte.itens) {
      const item = itens.find((i) => String(i.n) === String(ri.n));
      for (const rc of ri.componentes) {
        const comp = item?.componentes.find((c) => c.id === rc.id);
        if (!comp?.dispositivo?.length) continue;
        const r = rc.obtido >= rc.valor - 1e-9 ? 1 : 0;
        eventos.push(...eventosDeDispositivos(comp.dispositivo, r, "simulado", lex, { q: exame.id, t }));
      }
    }
  }
  return eventos;
}

/** Eventos das tentativas do exame que ainda não têm eventos (feitas antes do registro de erros). */
export function eventosDeTentativas(exame: ExameSimulado, tentativas: Tentativa[], existentes: Evento[], lex: Lexico): Evento[] {
  const ja = new Set(existentes.filter((e) => e.o === "simulado" && e.q === exame.id).map((e) => e.t));
  return tentativas
    .filter((t) => t.exameId === exame.id && !ja.has(t.criadaEm))
    .flatMap((t) => eventosDoSimulado(exame, t.resultado, lex, t.criadaEm));
}

export function migrarTentativas(exame: ExameSimulado, lex: Lexico) {
  registrar(eventosDeTentativas(exame, listarTentativas(), lerEventos(), lex));
}
