// HTML dos blocos da lei, como texto: o servidor manda o começo pronto na página e o navegador
// acrescenta o resto. Como não passa pelo React, o texto não pesa na hidratação e o leitor pode
// grifar e anotar mexendo direto no DOM.
import { marcoDeRevogacao, type Bloco } from "./linha-do-tempo";
import { trechos } from "./referencias";

const ESCAPE: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESCAPE[c]);

/** Em que bloco fica a âncora de cada dispositivo: a primeira redação vigente (ou a primeira, se nenhuma). */
export function mapaAncoras(blocos: Bloco[]): Map<string, number> {
  const m = new Map<string, number>();
  blocos.forEach((b, i) => {
    if (!b.disp || b.tipo === "texto") return;
    const atual = m.get(b.disp);
    if (atual === undefined || (blocos[atual].superada && !b.superada)) m.set(b.disp, i);
  });
  return m;
}

export interface Classes {
  b: string;
  txt: string;
  ref: string;
  atos: string;
  ato: string;
  estrela: string;
  tipos: Record<Bloco["tipo"], string>;
}

export function htmlBloco(b: Bloco, i: number, lei: string, url: string, ancoras: Map<string, number>, c: Classes): string {
  const tag = b.tipo === "estrutura" ? "h3" : b.tipo === "rubrica" ? "h4" : "p";
  const id = b.disp && ancoras.get(b.disp) === i ? ` id="${esc(b.disp)}"` : "";
  const attrs = `data-i="${i}"${b.disp ? ` data-disp="${esc(b.disp)}"` : ""} data-sup="${b.superada ? 1 : 0}" data-marco="${marcoDeRevogacao(b) ? 1 : 0}"`;
  const estrela =
    b.tipo === "artigo" && !b.superada
      ? `<button type="button" class="${c.estrela}" data-estrela="${esc(b.disp!)}" aria-label="Marcar ${esc(b.rotulo ?? "artigo")} como importante" aria-pressed="false">☆</button>`
      : "";
  const texto = trechos(b.texto, lei, b.rotulo)
    .map((t) =>
      t.href
        ? `<a class="${c.ref}" href="${esc(t.href)}" data-grifo="${esc(t.href)}"${t.planalto ? ` data-planalto="${esc(t.planalto)}"` : ""}${
            t.lei && t.art ? ` data-lei="${esc(t.lei)}" data-art="${esc(t.art)}"` : ""
          }>${esc(t.texto)}</a>`
        : esc(t.texto),
    )
    .join("");
  const atos = b.atos.length
    ? `<span class="${c.atos}">${b.atos
        .map((a) => {
          const href = a.href ? new URL(a.href, url).href : null;
          return href ? `<a href="${esc(href)}" class="${c.ato}" rel="noopener" target="_blank">${esc(a.bruto)}</a>` : `<span class="${c.ato}">${esc(a.bruto)}</span>`;
        })
        .join(" ")}</span>`
    : "";
  return `<${tag}${id} ${attrs} class="${c.b} ${c.tipos[b.tipo]}">${estrela}<span class="${c.txt}">${texto}</span>${atos}</${tag}>`;
}

export function htmlBlocos(blocos: Bloco[], ini: number, fim: number, lei: string, url: string, ancoras: Map<string, number>, c: Classes): string {
  let s = "";
  for (let i = ini; i < Math.min(fim, blocos.length); i++) s += htmlBloco(blocos[i], i, lei, url, ancoras, c);
  return s;
}
