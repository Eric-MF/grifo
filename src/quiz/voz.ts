// Responder falando, no treino de questões: o que a pessoa disse vira a resposta da questão na tela. Nas alternativas,
// a letra ("letra B", "alternativa C", "dê"), a ordem ("a segunda") ou o próprio texto (o nome da peça) escolhe; nas de
// digitar, a fala preenche os campos (a peça e o fundamento, ou o ponto central e o artigo), e "responder" envia. Depois
// da correção, "próxima" segue. Puro: quem usa passa o reconhecedor de peças (previaDaPeca, em verificar.ts).
import { dobrar } from "@/lib/leis/grifos";
import { numeroDePalavras } from "@/lib/fala/extenso";

export type CampoVoz = "peca" | "fundamento" | "tese" | "artigo";

/** O que está na tela: as alternativas (os textos, na ordem), os campos de digitar com o que já têm, ou a correção. */
export type ContextoVoz =
  | { tipo: "alternativas"; textos: string[]; /** as alternativas são nomes de peça: o nome falado escolhe */ pecas?: boolean }
  | { tipo: "peca"; peca: string; fundamento: string }
  | { tipo: "tese"; /** no difícil, também o artigo */ comArtigo: boolean; tese: string; artigo: string }
  | { tipo: "respondida" };

export type AcaoVoz =
  | { tipo: "alternativa"; indice: number }
  /** os campos ditos (os outros ficam como estão); `enviar`: a frase acabou em "responder" */
  | { tipo: "preencher"; campos: Partial<Record<CampoVoz, string>>; enviar: boolean }
  | { tipo: "enviar" }
  /** sem campo: apaga tudo */
  | { tipo: "apagar"; campo?: CampoVoz }
  | { tipo: "proxima" }
  | { tipo: "desligar" };

