// Motivos do Visual das melhorias (melhorias.ts e aura.ts): cada poder tem um símbolo que tem a ver com ele ou com o
// personagem dono dele (as chamas da Fênix, as moedas do Dracofisco, o "§" do Código, as ferraduras do Peçasus…). O
// símbolo aparece em volta do personagem (nível 2), no rastro (nível 3) e na explosão ao ativar (nível 4).

import type { IdPoder } from "./powers";
import type { Ctx } from "./themes";

export type Forma =
  | "escudo"
  | "livro"
  | "relogio"
  | "bolha"
  | "veu"
  | "dobro"
  | "pena"
  | "floco"
  | "ampulheta"
  | "coracao"
  | "pasta"
  | "balanca"
  | "lupa"
  | "pomba"
  | "martelo"
  | "papel"
  | "paragrafo"
  | "ferradura"
  | "garra"
  | "chama"
  | "estrela"
  | "moeda"
  | "onda"
  | "gota"
  | "osso"
  | "tomate"
  | "seta"
  | "brilho"
  | "cifrao"
  | "folha";

export interface Motivo {
  forma: Forma;
  /** a cor principal e a de detalhe */
  cores: [string, string];
  /** no plural, para o menu ("Chamas em volta", "Rastro de chamas") */
  nome: string;
}

export const MOTIVOS: Record<IdPoder, Motivo> = {
  escudo: { forma: "escudo", cores: ["#5a9ed6", "#e4f0fa"], nome: "escudos" },
  ima: { forma: "livro", cores: ["#c8323a", "#f6eedc"], nome: "livros" },
  lento: { forma: "relogio", cores: ["#f6f0e4", "#8f7ad6"], nome: "relógios" },
  mini: { forma: "bolha", cores: ["#b8f4dc", "#4fb38a"], nome: "bolhas" },
  fantasma: { forma: "veu", cores: ["#f2f6fc", "#9aa8bc"], nome: "véus" },
  dobro: { forma: "dobro", cores: ["#ffd23a", "#8a5a14"], nome: "“×2”" },
  leve: { forma: "pena", cores: ["#ffe9a8", "#c8963a"], nome: "penas douradas" },
  congelar: { forma: "floco", cores: ["#e4f8ff", "#5ab8d8"], nome: "flocos de gelo" },
  prescricao: { forma: "ampulheta", cores: ["#e8d8a8", "#6a5a44"], nome: "ampulhetas" },
  revisao: { forma: "coracao", cores: ["#ff5a6a", "#ffd6dc"], nome: "corações" },
  arquivamento: { forma: "pasta", cores: ["#e8c87a", "#8a6a3a"], nome: "pastas" },
  equilibrio: { forma: "balanca", cores: ["#f2c84a", "#8a6420"], nome: "balanças" },
  inquerito: { forma: "lupa", cores: ["#dcecfa", "#2f5a8a"], nome: "lupas" },
  presuncao: { forma: "pomba", cores: ["#ffffff", "#8a8a9a"], nome: "pombas" },
  dosimetria: { forma: "martelo", cores: ["#b8844a", "#4a2e18"], nome: "martelos" },
  denuncia: { forma: "papel", cores: ["#faf6ee", "#b3262e"], nome: "denúncias" },
  tipificacao: { forma: "paragrafo", cores: ["#eef2f6", "#3e5262"], nome: "parágrafos (§)" },
  voo: { forma: "pena", cores: ["#f0c060", "#8a5a1a"], nome: "penas de grifo" },
  galope: { forma: "ferradura", cores: ["#dcdce4", "#8a7a3a"], nome: "ferraduras" },
  garras: { forma: "garra", cores: ["#f6ead6", "#6a4a24"], nome: "arranhões" },
  renascer: { forma: "chama", cores: ["#ffb02a", "#ffe86a"], nome: "chamas" },
  sabedoria: { forma: "estrela", cores: ["#fff2b0", "#6f63b8"], nome: "estrelas" },
  tesouro: { forma: "moeda", cores: ["#ffd866", "#a8741a"], nome: "moedas" },
  liberdade: { forma: "pena", cores: ["#ffffff", "#9a9aa8"], nome: "penas brancas" },
  eco: { forma: "onda", cores: ["#c8b8f0", "#5a4a7a"], nome: "ondas de eco" },
  "asas-de-cera": { forma: "gota", cores: ["#fbf0c8", "#c8a848"], nome: "gotas de cera" },
  pterossauro: { forma: "osso", cores: ["#f2ead6", "#7f9a78"], nome: "ossos de fóssil" },
  foco: { forma: "tomate", cores: ["#e84a3a", "#3a9a3a"], nome: "tomates (pomodoro)" },
  agravo: { forma: "seta", cores: ["#f2d27a", "#8a6a1a"], nome: "setas de recurso" },
  chifre: { forma: "brilho", cores: ["#f4e0ff", "#a87ad8"], nome: "brilhos de unicórnio" },
  penhora: { forma: "cifrao", cores: ["#ffd866", "#b3261e"], nome: "cifrões" },
  praga: { forma: "folha", cores: ["#9ad648", "#4a7a1a"], nome: "folhas roídas" },
};

