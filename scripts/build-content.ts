// Valida todo o conteúdo de content/ e gera src/content/generated/*.json.
//
//   node scripts/build-content.ts            valida + gera
//   node scripts/build-content.ts --check    só valida (usado por `npm run validar`)
//   node scripts/build-content.ts --watch    regera ao salvar (usado pelo `npm run dev`)
//
// Regras verificadas além do esquema: soma dos componentes = valor da peça/questão,
// ids únicos, `requer` apontando para componente existente, dispositivos
// reconhecíveis pelo parser, tipo de peça existente no catálogo e nenhum "TODO"
// esquecido em valores (comentários YAML podem ter TODO à vontade).

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, watch, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import {
  ExameSchema,
  LeisSchema,
  PecasCatalogoSchema,
  PromosSchema,
  PerguntasArquivoSchema,
  type Exame,
  type PerguntaFixa,
  type Item,
} from "../src/content/schema.ts";
import { buildLexico, parseDispositivo, toRoman } from "../src/lib/correcao/citacoes.ts";
import { aplicarRotulos } from "../src/content/rotulos.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const CONTENT = join(ROOT, "content");
const OUT = join(ROOT, "src/content/generated");
const DOWNLOADS = join(ROOT, "public/downloads");

const args = new Set(process.argv.slice(2));

function readYaml(path: string) {
  return parse(readFileSync(path, "utf8"));
}

/** Caminhos de valores de texto que ainda contêm "TODO" (pendências de transcrição/modelo). */
function pendencias(v: unknown, caminho = ""): string[] {
  if (typeof v === "string") return /\bTODO\b/.test(v) ? [caminho || "(raiz)"] : [];
  if (Array.isArray(v)) return v.flatMap((x, i) => pendencias(x, `${caminho}[${i}]`));
  if (v && typeof v === "object")
    return Object.entries(v).flatMap(([k, x]) => pendencias(x, caminho ? `${caminho}.${k}` : k));
  return [];
}

