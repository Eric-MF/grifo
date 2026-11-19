// Esquemas (zod) de todo o conteúdo editável em content/. O script
// scripts/build-content.ts valida os YAML com estes esquemas e gera
// src/content/generated/*.json, que é o que o site importa.
//
// Importante: este arquivo é executado também pelo Node puro (type stripping),
// então use apenas imports relativos com extensão .ts e nada de enums.

import { z } from "zod";

const RevisaoSchema = z
  .object({
    status: z.enum(["rascunho", "revisado"]).default("rascunho"),
    por: z.string().default(""),
    em: z.string().default(""),
    notas: z.string().default(""),
  })
  .default({ status: "rascunho", por: "", em: "", notas: "" });

/**
 * Um componente é a menor unidade pontuável de um item da tabela FGV, ex.:
 *   "prazo de 5 dias (0,10)"  → { valor: 0.10, termos: ["prazo", "5 dias"] }
 *   "Art. 586 do CPP (0,10)"  → { valor: 0.10, dispositivo: ["art. 586 CPP"], requer: c1 }
 *
 * - termos: TODOS devem aparecer (E). Dentro de um termo, "a | b" = OU.
 *   Sufixo * = prefixo de palavra ("retrat*"). Prefixo "re:" = expressão regular
 *   aplicada ao texto normalizado.
 * - alternativas: lista de conjuntos de termos; basta UM conjunto casar (OU de E).
 * - dispositivo: basta UMA das citações aparecer na resposta.
 * - dispositivo + termos no mesmo componente: pontua se QUALQUER um dos dois casar
 *   (ex.: "entendimento do STJ ou Art. 72 do CP").
 * - requer: id de outro componente que precisa ter pontuado (regra FGV "a mera
 *   citação do dispositivo legal não confere pontuação").
 */
const ComponenteSchema = z
  .object({
    id: z.string(),
    valor: z.number().positive(),
    rotulo: z.string().optional(),
    termos: z.array(z.string()).optional(),
    alternativas: z.array(z.array(z.string())).optional(),
    dispositivo: z.array(z.string()).optional(),
    requer: z.string().optional(),
  })
  .refine((c) => c.termos || c.alternativas || c.dispositivo, {
    message: "componente precisa de termos, alternativas ou dispositivo",
  });

const ItemSchema = z.object({
  n: z.string(),
  secao: z.string().optional(),
  descricao: z.string(),
  /** Pontuação máxima do item quando a FGV manda escolher entre teses ("no mínimo 3 pedidos, máximo 1,5"). */
  teto: z.number().positive().optional(),
  /** Valores possíveis publicados pela FGV (ex.: [0, 0.10, 0.20]). Informativo. */
  valores: z.array(z.number()).optional(),
  /** Pontos que a FGV concede a todos quando anula o item. */
  anulado: z.number().positive().optional(),
  componentes: z.array(ComponenteSchema).default([]),
}).refine((it) => it.componentes.length > 0 || it.anulado !== undefined, {
  message: "item precisa de componentes ou de anulado",
});

const PecaSchema = z.object({
  nome: z.string(),
  /** Chave em content/pecas.yaml (ex.: "agravo-execucao"). */
  tipo: z.string(),
  /** Outros nomes aceitos para a peça (sem acento, minúsculo). */
  aliases: z.array(z.string()).default([]),
  enunciado: z.string(),
  gabarito_comentado: z.string().default(""),
  linhas: z.number().int().default(150),
  valor: z.number().default(5),
  itens: z.array(ItemSchema),
});

const QuestaoSchema = z.object({
  n: z.number().int(),
  enunciado: z.string(),
  gabarito_comentado: z.string().default(""),
  linhas: z.number().int().default(30),
  valor: z.number().default(1.25),
  itens: z.array(ItemSchema),
});

