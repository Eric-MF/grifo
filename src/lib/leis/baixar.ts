// Arquivo baixado do Vade Mecum: um HTML autocontido, com o mesmo corpo da tela e o CSS que ele precisa. O CSS
// se apoia só em tags e atributos data-* (as classes dos módulos do site têm hash e não existem no arquivo).
import { CORES_TEXTO, type Fonte, type Fundo } from "./opcoes";
import type { OpcoesVade } from "./vademecum";

const FUNDOS: Record<Fundo, { bg: string; fg: string }> = {
  papel: { bg: "#fbf7ee", fg: "#1f1b16" },
  branco: { bg: "#ffffff", fg: "#111111" },
  sepia: { bg: "#f1e3c6", fg: "#3b2c18" },
  verde: { bg: "#e6f0e1", fg: "#1d2a1a" },
  escuro: { bg: "#17181b", fg: "#e8e6e1" },
};
const FONTES: Record<Fonte, string> = {
  sans: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, Menlo, Consolas, monospace',
};
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Tipos de anotação que a opção "Anotações do Planalto" controla (o "Vide" tem a sua própria). */
const TIPOS_ANOTACAO = ["redacao", "incluido", "revogado", "renumerado", "vigencia", "outro"];

/**
 * Tira do corpo (já na memória, a partir da tela) o que a opção de download e as de texto pedem que não vá ao arquivo:
 * os links visuais (só se a opção de links estiver desligada), o "Vide" e as anotações quando desligados.
 */
export function corpoParaArquivo(corpo: HTMLElement, opcoes: OpcoesVade): string {
  const copia = corpo.cloneNode(true) as HTMLElement;
  // o layout de papel (colunas, nova página por lei) não vai para o arquivo
  copia.setAttribute("data-colunas", "1");
  copia.setAttribute("data-nova-pagina", "0");
  if (!opcoes.download.links) copia.querySelectorAll("[data-link-visual]").forEach((el) => el.remove());
  if (!opcoes.texto.vide) copia.querySelectorAll('[data-tipo="vide"]').forEach((el) => el.remove());
  if (!opcoes.texto.anotacoes) copia.querySelectorAll("[data-tipo]").forEach((el) => {
    if (TIPOS_ANOTACAO.includes(el.getAttribute("data-tipo") ?? "")) el.remove();
  });
  return copia.outerHTML;
}

/** Documento HTML completo do Vade Mecum, pronto para salvar e abrir sem o site. */
export function documentoVade({ titulo, corpo, opcoes }: { titulo: string; corpo: string; opcoes: OpcoesVade }): string {
  const fundo = FUNDOS[opcoes.texto.fundo];
  const letra = CORES_TEXTO[opcoes.texto.corTexto].cor ?? fundo.fg;
  const css = `
:root { --bg: ${fundo.bg}; --fg: ${letra}; --muted: color-mix(in srgb, ${letra} 62%, ${fundo.bg}); --borda: color-mix(in srgb, ${letra} 18%, ${fundo.bg}); --fonte: ${FONTES[opcoes.texto.fonte]}; --tamanho: ${opcoes.texto.tamanho}px; --entrelinha: ${opcoes.texto.entrelinha}; }
* { box-sizing: border-box; }
html { background: var(--bg); }
body { margin: 0; background: var(--bg); color: var(--fg); font-family: var(--fonte); }
[data-vademecum-corpo] { max-width: 46rem; margin: 0 auto; padding: 2rem 1.25rem 4rem; font-size: var(--tamanho); line-height: var(--entrelinha); }
[data-vademecum-corpo] h1 { font-size: 1.9em; margin: 0 0 1rem; }
[data-vademecum-corpo] > section, [data-role="lei"] { margin-top: 2.2rem; }
[data-role="lei"] > h2 { font-size: 1.35em; border-bottom: 1px solid var(--borda); padding-bottom: 0.3rem; }
[data-role="lei"] p, [data-role="lei"] h3, [data-role="lei"] h4 { margin: 0 0 0.7em; }
[data-role="lei"] h3 { font-size: 1em; font-weight: 700; margin-top: 1.4em; }
[data-role="lei"] h4 { font-size: 0.95em; font-style: italic; margin-top: 1em; }
[data-tipo] { color: var(--muted); }
[data-tipo] { font-size: 0.72em; margin-left: 0.35em; }
[data-vide="0"] [data-tipo="vide"] { display: none; }
[data-chip] { font-size: 0.72em; color: var(--muted); border: 1px solid var(--borda); border-radius: 999px; padding: 0.05em 0.55em; text-decoration: none; margin-left: 0.35em; }
[data-link-visual] { margin-left: 0.5em; }
[data-role="indice-cronologico"] ol { list-style: none; padding: 0; }
[data-role="indice-cronologico"] li { margin: 0.25em 0; }
[data-role^="indice"] h2 { font-size: 1.15em; }
[data-role="indice-remissivo"] dl { margin: 0; font-size: 0.92em; }
[data-role="indice-remissivo"] dt { font-weight: 700; margin-top: 0.7em; }
[data-role="indice-remissivo"] dd { margin: 0 0 0 1em; }
[data-indice-data] { font-variant-numeric: tabular-nums; color: var(--muted); margin-right: 0.4em; }
mark { background: var(--c, #fde047); color: inherit; padding: 0 0.12em; border-radius: 0.2em; }
mark[data-so-nota="1"] { background: none; border-bottom: 2px dotted currentColor; border-radius: 0; }
a { color: inherit; }
[data-colunas="3"] [data-role="lei"] > div:first-of-type, [data-colunas="3"] [data-role="indice-remissivo"] dl { columns: 3; column-gap: 1.4rem; }
[data-nova-pagina="1"] [data-role="lei"] { break-before: page; }
@media print {
  body, html { background: #fff; color: #000; }
  [data-vademecum-corpo] { padding: 0; max-width: none; }
  [data-link-visual] { display: none !important; }
}
@page { margin: 16mm; }`;
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<style>${css}
</style>
</head>
<body>
${corpo}
</body>
</html>
`;
}

/** Nome do arquivo a partir do título do Vade Mecum ("Meu Vade Mecum" → "meu-vade-mecum.html"). */
export function nomeDoArquivo(titulo: string): string {
  const slug = titulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "vade-mecum"}.html`;
}
