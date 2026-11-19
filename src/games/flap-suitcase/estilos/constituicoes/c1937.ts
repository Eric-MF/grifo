// Constituição de 1937, outorgada por Getúlio Vargas no golpe que instaurou o Estado Novo: a arquitetura monumental
// dos ministérios, os holofotes varrendo o céu fechado e as colunas de granito liso; na maleta, o chapéu fedora.
import { ciclo, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { lua, noiteDe, repetir, surge } from "../kit";

const BRONZE = "#a8783a";
// cores por hora do dia (amanhecer, dia, entardecer, noite); céu fechado, de nuvens baixas
const MONUMENTO = ["#b8a890", "#c0b098", "#a8948e", "#3a3640"];
const MONUMENTO_SOMBRA = ["#968670", "#9e8e78", "#887474", "#24222c"];
const NUVEM = ["#8a8090", "#8e9098", "#7a6a80", "#1e1e2c"];
const CIDADE = ["#6a6470", "#6e6c74", "#5e5466", "#14141c"];

/** Prédio monumental: a fachada alta e lisa, com as colunas sem ornamento e a escadaria. */
function monumental(ctx: Ctx, x: number, base: number, cor: string, sombra: string, acesas: number) {
  ctx.fillStyle = cor;
  ctx.fillRect(x, base - 150, 260, 150);
  ctx.fillRect(x - 10, base - 158, 280, 10);
  ctx.fillRect(x + 70, base - 190, 120, 34);
  ctx.fillStyle = sombra;
  for (let i = 0; i < 10; i++) ctx.fillRect(x + 14 + i * 24, base - 140, 10, 104);
  ctx.fillRect(x - 10, base - 36, 280, 6);
  for (let i = 0; i < 4; i++) ctx.fillRect(x + 40 - i * 10, base - 24 + i * 6, 180 + i * 20, 3);
  ctx.fillStyle = acesas > 0.3 ? "#ffe2a0" : "rgba(0,0,0,0.25)";
  for (let i = 0; i < 9; i++) ctx.fillRect(x + 27 + i * 24, base - 130, 6, 80);
  ctx.fillStyle = BRONZE;
  ctx.fillRect(x + 110, base - 184, 40, 22);
}

/** Facho de holofote saindo do chão e varrendo o céu. */
function holofote(ctx: Ctx, x: number, base: number, t: number, k: number) {
  const a = -Math.PI / 2 + Math.sin(t * 0.4 + k * 1.7) * 0.5;
  const L = 600;
  const g = ctx.createLinearGradient(x, base, x + Math.cos(a) * L, base + Math.sin(a) * L);
  g.addColorStop(0, "rgba(255,250,220,0.32)");
  g.addColorStop(1, "rgba(255,250,220,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - 3, base);
  ctx.lineTo(x + Math.cos(a - 0.05) * L, base + Math.sin(a - 0.05) * L);
  ctx.lineTo(x + Math.cos(a + 0.05) * L, base + Math.sin(a + 0.05) * L);
  ctx.lineTo(x + 3, base);
  ctx.fill();
}

/** Chapéu fedora cinza, com a fita escura. */
function fedora(c: Ctx) {
  c.save();
  c.translate(-6, -21);
  c.rotate(-0.12);
  c.fillStyle = "#6a6a72";
  c.strokeStyle = "#2a2a32";
  c.lineWidth = 1;
  c.beginPath();
  c.ellipse(0, 2, 14, 3, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.beginPath();
  c.moveTo(-8, 2);
  c.lineTo(-7, -8);
  c.quadraticCurveTo(0, -5, 7, -8);
  c.lineTo(8, 2);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = "#1a1a22";
  c.fillRect(-8, -2, 16, 2.6);
  c.restore();
}

export const C1937: Tema = {
  id: "c1937",
  nome: "Estado Novo (1937)",
  descricao: "Outorgada por Getúlio Vargas no golpe do Estado Novo: a arquitetura monumental, os holofotes e o céu fechado.",
  grupo: "constituicoes",
  amostra: `linear-gradient(135deg, #6e6c74 50%, ${BRONZE} 50%)`,
  onda: "sawtooth",
  somBase: 147,
  climaFixo: "limpo",
  paleta: {
    ceu: [["#7a6a7a", "#c8a898"], ["#7a8494", "#c8ccd0"], ["#5a4a62", "#b89088"], ["#0a0e1e", "#22283e"]],
    longe: CIDADE,
    perto: MONUMENTO_SOMBRA,
    chao: "#8a8680",
    chaoLinha: "#5a5650",
    coluna: { corpo: "#a89e94", sombra: "#827870", luz: "#c4bab0", contorno: "#2e2a26" },
    maleta: { corpo: "#5a4a3a", escuro: "#2a2016", fivela: BRONZE, alca: "#2a2016" },
    asa: { cor: "#ffffff", contorno: "#5a5a64" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: [BRONZE, "#c4bab0", "#ffffff"],
    recorde: {
      cor: "#d8a85a", traco: [22, 6], largura: 3,
      aviso: { texto: "NOVO RECORDE", fonte: "800 28px Georgia, serif", corTexto: "#f4ece0", corContorno: "#1a1612", corFundo: "rgba(70,62,56,0.92)", anima: "pulsa" },
    },
    hud: "#1a1612",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // um rádio de válvula enorme tocando no céu, com as notas saindo
    const a = surge(f);
    const x = w * 0.5;
    const y = h * 0.28;
    ctx.globalAlpha = a;
    ctx.fillStyle = "#6a4a2a";
    ctx.beginPath();
    ctx.moveTo(x - 50, y + 40);
    ctx.lineTo(x - 50, y - 10);
    ctx.quadraticCurveTo(x - 50, y - 50, x, y - 50);
    ctx.quadraticCurveTo(x + 50, y - 50, x + 50, y - 10);
    ctx.lineTo(x + 50, y + 40);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#e8d8a8";
    ctx.beginPath();
    ctx.moveTo(x - 36, y + 10);
    ctx.lineTo(x - 36, y - 8);
    ctx.quadraticCurveTo(x - 36, y - 38, x, y - 38);
    ctx.quadraticCurveTo(x + 36, y - 38, x + 36, y - 8);
    ctx.lineTo(x + 36, y + 10);
    ctx.fill();
    ctx.strokeStyle = "#6a4a2a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = -24; i <= 24; i += 8) {
      ctx.moveTo(x + i, y - 30);
      ctx.lineTo(x + i, y + 8);
    }
    ctx.stroke();
    ctx.fillStyle = BRONZE;
    for (const dx of [-20, 0, 20]) {
      ctx.beginPath();
      ctx.arc(x + dx, y + 26, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#f4ece0";
    ctx.font = "700 26px Georgia, serif";
    ctx.textAlign = "center";
    for (let i = 0; i < 4; i++) {
      const s = (((t * 0.5 + i / 4) % 1) + 1) % 1;
      ctx.globalAlpha = a * (1 - s);
      ctx.fillText(i % 2 ? "♪" : "♫", x + 60 + s * 120, y - 20 - s * 60 + Math.sin(s * 8 + i) * 8);
    }
    ctx.globalAlpha = 1;
  },
  decor(ctx, w, h, off, tod, t) {
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.3, h * 0.14, 18, "#d8d4cc");
    // as nuvens baixas e pesadas
    ctx.fillStyle = ciclo(NUVEM, tod);
    ctx.globalAlpha = 0.75;
    repetir(w, off * 0.02 + t * 4, 300, (x, k) => {
      ctx.beginPath();
      ctx.ellipse(x + 150, h * 0.12 + variar(k, 7, 3) * 12, 200, 36, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    // os holofotes, mais fortes no escuro
    ctx.globalAlpha = 0.5 + noite * 0.5;
    repetir(w, off * 0.06, 340, (x, k) => holofote(ctx, x + 170, h - 120, t, k));
    ctx.globalAlpha = 1;
    // a cidade ao fundo e os prédios monumentais
    const cidade = ciclo(CIDADE, tod);
    repetir(w, off * 0.06, 50, (x, k) => {
      const a = 60 + variar(k, 7919, 6) * 18;
      ctx.fillStyle = cidade;
      ctx.fillRect(x, h - 120 - a, 46, a);
    });
    repetir(w, off * 0.14, 420, (x) => monumental(ctx, x + 60, h - 60, ciclo(MONUMENTO, tod), ciclo(MONUMENTO_SOMBRA, tod), noite));
    // a esplanada de pedra na frente
    ctx.fillStyle = ciclo(["#9a948a", "#a09a90", "#8a7e82", "#26242a"], tod);
    ctx.fillRect(0, h - 60, w, 20);
    // postes de iluminação em fila
    repetir(w, off * 0.4, 160, (x) => {
      ctx.fillStyle = "#2a2a30";
      ctx.fillRect(x, h - 110, 3, 70);
      ctx.fillRect(x - 6, h - 112, 15, 4);
      ctx.fillStyle = noite > 0.3 ? "#ffe8a0" : "#c8c4b8";
      ctx.beginPath();
      ctx.arc(x + 1.5, h - 116, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  },
  chao(ctx, w, h, y, off, tema, tod) {
    const p = tema.paleta;
    ctx.fillStyle = ciclo([p.chao, p.chao, "#7a7276", "#22222a"], tod);
    ctx.fillRect(0, y, w, h - y);
    // lajes grandes e regulares
    ctx.fillStyle = p.chaoLinha;
    ctx.fillRect(0, y, w, 3);
    for (let x = -(off % 60); x < w; x += 60) ctx.fillRect(x, y, 2, h - y);
    ctx.fillRect(0, y + 20, w, 1.6);
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // granito liso e pesado, com as juntas entre os blocos
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0, c.luz);
    g.addColorStop(0.55, c.corpo);
    g.addColorStop(1, c.sombra);
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, w, len);
    ctx.fillStyle = "rgba(40,36,30,0.3)";
    for (let y = 60 + variante * 15; y < len; y += 60) ctx.fillRect(x0, y, w, 2);
    ctx.fillStyle = "rgba(40,36,30,0.12)";
    for (let i = 1; i < 4; i++) ctx.fillRect(x0 + (i * w) / 4 - 1, 0, 2, len);
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 2;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      ctx.fillStyle = c.luz;
      ctx.beginPath();
      ctx.moveTo(x0, 16);
      ctx.lineTo(x0 + w * 0.35, 4);
      ctx.lineTo(x0 + w * 0.6, 12);
      ctx.lineTo(x0 + w, 2);
      ctx.lineTo(x0 + w, 18);
      ctx.lineTo(x0, 18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    // o bloco de cima, liso, com a placa de bronze
    ctx.fillStyle = c.luz;
    ctx.fillRect(x0 - 6, 0, w + 12, 18);
    ctx.strokeRect(x0 - 6, 0, w + 12, 18);
    ctx.fillStyle = BRONZE;
    ctx.fillRect(-14, 5, 28, 8);
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, fedora);
  },
};
