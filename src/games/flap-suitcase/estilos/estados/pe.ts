// Pernambuco: o Recife, com as pontes sobre o Capibaribe, a Torre de Cristal de Brennand no arrecife e Olinda no alto
// do morro, e passistas de frevo com as sombrinhas; as colunas têm as cores da sombrinha de frevo.
import { ciclo, colinas, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { atravessa, figura, lua, mar, noiteDe, palmeira, repetir, sobrados, sol } from "../kit";

const FREVO = ["#e8333a", "#ffd21a", "#2fbf5a", "#2a8ae8"];
// cores por hora do dia (amanhecer, dia, entardecer, noite)
const MORRO = ["#5a8a5a", "#4f9050", "#4a5a4e", "#0e1a12"];
const IGREJA = ["#f6f0e6", "#fbf8f2", "#ecdcd8", "#5a5a70"];
const RIO = ["#5a7a9a", "#4a8ab0", "#4a5a8a", "#0e1e38"];
const PONTE = ["#d8ccb8", "#e4dac6", "#c8b4ac", "#3e3a42"];
const PASSISTA = ["#2a1e2e", "#2a2030", "#241a2a", "#08060a"];
const FACHADAS = [
  ["#f0c84a", "#f6d050", "#dcaa50", "#4a4020"],
  ["#4ab0e0", "#40b4ea", "#4a8ac0", "#14304a"],
  ["#ff8ab8", "#ff90c0", "#d878a8", "#40203a"],
  ["#7ad07a", "#70d478", "#5aa070", "#183020"],
];

/** Sombrinha de frevo: quatro gomos coloridos e a borda branca. */
function sombrinha(ctx: Ctx, x: number, y: number, r: number) {
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = FREVO[i % 4];
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, r, Math.PI + (i / 8) * Math.PI, Math.PI + ((i + 1) / 8) * Math.PI);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, r, Math.PI, 0);
  ctx.stroke();
}

/** Torre de Cristal do Parque das Esculturas: a haste e o botão de flor no alto, sobre o arrecife. */
function torreCristal(ctx: Ctx, x: number, base: number, cor: string) {
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.moveTo(x - 6, base);
  ctx.lineTo(x - 4, base - 90);
  ctx.lineTo(x + 4, base - 90);
  ctx.lineTo(x + 6, base);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x, base - 104, 10, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - 30, base - 4, 60, 4);
}

