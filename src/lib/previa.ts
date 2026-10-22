// A prévia dos artigos citados (o pop-up do link) nos simulados: uma preferência só, lida pela prova e pelo gabarito.
import { gravarJSON, lerJSON } from "@/lib/storage";

const CHAVE = "grifo:simulador";
const EVENTO = "grifo:previa";

/** Ligada por padrão: só fica desligada se o aluno desligou. */
export function lerPrevia(): boolean {
  return lerJSON<{ previa?: boolean }>(CHAVE, {}).previa !== false;
}

export function gravarPrevia(ligada: boolean) {
  gravarJSON(CHAVE, { ...lerJSON<Record<string, unknown>>(CHAVE, {}), previa: ligada });
  window.dispatchEvent(new Event(EVENTO));
}

/** Para `useSyncExternalStore`: avisa quando a prévia muda em qualquer lugar da página. */
export function assinarPrevia(aoMudar: () => void) {
  window.addEventListener(EVENTO, aoMudar);
  return () => window.removeEventListener(EVENTO, aoMudar);
}
