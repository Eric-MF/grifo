// Card de compartilhamento desenhado em <canvas> (sem depender do DOM da página:
// o que sai no PNG vem dos dados salvos do resultado).
import { fmtNota } from "@/lib/formato";
import { LOGO_PATHS } from "@/components/logo-paths";

export type Formato = "retrato" | "paisagem";
const TAMANHOS: Record<Formato, [number, number]> = { retrato: [1080, 1350], paisagem: [1200, 630] };

export interface DadosCard {
  titulo: string; // "XXXVIII Exame de Ordem"
  subtitulo: string; // "Peça: Agravo em Execução"
  nota: number;
  maximo: number;
  aprovado: boolean;
  destaque?: string; // "Aprovado(a)!" etc.
  linhas: { rotulo: string; valor: string }[];
  rodape: string; // "Corrigido automaticamente · 27/09/2026"
  codigo: string;
  /** Rótulo pequeno acima da nota ("Nota no simulado", "Pontos"). */
  rotuloNota?: string;
  formatoNota?: (n: number) => string;
  fundo?: HTMLImageElement | null;
}

const NAVY = "#03112c";
const GOLD = "#d69c45";
const GOLD_LIGHT = "#f0c77e";
const INK = "#eef2f7";

function meandro(ctx: CanvasRenderingContext2D, w: number, h: number, m: number, u: number) {
  // Borda grega (meandro) desenhada com linhas; u = tamanho do módulo.
  ctx.save();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = u * 0.16;
  ctx.lineCap = "square";
  const unidade = (x: number, y: number, rot: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    // espiral quadrada
    ctx.moveTo(0, u);
    ctx.lineTo(0, 0);
    ctx.lineTo(u * 0.8, 0);
    ctx.lineTo(u * 0.8, u * 0.6);
    ctx.lineTo(u * 0.3, u * 0.6);
    ctx.lineTo(u * 0.3, u * 0.3);
    ctx.moveTo(0, u);
    ctx.lineTo(u, u);
    ctx.stroke();
    ctx.restore();
  };
  const nx = Math.floor((w - 2 * m) / u);
  const ny = Math.floor((h - 2 * m) / u);
  const ox = m + ((w - 2 * m) - nx * u) / 2;
  const oy = m + ((h - 2 * m) - ny * u) / 2;
  for (let i = 0; i < nx; i++) {
    unidade(ox + i * u, oy, 0);
    unidade(ox + (i + 1) * u, oy + ny * u, Math.PI);
  }
  for (let j = 1; j < ny - 1; j++) {
    unidade(ox + nx * u, oy + j * u, Math.PI / 2);
    unidade(ox, oy + (j + 1) * u, -Math.PI / 2);
  }
  ctx.strokeRect(ox - u * 0.35, oy - u * 0.35, nx * u + u * 0.7, ny * u + u * 0.7);
  ctx.restore();
}

function logo(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 210, size / 210);
  ctx.fillStyle = color;
  for (const d of LOGO_PATHS) ctx.fill(new Path2D(d));
  ctx.restore();
}

function texto(ctx: CanvasRenderingContext2D, t: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = "center", maxW?: number) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(t, x, y, maxW);
}

/** Moldura em 9 partes: cantos na mesma escala, bordas esticadas, centro liso. Não corta a borda. */
function desenharMoldura(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const sw = img.naturalWidth;
  const sh = img.naturalHeight;
  const escala = w / sw;
  const c = sw * 0.095;
  const cd = c * escala;
  const cols = [[0, c], [c, sw - c], [sw - c, sw]];
  const dcols = [[0, cd], [cd, w - cd], [w - cd, w]];
  const rows = [[0, c], [c, sh - c], [sh - c, sh]];
  const drows = [[0, cd], [cd, h - cd], [h - cd, h]];
  rows.forEach(([sy0, sy1], i) =>
    cols.forEach(([sx0, sx1], j) => {
      const [dy0, dy1] = drows[i];
      const [dx0, dx1] = dcols[j];
      ctx.drawImage(img, sx0, sy0, sx1 - sx0, sy1 - sy0, dx0, dy0, dx1 - dx0, dy1 - dy0);
    }),
  );
}

