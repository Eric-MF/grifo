import type { Metadata } from "next";
import { carregarExame, listarExames } from "@/content/load";
import { FolhaResposta } from "./FolhaResposta";
import { TabelaProvas } from "./TabelaProvas";
import { pontuacaoDo } from "./pontuacao";

export const metadata: Metadata = {
  title: "Provas e gabaritos da 2ª fase de Penal",
  description: "Cadernos de prova e padrões de resposta da FGV da 2ª fase OAB em Direito Penal, originais e atualizados com a legislação vigente.",
};

export default function ProvasPage() {
  const exames = listarExames().slice().reverse();
  const pecas = [...new Set(exames.map((e) => e.peca).filter((p) => p && p !== "—"))].sort();
  const pontuacao = Object.fromEntries(exames.filter((e) => e.corrigivel).map((e) => [e.id, pontuacaoDo(carregarExame(e.id))]));
  return (
    <div className="container section">
      <span className="eyebrow">Provas anteriores</span>
      <h1>Cadernos e gabaritos</h1>
      <p className="lead">
        Todas as provas da 2ª fase de Direito Penal aplicadas pela FGV, com o padrão de resposta oficial. As versões
        atualizadas trazem o caderno no layout atual e notas sobre as mudanças na legislação desde a aplicação. Na última coluna ficam o caderno Tipo 1 e o gabarito definitivo da 1ª fase.
      </p>
      <TabelaProvas exames={exames} pecas={pecas} pontuacao={pontuacao} />
      <section className="card" style={{ marginTop: "2.5rem" }} aria-labelledby="folhas">
        <h2 id="folhas" style={{ fontSize: "1.5rem" }}>Folha de respostas para imprimir</h2>
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
