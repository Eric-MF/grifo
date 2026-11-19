// Extração de citações legais de um texto já normalizado.
//   "art 33 paragrafo 2 alinea c do cp"          → { art:"33", pars:["2"], als:["c"], diploma:"cp" }
//   "arts 44 paragrafos 4 e 5 e 69 paragrafo 2 do cp" → dois artigos, ambos do CP
//   "sumula 700 do stf" / "enunciado 700 da sumula do stf" / "sumula vinculante 24"
// A mesma função interpreta os dispositivos esperados da rubrica ("art. 586 CPP"),
// então a comparação é sempre entre estruturas equivalentes.

import type { Leis } from "../../content/schema.ts";
import { normalize, romanToInt } from "./normalize.ts";

interface CitacaoArtigo {
  tipo: "art";
  art: string;
  pars: string[];
  incs: string[];
  als: string[];
  caput: boolean;
  diploma: string | null;
  /** Índice do token onde a citação começa (para recortar o trecho). */
  pos: number;
  /** Índice do último token da citação, inclusive (o diploma, quando vem junto: "art. 41 da Lei 11340"). */
  fim: number;
}
interface CitacaoSumula {
  tipo: "sumula";
  n: string;
  tribunal: string | null;
  vinculante: boolean;
  pos: number;
  /** Índice do último token da citação, inclusive (o tribunal, quando vem junto: "Súmula 542 do STJ"). */
  fim: number;
}
export type Citacao = CitacaoArtigo | CitacaoSumula;

interface AliasEntry {
  tokens: string[];
  id: string;
}

export interface Lexico {
  diplomas: AliasEntry[];
  tribunais: AliasEntry[];
}

export function buildLexico(leis: Leis): Lexico {
  const toEntries = (rec: Record<string, string[]>) =>
    Object.entries(rec)
      .flatMap(([id, aliases]) => aliases.map((a) => ({ id, tokens: normalize(a).trim().split(" ") })))
      .sort((a, b) => b.tokens.length - a.tokens.length);
  return {
    diplomas: toEntries(Object.fromEntries(Object.entries(leis.diplomas).map(([k, v]) => [k, v.aliases]))),
    tribunais: toEntries(leis.tribunais),
  };
}

const LETRA_ALINEA = /^[a-h]$/;
const CONNECTORS = new Set(["do", "da", "de", "dos", "das", "ambos", "todos", "nos", "no", "na", "termos", "forma"]);

function matchAlias(tokens: string[], i: number, entries: AliasEntry[]): { id: string; len: number } | null {
  for (const e of entries) {
    let ok = true;
    for (let k = 0; k < e.tokens.length; k++) {
      if (tokens[i + k] !== e.tokens[k]) {
        ok = false;
        break;
      }
    }
    if (ok) return { id: e.id, len: e.tokens.length };
  }
  return null;
}

function matchDiploma(tokens: string[], i: number, lex: Lexico): { id: string; len: number } | null {
  const a = matchAlias(tokens, i, lex.diplomas);
  if (a) return a;
  // "lei 1234" genérica
  if ((tokens[i] === "lei" || tokens[i] === "lc") && /^\d+$/.test(tokens[i + 1] ?? "")) {
    return { id: `lei-${tokens[i + 1]}`, len: 2 };
  }
  return null;
}

const isNum = (t: string | undefined) => !!t && /^\d+(-[a-z])?$/.test(t);
const romanOrNum = (t: string | undefined): string | null => {
  if (!t) return null;
  if (/^\d+$/.test(t)) return t;
  const r = romanToInt(t);
  return r ? String(r) : null;
};

const REMISSAO = new Set(["mesmo", "referido", "citado", "aludido", "mencionado"]);

/**
 * O parágrafo, o inciso ou a alínea escritos antes do artigo: "§ 1º do art. 28", "alínea d do inciso II do art. 61",
 * "§ 1º do mesmo artigo". Lê a partir de `i` e para no "do"/"da" que leva ao artigo. `ate` é o índice desse "do"
 * (ou do "deste"); `alvo` diz o que vem depois: um artigo com número ou uma remissão ao último artigo citado.
 */
