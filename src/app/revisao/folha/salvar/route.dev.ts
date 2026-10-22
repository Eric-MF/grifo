export const dynamic = "force-static";

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { LayoutSchema } from "@/lib/folha/layout";

const ARQUIVO = join(process.cwd(), "content", "folha-resposta.json");
const erro = (mensagem: string, status: number) => Response.json({ erro: mensagem }, { status });

/** Grava o layout da folha de respostas (painel /revisao/folha/): os próximos downloads seguem este padrão. */
export async function POST(req: Request) {
  const origem = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origem && origem !== `http://${host}` && origem !== `https://${host}`) return erro("origem não permitida", 403);
  const corpo = (await req.json().catch(() => null)) as { layout?: unknown } | null;
  const r = LayoutSchema.safeParse(corpo?.layout);
  if (!r.success) return Response.json({ erros: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, { status: 422 });
  writeFileSync(ARQUIVO, `${JSON.stringify(r.data, null, 2)}\n`);
  return Response.json({ gravado: true });
}
