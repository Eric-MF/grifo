// Para onde os comandos de voz levam, além do número do artigo: as divisões da lei (parte, livro, título, capítulo,
// seção), os nomes (do capítulo, do crime: "recurso em sentido estrito", "homicídio") e as palavras do texto ("procura
// motivo torpe"). Funções puras sobre os blocos da lei; quem lê é src/components/leis/useOuvir.ts.
import { romanoParaNumero } from "./extenso";
import { nomeDaLetra, numeroDeRotulo } from "./texto";

export const NIVEIS = ["parte", "livro", "titulo", "capitulo", "secao", "subsecao"] as const;
export type NivelDivisao = (typeof NIVEIS)[number];
/** Um nível do caminho falado ("capítulo 2", "título 2"): n é "2", "2-a", "geral" ou "especial"; null é o da posição atual. */
export interface PassoCaminho {
  nivel: NivelDivisao;
  n: string | null;
}
export interface Divisao {
  /** o bloco do cabeçalho ("CAPÍTULO II") */
  i: number;
  /** 0 parte, 1 livro, 2 título, 3 capítulo, 4 seção, 5 subseção */
  nivel: number;
  n: string;
  /** "Capítulo II" */
  rotulo: string;
  /** "DO RECURSO EM SENTIDO ESTRITO" (o nome pode vir na mesma linha ou nos blocos seguintes) */
  nome: string;
  /** o bloco em que a divisão termina (exclusivo): o cabeçalho seguinte de nível igual ou maior */
  fim: number;
  /** as divisões acima dela, da maior para a menor */
  pais: Divisao[];
}
export interface BlocoLeve {
  tipo: string;
  texto: string;
  superada?: boolean;
}

const sem = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
// "TÍTULO II", "CAPÍTULO II-A", "TÍTULO ÚNICO", "PARTE ESPECIAL", "CAPÍTULO I DISPOSIÇÕES PRELIMINARES", "SECÇÃO I" (antiga)
const CABECALHO = /^(parte|livro|titulo|capitulo|sec?cao|subsec?cao)\s+([ivxlc]+(?:\s*-\s*[a-z])?|unic[oa]|geral|especial|\d+(?:\s*-\s*[a-z])?)(?![a-z0-9])\s*[-–—.:]?\s*/;

/** "ii-a" → "2-a", "unico" → "1", "geral" → "geral" */
function chave(numero: string): string {
  const t = numero.replace(/\s+/g, "");
  if (/^unic[oa]$/.test(t)) return "1";
  if (t === "geral" || t === "especial") return t;
  const [n, letra] = t.split("-");
  const valor = /^\d+$/.test(n!) ? Number(n) : romanoParaNumero(n!.toUpperCase());
  if (!valor) return t;
  return letra ? `${valor}-${letra}` : String(valor);
}

/** As divisões da lei, na ordem do texto (as redações superadas ficam de fora). */
export function divisoesDaLei(blocos: readonly (BlocoLeve | undefined)[]): Divisao[] {
  const saida: Divisao[] = [];
  const pilha: (Divisao | undefined)[] = [];
  // o Planalto põe o nome da divisão em parágrafos seguidos ao cabeçalho
  let aberta: Divisao | null = null;
  for (let i = 0; i < blocos.length; i++) {
    const b = blocos[i];
    if (!b || b.superada) continue;
    if (b.tipo !== "estrutura") {
      aberta = null;
      continue;
    }
    const texto = b.texto.trim();
    // sem acento, o texto tem o mesmo tamanho: as posições valem no original
    const m = CABECALHO.exec(sem(texto));
    if (!m) {
      if (aberta) aberta.nome = aberta.nome ? `${aberta.nome} ${texto}` : texto;
      continue;
    }
    const nivel = NIVEIS.indexOf(m[1]!.replace("seccao", "secao") as NivelDivisao);
    pilha.length = nivel;
    const palavra = texto.slice(0, m[1]!.length);
    const d: Divisao = {
      i,
      nivel,
      n: chave(m[2]!),
      rotulo: `${palavra.charAt(0).toUpperCase()}${palavra.slice(1).toLowerCase()} ${texto.slice(m[1]!.length, m[0].length).replace(/[\s\-–—.:]+$/, "").trim().toUpperCase()}`,
      nome: texto.slice(m[0].length).trim(),
      fim: blocos.length,
      pais: pilha.filter((p): p is Divisao => !!p),
    };
    pilha[nivel] = d;
    saida.push(d);
    aberta = d;
  }
  for (let k = 0; k < saida.length; k++) {
    const prox = saida.slice(k + 1).find((d) => d.nivel <= saida[k]!.nivel);
    if (prox) saida[k]!.fim = prox.i;
  }
  return saida;
}

