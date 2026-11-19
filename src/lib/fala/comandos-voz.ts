// Comandos falados durante a leitura em voz alta ("pausa", "continua", "próximo artigo", "ir para o artigo 121", "artigo
// 500", "último artigo do título 2", "ir para o RESE", "procura motivo torpe"). O reconhecimento de fala do navegador também
// ouve a própria leitura: um comando só vale se as palavras dele não estão no que a voz acabou de dizer (as `recentes`).
// Funções puras; quem ouve é src/lib/fala/escuta.ts, e quem acha as divisões e os nomes é src/lib/fala/navegar.ts.
import { aliasesDasLeis } from "@/lib/leis/busca";
import { numeroDePalavras, romanoParaNumero } from "./extenso";
import type { NivelDivisao, PassoCaminho } from "./navegar";

type Simples =
  | "pausar"
  | "continuar"
  | "encerrar"
  | "proximo"
  | "anterior"
  | "repetir"
  | "proximoArtigo"
  | "artigoAnterior"
  | "repetirArtigo"
  | "maisRapido"
  | "maisDevagar"
  | "velocidadeNormal"
  | "maisAlto"
  | "maisBaixo"
  | "ondeEstou"
  | "ajuda";
/** Onde começar a ler na divisão: o cabeçalho, o primeiro artigo ou o último. */
export type OndeNaDivisao = "inicio" | "primeiroArtigo" | "ultimoArtigo";

export type ComandoVoz =
  | { tipo: Simples }
  /** `lei`: outra lei do leitor citada na frase ("… do CPP") */
  | { tipo: "irPara"; alvo: string; sumula: boolean; lei?: string }
  /** caminho vazio: a lei inteira ("último artigo da lei", "início da lei") */
  | { tipo: "divisao"; caminho: PassoCaminho[]; onde: OndeNaDivisao; lei?: string }
  | { tipo: "divisaoVizinha"; nivel: NivelDivisao; passo: 1 | -1 }
  /** o nome de uma divisão ou de um crime ("recurso em sentido estrito", "homicídio", "RESE") */
  | { tipo: "nome"; nome: string; lei?: string }
  | { tipo: "lei"; lei: string }
  /** `artigo`: só dentro do artigo ("… no artigo 121") */
  | { tipo: "procurar"; texto: string; artigo?: string; lei?: string }
  | { tipo: "procurarDeNovo"; passo: 1 | -1 };

