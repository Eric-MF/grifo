import type { Metadata } from "next";
import { listarExames } from "@/content/load";
import pecas from "@/content/generated/pecas.json";
import { ListaSimulados, type ExameDaLista } from "./ListaSimulados";

export const metadata: Metadata = {
  title: "Simulados da 2ª fase de Penal",
  description: "Responda às provas da 2ª fase OAB de Direito Penal em folha pautada padrão FGV e receba nota item a item.",
};

export default function SimuladosPage() {
  // do mais recente ao mais antigo; "ordem" é a posição cronológica (0 = o mais antigo), como nas Estatísticas
  const exames: ExameDaLista[] = listarExames()
    .filter((e) => e.transcrito)
    .map((e, ordem) => ({
      id: e.id,
      numero: e.numero,
      numeral: e.numeral,
      variante: e.variante,
      aplicacao: e.aplicacao,
      peca: e.peca,
      corrigivel: e.corrigivel,
      revisado: e.revisado,
      leiNova: e.temAtualizacao,
      preliminar: !!e.preliminar?.gabarito,
      pecaTipo: e.pecaTipo,
      era: e.numero === 1 ? ("cespe" as const) : ("fgv" as const),
      ordem,
    }))
    .reverse();
  // o nome de cada tipo de peça (para a explicação da sugestão)
  const catalogo = pecas as Record<string, { nome: string }>;
  const nomesPecas = Object.fromEntries([...new Set(exames.map((e) => e.pecaTipo))].map((t) => [t, catalogo[t]?.nome ?? t]));
  return (
    <div className="container section">
      <span className="eyebrow">Simulados</span>
      <h1>Faça a prova e receba sua nota</h1>
      <p className="lead">
        Escolha um exame, na versão original ou na atualizada, escreva a peça e as quatro questões como no caderno de
        textos definitivos e veja, item a item, o que pontuou pela tabela oficial da FGV.
      </p>
      <ListaSimulados exames={exames} nomesPecas={nomesPecas} />
    </div>
  );
}
