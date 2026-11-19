// Mato Grosso: a Chapada dos Guimarães, com os paredões de arenito vermelho, a Cachoeira Véu de Noiva caindo no cânion,
// o cerrado e as araras-vermelhas; as colunas são de arenito vermelho em camadas.
import { ciclo, colinas, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { atravessa, cachoeira, chapada, lua, noiteDe, repetir, sol } from "../kit";

// cores por hora do dia (amanhecer, dia, entardecer, noite)
const PAREDAO = ["#b8563a", "#c45e3a", "#9a4436", "#2e1418"];
const PAREDAO_SOMBRA = ["#8a3e2a", "#94442c", "#74302c", "#1c0c10"];
const MATA = ["#4a6a34", "#466e32", "#3e4834", "#0c140a"];
const CERRADO = ["#a0a05a", "#9aa456", "#807a54", "#181c10"];
const AGUA = ["#c8dce4", "#d8eef6", "#c8bccc", "#4a5a70"];
const ARARA = ["#e8333a", "#ffd21a", "#2a6ae8"];

/** Arara voando: corpo comprido, rabo longo e as asas batendo. */
function arara(ctx: Ctx, x: number, y: number, s: number, bate: number) {
  const asa = bate * 6 * s;
  ctx.fillStyle = ARARA[0];
  ctx.beginPath();
  ctx.ellipse(x, y, 7 * s, 2.6 * s, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 6 * s, y);
  ctx.lineTo(x - 22 * s, y + 4 * s);
  ctx.lineTo(x - 6 * s, y + 2 * s);
  ctx.fill();
  ctx.fillStyle = ARARA[2];
  ctx.beginPath();
  ctx.moveTo(x - 2 * s, y - 1 * s);
  ctx.lineTo(x - 6 * s, y - 10 * s - asa);
  ctx.lineTo(x + 4 * s, y - 1 * s);
  ctx.fill();
  ctx.fillStyle = ARARA[1];
  ctx.fillRect(x - 3 * s, y - 2 * s - asa * 0.4, 4 * s, 2 * s);
  ctx.fillStyle = "#f2e6d4";
  ctx.beginPath();
  ctx.arc(x + 7 * s, y - 1 * s, 1.8 * s, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Onça-pintada andando para a direita (origem no chão, embaixo do meio do corpo): o corpo musculoso com o lombo, a
 * barriga clara e as rosetas (anéis de manchas com o miolo mais escuro), a cabeça larga de focinho claro, as orelhas
 * redondas, as quatro patas em passo cruzado (as do lado de lá mais escuras) e a cauda comprida de ponta anelada.
 */
function onca(ctx: Ctx, x: number, base: number, s: number, t: number) {
  const pelo = "#e2a23e";
  const pelo2 = "#c8862e";
  const claro = "#f6e2b8";
  const mancha = "#2a1a10";
  const passo = t * 4.2;
  const sobe = Math.abs(Math.sin(passo)) * 1.2;
  ctx.save();
  ctx.translate(x, base);
  ctx.scale(s, s);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // uma pata: a coxa e a canela, que dobra quando a pata sai do chão, e a mão redonda
  const pata = (ox: number, oy: number, fase: number, cor: string, traseira: boolean) => {
    const a = Math.sin(passo + fase) * 0.42;
    const ergue = Math.max(0, Math.cos(passo + fase));
    const jx = ox + Math.sin(a) * 11;
    const jy = oy + Math.cos(a) * 11;
    const dobra = (traseira ? -0.5 : 0.35) * ergue;
    const px = jx + Math.sin(a * 0.6 + dobra) * 11;
    const py = Math.min(-1.5, jy + Math.cos(a * 0.6 + dobra) * 11 - ergue * 3);
    ctx.strokeStyle = cor;
    ctx.lineWidth = traseira ? 7 : 6;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(jx, jy);
    ctx.stroke();
    ctx.lineWidth = 4.6;
    ctx.beginPath();
    ctx.moveTo(jx, jy);
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.ellipse(px + 1.5, py + 0.5, 4, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  // as patas do lado de lá, mais escuras, atrás do corpo
  pata(18, -24 + sobe, Math.PI, pelo2, false);
  pata(-20, -26 + sobe, 0, pelo2, true);
  // a cauda: comprida, caída e com a ponta virada para cima, com anéis escuros e a ponta preta
  const bal = Math.sin(t * 2.2) * 4;
  ctx.strokeStyle = pelo;
  ctx.lineWidth = 4.4;
  ctx.beginPath();
  ctx.moveTo(-28, -31 + sobe);
  ctx.bezierCurveTo(-44, -26, -52, -14 + bal * 0.3, -60, -18 + bal);
  ctx.quadraticCurveTo(-66, -22 + bal, -64, -30 + bal);
  ctx.stroke();
  ctx.strokeStyle = mancha;
  ctx.lineWidth = 4.6;
  for (const [ax, ay] of [[-50, -17], [-57, -17], [-62.5, -22]]) {
    ctx.beginPath();
    ctx.moveTo(ax!, ay! + bal * 0.7);
    ctx.lineTo(ax! - 1.2, ay! + bal * 0.7 - 1.4);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(-64, -28 + bal);
  ctx.lineTo(-64, -31 + bal);
  ctx.stroke();
  // o corpo: o lombo, o ombro alto, o peito e a barriga
  const corpo = () => {
    ctx.beginPath();
    ctx.moveTo(-29, -30 + sobe);
    ctx.bezierCurveTo(-27, -40 + sobe, -14, -38 + sobe, -2, -35 + sobe);
    ctx.bezierCurveTo(8, -33 + sobe, 14, -40, 22, -38);
    ctx.bezierCurveTo(28, -37, 31, -32, 30, -26);
    ctx.bezierCurveTo(29, -20, 24, -18, 18, -19);
    ctx.bezierCurveTo(6, -16 + sobe, -10, -16 + sobe, -20, -19 + sobe);
    ctx.bezierCurveTo(-27, -20 + sobe, -31, -24 + sobe, -29, -30 + sobe);
    ctx.closePath();
  };
  ctx.fillStyle = pelo;
  corpo();
  ctx.fill();
  ctx.save();
  corpo();
  ctx.clip();
  // a barriga clara
  ctx.fillStyle = claro;
  ctx.beginPath();
  ctx.ellipse(0, -15 + sobe, 26, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // as rosetas: anéis de 4 ou 5 manchas em volta de um miolo mais escuro
  const rosetas: [number, number][] = [[-22, -30], [-13, -33], [-4, -30], [5, -32], [14, -33], [22, -31], [-17, -24], [-8, -24], [1, -24], [10, -26], [19, -25]];
  for (let r = 0; r < rosetas.length; r++) {
    const [rx, ry] = rosetas[r]!;
    const cy = ry + sobe;
    ctx.fillStyle = pelo2;
    ctx.beginPath();
    ctx.arc(rx, cy, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = mancha;
    const n = 4 + (r % 2);
    for (let m = 0; m < n; m++) {
      const a = (m / n) * Math.PI * 2 + r;
      ctx.beginPath();
      ctx.ellipse(rx + Math.cos(a) * 3, cy + Math.sin(a) * 2.6, 1.3, 0.9, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  // as patas do lado de cá, na frente do corpo, com as pintas pequenas
  pata(20, -24, 0, pelo, false);
  pata(-18, -26 + sobe, Math.PI, pelo, true);
  ctx.fillStyle = mancha;
  for (const [mx, my] of [[22, -14], [19, -9], [-16, -16], [-13, -11]]) {
    ctx.beginPath();
    ctx.arc(mx!, my!, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  // a cabeça larga, baixa, com o focinho claro e o nariz
  const hx = 35;
  const hy = -31 + Math.sin(passo * 2) * 0.6;
  ctx.fillStyle = pelo;
  ctx.beginPath();
  ctx.moveTo(26, -36);
  ctx.quadraticCurveTo(30, -27, 30, -24);
  ctx.lineTo(36, -26);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(hx, hy, 9, 7.5, 0.1, 0, Math.PI * 2);
  ctx.fill();
  // as orelhas redondas, de verso escuro
  for (const [ox, oy] of [[29.5, -38], [35, -39.5]]) {
    ctx.fillStyle = mancha;
    ctx.beginPath();
    ctx.arc(ox!, oy! + hy + 31, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pelo;
    ctx.beginPath();
    ctx.arc(ox! + 0.5, oy! + hy + 31.6, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = claro;
  ctx.beginPath();
  ctx.ellipse(hx + 5.5, hy + 3, 5, 3.6, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8a4a3a";
  ctx.beginPath();
  ctx.moveTo(hx + 8.5, hy - 0.5);
  ctx.lineTo(hx + 11, hy + 0.4);
  ctx.lineTo(hx + 9, hy + 2);
  ctx.fill();
  ctx.strokeStyle = mancha;
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(hx + 9, hy + 2);
  ctx.quadraticCurveTo(hx + 7, hy + 5, hx + 4, hy + 4.4);
  // o bigode
  for (const d of [-1, 0, 1]) {
    ctx.moveTo(hx + 7, hy + 3 + d);
    ctx.lineTo(hx + 14, hy + 2 + d * 2);
  }
  ctx.stroke();
  // o olho âmbar e as pintas da testa
  ctx.fillStyle = "#e8c23a";
  ctx.beginPath();
  ctx.ellipse(hx + 3.2, hy - 2.6, 1.8, 1.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = mancha;
  ctx.fillRect(hx + 3.4, hy - 3.6, 0.8, 2);
  for (const [mx, my] of [[-3, -4], [-1, -6], [-5, -1], [0, -2]]) {
    ctx.beginPath();
    ctx.arc(hx + mx!, hy + my!, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Chapéu de explorador cáqui, com a fita. */
function chapeuExplorador(c: Ctx) {
  c.save();
  c.translate(-7, -21);
  c.rotate(-0.12);
  c.fillStyle = "#c8b07a";
  c.strokeStyle = "#7a643a";
  c.lineWidth = 1;
  c.beginPath();
  c.ellipse(0, 2, 15, 3.4, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.beginPath();
  c.moveTo(-8, 2);
  c.quadraticCurveTo(-8, -9, 0, -9);
  c.quadraticCurveTo(8, -9, 8, 2);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = "#5a3a1a";
  c.fillRect(-8, -2, 16, 2.6);
  c.restore();
}

export const MT: Tema = {
  id: "mt",
  nome: "Mato Grosso",
  descricao: "A Chapada dos Guimarães: paredões vermelhos, a Cachoeira Véu de Noiva no cânion e araras-vermelhas.",
  grupo: "estados",
  amostra: "linear-gradient(135deg, #c45e3a 50%, #2a6ae8 50%)",
  onda: "triangle",
  somBase: 233,
  paleta: {
    ceu: [["#f0a078", "#ffdcb4"], ["#4aa0e4", "#d8eefa"], ["#6a4a8a", "#f4a058"], ["#0a1234", "#26346a"]],
    longe: PAREDAO,
    perto: CERRADO,
    chao: "#b0603a",
    chaoLinha: "#7a3e22",
    coluna: { corpo: "#c8603e", sombra: "#9a4430", luz: "#e07a52", contorno: "#4a1a10" },
    maleta: { corpo: "#3a6a8a", escuro: "#163248", fivela: "#ffd21a", alca: "#163248" },
    asa: { cor: "#ffffff", contorno: "#c8603e" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: ["#e8333a", "#ffd21a", "#2a6ae8"],
    recorde: {
      cor: "#ff6a2a", traco: [7, 3], largura: 3.5,
      aviso: { texto: "NOVO RECORDE!", fonte: "800 28px system-ui, sans-serif", corTexto: "#ffffff", corContorno: "#4a1a10", corFundo: "rgba(196,94,58,0.92)", anima: "treme" },
    },
    hud: "#2a140e",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // a onça-pintada atravessando o cerrado, sem pressa, de cabeça baixa
    onca(ctx, atravessa(w, f, 220), h - 41, 1.45, t);
  },

  decor(ctx, w, h, off, tod, t) {
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.78, h * 0.14, 20);
    else sol(ctx, w * 0.78, h * 0.15, 24, "#fff4d6", "rgba(255,236,180,0.45)");
    // araras atravessando o céu
    if (noite < 0.6) {
      for (let i = 0; i < 3; i++) {
        const ax = ((((i * 290 - t * 50 - off * 0.05) % (w + 200)) + w + 200) % (w + 200)) - 100;
        arara(ctx, w - ax, h * (0.22 + i * 0.05) + Math.sin(t * 2 + i) * 8, 1.1, Math.sin(t * 10 + i * 2));
      }
    }
    colinas(ctx, w, h - 40, off * 0.04, ciclo(["#c8a0a0", "#b8b8c8", "#9a7a9a", "#1a1c34"], tod), 120, 20, 0.006, 3);
    // os paredões e o cânion com a cachoeira
    const paredao = ciclo(PAREDAO, tod);
    const sombra = ciclo(PAREDAO_SOMBRA, tod);
    const mata = ciclo(MATA, tod);
    repetir(w, off * 0.1, 1200, (x, k) => {
      const topo = h - 300;
      // o cânion entre os paredões, com o fundo na sombra, e a Véu de Noiva caindo da borda do segundo
      ctx.fillStyle = sombra;
      ctx.fillRect(x + 404, topo + 24, 250, h - 90 - topo - 24);
      chapada(ctx, x + 10, h - 90, 400, 210, paredao, sombra, mata, k * 7);
      chapada(ctx, x + 650, h - 90, 540, 196, paredao, sombra, mata, k * 7 + 3);
      cachoeira(ctx, x + 654, topo + 16, 16, h - 112, t, ciclo(AGUA, tod), "#ffffff");
    });
    // o cerrado e os buritis da baixada
    colinas(ctx, w, h - 40, off * 0.26, ciclo(CERRADO, tod), 50, 12, 0.01, 2);
    const copa = ciclo(["#4a6a2a", "#466e2a", "#3e4a32", "#0a120a"], tod);
    repetir(w, off * 0.36, 120, (x, k) => {
      if (variar(k, 5, 3) === 0) return;
      const bx = x + variar(k, 29, 50);
      ctx.strokeStyle = "#4a3a2a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(bx, h - 46);
      ctx.quadraticCurveTo(bx - 6, h - 60, bx + 3, h - 72);
      ctx.stroke();
      ctx.fillStyle = copa;
      ctx.beginPath();
      ctx.ellipse(bx + 2, h - 78, 18, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  },
  chao(ctx, w, h, y, off, tema, tod) {
    const p = tema.paleta;
    ctx.fillStyle = ciclo([p.chao, p.chao, "#9a5236", "#2a1410"], tod);
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = p.chaoLinha;
    ctx.fillRect(0, y, w, 3);
    ctx.fillStyle = "rgba(60,20,10,0.3)";
    for (let x = -(off % 43); x < w; x += 43) {
      ctx.beginPath();
      ctx.ellipse(x + 14, y + 14, 6, 3, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 32, y + 26, 4, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // arenito vermelho em camadas de tons diferentes
    for (let y = 0, i = 0; y < len; y += 16, i++) {
      ctx.fillStyle = [c.corpo, c.luz, c.corpo, c.sombra][(i + variante) % 4];
      ctx.fillRect(x0, y, w, 16);
    }
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(x0 + w - 10, 0, 10, len);
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(x0, 0, 6, len);
    ctx.strokeStyle = "rgba(74,26,16,0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = 50 + variante * 23; y < len; y += 110) {
      ctx.moveTo(x0 + 20, y);
      ctx.lineTo(x0 + 26, y + 30);
      ctx.lineTo(x0 + 22, y + 50);
    }
    ctx.stroke();
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      ctx.fillStyle = c.luz;
      ctx.beginPath();
      ctx.moveTo(x0, 14);
      ctx.lineTo(x0 + w * 0.2, 6);
      ctx.lineTo(x0 + w * 0.5, 10);
      ctx.lineTo(x0 + w * 0.8, 0);
      ctx.lineTo(x0 + w, 6);
      ctx.lineTo(x0 + w, 16);
      ctx.lineTo(x0, 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    // o topo da chapada, com a mata rasteira
    ctx.fillStyle = "#4a6a34";
    ctx.beginPath();
    for (let x = x0 - 2; x < x0 + w + 2; x += 12) ctx.ellipse(x + 6, 6, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3a5428";
    ctx.fillRect(x0 - 2, 6, w + 4, 6);
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, chapeuExplorador);
  },
};
