// Peças de cenário dos estilos dos grupos (feriados, estados…). As mais antigas (colinas, templo, pinheiro…) ficam em themes.ts.
// Convenções: `base` é a linha do chão da peça; `o` é o deslocamento da camada, já multiplicado pela velocidade dela.
import { variar, type Ctx } from "../themes";

/** Quanto já é noite (0 a 1) na hora do dia `tod`: a mesma conta do motor para acender as estrelas. */
export const noiteDe = (tod: number) => Math.max(0, 1 - Math.abs(tod - 3) * 1.4);

/** Chama `desenhar(x, k)` a cada `esp` px de uma camada, cobrindo a tela inteira; `k` é o índice estável da repetição. */
export function repetir(w: number, o: number, esp: number, desenhar: (x: number, k: number) => void) {
  for (let k = Math.floor(o / esp) - 1; k * esp - o < w + esp; k++) desenhar(k * esp - o, k);
}

/** Sol com brilho em volta. */
export function sol(ctx: Ctx, x: number, y: number, r: number, cor: string, brilho: string) {
  const g = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 3.2);
  g.addColorStop(0, brilho);
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(x - r * 3.2, y - r * 3.2, r * 6.4, r * 6.4);
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Lua cheia com halo e três manchas. */
export function lua(ctx: Ctx, x: number, y: number, r: number, cor = "#f1ecd8") {
  const halo = ctx.createRadialGradient(x, y, r * 0.9, x, y, r * 3.8);
  halo.addColorStop(0, "rgba(232,224,255,0.26)");
  halo.addColorStop(1, "rgba(232,224,255,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(x - r * 3.8, y - r * 3.8, r * 7.6, r * 7.6);
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(120,110,90,0.18)";
  for (const [dx, dy, rr] of [[-0.3, -0.18, 0.2], [0.26, 0.24, 0.15], [0.18, -0.35, 0.12]]) {
    ctx.beginPath();
    ctx.arc(x + dx * r, y + dy * r, rr * r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Estrelas que piscam, em posições fixas: para os estilos que são sempre noite (o motor só acende as dele perto da meia-noite). */
export function estrelasFixas(ctx: Ctx, w: number, h: number, t: number, cor: string, n = 60, alturaMax = 0.55) {
  ctx.fillStyle = cor;
  for (let i = 0; i < n; i++) {
    const x = (variar(i, 7919, 1000) / 1000) * w;
    const y = (variar(i, 104729, 1000) / 1000) * h * alturaMax;
    ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.3 + i * 2.7));
    const s = i % 7 === 0 ? 2.6 : 1.8;
    ctx.fillRect(x, y, s, s);
  }
  ctx.globalAlpha = 1;
}

/**
 * Palmeira (ou coqueiro, com `curva` maior): tronco que afina e folhas compridas que balançam com `t`.
 * Devolve a posição da copa, para pendurar coisas nela.
 */
export function palmeira(ctx: Ctx, x: number, base: number, alt: number, cor: string, t: number, curva = 0.12): [number, number] {
  const s = alt / 120;
  const balanco = Math.sin(t * 1.3 + x * 0.013) * 0.05;
  const tx = x + alt * (curva + balanco * 0.4);
  const ty = base - alt;
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.moveTo(x - 4.5 * s, base);
  ctx.quadraticCurveTo(x - 3 * s + alt * curva * 0.15, base - alt * 0.55, tx - 2 * s, ty);
  ctx.lineTo(tx + 2 * s, ty);
  ctx.quadraticCurveTo(x + 3 * s + alt * curva * 0.15, base - alt * 0.55, x + 4.5 * s, base);
  ctx.fill();
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i - 3.5) * 0.42 + balanco * (i % 2 ? 1 : -1) * 3;
    const L = (44 + variar(i, 7, 3) * 6) * s;
    const ex = tx + Math.cos(a) * L;
    const ey = ty + Math.sin(a) * L * 0.55 + L * 0.42;
    const cx = tx + Math.cos(a) * L * 0.55;
    const cy = ty + Math.sin(a) * L * 0.5 - L * 0.12;
    const wd = 5.5 * s;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(cx, cy - wd, ex, ey);
    ctx.quadraticCurveTo(cx, cy + wd, tx, ty);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(tx, ty + 2 * s, 4 * s, 0, Math.PI * 2);
  ctx.fill();
  return [tx, ty];
}

/**
 * Bandeira ondulando no vento: `desenhar` pinta o pano parado, de (0,0) a (larg,alt); o pano é fatiado em faixas
 * que sobem e descem, e quanto mais longe do mastro (x), mais a faixa mexe.
 */
export function bandeira(ctx: Ctx, x: number, y: number, larg: number, alt: number, t: number, desenhar: (ctx: Ctx, larg: number, alt: number) => void, faixas = 12) {
  const fl = larg / faixas;
  for (let i = 0; i < faixas; i++) {
    const k = (i + 0.5) / faixas;
    const fase = t * 4.2 - i * 0.6;
    const dy = Math.sin(fase) * alt * 0.07 * k;
    const luz = Math.cos(fase) * 0.13 * k;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + i * fl - 0.4, y + dy - 2, fl + 0.8, alt + 4);
    ctx.clip();
    ctx.translate(x, y + dy);
    desenhar(ctx, larg, alt);
    ctx.fillStyle = luz > 0 ? `rgba(255,255,255,${luz})` : `rgba(0,0,0,${-luz})`;
    ctx.fillRect(i * fl - 0.4, 0, fl + 0.8, alt);
    ctx.restore();
  }
}

