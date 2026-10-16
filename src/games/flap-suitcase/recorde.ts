// Linha do recorde: corta a tela de cima a baixo na coluna em que a partida passou o recorde guardado,
// e mostra o aviso de recorde quebrado no estilo do tema.
import type { Ctx, MarcaRecorde } from "./themes";

/** Segundos em que o aviso de recorde quebrado fica na tela. */
export const DURACAO_AVISO = 3;

/**
 * A partida passou o recorde quando a pontuação supera o recorde guardado: a mesma regra do "Novo recorde!" do fim.
 * Pontuação zero não conta.
 */
export function quebrouRecorde(pontos: number, recorde: number): boolean {
  return pontos > recorde && pontos > 0;
}

/**
 * Chamada ao passar cada coluna. A primeira coluna em que a pontuação passa do recorde guarda a posição (x) dela;
 * depois disso a posição não muda, mesmo que a pontuação caia (penalidade) ou suba mais.
 */
export function marcarRecorde(marcaX: number | null, pontos: number, recorde: number, xColuna: number): number | null {
  if (marcaX !== null) return marcaX;
  return quebrouRecorde(pontos, recorde) ? xColuna : null;
}

/**
 * Linha de cima a baixo. Um traço escuro, um pouco mais largo, fica por baixo da cor do estilo:
 * assim a linha aparece sobre o céu, as colunas e o chão.
 */
export function desenharMarcaRecorde(c: Ctx, x: number, altura: number, marca: MarcaRecorde) {
  c.save();
  c.setLineDash(marca.traco);
  c.beginPath();
  c.moveTo(x, 0);
  c.lineTo(x, altura);
  c.strokeStyle = "rgba(3,17,44,0.6)";
  c.lineWidth = marca.largura + 2.5;
  c.stroke();
  c.strokeStyle = marca.cor;
  c.lineWidth = marca.largura;
  c.stroke();
  c.restore();
}

/**
 * Aviso de recorde quebrado, no alto da tela. Entra crescendo; depois o movimento é o do estilo:
 * pulsa (clássico, fofo, noir, papiro), pisca (retro, pixel) ou treme (steampunk). Some nos últimos 0,6 s.
 */
export function desenharAvisoRecorde(c: Ctx, marca: MarcaRecorde, largura: number, restante: number, t: number) {
  const { texto, fonte, corTexto, corContorno, corFundo, anima } = marca.aviso;
  const entrada = Math.min(1, (DURACAO_AVISO - restante) / 0.25);
  let alfa = Math.min(1, restante / 0.6);
  let escala = 0.6 + 0.4 * entrada;
  let deslocX = 0;
  if (anima === "pulsa") escala *= 1 + 0.04 * Math.sin(t * 6);
  if (anima === "pisca" && Math.floor(t * 6) % 2 === 0) alfa *= 0.35;
  if (anima === "treme") deslocX = Math.sin(t * 45) * 2.5;
  c.save();
  c.globalAlpha = alfa;
  c.translate(largura / 2 + deslocX, 120);
  c.scale(escala, escala);
  c.font = fonte;
  c.textAlign = "center";
  c.textBaseline = "middle";
  const w = c.measureText(texto).width + 36;
  const h = 46;
  c.beginPath();
  c.roundRect(-w / 2, -h / 2, w, h, 10);
  c.fillStyle = corFundo;
  c.fill();
  c.lineWidth = 2.5;
  c.strokeStyle = corContorno;
  c.stroke();
  c.fillStyle = corTexto;
  c.fillText(texto, 0, 1);
  c.restore();
}
