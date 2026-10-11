export const dynamic = "force-static";

import { arquivosEditaveis, lerArquivo } from "@/content/revisao";

export function generateStaticParams() {
  return arquivosEditaveis().map((arquivo) => ({ nome: arquivo.split("/") }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ nome: string[] }> }) {
  const caminho = (await params).nome.join("/");
  const texto = lerArquivo(caminho);
  return texto === null
    ? Response.json({ erro: `arquivo fora da lista editável: "${caminho}". O caminho começa com content/ (ex.: content/exames/01/exame.yaml).` }, { status: 404 })
    : Response.json({ nome: caminho, texto });
}