const NotaAtualizacaoSchema = z.object({
  /** "peca" ou "q1".."q4"; item opcional ("6.1", "A"). */
  alvo: z.string(),
  item: z.string().optional(),
  /** a lei que mudou ou, na jurisprudência, o precedente ("STF, HC 111.840 e Tema 972") */
  lei: z.string(),
  texto: z.string(),
  /** "lei": a lei mudou depois da prova; "jurisprudencia": o STF ou o STJ mudou a leitura da lei */
  tipo: z.enum(["lei", "jurisprudencia"]).default("lei"),
});

export const ExameSchema = z.object({
  id: z.string().regex(/^\d{2}(-[a-z-]+)?$/),
  numero: z.number().int(),
  numeral: z.string(),
  /** Variante regional (ex.: "Porto Alegre"), quando a FGV aplicou prova diferente. */
  variante: z.string().optional(),
  aplicacao: z.string().optional(),
  area: z.literal("penal").default("penal"),
  revisao: RevisaoSchema,
  /** false = há caderno mas não há gabarito: aparece em Provas, sem simulado corrigido. */
  corrigivel: z.boolean().default(true),
  peca: PecaSchema,
  questoes: z.array(QuestaoSchema),
  atualizado: z
    .object({
      revisao: RevisaoSchema,
      notas: z.array(NotaAtualizacaoSchema).default([]),
      /**
       * Os nomes da mitologia nos PDFs atualizados. Por parte ("peca", "q1"…): o primeiro nome da pessoa na prova → o
       * nome novo, do mesmo gênero (src/lib/nomes/trocar.ts). Em "empresas", para a prova toda: o nome da empresa ou
       * do lugar → o novo ("Banco Peixe" → "Banco Hefesto").
       */
      nomes: z.record(z.string(), z.record(z.string(), z.string())).default({}),
      /**
       * Erros materiais da prova corrigidos nos PDFs atualizados: na parte `alvo` ("peca", "q1"…), cada troca muda o
       * trecho `de` em todos os textos da parte (enunciado, gabarito comentado e itens) para `para`, com os nomes da
       * prova original. A versão atualizada fica como se a prova tivesse saído certa; o `motivo`, no fim do padrão de
       * resposta, é o único lugar que conta o erro.
       */
      correcoes: z
        .array(z.object({ alvo: z.string(), trocas: z.array(z.object({ de: z.string(), para: z.string() })).min(1), motivo: z.string() }))
        .default([]),
      /** outras diferenças em relação à prova original, listadas no fim dos PDFs (a tabela de pontos estimada…) */
      diferencas: z.array(z.object({ alvo: z.string().optional(), texto: z.string() })).default([]),
    })
    .optional(),
  observacoes: z.string().optional(),
});

export type Revisao = z.infer<typeof RevisaoSchema>;
export type Componente = z.infer<typeof ComponenteSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type Peca = z.infer<typeof PecaSchema>;
export type Questao = z.infer<typeof QuestaoSchema>;
export type Exame = z.infer<typeof ExameSchema>;

// ---------------------------------------------------------------------------
// Legislação: aliases de diplomas usados pelo parser de citações.
// ---------------------------------------------------------------------------
export const LeisSchema = z.object({
  diplomas: z.record(
    z.string(),
    z.object({
      nome: z.string(),
      aliases: z.array(z.string()).min(1),
      planalto: z.string().url().optional(),
      ler: z.boolean().default(false),
      tipo: z.enum(["codigo", "constituicao", "estatuto", "lei"]).optional(),
      sigla: z.string().optional(),
      numero: z.string().optional(),
      ano: z.number().int().optional(),
    }),
  ),
  tribunais: z.record(z.string(), z.array(z.string())),
});
export type Leis = z.infer<typeof LeisSchema>;

// ---------------------------------------------------------------------------
// Catálogo de peças (detecção de "peça inadequada" e sinônimos do quiz).
// ---------------------------------------------------------------------------
/** Grupos das peças pelo momento do processo, nas estatísticas (cada um com uma cor, `--peca-<grupo>` em globals.css). */
export const GRUPOS_PECA = ["defesa", "recurso", "contrarrazoes", "execucao", "prisao", "autonoma", "acusacao"] as const;
export type GrupoPeca = (typeof GRUPOS_PECA)[number];

