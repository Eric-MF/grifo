// O pdf.js no navegador, carregado só quando uma página precisa desenhar um PDF. Os arquivos de apoio (o WebAssembly
// que decodifica imagens escaneadas, as fontes padrão, os mapas de caracteres e o perfil CMYK) ficam em /pdfjs/, copiados de
// node_modules/pdfjs-dist pelo scripts/build-content.ts.
import type { PDFDocumentProxy } from "pdfjs-dist";

export type { PDFDocumentProxy };

let pdfjs: Promise<typeof import("pdfjs-dist")> | null = null;
export function carregarPdfjs() {
  pdfjs ??= import("pdfjs-dist").then((m) => {
    m.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
    return m;
  });
  return pdfjs;
}

const APOIO = "/pdfjs/";
export const OPCOES_PDFJS = { wasmUrl: `${APOIO}wasm/`, standardFontDataUrl: `${APOIO}standard_fonts/`, cMapUrl: `${APOIO}cmaps/`, iccUrl: `${APOIO}iccs/`, cMapPacked: true };

/** Abre o PDF do endereço (o do próprio site). */
export async function abrirPdf(url: string): Promise<PDFDocumentProxy> {
  const lib = await carregarPdfjs();
  return lib.getDocument({ url, ...OPCOES_PDFJS }).promise;
}

/**
 * Desenha a página `n` com a largura `largura` (em pixels do aparelho) e a devolve como imagem (um endereço blob:, que
 * quem pede revoga): o canvas é descartado, para a memória aguentar muitas páginas. `razao` é a altura sobre a largura.
 */
export async function paginaComoImagem(doc: PDFDocumentProxy, n: number, largura: number): Promise<{ url: string; razao: number } | null> {
  const pagina = await doc.getPage(n);
  const base = pagina.getViewport({ scale: 1 });
  const vp = pagina.getViewport({ scale: largura / base.width });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(vp.width);
  canvas.height = Math.ceil(vp.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await pagina.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
  pagina.cleanup();
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
  canvas.width = canvas.height = 0;
  return blob ? { url: URL.createObjectURL(blob), razao: base.height / base.width } : null;
}
