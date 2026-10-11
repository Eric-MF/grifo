import type { Dispositivo, LeiTexto } from "./tipos";

const LIMITE = 20;
const PALAVRAS_VAZIAS = new Set(["codigo", "penal", "processo", "constituicao", "federal", "execucao", "lei", "artigo", "artigos", "sobre", "dispositivo"]);

export const normalizar = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").replace(/[ºª°]/g, "o").toLowerCase();

const DIPLOMAS_NO_TEXTO: [RegExp, string][] = [
  [/\bcodigo penal\b|\bcp\b/, "cp"],
  [/\bprocesso penal\b|\bcpp\b/, "cpp"],
  [/\bconstituicao\b|\bcrfb\b|\bcf\b/, "cf"],
  [/\bexecucao penal\b|\blep\b/, "lep"],
];

export function indexarLeis(leis: LeiTexto[]): Dispositivo[] {
  const indice: Dispositivo[] = [];
  for (const lei of leis) {
    lei.blocos.forEach((bloco, i) => {
      if (bloco.tipo !== "artigo" || bloco.superada) return;
      const rotulo = bloco.rotulo?.match(/^Art\.?\s*(\d+(?:-[A-Z]+)?)/i);
      if (!rotulo) return;
      const artigo = rotulo[1].toLowerCase();
      const partes = [bloco.texto];
      for (const filho of lei.blocos.slice(i + 1)) {
        if (filho.tipo === "artigo" || filho.tipo === "estrutura") break;
        if (!filho.superada && filho.texto) partes.push(filho.texto);
      }
      indice.push({
        lei: lei.id,
        nome: lei.nome,
        sigla: lei.sigla,
        artigo,
        rotulo: bloco.rotulo ?? `Art. ${artigo}`,
        texto: partes.join(" "),
        citacao: `art. ${artigo}, ${lei.sigla}`,
        url: `/leis/${lei.id}/#art${artigo.replace("-", "")}`,
        planalto: lei.planalto,
      });
    });
  }
  return indice;
}

export function pesquisarDispositivos(indice: Dispositivo[], termo: string): Dispositivo[] {
  let resto = normalizar(termo);
  const diplomas = new Set<string>();
  for (const m of resto.matchAll(/\blei\s*(?:n\.?\s*(?:o\s*)?)?(\d[\d.]*)/g)) diplomas.add(`lei-${m[1].replace(/\./g, "")}`);
  for (const [re, id] of DIPLOMAS_NO_TEXTO) if (re.test(resto)) diplomas.add(id);
  resto = resto.replace(/\blei\s*(?:n\.?\s*(?:o\s*)?)?\d[\d.]*/g, " ");
  resto = resto.replace(/\bcodigo penal\b|\bprocesso penal\b|\bexecucao penal\b|\bconstituicao\b|\bcrfb\b|\bcp\b|\bcpp\b|\bcf\b|\blep\b/g, " ");

  let artigo: string | undefined;
  const achado = resto.match(/\b(?:art(?:igos?|s?\.)?\s*)?(\d{1,4})(?:\s*-\s*([a-z]))?(?![a-z\d])/);
  if (achado) {
    artigo = achado[2] ? `${achado[1]}-${achado[2]}` : achado[1];
    resto = resto.replace(achado[0], " ");
  }

  const palavras = resto
    .split(/[^a-z0-9]+/)
    .filter((p) => p.length >= 4 && !PALAVRAS_VAZIAS.has(p));

  if (!diplomas.size && !artigo && !palavras.length) return [];

  const resultados = indice.filter((d) => {
    if (diplomas.size && !diplomas.has(d.lei)) return false;
    if (artigo && d.artigo !== artigo) return false;
    if (palavras.length) {
      const texto = normalizar(d.texto);
      return palavras.every((p) => texto.includes(p));
    }
    return true;
  });

  return resultados
    .sort((a, b) => Number(b.artigo === artigo) - Number(a.artigo === artigo))
    .slice(0, LIMITE);
}
