// Onze de Agosto, Dia do Advogado e do Estudante: a data da lei de 11 de agosto de 1827, que criou os cursos jurídicos
// de São Paulo e de Olinda. As Arcadas do Largo São Francisco, os formandos jogando o capelo e as colunas em arcada.
import { ciclo, maletaPadrao, rr, variar, type Ctx, type Tema } from "../../themes";
import { figura, lua, noiteDe, predios, repetir, sol } from "../kit";

const VERMELHO = "#a8222e";
// cores por hora do dia (amanhecer, dia, entardecer, noite)
const FACHADA = ["#e8d8bc", "#f0e2c4", "#dcc4b4", "#4a4656"];
const FACHADA_SOMBRA = ["#c4ae90", "#ccb698", "#b49c94", "#2e2c3c"];
const PREDIOS = ["#9a94a0", "#9aa2ae", "#86788e", "#161a2a"];
const LARGO = ["#b8aa98", "#c0b4a0", "#a8969a", "#2a2830"];
const FORMANDO = ["#14141e", "#141420", "#12121c", "#06060a"];

/** A fachada da Faculdade de Direito: o corpo com as arcadas, a torre e a cruz no frontão. */
function faculdade(ctx: Ctx, x: number, base: number, cor: string, sombra: string, acesas: number) {
  ctx.fillStyle = cor;
  ctx.fillRect(x, base - 90, 340, 90);
  ctx.fillRect(x + 140, base - 150, 60, 60);
  ctx.beginPath();
  ctx.moveTo(x + 134, base - 150);
  ctx.lineTo(x + 170, base - 176);
  ctx.lineTo(x + 206, base - 150);
  ctx.fill();
  ctx.fillRect(x - 6, base - 94, 352, 6);
  ctx.fillStyle = sombra;
  for (let i = 0; i < 9; i++) {
    const ax = x + 12 + i * 36;
    ctx.beginPath();
    ctx.moveTo(ax, base);
    ctx.lineTo(ax, base - 30);
    ctx.arc(ax + 12, base - 30, 12, Math.PI, 0);
    ctx.lineTo(ax + 24, base);
    ctx.fill();
  }
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = acesas > 0.3 ? "#ffe2a0" : sombra;
    ctx.fillRect(x + 18 + i * 36, base - 80, 12, 22);
  }
  ctx.fillStyle = sombra;
  ctx.beginPath();
  ctx.arc(x + 170, base - 122, 12, 0, Math.PI * 2);
  ctx.fill();
}

