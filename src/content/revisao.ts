// Dados para o painel de revisão (só em desenvolvimento): lê os YAML direto de content/
// (não o JSON gerado), valida e roda o corretor com o gabarito como resposta.
import "server-only";
import { mkdirSync, readdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse, parseDocument } from "yaml";
import type { ZodType } from "zod";
import { corrigirExame, criarContexto } from "@/lib/correcao/grader";
import { indexarLeis, pesquisarDispositivos } from "@/lib/revisao/busca";
import type { Dispositivo, LeiTexto } from "@/lib/revisao/tipos";
import {
  AlteradorasArquivoSchema,
  ExameSchema,
  LeisSchema,
  ObjetivasArquivoSchema,
  PecasCatalogoSchema,
  PerguntasArquivoSchema,
  PerguntasItensArquivoSchema,
  type Exame,
} from "./schema";

const RAIZ = process.cwd();
const DIR = join(RAIZ, "content");
export const ARQUIVO_REINICIO = join(RAIZ, ".cache", "reiniciar-dev");

function contextoDev() {
  return criarContexto(
    LeisSchema.parse(parse(readFileSync(join(DIR, "leis.yaml"), "utf8"))),
    PecasCatalogoSchema.parse(parse(readFileSync(join(DIR, "pecas.yaml"), "utf8"))),
  );
}