export const PecasCatalogoSchema = z.record(
  z.string(),
  z.object({
    nome: z.string(),
    aliases: z.array(z.string()).default([]),
    /** Siglas e nomes curtos aceitos só no campo de peça do quiz (no texto inteiro do simulador dariam falso positivo). */
    siglas: z.array(z.string()).default([]),
    /** Fundamento padrão da peça (o artigo em que ela se apoia), do principal para o complementar. */
    fundamento: z.array(z.string()).default([]),
    /** Ficha da peça nas estatísticas: o grupo, o prazo e quando cabe (uma frase cada). */
    grupo: z.enum(GRUPOS_PECA).optional(),
    prazo: z.string().optional(),
    cabimento: z.string().optional(),
  }),
);
export type PecasCatalogo = z.infer<typeof PecasCatalogoSchema>;

// ---------------------------------------------------------------------------
// Histórico das peças para as estatísticas (content/historico.yaml): os exames da OAB/SP anteriores à unificação,
// que não têm prova no site, e a linha do tempo da unificação.
// ---------------------------------------------------------------------------
export const BANCAS_ANTIGAS = ["vunesp", "vunesp-cespe", "cespe"] as const;

export const HistoricoSchema = z.object({
  /** Peças desses exames que não estão em content/pecas.yaml (lá, elas entrariam na detecção do simulador). */
  pecas_extras: z
    .record(
      z.string(),
      z.object({
        nome: z.string(),
        grupo: z.enum(GRUPOS_PECA),
        fundamento: z.array(z.string()).default([]),
        prazo: z.string().optional(),
        cabimento: z.string().optional(),
      }),
    )
    .default({}),
  exames_antigos: z.array(
    z.object({
      /** a numeração da OAB/SP (110º, 111º…) */
      numero: z.number().int(),
      banca: z.enum(BANCAS_ANTIGAS),
      /** o nome nacional do exame, quando houver ("2009.3") */
      rotulo: z.string().optional(),
      /** o ano da 2ª fase */
      ano: z.number().int().optional(),
      /** o ano saiu da sequência dos exames (três por ano), não de uma notícia */
      estimado: z.boolean().optional(),
      /** a data da 2ª fase (AAAA-MM-DD), quando uma notícia da época a confirma */
      data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      /** chaves de content/pecas.yaml ou de pecas_extras, na ordem do levantamento */
      pecas: z.array(z.string()).min(1),
    }),
  ),
  linha_do_tempo: z.array(
    z.object({
      quando: z.string(),
      /** onde o marco fica no eixo do tempo (AAAA ou AAAA-MM); com `ate`, ocupa o intervalo */
      de: z.string().regex(/^\d{4}(-\d{2})?$/),
      ate: z.string().regex(/^\d{4}(-\d{2})?$/).optional(),
      /** nome curto, no marcador do eixo */
      rotulo: z.string(),
      titulo: z.string(),
      texto: z.string(),
      /** id de um exame do site, para o link (ex.: "01") */
      exame: z.string().optional(),
      /** uma linha em destaque, embaixo do texto ("Peça: Memoriais") */
      destaque: z.string().optional(),
      /** a época, que dá a cor do ponto */
      era: z.enum([...BANCAS_ANTIGAS, "fgv"]),
    }),
  ),
});
export type Historico = z.infer<typeof HistoricoSchema>;

// ---------------------------------------------------------------------------
// Nomes das questões: as pessoas das provas (content/nomes-pessoas.yaml) e os nomes que as substituem na tela
// (content/nomes-mitologia.yaml). Ver src/lib/nomes/marcar.ts.
// ---------------------------------------------------------------------------
export const NomesPessoasSchema = z.object({
  masculinos: z.array(z.string()),
  femininos: z.array(z.string()),
  sobrenomes: z.array(z.string()).default([]),
  antes_de_lugar: z.array(z.string()).default([]),
  expressoes: z.array(z.string()).default([]),
  nao_pessoas: z.array(z.string()).default([]),
});
export const NomesMitologiaSchema = z.object({
  masculinos: z.array(z.string()).min(12),
  femininos: z.array(z.string()).min(12),
  /** como a voz deve dizer os nomes que a escrita engana ("Medeia" → "Medéia"): só na leitura em voz alta */
  pronuncia: z.record(z.string(), z.string()).default({}),
});

