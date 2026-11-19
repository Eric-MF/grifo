import type { Metadata } from "next";
import Link from "next/link";
import { carregarExame, listarExames } from "@/content/load";
import { FolhaResposta } from "./FolhaResposta";
import { TabelaProvas } from "./TabelaProvas";
import { pontuacaoDo } from "./pontuacao";
import styles from "./provas.module.css";

export const metadata: Metadata = {
  title: "Provas e gabaritos da 2ª fase de Penal",
  description: "Cadernos de prova e padrões de resposta da FGV da 2ª fase OAB em Direito Penal, originais e atualizados com a legislação vigente.",
};

export default function ProvasPage() {
  const exames = listarExames().slice().reverse();
  const pecas = [...new Set(exames.map((e) => e.peca).filter((p) => p && p !== "—"))].sort();
  const pontuacao = Object.fromEntries(exames.filter((e) => e.corrigivel).map((e) => [e.id, pontuacaoDo(carregarExame(e.id))]));
  const anos = exames.map((e) => e.aplicacao?.slice(0, 4)).filter((a): a is string => !!a).sort();
  const pdfs = exames.reduce((n, e) => n + Object.values(e.downloads).filter(Boolean).length, 0);
  return (
    <div className="container section">
      <span className="eyebrow">Provas anteriores</span>
      <h1>Cadernos e gabaritos</h1>
      <p className="lead">
        Todas as provas da 2ª fase de Direito Penal aplicadas pela FGV, com o padrão de resposta oficial, e a 1ª fase de cada
        exame. A versão atualizada traz nomes novos, os erros materiais corrigidos e avisos das leis que mudaram depois da prova.
      </p>

      <div className={styles.topo}>
        <dl className={styles.numeros}>
          <div>
            <dt>provas</dt>
            <dd>{exames.length}</dd>
          </div>
          <div>
            <dt>de {anos[0]} a {anos.at(-1)}</dt>
            <dd>{anos.length ? Number(anos.at(-1)) - Number(anos[0]) + 1 : "—"} anos</dd>
          </div>
          <div>
            <dt>PDFs para baixar</dt>
            <dd>{pdfs}</dd>
          </div>
        </dl>
        <nav className={styles.atalhos} aria-label="Ler e imprimir">
          <Link href="/provas/todos/?tipo=gabarito&versao=atualizado" className={styles.atalho}>
            <span aria-hidden>📘</span>
            <span>
              <strong>Todos os gabaritos</strong>
              <small>numa página só, para ler em sequência</small>
            </span>
          </Link>
          <Link href="/provas/todos/?tipo=caderno&versao=atualizado" className={styles.atalho}>
            <span aria-hidden>📄</span>
            <span>
              <strong>Todos os cadernos</strong>
              <small>os enunciados, um atrás do outro</small>
            </span>
          </Link>
          <a href="#folhas" className={styles.atalho}>
            <span aria-hidden>🖨</span>
            <span>
              <strong>Folha de respostas</strong>
              <small>no padrão da FGV, para treinar à mão</small>
            </span>
          </a>
        </nav>
      </div>

      <TabelaProvas exames={exames} pecas={pecas} pontuacao={pontuacao} />
      <section className={`card ${styles.folhas}`} aria-labelledby="folhas">
        <h2 id="folhas">Folha de respostas para imprimir</h2>
        <p className="muted">
          No padrão do caderno de textos definitivos: 5 páginas para a peça (linhas 1 a 150) e uma página de 30 linhas para
          cada questão. A folha é gerada na hora, com o exame que você escolher no rodapé (por padrão, o último que você
          baixou aqui). Ideal para treinar à mão.
        </p>
        <FolhaResposta
          // um exame por número (as variantes, como as de Porto Alegre e Porto Velho, têm o mesmo)
          exames={[...new Map(exames.map((e) => [e.numero, { numero: e.numero, numeral: e.numeral }])).values()]}
          caligrafia={process.env.NODE_ENV === "development"}
        />
      </section>
    </div>
  );
}
