// Grifos prontos do leitor: as palavras-chave que o Grifo já traz marcadas em cada dispositivo (content/grifos/*.yaml,
// compilados em src/content/generated/grifos.json pelo scripts/build-content.ts). As quatro cores são as do
// .examples/Marcações GRIFO.md: Peças (verde), Teses (amarelo), Súmulas (azul) e Pedidos (sublinhado vermelho).
// Dois sistemas de cores mostram estes grifos (src/lib/leis/legendas.ts): "Essenciais" (só o que já caiu em prova) e
// "Geral" (todos). Não se grifa o artigo inteiro: só as palavras de cada entrada, dentro do texto do dispositivo.
// Puro (sem DOM nem arquivos): o leitor, a prévia, o Vade Mecum e o build usam as mesmas funções.

/** As quatro cores dos grifos prontos, na ordem das legendas. */
export type CorGrifo = "pecas" | "teses" | "sumulas" | "pedidos";
export const CORES_GRIFO: readonly CorGrifo[] = ["pecas", "teses", "sumulas", "pedidos"];
/** O significado de cada cor nos sistemas prontos (o rótulo da legenda). */
export const ROTULO_DA_COR: Record<CorGrifo, string> = { pecas: "Peças", teses: "Teses", sumulas: "Súmulas", pedidos: "Pedidos" };
/** Os nomes dos grupos das teses ("preliminares" → "Preliminares"); os outros grupos já vêm escritos por extenso. */
const NOME_DO_GRUPO: Record<string, string> = { preliminares: "Preliminares", principais: "Principais", subsidiarias: "Subsidiárias" };
export const nomeDoGrupo = (grupo: string) => NOME_DO_GRUPO[grupo] ?? grupo;

/** Os sistemas de cores prontos que mostram estes grifos. */
export const SISTEMA_ESSENCIAIS = "essenciais";
export const SISTEMA_GERAL = "geral";

/** Uma entrada de content/grifos/*.yaml. */
export interface EntradaGrifo {
  cor: CorGrifo;
  /** o subtítulo da lista (nas teses: preliminares, principais ou subsidiárias) */
  grupo: string;
  /** o assunto: entradas com o mesmo tema em dispositivos diferentes ganham um "vide" uma para a outra */
  tema: string;
  lei: string;
  disp: string;
  /** os trechos exatos do texto do dispositivo que são grifados (maiúsculas e acentos não importam) */
  palavras: string[];
  nota?: string;
}
/** Um "vide" de um grifo pronto: o outro dispositivo com o mesmo tema. */
export interface VideGrifo {
  lei: string;
  disp: string;
  /** "CPP, art. 310, I", "Súmula 700 do STF" */
  rotulo: string;
}
/** Um grifo pronto como sai em grifos.json. */
export interface GrifoPronto extends EntradaGrifo {
  /** o dispositivo já foi citado em prova (peça, discursivas ou objetivas): entra no sistema "Essenciais" */
  essencial: boolean;
  vide: VideGrifo[];
}

/**
 * Os grifos de grifos.json. O arquivo antigo (um objeto por sistema) ou um arquivo vazio dão uma lista vazia: o leitor
 * continua funcionando, só sem grifos prontos, até o conteúdo ser gerado de novo.
 */
export const grifosDoJson = (json: unknown): GrifoPronto[] => (Array.isArray(json) ? (json as GrifoPronto[]) : []);

/** Os grifos que o sistema (o id do pronto de onde ele vem) mostra, de uma lei: todos no "Geral", os essenciais no "Essenciais". */
export function grifosDoSistema(grifos: readonly GrifoPronto[], sistema: string, lei?: string): GrifoPronto[] {
  if (sistema !== SISTEMA_ESSENCIAIS && sistema !== SISTEMA_GERAL) return [];
  return grifos.filter((g) => (sistema === SISTEMA_GERAL || g.essencial) && (lei === undefined || g.lei === lei));
}

// ---------- palavras no texto ----------

// troca de um caractere por um (o tamanho do texto não muda): as posições achadas valem no texto original
const DOBRAS: Record<string, string> = {
  "º": "o",
  "ª": "a",
  "°": "o",
  "“": '"',
  "”": '"',
  "„": '"',
  "‘": "'",
  "’": "'",
  "–": "-",
  "—": "-",
  "‑": "-",
  " ": " ",
};
const dobrasFeitas = new Map<string, string>();
/** O texto em minúsculas, sem acentos e com as aspas, os travessões e o "º" simplificados, com o mesmo tamanho. */
export function dobrar(texto: string): string {
  let s = "";
  for (let k = 0; k < texto.length; k++) {
    const c = texto[k]!;
    const n = c.charCodeAt(0);
    if (n < 128) {
      s += n >= 65 && n <= 90 ? String.fromCharCode(n + 32) : c;
      continue;
    }
    let d = dobrasFeitas.get(c);
    if (d === undefined) {
      d = DOBRAS[c] ?? (c.toLowerCase().normalize("NFD")[0] || c);
      dobrasFeitas.set(c, d);
    }
    s += d;
  }
  return s;
}