// ---------------------------------------------------------------------------
// Promoções (anúncios da casa, slots de publicidade e vídeos do YouTube).
// ---------------------------------------------------------------------------
const PromoSchema = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.literal("house"),
    id: z.string(),
    titulo: z.string(),
    texto: z.string(),
    cta: z.string().default("Saiba mais"),
    /** Vazio = usa COURSE_URL de src/config/site.ts. */
    href: z.string().default(""),
    peso: z.number().default(1),
  }),
  z.object({
    tipo: z.literal("ad"),
    id: z.string(),
    /** Identificador do slot na rede de anúncios (ex.: AdSense data-ad-slot). */
    slot: z.string().default(""),
    peso: z.number().default(1),
  }),
  z.object({
    tipo: z.literal("youtube"),
    id: z.string(),
    video: z.string(),
    titulo: z.string(),
    peso: z.number().default(1),
  }),
]);
export const PromosSchema = z.object({
  /** Onde cada promo pode aparecer. */
  locais: z.record(z.string(), z.array(z.string())),
  promos: z.array(PromoSchema),
});
export type Promo = z.infer<typeof PromoSchema>;
export type Promos = z.infer<typeof PromosSchema>;

// ---------------------------------------------------------------------------
// Perguntas fixas do quiz (content/perguntas/*.yaml) — somam-se aos geradores.
// ---------------------------------------------------------------------------
const PerguntaFixaSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  caso: z.string().min(40),
  comando: z.string().default("Qual a peça cabível e o seu fundamento legal?"),
  /** chave de content/pecas.yaml */
  peca: z.string(),
  /** do mais esperado ao alternativo; no nível difícil exige parágrafo/inciso do que estiver escrito */
  fundamentos: z.array(z.string()).min(1),
  explicacao: z.string(),
  fonte: z.string().default("Grifo"),
  distratores: z.array(z.string()).default([]),
  peso: z.number().default(1),
  revisao: RevisaoSchema,
});
export const PerguntasArquivoSchema = z.object({ perguntas: z.array(PerguntaFixaSchema) });
export type PerguntaFixa = z.infer<typeof PerguntaFixaSchema>;

// ---------------------------------------------------------------------------
// Perguntas tiradas dos itens das provas discursivas (content/perguntas/discursivas/<exame>.yaml).
// Os componentes de correção não se repetem aqui: vêm do item do exame (parte + item).
// ---------------------------------------------------------------------------
/** O que o ponto central digitado precisa ter: uma lista de termos (todos) ou listas alternativas (basta uma inteira). */
const AceitosSchema = z.union([z.array(z.string().min(1)).min(1), z.array(z.array(z.string().min(1)).min(1)).min(1)]);

/**
 * Uma tese de um item da tabela de pontos (da peça ou de uma questão discursiva), em "Por dentro da peça" e "Questões
 * discursivas". Ver PerguntaTese em src/quiz/types.ts.
 */
const PerguntaTeseFonteSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    categoria: z.enum(["peca-detalhe", "discursiva"]),
    /** "peca" ou "q1".."q5" */
    parte: z.string().regex(/^(peca|q\d)$/),
    item: z.string(),
    secao: z.string().optional(),
    /** a introdução desta pergunta, quando a da parte (em `introducoes`) não serve */
    introducao: z.string().min(40).optional(),
    /** a pergunta do médio e do difícil: aponta para o ponto central, sem dizê-lo */
    pergunta: z.string().min(10),
    /** o ponto central, como aparece na correção */
    tese: z.string().min(3),
    /** os termos que o ponto central digitado precisa ter, na sintaxe da correção ("homicidio culposo", "desclassifica*") */
    aceitos: AceitosSchema,
    /** os dispositivos aceitos, do esperado para os alternativos */
    artigos: z.array(z.string()).min(1),
    /** o padrão de respostas, mostrado depois de responder */
    gabarito: z.string(),
    revisao: RevisaoSchema,
  })
  .strict();
