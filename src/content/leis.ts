// Textos das leis do leitor (content/leis-texto, coletados por scripts/baixar-leis.ts). Só no servidor.
import "server-only";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import type { Bloco, Datas } from "@/lib/leis/linha-do-tempo";

export interface LeiTexto {
  id: string;
  nome: string;
  url: string;
  coletadoEm: string;
  blocos: Bloco[];
}

const DIR = join(process.cwd(), "content", "leis-texto");
// o cache acompanha a data do arquivo: no servidor de desenvolvimento, `npm run leis` vale sem reiniciar
const cache = new Map<string, { mtime: number; lei: LeiTexto }>();

export function carregarLei(id: string): LeiTexto {
  const arquivo = join(DIR, `${id}.json`);
  const mtime = statSync(arquivo).mtimeMs;
  const c = cache.get(id);
  if (c?.mtime === mtime) return c.lei;
  const lei: LeiTexto = JSON.parse(readFileSync(arquivo, "utf8"));
  cache.set(id, { mtime, lei });
  return lei;
}

/** Leis com texto coletado, na ordem de content/leis.yaml. */
export function leisDoLeitor(): { id: string; nome: string; artigos: number; coletadoEm: string }[] {
  if (!existsSync(DIR)) return [];
  const ids = new Set(readdirSync(DIR).filter((f) => f.endsWith(".json") && !f.startsWith("_")).map((f) => f.slice(0, -5)));
  const ordem = Object.keys(parse(readFileSync(join(process.cwd(), "content", "leis.yaml"), "utf8")).diplomas);
  return ordem
    .filter((id) => ids.has(id))
    .map((id) => {
      const l = carregarLei(id);
      const artigos = new Set(l.blocos.filter((b) => b.tipo === "artigo" && !b.superada).map((b) => b.disp)).size;
      return { id, nome: l.nome, artigos, coletadoEm: l.coletadoEm };
    })
    .filter((l) => l.artigos > 0);
}

export function datasAlteradoras(): Datas {
  const f = join(process.cwd(), "content", "leis-alteradoras.yaml");
  if (!existsSync(f)) return {};
  const bruto: Record<string, { vigencia?: string; publicacao?: string; aproximada?: boolean }> = parse(readFileSync(f, "utf8")) ?? {};
  return Object.fromEntries(Object.entries(bruto).map(([k, v]) => [k, { vigencia: v.vigencia, publicacao: v.publicacao, aproximada: v.aproximada }]));
}