const letraOuNumero = (c: string | undefined) => !!c && /[\p{L}\p{N}]/u.test(c);
const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Onde a palavra (ou o trecho) aparece no texto: [início, fim) da primeira ocorrência. Maiúsculas, acentos e o tamanho
 * dos espaços não importam. Uma ocorrência com a palavra inteira (sem letra colada antes ou depois) vem antes de uma
 * que só está dentro de outra palavra ("pena" acha "pena", não "penal", se houver as duas).
 */
export function acharPalavra(texto: string, palavra: string): [number, number] | null {
  const partes = dobrar(palavra.trim()).split(/\s+/).filter(Boolean);
  if (!partes.length) return null;
  const t = dobrar(texto);
  const re = new RegExp(partes.map(escapar).join("\\s+"), "g");
  let solta: [number, number] | null = null;
  for (let m = re.exec(t); m; m = re.exec(t)) {
    const ini = m.index;
    const fim = ini + m[0].length;
    const inteira = (!letraOuNumero(t[ini - 1]) || !letraOuNumero(t[ini])) && (!letraOuNumero(t[fim]) || !letraOuNumero(t[fim - 1]));
    if (inteira) return [ini, fim];
    solta ??= [ini, fim];
  }
  return solta;
}

/** Um bloco do texto da lei, no que os grifos prontos precisam: o dispositivo, se é texto superado, o texto e o tipo. */
export interface BlocoDoGrifo {
  disp?: string;
  superada?: boolean;
  texto?: string;
  tipo?: string;
}
/** Um pedaço grifado de um bloco: [ini, fim) no texto do bloco e os grifos que o cobrem (índices na lista de grifos). */
export interface FaixaPronta {
  ini: number;
  fim: number;
  grifos: number[];
}
/** O que o leitor pinta num bloco: os pedaços grifados e os "vide" que vêm depois do texto. */
export interface PinturaBloco {
  faixas: FaixaPronta[];
  vide: VideGrifo[];
}

/** Os índices dos blocos vigentes do dispositivo (o próprio, depois os que ficam dentro dele, na ordem do texto). */
function blocosDoDispositivo(blocos: readonly BlocoDoGrifo[], disp: string): { proprios: number[]; dentro: number[] } {
  const proprios: number[] = [];
  const dentro: number[] = [];
  blocos.forEach((b, i) => {
    if (!b.disp || b.superada) return;
    if (b.disp === disp) proprios.push(i);
    else if (b.disp.startsWith(`${disp}.`)) dentro.push(i);
  });
  return { proprios, dentro };
}

/** Corta os trechos (que podem se sobrepor) em pedaços sem sobreposição, cada um com os grifos que o cobrem. */
export function fatiarFaixas(trechos: readonly { ini: number; fim: number; grifo: number }[]): FaixaPronta[] {
  const cortes = [...new Set(trechos.flatMap((t) => [t.ini, t.fim]))].sort((a, b) => a - b);
  const saida: FaixaPronta[] = [];
  for (let k = 0; k + 1 < cortes.length; k++) {
    const ini = cortes[k]!;
    const fim = cortes[k + 1]!;
    const grifos = [...new Set(trechos.filter((t) => t.ini <= ini && fim <= t.fim).map((t) => t.grifo))].sort((a, b) => a - b);
    if (grifos.length) saida.push({ ini, fim, grifos });
  }
  return saida;
}

/**
 * Onde cada grifo pronto cai no texto de uma lei: bloco → pedaços grifados e "vide". Cada palavra é procurada primeiro no
 * próprio dispositivo e, se não estiver lá, dentro dele (o art. 386 acha as palavras dos incisos). Só o texto vigente
 * recebe. O "vide" fica no bloco do próprio dispositivo (o primeiro que não é rubrica), sem repetir o mesmo destino.
 * `grifos` são os da lei e do sistema; os índices das faixas são nesta lista.
 */
export function prontosDosBlocos(blocos: readonly BlocoDoGrifo[], grifos: readonly GrifoPronto[]): Map<number, PinturaBloco> {
  const trechos = new Map<number, { ini: number; fim: number; grifo: number }[]>();
  const vides = new Map<number, VideGrifo[]>();
  grifos.forEach((g, k) => {
    const { proprios, dentro } = blocosDoDispositivo(blocos, g.disp);
    for (const p of g.palavras) {
      for (const i of [...proprios, ...dentro]) {
        const achado = acharPalavra(blocos[i]!.texto ?? "", p);
        if (!achado) continue;
        trechos.set(i, [...(trechos.get(i) ?? []), { ini: achado[0], fim: achado[1], grifo: k }]);
        break;
      }
    }
    const ondeVide = proprios.find((i) => blocos[i]!.tipo !== "texto") ?? proprios[0];
    if (ondeVide === undefined || !g.vide.length) return;
    const lista = vides.get(ondeVide) ?? [];
    for (const v of g.vide) if (!lista.some((x) => x.lei === v.lei && x.disp === v.disp)) lista.push(v);
    vides.set(ondeVide, lista);
  });
  const saida = new Map<number, PinturaBloco>();
  for (const i of [...new Set([...trechos.keys(), ...vides.keys()])].sort((a, b) => a - b))
    saida.set(i, { faixas: fatiarFaixas(trechos.get(i) ?? []), vide: vides.get(i) ?? [] });
  return saida;
}

