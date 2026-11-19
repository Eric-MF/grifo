// Constituição de 1967, a do regime militar, votada por um Congresso convocado pelo governo: a Brasília recém-construída,
// de concreto, as obras ainda em andamento sob o céu cinzento e as colunas de concreto aparente; a maleta vai preta, sem enfeite.
import { ciclo, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { atravessa, lua, noiteDe, repetir } from "../kit";

// cores por hora do dia (amanhecer, dia, entardecer, noite); céu cinzento
const CONCRETO = ["#a8a29a", "#b0aca4", "#968e94", "#34343c"];
const CONCRETO_SOMBRA = ["#86807a", "#8e8a84", "#76707a", "#22222a"];
const NUVEM = ["#8a8490", "#949aa2", "#7a7088", "#1a1c28"];
const TERRA = ["#a8724a", "#b0784c", "#8e604a", "#24180e"];
const GUINDASTE = ["#4a4a50", "#4a4e54", "#42404c", "#121218"];

/** Bloco de concreto aparente sobre pilotis, com os brises da fachada. */
function bloco(ctx: Ctx, x: number, base: number, alt: number, cor: string, sombra: string, acesas: number) {
  ctx.fillStyle = cor;
  ctx.fillRect(x, base - alt, 140, alt - 18);
  ctx.fillStyle = sombra;
  for (let i = 0; i < 6; i++) ctx.fillRect(x + 6 + i * 26, base - 18, 6, 18);
  for (let y = base - alt + 6; y < base - 24; y += 10) ctx.fillRect(x + 4, y, 132, 3);
  if (acesas > 0.3) {
    ctx.fillStyle = "#ffe2a0";
    for (let y = base - alt + 9; y < base - 24; y += 20) for (let i = 0; i < 5; i++) if (variar(Math.round(base - y) * 3 + i * 7 + Math.round(alt), 7, 3) === 0) ctx.fillRect(x + 10 + i * 26, y, 14, 4);
  }
}

/** Guindaste de obra, parado, com o cabo e o gancho. */
function guindaste(ctx: Ctx, x: number, base: number, cor: string, t: number) {
  ctx.strokeStyle = cor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.lineTo(x, base - 200);
  ctx.moveTo(x - 30, base - 200);
  ctx.lineTo(x + 130, base - 200);
  for (let y = base; y > base - 200; y -= 14) {
    ctx.moveTo(x - 5, y);
    ctx.lineTo(x + 5, y - 14);
  }
  const gx = x + 60 + Math.sin(t * 0.2) * 40;
  ctx.moveTo(gx, base - 200);
  ctx.lineTo(gx, base - 120);
  ctx.stroke();
  ctx.fillStyle = cor;
  ctx.fillRect(gx - 10, base - 120, 20, 6);
}

export const C1967: Tema = {
  id: "c1967",
  nome: "Ditadura Militar (1967)",
  descricao: "A Constituição do regime militar, votada por um Congresso convocado pelo governo: a Brasília de concreto sob o céu cinzento.",
  grupo: "constituicoes",
  amostra: "linear-gradient(135deg, #b0aca4 50%, #1a1a1e 50%)",
  onda: "sawtooth",
  somBase: 123,
  climaFixo: "chuva",
  paleta: {
    ceu: [["#7a7480", "#b8a8a8"], ["#80868e", "#c0c4c8"], ["#5e5468", "#a88a88"], ["#0a0c18", "#1e2232"]],
    longe: CONCRETO,
    perto: TERRA,
    chao: "#8a6a4a",
    chaoLinha: "#5a4430",
    coluna: { corpo: "#a6a098", sombra: "#7e7872", luz: "#c4beb6", contorno: "#26242a" },
    maleta: { corpo: "#1a1a1e", escuro: "#06060a", fivela: "#8a8a92", alca: "#06060a" },
    asa: { cor: "#d8d8dc", contorno: "#3a3a42" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: ["#c4beb6", "#8a8a92", "#ffffff"],
    recorde: {
      cor: "#c8c4bc", traco: [10, 10], largura: 3,
      aviso: { texto: "NOVO RECORDE", fonte: "700 26px system-ui, sans-serif", corTexto: "#f0ece4", corContorno: "#141416", corFundo: "rgba(40,40,46,0.92)", anima: "pulsa" },
    },
    hud: "#141416",
    estrelas: "#e8e8f0",
  },
  surpresa(ctx, w, h, f, t) {
    // um Fusca passa pela avenida de terra, recém-aberta
    // desenhado em escala 1,7 a partir da origem (x, base)
    ctx.translate(atravessa(w, f, 160), h - 41);
    ctx.scale(1.7, 1.7);
    const x = 0;
    const base = 0;
    const pula = Math.abs(Math.sin(t * 9)) * 1.2;
    ctx.fillStyle = "#4a7aa8";
    ctx.beginPath();
    ctx.moveTo(x - 34, base - 10 - pula);
    ctx.quadraticCurveTo(x - 32, base - 30 - pula, x - 12, base - 34 - pula);
    ctx.quadraticCurveTo(x + 14, base - 38 - pula, x + 26, base - 22 - pula);
    ctx.quadraticCurveTo(x + 36, base - 18 - pula, x + 36, base - 10 - pula);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#c8dce8";
    ctx.beginPath();
    ctx.moveTo(x - 20, base - 24 - pula);
    ctx.quadraticCurveTo(x - 16, base - 32 - pula, x - 6, base - 32 - pula);
    ctx.lineTo(x - 6, base - 24 - pula);
    ctx.moveTo(x - 2, base - 24 - pula);
    ctx.lineTo(x - 2, base - 33 - pula);
    ctx.quadraticCurveTo(x + 10, base - 32 - pula, x + 16, base - 24 - pula);
    ctx.fill();
    ctx.fillStyle = "#1a1a1a";
    for (const rx of [x - 20, x + 22]) {
      ctx.beginPath();
      ctx.arc(rx, base - 8, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#c8c8d0";
    for (const rx of [x - 20, x + 22]) {
      ctx.beginPath();
      ctx.arc(rx, base - 8, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(160,110,70,0.4)";
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(x - 40 - i * 14, base - 6 - i * 2, 4 + i * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  decor(ctx, w, h, off, tod, t) {
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.7, h * 0.14, 18, "#d8d4cc");
    ctx.fillStyle = ciclo(NUVEM, tod);
    ctx.globalAlpha = 0.8;
    repetir(w, off * 0.02 + t * 5, 280, (x, k) => {
      ctx.beginPath();
      ctx.ellipse(x + 140, h * 0.1 + variar(k, 7, 3) * 14, 200, 34, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    // a terra vermelha do Planalto, os blocos de concreto e as obras
    const terra = ciclo(TERRA, tod);
    ctx.fillStyle = terra;
    ctx.fillRect(0, h - 110, w, 70);
    const cor = ciclo(CONCRETO, tod);
    const sombra = ciclo(CONCRETO_SOMBRA, tod);
    repetir(w, off * 0.08, 190, (x, k) => bloco(ctx, x, h - 110, 70 + variar(k, 7919, 4) * 16, cor, sombra, noite));
    repetir(w, off * 0.12, 800, (x) => guindaste(ctx, x + 500, h - 110, ciclo(GUINDASTE, tod), t));
    // os andaimes de uma obra e os montes de terra
    repetir(w, off * 0.26, 500, (x) => {
      ctx.strokeStyle = ciclo(["#6a5a4a", "#6e5e4c", "#5a4c46", "#141010"], tod);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let i = 0; i <= 4; i++) {
        ctx.moveTo(x + 100 + i * 20, h - 40);
        ctx.lineTo(x + 100 + i * 20, h - 120);
      }
      for (let y = h - 40; y >= h - 120; y -= 20) {
        ctx.moveTo(x + 100, y);
        ctx.lineTo(x + 180, y);
      }
      ctx.stroke();
      ctx.fillStyle = terra;
      ctx.beginPath();
      ctx.ellipse(x + 320, h - 40, 60, 22, 0, Math.PI, 0);
      ctx.fill();
    });
  },
  chao(ctx, w, h, y, off, tema, tod) {
    const p = tema.paleta;
    ctx.fillStyle = ciclo([p.chao, p.chao, "#765a44", "#1e160e"], tod);
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = p.chaoLinha;
    ctx.fillRect(0, y, w, 3);
    // poças de chuva na terra
    ctx.fillStyle = "rgba(180,190,200,0.35)";
    for (let x = -(off % 90); x < w; x += 90) {
      ctx.beginPath();
      ctx.ellipse(x + 40, y + 18, 18, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // concreto aparente: as marcas das tábuas da fôrma e os furos dos tirantes
    ctx.fillStyle = c.corpo;
    ctx.fillRect(x0, 0, w, len);
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    for (let y = 0, i = 0; y < len; y += 9, i++) if ((i + variante) % 3 === 0) ctx.fillRect(x0, y, w, 9);
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    for (let y = 0; y < len; y += 9) ctx.fillRect(x0, y, w, 1);
    ctx.fillStyle = "#4a4a52";
    for (let y = 30 + variante * 12; y < len; y += 60) {
      ctx.beginPath();
      ctx.arc(x0 + 14, y, 2, 0, Math.PI * 2);
      ctx.arc(x0 + w - 14, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.fillRect(x0 + w - 8, 0, 8, len);
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 2;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      ctx.fillStyle = c.luz;
      ctx.beginPath();
      ctx.moveTo(x0, 12);
      ctx.lineTo(x0 + w * 0.3, 2);
      ctx.lineTo(x0 + w * 0.6, 10);
      ctx.lineTo(x0 + w, 0);
      ctx.lineTo(x0 + w, 14);
      ctx.lineTo(x0, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#5a3a2a";
      ctx.beginPath();
      for (const fx of [x0 + 12, x0 + w / 2, x0 + w - 12]) {
        ctx.moveTo(fx, 14);
        ctx.lineTo(fx + 3, -2);
      }
      ctx.stroke();
      return;
    }
    // a viga de borda, reta e crua
    ctx.fillStyle = c.sombra;
    ctx.fillRect(x0 - 8, 0, w + 16, 12);
    ctx.strokeRect(x0 - 8, 0, w + 16, 12);
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema);
  },
};
