// Marcações e anotações do leitor de leis, guardadas só no navegador.
// Cada marcação guarda o trecho citado com um pouco de contexto: quando a lei é coletada de novo
// e os blocos mudam de posição, a marcação é reencontrada pelo texto.
import { gravarJSON, lerJSON } from "@/lib/storage";
import { corrigido } from "./texto";

export interface Marcacao {
  id: string;
  /** índice do bloco quando foi criada */
  i: number;
  disp?: string;
  exato: string;
  prefixo: string;
  sufixo: string;
  /** cor da legenda (hex); "nota" = só anotação, sem cor */
  cor: string;
  nota?: string;
  em: number;
  /** seleção que atravessa parágrafos: as partes têm o mesmo grupo (id da primeira) */
  grupo?: string;
  /** o parágrafo inteiro está marcado: vira uma forma única no bloco */
  inteiro?: boolean;
}

const CONTEXTO = 32;
const chave = (lei: string) => `grifo:marcacoes:${lei}`;
export const lerMarcacoes = (lei: string) => lerJSON<Marcacao[]>(chave(lei), []);
export const gravarMarcacoes = (lei: string, ms: Marcacao[]) => gravarJSON(chave(lei), ms);

export function novaMarcacao(texto: string, ini: number, fim: number, i: number, disp: string | undefined, cor: string): Marcacao {
  return {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    i,
    disp,
    exato: texto.slice(ini, fim),
    prefixo: texto.slice(Math.max(0, ini - CONTEXTO), ini),
    sufixo: texto.slice(fim, fim + CONTEXTO),
    cor,
    em: Date.now(),
  };
}

/**
 * Apaga a marcação `id` e, se ela for parte de uma seleção que atravessa parágrafos, todas as partes do grupo:
 * a seleção é uma marcação só, então apagar uma parte apaga a seleção inteira.
 */
export function apagarMarca(ms: Marcacao[], id: string): Marcacao[] {
  const alvo = ms.find((m) => m.id === id);
  if (!alvo) return ms;
  const grupo = alvo.grupo ?? alvo.id;
  return ms.filter((m) => (m.grupo ?? m.id) !== grupo);
}

const comumNoFim = (a: string, b: string) => {
  let n = 0;
  while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n++;
  return n;
};
const comumNoInicio = (a: string, b: string) => {
  let n = 0;
  while (n < a.length && n < b.length && a[n] === b[n]) n++;
  return n;
};

/**
 * Onde a marcação está agora: primeiro no bloco original, depois nos blocos do mesmo dispositivo,
 * por fim em qualquer bloco. Entre várias ocorrências, a que tem o contexto mais parecido.
 */
export function localizar(m: Marcacao, textos: string[], disps: (string | undefined)[]): { i: number; ini: number; fim: number } | null {
  if (!m.exato) return null;
  // a tela mostra "Art. 1º" e sem trema (ver corrigido), mas a redação do Planalto também casa: as duas formas são comparadas iguais (mesmo comprimento)
  m = { ...m, exato: corrigido(m.exato), prefixo: corrigido(m.prefixo), sufixo: corrigido(m.sufixo) };
  textos = textos.map((t) => corrigido(t));
  const candidatos = (indices: number[]) => {
    let melhor: { i: number; ini: number; fim: number; nota: number } | null = null;
    for (const i of indices) {
      const t = textos[i] ?? "";
      for (let ini = t.indexOf(m.exato); ini >= 0; ini = t.indexOf(m.exato, ini + 1)) {
        const fim = ini + m.exato.length;
        const nota = comumNoFim(t.slice(Math.max(0, ini - CONTEXTO), ini), m.prefixo) + comumNoInicio(t.slice(fim, fim + CONTEXTO), m.sufixo);
        if (!melhor || nota > melhor.nota) melhor = { i, ini, fim, nota };
      }
    }
    return melhor;
  };
  const todos = textos.map((_, i) => i);
  const achado =
    candidatos([m.i]) ?? (m.disp ? candidatos(todos.filter((i) => disps[i] === m.disp)) : null) ?? candidatos(todos);
  return achado ? { i: achado.i, ini: achado.ini, fim: achado.fim } : null;
}

/**
 * Grupos de grifos (um por grifo; a seleção que atravessa parágrafos é um grupo só) que um trecho selecionado toca:
 * a parte do grifo se sobrepõe a algum trecho, no mesmo bloco.
 */
export function gruposTocados(
  ms: Marcacao[],
  textos: string[],
  disps: (string | undefined)[],
  trechos: { i: number; ini: number; fim: number }[],
): Set<string> {
  const tocados = new Set<string>();
  for (const m of ms) {
    const loc = localizar(m, textos, disps);
    if (loc && trechos.some((t) => t.i === loc.i && t.ini < loc.fim && loc.ini < t.fim)) tocados.add(m.grupo ?? m.id);
  }
  return tocados;
}

/**
 * Quando apagar os grifos de uma seleção pede confirmação: "todos" se a seleção cobre todos os grifos da lei (se ela
 * tem mais de 3); "muitos" se são mais de 5 de uma vez; `null` se pode apagar direto.
 */
export function pedeConfirmacao(tocados: number, total: number): "todos" | "muitos" | null {
  if (total > 3 && tocados === total) return "todos";
  if (tocados > 5) return "muitos";
  return null;
}