export function lerExameDev(id: string): { exame: Exame | null; erro?: string; arquivo: string } {
  const arquivo = join(DIR, "exames", id, "exame.yaml");
  try {
    const r = ExameSchema.safeParse(parse(readFileSync(arquivo, "utf8")));
    return r.success ? { exame: r.data, arquivo } : { exame: null, erro: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "), arquivo };
  } catch (e) {
    return { exame: null, erro: (e as Error).message, arquivo };
  }
}

interface AlteradoraDev {
  pendencia?: string;
  manual?: boolean;
  url?: string;
  nota?: string;
}

/** Leis e alterações a conferir: pendências primeiro, depois as que vieram de busca na web. */
export interface ItemFila {
  id: string;
  prioridade: 1 | 2;
  motivo: string;
  url?: string;
  nota?: string;
}

export function filaDeLeis(): ItemFila[] {
  const bruto: Record<string, AlteradoraDev | null> = parse(readFileSync(join(DIR, "leis-alteradoras.yaml"), "utf8")) ?? {};
  const itens: ItemFila[] = [];
  for (const [id, v] of Object.entries(bruto)) {
    if (v?.pendencia) itens.push({ id, prioridade: 1, motivo: v.pendencia, url: v.url, nota: v.nota });
    else if (v?.manual) itens.push({ id, prioridade: 2, motivo: "veio de busca na web: conferir no Planalto", url: v.url, nota: v.nota });
  }
  return itens.sort((a, b) => a.prioridade - b.prioridade);
}

/** Diplomas com texto no leitor, para montar links e trechos de artigos. */
export function diplomasDev(): { id: string; nome: string; planalto: string }[] {
  const diplomas: Record<string, { nome: string; planalto?: string; ler?: boolean }> = parse(readFileSync(join(DIR, "leis.yaml"), "utf8")).diplomas;
  return Object.entries(diplomas)
    .filter(([, d]) => d.ler)
    .map(([id, d]) => ({ id, nome: d.nome, planalto: d.planalto ?? "" }));
}

export function idsExames() {
  return readdirSync(join(DIR, "exames")).filter((d) => existsSync(join(DIR, "exames", d, "exame.yaml"))).sort();
}

/** Nota que o próprio gabarito (+ descrição da tabela) tira: aponta termos mal escritos. */
export function autoteste(exame: Exame) {
  const ctx = contextoDev();
  return corrigirExame(
    exame,
    {
      peca: `${exame.peca.nome}\n${exame.peca.gabarito_comentado}\n${exame.peca.itens.map((i) => i.descricao).join("\n")}`,
      questoes: exame.questoes.map((q) => `${q.gabarito_comentado}\n${q.itens.map((i) => i.descricao).join("\n")}`),
    },
    ctx,
  );
}

const ESQUEMAS: [RegExp, ZodType][] = [
  [/^content\/leis\.yaml$/, LeisSchema],
  [/^content\/leis-alteradoras\.yaml$/, AlteradorasArquivoSchema],
  [/^content\/pecas\.yaml$/, PecasCatalogoSchema],
  [/^content\/perguntas\/exames(-reais)?\.yaml$/, PerguntasArquivoSchema],
  [/^content\/perguntas\/discursivas\/[^/]+\.yaml$/, PerguntasItensArquivoSchema],
  [/^content\/objetivas\/[^/]+\.yaml$/, ObjetivasArquivoSchema],
  [/^content\/exames\/[^/]+\/exame\.yaml$/, ExameSchema],
];

/** YAML que o editor de revisão abre e grava, relativos à raiz do projeto. */
export function arquivosEditaveis(): string[] {
  const fixos = ["leis.yaml", "leis-alteradoras.yaml", "pecas.yaml", "perguntas/exames.yaml", "perguntas/exames-reais.yaml"].map((f) => `content/${f}`);
  const pasta = (p: string) => readdirSync(join(DIR, p)).filter((f) => f.endsWith(".yaml")).map((f) => `content/${p}/${f}`);
  const exames = idsExames().map((id) => `content/exames/${id}/exame.yaml`);
  return [...fixos, ...pasta("objetivas"), ...pasta("perguntas/discursivas"), ...exames].filter((f) => existsSync(join(RAIZ, f)));
}

export function lerArquivo(nome: string): string | null {
  return arquivosEditaveis().includes(nome) ? readFileSync(join(RAIZ, nome), "utf8") : null;
}

/** Confere a sintaxe YAML e o schema do arquivo; devolve o dado normalizado como ficaria no site. */
export function validarTexto(nome: string, texto: string): { erros: string[]; resultado: unknown } {
  const esquema = ESQUEMAS.find(([re]) => re.test(nome))?.[1];
  if (!esquema || !arquivosEditaveis().includes(nome)) return { erros: ["arquivo fora da lista editável"], resultado: null };
  const doc = parseDocument(texto);
  if (doc.errors.length) return { erros: doc.errors.map((e) => `linha ${e.linePos?.[0]?.line ?? "?"}: ${e.message}`), resultado: null };
  const r = esquema.safeParse(doc.toJS());
  if (!r.success) return { erros: r.error.issues.map((i) => `${i.path.join(".") || "(raiz)"}: ${i.message}`), resultado: null };
  return { erros: [], resultado: r.data };
}

/** Pede ao supervisor do `npm run dev` (scripts/dev.mjs) que regere o conteúdo e reinicie o servidor. */
export function pedirReinicio() {
  mkdirSync(join(RAIZ, ".cache"), { recursive: true });
  writeFileSync(ARQUIVO_REINICIO, new Date().toISOString());
}

export function gravarTexto(nome: string, texto: string): { erros: string[]; resultado: unknown } {
  const r = validarTexto(nome, texto);
  if (r.erros.length === 0) writeFileSync(join(RAIZ, nome), texto);
  return r;
}

function diplomasTexto(): { id: string; sigla: string; nome: string; planalto: string }[] {
  const diplomas: Record<string, { nome: string; sigla?: string; numero?: string; ano?: number; planalto?: string; ler?: boolean }> =
    parse(readFileSync(join(DIR, "leis.yaml"), "utf8")).diplomas;
  return Object.entries(diplomas)
    .filter(([, d]) => d.ler)
    .map(([id, d]) => ({ id, sigla: d.sigla ?? (d.numero ? `Lei ${d.numero}/${d.ano}` : d.nome), nome: d.nome, planalto: d.planalto ?? "" }));
}

/** Artigos vigentes de todos os diplomas com texto no leitor (para o painel de origem e a inserção). */
export function buscarDispositivos(termo: string): Dispositivo[] {
  const indice = diplomasTexto().flatMap((d) => {
    const arquivo = join(DIR, "leis-texto", `${d.id}.json`);
    if (!existsSync(arquivo)) return [];
    const json = JSON.parse(readFileSync(arquivo, "utf8")) as { blocos: LeiTexto["blocos"] };
    return indexarLeis([{ id: d.id, sigla: d.sigla, nome: d.nome, planalto: d.planalto, blocos: json.blocos }]);
  });
  return pesquisarDispositivos(indice, termo);
}

/** PDFs originais do exame em public/downloads/originais, quando existem. */
export function pdfsOriginais(arquivo: string): { gabarito: string | null; caderno: string | null } {
  const id = arquivo.match(/^content\/exames\/([^/]+)\/exame\.yaml$/)?.[1];
  if (!id) return { gabarito: null, caderno: null };
  const existe = (nome: string) => (existsSync(join(RAIZ, "public", "downloads", "originais", nome)) ? `/downloads/originais/${nome}` : null);
  return { gabarito: existe(`gabarito-${id}.pdf`), caderno: existe(`caderno-${id}.pdf`) };
}
