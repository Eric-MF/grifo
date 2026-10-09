import { readFileSync, readdirSync } from "node:fs";
import { parse } from "yaml";
import { ExameSchema, LeisSchema, PecasCatalogoSchema, type Exame } from "../src/content/schema.ts";
import { criarContexto } from "../src/lib/correcao/grader.ts";

const root = new URL("../content/", import.meta.url).pathname;
export const leis = LeisSchema.parse(parse(readFileSync(root + "leis.yaml", "utf8")));
export const pecas = PecasCatalogoSchema.parse(parse(readFileSync(root + "pecas.yaml", "utf8")));
export const ctx = criarContexto(leis, pecas);
export const exameIds = readdirSync(root + "exames").sort();
export function loadExame(id: string): Exame {
  return ExameSchema.parse(parse(readFileSync(`${root}exames/${id}/exame.yaml`, "utf8")));
}
