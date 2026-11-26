// A escolha do aviso de cookies (LGPD): os cookies de estatística do Google (pela tag do Google Tag Manager) só valem
// com "aceito". A escolha fica no navegador, em texto puro, porque o script do <head> (GTM_SCRIPT) a lê antes da página.
import { CHAVE_CONSENTIMENTO, DOMINIOS_COM_TAG, GTM_ID } from "@/config/site";

export type Escolha = "aceito" | "recusado";
/** Pedido para mostrar o aviso de novo (o botão "Cookies" do rodapé e o da política). */
export const EVENTO_REABRIR = "grifo:aviso-cookies";

export function lerEscolha(): Escolha | null {
  try {
    const v = localStorage.getItem(CHAVE_CONSENTIMENTO);
    return v === "aceito" || v === "recusado" ? v : null;
  } catch {
    return null;
  }
}

/** A tag existe neste endereço? (só no domínio publicado) */
export const tagNesteSite = () => !!GTM_ID && typeof location !== "undefined" && DOMINIOS_COM_TAG.includes(location.hostname);

/** Os cookies do Google Analytics (_ga, _ga_XXXX, _gid): apagados quando a pessoa recusa depois de ter aceitado. */
function apagarCookiesDoGoogle() {
  const nomes = document.cookie
    .split(";")
    .map((c) => c.split("=")[0]!.trim())
    .filter((n) => /^_ga($|_)|^_gid$|^_gat/.test(n));
  const host = location.hostname;
  const dominios = ["", host, `.${host}`, `.${host.replace(/^www\./, "")}`];
  for (const n of nomes) for (const d of dominios) document.cookie = `${n}=; Max-Age=0; path=/${d ? `; domain=${d}` : ""}`;
}

/** Guarda a escolha e a aplica já: aceitar carrega a tag; recusar nega as estatísticas e apaga os cookies dela. */
export function escolher(e: Escolha) {
  try {
    localStorage.setItem(CHAVE_CONSENTIMENTO, e);
  } catch {
    /* sem armazenamento: vale só nesta visita */
  }
  (window as unknown as { __grifoTag?: (e: Escolha) => void }).__grifoTag?.(e);
  if (e === "recusado") apagarCookiesDoGoogle();
}

export const reabrirAviso = () => window.dispatchEvent(new Event(EVENTO_REABRIR));
