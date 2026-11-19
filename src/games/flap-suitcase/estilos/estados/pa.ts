// Pará: Belém, com o Mercado de Ferro do Ver-o-Peso e as torrinhas, os barcos coloridos na baía do Guajará, os urubus
// rondando o mercado, as mangueiras e a chuva da tarde; as colunas são de ferro fundido art nouveau.
import { ciclo, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { atravessa, ave, figura, lua, mar, noiteDe, repetir } from "../kit";

// cores por hora do dia (amanhecer, dia, entardecer, noite)
const BAIA = ["#8a7a6a", "#94846e", "#7a6a6e", "#1e1c22"];
const MERCADO = ["#6a8aa8", "#6a90b0", "#5a6a90", "#1a2238"];
const MERCADO_TELHADO = ["#9aa8b8", "#a4b2c0", "#8a8aa4", "#2a2e42"];
const MANGUEIRA = ["#2f5a34", "#2a6034", "#2e3e34", "#081208"];
const CIDADE = ["#c8b8b0", "#d0c4b8", "#b8a4a8", "#2e2c3a"];
const CAIS = ["#8e877a", "#968f82", "#80787e", "#22222a"];
const CAIS_BORDA = ["#b8b0a2", "#c2bbae", "#a89ea4", "#34343e"];

// o tamanho da imagem pronta da nuvem da chuva e onde fica o centro dela
const NUVEM_L = 420;
const NUVEM_A = 220;
const NUVEM_CX = 210;
const NUVEM_CY = 160;
let nuvemFeita: HTMLCanvasElement | null | undefined;

/** O cumulonimbo da chuva da tarde: os bolos escuros, a luz no alto deles e a base chata e carregada. */
function cumulonimbo(ctx: Ctx, x: number, y: number, clarao: number) {
  const lobos: [number, number, number][] = [
    [-150, 18, 38], [-95, 8, 50], [-30, -6, 62], [40, -2, 58], [105, 10, 46], [155, 22, 32],
    [-60, -48, 44], [5, -62, 52], [66, -42, 40], [-22, -88, 34], [32, -90, 30],
  ];
  const acende = (cor: [number, number, number], k: number) => `rgb(${cor.map((c) => Math.round(c + (250 - c) * clarao * k)).join(",")})`;
  ctx.fillStyle = acende([62, 66, 82], 0.5);
  ctx.beginPath();
  for (const [dx, dy, r] of lobos) {
    ctx.moveTo(x + dx + r, y + dy);
    ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
  }
  ctx.fill();
  // a luz vem de cima: os mesmos bolos, um pouco menores e mais altos, num degradê claro no topo e escuro embaixo
  const luz = ctx.createLinearGradient(0, y - 120, 0, y + 30);
  luz.addColorStop(0, acende([178, 184, 198], 0.4));
  luz.addColorStop(0.55, acende([110, 116, 132], 0.5));
  luz.addColorStop(1, acende([70, 74, 90], 0.5));
  ctx.fillStyle = luz;
  ctx.beginPath();
  for (const [dx, dy, r] of lobos) {
    ctx.moveTo(x + dx - r * 0.12 + r * 0.84, y + dy - r * 0.16);
    ctx.arc(x + dx - r * 0.12, y + dy - r * 0.16, r * 0.84, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.fillStyle = acende([44, 46, 60], 0.4);
  ctx.beginPath();
  ctx.ellipse(x, y + 38, 190, 12, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** A nuvem apagada, desenhada uma vez numa imagem em dobro da resolução (fora do navegador, não há imagem). */
function nuvemPronta(): HTMLCanvasElement | null {
  if (nuvemFeita !== undefined) return nuvemFeita;
  nuvemFeita = null;
  if (typeof document === "undefined") return null;
  const tela = document.createElement("canvas");
  tela.width = NUVEM_L * 2;
  tela.height = NUVEM_A * 2;
  const c = tela.getContext("2d");
  if (!c) return null;
  c.scale(2, 2);
  cumulonimbo(c, NUVEM_CX, NUVEM_CY, 0);
  nuvemFeita = tela;
  return tela;
}

/** Mercado de Ferro: o galpão de ferro azul e as quatro torrinhas pontudas nos cantos. */
function verOPeso(ctx: Ctx, x: number, base: number, cor: string, telhado: string) {
  ctx.fillStyle = cor;
  ctx.fillRect(x, base - 56, 220, 56);
  ctx.fillStyle = telhado;
  ctx.beginPath();
  ctx.moveTo(x - 6, base - 56);
  ctx.lineTo(x + 30, base - 74);
  ctx.lineTo(x + 190, base - 74);
  ctx.lineTo(x + 226, base - 56);
  ctx.fill();
  for (const tx of [x - 4, x + 54, x + 146, x + 204]) {
    ctx.fillStyle = cor;
    ctx.fillRect(tx, base - 92, 20, 92);
    ctx.fillStyle = telhado;
    ctx.beginPath();
    ctx.moveTo(tx - 4, base - 92);
    ctx.lineTo(tx + 10, base - 118);
    ctx.lineTo(tx + 24, base - 92);
    ctx.fill();
    ctx.fillRect(tx + 9, base - 126, 2, 8);
  }
  // as grades e os arcos de ferro
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = x + 10; i < x + 214; i += 12) {
    ctx.moveTo(i, base);
    ctx.lineTo(i, base - 40);
  }
  ctx.moveTo(x, base - 40);
  ctx.lineTo(x + 220, base - 40);
  ctx.stroke();
}

/** Barco regional de dois andares, colorido, balançando. */
function barco(ctx: Ctx, x: number, y: number, k: number, t: number) {
  const bal = Math.sin(t * 1.3 + k) * 1.5;
  const cores = ["#2a8ae8", "#e8333a", "#2fbf5a", "#ffd21a"];
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(x - 34, y - 6 + bal);
  ctx.lineTo(x + 34, y - 6 + bal);
  ctx.lineTo(x + 28, y + 4 + bal);
  ctx.lineTo(x - 30, y + 4 + bal);
  ctx.fill();
  ctx.fillStyle = cores[variar(k, 7, 4)];
  ctx.fillRect(x - 34, y - 4 + bal, 68, 3);
  ctx.fillStyle = "#f4f0e8";
  ctx.fillRect(x - 26, y - 20 + bal, 50, 14);
  ctx.fillRect(x - 18, y - 30 + bal, 32, 10);
  ctx.fillStyle = cores[variar(k + 1, 7, 4)];
  ctx.fillRect(x - 28, y - 22 + bal, 54, 3);
  ctx.fillRect(x - 20, y - 32 + bal, 36, 3);
  ctx.fillStyle = "#3a4a5a";
  for (let i = 0; i < 5; i++) ctx.fillRect(x - 22 + i * 9, y - 16 + bal, 5, 5);
}

/** Cuia de açaí com a colher. */
function cuiaAcai(c: Ctx) {
  c.save();
  c.translate(10, -20);
  c.fillStyle = "#5a3a1a";
  c.strokeStyle = "#2a1a0a";
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(-10, -2);
  c.quadraticCurveTo(-9, 8, 0, 8);
  c.quadraticCurveTo(9, 8, 10, -2);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = "#4a1a4a";
  c.beginPath();
  c.ellipse(0, -2, 10, 3, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#f2e6c8";
  for (const [x, y] of [[-4, -3], [2, -2], [5, -3.5]]) c.fillRect(x, y, 1.6, 1.2);
  c.strokeStyle = "#c8c8d0";
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(3, -3);
  c.lineTo(9, -12);
  c.stroke();
  c.restore();
}

export const PA: Tema = {
  id: "pa",
  nome: "Pará",
  descricao: "Belém: o Ver-o-Peso com as torrinhas de ferro, os barcos coloridos na baía do Guajará, as mangueiras e a chuva da tarde.",
  grupo: "estados",
  amostra: "linear-gradient(135deg, #6a90b0 50%, #4a1a4a 50%)",
  onda: "triangle",
  somBase: 392,
  climaFixo: "chuva",
  paleta: {
    ceu: [["#b8a0b0", "#ecd8cc"], ["#8aa4bc", "#dce6ee"], ["#6a5a88", "#e4a88a"], ["#0c1430", "#283658"]],
    longe: CIDADE,
    perto: MANGUEIRA,
    chao: "#7a7a7e",
    chaoLinha: "#4a4a50",
    coluna: { corpo: "#2e5a6a", sombra: "#1e3e4a", luz: "#4a7a8a", contorno: "#0a1a20" },
    maleta: { corpo: "#4a1a4a", escuro: "#1e061e", fivela: "#ffd21a", alca: "#1e061e" },
    asa: { cor: "#ffffff", contorno: "#4a1a4a" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: ["#b04ce0", "#ffffff", "#2fbf5a"],
    recorde: {
      cor: "#b04ce0", traco: [3, 2, 3, 8], largura: 3.5,
      aviso: { texto: "ÉGUA! NOVO RECORDE!", fonte: "800 26px system-ui, sans-serif", corTexto: "#ffffff", corContorno: "#2a0a2a", corFundo: "rgba(110,30,110,0.92)", anima: "treme" },
    },
    hud: "#101820",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // a chuva das duas da tarde: o cumulonimbo carregado passa despejando cortinas de água, com os relâmpagos que
    // clareiam tudo, os respingos no chão e o pessoal de guarda-chuva apertando o passo
    const x = atravessa(w, f, 280);
    const y = h * 0.21;
    const chao = h - 40;
    // os relâmpagos: dois clarões curtos durante a passagem
    const clarao = Math.max(0, 1 - Math.abs(f - 0.34) / 0.012, 1 - Math.abs(f - 0.63) / 0.01);
    // as cortinas de chuva, mais densas no meio, inclinadas pelo vento
    const vento = -0.22;
    const gc = ctx.createLinearGradient(0, y + 30, 0, chao);
    gc.addColorStop(0, "rgba(96,106,128,0.42)");
    gc.addColorStop(1, "rgba(120,130,150,0.12)");
    ctx.fillStyle = gc;
    ctx.beginPath();
    // poucas e estreitas: são áreas grandes e transparentes, que pesam no celular
    for (let i = 0; i < 5; i++) {
      const cx = x - 140 + i * 70 + Math.sin(t * 0.8 + i) * 6;
      const larg = 24 + (i % 3) * 8;
      ctx.moveTo(cx - larg / 2, y + 34);
      ctx.lineTo(cx + larg / 2, y + 34);
      ctx.lineTo(cx + larg / 2 + (chao - y) * vento, chao);
      ctx.lineTo(cx - larg / 2 + (chao - y) * vento, chao);
      ctx.closePath();
    }
    ctx.fill();
    // os pingos riscando
    ctx.strokeStyle = "rgba(210,224,245,0.65)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    const queda = chao - y - 40;
    for (let i = 0; i < 110; i++) {
      const d = (((t * 520 + i * 61) % queda) + queda) % queda;
      const rx = x - 175 + ((i * 37) % 330) + d * vento;
      const ry = y + 40 + d;
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + 14 * vento, ry + 14);
    }
    ctx.stroke();
    // os respingos no chão: a coroazinha que pula e o anel que abre
    ctx.strokeStyle = "rgba(220,232,250,0.7)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 18; i++) {
      const q = (t * 2.2 + i * 0.37) % 1;
      const sx = x - 200 + ((i * 53) % 330) + (chao - y) * vento;
      const r = 2 + q * 7;
      ctx.moveTo(sx + r, chao - 1);
      ctx.ellipse(sx, chao - 1, r, r * 0.3, 0, 0, Math.PI * 2);
      if (q < 0.4) {
        ctx.moveTo(sx - 3, chao - 2);
        ctx.lineTo(sx - 5, chao - 2 - (0.4 - q) * 14);
        ctx.moveTo(sx + 3, chao - 2);
        ctx.lineTo(sx + 5, chao - 2 - (0.4 - q) * 14);
      }
    }
    ctx.stroke();
    // o pessoal de guarda-chuva, andando depressa debaixo da chuva
    for (const [dx, cor, fase] of [[-70, "#e8333a", 0], [40, "#ffd21a", 1.7], [120, "#2a8ae8", 3.1]] as const) {
      const px = x + dx + (chao - y) * vento * 0.8;
      const passo = t * 7 + fase;
      const mao = figura(ctx, px, chao, 1.1, "#2a2228", {
        tronco: 0.18,
        bracoD: -2.6,
        bracoE: Math.sin(passo + 1) * 0.4,
        pernaE: Math.sin(passo) * 0.55,
        pernaD: -Math.sin(passo) * 0.55,
        dobra: 0.25,
      });
      ctx.strokeStyle = "#2a2228";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(mao[0], mao[1]);
      ctx.lineTo(mao[0] + 1, mao[1] - 12);
      ctx.stroke();
      ctx.fillStyle = cor;
      ctx.beginPath();
      ctx.moveTo(mao[0] - 15, mao[1] - 10);
      ctx.quadraticCurveTo(mao[0] + 1, mao[1] - 28, mao[0] + 17, mao[1] - 10);
      for (let k = 0; k < 4; k++) ctx.quadraticCurveTo(mao[0] + 13 - k * 8, mao[1] - 14, mao[0] + 9 - k * 8, mao[1] - 10);
      ctx.fill();
    }
    // o relâmpago, da base da nuvem até o chão, com os galhos; e o clarão em tudo
    if (clarao > 0) {
      const sorte = (n: number) => {
        const v = Math.sin(n * 12.9898 + (f > 0.5 ? 7 : 0)) * 43758.5453;
        return v - Math.floor(v);
      };
      const raio = (x0: number, y0: number, y1: number, passos: number, semente: number, galhos: boolean) => {
        const pts: [number, number][] = [[x0, y0]];
        for (let i = 1; i <= passos; i++) {
          const [px] = pts[i - 1]!;
          pts.push([px + (sorte(semente + i) - 0.5) * 34, y0 + ((y1 - y0) * i) / passos]);
        }
        for (const [larg, cor] of [[9, `rgba(255,250,210,${0.25 * clarao})`], [2.4, `rgba(255,255,240,${clarao})`]] as const) {
          ctx.strokeStyle = cor;
          ctx.lineWidth = larg;
          ctx.lineJoin = "round";
          ctx.beginPath();
          pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
          ctx.stroke();
        }
        if (galhos) {
          for (const k of [3, 6]) {
            const [gx, gy] = pts[k]!;
            raio(gx, gy, gy + (y1 - y0) * 0.25, 4, semente + k * 31, false);
          }
        }
      };
      raio(x + 10, y + 40, chao, 11, 1, true);
      ctx.fillStyle = `rgba(255,252,235,${0.3 * clarao})`;
      ctx.fillRect(0, 0, w, h);
    }
    // o cumulonimbo: fica pronto numa imagem (é grande e não muda); só no clarão do relâmpago é desenhado aceso
    const pronta = clarao > 0 ? null : nuvemPronta();
    if (pronta) ctx.drawImage(pronta, x - NUVEM_CX, y - NUVEM_CY, NUVEM_L, NUVEM_A);
    else cumulonimbo(ctx, x, y, clarao);
  },
  decor(ctx, w, h, off, tod, t) {
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.3, h * 0.14, 18, "#e8e4dc");
    // nuvens carregadas da chuva da tarde
    ctx.fillStyle = ciclo(["#9a8a98", "#a0a8b4", "#7a6a88", "#1e2238"], tod);
    ctx.globalAlpha = 0.7;
    repetir(w, off * 0.02 + t * 5, 260, (x, k) => {
      ctx.beginPath();
      ctx.ellipse(x + 130, h * 0.14 + variar(k, 7, 3) * 10, 150, 30, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    // a cidade e o mercado na beira da baía
    const cidade = ciclo(CIDADE, tod);
    repetir(w, off * 0.05, 44, (x, k) => {
      const a = 40 + variar(k, 7919, 6) * 14;
      ctx.fillStyle = cidade;
      ctx.fillRect(x, h - 196 - a, 40, a);
    });
    ctx.fillStyle = cidade;
    ctx.fillRect(0, h - 196, w, 20);
    repetir(w, off * 0.1, 1000, (x) => verOPeso(ctx, x + 400, h - 176, ciclo(MERCADO, tod), ciclo(MERCADO_TELHADO, tod)));
    // os urubus rondando o mercado
    ctx.fillStyle = "#1a1a1a";
    for (let i = 0; i < 5; i++) {
      const a = t * 0.6 + i * 1.26;
      ave(ctx, w * 0.5 + Math.cos(a) * (120 + i * 20), h - 300 + Math.sin(a * 1.3) * 30, 1.1, Math.sin(t * 4 + i));
    }
    // a baía com os barcos
    const yBaia = h - 176;
    mar(ctx, w, yBaia, 100, off * 0.16, ciclo(BAIA, tod), "rgba(255,240,220,0.3)", t);
    repetir(w, off * 0.2 + t * 6, 260, (x, k) => barco(ctx, x + variar(k, 37, 80), yBaia + 50 + variar(k, 7, 3) * 12, k, t));
    // o cais de pedra da orla, entre a baía e a calçada (antes ficava uma faixa de céu ali)
    ctx.fillStyle = ciclo(CAIS, tod);
    ctx.fillRect(0, h - 78, w, 39);
    ctx.fillStyle = ciclo(CAIS_BORDA, tod);
    ctx.fillRect(0, h - 79, w, 4);
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.fillRect(0, h - 75, w, 2);
    repetir(w, off * 0.4, 46, (x, k) => {
      ctx.fillRect(x, h - 73, 1.5, 15);
      ctx.fillRect(x + 23 + variar(k, 7, 3) * 3, h - 58, 1.5, 18);
    });
    ctx.fillRect(0, h - 58, w, 1.5);
    // as mangueiras de Belém
    const mangueira = ciclo(MANGUEIRA, tod);
    repetir(w, off * 0.4, 150, (x, k) => {
      const mx = x + variar(k, 29, 40);
      ctx.fillStyle = "#3a2a1e";
      ctx.fillRect(mx - 4, h - 90, 8, 50);
      ctx.fillStyle = mangueira;
      for (const [dx, dy, r] of [[-22, -100, 22], [0, -116, 26], [22, -100, 22], [-10, -88, 18], [12, -86, 18]]) {
        ctx.beginPath();
        ctx.arc(mx + dx, h + dy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#ffb82a";
      for (const [dx, dy] of [[-14, -86], [10, -80], [18, -96]]) {
        ctx.beginPath();
        ctx.ellipse(mx + dx, h + dy, 2.6, 3.6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  },
  chao(ctx, w, h, y, off, tema, tod) {
    // calçada molhada de pedra lioz, refletindo
    ctx.fillStyle = ciclo(["#8a8a8e", "#909094", "#7a7684", "#24242a"], tod);
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(0, y + 2, w, 5);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    for (let x = -(off % 34); x < w; x += 34) {
      ctx.fillRect(x, y + 8, 2, 30);
    }
    ctx.fillRect(0, y + 22, w, 1.6);
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // ferro fundido verde-azulado, com o fuste canelado e os ornamentos em voluta
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0, c.luz);
    g.addColorStop(0.45, c.corpo);
    g.addColorStop(1, c.sombra);
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, w, len);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    for (let i = 1; i < 6; i++) ctx.fillRect(x0 + (i * w) / 6 - 1, 30, 2, len);
    // anéis com rebites e volutas, desviradas na coluna de cima
    const deCima = ctx.getTransform().d < 0;
    ctx.strokeStyle = "#8ab0b8";
    ctx.lineWidth = 1.6;
    for (let y = 90 + variante * 30; y < len - 20; y += 140) {
      ctx.fillStyle = c.sombra;
      ctx.fillRect(x0 - 2, y, w + 4, 10);
      ctx.fillStyle = "#c8d8dc";
      for (let x = x0 + 4; x < x0 + w; x += 10) ctx.fillRect(x, y + 4, 2, 2);
      ctx.save();
      ctx.translate(0, y + 26);
      if (deCima) ctx.scale(1, -1);
      ctx.beginPath();
      for (const l of [-1, 1]) {
        ctx.moveTo(0, 10);
        ctx.bezierCurveTo(l * 8, 10, l * 16, 2, l * 12, -6);
        ctx.arc(l * 8, -6, 4, 0, Math.PI * 2 * 0.75, l < 0);
      }
      ctx.stroke();
      ctx.restore();
    }
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      // ferro partido, com a ponta torta
      ctx.fillStyle = c.luz;
      ctx.beginPath();
      ctx.moveTo(x0, 14);
      ctx.lineTo(x0 + w * 0.35, 4);
      ctx.lineTo(x0 + w * 0.6, 12);
      ctx.lineTo(x0 + w, 0);
      ctx.lineTo(x0 + w, 16);
      ctx.lineTo(x0, 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    // capitel de ferro com folhas
    ctx.fillStyle = c.luz;
    ctx.fillRect(x0 - 6, 0, w + 12, 7);
    ctx.strokeRect(x0 - 6, 0, w + 12, 7);
    ctx.fillStyle = c.corpo;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const fx = x0 + 4 + (i * (w - 8)) / 5;
      ctx.moveTo(fx - 6, 7);
      ctx.quadraticCurveTo(fx, 24, fx + 6, 7);
    }
    ctx.fill();
    ctx.stroke();
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, cuiaAcai);
  },
};
