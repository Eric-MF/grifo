// Monta o pedido de correção por IA, valida a resposta e soma as notas.
// A IA decide, componente a componente, se o critério foi atendido; quem soma a nota
// é o site (limitada aos valores da tabela), então a IA não consegue "inventar" pontos.

import { round2 } from "@/lib/correcao/grader";
import { z } from "zod";
import type { Exame, Item } from "@/content/schema";
import { chamar, ErroIA } from "./provedores";
import type { ProvedorId, ResultadoIA } from "./types";

const SISTEMA = `Você é examinador(a) da 2ª fase do Exame de Ordem (OAB/FGV), área Direito Penal.
Corrija a resposta do examinando estritamente pela tabela de "Distribuição dos Pontos" fornecida.

Regras da banca que você deve aplicar:
- Cada componente vale o valor indicado ou zero. Não há meio-termo dentro de um componente.
- Pontue a tese quando o examinando a desenvolveu com as próprias palavras, mesmo sem usar os termos exatos do gabarito. Sinônimos e formulações equivalentes contam.
- "A mera citação do dispositivo legal não confere pontuação": um componente de dispositivo legal só pontua se o componente de tese do mesmo item também pontuou (campo "requer").
- Dispositivo legal com número, parágrafo, inciso ou diploma errado não pontua.
- Na peça, se o examinando redigiu uma peça diferente da cabível (peça inadequada), informe peca_adequada = false.
- Não dê pontos por conteúdo que não está no texto. Na dúvida, não pontue e explique o motivo.

Responda SOMENTE com JSON no formato pedido. Justificativas curtas (até 2 frases), em português, dirigidas ao examinando.`;

function descreverItens(itens: Item[]) {
  return itens.map((it) => ({
    n: it.n,
    secao: it.secao,
    descricao: it.descricao,
    componentes: it.componentes.map((c) => ({
      id: c.id,
      valor: c.valor,
      criterio: c.rotulo ?? (c.dispositivo ? `Dispositivo: ${c.dispositivo.join(" ou ")}` : (c.termos ?? c.alternativas?.flat() ?? []).join(" + ")),
      requer: c.requer,
    })),
  }));
}

function montarPedido(exame: Exame, respostas: { peca: string; questoes: string[] }) {
  const partes = [
    { parte: "peca", titulo: `Peça: ${exame.peca.nome}`, enunciado: exame.peca.enunciado, gabarito: exame.peca.gabarito_comentado, itens: descreverItens(exame.peca.itens), resposta: respostas.peca },
    ...exame.questoes.map((q, i) => ({
      parte: `q${q.n}`,
      titulo: `Questão ${q.n}`,
      enunciado: q.enunciado,
      gabarito: q.gabarito_comentado,
      itens: descreverItens(q.itens),
      resposta: respostas.questoes[i] ?? "",
    })),
  ];
  const usuario = partes
    .map(
      (p) =>
        `## ${p.titulo} (parte "${p.parte}")\n\n### Enunciado\n${p.enunciado}\n\n### Gabarito comentado da FGV\n${p.gabarito}\n\n### Tabela de pontos\n${JSON.stringify(p.itens, null, 1)}\n\n### Resposta do examinando\n<<<\n${p.resposta.trim() || "(em branco)"}\n>>>`,
    )
    .join("\n\n---\n\n");
  return { sistema: SISTEMA, usuario: `${exame.numeral} Exame de Ordem — Direito Penal.\n\n${usuario}` };
}

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["peca_adequada", "itens", "comentario_geral"],
  properties: {
    peca_adequada: { type: "boolean" },
    itens: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["parte", "n", "componentes"],
        properties: {
          parte: { type: "string" },
          n: { type: "string" },
          componentes: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["id", "atendido", "justificativa"],
              properties: {
                id: { type: "string" },
                atendido: { type: "boolean" },
                justificativa: { type: "string" },
                trecho: { type: "string" },
              },
            },
          },
        },
      },
    },
    comentario_geral: { type: "string" },
  },
} as const;

const RespostaSchema = z.object({
  peca_adequada: z.boolean().default(true),
  itens: z.array(
    z.object({
      parte: z.string(),
      n: z.coerce.string(),
      componentes: z.array(
        z.object({ id: z.string(), atendido: z.boolean(), justificativa: z.string().default(""), trecho: z.string().optional() }),
      ),
    }),
  ),
  comentario_geral: z.string().default(""),
});

function extrairJSON(texto: string): unknown {
  const t = texto.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try {
    return JSON.parse(t);
  } catch {
    const a = t.indexOf("{");
    const b = t.lastIndexOf("}");
    if (a >= 0 && b > a) return JSON.parse(t.slice(a, b + 1));
    throw new ErroIA("A IA respondeu em um formato inesperado.", "resposta");
  }
}


export async function corrigirComIA(
  exame: Exame,
  respostas: { peca: string; questoes: string[] },
  cfg: { provedor: ProvedorId; modelo: string; chave: string; signal?: AbortSignal },
): Promise<ResultadoIA> {
  const { sistema, usuario } = montarPedido(exame, respostas);
  const texto = await chamar({ ...cfg, sistema, usuario, schema: SCHEMA as unknown as Record<string, unknown> });
  const parsed = RespostaSchema.safeParse(extrairJSON(texto));
  if (!parsed.success) throw new ErroIA("A resposta da IA não seguiu o formato esperado.", "resposta");
  const r = parsed.data;

  // Recalcula a nota a partir da tabela: só valores oficiais, regra do "requer".
  const partesDef = [
    { parte: "peca", itens: exame.peca.itens, valor: exame.peca.valor },
    ...exame.questoes.map((q) => ({ parte: `q${q.n}`, itens: q.itens, valor: q.valor })),
  ];
  const itens: ResultadoIA["itens"] = [];
  const partes = partesDef.map((pd) => {
    let soma = 0;
    for (const it of pd.itens) {
      const doIA = r.itens.find((x) => x.parte === pd.parte && x.n === it.n);
      const atendidos = new Map(doIA?.componentes.map((c) => [c.id, c]) ?? []);
      const comps = it.componentes.map((c) => {
        const a = atendidos.get(c.id);
        let ok = !!a?.atendido;
        if (ok && c.requer && !atendidos.get(c.requer)?.atendido) ok = false;
        return { id: c.id, obtido: ok ? c.valor : 0, justificativa: a?.justificativa ?? "Não avaliado pela IA.", trecho: a?.trecho };
      });
      const doItem = comps.reduce((s, c) => s + c.obtido, 0);
      soma += it.teto ? Math.min(it.teto, doItem) : doItem;
      itens.push({ parte: pd.parte, n: it.n, componentes: comps });
    }
    const vazia = pd.parte === "peca" ? !respostas.peca.trim() : !respostas.questoes[Number(pd.parte.slice(1)) - 1]?.trim();
    let obtido = round2(soma);
    if (vazia || (pd.parte === "peca" && !r.peca_adequada)) obtido = 0;
    return { parte: pd.parte, obtido, valor: pd.valor };
  });

  return {
    provedor: cfg.provedor,
    modelo: cfg.modelo,
    criadoEm: Date.now(),
    itens,
    partes,
    total: round2(partes.reduce((s, p) => s + p.obtido, 0)),
    comentarioGeral: (r.peca_adequada ? "" : "A IA considerou a peça inadequada (nota zero na peça, conforme o edital). ") + r.comentario_geral,
  };
}
