// Correção das respostas do quiz, com o mesmo normalizador/parser do simulador.
import { citacaoAtende, extrairCitacoes, formatarCitacao, parseDispositivo } from "@/lib/correcao/citacoes";
import { contextoCorrecao } from "@/lib/correcao/cliente";
import { identificarPeca } from "@/lib/correcao/grader";
import { normalize } from "@/lib/correcao/normalize";
import type { Nivel, Pergunta } from "./types";

export interface Correcao {
  acertou: boolean;
  acertouPeca: boolean;
  acertouFundamento: boolean | null; // null = não exigido no nível
  pecaEsperada: string;
  fundamentoEsperado: string;
}

export function nomePeca(tipo: string) {
  return contextoCorrecao().pecas[tipo]?.nome ?? tipo;
}

function fundamentoLegivel(p: Pergunta) {
  const ctx = contextoCorrecao();
  const c = parseDispositivo(p.resposta.fundamentos[0], ctx.lex);
  return c ? formatarCitacao(c, ctx.leis) : p.resposta.fundamentos[0];
}

/** nivel 1: `peca` é a chave escolhida entre as alternativas; níveis 2 e 3: texto digitado. */
export function corrigirResposta(p: Pergunta, nivel: Nivel, entrada: { peca: string; fundamento?: string }): Correcao {
  const ctx = contextoCorrecao();
  const acertouPeca =
    nivel === 1
      ? entrada.peca === p.resposta.peca
      : !!entrada.peca.trim() && identificarPeca(entrada.peca, p.resposta.peca, [], ctx).status === "ok";

  let acertouFundamento: boolean | null = null;
  if (nivel > 1) {
    const achadas = extrairCitacoes(normalize(entrada.fundamento ?? ""), ctx.lex);
    acertouFundamento = p.resposta.fundamentos.some((spec) => {
      const esp = parseDispositivo(spec, ctx.lex);
      if (!esp) return false;
      // Médio: só artigo + diploma. Difícil: também parágrafo, inciso e alínea.
      const alvo = nivel === 2 && esp.tipo === "art" ? { ...esp, pars: [], incs: [], als: [], caput: false } : esp;
      return achadas.some((a) => citacaoAtende(alvo, a));
    });
  }
  return {
    acertou: acertouPeca && acertouFundamento !== false,
    acertouPeca,
    acertouFundamento,
    pecaEsperada: nomePeca(p.resposta.peca),
    fundamentoEsperado: fundamentoLegivel(p),
  };
}
