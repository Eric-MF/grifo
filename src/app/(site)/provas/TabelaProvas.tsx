"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ExameResumo } from "@/content/load";
import { ToggleNomePeca, useMostrarPeca } from "@/components/NomePeca";
import { gravarUltimoExame } from "@/lib/folha/ultimo-exame";
import { BaixarTudo } from "./BaixarTudo";
import { nomeDoArquivo, type Chave } from "./nomes";
import type { PartePontos } from "./pontuacao";
import { VisualizarExame } from "./VisualizarExame";
import styles from "./provas.module.css";

function Baixar({
  e,
  chave,
  label,
  rotulo,
  texto = "⬇ PDF",
  destaque,
}: {
  e: ExameResumo;
  chave: Chave;
  label: string;
  rotulo: string;
  texto?: string;
  destaque?: boolean;
}) {
  const href = e.downloads[chave];
  if (!href) return <span className={styles.na} title="Não disponível"><span className={styles.rotuloBotao}>{rotulo}</span>—</span>;
  return (
    <a className={`${styles.dl} ${destaque ? styles.dlGold : ""}`} href={href} download={nomeDoArquivo(e, chave)} aria-label={label} onClick={() => gravarUltimoExame(e.numero)}>
      <span className={styles.rotuloBotao}>{rotulo}</span>
      {texto}
    </a>
  );
}

const situacaoDe = (e: ExameResumo) => (e.fase2 === "em-breve" ? "2ª fase em breve" : e.peca === "—" ? "Gabarito não divulgado" : null);

function Peca({ e }: { e: ExameResumo }) {
  const situacao = situacaoDe(e);
  return situacao ? <span className="muted">{situacao}</span> : <>{e.peca}</>;
}

const temPdf = (e: ExameResumo) => Object.values(e.downloads).some(Boolean);

export function TabelaProvas({ exames, pecas, pontuacao }: { exames: ExameResumo[]; pecas: string[]; pontuacao: Record<string, PartePontos[]> }) {
  const [mostrarPeca] = useMostrarPeca();
  const [peca, setPeca] = useState("");
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<ExameResumo | null>(null);
  const filtroPeca = mostrarPeca ? peca : "";

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return exames.filter(
      (e) =>
        (!filtroPeca || e.peca === filtroPeca) &&
        (!q || `${e.numero} ${e.numeral} ${mostrarPeca ? e.peca : ""} ${e.variante ?? ""}`.toLowerCase().includes(q)),
    );
  }, [exames, filtroPeca, busca, mostrarPeca]);

  return (
    <>
      <div className={styles.filtros}>
        <label>
          <span className="sr-only">Buscar</span>
          <input type="search" placeholder="Buscar exame…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </label>
        {mostrarPeca && (
          <label>
            <span className="sr-only">Filtrar por peça</span>
            <select value={filtroPeca} onChange={(e) => setPeca(e.target.value)}>
              <option value="">Todas as peças</option>
              {pecas.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
        )}
        <ToggleNomePeca />
        <span className="muted">{lista.length} exame(s)</span>
      </div>
      <BaixarTudo exames={lista} />
      <div className={styles.scroll}>
        <table className={styles.tabela}>
          <thead>
            <tr>
              <th scope="col">Exame</th>
              <th scope="col" className={styles.c}>Visualizar</th>
              {mostrarPeca && <th scope="col">Peça cobrada</th>}
              <th scope="col" className={styles.c}>Caderno original</th>
              <th scope="col" className={styles.c}>Gabarito original</th>
              <th scope="col" className={styles.c}>Caderno atualizado</th>
              <th scope="col" className={styles.c}>Gabarito atualizado</th>
              <th scope="col" className={styles.c}>Simulado</th>
              <th scope="col" className={styles.c}>1ª fase (Tipo 1)</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((e) => (
              <tr key={e.id} id={`exame-${e.id}`}>
                <th scope="row">
                  <span className={styles.num}>{e.numeral}</span>
                  <span className={styles.sub}>
                    {e.numero}º Exame{e.variante ? ` · ${e.variante}` : ""}
                    {e.aplicacao ? ` · ${e.aplicacao.slice(0, 4)}` : ""}
                  </span>
                  {!mostrarPeca && situacaoDe(e) && <span className={styles.situacao}>{situacaoDe(e)}</span>}
                </th>
                <td className={`${styles.c} ${styles.larga}`}>
                  {e.corrigivel || temPdf(e) ? (
                    <button type="button" className={styles.ver} onClick={() => setAberto(e)} aria-label={`Visualizar ${e.numeral} Exame`}>
                      Visualizar
                    </button>
                  ) : (
                    <span className={styles.na}><span className={styles.rotuloBotao}>Visualizar</span>—</span>
                  )}
                </td>
                {mostrarPeca && (
                  <td className={styles.larga}>
                    <Peca e={e} />
                  </td>
                )}
                <td className={styles.c}>
                  <Baixar e={e} chave="cadernoOriginal" rotulo="Caderno original" label={`Caderno original do ${e.numeral} Exame`} />
                </td>
                <td className={styles.c}>
                  <Baixar e={e} chave="gabaritoOriginal" rotulo="Gabarito original" label={`Gabarito original do ${e.numeral} Exame`} />
                </td>
                <td className={styles.c}>
                  <Baixar e={e} chave="cadernoAtualizado" rotulo="Caderno atualizado" label={`Caderno atualizado do ${e.numeral} Exame`} destaque />
                </td>
                <td className={styles.c}>
                  <Baixar e={e} chave="gabaritoAtualizado" rotulo="Gabarito atualizado" label={`Gabarito atualizado do ${e.numeral} Exame`} destaque />
                </td>
                <td className={styles.c}>
                  {e.corrigivel ? (
                    <Link className={styles.sim} href={`/simulados/${e.id}/`} aria-label={`Fazer o simulado do ${e.numeral} Exame`}>
                      <span className={styles.rotuloBotao}>Simulado</span>
                      Fazer
                    </Link>
                  ) : (
                    <span className={styles.na}><span className={styles.rotuloBotao}>Simulado</span>—</span>
                  )}
                </td>
                <td className={`${styles.c} ${styles.larga}`}>
                  <span className={styles.par}>
                    <Baixar e={e} chave="objetivaCaderno" rotulo="1ª fase · caderno" texto="Caderno" label={`Caderno da 1ª fase do ${e.numeral} Exame`} />
                    <Baixar e={e} chave="objetivaGabarito" rotulo="1ª fase · gabarito" texto="Gabarito" label={`Gabarito definitivo da 1ª fase do ${e.numeral} Exame`} />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {aberto && <VisualizarExame key={aberto.id} exame={aberto} pontuacao={pontuacao[aberto.id]} onFechar={() => setAberto(null)} />}
    </>
  );
}
