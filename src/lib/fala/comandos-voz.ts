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
  | { tipo: "procurarDeNovo"; passo: 1 | -1 }
  /** a velocidade dita: um valor ("velocidade 1,5"), a máxima ou a mínima, ou um passo grande ("muito mais rápido") */
  | { tipo: "velocidade"; valor?: number; extremo?: "max" | "min"; passo?: number }
  /** o volume dito, de 0 a 1 ("volume 50%", "volume metade"), o máximo ou o mínimo */
  | { tipo: "volume"; valor?: number; extremo?: "max" | "min" }
  /** o tom da voz: mais agudo (1), mais grave (-1) ou o normal (sem passo) */
  | { tipo: "tom"; passo?: 1 | -1 }
  /** perguntas: a velocidade, o volume, quando a leitura para, qual é a lei */
  | { tipo: "info"; sobre: "velocidade" | "volume" | "prazo" | "lei" }
  /** os grifos do texto: o primeiro, o último, o próximo ou o anterior; `cor`: a cor ou a legenda dita ("amarelo", "teses") */
  | { tipo: "grifo"; qual: Ordem; cor?: string; de?: "meus" | "prontos" }
  /** grifa o trecho que está sendo lido (ou o dispositivo, ou o artigo inteiro), na cor dita ou na do marcador */
  | { tipo: "grifar"; alcance: Alcance; cor?: string }
  /** apaga os grifos do trecho que está sendo lido (ou do dispositivo, ou do artigo) */
  | { tipo: "desgrifar"; alcance: Alcance }
  /** a estrela dos artigos importantes: marcar, tirar ou ir ao próximo marcado */
  | { tipo: "importante"; acao: "marcar" | "desmarcar" | Ordem }
  /** os artigos em que a pessoa errou (as bolinhas do leitor) */
  | { tipo: "erro"; qual: Ordem }
  /** dentro do artigo: o parágrafo, o inciso ou a alínea seguinte/anterior (`passo`) ou o de número `n` */
  | { tipo: "dispositivo"; nivel: "paragrafo" | "inciso" | "alinea"; passo?: 1 | -1; n?: string }
  /** vários de uma vez: "pula três artigos", "volta dois trechos" */
  | { tipo: "pularVarios"; n: number; artigo: boolean; passo: 1 | -1 }
  /** parar a leitura daqui a tantos minutos (null: sem prazo) */
  | { tipo: "pararEm"; minutos: number | null }
  /** ao terminar o artigo: seguir, repetir o mesmo ou pausar */
  | { tipo: "aoFimDoArtigo"; modo: "seguir" | "repetir" | "parar" }
  /** o que mais ler: os títulos, o nome do crime (a rubrica) ou as anotações */
  | { tipo: "lerTambem"; opcao: "titulos" | "rubricas" | "notas"; ligar: boolean }
  /** a pausa entre um artigo e outro, em ms */
  | { tipo: "pausaEntre"; ms: number }
  /** a tela acompanha a leitura (rola junto) */
  | { tipo: "acompanhar"; ligar: boolean }
  | { tipo: "voltarAoTrecho" }
  | { tipo: "lerDaTela" }
  /** desliga os comandos de voz (o microfone) */
  | { tipo: "desligarComandos" }
  /** um comando do leitor (o fundo, a letra, os filtros, o texto revogado…); `ligar`: o estado pedido, nos que ligam e desligam */
  | { tipo: "leitor"; id: IdDoLeitor; ligar?: boolean };

export type Ordem = "primeiro" | "ultimo" | "proximo" | "anterior";
export type Alcance = "trecho" | "dispositivo" | "artigo";
/** os comandos do leitor (src/lib/leis/comandos.ts) que a voz alcança */
export type IdDoLeitor =
  | "telacheia" | "escuro" | "papel" | "branco" | "sepia" | "verde" | "maior" | "menor"
  | "original" | "revogados" | "vide" | "anotacoes" | "informacoes" | "prontos" | "erros"
  | "tudo" | "sogrifos" | "soerros" | "soautomaticos" | "parei";

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
    "velocidade volume encerra encerrar encerre desliga ajuda pula pular pule avanca avancar resultado " +
    "grifo grifos grifa grifar grife desgrifa estrela importante timer fundo"
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
  // os novos (velocidade dita, grifos, ajustes, leitor) primeiro: "parar a leitura em 10 minutos" não é encerrar
  return extras(t, ecoDaLeitura) ?? simples(PADROES.slice(0, 4)) ?? navegacao(t, ecoDaLeitura) ?? simples(PADROES.slice(4));
}

