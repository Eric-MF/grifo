// Correção das respostas do quiz, com o mesmo normalizador/parser do simulador.
import { citacaoAtende, extrairCitacoes, formatarCitacao, parseDispositivo, type Citacao } from "@/lib/correcao/citacoes";
import { contextoCorrecao } from "@/lib/correcao/cliente";
import { avaliarItens, identificarPeca, pecasNoInicio } from "@/lib/correcao/grader";
import { normalize } from "@/lib/correcao/normalize";
import { alvosSemLei, referenciasDigitadas, type ReferenciaDigitada } from "@/lib/leis/busca";
import type { Letra, Nivel, PerguntaObjetiva, PerguntaPeca, PerguntaTese } from "./types";
import { pecasAproximadas } from "./pecaAproximada";

export interface CorrecaoPeca {
  formato: "peca";
  acertou: boolean;
  acertouPeca: boolean;
  acertouFundamento: boolean | null; // null = não exigido no nível
  pecaEsperada: string;
  fundamentoEsperado: string;
  /** o que o aluno respondeu, mostrado abaixo da resposta certa quando ele erra */
  respondida?: Respondida;
}

/** Um artigo do fundamento digitado: o texto legível e onde ele está no leitor (para mostrar o que o artigo diz). */
export interface ArtigoCitado {
  texto: string;
  /** id da lei no leitor; null nas súmulas */
  lei: string | null;
  /** âncora do artigo ("art581") */
  art: string;
  /** os dispositivos citados dentro do artigo ("art581.i4"); vazio quando só o artigo foi citado */
  disps: string[];
}

export interface Respondida {
  /** a peça como foi escolhida (nome) ou digitada */
  peca: string;
  /** a peça reconhecida (chave do catálogo); null quando o texto digitado não bate com nenhuma */
  tipo: string | null;
  /** o fundamento padrão da peça reconhecida, legível */
  fundamentoDaPeca: string[];
  /** o fundamento digitado, como foi escrito (níveis médio e difícil) */
  fundamento?: string;
  /** os artigos reconhecidos no fundamento digitado */
  artigos: ArtigoCitado[];
}

/** No fácil, o que a questão pede: o artigo da tese dada ou a tese do artigo dado. */
export type ModoFacil = "artigo" | "tese";

export interface CorrecaoTese {
  formato: "tese";
  acertou: boolean;
  /** o ponto central (null quando o nível não pede: o fácil de artigo) */
  acertouTese: boolean | null;
  /** o artigo (null quando o nível não pede: o médio e o fácil de tese) */
  acertouArtigo: boolean | null;
  teseEsperada: string;
  /** o artigo esperado, legível */
  artigoEsperado: string;
  /** o que o aluno marcou (fácil) ou digitou (médio e difícil) */
  respondida: { alternativa?: string; tese?: string; artigo?: string; artigos: ArtigoCitado[] };
}

export interface CorrecaoObjetiva {
  formato: "objetiva";
  acertou: boolean;
  escolhida: Letra;
  correta: Letra;
}

export type Correcao = CorrecaoPeca | CorrecaoTese | CorrecaoObjetiva;

export function nomePeca(tipo: string) {
  return contextoCorrecao().pecas[tipo]?.nome ?? tipo;
}

function legivel(spec: string) {
  const ctx = contextoCorrecao();
  const c = parseDispositivo(spec, ctx.lex);
  return c ? formatarCitacao(c, ctx.leis) : spec;
}
const fundamentoLegivel = (p: PerguntaPeca) => legivel(p.resposta.fundamentos[0]);

/** O fundamento padrão da peça (content/pecas.yaml), legível. */
export const fundamentoDaPeca = (tipo: string) => (contextoCorrecao().pecas[tipo]?.fundamento ?? []).map(legivel);

/** "art. 593, III, b" → ["art593.i3.ab"]: os dispositivos citados, com as âncoras do leitor. */
function dispositivosDa(c: Extract<Citacao, { tipo: "art" }>): string[] {
  const art = `art${c.art.toLowerCase()}`;
  const ps = c.pars.length ? c.pars.map((p) => (p === "unico" ? ".pu" : `.p${p}`)) : [""];
  const is = c.incs.length ? c.incs.map((i) => `.i${i}`) : [""];
  const as = c.als.length ? c.als.map((a) => `.a${a.toLowerCase()}`) : [""];
  return ps.flatMap((p) => is.flatMap((i) => as.map((a) => art + p + i + a))).filter((d) => d !== art);
}

/** A referência lida pela busca do leitor, na forma da correção (a mesma da rubrica). */
function paraCitacao({ lei, alvo }: ReferenciaDigitada): Citacao {
  const numero = alvo.art.replace(/^art/, "");
  const tribunal = lei.match(/^sumulas-(stf|stj)$/)?.[1];
  if (tribunal) return { tipo: "sumula", n: numero, tribunal, vinculante: false, pos: 0, fim: 0 };
  const c: Citacao = { tipo: "art", art: numero, pars: [], incs: [], als: [], caput: false, diploma: lei || null, pos: 0, fim: 0 };
  for (const s of (alvo.disp ?? alvo.art).split(".").slice(1)) {
    if (s === "pu") c.pars.push("unico");
    else if (s[0] === "p") c.pars.push(s.slice(1));
    else if (s[0] === "i") c.incs.push(s.slice(1));
    else if (s[0] === "a") c.als.push(s.slice(1));
  }
  return c;
}