/** Fogos de artifício: `n` estouros em ciclo, cada um com sua cor, lugar e hora. `teto` e `chao` limitam a altura dos estouros. */
export function fogos(ctx: Ctx, w: number, h: number, t: number, cores: string[], n = 5, teto = 0.1, chao = 0.42) {
  const P = 2.8;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const fase = t / P + i / n + i * 0.137;
    const vez = Math.floor(fase);
    const a = fase - vez;
    const semente = vez * n + i;
    const x = w * (0.08 + variar(semente, 7919, 84) / 100);
    const y = h * (teto + (variar(semente, 104729, 100) / 100) * (chao - teto));
    const cor = cores[variar(semente, 31, cores.length)];
    if (a < 0.22) {
      // o foguete subindo, com rastro
      const k = a / 0.22;
      const y0 = h * 0.72;
      const yk = y0 - (y0 - y) * (1 - (1 - k) ** 2);
      ctx.strokeStyle = cor;
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, yk + 26);
      ctx.lineTo(x, yk);
      ctx.stroke();
      continue;
    }
    const k = (a - 0.22) / 0.78;
    const raio = (56 + variar(semente, 13, 5) * 10) * (1 - (1 - k) ** 3);
    const queda = k * k * 26;
    const vivo = (1 - k) ** 0.9;
    // clarão em volta do estouro
    ctx.globalAlpha = vivo * 0.22;
    const g = ctx.createRadialGradient(x, y, 0, x, y, raio * 1.1 + 1);
    g.addColorStop(0, cor);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - raio * 1.1 - 1, y - raio * 1.1 - 1, raio * 2.2 + 2, raio * 2.2 + 2);
    // os raios e a faísca na ponta de cada um
    ctx.globalAlpha = vivo;
    ctx.strokeStyle = cor;
    ctx.fillStyle = cor;
    ctx.lineWidth = 2.6 * (1 - k * 0.5);
    ctx.beginPath();
    const raios = 24;
    for (let j = 0; j < raios; j++) {
      const ang = (j / raios) * Math.PI * 2 + semente;
      const [cx, cy] = [Math.cos(ang), Math.sin(ang)];
      ctx.moveTo(x + cx * raio * 0.6, y + cy * raio * 0.6 + queda * 0.6);
      ctx.lineTo(x + cx * raio, y + cy * raio + queda);
    }
    ctx.stroke();
    ctx.beginPath();
    for (let j = 0; j < raios; j++) {
      const ang = (j / raios) * Math.PI * 2 + semente;
      ctx.moveTo(x + Math.cos(ang) * raio + 2.4, y + Math.sin(ang) * raio + queda);
      ctx.arc(x + Math.cos(ang) * raio, y + Math.sin(ang) * raio + queda, 2.4 * (1 - k * 0.6), 0, Math.PI * 2);
    }
    ctx.fill();
    // miolo que brilha logo no estouro
    if (k < 0.25) {
      ctx.globalAlpha = 1 - k * 4;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(x, y, 6 * (1 - k * 4), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Mar: faixa de água de `y` até `y + alt`, com riscos de onda que correm na velocidade `o`. */
export function mar(ctx: Ctx, w: number, y: number, alt: number, o: number, cor: string, espuma: string, t: number) {
  ctx.fillStyle = cor;
  ctx.fillRect(0, y, w, alt);
  ctx.strokeStyle = espuma;
  ctx.lineWidth = 1.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let fila = 0; fila < 4; fila++) {
    const yy = y + 5 + fila * (alt / 4);
    const esp = 46 + fila * 18;
    const desloc = o * (0.6 + fila * 0.25) + Math.sin(t * 0.8 + fila) * 6;
    for (let k = Math.floor(desloc / esp) - 1; k * esp - desloc < w + esp; k++) {
      const x = k * esp - desloc + variar(k + fila * 5, 17, 23);
      const L = 8 + fila * 4 + variar(k, 13, 7);
      ctx.moveTo(x, yy);
      ctx.lineTo(x + L, yy);
    }
  }
  ctx.globalAlpha = 0.6;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/**
 * Fileira de sobrados coloniais: um ou dois andares, beiral de telha, janelas com moldura e porta.
 * `cores` são as fachadas (sorteadas por posição); `acesas` (0 a 1) acende as janelas à noite.
 */
export function sobrados(ctx: Ctx, w: number, base: number, o: number, cores: string[], telhado: string, moldura: string, janela: string, acesas: number, escala = 1) {
  const esp = 64 * escala;
  repetir(w, o, esp, (x, k) => {
    const andares = 1 + variar(k, 7, 2);
    const larg = esp - 2;
    const altAndar = 30 * escala;
    const alt = andares * altAndar + 8 * escala;
    const topo = base - alt;
    ctx.fillStyle = cores[variar(k, 13, cores.length)];
    ctx.fillRect(x, topo, larg, alt);
    // beiral e telhado
    ctx.fillStyle = telhado;
    ctx.beginPath();
    ctx.moveTo(x - 4 * escala, topo + 2 * escala);
    ctx.lineTo(x + 6 * escala, topo - 9 * escala);
    ctx.lineTo(x + larg - 6 * escala, topo - 9 * escala);
    ctx.lineTo(x + larg + 4 * escala, topo + 2 * escala);
    ctx.fill();
    ctx.fillStyle = moldura;
    ctx.fillRect(x, topo, larg, 3 * escala);
    ctx.fillRect(x, base - 4 * escala, larg, 4 * escala);
    ctx.fillRect(x, topo, 3 * escala, alt);
    ctx.fillRect(x + larg - 3 * escala, topo, 3 * escala, alt);
    // janelas (no térreo, a do meio vira porta)
    for (let a = 0; a < andares; a++) {
      const yj = base - (a + 1) * altAndar + 4 * escala;
      for (let j = 0; j < 3; j++) {
        const xj = x + 8 * escala + j * 17 * escala;
        const porta = a === 0 && j === 1;
        const aj = porta ? altAndar - 4 * escala : 16 * escala;
        ctx.fillStyle = moldura;
        ctx.fillRect(xj - 1.5 * escala, yj - 1.5 * escala, 11 * escala, aj + 3 * escala);
        ctx.fillStyle = janela;
        ctx.fillRect(xj, yj, 8 * escala, aj);
        if (acesas > 0 && !porta && variar(k * 7 + a * 3 + j, 11, 3) > 0) {
          ctx.globalAlpha = acesas;
          ctx.fillStyle = "#ffd98a";
          ctx.fillRect(xj, yj, 8 * escala, aj);
          ctx.globalAlpha = 1;
        }
        // sacada de ferro no andar de cima
        if (a === 1) {
          ctx.fillStyle = moldura;
          ctx.fillRect(xj - 3 * escala, yj + aj - 1 * escala, 14 * escala, 2 * escala);
        }
      }
    }
  });
}

/** Lâmpadas de pisca-pisca nos `pontos`, acendendo em ondas com `t`. */
export function luzinhas(ctx: Ctx, pontos: [number, number][], t: number, cores: string[], r = 2.2) {
  pontos.forEach(([x, y], i) => {
    const acesa = 0.35 + 0.65 * Math.max(0, Math.sin(t * 3 - i * 0.7));
    ctx.globalAlpha = acesa;
    ctx.fillStyle = cores[i % cores.length];
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = acesa * 0.25;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.6, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

/**
 * Cavalo em silhueta, virado para a direita, a trote: as patas em pares cruzados, com joelho, o corpo subindo e
 * descendo, o pescoço arqueado, a cabeça comprida de focinho arredondado, as orelhas, a crina e o rabo ao vento.
 * `base` é o chão sob os cascos; com s = 1 o cavalo tem uns 46 px de comprimento.
 */
export function cavalo(ctx: Ctx, x: number, base: number, s: number, cor: string, t: number) {
  const passo = t * 7 + x * 0.05;
  const sobe = Math.abs(Math.sin(passo)) * 1.2 * s;
  const y0 = base - sobe;
  const P = (px: number, py: number): [number, number] => [x + px * s, y0 + py * s];
  ctx.fillStyle = cor;
  ctx.strokeStyle = cor;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // as patas: coxa e canela, com o joelho dobrando quando a pata sobe
  const pata = (ox: number, fase: number, dianteira: boolean) => {
    const a = Math.sin(passo + fase) * 0.42;
    const dobra = Math.max(0, Math.sin(passo + fase + Math.PI / 2)) * (dianteira ? -1 : 0.8);
    const [x1, y1] = P(ox, -17);
    const [x2, y2] = [x1 + Math.sin(a) * 8.5 * s, y1 + Math.cos(a) * 8.5 * s];
    const [x3, y3] = [x2 + Math.sin(a + dobra) * 8.5 * s, y2 + Math.cos(a + dobra) * 8.5 * s];
    ctx.lineWidth = 2.6 * s;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.stroke();
    ctx.fillRect(x3 - 1.6 * s, y3 - 1 * s, 3.4 * s, 1.8 * s);
  };
  pata(-11, 0, false);
  pata(10, Math.PI, true);
  pata(-8, Math.PI, false);
  pata(13, 0, true);
  // corpo: barriga, garupa e peito
  ctx.beginPath();
  ctx.ellipse(...P(0, -21), 15 * s, 7 * s, 0, 0, Math.PI * 2);
  ctx.moveTo(...P(-2, -21));
  ctx.arc(...P(-10, -22), 8 * s, 0, Math.PI * 2);
  ctx.moveTo(...P(18, -21));
  ctx.arc(...P(11, -21), 7 * s, 0, Math.PI * 2);
  ctx.fill();
  // o pescoço arqueado até a nuca, e a cabeça comprida descendo até o focinho
  ctx.beginPath();
  ctx.moveTo(...P(5, -26));
  ctx.quadraticCurveTo(...P(8, -38), ...P(14, -42));
  ctx.lineTo(...P(18, -41));
  ctx.quadraticCurveTo(...P(23, -38), ...P(28, -34));
  ctx.quadraticCurveTo(...P(30.5, -31.5), ...P(28.5, -29.5));
  ctx.lineTo(...P(25, -29.5));
  ctx.quadraticCurveTo(...P(21, -31), ...P(19, -33));
  ctx.quadraticCurveTo(...P(19, -26), ...P(17, -17));
  ctx.closePath();
  ctx.fill();
  // as orelhas, em pé
  ctx.beginPath();
  ctx.moveTo(...P(13.5, -41.5));
  ctx.lineTo(...P(14.5, -47));
  ctx.lineTo(...P(16.5, -41.5));
  ctx.moveTo(...P(15.5, -41.5));
  ctx.lineTo(...P(17.5, -46.5));
  ctx.lineTo(...P(18.5, -41));
  ctx.fill();
  // a crina e o rabo, balançando com o trote
  const vento = Math.sin(passo * 0.5) * 1.5;
  ctx.lineWidth = 1.6 * s;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const [cx, cy] = P(13 - i * 2, -41 + i * 3.2);
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx - (4 + vento) * s, cy + 2 * s);
  }
  ctx.stroke();
  ctx.lineWidth = 3 * s;
  ctx.beginPath();
  ctx.moveTo(...P(-17, -24));
  ctx.quadraticCurveTo(...P(-26, -24 + vento), ...P(-25, -10 + vento * 1.5));
  ctx.stroke();
}

/**
 * Cavaleiro em silhueta, num cavalo a trote; de quepe se `quepe`, senão de chapéu de aba.
 * Com `erguido`, o braço da frente vai para o alto (para a espada ou o chapéu); devolve a posição dessa mão.
 */
export function cavaleiro(ctx: Ctx, x: number, base: number, s: number, cor: string, t: number, quepe = true, erguido = false): [number, number] {
  cavalo(ctx, x, base, s, cor, t);
  const sobe = Math.abs(Math.sin(t * 7 + x * 0.05)) * 1.2 * s;
  const P = (px: number, py: number): [number, number] => [x + px * s, base - sobe + py * s];
  ctx.strokeStyle = cor;
  ctx.fillStyle = cor;
  ctx.lineCap = "round";
  // a perna do cavaleiro, o tronco e a cabeça
  ctx.lineWidth = 3 * s;
  ctx.beginPath();
  ctx.moveTo(...P(0, -28));
  ctx.lineTo(...P(5, -22));
  ctx.lineTo(...P(3, -15));
  ctx.stroke();
  ctx.lineWidth = 5 * s;
  ctx.beginPath();
  ctx.moveTo(...P(0, -28));
  ctx.lineTo(...P(1.5, -40));
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(...P(2.5, -45), 3.4 * s, 0, Math.PI * 2);
  ctx.fill();
  // as rédeas na mão de trás; a da frente segura também, ou vai para o alto
  ctx.lineWidth = 2.2 * s;
  ctx.beginPath();
  ctx.moveTo(...P(1, -37));
  ctx.lineTo(...P(8, -31));
  ctx.stroke();
  const mao = erguido ? P(9, -52) : P(9, -32);
  ctx.beginPath();
  ctx.moveTo(...P(1.5, -38));
  if (erguido) ctx.lineTo(...P(6, -45));
  ctx.lineTo(...mao);
  ctx.stroke();
  ctx.lineWidth = 0.8 * s;
  ctx.beginPath();
  ctx.moveTo(...P(8, -31));
  ctx.lineTo(...P(17, -38));
  ctx.stroke();
  if (quepe) ctx.fillRect(...P(-0.5, -52.5), 6 * s, 5 * s);
  else {
    ctx.fillRect(...P(-3.5, -48.5), 12 * s, 1.8 * s);
    ctx.fillRect(...P(-0.5, -52.5), 6 * s, 4.5 * s);
  }
  return mao;
}

/** Pose de uma figura: ângulos em radianos. Pernas e braços: 0 = para baixo, positivo = para a frente (direita). Tronco: 0 = em pé. */
export interface Pose {
  tronco?: number;
  bracoE?: number;
  bracoD?: number;
  pernaE?: number;
  pernaD?: number;
  /** dobra dos joelhos e cotovelos (0 = esticado) */
  dobra?: number;
}

/** Pessoa em silhueta (uns 40 px de altura com s = 1), com `base` no chão. Devolve a posição da mão direita. */
export function figura(ctx: Ctx, x: number, base: number, s: number, cor: string, pose: Pose = {}): [number, number] {
  const { tronco = 0, bracoE = 0.2, bracoD = -0.2, pernaE = 0.12, pernaD = -0.12, dobra = 0 } = pose;
  const quadril: [number, number] = [x, base - 19 * s];
  const membro = (o: [number, number], ang: number, L: number, larg: number, joelho: number): [number, number] => {
    const meio: [number, number] = [o[0] + Math.sin(ang) * L * 0.5, o[1] + Math.cos(ang) * L * 0.5];
    const a2 = ang + joelho;
    const fim: [number, number] = [meio[0] + Math.sin(a2) * L * 0.5, meio[1] + Math.cos(a2) * L * 0.5];
    ctx.lineWidth = larg;
    ctx.beginPath();
    ctx.moveTo(o[0], o[1]);
    ctx.lineTo(meio[0], meio[1]);
    ctx.lineTo(fim[0], fim[1]);
    ctx.stroke();
    return fim;
  };
  ctx.strokeStyle = cor;
  ctx.fillStyle = cor;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  membro(quadril, pernaE, 20 * s, 3.4 * s, -dobra);
  membro(quadril, pernaD, 20 * s, 3.4 * s, -dobra);
  const ombro: [number, number] = [x + Math.sin(tronco) * 14 * s, quadril[1] - Math.cos(tronco) * 14 * s];
  ctx.lineWidth = 5 * s;
  ctx.beginPath();
  ctx.moveTo(quadril[0], quadril[1]);
  ctx.lineTo(ombro[0], ombro[1]);
  ctx.stroke();
  membro(ombro, bracoE, 14 * s, 2.6 * s, dobra);
  const mao = membro(ombro, bracoD, 14 * s, 2.6 * s, dobra);
  ctx.beginPath();
  ctx.arc(ombro[0] + Math.sin(tronco) * 5 * s, ombro[1] - Math.cos(tronco) * 5 * s, 3.6 * s, 0, Math.PI * 2);
  ctx.fill();
  return mao;
}

/** Prédios em silhueta com janelas: `acesas` (0 a 1) acende parte delas. `alt` é a altura média. */
export function predios(ctx: Ctx, w: number, base: number, o: number, cor: string, janela: string, acesas: number, alt = 90, esp = 46) {
  repetir(w, o, esp, (x, k) => {
    const a = alt * (0.55 + variar(k, 7919, 9) * 0.1);
    const l = esp - 4 - variar(k, 13, 3) * 4;
    ctx.fillStyle = cor;
    ctx.fillRect(x, base - a, l, a);
    if (acesas <= 0) return;
    ctx.fillStyle = janela;
    // as janelas acesas sorteadas pela posição no prédio (andar e coluna), para não piscarem com o cenário andando
    for (let yy = base - a + 6, andar = 0; yy < base - 8; yy += 9, andar++) {
      for (let xx = x + 4, col = 0; xx < x + l - 5; xx += 7, col++) {
        if (variar(k * 131 + andar * 17 + col, 31, 5) > 1) continue;
        ctx.globalAlpha = acesas;
        ctx.fillRect(xx, yy, 3, 4);
      }
    }
    ctx.globalAlpha = 1;
  });
}

/** Araucária: tronco reto e alto e a copa em taça, com os galhos virados para cima nas pontas. */
export function araucaria(ctx: Ctx, x: number, base: number, alt: number, cor: string) {
  const s = alt / 140;
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.moveTo(x - 3.5 * s, base);
  ctx.lineTo(x - 2 * s, base - alt + 20 * s);
  ctx.lineTo(x + 2 * s, base - alt + 20 * s);
  ctx.lineTo(x + 3.5 * s, base);
  ctx.fill();
  // três andares de galhos em taça, o de cima o mais largo
  for (let i = 0; i < 3; i++) {
    const y = base - alt + 8 * s + i * 17 * s;
    const larg = (44 - i * 11) * s;
    const esp = (9 - i * 1.5) * s;
    ctx.beginPath();
    ctx.moveTo(x - larg, y - 9 * s);
    ctx.quadraticCurveTo(x - larg * 0.55, y + esp * 0.6, x, y + esp * 0.4);
    ctx.quadraticCurveTo(x + larg * 0.55, y + esp * 0.6, x + larg, y - 9 * s);
    ctx.quadraticCurveTo(x + larg * 0.5, y - esp * 0.5, x, y - esp * 0.7);
    ctx.quadraticCurveTo(x - larg * 0.5, y - esp * 0.5, x - larg, y - 9 * s);
    ctx.fill();
    // os tufos das pontas, virados para cima
    for (const l of [-1, -0.5, 0.5, 1]) {
      ctx.beginPath();
      ctx.ellipse(x + l * larg * 0.92, y - (Math.abs(l) === 1 ? 10 : 5) * s, 7 * s, 4 * s, l * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Cachoeira: a queda d'água de `topo` até `base`, com riscos que descem e a névoa no pé. */
export function cachoeira(ctx: Ctx, x: number, topo: number, larg: number, base: number, t: number, agua: string, espuma: string) {
  ctx.fillStyle = agua;
  ctx.fillRect(x, topo, larg, base - topo);
  ctx.strokeStyle = espuma;
  ctx.lineWidth = 1.4;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  const alt = base - topo;
  for (let i = 0; i < larg / 5; i++) {
    const cx = x + 2 + i * 5 + variar(i, 7, 3);
    const fase = ((t * 1.4 + variar(i, 13, 10) / 10) % 1) * alt;
    for (let y = topo + fase - alt; y < base; y += alt / 2.5) {
      if (y + 16 < topo) continue;
      ctx.moveTo(cx, Math.max(topo, y));
      ctx.lineTo(cx, Math.min(base, y + 18));
    }
  }
  ctx.stroke();
  // névoa no pé da queda
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = espuma;
  for (let i = 0; i < 5; i++) {
    const r = larg * 0.22 + Math.sin(t * 2 + i) * 3;
    ctx.beginPath();
    ctx.arc(x + (i + 0.5) * (larg / 5), base - 2, Math.max(2, r), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/**
 * Chapada (mesa de arenito): o topo plano de borda irregular, com a mata em tufos; o paredão em degradê, mais claro no
 * alto, com as caneluras verticais da erosão e os estratos ondulados e falhados; e a encosta de detritos coberta de
 * vegetação no pé. O topo fica em `base - alt`, de `x` a `x + larg`.
 */
export function chapada(ctx: Ctx, x: number, base: number, larg: number, alt: number, cor: string, sombra: string, mata: string, k: number) {
  const topo = base - alt;
  const pe = base - alt * 0.26; // onde o paredão acaba e começa a encosta de detritos
  const n = Math.max(6, Math.round(larg / 22));
  const borda: [number, number][] = [];
  for (let i = 0; i <= n; i++) borda.push([x + 6 + (i / n) * (larg - 12), topo + (variar(k + i, 11, 3) - 1) * 2 + (variar(k + i, 7, 6) === 0 ? 5 : 0)]);
  const contorno = () => {
    ctx.beginPath();
    ctx.moveTo(x - 40, base);
    ctx.quadraticCurveTo(x - 14, pe + 8, x - 2, pe);
    ctx.lineTo(x + 2, topo + 12);
    ctx.quadraticCurveTo(x + 2, topo + 1, x + 7, topo);
    for (const [bx, by] of borda) ctx.lineTo(bx, by);
    ctx.quadraticCurveTo(x + larg - 2, topo + 1, x + larg - 2, topo + 14);
    ctx.lineTo(x + larg + 2, pe);
    ctx.quadraticCurveTo(x + larg + 16, pe + 8, x + larg + 44, base);
    ctx.closePath();
  };
  const g = ctx.createLinearGradient(0, topo, 0, base);
  g.addColorStop(0, cor);
  g.addColorStop(0.45, cor);
  g.addColorStop(1, sombra);
  ctx.fillStyle = g;
  contorno();
  ctx.fill();
  ctx.save();
  contorno();
  ctx.clip();
  // as caneluras: faixas de sombra de larguras e comprimentos variados, que afinam para baixo. Três tons, cada um num
  // caminho só: são dezenas de faixas, e um preenchimento por faixa pesava no quadro (os paredões largos, como o do
  // Jalapão, têm umas setenta)
  ctx.fillStyle = sombra;
  for (let tom = 0; tom < 3; tom++) {
    ctx.globalAlpha = 0.28 + tom * 0.1;
    ctx.beginPath();
    for (let i = 0; i < larg / 13; i++) {
      if (variar(k + i, 23, 3) !== tom) continue;
      const cx = x + 8 + i * 13 + variar(k + i, 13, 7);
      const lw = 2.5 + variar(k + i, 17, 4) * 1.6;
      const comp = (pe - topo) * (0.4 + variar(k + i, 19, 5) * 0.13);
      ctx.moveTo(cx - lw / 2, topo + 4);
      ctx.lineTo(cx + lw / 2, topo + 4);
      ctx.lineTo(cx + lw * 0.15, topo + 4 + comp);
      ctx.lineTo(cx - lw * 0.1, topo + 10 + comp);
      ctx.closePath();
    }
    ctx.fill();
  }
  // a luz do sol nas arestas entre algumas caneluras
  ctx.fillStyle = "#ffffff";
  ctx.globalAlpha = 0.1;
  ctx.beginPath();
  for (let i = 0; i < larg / 26; i++) {
    const cx = x + 14 + i * 26 + variar(k + i, 29, 9);
    ctx.rect(cx, topo + 4, 2, (pe - topo) * (0.3 + variar(k + i, 31, 4) * 0.12));
  }
  ctx.fill();
  // os estratos do arenito: linhas onduladas, com falhas (as três num traço só)
  ctx.globalAlpha = 0.32;
  ctx.strokeStyle = sombra;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let j = 1; j <= 3; j++) {
    const yj = topo + (pe - topo) * (j / 4) + variar(k + j, 7, 5) - 2;
    for (let xx = x; xx <= x + larg + 16; xx += 16) {
      const yy = yj + Math.sin((xx + k * 37) * 0.035 + j * 1.7) * 2.6;
      if (xx === x || variar(Math.round(xx) + j * 7 + k, 29, 6) === 0) ctx.moveTo(xx, yy);
      else ctx.lineTo(xx, yy);
    }
  }
  ctx.stroke();
  // a encosta de detritos, mais escura
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = sombra;
  ctx.fillRect(x - 40, pe, larg + 90, base - pe);
  ctx.globalAlpha = 1;
  ctx.restore();
  // a vegetação subindo pela encosta, em tufos irregulares, e cobrindo o pé
  ctx.fillStyle = mata;
  ctx.beginPath();
  ctx.moveTo(x - 40, base);
  for (let i = 0; i <= (larg + 84) / 15; i++) {
    const vx = x - 40 + i * 15;
    const meio = 1 - Math.abs((vx - (x + larg / 2)) / (larg / 2 + 40));
    ctx.lineTo(vx, base - (base - pe) * (0.35 + meio * 0.35) - variar(k + i, 37, 4) * 3);
  }
  ctx.lineTo(x + larg + 44, base);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < (larg + 80) / 18; i++) {
    const vx = x - 30 + i * 18 + variar(k + i, 41, 8);
    const meio = 1 - Math.abs((vx - (x + larg / 2)) / (larg / 2 + 40));
    const vy = base - (base - pe) * (0.35 + meio * 0.35);
    const r = 5 + variar(k + i, 43, 4) * 2;
    // só em cima da faixa de mata: na ponta dela, a moita ficava solta no ar
    if (vx - r < x - 36 || vx + r > x + larg + 40) continue;
    ctx.moveTo(vx + r, vy);
    ctx.arc(vx, vy, r, 0, Math.PI, true);
  }
  ctx.fill();
  // a mata do topo: tufos de tamanhos variados ao longo da borda, alguns mais altos (num caminho só)
  ctx.beginPath();
  for (let i = 0; i < borda.length; i++) {
    const [bx, by] = borda[i]!;
    const v = variar(k + i, 47, 4);
    const ex = bx + variar(k + i, 53, 7) - 3;
    const rx = 8 + v * 3;
    ctx.moveTo(ex + rx, by + 1.5);
    ctx.ellipse(ex, by + 1.5, rx, 3.5 + v * 2.2, 0, 0, Math.PI, true);
    if (v === 3) {
      ctx.moveTo(bx + 11, by - 4);
      ctx.arc(bx + 6, by - 4, 5, 0, Math.PI * 2);
    }
  }
  ctx.fill();
}

/** Jangada: o casco raso de troncos e a vela triangular, balançando nas ondas. */
export function jangada(ctx: Ctx, x: number, y: number, s: number, vela: string, casco: string, t: number) {
  const bal = Math.sin(t * 1.6 + x * 0.01) * 0.05;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(bal);
  ctx.fillStyle = casco;
  ctx.fillRect(-22 * s, -3 * s, 44 * s, 5 * s);
  ctx.fillRect(-1 * s, -44 * s, 2 * s, 41 * s);
  ctx.fillStyle = vela;
  ctx.beginPath();
  ctx.moveTo(1 * s, -44 * s);
  ctx.quadraticCurveTo(14 * s, -24 * s, 20 * s, -6 * s);
  ctx.lineTo(1 * s, -6 * s);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (let i = 1; i < 4; i++) {
    ctx.moveTo(1 * s, (-44 + i * 9.5) * s);
    ctx.lineTo((1 + i * 4.6) * s, (-44 + i * 9.5) * s);
  }
  ctx.stroke();
  ctx.restore();
}

/** Dunas: cristas de areia com o lado do vento claro e o de sotavento na sombra. */
export function dunas(ctx: Ctx, w: number, base: number, o: number, alt: number, cor: string, sombra: string, esp = 260) {
  repetir(w, o, esp, (x, k) => {
    const a = alt * (0.7 + variar(k, 7, 4) * 0.12);
    const crista = x + esp * (0.55 + variar(k, 13, 3) * 0.06);
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.moveTo(x - esp * 0.25, base);
    ctx.quadraticCurveTo(x + esp * 0.2, base - a * 0.5, crista, base - a);
    ctx.quadraticCurveTo(crista + esp * 0.25, base - a * 0.4, x + esp * 1.25, base);
    ctx.fill();
    ctx.fillStyle = sombra;
    ctx.beginPath();
    ctx.moveTo(crista, base - a);
    ctx.quadraticCurveTo(crista + esp * 0.18, base - a * 0.45, crista + esp * 0.5, base);
    ctx.lineTo(crista + esp * 0.1, base);
    ctx.quadraticCurveTo(crista + esp * 0.04, base - a * 0.5, crista, base - a);
    ctx.fill();
  });
}

/** Farol listrado com a lanterna; à noite, o facho gira. */
export function farol(ctx: Ctx, x: number, base: number, alt: number, cor: string, faixa: string, t: number, acesa: number) {
  const larg0 = alt * 0.16;
  const larg1 = alt * 0.1;
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.moveTo(x - larg0 / 2, base);
  ctx.lineTo(x - larg1 / 2, base - alt);
  ctx.lineTo(x + larg1 / 2, base - alt);
  ctx.lineTo(x + larg0 / 2, base);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = faixa;
  for (let i = 1; i < 5; i += 2) ctx.fillRect(x - larg0, base - (alt * (i + 1)) / 5, larg0 * 2, alt / 5);
  ctx.restore();
  ctx.fillStyle = "#2a2a2a";
  ctx.fillRect(x - larg1 * 0.7, base - alt - 4, larg1 * 1.4, 4);
  ctx.fillStyle = acesa > 0.3 ? "#fff2a0" : "#9ab8cc";
  ctx.fillRect(x - larg1 * 0.4, base - alt - 14, larg1 * 0.8, 10);
  ctx.fillStyle = "#2a2a2a";
  ctx.beginPath();
  ctx.moveTo(x - larg1 * 0.6, base - alt - 14);
  ctx.lineTo(x, base - alt - 22);
  ctx.lineTo(x + larg1 * 0.6, base - alt - 14);
  ctx.fill();
  if (acesa > 0.3) {
    const a = t * 1.2;
    ctx.fillStyle = `rgba(255,242,160,${0.22 * acesa})`;
    ctx.beginPath();
    ctx.moveTo(x, base - alt - 9);
    ctx.lineTo(x + Math.cos(a) * 260, base - alt - 9 + Math.sin(a) * 30 - 16);
    ctx.lineTo(x + Math.cos(a) * 260, base - alt - 9 + Math.sin(a) * 30 + 16);
    ctx.fill();
  }
}

const padroes = new WeakMap<Ctx, Map<string, CanvasPattern | null>>();

/**
 * Padrão repetido (um ladrilho de `larg` × `alt`) desenhado uma vez só e guardado por contexto: para texturas miúdas
 * de coluna, que sairiam caras se fossem redesenhadas peça por peça a cada quadro. O padrão começa no (0, 0) do
 * transform atual, então acompanha a coluna.
 */
export function ladrilho(ctx: Ctx, chave: string, larg: number, alt: number, desenhar: (c: Ctx) => void): CanvasPattern | string {
  let mapa = padroes.get(ctx);
  if (!mapa) {
    mapa = new Map();
    padroes.set(ctx, mapa);
  }
  let p = mapa.get(chave);
  if (p === undefined) {
    const nitidez = 3;
    const tela = document.createElement("canvas");
    tela.width = Math.round(larg * nitidez);
    tela.height = Math.round(alt * nitidez);
    const c = tela.getContext("2d");
    if (c) {
      c.scale(tela.width / larg, tela.height / alt);
      desenhar(c);
    }
    p = c ? ctx.createPattern(tela, "repeat") : null;
    p?.setTransform(new DOMMatrix().scale(larg / tela.width, alt / tela.height));
    mapa.set(chave, p);
  }
  return p ?? "#888888";
}

/** Ave planando em silhueta (urubu, gaivota, garça de longe): as duas asas em arco; `bate` (−1 a 1) dobra as asas. */
export function ave(ctx: Ctx, x: number, y: number, s: number, bate: number) {
  const dobra = bate * 3 * s;
  ctx.beginPath();
  ctx.moveTo(x - 14 * s, y + dobra);
  ctx.quadraticCurveTo(x - 7 * s, y - 5 * s - dobra, x, y);
  ctx.quadraticCurveTo(x + 7 * s, y - 5 * s - dobra, x + 14 * s, y + dobra);
  ctx.quadraticCurveTo(x + 7 * s, y - 2 * s - dobra, x, y + 2 * s);
  ctx.quadraticCurveTo(x - 7 * s, y - 2 * s - dobra, x - 14 * s, y + dobra);
  ctx.fill();
}

/** As cores de um boi: o corpo, a cara (branca no Hereford; sem ela, igual ao corpo) e a mancha do lombo (opcional). */
export interface CoresBoi {
  corpo: string;
  cara?: string;
  mancha?: string;
}

/**
 * Boi (ou vaca) de perfil, virado para a direita: o corpo em barril, a barbela, as quatro patas com joelho e casco (as
 * do outro lado mais escuras), o pescoço, a cabeça com o focinho, a orelha, o olho e os chifres curtos e claros, e o
 * rabo com o tufo, que abana. `pasta` (0 a 1) abaixa a cabeça até o capim; `passo` anda as patas (sem ele, parado).
 * Com s = 1 o boi tem uns 46 px de comprido e 30 de alto.
 */
export function boi(ctx: Ctx, x: number, base: number, s: number, cores: CoresBoi, t: number, k: number, pasta = 0, passo?: number) {
  const corpo = cores.corpo;
  const sombra = "rgba(0,0,0,0.28)";
  ctx.save();
  ctx.translate(x, base);
  ctx.scale(s, s);
  const pata = (px: number, fase: number, escura: boolean) => {
    const a = passo === undefined ? 0 : Math.sin(passo + fase) * 0.35;
    ctx.save();
    ctx.translate(px, -16);
    ctx.rotate(a);
    ctx.fillStyle = corpo;
    ctx.beginPath();
    ctx.moveTo(-3, 0);
    ctx.lineTo(3, 0);
    ctx.lineTo(2.2, 9);
    ctx.lineTo(2, 15);
    ctx.lineTo(-1.6, 15);
    ctx.lineTo(-2, 9);
    ctx.closePath();
    ctx.fill();
    if (escura) {
      ctx.fillStyle = sombra;
      ctx.fill();
    }
    ctx.fillStyle = "#2a1a10";
    ctx.fillRect(-2, 14, 4.4, 2.2);
    ctx.restore();
  };
  // as patas do outro lado
  pata(-13, Math.PI, true);
  pata(12, 0, true);
  // o rabo, abanando, com o tufo na ponta
  const abana = Math.sin(t * 3 + k * 1.7) * 3;
  ctx.strokeStyle = corpo;
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-20, -27);
  ctx.quadraticCurveTo(-24 + abana * 0.3, -18, -22 + abana, -9);
  ctx.stroke();
  ctx.fillStyle = "#2a1a10";
  ctx.beginPath();
  ctx.ellipse(-22 + abana, -8, 1.8, 3, 0.2, 0, Math.PI * 2);
  ctx.fill();
  // o corpo: o lombo reto, a garupa redonda atrás, o peito fundo e a barbela na frente
  ctx.fillStyle = corpo;
  ctx.beginPath();
  ctx.moveTo(-20, -28);
  ctx.quadraticCurveTo(-4, -31, 12, -30);
  ctx.quadraticCurveTo(18, -30, 19, -24);
  ctx.quadraticCurveTo(20, -16, 16, -14);
  ctx.quadraticCurveTo(0, -12, -16, -14);
  ctx.quadraticCurveTo(-23, -16, -22, -23);
  ctx.quadraticCurveTo(-22, -27, -20, -28);
  ctx.fill();
  if (cores.mancha) {
    ctx.fillStyle = cores.mancha;
    ctx.beginPath();
    ctx.ellipse(-6 + (k % 3) * 3, -23, 7, 4.5, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  // a barriga mais escura
  ctx.fillStyle = sombra;
  ctx.beginPath();
  ctx.ellipse(-2, -14.5, 15, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
  // o pescoço e a cabeça: erguida ou abaixada no capim
  const desce = Math.max(0, Math.min(1, pasta));
  const cx = 26 + desce * 2;
  const cy = -27 + desce * 22;
  ctx.fillStyle = corpo;
  ctx.beginPath();
  ctx.moveTo(14, -29);
  ctx.quadraticCurveTo(cx - 4, cy - 6, cx - 1, cy - 3);
  ctx.lineTo(cx + 1, cy + 4);
  ctx.quadraticCurveTo(cx - 8, cy + 6, 17, -15);
  ctx.closePath();
  ctx.fill();
  // a barbela pendendo do pescoço
  ctx.beginPath();
  ctx.moveTo(16, -17);
  ctx.quadraticCurveTo(cx - 7, cy + 9 - desce * 4, cx - 2, cy + 4);
  ctx.lineTo(17, -15);
  ctx.fill();
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(0.35 + desce * 0.9);
  ctx.fillStyle = cores.cara ?? corpo;
  ctx.beginPath();
  ctx.moveTo(-4, -4);
  ctx.quadraticCurveTo(2, -6, 8, -2);
  ctx.quadraticCurveTo(11, 1, 9, 4);
  ctx.quadraticCurveTo(4, 6, -3, 4);
  ctx.closePath();
  ctx.fill();
  // o focinho, o olho, a orelha e os chifres
  ctx.fillStyle = "#3a2a24";
  ctx.beginPath();
  ctx.ellipse(9, 1.4, 2.2, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a120c";
  ctx.beginPath();
  ctx.arc(1.4, -1.6, 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = corpo;
  ctx.beginPath();
  ctx.ellipse(-4.5, -3.4, 3.2, 1.4, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#e8dcc0";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-2, -4.5);
  ctx.quadraticCurveTo(-3, -8, 0, -9);
  ctx.stroke();
  ctx.restore();
  // as patas deste lado
  pata(-10, 0, false);
  pata(15, Math.PI, false);
  ctx.restore();
}

/**
 * Boneco de neve: as três bolas com a sombra azulada, os olhos e os botões de carvão, o nariz de cenoura, a cartola e
 * o cachecol listrado enrolado no pescoço, com as duas pontas pendendo e balançando com o vento (franjas na ponta).
 * `base` é o chão; com s = 1 ele tem uns 70 px de alto.
 */
export function bonecoDeNeve(ctx: Ctx, x: number, base: number, s: number, neve: string, t: number, cachecol = "#c8322f", listra = "#f4efe6") {
  ctx.save();
  ctx.translate(x, base);
  ctx.scale(s, s);
  // as bolas
  for (const [y, r] of [[-15, 15], [-39, 11], [-56, 8.5]] as const) {
    ctx.fillStyle = neve;
    ctx.beginPath();
    ctx.arc(0, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(120,150,200,0.22)";
    ctx.beginPath();
    ctx.arc(3, y + 2, r * 0.85, -0.6, 1.9);
    ctx.fill();
  }
  // os botões e o rosto
  ctx.fillStyle = "#2a2a34";
  for (const y of [-42, -35, -20, -12]) {
    ctx.beginPath();
    ctx.arc(0.5, y, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const ox of [-3, 3]) {
    ctx.beginPath();
    ctx.arc(ox, -58, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = 0.3 + (i / 4) * 2.5;
    ctx.moveTo(Math.cos(a) * 4.6 + 0.8, -55 + Math.sin(a) * 3.4);
    ctx.arc(Math.cos(a) * 4.6, -55 + Math.sin(a) * 3.4, 0.8, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.fillStyle = "#ff8a1a";
  ctx.beginPath();
  ctx.moveTo(1, -57.5);
  ctx.lineTo(11, -55.8);
  ctx.lineTo(1, -54.2);
  ctx.closePath();
  ctx.fill();
  // a cartola
  ctx.fillStyle = "#1e1e28";
  ctx.fillRect(-9, -65.5, 18, 2.4);
  ctx.fillRect(-6, -76, 12, 10.6);
  ctx.fillStyle = cachecol;
  ctx.fillRect(-6, -68.5, 12, 2);
  // o cachecol: a volta em torno do pescoço (curva, acompanhando a bola) e as duas pontas ao vento
  const vento = Math.sin(t * 4 + x * 0.01);
  const ponta = (ox: number, comp: number, fase: number) => {
    const balanca = Math.sin(t * 4 + fase) * 3 + vento * 2;
    ctx.fillStyle = cachecol;
    ctx.beginPath();
    ctx.moveTo(ox - 2.5, -48);
    ctx.quadraticCurveTo(ox - 4 + balanca * 0.4, -48 + comp * 0.5, ox - 5 + balanca, -48 + comp);
    ctx.lineTo(ox + 1 + balanca, -48 + comp);
    ctx.quadraticCurveTo(ox + 2 + balanca * 0.4, -48 + comp * 0.5, ox + 2.5, -48);
    ctx.closePath();
    ctx.fill();
    // as listras e a franja
    ctx.strokeStyle = listra;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (const f of [0.35, 0.65]) {
      ctx.moveTo(ox - 3 + balanca * f * 0.8, -48 + comp * f);
      ctx.lineTo(ox + 1.6 + balanca * f * 0.8, -48 + comp * f);
    }
    ctx.stroke();
    ctx.strokeStyle = cachecol;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const fx = ox - 4.4 + balanca + i * 1.7;
      ctx.moveTo(fx, -48 + comp);
      ctx.lineTo(fx - 0.6 + vento * 0.6, -48 + comp + 3);
    }
    ctx.stroke();
  };
  ponta(-5, 16, 0);
  ponta(-1, 12, 1.3);
  ctx.fillStyle = cachecol;
  ctx.beginPath();
  ctx.moveTo(-9, -50);
  ctx.quadraticCurveTo(0, -45.5, 9, -50);
  ctx.lineTo(9, -46);
  ctx.quadraticCurveTo(0, -41.5, -9, -46);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = listra;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  for (const lx of [-5, 0, 5]) {
    ctx.moveTo(lx, -48.6 + Math.abs(lx) * 0.12);
    ctx.lineTo(lx + 0.4, -44.4 + Math.abs(lx) * 0.12);
  }
  ctx.stroke();
  // os braços de graveto
  ctx.strokeStyle = "#6a4a2a";
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-10, -40);
  ctx.lineTo(-22, -48 + vento);
  ctx.moveTo(-18, -45.5 + vento * 0.8);
  ctx.lineTo(-20, -51 + vento);
  ctx.moveTo(10, -40);
  ctx.lineTo(21, -46);
  ctx.moveTo(17, -44);
  ctx.lineTo(19, -49);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Surpresas (easter eggs): `f` vai de 0 a 1 enquanto a surpresa está na tela (ver surpresa.ts)
// ---------------------------------------------------------------------------

/** Posição x de algo que atravessa a tela da esquerda para a direita durante a surpresa. */
export const atravessa = (w: number, f: number, margem = 160) => -margem + f * (w + 2 * margem);

/** Opacidade da surpresa: aparece e some suavemente nas pontas. */
export const surge = (f: number) => Math.max(0, Math.min(1, f * 6, (1 - f) * 6));

/** Letreiro grande com contorno, centrado em (x, y). */
export function letreiro(ctx: Ctx, texto: string, x: number, y: number, tamanho: number, cor: string, contorno: string, fonte = "900 {t}px system-ui, sans-serif") {
  ctx.font = fonte.replace("{t}", String(tamanho));
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = tamanho * 0.16;
  ctx.strokeStyle = contorno;
  ctx.strokeText(texto, x, y);
  ctx.fillStyle = cor;
  ctx.fillText(texto, x, y);
}