/** Capelo de formatura (o chapéu quadrado), com a borla. */
function capelo(ctx: Ctx, x: number, y: number, s: number, giro: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(giro);
  ctx.fillStyle = "#141420";
  ctx.beginPath();
  ctx.moveTo(-10 * s, 0);
  ctx.lineTo(0, -4 * s);
  ctx.lineTo(10 * s, 0);
  ctx.lineTo(0, 4 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(-5 * s, 0, 10 * s, 5 * s);
  ctx.strokeStyle = VERMELHO;
  ctx.lineWidth = 1 * s;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(8 * s, 3 * s);
  ctx.lineTo(8 * s, 9 * s);
  ctx.stroke();
  ctx.restore();
}

export const ONZE_DE_AGOSTO: Tema = {
  id: "onze-de-agosto",
  nome: "Onze de Agosto",
  descricao: "11 de agosto, Dia do Advogado: a lei de 1827 que criou os cursos jurídicos, as Arcadas e os formandos jogando o capelo.",
  grupo: "datas-direito",
  janela: { tipo: "fixa", dia: 11, mes: 8 },
  amostra: `linear-gradient(135deg, #141420 50%, ${VERMELHO} 50%)`,
  onda: "triangle",
  somBase: 466,
  paleta: {
    ceu: [["#e8a890", "#fde2c4"], ["#6aa8dc", "#dcecf6"], ["#5a5a98", "#f0a874"], ["#0a1434", "#24386a"]],
    longe: PREDIOS,
    perto: FORMANDO,
    chao: "#b8aa98",
    chaoLinha: "#8a7a68",
    coluna: { corpo: "#e8d8bc", sombra: "#c4ae90", luz: "#f8eedc", contorno: "#4a3622" },
    maleta: { corpo: VERMELHO, escuro: "#5a0e14", fivela: "#e8c43a", alca: "#5a0e14" },
    asa: { cor: "#ffffff", contorno: "#141420" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: [VERMELHO, "#141420", "#e8c43a"],
    recorde: {
      cor: "#d8323e", traco: [16, 2, 2, 2], largura: 3.5,
      aviso: { texto: "NOVO RECORDE, DOUTOR!", fonte: "italic 800 26px Georgia, serif", corTexto: "#ffffff", corContorno: "#2a0a0e", corFundo: "rgba(168,34,46,0.92)", anima: "pulsa" },
    },
    hud: "#1a0e10",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // a revoada de capelos e diplomas lançados para o alto na formatura
    for (let i = 0; i < 18; i++) {
      const s = ((f * 1.6 + (i * 0.29) % 1) % 1.6) / 1.6;
      const x = ((i * 113) % w) + Math.sin(t + i) * 20;
      const y = h - 60 - Math.sin(s * Math.PI) * h * 0.6;
      if (i % 3 === 0) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(t * 2 + i);
        ctx.fillStyle = "#f2ead8";
        ctx.fillRect(-12, -4, 24, 8);
        ctx.fillStyle = VERMELHO;
        ctx.fillRect(-2, -4, 4, 8);
        ctx.restore();
      } else capelo(ctx, x, y, 1.6, t * 4 + i);
    }
  },
  decor(ctx, w, h, off, tod, t) {
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.76, h * 0.14, 20);
    else sol(ctx, w * 0.76, h * 0.15, 24, "#fff4d6", "rgba(255,236,180,0.45)");
    // capelos voando
    for (let i = 0; i < 6; i++) {
      const f = (((t * 0.35 + i / 6) % 1) + 1) % 1;
      const cx = ((i * 173 - off * 0.1) % (w + 100) + w + 100) % (w + 100) - 50;
      const cy = h - 120 - Math.sin(f * Math.PI) * (h * 0.5);
      capelo(ctx, cx, cy, 1.2, f * 8 + i);
    }
    // a cidade em volta do Largo e a faculdade
    predios(ctx, w, h - 110, off * 0.05, ciclo(PREDIOS, tod), "#ffe2a0", noite, 160, 44);
    repetir(w, off * 0.12, 1000, (x) => faculdade(ctx, x + 300, h - 96, ciclo(FACHADA, tod), ciclo(FACHADA_SOMBRA, tod), noite));
    // o Largo, com os formandos de beca jogando o capelo
    ctx.fillStyle = ciclo(LARGO, tod);
    ctx.fillRect(0, h - 96, w, 56);
    const formando = ciclo(FORMANDO, tod);
    repetir(w, off * 0.36, 190, (x, k) => {
      for (let i = 0; i < 2; i++) {
        const px = x + i * 40 + variar(k + i, 13, 40);
        const joga = Math.max(0, Math.sin(t * 2 + k + i * 2));
        figura(ctx, px, h - 44, 1, formando, { bracoE: -0.4 - joga * 2, bracoD: 0.4 + joga * 2.3 });
        // a beca até o joelho
        ctx.fillStyle = formando;
        ctx.beginPath();
        ctx.moveTo(px - 5, h - 70);
        ctx.lineTo(px + 5, h - 70);
        ctx.lineTo(px + 9, h - 52);
        ctx.lineTo(px - 9, h - 52);
        ctx.fill();
        ctx.fillStyle = VERMELHO;
        ctx.fillRect(px - 4, h - 70, 8, 2.4);
      }
    });
  },
  chao(ctx, w, h, y, off, tema, tod) {
    const p = tema.paleta;
    ctx.fillStyle = ciclo([p.chao, p.chao, "#a8969a", "#2a2830"], tod);
    ctx.fillRect(0, y, w, h - y);
    // o mosaico de pedra portuguesa do Largo
    ctx.fillStyle = "rgba(40,30,20,0.35)";
    ctx.beginPath();
    for (let x = -(off % 48); x < w; x += 48) {
      ctx.moveTo(x + 24, y + 6);
      ctx.lineTo(x + 36, y + 18);
      ctx.lineTo(x + 24, y + 30);
      ctx.lineTo(x + 12, y + 18);
      ctx.closePath();
    }
    ctx.fill();
    ctx.fillStyle = p.chaoLinha;
    ctx.fillRect(0, y, w, 3);
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // a parede das Arcadas: arcos empilhados, com o fundo escuro do claustro
    ctx.fillStyle = c.corpo;
    ctx.fillRect(x0, 0, w, len);
    const deCima = ctx.getTransform().d < 0;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, 0, w, len);
    ctx.clip();
    for (let y = 30 + variante * 12; y < len + 60; y += 70) {
      ctx.save();
      ctx.translate(0, y + 25);
      if (deCima) ctx.scale(1, -1);
      ctx.fillStyle = "#3a2e26";
      ctx.beginPath();
      ctx.moveTo(-20, 25);
      ctx.lineTo(-20, -5);
      ctx.arc(0, -5, 20, Math.PI, 0);
      ctx.lineTo(20, 25);
      ctx.fill();
      ctx.strokeStyle = c.sombra;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -5, 22, Math.PI, 0);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = c.sombra;
      ctx.fillRect(x0, y + 52, w, 4);
    }
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(x0 + w - 7, 0, 7, len);
    ctx.restore();
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      ctx.fillStyle = c.luz;
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
    // a cornija com a faixa vermelha
    ctx.fillStyle = c.luz;
    ctx.fillRect(x0 - 6, 0, w + 12, 9);
    ctx.strokeRect(x0 - 6, 0, w + 12, 9);
    ctx.fillStyle = VERMELHO;
    ctx.fillRect(x0 - 3, 9, w + 6, 5);
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, (c) => {
      capelo(c, 6, -24, 1.3, -0.15);
      c.fillStyle = "#f2ead8";
      rr(c, -22, -12, 12, 9, 1.5);
      c.fill();
      c.strokeStyle = VERMELHO;
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(-16, -12);
      c.lineTo(-16, -3);
      c.stroke();
    });
  },
};