const contem = (d: Divisao, i: number) => d.i <= i && i < d.fim;
/** A divisão do nível pedido em que está o bloco `i` (a mais de dentro), ou null. */
export function divisaoDe(divs: readonly Divisao[], nivel: number, i: number): Divisao | null {
  for (let k = divs.length - 1; k >= 0; k--) if (divs[k]!.nivel === nivel && contem(divs[k]!, i)) return divs[k]!;
  return null;
}
/** A divisão mais de dentro em que está o bloco `i`, ou null. */
export function divisaoMaisFunda(divs: readonly Divisao[], i: number): Divisao | null {
  let melhor: Divisao | null = null;
  for (const d of divs) if (contem(d, i) && (!melhor || d.nivel > melhor.nivel)) melhor = d;
  return melhor;
}

export type DivisaoAchada = { div: Divisao } | { opcoes: Divisao[] } | null;

/**
 * A divisão do caminho falado ("capítulo 2 do título 2 do livro 3", em qualquer ordem). Com mais de uma (o CPP tem um
 * título II em cada livro), fica a que está no mesmo livro ou título do bloco `atual`; sem como escolher, as opções.
 */
export function acharDivisao(divs: readonly Divisao[], caminho: readonly PassoCaminho[], atual: number | null): DivisaoAchada {
  if (!caminho.length) return null;
  const nivelDe = (p: PassoCaminho) => NIVEIS.indexOf(p.nivel);
  const alvo = caminho.reduce((a, b) => (nivelDe(b) > nivelDe(a) ? b : a));
  const casa = (d: Divisao, p: PassoCaminho) =>
    d.nivel === nivelDe(p) && (p.n === null ? atual !== null && divisaoDe(divs, d.nivel, atual) === d : d.n === p.n);
  const candidatos = divs.filter((d) => casa(d, alvo) && caminho.every((p) => p === alvo || d.pais.some((a) => casa(a, p))));
  if (candidatos.length <= 1) return candidatos[0] ? { div: candidatos[0] } : null;
  if (atual !== null) {
    // a que divide mais divisões com a posição atual (o mesmo livro, o mesmo título)
    const nota = (d: Divisao) => (contem(d, atual) ? 100 : 0) + d.pais.filter((p) => contem(p, atual)).length;
    const notas = candidatos.map(nota);
    const max = Math.max(...notas);
    if (max > 0 && notas.filter((n) => n === max).length === 1) return { div: candidatos[notas.indexOf(max)]! };
  }
  return { opcoes: candidatos };
}

/** A divisão seguinte (1) ou a anterior (-1) do nível, a partir do bloco `atual`. */
export function divisaoVizinha(divs: readonly Divisao[], nivel: NivelDivisao, passo: 1 | -1, atual: number): Divisao | null {
  const n = NIVEIS.indexOf(nivel);
  const domesmo = divs.filter((d) => d.nivel === n);
  if (passo > 0) return domesmo.find((d) => d.i > atual) ?? null;
  // a anterior à divisão em que se está (e não o começo dela)
  const aqui = divisaoDe(divs, n, atual);
  const limite = aqui ? aqui.i : atual;
  for (let k = domesmo.length - 1; k >= 0; k--) if (domesmo[k]!.i < limite) return domesmo[k]!;
  return null;
}