function build(): boolean {
  const errors: string[] = [];
  const warnings: string[] = [];
  const err = (where: string, msg: string) => errors.push(`✗ ${where}: ${msg}`);

  const leis = LeisSchema.safeParse(readYaml(join(CONTENT, "leis.yaml")));
  const pecas = PecasCatalogoSchema.safeParse(readYaml(join(CONTENT, "pecas.yaml")));
  const promosPath = join(CONTENT, "promos.yaml");
  const promos = existsSync(promosPath) ? PromosSchema.safeParse(readYaml(promosPath)) : null;
  if (!leis.success) err("leis.yaml", leis.error.message);
  if (!pecas.success) err("pecas.yaml", pecas.error.message);
  if (promos && !promos.success) err("promos.yaml", promos.error.message);
  if (!leis.success || !pecas.success) return report(errors, warnings);
  const lex = buildLexico(leis.data);

  const exames: Exame[] = [];
  const dir = join(CONTENT, "exames");
  for (const id of readdirSync(dir).sort()) {
    const file = join(dir, id, "exame.yaml");
    if (!existsSync(file)) continue;
    const where = `exames/${id}`;
    let raw: unknown;
    try {
      raw = readYaml(file);
    } catch (e) {
      err(where, `YAML inválido: ${(e as Error).message}`);
      continue;
    }
    const r = ExameSchema.safeParse(raw);
    if (!r.success) {
      for (const issue of r.error.issues) err(where, `${issue.path.join(".")}: ${issue.message}`);
      continue;
    }
    const ex = r.data;
    const todoEx = pendencias(raw);
    if (todoEx.length) err(where, `${todoEx.length} campo(s) ainda com TODO: ${todoEx.slice(0, 4).join(", ")}${todoEx.length > 4 ? ", …" : ""}`);
    if (ex.id !== id) err(where, `id "${ex.id}" diferente da pasta "${id}"`);
    if (!pecas.data[ex.peca.tipo]) err(where, `peca.tipo "${ex.peca.tipo}" não existe em pecas.yaml`);

    const checkItens = (itens: Item[], valor: number, parte: string) => {
      if (!ex.corrigivel) return;
      const soma = Math.round(itens.reduce((s, it) => {
        const t = it.componentes.reduce((a, c) => a + c.valor, 0);
        return s + (it.teto ? Math.min(it.teto, t) : t);
      }, 0) * 100) / 100;
      if (Math.abs(soma - valor) > 0.001) err(where, `${parte}: soma dos componentes = ${soma.toFixed(2)}, esperado ${valor.toFixed(2)}`);
      const nums = new Set<string>();
      for (const it of itens) {
        if (nums.has(it.n)) err(where, `${parte}: item ${it.n} duplicado`);
        nums.add(it.n);
        const ids = new Set(it.componentes.map((c) => c.id));
        if (ids.size !== it.componentes.length) err(where, `${parte} item ${it.n}: ids de componente duplicados`);
        for (const c of it.componentes) {
          if (c.requer && !ids.has(c.requer)) err(where, `${parte} item ${it.n}.${c.id}: requer "${c.requer}" inexistente`);
          for (const d of c.dispositivo ?? []) {
            const p = parseDispositivo(d, lex);
            if (!p) err(where, `${parte} item ${it.n}.${c.id}: dispositivo não reconhecido "${d}"`);
            else if (p.tipo === "art" && !p.diploma) err(where, `${parte} item ${it.n}.${c.id}: dispositivo sem diploma "${d}"`);
          }
        }
      }
    };
    checkItens(ex.peca.itens, ex.peca.valor, "peça");
    ex.questoes.forEach((q) => checkItens(q.itens, q.valor, `questão ${q.n}`));
    if (ex.corrigivel && ![4, 5].includes(ex.questoes.length)) warnings.push(`! ${where}: ${ex.questoes.length} questões (esperado 4)`);
    if (ex.revisao.status !== "revisado") warnings.push(`· ${where}: revisão pendente`);
    exames.push(ex);
  }

  // ---------------- perguntas fixas do quiz ----------------
  const perguntas: PerguntaFixa[] = [];
  const dirP = join(CONTENT, "perguntas");
  if (existsSync(dirP)) {
    for (const f of readdirSync(dirP).filter((x) => x.endsWith(".yaml"))) {
      let raw: unknown;
      try {
        raw = readYaml(join(dirP, f));
      } catch (e) {
        err(`perguntas/${f}`, `YAML inválido: ${(e as Error).message}`);
        continue;
      }
      const todoP = pendencias(raw);
      if (todoP.length) err(`perguntas/${f}`, `${todoP.length} campo(s) ainda com TODO: ${todoP.slice(0, 4).join(", ")}${todoP.length > 4 ? ", …" : ""}`);
      const r = PerguntasArquivoSchema.safeParse(raw);
      if (!r.success) {
        for (const i of r.error.issues) err(`perguntas/${f}`, `${i.path.join(".")}: ${i.message}`);
        continue;
      }
      for (const q of r.data.perguntas) {
        if (perguntas.some((x) => x.id === q.id)) err(`perguntas/${f}`, `id duplicado "${q.id}"`);
        if (!pecas.data[q.peca]) err(`perguntas/${f}`, `${q.id}: peça "${q.peca}" não existe em pecas.yaml`);
        for (const d of q.distratores) if (!pecas.data[d]) err(`perguntas/${f}`, `${q.id}: distrator "${d}" não existe em pecas.yaml`);
        for (const fund of q.fundamentos) {
          const c = parseDispositivo(fund, lex);
          if (!c || (c.tipo === "art" && !c.diploma)) err(`perguntas/${f}`, `${q.id}: fundamento não reconhecido "${fund}"`);
        }
        perguntas.push(q);
      }
    }
  }

  if (args.has("--check")) return report(errors, warnings);
  if (errors.length) return report(errors, warnings);

  // ---------------- saída ----------------
  rmSync(join(OUT, "exames"), { recursive: true, force: true });
  mkdirSync(join(OUT, "exames"), { recursive: true });
  const downloads = (id: string) => {
    const has = (sub: string, name: string) => existsSync(join(DOWNLOADS, sub, name)) ? `/downloads/${sub}/${name}` : null;
    return {
      cadernoOriginal: has("originais", `caderno-${id}.pdf`),
      gabaritoOriginal: has("originais", `gabarito-${id}.pdf`),
      cadernoAtualizado: has("atualizados", `caderno-${id}-atualizado.pdf`),
      gabaritoAtualizado: has("atualizados", `gabarito-${id}-atualizado.pdf`),
    };
  };
  // Exames só com PDF (sem transcrição) também aparecem em /provas, via manifesto.
  const manifestPath = join(DOWNLOADS, "originais", "manifest.json");
  const manifest: { id: string; numero: number; variante: string | null; peca: string | null }[] = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, "utf8"))
    : [];
  const idsTranscritos = new Set(exames.map((e) => e.id));
  const soPdf = manifest
    .filter((m) => !idsTranscritos.has(m.id))
    .map((m) => ({
      id: m.id,
      numero: m.numero,
      numeral: toRoman(m.numero),
      variante: m.variante,
      aplicacao: null as string | null,
      peca: m.peca ?? "—",
      pecaTipo: "",
      corrigivel: false,
      transcrito: false,
      revisado: false,
      temAtualizacao: false,
      downloads: downloads(m.id),
    }));
  const index = exames
    .map((ex) => ({
      id: ex.id,
      numero: ex.numero,
      numeral: ex.numeral,
      variante: ex.variante ?? null,
      aplicacao: ex.aplicacao ?? null,
      peca: ex.peca.nome,
      pecaTipo: ex.peca.tipo,
      corrigivel: ex.corrigivel,
      transcrito: true,
      revisado: ex.revisao.status === "revisado",
      temAtualizacao: !!ex.atualizado?.notas.length,
      downloads: downloads(ex.id),
    }))
    .concat(soPdf)
    .sort((a, b) => a.numero - b.numero || (a.variante ?? "").localeCompare(b.variante ?? ""));
  for (const ex of exames) {
    aplicarRotulos(ex.peca.itens);
    ex.questoes.forEach((q) => aplicarRotulos(q.itens));
  }
  for (const ex of exames) writeFileSync(join(OUT, "exames", `${ex.id}.json`), JSON.stringify(ex));
  writeFileSync(join(OUT, "exames-index.json"), JSON.stringify(index, null, 1));
  writeFileSync(join(OUT, "leis.json"), JSON.stringify(leis.data));
  writeFileSync(join(OUT, "pecas.json"), JSON.stringify(pecas.data));
  writeFileSync(join(OUT, "perguntas.json"), JSON.stringify(perguntas));
  writeFileSync(join(OUT, "promos.json"), JSON.stringify(promos?.success ? promos.data : { locais: {}, promos: [] }));
  console.log(`conteúdo: ${exames.length} exame(s) e ${perguntas.length} pergunta(s) fixa(s) gerados em src/content/generated`);
  return report(errors, warnings);
}

function report(errors: string[], warnings: string[]) {
  if (warnings.length && !args.has("--quiet")) console.log(warnings.join("\n"));
  if (errors.length) {
    console.error(errors.join("\n"));
    console.error(`\n${errors.length} erro(s) no conteúdo.`);
    return false;
  }
  console.log("conteúdo válido ✓");
  return true;
}

const ok = build();
if (args.has("--watch")) {
  let t: NodeJS.Timeout | undefined;
  watch(CONTENT, { recursive: true }, () => {
    clearTimeout(t);
    t = setTimeout(() => build(), 200);
  });
  console.log("observando content/ …");
} else if (!ok) process.exit(1);
