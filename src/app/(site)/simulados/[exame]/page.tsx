import type { Metadata } from "next";
import { carregarExame, carregarExameAtualizado, examesCorrigiveis } from "@/content/load";
import { tituloSimulado } from "@/content/titulo";
import { paraSimulado } from "@/lib/correcao/simulado";
import { Simulador, type MudancasAtualizada } from "./Simulador";

export const dynamicParams = false;

export function generateStaticParams() {
  return examesCorrigiveis();
}

export async function generateMetadata({ params }: { params: Promise<{ exame: string }> }): Promise<Metadata> {
  const { exame } = await params;
  const e = carregarExame(exame);
  return { title: `Simulado · ${tituloSimulado(e)}`, description: `Simulado da 2ª fase OAB Penal: ${e.peca.nome}.` };
}

export default async function Page({ params }: { params: Promise<{ exame: string }> }) {
  const { exame } = await params;
  const atualizado = carregarExameAtualizado(exame);
  const at = atualizado.atualizado;
  const mudancas: MudancasAtualizada = {
    nomes: Object.values(at?.nomes ?? {}).some((m) => Object.keys(m).length > 0),
    correcoes: at?.correcoes.length ?? 0,
    avisos: [...new Set((at?.notas ?? []).map((n) => (n.alvo === "peca" ? "Peça" : `Questão ${n.alvo.slice(1)}`)))],
  };
  return <Simulador original={paraSimulado(carregarExame(exame))} atualizado={paraSimulado(atualizado, "atualizada")} mudancas={mudancas} />;
}
