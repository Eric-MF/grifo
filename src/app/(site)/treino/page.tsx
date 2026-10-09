import type { Metadata } from "next";
import { Treino } from "./Treino";

export const metadata: Metadata = {
  title: "Treino da 2ª fase",
  description: "Dez perguntas de peça e fundamento da 2ª fase OAB de Direito Penal, pontuadas por acerto, tempo e nível.",
};

export default function TreinoPage() {
  return (
    <div className="container section">
      <span className="eyebrow">Treino</span>
      <h1>Dez perguntas, do jeito da prova</h1>
      <p className="lead">
        Sorteamos perguntas de peça e fundamento de todas as peças. Quanto mais rápido e quanto maior o nível, mais pontos.
      </p>
      <Treino />
    </div>
  );
}
