// Números por extenso, em português do Brasil, e o caminho de volta (o que a pessoa falou → número).

export type Genero = "m" | "f";

const LIMITE = 999_999_999_999;

const UNIDADES = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
const DEZ_A_DEZENOVE = [
  "dez", "onze", "doze", "treze", "catorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove",
];
const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CENTENAS = [
  "", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos",
];

// Ordinais de 1 a 999, sempre no masculino (o feminino troca o "o" final).
const ORD_UNI = ["", "primeiro", "segundo", "terceiro", "quarto", "quinto", "sexto", "sétimo", "oitavo", "nono"];
const ORD_DEZ = [
  "", "décimo", "vigésimo", "trigésimo", "quadragésimo", "quinquagésimo", "sexagésimo", "septuagésimo", "octogésimo", "nonagésimo",
];
const ORD_CENT = [
  "", "centésimo", "ducentésimo", "trecentésimo", "quadringentésimo", "quingentésimo", "sexcentésimo", "septingentésimo", "octingentésimo", "nongentésimo",
];

/** Vale a palavra no feminino: "duzentos" → "duzentas". */
function fem(palavra: string): string {
  return palavra.replace(/os$/, "as");
}

/** Unidade de 1 a 9; no feminino, "um" vira "uma" e "dois" vira "duas". */
function unidade(u: number, genero: Genero): string {
  if (genero === "f" && u === 1) return "uma";
  if (genero === "f" && u === 2) return "duas";
  return UNIDADES[u];
}

/** Número de 1 a 99. */
function ateNoventaNove(r: number, genero: Genero): string {
  if (r < 10) return unidade(r, genero);
  if (r < 20) return DEZ_A_DEZENOVE[r - 10];
  const dezena = DEZENAS[Math.floor(r / 10)];
  const u = r % 10;
  return u ? `${dezena} e ${unidade(u, genero)}` : dezena;
}

/** Grupo de 1 a 999. */
function ateNovecentosENoventaNove(g: number, genero: Genero): string {
  if (g === 100) return "cem";
  const partes: string[] = [];
  const c = Math.floor(g / 100);
  const r = g % 100;
  if (c > 0) partes.push(genero === "f" ? fem(CENTENAS[c]) : CENTENAS[c]);
  if (r > 0) partes.push(ateNoventaNove(r, genero));
  return partes.join(" e ");
}

/** Texto de um grupo de três algarismos, com a sua escala (mil, milhão, bilhão). */
function nomeDoGrupo(grupo: number, escala: number, genero: Genero): string {
  if (escala === 1_000_000_000) {
    return `${ateNovecentosENoventaNove(grupo, "m")} ${grupo === 1 ? "bilhão" : "bilhões"}`;
  }
  if (escala === 1_000_000) {
    return `${ateNovecentosENoventaNove(grupo, "m")} ${grupo === 1 ? "milhão" : "milhões"}`;
  }
  if (escala === 1000) {
    return grupo === 1 ? "mil" : `${ateNovecentosENoventaNove(grupo, genero)} mil`;
  }
  return ateNovecentosENoventaNove(grupo, genero);
}

/** Primeiro número do que sobra: 500 em "quinhentos mil", 1100 em "mil e cem". */
function topoDoResto(r: number): number {
  if (r >= 1_000_000) return Math.floor(r / 1_000_000);
  if (r >= 1000) return Math.floor(r / 1000);
  return r;
}

/** Ligação entre o grupo maior e o que sobra: " e " só quando o que sobra é pequeno ou redondo. */
function ligacao(resto: number): string {
  const topo = topoDoResto(resto);
  return topo < 100 || topo % 100 === 0 ? " e " : " ";
}

/** 0 a 999.999.999.999 por extenso, no português do Brasil. Fora disso (ou não inteiro), devolve os algarismos como texto. */
export function porExtenso(n: number, genero: Genero = "m"): string {
  if (!Number.isInteger(n) || n < 0 || n > LIMITE) return String(n);
  if (n === 0) return "zero";
  let texto = "";
  let escalaAnterior = 0;
  for (const escala of [1_000_000_000, 1_000_000, 1000, 1]) {
    const grupo = Math.floor(n / escala) % 1000;
    if (grupo === 0) continue;
    if (texto) texto += ligacao(n % escalaAnterior);
    texto += nomeDoGrupo(grupo, escala, genero);
    escalaAnterior = escala;
  }
  return texto;
}

/** 1 a 999 como ordinal ("primeiro", "vigésimo primeiro", "centésimo décimo"); fora disso, porExtenso(n). */
export function ordinalPorExtenso(n: number, genero: Genero = "m"): string {
  if (!Number.isInteger(n) || n < 1 || n > 999) return porExtenso(n, genero);
  const partes = [
    ORD_CENT[Math.floor(n / 100)],
    ORD_DEZ[Math.floor((n % 100) / 10)],
    ORD_UNI[n % 10],
  ].filter(Boolean);
  return partes.map((p) => (genero === "f" ? p.replace(/o$/, "a") : p)).join(" ");
}

