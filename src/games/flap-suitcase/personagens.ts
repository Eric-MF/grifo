// Personagens desenhados proceduralmente, no mesmo traço da maleta: asas, contornos e cores do estilo.
import { asas, maletaPadrao, type Ctx, type Tema } from "./themes";

function corpoBase(c: Ctx, tema: Tema, fase: number, t: number) {
  (tema.maleta ?? ((x: Ctx, f: number, tt: number) => maletaPadrao(x, f, tt, tema)))(c, fase, t, tema);
}

function estrela(c: Ctx, cx: number, cy: number, externo: number, interno: number) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? interno : externo;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.closePath();
}

const ACESSORIOS: Record<string, (c: Ctx, tema: Tema) => void> = {
  delegado(c) {
    c.fillStyle = "#1b2a4a";
    c.strokeStyle = "#0b1224";
    c.lineWidth = 2;
    c.beginPath();
    c.roundRect(-17, -30, 34, 14, 5);
    c.fill();
    c.stroke();
    c.beginPath();
    c.roundRect(-23, -19, 46, 5, 2);
    c.fill();
    c.stroke();
    c.fillStyle = "#f2c94c";
    estrela(c, 0, -4, 6, 2.6);
    c.fill();
    c.stroke();
  },
  defensor(c) {
    c.fillStyle = "#1c1c1c";
    c.strokeStyle = "#000";
    c.lineWidth = 2;
    c.beginPath();
    c.roundRect(-23, -16, 46, 32, 6);
    c.fill();
    c.stroke();
    c.fillStyle = "#f7f4ec";
    c.beginPath();
    c.moveTo(-10, -16);
    c.lineTo(0, -4);
    c.lineTo(10, -16);
    c.closePath();
    c.fill();
    c.fillRect(-7, -4, 5, 20);
    c.fillRect(2, -4, 5, 20);
  },
  juiz(c) {
    c.fillStyle = "#f4f1ea";
    c.strokeStyle = "#b9b2a2";
    c.lineWidth = 1.5;
    for (const [x, y, r] of [
      [-16, -14, 6],
      [-9, -22, 6.5],
      [0, -25, 7],
      [9, -22, 6.5],
      [16, -14, 6],
    ]) {
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }
    c.save();
    c.translate(30, -6);
    c.rotate(-0.5);
    c.fillStyle = "#8a5a2b";
    c.strokeStyle = "#4a2e14";
    c.fillRect(-16, -1, 30, 3);
    c.beginPath();
    c.roundRect(-18, -8, 10, 12, 2);
    c.fill();
    c.stroke();
    c.restore();
  },
  promotor(c) {
    c.fillStyle = "#1d2c4a";
    c.strokeStyle = "#0b1224";
    c.lineWidth = 2;
    c.beginPath();
    c.roundRect(-23, -16, 46, 32, 6);
    c.fill();
    c.stroke();
    c.fillStyle = "#b3262e";
    c.beginPath();
    c.moveTo(-3, -15);
    c.lineTo(3, -15);
    c.lineTo(5, -4);
    c.lineTo(0, 2);
    c.lineTo(-5, -4);
    c.closePath();
    c.fill();
    c.fillStyle = "#f1e6c8";
    c.strokeStyle = "#8b7a52";
    c.beginPath();
    c.roundRect(-36, 4, 18, 13, 2);
    c.fill();
    c.stroke();
  },
};

// Asas da balança: presas nas pontas do travessão (os "ombros", em y -34). A raiz fica no ombro e as
// penas saem dali, a mais longa na ponta; o bater gira a asa inteira em torno do ombro.
function asasDoOmbro(c: Ctx, fase: number, tema: Tema) {
  const a = tema.paleta.asa;
  const bate = Math.sin(fase) * 0.55;
  for (const lado of [-1, 1]) {
    c.save();
    c.translate(lado * 22, -34);
    c.scale(lado, 1);
    c.rotate(-0.5 + bate);
    c.lineWidth = 1.4;
    c.strokeStyle = a.contorno;
    c.fillStyle = a.cor;
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      c.ellipse(7 + i * 5.5, 0, 8 + i * 2.5, 5.5, i * 0.12, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }
    c.restore();
  }
}

