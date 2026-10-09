import { PadraoResposta } from "@/components/print/PadraoResposta";
import { carregarExame, listarExames } from "@/content/load";

export const dynamicParams = false;
export function generateStaticParams() {
  return listarExames()
    .filter((e) => e.transcrito && e.corrigivel)
    .map((e) => ({ exame: e.id }));
}

export default async function Page({ params }: { params: Promise<{ exame: string }> }) {
  const { exame } = await params;
  return <PadraoResposta exame={carregarExame(exame)} />;
}
