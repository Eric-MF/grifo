// Contexto de correção pronto para o navegador (usa o JSON gerado).
import leis from "@/content/generated/leis.json";
import pecas from "@/content/generated/pecas.json";
import type { Leis, PecasCatalogo } from "@/content/schema";
import { criarContexto, type Contexto } from "./grader";

let cache: Contexto | null = null;
export function contextoCorrecao(): Contexto {
  return (cache ??= criarContexto(leis as Leis, pecas as PecasCatalogo));
}
