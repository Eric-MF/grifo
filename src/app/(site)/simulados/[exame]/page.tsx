import type { Metadata } from "next";
import { carregarExame, examesCorrigiveis, tituloExame } from "@/content/load";
import { paraSimulado } from "@/lib/correcao/simulado";
import { Simulador } from "./Simulador";

export const dynamicParams = false;

export function generateStaticParams() {
  return examesCorrigiveis();
}

export async function generateMetadata({ params }: { params: Promise<{ exame: string }> }): Promise<Metadata> {
  const { exame } = await params;
  const e = carregarExame(exame);
  return { title: `Simulado · ${tituloExame(e)}`, description: `Simulado da 2ª fase OAB Penal: ${e.peca.nome}.` };
}

export default async function Page({ params }: { params: Promise<{ exame: string }> }) {
  const { exame } = await params;
  return <Simulador exame={paraSimulado(carregarExame(exame))} />;
}
