// Sexta-feira da Paixão (dois dias antes da Páscoa): as muralhas da Nova Jerusalém, o teatro a céu aberto de
// Fazenda Nova (PE), o Calvário com as três cruzes ao entardecer e a procissão de velas.
import { ciclo, colinas, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { atravessa, figura, noiteDe, repetir, sol, surge } from "../kit";

// cores por hora do dia (amanhecer, dia, entardecer, noite); o céu fica no roxo da Quaresma
const MURALHA = ["#a88a7a", "#b39a84", "#8a6a70", "#2e2238"];
const MURALHA_SOMBRA = ["#7a6058", "#86705e", "#634a56", "#1c1426"];
const MONTE = ["#5a3a5a", "#634460", "#4a2a4a", "#140c1e"];
const OLIVEIRA = ["#4a5a3a", "#526442", "#3e4436", "#10140e"];
const GENTE = ["#2a1a2a", "#2e1e2e", "#241624", "#0a060c"];

/** Trecho de muralha com ameias e uma torre quadrada de seteira. */
function muralha(ctx: Ctx, x: number, base: number, cor: string, sombra: string, k: number) {
  const alt = 70;
  ctx.fillStyle = cor;
  ctx.fillRect(x, base - alt, 220, alt);
  for (let i = 0; i < 220; i += 16) ctx.fillRect(x + i, base - alt - 8, 9, 8);
  // torre
  const tx = x + 60 + variar(k, 13, 80);
  ctx.fillRect(tx, base - alt - 46, 44, alt + 46);
  for (let i = 0; i < 44; i += 11) ctx.fillRect(tx + i, base - alt - 54, 7, 8);
  ctx.fillStyle = sombra;
  ctx.fillRect(tx + 30, base - alt - 46, 14, alt + 46);
  ctx.fillRect(tx + 19, base - alt - 30, 6, 14);
  // pedras
  ctx.globalAlpha = 0.35;
  for (let yy = base - alt + 8; yy < base; yy += 12) {
    for (let xx = x + ((yy / 12) % 2) * 10; xx < x + 220; xx += 22) ctx.fillRect(xx, yy, 1.5, 10);
    ctx.fillRect(x, yy + 10, 220, 1.5);
  }
  ctx.globalAlpha = 1;
  // portão em arco
  ctx.beginPath();
  ctx.moveTo(x + 170, base);
  ctx.lineTo(x + 170, base - 26);
  ctx.arc(x + 182, base - 26, 12, Math.PI, 0);
  ctx.lineTo(x + 194, base);
  ctx.fill();
}

/** Oliveira de copa larga e tronco retorcido. */
function oliveira(ctx: Ctx, x: number, base: number, s: number, cor: string) {
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.moveTo(x - 3 * s, base);
  ctx.quadraticCurveTo(x - 6 * s, base - 14 * s, x, base - 22 * s);
  ctx.quadraticCurveTo(x + 6 * s, base - 14 * s, x + 4 * s, base);
  ctx.fill();
  for (const [dx, dy, r] of [[-12, -28, 11], [0, -36, 13], [13, -28, 11], [-4, -24, 10], [7, -22, 9]]) {
    ctx.beginPath();
    ctx.ellipse(x + dx * s, base + dy * s, r * s * 1.2, r * s * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Ramo de oliveira (para a maleta). */
function ramo(c: Ctx) {
  c.strokeStyle = "#5a4a2a";
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(-20, -18);
  c.quadraticCurveTo(-6, -27, 10, -24);
  c.stroke();
  c.fillStyle = "#7a9a4a";
  for (let i = 0; i < 6; i++) {
    const f = i / 5;
    const x = -18 + f * 27;
    const y = -20 - Math.sin(f * Math.PI) * 5;
    for (const l of [-1, 1]) {
      c.beginPath();
      c.ellipse(x + 2, y + l * 3, 3.6, 1.4, l * 0.7, 0, Math.PI * 2);
      c.fill();
    }
  }
  c.fillStyle = "#3a2a4a";
  for (const [x, y] of [[-8, -21], [2, -25]]) {
    c.beginPath();
    c.arc(x, y, 1.6, 0, Math.PI * 2);
    c.fill();
  }
}

export const PAIXAO: Tema = {
  id: "paixao",
  nome: "Sexta-feira Santa",
  descricao: "Sexta-feira da Paixão: as muralhas da Nova Jerusalém e o Calvário ao entardecer, com a procissão de velas.",
  grupo: "feriados",
  janela: { tipo: "pascoa", dias: -2 },
  amostra: "linear-gradient(135deg, #5a2a7a 50%, #e0a070 50%)",
  onda: "sine",
  somBase: 175,
  capitel: "dorico",
  paleta: {
    ceu: [["#5a3a86", "#f0a88a"], ["#7a5aa8", "#f4c49a"], ["#4a2468", "#e88a64"], ["#120a26", "#3a2250"]],
    longe: MONTE,
    perto: OLIVEIRA,
    chao: "#a8906e",
    chaoLinha: "#7a6448",
    coluna: { corpo: "#c8b49a", sombra: "#9a8468", luz: "#e2d2b8", contorno: "#5a4632" },
    maleta: { corpo: "#6a3a8a", escuro: "#2e1640", fivela: "#e8c46a", alca: "#2e1640" },
    asa: { cor: "#f4ecff", contorno: "#5a2a7a" },
    moeda: ["#ffd866", "#b08a2e"],
    particula: ["#e8c46a", "#c8a0ff", "#ffffff"],
    recorde: {
      cor: "#a066e0", traco: [6, 3], largura: 3,
      aviso: { texto: "NOVO RECORDE", fonte: "italic 700 28px Georgia, serif", corTexto: "#f4ecff", corContorno: "#2e1640", corFundo: "rgba(60,24,90,0.88)", anima: "pulsa" },
    },
    hud: "#1e0e2e",
    estrelas: "#fff4e0",
  },
  surpresa(ctx, w, h, f, t) {
    // a pomba branca atravessando o céu, com o brilho em volta
    const bate = Math.sin(t * 9);
    ctx.globalAlpha = surge(f);
    // desenhada em escala 2 a partir da origem (x, y)
    ctx.translate(atravessa(w, f, 200), h * 0.24 + Math.sin(f * Math.PI * 3) * 16);
    ctx.scale(2, 2);
    const x = 0;
    const y = 0;
    const g = ctx.createRadialGradient(x, y, 4, x, y, 60);
    g.addColorStop(0, "rgba(255,250,230,0.55)");
    g.addColorStop(1, "rgba(255,250,230,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - 60, y - 60, 120, 120);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(x, y, 16, 7, -0.1, 0, Math.PI * 2);
    ctx.moveTo(x + 22, y - 4);
    ctx.arc(x + 15, y - 4, 6, 0, Math.PI * 2);
    ctx.moveTo(x - 14, y);
    ctx.lineTo(x - 28, y - 6);
    ctx.lineTo(x - 28, y + 6);
    ctx.fill();
    for (const l of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x - 4, y - 2);
      ctx.quadraticCurveTo(x - 10, y - 26 * bate * l - 4, x - 20, y - 30 * bate * l);
      ctx.quadraticCurveTo(x + 2, y - 14 * bate * l, x + 6, y - 2);
      ctx.fill();
    }
    ctx.fillStyle = "#e8a03a";
    ctx.fillRect(x + 20, y - 5, 5, 2.4);
    ctx.globalAlpha = 1;
  },
  decor(ctx, w, h, off, tod, t) {
    const noite = noiteDe(tod);
    sol(ctx, w * 0.3, h * 0.44, 34, noite > 0.5 ? "#e8e0f0" : "#ffcf8a", noite > 0.5 ? "rgba(220,210,255,0.25)" : "rgba(255,190,130,0.45)");
    // o monte do Calvário com as três cruzes
    const monte = ciclo(MONTE, tod);
    repetir(w, off * 0.05, 1200, (x) => {
      ctx.fillStyle = monte;
      ctx.beginPath();
      ctx.moveTo(x, h - 40);
      ctx.quadraticCurveTo(x + 300, h - 300, x + 600, h - 300);
      ctx.quadraticCurveTo(x + 900, h - 300, x + 1200, h - 40);
      ctx.fill();
      ctx.fillStyle = ciclo(["#2a1a3a", "#2e1e3e", "#241434", "#08040e"], tod);
      for (const [dx, a] of [[-46, 52], [0, 66], [46, 52]]) {
        const cx = x + 600 + dx;
        const topo = h - 300 - a;
        ctx.fillRect(cx - 2.5, topo, 5, a + 4);
        ctx.fillRect(cx - 14, topo + a * 0.22, 28, 4.5);
      }
    });
    colinas(ctx, w, h - 40, off * 0.12, ciclo(["#6a4a62", "#745470", "#5a3a5a", "#1a1024"], tod), 90, 18, 0.007, 3);
    // as muralhas da cidade
    const mur = ciclo(MURALHA, tod);
    const sombra = ciclo(MURALHA_SOMBRA, tod);
    repetir(w, off * 0.24, 230, (x, k) => muralha(ctx, x, h - 70, mur, sombra, k));
    // oliveiras
    const oliv = ciclo(OLIVEIRA, tod);
    repetir(w, off * 0.36, 140, (x, k) => {
      if (variar(k, 7, 3) === 0) return;
      oliveira(ctx, x + variar(k, 19, 50), h - 46, 1.4 + variar(k, 5, 3) * 0.2, oliv);
    });
    // a procissão de velas
    const gente = ciclo(GENTE, tod);
    repetir(w, off * 0.46 + t * 8, 300, (x, k) => {
      for (let i = 0; i < 5; i++) {
        const px = x + i * 22 + variar(k + i, 11, 8);
        const passo = Math.sin(t * 2.4 + i) * 0.12;
        const mao = figura(ctx, px, h - 41, 0.9, gente, { bracoE: 0.15, bracoD: 1.05, pernaE: passo, pernaD: -passo });
        // a chama, que treme
        const tremor = Math.sin(t * 17 + i * 3) * 0.6;
        ctx.fillStyle = "rgba(255,210,120,0.3)";
        ctx.beginPath();
        ctx.arc(mao[0], mao[1] - 7, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#f4ecd8";
        ctx.fillRect(mao[0] - 1, mao[1] - 6, 2, 6);
        ctx.fillStyle = "#ffcf4a";
        ctx.beginPath();
        ctx.ellipse(mao[0] + tremor * 0.4, mao[1] - 8.5, 1.4, 2.6, tremor * 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  },
  chao(ctx, w, h, y, off, tema, tod) {
    const p = tema.paleta;
    ctx.fillStyle = ciclo([p.chao, p.chao, "#9a7e62", "#3a2e2a"], tod);
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = p.chaoLinha;
    ctx.fillRect(0, y, w, 3);
    // lajes de pedra do caminho
    ctx.fillStyle = "rgba(60,40,30,0.25)";
    for (let fila = 0; fila < 2; fila++) {
      const yy = y + 9 + fila * 14;
      for (let x = -((off + fila * 22) % 44); x < w; x += 44) ctx.fillRect(x, yy, 2, 12);
      ctx.fillRect(0, yy + 12, w, 1.5);
    }
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // pedra em blocos, como a muralha
    ctx.fillStyle = c.corpo;
    ctx.fillRect(x0, 0, w, len);
    ctx.fillStyle = c.sombra;
    ctx.fillRect(x0 + w - 8, 0, 8, len);
    ctx.fillStyle = c.luz;
    ctx.fillRect(x0, 0, 5, len);
    ctx.strokeStyle = c.contorno;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let y = 26, fila = 0; y < len; y += 22, fila++) {
      ctx.moveTo(x0, y);
      ctx.lineTo(x0 + w, y);
      const meio = x0 + w / 2 + (fila % 2 ? -16 : 16) + (variar(fila + variante, 7, 3) - 1) * 4;
      ctx.moveTo(meio, y);
      ctx.lineTo(meio, y + 22);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      ctx.fillStyle = c.corpo;
      ctx.beginPath();
      ctx.moveTo(x0, 14);
      ctx.lineTo(x0 + w * 0.2, 6);
      ctx.lineTo(x0 + w * 0.35, 6);
      ctx.lineTo(x0 + w * 0.35, 0);
      ctx.lineTo(x0 + w * 0.65, 0);
      ctx.lineTo(x0 + w * 0.65, 8);
      ctx.lineTo(x0 + w, 4);
      ctx.lineTo(x0 + w, 16);
      ctx.lineTo(x0, 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    // cornija de pedra e o pano roxo da Quaresma, com dobras
    ctx.fillStyle = c.luz;
    ctx.fillRect(x0 - 5, 0, w + 10, 8);
    ctx.strokeRect(x0 - 5, 0, w + 10, 8);
    ctx.fillStyle = "#5a2a7a";
    ctx.beginPath();
    ctx.moveTo(x0 - 2, 8);
    ctx.lineTo(x0 + w + 2, 8);
    ctx.lineTo(x0 + w + 2, 22);
    for (let i = 6; i >= 0; i--) ctx.quadraticCurveTo(x0 + (i + 0.5) * (w / 6), i % 2 ? 34 : 26, x0 + (i * w) / 6 - (i === 0 ? 2 : 0), 24);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#2e1640";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    for (let i = 1; i < 6; i++) {
      ctx.moveTo(x0 + (i * w) / 6, 9);
      ctx.lineTo(x0 + (i * w) / 6, 24);
    }
    ctx.stroke();
    ctx.fillStyle = "#e8c46a";
    ctx.fillRect(x0 - 2, 8, w + 4, 2.5);
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, ramo);
  },
};
