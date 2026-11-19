// Compilação dos grifos prontos (content/grifos/*.yaml → src/content/generated/grifos.json), usada pelo
// scripts/build-content.ts: a conferência de cada entrada no texto das leis, o "essencial" (o dispositivo já caiu em
// prova) e o "vide" entre as entradas do mesmo tema. Pura (sem arquivos): o build passa os textos e as provas.
//
// Executado também pelo Node puro (type stripping): só imports relativos com extensão .ts.
import { extrairCitacoes, type Citacao, type Lexico } from "../correcao/citacoes.ts";
import { normalize } from "../correcao/normalize.ts";
import { acharPalavra, CORES_GRIFO, type BlocoDoGrifo, type EntradaGrifo, type GrifoPronto, type VideGrifo } from "./grifos.ts";
import { rotuloSumula, TRIBUNAIS, type Tribunal } from "./sumulas.ts";

/** A "lei" das súmulas de cada tribunal citado ("Súmula 700 do STF" → sumulas-stf; vinculante → sumulas-vinculantes). */
function leiDaSumula(c: Extract<Citacao, { tipo: "sumula" }>): string | null {
  if (c.vinculante) return "sumulas-vinculantes";
  if (c.tribunal === "stf" || c.tribunal === "stj") return `sumulas-${c.tribunal}`;
  return null;
}

/**
 * Os dispositivos do leitor que uma citação nomeia: "art. 386, VII, do CPP" → cpp art386.i7; "art. 33, § 2º, b e c, do CP"
 * → cp art33.p2.ab e art33.p2.ac; "Súmula 718 do STF" → sumulas-stf s-718. Sem diploma (ou tribunal), nada.
 */
export function dispositivosDaCitacao(c: Citacao): { lei: string; disp: string }[] {
  if (c.tipo === "sumula") {
    const lei = leiDaSumula(c);
    return lei ? [{ lei, disp: `s-${c.n}` }] : [];
  }
  if (!c.diploma) return [];
  const base = `art${c.art.toLowerCase()}`;
  const pars = c.pars.length ? c.pars.map((p) => (p === "unico" ? ".pu" : `.p${p}`)) : [""];
  const incs = c.incs.length ? c.incs.map((i) => `.i${i}`) : [""];
  const als = c.als.length ? c.als.map((a) => `.a${a}`) : [""];
  const saida: { lei: string; disp: string }[] = [];
  for (const p of pars) for (const i of incs) for (const a of als) saida.push({ lei: c.diploma, disp: `${base}${p}${i}${a}` });
  return saida;
}

/**
 * Os dispositivos citados nos textos das provas, cada um com os dispositivos que o contêm ("cpp|art386.i7" e
 * "cpp|art386"): assim o grifo do art. 386 conta a citação do inciso VII, e a citação do "art. 5º" sozinho não faz
 * essencial cada inciso do art. 5º.
 */
export function dispositivosCitados(textos: Iterable<string>, lex: Lexico): Set<string> {
  const saida = new Set<string>();
  for (const t of textos) {
    if (!t?.trim()) continue;
    for (const c of extrairCitacoes(normalize(t), lex))
      for (const { lei, disp } of dispositivosDaCitacao(c)) {
        const partes = disp.split(".");
        for (let k = 1; k <= partes.length; k++) saida.add(`${lei}|${partes.slice(0, k).join(".")}`);
      }
  }
  return saida;
}

/** O dispositivo do grifo já caiu em prova: ele (ou algo dentro dele) foi citado. */
export const ehEssencial = (g: Pick<EntradaGrifo, "lei" | "disp">, citados: ReadonlySet<string>) => citados.has(`${g.lei}|${g.disp}`);

