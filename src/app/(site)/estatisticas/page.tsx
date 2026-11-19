import type { Metadata } from "next";
import { dadosEstatisticas } from "@/content/estatisticas";
import { listarExames } from "@/content/load";
import { Estatisticas } from "./Estatisticas";

export const metadata: Metadata = {
  title: "Estatísticas da 2ª fase de Penal",
  description:
    "As peças, as teses e os artigos que a 2ª fase de Penal da OAB cobrou em cada exame, com links para as provas e os simulados, e o seu desempenho nos simulados, no treino e nos jogos.",
};

export default function EstatisticasPage() {
  return (
    <div className="container section">
      <span className="eyebrow">Estatísticas · 2ª fase de Penal</span>
      <h1>O raio X da prova, e o seu</h1>
      <p className="lead">
        O que a OAB cobrou em cada exame, da peça aos artigos da tabela de pontos, e como você está nos simulados, no treino e nos jogos.
      </p>
      <Estatisticas dados={dadosEstatisticas()} provas={listarExames()} />
    </div>
  );
}
