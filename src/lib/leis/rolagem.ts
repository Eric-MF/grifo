// Slide lateral de artigos. O modo depende de onde o dedo está na tela: o terço da esquerda vai só
// pelos grifos, o do meio anda artigo a artigo e o da direita acompanha o dedo.

export type Modo = "rapido" | "fino" | "marcas";

export const PX_POR_ARTIGO_FINO = 14;
export const PX_POR_MARCA = 36;

const limitar = (k: number, total: number) => Math.max(0, Math.min(total - 1, k));

/** Terços da largura da tela, da esquerda para a direita. Sem grifos, a tela tem só duas metades. */
export function modoPorPosicao(x: number, largura: number, temPontos: boolean): Modo {
  const f = Math.max(0, Math.min(0.9999, x / Math.max(1, largura)));
  if (!temPontos) return f < 0.5 ? "fino" : "rapido";
  if (f < 1 / 3) return "marcas";
  return f < 2 / 3 ? "fino" : "rapido";
}

/** Índice fracionário depois de mover `dy` px: no rápido, 1:1 com a altura do trilho; no fino, um artigo a cada 14 px. */
export function mover(k: number, dy: number, modo: "rapido" | "fino", total: number, altura: number): number {
  const ganho = modo === "fino" ? 1 / PX_POR_ARTIGO_FINO : (total - 1) / Math.max(1, altura);
  return limitar(k + dy * ganho, total);
}

export function indicePorPosicao(y: number, altura: number, total: number): number {
  return Math.round(limitar((y / Math.max(1, altura)) * (total - 1), total));
}

/** Próximo ponto (ordenado) depois de `k` na direção `dir`; nas pontas, fica no último. */
export function proximoPonto(pontos: number[], k: number, dir: number): number {
  if (!pontos.length) return k;
  if (dir > 0) return pontos.find((p) => p > k) ?? pontos[pontos.length - 1];
  for (let i = pontos.length - 1; i >= 0; i--) if (pontos[i] < k) return pontos[i];
  return pontos[0];
}

/** Ponto mais próximo de `k` a até `raio` artigos, ou null. */
export function imantar(k: number, pontos: number[], raio: number): number | null {
  let melhor: number | null = null;
  for (const p of pontos) if (Math.abs(p - k) <= raio && (melhor === null || Math.abs(p - k) < Math.abs(melhor - k))) melhor = p;
  return melhor;
}

const DIVISAO = /^(PARTE|LIVRO|T[ÍI]TULO|CAP[ÍI]TULO|SE[ÇC][ÃA]O|SUBSE[ÇC][ÃA]O)\b/i;
const NIVEIS = ["PARTE", "LIVRO", "TITULO", "CAPITULO", "SECAO", "SUBSECAO"];
/** O texto abre uma divisão da lei ("TÍTULO II", "CAPÍTULO I", "Seção III"…). */
export const ehDivisao = (texto: string) => DIVISAO.test(texto.trim());
const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
const rotular = (s: string) => {
  const [p, ...resto] = s.trim().split(/\s+/);
  return [p.charAt(0) + p.slice(1).toLowerCase(), ...resto].join(" ");
};
const frase = (s: string) => {
  const t = s.trim().toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

interface Cabecalho {
  nivel: number;
  rotulo: string;
  nome: string;
  /** primeiro artigo da divisão */
  k?: number;
}

interface BlocoEstrutura {
  tipo: string;
  disp?: string;
  texto: string;
  superada: boolean;
}

/**
 * Para cada artigo, a divisão em que ele está ("Título II › Capítulo I · Da prisão em flagrante"),
 * onde começa cada divisão principal (Parte, Livro, Título) para marcar no trilho, e a lista de
 * divisões com o primeiro artigo de cada uma.
 */
export function secoesDosArtigos(blocos: BlocoEstrutura[], artigos: [string, ...unknown[]][]) {
  const indice = new Map(artigos.map((a, k) => [a[0], k]));
  const pilha: (Cabecalho | undefined)[] = [];
  let ultimo = -1;
  // o Planalto quebra nomes longos em parágrafos seguidos: junta até o próximo bloco que não é estrutura
  let continua = false;
  let marcoPendente: string | null = null;
  let semArtigo: Cabecalho[] = [];
  const cabecalhos: Cabecalho[] = [];
  const secoes: string[] = new Array(artigos.length).fill("");
  const marcos: { k: number; rotulo: string }[] = [];
  for (const b of blocos) {
    if (b.superada) continue;
    if (b.tipo === "estrutura") {
      const m = DIVISAO.exec(b.texto.trim());
      if (m) {
        const nivel = NIVEIS.indexOf(semAcento(m[1]));
        pilha.length = nivel;
        const cab: Cabecalho = { nivel, rotulo: rotular(b.texto), nome: "" };
        pilha[nivel] = cab;
        cabecalhos.push(cab);
        semArtigo.push(cab);
        ultimo = nivel;
        continua = true;
        if (nivel <= 2) marcoPendente = cab.rotulo;
      } else if (continua && pilha[ultimo]) {
        const p = pilha[ultimo]!;
        p.nome = p.nome ? `${p.nome} ${b.texto.trim()}` : b.texto.trim();
      }
      continue;
    }
    continua = false;
    if (b.tipo !== "artigo" || !b.disp) continue;
    const k = indice.get(b.disp);
    if (k === undefined) continue;
    for (const cab of semArtigo) cab.k ??= k;
    semArtigo = [];
    const niveis = pilha.filter((p): p is Cabecalho => !!p);
    const fundo = niveis.at(-1);
    if (fundo) {
      const pai = niveis.length > 1 ? `${niveis.at(-2)!.rotulo} › ` : "";
      secoes[k] = `${pai}${fundo.rotulo}${fundo.nome ? ` · ${frase(fundo.nome)}` : ""}`;
    }
    if (marcoPendente) {
      if (marcos.at(-1)?.k !== k) marcos.push({ k, rotulo: marcoPendente });
      marcoPendente = null;
    }
  }
  const divisoes = cabecalhos
    .filter((c): c is Cabecalho & { k: number } => c.k !== undefined)
    .map((c) => ({ k: c.k, nivel: c.nivel, rotulo: c.nome ? `${c.rotulo} · ${frase(c.nome)}` : c.rotulo }));
  return { secoes, marcos, divisoes };
}