/** O tema sem acento, em minúsculas e sem espaços sobrando: a chave do "vide". */
export const chaveDoTema = (tema: string) =>
  tema
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const romanos: [number, string][] = [
  [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];
const romano = (n: number) => {
  let s = "";
  for (const [v, r] of romanos) for (; n >= v; n -= v) s += r;
  return s;
};
/** "art5" → "5º", "art396-a" → "396-A", "art10" → "10"; o mesmo para "p2" (§ 2º). */
const numeroComOrdinal = (n: string) => {
  const [num, letra] = n.split("-");
  return `${num}${Number(num) < 10 ? "º" : ""}${letra ? `-${letra.toUpperCase()}` : ""}`;
};

/**
 * O rótulo curto de um dispositivo para o "vide": "CPP, art. 310, I", "CF, art. 5º, LXV", "CP, art. 100, § 2º",
 * "CPP, art. 404, parágrafo único", "CF, art. 102, II, a", "Súmula 700 do STF", "Súmula Vinculante 11".
 * `sigla` é o nome curto da lei ("CPP", "Lei 9.099/95").
 */
export function rotuloDoDispositivo(lei: string, disp: string, sigla: string): string {
  const sumula = lei.match(/^sumulas-(stf|stj|vinculantes)$/)?.[1] as Tribunal | undefined;
  if (sumula) {
    const n = disp.replace(/^s-/, "");
    return sumula === "vinculantes" ? rotuloSumula(sumula, n) : `${rotuloSumula(sumula, n)} do ${TRIBUNAIS[sumula]}`;
  }
  const [art, ...resto] = disp.split(".");
  const partes = resto.map((p) => {
    if (p === "pu") return "parágrafo único";
    const m = p.match(/^([pia])(.+)$/);
    if (!m) return p;
    if (m[1] === "p") return `§ ${numeroComOrdinal(m[2]!)}`;
    if (m[1] === "i") {
      const [n, letra] = m[2]!.split("-");
      return `${romano(Number(n))}${letra ? `-${letra.toUpperCase()}` : ""}`;
    }
    return m[2]!;
  });
  return [sigla, `art. ${numeroComOrdinal((art ?? "").replace(/^art/, ""))}`, ...partes].join(", ");
}

/** b está dentro de a (ou é o próprio a): "art102.i2.aa" está dentro de "art102.i2". */
const dentroDe = (a: string, b: string) => b === a || b.startsWith(`${a}.`);

/** O artigo (ou a súmula) do dispositivo: "art33.p2.ab" → "art33". */
const artigoDe = (disp: string) => disp.split(".")[0]!;

/**
 * O "vide" de cada entrada: as outras entradas com o mesmo tema (sem acento e maiúsculas) em outro artigo. Dois
 * dispositivos do mesmo artigo (o inciso e o seu artigo, ou as alíneas b e c do art. 33, § 2º, do CP) não ganham "vide"
 * um para o outro, porque estão juntos no texto, um logo abaixo do outro; e, quando o "vide" leva ao artigo e a um inciso
 * dele, fica só o artigo. A mesma entrada em duas cores (o art. 386 nas Teses e nos Pedidos) não é "vide": é o mesmo
 * dispositivo.
 */
export function videsDasEntradas(entradas: readonly Pick<EntradaGrifo, "tema" | "lei" | "disp">[], rotulo: (lei: string, disp: string) => string): VideGrifo[][] {
  const porTema = new Map<string, number[]>();
  entradas.forEach((e, k) => {
    const chave = chaveDoTema(e.tema);
    porTema.set(chave, [...(porTema.get(chave) ?? []), k]);
  });
  return entradas.map((e) => {
    const alvos: { lei: string; disp: string }[] = [];
    for (const k of porTema.get(chaveDoTema(e.tema)) ?? []) {
      const o = entradas[k]!;
      if (o.lei === e.lei && artigoDe(o.disp) === artigoDe(e.disp)) continue;
      if (alvos.some((a) => a.lei === o.lei && dentroDe(a.disp, o.disp))) continue;
      // um alvo novo que contém os já escolhidos fica no lugar deles
      for (let j = alvos.length - 1; j >= 0; j--) if (alvos[j]!.lei === o.lei && dentroDe(o.disp, alvos[j]!.disp)) alvos.splice(j, 1);
      alvos.push({ lei: o.lei, disp: o.disp });
    }
    return alvos.map((a) => ({ ...a, rotulo: rotulo(a.lei, a.disp) }));
  });
}

/** Os problemas de uma entrada no texto do leitor: a lei, o dispositivo vigente e cada palavra. Vazio = a entrada está certa. */
export function problemasDaEntrada(e: EntradaGrifo, blocosDaLei: readonly BlocoDoGrifo[] | undefined): string[] {
  if (!CORES_GRIFO.includes(e.cor)) return [`cor "${e.cor}" não existe (use ${CORES_GRIFO.join(", ")})`];
  if (!blocosDaLei) return [`a lei "${e.lei}" não está no leitor`];
  const vigentes = blocosDaLei.filter((b) => !b.superada && !!b.disp && dentroDe(e.disp, b.disp));
  if (!vigentes.some((b) => b.disp === e.disp)) return [`o dispositivo "${e.disp}" não existe (ou não está vigente) em ${e.lei}`];
  const problemas: string[] = [];
  for (const p of e.palavras) if (!vigentes.some((b) => acharPalavra(b.texto ?? "", p))) problemas.push(`a palavra "${p}" não está no texto de ${e.lei} ${e.disp}`);
  return problemas;
}

/** As entradas com o "essencial" e o "vide" calculados: o conteúdo de grifos.json. */
export function compilarGrifos(entradas: readonly EntradaGrifo[], citados: ReadonlySet<string>, rotulo: (lei: string, disp: string) => string): GrifoPronto[] {
  const vides = videsDasEntradas(entradas, rotulo);
  return entradas.map((e, k) => ({
    cor: e.cor,
    grupo: e.grupo,
    tema: e.tema,
    lei: e.lei,
    disp: e.disp,
    palavras: e.palavras,
    ...(e.nota ? { nota: e.nota } : {}),
    essencial: ehEssencial(e, citados),
    vide: vides[k]!,
  }));
}
