// Minas Gerais: o sol de pão de queijo, o mar de morros em camadas azuladas, a Maria-Fumaça atravessando a serra no viaduto de pedra,
// a igrejinha da Pampulha com as abóbadas onduladas e as colunas de pedra-sabão com volutas.
import { ciclo, colinas, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { atravessa, lua, noiteDe, repetir } from "../kit";

// cores por hora do dia (amanhecer, dia, entardecer, noite)
const MORROS = [
  ["#a8a0c0", "#9ab4cc", "#8a7aa4", "#1a2240"],
  ["#8a90b0", "#7fa2bc", "#74668e", "#141a34"],
  ["#6a7a8a", "#5f8a8a", "#5a5670", "#0e1428"],
  ["#4a6a4a", "#3f7446", "#424a48", "#0a1410"],
];
const PEDRA = ["#9a8a7a", "#a49484", "#86766e", "#2a2630"];
const TREM = ["#2a2a2e", "#26262a", "#24222a", "#08080c"];
const IGREJA = ["#f4f0ea", "#fbfaf6", "#ece0dc", "#5a5a70"];
const AZULEJO = ["#3a6ab0", "#2f6ac0", "#3a5a9a", "#16224a"];
const LAGOA = ["#7a9ab8", "#6aa8d0", "#6a6a9a", "#142040"];

/** Viaduto de pedra em arcos, por onde passa o trem. */
function viaduto(ctx: Ctx, x: number, base: number, larg: number, alt: number, cor: string) {
  ctx.fillStyle = cor;
  ctx.fillRect(x, base - alt, larg, 10);
  for (let i = 0; i < larg; i += 50) {
    ctx.beginPath();
    ctx.moveTo(x + i, base - alt + 10);
    ctx.lineTo(x + i, base);
    ctx.lineTo(x + i + 12, base);
    ctx.lineTo(x + i + 12, base - alt + 34);
    ctx.arc(x + i + 31, base - alt + 34, 19, Math.PI, 0);
    ctx.lineTo(x + i + 50, base - alt + 10);
    ctx.fill();
  }
}

/** Maria-Fumaça puxando dois vagões, com rolos de vapor que sobem e somem. */
function mariaFumaca(ctx: Ctx, x: number, trilho: number, cor: string, t: number) {
  ctx.fillStyle = cor;
  // vagões, atrás da locomotiva (o trem anda para a direita)
  for (const vx of [x - 120, x - 64]) {
    ctx.fillRect(vx, trilho - 26, 50, 20);
    ctx.fillRect(vx - 2, trilho - 30, 54, 4);
    ctx.fillStyle = "#c89a4a";
    for (let j = 0; j < 4; j++) ctx.fillRect(vx + 5 + j * 11, trilho - 22, 7, 8);
    ctx.fillStyle = cor;
  }
  ctx.strokeStyle = "#5a5a5e";
  ctx.lineWidth = 1.5;
  // rodas girando no sentido do movimento
  const roda = (rx: number, r: number) => {
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.arc(rx, trilho - r + 1, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    const a = t * 8;
    ctx.moveTo(rx + Math.cos(a) * r, trilho - r + 1 + Math.sin(a) * r);
    ctx.lineTo(rx - Math.cos(a) * r, trilho - r + 1 - Math.sin(a) * r);
    ctx.stroke();
  };
  for (const rx of [x - 108, x - 82, x - 52, x - 26]) roda(rx, 4);
  // locomotiva de frente para a direita: a cabine atrás, junto dos vagões; a chaminé e o limpa-trilhos na frente
  ctx.fillStyle = cor;
  ctx.fillRect(x, trilho - 24, 46, 18);
  ctx.fillRect(x - 4, trilho - 40, 20, 34);
  ctx.fillRect(x - 6, trilho - 44, 24, 4);
  ctx.fillRect(x + 31, trilho - 38, 9, 14);
  ctx.fillRect(x + 29, trilho - 42, 13, 4);
  ctx.beginPath();
  ctx.moveTo(x + 48, trilho - 6);
  ctx.lineTo(x + 56, trilho);
  ctx.lineTo(x + 44, trilho);
  ctx.fill();
  ctx.fillStyle = "#c8322f";
  ctx.fillRect(x, trilho - 10, 46, 3);
  for (const [rx, r] of [[x + 36, 6], [x + 20, 6], [x + 6, 5]]) roda(rx, r);
  // o vapor sai da chaminé e fica para trás
  for (let i = 0; i < 6; i++) {
    const f = (((t * 0.8 + i / 6) % 1) + 1) % 1;
    ctx.fillStyle = `rgba(240,240,245,${0.7 * (1 - f)})`;
    ctx.beginPath();
    ctx.arc(x + 36 - f * 50, trilho - 46 - f * 60 + Math.sin(f * 7 + i) * 4, 5 + f * 16, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Igreja de São Francisco da Pampulha: as abóbadas onduladas e o painel de azulejos azuis. */
function pampulha(ctx: Ctx, x: number, base: number, cor: string, azulejo: string) {
  ctx.fillStyle = cor;
  const arcos: [number, number, number][] = [[0, 70, 66], [70, 40, 44], [110, 40, 44], [150, 40, 44]];
  for (const [dx, l, a] of arcos) {
    ctx.beginPath();
    ctx.moveTo(x + dx, base);
    ctx.bezierCurveTo(x + dx, base - a * 1.3, x + dx + l, base - a * 1.3, x + dx + l, base);
    ctx.fill();
  }
  // o painel de azulejos na fachada de trás
  ctx.fillStyle = azulejo;
  ctx.beginPath();
  ctx.moveTo(x + 8, base);
  ctx.bezierCurveTo(x + 8, base - 62, x + 62, base - 62, x + 62, base);
  ctx.fill();
  ctx.strokeStyle = cor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 12; i < 62; i += 8) {
    ctx.moveTo(x + i, base);
    ctx.lineTo(x + i, base - 44);
  }
  for (let y = base - 8; y > base - 46; y -= 8) {
    ctx.moveTo(x + 10, y);
    ctx.lineTo(x + 60, y);
  }
  ctx.stroke();
  // campanário: a torre fina, mais larga em cima
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.moveTo(x + 196, base);
  ctx.lineTo(x + 192, base - 80);
  ctx.lineTo(x + 214, base - 80);
  ctx.lineTo(x + 206, base);
  ctx.fill();
}

/** O sol de Minas é um pão de queijo: a bola dourada e irregular, a casquinha rachada e a fumacinha de quente. */
function paoDeQueijo(ctx: Ctx, x: number, y: number, r: number, t: number) {
  const brilho = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 3);
  brilho.addColorStop(0, "rgba(255,214,120,0.5)");
  brilho.addColorStop(1, "rgba(255,214,120,0)");
  ctx.fillStyle = brilho;
  ctx.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
  // a bola, um pouco achatada embaixo e de contorno irregular
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.1, x, y, r * 1.1);
  g.addColorStop(0, "#ffe7a0");
  g.addColorStop(0.55, "#f2c060");
  g.addColorStop(1, "#c8862a");
  ctx.fillStyle = g;
  ctx.beginPath();
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const rr = r * (1 + 0.05 * Math.sin(i * 2.7) + 0.03 * Math.cos(i * 5.3)) * (Math.sin(a) > 0 ? 0.92 : 1);
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.fill();
  // as rachaduras da casca e as bolhinhas de queijo
  ctx.strokeStyle = "rgba(150,90,30,0.55)";
  ctx.lineWidth = 1.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  for (const [a0, a1, k] of [[3.6, 4.4, 0.62], [4.6, 5.5, 0.5], [0.3, 1.0, 0.7], [2.2, 2.9, 0.55]]) {
    ctx.moveTo(x + Math.cos(a0) * r * k, y + Math.sin(a0) * r * k);
    ctx.quadraticCurveTo(x + Math.cos((a0 + a1) / 2) * r * (k + 0.18), y + Math.sin((a0 + a1) / 2) * r * (k + 0.18), x + Math.cos(a1) * r * k, y + Math.sin(a1) * r * k);
  }
  ctx.stroke();
  ctx.fillStyle = "rgba(255,246,210,0.75)";
  for (const [dx, dy, rr] of [[-0.35, -0.45, 0.12], [0.2, -0.3, 0.08], [-0.1, 0.15, 0.07], [0.42, 0.1, 0.09], [-0.48, 0.2, 0.06]]) {
    ctx.beginPath();
    ctx.arc(x + dx * r, y + dy * r, rr * r, 0, Math.PI * 2);
    ctx.fill();
  }
  // a fumacinha subindo
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const f = (((t * 0.4 + i / 3) % 1) + 1) % 1;
    ctx.globalAlpha = 1 - f;
    ctx.beginPath();
    const bx = x - r * 0.4 + i * r * 0.4;
    const by = y - r * 1.1 - f * r * 1.2;
    ctx.moveTo(bx, by + r * 0.3);
    ctx.bezierCurveTo(bx - 5, by + r * 0.15, bx + 5, by, bx, by - r * 0.2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** Chapéu de tropeiro: feltro de aba larga e copa baixa. */
function chapeuTropeiro(c: Ctx) {
  c.save();
  c.translate(-6, -22);
  c.rotate(-0.1);
  c.fillStyle = "#6a4a2a";
  c.strokeStyle = "#3a2410";
  c.lineWidth = 1;
  c.beginPath();
  c.ellipse(0, 2, 17, 3.6, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.beginPath();
  c.moveTo(-8, 2);
  c.quadraticCurveTo(-8, -10, 0, -10);
  c.quadraticCurveTo(8, -10, 8, 2);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = "#c8a46a";
  c.fillRect(-8, -2, 16, 2.4);
  c.restore();
}

export const MG: Tema = {
  id: "mg",
  nome: "Minas Gerais",
  descricao: "Mar de morros, a Maria-Fumaça no viaduto de pedra, a Pampulha e colunas de pedra-sabão.",
  grupo: "estados",
  amostra: "linear-gradient(135deg, #7fa2bc 50%, #9aa892 50%)",
  onda: "triangle",
  somBase: 294,
  capitel: "jonico",
  paleta: {
    ceu: [["#e8a8a0", "#fde2c8"], ["#68a8dc", "#dcf0fa"], ["#6a5a98", "#f0a878"], ["#0a1434", "#26386a"]],
    longe: MORROS[0],
    perto: MORROS[3],
    chao: "#a8784a",
    chaoLinha: "#6a4a2a",
    coluna: { corpo: "#8a9a8a", sombra: "#6a7a6c", luz: "#aebcaa", contorno: "#2e3a30" },
    maleta: { corpo: "#a8743a", escuro: "#5a3a14", fivela: "#f2d48a", alca: "#5a3a14" },
    asa: { cor: "#ffffff", contorno: "#5a6a5c" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: ["#f2d48a", "#aebcaa", "#ffffff"],
    recorde: {
      cor: "#5aa86a", traco: [8, 3, 3, 3, 3, 3], largura: 3.5,
      aviso: { texto: "UAI, NOVO RECORDE!", fonte: "800 26px Georgia, serif", corTexto: "#ffffff", corContorno: "#1e2a20", corFundo: "rgba(60,90,64,0.9)", anima: "treme" },
    },
    hud: "#1a2418",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f) {
    // um queijo canastra gigante descendo as serras aos pulos, rolando
    const x = atravessa(w, f, 120);
    const pulo = Math.abs(Math.sin(f * Math.PI * 5)) * 70;
    const y = h - 100 - pulo;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(x / 46);
    ctx.fillStyle = "#e8c47a";
    ctx.strokeStyle = "#a8782a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#f6dc9a";
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(168,120,42,0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-36, 0);
    ctx.lineTo(36, 0);
    ctx.moveTo(0, -36);
    ctx.lineTo(0, 36);
    ctx.stroke();
    ctx.restore();
  },
  decor(ctx, w, h, off, tod, t, tema, surpresa) {
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.3, h * 0.15, 20);
    else paoDeQueijo(ctx, w * 0.3, h * 0.17, 30, t);
    // o mar de morros: quatro camadas, cada uma mais perto e mais escura
    MORROS.forEach((cores, i) => {
      const alt = [190, 150, 110, 70][i];
      colinas(ctx, w, h - 40, off * (0.03 + i * 0.05), ciclo(cores, tod), alt, 24 + i * 4, 0.007 + i * 0.002, i * 2 + 1);
      if (i === 1) {
        // a Pampulha na beira da lagoa, entre os morros
        repetir(w, off * 0.1, 1100, (x) => {
          ctx.fillStyle = ciclo(LAGOA, tod);
          ctx.fillRect(x + 140, h - 150, 340, 10);
          pampulha(ctx, x + 200, h - 150, ciclo(IGREJA, tod), ciclo(AZULEJO, tod));
        });
      }
      if (i === 2) {
        // o viaduto de pedra corre por toda a serra, e a Maria-Fumaça atravessa a tela de um lado a outro
        const pedra = ciclo(PEDRA, tod);
        repetir(w, off * 0.2, 600, (x) => viaduto(ctx, x, h - 60, 600, 90, pedra));
        const volta = w + 420;
        const tx = ((((t * 150 - off * 0.2) % volta) + volta) % volta) - 200;
        mariaFumaca(ctx, tx, h - 150, ciclo(TREM, tod), t);
      }
    });
    // a surpresa: o queijo rola pelos morros, atrás das cercas e dos pés de café
    surpresa?.();
    // cercas de madeira e pés de café no morro da frente
    const verde = ciclo(["#2f5a34", "#2a6034", "#2e3e32", "#08140c"], tod);
    repetir(w, off * 0.3, 34, (x, k) => {
      ctx.fillStyle = verde;
      ctx.beginPath();
      ctx.ellipse(x + 10, h - 56 - variar(k, 7, 3) * 3, 11, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#c8322f";
      if (variar(k, 5, 3) === 0) ctx.fillRect(x + 6, h - 60, 2.5, 2.5);
    });
  },
  chao(ctx, w, h, y, off, tema, tod) {
    const p = tema.paleta;
    // estrada de terra vermelha
    ctx.fillStyle = ciclo([p.chao, p.chao, "#946a44", "#2e2218"], tod);
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = p.chaoLinha;
    ctx.fillRect(0, y, w, 3);
    ctx.fillStyle = "rgba(60,30,10,0.3)";
    for (let x = -(off % 47); x < w; x += 47) {
      ctx.fillRect(x + 6, y + 12, 18, 2);
      ctx.fillRect(x + 28, y + 26, 12, 2);
    }
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // pedra-sabão esverdeada, com veios e caneluras rasas
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0, c.sombra);
    g.addColorStop(0.4, c.luz);
    g.addColorStop(1, c.sombra);
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, w, len);
    ctx.fillStyle = "rgba(30,40,30,0.14)";
    for (let i = 1; i < 5; i++) ctx.fillRect(x0 + (i * w) / 5 - 1.5, 30, 3, len);
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = 50 + variante * 40; y < len; y += 120) {
      ctx.moveTo(x0 + 4, y);
      ctx.bezierCurveTo(x0 + 30, y - 20, x0 + 44, y + 30, x0 + w - 4, y + 6);
    }
    ctx.stroke();
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      ctx.fillStyle = c.corpo;
      ctx.beginPath();
      ctx.moveTo(x0, 14);
      ctx.lineTo(x0 + w * 0.25, 5);
      ctx.lineTo(x0 + w * 0.45, 13);
      ctx.lineTo(x0 + w * 0.72, 2);
      ctx.lineTo(x0 + w, 10);
      ctx.lineTo(x0 + w, 16);
      ctx.lineTo(x0, 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    // capitel barroco: ábaco, volutas grandes e uma concha no meio
    ctx.fillStyle = c.luz;
    ctx.fillRect(x0 - 6, 0, w + 12, 7);
    ctx.strokeRect(x0 - 6, 0, w + 12, 7);
    ctx.fillStyle = c.corpo;
    ctx.fillRect(x0 - 2, 7, w + 4, 18);
    ctx.strokeRect(x0 - 2, 7, w + 4, 18);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(s * (w / 2 - 6), 16, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s * (w / 2 - 6), 16, 4.5, 0, Math.PI * 1.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s * (w / 2 - 6), 16, 1.6, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * (0.15 + i * 0.175);
      ctx.moveTo(0, 22);
      ctx.lineTo(Math.cos(a) * -11, 22 - Math.sin(a) * 11);
    }
    ctx.stroke();
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, chapeuTropeiro);
  },
};
