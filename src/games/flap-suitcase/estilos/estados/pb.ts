// Paraíba: a Ponta do Seixas, o ponto mais oriental das Américas, onde o sol nasce primeiro, com o Farol do Cabo Branco
// em forma de folha de sisal, as falésias e o mar; na maleta, o pandeiro de Jackson do Pandeiro.
import { ciclo, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { letreiro, lua, mar, noiteDe, palmeira, repetir, sol, surge } from "../kit";

// cores por hora do dia (amanhecer, dia, entardecer, noite); aqui o dia é sempre um amanhecer comprido
const FALESIA = ["#c87a5a", "#d08860", "#a8625a", "#2a1a1e"];
const FALESIA_TOPO = ["#5a8a4a", "#5a9048", "#4a6048", "#0e1a10"];
const MAR = ["#4a7ab0", "#3a8ac0", "#4a5a96", "#0a1c3a"];
const FAROL = ["#fbf0e8", "#ffffff", "#f2e0e0", "#6a6a7e"];
const COQUEIRO = ["#2f4a3a", "#2a5038", "#2e3a36", "#081410"];

/** Farol do Cabo Branco: a torre triangular de concreto, com as aberturas em ponta de folha. */
function farolCaboBranco(ctx: Ctx, x: number, base: number, cor: string, t: number, acesa: number) {
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.moveTo(x - 20, base);
  ctx.lineTo(x - 8, base - 150);
  ctx.lineTo(x + 8, base - 150);
  ctx.lineTo(x + 20, base);
  ctx.fill();
  // as três pontas de folha de sisal, abrindo no alto
  for (const l of [-1, 0, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + l * 4, base - 140);
    ctx.quadraticCurveTo(x + l * 18, base - 160, x + l * 14, base - 178);
    ctx.quadraticCurveTo(x + l * 8, base - 160, x + l * 2, base - 140);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  for (let y = base - 130; y < base - 10; y += 22) {
    ctx.beginPath();
    ctx.moveTo(x - 4, y);
    ctx.lineTo(x, y - 14);
    ctx.lineTo(x + 4, y);
    ctx.fill();
  }
  ctx.fillStyle = acesa > 0.3 ? "#fff2a0" : "#9ab8cc";
  ctx.fillRect(x - 5, base - 150, 10, 8);
  if (acesa > 0.3) {
    const a = t * 1.2;
    ctx.fillStyle = `rgba(255,242,160,${0.22 * acesa})`;
    ctx.beginPath();
    ctx.moveTo(x, base - 146);
    ctx.lineTo(x + Math.cos(a) * 280, base - 146 + Math.sin(a) * 30 - 18);
    ctx.lineTo(x + Math.cos(a) * 280, base - 146 + Math.sin(a) * 30 + 18);
    ctx.fill();
  }
}

/** Pandeiro: o aro de madeira, a pele e as platinelas. */
function pandeiro(c: Ctx, t: number) {
  c.save();
  c.translate(14, -24);
  c.rotate(-0.3 + Math.sin(t * 10) * 0.08);
  c.fillStyle = "#f6ead2";
  c.strokeStyle = "#8a5a2a";
  c.lineWidth = 2.4;
  c.beginPath();
  c.arc(0, 0, 9, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.fillStyle = "#e8c43a";
  c.strokeStyle = "#8a6a1a";
  c.lineWidth = 0.8;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    c.beginPath();
    c.ellipse(Math.cos(a) * 9, Math.sin(a) * 9, 2.4, 1.4, a + Math.PI / 2, 0, Math.PI * 2);
    c.fill();
    c.stroke();
  }
  c.restore();
}

export const PB: Tema = {
  id: "pb",
  nome: "Paraíba",
  descricao: "A Ponta do Seixas, onde o sol nasce primeiro, o Farol do Cabo Branco em folha de sisal e as falésias.",
  grupo: "estados",
  amostra: "linear-gradient(135deg, #f6a05a 50%, #3a8ac0 50%)",
  onda: "triangle",
  somBase: 587,
  paleta: {
    // amanhecer nas três fases de dia: o sol daqui é o primeiro a nascer
    ceu: [["#e8806a", "#ffd8a0"], ["#f0906a", "#ffe2b0"], ["#c8607a", "#ffc890"], ["#100c34", "#3a2a5a"]],
    longe: FALESIA,
    perto: COQUEIRO,
    chao: "#f2dcb0",
    chaoLinha: "#d0b480",
    coluna: { corpo: "#fbf6f0", sombra: "#d8ccc4", luz: "#ffffff", contorno: "#8a4a3a" },
    maleta: { corpo: "#d8402a", escuro: "#6a1a0e", fivela: "#ffe08a", alca: "#6a1a0e" },
    asa: { cor: "#fff6e8", contorno: "#d8402a" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: ["#ffd08a", "#ffffff", "#f0906a"],
    recorde: {
      cor: "#ff9a3a", traco: [10, 2, 2, 2], largura: 3.5,
      aviso: { texto: "PRIMEIRO RECORDE DO DIA!", fonte: "800 24px system-ui, sans-serif", corTexto: "#ffffff", corContorno: "#6a1a0e", corFundo: "rgba(216,64,42,0.9)", anima: "pulsa" },
    },
    hud: "#3a120a",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // na Ponta do Seixas o galo canta primeiro: o sol nasce aqui antes de todo o Brasil
    const a = surge(f);
    const x = w * 0.22;
    const base = h - 160;
    const canta = Math.max(0, Math.sin(t * 4));
    ctx.globalAlpha = a;
    ctx.fillStyle = "#3a1a0e";
    ctx.beginPath();
    ctx.ellipse(x, base - 30, 22, 18, 0, 0, Math.PI * 2);
    ctx.moveTo(x + 30, base - 54);
    ctx.ellipse(x + 20, base - 54, 10, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 18, base - 34);
    ctx.quadraticCurveTo(x - 50, base - 70, x - 38, base - 20);
    ctx.fill();
    ctx.fillStyle = "#d8303a";
    ctx.beginPath();
    ctx.moveTo(x + 14, base - 64);
    ctx.lineTo(x + 18, base - 74);
    ctx.lineTo(x + 22, base - 64);
    ctx.lineTo(x + 26, base - 72);
    ctx.lineTo(x + 28, base - 62);
    ctx.fill();
    ctx.fillStyle = "#ffb23a";
    ctx.beginPath();
    ctx.moveTo(x + 28, base - 56);
    ctx.lineTo(x + 40, base - 54 + canta * 2);
    ctx.lineTo(x + 28, base - 50);
    ctx.fill();
    ctx.strokeStyle = "#3a1a0e";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 4, base - 14);
    ctx.lineTo(x - 6, base);
    ctx.moveTo(x + 6, base - 14);
    ctx.lineTo(x + 8, base);
    ctx.stroke();
    // as ondas do canto
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    for (let i = 1; i <= 3; i++) {
      ctx.globalAlpha = a * canta * (1 - i * 0.25);
      ctx.beginPath();
      ctx.arc(x + 40, base - 54, i * 12, -0.6, 0.6);
      ctx.stroke();
    }
  },
  surpresaFrente(ctx, w, h, f) {
    ctx.globalAlpha = surge(f);
    letreiro(ctx, "BOM DIA, BRASIL!", w / 2, h * 0.36, 38, "#ffffff", "#6a1a0e");
  },
  decor(ctx, w, h, off, tod, t, tema, surpresa) {
    const noite = noiteDe(tod);
    const yMar = h - 160;
    // o sol nascendo do mar, enorme
    if (noite > 0.5) lua(ctx, w * 0.7, h * 0.18, 20);
    else {
      sol(ctx, w * 0.7, yMar - 10 - Math.sin(t * 0.05) * 10, 60, "#ffcf6a", "rgba(255,190,110,0.5)");
      ctx.fillStyle = "rgba(255,200,120,0.5)";
      for (let i = 0; i < 6; i++) ctx.fillRect(w * 0.7 - 60 + i * 4, yMar + 8 + i * 12, 120 - i * 8, 3);
    }
    mar(ctx, w, yMar, 120, off * 0.1, ciclo(MAR, tod), "rgba(255,220,180,0.6)", t);
    // as falésias e o farol na ponta
    const falesia = ciclo(FALESIA, tod);
    const topo = ciclo(FALESIA_TOPO, tod);
    repetir(w, off * 0.18, 1200, (x, k) => {
      // a borda de cima, recortada, e o contorno da falésia (o lado direito desce inclinado até o pé)
      const borda: [number, number][] = [[x, yMar + 10]];
      for (let i = 1; i <= 10; i++) borda.push([x + i * 46, yMar + 8 + (variar(k + i, 7, 3) - 1) * 5]);
      const contorno = () => {
        ctx.beginPath();
        ctx.moveTo(x, h - 40);
        for (const [bx, by] of borda) ctx.lineTo(bx, by);
        ctx.lineTo(x + 500, h - 40);
        ctx.closePath();
      };
      ctx.fillStyle = falesia;
      contorno();
      ctx.fill();
      // os estratos ficam dentro da falésia: antes passavam do lado inclinado
      ctx.save();
      contorno();
      ctx.clip();
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      for (let i = 0; i < 4; i++) ctx.fillRect(x, yMar + 30 + i * 22, 500, 3);
      ctx.restore();
      // a vegetação do topo acompanha a borda recortada, sem passar da ponta
      ctx.strokeStyle = topo;
      ctx.lineWidth = 8;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(borda[0]![0] + 4, borda[0]![1] - 2);
      for (const [bx, by] of borda.slice(1)) ctx.lineTo(bx - 4, by - 2);
      ctx.stroke();
      farolCaboBranco(ctx, x + 360, yMar + 6, ciclo(FAROL, tod), t, noite);
    });
    // a surpresa: o galo canta na falésia, atrás dos coqueiros
    surpresa?.();
    const coqueiro = ciclo(COQUEIRO, tod);
    repetir(w, off * 0.36, 160, (x, k) => {
      if (variar(k, 5, 3) === 0) return;
      palmeira(ctx, x + variar(k, 29, 60), h - 40, 130 + variar(k, 13, 3) * 16, coqueiro, t, 0.24);
    });
  },
  chao(ctx, w, h, y, off, tema, tod) {
    const p = tema.paleta;
    ctx.fillStyle = ciclo([p.chao, p.chao, "#e2c4a0", "#4e4640"], tod);
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = p.chaoLinha;
    ctx.fillRect(0, y, w, 2);
    for (let x = -(off % 53); x < w; x += 53) {
      ctx.fillStyle = "#a8846a";
      ctx.beginPath();
      ctx.ellipse(x + 14, y + 16, 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // concreto branco do farol, com as aberturas em ponta de folha (desviradas na coluna de cima)
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0, c.luz);
    g.addColorStop(0.6, c.corpo);
    g.addColorStop(1, c.sombra);
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, w, len);
    const deCima = ctx.getTransform().d < 0;
    ctx.fillStyle = "#e8705a";
    for (let y = 40 + variante * 20; y < len - 30; y += 70) {
      ctx.save();
      ctx.translate(0, y);
      if (deCima) ctx.scale(1, -1);
      ctx.beginPath();
      ctx.moveTo(-12, 16);
      ctx.quadraticCurveTo(-10, -4, 0, -18);
      ctx.quadraticCurveTo(10, -4, 12, 16);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.moveTo(-4, 12);
      ctx.quadraticCurveTo(-3, 0, 0, -10);
      ctx.lineTo(0, 12);
      ctx.fill();
      ctx.fillStyle = "#e8705a";
      ctx.restore();
    }
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      ctx.fillStyle = c.corpo;
      ctx.beginPath();
      ctx.moveTo(x0, 12);
      ctx.lineTo(x0 + w * 0.3, 2);
      ctx.lineTo(x0 + w * 0.55, 9);
      ctx.lineTo(x0 + w * 0.8, 0);
      ctx.lineTo(x0 + w, 8);
      ctx.lineTo(x0 + w, 14);
      ctx.lineTo(x0, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    // a lanterna do farol, numa faixa de vidro
    ctx.fillStyle = "#3a4a5a";
    ctx.fillRect(x0 - 4, 0, w + 8, 6);
    ctx.fillStyle = "#ffe8a0";
    ctx.fillRect(x0, 6, w, 9);
    ctx.strokeRect(x0, 6, w, 9);
    ctx.fillStyle = "#3a4a5a";
    for (let x = x0 + 9; x < x0 + w; x += 14) ctx.fillRect(x, 6, 2, 9);
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, (c) => pandeiro(c, t));
  },
};
