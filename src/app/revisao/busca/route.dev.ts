export const dynamic = "force-static";

import { buscarDispositivos } from "@/content/revisao";

export async function POST(req: Request) {
  const origem = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origem && origem !== `http://${host}` && origem !== `https://${host}`) return Response.json({ erro: "origem não permitida" }, { status: 403 });
  const corpo = (await req.json().catch(() => null)) as { termo?: unknown } | null;
  if (typeof corpo?.termo !== "string" || !corpo.termo.trim()) return Response.json({ erro: "envie termo" }, { status: 400 });
  return Response.json({ resultados: buscarDispositivos(corpo.termo) });
}
