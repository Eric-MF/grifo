export const dynamic = "force-static";

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";

// Arquivos de apoio do pdfjs para o PDF de referência do editor da folha: o WebAssembly que decodifica imagens
// escaneadas (CCITT/fax, JBIG2, JPEG 2000), as fontes padrão e os mapas de caracteres. Só no `npm run dev`.
const RAIZ = join(process.cwd(), "node_modules", "pdfjs-dist");
const PASTAS = ["wasm", "standard_fonts", "cmaps"];
const TIPOS: Record<string, string> = { ".wasm": "application/wasm", ".js": "text/javascript", ".ttf": "font/ttf" };

export function generateStaticParams() {
  return PASTAS.flatMap((pasta) => readdirSync(join(RAIZ, pasta)).map((arquivo) => ({ caminho: [pasta, arquivo] })));
}

export async function GET(_req: Request, { params }: { params: Promise<{ caminho: string[] }> }) {
  const [pasta, arquivo, ...resto] = (await params).caminho;
  const f = pasta && arquivo && !resto.length && PASTAS.includes(pasta) && !arquivo.includes("..") ? join(RAIZ, pasta, arquivo) : null;
  if (!f || !existsSync(f)) return new Response("não encontrado", { status: 404 });
  return new Response(new Uint8Array(readFileSync(f)), { headers: { "Content-Type": TIPOS[extname(f)] ?? "application/octet-stream" } });
}
