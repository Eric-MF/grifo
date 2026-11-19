// A borda grega (meandro) dos cards e das prévias de compartilhar, desenhada com linhas num canvas. Sem importações
// com "@/": o gerador das prévias (scripts/gerar-previas.ts) também a usa, fora do Next.

const GOLD = "#d69c45";

/** Borda grega em volta de um retângulo `w` x `h`, a `m` da borda, com módulos de tamanho `u`. */
export function meandro(ctx: CanvasRenderingContext2D, w: number, h: number, m: number, u: number) {
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
