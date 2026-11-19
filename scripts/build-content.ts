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

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, watch, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { gerarTextosDasProvas } from "./textos-provas.ts";
import { parse } from "yaml";
import {
  ExameSchema,
  HistoricoSchema,
  LeisSchema,
  PecasCatalogoSchema,
  PromosSchema,
  PerguntasArquivoSchema,
  PerguntasItensArquivoSchema,
  ObjetivasArquivoSchema,
  GrifoEntradaSchema,
  NomesPessoasSchema,
  NomesMitologiaSchema,
  type Exame,
  type PerguntaFixa,
  type Item,
} from "../src/content/schema.ts";
import { buildLexico, citacaoAtende, extrairCitacoes, formatarCitacao, parseDispositivo, toRoman } from "../src/lib/correcao/citacoes.ts";
import { avaliarItens, criarContexto } from "../src/lib/correcao/grader.ts";
import { normalize } from "../src/lib/correcao/normalize.ts";
import { aplicarRotulos } from "../src/content/rotulos.ts";
import { paraSimulado } from "../src/lib/correcao/simulado.ts";
import { datasComLocal, marcoDeRevogacao, textoAtual, type Bloco, type Datas, type DatasLei, type InfoBloco } from "../src/lib/leis/linha-do-tempo.ts";
import { vigenciasDaLei, type Vigencia } from "../src/lib/leis/vigencias.ts";
import { blocosDaSumulas, disponiveisDe, idSumulas, NOME_SUMULAS, remissivoDasSumulas } from "../src/lib/leis/sumulas.ts";
import { dividirEmPartes } from "../src/lib/leis/partes.ts";
import { criarLeitor, marcarPessoas, nomesDesconhecidos, type Marcacao } from "../src/lib/nomes/marcar.ts";
import { partesDoExame, trocarNomes } from "../src/lib/nomes/trocar.ts";
import { aplicarVides, type GrupoVide, membrosSemDispositivo } from "../src/lib/leis/vides.ts";
import type { Remissivo, SumulasDoTribunal } from "../src/lib/leis/dados.ts";
import type { EntradaGrifo } from "../src/lib/leis/grifos.ts";
import { compilarGrifos, dispositivosCitados, problemasDaEntrada, rotuloDoDispositivo } from "../src/lib/leis/grifos-compilar.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const CONTENT = join(ROOT, "content");
const OUT = join(ROOT, "src/content/generated");
const DOWNLOADS = join(ROOT, "public/downloads");

const args = new Set(process.argv.slice(2));

/** Uma linha do relatório dos nomes: "id: {p1}=Maria(f, cliente) {p2}=João(m) · de outra prova: Tício→{p2}". */
function linhaDoRelatorio(id: string, m: Marcacao): string {
  if (!m.pessoas.length) return "";
  const pessoas = m.pessoas.map((p, i) => `{p${i + 1}}=${p.chave}(${p.genero}${p.cliente ? ", cliente" : ""})`).join(" ");
  const alheios = m.alheios.length ? ` · de outra prova: ${m.alheios.map((a) => `${a.chave}→${a.marca}`).join(" ")}` : "";
  return `${id}: ${pessoas}${alheios}`;
}

function readYaml(path: string) {
  return parse(readFileSync(path, "utf8"));
}

/** Só o que o navegador usa; JSON.stringify descarta os campos indefinidos. */
function paraCliente(v: DatasLei | undefined): DatasLei {
  return { nome: v?.nome, vigencia: v?.vigencia, publicacao: v?.publicacao, aproximada: v?.aproximada, padrao: v?.padrao, locais: v?.locais, marcos: v?.marcos };
}

/** Caminhos de valores de texto que ainda contêm "TODO" (pendências de transcrição/modelo). */
function pendencias(v: unknown, caminho = ""): string[] {
  if (typeof v === "string") return /\bTODO\b/.test(v) ? [caminho || "(raiz)"] : [];
  if (Array.isArray(v)) return v.flatMap((x, i) => pendencias(x, `${caminho}[${i}]`));
  if (v && typeof v === "object")
    return Object.entries(v).flatMap(([k, x]) => pendencias(x, caminho ? `${caminho}.${k}` : k));
  return [];
}

// os "Vide" do Grifo entre dispositivos do leitor (leis e súmulas); o build confere cada um no texto
const ARQ_VIDES = join(CONTENT, "vides.yaml");
const VIDES: GrupoVide[] = existsSync(ARQ_VIDES) ? (readYaml(ARQ_VIDES) ?? []) : [];

/**
 * Publica o texto de uma lei (ou das súmulas de um tribunal) para o navegador: os blocos, o texto superado
 * (carregado só quando o leitor precisa) e os artigos vigentes (pop-up, busca e slide). Devolve quantos artigos tem.
 */
