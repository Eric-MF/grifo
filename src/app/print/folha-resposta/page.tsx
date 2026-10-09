import { FolhaPautada } from "@/components/print/Caderno";

/** Folha de respostas para treino à mão: peça (linhas 1–150) + 4 questões (1–30). */
export default function Page() {
  return (
    <>
      {Array.from({ length: 5 }, (_, i) => (
        <FolhaPautada key={`p${i}`} inicio={i * 30 + 1} rotulo={`Peça Prático-Profissional – Página ${i + 1}/5`} />
      ))}
      {[1, 2, 3, 4].map((q) => (
        <FolhaPautada key={`q${q}`} inicio={1} rotulo={`Questão ${q}`} />
      ))}
    </>
  );
}