export async function desenharCard(canvas: HTMLCanvasElement, d: DadosCard, formato: Formato) {
  const [w, h] = TAMANHOS[formato];
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  await document.fonts?.ready;
  const serif = getComputedStyle(document.documentElement).getPropertyValue("--font-cormorant").trim() || "Georgia";
  const sans = getComputedStyle(document.documentElement).getPropertyValue("--font-inter").trim() || "system-ui";

  // Fundo
  if (d.fundo) {
    desenharMoldura(ctx, d.fundo, w, h);
  } else {
    ctx.fillStyle = NAVY;
    ctx.fillRect(0, 0, w, h);
    const g = ctx.createRadialGradient(w / 2, h * 0.45, 10, w / 2, h * 0.45, Math.max(w, h) * 0.6);
    g.addColorStop(0, "rgba(214,156,69,0.28)");
    g.addColorStop(1, "rgba(214,156,69,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    meandro(ctx, w, h, formato === "retrato" ? 34 : 26, formato === "retrato" ? 46 : 36);
  }

  const cx = w / 2;
  const fmt = d.formatoNota ?? fmtNota;
  if (formato === "retrato") {
    logo(ctx, cx - 90, 120, 180, GOLD);
    texto(ctx, "GRIFO", cx, 350, `700 64px ${serif}`, INK);
    texto(ctx, "2ª FASE OAB · DIREITO PENAL", cx, 395, `700 22px ${sans}`, GOLD_LIGHT);
    texto(ctx, d.titulo, cx, 480, `700 46px ${serif}`, INK, "center", w - 180);
    texto(ctx, d.subtitulo, cx, 525, `500 28px ${sans}`, "#b9c6d6", "center", w - 180);
    texto(ctx, d.rotuloNota ?? "NOTA NO SIMULADO", cx, 620, `700 22px ${sans}`, GOLD_LIGHT);
    texto(ctx, fmt(d.nota), cx, 790, `800 190px ${sans}`, d.aprovado ? GOLD : INK);
    texto(ctx, `de ${fmt(d.maximo)}`, cx, 872, `500 30px ${sans}`, "#b9c6d6");
    if (d.destaque) {
      ctx.font = `800 34px ${sans}`;
      const tw = ctx.measureText(d.destaque).width + 64;
      ctx.fillStyle = d.aprovado ? GOLD : "rgba(255,255,255,0.12)";
      ctx.beginPath();
      ctx.roundRect(cx - tw / 2, 900, tw, 64, 32);
      ctx.fill();
      texto(ctx, d.destaque, cx, 944, `800 34px ${sans}`, d.aprovado ? NAVY : INK);
    }
    const colW = (w - 200) / Math.max(1, d.linhas.length);
    d.linhas.forEach((l, i) => {
      const x = 100 + colW * i + colW / 2;
      texto(ctx, l.valor, x, 1060, `700 38px ${sans}`, INK);
      texto(ctx, l.rotulo, x, 1098, `500 22px ${sans}`, "#9fb0c3");
    });
    texto(ctx, d.rodape, cx, 1185, `500 22px ${sans}`, "#9fb0c3");
    texto(ctx, "www.grifo.com", cx, 1225, `700 26px ${sans}`, GOLD_LIGHT);
    texto(ctx, d.codigo, cx, 1268, `500 17px ui-monospace, monospace`, "rgba(238,242,247,0.55)");
  } else {
    logo(ctx, 90, 150, 170, GOLD);
    texto(ctx, "GRIFO", 175, 380, `700 48px ${serif}`, INK);
    texto(ctx, "2ª FASE OAB · PENAL", 175, 414, `700 16px ${sans}`, GOLD_LIGHT);
    const x0 = 340;
    texto(ctx, d.titulo, x0, 150, `700 42px ${serif}`, INK, "left", w - x0 - 80);
    texto(ctx, d.subtitulo, x0, 192, `500 24px ${sans}`, "#b9c6d6", "left", w - x0 - 80);
    texto(ctx, fmt(d.nota), x0 - 8, 360, `800 150px ${sans}`, d.aprovado ? GOLD : INK, "left");
    ctx.font = `800 150px ${sans}`;
    const nw = ctx.measureText(fmt(d.nota)).width;
    texto(ctx, `/ ${fmt(d.maximo)}`, x0 + nw + 14, 360, `500 34px ${sans}`, "#b9c6d6", "left");
    if (d.destaque) texto(ctx, d.destaque, x0, 420, `800 30px ${sans}`, d.aprovado ? GOLD : INK, "left");
    texto(ctx, d.linhas.map((l) => `${l.rotulo} ${l.valor}`).join("   ·   "), x0, 480, `500 22px ${sans}`, "#cbd6e2", "left", w - x0 - 80);
    texto(ctx, `${d.rodape} · www.grifo.com`, x0, 530, `500 18px ${sans}`, "#9fb0c3", "left");
    texto(ctx, d.codigo, x0, 565, `500 15px ui-monospace, monospace`, "rgba(238,242,247,0.55)", "left");
  }
}

export function canvasParaBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("falha ao gerar imagem"))), "image/png"));
}

export async function compartilharImagem(canvas: HTMLCanvasElement, nome: string, texto: string, url: string) {
  const blob = await canvasParaBlob(canvas);
  const file = new File([blob], nome, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], text: texto, url });
    return "compartilhado";
  }
  baixar(blob, nome);
  return "baixado";
}

export function baixar(blob: Blob, nome: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export function carregarImagem(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });
}
