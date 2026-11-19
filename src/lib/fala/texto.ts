// O texto da lei preparado para a voz do navegador (speechSynthesis). A voz lê melhor por extenso: "Art. 121" vira
// "Artigo cento e vinte e um", "§ 2º" vira "parágrafo segundo" e "inciso IV" vira "inciso quarto". O número escrito duas
// vezes ("6 (seis)") é dito uma vez só, e o texto é partido em frases curtas (a voz do Chrome se perde em falas longas).
// Funções puras: quem lê o texto da tela e fala é o leitor (src/components/leis/useOuvir.ts).
import { ordinal } from "@/lib/leis/texto";
import { fracaoPorExtenso, ordinalPorExtenso, porExtenso, romanoParaNumero } from "./extenso";

export type TipoBloco = "estrutura" | "rubrica" | "artigo" | "paragrafo" | "inciso" | "alinea" | "texto";

/** Um pedaço do bloco para falar de uma vez: `ini` e `fim` no texto do bloco (para destacar na tela), `falar` já por extenso. */
export interface Peca {
  ini: number;
  fim: number;
  falar: string;
}

/** O nome de cada letra, como a voz deve dizer ("alínea bê", "artigo cento e vinte e um á"). */
const LETRAS: Record<string, string> = {
  a: "á", b: "bê", c: "cê", d: "dê", e: "é", f: "efe", g: "gê", h: "agá", i: "i", j: "jota", k: "cá", l: "ele", m: "eme",
  n: "ene", o: "ó", p: "pê", q: "quê", r: "erre", s: "esse", t: "tê", u: "u", v: "vê", w: "dáblio", x: "xis", y: "ípsilon", z: "zê",
};
export const nomeDaLetra = (l: string) => LETRAS[l.toLowerCase()] ?? l;
const letras = (s: string) => s.replace(/[^A-Za-z]/g, "").split("").map(nomeDaLetra).join(" ");

/** Como a lei se lê: do 1 ao 9, ordinal ("artigo quinto", "parágrafo primeiro"); do 10 em diante, cardinal ("artigo dez"). */
export function numeroDeRotulo(n: number, genero: "m" | "f" = "m"): string {
  return n >= 1 && n <= 9 ? ordinalPorExtenso(n, genero) : porExtenso(n, genero);
}

// palavras que o compilado do Planalto traz sem acento (o Código Penal de 1940): a voz as diria com a sílaba errada
const SEM_ACENTO: Record<string, string> = {
  alguem: "alguém", futil: "fútil", impossivel: "impossível", oficio: "ofício", titulo: "título", domicilio: "domicílio",
  juizes: "juízes", vitima: "vítima", socio: "sócio", clausula: "cláusula",
};

const L = "A-Za-zÀ-ÿ";
// a letra do artigo ou do parágrafo ("121-A", "2º-B", "359-M-A"): maiúscula, colada ao número pelo hífen ("Art. 10 - O dia"
// não tem letra); com espaços em volta do hífen, só se o rótulo termina nela ("§ 1 o -A.", como está no Planalto)
const SUFIXO = String.raw`((?:-[A-Z]{1,2}(?![${L}]))+|\s*-\s*[A-Z]{1,2}(?=\.))?`;
// o fim do rótulo: ponto, dois-pontos ou travessão (o travessão só quando vem um espaço depois)
const FIM_ROTULO = String.raw`\s*(?:[.:]|[-–—](?=\s))?\s*`;
const NUMERO = String.raw`(\d{1,3}(?:\.\d{3})+|\d+)`;
const NUMERO_SEM_GRUPO = String.raw`(?:\d{1,3}(?:\.\d{3})+|\d+)`;
const num = (s: string) => Number(s.replace(/\./g, ""));
const comSufixo = (texto: string, sufixo?: string) => (sufixo ? `${texto} ${letras(sufixo)}` : texto);

