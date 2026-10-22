import type { Metadata } from "next";
import { Suspense } from "react";
import { carregarExame, examesCorrigiveis } from "@/content/load";
import { tituloSimulado } from "@/content/titulo";
import { optionalImage } from "@/lib/images";
import { Resultado } from "./Resultado";

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
    <Suspense>
      <Resultado key={exame} exame={carregarExame(exame)} fundoCard={fundo} />
    </Suspense>
  );
}
