// Layout da folha de respostas (peça e questões) e do caderno de caligrafia. Tudo em milímetros, a partir do canto de
// cima à esquerda da folha A4; tamanhos de letra em pontos. O padrão gravado fica em content/folha-resposta.json, editado
// no painel /revisao/folha/ (só no `npm run dev`); o que faltar nele vem de PADRAO.
import { z } from "zod";
import salvo from "../../../content/folha-resposta.json";

export const FONTES = ["helvetica", "times", "courier"] as const;
export const ALINHAMENTOS = ["esquerda", "centro", "direita"] as const;

const Texto = z.object({
  x: z.number(),
  /** linha de base do texto */
  y: z.number(),
  tamanho: z.number().positive(),
  fonte: z.enum(FONTES),
  negrito: z.boolean(),
  /** onde fica o x: no começo, no meio ou no fim do texto */
  alinhamento: z.enum(ALINHAMENTOS),
});
export type Texto = z.infer<typeof Texto>;

const Caixa = z.object({ x: z.number(), y: z.number(), largura: z.number().positive(), altura: z.number().positive() });
/** imagem pela altura (a largura sai da proporção); x conforme o alinhamento, y é a base da imagem */
const Imagem = z.object({ x: z.number(), y: z.number(), altura: z.number().positive(), alinhamento: z.enum(ALINHAMENTOS) });

export const LayoutSchema = z.object({
  /** a matéria, no cabeçalho e no rodapé ("DIREITO PENAL"; depois, outras) */
  materia: z.string(),
  textos: z.object({
    pecaTitulo: z.string(),
    pecaSubtitulo: z.string(),
    /** {p}: a página da peça; {total}: quantas são */
    pecaPagina: z.string(),
    /** {n}: o número da questão */
    questaoTitulo: z.string(),
    /** **trecho** sai em negrito e sublinhado; {nn}: o número da questão com 2 algarismos */
    atencaoPeca: z.string(),
    atencaoQuestao: z.string(),
    /** {exame}: o número do exame, ou "__" sem exame */
    rodapeExame: z.string(),
    rodapeSimulado: z.string(),
    /** {i}: a página no caderno todo; {total}: o total de páginas */
    rodapePagina: z.string(),
  }),
  paginasPeca: z.number().int().min(1).max(10),
  questoes: z.number().int().min(0).max(10),
  cabecalho: z.object({
    pecaTitulo: Texto,
    pecaSubtitulo: Texto,
    pecaPagina: Texto,
    questaoTitulo: Texto,
    atencao: z.object({
      x: z.number(),
      y: z.number(),
      largura: z.number().positive(),
      tamanho: z.number().positive(),
      /** distância entre as linhas, em múltiplos do tamanho da letra */
      entrelinha: z.number().positive(),
      fonte: z.enum(FONTES),
      justificar: z.boolean(),
    }),
    numero: Texto,
    barras: Caixa,
    numeroBarras: Texto,
    materia: Texto,
  }),
  linhas: z.object({
    x: z.number(),
    y: z.number(),
    largura: z.number().positive(),
    altura: z.number().positive(),
    quantidade: z.number().int().min(1).max(60),
    /** largura da coluna dos números */
    colunaNumero: z.number().positive(),
    /** espessura das linhas, em pontos */
    espessura: z.number().positive(),
    tamanhoNumero: z.number().positive(),
    fonteNumero: z.enum(FONTES),
    negritoNumero: z.boolean(),
    /** fundo cinza na caixa do número a cada 5 linhas (5, 10, 15…), como nos cadernos da FGV */
    cinzaCada5: z.boolean(),
    /** quanto escuro é esse cinza: 0 é branco, 1 é preto */
    cinza: z.number().min(0).max(1),
    /** o código "x/xxxxx - xxxxxxxxxxxxxx", logo abaixo da última linha */
    codigo: Texto,
  }),
  rodape: z.object({
    linha: z.object({ y: z.number(), x: z.number(), largura: z.number().positive(), espessura: z.number().positive() }),
    logoGrifo: Imagem,
    palavraGrifo: Texto,
    exame: Texto,
    logoProgresso: Imagem,
    simulado: Texto,
    materia: Texto,
    pagina: Texto,
  }),
  caligrafia: z.object({
    /** margens de cima e de baixo; as linhas têm a altura e a largura da folha de respostas */
    margemTopo: z.number().min(0),
    margemBase: z.number().min(0),
    /** a linha de meia altura (letra minúscula): de 0,2 a 0,8 da altura da linha, a partir da base */
    meiaLinha: z.number().min(0.2).max(0.8),
    numeroPagina: Texto,
  }),
});
export type Layout = z.infer<typeof LayoutSchema>;

