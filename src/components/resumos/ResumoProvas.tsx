"use client";

// O resumo de "Provas" no cabeçalho: quantas provas há, a mais recente (com o aviso de gabarito preliminar), a última
// que a pessoa baixou e as peças que mais caíram. O nome da peça de cada exame segue a escolha "mostrar a peça".
import Link from "next/link";
import { useMemo } from "react";
import indice from "@/content/generated/exames-index.json";
import { lerUltimoExame } from "@/lib/folha/ultimo-exame";
import { melhoresPorExame, resumirTentativa } from "@/lib/estatisticas/desempenho";
import { listarTentativas } from "@/lib/tentativas";
import { useMostrarPeca } from "../NomePeca";
import type { PropsResumo } from "../LinkComResumo";
import styles from "../ResumoDesempenho.module.css";
import { dataBR, numeralDe } from "./comum";

/** as variantes do mesmo nome ("Contrarrazões em Apelação") contam juntas */
const nomeDaPeca = (p: string) => p.replace(/^Contrarrazões em /, "Contrarrazões de ").replace(/ \(.*\)$/, "");

export default function ResumoProvas({ onSair }: PropsResumo) {
  const [mostrarPeca] = useMostrarPeca();
  const d = useMemo(() => {
    const feitos = melhoresPorExame(
      listarTentativas()
        .filter((t) => t?.resultado?.partes)
        .map(resumirTentativa),
    );
    const ultimoNumero = lerUltimoExame();
    return { feitos, ultimoNumero };
  }, []);
  const exames = indice;
  const recente = exames.filter((e) => e.aplicacao).sort((a, b) => b.aplicacao!.localeCompare(a.aplicacao!))[0];
  const baixado = d.ultimoNumero !== null ? exames.find((e) => e.numero === d.ultimoNumero && !e.variante) : undefined;
  const anos = exames.map((e) => e.aplicacao?.slice(0, 4)).filter(Boolean).sort();
  const vezes = new Map<string, number>();
  for (const e of exames) if (e.peca && !e.variante) vezes.set(nomeDaPeca(e.peca), (vezes.get(nomeDaPeca(e.peca)) ?? 0) + 1);
  const pecas = [...vezes].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const maior = pecas[0]?.[1] ?? 1;
  const feitosAqui = exames.filter((e) => d.feitos.has(e.id)).length;

  return (
    <div className={styles.corpo}>
      <p className={styles.titulo}>
        Provas da 2ª fase <span>Direito Penal</span>
      </p>
      <div className={styles.numeros}>
        <div>
          <b>{exames.length}</b>
          <small>provas no acervo</small>
        </div>
        <div>
          <b>{anos.length ? Number(anos.at(-1)) - Number(anos[0]) + 1 : "—"}</b>
          <small>anos de prova, desde {anos[0]}</small>
        </div>
        <div>
          <b>{feitosAqui}</b>
          <small>{feitosAqui === 1 ? "feita por você" : "feitas por você"} no simulado</small>
        </div>
      </div>

      {recente && (
        <div className={styles.bloco}>
          <span className={styles.rotulo}>A mais recente</span>
          <Link className={styles.destaque} href={`/simulados/${recente.id}/`} onClick={onSair}>
            <b>{numeralDe(recente.id)} Exame</b>
            <span>
              {dataBR(recente.aplicacao!)}
              {mostrarPeca && recente.peca ? ` · ${recente.peca}` : ""}
              {recente.preliminar?.gabarito ? " · gabarito preliminar" : ""}
            </span>
            <small>{d.feitos.has(recente.id) ? `Sua nota: ${d.feitos.get(recente.id)!.total.toFixed(2).replace(".", ",")}` : "Fazer o simulado →"}</small>
          </Link>
        </div>
      )}

      <div className={styles.bloco}>
        <span className={styles.rotulo}>Peças que mais caíram</span>
        <ul className={styles.barras}>
          {pecas.map(([nome, n]) => (
            <li key={nome}>
              <span>{nome}</span>
              <span className={styles.barra} aria-hidden>
                <span style={{ width: `${(n / maior) * 100}%` }} />
              </span>
              <b>{n}</b>
            </li>
          ))}
        </ul>
      </div>

      {baixado && (
        <ul className={styles.pontos}>
          <li>
            <span>A última que você baixou</span>
            <b>
              {baixado.numeral} Exame · {dataBR(baixado.aplicacao ?? "")}
            </b>
          </li>
        </ul>
      )}

      <p className={styles.acoes}>
        <Link href="/provas/" onClick={onSair}>
          Ver todas as provas →
        </Link>
      </p>
    </div>
  );
}