// Balança da Justiça inteira, sem maleta: coluna, degraus, travessão balançando e dois pratos.
// Coordenadas: pivô em (0,-34); pedestal até y=16; ocupa cerca de x ±28 e y -40..16.
function balanca(c: Ctx, tema: Tema, fase: number) {
  asasDoOmbro(c, fase, tema);
  const m = tema.paleta.maleta;
  c.save();
  c.lineCap = "round";
  c.lineJoin = "round";
  const forma = (desenha: () => void) => {
    c.fillStyle = m.fivela;
    c.strokeStyle = m.escuro;
    c.lineWidth = 2;
    c.beginPath();
    desenha();
    c.fill();
    c.stroke();
  };
  const fio = (desenha: () => void, largura: number, cor: string) => {
    c.strokeStyle = cor;
    c.lineWidth = largura;
    c.beginPath();
    desenha();
    c.stroke();
  };
  // Linha de ouro com contorno escuro, como nas partes metálicas da maleta.
  const ouro = (desenha: () => void, largura: number) => {
    fio(desenha, largura + 2.5, m.escuro);
    fio(desenha, largura, m.fivela);
  };

  forma(() => c.roundRect(-2.5, -34, 5, 43, 2));
  forma(() => c.roundRect(-10, 6, 20, 4, 2));
  forma(() => c.roundRect(-15, 10, 30, 6, 2));
  forma(() => c.arc(0, -36.5, 3.5, 0, Math.PI * 2));

  // Travessão e pratos inclinam juntos; os pratos se mantêm na horizontal.
  const giro = Math.sin(fase) * 0.08;
  c.translate(0, -34);
  c.rotate(giro);
  ouro(() => {
    c.moveTo(-22, 0);
    c.lineTo(22, 0);
  }, 3);
  for (const x of [-22, 22]) {
    fio(
      () => {
        c.moveTo(x, 0);
        c.lineTo(x - 6, 18);
        c.moveTo(x, 0);
        c.lineTo(x + 6, 18);
      },
      1.2,
      m.escuro,
    );
    c.save();
    c.translate(x, 18);
    c.rotate(-giro);
    forma(() => {
      c.moveTo(-6, 0);
      c.arc(0, 0, 6, Math.PI, 0, true);
      c.closePath();
    });
    c.restore();
  }
  forma(() => c.arc(0, 0, 2.8, 0, Math.PI * 2));
  c.restore();
}

function codigo(c: Ctx, tema: Tema, fase: number) {
  asas(c, fase, tema);
  c.fillStyle = "#7a1f1f";
  c.strokeStyle = "#3d0e0e";
  c.lineWidth = 2;
  c.beginPath();
  c.roundRect(-17, -22, 34, 42, 3);
  c.fill();
  c.stroke();
  c.fillStyle = "#4d1212";
  c.fillRect(-17, -22, 6, 42);
  c.fillStyle = "#f4ecd8";
  c.fillRect(-15, 18, 30, 3);
  c.fillStyle = tema.paleta.maleta.fivela;
  c.fillRect(-7, -12, 20, 3);
  c.fillRect(-7, -6, 14, 2);
  c.fillStyle = "#d9a441";
  c.beginPath();
  c.moveTo(4, 19);
  c.lineTo(8, 19);
  c.lineTo(8, 28);
  c.lineTo(6, 25);
  c.lineTo(4, 28);
  c.closePath();
  c.fill();
}

// Versão minimalista de .examples/Imagens/Grifo.jpg, em coordenadas de canvas (x para a direita, y para baixo).
const GRIFO = {
  cauda: "M -17 9 C -28 15 -37 9 -32 -1",
  tufo: "M -29 1 C -37 0 -39 -6 -37 -13 C -35 -9 -33 -9 -32 -15 C -29 -10 -25 -8 -26 -2 Z",
  pernaLonge: "M 13 10 L 15 24 L 19 24 L 18 10 Z",
  peLonge: "M 13 25 C 15 22 21 22 24 24 L 26 27 L 23 27 L 21 28.5 L 18 27 L 15 28 Z",
  pataTrasLonge: "M -11 12 L -11 25 C -11 28 -3 28 -3 25 L -3 13 Z",
  pataTras: "M -19 10 L -19 26 C -19 29.5 -10 29.5 -10 26 L -10 12 Z",
  pernaFrente: "M 6 12 L 7 26 L 13 26 L 14 12 Z",
  corpo: "M -21 6 C -22 -2 -12 -5 0 -4 C 10 -3 17 4 16 13 C 15 18 10 19 6 18 C 0 16 -6 16 -11 18 C -17 20 -22 15 -21 6 Z",
  coxa: "M -10 3 C -6 9 -8 16 -13 18.5",
  pe: "M 4 27 C 6 24 14 24 18 26 L 22 29 L 18 29 L 17 31 L 14 29 L 11 31 L 9 29 L 5 30 Z",
  asa: "M -4 0 C -14 -4 -26 -14 -32 -28 L -24 -26 L -24 -40 L -16 -32 L -10 -44 C -4 -30 2 -14 2 -2 Z",
  asaSombra: "M -4 0 C -14 -4 -26 -14 -32 -28 L -24 -26 C -18 -16 -10 -8 -2 -4 Z",
  penas: "M -24 -26 C -18 -20 -12 -12 -6 -5 M -16 -32 C -12 -22 -7 -12 -2 -5",
  cabeca: "M 4 -8 C 2 -16 4 -24 12 -26 L 8 -32 L 15 -27 L 14 -34 L 20 -26 C 26 -24 28 -18 27 -12 L 24 -6 L 20 -4 L 22 2 L 16 0 L 15 6 L 10 2 L 8 6 C 4 2 4 -2 4 -8 Z",
  peitoSombra: "M 8 6 L 10 2 L 15 6 L 16 0 L 22 2 L 20 -4 C 16 -1 11 -1 6 -2 C 5 1 6 4 8 6 Z",
  bico: "M 25 -18 C 31 -19 35 -14 35 -8 C 35 -5 33 -3 32 -4 C 32 -8 30 -10 26 -10 Z",
  boca: "M 26 -10 L 31 -9",
  sobrancelha: "M 14 -22 L 25 -19 L 23 -17.5 L 15 -19.5 Z",
};
type ParteGrifo = keyof typeof GRIFO;
let grifoPaths: Record<ParteGrifo, Path2D> | undefined;

