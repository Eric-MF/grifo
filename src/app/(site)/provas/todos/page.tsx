import type { Metadata } from "next";
import Link from "next/link";
import { listarExames } from "@/content/load";
import { TodosNumaPagina } from "./TodosNumaPagina";

export const metadata: Metadata = {
  title: "Todos os gabaritos ou cadernos numa página",
  description: "Os padrões de resposta ou os cadernos de prova da 2ª fase de Penal (e da 1ª fase), um depois do outro, numa página só.",
};

export default function TodosPage() {
  // do mais recente ao mais antigo, como a tabela de provas
  const exames = listarExames().slice().reverse();
  return (
    <div className="container section">
      <span className="eyebrow">
        <Link href="/provas/">Provas anteriores</Link>
      </span>
      <h1>Tudo numa página</h1>
      <p className="lead">
        Os gabaritos ou os cadernos de todos os exames, um depois do outro, para ler rolando. Cada PDF é desenhado quando
        chega perto da tela; o índice leva direto a um exame.
      </p>
      <TodosNumaPagina exames={exames} />
    </div>
  );
}
