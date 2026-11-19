// Amazônia: a floresta em camadas, com as samaúmas acima do dossel, os cipós pendurados, o igarapé com as folhas de
// vitória-régia e a chuva; as colunas são troncos de samaúma com sapopemas e cipós, e a maleta se protege com uma folha.
// A surpresa é o Curupira, o guardião da mata.
import { ciclo, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { lua, noiteDe, repetir, sol } from "../kit";

// cores por hora do dia (amanhecer, dia, entardecer, noite)
const DOSSEL = [
  ["#5a7a6a", "#4f8068", "#4e5a66", "#0e1a1e"],
  ["#3a6a44", "#2f7040", "#364a42", "#0a1610"],
  ["#2a5434", "#22582f", "#283c32", "#060e0a"],
];
const EMERGENTE = ["#4a7050", "#42764c", "#405248", "#0c1810"];
const IGARAPE = ["#3a4a3a", "#2e4a3a", "#34383e", "#080c0c"];
const VITORIA = ["#4a8a3a", "#3f943a", "#46663c", "#0e1a0c"];
const CIPO = ["#3a5a2a", "#36602a", "#34442e", "#0a1208"];

/** Samaúma: o tronco alto e liso que passa do dossel, com a copa larga e achatada. */
function samauma(ctx: Ctx, x: number, base: number, alt: number, tronco: string, copa: string) {
  ctx.fillStyle = tronco;
  ctx.beginPath();
  ctx.moveTo(x - 14, base);
  ctx.quadraticCurveTo(x - 5, base - 20, x - 5, base - alt);
  ctx.lineTo(x + 5, base - alt);
  ctx.quadraticCurveTo(x + 5, base - 20, x + 14, base);
  ctx.fill();
  ctx.fillStyle = copa;
  for (const [dx, dy, rx, ry] of [[-40, 0, 40, 16], [0, -10, 50, 20], [42, 2, 38, 15], [-14, -22, 30, 14], [20, -20, 30, 13]]) {
    ctx.beginPath();
    ctx.ellipse(x + dx, base - alt + dy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Onde está o Curupira da surpresa no segundo `s`: corre até o meio, para de 3,2 s a 4,8 s para assobiar e segue. */
function posicaoCurupira(w: number, s: number) {
  if (s < 3.2) return -90 + (s / 3.2) * (w * 0.5 + 90);
  if (s < 4.8) return w * 0.5;
  return w * 0.5 + ((s - 4.8) / 3.2) * (w * 0.5 + 120);
}

/** Folha gigante segurada por cima da maleta, como guarda-chuva. */
function folhaGuardaChuva(c: Ctx, t: number) {
  c.save();
  c.translate(0, -24);
  c.rotate(Math.sin(t * 3) * 0.06);
  c.strokeStyle = "#3a5a1a";
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(0, -14);
  c.stroke();
  c.fillStyle = "#3f943a";
  c.strokeStyle = "#1e4a1a";
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(-26, -12);
  c.quadraticCurveTo(0, -34, 26, -12);
  c.quadraticCurveTo(0, -18, -26, -12);
  c.fill();
  c.stroke();
  c.beginPath();
  c.moveTo(0, -14);
  for (let i = -3; i <= 3; i++) {
    c.moveTo(0, -16);
    c.lineTo(i * 7, -12 - (3 - Math.abs(i)) * 4);
  }
  c.stroke();
  c.restore();
}

export const AMAZONIA: Tema = {
  id: "amazonia",
  nome: "Amazônia",
  descricao: "A floresta em camadas com as samaúmas acima do dossel, os cipós, o igarapé de vitórias-régias e a chuva.",
  grupo: "biomas",
  amostra: "linear-gradient(135deg, #22582f 50%, #3f943a 50%)",
  onda: "sine",
  somBase: 220,
  climaFixo: "chuva",
  paleta: {
    ceu: [["#a8b0a8", "#e6e0cc"], ["#8aaabc", "#dce8e8"], ["#6a6a86", "#e0b090"], ["#0a1428", "#22344a"]],
    longe: DOSSEL[0],
    perto: DOSSEL[2],
    chao: "#4a3a24",
    chaoLinha: "#2a2010",
    coluna: { corpo: "#a89a86", sombra: "#7e7262", luz: "#c8bca8", contorno: "#2e2618" },
    maleta: { corpo: "#c8742a", escuro: "#6a340a", fivela: "#ffd21a", alca: "#6a340a" },
    asa: { cor: "#ffffff", contorno: "#2f7040" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: ["#3f943a", "#ffd21a", "#ffffff"],
    recorde: {
      cor: "#5ae86a", traco: [3, 2, 9, 2], largura: 3.5,
      aviso: { texto: "NOVO RECORDE!", fonte: "800 28px system-ui, sans-serif", corTexto: "#ffffff", corContorno: "#0a2a10", corFundo: "rgba(34,88,47,0.92)", anima: "pulsa" },
    },
    hud: "#0e2414",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // o Curupira, o guardião da mata: o cabelo de fogo e os pés virados para trás, que deixam as pegadas apontando para
    // o lado de onde ele veio. Atravessa correndo, para no meio da tela para assobiar e some do outro lado
    const seg = f * 8;
    const x = posicaoCurupira(w, seg);
    const parado = seg >= 3.2 && seg < 4.8;
    const base = h - 42;
    // os vaga-lumes que andam com ele
    for (let i = 0; i < 9; i++) {
      const a = t * (1 + i * 0.13) + i * 2.3;
      const vx = x + Math.cos(a) * (40 + i * 6);
      const vy = base - 50 + Math.sin(a * 1.3) * 34;
      ctx.globalAlpha = 0.5 + Math.sin(t * 6 + i) * 0.4;
      ctx.fillStyle = "#e8ff7a";
      ctx.beginPath();
      ctx.arc(vx, vy, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(x, base);
    ctx.scale(1.7, 1.7);
    const passo = parado ? 0 : Math.sin(seg * 14);
    const pele = "#8a5434";
    const sombra = "#5e3420";
    // as pernas com os pés virados para trás (o calcanhar na frente, os dedos para trás)
    ctx.lineCap = "round";
    for (const [l, cor] of [[-1, sombra], [1, pele]] as const) {
      const a = passo * 0.7 * l;
      const jx = Math.sin(a) * 8;
      const jy = -8 + Math.abs(Math.sin(a)) * 1.5;
      const px = jx + Math.sin(a * 0.5 - 0.3 * Math.abs(passo)) * 6;
      const py = parado ? 0 : -Math.max(0, -Math.sin(seg * 14 * l)) * 3;
      ctx.strokeStyle = cor;
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.moveTo(0, -17);
      ctx.lineTo(jx, jy);
      ctx.lineTo(px, py - 1);
      ctx.stroke();
      // o pé ao contrário: o calcanhar na frente e os dedos para trás
      ctx.fillStyle = cor;
      ctx.beginPath();
      ctx.ellipse(px - 4, py - 0.8, 6, 2.3, 0, 0, Math.PI * 2);
      for (let d = 0; d < 3; d++) {
        ctx.moveTo(px - 9.5, py - 2.2 + d * 1.3);
        ctx.arc(px - 10.2, py - 2.2 + d * 1.3, 1, 0, Math.PI * 2);
      }
      ctx.fill();
    }
    // o corpo, a saia de folhas e os braços
    ctx.fillStyle = pele;
    ctx.beginPath();
    ctx.ellipse(0, -24, 5.5, 8, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3f943a";
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const fx = -7 + i * 3.5;
      ctx.moveTo(fx - 2, -19);
      ctx.lineTo(fx + 2, -19);
      ctx.lineTo(fx + Math.sin(t * 8 + i) * 1.5, -11);
    }
    ctx.fill();
    ctx.strokeStyle = pele;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    if (parado) {
      // a mão na boca, assobiando
      ctx.moveTo(2, -29);
      ctx.lineTo(8, -26);
      ctx.lineTo(9, -36);
    } else {
      ctx.moveTo(1, -29);
      ctx.lineTo(1 - passo * 7, -21);
      ctx.moveTo(-1, -29);
      ctx.lineTo(-1 + passo * 7, -21);
    }
    ctx.stroke();
    // a cabeça, o olho maroto e o sorriso
    ctx.fillStyle = pele;
    ctx.beginPath();
    ctx.arc(1, -38, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(4, -39.5, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a0e08";
    ctx.beginPath();
    ctx.arc(4.6, -39.3, 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#2a140a";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(3.5, -36, 2.4, 0.1, Math.PI * 0.8);
    ctx.stroke();
    // o cabelo de fogo, que tremula (e cresce quando ele para)
    const chama = parado ? 1.35 : 1;
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI * 0.95 + (i / 6) * Math.PI * 0.9 - (parado ? 0 : 0.35);
      const L = (7 + (i % 3) * 2.5 + Math.sin(t * 14 + i * 1.7) * 2) * chama;
      const bx = 1 + Math.cos(a) * 5.5;
      const by = -38 + Math.sin(a) * 5.5;
      const tx = bx + Math.cos(a - (parado ? 0 : 0.5)) * L;
      const ty = by + Math.sin(a - (parado ? 0 : 0.5)) * L - 2;
      ctx.fillStyle = ["#ff3a1a", "#ff8a1a", "#ffd21a"][i % 3]!;
      ctx.beginPath();
      ctx.moveTo(bx - 2.5, by + 1);
      ctx.quadraticCurveTo(bx, by - L * 0.3, tx, ty);
      ctx.quadraticCurveTo(bx + 1, by - L * 0.2, bx + 2.5, by + 1);
      ctx.fill();
    }
    ctx.restore();
    // o assobio: as notas saem da boca e sobem
    if (parado) {
      ctx.fillStyle = "#fff6c8";
      ctx.font = "700 22px Georgia, serif";
      ctx.textAlign = "center";
      for (let i = 0; i < 3; i++) {
        const k = (((seg - 3.2) * 0.9 + i / 3) % 1 + 1) % 1;
        ctx.globalAlpha = 1 - k;
        ctx.fillText(i % 2 ? "♫" : "♪", x + 22 + k * 40, base - 70 - k * 50);
      }
      ctx.globalAlpha = 1;
    }
  },
  surpresaFrente(ctx, w, h, f) {
    // as pegadas do Curupira, ao contrário: os dedos apontam para trás. Ficam no chão (na frente dele), que anda, e somem
    const seg = f * 8;
    const base = h - 42;
    ctx.fillStyle = "#1e1208";
    for (let j = 1; j <= 8; j++) {
      const s = seg - j * 0.13;
      if (s < 0 || (s >= 3.2 && s < 4.8)) continue;
      const idade = seg - s;
      const px = posicaoCurupira(w, s) - idade * 210;
      const py = base + 8 + (j % 2) * 5;
      ctx.globalAlpha = Math.max(0, 0.75 - idade * 0.7);
      ctx.beginPath();
      ctx.ellipse(px, py, 7, 3, 0, 0, Math.PI * 2);
      for (let d = 0; d < 3; d++) {
        ctx.moveTo(px - 8.5, py - 2 + d * 2);
        ctx.arc(px - 9.6, py - 2 + d * 2, 1.4, 0, Math.PI * 2);
      }
      ctx.fill();
    }
  },
  decor(ctx, w, h, off, tod, t) {
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.6, h * 0.12, 18, "#e8e4dc");
    else sol(ctx, w * 0.6, h * 0.12, 20, "#fff8e8", "rgba(255,250,230,0.35)");
    // as samaúmas lá no alto, passando do dossel
    const tronco = ciclo(["#8a8a7a", "#909080", "#78707a", "#1a1a1e"], tod);
    const emergente = ciclo(EMERGENTE, tod);
    repetir(w, off * 0.04, 520, (x, k) => samauma(ctx, x + variar(k, 31, 200), h - 250, 140 + variar(k, 7, 3) * 30, tronco, emergente));
    // as três camadas de copas, cada uma mais perto e mais escura
    DOSSEL.forEach((cores, i) => {
      const cor = ciclo(cores, tod);
      const base = h - 250 + i * 60;
      repetir(w, off * (0.07 + i * 0.08), 54 + i * 10, (x, k) => {
        ctx.fillStyle = cor;
        ctx.beginPath();
        ctx.arc(x + 27, base - variar(k + i * 7, 7, 4) * 8, 30 + variar(k, 13, 3) * 6 + i * 4, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = cor;
      ctx.fillRect(0, base, w, 70);
      // cipós caindo da camada do meio
      if (i === 1) {
        ctx.strokeStyle = ciclo(CIPO, tod);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        repetir(w, off * 0.15, 37, (x, k) => {
          const L = 40 + variar(k, 7, 4) * 20;
          ctx.moveTo(x, base + 20);
          ctx.quadraticCurveTo(x + Math.sin(t * 1.2 + k) * 6, base + 20 + L / 2, x + 2, base + 20 + L);
        });
        ctx.stroke();
      }
    });
    // o igarapé, escuro e parado, com as folhas de vitória-régia
    const yAgua = h - 90;
    ctx.fillStyle = ciclo(IGARAPE, tod);
    ctx.fillRect(0, yAgua, w, 50);
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -((off * 0.3) % 60); x < w; x += 60) {
      ctx.moveTo(x, yAgua + 14);
      ctx.lineTo(x + 20, yAgua + 14);
    }
    ctx.stroke();
    const folha = ciclo(VITORIA, tod);
    repetir(w, off * 0.36, 90, (x, k) => {
      const fx = x + variar(k, 31, 40);
      const fy = yAgua + 18 + variar(k, 7, 3) * 8;
      const r = 20 + variar(k, 13, 3) * 6;
      ctx.fillStyle = "#9a2a3a";
      ctx.beginPath();
      ctx.ellipse(fx, fy, r + 2, r * 0.26 + 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = folha;
      ctx.beginPath();
      ctx.ellipse(fx, fy - 1, r, r * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();
      if (variar(k, 5, 4) === 0) {
        ctx.fillStyle = "#ffe0ea";
        ctx.beginPath();
        ctx.ellipse(fx + r * 0.4, fy - 5, 5, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  },
  chao(ctx, w, h, y, off, tema, tod) {
    // o chão da mata, de folhas e raízes
    ctx.fillStyle = ciclo([tema.paleta.chao, tema.paleta.chao, "#3e3020", "#120e08"], tod);
    ctx.fillRect(0, y, w, h - y);
    for (let x = -(off % 23); x < w; x += 23) {
      const k = Math.round((x + off) / 23);
      ctx.fillStyle = ["#6a8a3a", "#a8843a", "#5a3a1a"][variar(k, 7, 3)];
      ctx.beginPath();
      ctx.ellipse(x + 10, y + 8 + variar(k, 11, 22), 5, 2, k, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "#2a1e10";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = -(off % 140); x < w; x += 140) {
      ctx.moveTo(x, y + 4);
      ctx.quadraticCurveTo(x + 30, y + 14, x + 70, y + 8);
    }
    ctx.stroke();
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // tronco liso e claro da samaúma, com os cipós enrolados e o musgo
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0, c.luz);
    g.addColorStop(0.5, c.corpo);
    g.addColorStop(1, c.sombra);
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, w, len);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, 0, w, len);
    ctx.clip();
    ctx.fillStyle = "rgba(60,110,50,0.35)";
    for (let y = 20 + variante * 30; y < len; y += 90) {
      ctx.beginPath();
      ctx.ellipse(x0 + 6, y, 10, 22, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "#3a6a2a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let y = -40 + variante * 20; y < len + 40; y += 120) {
      ctx.moveTo(x0, y);
      ctx.bezierCurveTo(x0 + w * 0.4, y + 30, x0 + w * 0.6, y + 10, x0 + w, y + 50);
    }
    ctx.stroke();
    ctx.fillStyle = "#4a8a3a";
    for (let y = 30 + variante * 20; y < len; y += 120) {
      ctx.beginPath();
      ctx.ellipse(x0 + w * 0.5, y + 22, 5, 2.5, 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      ctx.fillStyle = "#d8c49a";
      ctx.beginPath();
      ctx.moveTo(x0, 12);
      for (let i = 0; i <= 8; i++) ctx.lineTo(x0 + (i * w) / 8, i % 2 ? 2 : 8);
      ctx.lineTo(x0 + w, 14);
      ctx.lineTo(x0, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    // a ponta abre nas sapopemas, as raízes em tábua, sem passar da largura
    ctx.fillStyle = c.sombra;
    ctx.beginPath();
    ctx.moveTo(x0, 22);
    ctx.quadraticCurveTo(x0 + 4, 8, x0 - 4, 0);
    ctx.lineTo(x0 + w * 0.3, 0);
    ctx.quadraticCurveTo(x0 + w * 0.36, 10, x0 + w * 0.45, 22);
    ctx.moveTo(x0 + w, 22);
    ctx.quadraticCurveTo(x0 + w - 4, 8, x0 + w + 4, 0);
    ctx.lineTo(x0 + w * 0.7, 0);
    ctx.quadraticCurveTo(x0 + w * 0.64, 10, x0 + w * 0.55, 22);
    ctx.fill();
    ctx.fillStyle = c.luz;
    ctx.fillRect(x0 + w * 0.3, 0, w * 0.4, 6);
    ctx.strokeRect(x0 - 4, 0, w + 8, 6);
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, (c) => folhaGuardaChuva(c, t));
  },
};
