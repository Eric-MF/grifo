// O que a folha de respostas precisa do navegador: a logo em PNG (o PDF não leva SVG) e o download do arquivo.
import type { Recursos } from "./pdf";

const LOGO = "/img/logo-grifo-em-progresso.svg";
/** largura em pixels da logo no PDF: nítida na impressão (a logo tem cerca de 14 mm de largura) */
const LARGURA_PX = 1200;

let recursos: Promise<Recursos> | null = null;

/** A logo "Grifo em Progresso" desenhada num canvas e guardada em PNG, uma vez por página aberta. */
export function carregarRecursos(): Promise<Recursos> {
  recursos ??= new Promise<Recursos>((ok) => {
    const img = new Image();
    img.onload = () => {
      const proporcao = img.naturalWidth / img.naturalHeight || 900 / 472;
      const canvas = document.createElement("canvas");
      canvas.width = LARGURA_PX;
      canvas.height = Math.round(LARGURA_PX / proporcao);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(async (blob) => {
        if (!blob) return ok({});
        ok({ logoProgresso: { png: new Uint8Array(await blob.arrayBuffer()), proporcao } });
      }, "image/png");
    };
    // sem a logo, a folha sai sem ela (o resto não depende da imagem)
    img.onerror = () => ok({});
    img.src = LOGO;
  });
  return recursos;
}

/** Entrega o PDF como download, com o nome dado. */
export function baixarPdf(bytes: Uint8Array, nome: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
