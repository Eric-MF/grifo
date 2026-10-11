export const dynamic = "force-static";

import { gravarTexto, pedirReinicio, validarTexto } from "@/content/revisao";

const erro = (mensagem: string, status: number) => Response.json({ erro: mensagem }, { status });

export async function POST(req: Request) {
  const origem = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origem && origem !== `http://${host}` && origem !== `https://${host}`) return erro("origem não permitida", 403);
  const corpo = (await req.json().catch(() => null)) as { nome?: unknown; texto?: unknown; gravar?: unknown } | null;
  if (typeof corpo?.nome !== "string" || typeof corpo.texto !== "string") return erro("envie nome e texto", 400);
  if (corpo.gravar === true) {
    const r = gravarTexto(corpo.nome, corpo.texto);
    if (r.erros.length) return Response.json(r, { status: 422 });
    pedirReinicio();
    return Response.json({ ...r, gravado: true, reiniciando: true });
  }
  return Response.json(validarTexto(corpo.nome, corpo.texto));
}
