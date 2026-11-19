// O palpite da peça do próximo exame, a partir dos exames anteriores: quantas vezes cada peça caiu e há quanto tempo
// ela não cai, comparado com o intervalo médio dela. É uma conta sobre o passado, não uma previsão da FGV.
import { rankingDePecas } from "./exames";
import type { ExameEstat } from "./tipos";

/** O atraso conta até 3 vezes o intervalo médio: depois disso, esperar mais não aumenta a chance. */
export const ATRASO_MAXIMO = 3;
/** O peso do tempo sem cair: 0 = só a frequência; 1 = a frequência e o atraso em partes iguais; 2 = o atraso pesa o dobro. */
export const PESO_PADRAO = 1;
/** O teste do palpite começa com 10 exames de história. */
export const HISTORIA_MINIMA = 10;

export interface LinhaPalpite {
  tipo: string;
  /** a chance estimada, de 0 a 1 (a soma das peças dá 1) */
  chance: number;
  vezes: number;
  /** a fração dos exames em que caiu */
  fracao: number;
  /** exames desde a última vez (0 = caiu no mais recente) */
  desdeUltima: number;
  /** de quantos em quantos exames ela cai, em média (o número de exames dividido pelas vezes) */
  esperado: number;
  /** os exames sem cair (contando o próximo) divididos pelo intervalo médio: 1 = está na média; acima, atrasada */
  atraso: number;
}

/**
 * A chance de cada peça no exame seguinte aos da lista: a fração dos exames em que caiu, vezes o atraso elevado ao
 * `peso`. As reaplicações não entram (são a mesma rodada de outra prova).
 */
export function palpite(lista: ExameEstat[], peso = PESO_PADRAO): LinhaPalpite[] {
  const exames = lista.filter((e) => !e.variante);
  const n = exames.length;
  if (!n) return [];
  const linhas = rankingDePecas(exames).map((l) => {
    const esperado = n / l.vezes;
    const atraso = (l.desdeUltima + 1) / esperado;
    return {
      tipo: l.tipo,
      vezes: l.vezes,
      fracao: l.fracao,
      desdeUltima: l.desdeUltima,
      esperado,
      atraso,
      chance: l.fracao * Math.pow(Math.min(atraso, ATRASO_MAXIMO), peso),
    };
  });
  const total = linhas.reduce((s, l) => s + l.chance, 0);
  for (const l of linhas) l.chance = total ? l.chance / total : 0;
  return linhas.sort((a, b) => b.chance - a.chance || b.vezes - a.vezes || a.desdeUltima - b.desdeUltima);
}

export interface TestePalpite {
  /** quantos exames foram testados */
  testados: number;
  /** o primeiro exame testado */
  desde: ExameEstat | null;
  /** a peça mais provável era a do exame */
  acertos: number;
  /** a peça do exame estava entre as 3 mais prováveis */
  entreTres: number;
  /** os exames em que a 1ª do palpite acertou, e aqueles em que a peça estava entre as 3 primeiras */
  acertosEm: ExameEstat[];
  entreTresEm: ExameEstat[];
}

/**
 * O palpite testado no passado: para cada exame com pelo menos `HISTORIA_MINIMA` exames antes dele, o palpite feito
 * só com os anteriores (os últimos `janela`, se houver) acertaria a peça? Num exame antigo com várias peças, vale
 * qualquer uma delas.
 */
export function testarPalpite(historia: ExameEstat[], peso = PESO_PADRAO, janela: number | null = null): TestePalpite {
  const exames = historia.filter((e) => !e.variante);
  const r: TestePalpite = { testados: 0, desde: null, acertos: 0, entreTres: 0, acertosEm: [], entreTresEm: [] };
  for (let i = HISTORIA_MINIMA; i < exames.length; i++) {
    const antes = exames.slice(janela ? Math.max(0, i - janela) : 0, i);
    const p = palpite(antes, peso);
    const alvo = new Set(exames[i]!.pecas);
    r.testados++;
    r.desde ??= exames[i]!;
    if (p[0] && alvo.has(p[0].tipo)) {
      r.acertos++;
      r.acertosEm.push(exames[i]!);
    }
    if (p.slice(0, 3).some((l) => alvo.has(l.tipo))) {
      r.entreTres++;
      r.entreTresEm.push(exames[i]!);
    }
  }
  return r;
}
