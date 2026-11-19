"use client";

// O resumo de "Jogos" no cabeçalho: o recorde, as moedas e a experiência de cada jogo, e o treino de questões (quantas
// respostas e o acerto). Tudo do navegador.
import Link from "next/link";
import { useMemo } from "react";
import { ATIVIDADE_VAZIA, lerAtividade } from "@/lib/atividade";
import { resumoTreino } from "@/lib/estatisticas/desempenho";
import { lerJSON } from "@/lib/storage";
import { formatarMoedas, formatarXp } from "@/games/contadores";
import { JOGOS } from "@/games/registry";
import { NOME_NIVEL } from "@/quiz/pontuacao";
import type { PropsResumo } from "../LinkComResumo";
import styles from "../ResumoDesempenho.module.css";
import { pctTexto } from "./comum";

interface Salvo {
  recordes?: Record<string, number>;
  progresso?: { xp?: number; moedas?: number; comprados?: string[] };
}

function ler() {
  const jogos = JOGOS.map((j) => {
    const s = lerJSON<Salvo>(`grifo:jogo:${j.slug}`, {});
    const recordes = Object.entries(s.recordes ?? {}).filter(([, v]) => v > 0);
    const [nivel, recorde] = recordes.sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
    return { j, recorde, nivel: nivel as "1" | "2" | "3" | null, xp: s.progresso?.xp ?? 0, moedas: s.progresso?.moedas ?? 0, comprados: s.progresso?.comprados?.length ?? 0 };
  });
  let atividade = ATIVIDADE_VAZIA;
  try {
    atividade = lerAtividade();
  } catch {
    /* sem armazenamento: fica vazio */
  }
  return { jogos, treino: resumoTreino(atividade, null) };
}

export default function ResumoJogos({ onSair }: PropsResumo) {
  const d = useMemo(() => ler(), []);
  const respostas = d.treino.a + d.treino.e;

  return (
    <div className={styles.corpo}>
      <p className={styles.titulo}>
        Jogos <span>uma pergunta de 2ª fase a cada poder</span>
      </p>

      {d.jogos.map(({ j, recorde, nivel, xp, moedas, comprados }) => (
        <Link key={j.slug} className={styles.destaque} href={`/jogos/${j.slug}/`} onClick={onSair}>
          <b>
            {j.emoji} {j.titulo}
          </b>
          {recorde > 0 ? (
            <span>
              Recorde {recorde.toLocaleString("pt-BR")}
              {nivel ? ` no ${NOME_NIVEL[Number(nivel) as 1 | 2 | 3]}` : ""} · {formatarMoedas(moedas)} · {formatarXp(xp)}
              {comprados ? ` · ${comprados} ${comprados === 1 ? "item liberado" : "itens liberados"}` : ""}
            </span>
          ) : (
            <span>Você ainda não jogou. Os acertos viram moedas e experiência para liberar personagens e estilos.</span>
          )}
          <small>Jogar →</small>
        </Link>
      ))}

      <ul className={styles.pontos}>
        <li>
          <span>Treinar questões</span>
          <Link href="/treino/" onClick={onSair}>
            <b>{respostas ? `${pctTexto(d.treino.a / respostas)} em ${respostas.toLocaleString("pt-BR")} respostas →` : "Começar →"}</b>
          </Link>
        </li>
      </ul>

      <p className={styles.acoes}>
        <Link href="/jogos/" onClick={onSair}>
          Ver os jogos →
        </Link>
      </p>
    </div>
  );
}