/** Motivo do poder; para um id desconhecido, uma estrela. */
export const motivoDe = (id: string): Motivo => MOTIVOS[id as IdPoder] ?? { forma: "estrela", cores: ["#ffffff", "#888888"], nome: "estrelas" };

/** Desenha o símbolo `forma` centrado em (x, y), com uns 10 px de largura em `s` = 1, girado `ang`. */
export function desenharMotivo(c: Ctx, forma: Forma, x: number, y: number, s: number, cor: string, detalhe: string, ang = 0) {
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  c.scale(s, s);
  c.fillStyle = cor;
  c.strokeStyle = detalhe;
  c.lineWidth = 1.2;
  c.lineCap = "round";
  c.lineJoin = "round";
  c.beginPath();
  switch (forma) {
    case "escudo":
      c.moveTo(0, -5.5);
      c.quadraticCurveTo(3, -4, 5, -4.5);
      c.lineTo(4.4, 1.5);
      c.quadraticCurveTo(3, 4.5, 0, 6);
      c.quadraticCurveTo(-3, 4.5, -4.4, 1.5);
      c.lineTo(-5, -4.5);
      c.quadraticCurveTo(-3, -4, 0, -5.5);
      c.fill();
      c.beginPath();
      c.moveTo(0, -3.5);
      c.lineTo(0, 4);
      c.stroke();
      break;
    case "livro":
      c.rect(-5, -4, 10, 8);
      c.fill();
      c.fillStyle = detalhe;
      c.fillRect(-4, -3, 3.6, 6);
      c.fillRect(0.4, -3, 3.6, 6);
      break;
    case "relogio":
      c.arc(0, 0, 5, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(0, -3.4);
      c.moveTo(0, 0);
      c.lineTo(2.4, 1);
      c.stroke();
      break;
    case "bolha":
      c.globalAlpha *= 0.6;
      c.arc(0, 0, 4.6, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha /= 0.6;
      c.stroke();
      c.fillStyle = "#ffffff";
      c.beginPath();
      c.arc(-1.6, -1.8, 1.2, 0, Math.PI * 2);
      c.fill();
      break;
    case "veu":
      c.globalAlpha *= 0.8;
      c.moveTo(-4, 5);
      c.lineTo(-4, -1);
      c.quadraticCurveTo(-4, -6, 0, -6);
      c.quadraticCurveTo(4, -6, 4, -1);
      c.lineTo(4, 5);
      c.lineTo(2, 3.5);
      c.lineTo(0, 5);
      c.lineTo(-2, 3.5);
      c.closePath();
      c.fill();
      c.fillStyle = detalhe;
      c.fillRect(-2, -2.5, 1.2, 1.6);
      c.fillRect(0.8, -2.5, 1.2, 1.6);
      break;
    case "dobro":
    case "paragrafo":
    case "cifrao":
      c.font = "900 11px system-ui, sans-serif";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.lineWidth = 2.4;
      c.strokeText(forma === "dobro" ? "×2" : forma === "paragrafo" ? "§" : "$", 0, 0.5);
      c.fillText(forma === "dobro" ? "×2" : forma === "paragrafo" ? "§" : "$", 0, 0.5);
      break;
    case "pena":
      c.moveTo(0, 6);
      c.quadraticCurveTo(-4.5, 0, 0, -6);
      c.quadraticCurveTo(4.5, 0, 0, 6);
      c.fill();
      c.beginPath();
      c.moveTo(0, 7);
      c.lineTo(0, -5);
      c.stroke();
      break;
    case "floco":
      c.strokeStyle = cor;
      c.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI) / 3;
        c.moveTo(Math.cos(a) * 5.5, Math.sin(a) * 5.5);
        c.lineTo(-Math.cos(a) * 5.5, -Math.sin(a) * 5.5);
      }
      c.stroke();
      c.strokeStyle = detalhe;
      c.lineWidth = 1;
      c.beginPath();
      c.arc(0, 0, 1.6, 0, Math.PI * 2);
      c.stroke();
      break;
    case "ampulheta":
      c.moveTo(-4, -5.5);
      c.lineTo(4, -5.5);
      c.lineTo(0.6, 0);
      c.lineTo(4, 5.5);
      c.lineTo(-4, 5.5);
      c.lineTo(-0.6, 0);
      c.closePath();
      c.fill();
      c.stroke();
      c.fillStyle = detalhe;
      c.beginPath();
      c.moveTo(-2.4, 5);
      c.lineTo(2.4, 5);
      c.lineTo(0, 2);
      c.fill();
      break;
    case "coracao":
      c.moveTo(0, 5);
      c.bezierCurveTo(-7, 0, -4, -6, 0, -2.4);
      c.bezierCurveTo(4, -6, 7, 0, 0, 5);
      c.fill();
      break;
    case "pasta":
      c.moveTo(-5.5, -3);
      c.lineTo(-5.5, 4);
      c.lineTo(5.5, 4);
      c.lineTo(5.5, -2);
      c.lineTo(-0.5, -2);
      c.lineTo(-1.8, -4);
      c.lineTo(-5.5, -4);
      c.closePath();
      c.fill();
      c.stroke();
      break;
    case "balanca":
      c.strokeStyle = cor;
      c.lineWidth = 1.4;
      c.moveTo(0, -5);
      c.lineTo(0, 5);
      c.moveTo(-5, -3);
      c.lineTo(5, -3);
      c.moveTo(-3, 5);
      c.lineTo(3, 5);
      c.stroke();
      for (const l of [-1, 1]) {
        c.beginPath();
        c.arc(l * 4.4, 0, 2.2, 0, Math.PI);
        c.fill();
      }
      break;
    case "lupa":
      c.lineWidth = 1.6;
      c.arc(-1, -1, 3.6, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.lineWidth = 2.4;
      c.beginPath();
      c.moveTo(1.6, 1.6);
      c.lineTo(5, 5);
      c.stroke();
      break;
    case "pomba":
      c.moveTo(-6, 1);
      c.quadraticCurveTo(-2, -5, 1, -1);
      c.quadraticCurveTo(4, -6, 6, -2);
      c.quadraticCurveTo(3, 2, 0, 3);
      c.quadraticCurveTo(-3, 3, -6, 1);
      c.fill();
      break;
    case "martelo":
      c.save();
      c.rotate(-0.5);
      c.rect(-4.5, -4, 9, 4);
      c.fill();
      c.stroke();
      c.fillStyle = detalhe;
      c.fillRect(-0.8, 0, 1.6, 6.5);
      c.restore();
      break;
    case "papel":
      c.rect(-4, -5, 8, 10);
      c.fill();
      c.fillStyle = "#8a8a8a";
      c.fillRect(-2.6, -3, 5, 0.8);
      c.fillRect(-2.6, -1.3, 5, 0.8);
      c.fillStyle = detalhe;
      c.beginPath();
      c.arc(1.6, 2.6, 1.6, 0, Math.PI * 2);
      c.fill();
      break;
    case "ferradura":
      c.strokeStyle = cor;
      c.lineWidth = 2.4;
      c.arc(0, -0.5, 4, Math.PI * 0.05, Math.PI * 0.95, true);
      c.stroke();
      c.fillStyle = detalhe;
      for (const [dx, dy] of [[-4, 1], [-3, -3], [3, -3], [4, 1]]) c.fillRect(dx! - 0.5, dy! - 0.5, 1, 1);
      break;
    case "garra":
      c.strokeStyle = cor;
      c.lineWidth = 1.6;
      for (const d of [-3, 0, 3]) {
        c.moveTo(d - 2, -5);
        c.quadraticCurveTo(d + 1, -1, d + 2, 5);
      }
      c.stroke();
      break;
    case "chama":
      c.moveTo(0, 6);
      c.quadraticCurveTo(-5, 3, -3, -1);
      c.quadraticCurveTo(-2, 1, 0, -6.5);
      c.quadraticCurveTo(2, 1, 3, -1);
      c.quadraticCurveTo(5, 3, 0, 6);
      c.fill();
      c.fillStyle = detalhe;
      c.beginPath();
      c.moveTo(0, 5);
      c.quadraticCurveTo(-2.4, 3, -1, 0);
      c.quadraticCurveTo(0, 1.5, 0.6, -2);
      c.quadraticCurveTo(2.6, 3, 0, 5);
      c.fill();
      break;
    case "estrela":
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 2.4 : 5.6;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      c.closePath();
      c.fill();
      break;
    case "moeda":
      c.ellipse(0, 0, 4.6, 5, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.fillStyle = "#ffffff";
      c.fillRect(-1.8, -2.6, 1.2, 3.6);
      break;
    case "onda":
      c.strokeStyle = cor;
      c.lineWidth = 1.4;
      for (const r of [2, 4.4, 6.8]) {
        c.moveTo(Math.cos(-0.7) * r - 4, Math.sin(-0.7) * r);
        c.arc(-4, 0, r, -0.7, 0.7);
      }
      c.stroke();
      break;
    case "gota":
      c.moveTo(0, -6);
      c.quadraticCurveTo(4.6, 1, 0, 5);
      c.quadraticCurveTo(-4.6, 1, 0, -6);
      c.fill();
      c.stroke();
      break;
    case "osso":
      c.fillRect(-3.6, -1, 7.2, 2);
      for (const [dx, dy] of [[-4, -1.6], [-4, 1.6], [4, -1.6], [4, 1.6]]) {
        c.moveTo(dx! + 1.8, dy!);
        c.arc(dx!, dy!, 1.8, 0, Math.PI * 2);
      }
      c.fill();
      break;
    case "tomate":
      c.arc(0, 1, 4.6, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = detalhe;
      c.beginPath();
      for (const a of [-0.9, 0, 0.9]) {
        c.moveTo(0, -3.4);
        c.lineTo(Math.sin(a) * 3.4, -3.4 - Math.cos(a) * 1.6);
        c.lineTo(Math.sin(a + 0.3) * 1.2, -3);
      }
      c.fill();
      break;
    case "seta":
      c.moveTo(0, -6);
      c.lineTo(5, 0);
      c.lineTo(2, 0);
      c.lineTo(2, 5.5);
      c.lineTo(-2, 5.5);
      c.lineTo(-2, 0);
      c.lineTo(-5, 0);
      c.closePath();
      c.fill();
      c.stroke();
      break;
    case "brilho":
      c.moveTo(0, -6.5);
      c.quadraticCurveTo(0.8, -0.8, 6.5, 0);
      c.quadraticCurveTo(0.8, 0.8, 0, 6.5);
      c.quadraticCurveTo(-0.8, 0.8, -6.5, 0);
      c.quadraticCurveTo(-0.8, -0.8, 0, -6.5);
      c.fill();
      c.fillStyle = detalhe;
      c.beginPath();
      c.arc(0, 0, 1.3, 0, Math.PI * 2);
      c.fill();
      break;
    case "folha":
      c.moveTo(-6, 0);
      c.quadraticCurveTo(-1, -5, 6, -1);
      c.quadraticCurveTo(1, 5, -6, 0);
      c.fill();
      c.beginPath();
      c.moveTo(-6, 0);
      c.lineTo(5, -0.8);
      c.stroke();
      break;
  }
  c.restore();
}