const ROMANO = /^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;
const VALOR_ROMANO: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

/** Romano canônico ("IV", "xiv", "LXXVIII", "MCMXC") → número; inválido ("IIII", "IC", "VX", "", "ABC") → null. Aceita maiúsculas e minúsculas, até 3999. */
export function romanoParaNumero(s: string): number | null {
  const maiusculo = s.toUpperCase();
  if (!maiusculo || !ROMANO.test(maiusculo)) return null;
  let total = 0;
  for (let i = 0; i < maiusculo.length; i++) {
    const atual = VALOR_ROMANO[maiusculo[i]];
    const proximo = VALOR_ROMANO[maiusculo[i + 1]] ?? 0;
    total += atual < proximo ? -atual : atual;
  }
  return total;
}

// Denominadores com nome próprio: [singular, plural].
const FRACOES_COM_NOME = new Map<number, [string, string]>([
  [2, ["meio", "meios"]],
  [3, ["terço", "terços"]],
  [4, ["quarto", "quartos"]],
  [5, ["quinto", "quintos"]],
  [6, ["sexto", "sextos"]],
  [7, ["sétimo", "sétimos"]],
  [8, ["oitavo", "oitavos"]],
  [9, ["nono", "nonos"]],
  [10, ["décimo", "décimos"]],
  [100, ["centésimo", "centésimos"]],
  [1000, ["milésimo", "milésimos"]],
]);

/** Fração por extenso: (1,3) "um terço", (2,3) "dois terços", (5,11) "cinco onze avos". Fora do esperado, devolve "n/d". */
export function fracaoPorExtenso(numerador: number, denominador: number): string {
  if (!Number.isInteger(numerador) || !Number.isInteger(denominador) || numerador < 1 || denominador < 2) {
    return `${numerador}/${denominador}`;
  }
  const nome = FRACOES_COM_NOME.get(denominador);
  if (nome) return `${porExtenso(numerador)} ${numerador > 1 ? nome[1] : nome[0]}`;
  return `${porExtenso(numerador)} ${porExtenso(denominador)} avos`;
}

interface Entrada {
  v: number;
  // C: centena (duzentos…), Cn: "cento", Cc: "cem", T: 10 a 19, D: dezena, U: unidade,
  // M: escala (mil, milhão, bilhão), Z: zero, O*: ordinais (OC centena, OD dezena, OU unidade, OM milésimo).
  cat: string;
}

const CARDINAIS = new Map<string, Entrada>();
const ORDINAIS = new Map<string, Entrada>();

function cadastra(mapa: Map<string, Entrada>, palavra: string, v: number, cat: string) {
  mapa.set(norma(palavra), { v, cat });
}

