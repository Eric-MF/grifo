// Marcas de pessoa nas questões tiradas das provas: no build, cada pessoa vira {p1}, {p2}…, e a tela troca a marca
// por um nome da mitologia, do mesmo gênero (src/quiz/nomes.ts). Quem é pessoa sai de content/nomes-pessoas.yaml.
//
// Numa questão, a mesma pessoa tem sempre a mesma marca, onde quer que apareça: no caso, no comando, nas alternativas,
// no padrão de respostas e nos termos da correção. A {p1} é o cliente (de quem o advogado é), quando o texto diz; as
// outras seguem a ordem em que aparecem. A alternativa errada que veio de outra prova traz pessoas de outra história:
// elas viram as pessoas desta questão, do mesmo gênero, para a alternativa parecer desta questão.

export type Genero = "m" | "f";

export interface DicionarioPessoas {
  masculinos: string[];
  femininos: string[];
  sobrenomes: string[];
  antes_de_lugar: string[];
  expressoes: string[];
  nao_pessoas?: string[];
}

/** Uma pessoa achada num texto: o trecho inteiro ("Maria Campos") e a chave (o primeiro nome, "Maria"). */
export interface Achado {
  inicio: number;
  fim: number;
  chave: string;
  genero: Genero;
}

const LETRA = "A-Za-zÀ-ÖØ-öø-ÿ";
const escapar = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const semAcento = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
const porTamanho = (a: string, b: string) => b.length - a.length;
// "Comarca de", "cidade de": o nome que vem depois é de lugar
const LUGAR_ANTES = /(?<![A-Za-zÀ-ÿ])(?:comarca|cidades?|munic[íi]pio|bairro|distrito|regi[ãa]o|rua|avenida|pra[çc]a|estado|capital|localidade)\s+(?:de|da|do)\s+$/i;

export interface LeitorDePessoas {
  achar(texto: string): Achado[];
}

export function criarLeitor(d: DicionarioPessoas): LeitorDePessoas {
  const genero = new Map<string, Genero>([...d.masculinos.map((n) => [n, "m"] as const), ...d.femininos.map((n) => [n, "f"] as const)]);
  const primeiros = [...genero.keys()].sort(porTamanho).map(escapar).join("|");
  const seguintes = [...genero.keys(), ...d.sobrenomes].sort(porTamanho).map(escapar).join("|");
  // o nome e o que continua a pessoa: outros nomes e sobrenomes, com "da/de/do/dos/das" no meio
  const pessoa = new RegExp(
    `(?<![${LETRA}])(${primeiros})(?![${LETRA}])((?:[ \\t]+(?:(?:da|de|do|dos|das)[ \\t]+)?(?:${seguintes})(?![${LETRA}]))*)`,
    "g",
  );
  const lugar = new Set(d.antes_de_lugar);
  return {
    achar(texto) {
      const achados: Achado[] = [];
      for (const m of texto.matchAll(pessoa)) {
        const inicio = m.index ?? 0;
        if (d.expressoes.some((e) => texto.startsWith(e, inicio))) continue;
        const antes = texto.slice(Math.max(0, inicio - 40), inicio);
        const palavra = antes.match(/([A-Za-zÀ-ÿ]+)\.?\s+$/)?.[1];
        if ((palavra && lugar.has(palavra)) || LUGAR_ANTES.test(antes)) continue;
        achados.push({ inicio, fim: inicio + m[0].length, chave: m[1]!, genero: genero.get(m[1]!)! });
      }
      return achados;
    },
  };
}

// o cliente: "advogado(a) de X", "constituído por X", "em favor de X", "defesa de X", "X procura você"
const CLIENTE_ANTES = [
  /(?:advogad[oa]|defensor[a]?|procurador[a]?)(?:\(a\))?(?:\s+(?:constitu[íi]d[oa]|contratad[oa]|particular)(?:\(a\))?)?\s+(?:de|do|da|por)\s+$/i,
  /(?:defesa(?:\s+t[ée]cnica)?|em\s+favor|em\s+defesa|defender|representar)\s+(?:de|do|da)?\s*$/i,
  /constitu[íi]d[oa](?:\(a\))?\s+por\s+$/i,
  /\bcliente,?\s+$/i,
];
const CLIENTE_DEPOIS = /^[^.]{0,80}?\b(?:procura|procurou|contrata|contratou|procuram|procuraram)\s+(?:voc[êe]|seus\s+servi[çc]os|o\(a\)\s+advogad|um\(a\)\s+advogad|um\s+advogad|advogad)/i;

