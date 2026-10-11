import type { Metadata } from "next";
import Link from "next/link";
import { listarExames, tituloExame } from "@/content/load";
import { ToggleNomePeca, LinhaDeExame } from "@/components/NomePeca";
import { HistoricoSimulados } from "./HistoricoSimulados";
import styles from "./simulados.module.css";

export const metadata: Metadata = {
  title: "Simulados da 2ª fase de Penal",
  description: "Responda às provas da 2ª fase OAB de Direito Penal em folha pautada padrão FGV e receba nota item a item.",
};

export default function SimuladosPage() {
  const exames = listarExames().filter((e) => e.transcrito).reverse();
  return (
    <div className="container section">
      <span className="eyebrow">Simulados</span>
      <h1>Faça a prova e receba sua nota</h1>
      <p className="lead">
        Escolha um exame, escreva a peça e as quatro questões como no caderno de textos definitivos e veja, item a item,
        o que pontuou pela tabela oficial da FGV.
      </p>
      <HistoricoSimulados />
      <div style={{ margin: "1.5rem 0 0.5rem" }}>
        <ToggleNomePeca />
      </div>
      <ul className={styles.list}>
        {exames.map((e) => (
          <li key={e.id}>
            <Link href={e.corrigivel ? `/simulados/${e.id}/` : `/provas/#exame-${e.id}`} className={`card ${styles.item}`}>
              <span className={styles.num}>{e.numeral}</span>
              <span className={styles.info}>
                <strong>{tituloExame(e)}</strong>
                <span className="muted">
                  <LinhaDeExame nome={e.peca} ano={e.aplicacao ? String(new Date(e.aplicacao + "T12:00:00").getFullYear()) : undefined} />
                </span>
              </span>
              <span className={styles.badges}>
                {e.corrigivel ? <span className="badge badge-gold">Correção automática</span> : <span className="badge">Gabarito em breve</span>}
                {!e.revisado && <span className="badge" title="Transcrição ainda não revisada">Beta</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