/** minúsculas, sem acento e sem pontuação, com os espaços simples */
const normal = (s: string) =>
  dobrar(s)
    .replace(/[^a-z0-9º§\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const DESLIGAR = /\b(desliga|desligar|desligue)\s+(o\s+)?(microfone|a\s+voz|a\s+escuta)\b|\b(para|parar|pare)\s+de\s+(ouvir|escutar)\b/;
const PROXIMA = /^(ir\s+para\s+a\s+|vamos\s+para\s+a\s+)?(proxima|proximo|seguinte|continuar|continua|continue|avancar|avanca|avance|segue|seguir|siga|next)(\s+(pergunta|questao))?$/;
const ENVIAR = /^(responder|responde|responda|enviar|envia|envie|confirmar|confirma|confirmo|pronto|terminei|finalizar|corrigir resposta)$/;
const ENVIAR_NO_FIM = /\s+(responder|responde|responda|enviar|envia|envie|confirmar|confirma|confirmo|pronto)$/;
const APAGAR = /^(apagar|apaga|apague|limpar|limpa|limpe|desfazer|recomecar|errei)(\s+(tudo|a\s+peca|peca|o\s+fundamento|fundamento|a\s+tese|tese|o\s+ponto\s+central|o\s+artigo|artigo))?$/;

const SOLTAS = new Set(["ok", "okay", "hum", "hmm", "ah", "ahn", "e", "ta", "entao", "bom", "bem", "sim", "nao", "isso", "aham"]);

// as letras como o reconhecimento as escreve: "b" ou "bê", "c" ou "cê", "d" ou "dê"
const LETRA: Record<string, number> = { a: 0, ah: 0, b: 1, be: 1, c: 2, ce: 2, se: 2, d: 3, de: 3, e: 4 };
const ORDEM: Record<string, number> = { primeira: 0, primeiro: 0, segunda: 1, segundo: 1, terceira: 2, terceiro: 2, quarta: 3, quarto: 3, quinta: 4, quinto: 4 };
const NUMERO: Record<string, number> = { "1": 0, um: 0, uma: 0, "2": 1, dois: 1, duas: 1, "3": 2, tres: 2, "4": 3, quatro: 3, "5": 4, cinco: 4 };
// palavras que não ajudam a achar a alternativa pelo texto
const VAZIAS = new Set(["o", "a", "os", "as", "e", "de", "do", "da", "dos", "das", "em", "no", "na", "um", "uma", "que", "eu", "acho", "letra", "alternativa", "opcao", "resposta", "certa", "correta", "seria", "pelo", "pela", "com", "por", "para"]);

/** A alternativa pela letra ou pela ordem: "letra b", "alternativa cê", "é a dê", "a segunda", "opção 3", ou só "bê". */
function alternativaFalada(t: string, quantas: number): number | null {
  const dentro = (k: number | undefined) => (k !== undefined && k < quantas ? k : null);
  const so = LETRA[t];
  // a palavra sozinha: "b", "bê"; o "e" e o "de" sozinhos também, porque a frase inteira é só isso
  if (so !== undefined) return dentro(so);
  const comPalavra = /(?:^|\s)(?:letra|alternativa|opcao|item|resposta)\s+([a-e]|ah|be|ce|se|de)(?:\s|$)/.exec(t) ?? /(?:^|\s)e\s+(?:a\s+)?(?:letra\s+)?([a-d]|be|ce|de)$/.exec(t);
  if (comPalavra) return dentro(LETRA[comPalavra[1]!]);
  const ordem = /(?:^|\s)(primeira|primeiro|segunda|segundo|terceira|terceiro|quarta|quarto|quinta|quinto)(?:\s+(?:alternativa|opcao))?$/.exec(t);
  if (ordem) return dentro(ORDEM[ordem[1]!]);
  const numero = /(?:^|\s)(?:alternativa|opcao|numero)\s+(1|2|3|4|5|um|uma|dois|duas|tres|quatro|cinco)$/.exec(t);
  if (numero) return dentro(NUMERO[numero[1]!]);
  return null;
}

/** A alternativa pelo texto: as palavras ditas quase todas numa alternativa só (o nome da peça, um trecho da resposta). */
function alternativaPeloTexto(t: string, textos: string[]): number | null {
  const ditas = t.split(" ").filter((p) => p && !VAZIAS.has(p));
  if (!ditas.length || (ditas.length === 1 && ditas[0]!.length < 5)) return null;
  const notas = textos.map((x) => {
    const n = normal(x);
    if (n === t || ` ${t} `.includes(` ${n} `)) return 2;
    const tem = new Set(n.split(" "));
    return ditas.filter((p) => tem.has(p)).length / ditas.length;
  });
  const melhor = Math.max(...notas);
  const k = notas.indexOf(melhor);
  const segunda = Math.max(...notas.filter((_, j) => j !== k), 0);
  return melhor >= 0.75 && melhor - segunda >= 0.25 ? k : null;
}

/** Números por extenso viram algarismos ("quinhentos e noventa e três" → "593"), sem mexer no resto do texto. */
export function numerosEmAlgarismos(texto: string): string {
  const p = texto.split(/\s+/).filter(Boolean);
  const saida: string[] = [];
  for (let k = 0; k < p.length; ) {
    let achou = 0;
    let valor = 0;
    for (let j = Math.min(p.length, k + 9); j > k; j--) {
      const trecho = p.slice(k, j);
      // o "e" não fecha um número, e a pontuação colada no fim fica de fora
      if (trecho[trecho.length - 1] === "e" || !/[a-zà-ú]/i.test(trecho.join(""))) continue;
      const v = numeroDePalavras(trecho.join(" ").replace(/[,.;:]+$/, ""));
      if (v !== null) {
        achou = j - k;
        valor = v;
        break;
      }
    }
    if (achou) {
      const pontuacao = /[,.;:]+$/.exec(p[k + achou - 1]!)?.[0] ?? "";
      saida.push(`${valor}${pontuacao}`);
      k += achou;
    } else saida.push(p[k++]!);
  }
  return saida.join(" ");
}

// onde começa o artigo na frase: "artigo", "art.", "arts.", "§", "súmula" (no texto sem acento, com o mesmo tamanho)
const INICIO_DO_ARTIGO = /(?:^|[\s,;(])(art(?:igo)?s?\b\.?|§|sumula\b|paragrafo\b|inciso\b)/;
// o que liga a peça ao artigo ("apelação com fundamento no artigo…"): sai do fim da peça
const LIGACAO_NO_FIM = /(?:[\s,;:–-]+|\s+(?:com\s+(?:base|fundamento)(?:\s+legal)?(?:\s+(?:no|na|nos|nas|em))?|fundamentad[ao]s?(?:\s+(?:no|na|nos|nas|em))?|basead[ao]s?(?:\s+(?:no|na|nos|nas|em))?|nos\s+termos\s+d[oa]s?|conforme(?:\s+[oa])?|de\s+acordo\s+com(?:\s+[oa])?|segundo\s+[oa]|pelo|pela|no|na|nos|nas|do|da|e|fundamento(?:\s+legal)?(?:\s+e)?))+$/;
// o começo que só anuncia a resposta ("a peça é", "cabe", "é o")
const ANUNCIO = /^(?:(?:a\s+)?(?:peca|tese|resposta|ponto\s+central)(?:\s+cabivel)?\s+(?:e|seria)\s+|cabe\s+(?:a\s+|o\s+)?|seria\s+(?:a\s+|o\s+)?|e\s+(?:a\s+|o\s+)?)/;

/** Corta no artigo: "apelação com fundamento no artigo 593…" → antes "apelação", artigo "artigo 593…". */
export function separarArtigo(texto: string): { antes: string; artigo: string | null } {
  const t = texto.trim();
  const d = dobrar(t);
  // começa por número ("593, III, d, do CPP"): é tudo artigo
  if (/^\d/.test(d)) return { antes: "", artigo: numerosEmAlgarismos(t) };
  const m = INICIO_DO_ARTIGO.exec(d);
  if (!m) return { antes: limparAntes(t), artigo: null };
  const ini = m.index + m[0].length - m[1]!.length;
  return { antes: limparAntes(t.slice(0, ini)), artigo: numerosEmAlgarismos(t.slice(ini).trim()) || null };
}

function limparAntes(s: string): string {
  let t = s.trim();
  for (let k = 0; k < 4; k++) {
    const d = dobrar(t);
    const fim = LIGACAO_NO_FIM.exec(d);
    const ini = ANUNCIO.exec(d);
    if (!fim && !ini) break;
    if (fim) t = t.slice(0, fim.index);
    if (ini) t = t.slice(ini[0].length);
    t = t.trim();
  }
  return t;
}

const CAMPO_FALADO: Record<string, CampoVoz> = {
  peca: "peca",
  "a peca": "peca",
  fundamento: "fundamento",
  "o fundamento": "fundamento",
  tese: "tese",
  "a tese": "tese",
  "o ponto central": "tese",
  artigo: "artigo",
  "o artigo": "artigo",
};

// o pedaço que continua a citação já dita: o reconhecimento às vezes parte a frase numa pausa ("artigo 321" e depois "do
// CPP", "artigo 593" e depois "inciso terceiro, alínea d")
const LEI_FALADA = "codigo|lei|decreto|constituicao|estatuto|cpp|cp|cpm|cf|lep|ctb|eca";
const CONTINUA_A_CITACAO = new RegExp(String.raw`^(?:(?:e|do|da|dos|das|no|na|nos|nas|de|com)\s+)*(?:paragrafo|inciso|alinea|letra|caput|${LEI_FALADA})\b`);
const TEM_LEI = new RegExp(String.raw`\b(?:${LEI_FALADA})\b`);

/**
 * A citação já dita (`atual`, como a correção a escreve: "Art. 321", "Art. 593 — Código de Processo Penal") completada pelo
 * pedaço que a continua ("do CPP", "inciso III"); null se a frase não é um pedaço assim ou se nada muda.
 */
function continuarCitacao(atual: string, fala: string, rec: Required<Reconhecedores>): string | null {
  const t = normal(fala);
  if (!atual.trim() || !CONTINUA_A_CITACAO.test(t)) return null;
  const [base, lei] = atual.split(" — ");
  // a lei de antes continua valendo, se o pedaço não diz outra
  // "letra d", no pedaço que continua a citação, é a alínea
  const pedaco = numerosEmAlgarismos(fala.trim().replace(/\bletra\s+/i, "alínea "));
  const junto = rec.artigo(`${base} ${pedaco}${lei && !TEM_LEI.test(t) ? ` do ${lei}` : ""}`);
  return junto && junto !== atual ? junto : null;
}

/** Uma frase dita (o texto como o reconhecimento escreveu). Ver interpretarResposta. */
/** Quem reconhece a peça e o artigo na frase (pecasFaladas e artigoFalado, em verificar.ts). */
export interface Reconhecedores {
  /** as peças que o texto nomeia, na ordem; a primeira vale */
  peca?: (texto: string) => string[];
  /** a primeira citação do texto, como a correção a lê; null se não há */
  artigo?: (texto: string) => string | null;
}

function interpretarFrase(fala: string, ctx: ContextoVoz, rec: Required<Reconhecedores>): AcaoVoz | null {
  const t = normal(fala);
  if (!t) return null;
  if (DESLIGAR.test(t)) return { tipo: "desligar" };
  if (ctx.tipo === "respondida") return PROXIMA.test(t) ? { tipo: "proxima" } : null;

  if (ctx.tipo === "alternativas") {
    const k = alternativaFalada(t, ctx.textos.length);
    if (k !== null) return { tipo: "alternativa", indice: k };
    // o nome da peça, como o campo de digitar o reconhece ("rese", "HC")
    if (ctx.pecas) {
      const nomes = rec.peca(fala).map(normal);
      const achadas = ctx.textos.map((x, j) => (nomes.includes(normal(x)) ? j : -1)).filter((j) => j >= 0);
      if (achadas.length === 1) return { tipo: "alternativa", indice: achadas[0]! };
    }
    const pelo = alternativaPeloTexto(t, ctx.textos);
    return pelo === null ? null : { tipo: "alternativa", indice: pelo };
  }

  // os campos de digitar: "próxima" antes de responder, e os sons soltos ("hum", "tá"), não viram resposta
  if (PROXIMA.test(t) || SOLTAS.has(t)) return null;
  if (ENVIAR.test(t)) return { tipo: "enviar" };
  const apagar = APAGAR.exec(t);
  if (apagar) {
    const campo = apagar[3] ? CAMPO_FALADO[apagar[3].trim()] : undefined;
    return campo ? { tipo: "apagar", campo } : { tipo: "apagar" };
  }
  // "… responder" no fim: preenche e envia
  let texto = fala.trim();
  const fim = ENVIAR_NO_FIM.exec(normal(texto));
  const enviar = !!fim;
  if (fim) texto = texto.replace(/[\s,.;:!]*\S+[\s.!]*$/, "");
  // o campo dito antes ("peça apelação", "fundamento artigo 593", "tese legítima defesa")
  const prefixo = /^(a\s+peca|peca|o\s+fundamento|fundamento|a\s+tese|tese|o\s+ponto\s+central|o\s+artigo)[\s:,]+(?:e\s+)?/.exec(dobrar(texto));
  const campoDito = prefixo ? CAMPO_FALADO[prefixo[1]!] : undefined;
  if (prefixo && campoDito) {
    const resto = texto.slice(prefixo[0].length).trim();
    if (!resto) return null;
    if ((campoDito === "peca" || campoDito === "fundamento") && ctx.tipo !== "peca") return null;
    if ((campoDito === "tese" || campoDito === "artigo") && (ctx.tipo !== "tese" || (campoDito === "artigo" && !ctx.comArtigo))) return null;
    // "fundamento …" e "o artigo …": tudo é o artigo; "peça …" e "tese …" seguem abaixo, cortadas no artigo dito junto
    if (campoDito === "fundamento" || campoDito === "artigo") {
      const citado = rec.artigo(numerosEmAlgarismos(resto));
      return citado ? { tipo: "preencher", campos: { [campoDito]: citado }, enviar } : enviar ? { tipo: "enviar" } : null;
    }
    texto = resto;
  }
  // a resposta é uma só: cada frase muda só o que ela traz de válido (a peça reconhecida, a citação reconhecida); o resto
  // da frase não apaga o que já foi dito. Na frase, vale o primeiro: "apelação ou memoriais" é apelação
  const { antes, artigo } = separarArtigo(texto);
  const campos: Partial<Record<CampoVoz, string>> = {};
  // o pedaço que continua o artigo já dito ("do CPP") completa o artigo, e não vira peça nem ponto central
  const continuado = continuarCitacao(ctx.tipo === "peca" ? ctx.fundamento : ctx.tipo === "tese" && ctx.comArtigo ? ctx.artigo : "", texto, rec);
  if (continuado) return { tipo: "preencher", campos: { [ctx.tipo === "peca" ? "fundamento" : "artigo"]: continuado }, enviar };
  if (ctx.tipo === "peca") {
    const citado = artigo ? rec.artigo(artigo) : null;
    if (citado) campos.fundamento = citado;
    const peca = rec.peca(antes || (artigo ? "" : texto))[0];
    if (peca) campos.peca = peca;
  } else if (!ctx.comArtigo) {
    // no médio, só o ponto central: a frase inteira (o artigo dito junto fica nele)
    const tudo = limparAntes(texto);
    if (temPalavra(tudo)) campos.tese = tudo;
  } else {
    const citado = artigo ? rec.artigo(artigo) : null;
    if (citado) campos.artigo = citado;
    if (temPalavra(antes)) campos.tese = antes;
  }
  if (!Object.keys(campos).length) return enviar ? { tipo: "enviar" } : null;
  return { tipo: "preencher", campos, enviar };
}

/** O texto tem alguma palavra que conta (não só "hum", "é", "tá"): um ponto central de verdade. */
const temPalavra = (s: string) => normal(s).split(" ").some((p) => p.length > 1 && !SOLTAS.has(p));

/**
 * O que a pessoa disse (as alternativas do reconhecimento, da mais provável para a menos) vira uma ação na questão: a
 * primeira alternativa que dá uma ação vale. `rec` reconhece a peça e o artigo (pecasFaladas e artigoFalado, em
 * verificar.ts); sem ele, nenhuma peça nem artigo é reconhecido.
 */
export function interpretarResposta(falas: readonly string[], ctx: ContextoVoz, rec: Reconhecedores = {}): AcaoVoz | null {
  const r: Required<Reconhecedores> = { peca: rec.peca ?? (() => []), artigo: rec.artigo ?? (() => null) };
  for (const f of falas) {
    const a = interpretarFrase(f, ctx, r);
    if (a) return a;
  }
  return null;
}

/** O que dizer, conforme a questão: a dica da linha do microfone. */
export function dicaDaVoz(ctx: ContextoVoz): string {
  if (ctx.tipo === "respondida") return "Diga “próxima” para seguir.";
  if (ctx.tipo === "alternativas") return ctx.pecas ? "Diga a letra (“letra B”) ou o nome da peça." : "Diga a letra (“letra B”) ou o começo da alternativa.";
  if (ctx.tipo === "peca") return "Diga a peça e o artigo (“apelação, artigo 593, III, d, do CPP”) e depois “responder”.";
  return ctx.comArtigo ? "Diga o ponto central e o artigo, e depois “responder”." : "Diga o ponto central e depois “responder”.";
}

/** Os comandos da leitura em voz alta: ler a questão de novo, só as alternativas, os artigos da correção, ou parar de ler. */
export type ComandoDeLeitura = "reler" | "alternativas" | "artigos" | "parar";
// "ver a questão" e "rever": o reconhecimento ouve "ler" como "ver" (e a pessoa também diz assim)
const RELER =
  /^(repetir|repete|repita|ler de novo|leia de novo|le de novo|ler novamente|(ler|leia|le|ver|veja|rever|repetir)( a)? (questao|pergunta)( de novo| novamente)?|de novo|outra vez)$/;
const LER_ALTERNATIVAS = /^((ler|leia|le|ver|veja|rever|repetir|repete|repita|quais sao)( as)? alternativas|alternativas)$/;
const LER_ARTIGOS = /^((ler|leia|le|ver|veja|rever|repetir|repete|repita)( o| os)? (artigo|artigos)( certo| certos)?|(o|os) artigos?)$/;
const PARAR_DE_LER = /^(parar|pare|para|silencio|chega|cala a boca|para de ler|parar de ler|pare de ler|parar a leitura|para a leitura|pausa|pausar)$/;

export function comandoDeLeitura(falas: readonly string[]): ComandoDeLeitura | null {
  for (const f of falas) {
    const t = normal(f);
    if (RELER.test(t)) return "reler";
    if (LER_ALTERNATIVAS.test(t)) return "alternativas";
    if (LER_ARTIGOS.test(t)) return "artigos";
    if (PARAR_DE_LER.test(t)) return "parar";
  }
  return null;
}

/**
 * Os comandos da leitura em voz alta no treino, os mesmos do Ouvir do Vade Mecum: além dos de cima, pausar, continuar,
 * repetir o trecho, o trecho seguinte e o anterior, a velocidade, o volume e a ajuda.
 */
export type ComandoDaLeitura =
  | ComandoDeLeitura
  | "pausar"
  | "continuar"
  | "repetirTrecho"
  | "proximoTrecho"
  | "trechoAnterior"
  | "maisRapido"
  | "maisDevagar"
  | "velocidadeNormal"
  | "maisAlto"
  | "maisBaixo"
  | "ajuda";

// no meio de uma frase maior (o microfone ouvindo também a leitura): "… ler as alternativas", "… repete a questão"
const ALTERNATIVAS_NA_FRASE = /\b(ler|leia|le|ver|veja|rever|repetir|repete|repita|quais sao)( as)? alternativas\b/;
const ARTIGOS_NA_FRASE = /\b(ler|leia|le|ver|veja|rever|repetir|repete|repita)( o| os)? (artigo|artigos)( certo| certos)?$/;
const QUESTAO_NA_FRASE =
  /\b(ler|leia|le|ver|veja|rever|repetir|repete|repita)( a| de novo a| novamente a)? (questao|pergunta)( de novo| novamente| toda| inteira)?\b|\b(questao|pergunta) (de novo|novamente|toda de novo)\b/;
/** Fora da leitura (pausada ou parada), um comando do Ouvir só vale em frase curta: a mais longa é a resposta. */
const MAX_PALAVRAS_FORA = 4;

/**
 * O comando de leitura da fala, conforme a leitura: lendo, ele vale no meio de qualquer frase (o microfone também ouve a
 * voz: `recentes` são as palavras dela, que não disparam comando); pausada ou parada, só em frase curta, para a resposta
 * ("apelação, artigo 593") não virar comando. "Repete" lendo ou pausada repete o trecho; parada, a questão inteira.
 * `interpretar`: o intérprete dos comandos do Ouvir (interpretarComando, em src/lib/fala/comandos-voz.ts).
 */
export function comandoDaLeitura(
  falas: readonly string[],
  estado: "lendo" | "pausado" | "parado",
  recentes: ReadonlySet<string>,
  interpretar: (fala: string, recentes: ReadonlySet<string>) => { tipo: string } | null,
): ComandoDaLeitura | null {
  const eco = (trecho: string) => {
    const ps = trecho.split(" ").filter((p) => p.length > 2);
    return ps.length > 0 && ps.every((p) => recentes.has(p));
  };
  for (const f of falas) {
    const t = normal(f);
    if (!t) continue;
    const exato = comandoDeLeitura([f]);
    if (exato === "reler") return estado === "parado" || QUESTAO_NA_FRASE.test(t) ? "reler" : "repetirTrecho";
    // "pare" e "pausa", lendo, pausam (“continua” segue dali); "parar a leitura" e "chega" param
    if (exato === "parar") return estado === "lendo" && /^(pausa|pausar|pare|para|parar|silencio)$/.test(t) ? "pausar" : "parar";
    if (exato) return exato;
    for (const [re, cmd] of [
      [ALTERNATIVAS_NA_FRASE, "alternativas"],
      [ARTIGOS_NA_FRASE, "artigos"],
      [QUESTAO_NA_FRASE, "reler"],
    ] as const) {
      const m = re.exec(t);
      if (m && !eco(m[0])) return cmd;
    }
    if (estado !== "lendo" && t.split(" ").length > MAX_PALAVRAS_FORA) continue;
    const c = interpretar(f, recentes)?.tipo;
    if (c === "pausar") return estado === "lendo" ? "pausar" : null;
    if (c === "encerrar") return "parar";
    if (c === "continuar") return estado === "pausado" ? "continuar" : null;
    if (c === "repetir" || c === "repetirArtigo") return estado === "parado" ? "reler" : "repetirTrecho";
    if (c === "proximo" || c === "proximoArtigo") return estado === "parado" ? null : "proximoTrecho";
    if (c === "anterior" || c === "artigoAnterior") return estado === "parado" ? null : "trechoAnterior";
    if (c === "maisRapido" || c === "maisDevagar" || c === "velocidadeNormal" || c === "maisAlto" || c === "maisBaixo" || c === "ajuda") return c;
  }
  return null;
}

/** A velocidade, o volume ou o tom ditos como no Ouvir ("velocidade máxima", "velocidade 2", "volume 50%", "voz mais grave"). */
export type AjusteDaVoz =
  | { tipo: "velocidade"; valor?: number; extremo?: "max" | "min"; passo?: number }
  | { tipo: "volume"; valor?: number; extremo?: "max" | "min" }
  | { tipo: "tom"; passo?: 1 | -1 }
  | { tipo: "info"; sobre: "velocidade" | "volume" };
/** Fora da leitura, o ajuste só vale em frase curta (a resposta é a mais longa). */
const MAX_PALAVRAS_AJUSTE = 6;

/** O ajuste da voz na fala, com `interpretar` (interpretarComando, em src/lib/fala/comandos-voz.ts); null se não é um. */
export function ajusteDaVoz(
  falas: readonly string[],
  estado: "lendo" | "pausado" | "parado",
  recentes: ReadonlySet<string>,
  interpretar: (fala: string, recentes: ReadonlySet<string>) => { tipo: string; sobre?: string } | null,
): AjusteDaVoz | null {
  for (const f of falas) {
    if (estado !== "lendo" && normal(f).split(" ").length > MAX_PALAVRAS_AJUSTE) continue;
    const c = interpretar(f, recentes);
    if (!c) continue;
    if (c.tipo === "velocidade" || c.tipo === "volume" || c.tipo === "tom") return c as AjusteDaVoz;
    if (c.tipo === "info" && (c.sobre === "velocidade" || c.sobre === "volume")) return c as AjusteDaVoz;
  }
  return null;
}

/** O que dizer em "ajuda", no treino. */
export const AJUDA_DO_TREINO =
  "Para responder, diga a letra, ou a resposta, e depois: responder. Depois da correção: próxima. Na leitura: pausa; continua; volta; avança; repete; ler a questão; ler as alternativas; ler os artigos; mais rápido; mais devagar; velocidade máxima; velocidade dois; mais alto; mais baixo; volume cinquenta por cento; voz mais grave; e parar a leitura. Para desligar o microfone: desligar o microfone.";

/** A lista dos comandos da leitura no treino, para a tela: o que dizer e o que acontece. */
export const COMANDOS_DO_TREINO: [dizer: string, faz: string][] = [
  ["“pausa” ou “pare”", "pausa a leitura (para responder já)"],
  ["“continua”", "continua de onde parou"],
  ["“volta” / “avança”", "a frase anterior ou a seguinte"],
  ["“repete”", "lê de novo a frase atual; com a leitura parada, a questão toda"],
  ["“ler a questão”", "lê a questão inteira de novo"],
  ["“ler as alternativas”", "só as alternativas"],
  ["“ler os artigos”", "depois da correção, o artigo certo e o que você citou"],
  ["“mais rápido” / “mais devagar”", "muda a velocidade; “velocidade normal” volta ao padrão"],
  ["“velocidade máxima” / “velocidade 2”", "a velocidade dita: também “velocidade 1,5”, “velocidade mínima”, “muito mais rápido”"],
  ["“mais alto” / “mais baixo”", "o volume da voz; também “volume máximo”, “volume 50%”"],
  ["“voz mais grave” / “voz mais aguda”", "o tom da voz (“tom normal” volta)"],
  ["“parar a leitura”", "para de ler"],
  ["“responder” / “próxima”", "envia a resposta / segue para a próxima questão"],
  ["“desligar o microfone”", "para de responder falando"],
  ["“ajuda”", "diz os comandos"],
];

// palavras que não contam na comparação com o que a voz acabou de ler
const VAZIAS_ECO = new Set(["o", "a", "os", "as", "e", "de", "do", "da", "dos", "das", "em", "no", "na", "um", "uma", "que", "se", "por", "para", "com"]);
/**
 * A frase ouvida é o eco da leitura: as palavras dela, quase todas (60%), estão no que a voz acabou de ler (`recentes`,
 * vazio quando a voz não está lendo). As palavras vêm de palavrasDe (src/lib/fala/comandos-voz.ts).
 */
export function pareceEco(palavras: readonly string[], recentes: ReadonlySet<string>): boolean {
  if (!recentes.size) return false;
  const contam = palavras.filter((p) => !VAZIAS_ECO.has(p));
  if (!contam.length) return true;
  return contam.filter((p) => recentes.has(p)).length / contam.length >= 0.6;
}