function cliente(texto: string, achados: Achado[]): string | null {
  for (const a of achados) {
    const antes = texto.slice(Math.max(0, a.inicio - 60), a.inicio);
    if (CLIENTE_ANTES.some((re) => re.test(antes)) || CLIENTE_DEPOIS.test(texto.slice(a.fim))) return a.chave;
  }
  return null;
}

type Modo = "proprio" | "alheio" | "termo";
interface Texto {
  modo: Modo;
  valor: string;
  trocar: (novo: string) => void;
}

// campos que não são texto da questão
const FORA = new Set(["id", "fonte", "formato", "categorias", "secao", "revisao", "revisado", "peca", "distratores", "fundamentos", "dispositivos", "n", "correta", "disciplina", "pessoas"]);

/** Os textos da questão, com o modo de cada um: da própria história, de outra prova (alternativa errada) ou termo da correção. */
function textosDe(raiz: Record<string, unknown>): Texto[] {
  const saida: Texto[] = [];
  const visitar = (pai: Record<string, unknown> | unknown[], chave: string | number, modo: Modo, dentroDeComponente: boolean) => {
    const v = (pai as Record<string | number, unknown>)[chave];
    if (typeof v === "string") {
      // a expressão regular de um termo ("re:…") fica como está
      if (!(modo === "termo" && v.startsWith("re:"))) saida.push({ modo, valor: v, trocar: (novo) => ((pai as Record<string | number, unknown>)[chave] = novo) });
      return;
    }
    if (Array.isArray(v)) v.forEach((_, i) => visitar(v, i, modo, dentroDeComponente));
    else if (v && typeof v === "object") campos(v as Record<string, unknown>, Object.keys(v), modo, dentroDeComponente);
  };
  const campos = (o: Record<string, unknown>, chaves: string[], modo: Modo, dentroDeComponente: boolean) => {
    for (const k of chaves) {
      if (FORA.has(k) || !(k in o)) continue;
      if (k === "opcoes" && Array.isArray(o[k])) {
        // a alternativa errada pode ser de outra prova; a certa é desta
        for (const op of o[k] as { correta?: boolean }[]) visitar(op as Record<string, unknown>, "texto", op.correta ? modo : "alheio", false);
        continue;
      }
      const componente = dentroDeComponente || k === "componentes";
      visitar(o, k, componente && (k === "termos" || k === "alternativas") ? "termo" : modo, componente);
    }
  };
  // o caso e o comando primeiro: a ordem das marcas segue o enunciado
  campos(raiz, ["caso", "comando", ...Object.keys(raiz).filter((k) => k !== "caso" && k !== "comando")], "proprio", false);
  return saida;
}

function substituir(texto: string, achados: Achado[], marca: (a: Achado) => string): string {
  let saida = "";
  let ultimo = 0;
  for (const a of achados) {
    saida += texto.slice(ultimo, a.inicio) + marca(a);
    ultimo = a.fim;
  }
  return saida + texto.slice(ultimo);
}

/** O que a marcação fez numa questão (para o relatório do build). */
export interface Marcacao {
  /** as pessoas da questão, na ordem das marcas: o nome da prova e o gênero */
  pessoas: { chave: string; genero: Genero; cliente?: true }[];
  /** nomes de outra prova, nas alternativas erradas, e a marca que receberam */
  alheios: { chave: string; marca: string }[];
  /** o mesmo primeiro nome com sobrenomes diferentes ("João Silva" e "João Souza"): podem ser duas pessoas */
  conflitos: string[][];
}

/**
 * Troca as pessoas da questão por marcas e devolve a questão com `pessoas` (o gênero de cada marca, na ordem).
 * A questão sem pessoas volta igual. Não altera o objeto recebido.
 */