function grifo(c: Ctx, tema: Tema, fase: number) {
  const P = (grifoPaths ??= Object.fromEntries(
    Object.entries(GRIFO).map(([k, d]) => [k, new Path2D(d)]),
  ) as Record<ParteGrifo, Path2D>);
  const m = tema.paleta.maleta;
  const a = tema.paleta.asa;
  const pinta = (p: Path2D, cor: string, largura = 2) => {
    c.fillStyle = cor;
    c.fill(p);
    c.lineWidth = largura;
    c.strokeStyle = m.escuro;
    c.stroke(p);
  };
  const traco = (p: Path2D, cor: string, largura: number) => {
    c.strokeStyle = cor;
    c.lineWidth = largura;
    c.stroke(p);
  };
  const sombra = (p: Path2D) => {
    c.fillStyle = "rgba(40,20,0,0.22)";
    c.fill(p);
  };

  c.save();
  c.translate(0, -4);
  c.scale(0.85, 0.85);
  c.lineJoin = "round";
  c.lineCap = "round";

  traco(P.cauda, m.escuro, 6);
  traco(P.cauda, m.corpo, 3);
  pinta(P.tufo, m.corpo);
  pinta(P.pernaLonge, m.fivela);
  sombra(P.pernaLonge);
  pinta(P.peLonge, m.fivela, 1.6);
  sombra(P.peLonge);
  pinta(P.pataTrasLonge, m.corpo);
  sombra(P.pataTrasLonge);
  pinta(P.pataTras, m.corpo);
  pinta(P.pernaFrente, m.fivela);
  pinta(P.corpo, m.corpo);
  traco(P.coxa, m.escuro, 2);
  pinta(P.pe, m.fivela, 1.6);

  c.save();
  c.translate(-3, 0);
  c.rotate(Math.sin(fase) * 0.12);
  c.translate(3, 0);
  pinta(P.asa, a.cor);
  c.fillStyle = a.contorno;
  c.fill(P.asaSombra);
  traco(P.penas, a.contorno, 1.4);
  traco(P.asa, m.escuro, 2);
  c.restore();

  pinta(P.cabeca, a.cor);
  c.fillStyle = a.contorno;
  c.fill(P.peitoSombra);
  traco(P.cabeca, m.escuro, 2);
  pinta(P.bico, m.fivela, 1.8);
  traco(P.boca, m.escuro, 1.4);
  c.fillStyle = m.escuro;
  c.fill(P.sobrancelha);
  c.fillStyle = "#1b1408";
  c.beginPath();
  c.arc(19.5, -15, 2.6, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#ffffff";
  c.beginPath();
  c.arc(20.4, -15.9, 0.9, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

/** Desenha o personagem na origem (0,0). */
export function desenharPersonagem(c: Ctx, id: string, tema: Tema, fase: number, t: number) {
  if (id === "codigo") {
    codigo(c, tema, fase);
    return;
  }
  if (id === "grifo") {
    grifo(c, tema, fase);
    return;
  }
  if (id === "balanca") {
    balanca(c, tema, fase);
    return;
  }
  corpoBase(c, tema, fase, t);
  ACESSORIOS[id]?.(c, tema);
}
