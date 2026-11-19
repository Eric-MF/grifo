import type { Metadata } from "next";
import { Suspense } from "react";
import { CarregandoResultado, ResultadoGuardado } from "./ResultadoGuardado";
import styles from "../treino.module.css";

export const metadata: Metadata = {
  title: "Resultado do treino",
  description: "A página final de um recorde do treino de questões, guardada neste navegador.",
  robots: { index: false },
};

export default function ResultadoTreinoPage() {
  return (
    <div className={`container section ${styles.pagina}`}>
      <div className={styles.intro}>
        <span className="eyebrow">Treinar questões</span>
        <h1>Resultado do recorde</h1>
      </div>
      <Suspense fallback={<CarregandoResultado />}>
        <ResultadoGuardado />
      </Suspense>
    </div>
  );
}
