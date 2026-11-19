// Dados da aba Estatísticas (/estatisticas/). Montados no build por src/content/estatisticas.ts e passados prontos para
// a página, que só filtra e conta no navegador.
import type { GrupoPeca } from "@/content/schema";

/** A época do exame: as bancas da OAB/SP antes da unificação, o CESPE dos primeiros unificados e a FGV. */
export type Era = "vunesp" | "vunesp-cespe" | "cespe" | "fgv";

export const ERAS: { id: Era; nome: string; desc: string }[] = [
  { id: "fgv", nome: "FGV", desc: "do II Exame Unificado (2010.2) em diante" },
  { id: "cespe", nome: "CESPE/UnB", desc: "os unificados de 2009 (138º a 140º de SP) e o I Exame Unificado (2010.1)" },
  { id: "vunesp-cespe", nome: "VUNESP e CESPE", desc: "do 129º ao 137º Exame de SP" },
  { id: "vunesp", nome: "VUNESP", desc: "do 110º ao 128º Exame de SP" },
];
export const nomeEra = (e: Era) => ERAS.find((x) => x.id === e)!.nome;

export const NOMES_GRUPOS: Record<GrupoPeca, string> = {
  defesa: "Defesa no processo",
  recurso: "Recursos",
  contrarrazoes: "Contrarrazões",
  execucao: "Execução penal",
  prisao: "Prisão e liberdade",
  autonoma: "Ações autônomas",
  acusacao: "Acusação",
};

export interface LinksExame {
  /** simulado com correção automática */
  simulado?: string;
  /** a linha do exame em /provas/, com o visualizador aberto */
  prova?: string;
  caderno?: string;
  gabarito?: string;
  fgv?: string;
}

export interface ExameEstat {
  /** id do exame no site ("47", "20-porto-velho"), ou "sp-110" para os exames antigos da OAB/SP */
  id: string;
  /** posição na ordem cronológica (0 = o mais antigo) */
  ordem: number;
  numero: number;
  /** "XLVII" no unificado, "110º" nos da OAB/SP */
  numeral: string;
  /** "XLVII Exame", "XX Exame · Porto Velho", "110º Exame da OAB/SP" */
  titulo: string;
  /** o nome nacional, quando ajuda ("2010.1", "2009.3") */
  apelido: string | null;
  ano: number | null;
  /** o ano saiu da sequência dos exames (três por ano), não de uma notícia: aparece como "≈2001" */
  anoEstimado: boolean;
  /** data da 2ª fase (AAAA-MM-DD), quando conhecida */
  data: string | null;
  /** o lugar do exame no eixo do tempo, em anos (2014.1 = começo de fev. de 2014); null sem ano conhecido */
  quando: number | null;
  era: Era;
  /** reaplicação regional (Porto Velho, Porto Alegre) */
  variante: string | null;
  /** tipos de content/pecas.yaml (ou de pecas_extras); um por exame no unificado, até quatro nos antigos */
  pecas: string[];
  /** o nome da peça como a prova escreveu ("Queixa", "Apelação (assistente de acusação)"), só nos exames do site */
  pecaNaProva: string | null;
  noSite: boolean;
  corrigivel: boolean;
  /** o gabarito ainda é o preliminar */
  preliminar: boolean;
  /** número de questões discursivas (0 nos exames antigos) */
  questoes: number;
  links: LinksExame;
  /** teses achadas na tabela de pontos da peça e das questões (ids de TESES) */
  teses: { peca: string[]; questoes: string[] };
}

/** O artigo no leitor do Grifo, para a prévia (o pop-up com o texto) que os links com data-lei e data-art abrem. */
export interface PreviaArtigo {
  /** id da lei no leitor ("cpp") ou da lista de súmulas ("sumulas-stf") */
  lei: string;
  /** "art593", "s-700" */
  art: string;
  /** o inciso ou parágrafo citado, destacado na prévia ("art5.i57") */
  disp?: string;
}

export interface FundamentoPeca {
  texto: string;
  url?: string;
  previa?: PreviaArtigo;
}

export interface PecaInfo {
  tipo: string;
  nome: string;
  grupo: GrupoPeca;
  fundamentos: FundamentoPeca[];
  prazo?: string;
  cabimento?: string;
}

/** Um artigo (ou súmula) citado nas tabelas de pontos, com os exames em que aparece. */
export interface ArtigoEstat {
  chave: string;
  /** "Art. 386 do CPP", "Súmula 700 do STF" */
  rotulo: string;
  /** cp, cpp, lep, cf, "leis" (especiais) ou "sumulas": o filtro por origem */
  origem: OrigemArtigo;
  /** a epígrafe do artigo ("Furto") ou o começo do caput */
  resumo?: string;
  url?: string;
  previa?: PreviaArtigo;
  /** ids dos exames em que aparece na peça e nas questões */
  peca: string[];
  questoes: string[];
}
export type OrigemArtigo = "cp" | "cpp" | "lep" | "cf" | "leis" | "sumulas";
export const ORIGENS: { id: OrigemArtigo; nome: string }[] = [
  { id: "cpp", nome: "CPP" },
  { id: "cp", nome: "CP" },
  { id: "lep", nome: "LEP" },
  { id: "cf", nome: "CF" },
  { id: "leis", nome: "Leis especiais" },
  { id: "sumulas", nome: "Súmulas" },
];

export type GrupoTese = "processo" | "crime" | "pena" | "execucao";
export interface TeseInfo {
  id: string;
  nome: string;
  grupo: GrupoTese;
  /** o que procurar no texto dos gabaritos (/provas/todos/), quando uma palavra ou expressão basta */
  busca?: string;
}

export interface MarcoLinha {
  quando: string;
  /** o lugar no eixo do tempo, em anos; com `ate`, o intervalo */
  de: number;
  ate: number | null;
  rotulo: string;
  titulo: string;
  texto: string;
  era: Era;
  destaque?: string;
  exame?: { id: string; titulo: string; href: string };
}

export interface LeiEstat {
  id: string;
  nome: string;
  unidades: number;
  cor: string;
}

export interface DadosEstatisticas {
  exames: ExameEstat[];
  pecas: Record<string, PecaInfo>;
  artigos: ArtigoEstat[];
  teses: TeseInfo[];
  linha: MarcoLinha[];
  leis: LeiEstat[];
}