/** minúsculas, sem acento e sem pontuação: "Próximo artigo!" → "proximo artigo"; "11.343" → "11343" */
export function normalizarFala(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/(\d)\.(?=\d{3}(?!\d))/g, "$1")
    .replace(/[^a-z0-9º°ª§\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * As palavras de um texto falado, normalizadas, para saber o que a voz acabou de dizer; os números entram também em
 * algarismos ("cento e vinte e um" → também "121"), porque o reconhecimento escreve o que ouve de um jeito ou de outro.
 */
export const palavrasDe = (s: string) => {
  const t = normalizarFala(s);
  return [...new Set([...t.split(" "), ...comAlgarismos(t).split(" ")])].filter(Boolean);
};

// palavras que não identificam um comando (aparecem em qualquer frase): não contam na comparação com o que a voz disse
const VAZIAS = new Set(["o", "a", "os", "as", "de", "do", "da", "para", "pra", "pro", "ao", "e", "um", "uma", "esse", "este", "todo", "no", "na", "mais", "eu"]);

const PADROES: [Simples, RegExp][] = [
  ["encerrar", /\b(encerra|encerrar|encerre|sair|sai|saia|fechar|fecha|feche|desliga|desligar|desligue|termina|terminar|termine|chega)\b|\b(para|parar|pare)\s+(a\s+)?leitura\b/],
  ["ondeEstou", /\bonde\s+(estou|esta|estamos|paramos|parei|eu\s+estou)\b(?!\s+escrito)|\b(qual|que)\s+(e\s+)?(o\s+|esse\s+|este\s+)?artigo(\s+e\s+esse|\s+e\s+este)?\s*$/],
  ["ajuda", /\b(ajuda|socorro|comandos)\b|\bo\s+que\s+(eu\s+)?posso\s+(falar|dizer)\b/],
  ["repetirArtigo", /\b(repete|repetir|repita|ler\s+de\s+novo|le\s+de\s+novo|leia\s+de\s+novo)\s+(o\s+|esse\s+|este\s+|todo\s+o\s+)?artigo\b|\b(do|desde\s+o)\s+(inicio|comeco)\s+do\s+artigo\b|\b(volta|voltar|volte)\s+(para\s+|pro\s+|ao\s+)?(o\s+)?(inicio|comeco)\s+do\s+artigo\b/],
  // daqui em diante, depois dos comandos de navegação (navegacao)
  ["proximoArtigo", /\b(proximo|seguinte)\s+artigo\b|\bartigo\s+(seguinte|proximo)\b|\b(pula|pular|pule|avanca|avancar|avance)\s+(o\s+|esse\s+|este\s+)?artigo\b/],
  ["artigoAnterior", /\bartigo\s+anterior\b|\b(volta|voltar|volte)\s+(um\s+|o\s+|ao\s+)artigo\b/],
  ["maisRapido", /\bmais\s+(rapido|depressa|ligeiro|veloz)\b|\b(acelera|acelerar|acelere)\b|\b(aumenta|aumentar|aumente)\s+(a\s+)?velocidade\b/],
  ["maisDevagar", /\bmais\s+(devagar|lento|lenta|lentamente|calmo|devagarinho)\b|\b(diminui|diminuir|diminua|reduz|reduzir|reduza)\s+(a\s+)?velocidade\b|\b(desacelera|desacelerar|desacelere)\b/],
  ["velocidadeNormal", /\bvelocidade\s+normal\b/],
  ["maisAlto", /\b(?:fala\s+)?mais\s+alto\b|\b(?:aumenta|aumentar|aumente|sobe|subir|suba)\s+(?:o\s+)?(?:volume|som)\b|\bvolume\s+(?:mais\s+alto|maior|maximo|normal)\b/],
  ["maisBaixo", /\b(?:fala\s+)?mais\s+baixo\b|\b(?:diminui|diminuir|diminua|abaixa|abaixar|abaixe|baixa|baixar|baixe)\s+(?:o\s+)?(?:volume|som)\b|\bvolume\s+(?:mais\s+baixo|menor)\b/],
  ["pausar", /\b(pausa|pausar|pause|pare|parar|espera|esperar|espere|aguarda|aguardar|aguarde|silencio|stop|segura|segure)\b|\bpara\s+(de\s+ler|ai|um\s+pouco)\b|^para$/],
  ["continuar", /\b(continua|continuar|continue|segue|seguir|siga|prossegue|prosseguir|prossiga|retoma|retomar|retome|play|comeca|comecar|comece|le|ler|leia)\b|\b(volta|voltar|volte)\s+a\s+ler\b|\bpode\s+(ler|continuar|seguir)\b/],
  ["repetir", /\b(repete|repetir|repita|de\s+novo|outra\s+vez|novamente|repeat)\b/],
  ["proximo", /\b(proximo|proxima|avanca|avancar|avance|pula|pular|pule|adiante|seguinte|frente)\b/],
  ["anterior", /\b(anterior|volta|voltar|volte|atras|retrocede|retroceder|retroceda)\b/],
];

const VERBOS_IR = "ir|vai|va|vamos|pula|pular|pule|abre|abrir|abra|leia|ler|le|mostra|mostrar|busca|buscar|procura|procurar|volta|voltar|volte|comeca|comecar|comece";
const CONECTORES = String.raw`(?:(?:para|pra|pro|ao|aos|a|as|o|os|no|na|ate|do|da|pelo|pela|em|direto|diretamente|logo)\s+)*`;
const IR_PARA = new RegExp(String.raw`\b(${VERBOS_IR})\s+${CONECTORES}(artigo|art|sumula)\s+(.+)$`);
// "artigo 500" sozinho na frase (no máximo um "e", "ok" ou "agora" antes)
const SO_ARTIGO = /^(?:(?:e|ok|agora|entao|ta|bom|certo|o|a|vamos)\s+)*(artigo|art|sumula)\s+(.+)$/;
const NIVEL = "(parte|livro|titulo|capitulo|secao|sessao|subsecao)";
const DIV_VERBO = new RegExp(String.raw`\b(?:${VERBOS_IR})\s+${CONECTORES}((?:${NIVEL.slice(1, -1)})\b.*)$`);
const EXTREMO = /\b(ultimo|primeiro)\s+artigo\b\s*(.*)$/;
const PONTA = /\b(inicio|comeco|fim|final)\s+(?:d[oa]s?|dest[ea]|dess[ea])\s+(.+)$/;
const DIV_SEGUINTE = new RegExp(
  String.raw`\b(?:proxim[oa]|seguinte)\s+${NIVEL}\b|\b${NIVEL}\s+(?:seguinte|proxim[oa])\b|\b(?:pula|pular|pule|avanca|avancar|avance)\s+(?:(?:o|a|esse|essa|este|esta|um|uma)\s+)?${NIVEL}\b`,
);
const DIV_ANTERIOR = new RegExp(
  String.raw`\b${NIVEL}\s+anterior\b|\banterior\s+${NIVEL}\b|\b(?:volta|voltar|volte|retrocede|retroceder|retroceda)\s+(?:(?:um|uma|o|a|ao)\s+)?${NIVEL}\b`,
);
const DE_NOVO: [1 | -1, RegExp][] = [
  [-1, /\b(?:resultado|ocorrencia|achado)\s+anterior\b|\banterior\s+(?:resultado|ocorrencia)\b/],
  [
    1,
    /\b(?:proxim[oa]|outr[oa]|seguinte)\s+(?:resultado|ocorrencia|achado)\b|\b(?:resultado|ocorrencia)\s+(?:seguinte|proxim[oa])\b|\b(?:procura|procure|busca|busque|pesquisa|acha|ache)\s+(?:de\s+novo|outra\s+vez|novamente|mais|(?:o\s+)?(?:proximo|outro|seguinte))\b|\bcontinu[ae]\s+(?:procurando|buscando|pesquisando)\b/,
  ],
];
const VERBOS_PROCURA = "procura|procurar|procure|busca|buscar|busque|pesquisa|pesquisar|pesquise|acha|achar|ache|encontra|encontrar|encontre|localiza|localizar|localize";
const PROCURA = new RegExp(
  String.raw`\b(?:${VERBOS_PROCURA})\s+(?:(?:o|a|os|as|por|pelo|pela|pelos|pelas|ai|aqui|ali|la|na\s+lei|no\s+texto|no\s+codigo|texto|palavra|palavras|termo|expressao|trecho|frase|onde\s+(?:fala|diz|aparece|tem|esta|trata)(?:\s+(?:de|em|sobre|que|da|do))?)\s+)*(.+)$`,
);
const ONDE_FALA = /\bonde\s+(?:(?:a\s+lei|o\s+codigo|ela|ele)\s+)?(?:fala|diz|aparece|tem|trata|esta\s+escrito|se\s+fala)\s+(?:(?:de|em|sobre|que|da|do|das|dos)\s+)?(.+)$/;
const NOME = /\b(?:ir|vai|va|vamos|abre|abrir|abra|mostra|mostrar|volta|voltar|volte)\s+(?:(?:direto|diretamente|logo)\s+)?(?:(?:para|pra|pro|ao|aos|a|as|o|os|no|na|nos|nas|ate|em)\s+)+(.+)$/;
const DO_COMECO = /^(?:(?:d[oa]s?|de|dest[ea]|dess[ea]|nest[ea]|ness[ea]|n[oa]s?|em|ao|a|o|as|os|e)\s+)+/;

/** As palavras de número viram algarismos ("cento e vinte e um" → "121", "segundo" → "2"), o resto fica. */
function comAlgarismos(texto: string): string {
  const p = texto.split(" ");
  const saida: string[] = [];
  for (let k = 0; k < p.length; ) {
    // o trecho mais longo, a partir daqui, que é um número
    let achou = 0;
    let valor = 0;
    for (let j = Math.min(p.length, k + 9); j > k; j--) {
      if (p[j - 1] === "e") continue;
      const v = numeroDePalavras(p.slice(k, j).join(" "));
      if (v !== null) {
        achou = j - k;
        valor = v;
        break;
      }
    }
    if (achou) {
      saida.push(String(valor));
      k += achou;
    } else saida.push(p[k++]!);
  }
  return saida.join(" ");
}

/** O destino de "ir para o artigo …" e o que sobrou da frase depois dele. */
function alvoEResto(resto: string): { alvo: string; resto: string } | null {
  let t = comAlgarismos(normalizarFala(resto).replace(/\bnumero\b/g, " ").replace(/\s+/g, " ").trim());
  // "121 a" e "121 letra a": a letra do artigo ("121-A"), quando não é o começo de outra palavra
  t = t.replace(/^(\d+)\s+(?:letra\s+)?([a-z])(?=\s|$)/, "$1-$2");
  t = t.replace(/\b(inciso|alinea|paragrafo)\s+letra\s+/g, "$1 ");
  if (!/^\d/.test(t)) return null;
  const m = t.match(/^\d+(?:-[a-z])?(?:\s+(?:paragrafo\s+(?:unico|\d+(?:-[a-z])?)|inciso\s+\d+|alinea\s+[a-z]|caput))*/);
  return m ? { alvo: m[0], resto: t.slice(m[0].length).trim() } : null;
}

/**
 * O destino de "ir para o artigo …", no formato da busca do leitor (src/lib/leis/busca.ts, alvoDigitado): "121",
 * "121-a", "121 paragrafo 2 inciso 4", "5 inciso 11 alinea a". Sem número, null. O que vem depois ("… por favor") sai.
 */
export const alvoFalado = (resto: string): string | null => alvoEResto(resto)?.alvo ?? null;

/** A lei do leitor no fim da frase ("… do CPP", "… da lei de drogas", "… da lei 11.343"), e o resto sem ela. */
export function leiNoFim(texto: string): { lei: string; resto: string } | null {
  for (const t of new Set([texto.trim(), comAlgarismos(texto.trim())])) {
    for (const [alias, lei] of aliasesDasLeis()) {
      if (t !== alias && !t.endsWith(` ${alias}`)) continue;
      const resto = t.slice(0, t.length - alias.length).trim().replace(/(?:^|\s+)(?:d[oa]s?|de|n[oa]s?|em)$/, "").trim();
      return { lei, resto };
    }
  }
  return null;
}

/** O artigo da frase, com a lei se ela foi dita; `inteiro`: nada mais pode sobrar na frase. */
function alvoComLei(resto: string, inteiro = false): { alvo: string; lei?: string } | null {
  const comLei = leiNoFim(resto);
  const r = alvoEResto(comLei ? comLei.resto : resto);
  if (!r || (inteiro && !/^(?:por favor)?$/.test(r.resto))) return null;
  return comLei ? { alvo: r.alvo, lei: comLei.lei } : { alvo: r.alvo };
}

const PASSO_DIVISAO = new RegExp(
  String.raw`^${NIVEL}(?:\s+(\d+(?:\s*-?\s*[a-c](?=\s+(?:d[oa]s?|de|n[oa])\b|$))?|unic[oa]|geral|especial|[ivxlc]+)(?![a-z0-9]))?\s*`,
);
/**
 * "capítulo 2 do título 2 do livro 3" → os passos do caminho (o número pode vir por extenso, em ordinal ou em romano; sem
 * número, é a divisão em que se está: "último artigo deste capítulo"). O que sobrar da frase vem em `resto`.
 */
export function caminhoFalado(texto: string): { caminho: PassoCaminho[]; resto: string } | null {
  let t = comAlgarismos(normalizarFala(texto));
  const caminho: PassoCaminho[] = [];
  for (;;) {
    t = t.replace(DO_COMECO, "");
    const m = PASSO_DIVISAO.exec(t);
    if (!m) break;
    const nivel = (m[1] === "sessao" ? "secao" : m[1]) as NivelDivisao;
    const bruto = m[2]?.replace(/\s+/g, "");
    let n: string | null = null;
    if (bruto) {
      const [num, letra] = bruto.match(/^(\d+)-?([a-c])?$/)?.slice(1) ?? [];
      if (num) n = letra ? `${num}-${letra}` : num;
      else if (/^unic[oa]$/.test(bruto)) n = "1";
      else if (bruto === "geral" || bruto === "especial") n = bruto;
      else n = String(romanoParaNumero(bruto.toUpperCase()) ?? bruto);
    }
    caminho.push({ nivel, n });
    t = t.slice(m[0].length);
  }
  return caminho.length ? { caminho, resto: t.trim() } : null;
}

/** "título 2 do CPP", "deste capítulo", "da lei": o caminho e a lei (caminho vazio é a lei inteira); outra coisa, null. */
function destinoDivisao(texto: string): { caminho: PassoCaminho[]; lei?: string } | null {
  let t = normalizarFala(texto).replace(DO_COMECO, "");
  const comLei = t ? leiNoFim(t) : null;
  if (comLei) t = comLei.resto.replace(DO_COMECO, "");
  const lei = comLei ? { lei: comLei.lei } : {};
  if (!t || /^(?:lei|codigo|constituicao|texto|sumulas)(?: inteir[oa])?$/.test(t)) return { caminho: [], ...lei };
  const c = caminhoFalado(t);
  return c && /^(?:por favor)?$/.test(c.resto) ? { caminho: c.caminho, ...lei } : null;
}

/** O texto de "procura …": sem os artigos do começo, com o artigo ("… no artigo 121") e a lei ("… do CP") à parte. */
function busca(texto: string): { texto: string; artigo?: string; lei?: string } | null {
  let t = texto.trim().replace(/\s+por favor$/, "");
  const comLei = leiNoFim(t);
  if (comLei?.resto) t = comLei.resto;
  let artigo: string | undefined;
  const no = t.match(/\s+(?:no|na|do|da|dentro\s+d[oa]|em)\s+(?:artigo|art|sumula)\s+(.+)$/);
  const a = no ? alvoEResto(no[1]!) : null;
  if (no && a && !a.resto) {
    artigo = a.alvo;
    t = t.slice(0, no.index);
  }
  t = t.replace(/^(?:(?:o|a|os|as)\s+)+/, "").trim();
  if (!/[a-z0-9]{2}/.test(t)) return null;
  return { texto: t, ...(artigo ? { artigo } : {}), ...(comLei?.resto ? { lei: comLei.lei } : {}) };
}

const NIVEL_DE = (m: RegExpMatchArray) => {
  const n = m.slice(1).find(Boolean)!;
  return (n === "sessao" ? "secao" : n) as NivelDivisao;
};

/** Os comandos que levam a outro lugar da lei (ou a outra lei); null se a frase não é um deles. */
function navegacao(t: string, eco: (trecho: string) => boolean): ComandoVoz | null {
  // "próximo resultado", "procura de novo"
  for (const [passo, re] of DE_NOVO) {
    const m = t.match(re);
    if (m && !eco(m[0])) return { tipo: "procurarDeNovo", passo };
  }
  // "ir para o artigo 121 do CPP", "leia a súmula 711"
  const ir = t.match(IR_PARA);
  if (ir && !eco(`${ir[1]} ${ir[2]}`)) {
    const a = alvoComLei(ir[3]!);
    if (a) return { tipo: "irPara", alvo: a.alvo, sumula: ir[2] === "sumula" || !!a.lei?.startsWith("sumulas-"), ...(a.lei ? { lei: a.lei } : {}) };
  }
  // "artigo 500": só o número, e nada mais na frase (a voz da leitura diz "Artigo quinhentos" no começo do artigo: o eco
  // fica de fora pelas `recentes`)
  const so = t.match(SO_ARTIGO);
  if (so && !eco(so[0])) {
    const a = alvoComLei(so[2]!, true);
    if (a) return { tipo: "irPara", alvo: a.alvo, sumula: so[1] === "sumula" || !!a.lei?.startsWith("sumulas-"), ...(a.lei ? { lei: a.lei } : {}) };
  }
  // "último artigo do título 2", "primeiro artigo deste capítulo", "último artigo da lei"
  const ext = t.match(EXTREMO);
  if (ext && !eco(ext[0])) {
    const d = destinoDivisao(ext[2]!);
    if (d) return { tipo: "divisao", onde: ext[1] === "ultimo" ? "ultimoArtigo" : "primeiroArtigo", ...d };
  }
  // "fim do capítulo", "início da lei"
  const ponta = t.match(PONTA);
  if (ponta && !eco(ponta[0])) {
    if (ponta[2] === "artigo") return /^(inicio|comeco)$/.test(ponta[1]!) ? { tipo: "repetirArtigo" } : null;
    const d = destinoDivisao(ponta[2]!);
    if (d) return { tipo: "divisao", onde: /^(inicio|comeco)$/.test(ponta[1]!) ? "inicio" : "ultimoArtigo", ...d };
  }
  // "ir direto para o capítulo 2 do título 2 do CPP"; sem número ("pula o capítulo"), vale antes o seguinte e o anterior
  const div = t.match(DIV_VERBO);
  const comNumero = div && !eco(div[0]) ? destinoDivisao(div[1]!) : null;
  if (comNumero?.caminho.some((p) => p.n !== null)) return { tipo: "divisao", onde: "inicio", ...comNumero };
  for (const [passo, re] of [
    [1, DIV_SEGUINTE],
    [-1, DIV_ANTERIOR],
  ] as const) {
    const m = t.match(re);
    if (m && !eco(m[0])) return { tipo: "divisaoVizinha", nivel: NIVEL_DE(m), passo };
  }
  if (comNumero?.caminho.length) return { tipo: "divisao", onde: "inicio", ...comNumero };
  // "procura motivo torpe no artigo 121", "onde fala de legítima defesa"
  for (const re of [PROCURA, ONDE_FALA]) {
    const m = t.match(re);
    if (!m || eco(m[0])) continue;
    const b = busca(m[1]!);
    if (b) return { tipo: "procurar", ...b };
  }
  // "ir para o RESE", "vai para homicídio", "abre a lei de drogas"
  const nome = t.match(NOME);
  if (nome && !eco(nome[0])) {
    const r = nome[1]!.replace(/\s+por favor$/, "");
    if (/^(?:inicio|comeco)(?: da lei)?$/.test(r)) return { tipo: "divisao", caminho: [], onde: "inicio" };
    if (/^(?:fim|final)(?: da lei)?$/.test(r)) return { tipo: "divisao", caminho: [], onde: "ultimoArtigo" };
    // "volta a ler", "vai para frente", "ir para o próximo": são os comandos de sempre
    if (PADROES.slice(4).some(([, re]) => re.test(r))) return null;
    const comLei = leiNoFim(r);
    if (comLei && !comLei.resto) return { tipo: "lei", lei: comLei.lei };
    const n = (comLei ? comLei.resto : r).replace(/^(?:parte|livro|titulo|capitulo|secao|subsecao)\s+(?=d[oa]s?\s)/, "").replace(/^(?:(?:o|a|os|as)\s+)+/, "");
    if (/[a-z].*[a-z].*[a-z]/.test(n)) return { tipo: "nome", nome: n, ...(comLei ? { lei: comLei.lei } : {}) };
  }
  return null;
}

// palavras que quase só aparecem num comando (em qualquer ponto da frase) e as comuns, que só contam no começo dela; e as que
// vêm antes do comando sem dizer nada
const FORTES = new Set(
  (
    "pausa pausar pause pare parar espera espere aguarda silencio stop continua continuar continue prossegue retoma leia proximo proxima anterior " +
    "repete repetir repita sumula procura procurar procure busca buscar busque pesquisa pesquisar encontra encontrar capitulo titulo secao subsecao " +
    "velocidade volume encerra encerrar encerre desliga ajuda pula pular pule avanca avancar resultado"
  ).split(" "),
);
const FRACAS = new Set("para segue siga le ler artigo ir vai va vamos abre abrir abra mostra acha ache onde ultimo primeiro livro parte mais aumenta diminui abaixa fecha sai sair termina chega volta voltar volte inicio comeco fim qual".split(" "));
const ENCHIMENTO = new Set(["ok", "e", "agora", "entao", "ei", "ta", "bom", "olha", "grifo", "por", "favor"]);

/**
 * A fala (ainda parcial) parece o começo de um comando da pessoa, e não a voz da leitura ouvida pelo microfone: há nela
 * uma palavra de comando que a voz não disse há pouco, ou ela começa por uma palavra comum de comando ("vai", "artigo") e
 * não é toda eco. Serve para pausar a leitura logo que a pessoa começa a falar.
 */
export function pareceComando(fala: string, recentes: ReadonlySet<string> = new Set()): boolean {
  const ps = normalizarFala(fala).split(" ").filter(Boolean);
  if (ps.some((p) => FORTES.has(p) && !recentes.has(p))) return true;
  const primeira = ps.find((p) => !ENCHIMENTO.has(p));
  const chaves = ps.filter((p) => !VAZIAS.has(p));
  return !!primeira && (FRACAS.has(primeira) || FORTES.has(primeira)) && chaves.some((p) => !recentes.has(p));
}

/**
 * O comando de uma fala reconhecida, ou null. `recentes`: as palavras que a voz da leitura disse há pouco — o microfone
 * as ouve também, e elas não podem disparar um comando (a lei fala em "anterior", "novamente"…).
 */
export function interpretarComando(fala: string, recentes: ReadonlySet<string> = new Set()): ComandoVoz | null {
  const t = normalizarFala(fala);
  if (!t) return null;
  const ecoDaLeitura = (trecho: string) => {
    const chaves = palavrasDe(trecho).filter((p) => !VAZIAS.has(p));
    return chaves.length > 0 && chaves.every((p) => recentes.has(p));
  };
  const simples = (lista: [Simples, RegExp][]): ComandoVoz | null => {
    for (const [tipo, re] of lista) {
      const m = t.match(re);
      if (m && !ecoDaLeitura(m[0])) return { tipo };
    }
    return null;
  };
  return simples(PADROES.slice(0, 4)) ?? navegacao(t, ecoDaLeitura) ?? simples(PADROES.slice(4));
}

/** O que dizer em "ajuda": os comandos, em poucas palavras. */
export const AJUDA_FALADA =
  "Você pode dizer: pausa; continua; próximo; volta; repete; próximo artigo; artigo anterior; repete o artigo; artigo cento e vinte e um; ir para o capítulo dois do título dois; último artigo do título dois; próximo capítulo; ir para o recurso em sentido estrito; procura motivo torpe; próximo resultado; ir para o artigo trinta e três da lei de drogas; mais rápido; mais devagar; mais alto; mais baixo; onde estou; e encerrar.";

/** A lista dos comandos para mostrar na tela: o que dizer e o que acontece. */
export const COMANDOS_FALADOS: [dizer: string, faz: string][] = [
  ["“pausa” ou “pare”", "pausa a leitura"],
  ["“continua” ou “lê”", "continua de onde parou"],
  ["“próximo” / “volta”", "o dispositivo seguinte ou o anterior"],
  ["“repete”", "lê de novo o trecho atual"],
  ["“próximo artigo” / “artigo anterior”", "pula de artigo"],
  ["“repete o artigo”", "volta ao começo do artigo"],
  ["“artigo 500” ou “ir para o artigo 121”", "vai ao artigo (também “… parágrafo 2º, inciso IV”)"],
  ["“ir para o capítulo 2 do título 2”", "vai à divisão; também “título 2”, “livro 3”, “seção 1”, “parte especial”"],
  ["“último artigo do título 2”", "também “primeiro artigo do capítulo 3”, “último artigo deste capítulo”, “fim da lei”"],
  ["“próximo capítulo” / “título anterior”", "pula de divisão"],
  ["“ir para o RESE”", "vai pelo nome: “recurso em sentido estrito”, “homicídio”, “legítima defesa”, “ANPP”…"],
  ["“procura motivo torpe”", "lê a partir do próximo trecho com as palavras; “… no artigo 121” procura só nele"],
  ["“próximo resultado”", "o trecho seguinte com as mesmas palavras (“resultado anterior” volta)"],
  ["“… do CPP”, “… da lei de drogas”", "no fim de qualquer comando acima, abre a outra lei; “abre o CPP” só troca de lei"],
  ["“mais rápido” / “mais devagar”", "muda a velocidade; “velocidade normal” volta ao padrão"],
  ["“mais alto” / “mais baixo”", "o volume da voz (também “aumenta o volume”, “abaixa o volume”)"],
  ["“onde estou”", "diz o artigo e a divisão que estão sendo lidos"],
  ["“encerrar”", "termina a leitura em voz alta"],
];
