// Aura dos poderes, a trilha Visual das melhorias (melhorias.ts), junto com os momentos (momentos.ts): o anel e o
// brilho saem na cor do poder misturada com as do estilo em uso; as partículas, o rastro e a explosão são o motivo do
// poder (motivos.ts): as chamas da Fênix, as moedas do Dracofisco, o "§" do Código… O motor desenha em volta do
// personagem enquanto o poder dura (o rastro, nível 3, sai como partículas no mundo); a prévia do menu usa as mesmas.
//   1 só o momento · 2 o anel e o motivo em órbita · 3 rastro do motivo · 4 brilho pulsante (e explosão do motivo ao
//   ativar) · 5 auréola com o ícone

import { desenharMotivo, type Motivo } from "./motivos";
import { mix, type Ctx, type Tema } from "./themes";

/** Cores da aura: a do poder puxada para as do estilo (partícula, asa e moeda). */
export function coresAura(cor: string, tema: Tema): string[] {
  const p = tema.paleta;
  const doEstilo = [p.particula[0], p.asa.cor, p.moeda[0], p.particula[1] ?? p.moeda[1]];
  return doEstilo.map((b, i) => (b?.startsWith("#") && cor.startsWith("#") ? mix(cor, b, i === 0 ? 0.2 : 0.45) : cor));
}

/** Brilho que pulsa atrás do personagem (nível 4 em diante). Coordenadas do personagem, centro em (0, -4). */
export function auraAtras(c: Ctx, nivel: number, cores: string[], t: number) {
  if (nivel < 4) return;
  const r = 44 + Math.sin(t * 4) * 5;
  const g = c.createRadialGradient(0, -4, 8, 0, -4, r);
  g.addColorStop(0, cores[0]!);
  g.addColorStop(1, "rgba(255,255,255,0)");
  c.save();
  c.globalAlpha *= 0.55 + Math.sin(t * 4) * 0.12;
  c.fillStyle = g;
  c.beginPath();
  c.arc(0, -4, r, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

/** Anel girando com o motivo em órbita (nível 2) e a auréola com o ícone (nível 5), na frente do personagem. */
export function auraFrente(c: Ctx, nivel: number, cores: string[], t: number, motivo: Motivo, icone?: HTMLImageElement) {
  if (nivel < 2) return;
  c.save();
  // 2: o anel tracejado, girando devagar, sobre um halo largo e fraco da mesma cor
  c.strokeStyle = cores[0]!;
  const a0 = c.globalAlpha;
  c.globalAlpha = a0 * 0.3;
  c.lineWidth = 7;
  c.beginPath();
  c.arc(0, -4, 31, 0, Math.PI * 2);
  c.stroke();
  c.globalAlpha = a0;
  c.lineWidth = 3;
  c.setLineDash([8, 5]);
  c.lineDashOffset = -t * 30;
  c.beginPath();
  c.arc(0, -4, 31, 0, Math.PI * 2);
  c.stroke();
  c.setLineDash([]);
  // e cinco do motivo do poder em órbita inclinada, as de trás menores
  for (let i = 0; i < 5; i++) {
    const a = t * 1.8 + (i * Math.PI * 2) / 5;
    const prof = Math.sin(a);
    desenharMotivo(c, motivo.forma, Math.cos(a) * 40, -4 + prof * 13, 0.95 + prof * 0.2, motivo.cores[0], motivo.cores[1], Math.sin(t * 2 + i) * 0.3);
  }
  // 5: a auréola acima da cabeça, com o ícone do poder flutuando
  if (nivel >= 5) {
    const sobe = Math.sin(t * 3) * 1.5;
    c.strokeStyle = cores[2]!;
    c.lineWidth = 3;
    c.beginPath();
    c.ellipse(0, -36 + sobe, 15, 4.5, 0, 0, Math.PI * 2);
    c.stroke();
    if (icone?.complete && icone.naturalWidth) c.drawImage(icone, -9, -60 + sobe, 18, 18);
  }
  c.restore();
}

/** Rastro do motivo (nível 3) para a prévia do menu: no jogo ele sai como partículas que ficam para trás no mundo. */
export function auraRastro(c: Ctx, nivel: number, motivo: Motivo, t: number) {
  if (nivel < 3) return;
  c.save();
  for (let i = 0; i < 7; i++) {
    const k = (((t * 1.6 + i / 7) % 1) + 1) % 1;
    c.globalAlpha = 0.85 * (1 - k);
    desenharMotivo(c, motivo.forma, -24 - k * 70, -2 + Math.sin(i * 1.7 + t * 3) * 9, 0.9 - k * 0.35, motivo.cores[0], motivo.cores[1], k * 3 + i);
  }
  c.restore();
}
