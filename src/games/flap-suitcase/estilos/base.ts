// Surpresas (easter eggs) dos estilos de fora dos grupos, que ficam em themes.ts: o catálogo junta cada uma ao seu estilo.
// Ficam aqui para themes.ts não depender do kit (o kit já depende de themes.ts).
import type { Ctx, Tema } from "../themes";
import { alturaNeveRecesso } from "./base-cenarios";
import { atravessa, bonecoDeNeve, cavalo, letreiro, surge } from "./kit";

/** Asa de penas grande, presa às costas do cavalo voador; `bate` (−1 a 1) levanta e abaixa. */
function asaGrande(ctx: Ctx, x: number, y: number, s: number, bate: number, cor: string) {
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x - 10 * s, y - 30 * s * bate - 6 * s, x - 34 * s, y - 34 * s * bate - 4 * s);
  for (let i = 0; i < 4; i++) ctx.quadraticCurveTo(x - (30 - i * 7) * s, y - (26 - i * 6) * s * bate + 4 * s, x - (26 - i * 7) * s, y - (28 - i * 7) * s * bate + 2 * s);
  ctx.quadraticCurveTo(x + 4 * s, y - 4 * s * bate, x + 8 * s, y);
  ctx.fill();
}

export const SURPRESAS_BASE: Record<string, NonNullable<Tema["surpresa"]>> = {
  classico(ctx, w, h, f, t) {
    // Pégaso, o cavalo alado, atravessando o céu do Egeu
    const x = atravessa(w, f, 140);
    const y = h * 0.34 + Math.sin(f * Math.PI * 2) * 24;
    const bate = Math.sin(t * 6);
    asaGrande(ctx, x + 2, y - 24, 1.3, bate * 0.8 + 0.6, "#e8eef6");
    cavalo(ctx, x, y, 1.3, "#ffffff", t * 1.4);
    asaGrande(ctx, x + 6, y - 26, 1.4, bate + 0.7, "#ffffff");
  },
  fofo(ctx, w, h, f, t) {
    // o unicórnio cor-de-rosa deixando um rastro de arco-íris
    const x = atravessa(w, f, 140);
    const y = h * 0.36 + Math.sin(f * Math.PI * 3) * 20;
    ctx.lineCap = "round";
    ["#ff6b8a", "#ffb35a", "#ffe45a", "#7ae08a", "#6ab8ff", "#b48aff"].forEach((cor, i) => {
      ctx.strokeStyle = cor;
      ctx.lineWidth = 5;
      ctx.beginPath();
      for (let k = 0; k <= 20; k++) {
        const px = x - 20 - k * 16;
        const py = y - 30 + i * 5 + Math.sin(f * Math.PI * 3 - k * 0.12) * 20 * (k / 20) - Math.sin(f * Math.PI * 3) * 20 * (k / 20);
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    });
    cavalo(ctx, x, y, 1.2, "#ffd6e4", t * 1.6);
    ctx.fillStyle = "#ffe45a";
    ctx.beginPath();
    ctx.moveTo(x + 18 * 1.2, y - 44 * 1.2);
    ctx.lineTo(x + 26 * 1.2, y - 60 * 1.2);
    ctx.lineTo(x + 22 * 1.2, y - 42 * 1.2);
    ctx.fill();
  },
  retro(ctx, w, h, f, t) {
    // um disco voador para no meio da tela, acende o raio e vai embora
    const parado = f > 0.3 && f < 0.7;
    const x = f < 0.3 ? atravessa(w, f / 0.3 * 0.5, 120) : f < 0.7 ? w / 2 : atravessa(w, 0.5 + ((f - 0.7) / 0.3) * 0.5, 120);
    const y = h * 0.24 + Math.sin(t * 2) * 6;
    if (parado) {
      const g = ctx.createLinearGradient(0, y, 0, h - 40);
      g.addColorStop(0, "rgba(120,255,220,0.5)");
      g.addColorStop(1, "rgba(120,255,220,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - 14, y + 8);
      ctx.lineTo(x + 14, y + 8);
      ctx.lineTo(x + 70, h - 40);
      ctx.lineTo(x - 70, h - 40);
      ctx.fill();
    }
    ctx.fillStyle = "#9ad8ff";
    ctx.beginPath();
    ctx.ellipse(x, y - 10, 20, 16, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = "#c8c8e8";
    ctx.beginPath();
    ctx.ellipse(x, y, 56, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = (Math.floor(t * 8) + i) % 2 ? "#ff3fd1" : "#27e0ff";
      ctx.beginPath();
      ctx.arc(x - 40 + i * 16, y + 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  steampunk(ctx, w, h, f, t) {
    // um autômato gigante de latão caminha no horizonte, soltando vapor pela cabeça
    const x = atravessa(w, f, 120);
    const base = h - 40;
    const passo = Math.sin(t * 2.4);
    ctx.fillStyle = "#8a6a3a";
    ctx.strokeStyle = "#5a4226";
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - 14, base - 110);
    ctx.lineTo(x - 14 + passo * 18, base - 4);
    ctx.moveTo(x + 14, base - 110);
    ctx.lineTo(x + 14 - passo * 18, base - 4);
    ctx.stroke();
    ctx.fillRect(x - 36, base - 200, 72, 96);
    ctx.fillStyle = "#b5863a";
    ctx.fillRect(x - 26, base - 250, 52, 46);
    ctx.fillStyle = "#ffcf5a";
    for (const dx of [-12, 12]) {
      ctx.beginPath();
      ctx.arc(x + dx, base - 228, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(x - 36, base - 190);
    ctx.lineTo(x - 50 - passo * 10, base - 130);
    ctx.moveTo(x + 36, base - 190);
    ctx.lineTo(x + 50 + passo * 10, base - 130);
    ctx.stroke();
    ctx.strokeStyle = "#d9a441";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, base - 160, 18, t * 2, t * 2 + Math.PI * 1.6);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const s = (((t * 0.7 + i / 4) % 1) + 1) % 1;
      ctx.fillStyle = `rgba(240,236,228,${0.6 * (1 - s)})`;
      ctx.beginPath();
      ctx.arc(x + 4 + s * 20, base - 256 - s * 50, 8 + s * 14, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  pixel(ctx, w, h, f, t) {
    // uma nuvem de blocos sorridente atravessa o céu, piscando
    const x = Math.round(atravessa(w, f, 100) / 6) * 6;
    const y = Math.round((h * 0.22 + Math.sin(t * 2) * 6) / 6) * 6;
    ctx.fillStyle = "#ffffff";
    for (const [dx, dy, l, a] of [[-36, 0, 72, 24], [-24, -12, 48, 12], [-12, -24, 24, 12], [-48, 6, 96, 12]]) ctx.fillRect(x + dx, y + dy, l, a);
    ctx.fillStyle = "#1a1a1a";
    const pisca = Math.sin(t * 3) > 0.9;
    ctx.fillRect(x - 18, y + (pisca ? 4 : 0), 6, pisca ? 2 : 6);
    ctx.fillRect(x + 12, y + (pisca ? 4 : 0), 6, pisca ? 2 : 6);
    ctx.fillRect(x - 12, y + 12, 24, 4);
    ctx.fillRect(x - 18, y + 6, 6, 6);
    ctx.fillRect(x + 12, y + 6, 6, 6);
  },
  noir(ctx, w, h, f, t) {
    // a lupa gigante do detetive passa revelando uma impressão digital
    const x = atravessa(w, f, 120);
    const y = h * 0.32 + Math.sin(t * 1.4) * 10;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 44, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "rgba(230,230,230,0.18)";
    ctx.fillRect(x - 44, y - 44, 88, 88);
    ctx.strokeStyle = "#e6e6e6";
    ctx.lineWidth = 1.6;
    for (let i = 1; i < 7; i++) {
      ctx.beginPath();
      ctx.ellipse(x, y, i * 5, i * 6.5, 0.2, Math.PI * 0.1, Math.PI * 1.85);
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = "#bbbbbb";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(x, y, 44, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111111";
    ctx.beginPath();
    ctx.moveTo(x + 32, y + 32);
    ctx.lineTo(x + 76, y + 76);
    ctx.stroke();
  },
  papiro(ctx, w, h, f, t) {
    // uma pena de escrever grande escreve "LEX" no céu, com tinta, e a tinta some aos poucos
    const x = w * 0.5;
    const y = h * 0.34;
    const k = Math.min(1, f * 1.8);
    ctx.save();
    ctx.globalAlpha = surge(f);
    ctx.beginPath();
    ctx.rect(x - 110, y - 50, 220 * k, 100);
    ctx.clip();
    letreiro(ctx, "LEX", x, y, 80, "#3b2a1a", "rgba(241,228,198,0.6)", "italic 700 {t}px Georgia, serif");
    ctx.restore();
    const px = x - 110 + 220 * k;
    const py = y + Math.sin(t * 14) * 12;
    ctx.globalAlpha = surge(f);
    ctx.fillStyle = "#f8f0dc";
    ctx.strokeStyle = "#3b2a1a";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.quadraticCurveTo(px + 30, py - 50, px + 60, py - 90);
    ctx.quadraticCurveTo(px + 20, py - 60, px + 4, py - 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 1;
  },
  recesso(ctx, w, h, f, t) {
    // um boneco de neve de trenó, deslizando pelos montes (o cachecol voa para trás)
    // em cima dos montes de neve da frente, acompanhando a subida e a descida deles
    const x = atravessa(w, f, 120);
    const base = alturaNeveRecesso(x) + 3;
    const inclina = Math.atan2(alturaNeveRecesso(x + 14) - alturaNeveRecesso(x - 14), 28);
    ctx.save();
    ctx.translate(x, base);
    ctx.rotate(inclina);
    // o trenó: o assento de madeira e o patim curvo na frente
    ctx.fillStyle = "#c8322f";
    ctx.fillRect(-28, -8, 56, 6);
    ctx.strokeStyle = "#7a1a18";
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-32, 0);
    ctx.lineTo(28, 0);
    ctx.quadraticCurveTo(38, 0, 36, -10);
    ctx.moveTo(-18, -2);
    ctx.lineTo(-18, 0);
    ctx.moveTo(16, -2);
    ctx.lineTo(16, 0);
    ctx.stroke();
    bonecoDeNeve(ctx, 0, -8, 1, "#ffffff", t * 2.5);
    ctx.restore();
    // a neve que o trenó levanta
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (let i = 0; i < 6; i++) {
      const p = ((t * 2 + i / 6) % 1 + 1) % 1;
      ctx.beginPath();
      ctx.arc(x - 30 - p * 30, base - 2 - Math.sin(p * Math.PI) * 10, 2.4 * (1 - p) + 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  gotico(ctx, w, h, f, t) {
    // um fantasminha sai da catedral e passeia pelo céu, ondulando
    const x = atravessa(w, f, 100);
    const y = h * 0.32 + Math.sin(t * 2) * 16;
    ctx.globalAlpha = 0.85 * surge(f);
    ctx.fillStyle = "#f1ecff";
    ctx.beginPath();
    ctx.moveTo(x - 22, y + 24);
    ctx.lineTo(x - 22, y - 6);
    ctx.arc(x, y - 6, 22, Math.PI, 0);
    ctx.lineTo(x + 22, y + 24);
    for (let i = 0; i < 4; i++) ctx.quadraticCurveTo(x + 16 - i * 11, y + 16 + Math.sin(t * 6 + i) * 4, x + 11 - i * 11, y + 24);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#2a1838";
    for (const dx of [-8, 8]) {
      ctx.beginPath();
      ctx.ellipse(x + dx, y - 8, 3.6, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.ellipse(x, y + 4, 4, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  },
};
