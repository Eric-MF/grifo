import type { Metadata } from "next";
import { Suspense } from "react";
import { carregarExame, carregarExameAtualizado, examesCorrigiveis } from "@/content/load";
import { tituloSimulado } from "@/content/titulo";
import { optionalImage } from "@/lib/images";
import { CarregandoResultado, Resultado } from "./Resultado";

export const dynamicParams = false;
export function generateStaticParams() {
  return examesCorrigiveis();
}

export async function generateMetadata({ params }: { params: Promise<{ exame: string }> }): Promise<Metadata> {
  const { exame } = await params;
  return { title: `Resultado · ${tituloSimulado(carregarExame(exame))}`, robots: { index: false } };
}

export default async function Page({ params }: { params: Promise<{ exame: string }> }) {
  const { exame } = await params;
  const fundo = optionalImage("moldura-meandro-1")?.src;
  return (
    <Suspense fallback={<CarregandoResultado />}>
      <Resultado key={exame} original={carregarExame(exame)} atualizado={carregarExameAtualizado(exame)} fundoCard={fundo} />
    </Suspense>
  );
}