/** O primeiro (ou o último) artigo entre os blocos [ini, fim), ou null. */
export function artigoNaFaixa(blocos: readonly (BlocoLeve | undefined)[], ini: number, fim: number, qual: "primeiro" | "ultimo"): number | null {
  const ehArtigo = (b: BlocoLeve | undefined) => !!b && b.tipo === "artigo" && !b.superada;
  if (qual === "primeiro") {
    for (let i = ini; i < Math.min(fim, blocos.length); i++) if (ehArtigo(blocos[i])) return i;
    return null;
  }
  for (let i = Math.min(fim, blocos.length) - 1; i >= ini; i--) if (ehArtigo(blocos[i])) return i;
  return null;
}

/** "Livro III, Título II, Capítulo II": o caminho da divisão, para mostrar. */
export const caminhoDaDivisao = (d: Divisao) => [...d.pais, d].map((p) => p.rotulo).join(", ");

const NOME_DO_NIVEL = ["parte", "livro", "título", "capítulo", "seção", "subseção"];
/** "capítulo segundo", "seção primeira", "título nove á", "parte especial", "título único": a divisão como se diz. */
export function divisaoFalada(d: { nivel: number; n: string | null; rotulo?: string }): string {
  const nome = NOME_DO_NIVEL[d.nivel]!;
  const genero = d.nivel === 0 || d.nivel >= 4 ? "f" : "m";
  if (d.n === null) return `${genero === "f" ? "esta" : "este"} ${nome}`;
  if (d.n === "geral" || d.n === "especial") return `${nome} ${d.n}`;
  if (d.rotulo && /\b[ÚU]NIC[OA]$/i.test(d.rotulo)) return `${nome} ${genero === "f" ? "única" : "único"}`;
  const [n, letra] = d.n.split("-");
  return `${nome} ${numeroDeRotulo(Number(n), genero)}${letra ? ` ${nomeDaLetra(letra)}` : ""}`;
}

// ---------- nomes ----------

/**
 * Nomes que não estão escritos na lei (siglas e apelidos) ou que estão noutra lei: a lei e o que procurar nela (o nome de
 * uma divisão ou de um crime) ou o artigo. Os nomes vêm normalizados (sem acento, minúsculas).
 */
