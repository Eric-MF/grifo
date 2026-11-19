// Melhorias dos poderes, compradas com moedas. Cada poder tem 4 trilhas de 5 níveis: a principal (Duração, nos poderes
// com tempo, ou Força, nos instantâneos), a Recarga (poder próprio) ou Frequência (poder dos orbes), o Efeito especial
// e o Visual. Todo ganho de jogo vem com um contrapeso, para o jogo não ficar fácil; o Visual é só aparência.
// Aqui ficam os números e os textos do menu; o motor (engine.ts) lê as funções do fim do arquivo.

import { TEXTOS_MOMENTO } from "./momentos-textos";
import { motivoDe } from "./motivos";
import { PODERES, type IdPoder, type Poder } from "./powers";

export const NIVEL_MAX = 5;
/** Preço de cada nível de qualquer trilha: do 1º ao 5º. */
export const PRECOS_NIVEL = [150, 300, 600, 1200, 2400];

export type IdTrilha = "duracao" | "forca" | "recarga" | "frequencia" | "efeito" | "visual";
/** Níveis comprados, por `"<poder>:<trilha>"` (ver `chave`). */
export type Niveis = Record<string, number>;

export const chave = (poder: string, trilha: IdTrilha) => `${poder}:${trilha}`;

/** Nível de uma trilha, sempre inteiro entre 0 e NIVEL_MAX. */
export function nivel(n: Niveis | undefined, poder: string, trilha: IdTrilha): number {
  const v = n?.[chave(poder, trilha)] ?? 0;
  return Math.max(0, Math.min(NIVEL_MAX, Math.floor(Number.isFinite(v) ? v : 0)));
}

/** Segundos da barra do poder próprio, sem melhorias. */
export const CARGA_BASE = 15;
/** Proteção depois de perder uma vida extra, sem melhorias. */
export const PROTECAO_VIDA = 1.5;
/** Proteção depois que o Habeas Corpus absorve uma batida, sem melhorias. */
export const PROTECAO_ESCUDO = 1.2;
/** Chance de o Renascer (Fênixame) dar uma vida extra, sem melhorias; cada nível de Força soma 14 pontos (100% no 5). */
export const CHANCE_RENASCER = 0.3;
/**
 * Liberdade (Harpia Corpus), sem melhorias: 50% de chance de uma vida extra. Cada nível de Força soma 10 pontos (100%
 * no 5) e 4 pontos de chance de vir mais uma vida junto (20% no 5). Antes eram 2 vidas certas e mais 1 por nível
 * (7 no 5), forte demais.
 */
export const CHANCE_LIBERDADE = 0.5;
export const chancesLiberdade = (nivelForca: number) => ({ uma: Math.min(1, CHANCE_LIBERDADE + 0.1 * nivelForca), outra: 0.04 * nivelForca });
/**
 * Prescritodáctilo: depois de cada batida, o empurrão das colunas continua por um tempo (0,4 s, e 0,1 s a mais por
 * nível do Rasante) e afasta mais as que estão perto do pássaro (até 24 px além do círculo, e 4 px a mais por nível).
 * Com o Rasante alto, a batida forte jogava o pássaro contra as colunas antes de elas se afastarem.
 */
export const empurraoPterossauro = (nivelEfeito: number) => ({ segundos: 0.4 + 0.1 * nivelEfeito, extra: 24 + 4 * nivelEfeito });
/** Teto da soma das chances extras de coluna rachada. */
export const TETO_RACHADA_EXTRA = 0.15;

/**
 * Contrapeso de uma trilha, por nível:
 * - "mundo", "gravidade", "rachadas": enquanto o poder dura (fração de velocidade, de gravidade; chance de rachada);
 * - "barra": segundos a mais na barra do poder próprio;
 * - "ressaca-*": depois que o poder acaba, por `segundos`;
 * - "vidas": vidas frágeis (menos proteção depois de perder uma vida, e a rachada pode tirar uma vida);
 * - os outros são próprios de um poder e o motor trata cada um onde ele age.
 */