function publicarTexto(pub: string, base: string, lei: { id: string; nome: string; url: string; coletadoEm: string; blocos: Bloco[] }): number {
  // os "Vide" do Grifo entre dispositivos (content/vides.yaml)
  lei = { ...lei, blocos: aplicarVides(lei.blocos, lei.id, VIDES) };
  // as informações adicionais (súmulas) saem do texto: vão comprimidas num arquivo à parte, que o leitor só baixa quando pedido
  const infos: Record<string, InfoBloco[]> = {};
  const semInfo = lei.blocos.map((b: Bloco) => {
    if (!b.info?.length || !b.disp) return b;
    infos[b.disp] = b.info;
    const { info: _info, ...resto } = b;
    return resto as Bloco;
  });
  const versoesSuperadas: Record<number, Bloco> = {};
  const blocosPublicos = semInfo.map((b: Bloco, i: number) => {
    if (!b.superada) return b;
    versoesSuperadas[i] = b;
    return { ...b, texto: marcoDeRevogacao(b) ? b.texto : "" };
  });
  // lei acima de 1 MB: o download sai em partes (por LIVRO, ou TÍTULO); o leitor junta as partes na página
  for (const velha of readdirSync(pub).filter((x) => x.startsWith(`${base}.parte-`) && x.endsWith(".json"))) rmSync(join(pub, velha));
  const partes = dividirEmPartes(blocosPublicos);
  if (partes.length) {
    // os artigos de cada parte: o leitor sabe, só com o arquivo principal, que parte baixar primeiro para chegar a um artigo
    const arquivos = partes.map((p, k) => ({
      ...p,
      arquivo: `${base}.parte-${k + 1}.json`,
      artigos: [...new Set(blocosPublicos.slice(p.de, p.ate).flatMap((b) => (b.disp ? [b.disp.split(".")[0]!] : [])))],
    }));
    arquivos.forEach((p) => writeFileSync(join(pub, p.arquivo), JSON.stringify({ blocos: blocosPublicos.slice(p.de, p.ate) })));
    writeFileSync(join(pub, `${base}.json`), JSON.stringify({ id: lei.id, nome: lei.nome, url: lei.url, coletadoEm: lei.coletadoEm, blocos: [], total: blocosPublicos.length, partes: arquivos }));
  } else {
    writeFileSync(join(pub, `${base}.json`), JSON.stringify({ id: lei.id, nome: lei.nome, url: lei.url, coletadoEm: lei.coletadoEm, blocos: blocosPublicos }));
  }
  writeFileSync(join(pub, `${base}.versoes.json`), JSON.stringify(versoesSuperadas));
  const arquivoInfo = join(pub, `${base}.info.json.gz`);
  if (Object.keys(infos).length) writeFileSync(arquivoInfo, gzipSync(JSON.stringify(infos), { level: 9 }));
  else rmSync(arquivoInfo, { force: true });
  // o dispositivo de cada linha do texto ("p2.i4", relativo ao artigo; "" é o próprio artigo), para a busca dizer onde achou
  const porArtigo = new Map<string, { rotulo: string; partes: string[]; disps: string[] }>();
  for (const { bloco } of textoAtual(lei.blocos)) {
    if (!bloco.disp) continue;
    const art = bloco.disp.split(".")[0];
    const a = porArtigo.get(art) ?? { rotulo: "", partes: [], disps: [] };
    if (bloco.tipo === "artigo" && !a.rotulo) a.rotulo = bloco.rotulo ?? art;
    a.partes.push(bloco.texto);
    a.disps.push(bloco.disp === art ? "" : bloco.disp.slice(art.length + 1));
    porArtigo.set(art, a);
  }
  const lista = [...porArtigo].filter(([, a]) => a.rotulo).map(([art, a]) => [art, a.rotulo, a.partes.join("\n"), a.disps]);
  writeFileSync(join(pub, `${base}.artigos.json`), JSON.stringify({ id: lei.id, nome: lei.nome, artigos: lista }));
  return lista.length;
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
  for (const [tipo, p] of Object.entries(pecas.data)) {
    if (p.fundamento.length === 0) err("pecas.yaml", `${tipo}: falta o fundamento padrão`);
    for (const f of p.fundamento) {
      const c = parseDispositivo(f, lex);
      if (!c || (c.tipo === "art" && !c.diploma)) err("pecas.yaml", `${tipo}: fundamento "${f}" não reconhecido`);
    }
  }

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
            // "Lei 9" no lugar de "Lei 9.099": o aluno que cita a lei certa não pontua
            else if (p.tipo === "art" && /^lei-\d{1,3}$/.test(p.diploma!))
              err(where, `${parte} item ${it.n}.${c.id}: número da lei incompleto "${d}" (escreva o número inteiro, como "Lei 9.099")`);
            else if (p.tipo === "sumula" && !p.tribunal && !p.vinculante) err(where, `${parte} item ${it.n}.${c.id}: súmula sem tribunal "${d}" (use "Súmula 700 STF")`);
          }
          // súmula ou artigo escritos só como palavra (termo "sumula 160") acham qualquer súmula ou artigo: a regra é o dispositivo
          for (const t of [...(c.termos ?? []), ...(c.alternativas ?? []).flat()]) {
            const sem = t.normalize("NFD").replace(/[̀-ͯ]/g, "");
            if (/\b(sumula|enunciado|verbete)\s+(vinculante\s+|sumular\s+|n[º°.]?\s*)?\d/i.test(sem))
              err(where, `${parte} item ${it.n}.${c.id}: súmula como palavra "${t}" (use dispositivo "Súmula N TRIBUNAL")`);
            if (/\bart(?:igo)?s?\.?\s*\d/i.test(sem)) err(where, `${parte} item ${it.n}.${c.id}: artigo como palavra "${t}" (use dispositivo "art. N, LEI")`);
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

  // ---------------- histórico das estatísticas (exames da OAB/SP e linha do tempo) ----------------
  const arqHistorico = join(CONTENT, "historico.yaml");
  const historico = existsSync(arqHistorico) ? HistoricoSchema.safeParse(readYaml(arqHistorico)) : null;
  if (historico && !historico.success) err("historico.yaml", historico.error.message);
  if (historico?.success) {
    const h = historico.data;
    for (const [tipo, p] of Object.entries(h.pecas_extras)) {
      if (pecas.data[tipo]) err("historico.yaml", `pecas_extras.${tipo}: já existe em pecas.yaml`);
      for (const f of p.fundamento) if (!parseDispositivo(f, lex)) err("historico.yaml", `pecas_extras.${tipo}: fundamento "${f}" não reconhecido`);
    }
    const numeros = new Set<number>();
    for (const e of h.exames_antigos) {
      if (numeros.has(e.numero)) err("historico.yaml", `exame ${e.numero} repetido`);
      numeros.add(e.numero);
      for (const p of e.pecas) if (!pecas.data[p] && !h.pecas_extras[p]) err("historico.yaml", `exame ${e.numero}: peça "${p}" não existe em pecas.yaml nem em pecas_extras`);
      if (e.data && e.ano && Number(e.data.slice(0, 4)) !== e.ano) err("historico.yaml", `exame ${e.numero}: a data ${e.data} não é do ano ${e.ano}`);
    }
    for (const m of h.linha_do_tempo) {
      if (m.exame && !exames.some((ex) => ex.id === m.exame)) err("historico.yaml", `linha_do_tempo "${m.rotulo}": exame "${m.exame}" não existe`);
      if (m.ate && m.ate < m.de) err("historico.yaml", `linha_do_tempo "${m.rotulo}": "ate" (${m.ate}) vem antes de "de" (${m.de})`);
    }
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

  // ---------------- teses tiradas dos itens das provas ("Por dentro da peça" e "Questões discursivas") ----------------
  const perguntasItens: Record<string, unknown>[] = [];
  const dirD = join(CONTENT, "perguntas", "discursivas");
  const yamls = (d: string) => (existsSync(d) ? readdirSync(d).filter((x) => x.endsWith(".yaml")).sort() : []);
  const dispositivosOk = (where: string, id: string, specs: string[]) => {
    for (const d of specs) {
      const c = parseDispositivo(d, lex);
      if (!c || (c.tipo === "art" && !c.diploma)) err(where, `${id}: dispositivo não reconhecido "${d}"`);
    }
  };
  const ctxCorrecao = criarContexto(leis.data, pecas.data);
  const semMarkdown = (t: string) => t.replace(/\*\*|\*|__/g, "").replace(/\n{3,}/g, "\n\n").trim();
  // o texto tem os termos aceitos: a leitura da correção do quiz (src/quiz/verificar.ts, atendeTese)
  const temTese = (aceitos: string[][], texto: string) =>
    (avaliarItens([{ n: "t", descricao: "", componentes: [{ id: "c1", valor: 1, alternativas: aceitos }] }], texto, ctxCorrecao)[0]?.obtido ?? 0) > 0;
  // o texto cita um dos artigos aceitos (com parágrafo, inciso e alínea)
  const citaArtigo = (artigos: string[], texto: string) => {
    const achadas = extrairCitacoes(normalize(texto), lex);
    return artigos.some((spec) => {
      const e = parseDispositivo(spec, lex);
      return !!e && achadas.some((a) => citacaoAtende(e, a));
    });
  };
  /** as teses com o que o segundo passe (as alternativas erradas do fácil) precisa saber delas */
  const teses: { q: Record<string, unknown>; exame: string; parte: string; categoria: string; secao?: string; tese: string; aceitos: string[][]; artigos: string[] }[] = [];
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
      // no rascunho (que só aparece com ?rascunho=1, em desenvolvimento), o problema é aviso, não erro
      const falha = (msg: string) => (q.revisao.status === "revisado" ? err(where, msg) : warnings.push(`! ${where} (rascunho): ${msg}`));
      const parte = q.parte === "peca" ? ex.peca : ex.questoes[Number(q.parte.slice(1)) - 1];
      const item = parte?.itens.find((i) => String(i.n) === q.item);
      if (!parte || !item) {
        err(where, `${q.id}: item ${q.parte}/${q.item} não existe no exame ${ex.id}`);
        continue;
      }
      for (const d of q.artigos) {
        const c = parseDispositivo(d, lex);
        if (!c || (c.tipo === "art" && !c.diploma)) falha(`${q.id}: dispositivo não reconhecido "${d}"`);
      }
      const introducao = q.introducao ?? r.data.introducoes[q.parte];
      if (!introducao) {
        err(where, `${q.id}: falta a introdução da parte ${q.parte} (em introducoes)`);
        continue;
      }
      const aceitos = Array.isArray(q.aceitos[0]) ? (q.aceitos as string[][]) : [q.aceitos as string[]];
      // a tese mostrada precisa passar na própria correção; a introdução e a pergunta não podem dar a resposta
      if (!temTese(aceitos, q.tese)) falha(`${q.id}: a tese "${q.tese}" não tem os termos aceitos (${JSON.stringify(q.aceitos)})`);
      if (temTese(aceitos, introducao)) warnings.push(`! ${where}: ${q.id}: a introdução já tem a resposta (os termos aceitos)`);
      if (temTese(aceitos, q.pergunta)) warnings.push(`! ${where}: ${q.id}: a pergunta já tem a resposta (os termos aceitos)`);
      if (citaArtigo(q.artigos, introducao) || citaArtigo(q.artigos, q.pergunta)) warnings.push(`! ${where}: ${q.id}: a introdução ou a pergunta cita o artigo da resposta`);
      // no fácil, a tese aparece na pergunta ("Em que dispositivo se apoia esta tese: …?"): ela não pode trazer o artigo
      if (extrairCitacoes(normalize(q.tese), lex).length) falha(`${q.id}: a tese cita artigo ("${q.tese}"): no fácil, ela entregaria a resposta`);
      const valor = item.valores?.length ? Math.max(...item.valores) : (item.teto ?? item.componentes.reduce((t, c) => t + c.valor, 0));
      const pergunta: Record<string, unknown> = {
        formato: "tese",
        id: q.id,
        categorias: [q.categoria],
        caso: introducao,
        enunciado: semMarkdown(parte.enunciado),
        comando: q.pergunta,
        tese: q.tese,
        aceitos,
        artigos: q.artigos,
        valor,
        explicacao: q.gabarito,
        fonte: `${ex.numeral} Exame`,
        ...(q.secao ? { secao: q.secao } : {}),
        erradas: { artigos: [], teses: [] },
        revisado: q.revisao.status === "revisado",
      };
      perguntasItens.push(pergunta);
      teses.push({ q: pergunta, exame: ex.id, parte: q.parte, categoria: q.categoria, secao: q.secao, tese: q.tese, aceitos, artigos: q.artigos });
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
      const lista = q.disciplina === "penal" ? faixa.penal : faixa.processoPenal;
      if (!lista.includes(q.n)) warnings.push(`! ${where}: questão ${q.n} não está na lista de ${q.disciplina}`);
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

  // ---------------- grifos prontos do leitor ----------------
  // Um arquivo por cor (content/grifos/*.yaml), cada um uma lista de entradas. YAML quebrado (ou que não é uma lista)
  // para o build; uma entrada fora do formato só sai, com aviso: os grifos das outras continuam.
  const entradasGrifos: { onde: string; entrada: EntradaGrifo }[] = [];
  const dirGrifos = join(CONTENT, "grifos");
  for (const f of yamls(dirGrifos)) {
    const where = `grifos/${f}`;
    let raw: unknown;
    try {
      raw = readYaml(join(dirGrifos, f));
    } catch (e) {
      err(where, `YAML inválido: ${(e as Error).message}`);
      continue;
    }
    if (raw === null || raw === undefined) continue;
    if (!Array.isArray(raw)) {
      err(where, "o arquivo deve ser uma lista de entradas (- { cor, grupo, tema, lei, disp, palavras })");
      continue;
    }
    raw.forEach((item, k) => {
      const r = GrifoEntradaSchema.safeParse(item);
      const quem = `${where} #${k + 1}${item && typeof item === "object" && "tema" in item ? ` (${String((item as { tema: unknown }).tema)})` : ""}`;
      if (!r.success) warnings.push(`! ${quem}: ${r.error.issues.map((i) => `${i.path.join(".") || "entrada"}: ${i.message}`).join("; ")}`);
      else entradasGrifos.push({ onde: quem, entrada: r.data });
    });
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
  const manifest: {
    id: string;
    numero: number;
    variante: string | null;
    peca: string | null;
    fase2?: "aplicada" | "em-breve";
    gabaritoPreliminar?: boolean;
    objetivaGabaritoPreliminar?: boolean;
    fgv?: string;
  }[] = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : [];
  const fase2 = (id: string) => manifest.find((m) => m.id === id)?.fase2 ?? "aplicada";
  // os gabaritos que ainda são o preliminar (a FGV não publicou o definitivo): a página de provas avisa
  const preliminar = (id: string) => {
    const m = manifest.find((x) => x.id === id);
    return { gabarito: !!m?.gabaritoPreliminar, objetiva: !!m?.objetivaGabaritoPreliminar };
  };
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
      preliminar: preliminar(m.id),
      fgv: manifest.find((x) => x.id === m.id)?.fgv ?? null,
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
      preliminar: preliminar(ex.id),
      fgv: manifest.find((x) => x.id === ex.id)?.fgv ?? null,
      downloads: downloads(ex.id),
    }))
    .concat(soPdf)
    .sort((a, b) => a.numero - b.numero || (a.variante ?? "").localeCompare(b.variante ?? ""));
  for (const ex of exames) {
    aplicarRotulos(ex.peca.itens);
    ex.questoes.forEach((q) => aplicarRotulos(q.itens));
  }
  for (const ex of exames) writeFileSync(join(OUT, "exames", `${ex.id}.json`), JSON.stringify(ex));
  // os arquivos de apoio do pdf.js (WebAssembly, fontes padrão, mapas de caracteres, perfil de cor CMYK), para as páginas que desenham PDFs
  // no navegador (ver src/lib/pdfjs.ts): copiados uma vez, e de novo quando o pdfjs-dist muda de versão
  const pdfjsOrigem = join(ROOT, "node_modules", "pdfjs-dist");
  const pdfjsDestino = join(ROOT, "public", "pdfjs");
  const versaoPdfjs = existsSync(join(pdfjsOrigem, "package.json")) ? JSON.parse(readFileSync(join(pdfjsOrigem, "package.json"), "utf8")).version : null;
  if (versaoPdfjs && (!existsSync(join(pdfjsDestino, "versao.txt")) || readFileSync(join(pdfjsDestino, "versao.txt"), "utf8") !== versaoPdfjs)) {
    rmSync(pdfjsDestino, { recursive: true, force: true });
    for (const pasta of ["wasm", "standard_fonts", "cmaps", "iccs"]) cpSync(join(pdfjsOrigem, pasta), join(pdfjsDestino, pasta), { recursive: true });
    writeFileSync(join(pdfjsDestino, "versao.txt"), versaoPdfjs);
  }
  // o texto dos PDFs de provas, para a busca de /provas/todos/ (só lê de novo os PDFs que mudaram); corre por fora,
  // e o processo só termina quando acaba
  void gerarTextosDasProvas({ quieto: true }).catch((erro) => console.warn(`textos das provas: ${(erro as Error).message}`));
  // Recorte sem gabarito comentado, carregado pelo conferidor de texto da aba Provas.
  const pubExames = join(ROOT, "public", "dados", "exames");
  rmSync(pubExames, { recursive: true, force: true });
  mkdirSync(pubExames, { recursive: true });
  for (const ex of exames) if (ex.corrigivel) writeFileSync(join(pubExames, `${ex.id}.json`), JSON.stringify(paraSimulado(ex)));
  // O texto de cada exame para a busca da lista de exames das estatísticas (/estatisticas/): o enunciado e o gabarito
  // (o comentado e os itens da tabela de pontos) da peça e de cada questão. A página só baixa quando a busca é nos textos.
  const pubEstatisticas = join(ROOT, "public", "dados", "estatisticas");
  mkdirSync(pubEstatisticas, { recursive: true });
  const gabaritoDe = (p: { gabarito_comentado: string; itens: { descricao: string }[] }) =>
    [p.gabarito_comentado, ...p.itens.map((i) => i.descricao)].filter(Boolean).join("\n");
  const textosDosExames = Object.fromEntries(
    exames.map((ex) => [
      ex.id,
      [
        { parte: "peca", tipo: "enunciado", texto: ex.peca.enunciado },
        { parte: "peca", tipo: "gabarito", texto: gabaritoDe(ex.peca) },
        ...ex.questoes.flatMap((q) => [
          { parte: `q${q.n}`, tipo: "enunciado", texto: q.enunciado },
          { parte: `q${q.n}`, tipo: "gabarito", texto: gabaritoDe(q) },
        ]),
      ].filter((t) => t.texto.trim()),
    ]),
  );
  writeFileSync(join(pubEstatisticas, "textos.json.gz"), gzipSync(JSON.stringify(textosDosExames), { level: 9 }));
  writeFileSync(join(OUT, "exames-index.json"), JSON.stringify(index, null, 1));
  writeFileSync(join(OUT, "leis.json"), JSON.stringify(leis.data));
  writeFileSync(join(OUT, "pecas.json"), JSON.stringify(pecas.data));
  writeFileSync(join(OUT, "historico.json"), JSON.stringify(historico?.success ? historico.data : { pecas_extras: {}, exames_antigos: [], linha_do_tempo: [] }));
  // As pessoas das questões viram marcas ({p1}…), trocadas na tela por nomes da mitologia (src/quiz/nomes.ts)
  const nomesPessoas = NomesPessoasSchema.safeParse(readYaml(join(CONTENT, "nomes-pessoas.yaml")));
  const nomesMitologia = NomesMitologiaSchema.safeParse(readYaml(join(CONTENT, "nomes-mitologia.yaml")));
  if (!nomesPessoas.success) err("nomes-pessoas.yaml", nomesPessoas.error.message);
  if (!nomesMitologia.success) err("nomes-mitologia.yaml", nomesMitologia.error.message);
  if (!nomesPessoas.success || !nomesMitologia.success) return report(errors, warnings);
  {
    const { masculinos, femininos } = nomesMitologia.data;
    const todos = [...masculinos, ...femininos];
    for (const n of new Set(todos.filter((n, i) => todos.indexOf(n) !== i))) err("nomes-mitologia.yaml", `"${n}" repetido`);
    const daProva = new Set([...nomesPessoas.data.masculinos, ...nomesPessoas.data.femininos]);
    for (const n of todos.filter((n) => daProva.has(n))) err("nomes-mitologia.yaml", `"${n}" também é nome de pessoa das provas (nomes-pessoas.yaml)`);
    // a pronúncia é dos nomes das listas
    for (const n of Object.keys(nomesMitologia.data.pronuncia)) if (!todos.includes(n)) err("nomes-mitologia.yaml", `pronúncia de "${n}", que não está nas listas`);
    const pessoas = [...nomesPessoas.data.masculinos, ...nomesPessoas.data.femininos];
    for (const n of new Set(pessoas.filter((n, i) => pessoas.indexOf(n) !== i))) err("nomes-pessoas.yaml", `"${n}" repetido (ou nas duas listas)`);
  }
  const leitorDePessoas = criarLeitor(nomesPessoas.data);
  // Os exames dos PDFs atualizados (/print): as pessoas e as empresas com os nomes da mitologia de `atualizado.nomes`
  {
    const generoMito = new Map<string, "m" | "f">([
      ...nomesMitologia.data.masculinos.map((n) => [n, "m"] as const),
      ...nomesMitologia.data.femininos.map((n) => [n, "f"] as const),
    ]);
    const pubAtualizados = join(OUT, "atualizados");
    rmSync(pubAtualizados, { recursive: true, force: true });
    mkdirSync(pubAtualizados, { recursive: true });
    for (const ex of exames) {
      // os erros materiais corrigidos (atualizado.correcoes) antes dos nomes: o trecho está escrito com os da prova
      const corrigido = structuredClone(ex);
      for (const c of ex.atualizado?.correcoes ?? []) {
        const parte = partesDoExame(corrigido).find((p) => p.alvo === c.alvo)?.parte;
        if (!parte) {
          err(`exames/${ex.id}/exame.yaml (atualizado.correcoes)`, `parte desconhecida: ${c.alvo}`);
          continue;
        }
        // cada troca vale em todos os textos da parte (enunciado, gabarito comentado, itens); tem de achar ao menos um
        for (const t of c.trocas) {
          let achou = 0;
          const trocar = (o: Record<string, unknown>) => {
            for (const [k, v] of Object.entries(o)) {
              if (typeof v === "string" && v.includes(t.de)) {
                o[k] = v.split(t.de).join(t.para);
                achou++;
              } else if (v && typeof v === "object") trocar(v as Record<string, unknown>);
            }
          };
          trocar(parte as unknown as Record<string, unknown>);
          if (!achou) err(`exames/${ex.id}/exame.yaml (atualizado.correcoes)`, `${c.alvo}: trecho não encontrado: "${t.de}"`);
        }
      }
      const { exame, problemas } = trocarNomes(corrigido, leitorDePessoas, ex.atualizado?.nomes ?? {}, (n) => generoMito.get(n));
      writeFileSync(join(pubAtualizados, `${ex.id}.json`), JSON.stringify(exame));
      const where = `exames/${ex.id}/exame.yaml (atualizado.nomes)`;
      const semNome = problemas.filter((x) => x.tipo === "sem-nome");
      if (semNome.length) warnings.push(`! ${where}: sem nome da mitologia: ${semNome.map((x) => `${x.alvo} ${x.chave}`).join(", ")}`);
      for (const x of problemas.filter((x) => x.tipo === "sobrando" || x.tipo === "empresa-ausente"))
        warnings.push(`! ${where}: ${x.alvo} "${x.chave}" não aparece no texto`);
      for (const x of problemas.filter((x) => x.tipo === "repetido" || x.tipo === "colide" || x.tipo === "genero"))
        err(where, `${x.alvo} ${x.chave}: ${x.tipo === "repetido" ? "nome repetido na mesma parte" : x.tipo === "colide" ? "o nome novo é o de outra pessoa da parte" : "gênero trocado"} (${x.detalhe})`);
    }
  }
  {
    const textos: string[] = [];
    const juntar = (v: unknown): void => {
      if (typeof v === "string") textos.push(v);
      else if (Array.isArray(v)) v.forEach(juntar);
      else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) if (k !== "id" && k !== "fonte" && k !== "termos") juntar(x);
    };
    juntar([perguntas, perguntasItens, objetivas]);
    const novos = nomesDesconhecidos(textos, nomesPessoas.data);
    if (novos.length) warnings.push(`! nomes-pessoas.yaml: palavras com maiúscula que não estão em nenhuma lista (pessoa nova?): ${novos.join(", ")}`);
  }
  // As alternativas erradas do fácil de cada tese: outros artigos (os das outras teses da mesma parte, depois os da mesma
  // lei, dos números mais perto) e outras teses (as da mesma parte, depois as do mesmo tipo em outros exames, sem
  // pessoas: o nome de outra história confundiria). Nenhuma pode ser também uma resposta certa.
  {
    const chave = (spec: string) => {
      const c = parseDispositivo(spec, lex);
      return c ? formatarCitacao(c, leis.data) : spec;
    };
    const numero = (spec: string) => {
      const c = parseDispositivo(spec, lex);
      return c?.tipo === "art" ? { diploma: c.diploma ?? "", n: parseInt(c.art, 10) || 0 } : { diploma: c?.tipo ?? "", n: 0 };
    };
    const semPessoas = (t: string) => !leitorDePessoas.achar(t).length;
    // o artigo e a lei, sem parágrafo, inciso ou alínea ("386 cpp"): para não usar como errada a tese do mesmo artigo
    const doArtigo = (spec: string) => {
      const n = numero(spec);
      return `${n.diploma} ${n.n}`;
    };
    // artigos que sustentam teses demais (absolvição, nulidade, garantias): no fácil, só se pergunta o artigo da tese,
    // nunca a tese do artigo (mais de uma alternativa estaria certa)
    const GENERICOS = new Set(["cpp 386", "cpp 564", "cf 5", "cp 59", "cp 68", "cpp 157", "cpp 648", "cpp 626"]);
    const todosArtigos = [...new Map(teses.map((t) => [chave(t.artigos[0]!), t.artigos[0]!])).values()];
    for (const t of teses) {
      const aceitas = new Set(t.artigos.map(chave));
      const irmas = teses.filter((x) => x !== t && x.exame === t.exame && x.parte === t.parte);
      const principal = numero(t.artigos[0]!);
      const daLei = todosArtigos
        .filter((a) => numero(a).diploma === principal.diploma)
        .sort((a, b) => Math.abs(numero(a).n - principal.n) - Math.abs(numero(b).n - principal.n) || chave(a).localeCompare(chave(b)));
      const artigos: string[] = [];
      for (const a of [...irmas.map((x) => x.artigos[0]!), ...daLei, ...todosArtigos]) {
        const k = chave(a);
        if (aceitas.has(k) || artigos.some((x) => chave(x) === k)) continue;
        artigos.push(a);
        if (artigos.length >= 6) break;
      }
      const deOutros = teses.filter((x) => x.exame !== t.exame && x.categoria === t.categoria && (x.secao ?? "") === (t.secao ?? "") && semPessoas(x.tese));
      const outras: string[] = [];
      const meusArtigos = new Set(t.artigos.map(doArtigo));
      // o fácil de tese mostra o primeiro artigo: é ele que não pode ser genérico
      if (!GENERICOS.has(doArtigo(t.artigos[0]!)))
        for (const x of [...irmas, ...deOutros]) {
          if (x.tese === t.tese || outras.includes(x.tese) || x.artigos.some((a) => meusArtigos.has(doArtigo(a))) || temTese(t.aceitos, x.tese)) continue;
          outras.push(x.tese);
          if (outras.length >= 6) break;
        }
      t.q.erradas = { artigos, teses: outras };
      if (artigos.length < 3) warnings.push(`! perguntas/discursivas: ${String(t.q.id)}: só ${artigos.length} artigos errados para o fácil`);
    }
  }
  const relatorioNomes: string[] = [];
  const marcar = <T extends Record<string, unknown>>(lista: T[]) =>
    lista.map((q) => {
      const { questao, marcacao } = marcarPessoas(q, leitorDePessoas);
      relatorioNomes.push(linhaDoRelatorio(String(q.id), marcacao));
      for (const c of marcacao.conflitos) warnings.push(`! nomes: ${String(q.id)}: ${c.join(" / ")} viram a mesma pessoa (o mesmo primeiro nome)`);
      return questao;
    });
  const marcadas = { perguntas: marcar(perguntas as unknown as Record<string, unknown>[]), itens: marcar(perguntasItens), objetivas: marcar(objetivas) };
  const maxPorGenero = Math.max(
    ...[...marcadas.perguntas, ...marcadas.itens, ...marcadas.objetivas].flatMap((q) => {
      const p = (q.pessoas as string[] | undefined) ?? [];
      return [p.filter((g) => g === "m").length, p.filter((g) => g === "f").length];
    }),
  );
  if (maxPorGenero > Math.min(nomesMitologia.data.masculinos.length, nomesMitologia.data.femininos.length))
    err("nomes-mitologia.yaml", `uma questão tem ${maxPorGenero} pessoas do mesmo gênero: faltam nomes`);
  // o relatório fica fora do repositório: quem é quem em cada questão, para conferir a marcação
  mkdirSync(join(ROOT, ".cache"), { recursive: true });
  writeFileSync(join(ROOT, ".cache", "nomes-relatorio.txt"), relatorioNomes.filter(Boolean).join("\n") + "\n");
  writeFileSync(join(OUT, "nomes-mitologia.json"), JSON.stringify(nomesMitologia.data));
  writeFileSync(join(OUT, "perguntas.json"), JSON.stringify(marcadas.perguntas));
  writeFileSync(join(OUT, "perguntas-itens.json"), JSON.stringify(marcadas.itens));
  writeFileSync(join(OUT, "objetivas.json"), JSON.stringify(marcadas.objetivas));

  // Índices alfabético-remissivos (palavra-chave → artigos) dos diplomas do leitor: um arquivo por diploma.
  const dirRemissivos = join(CONTENT, "remissivos");
  const pubRemissivos = join(ROOT, "public", "dados", "remissivos");
  rmSync(pubRemissivos, { recursive: true, force: true });
  if (existsSync(dirRemissivos)) {
    mkdirSync(pubRemissivos, { recursive: true });
    for (const f of readdirSync(dirRemissivos).filter((x) => x.endsWith(".json"))) writeFileSync(join(pubRemissivos, f), readFileSync(join(dirRemissivos, f)));
  }

  // a cópia antiga das súmulas (public/dados/sumulas) não é mais usada: as súmulas saem como leis, no bloco das leis
  rmSync(join(ROOT, "public", "dados", "sumulas"), { recursive: true, force: true });

  // Textos das leis do leitor: o navegador baixa sob demanda (linha do tempo, Vade Mecum, minha leitura).
  const dirLeis = join(CONTENT, "leis-texto");
  const pubLeis = join(ROOT, "public", "dados", "leis");
  const indiceLeis: { id: string; nome: string; artigos: number }[] = [];
  const vigencias: Record<string, Vigencia> = {};
  // o texto de cada lei do leitor (e das súmulas), para conferir os grifos prontos
  const blocosDoLeitor = new Map<string, Bloco[]>();
  if (existsSync(dirLeis)) {
    rmSync(pubLeis, { recursive: true, force: true });
    mkdirSync(pubLeis, { recursive: true });
    const arqDatas = join(CONTENT, "leis-alteradoras.yaml");
    const datas: Datas = existsSync(arqDatas) ? (readYaml(arqDatas) ?? {}) : {};
    const datasPadrao = datasComLocal(datas);
    for (const f of readdirSync(dirLeis).filter((x) => x.endsWith(".json") && !x.startsWith("_"))) {
      const lei = JSON.parse(readFileSync(join(dirLeis, f), "utf8"));
      // o texto publicado é o do Planalto ("Art. 1o"); a forma que o Grifo mostra sai na hora de carregar (lib/leis/texto)
      Object.assign(vigencias, vigenciasDaLei(lei.id, lei.blocos as Bloco[], datasPadrao));
      const artigos = publicarTexto(pubLeis, f.replace(/\.json$/, ""), lei);
      if (artigos) indiceLeis.push({ id: lei.id, nome: lei.nome, artigos });
      blocosDoLeitor.set(lei.id, lei.blocos);
    }
    // as súmulas com texto saem como leis ("sumulas-stf", "sumulas-vinculantes", "sumulas-stj"): o mesmo leitor, fora do
    // índice do Vade Mecum
    const dirSumulas = join(CONTENT, "sumulas");
    const LISTAS = ["vinculantes", "stf", "stj"] as const;
    if (LISTAS.every((t) => existsSync(join(dirSumulas, `${t}.json`)))) {
      const lidas = Object.fromEntries(LISTAS.map((t) => [t, JSON.parse(readFileSync(join(dirSumulas, `${t}.json`), "utf8")) as SumulasDoTribunal])) as Record<(typeof LISTAS)[number], SumulasDoTribunal>;
      const disponiveis = disponiveisDe(lidas);
      const vocabulario = existsSync(dirRemissivos)
        ? readdirSync(dirRemissivos)
            .filter((x) => x.endsWith(".json"))
            .flatMap((x) => (JSON.parse(readFileSync(join(dirRemissivos, x), "utf8")) as Remissivo).entradas.map((e) => e.palavra))
        : [];
      // as súmulas que o leitor tem (com texto): as citações "Súmula N do STF" viram link para elas
      writeFileSync(join(OUT, "sumulas-numeros.json"), JSON.stringify(Object.fromEntries(LISTAS.map((t) => [t, [...disponiveis[t]].sort((x, y) => x - y)]))));
      // o resumo que a página inicial do Vade Mecum mostra: lido sem cache, então acompanha as atualizações
      const resumo: Record<string, { total: number; baixadas: number; coletadoEm: string; unidades: number }> = {};
      for (const t of LISTAS) {
        const d = lidas[t];
        const id = idSumulas(t);
        const blocos = blocosDaSumulas(d, disponiveis);
        blocosDoLeitor.set(id, blocos);
        publicarTexto(pubLeis, id, { id, nome: NOME_SUMULAS(t), url: d.fonte, coletadoEm: d.coletadoEm, blocos });
        resumo[t] = { total: d.total, baixadas: d.baixadas, coletadoEm: d.coletadoEm, unidades: blocos.filter((b) => b.disp && !b.superada).length };
        // o índice alfabético das súmulas: as palavras-chave dos índices das leis, procuradas nos enunciados
        if (existsSync(dirRemissivos)) writeFileSync(join(pubRemissivos, `${id}.json`), JSON.stringify(remissivoDasSumulas(d, vocabulario)));
      }
      writeFileSync(join(pubLeis, "_sumulas.json"), JSON.stringify(resumo));
    }
    // cada membro dos "Vide" do Grifo existe, vigente, no texto do leitor
    for (const lei of new Set(VIDES.flatMap((g) => g.membros.map((m) => m.lei)))) {
      const blocos = blocosDoLeitor.get(lei);
      if (!blocos) err("vides.yaml", `"${lei}" não é uma lei nem uma lista de súmulas do leitor`);
      else for (const m of membrosSemDispositivo(blocos, lei, VIDES)) err("vides.yaml", `${lei} ${m.disp} não está (vigente) no texto`);
    }
    const ordem = Object.keys(leis.data.diplomas);
    indiceLeis.sort((a, b) => ordem.indexOf(a.id) - ordem.indexOf(b.id));
    writeFileSync(
      join(pubLeis, "_datas.json"),
      JSON.stringify(
        Object.fromEntries(Object.entries(datas).map(([k, v]) => [k, paraCliente(v)])),
      ),
    );
    writeFileSync(join(OUT, "vigencias.json"), JSON.stringify(vigencias));
  }
  writeFileSync(join(OUT, "leis-indice.json"), JSON.stringify(indiceLeis));

  // Grifos prontos do leitor (content/grifos/*.yaml): cada entrada conferida no texto da lei (o dispositivo vigente e
  // cada palavra), com o "essencial" (o dispositivo já foi citado nas provas: gabaritos e padrões de resposta da peça e
  // das discursivas, e as objetivas) e o "vide" entre as entradas do mesmo tema.
  {
    const textosDasProvas: string[] = [];
    for (const ex of exames)
      for (const parte of [ex.peca, ...ex.questoes]) {
        textosDasProvas.push(parte.gabarito_comentado);
        for (const it of parte.itens) textosDasProvas.push(it.descricao, ...it.componentes.flatMap((c) => c.dispositivo ?? []));
      }
    for (const q of objetivas) {
      const o = q as { caso?: string; alternativas?: Record<string, string>; dispositivos?: string[] };
      textosDasProvas.push(o.caso ?? "", ...Object.values(o.alternativas ?? {}), ...(o.dispositivos ?? []));
    }
    const citados = dispositivosCitados(textosDasProvas, lex);
    const siglaDaLei = (id: string) => {
      const d = leis.data.diplomas[id];
      if (!d) return id.toUpperCase();
      return d.sigla ?? (d.numero && d.ano ? `Lei ${d.numero}/${String(d.ano).slice(-2)}` : d.nome);
    };
    const validas = entradasGrifos.filter(({ onde, entrada }) => {
      const problemas = problemasDaEntrada(entrada, blocosDoLeitor.get(entrada.lei));
      for (const p of problemas) warnings.push(`! ${onde}: ${p}`);
      // a lei ou o dispositivo que não existem tiram a entrada; uma palavra que não se acha só deixa de ser grifada
      return !problemas.some((p) => !p.startsWith("a palavra"));
    });
    const grifos = compilarGrifos(
      validas.map((v) => v.entrada),
      citados,
      (lei, disp) => rotuloDoDispositivo(lei, disp, siglaDaLei(lei)),
    );
    writeFileSync(join(OUT, "grifos.json"), JSON.stringify(grifos));
    if (grifos.length) console.log(`grifos prontos: ${grifos.length} (${grifos.filter((g) => g.essencial).length} essenciais)`);
  }
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
