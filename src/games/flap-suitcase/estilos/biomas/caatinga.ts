// Caatinga: o sertão no sol forte, com os mandacarus e o xique-xique, o juazeiro sempre verde, o chão rachado da seca
// e a asa-branca voando; as colunas são mandacarus, e na maleta vai o chapéu de couro do vaqueiro.
import { ciclo, colinas, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { atravessa, ave, lua, noiteDe, repetir, sol } from "../kit";

// cores por hora do dia (amanhecer, dia, entardecer, noite)
const SERRA = ["#c8a090", "#c8b0a0", "#a08090", "#1e1a2a"];
const GALHOS = ["#8a7a6a", "#948470", "#786a6a", "#1a1614"];
const CACTO = ["#4a7a5a", "#4a8a5a", "#466058", "#0c1610"];
const JUAZEIRO = ["#3a6a2a", "#36702a", "#36482e", "#0a1208"];
const TERRA = ["#d8a878", "#e0b07a", "#c09078", "#2e2420"];

/**
 * Mandacaru em candelabro: o tronco e até dois braços de cada lado, que saem em cotovelo e sobem. No mesmo lado, o braço
 * de baixo sai mais afastado e o de cima mais perto do tronco, para um nunca encostar no outro. Costelas, tufos de
 * espinhos e, às vezes, a flor branca no alto.
 */
function mandacaru(ctx: Ctx, x: number, base: number, alt: number, cor: string, k: number) {
  const larg = alt * 0.1;
  const lado0 = variar(k, 5, 2) ? 1 : -1;
  const bracos: { lado: number; y0: number; dist: number; topo: number; larg: number }[] = [];
  const n = 1 + variar(k, 3, 4); // de 1 a 4 braços
  for (let i = 0; i < n; i++) {
    const lado = i % 2 ? -lado0 : lado0;
    const deste = Math.floor(i / 2); // 0: o de fora (mais baixo), 1: o de dentro (mais alto)
    const h0 = (deste ? 0.56 : 0.3) + variar(k + i, 7, 3) * 0.05;
    bracos.push({
      lado,
      y0: base - alt * h0,
      dist: alt * (deste ? 0.17 : 0.31) + variar(k + i, 11, 3) * 2,
      topo: base - alt * Math.min(deste ? 0.97 : 0.88, h0 + 0.3 + variar(k + i, 13, 3) * 0.05),
      larg: larg * (deste ? 0.72 : 0.82),
    });
  }
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // o desenho de cada parte: o corpo, as costelas e os espinhos seguem o mesmo caminho
  const caminho = (b: (typeof bracos)[number] | null, desloc: number) => {
    ctx.beginPath();
    if (!b) {
      ctx.moveTo(x + desloc, base);
      ctx.lineTo(x + desloc, base - alt + larg / 2);
      return;
    }
    const r = Math.min(b.dist * 0.55, 14);
    const bx = x + b.lado * b.dist;
    ctx.moveTo(x, b.y0 + desloc);
    ctx.lineTo(bx - b.lado * r, b.y0 + desloc);
    ctx.quadraticCurveTo(bx + b.lado * desloc, b.y0 + desloc, bx + b.lado * desloc, b.y0 - r);
    ctx.lineTo(bx + b.lado * desloc, b.topo + b.larg / 2);
  };
  const partes: [(typeof bracos)[number] | null, number][] = [...bracos.map((b) => [b, b.larg] as [(typeof bracos)[number], number]), [null, larg]];
  ctx.strokeStyle = cor;
  for (const [b, l] of partes) {
    ctx.lineWidth = l;
    caminho(b, 0);
    ctx.stroke();
  }
  // as costelas, um pouco mais escuras, e a luz do lado do sol
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.lineWidth = 1;
  for (const [b, l] of partes)
    for (const d of [-0.22, 0.22]) {
      caminho(b, d * l);
      ctx.stroke();
    }
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = Math.max(1, larg * 0.16);
  for (const [b, l] of partes) {
    caminho(b, -0.36 * l);
    ctx.stroke();
  }
  // os tufos de espinhos ao longo das costelas
  ctx.fillStyle = "rgba(255,244,214,0.7)";
  for (let y = base - 6; y > base - alt + larg; y -= 7) {
    const v = variar(Math.round(y) + k, 7, 3);
    ctx.fillRect(x - larg * 0.22 - 0.6 + v * 0.3, y, 1.2, 1.2);
    ctx.fillRect(x + larg * 0.22 - 0.6, y - 3, 1.2, 1.2);
  }
  for (const b of bracos) {
    const bx = x + b.lado * b.dist;
    for (let y = b.y0 - 8; y > b.topo + 4; y -= 7) ctx.fillRect(bx - 0.6 + ((Math.round(y) + k) % 2) * b.larg * 0.22, y, 1.2, 1.2);
  }
  // a flor branca do mandacaru, que abre à noite, num ou noutro
  if (variar(k, 17, 4) === 0) {
    ctx.fillStyle = "#f6f0e4";
    ctx.beginPath();
    ctx.ellipse(x, base - alt - 1, larg * 0.5, larg * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e8b8c8";
    ctx.beginPath();
    ctx.arc(x, base - alt - 1, larg * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Chapéu de couro de vaqueiro, de aba em meia-lua, com as estrelinhas pespontadas. */
function chapeuCouro(c: Ctx) {
  c.save();
  c.translate(-6, -21);
  c.rotate(-0.12);
  c.fillStyle = "#8a5a2a";
  c.strokeStyle = "#3a2410";
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(-17, 2);
  c.quadraticCurveTo(-14, -4, -8, -2);
  c.quadraticCurveTo(-8, -11, 0, -11);
  c.quadraticCurveTo(8, -11, 8, -2);
  c.quadraticCurveTo(14, -4, 17, 2);
  c.quadraticCurveTo(0, 6, -17, 2);
  c.fill();
  c.stroke();
  c.fillStyle = "#e8c47a";
  for (const x of [-4, 0, 4]) {
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 ? 0.7 : 1.8;
      const a = (i * Math.PI) / 4;
      c.lineTo(x + Math.cos(a) * r, -6 + Math.sin(a) * r);
    }
    c.fill();
  }
  c.restore();
}

export const CAATINGA: Tema = {
  id: "caatinga",
  nome: "Caatinga",
  descricao: "O sertão no sol forte: mandacarus, o juazeiro verde, o chão rachado da seca e a asa-branca voando.",
  grupo: "biomas",
  amostra: "linear-gradient(135deg, #4a8a5a 50%, #e0b07a 50%)",
  onda: "triangle",
  somBase: 349,
  climaFixo: "limpo",
  paleta: {
    // céu claro e quente, quase branco no horizonte
    ceu: [["#f0a07a", "#ffe2b8"], ["#58a8e0", "#f2f0e0"], ["#c8604a", "#ffc070"], ["#120e2a", "#3a2a4a"]],
    longe: SERRA,
    perto: GALHOS,
    chao: "#e0b07a",
    chaoLinha: "#a8784a",
    coluna: { corpo: "#4a8a5a", sombra: "#346a44", luz: "#6aaa78", contorno: "#14301e" },
    maleta: { corpo: "#a8743a", escuro: "#5a3a14", fivela: "#e8c47a", alca: "#5a3a14" },
    asa: { cor: "#ffffff", contorno: "#8a5a2a" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: ["#e0b07a", "#ffffff", "#4a8a5a"],
    recorde: {
      cor: "#e8a02a", traco: [2, 6], largura: 4,
      aviso: { texto: "OXENTE! NOVO RECORDE!", fonte: "800 26px system-ui, sans-serif", corTexto: "#ffffff", corContorno: "#3a1a0a", corFundo: "rgba(168,116,58,0.92)", anima: "treme" },
    },
    hud: "#2a1a0a",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // a chuva chega no sertão: a nuvem passa molhando a terra, e o chão floresce atrás dela
    const x = atravessa(w, f, 200);
    const y = h * 0.16;
    ctx.strokeStyle = "rgba(200,220,255,0.6)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < 30; i++) {
      const rx = x - 120 + ((i * 41) % 240);
      const ry = y + 30 + ((t * 500 + i * 61) % (h - y - 80));
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 3, ry + 12);
    }
    ctx.stroke();
    ctx.fillStyle = "#7a7a88";
    for (const [dx, dy, r] of [[-90, 10, 34], [-40, -8, 46], [20, -2, 50], [80, 12, 36]]) {
      ctx.beginPath();
      ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // atrás da nuvem, o verde e as flores brotando
    for (let px = 10; px < x - 100; px += 26) {
      const cresce = Math.min(1, (x - 100 - px) / 120);
      const k = Math.round(px / 26);
      ctx.strokeStyle = "#4a9a3a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, h - 44);
      ctx.lineTo(px, h - 44 - cresce * 16);
      ctx.stroke();
      ctx.fillStyle = ["#ffd21a", "#ff7ab0", "#ffffff"][k % 3];
      ctx.beginPath();
      ctx.arc(px, h - 46 - cresce * 16, cresce * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  decor(ctx, w, h, off, tod, t) {
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.3, h * 0.13, 22);
    else sol(ctx, w * 0.3, h * 0.14, 34, "#fffbe8", "rgba(255,240,200,0.6)");
    // asas-brancas atravessando
    ctx.fillStyle = ciclo(["#f4eee6", "#ffffff", "#f0dcd4", "#8a8aa0"], tod);
    for (let i = 0; i < 4; i++) {
      const ax = ((((i * 270 - t * 46 - off * 0.04) % (w + 200)) + w + 200) % (w + 200)) - 100;
      ave(ctx, w - ax, h * (0.2 + (i % 2) * 0.06) + Math.sin(t * 2 + i) * 6, 1, Math.sin(t * 9 + i * 2));
    }
    colinas(ctx, w, h - 40, off * 0.04, ciclo(SERRA, tod), 140, 34, 0.006, 3);
    colinas(ctx, w, h - 40, off * 0.1, ciclo(["#c8a888", "#d0b08a", "#b0907e", "#221c1e"], tod), 80, 16, 0.009, 6);
    // a caatinga seca: galhos cinzentos sem folha, juazeiros verdes e mandacarus
    const galho = ciclo(GALHOS, tod);
    const cacto = ciclo(CACTO, tod);
    const juazeiro = ciclo(JUAZEIRO, tod);
    repetir(w, off * 0.2, 60, (x, k) => {
      const bx = x + variar(k, 31, 30);
      ctx.strokeStyle = galho;
      ctx.lineWidth = 1.6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(bx, h - 90);
      ctx.lineTo(bx, h - 112);
      for (const [a, L] of [[-0.9, 14], [0.7, 16], [-0.3, 18], [0.3, 13], [1.2, 10]]) {
        ctx.moveTo(bx, h - 104);
        ctx.lineTo(bx + Math.sin(a) * L, h - 104 - Math.cos(a) * L);
      }
      ctx.stroke();
    });
    colinas(ctx, w, h - 40, off * 0.24, ciclo(TERRA, tod), 50, 6, 0.012, 2);
    repetir(w, off * 0.3, 380, (x, k) => {
      const jx = x + variar(k, 37, 120);
      ctx.fillStyle = "#4a3a2a";
      ctx.fillRect(jx - 3, h - 80, 6, 36);
      ctx.fillStyle = juazeiro;
      for (const [dx, dy, r] of [[-16, -88, 16], [0, -98, 20], [16, -88, 16], [-6, -80, 12], [8, -80, 12]]) {
        ctx.beginPath();
        ctx.arc(jx + dx, h + dy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    // espaçados o bastante para os braços de um não encostarem nos do vizinho (cada um alcança uns 60 px de cada lado)
    repetir(w, off * 0.36, 200, (x, k) => {
      if (variar(k, 5, 4) === 0) return;
      mandacaru(ctx, x + variar(k, 29, 40), h - 44, 90 + variar(k, 13, 4) * 22, cacto, k);
    });
    // o xique-xique rasteiro
    repetir(w, off * 0.42, 70, (x, k) => {
      ctx.fillStyle = cacto;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.roundRect(x + i * 6 + variar(k, 7, 10), h - 54 - i * 2, 5, 14 + i * 2, 2.5);
        ctx.fill();
      }
    });
  },
  chao(ctx, w, h, y, off, tema, tod) {
    ctx.fillStyle = ciclo(TERRA, tod);
    ctx.fillRect(0, y, w, h - y);
    // o chão rachado da seca
    ctx.strokeStyle = "rgba(110,60,30,0.6)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let x = -(off % 48) - 48; x < w + 48; x += 48) {
      const k = Math.round((x + off) / 48);
      const j = variar(k, 7, 9) - 4;
      ctx.moveTo(x, y + 4);
      ctx.lineTo(x + 12 + j, y + 16);
      ctx.lineTo(x + 6, y + 40);
      ctx.moveTo(x + 12 + j, y + 16);
      ctx.lineTo(x + 36, y + 20 + j);
      ctx.lineTo(x + 48, y + 6);
      ctx.moveTo(x + 36, y + 20 + j);
      ctx.lineTo(x + 40, y + 40);
    }
    ctx.stroke();
    ctx.fillStyle = tema.paleta.chaoLinha;
    ctx.fillRect(0, y, w, 2);
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // mandacaru: costelas verdes no comprimento, com os tufos de espinhos
    const costelas = 5;
    for (let i = 0; i < costelas; i++) {
      const cx = x0 + (i * w) / costelas;
      const g = ctx.createLinearGradient(cx, 0, cx + w / costelas, 0);
      g.addColorStop(0, c.sombra);
      g.addColorStop(0.5, i === 1 ? c.luz : c.corpo);
      g.addColorStop(1, c.sombra);
      ctx.fillStyle = g;
      ctx.fillRect(cx, 0, w / costelas, len);
    }
    ctx.fillStyle = "#f2ead8";
    ctx.strokeStyle = "#f2ead8";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let i = 1; i < costelas; i++) {
      const cx = x0 + (i * w) / costelas;
      for (let y = 10 + ((i + variante) % 2) * 9; y < len; y += 18) {
        ctx.moveTo(cx, y);
        ctx.lineTo(cx - 4, y - 3);
        ctx.moveTo(cx, y);
        ctx.lineTo(cx + 4, y - 3);
        ctx.moveTo(cx, y);
        ctx.lineTo(cx, y - 5);
      }
    }
    ctx.stroke();
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      // cortado, com a polpa clara por dentro
      ctx.fillStyle = "#c8dca0";
      ctx.beginPath();
      ctx.moveTo(x0, 12);
      ctx.lineTo(x0 + w * 0.3, 2);
      ctx.lineTo(x0 + w * 0.55, 9);
      ctx.lineTo(x0 + w * 0.8, 1);
      ctx.lineTo(x0 + w, 8);
      ctx.lineTo(x0 + w, 14);
      ctx.lineTo(x0, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    // a ponta arredondada, com a flor branca e o fruto vermelho
    ctx.fillStyle = c.corpo;
    ctx.beginPath();
    ctx.roundRect(x0, 0, w, 16, [12, 12, 0, 0]);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(-12 + Math.cos(a) * 4, 8 + Math.sin(a) * 4, 3.4, 1.8, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#ffe07a";
    ctx.beginPath();
    ctx.arc(-12, 8, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d8304a";
    ctx.beginPath();
    ctx.ellipse(14, 8, 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, chapeuCouro);
  },
};