export type Contra =
  | { tipo: "mundo" | "gravidade" | "rachadas" | "impulso" | "xp"; valor: number }
  | { tipo: "barra"; valor: number }
  | { tipo: "ressaca-mundo" | "ressaca-gravidade" | "ressaca-vaos" | "ressaca-moveis" | "ressaca-rachadas"; valor: number; segundos: number }
  | { tipo: "vidas" }
  | {
      tipo:
        | "protecao-escudo"
        | "penalidade-pontos"
        | "moeda-valor"
        | "rachada-estreita"
        | "rachada-encerra"
        | "proxima-movel"
        | "seguinte-rachada"
        | "moedas-somem"
        | "vidas-aceleram"
        | "rachada-moedas"
        | "perde-pontos-vida";
      valor: number;
    };

interface Especificacao {
  /** trilha principal: Duração (segundos a mais por nível) ou Força (unidades a mais por nível) */
  principal: "duracao" | "forca";
  ganho: number;
  contra: Contra;
  /** texto da Força em cada nível (só nos instantâneos e no Arquivamento) */
  forca?: (n: number) => string;
  efeito: { nome: string; ganho: number; texto: (n: number) => string; contra: Contra };
}

const fmt = (v: number) => (Math.round(v * 100) / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const pct = (v: number) => `${fmt(v * 100)}%`;
const pp = (v: number) => `${fmt(v * 100)} p.p.`;
const plural = (n: number, um: string, varios: string) => `${fmt(n)} ${n === 1 ? um : varios}`;

/** A tabela do plano: ganho e contrapeso de cada poder (valores por nível). */
export const ESPECIFICACOES: Record<IdPoder, Especificacao> = {
  // ---- poderes dos orbes
  escudo: {
    principal: "duracao", ganho: 1.2, contra: { tipo: "gravidade", valor: 0.02 },
    efeito: { nome: "Quebra a coluna", ganho: 0.2, texto: (n) => `${pct(0.2 * n)} de chance de quebrar a coluna ao absorver`, contra: { tipo: "protecao-escudo", valor: 0.12 } },
  },
  ima: {
    principal: "duracao", ganho: 1, contra: { tipo: "mundo", valor: 0.015 },
    efeito: { nome: "Alcance", ganho: 0.1, texto: (n) => `raio do ímã +${pct(0.1 * n)}`, contra: { tipo: "rachadas", valor: 0.01 } },
  },
  lento: {
    principal: "duracao", ganho: 0.7, contra: { tipo: "ressaca-mundo", valor: 0.03, segundos: 2 },
    efeito: { nome: "Mais lento", ganho: 0.04, texto: (n) => `mundo a ${pct(0.6 - 0.04 * n)} da velocidade`, contra: { tipo: "rachadas", valor: 0.01 } },
  },
  mini: {
    principal: "duracao", ganho: 1, contra: { tipo: "gravidade", valor: 0.02 },
    efeito: { nome: "Menor", ganho: 0.04, texto: (n) => `maleta com ${pct(0.6 - 0.04 * n)} do tamanho`, contra: { tipo: "impulso", valor: 0.03 } },
  },
  fantasma: {
    principal: "duracao", ganho: 0.6, contra: { tipo: "mundo", valor: 0.015 },
    efeito: { nome: "Saída protegida", ganho: 0.4, texto: (n) => `ao acabar, ${fmt(0.4 * n)} s de escudo`, contra: { tipo: "rachadas", valor: 0.01 } },
  },
  dobro: {
    principal: "duracao", ganho: 1.2, contra: { tipo: "rachadas", valor: 0.01 },
    efeito: { nome: "Moedas em dobro", ganho: 0.2, texto: (n) => `${pct(0.2 * n)} de chance de a moeda valer 2`, contra: { tipo: "penalidade-pontos", valor: 3 } },
  },
  leve: {
    principal: "duracao", ganho: 1, contra: { tipo: "mundo", valor: 0.015 },
    efeito: { nome: "Guia mais forte", ganho: 0.1, texto: (n) => `guia +${pct(0.1 * n)} mais forte`, contra: { tipo: "xp", valor: 0.05 } },
  },
  congelar: {
    principal: "duracao", ganho: 0.8, contra: { tipo: "mundo", valor: 0.015 },
    efeito: { nome: "Mais aberto", ganho: 4, texto: (n) => `vão +${fmt(4 * n)} px mais aberto`, contra: { tipo: "ressaca-moveis", valor: 0.1, segundos: 3 } },
  },
  prescricao: {
    principal: "forca", ganho: 0.3, contra: { tipo: "seguinte-rachada", valor: 0.1 },
    forca: (n) => (n ? `apaga a tela e a próxima coluna demora ${fmt(0.3 * n)} s` : "apaga as colunas da tela"),
    efeito: { nome: "Despojos", ganho: 0.2, texto: (n) => `${pct(0.2 * n)} das moedas apagadas vêm até você`, contra: { tipo: "ressaca-rachadas", valor: 0.01, segundos: 5 } },
  },
  revisao: {
    principal: "forca", ganho: 1, contra: { tipo: "vidas" },
    forca: (n) => `aparece até você ter ${plural(2 + n, "vida", "vidas")}`,
    efeito: { nome: "Vida em dobro", ganho: 0.2, texto: (n) => `${pct(0.2 * n)} de chance de dar 2 vidas`, contra: { tipo: "perde-pontos-vida", valor: 3 } },
  },

  // ---- poderes próprios
  arquivamento: {
    principal: "forca", ganho: 1, contra: { tipo: "barra", valor: 1 },
    forca: (n) => `arquiva ${plural(1 + n, "coluna", "colunas")}`,
    efeito: { nome: "Arquivo com moedas", ganho: 0.2, texto: (n) => `${pct(0.2 * n)} das moedas arquivadas vêm até você`, contra: { tipo: "seguinte-rachada", valor: 0.1 } },
  },
  equilibrio: {
    principal: "duracao", ganho: 0.8, contra: { tipo: "ressaca-vaos", valor: 2, segundos: 3 },
    efeito: { nome: "Vãos alinhados", ganho: 0.15, texto: (n) => `os vãos se aproximam ${pct(0.15 * n)} do meio`, contra: { tipo: "xp", valor: 0.05 } },
  },
  inquerito: {
    principal: "duracao", ganho: 0.7, contra: { tipo: "barra", valor: 1 },
    efeito: { nome: "Indiciamento", ganho: 0.2, texto: (n) => `cada moeda recolhida rende +${fmt(0.2 * n)} XP`, contra: { tipo: "moeda-valor", valor: 0.4 } },
  },
  presuncao: {
    principal: "duracao", ganho: 0.8, contra: { tipo: "rachadas", valor: 0.02 },
    efeito: { nome: "Bônus da dúvida", ganho: 1, texto: (n) => `+${plural(n, "ponto", "pontos")} ao passar por uma rachada`, contra: { tipo: "rachada-estreita", valor: 2 } },
  },
  dosimetria: {
    principal: "duracao", ganho: 1, contra: { tipo: "mundo", valor: 0.015 },
    efeito: { nome: "Agravante", ganho: 1, texto: (n) => `rachada passada vale ×${3 + n}`, contra: { tipo: "rachada-encerra", valor: 2 } },
  },
  denuncia: {
    principal: "forca", ganho: 1, contra: { tipo: "barra", valor: 1 },
    forca: (n) => (n ? `remove as rachadas e não vem rachada por ${fmt(n)} s` : "remove as rachadas da tela"),
    efeito: { nome: "Denúncia premiada", ganho: 1, texto: (n) => `+${plural(n, "ponto", "pontos")} por rachada removida`, contra: { tipo: "proxima-movel", valor: 0.15 } },
  },
  tipificacao: {
    principal: "forca", ganho: 1, contra: { tipo: "barra", valor: 1 },
    forca: (n) => `${20 + 4 * n} pontos e ${5 + n} moedas`,
    efeito: { nome: "Qualificadora", ganho: 0.8, texto: (n) => `${fmt(0.8 * n)} s de pontos em dobro`, contra: { tipo: "mundo", valor: 0.02 } },
  },
  voo: {
    principal: "duracao", ganho: 1, contra: { tipo: "mundo", valor: 0.015 },
    efeito: { nome: "Garras de ouro", ganho: 40, texto: (n) => `recolhe as moedas num raio de ${fmt(40 * n)} px`, contra: { tipo: "ressaca-gravidade", valor: 0.03, segundos: 3 } },
  },
  galope: {
    principal: "duracao", ganho: 0.8, contra: { tipo: "mundo", valor: 0.015 },
    efeito: { nome: "Passada longa", ganho: 0.1, texto: (n) => `as colunas se recolhem ${pct(0.1 * n)} mais cedo`, contra: { tipo: "moedas-somem", valor: 0.15 } },
  },
  garras: {
    principal: "forca", ganho: 1, contra: { tipo: "barra", valor: 1 },
    forca: (n) => `quebra ${plural(2 + n, "coluna", "colunas")}, sem pontuar`,
    efeito: { nome: "Despojos", ganho: 1, texto: (n) => `cada coluna quebrada solta ${plural(n, "moeda", "moedas")}`, contra: { tipo: "ressaca-mundo", valor: 0.02, segundos: 3 } },
  },
  renascer: {
    principal: "forca", ganho: 0.14, contra: { tipo: "vidas" },
    forca: (n) => `${pct(CHANCE_RENASCER + 0.14 * n)} de chance de ganhar uma vida extra`,
    efeito: { nome: "Das cinzas", ganho: 0.3, texto: (n) => `ao perder uma vida, ${fmt(0.3 * n)} s atravessando as colunas`, contra: { tipo: "vidas-aceleram", valor: 0.05 } },
  },
  sabedoria: {
    principal: "duracao", ganho: 1, contra: { tipo: "mundo", valor: 0.015 },
    efeito: { nome: "Mais XP", ganho: 0.2, texto: (n) => `XP ×${fmt(2 + 0.2 * n)}`, contra: { tipo: "rachadas", valor: 0.02 } },
  },
  tesouro: {
    principal: "forca", ganho: 4, contra: { tipo: "barra", valor: 1 },
    forca: (n) => `${20 + 4 * n} moedas`,
    efeito: { nome: "Ímã do dragão", ganho: 1, texto: (n) => `ímã por ${6 + n} s`, contra: { tipo: "rachada-moedas", valor: 2 } },
  },
  liberdade: {
    principal: "forca", ganho: 0.1, contra: { tipo: "vidas" },
    forca: (n) => {
      const c = chancesLiberdade(n);
      return c.outra ? `${pct(c.uma)} de chance de uma vida, e ${pct(c.outra)} de mais uma` : `${pct(c.uma)} de chance de uma vida extra`;
    },
    efeito: { nome: "Asas livres", ganho: 0.6, texto: (n) => `escudo por ${fmt(5 + 0.6 * n)} s`, contra: { tipo: "vidas-aceleram", valor: 0.05 } },
  },
  eco: {
    principal: "duracao", ganho: 0.8, contra: { tipo: "barra", valor: 1 },
    efeito: { nome: "Ecolocalização", ganho: 0.03, texto: (n) => `mundo a ${pct(0.85 - 0.03 * n)} da velocidade`, contra: { tipo: "ressaca-mundo", valor: 0.03, segundos: 3 } },
  },
  "asas-de-cera": {
    principal: "duracao", ganho: 0.8, contra: { tipo: "mundo", valor: 0.015 },
    efeito: { nome: "Empurrão", ganho: 0.08, texto: (n) => `raio do empurrão +${pct(0.08 * n)}`, contra: { tipo: "gravidade", valor: 0.02 } },
  },
  pterossauro: {
    principal: "duracao", ganho: 0.8, contra: { tipo: "gravidade", valor: 0.02 },
    efeito: {
      nome: "Rasante",
      ganho: 0.04,
      texto: (n) => `batida ×${fmt(1.3 + 0.04 * n)}; o empurrão dura ${fmt(empurraoPterossauro(n).segundos)} s e afasta mais as colunas perto`,
      contra: { tipo: "mundo", valor: 0.015 },
    },
  },
  foco: {
    principal: "duracao", ganho: 1, contra: { tipo: "mundo", valor: 0.015 },
    efeito: { nome: "Foco total", ganho: 0.2, texto: (n) => `pontos e moedas ×${fmt(3 + 0.2 * n)}`, contra: { tipo: "rachadas", valor: 0.02 } },
  },
  agravo: {
    principal: "duracao", ganho: 3, contra: { tipo: "barra", valor: 1 },
    efeito: { nome: "Agravo provido", ganho: 2, texto: (n) => `a penalidade absorvida vira +${plural(2 * n, "ponto", "pontos")}`, contra: { tipo: "rachadas", valor: 0.01 } },
  },
  chifre: {
    principal: "forca", ganho: 2, contra: { tipo: "barra", valor: 1 },
    forca: (n) => `${5 + 2 * n} pontos e quebra a próxima coluna`,
    efeito: { nome: "Súmula vinculante", ganho: 0.2, texto: (n) => `${pct(0.2 * n)} de chance de quebrar também a segunda coluna`, contra: { tipo: "barra", valor: 0.5 } },
  },
  penhora: {
    principal: "forca", ganho: 1, contra: { tipo: "barra", valor: 1.5 },
    forca: (n) => `cada moeda penhorada vale ${plural(2 + n, "ponto", "pontos")}`,
    efeito: { nome: "Penhora on-line", ganho: 0.6, texto: (n) => `recolhe as moedas que surgirem por ${fmt(0.6 * n)} s`, contra: { tipo: "rachada-moedas", valor: 2 } },
  },
  praga: {
    principal: "forca", ganho: 2, contra: { tipo: "barra", valor: 1 },
    forca: (n) => `${10 + 2 * n} moedas`,
    efeito: { nome: "Nuvem", ganho: 0.6, texto: (n) => `mundo lento por ${fmt(6 + 0.6 * n)} s`, contra: { tipo: "ressaca-mundo", valor: 0.03, segundos: 2 } },
  },
};

/** Texto do contrapeso no nível `n` (vazio no nível 0). */
export function textoContra(c: Contra, n: number): string {
  if (n <= 0) return "";
  switch (c.tipo) {
    case "mundo": return `mundo +${pct(c.valor * n)} enquanto dura`;
    case "gravidade": return `gravidade +${pct(c.valor * n)} enquanto dura`;
    case "rachadas": return `rachadas +${pp(c.valor * n)} enquanto dura`;
    case "impulso": return `batida de asas −${pct(c.valor * n)} enquanto dura`;
    case "xp": return `XP −${pct(c.valor * n)} enquanto dura`;
    case "barra": return `barra +${fmt(c.valor * n)} s`;
    case "ressaca-mundo": return `ao acabar, mundo +${pct(c.valor * n)} por ${fmt(c.segundos)} s`;
    case "ressaca-gravidade": return `ao acabar, gravidade +${pct(c.valor * n)} por ${fmt(c.segundos)} s`;
    case "ressaca-vaos": return `ao acabar, vãos ${fmt(c.valor * n)} px mais estreitos por ${fmt(c.segundos)} s`;
    case "ressaca-moveis": return `ao acabar, colunas móveis +${pct(c.valor * n)} rápidas por ${fmt(c.segundos)} s`;
    case "ressaca-rachadas": return `rachadas +${pp(c.valor * n)} por ${fmt(c.segundos)} s`;
    case "vidas": return `proteção depois de perder vida: ${fmt(protecaoPorNivel(n))} s; a rachada tira vida (${pct(0.1 * n)})`;
    case "protecao-escudo": return `proteção depois da batida: ${fmt(PROTECAO_ESCUDO - c.valor * n)} s`;
    case "penalidade-pontos": return `a rachada tira +${plural(c.valor * n, "ponto", "pontos")} enquanto dura`;
    case "moeda-valor": return `cada moeda recolhida vale ${plural(valorMoedaInquerito(n), "ponto", "pontos")} enquanto dura`;
    case "rachada-estreita": return `rachadas ${fmt(c.valor * n)} px mais estreitas enquanto dura`;
    case "rachada-encerra": return `bater numa rachada encerra o efeito e tira ${plural(c.valor * n, "ponto", "pontos")}`;
    case "proxima-movel": return `a próxima coluna vem móvel (${pct(c.valor * n)})`;
    case "seguinte-rachada": return `a coluna seguinte vem rachada (${pct(c.valor * n)})`;
    case "moedas-somem": return `as moedas das colunas recolhidas somem (${pct(c.valor * n)}) enquanto dura`;
    case "vidas-aceleram": return `cada vida acelera o mundo +${pct(c.valor * n)} a mais`;
    case "rachada-moedas": return `a rachada tira +${plural(c.valor * n, "moeda", "moedas")}`;
    case "perde-pontos-vida": return `−${plural(c.valor * n, "ponto", "pontos")} ao perder uma vida`;
  }
}

const protecaoPorNivel = (n: number) => PROTECAO_VIDA - 0.15 * n;
/** Pontos de cada moeda recolhida pelo Inquérito: 3, e 0,4 a menos por nível do Indiciamento (mínimo 1). */
export const valorMoedaInquerito = (n: number) => Math.max(1, Math.round(3 - 0.4 * n));

/**
 * Os nomes dos níveis do Visual de um poder. Os níveis 1, 3 e 5 são o momento do poder, cada vez mais completo (o grito
 * no fim do Voo do Grifo, a batida das asas de cera, a fênix que ganha a vida; ver momentos-textos.ts); o 2 e o 4, o
 * motivo dele em volta e o brilho ("Chamas em volta", "Brilho e explosão de chamas").
 */
export function nomesVisual(id: string): string[] {
  const nome = motivoDe(id).nome;
  const Nome = nome.charAt(0).toUpperCase() + nome.slice(1);
  const m = TEXTOS_MOMENTO[id as IdPoder]?.nomes ?? ["O momento do poder", "O momento maior", "A aparição"];
  return ["Original", m[0], `${Nome} em volta`, `${m[1]} e rastro de ${nome}`, `Brilho e explosão de ${nome}`, `${m[2]}, com auréola`];
}

export interface TextoNivel {
  ganho: string;
  contrapeso: string;
}
export interface DescricaoTrilha {
  id: IdTrilha;
  nome: string;
  /** do nível 0 (sem melhoria) ao NIVEL_MAX */
  niveis: TextoNivel[];
}

const niveis = (f: (n: number) => TextoNivel) => Array.from({ length: NIVEL_MAX + 1 }, (_, n) => f(n));

/** As 4 trilhas do poder, com os textos de cada nível (para o menu). */
export function trilhasDoPoder(p: Poder): DescricaoTrilha[] {
  const e = ESPECIFICACOES[p.id];
  const principal: DescricaoTrilha =
    e.principal === "duracao"
      ? { id: "duracao", nome: "Duração", niveis: niveis((n) => ({ ganho: `${fmt(p.duracao + e.ganho * n)} s`, contrapeso: textoContra(e.contra, n) })) }
      : { id: "forca", nome: "Força", niveis: niveis((n) => ({ ganho: e.forca?.(n) ?? "", contrapeso: textoContra(e.contra, n) })) };
  const segunda: DescricaoTrilha = p.personagem
    ? { id: "recarga", nome: "Recarga", niveis: niveis((n) => ({ ganho: `barra em ${fmt(CARGA_BASE - n)} s`, contrapeso: n ? `rachadas +${pp(0.01 * n)} com esse personagem` : "" })) }
    : { id: "frequencia", nome: "Frequência", niveis: niveis((n) => ({ ganho: n ? `+${pct(0.1 * n)} de chance nos orbes` : "chance normal nos orbes", contrapeso: n ? `o orbe balança ${fmt(8 * n)} px a mais` : "" })) };
  const efeito: DescricaoTrilha = {
    id: "efeito",
    nome: e.efeito.nome,
    niveis: niveis((n) => ({ ganho: n ? e.efeito.texto(n) : "sem efeito especial", contrapeso: textoContra(e.efeito.contra, n) })),
  };
  const nomes = nomesVisual(p.id);
  const visual: DescricaoTrilha = { id: "visual", nome: "Visual", niveis: niveis((n) => ({ ganho: nomes[n]!, contrapeso: "" })) };
  return [principal, segunda, efeito, visual];
}

// ---------------------------------------------------------------------------
// O que o motor lê. `n` são os níveis comprados; `ativos`, os poderes ligados agora.
// ---------------------------------------------------------------------------

const espec = (id: string) => ESPECIFICACOES[id as IdPoder];
/** Nível da trilha principal (Duração ou Força) do poder. */
export const nivelPrincipal = (n: Niveis | undefined, id: string) => (espec(id) ? nivel(n, id, espec(id).principal) : 0);
/** Valor do Efeito especial no nível comprado (o `ganho` da tabela vezes o nível). */
export const valorEfeito = (n: Niveis | undefined, id: string) => (espec(id) ? espec(id).efeito.ganho * nivel(n, id, "efeito") : 0);
/** Quantidade a mais da Força (o `ganho` da tabela vezes o nível). */
export const valorForca = (n: Niveis | undefined, id: string) => (espec(id)?.principal === "forca" ? espec(id).ganho * nivel(n, id, "forca") : 0);

/** Duração do poder com a trilha Duração. */
export function duracaoPoder(p: Poder, n: Niveis | undefined): number {
  const e = espec(p.id);
  return e?.principal === "duracao" ? p.duracao + e.ganho * nivel(n, p.id, "duracao") : p.duracao;
}

/** Os contrapesos das duas trilhas de jogo do poder, cada um com o nível da sua trilha. */
function contrasDe(id: string, n: Niveis | undefined): [Contra, number][] {
  const e = espec(id);
  if (!e) return [];
  return [
    [e.contra, nivel(n, id, e.principal)],
    [e.efeito.contra, nivel(n, id, "efeito")],
  ];
}

/** Soma dos contrapesos de um tipo nos poderes ligados agora. */
function somaAtivos(tipo: Contra["tipo"], ativos: Iterable<string>, n: Niveis | undefined): number {
  let s = 0;
  for (const id of ativos) for (const [c, lv] of contrasDe(id, n)) if (c.tipo === tipo && "valor" in c) s += c.valor * lv;
  return s;
}

/** Segundos da barra do poder próprio: 15, menos a Recarga, mais os contrapesos "barra" (nunca abaixo de 10). */
export function segundosCarga(id: string, n: Niveis | undefined): number {
  let s = CARGA_BASE - nivel(n, id, "recarga");
  for (const [c, lv] of contrasDe(id, n)) if (c.tipo === "barra") s += c.valor * lv;
  return Math.max(CARGA_BASE - NIVEL_MAX, s);
}

/** Multiplicador da velocidade do mundo pelos contrapesos "mundo" dos poderes ligados. */
export const fatorMundo = (ativos: Iterable<string>, n: Niveis | undefined) => 1 + somaAtivos("mundo", ativos, n);
/** Multiplicador da gravidade pelos contrapesos "gravidade" dos poderes ligados. */
export const fatorGravidade = (ativos: Iterable<string>, n: Niveis | undefined) => 1 + somaAtivos("gravidade", ativos, n);
/** Multiplicador da batida de asas pelos contrapesos "impulso" dos poderes ligados. */
export const fatorImpulso = (ativos: Iterable<string>, n: Niveis | undefined) => Math.max(0.5, 1 - somaAtivos("impulso", ativos, n));
/** Multiplicador do XP pelos contrapesos "xp" dos poderes ligados. */
export const fatorXp = (ativos: Iterable<string>, n: Niveis | undefined) => Math.max(0, 1 - somaAtivos("xp", ativos, n));

/**
 * Chance extra de coluna rachada: os contrapesos "rachadas" dos poderes ligados, a Recarga do poder do personagem
 * (`proprio`) e as `extras` de agora (as ressacas), com teto de TETO_RACHADA_EXTRA.
 */
export function chanceRachadaExtra(ativos: Iterable<string>, n: Niveis | undefined, proprio?: string, extras = 0): number {
  const recarga = proprio ? 0.01 * nivel(n, proprio, "recarga") : 0;
  return Math.min(TETO_RACHADA_EXTRA, somaAtivos("rachadas", ativos, n) + recarga + extras);
}

/**
 * Nível de "vidas frágeis": o maior entre a Revisão Criminal (sempre) e o poder de vidas do personagem
 * (`proprio`, se for o Renascer ou a Liberdade). O maior, não a soma.
 */
export function nivelVidasFrageis(n: Niveis | undefined, proprio?: string): number {
  let m = nivel(n, "revisao", "forca");
  if (proprio === "renascer" || proprio === "liberdade") m = Math.max(m, nivel(n, proprio, "forca"));
  return m;
}
/** Proteção depois de perder uma vida extra (1,5 s, e 0,15 s a menos por nível de vidas frágeis). */
export const protecaoVida = (nivelFrageis: number) => protecaoPorNivel(Math.min(NIVEL_MAX, nivelFrageis));
/** Chance de a coluna rachada tirar uma vida extra, no lugar da penalidade sorteada. */
export const chanceVidaNaRachada = (nivelFrageis: number) => 0.1 * Math.min(NIVEL_MAX, nivelFrageis);

/** Peso do poder no sorteio do orbe (1, e +10% por nível da Frequência). */
export const pesoNoOrbe = (id: string, n: Niveis | undefined) => 1 + 0.1 * nivel(n, id, "frequencia");
/** Balanço a mais do orbe do poder, em px (8 por nível da Frequência). */
export const balancoOrbe = (id: string, n: Niveis | undefined) => 8 * nivel(n, id, "frequencia");

/** Contrapeso que age depois que o poder acaba ("ressaca"), com o valor já no nível comprado. */
export function ressacaDe(id: string, n: Niveis | undefined): { tipo: string; valor: number; segundos: number } | null {
  for (const [c, lv] of contrasDe(id, n)) if (c.tipo.startsWith("ressaca-") && "segundos" in c && lv > 0) return { tipo: c.tipo, valor: c.valor * lv, segundos: c.segundos };
  return null;
}

/** Valor de um contrapeso próprio de um poder no nível comprado (0 se o poder não tem esse contrapeso). */
export function valorContra(id: string, tipo: Contra["tipo"], n: Niveis | undefined): number {
  for (const [c, lv] of contrasDe(id, n)) if (c.tipo === tipo && "valor" in c) return c.valor * lv;
  return 0;
}

/** Os poderes que o menu mostra, na ordem da lista de poderes. */
export const PODERES_MELHORAVEIS = PODERES;