export const APELIDOS: { nomes: string[]; lei: string; nome?: string; alvo?: string }[] = [
  // o reconhecimento escreve a sigla falada de vários jeitos
  { nomes: ["rese", "resi", "reze", "rezi", "reese", "rese cpp", "recurso em sentido estrito"], lei: "cpp", nome: "do recurso em sentido estrito" },
  { nomes: ["anpp", "acordo de nao persecucao penal", "acordo de nao persecucao", "nao persecucao penal"], lei: "cpp", alvo: "28-a" },
  { nomes: ["juiz das garantias", "juiz de garantias"], lei: "cpp", alvo: "3-b" },
  { nomes: ["hc", "habeas corpus"], lei: "cpp", nome: "do habeas corpus e seu processo" },
  { nomes: ["apelacao"], lei: "cpp", nome: "da apelacao" },
  { nomes: ["revisao criminal"], lei: "cpp", nome: "da revisao" },
  { nomes: ["carta testemunhavel"], lei: "cpp", nome: "da carta testemunhavel" },
  { nomes: ["embargos de declaracao"], lei: "cpp", alvo: "619" },
  { nomes: ["embargos infringentes"], lei: "cpp", alvo: "609 paragrafo unico" },
  { nomes: ["juri", "tribunal do juri"], lei: "cpp", nome: "do procedimento relativo aos processos da competencia do tribunal do juri" },
  { nomes: ["audiencia de custodia"], lei: "cpp", alvo: "310" },
  { nomes: ["inquerito", "inquerito policial"], lei: "cpp", nome: "do inquerito policial" },
  { nomes: ["prisao preventiva", "preventiva"], lei: "cpp", nome: "da prisao preventiva" },
  { nomes: ["flagrante", "prisao em flagrante"], lei: "cpp", nome: "da prisao em flagrante" },
  { nomes: ["nulidades"], lei: "cpp", nome: "das nulidades" },
  { nomes: ["sursis", "suspensao condicional da pena"], lei: "cp", nome: "da suspensao condicional da pena" },
  { nomes: ["sursis processual", "suspensao condicional do processo"], lei: "lei-9099", alvo: "89" },
  { nomes: ["transacao penal"], lei: "lei-9099", alvo: "76" },
  { nomes: ["dosimetria", "fixacao da pena"], lei: "cp", alvo: "59" },
  { nomes: ["legitima defesa"], lei: "cp", alvo: "25" },
  { nomes: ["estado de necessidade"], lei: "cp", alvo: "24" },
  { nomes: ["homicidio"], lei: "cp", alvo: "121" },
  { nomes: ["feminicidio"], lei: "cp", alvo: "121-a" },
  { nomes: ["furto"], lei: "cp", alvo: "155" },
  { nomes: ["roubo"], lei: "cp", alvo: "157" },
  { nomes: ["latrocinio"], lei: "cp", alvo: "157 paragrafo 3" },
  { nomes: ["extorsao"], lei: "cp", alvo: "158" },
  { nomes: ["estelionato"], lei: "cp", alvo: "171" },
  { nomes: ["estupro"], lei: "cp", alvo: "213" },
  { nomes: ["receptacao"], lei: "cp", alvo: "180" },
  { nomes: ["peculato"], lei: "cp", alvo: "312" },
  { nomes: ["prescricao"], lei: "cp", alvo: "109" },
  { nomes: ["trafico", "trafico de drogas"], lei: "lei-11343", alvo: "33" },
  { nomes: ["associacao para o trafico"], lei: "lei-11343", alvo: "35" },
  { nomes: ["porte ilegal", "porte ilegal de arma", "porte de arma"], lei: "lei-10826", alvo: "14" },
  { nomes: ["posse irregular", "posse de arma"], lei: "lei-10826", alvo: "12" },
  { nomes: ["colaboracao premiada", "delacao premiada", "delacao"], lei: "lei-12850", nome: "da colaboracao premiada" },
  { nomes: ["progressao de regime", "progressao"], lei: "lep", alvo: "112" },
  { nomes: ["remicao"], lei: "lep", nome: "da remicao" },
  { nomes: ["agravo em execucao"], lei: "lep", alvo: "197" },
  { nomes: ["lavagem de dinheiro", "lavagem"], lei: "lei-9613", alvo: "1" },
];
/** O apelido dito ("RESE", "ANPP", "tráfico"), ou null. */
export function apelidoDe(consulta: string): (typeof APELIDOS)[number] | null {
  const q = normalizarBusca(consulta).replace(ARTIGOS_DO_COMECO, "");
  return APELIDOS.find((a) => a.nomes.includes(q)) ?? null;
}

export interface Nomeado {
  i: number;
  nome: string;
  tipo: "divisao" | "rubrica";
}

/** Os nomes que se pode falar: o das divisões ("Do recurso em sentido estrito") e o dos crimes acima dos artigos ("Furto"). */
export function nomesDaLei(blocos: readonly (BlocoLeve | undefined)[], divs: readonly Divisao[]): Nomeado[] {
  const saida: Nomeado[] = divs.filter((d) => d.nome).map((d) => ({ i: d.i, nome: d.nome, tipo: "divisao" as const }));
  blocos.forEach((b, i) => {
    if (b && b.tipo === "rubrica" && !b.superada && b.texto.trim()) saida.push({ i, nome: b.texto.trim(), tipo: "rubrica" });
  });
  return saida.sort((a, b) => a.i - b.i);
}

const ARTIGOS_DO_COMECO = /^(?:(?:o|a|os|as|do|da|dos|das|de|um|uma)\s+)+/;
// palavras que não ajudam a achar nada
const VAZIAS = new Set(["o", "a", "os", "as", "de", "do", "da", "dos", "das", "e", "ou", "em", "no", "na", "nos", "nas", "um", "uma", "que", "se", "por", "para", "com", "ao", "aos", "pelo", "pela"]);
export const palavrasChave = (q: string) => normalizarBusca(q).split(" ").filter((p) => p && !VAZIAS.has(p));

/**
 * O nome que mais combina com o que foi dito: igual (100), começa por ele (80), contém a expressão (60) ou tem todas as
 * palavras (40); no empate, o primeiro da lei. Nada parecido: null.
 */
