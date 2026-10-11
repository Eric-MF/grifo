// Compartilhamento sem servidor: o conteúdo vai no próprio link, depois do #, comprimido.
// O que está depois do # nunca é enviado ao servidor.

import type { Marcacao } from "./marcacoes";
import type { Sistema } from "./legendas";

export const LIMITE_LINK = 8 * 1024;
const PREFIXO = "v1.";

export interface Compartilhado {
  lei: string;
  m: Pick<Marcacao, "i" | "disp" | "exato" | "prefixo" | "sufixo" | "cor" | "nota">[];
  s?: Sistema;
}

/** Confere a forma do conteúdo recebido (link ou arquivo) antes de mostrá-lo. */
export function pareceCompartilhado(c: unknown): c is Compartilhado {
  if (typeof c !== "object" || c === null) return false;
  const { lei, m } = c as Compartilhado;
  return typeof lei === "string" && Array.isArray(m) && m.every((x) => typeof x?.i === "number" && typeof x.exato === "string" && typeof x.cor === "string");
}

async function processar(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const saida = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(saida).arrayBuffer());
}

const paraBase64Url = (b: Uint8Array) =>
  btoa(Array.from(b, (c) => String.fromCharCode(c)).join("")).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
function deBase64Url(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

export async function codificar(dados: unknown): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(dados));
  return PREFIXO + paraBase64Url(await processar(json, new CompressionStream("deflate-raw")));
}

export async function decodificar<T>(codigo: string): Promise<T | null> {
  if (!codigo.startsWith(PREFIXO)) return null;
  try {
    const bytes = await processar(deBase64Url(codigo.slice(PREFIXO.length)), new DecompressionStream("deflate-raw"));
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  } catch {
    return null;
  }
}