export function marcarPessoas<T extends Record<string, unknown>>(questao: T, leitor: LeitorDePessoas): { questao: T & { pessoas?: Genero[] }; marcacao: Marcacao } {
  const copia = structuredClone(questao) as T & { pessoas?: Genero[] };
  const textos = textosDe(copia);
  const achadosDe = textos.map((t) => (t.modo === "termo" ? [] : leitor.achar(t.valor)));

  // as pessoas da história: as dos textos próprios
  const proprias = new Map<string, Genero>();
  const formas = new Map<string, Set<string>>();
  textos.forEach((t, i) => {
    if (t.modo !== "proprio") return;
    for (const a of achadosDe[i]!) {
      if (!proprias.has(a.chave)) proprias.set(a.chave, a.genero);
      // "João dos Santos" e "João Santos" são a mesma forma
      const resto = t.valor.slice(a.inicio + a.chave.length, a.fim).replace(/(?<![A-Za-zÀ-ÿ])(?:da|de|do|dos|das)(?![A-Za-zÀ-ÿ])/g, "").replace(/\s+/g, " ").trim();
      if (resto) (formas.get(a.chave) ?? formas.set(a.chave, new Set()).get(a.chave)!).add(`${a.chave} ${resto}`);
    }
  });
  const conflitos = [...formas.values()].filter((f) => f.size > 1).map((f) => [...f]);
  const enunciado = textos.filter((t) => t.modo === "proprio").slice(0, 2);
  const doCliente = enunciado.map((t) => cliente(t.valor, leitor.achar(t.valor))).find(Boolean) ?? null;
  const ordem = [...proprias.keys()].sort((a, b) => (a === doCliente ? -1 : b === doCliente ? 1 : 0));
  const pessoas: Marcacao["pessoas"] = ordem.map((chave) => ({ chave, genero: proprias.get(chave)!, ...(chave === doCliente ? { cliente: true as const } : {}) }));
  const indice = new Map(ordem.map((c, i) => [c, i]));
  const alheios: Marcacao["alheios"] = [];
  const marca = (i: number) => `{p${i + 1}}`;

  textos.forEach((t, k) => {
    if (t.modo === "termo") {
      // os termos da correção estão em minúsculas e sem acento: "leila | menor"
      let novo = t.valor;
      for (const [chave, i] of indice) novo = novo.replace(new RegExp(`(?<![a-z0-9])(?<!sao |santa |santo )${escapar(semAcento(chave))}(?![a-z0-9])`, "g"), marca(i));
      if (novo !== t.valor) t.trocar(novo);
      return;
    }
    const achados = achadosDe[k]!;
    if (!achados.length) return;
    // na alternativa de outra prova, cada pessoa desconhecida vira uma pessoa desta questão do mesmo gênero, ainda não
    // citada na alternativa; se faltar, uma pessoa nova
    const local = new Map<string, number>();
    const usadas = new Set(achados.flatMap((a) => (indice.has(a.chave) ? [indice.get(a.chave)!] : [])));
    for (const a of achados) {
      // as pessoas dos textos próprios já estão todas no índice: só a alternativa de outra prova chega aqui
      if (indice.has(a.chave) || local.has(a.chave)) continue;
      let i = pessoas.findIndex((p, j) => p.genero === a.genero && !usadas.has(j));
      if (i < 0) {
        i = pessoas.length;
        pessoas.push({ chave: a.chave, genero: a.genero });
      }
      usadas.add(i);
      local.set(a.chave, i);
      alheios.push({ chave: a.chave, marca: marca(i) });
    }
    t.trocar(substituir(t.valor, achados, (a) => marca(indice.get(a.chave) ?? local.get(a.chave)!)));
  });

  if (pessoas.length) copia.pessoas = pessoas.map((p) => p.genero);
  return { questao: copia, marcacao: { pessoas, alheios, conflitos } };
}

/**
 * Palavras com maiúscula no meio da frase que nunca aparecem em minúscula nos textos (nome próprio) e não estão em
 * nenhuma lista do dicionário: podem ser pessoas que faltam em content/nomes-pessoas.yaml.
 */
export function nomesDesconhecidos(textos: string[], d: DicionarioPessoas): string[] {
  const conhecidos = new Set([...d.masculinos, ...d.femininos, ...d.sobrenomes, ...d.antes_de_lugar, ...(d.nao_pessoas ?? [])]);
  const minusculas = new Set<string>();
  const candidatos = new Set<string>();
  for (const t of textos) {
    for (const m of t.matchAll(/[A-Za-zÀ-ÿ]+/g)) if (/^[a-zà-ÿ]+$/.test(m[0])) minusculas.add(m[0]);
    for (const m of t.matchAll(/(?<=[a-zà-ÿ,]\s)[A-ZÀ-Ý][a-zà-ÿ]{2,}(?![A-Za-zÀ-ÿ])/g)) candidatos.add(m[0]);
  }
  return [...candidatos].filter((c) => !conhecidos.has(c) && !minusculas.has(c.toLowerCase())).sort();
}
