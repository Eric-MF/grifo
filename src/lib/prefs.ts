// Preferências de visualização do usuário, persistidas no localStorage e aplicadas
// como atributos data-* no <html>. Um script inline (PREFS_BOOT_SCRIPT) aplica os
// valores antes da primeira pintura, evitando o "flash" de tema errado.

type Theme = "auto" | "claro" | "escuro" | "sepia" | "contraste";
type FontSize = "p" | "m" | "g" | "gg";
/** "padrao" = layout de sempre. "celular" = modo de visualização adicional, para telas estreitas. */
import { gravarJSON, lerJSON } from "./storage";

type Versao = "padrao" | "celular";

export interface Prefs {
  theme: Theme;
  fonte: FontSize;
  densidade: "confortavel" | "compacta";
  leitura: "padrao" | "facil";
  layout: Versao;
}

export const DEFAULT_PREFS: Prefs = {
  theme: "auto",
  fonte: "m",
  densidade: "confortavel",
  leitura: "padrao",
  layout: "padrao",
};

const PREFS_KEY = "grifo:prefs";

export const THEMES: { value: Theme; label: string }[] = [
  { value: "auto", label: "Automático" },
  { value: "claro", label: "Claro" },
  { value: "escuro", label: "Escuro" },
  { value: "sepia", label: "Sépia (papel)" },
  { value: "contraste", label: "Alto contraste" },
];

export const VERSOES: { value: Versao; label: string }[] = [
  { value: "padrao", label: "Padrão" },
  { value: "celular", label: "Celular" },
];

export const FONT_SIZES: { value: FontSize; label: string }[] = [
  { value: "p", label: "A−" },
  { value: "m", label: "A" },
  { value: "g", label: "A+" },
  { value: "gg", label: "A++" },
];

export function readPrefs(): Prefs {
  const salvo = lerJSON<Partial<Prefs> | null>(PREFS_KEY, null);
  return salvo ? { ...DEFAULT_PREFS, ...salvo } : DEFAULT_PREFS;
}

function applyPrefs(p: Prefs) {
  const el = document.documentElement;
  const set = (k: string, v: string | null) => (v ? el.setAttribute(k, v) : el.removeAttribute(k));
  set("data-theme", p.theme === "auto" ? null : p.theme);
  set("data-fonte", p.fonte === "m" ? null : p.fonte);
  set("data-densidade", p.densidade === "compacta" ? "compacta" : null);
  set("data-leitura", p.leitura === "facil" ? "facil" : null);
  set("data-layout", p.layout === "celular" ? "celular" : null);
}

export function savePrefs(p: Prefs) {
  gravarJSON(PREFS_KEY, p); // modo privado: apenas não persiste
  applyPrefs(p);
  window.dispatchEvent(new CustomEvent("grifo:prefs", { detail: p }));
}

// Mesma lógica de applyPrefs, em JS puro, para rodar no <head> antes da hidratação.
export const PREFS_BOOT_SCRIPT = `(function(){try{var p=JSON.parse(localStorage.getItem(${JSON.stringify(
  PREFS_KEY,
)})||"{}"),e=document.documentElement;if(p.theme&&p.theme!=="auto")e.setAttribute("data-theme",p.theme);if(p.fonte&&p.fonte!=="m")e.setAttribute("data-fonte",p.fonte);if(p.densidade==="compacta")e.setAttribute("data-densidade","compacta");if(p.leitura==="facil")e.setAttribute("data-leitura","facil");if(p.layout==="celular")e.setAttribute("data-layout","celular");var s=location.pathname.split("/");if(s[1]==="leis"&&s[2]&&(s[2]==="sumulas"?s[3]:(s[2]!=="minha-leitura"&&!s[3]))){var l=JSON.parse(localStorage.getItem("grifo:leitor")||"{}");e.setAttribute("data-leitor-fundo",l.fundo||"papel");e.setAttribute("data-barra-navegador",l.barraNavegador?"1":"0")}}catch(_){}})();`;