const ROTULO_ARTIGO = new RegExp(String.raw`^Art(?:igo)?\.?\s*${NUMERO}\s*[º°]?${SUFIXO}${FIM_ROTULO}`);
const ROTULO_SUMULA = new RegExp(String.raw`^Súmula(\s+Vinculante)?\s+(?:n\.?\s*[º°]?\s*)?(\d+)${FIM_ROTULO}`, "i");
const ROTULO_PARAGRAFO = new RegExp(String.raw`^§\s*(\d+)\s*(?:[º°]|o(?=\s*-))?${SUFIXO}${FIM_ROTULO}`);
const ROTULO_PARAGRAFO_UNICO = new RegExp(String.raw`^Parágrafo\s+único${FIM_ROTULO}`, "i");
const ROTULO_INCISO = new RegExp(String.raw`^([IVXLCDM]+)(?:-([A-Z])(?![${L}]))?\s*[-–—.)]\s*`);
const ROTULO_ALINEA = /^([a-z])\)\s*/;
const ROTULO_ITEM = new RegExp(String.raw`^(\d{1,2})[.)]\s+(?=[${L}])`);
const ROTULO_DIVISAO = new RegExp(String.raw`^(LIVRO|T[ÍI]TULO|CAP[ÍI]TULO|SE[ÇC][ÃA]O|SUBSE[ÇC][ÃA]O|PARTE)\s+([IVXLCDM]+|[ÚU]NIC[OA])(?:-([A-Z])(?![${L}]))?(?![${L}])${FIM_ROTULO}`, "i");
// "Pena - reclusão", "Infração - gravíssima", "Medida administrativa - remoção": o travessão do começo vira dois-pontos
const ROTULO_NOME = /^([A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+(?: [a-záéíóúâêôãõç]+)?)\s+[-–—]\s+/;

const DIVISOES_FEMININAS = /^(se[çc][ãa]o|subse[çc][ãa]o|parte)$/i;
const primeiraMaiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

/** O rótulo do começo do bloco por extenso, com um ponto depois (a voz faz a pausa); sem rótulo, o texto como veio. */
function rotuloDoComeco(t: string, tipo?: TipoBloco): string {
  let m = t.match(ROTULO_ARTIGO);
  if (m) return `Artigo ${comSufixo(numeroDeRotulo(num(m[1]!)), m[2])}. ${t.slice(m[0].length)}`;
  m = t.match(ROTULO_SUMULA);
  if (m) return `Súmula${m[1] ? " vinculante" : ""} ${porExtenso(Number(m[2]))}. ${t.slice(m[0].length)}`;
  m = t.match(ROTULO_PARAGRAFO);
  if (m) return `Parágrafo ${comSufixo(numeroDeRotulo(Number(m[1])), m[2])}. ${t.slice(m[0].length)}`;
  m = t.match(ROTULO_PARAGRAFO_UNICO);
  if (m) return `Parágrafo único. ${t.slice(m[0].length)}`;
  m = t.match(ROTULO_DIVISAO);
  if (m) {
    const palavra = primeiraMaiuscula(m[1]!);
    const n = romanoParaNumero(m[2]!);
    const qual = n ? numeroDeRotulo(n, DIVISOES_FEMININAS.test(m[1]!) ? "f" : "m") : m[2]!.toLowerCase();
    return `${palavra} ${comSufixo(qual, m[3])}. ${t.slice(m[0].length)}`;
  }
  m = t.match(ROTULO_INCISO);
  if (m && (tipo === undefined || tipo === "inciso" || tipo === "texto")) {
    const n = romanoParaNumero(m[1]!);
    if (n) return `Inciso ${comSufixo(numeroDeRotulo(n), m[2])}. ${t.slice(m[0].length)}`;
  }
  m = t.match(ROTULO_ALINEA);
  if (m) return `Alínea ${nomeDaLetra(m[1]!)}. ${t.slice(m[0].length)}`;
  m = t.match(ROTULO_ITEM);
  if (m && tipo !== "artigo" && tipo !== "paragrafo") return `Item ${porExtenso(Number(m[1]))}. ${t.slice(m[0].length)}`;
  m = t.match(ROTULO_NOME);
  if (m) return `${m[1]}: ${t.slice(m[0].length)}`;
  return t;
}

/**
 * Trechos em maiúsculas ("DOS CRIMES CONTRA A VIDA", "O PRESIDENTE DA REPÚBLICA", "CANCELAMENTO"): a voz poderia soletrar.
 * Duas palavras ou mais seguidas em maiúsculas (com oito letras ou mais no todo), ou uma palavra de seis letras ou mais, vão
 * para minúsculas; uma sigla ("STF", "OAB", "IPCA") fica.
 */
const MAIUSCULA = "A-ZÁÉÍÓÚÂÊÔÃÕÇÀÜ";
function semCaixaAlta(t: string): string {
  return t.replace(new RegExp(String.raw`(?<![${L}])[${MAIUSCULA}]+(?:[\s,–-]+[${MAIUSCULA}]+)*(?![${L}])`, "g"), (trecho) => {
    const letras = trecho.replace(/[^A-Za-zÀ-ÿ]/g, "").length;
    const palavras = trecho.split(/[\s,–-]+/).filter(Boolean).length;
    if (!((palavras >= 2 && letras >= 8) || (palavras === 1 && letras >= 6))) return trecho;
    // os romanos ficam ("XXXIII", "CAPÍTULO III"): são lidos como número mais adiante
    return trecho.replace(/[A-Za-zÀ-ÿ]+/g, (p) => (/^[IVXLC]+$/.test(p) && romanoParaNumero(p) ? p : p.toLowerCase()));
  });
}

// lista de romanos depois de "inciso(s)": "I", "I e II", "I a III", "I, II ou III" (com a letra: "III-A")
const ROMANO = String.raw`[IVXLC]+(?:-[A-Z])?`;
const LISTA_ROMANOS = String.raw`${ROMANO}(?:\s*(?:,|\se|\sou|\sa|\sao)\s*${ROMANO})*`;
const romanoPorExtenso = (r: string) => {
  const [n, letra] = r.split("-");
  const v = romanoParaNumero(n!);
  return v ? comSufixo(numeroDeRotulo(v), letra) : r;
};
const listaDeRomanos = (lista: string) => lista.replace(new RegExp(ROMANO, "g"), romanoPorExtenso);

/** As referências no meio do texto: "art. 121, § 2º, I" → "artigo cento e vinte e um, parágrafo segundo, inciso primeiro". */
function referencias(t: string): string {
  return (
    t
      // "§ 2º, I", "art. 5º, LXVIII" e "arts. 148, 154, I": o romano logo depois do número é inciso (a lei não escreve a palavra)
      .replace(
        new RegExp(String.raw`((?:§\s*\d+\s*[º°]?(?:-[A-Z])?|\b[Aa]rts?\.\s*${NUMERO_SEM_GRUPO}\s*[º°]?(?:-[A-Z])?|\d+\s*[º°]?(?:-[A-Z])?|\bcaput))\s*,\s*(${LISTA_ROMANOS})(?=[\s,.;:)]|$)`, "g"),
        (_, antes: string, lista: string) => `${antes}, inciso ${lista}`,
      )
      // "inciso III, b": a letra logo depois do inciso é alínea
      .replace(new RegExp(String.raw`\b(incisos?\s+${ROMANO})\s*,\s*["“'‘]?([a-z])["”'’]?(?=[\s,.;:)]|$)`, "g"), (_, inciso: string, letra: string) => `${inciso}, alínea ${letra}`)
      .replace(new RegExp(String.raw`\b(incisos?|inc\.)\s+(${LISTA_ROMANOS})(?![${L}])`, "gi"), (_, palavra: string, lista: string) =>
        `${palavra.toLowerCase() === "inc." ? "inciso" : palavra} ${listaDeRomanos(lista)}`,
      )
      .replace(new RegExp(String.raw`\b(livro|t[íi]tulo|cap[íi]tulo|se[çc][ãa]o|subse[çc][ãa]o|parte|anexo)\s+([IVXLC]+)(?:-([A-Z]))?(?![${L}])`, "gi"), (tudo, palavra: string, r: string, letra?: string) => {
        const v = romanoParaNumero(r);
        return v ? `${palavra} ${comSufixo(numeroDeRotulo(v, DIVISOES_FEMININAS.test(palavra) ? "f" : "m"), letra)}` : tudo;
      })
      // alíneas: "alínea a", "alíneas “a” e “b”", "al. c"; o "e", o "ou" e o "a" entre as letras são palavras
      .replace(new RegExp(String.raw`\b([Aa]l[íi]neas?|al\.)\s+((?:["“'‘]?[a-z]["”'’]?)(?:(?:\s*,\s*(?!(?:e|a|o|ou)\s)|\s+(?:e|ou|a)\s+)["“'‘]?[a-z]["”'’]?)*)(?![${L}])`, "g"), (_, palavra: string, lista: string) =>
        `${palavra === "al." ? "alínea" : palavra} ${lista
          .replace(/["“”'‘’]/g, "")
          .split(/(\s*,\s*|\s+(?:e|ou|a)\s+)/)
          .map((p, k) => (k % 2 ? p : nomeDaLetra(p)))
          .join("")}`,
      )
      .replace(new RegExp(String.raw`\b([Aa]rts?)\.\s*${NUMERO}(?:\s*([º°]))?${SUFIXO}`, "g"), (_, palavra: string, n: string, _o: string, letra?: string) =>
        `${palavra.toLowerCase() === "arts" ? "artigos" : "artigo"} ${comSufixo(numeroDeRotulo(num(n)), letra)}`,
      )
      .replace(/\b([Aa]rts?)\./g, (_, p: string) => (p.toLowerCase() === "arts" ? "artigos" : "artigo"))
      .replace(/§§/g, " parágrafos ")
      .replace(new RegExp(String.raw`§\s*(\d+)(?:\s*([º°]))?${SUFIXO}`, "g"), (_, n: string, _o: string, letra?: string) => ` parágrafo ${comSufixo(numeroDeRotulo(Number(n)), letra)}`)
      .replace(/§/g, " parágrafo ")
      .replace(/\bcaput\b/gi, "cáput")
      // o romano que sobrou ("…, b, e IV", "XXXIII"): de duas letras para cima, não é palavra nem a letra de uma alínea
      .replace(new RegExp(String.raw`(?<![${L}-])([IVX]{2,}|[IVX]+(?=-[A-Z]))(?:-([A-Z]))?(?![${L}])`, "g"), (tudo, r: string, letra?: string) => {
        const v = romanoParaNumero(r);
        return v ? comSufixo(numeroDeRotulo(v), letra) : tudo;
      })
  );
}

/** Os números: "6 (seis)" → "seis", "1/3" → "um terço", "R$ 100,00" → "cem reais", "13.964" → "treze mil…", "2ª" → "segunda". */
function numeros(t: string): string {
  return (
    t
      // o número com o extenso entre parênteses: fica só o extenso ("de 6 (seis) a 20 (vinte) anos", "1/3 (um terço)", "R$ 1.000,00 (mil reais)")
      .replace(/(?:R\$\s*)?\d+(?:[.,]\d+)*(?:\/\d+)?\s*[º°ª]?(?:\s*(?:km\/h|km|kg|cm|mm|m|g|l|%))?\s*\(([a-zà-ÿ][a-zà-ÿ\s,-]*?)\)/gi, (tudo, extenso: string) =>
        /\b(lei|art|reda|inclu|vide|revog|vet|par[aá]grafo|decreto|emenda)/i.test(extenso) ? tudo : extenso.trim(),
      )
      // as datas "1º/1/1996" e "5.9.2019"
      .replace(/(?<![\d.])(\d{1,2})\.(\d{1,2})\.(\d{4})(?![\d.])/g, (tudo, d: string, m: string, a: string) =>
        Number(m) >= 1 && Number(m) <= 12 && Number(d) >= 1 && Number(d) <= 31 ? `${Number(d) === 1 ? "primeiro" : d} de ${MESES[Number(m) - 1]} de ${a}` : tudo,
      )
      .replace(/(?<![\d/])(\d{1,2})\s*[º°]?\/(\d{1,2})\/(\d{4}|\d{2})(?![\d/])/g, (tudo, d: string, m: string, a: string) =>
        Number(m) >= 1 && Number(m) <= 12 ? `${Number(d) === 1 ? "primeiro" : d} de ${MESES[Number(m) - 1]} de ${a}` : tudo,
      )
      // a letra depois do número de um artigo numa lista ("arts. 40 e 92-A", "§§ 4º-A e 4º-B")
      .replace(/(\d+\s*[º°]?)-([A-Z])(?![A-Za-zÀ-ÿ])/g, (_, n: string, letra: string) => `${n} ${nomeDaLetra(letra)}`)
      .replace(/R\$\s*(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{2}))?/g, (_, reais: string, centavos?: string) => {
        const r = num(reais);
        const c = centavos ? Number(centavos) : 0;
        // "cinco milhões de reais", "um real", "dez reais"
        const parteReais = `${porExtenso(r)} ${r === 1 ? "real" : r >= 1_000_000 && r % 1_000_000 === 0 ? "de reais" : "reais"}`;
        return c ? `${parteReais} e ${porExtenso(c)} ${c === 1 ? "centavo" : "centavos"}` : parteReais;
      })
      .replace(/\b[Nn]\s*\.?\s*[º°]\s*s\b\.?\s*/g, "números ")
      .replace(/\b[Nn]\s*\.?\s*[º°]\s*\.?\s*/g, "número ")
      .replace(/\b(Lei|Leis|Decreto|Decreto-Lei|Lei Complementar|Emenda Constitucional|Medida Provisória|Resolução|Portaria)\s+no\s+(?=\d)/g, "$1 número ")
      // fração ("1/3", "2/3"): numerador menor que o denominador, até 12; "64/90" e "132/2023" são número e ano
      .replace(/(?<![\d/.,])(\d{1,2})\/(\d{1,2})(?![\d/])/g, (tudo, a: string, b: string) => {
        const n = Number(a);
        const d = Number(b);
        return n >= 1 && n < d && d <= 12 ? fracaoPorExtenso(n, d) : tudo;
      })
      .replace(/(\d{1,3}(?:\.\d{3})+|\d+)\/(\d{2}|\d{4})(?![\d/])/g, "$1, de $2")
      .replace(/(\d+(?:,\d+)?)\s*%/g, "$1 por cento")
      .replace(/(\d+)\s*[º°]/g, (_, n: string) => (Number(n) <= 999 ? ordinalPorExtenso(Number(n)) : porExtenso(Number(n))))
      .replace(/(\d+)\s*ª/g, (_, n: string) => (Number(n) <= 999 ? ordinalPorExtenso(Number(n), "f") : porExtenso(Number(n), "f")))
      .replace(/(\d+),(\d+)/g, (_, a: string, b: string) => `${porExtenso(Number(a))} vírgula ${b.startsWith("0") ? b.split("").map((x) => porExtenso(Number(x))).join(" ") : porExtenso(Number(b))}`)
      .replace(/\d{1,3}(?:\.\d{3})+(?!\d)/g, (n) => porExtenso(num(n)))
      .replace(/\d+/g, (n) => (n.length <= 12 ? porExtenso(Number(n)) : n.split("").join(" ")))
  );
}

