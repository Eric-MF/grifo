// O artigo para a prévia (pop-up): os blocos vigentes dele e o HTML com os mesmos links do leitor. Baixa só a parte da
// lei em que o artigo está (leis divididas) e guarda o resultado, então voltar a uma prévia já vista é imediato.
import { carregarArtigos, carregarLei, carregarManifesto, carregarParte, carregarVersoes } from "./dados";
import { contextoDaLei, htmlBlocos, htmlComContexto, type Classes } from "./html";
import { textoAtual, type Bloco } from "./linha-do-tempo";

export interface ArtigoPrevia {
  nome: string;
  /** HTML dos blocos do artigo: um elemento por bloco, na ordem de `blocos` */
  html: string;
  blocos: Bloco[];
  /** o artigo não está mais em vigor: mostra a última redação dele */
  revogado?: boolean;
}

const doArtigo = (disp: string | undefined, art: string) => !!disp && (disp === art || disp.startsWith(`${art}.`));

async function montar(lei: string, art: string, original: boolean, c: Classes): Promise<ArtigoPrevia | null> {
  const [manifesto, lista] = await Promise.all([carregarManifesto(lei), carregarArtigos(lei, original)]);
  const parte = manifesto.partes?.find((p) => p.artigos?.includes(art));
  const blocos = parte ? await carregarParte(parte, original) : (await carregarLei(lei, original)).blocos;
  const ctx = contextoDaLei(blocos, lei);
  // Todos os artigos da lei contam para os links (a parte baixada pode não ter o artigo citado). O índice -1 faz o HTML
  // sair sem âncoras (id): a prévia fica na mesma página que o texto da lei, e os ids não podem se repetir.
  const ancoras = new Map<string, number>([...[...ctx.ancoras.keys()].map((k) => [k, -1] as const), ...lista.artigos.map((a) => [a[0], -1] as const)]);
  const indices = textoAtual(blocos)
    .filter((x) => doArtigo(x.bloco.disp, art))
    .map((x) => x.i);
  if (indices.length) {
    return {
      nome: manifesto.nome,
      html: indices.map((i) => htmlComContexto({ ...ctx, ancoras }, blocos, i, i + 1, lei, manifesto.url, c)).join(""),
      blocos: indices.map((i) => blocos[i]!),
    };
  }
  // artigo revogado não entra no texto em vigor: a última redação dele fica nas versões superadas
  const versoes = await carregarVersoes(lei, original).catch(() => null);
  const trocas = versoes
    ? Object.entries(versoes)
        .map(([k, b]) => [Number(k), b] as const)
        .sort((x, y) => x[0] - y[0])
        .filter(([, b]) => doArtigo(b.disp, art))
    : [];
  const cabeca = trocas.reduce((ultimo, [, b], k) => (b.tipo === "artigo" ? k : ultimo), -1);
  const ultima = cabeca < 0 ? [] : trocas.slice(cabeca).map(([, b]) => ({ ...b, superada: false }));
  if (!ultima.length) return null;
  return { nome: manifesto.nome, html: htmlBlocos(ultima, 0, ultima.length, lei, manifesto.url, ancoras, c), blocos: ultima, revogado: true };
}

const prontos = new Map<string, Promise<ArtigoPrevia | null>>();
/** O artigo `art` da lei `lei` na forma pedida (redação original ou corrigida); null se a lei não tem o artigo. */
export function artigoParaPrevia(lei: string, art: string, original: boolean, c: Classes): Promise<ArtigoPrevia | null> {
  const chave = `${lei}|${art}|${original ? 1 : 0}`;
  if (!prontos.has(chave)) {
    const p = montar(lei, art, original, c);
    prontos.set(chave, p);
    p.catch(() => prontos.delete(chave));
  }
  return prontos.get(chave)!;
}
