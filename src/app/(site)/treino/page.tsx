import type { Metadata } from "next";
import { Treino } from "./Treino";
import styles from "./treino.module.css";

export const metadata: Metadata = {
  title: "Treinar questões",
  description: "Questões de Direito Penal da OAB em rodadas de 10 a 50, no modo infinito ou no automático (que sobe o tipo e o nível conforme você acerta), dos tipos que você escolher: peça e fundamento, itens da peça, discursivas e objetivas da 1ª fase. Pontos por acerto, tempo e nível.",
};

export default function TreinoPage() {
  return (
    <div className={`container section ${styles.pagina}`}>
      <div className={styles.intro}>
        <span className="eyebrow">Treinar questões</span>
        <h1>Questões do jeito da prova</h1>
        <p className="lead">
          Escolha 10, 20, 30 ou 50 questões, o modo infinito, que só acaba quando você quiser, ou o modo automático, que sobe o tipo de pergunta e o nível
          conforme você acerta. As questões vêm dos tipos que você escolher: peça e fundamento, itens da peça, questões discursivas e objetivas da 1ª
          fase. Quanto mais rápido e quanto maior o nível, mais pontos, e 10 acertos seguidos fazem um strike. No fim, reveja cada questão com as
          alternativas e a correção.
        </p>
      </div>
      <Treino />
    </div>
  );
}
