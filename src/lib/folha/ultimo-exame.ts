import { gravarJSON, lerJSON } from "@/lib/storage";

const CHAVE = "grifo:ultimo-exame";

/** O último exame que o usuário baixou (caderno ou gabarito em /provas), para a folha de respostas já sair com ele. */
export function lerUltimoExame(): number | null {
  const n = lerJSON<unknown>(CHAVE, null);
  return typeof n === "number" && Number.isInteger(n) && n > 0 ? n : null;
}

export function gravarUltimoExame(numero: number): void {
  gravarJSON(CHAVE, numero);
}