function dispositivoAntes(tokens: string[], i: number) {
  const pars: string[] = [];
  const incs: string[] = [];
  const als: string[] = [];
  let mode: "par" | "inc" | "al" | null = null;
  let k = i;
  for (; k < tokens.length && k < i + 16; k++) {
    const w = tokens[k]!;
    if (w === "paragrafo" || w === "paragrafos") {
      mode = "par";
      if (tokens[k + 1] === "unico") {
        pars.push("unico");
        k++;
      }
    } else if (w === "inciso" || w === "incisos") mode = "inc";
    else if (w === "alinea" || w === "alineas") mode = "al";
    else if (mode === "par" && (/^\d+$/.test(w) ? Number(w) <= 20 : /^\d+-[a-z]$/.test(w))) pars.push(w);
    else if (mode === "inc" && /^\d+$/.test(w) && Number(w) <= 90) incs.push(w);
    else if (mode === "inc" && /^(?:[ivx][ivxlc]*|l[ivxlc]+)$/.test(w) && romanOrNum(w)) incs.push(romanOrNum(w)!);
    else if (mode === "al" && LETRA_ALINEA.test(w)) als.push(w);
    else if (w === "e" || w === "ou") continue;
    else if ((w === "do" || w === "da" || w === "no" || w === "na") && /^(paragrafo|inciso|alinea)s?$/.test(tokens[k + 1] ?? "")) continue;
    else break;
  }
  if (!pars.length && !incs.length && !als.length) return null;
  const w = tokens[k];
  const prox = tokens[k + 1];
  if ((w === "do" || w === "no") && prox === "art" && isNum(tokens[k + 2])) return { pars, incs, als, ate: k, alvo: "artigo" as const, fim: k };
  if ((w === "do" || w === "no") && REMISSAO.has(prox ?? "") && (tokens[k + 2] === "art" || tokens[k + 2] === "dispositivo"))
    return { pars, incs, als, ate: k, alvo: "remissao" as const, fim: k + 2 };
  if ((w === "deste" || w === "desse" || w === "daquele") && prox === "art") return { pars, incs, als, ate: k, alvo: "remissao" as const, fim: k + 1 };
  return null;
}

