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
  lei: z.string(),
  texto: z.string(),
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
export const PecasCatalogoSchema = z.record(
  z.string(),
  z.object({
    nome: z.string(),
    aliases: z.array(z.string()).default([]),
  }),
);
export type PecasCatalogo = z.infer<typeof PecasCatalogoSchema>;

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
const PerguntaItemFonteSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  categoria: z.enum(["peca-detalhe", "discursiva"]),
  /** "peca" ou "q1".."q5" */
  parte: z.string().regex(/^(peca|q\d)$/),
  item: z.string(),
  secao: z.string().optional(),
  caso: z.string().min(20),
  comando: z.string(),
  gabarito: z.string(),
  opcoes: z.object({ correta: z.string(), erradas: z.array(z.string()).min(2) }),
  dispositivos: z.array(z.string()).default([]),
  revisao: RevisaoSchema,
});
export const PerguntasItensArquivoSchema = z.object({ exame: z.string(), perguntas: z.array(PerguntaItemFonteSchema) });
export type PerguntaItemFonte = z.infer<typeof PerguntaItemFonteSchema>;

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