/**
 * Os blocos que o filtro "Mostrar somente grifos automáticos" mostra: o dispositivo de cada grifo, com o que fica dentro
 * dele (o art. 386 com os incisos), só o texto vigente.
 */
export function blocosComProntos(blocos: readonly BlocoDoGrifo[], grifos: readonly GrifoPronto[]): Set<number> {
  const saida = new Set<number>();
  for (const g of grifos) {
    const { proprios, dentro } = blocosDoDispositivo(blocos, g.disp);
    for (const i of [...proprios, ...dentro]) saida.add(i);
  }
  return saida;
}

/** O grifo pronto está no artigo (o id do artigo, "art5", ou da súmula, "s-145")? */
export const noArtigo = (g: Pick<GrifoPronto, "disp">, artigo: string) => g.disp === artigo || g.disp.startsWith(`${artigo}.`);

/**
 * Como um pedaço grifado aparece: o fundo (marca-texto) é a cor do primeiro grifo de Peças, Teses ou Súmulas que o cobre;
 * o sublinhado, a do grifo de Pedidos. `corDe` dá a cor de cada grifo no sistema.
 */
export function aparenciaDaFaixa(f: FaixaPronta, grifos: readonly GrifoPronto[], corDe: (g: GrifoPronto) => string | undefined): { fundo?: string; linha?: string } {
  const doTipo = (pedido: boolean) =>
    f.grifos
      .map((k) => grifos[k]!)
      .filter((g) => (g.cor === "pedidos") === pedido)
      .sort((a, b) => CORES_GRIFO.indexOf(a.cor) - CORES_GRIFO.indexOf(b.cor))
      .map(corDe)
      .find(Boolean);
  const fundo = doTipo(false);
  const linha = doTipo(true);
  return { ...(fundo ? { fundo } : {}), ...(linha ? { linha } : {}) };
}

/**
 * O texto do título (ao passar o mouse) de um grifo pronto: "Teses · Principais — Absolvição (nota)". O grupo só aparece
 * nas teses e nas súmulas (nas peças e nos pedidos ele é o nome da lei, que já está na página).
 */
export function tituloDoGrifo(g: Pick<GrifoPronto, "cor" | "grupo" | "tema" | "nota">, rotulo = ROTULO_DA_COR[g.cor]): string {
  const grupo = g.grupo && (g.cor === "teses" || g.cor === "sumulas") ? ` · ${nomeDoGrupo(g.grupo)}` : "";
  return `${rotulo}${grupo} — ${g.tema}${g.nota ? ` (${g.nota})` : ""}`;
}

/** Um pedaço grifado pronto para desenhar: o fundo (marca-texto) e/ou o sublinhado, e o que o título e o cartão mostram. */
export interface FaixaVisivel {
  ini: number;
  fim: number;
  fundo?: string;
  linha?: string;
  /** um título por grifo que cobre o pedaço ("Teses · Principais — Absolvição") */
  titulos: string[];
  notas: string[];
  /** algum dos grifos já caiu em prova */
  essencial: boolean;
}

/**
 * Os pedaços de um bloco com a aparência e os textos de cada um, no sistema dado: `corDe` dá a cor do grifo (sem cor,
 * o pedaço só fica se outro grifo o pinta) e `rotuloDe` o nome da cor no sistema (num sistema copiado, o que o usuário deu).
 */
export function faixasVisiveis(
  p: PinturaBloco,
  grifos: readonly GrifoPronto[],
  corDe: (g: GrifoPronto) => string | undefined,
  rotuloDe: (g: GrifoPronto) => string = (g) => ROTULO_DA_COR[g.cor],
): FaixaVisivel[] {
  const saida: FaixaVisivel[] = [];
  for (const f of p.faixas) {
    const { fundo, linha } = aparenciaDaFaixa(f, grifos, corDe);
    if (!fundo && !linha) continue;
    const dele = f.grifos.map((k) => grifos[k]!).filter((g) => corDe(g));
    saida.push({
      ini: f.ini,
      fim: f.fim,
      ...(fundo ? { fundo } : {}),
      ...(linha ? { linha } : {}),
      titulos: [...new Set(dele.map((g) => tituloDoGrifo({ ...g, nota: undefined }, rotuloDe(g))))],
      notas: [...new Set(dele.flatMap((g) => (g.nota ? [g.nota] : [])))],
      essencial: dele.some((g) => g.essencial),
    });
  }
  return saida;
}
