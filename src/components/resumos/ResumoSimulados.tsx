"use client";

// O resumo de "Simulados" no cabeçalho: o simulado em andamento (com o tempo do cronômetro), as últimas correções
// (cada uma abre a correção), quantos a pessoa fez e o próximo exame ainda não feito.
import Link from "next/link";
import { useMemo } from "react";
import indice from "@/content/generated/exames-index.json";
import { NOTA_CORTE } from "@/lib/correcao/grader";
import { melhoresPorExame, resumirTentativa, resumoSimulados } from "@/lib/estatisticas/desempenho";
import { fmtNota, fmtTempo } from "@/lib/formato";
import { lerRascunho, listarTentativas } from "@/lib/tentativas";
import type { PropsResumo } from "../LinkComResumo";
import styles from "../ResumoDesempenho.module.css";
import { haQuanto, numeralDe } from "./comum";

function ler() {
  const tentativas = listarTentativas()
    .filter((t) => t?.resultado?.partes)
    .map(resumirTentativa)
    .sort((a, b) => a.quando - b.quando);
  const rascunhos = indice
    .filter((e) => e.corrigivel)
    .flatMap((e) => {
      const r = lerRascunho(e.id);
      return r && (r.peca?.trim() || r.questoes?.some((q) => q?.trim()) || r.decorrido > 0) ? [{ id: e.id, ...r }] : [];
    })
    .sort((a, b) => b.atualizadoEm - a.atualizadoEm);
  return { tentativas, rascunhos, agora: Date.now() };
}

export default function ResumoSimulados({ onSair, totalSimulados }: PropsResumo) {
  const d = useMemo(() => ler(), []);
  const melhores = melhoresPorExame(d.tentativas);
  const sim = resumoSimulados(d.tentativas);
  const melhor = [...melhores.values()].sort((a, b) => b.total - a.total)[0];
  const ultimas = d.tentativas.slice(-3).reverse();
  // o próximo: o exame mais recente que a pessoa ainda não fez
  const proximo = indice
    .filter((e) => e.corrigivel && !melhores.has(e.id) && !d.rascunhos.some((r) => r.id === e.id))
    .sort((a, b) => (b.aplicacao ?? "").localeCompare(a.aplicacao ?? ""))[0];
  const andamento = d.rascunhos[0];

  return (
    <div className={styles.corpo}>
      <p className={styles.titulo}>
        Simulados <span>com correção pelo espelho da FGV</span>
      </p>

      {andamento && (
        <Link className={styles.destaque} href={`/simulados/${andamento.id}/`} onClick={onSair}>
          <span className={styles.rotulo}>Em andamento{d.rascunhos.length > 1 ? ` · mais ${d.rascunhos.length - 1}` : ""}</span>
          <b>{numeralDe(andamento.id)} Exame</b>
          <span>
            {fmtTempo(andamento.decorrido)} no cronômetro · salvo {haQuanto(andamento.atualizadoEm, d.agora)}
          </span>
          <small>Continuar →</small>
        </Link>
      )}

      <div className={styles.numeros}>
        <div>
          <b>{melhores.size}</b>
          <small>de {totalSimulados} exames feitos</small>
        </div>
        <div>
          <b>{sim.n ? `${sim.aprovados}` : "—"}</b>
          <small>{sim.n ? `de ${sim.n} com nota de aprovação` : "nenhum corrigido ainda"}</small>
        </div>
        <div>
          <b data-estado={melhor ? (melhor.total >= NOTA_CORTE ? "ok" : "bad") : undefined}>{melhor ? fmtNota(melhor.total) : "—"}</b>
          <small>{melhor ? `melhor nota (${numeralDe(melhor.exameId)})` : "melhor nota"}</small>
        </div>
      </div>

      {ultimas.length > 0 && (
        <div className={styles.bloco}>
          <span className={styles.rotulo}>{ultimas.length === 1 ? "Última correção" : "Últimas correções"}</span>
          <ul className={styles.lista}>
            {ultimas.map((t) => (
              <li key={t.id}>
                <Link href={`/simulados/${t.exameId}/resultado/?t=${t.id}`} onClick={onSair}>
                  <span>{numeralDe(t.exameId)} Exame</span>
                  <small>{haQuanto(t.quando, d.agora)}</small>
                  <b data-estado={t.aprovado ? "ok" : "bad"}>{fmtNota(t.total)}</b>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {proximo && (
        <ul className={styles.pontos}>
          <li>
            <span>O mais recente que falta</span>
            <Link href={`/simulados/${proximo.id}/`} onClick={onSair}>
              <b>{numeralDe(proximo.id)} Exame →</b>
            </Link>
          </li>
        </ul>
      )}

      <p className={styles.acoes}>
        <Link href="/simulados/" onClick={onSair}>
          Escolher um simulado →
        </Link>
        {d.tentativas.length > 0 && (
          <Link href="/estatisticas/#desempenho" onClick={onSair}>
            Ver a evolução
          </Link>
        )}
      </p>
    </div>
  );
}