// ---------- os ajustes, os grifos, os dispositivos e o leitor ----------

/** O número dito no começo do texto: "2", "1,5" (o reconhecimento escreve "1 5"), "um e meio", "150 por cento", "metade". */
function numeroDito(resto: string): { n: number; porCento: boolean } | null {
  const t = comAlgarismos(normalizarFala(resto).replace(/\bpor\s+cento\b/g, "porcento")).replace(/^(?:(?:de|em|para|pra|no|na|a|o|pro)\s+)+/, "");
  if (/^(?:a\s+)?metade\b|^pela\s+metade\b/.test(t)) return { n: 0.5, porCento: false };
  if (/^(?:o\s+)?dobr[oa]\b|^em\s+dobro\b/.test(t)) return { n: 2, porCento: false };
  const m = /^(\d+)(?:\s+(?:virgula|ponto)\s+(\d+)|\s+(\d{1,2})\b(?!\s+\d))?(\s+e\s+meio)?(\s+porcento)?/.exec(t);
  if (!m) return null;
  let n = Number(m[1]);
  const dec = m[2] ?? m[3];
  if (dec) n += Number(`0.${dec}`);
  if (m[4]) n += 0.5;
  return { n, porCento: !!m[5] };
}

const VELOCIDADE_DITA = /\b(?:velocidade|veloc)\s+(?:(?:de|em|para|pra|no|na|a)\s+)*(.+)$/;
const MARCA = String.raw`(?:grifo|grifos|grifado|marcacao|marcacoes|destaque|trecho\s+grifado)`;
const GRIFO_ORDEM = new RegExp(String.raw`\b(primeir[oa]|ultim[oa]|proxim[oa]|seguinte|anterior)\s+${MARCA}\b(.*)$`);
const GRIFO_DEPOIS = new RegExp(String.raw`\b${MARCA}\s+(anterior|seguinte)\b(.*)$`);
const GRIFO_VERBO = new RegExp(String.raw`\b(volta|voltar|volte|retrocede|pula|pular|pule|avanca|avancar|avance|vai|ir|va)\s+(?:(?:para|pra|pro|ao|um|uma|o|a)\s+)*${MARCA}\b(.*)$`);
const ORDEM_DITA: Record<string, Ordem> = {
  primeiro: "primeiro",
  primeira: "primeiro",
  ultimo: "ultimo",
  ultima: "ultimo",
  proximo: "proximo",
  proxima: "proximo",
  seguinte: "proximo",
  anterior: "anterior",
};
const LETRA_DA_ALINEA: Record<string, string> = { be: "b", ce: "c", se: "c", de: "d", e: "e", efe: "f", ge: "g", aga: "h", jota: "j" };

