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
  PerguntasItensArquivoSchema,
  ObjetivasArquivoSchema,
  type Exame,
  type PerguntaFixa,
  type Item,
} from "../src/content/schema.ts";
import { buildLexico, parseDispositivo, toRoman } from "../src/lib/correcao/citacoes.ts";
import { aplicarRotulos } from "../src/content/rotulos.ts";
import { textoAtual, type Bloco } from "../src/lib/leis/linha-do-tempo.ts";

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
        const t = it.componentes.reduce((a, c) => a + c.valor, it.anulado ?? 0);
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

  // ---------------- perguntas tiradas dos itens das provas ----------------
  const perguntasItens: Record<string, unknown>[] = [];
  const dirD = join(CONTENT, "perguntas", "discursivas");
  const yamls = (d: string) => (existsSync(d) ? readdirSync(d).filter((x) => x.endsWith(".yaml")).sort() : []);
  const dispositivosOk = (where: string, id: string, specs: string[]) => {
    for (const d of specs) {
      const c = parseDispositivo(d, lex);
      if (!c || (c.tipo === "art" && !c.diploma)) err(where, `${id}: dispositivo não reconhecido "${d}"`);
    }
  };
  for (const f of yamls(dirD)) {
    const where = `perguntas/discursivas/${f}`;
    const r = PerguntasItensArquivoSchema.safeParse(readYaml(join(dirD, f)));
    if (!r.success) {
      for (const i of r.error.issues) err(where, `${i.path.join(".")}: ${i.message}`);
      continue;
    }
    const ex = exames.find((e) => e.id === r.data.exame);
    if (!ex) {
      err(where, `exame "${r.data.exame}" não existe em content/exames`);
      continue;
    }
    for (const q of r.data.perguntas) {
      if (perguntasItens.some((x) => x.id === q.id)) err(where, `id duplicado "${q.id}"`);
      const itensParte = q.parte === "peca" ? ex.peca.itens : ex.questoes[Number(q.parte.slice(1)) - 1]?.itens;
      const item = itensParte?.find((i) => String(i.n) === q.item);
      if (!item) {
        err(where, `${q.id}: item ${q.parte}/${q.item} não existe no exame ${ex.id}`);
        continue;
      }
      if (!item.componentes.length) err(where, `${q.id}: item ${q.parte}/${q.item} não tem componentes de correção`);
      dispositivosOk(where, q.id, q.dispositivos);
      perguntasItens.push({
        formato: "item",
        id: q.id,
        categorias: [q.categoria],
        caso: q.caso,
        comando: q.comando,
        explicacao: q.gabarito,
        fonte: `${ex.numeral} Exame`,
        secao: q.secao,
        itens: [item],
        opcoes: [{ texto: q.opcoes.correta, correta: true }, ...q.opcoes.erradas.map((texto) => ({ texto, correta: false }))],
        dispositivos: q.dispositivos.length ? q.dispositivos : item.componentes.flatMap((c) => c.dispositivo ?? []),
        revisado: q.revisao.status === "revisado",
      });
    }
  }

  // ---------------- objetivas da 1ª fase ----------------
  const objetivas: Record<string, unknown>[] = [];
  const dirO = join(CONTENT, "objetivas");
  for (const f of yamls(dirO)) {
    const where = `objetivas/${f}`;
    const r = ObjetivasArquivoSchema.safeParse(readYaml(join(dirO, f)));
    if (!r.success) {
      for (const i of r.error.issues) err(where, `${i.path.join(".")}: ${i.message}`);
      continue;
    }
    const { exame, faixa, anuladas, questoes } = r.data;
    const numeral = exames.find((e) => e.id === exame)?.numeral ?? toRoman(Number(exame));
    for (const q of questoes) {
      const id = `obj-${exame}-${q.n}`;
      if (anuladas.includes(q.n)) err(where, `${id}: questão anulada não entra no acervo`);
      const [a, b] = q.disciplina === "penal" ? faixa.penal : faixa.processoPenal;
      if (q.n < a || q.n > b) warnings.push(`! ${where}: questão ${q.n} fora da faixa de ${q.disciplina} (${a}–${b})`);
      if (q.peca && !pecas.data[q.peca]) err(where, `${id}: peça "${q.peca}" não existe em pecas.yaml`);
      dispositivosOk(where, id, q.dispositivos);
      objetivas.push({
        formato: "objetiva",
        id,
        categorias: q.peca ? ["objetiva", "peca"] : ["objetiva"],
        caso: q.enunciado,
        comando: "Assinale a alternativa correta.",
        explicacao: `Gabarito definitivo da FGV: letra ${q.correta}.`,
        fonte: `${numeral} Exame · 1ª fase, questão ${q.n}`,
        alternativas: q.alternativas,
        correta: q.correta,
        dispositivos: q.dispositivos,
        revisado: q.revisao.status === "revisado",
      });
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
      objetivaCaderno: has("originais", `objetiva-caderno-${id}.pdf`),
      objetivaGabarito: has("originais", `objetiva-gabarito-${id}.pdf`),
    };
  };
  // Exames só com PDF (sem transcrição) também aparecem em /provas, via manifesto.
  const manifestPath = join(DOWNLOADS, "originais", "manifest.json");
  const manifest: { id: string; numero: number; variante: string | null; peca: string | null; fase2?: "aplicada" | "em-breve" }[] =
    existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : [];
  const fase2 = (id: string) => manifest.find((m) => m.id === id)?.fase2 ?? "aplicada";
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
      fase2: fase2(m.id),
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
      fase2: fase2(ex.id),
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
  writeFileSync(join(OUT, "perguntas-itens.json"), JSON.stringify(perguntasItens));
  writeFileSync(join(OUT, "objetivas.json"), JSON.stringify(objetivas));

  // Textos das leis do leitor: o navegador baixa sob demanda (linha do tempo, vade-mécum, minha leitura).
  const dirLeis = join(CONTENT, "leis-texto");
  const pubLeis = join(ROOT, "public", "dados", "leis");
  const indiceLeis: { id: string; nome: string; artigos: number }[] = [];
  if (existsSync(dirLeis)) {
    rmSync(pubLeis, { recursive: true, force: true });
    mkdirSync(pubLeis, { recursive: true });
    for (const f of readdirSync(dirLeis).filter((x) => x.endsWith(".json") && !x.startsWith("_"))) {
      const lei = JSON.parse(readFileSync(join(dirLeis, f), "utf8"));
      writeFileSync(join(pubLeis, f), JSON.stringify({ id: lei.id, nome: lei.nome, url: lei.url, coletadoEm: lei.coletadoEm, blocos: lei.blocos }));
      // texto vigente de cada artigo, para o pop-up, a busca e o slide do leitor
      const porArtigo = new Map<string, { rotulo: string; partes: string[] }>();
      for (const { bloco } of textoAtual(lei.blocos as Bloco[])) {
        if (!bloco.disp) continue;
        const art = bloco.disp.split(".")[0];
        const a = porArtigo.get(art) ?? { rotulo: "", partes: [] };
        if (bloco.tipo === "artigo" && !a.rotulo) a.rotulo = bloco.rotulo ?? art;
        a.partes.push(bloco.texto);
        porArtigo.set(art, a);
      }
      const lista = [...porArtigo].filter(([, a]) => a.rotulo).map(([art, a]) => [art, a.rotulo, a.partes.join("\n")]);
      writeFileSync(join(pubLeis, f.replace(/\.json$/, ".artigos.json")), JSON.stringify({ id: lei.id, nome: lei.nome, artigos: lista }));
      const artigos = lista.length;
      if (artigos) indiceLeis.push({ id: lei.id, nome: lei.nome, artigos });
    }
    const ordem = Object.keys(leis.data.diplomas);
    indiceLeis.sort((a, b) => ordem.indexOf(a.id) - ordem.indexOf(b.id));
    const arqDatas = join(CONTENT, "leis-alteradoras.yaml");
    const datas: Record<string, { vigencia?: string; publicacao?: string; aproximada?: boolean }> = existsSync(arqDatas) ? (readYaml(arqDatas) ?? {}) : {};
    writeFileSync(
      join(pubLeis, "_datas.json"),
      JSON.stringify(
        Object.fromEntries(Object.entries(datas).map(([k, v]) => [k, { vigencia: v.vigencia, publicacao: v.publicacao, ...(v.aproximada ? { aproximada: true } : {}) }])),
      ),
    );
  }
  writeFileSync(join(OUT, "leis-indice.json"), JSON.stringify(indiceLeis));

  // Grifos prontos do leitor (content/grifos.yaml)
  const arqGrifos = join(CONTENT, "grifos.yaml");
  const grifos: Record<string, { rotulo: string; lei: string; artigos?: string; dispositivos?: string[]; nota?: string }[]> = existsSync(arqGrifos)
    ? (readYaml(arqGrifos) ?? {})
    : {};
  for (const [sistema, regras] of Object.entries(grifos))
    for (const r of regras) {
      if (!indiceLeis.some((l) => l.id === r.lei)) warnings.push(`! grifos.yaml: ${sistema}: lei "${r.lei}" não está no leitor`);
      if (!r.artigos && !r.dispositivos?.length) err("grifos.yaml", `${sistema}: regra sem artigos nem dispositivos (${r.lei})`);
    }
  writeFileSync(join(OUT, "grifos.json"), JSON.stringify(grifos));
  writeFileSync(join(OUT, "promos.json"), JSON.stringify(promos?.success ? promos.data : { locais: {}, promos: [] }));
  console.log(
    `conteúdo: ${exames.length} exame(s), ${perguntas.length} pergunta(s) fixa(s), ${perguntasItens.length} pergunta(s) de itens e ` +
      `${objetivas.length} objetiva(s) gerados em src/content/generated`,
  );
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