export function extrairCitacoes(norm: string, lex: Lexico): Citacao[] {
  const tokens = norm.trim().split(" ");
  const out: Citacao[] = [];
  const diplomaMarks: { pos: number; id: string; fim: number }[] = [];
  let pending: CitacaoArtigo[] = [];
  let lastArtPos = -1;
  // "§ 1º do art. 28": o parágrafo lido antes, que entra no artigo seguinte
  let antes: { pars: string[]; incs: string[]; als: string[]; pos: number; artEm: number } | null = null;

  const flushWith = (id: string, fim: number) => {
    for (const c of pending) {
      c.diploma = id;
      c.fim = Math.max(c.fim, fim);
    }
    pending = [];
  };

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];

    // --- Súmulas -----------------------------------------------------------
    if (t === "sumula" || t === "sumulas") {
      let j = i + 1;
      let vinculante = false;
      if (tokens[j] === "vinculante") {
        vinculante = true;
        j++;
      }
      let n: string | null = null;
      // a citação começa na palavra "sumula", ou no número, quando ele vem antes ("enunciado 700 da sumula")
      let pos = i;
      let fim = i;
      if (isNum(tokens[j])) {
        n = tokens[j];
        fim = j;
        j++;
      } else {
        for (let k = i - 1; k >= Math.max(0, i - 3); k--)
          if (isNum(tokens[k])) {
            n = tokens[k];
            pos = k;
          }
        // "enunciado 542 da sumula" entra inteiro na citação
        if (n && pos > 0 && (tokens[pos - 1] === "enunciado" || tokens[pos - 1] === "verbete")) pos--;
      }
      // o tribunal, logo depois do número: a súmula só vale com ele ("do STJ", "da Súmula do STF")
      let tribunal: string | null = null;
      for (let k = j; k < Math.min(tokens.length, j + 5) && !tribunal; k++) {
        const m = matchAlias(tokens, k, lex.tribunais);
        if (m) {
          tribunal = m.id;
          fim = Math.max(fim, k + m.len - 1);
        }
      }
      if (vinculante) tribunal = "stf";
      if (n) out.push({ tipo: "sumula", n, tribunal, vinculante, pos, fim: Math.max(fim, i) });
      continue;
    }

    // --- Diplomas (fecham artigos pendentes) ------------------------------
    const d = matchDiploma(tokens, i, lex);
    if (d) {
      diplomaMarks.push({ pos: i, id: d.id, fim: i + d.len - 1 });
      if (pending.length && i - lastArtPos <= 30) flushWith(d.id, i + d.len - 1);
      else pending = [];
      i += d.len - 1;
      continue;
    }

    // --- Parágrafo, inciso ou alínea antes do artigo ------------------------
    if (/^(paragrafo|inciso|alinea)s?$/.test(t!)) {
      const a = dispositivoAntes(tokens, i);
      if (a?.alvo === "artigo") {
        antes = { pars: a.pars, incs: a.incs, als: a.als, pos: i, artEm: a.ate + 1 };
        i = a.ate;
        continue;
      }
      // "§ 1º do mesmo artigo": o último artigo citado, com o diploma dele
      const ultimo = [...out].reverse().find((c): c is CitacaoArtigo => c.tipo === "art");
      if (a?.alvo === "remissao" && ultimo) {
        const c: CitacaoArtigo = { tipo: "art", art: ultimo.art, pars: a.pars, incs: a.incs, als: a.als, caput: false, diploma: ultimo.diploma, pos: i, fim: a.fim };
        out.push(c);
        // o diploma do artigo ainda por vir ("art. 28, II, e o § 1º do mesmo artigo, do CP") vale também para este
        if (!c.diploma && pending.includes(ultimo)) pending.push(c);
        i = a.fim;
        continue;
      }
    }

    // --- Artigos -----------------------------------------------------------
    if ((t === "art" || t === "arts") && isNum(tokens[i + 1])) {
      let j = i + 1;
      let cur: CitacaoArtigo | null = null;
      let mode: "art" | "par" | "inc" | "al" = "art";
      const startNew = (num: string, pos: number) => {
        cur = { tipo: "art", art: num, pars: [], incs: [], als: [], caput: false, diploma: null, pos, fim: pos };
        out.push(cur);
        pending.push(cur);
        mode = "art";
      };
      startNew(tokens[j], i);
      if (antes && antes.artEm === i) {
        const c = cur as unknown as CitacaoArtigo;
        c.pars.push(...antes.pars);
        c.incs.push(...antes.incs);
        c.als.push(...antes.als);
        c.pos = antes.pos;
      }
      antes = null;
      j++;
      for (; j < tokens.length; j++) {
        const w = tokens[j];
        const c = cur as unknown as CitacaoArtigo;
        if (w === "caput") {
          c.caput = true;
          c.fim = j;
        } else if (w === "paragrafo" || w === "paragrafos") {
          mode = "par";
          c.fim = j;
          if (tokens[j + 1] === "unico") {
            c.pars.push("unico");
            j++;
            c.fim = j;
          }
        } else if (w === "inciso" || w === "incisos") {
          mode = "inc";
          c.fim = j;
        } else if (w === "alinea" || w === "alineas") {
          mode = "al";
          c.fim = j;
        } else if (w === "unico" && mode === "par") {
          c.pars.push("unico");
          c.fim = j;
        } else if (/^\d+$/.test(w)) {
          const n = Number(w);
          const last = (arr: string[]) => Number(arr[arr.length - 1] ?? 0);
          if (mode === "par" && n <= 20 && !(c.pars.length && n > last(c.pars) + 10)) {
            c.pars.push(w);
            c.fim = j;
          } else if (mode === "inc" && n <= 90 && !(c.incs.length && n > last(c.incs) + 15)) {
            c.incs.push(w);
            c.fim = j;
          }
          else if (mode === "art" && c.pars.length === 0 && c.incs.length === 0 && n <= 90 && tokens[j - 1] !== "e") {
            // "art 5 65" é improvável; trata número solto logo após o artigo como fim
            break;
          } else startNew(w, j); // novo artigo na mesma enumeração ("e 69")
        } else if (/^\d+-[a-z]$/.test(w)) {
          // "§ 2º-A": o parágrafo com letra; fora do parágrafo, é um novo artigo ("e 28-A")
          if (mode === "par") {
            c.pars.push(w);
            c.fim = j;
          } else startNew(w, j);
        }
        else if ((mode === "art" || mode === "par" || mode === "inc") && /^(?:[ivx][ivxlc]*|l[ivxlc]+)$/.test(w) && romanOrNum(w)) {
          c.incs.push(romanOrNum(w)!);
          mode = "inc";
          c.fim = j;
        } else if (LETRA_ALINEA.test(w) && (mode === "al" || ((mode === "par" || mode === "inc") && w !== "a" && w !== "e"))) {
          c.als.push(w);
          c.fim = j;
        } else if (w === "e" || w === "ou" || w === "combinado" || w === "com") {
          /* conectores de enumeração */
        } else if (CONNECTORS.has(w)) {
          // "do" antes do diploma: deixa o laço externo reconhecer o diploma
          if (matchDiploma(tokens, j + 1, lex)) {
            j++;
            break;
          }
        } else break;
      }
      lastArtPos = j;
      i = j - 1;
      continue;
    }
  }

  // Artigos sem diploma à frente: usa o diploma citado logo antes ("o CPP, em seu art. 593")
  for (const c of out) {
    if (c.tipo !== "art" || c.diploma) continue;
    const prev = [...diplomaMarks].reverse().find((m) => m.pos < c.pos && c.pos - m.pos <= 15);
    if (prev) c.diploma = prev.id;
  }
  return out;
}

