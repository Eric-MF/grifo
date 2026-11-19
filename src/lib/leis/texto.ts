// Texto da lei como aparece no Planalto: "Art. 1o" (o no lugar do º, comum nos textos compilados).
// Todo número colado a um "o" minúsculo é ordinal (artigo, parágrafo, dia, ano...), desde que nem o número
// nem o "o" estejam colados a letra ou dígito: "R2o" e "10ox" ficam, "no 5.869" também (não há número antes do "o").
// Um "O" maiúsculo (início do caput, "Art. 1o O processo") fica como está. Só o "o" é trocado.
// A troca é de um caractere por um caractere, então os deslocamentos (índices) do texto não mudam.
const NUMERO_ORDINAL = /(?<![A-Za-zÀ-ÿ\d])(\d+(?:\.\d{3})*)o(?![A-Za-zÀ-ÿ\d])/g;

/** Troca o "o" de ordinal por "º" em "Art. 1o", "§ 2o", "§ 1o-A", "15o (décimo quinto)", "dia 1o de janeiro". */
export const ordinal = (texto: string) => texto.replace(NUMERO_ORDINAL, "$1º");

/** Tira o trema ("freqüente" → "frequente"): a reforma de 2009 acabou com ele, exceto em nomes estrangeiros. */
export const semTrema = (texto: string) => texto.replace(/([gqGQ])ü/g, "$1u").replace(/([gqGQ])Ü/g, "$1U");

/**
 * O texto como o Grifo mostra (ordinal e trema corrigidos). Com `original`, o texto do Planalto como veio.
 * Cada correção troca um caractere por um, então as posições (marcas, índices) são as mesmas nas duas formas.
 */
export const corrigido = (texto: string, original = false) => (original ? texto : semTrema(ordinal(texto)));

/** Os blocos de uma lei na forma pedida (ver `corrigido`); novos objetos, o original não muda. */
export function corrigirBlocos<B extends { texto: string; rotulo?: string }>(blocos: B[], original = false): B[] {
  if (original) return blocos;
  return blocos.map((b) => ({ ...b, texto: corrigido(b.texto), ...(b.rotulo !== undefined ? { rotulo: corrigido(b.rotulo) } : {}) }));
}

/** Um trecho grifado dentro de um bloco: posições em caracteres do texto do bloco. */
export interface MarcaTexto {
  ini: number;
  fim: number;
  cor: string;
  nota?: string;
  /** o parágrafo inteiro: a forma é do bloco, e não de cada linha */
  inteiro?: boolean;
}

/**
 * Parte um pedaço de texto (que começa na posição `ini` do bloco) nos cortes das marcas que o atravessam.
 * Cada parte sai com a marca que a cobre (a primeira, se duas se sobrepõem) ou sem marca.
 */
export function fatiar<M extends Pick<MarcaTexto, "ini" | "fim"> = MarcaTexto>(texto: string, ini: number, marcas: readonly M[]): { texto: string; marca?: M }[] {
  const fim = ini + texto.length;
  const cortes = new Set([ini, fim]);
  for (const m of marcas) {
    if (m.fim > ini && m.ini < fim) {
      cortes.add(Math.max(ini, m.ini));
      cortes.add(Math.min(fim, m.fim));
    }
  }
  const ordem = [...cortes].sort((a, b) => a - b);
  const saida: { texto: string; marca?: M }[] = [];
  for (let k = 0; k < ordem.length - 1; k++) {
    const a = ordem[k]!;
    const b = ordem[k + 1]!;
    if (b <= a) continue;
    const marca = marcas.find((m) => m.ini <= a && a < m.fim);
    saida.push({ texto: texto.slice(a - ini, b - ini), ...(marca ? { marca } : {}) });
  }
  return saida;
}
