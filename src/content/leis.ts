// Textos das leis do leitor (content/leis-texto, coletados por scripts/baixar-leis.ts). Só no servidor.
import "server-only";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import type { Bloco, Datas, DatasLei } from "@/lib/leis/linha-do-tempo";
import { type TipoLei, unidadesDeLeitura } from "@/lib/leis/leitura";
import { corrigirBlocos } from "@/lib/leis/texto";
import type { SumulasDoTribunal } from "@/lib/leis/dados";
import { blocosDaSumulas, disponiveisDe, idSumulas, TRIBUNAIS, type Tribunal } from "@/lib/leis/sumulas";
import { aplicarVides, type GrupoVide } from "@/lib/leis/vides";

export interface LeiTexto {
  id: string;
  nome: string;
  url: string;
  coletadoEm: string;
  blocos: Bloco[];
}

const DIR = join(process.cwd(), "content", "leis-texto");
const YAML = join(process.cwd(), "content", "leis.yaml");
const VIDES = join(process.cwd(), "content", "vides.yaml");

/** Os "Vide" do Grifo entre dispositivos (content/vides.yaml). */
export function videsDoGrifo(): GrupoVide[] {
  return existsSync(VIDES) ? (parse(readFileSync(VIDES, "utf8")) ?? []) : [];
}

export interface ResumoLei {
  id: string;
  nome: string;
  artigos: number;
  coletadoEm: string;
  tipo: TipoLei;
  unidades: number;
}

// Os caches acompanham a data do arquivo: no servidor de desenvolvimento, `npm run leis` vale sem reiniciar. Ficam no
// globalThis porque o servidor de desenvolvimento reavalia o módulo a cada recompilação: com o cache no módulo, a página
// do Vade Mecum relia e corrigia o texto das 18 leis (6 MB) depois de cada edição, e levava segundos para abrir.
const caches = ((globalThis as { __grifoLeis?: unknown }).__grifoLeis ??= {
  leis: new Map(),
  resumos: new Map(),
  diplomas: null,
}) as {
  leis: Map<string, { versao: string; lei: LeiTexto }>;
  resumos: Map<string, { versao: string; resumo: Omit<ResumoLei, "tipo"> }>;
  diplomas: { mtime: number; dados: Record<string, { ler?: boolean; tipo?: TipoLei }> } | null;
};

// o texto guardado depende também do código que o corrige e conta, e dos "Vide" do Grifo (um cache que sobrevive à recompilação não pode
// servir o texto da regra antiga depois de uma edição nesses arquivos)
const CODIGO = ["src/lib/leis/texto.ts", "src/lib/leis/leitura.ts", "src/lib/leis/vides.ts", "content/vides.yaml"].map((f) => join(process.cwd(), f));
const versaoDe = (arquivo: string) =>
  [arquivo, ...CODIGO].map((f) => (existsSync(f) ? statSync(f).mtimeMs : 0)).join("|");

export function carregarLei(id: string): LeiTexto {
  const arquivo = join(DIR, `${id}.json`);
  const versao = versaoDe(arquivo);
  const c = caches.leis.get(id);
  if (c?.versao === versao) return c.lei;
  // o texto sai como o Grifo o mostra (ordinal e trema corrigidos); o arquivo guarda a redação do Planalto
  const bruta: LeiTexto = JSON.parse(readFileSync(arquivo, "utf8"));
  const lei: LeiTexto = { ...bruta, blocos: aplicarVides(corrigirBlocos(bruta.blocos), id, videsDoGrifo()) };
  caches.leis.set(id, { versao, lei });
  return lei;
}

/** O que a lista do Vade Mecum mostra de uma lei: calculado uma vez por versão do arquivo. */
function resumoDaLei(id: string): Omit<ResumoLei, "tipo"> {
  const versao = versaoDe(join(DIR, `${id}.json`));
  const c = caches.resumos.get(id);
  if (c?.versao === versao) return c.resumo;
  const l = carregarLei(id);
  const artigos = new Set(l.blocos.filter((b) => b.tipo === "artigo" && !b.superada).map((b) => b.disp)).size;
  const resumo = { id, nome: l.nome, artigos, coletadoEm: l.coletadoEm, unidades: unidadesDeLeitura(l.blocos).ids.length };
  caches.resumos.set(id, { versao, resumo });
  return resumo;
}

function diplomas(): Record<string, { ler?: boolean; tipo?: TipoLei }> {
  const mtime = statSync(YAML).mtimeMs;
  if (caches.diplomas?.mtime !== mtime) caches.diplomas = { mtime, dados: parse(readFileSync(YAML, "utf8")).diplomas };
  return caches.diplomas.dados;
}

/** Leis com `ler: true` em content/leis.yaml e texto coletado, na ordem do arquivo. */
export function leisDoLeitor(): ResumoLei[] {
  if (!existsSync(DIR)) return [];
  const ids = new Set(readdirSync(DIR).filter((f) => f.endsWith(".json") && !f.startsWith("_")).map((f) => f.slice(0, -5)));
  const d = diplomas();
  return Object.keys(d)
    .filter((id) => d[id]!.ler && ids.has(id))
    .map((id) => ({ ...resumoDaLei(id), tipo: d[id]!.tipo ?? "lei" }))
    .filter((l) => l.artigos > 0);
}

export function datasAlteradoras(): Datas {
  const f = join(process.cwd(), "content", "leis-alteradoras.yaml");
  if (!existsSync(f)) return {};
  const bruto: Record<string, DatasLei | null> = parse(readFileSync(f, "utf8")) ?? {};
  return Object.fromEntries(
    Object.entries(bruto).map(([k, v]) => [k, { nome: v?.nome, vigencia: v?.vigencia, publicacao: v?.publicacao, aproximada: v?.aproximada, padrao: v?.padrao, locais: v?.locais, marcos: v?.marcos }]),
  );
}

/** A lista de súmulas de um tribunal (content/sumulas, gerado por scripts/sumulas/baixar.ts). */
export function listaDeSumulas(t: Tribunal): SumulasDoTribunal {
  return JSON.parse(readFileSync(join(process.cwd(), "content", "sumulas", `${t}.json`), "utf8")) as SumulasDoTribunal;
}

/** As súmulas de um tribunal como os blocos de uma lei, com o "Vide" entre as listas e os "Vide" do Grifo. */
export function blocosDeSumulas(t: Tribunal): Bloco[] {
  const todas = Object.fromEntries((Object.keys(TRIBUNAIS) as Tribunal[]).map((x) => [x, listaDeSumulas(x)]));
  return aplicarVides(blocosDaSumulas(todas[t]!, disponiveisDe(todas)), idSumulas(t), videsDoGrifo());
}
