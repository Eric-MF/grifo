// A peça escrita (ou dita) de um jeito que o nome exato e os apelidos não pegam: sem o "à" ("Resposta Acusação"), pelo
// começo das palavras ("Mem", "resp acus", "rec sent estr"), com uma ou duas letras trocadas ("Memorias", "Apelaçao") ou
// com palavras a mais depois ("memorias finais"). Vale só quando aponta uma peça só: "Rec" e "Embargos" são de várias.
// Puro: quem usa passa o catálogo das peças (contextoCorrecao().pecas). O treino usa quando a busca exata não acha nada.

export interface PecaDoCatalogo {
  nome: string;
  aliases: string[];
}

// palavras que não distinguem uma peça de outra
const VAZIAS = new Set(["a", "o", "as", "os", "de", "do", "da", "dos", "das", "em", "no", "na", "nos", "nas", "ao", "aos", "e", "para", "pela", "pelo", "por", "com"]);

const palavras = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((p) => p && !VAZIAS.has(p));

/** Quantas letras trocar, pôr ou tirar para ir de `a` a `b` (a troca de duas vizinhas conta uma). */
export function distancia(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + custo);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i]![j] = Math.min(d[i]![j]!, d[i - 2]![j - 2]! + 1);
    }
  return d[a.length]![b.length]!;
}

/** Quanto a palavra escrita vale contra a do nome: 3 igual, 2 com letra trocada, 1 pelo começo, 0 não bate. */
function nota(escrita: string, doNome: string, peloComeco: boolean): number {
  if (escrita === doNome) return 3;
  const menor = Math.min(escrita.length, doNome.length);
  const tolera = menor >= 8 ? 2 : menor >= 5 ? 1 : 0;
  if (tolera && distancia(escrita, doNome) <= tolera) return 2;
  if (peloComeco && escrita.length >= 3 && doNome.startsWith(escrita)) return 1;
  return 0;
}

/**
 * A nota de um nome contra o texto: as palavras escritas são o começo das do nome ("resp acus" → "resposta acusação"),
 * ou o nome inteiro está no começo do texto, com palavras a mais depois ("memorias finais"). 0: não bate.
 */
function notaDoNome(texto: string[], nome: string[]): number {
  if (!nome.length) return 0;
  let melhor = 0;
  if (texto.length <= nome.length) {
    let soma = 0;
    for (let k = 0; k < texto.length; k++) {
      const n = nota(texto[k]!, nome[k]!, true);
      if (!n) {
        soma = 0;
        break;
      }
      soma += n;
    }
    melhor = soma;
  }
  if (texto.length > nome.length) {
    let soma = 0;
    for (let k = 0; k < nome.length; k++) {
      const n = nota(texto[k]!, nome[k]!, false);
      if (!n) {
        soma = 0;
        break;
      }
      soma += n;
    }
    melhor = Math.max(melhor, soma);
  }
  return melhor;
}

/**
 * As peças que o texto nomeia de um jeito aproximado, da mais parecida para a menos (as empatadas no topo, se mais de
 * uma: o texto é ambíguo). Vazio: nada parecido.
 */
export function pecasAproximadas(texto: string, pecas: Readonly<Record<string, PecaDoCatalogo>>): { tipo: string; nome: string }[] {
  const t = palavras(texto);
  if (!t.length) return [];
  const notas: { tipo: string; nome: string; nota: number }[] = [];
  for (const [tipo, p] of Object.entries(pecas)) {
    const n = Math.max(...[p.nome, ...p.aliases].map((a) => notaDoNome(t, palavras(a))));
    if (n > 0) notas.push({ tipo, nome: p.nome, nota: n });
  }
  if (!notas.length) return [];
  const topo = Math.max(...notas.map((x) => x.nota));
  return notas.filter((x) => x.nota === topo).map(({ tipo, nome }) => ({ tipo, nome }));
}
