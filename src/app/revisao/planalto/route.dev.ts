import { extrairDatasPlanalto } from "@/lib/leis/planalto-datas";

export const revalidate = 1;

const HOST = "www.planalto.gov.br";

export async function GET(req: Request) {
  const parametros = new URL(req.url).searchParams;
  let alvo: URL;
  try {
    alvo = new URL(parametros.get("url") ?? "");
  } catch {
    return Response.json({ erro: "link inválido" }, { status: 400 });
  }
  if (alvo.protocol !== "https:" || alvo.hostname !== HOST) {
    return Response.json({ erro: `use um link de https://${HOST}` }, { status: 400 });
  }
  let resposta: Response;
  try {
    resposta = await fetch(alvo);
  } catch {
    return Response.json({ erro: "não foi possível acessar o Planalto a partir deste computador" }, { status: 502 });
  }
  if (!resposta.ok) return Response.json({ erro: `o Planalto respondeu ${resposta.status}` }, { status: 502 });
  const html = new TextDecoder("windows-1252").decode(await resposta.arrayBuffer());
  return Response.json({ url: alvo.href, datas: extrairDatasPlanalto(html, parametros.get("id") ?? undefined) });
}