export const PerguntasItensArquivoSchema = z
  .object({
    exame: z.string(),
    /** a introdução de cada parte (a peça, cada questão): o caso em poucas linhas, sem as respostas */
    introducoes: z.record(z.string().regex(/^(peca|q\d)$/), z.string().min(40)).default({}),
    /** itens deixados fora do jogo de propósito (sem artigo, ou com a resposta superada por lei nova): o gerador não os recria */
    fora: z.array(z.string().regex(/^[a-z0-9-]+$/)).default([]),
    perguntas: z.array(PerguntaTeseFonteSchema),
  })
  .strict();
export type PerguntaTeseFonte = z.infer<typeof PerguntaTeseFonteSchema>;

// ---------------------------------------------------------------------------
// Questões objetivas da 1ª fase, só Penal e Processo Penal (content/objetivas/<exame>.yaml).
// ---------------------------------------------------------------------------
const LetraSchema = z.enum(["A", "B", "C", "D"]);
const ObjetivaSchema = z.object({
  /** número no caderno Tipo 1 */
  n: z.number().int().positive(),
  disciplina: z.enum(["penal", "processo-penal"]),
  enunciado: z.string().min(20),
  alternativas: z.object({ A: z.string(), B: z.string(), C: z.string(), D: z.string() }),
  correta: LetraSchema,
  /** a questão pergunta a peça ou o recurso cabível: entra também em "Peça e fundamento" */
  peca: z.string().optional(),
  dispositivos: z.array(z.string()).default([]),
  revisao: RevisaoSchema,
});
export const ObjetivasArquivoSchema = z.object({
  exame: z.string(),
  /** números das questões de cada disciplina no Tipo 1, conferidos à mão */
  faixa: z.object({ penal: z.array(z.number().int().positive()), processoPenal: z.array(z.number().int().positive()) }),
  anuladas: z.array(z.number()).default([]),
  questoes: z.array(ObjetivaSchema),
});
export type ObjetivasArquivo = z.infer<typeof ObjetivasArquivoSchema>;

// ---------------------------------------------------------------------------
// Datas de vigência das leis alteradoras (content/leis-alteradoras.yaml).
// ---------------------------------------------------------------------------
const DataIsoSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use AAAA-MM-DD");
const AlteradoraSchema = z
  .object({
    nome: z.string().optional(),
    assinatura: DataIsoSchema.optional(),
    publicacao: DataIsoSchema.optional(),
    vigencia: DataIsoSchema.optional(),
    aproximada: z.boolean().optional(),
    padrao: z.string().optional(),
    locais: z.record(z.string(), z.object({ vigencia: DataIsoSchema, rotulo: z.string() }).strict()).optional(),
    marcos: z.array(z.object({ data: DataIsoSchema, aproximada: z.boolean().optional(), disp: z.array(z.string()) }).strict()).optional(),
    url: z.string().optional(),
    pendencia: z.string().optional(),
    nota: z.string().optional(),
    manual: z.boolean().optional(),
  })
  .strict();
export const AlteradorasArquivoSchema = z.record(z.string(), AlteradoraSchema.nullable());

// ---------------------------------------------------------------------------
// Grifos prontos do leitor (content/grifos/*.yaml): uma lista de entradas por arquivo. Ver src/lib/leis/grifos.ts.
//   - { cor: pecas, grupo: "Constituição Federal", tema: "Relaxamento de prisão", lei: cf, disp: art5.i65, palavras: ["relaxada"] }
// ---------------------------------------------------------------------------
export const GrifoEntradaSchema = z
  .object({
    cor: z.enum(["pecas", "teses", "sumulas", "pedidos"]),
    grupo: z.string(),
    tema: z.string().min(1),
    lei: z.string().min(1),
    disp: z.string().min(1),
    palavras: z.array(z.string().min(1)).min(1),
    nota: z.string().optional(),
  })
  .strict();
export type GrifoEntrada = z.infer<typeof GrifoEntradaSchema>;