/**
 * As citações do fundamento digitado. O campo só tem referência, então vale a leitura da busca "/" do leitor
 * ("403, §3 cpp", "406, cpp"); o que ela não lê (súmula vinculante, lei fora do leitor, texto corrido) passa pelo
 * leitor de citações da correção.
 */
export function citacoesDoFundamento(texto: string): Citacao[] {
  const refs = referenciasDigitadas(texto);
  return refs.length ? refs.map(paraCitacao) : extrairCitacoes(normalize(texto), contextoCorrecao().lex);
}

/**
 * A prévia do campo, antes de responder: o que vai ser considerado, legível e sem link (o link abriria o artigo). Lê
 * igual à correção: "p" é sempre parágrafo, mesmo que o artigo não tenha o parágrafo e tenha o inciso de mesmo número
 * (a busca do leitor leva ao inciso; aqui isso testaria pouco). Artigo sem a lei também aparece, para avisar que falta.
 */
export function previaDoFundamento(texto: string): { citacoes: string[]; semLei: boolean } {
  const ctx = contextoCorrecao();
  const lidas = citacoesDoFundamento(texto);
  const cs = lidas.length ? lidas : alvosSemLei(texto).map((alvo) => paraCitacao({ lei: "", alvo }));
  return { citacoes: cs.map((c) => formatarCitacao(c, ctx.leis)), semLei: cs.some((c) => c.tipo === "art" && !c.diploma) };
}

/** As peças reconhecidas no que se digitou (nomes, sem repetir), sem olhar qual é a certa. */
export function previaDaPeca(texto: string): string[] {
  if (!texto.trim()) return [];
  const ctx = contextoCorrecao();
  const exatas = [...new Set(pecasNoInicio(texto, ctx, "", [], true).map((h) => h.nome))];
  // sem o nome exato: o aproximado (a correção aceita se for de uma peça só; mais de uma, a prévia mostra todas)
  return exatas.length ? exatas : pecasAproximadas(texto, ctx.pecas).map((x) => x.nome);
}

/**
 * Responder falando: as peças que a frase nomeia, na ordem em que aparecem (a primeira vale); pelo nome aproximado, só
 * se for de uma peça só ("recurso" é de várias: nenhuma).
 */
export function pecasFaladas(texto: string): string[] {
  if (!texto.trim()) return [];
  const ctx = contextoCorrecao();
  const exatas = [...new Set(pecasNoInicio(texto, ctx, "", [], true).map((h) => h.nome))];
  if (exatas.length) return exatas;
  const aproximadas = pecasAproximadas(texto, ctx.pecas);
  return aproximadas.length === 1 ? [aproximadas[0]!.nome] : [];
}

/** Responder falando: a primeira citação da frase, como a correção a lê ("Art. 593, inciso III, alínea d — Código de Processo Penal"). */
export const artigoFalado = (texto: string): string | null => (texto.trim() ? (previaDoFundamento(texto).citacoes[0] ?? null) : null);

/** Os artigos reconhecidos na resposta escrita (discursiva), como a correção dos itens os lê. */
export const previaDaResposta = (texto: string): string[] => {
  const ctx = contextoCorrecao();
  return [...new Set(extrairCitacoes(normalize(texto), ctx.lex).map((c) => formatarCitacao(c, ctx.leis)))];
};

/** Os artigos reconhecidos num fundamento digitado. */
export function artigosCitados(texto: string): ArtigoCitado[] {
  const ctx = contextoCorrecao();
  return citacoesDoFundamento(texto).map((c) =>
    c.tipo === "art"
      ? { texto: formatarCitacao(c, ctx.leis), lei: c.diploma, art: `art${c.art.toLowerCase()}`, disps: dispositivosDa(c) }
      : { texto: formatarCitacao(c, ctx.leis), lei: null, art: "", disps: [] },
  );
}

