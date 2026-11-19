import { Caderno } from "@/components/print/Caderno";
import { carregarExameAtualizado, listarExames } from "@/content/load";

export const dynamicParams = false;
export function generateStaticParams() {
  return listarExames()
    .filter((e) => e.transcrito)
    .map((e) => ({ exame: e.id }));
}

export default async function Page({ params }: { params: Promise<{ exame: string }> }) {
  const { exame } = await params;
  return <Caderno exame={carregarExameAtualizado(exame)} />;
}
