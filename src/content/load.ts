// Acesso ao conteúdo gerado por scripts/build-content.ts. Só para Server Components
// (usa fs no build). Componentes cliente recebem os dados via props.
import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Exame } from "./schema";
import indexJson from "./generated/exames-index.json";

export type ExameResumo = (typeof indexJson)[number];

export function listarExames(): ExameResumo[] {
  return indexJson;
}

export function carregarExame(id: string): Exame {
  return JSON.parse(readFileSync(join(process.cwd(), "src/content/generated/exames", `${id}.json`), "utf8"));
}

/** Parâmetros estáticos das rotas de simulado: só os exames que têm correção. */
export function examesCorrigiveis() {
  return listarExames()
    .filter((e) => e.corrigivel)
    .map((e) => ({ exame: e.id }));
}

export { tituloExame } from "./titulo";
