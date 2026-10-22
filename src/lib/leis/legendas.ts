// Sistemas de cores das marcações: cada cor tem um significado. Dois prontos e os do usuário.
import { gravarJSON, lerJSON } from "@/lib/storage";
import type { GrifosProntos } from "./grifos";

export interface CorLegenda {
  cor: string;
  rotulo: string;
  /** o rótulo do grifo pronto que esta cor pinta, nos sistemas copiados de um pronto; sem `origem`, vale o próprio rótulo */
  origem?: string;
}
export interface Sistema {
  id: string;
  nome: string;
  cores: CorLegenda[];
  /** o sistema pronto ("materias" ou "teses") cujos grifos prontos este sistema mostra, quando foi copiado dele */
  base?: string;
}

const AMARELO = "#fde047";
const VERDE = "#86efac";
const AZUL = "#93c5fd";
const ROSA = "#f9a8d4";
const VERMELHO = "#fca5a5";
const ROXO = "#c4b5fd";

// Cores extras, para os sistemas com mais de seis significados
const PALETA_EXTRA = ["#fdba74", "#5eead4", "#bef264", "#67e8f9", "#a5b4fc", "#fda4af", "#d8b4fe", "#fde68a"];

const hexDeHsl = (h: number, s: number, l: number) => {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const canal = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, "0");
  };
  return `#${canal(0)}${canal(8)}${canal(4)}`;
};

/**
 * Cor para um "+ cor" do sistema: a primeira da paleta que ainda não está no sistema. Esgotada a paleta,
 * tons novos girando pelo círculo cromático (ângulo áureo), de modo que cada cor acrescentada é diferente.
 */
export function novaCorPara(usadas: string[]): string {
  const emUso = new Set(usadas.map((c) => c.toLowerCase()));
  const livre = [AMARELO, VERDE, AZUL, ROSA, VERMELHO, ROXO, ...PALETA_EXTRA].find((c) => !emUso.has(c));
  if (livre) return livre;
  for (let k = 0; ; k++) {
    const cor = hexDeHsl((k * 137.508) % 360, 80, 75);
    if (!emUso.has(cor)) return cor;
  }
}

export const SISTEMAS_PRONTOS: Sistema[] = [
  {
    id: "materias",
    nome: "Matérias",
    cores: [
      { cor: AMARELO, rotulo: "Competência" },
      { cor: VERDE, rotulo: "Recursos" },
      { cor: AZUL, rotulo: "Procedimentos" },
      { cor: ROSA, rotulo: "Direitos fundamentais" },
    ],
  },
  {
    id: "teses",
    nome: "Teses da peça",
    cores: [
      { cor: AZUL, rotulo: "Competência" },
      { cor: VERDE, rotulo: "Teses preliminares" },
      { cor: AMARELO, rotulo: "Teses principais" },
      { cor: VERMELHO, rotulo: "Teses subsidiárias" },
      { cor: ROXO, rotulo: "Pedidos acessórios" },
    ],
  },
];

export interface Estado {
  ativo: string;
  meus: Sistema[];
  /** o sistema que o usuário escolheu em cada lei (id da lei → id do sistema); sem escolha, vale o padrão da lei */
  porLei: Record<string, string>;
}
const K = "grifo:legendas";
/** Cores de um sistema sem repetição: a primeira ocorrência fica; as repetidas ganham uma cor nova. */
export function corUnicas(cores: CorLegenda[]): CorLegenda[] {
  const vistas = new Set<string>();
  return cores.map((c) => {
    const chave = c.cor.toLowerCase();
    if (!vistas.has(chave)) {
      vistas.add(chave);
      return c;
    }
    const nova = novaCorPara([...vistas]);
    vistas.add(nova);
    return { ...c, cor: nova };
  });
}

// Sistemas salvos antes de a repetição ser proibida podem ter cores repetidas: corrigidas ao carregar.
export const lerLegendas = (): Estado => {
  const e = lerJSON<Estado>(K, { ativo: "materias", meus: [], porLei: {} });
  return { ...e, porLei: e.porLei ?? {}, meus: e.meus.map((s) => ({ ...s, cores: corUnicas(s.cores) })) };
};
export const gravarLegendas = (e: Estado) => gravarJSON(K, e);
export const todosSistemas = (e: Estado) => [...SISTEMAS_PRONTOS, ...e.meus];
export const sistemaAtivo = (e: Estado) => todosSistemas(e).find((s) => s.id === e.ativo) ?? SISTEMAS_PRONTOS[0];
/** O sistema de uma lei: a escolha do usuário nela, senão o `padrao` (o da lei, ou o ativo). */
export function sistemaDaLei(e: Estado, lei: string, padrao: string): Sistema {
  const todos = todosSistemas(e);
  return todos.find((s) => s.id === e.porLei[lei]) ?? todos.find((s) => s.id === padrao) ?? SISTEMAS_PRONTOS[0]!;
}
/**
 * O sistema com que a lei abre no leitor e na prévia dos artigos: a escolha do usuário nela; sem escolha, "Teses da peça"
 * se a lei tem grifos prontos nele, senão o sistema ativo.
 */
export function sistemaDoLeitor(e: Estado, lei: string, prontos: GrifosProntos): Sistema {
  return sistemaDaLei(e, lei, prontos.teses?.some((r) => r.lei === lei) ? "teses" : e.ativo);
}
/** O id a usar em grifos.json: o do pronto de onde o sistema foi copiado, senão o próprio id. */
export function idDosProntos(s: Sistema): string {
  return s.base ?? s.id;
}
/** A cor com que o grifo pronto `rotulo` pinta neste sistema: a da primeira cor que o origina. */
export function corDoPronto(s: Sistema, rotulo: string): string | undefined {
  return s.cores.find((c) => (c.origem ?? c.rotulo) === rotulo)?.cor;
}
/** Um sistema novo, com o id e o nome de `alvo` e as cores de `origem`. Copiado de um pronto ou de um que já tem base, mantém os grifos prontos. */
export function copiarSistema(origem: Sistema, alvo: { id: string; nome: string }): Sistema {
  const pronto = SISTEMAS_PRONTOS.some((p) => p.id === origem.id);
  const base = pronto ? origem.id : origem.base;
  return {
    id: alvo.id,
    nome: alvo.nome,
    ...(base ? { base } : {}),
    cores: origem.cores.map((c) => ({ cor: c.cor, rotulo: c.rotulo, ...(base ? { origem: c.origem ?? c.rotulo } : {}) })),
  };
}
