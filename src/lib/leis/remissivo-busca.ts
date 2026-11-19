// A ordem dos títulos do índice alfabético-remissivo na busca: o título que é o próprio termo vem antes dos que só o
// contêm. Os dois textos chegam sem acento e em minúsculas.

/** As formas do título: "prova(s)" → "prova" e "provas"; "acusado (réu)" → "acusado (reu)" e "acusado". */
function formas(palavra: string): string[] {
  const m = palavra.match(/^(.*?)\s*\(([^)]*)\)$/);
  if (!m) return [palavra];
  const [, base, dentro] = m as unknown as [string, string, string];
  // "(s)", "(es)", "(oes)": o plural colado na palavra; o resto é um complemento entre parênteses
  return /^[a-z]{1,3}$/.test(dentro) ? [base, base + dentro] : [base];
}

const singular = (s: string) => s.replace(/(?<=\w)s$/, "");

/** O título contém o termo, em qualquer das suas formas ("provas" está em "prova(s)"). */
export function tituloTemTermo(palavra: string, termo: string): boolean {
  return palavra.includes(termo) || formas(palavra.trim()).some((f) => f.includes(termo));
}

/**
 * 0: o título é o termo (no singular ou no plural); 1: começa pelo termo; 2: só contém o termo. O título que não
 * contém o termo (achado por um subitem) fica em 3, fora daqui.
 */
export function ordemNoRemissivo(palavra: string, termo: string): number {
  const t = termo.trim();
  const fs = formas(palavra.trim());
  if (fs.some((f) => f === t || singular(f) === singular(t))) return 0;
  if (fs.some((f) => f.startsWith(t))) return 1;
  return 2;
}