/** Minúsculas, sem acento: "Três" e "tres" viram a mesma coisa. */
function norma(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

cadastra(CARDINAIS, "zero", 0, "Z");
const UNIDADES_ACEITAS: [string, number][] = [
  ["um", 1], ["uma", 1], ["dois", 2], ["duas", 2], ["três", 3], ["quatro", 4], ["cinco", 5],
  ["seis", 6], ["sete", 7], ["oito", 8], ["nove", 9],
];
UNIDADES_ACEITAS.forEach(([p, v]) => cadastra(CARDINAIS, p, v, "U"));
DEZ_A_DEZENOVE.forEach((p, i) => cadastra(CARDINAIS, p, 10 + i, "T"));
["catorze", "quatorze"].forEach((p) => cadastra(CARDINAIS, p, 14, "T"));
["dezesseis", "dezasseis"].forEach((p) => cadastra(CARDINAIS, p, 16, "T"));
["dezessete", "dezassete"].forEach((p) => cadastra(CARDINAIS, p, 17, "T"));
DEZENAS.forEach((p, i) => { if (i >= 2) cadastra(CARDINAIS, p, i * 10, "D"); });
cadastra(CARDINAIS, "cem", 100, "Cc");
cadastra(CARDINAIS, "cento", 100, "Cn");
CENTENAS.forEach((p, i) => {
  if (i < 2) return;
  cadastra(CARDINAIS, p, i * 100, "C");
  cadastra(CARDINAIS, fem(p), i * 100, "C");
});
cadastra(CARDINAIS, "mil", 1000, "M");
["milhão", "milhões"].forEach((p) => cadastra(CARDINAIS, p, 1_000_000, "M"));
["bilhão", "bilhões"].forEach((p) => cadastra(CARDINAIS, p, 1_000_000_000, "M"));

// Ordinais: cada palavra masculina também entra no feminino.
const ORDINAIS_MASC: [string, number, string][] = [
  ["primeiro", 1, "OU"], ["segundo", 2, "OU"], ["terceiro", 3, "OU"], ["quarto", 4, "OU"], ["quinto", 5, "OU"],
  ["sexto", 6, "OU"], ["sétimo", 7, "OU"], ["oitavo", 8, "OU"], ["nono", 9, "OU"],
  ["décimo", 10, "OD"], ["vigésimo", 20, "OD"], ["trigésimo", 30, "OD"], ["quadragésimo", 40, "OD"],
  ["quinquagésimo", 50, "OD"], ["sexagésimo", 60, "OD"], ["septuagésimo", 70, "OD"],
  ["octogésimo", 80, "OD"], ["nonagésimo", 90, "OD"],
  ["centésimo", 100, "OC"], ["ducentésimo", 200, "OC"], ["trecentésimo", 300, "OC"],
  ["quadringentésimo", 400, "OC"], ["quingentésimo", 500, "OC"], ["sexcentésimo", 600, "OC"],
  ["septingentésimo", 700, "OC"], ["octingentésimo", 800, "OC"], ["nongentésimo", 900, "OC"],
  ["milésimo", 1000, "OM"],
];
for (const [palavra, v, cat] of ORDINAIS_MASC) {
  cadastra(ORDINAIS, palavra, v, cat);
  cadastra(ORDINAIS, palavra.replace(/o$/, "a"), v, cat);
}

const ORDEM_CARDINAL: Record<string, number> = { Cc: 1, Cn: 1, C: 1, T: 2, D: 2, U: 3 };
const ORDEM_ORDINAL: Record<string, number> = { OC: 1, OD: 2, OU: 3 };

/** Um grupo de até 999 (sem mil, milhão ou bilhão). Só aceita a ordem centena, dezena, unidade. */
function valorDoGrupo(lista: Entrada[]): number | null {
  let ordem = 0;
  let total = 0;
  for (const e of lista) {
    const o = ORDEM_CARDINAL[e.cat];
    if (o === undefined || o <= ordem) return null;
    total += e.v;
    // "dez" e "cem" não podem ser seguidos de mais nada no mesmo grupo.
    ordem = e.cat === "T" || e.cat === "Cc" ? 9 : o;
  }
  // "cento" pede algo depois: "cento" sozinho não é número.
  if (lista[lista.length - 1].cat === "Cn") return null;
  return total;
}

function valorCardinal(lista: Entrada[]): number | null {
  if (lista.some((e) => e.cat === "Z")) return lista.length === 1 ? 0 : null;
  let total = 0;
  let pendente: Entrada[] = [];
  let escalaAnterior = Infinity;
  for (const e of lista) {
    if (e.cat !== "M") {
      pendente.push(e);
      continue;
    }
    if (e.v >= escalaAnterior) return null;
    const grupo = pendente.length ? valorDoGrupo(pendente) : 1;
    if (grupo === null) return null;
    total += grupo * e.v;
    pendente = [];
    escalaAnterior = e.v;
  }
  if (pendente.length) {
    const grupo = valorDoGrupo(pendente);
    if (grupo === null) return null;
    total += grupo;
  }
  return total;
}

function valorOrdinal(lista: Entrada[]): number | null {
  if (lista.some((e) => e.cat === "OM")) return lista.length === 1 ? 1000 : null;
  let ordem = 0;
  let total = 0;
  for (const e of lista) {
    const o = ORDEM_ORDINAL[e.cat];
    if (o === undefined || o <= ordem) return null;
    total += e.v;
    ordem = o;
  }
  return total;
}

/** Número dito em palavras ou algarismos → número; não reconhecido → null. Ver os exemplos abaixo. */
export function numeroDePalavras(texto: string): number | null {
  const bruto = texto.trim().toLowerCase();

  // Só algarismos, com ponto de milhar e "º", "°", "ª" ou "o" no fim.
  const digitos = /^(\d{1,3}(?:\.\d{3})+|\d+)[º°ªo]?$/.exec(bruto);
  if (digitos) return Number(digitos[1].replace(/\./g, ""));

  const limpo = norma(bruto).replace(/[-,/]/g, " ");
  if (!/^[a-z ]+$/.test(limpo)) return null;

  const entradas: Entrada[] = [];
  for (const palavra of limpo.split(" ")) {
    if (!palavra || palavra === "e") continue;
    const e = CARDINAIS.get(palavra) ?? ORDINAIS.get(palavra);
    if (!e) return null;
    entradas.push(e);
  }
  if (entradas.length === 0) return null;

  const ordinal = entradas.filter((e) => e.cat.startsWith("O"));
  if (ordinal.length === 0) return valorCardinal(entradas);
  if (ordinal.length === entradas.length) return valorOrdinal(entradas);
  return null;
}