/** Interpreta um dispositivo esperado da rubrica ("art. 33, § 2º, c, CP"). */
export function parseDispositivo(spec: string, lex: Lexico): Citacao | null {
  return extrairCitacoes(normalize(spec), lex)[0] ?? null;
}

const subset = (need: string[], have: string[]) => need.every((x) => have.includes(x));

/** A citação encontrada satisfaz a esperada? (encontrada pode ser mais detalhada) */
export function citacaoAtende(esperada: Citacao, encontrada: Citacao): boolean {
  // a súmula vale pelo número e pelo tribunal: "Súmula 700" sem o STF não pontua quando a rubrica pede o STF
  if (esperada.tipo === "sumula" || encontrada.tipo === "sumula") {
    return (
      esperada.tipo === "sumula" &&
      encontrada.tipo === "sumula" &&
      esperada.n === encontrada.n &&
      esperada.vinculante === encontrada.vinculante &&
      (!esperada.tribunal || esperada.tribunal === encontrada.tribunal)
    );
  }
  if (esperada.art !== encontrada.art) return false;
  if (esperada.diploma && encontrada.diploma !== esperada.diploma) return false;
  if (esperada.caput && (encontrada.pars.length || encontrada.incs.length) && !encontrada.caput) return false;
  return subset(esperada.pars, encontrada.pars) && subset(esperada.incs, encontrada.incs) && subset(esperada.als, encontrada.als);
}

/** Representação legível de uma citação (para mostrar "faltou: Art. 586 do CPP"). */
export function formatarCitacao(c: Citacao, leis?: Leis): string {
  if (c.tipo === "sumula") {
    return `Súmula${c.vinculante ? " Vinculante" : ""} ${c.n}${c.tribunal && !c.vinculante ? ` do ${c.tribunal.toUpperCase()}` : ""}`;
  }
  const parts = [`Art. ${c.art.toUpperCase()}`];
  if (c.caput) parts.push("caput");
  for (const p of c.pars) parts.push(p === "unico" ? "parágrafo único" : paragrafo(p));
  for (const i of c.incs) parts.push(`inciso ${toRoman(Number(i))}`);
  for (const a of c.als) parts.push(`alínea ${a}`);
  const nome = c.diploma
    ? (leis?.diplomas[c.diploma]?.nome.split(" (")[0] ?? c.diploma.replace(/^lei-(\d+)$/, "Lei $1").toUpperCase())
    : "";
  return parts.join(", ") + (nome ? ` — ${nome}` : "");
}

/** "2" → "§ 2º", "2-a" → "§ 2º-A", "10" → "§ 10": ordinal até o nono, cardinal do décimo em diante (LC 95/1998, art. 10). */
function paragrafo(p: string): string {
  const [, n, letra] = p.match(/^(\d+)(?:-([a-z]))?$/) ?? [, p];
  return `§ ${n}${Number(n) <= 9 ? "º" : ""}${letra ? `-${letra.toUpperCase()}` : ""}`;
}

export function toRoman(n: number): string {
  const map: [number, string][] = [
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let out = "";
  for (const [v, s] of map) {
    while (n >= v) {
      out += s;
      n -= v;
    }
  }
  return out;
}