export function acharPeloNome(nomes: readonly Nomeado[], consulta: string): { item: Nomeado; nota: number } | null {
  const q = normalizarBusca(consulta).replace(ARTIGOS_DO_COMECO, "");
  if (q.replace(/\s/g, "").length < 3) return null;
  const chaves = palavrasChave(q);
  let melhor: { item: Nomeado; nota: number } | null = null;
  for (const item of nomes) {
    const n = normalizarBusca(item.nome).replace(ARTIGOS_DO_COMECO, "");
    const nota =
      n === q ? 100 : n.startsWith(`${q} `) ? 80 : ` ${n} `.includes(` ${q} `) ? 60 : chaves.length && chaves.every((c) => ` ${n} `.includes(` ${c} `)) ? 40 : 0;
    if (nota > (melhor?.nota ?? 0)) melhor = { item, nota };
  }
  return melhor;
}

// ---------- palavras do texto ----------

/** O texto sem acento, em minúsculas, só com letras e algarismos separados por um espaço; `pos[j]` é a posição no original. */
export interface TextoNormalizado {
  t: string;
  pos: number[];
}
export function normalizarComMapa(s: string): TextoNormalizado {
  let t = "";
  const pos: number[] = [];
  let espaco = true;
  for (let k = 0; k < s.length; k++) {
    const c = sem(s[k]!);
    if (/^[a-z0-9]+$/.test(c)) {
      for (const x of c) {
        t += x;
        pos.push(k);
      }
      espaco = false;
    } else if (!espaco) {
      t += " ";
      pos.push(k);
      espaco = true;
    }
  }
  if (t.endsWith(" ")) {
    t = t.slice(0, -1);
    pos.pop();
  }
  return { t, pos };
}
export const normalizarBusca = (s: string) => normalizarComMapa(s).t;

/** Onde a expressão aparece inteira (entre limites de palavra): as posições no texto original. */
function ocorrencias(tn: TextoNormalizado, frase: string): number[] {
  const saida: number[] = [];
  const alvo = ` ${frase} `;
  const t = ` ${tn.t} `;
  for (let k = t.indexOf(alvo); k >= 0; k = t.indexOf(alvo, k + 1)) saida.push(tn.pos[k]!);
  return saida;
}

export interface Acerto {
  /** o índice do texto na lista */
  k: number;
  /** a posição no texto original */
  pos: number;
}

/**
 * Procura o que foi dito numa lista de textos (os blocos à mostra): a expressão inteira; sem ela, um bloco com todas as
 * palavras; sem isso, a expressão sem as últimas palavras (o reconhecimento junta à frase o que a voz da leitura disse
 * logo depois). Os acertos vêm na ordem do texto; `frase` é o que foi achado.
 */
export function procurarNaLista(textos: readonly string[], consulta: string): { acertos: Acerto[]; frase: string } {
  const q = normalizarBusca(consulta).replace(ARTIGOS_DO_COMECO, "");
  const vazio = { acertos: [], frase: "" };
  if (q.replace(/\s/g, "").length < 2) return vazio;
  const normais = textos.map(normalizarComMapa);
  const daFrase = (f: string) => normais.flatMap((tn, k) => ocorrencias(tn, f).map((pos) => ({ k, pos })));
  let acertos = daFrase(q);
  if (acertos.length) return { acertos, frase: q };
  const chaves = palavrasChave(q);
  if (chaves.length > 1) {
    acertos = normais.flatMap((tn, k) => {
      const ps = chaves.map((c) => ocorrencias(tn, c)[0] ?? -1);
      return ps.every((p) => p >= 0) ? [{ k, pos: Math.min(...ps) }] : [];
    });
    if (acertos.length) return { acertos, frase: chaves.join(" ") };
  }
  const palavras = q.split(" ");
  if (palavras.length >= 3)
    for (let n = palavras.length - 1; n >= 1; n--) {
      const f = palavras.slice(0, n).join(" ").replace(/(?:\s(?:o|a|os|as|de|do|da|dos|das|e|em|no|na))+$/, "");
      if (!palavrasChave(f).length) continue;
      acertos = daFrase(f);
      if (acertos.length) return { acertos, frase: f };
    }
  return vazio;
}
