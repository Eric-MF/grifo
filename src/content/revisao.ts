// Dados para o painel de revisão (só em desenvolvimento): lê os YAML direto de content/
// (não o JSON gerado), valida e roda o corretor com o gabarito como resposta.
import "server-only";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { corrigirExame, criarContexto } from "@/lib/correcao/grader";
import { ExameSchema, LeisSchema, PecasCatalogoSchema, type Exame } from "./schema";

const DIR = join(process.cwd(), "content");

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
