"use client";

// O que o navegador guardou da pessoa, lido uma vez depois de montar (o site é estático: no build não há nada).
import { useEffect, useState } from "react";
import { ATIVIDADE_VAZIA, lerAtividade, type Atividade } from "@/lib/atividade";
import { lerEventos, type Evento } from "@/lib/erros";
import { melhoresPorExame, resumirTentativa, type ResumoTentativa } from "@/lib/estatisticas/desempenho";
import { lerLeitura } from "@/lib/leis/leitura";
import { lerJSON } from "@/lib/storage";
import { listarTentativas } from "@/lib/tentativas";
import { lerRecordes, type Recordes } from "@/quiz/recordes";
import { JOGOS } from "@/games/registry";
import type { LeiEstat } from "@/lib/estatisticas/tipos";

export interface JogoPessoal {
  slug: string;
  titulo: string;
  xp: number;
  moedas: number;
  recorde: number;
}

export interface DadosPessoais {
  tentativas: ResumoTentativa[];
  melhores: Map<string, ResumoTentativa & { vezes: number }>;
  atividade: Atividade;
  eventos: Evento[];
  /** recordes do treino: de pontos em cada modo e a maior sequência de acertos (src/quiz/recordes.ts) */
  recordesTreino: Recordes;
  jogos: JogoPessoal[];
  /** unidades lidas de cada lei do leitor e o último artigo lido */
  leitura: Record<string, { n: number; rotulo: string | null }>;
  agora: number;
}

function ler(leis: LeiEstat[]): DadosPessoais {
  const tentativas = listarTentativas()
    .filter((t) => t?.resultado?.partes)
    .map(resumirTentativa);
  const jogos = JOGOS.map((j) => {
    const salvo = lerJSON<{ recordes?: Record<string, number>; progresso?: { xp?: number; moedas?: number } }>(`grifo:jogo:${j.slug}`, {});
    const recordes = Object.values(salvo.recordes ?? {}).filter((n) => typeof n === "number");
    return { slug: j.slug, titulo: j.titulo, xp: salvo.progresso?.xp ?? 0, moedas: salvo.progresso?.moedas ?? 0, recorde: recordes.length ? Math.max(...recordes) : 0 };
  });
  return {
    tentativas,
    melhores: melhoresPorExame(tentativas),
    atividade: lerAtividade(),
    eventos: lerEventos(),
    recordesTreino: lerRecordes(),
    jogos,
    leitura: Object.fromEntries(
      leis.map((l) => {
        const x = lerLeitura(l.id);
        return [l.id, { n: Math.min(x.n, l.unidades), rotulo: x.rotulo }];
      }),
    ),
    agora: Date.now(),
  };
}

export const DADOS_VAZIOS: DadosPessoais = {
  tentativas: [],
  melhores: new Map(),
  atividade: ATIVIDADE_VAZIA,
  eventos: [],
  recordesTreino: { modos: {} },
  jogos: [],
  leitura: {},
  agora: 0,
};

/** null até ler (no build e no primeiro desenho), para a página não piscar com "nenhum dado". */
export function useDadosPessoais(leis: LeiEstat[]): DadosPessoais | null {
  const [dados, setDados] = useState<DadosPessoais | null>(null);
  useEffect(() => {
    const atualizar = () => setDados(ler(leis));
    atualizar();
    // outra aba (um simulado terminado, um treino) muda os dados: relê ao voltar para esta
    const aoVoltar = () => document.visibilityState === "visible" && atualizar();
    window.addEventListener("storage", atualizar);
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      window.removeEventListener("storage", atualizar);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [leis]);
  return dados;
}