const t = (x: number, y: number, tamanho: number, negrito = true, alinhamento: Texto["alinhamento"] = "esquerda"): Texto => ({
  x,
  y,
  tamanho,
  fonte: "helvetica",
  negrito,
  alinhamento,
});

/** As medidas das linhas seguem o caderno de textos definitivos da FGV: 30 linhas de 7,2 mm, coluna de números de 7 mm. */
export const PADRAO: Layout = {
  materia: "DIREITO PENAL",
  textos: {
    pecaTitulo: "PEÇA",
    pecaSubtitulo: "PROFISSIONAL - PÁGINA",
    pecaPagina: "{p}/{total}",
    questaoTitulo: "QUESTÃO {n}",
    atencaoPeca:
      "**\\*ATENÇÃO:** Utilize as 05 (cinco) primeiras páginas para transcrever a **PEÇA PROFISSIONAL**. Caso utilize um número inferior de páginas para sua resposta, as demais deverão permanecer em branco. As questões práticas devem ser respondidas a partir da página 06 (seis) deste caderno.",
    atencaoQuestao:
      "**\\*ATENÇÃO:** **QUESTÃO PRÁTICA Nº {nn}.** Em hipótese alguma transcreva a resposta de outra questão no espaço abaixo e não ultrapasse o limite de 30 (trinta) linhas, sob pena de ter o texto desconsiderado para avaliação.",
    rodapeExame: "{exame}º EXAME DE ORDEM UNIFICADO - 2ª FASE",
    rodapeSimulado: "SIMULADO PRÁTICO-PROFISSIONAL",
    rodapePagina: "Página {i} de {total}",
  },
  paginasPeca: 5,
  questoes: 4,
  cabecalho: {
    pecaTitulo: t(11, 18.5, 24),
    pecaSubtitulo: t(11, 24.5, 11),
    pecaPagina: t(66, 24.5, 34),
    questaoTitulo: t(11, 24.5, 34),
    atencao: { x: 11, y: 31, largura: 104, tamanho: 7.5, entrelinha: 1.3, fonte: "helvetica", justificar: true },
    numero: t(200, 14, 16, true, "direita"),
    barras: { x: 150, y: 17.5, largura: 50, altura: 10 },
    numeroBarras: t(175, 31, 8, false, "centro"),
    materia: t(200, 44, 12, true, "direita"),
  },
  linhas: {
    x: 11,
    y: 48,
    largura: 189,
    altura: 7.2,
    quantidade: 30,
    colunaNumero: 7,
    espessura: 0.5,
    tamanhoNumero: 7,
    fonteNumero: "helvetica",
    negritoNumero: false,
    cinzaCada5: true,
    cinza: 0.15,
    codigo: t(200, 267.2, 6.5, false, "direita"),
  },
  rodape: {
    linha: { y: 284, x: 11, largura: 189, espessura: 0.35 },
    logoGrifo: { x: 11, y: 283, altura: 5, alinhamento: "esquerda" },
    palavraGrifo: t(17.2, 283, 19.5),
    exame: t(11, 288.5, 7),
    logoProgresso: { x: 105.5, y: 283, altura: 7.5, alinhamento: "centro" },
    simulado: t(105.5, 288.5, 7, true, "centro"),
    materia: t(200, 283, 7, true, "direita"),
    pagina: t(200, 288.5, 7, false, "direita"),
  },
  caligrafia: {
    margemTopo: 10,
    margemBase: 10,
    meiaLinha: 0.5,
    numeroPagina: { x: 200, y: 293, tamanho: 6, fonte: "helvetica", negrito: false, alinhamento: "direita" },
  },
};

type Parcial<T> = { [K in keyof T]?: T[K] extends object ? Parcial<T[K]> : T[K] };

/** O padrão com o que foi gravado por cima (o que faltar no arquivo, de uma versão anterior, vem do padrão). */
export function mesclar<T>(base: T, por: Parcial<T> | undefined): T {
  if (!por || typeof base !== "object" || base === null) return (por as T) ?? base;
  const saida = { ...base } as Record<string, unknown>;
  for (const [k, v] of Object.entries(por)) {
    const b = (base as Record<string, unknown>)[k];
    saida[k] = b && typeof b === "object" && !Array.isArray(b) && v && typeof v === "object" ? mesclar(b, v as never) : v;
  }
  return saida as T;
}

/** O layout em vigor: o gravado (validado) sobre o padrão; se o arquivo estiver inválido, o padrão. */
export function layoutGravado(): Layout {
  const r = LayoutSchema.safeParse(mesclar(PADRAO, salvo as Parcial<Layout>));
  return r.success ? r.data : PADRAO;
}