export const PE: Tema = {
  id: "pe",
  nome: "Pernambuco",
  descricao: "O Recife das pontes sobre o Capibaribe, Olinda no alto e passistas de frevo com as sombrinhas.",
  grupo: "estados",
  amostra: "conic-gradient(#e8333a 25%, #ffd21a 0 50%, #2fbf5a 0 75%, #2a8ae8 0)",
  onda: "square",
  somBase: 440,
  paleta: {
    ceu: [["#f0a088", "#ffe0bc"], ["#3a9ae8", "#d0eefc"], ["#4a4a9a", "#f6a058"], ["#06143a", "#1e3c6e"]],
    longe: MORRO,
    perto: PASSISTA,
    chao: "#c8b49a",
    chaoLinha: "#9a8466",
    coluna: { corpo: "#ffffff", sombra: "#d8d8d8", luz: "#ffffff", contorno: "#1a1a2a" },
    maleta: { corpo: "#2a8ae8", escuro: "#0e3a7a", fivela: "#ffd21a", alca: "#0e3a7a" },
    asa: { cor: "#ffffff", contorno: "#e8333a" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: FREVO,
    recorde: {
      cor: "#ffd21a", traco: [6, 2, 6, 2, 2, 2], largura: 3.5,
      aviso: { texto: "É FREVO! NOVO RECORDE!", fonte: "800 24px system-ui, sans-serif", corTexto: "#ffffff", corContorno: "#3a0a0a", corFundo: "rgba(232,51,58,0.92)", anima: "treme" },
    },
    hud: "#141a2a",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // o Galo da Madrugada, a alegoria gigante do Carnaval do Recife, passando na rua
    const x = atravessa(w, f, 200);
    const base = h - 44;
    const balanca = Math.sin(t * 2) * 0.05;
    ctx.fillStyle = "#2a2a3a";
    ctx.fillRect(x - 70, base - 20, 140, 14);
    ctx.save();
    ctx.translate(x, base - 20);
    ctx.rotate(balanca);
    // o rabo de penas coloridas
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = FREVO[i % 4];
      ctx.beginPath();
      ctx.ellipse(-50 - i * 3, -60 - i * 12, 12, 40, -0.7 + i * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#f2e6d4";
    ctx.beginPath();
    ctx.ellipse(0, -60, 50, 44, 0, 0, Math.PI * 2);
    ctx.moveTo(52, -120);
    ctx.ellipse(36, -120, 22, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e8333a";
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      ctx.moveTo(24 + i * 10, -140);
      ctx.lineTo(29 + i * 10, -160);
      ctx.lineTo(34 + i * 10, -140);
    }
    ctx.fill();
    ctx.fillStyle = "#ffd21a";
    ctx.beginPath();
    ctx.moveTo(56, -124);
    ctx.lineTo(76, -118);
    ctx.lineTo(56, -112);
    ctx.fill();
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.arc(44, -126, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  decor(ctx, w, h, off, tod, t) {
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.18, h * 0.14, 20);
    else sol(ctx, w * 0.18, h * 0.15, 24, "#fff4d6", "rgba(255,236,180,0.45)");
    // Olinda no morro: as casas coloridas subindo e a igreja no alto
    const morro = ciclo(MORRO, tod);
    colinas(ctx, w, h - 40, off * 0.05, morro, 190, 40, 0.005, 2);
    const ig = ciclo(IGREJA, tod);
    const telhado = ciclo(["#b0583a", "#bb603e", "#93483a", "#2a1e26"], tod);
    const coqueiro = ciclo(["#3a6a3a", "#2f7038", "#384a3a", "#0a160e"], tod);
    repetir(w, off * 0.05, 1100, (x) => {
      // o morro do Alto da Sé, que sobe até a igreja: sem ele, a igreja ficava no ar onde o morro de trás desce
      const alto = h - 264;
      ctx.fillStyle = morro;
      ctx.beginPath();
      ctx.moveTo(x + 320, h - 186);
      ctx.bezierCurveTo(x + 430, h - 200, x + 450, alto, x + 535, alto);
      ctx.bezierCurveTo(x + 620, alto, x + 640, h - 200, x + 750, h - 186);
      ctx.closePath();
      ctx.fill();
      // as casinhas brancas e os coqueiros subindo a ladeira, assentados no morro
      for (const [dx, dy] of [[410, -206], [446, -226], [474, -244], [598, -246], [626, -228], [664, -208]]) {
        ctx.fillStyle = ig;
        ctx.fillRect(x + dx!, h + dy! - 12, 20, 14);
        ctx.fillStyle = telhado;
        ctx.beginPath();
        ctx.moveTo(x + dx! - 2, h + dy! - 12);
        ctx.lineTo(x + dx! + 10, h + dy! - 19);
        ctx.lineTo(x + dx! + 22, h + dy! - 12);
        ctx.fill();
      }
      palmeira(ctx, x + 462, h - 236, 46, coqueiro, t, 0.1);
      palmeira(ctx, x + 612, h - 238, 42, coqueiro, t, -0.1);
      // a igreja no alto, com as duas torres
      ctx.fillStyle = ig;
      ctx.fillRect(x + 500, alto - 46, 70, 48);
      ctx.fillRect(x + 486, alto - 76, 20, 78);
      ctx.fillRect(x + 564, alto - 76, 20, 78);
      ctx.beginPath();
      ctx.moveTo(x + 515, alto - 46);
      ctx.quadraticCurveTo(x + 535, alto - 70, x + 555, alto - 46);
      ctx.fill();
      ctx.fillStyle = telhado;
      for (const tx of [486, 564]) {
        ctx.beginPath();
        ctx.moveTo(x + tx - 2, alto - 76);
        ctx.lineTo(x + tx + 10, alto - 90);
        ctx.lineTo(x + tx + 22, alto - 76);
        ctx.fill();
      }
      ctx.fillStyle = ciclo(["#3a4a5a", "#3a4a5a", "#3a3a4e", "#14141e"], tod);
      ctx.fillRect(x + 528, alto - 22, 14, 24);
    });
    // o chão do casario, para as casas nunca ficarem no ar onde o morro de trás desce
    ctx.fillStyle = morro;
    ctx.fillRect(0, h - 200, w, 52);
    sobrados(ctx, w, h - 196, off * 0.07, FACHADAS.map((c) => ciclo(c, tod)), ciclo(["#b0583a", "#bb603e", "#93483a", "#2a1e26"], tod), ciclo(["#fbf6ec", "#ffffff", "#f0e0d8", "#6a6a7a"], tod), ciclo(["#2a3a5a", "#24365a", "#2e2e4a", "#10141e"], tod), noite, 0.7);
    // o rio com as pontes em arco e a Torre de Cristal
    const yRio = h - 150;
    mar(ctx, w, yRio, 70, off * 0.14, ciclo(RIO, tod), "rgba(255,255,255,0.45)", t);
    const ponte = ciclo(PONTE, tod);
    repetir(w, off * 0.16, 700, (x) => {
      ctx.fillStyle = ponte;
      ctx.fillRect(x + 100, yRio - 8, 260, 8);
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 100 + i * 65, yRio);
        ctx.lineTo(x + 100 + i * 65, yRio + 20);
        ctx.arc(x + 132 + i * 65, yRio + 20, 32, Math.PI, 0, false);
        ctx.lineTo(x + 165 + i * 65, yRio);
        ctx.fill();
      }
      ctx.fillStyle = ciclo(RIO, tod);
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(x + 132 + i * 65, yRio + 24, 26, Math.PI, 0);
        ctx.fill();
      }
    });
    repetir(w, off * 0.18, 1300, (x) => torreCristal(ctx, x + 950, yRio + 40, ciclo(["#e8e0d0", "#f2ece0", "#dccac4", "#4a4a5c"], tod)));
    // a rua do Marco Zero e os passistas de frevo
    ctx.fillStyle = ciclo(["#d8c8b0", "#e0d2ba", "#c8b2a6", "#3a3632"], tod);
    ctx.fillRect(0, yRio + 64, w, h - yRio - 64);
    const passista = ciclo(PASSISTA, tod);
    repetir(w, off * 0.42, 220, (x, k) => {
      const px = x + variar(k, 31, 80);
      const pulo = Math.abs(Math.sin(t * 5 + k));
      const perna = Math.sin(t * 10 + k) * 1.2;
      const mao = figura(ctx, px, h - 42 - pulo * 6, 1, passista, { tronco: Math.sin(t * 5 + k) * 0.25, bracoE: -1.8, bracoD: 2.4, pernaE: perna, pernaD: -perna * 0.6, dobra: 0.7 });
      sombrinha(ctx, mao[0], mao[1] - 4, 11);
    });
  },
  chao(ctx, w, h, y, off, tema, tod) {
    // a Rosa dos Ventos do Marco Zero, desenhada no calçamento
    ctx.fillStyle = ciclo([tema.paleta.chao, tema.paleta.chao, "#b8a294", "#34302e"], tod);
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = tema.paleta.chaoLinha;
    ctx.fillRect(0, y, w, 3);
    for (let x = -(off % 200); x < w + 100; x += 200) {
      ctx.fillStyle = FREVO[Math.abs(Math.round((x + off) / 200)) % 4];
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const r = i % 2 ? 5 : 15;
        ctx.lineTo(x + 100 + Math.cos(a) * r * 2, y + 20 + Math.sin(a) * r * 0.5);
      }
      ctx.fill();
    }
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // as faixas das cores da sombrinha, com o volume de um cilindro
    for (let y = 0, i = 0; y < len; y += 22, i++) {
      ctx.fillStyle = FREVO[(i + variante) % 4];
      ctx.fillRect(x0, y, w, Math.min(22, len - y));
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x0, y, w, 2);
    }
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0, "rgba(255,255,255,0.35)");
    g.addColorStop(0.35, "rgba(255,255,255,0)");
    g.addColorStop(1, "rgba(0,0,0,0.3)");
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, w, len);
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 2;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      ctx.fillStyle = c.corpo;
      ctx.beginPath();
      ctx.moveTo(x0, 12);
      ctx.lineTo(x0 + w * 0.25, 3);
      ctx.lineTo(x0 + w * 0.5, 10);
      ctx.lineTo(x0 + w * 0.75, 1);
      ctx.lineTo(x0 + w, 8);
      ctx.lineTo(x0 + w, 14);
      ctx.lineTo(x0, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    // a borda branca com o babado da sombrinha
    ctx.fillStyle = c.corpo;
    ctx.fillRect(x0 - 4, 0, w + 8, 8);
    ctx.strokeRect(x0 - 4, 0, w + 8, 8);
    ctx.beginPath();
    for (let x = x0 - 4; x < x0 + w + 4; x += 8) ctx.arc(x + 4, 8, 4, 0, Math.PI);
    ctx.fill();
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, (c) => {
      // a sombrinha de frevo na alça, girando
      c.save();
      c.translate(0, -24);
      c.rotate(Math.sin(t * 6) * 0.35);
      c.strokeStyle = "#1a1a1a";
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(0, -10);
      c.stroke();
      sombrinha(c, 0, -10, 13);
      c.restore();
    });
  },
};