/** O que vem depois de "próximo grifo": de quem é (os meus, os prontos) e a cor ou a legenda ("amarelo", "de teses"). */
function qualificarGrifo(resto: string, frase = resto): { cor?: string; de?: "meus" | "prontos" } {
  let r = ` ${resto.trim()} `;
  let de: "meus" | "prontos" | undefined;
  if (/\s(?:meu|meus|que\s+eu\s+fiz)\s/.test(` ${frase} `)) de = "meus";
  if (/\s(?:pronto|prontos|automatico|automaticos|do\s+grifo)\s/.test(r)) de = "prontos";
  r = r.replace(/\s(?:meu|meus|que\s+eu\s+fiz|pronto|prontos|automatico|automaticos|do\s+grifo)(?=\s)/g, " ");
  const cor = r
    .replace(/\b(?:de|da|do|das|dos|em|na|no|cor|com|a|o|os|as|que|e|esta|deste|desta|nesta|neste|lei|artigo|por|favor|aqui|ai)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return { ...(cor ? { cor } : {}), ...(de ? { de } : {}) };
}

/** "o artigo", "o parágrafo" (o dispositivo) ou nada (o trecho), no fim de "grifa …" e "apaga o grifo …". */
const alcanceDe = (resto: string): Alcance => (/\bartigo\b/.test(resto) ? "artigo" : /\b(?:paragrafo|dispositivo|inciso|alinea|caput|bloco)\b/.test(resto) ? "dispositivo" : "trecho");

const MOSTRAR = String.raw`(?:mostra|mostrar|mostre|exibe|exibir|liga|ligar|ligue|ativa|ativar|com|quero\s+ver)`;
const ESCONDER = String.raw`(?:esconde|esconder|esconda|oculta|ocultar|desliga|desligar|desligue|desativa|desativar|tira|tirar|tire|sem)`;
/** os que ligam e desligam: o nome falado de cada um */
const ALTERNAVEIS: [IdDoLeitor, string][] = [
  ["revogados", String.raw`(?:o\s+)?(?:texto\s+)?revogado|(?:os\s+)?revogados|(?:as\s+)?redacoes\s+antigas|(?:as\s+)?sumulas\s+(?:superadas|canceladas)`],
  ["vide", String.raw`(?:os\s+)?vides?`],
  ["anotacoes", String.raw`(?:as\s+)?anotacoes\s+de\s+redacao`],
  ["informacoes", String.raw`(?:as\s+)?informacoes\s+adicionais`],
  ["prontos", String.raw`(?:os\s+)?grifos\s+(?:prontos|automaticos|do\s+grifo)`],
  ["erros", String.raw`(?:os\s+)?(?:pontos\s+(?:de|dos)\s+)?erros|(?:os\s+)?artigos\s+em\s+que\s+(?:eu\s+)?(?:mais\s+)?errei`],
  ["original", String.raw`(?:a\s+)?redacao\s+original`],
];

/** Os comandos que não são de ir e voltar: ajustes da voz, grifos, dispositivos do artigo, prazo e o leitor. */
function extras(t: string, eco: (trecho: string) => boolean): ComandoVoz | null {
  // os números por extenso viram algarismos só onde há número ("parágrafo segundo", "pula três artigos", "em quinze
  // minutos"): nos outros, "primeiro grifo" e "uma estrela" ficam como foram ditos
  const tn = comAlgarismos(t);
  const achar = (re: RegExp, texto = t) => {
    const m = texto.match(re);
    return m && !eco(m[0]) ? m : null;
  };
  // ----- o microfone e a velocidade, o volume e o tom
  if (achar(/\b(?:desliga|desligar|desligue)\s+(?:o\s+)?(?:microfone|os\s+comandos(?:\s+de\s+voz)?|comandos\s+de\s+voz)\b|\bpara(?:r)?\s+de\s+(?:ouvir|escutar)\b/)) return { tipo: "desligarComandos" };
  if (achar(/\b(?:velocidade|veloc)\s+(?:maxima|maximo|total|toda)\b|\b(?:maxima|maior)\s+velocidade\b|\bo\s+mais\s+rapido\s+(?:possivel|que\s+der)\b/)) return { tipo: "velocidade", extremo: "max" };
  if (achar(/\b(?:velocidade|veloc)\s+(?:minima|minimo)\b|\b(?:minima|menor)\s+velocidade\b|\bo\s+mais\s+devagar\s+(?:possivel|que\s+der)\b/)) return { tipo: "velocidade", extremo: "min" };
  if (achar(/\b(?:muito|bem|bastante)\s+mais\s+(?:rapido|depressa|ligeiro)\b/)) return { tipo: "velocidade", passo: 0.5 };
  if (achar(/\b(?:muito|bem|bastante)\s+mais\s+(?:devagar|lento|lenta|lentamente)\b/)) return { tipo: "velocidade", passo: -0.5 };
  if (achar(/\b(?:qual|que)\s+(?:e\s+)?a\s+velocidade\b|\bem\s+que\s+velocidade\b/)) return { tipo: "info", sobre: "velocidade" };
  if (achar(/\b(?:qual|que)\s+(?:e\s+)?o\s+volume\b/)) return { tipo: "info", sobre: "volume" };
  if (achar(/\bquanto\s+(?:tempo\s+)?falta\s+para\s+(?:parar|acabar|terminar)\b|\bquando\s+(?:a\s+leitura\s+)?(?:para|vai\s+parar)\b/)) return { tipo: "info", sobre: "prazo" };
  if (achar(/\b(?:qual|que)\s+(?:e\s+)?(?:a\s+)?lei\s+(?:e\s+)?(?:essa|esta)\b|\bque\s+lei\s+(?:e\s+)?(?:essa|esta)\b|\bqual\s+(?:e\s+)?a\s+lei\b/)) return { tipo: "info", sobre: "lei" };
  const vel = achar(VELOCIDADE_DITA);
  if (vel && !/^normal\b/.test(vel[1]!)) {
    const n = numeroDito(vel[1]!);
    if (n) return { tipo: "velocidade", valor: n.porCento || n.n >= 10 ? n.n / 100 : n.n };
  }
  if (achar(/\bvolume\s+(?:maximo|maxima|total|todo|no\s+maximo)\b|\bvolume\s+(?:mais\s+)?alto\s+possivel\b/)) return { tipo: "volume", extremo: "max" };
  if (achar(/\bvolume\s+(?:minimo|minima|no\s+minimo)\b/)) return { tipo: "volume", extremo: "min" };
  const vol = achar(/\bvolume\s+(?:(?:de|em|para|pra|no|na|a)\s+)*(.+)$/);
  if (vol && !/^(?:mais|maior|menor|normal)\b/.test(vol[1]!)) {
    const n = numeroDito(vol[1]!);
    if (n) return { tipo: "volume", valor: n.porCento || n.n > 10 ? n.n / 100 : n.n > 1 ? n.n / 10 : n.n };
  }
  if (achar(/\b(?:tom|voz)\s+(?:mais\s+)?(?:grave|grosso|grossa)\b|\btom\s+mais\s+baixo\b/)) return { tipo: "tom", passo: -1 };
  if (achar(/\b(?:tom|voz)\s+(?:mais\s+)?(?:agudo|aguda|fino|fina)\b|\btom\s+mais\s+alto\b/)) return { tipo: "tom", passo: 1 };
  if (achar(/\b(?:tom|tom\s+da\s+voz)\s+normal\b/)) return { tipo: "tom" };

  // ----- a estrela dos artigos importantes (antes de "marca", que é grifar)
  if (achar(/\b(?:tira|tirar|tire|remove|remova|apaga|apagar|desmarca|desmarcar)\s+(?:a\s+)?(?:estrela|(?:como\s+)?importante|favorito)\b/)) return { tipo: "importante", acao: "desmarcar" };
  const imp = achar(/\b(proximo|seguinte|anterior|primeiro|ultimo)\s+(?:artigo\s+)?(?:importante|favorito|com\s+estrela|marcado\s+como\s+importante)\b|\b(proxima|primeira|ultima)\s+estrela\b|\bestrela\s+(anterior)\b/);
  if (imp) {
    return { tipo: "importante", acao: ORDEM_DITA[(imp[1] ?? imp[2] ?? imp[3])!] ?? "proximo" };
  }
  if (achar(/\b(?:marca|marcar|marque|coloca|colocar|poe|bota)\s+(?:(?:esse|este|o)\s+artigo\s+)?(?:como\s+)?(?:importante|favorito)\b|\b(?:da|dar|de|poe|coloca)\s+(?:uma\s+)?estrela\b|\bfavorita(?:r)?\b|^estrela$/))
    return { tipo: "importante", acao: "marcar" };
  // ----- os erros (as bolinhas dos artigos em que a pessoa errou)
  const erro = achar(/\b(proximo|seguinte|anterior|primeiro|ultimo)\s+(?:artigo\s+)?(?:(?:com|de|do|dos)\s+)?erros?\b|\b(proximo|anterior|primeiro|ultimo)\s+artigo\s+(?:em\s+)?que\s+(?:eu\s+)?errei\b/);
  if (erro) return { tipo: "erro", qual: ORDEM_DITA[(erro[1] ?? erro[2])!]! };

  // ----- os grifos: ir até eles, grifar e apagar
  const desgrifo = achar(/^(?:(?:e|ok|agora|entao)\s+)*(?:(?:apaga|apagar|apague|tira|tirar|tire|remove|remover|remova|desfaz|desfazer)\s+(?:o|os|esse|este|esses|estes|a|essa)?\s*(?:grifo|grifos|marcacao|marcacoes|destaque)|desgrifa|desgrifar|desgrife)\b(.*)$/);
  if (desgrifo) return { tipo: "desgrifar", alcance: alcanceDe(desgrifo[1] ?? "") };
  const ordem = achar(GRIFO_ORDEM) ?? achar(GRIFO_DEPOIS);
  if (ordem) return { tipo: "grifo", qual: ORDEM_DITA[ordem[1]!]!, ...qualificarGrifo(ordem[2] ?? "", t) };
  const verbo = achar(GRIFO_VERBO);
  if (verbo) return { tipo: "grifo", qual: /^(?:volta|voltar|volte|retrocede)$/.test(verbo[1]!) ? "anterior" : "proximo", ...qualificarGrifo(verbo[2] ?? "", t) };
  const grifa = achar(/^(?:(?:e|ok|agora|entao|por\s+favor)\s+)*(grifa|grifar|grife|marca|marcar|marque|destaca|destacar|destaque)\b(.*)$/);
  if (grifa) {
    const resto = grifa[2] ?? "";
    const cor = /\b(?:de|em|com|como|na\s+cor|da\s+cor)\s+(.+)$/.exec(resto)?.[1]?.replace(/^(?:o|a|os|as)\s+/, "").trim();
    return { tipo: "grifar", alcance: alcanceDe(resto.replace(/\b(?:de|em|com|como|na\s+cor|da\s+cor)\s+.+$/, "")), ...(cor ? { cor } : {}) };
  }

  // ----- dentro do artigo: o parágrafo, o inciso e a alínea
  const seguinte = achar(/\b(?:proximo|seguinte)\s+(paragrafo|inciso)\b|\b(paragrafo|inciso)\s+seguinte\b|\b(?:proxima|seguinte)\s+(alinea)\b|\b(alinea)\s+seguinte\b|\b(?:pula|pular|pule)\s+(?:o|a|esse|essa|este|esta)\s+(paragrafo|inciso|alinea)\b/);
  if (seguinte) return { tipo: "dispositivo", nivel: seguinte.slice(1).find(Boolean) as "paragrafo", passo: 1 };
  const antes = achar(/\b(paragrafo|inciso|alinea)\s+anterior\b|\b(?:volta|voltar|volte)\s+(?:(?:um|uma|o|a|ao|para\s+o|para\s+a)\s+)+(paragrafo|inciso|alinea)\b/);
  if (antes) return { tipo: "dispositivo", nivel: antes.slice(1).find(Boolean) as "paragrafo", passo: -1 };
  if (!/\b(?:artigo|art|sumula|procura\w*|busca\w*|pesquisa\w*)\b/.test(t)) {
    if (achar(/\bcaput\b/)) return { tipo: "repetirArtigo" };
    const par = achar(/\bparagrafo\s+(unico|\d+)\b/, tn);
    if (par) return { tipo: "dispositivo", nivel: "paragrafo", n: par[1] === "unico" ? "u" : par[1]! };
    const inc = achar(/\binciso\s+(\d+|[ivxlc]+)\b/, tn);
    if (inc) {
      const n = /^\d/.test(inc[1]!) ? inc[1]! : String(romanoParaNumero(inc[1]!.toUpperCase()) ?? "");
      if (n) return { tipo: "dispositivo", nivel: "inciso", n };
    }
    const ali = achar(/\balinea\s+([a-z]+)\b/);
    if (ali && (ali[1]!.length === 1 || LETRA_DA_ALINEA[ali[1]!])) return { tipo: "dispositivo", nivel: "alinea", n: LETRA_DA_ALINEA[ali[1]!] ?? ali[1]! };
  }
  // ----- vários de uma vez
  const varios = achar(/\b(pula|pular|pule|avanca|avancar|avance|vai|volta|voltar|volte|retrocede)\s+(\d+)\s+(artigos|sumulas|enunciados|trechos|dispositivos|frases)\b/, tn);
  if (varios && Number(varios[2]) > 0)
    return { tipo: "pularVarios", n: Math.min(50, Number(varios[2])), artigo: /^(?:artigos|sumulas|enunciados)$/.test(varios[3]!), passo: /^(?:volta|voltar|volte|retrocede)$/.test(varios[1]!) ? -1 : 1 };

  // ----- o prazo da leitura e o que fazer no fim do artigo
  if (achar(/\bnao\s+parar\s+(?:mais|sozinh[oa])\b|\bsem\s+(?:prazo|timer|limite\s+de\s+tempo)\b|\bcancela(?:r)?\s+(?:o\s+)?(?:timer|prazo|temporizador)\b|\btira(?:r)?\s+o\s+(?:timer|prazo|temporizador)\b/))
    return { tipo: "pararEm", minutos: null };
  const prazo =
    achar(/\b(?:para|parar|pare|desliga|desligar|desligue|encerra|encerrar|termina|terminar|pausa|pausar)\s+(?:(?:a\s+leitura|de\s+ler)\s+)?(?:daqui\s+a|em|depois\s+de|dentro\s+de|apos|daqui)\s+(\d+|meia)\s*(minutos?|min|horas?)\b/, tn) ??
    achar(/\b(?:timer|temporizador|cronometro)\s+(?:de\s+)?(\d+|meia)\s*(minutos?|min|horas?)\b/, tn);
  if (prazo) {
    const n = prazo[1] === "meia" ? 0.5 : Number(prazo[1]);
    const minutos = Math.round(/^hora/.test(prazo[2]!) ? n * 60 : n);
    if (minutos > 0) return { tipo: "pararEm", minutos: Math.min(600, minutos) };
  }
  if (achar(/\b(?:repete|repetir|repita)\s+(?:esse|este|o)\s+(?:artigo|enunciado|sumula)\s+(?:sem\s+parar|sempre|em\s+loop|direto|ate\s+eu\s+mandar)\b|\bmodo\s+repetir\b|\brepetir\s+sempre\b/))
    return { tipo: "aoFimDoArtigo", modo: "repetir" };
  if (achar(/\b(?:para|parar|pare|pausa|pausar)\s+(?:no|ao)\s+(?:fim|final)\s+(?:de\s+cada|do|dos|deste|desse)\s+(?:artigos?|enunciados?|sumulas?)\b/)) return { tipo: "aoFimDoArtigo", modo: "parar" };
  if (achar(/\bleitura\s+continua\b|\bnao\s+parar\s+(?:no|ao)\s+fim\b|\bseguir\s+(?:direto|lendo)\b|\bler\s+(?:direto|sem\s+parar)\b|\bparar\s+de\s+repetir\b|\bnao\s+repetir\b/))
    return { tipo: "aoFimDoArtigo", modo: "seguir" };

  // ----- o leitor: os filtros, o fundo, a letra, os que ligam e desligam (antes do que ler: "sem anotações de redação")
  if (achar(/\b(?:so|somente|apenas)\s+(?:os\s+)?grifos\s+(?:automaticos|prontos|do\s+grifo)\b/)) return { tipo: "leitor", id: "soautomaticos" };
  if (achar(/\b(?:so|somente|apenas)\s+(?:os\s+)?(?:meus\s+)?grifos\b|\b(?:so|somente|apenas)\s+(?:o\s+que\s+)?(?:eu\s+)?grifei\b/)) return { tipo: "leitor", id: "sogrifos" };
  if (achar(/\b(?:so|somente|apenas)\s+(?:os\s+)?(?:artigos\s+(?:com|dos|em\s+que\s+(?:eu\s+)?)\s*)?(?:erros|errei)\b/)) return { tipo: "leitor", id: "soerros" };
  if (achar(/\b(?:mostra|mostrar|mostre|ver)\s+(?:o\s+|a\s+)?(?:texto\s+|lei\s+)?(?:tudo|inteir[oa]|complet[oa]|tod[oa])\b|\b(?:tira|tirar|tire)\s+o\s+filtro\b|\bsem\s+filtro\b/))
    return { tipo: "leitor", id: "tudo" };
  for (const [id, nome] of ALTERNAVEIS) {
    if (achar(new RegExp(String.raw`\b${ESCONDER}\s+(?:${nome})\b`))) return { tipo: "leitor", id, ligar: false };
    if (achar(new RegExp(String.raw`\b${MOSTRAR}\s+(?:${nome})\b`))) return { tipo: "leitor", id, ligar: true };
  }
  if (achar(/\b(?:sai|sair|saia)\s+da\s+tela\s+cheia\b/)) return { tipo: "leitor", id: "telacheia", ligar: false };
  if (achar(/\btela\s+cheia\b/)) return { tipo: "leitor", id: "telacheia", ligar: true };
  if (achar(/\b(?:fundo|modo|tema)\s+(?:escuro|noturno|preto|noite)\b|\bmodo\s+noite\b/)) return { tipo: "leitor", id: "escuro" };
  if (achar(/\b(?:fundo|modo|tema)\s+(?:claro|papel|dia)\b/)) return { tipo: "leitor", id: "papel" };
  if (achar(/\bfundo\s+branco\b/)) return { tipo: "leitor", id: "branco" };
  if (achar(/\bfundo\s+sepia\b/)) return { tipo: "leitor", id: "sepia" };
  if (achar(/\bfundo\s+verde\b/)) return { tipo: "leitor", id: "verde" };
  if (achar(/\b(?:letra|fonte|texto)\s+maior\b|\b(?:aumenta|aumentar|aumente)\s+(?:a\s+|o\s+)?(?:letra|fonte|texto)\b/)) return { tipo: "leitor", id: "maior" };
  if (achar(/\b(?:letra|fonte|texto)\s+menor\b|\b(?:diminui|diminuir|diminua|reduz|reduzir|reduza)\s+(?:a\s+|o\s+)?(?:letra|fonte|texto)\b/)) return { tipo: "leitor", id: "menor" };
  if (achar(/\b(?:ler|le|leia|ir|vai|volta|voltar|continua|continuar)\s+(?:para\s+|de\s+|ate\s+|a\s+partir\s+de\s+)?onde\s+(?:eu\s+)?parei\b/)) return { tipo: "leitor", id: "parei" };

  // ----- o que ler, a pausa entre artigos, a tela acompanhando
  for (const [opcao, nome] of [
    ["titulos", String.raw`(?:os\s+)?(?:titulos|capitulos)`],
    ["rubricas", String.raw`(?:as\s+)?(?:rubricas|nomes?\s+dos?\s+crimes?)`],
    ["notas", String.raw`(?:as\s+)?(?:anotacoes|notas)`],
  ] as const) {
    if (achar(new RegExp(String.raw`\b(?:pular|pula|pule|sem|nao\s+ler|nao\s+le)\s+(?:(?:o|a)\s+)?${nome}\b`))) return { tipo: "lerTambem", opcao, ligar: false };
    if (achar(new RegExp(String.raw`\b(?:ler|le|leia|com)\s+(?:tambem\s+)?(?:(?:o|a)\s+)?${nome}\b`))) return { tipo: "lerTambem", opcao, ligar: true };
  }
  if (achar(/\bsem\s+pausa\s+entre\b|\bpausa\s+(?:entre\s+(?:os\s+)?artigos\s+)?nenhuma\b/)) return { tipo: "pausaEntre", ms: 0 };
  const pausa = achar(/\bpausa\s+(?:entre\s+(?:os\s+)?artigos\s+)?(curta|media|longa)\b/);
  if (pausa) return { tipo: "pausaEntre", ms: pausa[1] === "curta" ? 700 : pausa[1] === "media" ? 1500 : 3000 };
  if (achar(/\b(?:parar\s+de|nao)\s+(?:acompanhar|rolar)\b/)) return { tipo: "acompanhar", ligar: false };
  if (achar(/\b(?:acompanhar|acompanha|acompanhe)\s+(?:a\s+)?leitura\b|\brolar\s+junto\b|\bseguir\s+na\s+tela\b/)) return { tipo: "acompanhar", ligar: true };
  if (achar(/\b(?:mostra|mostrar|mostre)\s+(?:o\s+)?(?:trecho|onde\s+(?:esta|estou)\s+lendo)\b|\bvolta(?:r)?\s+(?:para\s+o|ao)\s+trecho\s+lido\b/)) return { tipo: "voltarAoTrecho" };
  if (achar(/\b(?:ler|le|leia)\s+(?:a\s+partir\s+)?daqui\b|\b(?:ler|le|leia)\s+(?:o\s+que\s+esta\s+)?(?:na|da)\s+tela\b/)) return { tipo: "lerDaTela" };
  return null;
}

/** O que dizer em "ajuda": os comandos, em poucas palavras. */
export const AJUDA_FALADA =
  "Você pode dizer: pausa; continua; próximo; volta; repete; próximo artigo; artigo anterior; pula três artigos; repete o artigo; artigo cento e vinte e um; próximo parágrafo; inciso quarto; ir para o capítulo dois do título dois; último artigo do título dois; próximo capítulo; ir para o recurso em sentido estrito; procura motivo torpe; próximo resultado; primeiro grifo; próximo grifo amarelo; grifa este trecho; apaga o grifo; marca como importante; próximo erro; velocidade máxima; velocidade dois; mais rápido; mais devagar; volume cinquenta por cento; voz mais grave; parar daqui a vinte minutos; repete este artigo sem parar; pular os títulos; fundo escuro; letra maior; só os meus grifos; mostrar tudo; onde estou; e encerrar.";

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
  ["“pula três artigos” / “volta dois trechos”", "vários de uma vez"],
  ["“próximo parágrafo” / “inciso anterior”", "dentro do artigo; também “próxima alínea”, “parágrafo 2”, “inciso quarto”, “alínea b”, “volta ao caput”"],
  ["“primeiro grifo” / “próximo grifo”", "vai aos grifos à mostra; também “grifo anterior”, “último grifo”, “próximo grifo amarelo”, “próximo grifo de teses”, “meu próximo grifo”"],
  ["“grifa este trecho”", "grifa o que está sendo lido, na cor do marcador; também “grifa de amarelo”, “grifa como tese”, “grifa o artigo inteiro”"],
  ["“apaga o grifo”", "apaga os seus grifos do trecho (também “… do artigo”)"],
  ["“marca como importante” / “tira a estrela”", "a estrela do artigo; “próximo artigo importante” vai ao seguinte"],
  ["“próximo erro”", "o artigo seguinte em que você errou (com a marca dos erros ligada)"],
  ["“mais rápido” / “mais devagar”", "muda a velocidade; “velocidade normal” volta ao padrão"],
  ["“velocidade máxima” / “velocidade 2”", "a velocidade dita: também “velocidade 1,5”, “velocidade mínima”, “muito mais rápido”"],
  ["“mais alto” / “mais baixo”", "o volume da voz (também “volume máximo”, “volume 50%”)"],
  ["“voz mais grave” / “voz mais aguda”", "o tom da voz (“tom normal” volta)"],
  ["“parar daqui a 20 minutos”", "a leitura para sozinha (também “em meia hora”, “timer de 15 minutos”, “cancela o timer”)"],
  ["“repete este artigo sem parar”", "o artigo de novo e de novo; “parar no fim de cada artigo” pausa; “leitura contínua” segue"],
  ["“pular os títulos” / “ler os títulos”", "também o nome do crime (“sem o nome do crime”) e as anotações"],
  ["“sem pausa entre os artigos”", "também “pausa curta”, “pausa média”, “pausa longa”"],
  ["“fundo escuro” / “letra maior”", "o leitor: também “fundo claro”, “tela cheia”, “diminui a letra”"],
  ["“só os meus grifos” / “mostrar tudo”", "os filtros do texto: também “só os grifos automáticos”, “somente os erros”"],
  ["“mostrar o texto revogado”", "também “esconder os revogados”, “sem os vides”, “mostrar os grifos prontos”"],
  ["“ler de onde parei”", "vai até onde você parou e lê dali; “ler daqui” lê do alto da tela"],
  ["“qual é a velocidade”", "também “qual é o volume”, “quanto falta para parar”, “que lei é essa”"],
  ["“onde estou”", "diz o artigo e a divisão que estão sendo lidos"],
  ["“desliga o microfone”", "para de ouvir comandos"],
  ["“encerrar”", "termina a leitura em voz alta"],
];
