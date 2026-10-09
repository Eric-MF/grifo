import { useSyncExternalStore } from "react";

const RETRATO_TOQUE = "(pointer: coarse) and (orientation: portrait)";

/** Verdadeiro quando o modo "Celular" está ligado (atributo em <html>, ver prefs.ts). */
export function useModoCelular(): boolean {
  return useSyncExternalStore(
    (aviso) => {
      const mo = new MutationObserver(aviso);
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-layout"] });
      return () => mo.disconnect();
    },
    () => document.documentElement.dataset.layout === "celular",
    () => false,
  );
}

/** Verdadeiro num aparelho de toque em retrato. */
export function useRetratoToque(): boolean {
  return useSyncExternalStore(
    (aviso) => {
      const mq = window.matchMedia(RETRATO_TOQUE);
      mq.addEventListener("change", aviso);
      return () => mq.removeEventListener("change", aviso);
    },
    () => window.matchMedia(RETRATO_TOQUE).matches,
    () => false,
  );
}
