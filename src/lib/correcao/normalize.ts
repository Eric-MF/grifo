// Normalização de texto jurídico para comparação tolerante.
// Rubrica e resposta passam pela MESMA função, então basta que as duas formas
// convirjam para o mesmo texto. Exemplos:
//   "Art. 33, § 2º, alínea 'c', do CP"  → "art 33 paragrafo 2 alinea c do cp"
//   "Lei nº 11.343/06"                  → "lei 11343"
//   "cinco dias" / "5 (cinco) dias"     → "5 dias"
//   "1º de setembro de 2023"            → "2023-09-01"   (idem "01/09/2023")
//   "inciso LXV"                        → "inciso 65"

const MESES: Record<string, number> = {
  janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};

// Cardinais (masculino/feminino) e ordinais comuns em prazos, frações e incisos.
const NUMEROS: Record<string, number> = {
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8,
  nove: 9, dez: 10, onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14, quinze: 15,
  dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19, vinte: 20, trinta: 30,
  quarenta: 40, cinquenta: 50, sessenta: 60, noventa: 90, cem: 100,
  primeiro: 1, primeira: 1, segundo: 2, segunda: 2, terceiro: 3, terceira: 3,
  quarto: 4, quinto: 5, sexto: 6, setimo: 7, oitavo: 8, nono: 9, decimo: 10,
};
const NUM_WORDS = Object.keys(NUMEROS).sort((a, b) => b.length - a.length).join("|");

const ROMAN: Record<string, number> = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 };
export function romanToInt(s: string): number | null {
  if (!/^[ivxlcdm]+$/.test(s)) return null;
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const v = ROMAN[s[i]];
    const next = ROMAN[s[i + 1]] ?? 0;
    total += v < next ? -v : v;
  }
  // rejeita formas inválidas óbvias (ex.: "iiii" é aceito por tolerância, "vx" não)
  return total > 0 && total < 400 ? total : null;
}