/** Sinais que a voz leria ou que atrapalham a entonação. */
function sinais(t: string): string {
  return t
    .replace(/\bc\/c\b/gi, "combinado com")
    .replace(/\bkm\/h\b/g, "quilômetros por hora")
    // "SDH/PR", "SVS/MS", "AR 512/DF": as duas siglas, uma depois da outra; "CF/88" é a de 88; "S/A" é a sociedade anônima
    .replace(/\bS\/A\b/g, "S.A.")
    .replace(/\b([A-Z][A-Za-z]{1,})\/(\d{2,4})\b/g, "$1 de $2")
    .replace(/([\wÀ-ÿ])\s*\/\s*([A-Z]{2,})\b/g, "$1 $2")
    // "vendedor/construtor", "abril/maio", "PIS / PASEP": uma pausa no lugar da barra
    .replace(/\s*\/\s*/g, ", ")
    .replace(/R\$/g, "reais")
    .replace(/[<>]/g, " ")
    .replace(/\be\/ou\b/gi, "e ou")
    .replace(/\betc\./gi, "etcétera")
    .replace(/\(\s*VETAD([OA]S?)\s*\)|\bVETAD([OA]S?)\b/gi, (_, a?: string, b?: string) => ` vetad${(a ?? b ?? "o").toLowerCase()} `)
    .replace(/\.{3,}|…/g, (p, pos: number, s: string) => (/[A-Za-zÀ-ÿ]/.test(s.slice(pos + p.length)) ? "… " : " "))
    .replace(/[*_]{2,}|[*]/g, " ")
    .replace(/["“”‘’«»[\]]/g, "")
    .replace(/\s+[-–—]+\s+|\s+[–—]|[–—]\s+/g, ", ")
    .replace(/[()]/g, ", ");
}

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

const limpar = (t: string) =>
  t
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    // a vírgula que sobrou dos parênteses ("(vetado);") cede ao sinal mais forte que vem logo depois
    .replace(/,\s*([.;:!?])/g, "$1")
    .replace(/([,;:])(?:\s*[,;:])+/g, "$1")
    .replace(/,\s*\./g, ".")
    .replace(/\.\s*,/g, ".")
    .replace(/^[\s,.;:]+/, "")
    .trim();

/**
 * Um pedaço do texto da lei como a voz deve dizer. `inicio`: o pedaço é o começo do bloco (o rótulo — "Art. 121.",
 * "§ 2º", "IV -", "a)" — é lido por extenso, com uma pausa depois). Sem nada para dizer (só pontos, asteriscos), "".
 */
export function paraFala(trecho: string, opcoes: { inicio?: boolean; tipo?: TipoBloco } = {}): string {
  let t = ordinal(trecho.replace(/ /g, " ")).trim();
  t = t.replace(/[A-Za-zÀ-ÿ]+/g, (p) => {
    const certo = SEM_ACENTO[p.toLowerCase()];
    if (!certo) return p;
    return p[0] === p[0]!.toUpperCase() ? certo[0]!.toUpperCase() + certo.slice(1) : certo;
  });
  if (opcoes.inicio) t = rotuloDoComeco(t, opcoes.tipo);
  t = semCaixaAlta(t);
  t = limpar(sinais(numeros(referencias(t))));
  if (!/[A-Za-zÀ-ÿ0-9]/.test(t)) return "";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// abreviaturas que terminam em ponto sem fim de frase ("art. 5º", "inc. II", "n. 10")
const ABREVIATURAS = new Set(["art", "arts", "inc", "incs", "al", "n", "nº", "sr", "sra", "srs", "dr", "dra", "drs", "p", "pp", "fls", "ex", "obs", "cf", "min", "rel", "proc", "dec", "res"]);
const MINIMO = 40;

/**
 * Onde partir o texto para a voz: no fim das frases (ponto, ponto e vírgula, dois-pontos) e, numa frase longa, na vírgula
 * mais perto do limite. Pedaços curtos (o rótulo "Art. 121." sozinho) se juntam ao seguinte. Devolve os intervalos
 * [ini, fim) no texto, sem os espaços das pontas.
 */
export function partirFala(texto: string, maximo = 180): { ini: number; fim: number }[] {
  const cortes: number[] = [0];
  for (let k = 1; k < texto.length; k++) {
    const c = texto[k - 1]!;
    if (!/[.;:!?]/.test(c) || !/\s/.test(texto[k]!)) continue;
    if (c === ".") {
      const palavra = texto.slice(0, k - 1).match(/([\wÀ-ÿº°]+)$/)?.[1] ?? "";
      if (ABREVIATURAS.has(palavra.toLowerCase())) continue;
      // uma inicial ("J. Silva") ou a letra do rótulo ("§ 2º-B. A pena") não termina a frase
      if (/^[A-Z]$/.test(palavra)) continue;
      const seguinte = texto.slice(k).trimStart()[0] ?? "";
      if (!/[A-ZÀ-Ý0-9§"“(]/.test(seguinte)) continue;
    }
    cortes.push(k);
  }
  cortes.push(texto.length);
  let pecas: { ini: number; fim: number }[] = [];
  for (let k = 0; k + 1 < cortes.length; k++) pecas.push({ ini: cortes[k]!, fim: cortes[k + 1]! });
  // os curtos vão junto com o seguinte, enquanto couber
  const juntas: { ini: number; fim: number }[] = [];
  for (const p of pecas) {
    const ultima = juntas.at(-1);
    if (ultima && ultima.fim - ultima.ini < MINIMO && p.fim - ultima.ini <= maximo) ultima.fim = p.fim;
    else juntas.push({ ...p });
  }
  // as longas são partidas na vírgula (ou no travessão, no "e", no "ou") mais perto do limite; sem nenhuma, no espaço
  pecas = [];
  for (const p of juntas) {
    let ini = p.ini;
    while (p.fim - ini > maximo) {
      const trecho = texto.slice(ini, ini + maximo);
      let corte = -1;
      for (const re of [/[,;]\s/g, /\s[–—-]\s/g, /\s(?:e|ou)\s/g, /\s/g]) {
        let m: RegExpExecArray | null;
        let melhor = -1;
        re.lastIndex = 0;
        while ((m = re.exec(trecho))) {
          // não parte uma referência ("art. 157, I e II", "§ 2º, b", "arts. 148, 149"): o que vem depois é a continuação dela
          const depois = trecho.slice(m.index + m[0].length);
          if (m.index >= MINIMO && !/^(?:[IVXLC]+(?:-[A-Z])?(?![A-Za-zÀ-ÿ])|["“'‘]?[a-z]["”'’]?(?![A-Za-zÀ-ÿ])|\d|§|arts?\.)/.test(depois)) melhor = m.index + (m[0].startsWith(",") || m[0].startsWith(";") ? 1 : 0);
        }
        if (melhor > 0) {
          corte = melhor;
          break;
        }
      }
      if (corte <= 0) corte = maximo;
      pecas.push({ ini, fim: ini + corte });
      ini += corte;
    }
    pecas.push({ ini, fim: p.fim });
  }
  return pecas
    .map((p) => {
      let { ini, fim } = p;
      while (ini < fim && /\s/.test(texto[ini]!)) ini++;
      while (fim > ini && /\s/.test(texto[fim - 1]!)) fim--;
      return { ini, fim };
    })
    .filter((p) => p.fim > p.ini);
}

/** O bloco em pedaços para falar: os intervalos de partirFala, cada um por extenso; o que não tem o que dizer sai. */
export function pecasDoTexto(texto: string, tipo?: TipoBloco, maximo = 180): Peca[] {
  const pecas: Peca[] = [];
  for (const [k, p] of partirFala(texto, maximo).entries()) {
    const falar = paraFala(texto.slice(p.ini, p.fim), { inicio: k === 0, tipo });
    // por extenso, os números e as datas alongam o pedaço: o que ficou longo demais é partido de novo, em pedaços menores
    if (falar.length > maximo * 1.45 && p.fim - p.ini > 2 * MINIMO) {
      const menores = partirFala(texto.slice(p.ini, p.fim), Math.max(MINIMO * 2, Math.floor((p.fim - p.ini) * 0.55)));
      if (menores.length > 1) {
        for (const [j, q] of menores.entries())
          pecas.push({ ini: p.ini + q.ini, fim: p.ini + q.fim, falar: paraFala(texto.slice(p.ini + q.ini, p.ini + q.fim), { inicio: k === 0 && j === 0, tipo }) });
        continue;
      }
    }
    pecas.push({ ...p, falar });
  }
  return pecas.filter((p) => p.falar);
}
