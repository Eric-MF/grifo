// Correção das respostas do quiz, com o mesmo normalizador/parser do simulador.
import { citacaoAtende, extrairCitacoes, formatarCitacao, parseDispositivo } from "@/lib/correcao/citacoes";
import { contextoCorrecao } from "@/lib/correcao/cliente";
import { avaliarItens, identificarPeca } from "@/lib/correcao/grader";
import { normalize } from "@/lib/correcao/normalize";
import type { Letra, Nivel, PerguntaItem, PerguntaObjetiva, PerguntaPeca } from "./types";

export interface CorrecaoPeca {
  formato: "peca";
  acertou: boolean;
  acertouPeca: boolean;
  acertouFundamento: boolean | null; // null = não exigido no nível
  pecaEsperada: string;
  fundamentoEsperado: string;
}

export interface CorrecaoItem {
  formato: "item";
  acertou: boolean;
  /** fração da nota do item (null no nível fácil, que é de alternativas) */
  fracao: number | null;
  faltou: string[];
}

export interface CorrecaoObjetiva {
  formato: "objetiva";
  acertou: boolean;
  escolhida: Letra;
  correta: Letra;
}

export type Correcao = CorrecaoPeca | CorrecaoItem | CorrecaoObjetiva;

export function nomePeca(tipo: string) {
  return contextoCorrecao().pecas[tipo]?.nome ?? tipo;
}

function fundamentoLegivel(p: PerguntaPeca) {
  const ctx = contextoCorrecao();
  const c = parseDispositivo(p.resposta.fundamentos[0], ctx.lex);
  return c ? formatarCitacao(c, ctx.leis) : p.resposta.fundamentos[0];
}

/** nivel 1: `peca` é a chave escolhida entre as alternativas; níveis 2 e 3: texto digitado. */
export function corrigirResposta(p: PerguntaPeca, nivel: Nivel, entrada: { peca: string; fundamento?: string }): CorrecaoPeca {
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
    formato: "peca",
    acertou: acertouPeca && acertouFundamento !== false,
    acertouPeca,
    acertouFundamento,
    pecaEsperada: nomePeca(p.resposta.peca),
    fundamentoEsperado: fundamentoLegivel(p),
  };
}

/** Nível 1: índice da alternativa. Médio: metade da nota do item. Difícil: o item inteiro. */
export function corrigirItem(p: PerguntaItem, nivel: Nivel, entrada: { opcao?: number; texto?: string }): CorrecaoItem {
  if (nivel === 1) return { formato: "item", acertou: !!p.opcoes[entrada.opcao ?? -1]?.correta, fracao: null, faltou: [] };
  const resultado = avaliarItens(p.itens, entrada.texto ?? "", contextoCorrecao());
  const valor = resultado.reduce((s, i) => s + i.valor, 0);
  const obtido = resultado.reduce((s, i) => s + i.obtido, 0);
  const fracao = valor ? obtido / valor : 0;
  const faltou = resultado.flatMap((i) => i.componentes.filter((c) => c.obtido < c.valor).flatMap((c) => c.faltou));
  return { formato: "item", acertou: fracao >= (nivel === 2 ? 0.5 : 0.999), fracao, faltou };
}

export function corrigirObjetiva(p: PerguntaObjetiva, escolhida: Letra): CorrecaoObjetiva {
  return { formato: "objetiva", acertou: escolhida === p.correta, escolhida, correta: p.correta };
}
