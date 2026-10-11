// Marcações e anotações do leitor de leis, guardadas só no navegador.
// Cada marcação guarda o trecho citado com um pouco de contexto: quando a lei é coletada de novo
// e os blocos mudam de posição, a marcação é reencontrada pelo texto.
import { gravarJSON, lerJSON } from "@/lib/storage";

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