/** nivel 1: `peca` é a chave escolhida entre as alternativas; níveis 2 e 3: texto digitado. */
export function corrigirResposta(p: PerguntaPeca, nivel: Nivel, entrada: { peca: string; fundamento?: string }): CorrecaoPeca {
  const ctx = contextoCorrecao();
  let achada = nivel === 1 || !entrada.peca.trim() ? null : identificarPeca(entrada.peca, p.resposta.peca, [], ctx, true);
  // sem o nome exato nem um apelido: o nome aproximado ("Mem", "Resposta Acusação", "Memorias"), se for de uma peça só
  if (achada?.status === "nao-identificada") {
    const [uma, outra] = pecasAproximadas(entrada.peca, ctx.pecas);
    if (uma && !outra) achada = uma.tipo === p.resposta.peca ? { status: "ok" } : { status: "inadequada", detectada: uma.nome, tipo: uma.tipo };
  }
  const acertouPeca = nivel === 1 ? entrada.peca === p.resposta.peca : achada?.status === "ok";
  // a peça que o aluno deu: a alternativa escolhida ou a reconhecida no texto digitado
  const tipo = nivel === 1 ? entrada.peca : acertouPeca ? p.resposta.peca : achada?.status === "inadequada" ? achada.tipo : null;

  let acertouFundamento: boolean | null = null;
  if (nivel > 1) {
    const achadas = citacoesDoFundamento(entrada.fundamento ?? "");
    acertouFundamento = p.resposta.fundamentos.some((spec) => {
      const esp = parseDispositivo(spec, ctx.lex);
      if (!esp) return false;
      // Médio: só artigo + diploma. Difícil: também parágrafo, inciso e alínea.
      const alvo = nivel === 2 && esp.tipo === "art" ? { ...esp, pars: [], incs: [], als: [], caput: false } : esp;
      return achadas.some((a) => citacaoAtende(alvo, a));
    });
  }
  return {
    formato: "peca",
    acertou: acertouPeca && acertouFundamento !== false,
    acertouPeca,
    acertouFundamento,
    pecaEsperada: nomePeca(p.resposta.peca),
    fundamentoEsperado: fundamentoLegivel(p),
    respondida: {
      peca: nivel === 1 ? nomePeca(entrada.peca) : entrada.peca.trim(),
      tipo,
      fundamentoDaPeca: tipo ? fundamentoDaPeca(tipo) : [],
      ...(nivel > 1 ? { fundamento: (entrada.fundamento ?? "").trim() } : {}),
      artigos: nivel > 1 ? artigosCitados(entrada.fundamento ?? "") : [],
    },
  };
}

/** O ponto central digitado tem um dos grupos de termos aceitos (a mesma leitura da correção do simulado). */
export function atendeTese(p: Pick<PerguntaTese, "tese" | "aceitos">, texto: string): boolean {
  if (!texto.trim()) return false;
  const [r] = avaliarItens([{ n: "tese", descricao: p.tese, componentes: [{ id: "c1", valor: 1, alternativas: p.aceitos }] }], texto, contextoCorrecao());
  return !!r && r.obtido > 0;
}

/** O artigo digitado é um dos aceitos, com o parágrafo, o inciso e a alínea. */
export function atendeArtigo(p: Pick<PerguntaTese, "artigos">, texto: string): boolean {
  const ctx = contextoCorrecao();
  const achadas = citacoesDoFundamento(texto);
  return p.artigos.some((spec) => {
    const esp = parseDispositivo(spec, ctx.lex);
    return !!esp && achadas.some((a) => citacaoAtende(esp, a));
  });
}

/** O artigo, legível ("art. 65, III, d, do CP"). */
export const artigoLegivel = (spec: string) => legivel(spec);

/**
 * O artigo no meio de uma frase, com o artigo definido: "o art. 20, § 3º, do Código Penal", "a Súmula 545 do STJ",
 * "o art. 4, § 10-A, da Lei de Organizações Criminosas".
 */
export function artigoNaFrase(spec: string): string {
  const texto = legivel(spec);
  if (/^S[úu]mula/.test(texto)) return `a ${texto}`;
  const [ref, nome] = texto.split(" — ");
  const de = nome ? `, ${/^(Lei|Constitui|Consolida)/.test(nome) ? "da" : "do"} ${nome}` : "";
  return `o ${ref!.replace(/^Art\./, "art.")}${de}`;
}

/**
 * Fácil: a alternativa marcada (o artigo ou a tese). Médio: o ponto central digitado. Difícil: o ponto central e o
 * artigo, os dois certos.
 */
export function corrigirTese(
  p: PerguntaTese,
  nivel: Nivel,
  entrada: { alternativa?: { modo: ModoFacil; texto: string; correta: boolean }; tese?: string; artigo?: string },
): CorrecaoTese {
  const base = { formato: "tese" as const, teseEsperada: p.tese, artigoEsperado: legivel(p.artigos[0]!) };
  if (nivel === 1) {
    const a = entrada.alternativa;
    const certa = !!a?.correta;
    return {
      ...base,
      acertou: certa,
      acertouTese: a?.modo === "tese" ? certa : null,
      acertouArtigo: a?.modo === "artigo" ? certa : null,
      respondida: { alternativa: a?.texto, artigos: [] },
    };
  }
  const tese = (entrada.tese ?? "").trim();
  const acertouTese = atendeTese(p, tese);
  if (nivel === 2) return { ...base, acertou: acertouTese, acertouTese, acertouArtigo: null, respondida: { tese, artigos: [] } };
  const artigo = (entrada.artigo ?? "").trim();
  const acertouArtigo = atendeArtigo(p, artigo);
  return {
    ...base,
    acertou: acertouTese && acertouArtigo,
    acertouTese,
    acertouArtigo,
    respondida: { tese, artigo, artigos: artigosCitados(artigo) },
  };
}

export function corrigirObjetiva(p: PerguntaObjetiva, escolhida: Letra): CorrecaoObjetiva {
  return { formato: "objetiva", acertou: escolhida === p.correta, escolhida, correta: p.correta };
}