function stripAccents(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function fullYear(y: string) {
  if (y.length === 4) return y;
  const n = Number(y);
  return String(n >= 50 ? 1900 + n : 2000 + n);
}

/**
 * Normaliza texto para comparação. Resultado: minúsculas, sem acentos, sem
 * pontuação (exceto "-" em datas ISO e "/" residual), espaços simples, com
 * espaço no início e no fim (facilita buscar " termo ").
 */
export function normalize(input: string): string {
  let s = stripAccents(input.toLowerCase());

  // Símbolos e abreviações jurídicas
  s = s
    .replace(/[“”«»"'`´]/g, " ")
    .replace(/§§/g, " paragrafos ")
    .replace(/§/g, " paragrafo ")
    .replace(/\bpar\.\s*un(ico|\.)?/g, " paragrafo unico ")
    .replace(/\bp\.\s*u\.?(?=\s|,|$)/g, " paragrafo unico ")
    .replace(/\bparag\.?(?=\s)/g, " paragrafo ")
    .replace(/\barts?\.(?=\s|\d)/g, (m) => (m.startsWith("arts") ? " arts " : " art "))
    .replace(/\bartigos?\b/g, (m) => (m === "artigos" ? " arts " : " art "))
    .replace(/\bincs?\.(?=\s|[ivxlc\d])/g, " inciso ")
    .replace(/\bincisos\b/g, " incisos ")
    .replace(/\bal\.(?=\s)/g, " alinea ")
    .replace(/\bn[º°o]\s*(?=\d)/g, " ")
    .replace(/\bnum(ero|\.)\s*(?=\d)/g, " ")
    .replace(/\bc\/c\b/g, " combinado com ")
    .replace(/\bs\/n\b/g, " ");

  // Zeros à esquerda: "05 dias" → "5 dias", "01/09/2023" → "1/9/2023" (antes das datas).
  // Depois de "dígito." o zero é do milhar ("Lei 8.072/90") e fica.
  s = s.replace(/(?<!\d\.)\b0+(?=\d)/g, "");

  // Ordinais numéricos: 1º, 2ª, 1o → 1
  s = s.replace(/(\d+)\s*[º°ª]/g, "$1").replace(/\b(\d+)(o|a)\b/g, "$1");

  // Datas: "1 de setembro de 2023" e "01/09/2023" → 2023-09-01
  s = s.replace(
    /\b(\d{1,2})\s+de\s+(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+(\d{4})\b/g,
    (_, d, m, y) => ` ${y}-${pad(MESES[m])}-${pad(Number(d))} `,
  );
  s = s.replace(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/g, (_, d, m, y) =>
    Number(m) <= 12 && Number(d) <= 31 ? ` ${fullYear(y)}-${pad(Number(m))}-${pad(Number(d))} ` : _,
  );

  // Leis: "Lei 11.343/06" → "lei 11343"; "Decreto-Lei 2.848/40" → "decreto-lei 2848"
  s = s.replace(/(\d)\.(?=\d{3}\b)/g, "$1");
  s = s.replace(/\b(lei|decreto-lei|decreto lei|lc|lei complementar|dl)\s+(\d+)\s*\/\s*\d{1,4}\b/g, "$1 $2");
  // CF/88, CRFB/88
  s = s.replace(/\b(cf|crfb)\s*\/\s*\d{2,4}\b/g, "$1");

  // Frações por extenso: "um sexto" → "1/6", "dois terços" → "2/3" (antes dos ordinais)
  s = s.replace(
    new RegExp(`\\b(${NUM_WORDS}|\\d+)\\s+(sextos?|tercos?|quartos?|quintos?|oitavos?)\\b`, "g"),
    (m, n, f) => {
      const num = /^\d+$/.test(n) ? Number(n) : NUMEROS[n];
      const den: Record<string, number> = { sexto: 6, terco: 3, quarto: 4, quinto: 5, oitavo: 8 };
      return num && num <= 10 ? ` ${num}/${den[f.replace(/s$/, "")]} ` : m;
    },
  );

  // Números por extenso isolados → dígitos ("cinco dias" → "5 dias").
  // "5 (cinco) dias" → "5 dias" (remove o extenso redundante entre parênteses).
  s = s.replace(new RegExp(`(\\d+)\\s*\\(\\s*(?:${NUM_WORDS})(?:\\s+e\\s+(?:${NUM_WORDS}))?\\s*\\)`, "g"), "$1");
  s = s.replace(new RegExp(`\\b(${NUM_WORDS})\\s+e\\s+(${NUM_WORDS})\\b`, "g"), (m, a, b) =>
    NUMEROS[a] >= 20 && NUMEROS[b] < 10 ? String(NUMEROS[a] + NUMEROS[b]) : m,
  );
  s = s.replace(new RegExp(`\\b(${NUM_WORDS})\\b`, "g"), (m) => String(NUMEROS[m]));

  // "Maricá/RJ", "56/STF", "CF/88" já tratado: barra que não está entre dígitos vira espaço
  s = s.replace(/([a-z])\/(?=[a-z0-9])|([0-9])\/(?=[a-z])/g, "$1$2 ");

  // Hífen entre letras ("absolvê-lo", "pena-base", "queixa-crime") → espaço
  s = s.replace(/([a-z])-(?=[a-z])/g, "$1 ");

  // Pontuação → espaço (preserva "/" de frações e "-" de datas ISO e "decreto-lei")
  s = s.replace(/[^a-z0-9/\-\s]/g, " ").replace(/\s-\s|\s-|-\s/g, " ");

  // Romanos após "inciso(s)" → arábicos
  s = s.replace(/\b(incisos?)\s+([ivxlc]+)\b/g, (m, w, r) => {
    const n = romanToInt(r);
    return n ? `${w} ${n}` : m;
  });

  return ` ${s.replace(/\s+/g, " ").trim()} `;
}

/** Converte um termo da rubrica em RegExp sobre texto normalizado. */
export function termToRegex(term: string): RegExp {
  const t = term.trim();
  if (t.startsWith("re:")) return new RegExp(t.slice(3));
  const alts = t.split("|").map((alt) => {
    // Cada palavra terminada em * vira prefixo ("transit* em julgado").
    const marked = alt.trim().replace(/\*(?=\s|$)/g, " qqsufixoqq ");
    const body = normalize(marked).trim();
    return body
      .replace(/[.*+?^${}()[\]\\]/g, "\\$&")
      .replace(/ qqsufixoqq/g, "[a-z0-9]*")
      .replace(/ /g, "\\s+");
  });
  return new RegExp(`(?<=\\s)(?:${alts.join("|")})(?=\\s)`);
}
