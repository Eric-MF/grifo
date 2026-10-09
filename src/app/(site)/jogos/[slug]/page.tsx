import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GameHost } from "@/games/GameHost";
import { JOGOS, jogoPorSlug } from "@/games/registry";
import { optionalImage } from "@/lib/images";

export const dynamicParams = false;
export function generateStaticParams() {
  return JOGOS.map((j) => ({ slug: j.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const j = jogoPorSlug(slug);
  if (!j) return {};
  const capa = j.capa ? optionalImage(j.capa) : null;
  return { title: j.titulo, description: j.descricao, openGraph: capa ? { images: [capa.src] } : undefined };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const j = jogoPorSlug(slug);
  if (!j) notFound();
  return (
    <div className="container" style={{ paddingBlock: "1.25rem 3rem" }}>
      <GameHost slug={slug} fundoCard={optionalImage("moldura-meandro-1")?.src} />
    </div>
  );
}
