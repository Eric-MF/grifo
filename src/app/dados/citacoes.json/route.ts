// Índice "citado por" das leis do leitor, gerado no build como arquivo estático (ver src/content/citacoes.ts).
import { indiceDeCitacoes } from "@/content/citacoes";

export const dynamic = "force-static";

export function GET() {
  return Response.json(indiceDeCitacoes());
}
