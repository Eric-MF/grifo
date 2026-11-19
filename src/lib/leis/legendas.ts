// Sistemas de cores das marcações: cada cor tem um significado. Dois prontos e os do usuário.
import { gravarJSON, lerJSON } from "@/lib/storage";
import { grifosDoSistema, ROTULO_DA_COR, SISTEMA_ESSENCIAIS, SISTEMA_GERAL, type GrifoPronto } from "./grifos";

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
  /** o sistema pronto ("essenciais" ou "geral") cujos grifos prontos este sistema mostra, quando foi copiado dele */
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

/** As cores dos grifos prontos (as do .examples/Marcações GRIFO.md), as mesmas nos dois sistemas prontos. */
const coresProntas = (): CorLegenda[] => [
  { cor: VERDE, rotulo: ROTULO_DA_COR.pecas },
  { cor: AMARELO, rotulo: ROTULO_DA_COR.teses },
  { cor: AZUL, rotulo: ROTULO_DA_COR.sumulas },
  { cor: VERMELHO, rotulo: ROTULO_DA_COR.pedidos },
];
/**
 * Os sistemas prontos: "Essenciais" (o padrão) grifa só o que já caiu em prova; "Geral", todos os grifos do Grifo.
 * Cada cor é um tipo de grifo: Peças, Teses e Súmulas são marca-texto; Pedidos, um sublinhado.
 */
export const SISTEMAS_PRONTOS: Sistema[] = [
  { id: SISTEMA_ESSENCIAIS, nome: "Essenciais", cores: coresProntas() },
  { id: SISTEMA_GERAL, nome: "Geral", cores: coresProntas() },
];
/** O sistema que vale sem escolha do usuário. */
export const SISTEMA_PADRAO = SISTEMA_ESSENCIAIS;

// Os sistemas prontos antigos ("Matérias" e "Teses da peça") deram lugar aos de agora: quem os usava passa ao "Essenciais",
// e as cores copiadas deles passam a pintar o tipo de grifo novo que corresponde ao significado antigo (as que não têm
// correspondente ficam sem grifos prontos).
const PRONTOS_ANTIGOS = new Set(["materias", "teses"]);
const ROTULOS_ANTIGOS: Record<string, string> = {
  "Teses preliminares": ROTULO_DA_COR.teses,
  "Teses principais": ROTULO_DA_COR.teses,
  "Teses subsidiárias": ROTULO_DA_COR.teses,
  "Pedidos acessórios": ROTULO_DA_COR.pedidos,
  Recursos: ROTULO_DA_COR.pecas,
};
const idNovo = (id: string) => (PRONTOS_ANTIGOS.has(id) ? SISTEMA_PADRAO : id);
/** Um sistema do usuário copiado de um pronto antigo: a base nova e as origens traduzidas. Os outros ficam como estão. */
export function migrarSistema(s: Sistema): Sistema {
  if (!s.base || !PRONTOS_ANTIGOS.has(s.base)) return s;
  return {
    ...s,
    base: SISTEMA_PADRAO,
    cores: s.cores.map((c) => {
      const antigo = c.origem ?? c.rotulo;
      return { ...c, origem: ROTULOS_ANTIGOS[antigo] ?? antigo };
    }),
  };
}
/** O estado salvo com os ids dos prontos antigos trocados pelos de agora (sistema ativo, escolha de cada lei, bases). */
export function migrarLegendas(e: Estado): Estado {
  return {
    ...e,
    ativo: idNovo(e.ativo),
    porLei: Object.fromEntries(Object.entries(e.porLei ?? {}).map(([lei, id]) => [lei, idNovo(id)])),
    meus: e.meus.map(migrarSistema),
  };
}

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

// Sistemas salvos antes de a repetição ser proibida podem ter cores repetidas: corrigidas ao carregar. Os ids dos
// prontos antigos também são trocados ao carregar (ver migrarLegendas).
export const lerLegendas = (): Estado => {
  const e = migrarLegendas(lerJSON<Estado>(K, { ativo: SISTEMA_PADRAO, meus: [], porLei: {} }));
  return { ...e, meus: e.meus.map((s) => ({ ...s, cores: corUnicas(s.cores) })) };
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
 * O sistema com que a lei abre no leitor e na prévia dos artigos: a escolha do usuário nela; sem escolha, "Essenciais"
 * se a lei tem grifos prontos, senão o sistema ativo.
 */
export function sistemaDoLeitor(e: Estado, lei: string, prontos: readonly Pick<GrifoPronto, "lei">[]): Sistema {
  return sistemaDaLei(e, lei, prontos.some((g) => g.lei === lei) ? SISTEMA_PADRAO : e.ativo);
}
/** O id a usar em grifos.json: o do pronto de onde o sistema foi copiado, senão o próprio id. */
export function idDosProntos(s: Sistema): string {
  return s.base ?? s.id;
}
/** A cor com que o grifo pronto `rotulo` pinta neste sistema: a da primeira cor que o origina. */
export function corDoPronto(s: Sistema, rotulo: string): string | undefined {
  return s.cores.find((c) => (c.origem ?? c.rotulo) === rotulo)?.cor;
}
/** A cor de um grifo pronto neste sistema (a do tipo dele: Peças, Teses, Súmulas ou Pedidos); sem a cor, ele não aparece. */
export const corDoGrifo = (s: Sistema, g: Pick<GrifoPronto, "cor">) => corDoPronto(s, ROTULO_DA_COR[g.cor]);
/** O nome da cor do grifo pronto neste sistema: num sistema copiado, o que o usuário deu à cor ("Peças" → "Recursos"). */
export const rotuloDoGrifo = (s: Sistema, g: Pick<GrifoPronto, "cor">) =>
  s.cores.find((c) => (c.origem ?? c.rotulo) === ROTULO_DA_COR[g.cor])?.rotulo ?? ROTULO_DA_COR[g.cor];
/** Os grifos prontos que o sistema mostra na lei: os do pronto de onde ele vem, só os tipos que têm cor nele. */
export const prontosNoSistema = (grifos: readonly GrifoPronto[], s: Sistema, lei: string): GrifoPronto[] =>
  grifosDoSistema(grifos, idDosProntos(s), lei).filter((g) => corDoGrifo(s, g));
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
