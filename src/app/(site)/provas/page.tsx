import type { Metadata } from "next";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { listarExames } from "@/content/load";
import { TabelaProvas } from "./TabelaProvas";

export const metadata: Metadata = {
  title: "Provas e gabaritos da 2ª fase de Penal",
  description: "Cadernos de prova e padrões de resposta da FGV da 2ª fase OAB em Direito Penal, originais e atualizados com a legislação vigente.",
};

export default function ProvasPage() {
  const exames = listarExames().slice().reverse();
  const folha = existsSync(join(process.cwd(), "public/downloads/folhas/folha-resposta-penal.pdf"));
  const pecas = [...new Set(exames.map((e) => e.peca).filter((p) => p && p !== "—"))].sort();
  return (
    <div className="container section">
      <span className="eyebrow">Provas anteriores</span>
      <h1>Cadernos e gabaritos</h1>
      <p className="lead">
        Todas as provas da 2ª fase de Direito Penal aplicadas pela FGV, com o padrão de resposta oficial. As versões
        atualizadas trazem o caderno no layout atual e notas sobre as mudanças na legislação desde a aplicação. Na última coluna ficam o caderno Tipo 1 e o gabarito definitivo da 1ª fase.
      </p>
      <TabelaProvas exames={exames} pecas={pecas} />
      <section className="card" style={{ marginTop: "2.5rem" }} aria-labelledby="folhas">
        <h2 id="folhas" style={{ fontSize: "1.5rem" }}>Folha de respostas para imprimir</h2>
        <p className="muted">
          Folha pautada no padrão do caderno de textos definitivos: 5 páginas para a peça (linhas 1 a 150) e 30 linhas por
          questão, com a numeração reiniciando em cada uma. Ideal para treinar à mão.
        </p>
        {folha ? (
          <a className="btn btn-gold" href="/downloads/folhas/folha-resposta-penal.pdf" download>
            Baixar folha de respostas (PDF)
          </a>
        ) : (
          <span className="badge">Em breve</span>
        )}
      </section>
    </div>
  );
}
