import type { Dispositivo } from "./tipos";

const cache = new Map<string, Promise<Dispositivo[]>>();

/** Busca artigos no servidor de desenvolvimento; resultados repetidos saem do cache da aba. */
export function pesquisar(termo: string): Promise<Dispositivo[]> {
  const chave = termo.trim();
  const achado = cache.get(chave);
  if (achado) return achado;
  const pedido = fetch("/revisao/busca/", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ termo: chave }),
    signal: AbortSignal.timeout(15_000),
  })
    .then(async (r) => {
      const j = (await r.json().catch(() => ({}))) as { resultados?: Dispositivo[]; erro?: string };
      if (!r.ok || !j.resultados) throw new Error(j.erro ?? "resposta inválida do servidor");
      return j.resultados;
    })
    .catch((e: unknown) => {
      cache.delete(chave);
      throw e;
    });
  cache.set(chave, pedido);
  return pedido;
}
