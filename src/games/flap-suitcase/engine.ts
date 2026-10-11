// Engine do Flap Suitcase: física com passo fixo, canvas 2D, pool de partículas.
// Coordenadas lógicas: altura fixa H = 640; largura acompanha a proporção da tela.

import type { GameHostApi, GameInstance, GameOptions, Hud } from "../types";
import { Som } from "./audio";
import { PODERES, poderPorId, type Efeitos, type Poder } from "./powers";
import { tirarAntisserrilhado } from "./pixel";
import { CHANCE_RACHADA, MULTIPLICADOR_XP, PENALIDADES, PERSONAGENS, type Personagem } from "./progressao";
import { ciclo, colunaGrega, temaPorId, type Clima, type Ctx, type Tema } from "./themes";
import { desenharPersonagem } from "./personagens";

const H = 640;
const CHAO = 40;
const PASSO = 1 / 120;
const GRAVIDADE = 1450;
const IMPULSO = -410;
// Asas de Ouro (guiar): rigidez da mola até o vão, força máxima, amortecimento e queda máxima
const GUIA_RIGIDEZ = 40;
const GUIA_FORCA = 4000;
const GUIA_AMORTECIMENTO = 6;
const QUEDA_LEVE = 1100;
const LARG_COL = 74;
const ESPACO = 250;
const RAIO = 15;

interface Pilar {
  x: number;
  vao: number; // centro do vão
  abertura: number;
  variante: number;
  quebradaCima: boolean;
  quebradaBaixo: boolean;
  mov: number; // amplitude do movimento vertical (0 = parado)
  fase: number;
  passou: boolean;
  /** coluna rachada: passagem mais estreita; bater nela aplica uma penalidade, sem perder a partida */
  rachada: boolean;
  penalizada: boolean;
  /** arquivada pelo poder: existe só para manter o espaçamento; não pontua, não colide e não aparece */
  arquivado?: boolean;
}
interface Moeda { x: number; y: number; pega: boolean; fase: number }
interface Orbe { x: number; y: number; poder: Poder; pego: boolean }
interface Part { x: number; y: number; vx: number; vy: number; vida: number; max: number; cor: string; tam: number; tipo: 0 | 1 }
interface Gota { x: number; y: number; v: number; s: number; r: number }

const artes = new Map<string, HTMLImageElement>();
function arteDoPoder(id: string): HTMLImageElement {
  let img = artes.get(id);
  if (!img) {
    img = new Image();
    img.src = `/poderes/${id}.svg`;
    artes.set(id, img);
  }
  return img;
}

const achaPersonagem = (id?: string) => PERSONAGENS.find((p) => p.id === id) ?? PERSONAGENS[0];
const CARGA_SEG = 15;

function desenharRacha(c: Ctx, len: number) {
  c.save();
  c.strokeStyle = "rgba(20,12,4,0.8)";
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(LARG_COL / 2, 0);
  for (let y = 12, k = 1; y < len; y += 12, k++) c.lineTo(LARG_COL / 2 + (k % 2 ? 9 : -7), y);
  c.stroke();
  c.restore();
}

export function criarJogo(canvas: HTMLCanvasElement, host: GameHostApi, opcoes: GameOptions): GameInstance {
  const ctx = canvas.getContext("2d")!;
  let tema: Tema = temaPorId(opcoes.estilo);
  let nivel = opcoes.nivel;
  let reduzido = opcoes.movimentoReduzido;
  let autoPoder = opcoes.autoPoder ?? true;
  const som = new Som();
  som.ligado = opcoes.som;
  som.onda = tema.onda;
  som.base = tema.somBase;

  let low: HTMLCanvasElement | null = null;
  let lowCtx: Ctx | null = null;

  // ---------------- estado ----------------
  let W = 800;
  let escala = 1;
  let estado: "pronto" | "jogando" | "pergunta" | "pausado" | "morrendo" | "fim" = "pronto";
  let estadoAntesPausa: "pronto" | "jogando" = "pronto";
  const jog = { x: 0, y: H / 2, vy: 0, fase: 0, graca: 0 };
  let pilares: Pilar[] = [];
  let moedas: Moeda[] = [];
  let orbes: Orbe[] = [];
  const parts: Part[] = [];
  const gotas: Gota[] = [];
  const estrelas: [number, number, number][] = [];
  let ativos = new Map<string, number>();
  let carga = 0;
  let vidas = 0;
  let pontos = 0;
  let nPilares = 0;
  let nMoedas = 0;
  let nPerguntas = 0;
  let xpRun = 0;
  let personagem: Personagem = achaPersonagem(opcoes.personagem);
  let aviso: Hud["aviso"];
  let avisoAte = 0;
  let nAcertos = 0;
  let proxOrbe = 6;
  let reviverOferecido = false;
  let tempo = 0;
  let inicioSeg = 0;
  let off = 0; // deslocamento do mundo (parallax)
  let tod = 1;
  let todAlvo = 1;
  let clima: Clima = "limpo";
  let segmento = 0;
  let flash = 0;
  let proxRaio = 5;
  let tremor = 0;
  // Só para testes automáticos (window.__flap, em ?debug=1): colisões e orbes podem ser desligados.
  let invulneravel = true;
  let orbesLigados = true;
  let nPenalidades = 0;
  let morteT = 0;
  let hudT = 0;
  let raf = 0;
  let ultimo = 0;
  let acum = 0;
  let destruido = false;

  const efeitos = (): Efeitos => ({
    escudo: ativos.has("escudo"),
    ima: ativos.has("ima"),
    lento: ativos.has("lento"),
    mini: ativos.has("mini"),
    fantasma: ativos.has("fantasma"),
    dobro: ativos.has("dobro"),
    leve: ativos.has("leve"),
    congelar: ativos.has("congelar"),
    equilibrio: ativos.has("equilibrio"),
    presuncao: ativos.has("presuncao"),
    dosimetria: ativos.has("dosimetria"),
  });

  // ---------------- tamanho ----------------
  let redesenhar = true;
  function redimensionar() {
    redesenhar = true; // trocar o tamanho do canvas apaga o desenho
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = canvas.clientWidth || 800;
    const ch = canvas.clientHeight || 640;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    escala = canvas.height / H;
    W = Math.max(360, canvas.width / escala);
    jog.x = Math.min(W * 0.3, 260);
    if (tema.escala) prepararLow();
    if (!estrelas.length) for (let i = 0; i < 70; i++) estrelas.push([Math.random(), Math.random() * 0.6, Math.random()]);
  }
  function prepararLow() {
    low ??= document.createElement("canvas");
    low.width = Math.ceil(W * tema.escala!);
    low.height = Math.ceil(H * tema.escala!);
    lowCtx = low.getContext("2d", { willReadFrequently: true })!; // lido a cada quadro (tirarAntisserrilhado)
  }

  // ---------------- mundo ----------------
  const velocidade = () => (165 + Math.min(nPilares, 60) * 2) * (ativos.has("lento") ? 0.6 : 1);
  const aberturaBase = () => Math.max(132, 178 - nPilares * 1.1) + (nivel === 1 ? 8 : 0);

  function novoPilar(x: number) {
    const ab = aberturaBase();
    const margem = 70 + ab / 2;
    const vao = margem + Math.random() * (H - CHAO - 2 * margem);
    const movel = nPilares > 12 && Math.random() < Math.min(0.5, (nPilares - 12) * 0.02);
    const rachada = nPilares >= 4 && Math.random() < CHANCE_RACHADA[nivel];
    // Arquivamento: a primeira coluna que surgir durante o efeito é arquivada e o efeito termina
    const arquivado = ativos.has("arquivamento");
    if (arquivado) ativos.delete("arquivamento");
    const p: Pilar = {
      x,
      vao,
      abertura: rachada ? ab * (2 / 3) : ab,
      rachada,
      penalizada: false,
      variante: Math.floor(Math.random() * 3),
      quebradaCima: nPilares > 20 && Math.random() < 0.2,
      quebradaBaixo: nPilares > 20 && Math.random() < 0.2,
      mov: movel ? 30 + Math.random() * 40 : 0,
      fase: Math.random() * Math.PI * 2,
      passou: arquivado,
      arquivado,
    };
    pilares.push(p);
    if (arquivado) return;
    // moedas em arco no vão
    if (Math.random() < 0.45) for (let i = -1; i <= 1; i++) moedas.push({ x: x + i * 26, y: vao - Math.abs(i) * 10, pega: false, fase: Math.random() * 6 });
    // orbe de poder, a cada 6–11 pilares
    if (orbesLigados && --proxOrbe <= 0) {
      proxOrbe = 6 + Math.floor(Math.random() * 6);
      const geral = PODERES.filter((q) => !q.personagem && !(q.id === "revisao" && vidas >= 2));
      const proprio = PODERES.filter((q) => q.personagem === personagem.id);
      const pool = [...geral, ...proprio, ...proprio];
      orbes.push({ x: x + ESPACO / 2, y: opcoes.debug ? 320 : vao + (Math.random() - 0.5) * 60, poder: pool[Math.floor(Math.random() * pool.length)], pego: false });
    }
  }

  function reiniciar() {
    pilares = [];
    moedas = [];
    orbes = [];
    parts.length = 0;
    ativos = new Map();
    carga = 0;
    vidas = 0;
    pontos = nPilares = nMoedas = nPerguntas = nAcertos = 0;
    xpRun = 0;
    aviso = undefined;
    proxOrbe = opcoes.debug ? 1 : 5;
    reviverOferecido = false;
    jog.y = H / 2;
    jog.vy = 0;
    jog.graca = 0;
    tod = todAlvo = 1;
    segmento = 0;
    clima = tema.climaFixo ?? "limpo";
    inicioSeg = performance.now();
    for (let i = 0; i < 4; i++) novoPilar(W + 120 + i * ESPACO);
    mudarEstado("pronto");
  }

  function mudarEstado(e: typeof estado) {
    estado = e;
    host.estado(e === "morrendo" ? "jogando" : e);
  }

  // ---------------- partículas ----------------
  function explosao(x: number, y: number, n: number, cores: string[], forca = 220, tipo: 0 | 1 = 0) {
    const qtd = reduzido ? Math.ceil(n / 3) : n;
    for (let i = 0; i < qtd; i++) {
      if (parts.length > 320) parts.shift();
      const a = Math.random() * Math.PI * 2;
      const v = forca * (0.3 + Math.random() * 0.7);
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: 0, max: 0.5 + Math.random() * 0.6, cor: cores[i % cores.length], tam: 2 + Math.random() * 3, tipo });
    }
  }

  // ---------------- entrada ----------------
  function bater() {
    if (estado === "pronto") {
      mudarEstado("jogando");
      jog.graca = Math.max(jog.graca, 0.6);
    }
    if (estado !== "jogando") return;
    jog.vy = IMPULSO;
    jog.fase += 1.4;
    som.flap();
    if (!reduzido) explosao(jog.x - 18, jog.y + 6, 3, tema.paleta.particula, 60);
  }
  const onPointer = (ev: PointerEvent) => {
    // Só o botão principal e o primeiro dedo: um segundo toque não bate as asas duas vezes
    if (ev.button !== 0 || !ev.isPrimary) return;
    ev.preventDefault();
    bater();
  };
  const onKey = (ev: KeyboardEvent) => {
    if ((ev.target as HTMLElement)?.closest?.("input, textarea, select, button, [role=dialog]")) return;
    if (ev.code === "Space" || ev.code === "ArrowUp" || ev.code === "KeyW") {
      ev.preventDefault();
      if (!ev.repeat) bater();
    } else if (ev.code === "KeyE") {
      if (!ev.repeat) usarPoder();
    } else if (ev.code === "KeyP" || ev.code === "Escape") {
      if (ev.repeat) return;
      if (estado === "pausado") inst.continuar();
      else inst.pausar();
    }
  };
  const onVis = () => {
    if (document.hidden) inst.pausar();
  };

  // ---------------- lógica ----------------
  function poderDoPersonagem() {
    return PODERES.find((q) => q.personagem === personagem.id);
  }

  function usarPoder() {
    const p = poderDoPersonagem();
    if (estado !== "jogando" || !p || carga < 1 || ativos.has(p.id)) return;
    carga = 0;
    ativar(p);
  }

  function ativar(p: Poder) {
    som.poder();
    explosao(jog.x, jog.y, 26, [p.cor, "#ffffff", tema.paleta.moeda[0]], 260);
    if (p.id === "prescricao") {
      for (const q of pilares) if (q.x > jog.x - 60 && q.x < W + 40) {
        explosao(q.x, q.vao - q.abertura / 2 - 40, 14, [tema.paleta.coluna.corpo, tema.paleta.coluna.sombra], 200);
        explosao(q.x, q.vao + q.abertura / 2 + 40, 14, [tema.paleta.coluna.corpo, tema.paleta.coluna.sombra], 200);
        remover(q);
      }
      return;
    }
    if (p.id === "revisao") {
      vidas++;
      return;
    }
    if (p.id === "denuncia") {
      for (const q of pilares) if (q.rachada && q.x > -LARG_COL && q.x < W + 40) remover(q);
      return;
    }
    if (p.id === "tipificacao") {
      pontos += 20;
      nMoedas += 5;
      return;
    }
    if (p.id === "voo") {
      ativos.set("voo", p.duracao);
      ativos.set("escudo", p.duracao);
      ativos.set("leve", p.duracao);
      return;
    }
    if (p.id === "escudo") ativos.set("escudo", p.duracao);
    else ativos.set(p.id, p.duracao);
  }

  function perguntar(tipo: "poder" | "reviver", poder?: Poder) {
    mudarEstado("pergunta");
    host
      .perguntar({
        tipo,
        poderId: poder?.id,
        poderNome: poder?.nome,
        poderIcone: poder?.icone,
        poderDescricao: poder?.descricao,
        poderDuracao: poder?.duracao,
        carrega: poder?.personagem === personagem.id,
      })
      .then((ok) => {
        if (destruido) return;
        nPerguntas++;
        if (ok) {
          nAcertos++;
          pontos += 5 * nivel;
          som.certo();
        } else som.errado();
        if (tipo === "poder") {
          if (ok && poder) {
            if (poder.personagem === personagem.id) carga = 1;
            else ativar(poder);
          }
          jog.graca = 1;
          mudarEstado("pronto");
        } else if (ok) reviver();
        else morrer();
      });
  }

  function reviver() {
    pilares = pilares.filter((q) => q.x < jog.x - 90 || q.x > jog.x + W * 0.55);
    jog.y = H / 2;
    jog.vy = 0;
    jog.graca = 1.5;
    explosao(jog.x, jog.y, 30, ["#e25b5b", "#ffffff", tema.paleta.moeda[0]], 240);
    mudarEstado("pronto");
  }

  function colidiu() {
    if (opcoes.debug && invulneravel) return;
    const e = efeitos();
    if (jog.graca > 0 || e.fantasma) return;
    if (e.escudo) {
      ativos.delete("escudo");
      jog.graca = 1.2;
      explosao(jog.x, jog.y, 20, ["#5a9ed6", "#ffffff"], 220);
      som.batida();
      tremor = 4;
      return;
    }
    som.batida();
    tremor = reduzido ? 0 : 7;
    explosao(jog.x, jog.y, 24, [tema.paleta.maleta.corpo, tema.paleta.asa.cor, tema.paleta.maleta.fivela], 260, 1);
    if (vidas > 0) {
      vidas--;
      pilares = pilares.filter((q) => Math.abs(q.x - jog.x) > 160);
      jog.graca = 1.5;
      jog.vy = IMPULSO * 0.6;
      return;
    }
    if (!reviverOferecido) {
      reviverOferecido = true;
      perguntar("reviver");
      return;
    }
    morrer();
  }

  // Asas de Ouro: mola até o centro do próximo vão, mais forte que a gravidade. Abaixo do vão o pássaro
  // sobe mesmo sem bater as asas; acima dele cai mais rápido, e a força também vence a batida.
  function guiar(dt: number) {
    let alvo: Pilar | undefined;
    for (const q of pilares) {
      if (q.passou || q.x <= jog.x - LARG_COL) continue;
      if (!alvo || q.x < alvo.x) alvo = q;
    }
    if (!alvo) return;
    const centro = alvo.vao + (alvo.mov ? Math.sin(alvo.fase) * alvo.mov : 0);
    const erro = centro - jog.y;
    const forca = Math.max(-GUIA_FORCA, Math.min(GUIA_FORCA, erro * GUIA_RIGIDEZ));
    jog.vy += (forca - jog.vy * GUIA_AMORTECIMENTO) * dt;
  }

  function remover(q: Pilar) {
    q.x = -999;
    q.passou = true;
  }

  function penalizar() {
    nPenalidades++;
    const pen = PENALIDADES[Math.floor(Math.random() * PENALIDADES.length)];
    som.batida();
    tremor = reduzido ? 0 : 4;
    explosao(jog.x, jog.y, 14, [tema.paleta.coluna.sombra, "#ffffff"], 160);
    if (pen.efeito === "cancelar") ativos.clear();
    else if (pen.efeito === "pontos") pontos = Math.max(0, pontos - pen.valor);
    else if (pen.efeito === "vida") vidas = Math.max(0, vidas - pen.valor);
    else nMoedas = Math.max(0, nMoedas - pen.valor);
    aviso = { titulo: "Coluna rachada", peca: pen.peca, texto: pen.texto };
    avisoAte = performance.now() + 4000;
  }

  function morrer() {
    morteT = 0;
    jog.vy = -250;
    estado = "morrendo";
  }

  function circuloRet(cx: number, cy: number, r: number, x: number, y: number, w: number, h: number) {
    const px = Math.max(x, Math.min(cx, x + w));
    const py = Math.max(y, Math.min(cy, y + h));
    return (cx - px) ** 2 + (cy - py) ** 2 < r * r;
  }

  function atualizar(dt: number) {
    tempo += dt;
    const e = efeitos();
    tod += (todAlvo - tod) * Math.min(1, dt * 0.4);
    if (flash > 0) flash -= dt * 2.5;
    if (tremor > 0) tremor = Math.max(0, tremor - dt * 12);

    // clima e partículas de clima animam sempre
    atualizarClima(dt);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.vida += dt;
      if (p.vida > p.max) {
        parts.splice(i, 1);
        continue;
      }
      p.vy += 400 * dt * (p.tipo ? 1 : 0.4);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    if (estado === "pronto") {
      jog.y = H / 2 - 20 + Math.sin(tempo * 3) * 10;
      jog.fase += dt * 9;
      off += 40 * dt;
      return;
    }
    if (estado === "morrendo") {
      morteT += dt;
      jog.vy += GRAVIDADE * dt;
      jog.y = Math.min(H - CHAO - 12, jog.y + jog.vy * dt);
      if (morteT > 0.9) {
        mudarEstado("fim");
        host.fimDeJogo({
          pontos,
          extras: [
            { rotulo: "Experiência", valor: Math.floor(xpRun) },
            { rotulo: "Moedas", valor: nMoedas },
          ],
          progresso: { xp: Math.floor(xpRun), moedas: nMoedas },
          perguntas: nPerguntas,
          acertos: nAcertos,
          duracaoSeg: Math.round((performance.now() - inicioSeg) / 1000),
        });
      }
      return;
    }
    if (estado !== "jogando") return;

    // poderes
    for (const [id, rest] of ativos) {
      const r = rest - dt;
      if (r <= 0) ativos.delete(id);
      else ativos.set(id, r);
    }
    const proprio = poderDoPersonagem();
    if (proprio && !ativos.has(proprio.id) && carga < 1) {
      carga = Math.min(1, carga + dt / CARGA_SEG);
      if (carga >= 1) hudT = 0;
    }
    if (autoPoder && proprio) usarPoder();
    if (jog.graca > 0) jog.graca -= dt;

    // jogador
    jog.vy = Math.min(e.leve ? QUEDA_LEVE : 720, jog.vy + GRAVIDADE * dt);
    if (e.leve) guiar(dt);
    jog.y += jog.vy * dt;
    jog.fase += dt * (jog.vy < 0 ? 22 : 8);
    const raio = RAIO * (e.mini ? 0.6 : 1);
    if (jog.y < raio) {
      jog.y = raio;
      jog.vy = 0;
    }
    if (jog.y > H - CHAO - raio) {
      jog.y = H - CHAO - raio;
      if (jog.graca <= 0 && !e.fantasma) {
        colidiu();
        if (estado === "jogando") jog.vy = IMPULSO * 0.7;
      } else jog.vy = IMPULSO * 0.7;
    }

    // mundo
    const v = velocidade();
    off += v * dt;
    for (const p of pilares) {
      p.x -= v * dt;
      if (p.arquivado) continue;
      if (p.mov && !e.congelar) p.fase += dt * 1.6;
      const alvoAb = (p.rachada ? aberturaBase() * (2 / 3) : aberturaBase()) + (e.congelar ? 34 : 0) + (e.equilibrio ? 36 : 0);
      p.abertura += (alvoAb - p.abertura) * Math.min(1, dt * 3);
      if (!p.passou && p.x < jog.x - LARG_COL / 2) {
        p.passou = true;
        nPilares++;
        xpRun += MULTIPLICADOR_XP[nivel];
        pontos += (e.dobro ? 2 : 1) * (e.dosimetria ? 3 : 1);
        if (nPilares % 8 === 0) mudarSegmento();
      }
      const centro = p.vao + (p.mov ? Math.sin(p.fase) * p.mov : 0);
      const topo = centro - p.abertura / 2;
      const base = centro + p.abertura / 2;
      const hx = p.x - LARG_COL / 2 + 4;
      if (
        circuloRet(jog.x, jog.y, raio - 2, hx, -50, LARG_COL - 8, topo + 50) ||
        circuloRet(jog.x, jog.y, raio - 2, hx, base, LARG_COL - 8, H)
      ) {
        if (p.rachada) {
          if (!p.penalizada) {
            p.penalizada = true;
            if (!e.presuncao) penalizar();
          }
        } else {
          colidiu();
          if (estado !== "jogando") return;
        }
      }
    }
    pilares = pilares.filter((p) => p.x > -LARG_COL);
    const ultimoX = pilares.length ? pilares[pilares.length - 1].x : W;
    if (ultimoX < W + 40 - ESPACO + LARG_COL) novoPilar(Math.max(W + 60, ultimoX + ESPACO));

    for (const m of moedas) {
      m.x -= v * dt;
      m.fase += dt * 6;
      if (m.pega) continue;
      const dx = jog.x - m.x;
      const dy = jog.y - m.y;
      const d2 = dx * dx + dy * dy;
      if (e.ima && d2 < 170 * 170) {
        const d = Math.sqrt(d2) || 1;
        m.x += (dx / d) * 420 * dt;
        m.y += (dy / d) * 420 * dt;
      }
      // Inquérito: toda moeda que entra na tela é recolhida (+3 pontos)
      const inquerito = ativos.has("inquerito") && m.x >= 0 && m.x <= W;
      if (inquerito || d2 < (raio + 10) ** 2) {
        m.pega = true;
        nMoedas++;
        pontos += inquerito ? 3 : e.dobro ? 2 : 1;
        som.moeda();
        explosao(m.x, m.y, 8, [tema.paleta.moeda[0], "#ffffff"], 140);
      }
    }
    moedas = moedas.filter((m) => !m.pega && m.x > -30);

    for (const o of orbes) {
      o.x -= v * dt;
      if (!o.pego && (jog.x - o.x) ** 2 + (jog.y - o.y) ** 2 < (raio + 16) ** 2) {
        o.pego = true;
        explosao(o.x, o.y, 16, [o.poder.cor, "#ffffff"], 180);
        perguntar("poder", o.poder);
        return;
      }
    }
    orbes = orbes.filter((o) => !o.pego && o.x > -30);

    hudT -= dt;
    if (hudT <= 0) {
      hudT = 0.1;
      enviarHud();
    }
  }

  function mudarSegmento() {
    segmento++;
    todAlvo = (1 + segmento * 0.8) % 4;
    if (todAlvo < tod - 0.5) tod -= 4; // continua girando o ciclo sem voltar
    if (tema.climaFixo) {
      clima = tema.climaFixo === "chuva" && Math.random() < 0.35 ? "tempestade" : tema.climaFixo;
      return;
    }
    const r = Math.random();
    clima = r < 0.4 ? "limpo" : r < 0.55 ? "chuva" : r < 0.68 ? "neve" : r < 0.82 ? "folhas" : r < 0.92 ? "tempestade" : "neblina";
  }

  function atualizarClima(dt: number) {
    const alvo = reduzido ? 0 : clima === "limpo" || clima === "neblina" ? 0 : clima === "tempestade" ? 140 : clima === "folhas" ? 26 : 90;
    while (gotas.length < alvo) gotas.push({ x: Math.random() * W, y: Math.random() * H, v: 0, s: Math.random(), r: Math.random() * 6 });
    if (gotas.length > alvo) gotas.length = alvo;
    const vento = velocidade();
    for (const g of gotas) {
      if (clima === "chuva" || clima === "tempestade") {
        g.y += (700 + g.s * 300) * dt;
        g.x -= (120 + vento * 0.3) * dt;
      } else if (clima === "neve") {
        g.y += (50 + g.s * 40) * dt;
        g.x += Math.sin(tempo + g.s * 10) * 20 * dt - vento * 0.2 * dt;
      } else {
        g.y += (60 + g.s * 60) * dt;
        g.x -= (120 + g.s * 120) * dt;
        g.r += dt * 3;
      }
      if (g.y > H) {
        g.y = -10;
        g.x = Math.random() * (W + 200);
      }
      if (g.x < -20) g.x = W + Math.random() * 100;
    }
    if (clima === "tempestade") {
      proxRaio -= dt;
      if (proxRaio <= 0) {
        proxRaio = 4 + Math.random() * 5;
        flash = reduzido ? 0.3 : 1;
        som.trovao();
      }
    }
  }

  function enviarHud() {
    const proprio = PODERES.find((q) => q.personagem === personagem.id);
    const hud: Hud = {
      pontos,
      vidas,
      poderes: [...ativos]
        .filter(([id]) => id !== proprio?.id)
        .map(([id, r]) => {
          const p = poderPorId(id);
          return { id, nome: p.nome, icone: p.icone, restante: Math.max(0, r / p.duracao) };
        }),
      poderProprio: proprio && {
        nome: proprio.nome,
        icone: proprio.icone,
        cor: proprio.cor,
        estado: ativos.has(proprio.id) ? "ativo" : carga >= 1 ? "pronto" : "carregando",
        barra: ativos.has(proprio.id) ? (ativos.get(proprio.id) ?? 0) / proprio.duracao : carga,
        segundos: Math.ceil(ativos.get(proprio.id) ?? 0),
      },
      aviso: aviso && performance.now() < avisoAte ? aviso : undefined,
    };
    host.hud(hud);
  }

  // ---------------- desenho ----------------
  function desenhar() {
    const alvo = tema.escala && lowCtx ? lowCtx : ctx;
    if (tema.escala && lowCtx) {
      lowCtx.setTransform(tema.escala, 0, 0, tema.escala, 0, 0);
      lowCtx.imageSmoothingEnabled = false;
    } else ctx.setTransform(escala, 0, 0, escala, 0, 0);
    const c = alvo;
    c.save();
    if (tremor > 0) c.translate(Math.sin(tempo * 7) * tremor * 0.5, Math.cos(tempo * 5) * tremor * 0.5);
    const t = ((tod % 4) + 4) % 4;
    const p = tema.paleta;

    // céu
    const [ceuTopo, ceuBaixo] = [ciclo(p.ceu.map((x) => x[0]), t), ciclo(p.ceu.map((x) => x[1]), t)];
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, ceuTopo);
    g.addColorStop(1, ceuBaixo);
    c.fillStyle = g;
    c.fillRect(-20, -20, W + 40, H + 40);

    // estrelas
    const noite = Math.max(0, 1 - Math.abs(t - 3) * 1.4);
    if (noite > 0.02) {
      c.fillStyle = p.estrelas;
      for (const [sx, sy, sp] of estrelas) {
        c.globalAlpha = noite * (0.4 + 0.6 * Math.abs(Math.sin(tempo * 1.5 + sp * 10)));
        c.fillRect(sx * W, sy * H, 2, 2);
      }
      c.globalAlpha = 1;
    }

    tema.decor?.(c, W, H, off, t, tempo, tema);

    // colunas
    for (const q of pilares) {
      if (q.arquivado) continue;
      const centro = q.vao + (q.mov ? Math.sin(q.fase) * q.mov : 0);
      const topo = centro - q.abertura / 2;
      const base = centro + q.abertura / 2;
      const desenhaCol = tema.coluna ?? ((cx: Ctx, w: number, len: number, v: number, qb: boolean) => colunaGrega(cx, w, len, v, qb, tema));
      c.save();
      c.translate(q.x, base);
      desenhaCol(c, LARG_COL, H - base, q.variante, q.quebradaBaixo, tema, tempo);
      if (q.rachada) desenharRacha(c, H - base);
      c.restore();
      c.save();
      c.translate(q.x, topo);
      c.scale(1, -1);
      desenhaCol(c, LARG_COL, topo + 20, (q.variante + 1) % 3, q.quebradaCima, tema, tempo);
      if (q.rachada) desenharRacha(c, topo + 20);
      c.restore();
    }

    // chão
    const yChao = H - CHAO;
    if (tema.chao) tema.chao(c, W, H, yChao, off, tema, t);
    else {
      c.fillStyle = p.chao;
      c.fillRect(0, yChao, W, CHAO);
      c.fillStyle = p.chaoLinha;
      c.fillRect(0, yChao, W, 4);
      for (let x = -(off % 48); x < W; x += 48) c.fillRect(x, yChao + 12, 24, 3);
    }

    // moedas
    for (const m of moedas) {
      const larg = Math.abs(Math.cos(m.fase)) * 9 + 2;
      c.fillStyle = p.moeda[1];
      c.beginPath();
      c.ellipse(m.x, m.y, larg + 1.5, 11, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = p.moeda[0];
      c.beginPath();
      c.ellipse(m.x, m.y, larg, 9.5, 0, 0, Math.PI * 2);
      c.fill();
    }
    // orbes
    for (const o of orbes) {
      const pulso = 1 + Math.sin(tempo * 5) * 0.08;
      c.globalAlpha = 0.3;
      c.fillStyle = o.poder.cor;
      c.beginPath();
      c.arc(o.x, o.y, 24 * pulso, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 1;
      c.beginPath();
      c.arc(o.x, o.y, 17, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "#ffffff";
      c.lineWidth = 2;
      c.stroke();
      const arte = arteDoPoder(o.poder.id);
      if (arte.complete && arte.naturalWidth) c.drawImage(arte, o.x - 16, o.y - 16, 32, 32);
    }

    // jogador
    const e = efeitos();
    c.save();
    c.translate(jog.x, jog.y);
    c.rotate(Math.max(-0.45, Math.min(1.1, jog.vy / 650)));
    const s = e.mini ? 0.6 : 1;
    c.scale(s, s);
    if (e.fantasma) c.globalAlpha = 0.45;
    if (jog.graca > 0 && Math.floor(jog.graca * 12) % 2 === 0) c.globalAlpha *= 0.4;
    if (e.leve) {
      c.fillStyle = "rgba(240,199,126,0.35)";
      c.beginPath();
      c.arc(0, -6, 34, 0, Math.PI * 2);
      c.fill();
    }
    desenharPersonagem(c, personagem.id, tema, jog.fase, tempo);
    c.globalAlpha = 1;
    if (e.escudo) {
      c.strokeStyle = "rgba(90,158,214,0.9)";
      c.lineWidth = 3;
      c.beginPath();
      c.arc(0, -2, 34 + Math.sin(tempo * 8) * 2, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = "rgba(90,158,214,0.15)";
      c.fill();
    }
    c.restore();

    // partículas
    for (const q of parts) {
      c.globalAlpha = 1 - q.vida / q.max;
      c.fillStyle = q.cor;
      c.fillRect(q.x, q.y, q.tam, q.tam * (q.tipo ? 1.8 : 1));
    }
    c.globalAlpha = 1;

    // clima
    if (gotas.length) {
      if (clima === "chuva" || clima === "tempestade") {
        c.strokeStyle = tema.id === "noir" ? "rgba(220,220,220,0.5)" : "rgba(200,220,255,0.55)";
        c.lineWidth = 1.2;
        c.beginPath();
        for (const d of gotas) {
          c.moveTo(d.x, d.y);
          c.lineTo(d.x - 5, d.y + 14);
        }
        c.stroke();
      } else if (clima === "neve") {
        c.fillStyle = "rgba(255,255,255,0.9)";
        for (const d of gotas) {
          c.beginPath();
          c.arc(d.x, d.y, 1.5 + d.s * 2, 0, Math.PI * 2);
          c.fill();
        }
      } else {
        for (const d of gotas) {
          c.save();
          c.translate(d.x, d.y);
          c.rotate(d.r);
          c.fillStyle = tema.id === "papiro" ? "rgba(59,42,26,0.55)" : "rgba(255,250,235,0.85)";
          c.fillRect(-5, -3.5, 10, 7);
          c.fillStyle = "rgba(0,0,0,0.25)";
          c.fillRect(-3.5, -1.5, 7, 0.8);
          c.fillRect(-3.5, 0.5, 5, 0.8);
          c.restore();
        }
      }
    }
    if (clima === "neblina") {
      c.fillStyle = "rgba(255,255,255,0.18)";
      c.fillRect(0, 0, W, H);
    }
    if (flash > 0) {
      c.fillStyle = `rgba(255,255,255,${Math.max(0, flash) * 0.7})`;
      c.fillRect(0, 0, W, H);
    }
    c.restore();

    if (tema.escala && low && lowCtx) {
      if (tema.semAntisserrilhado) tirarAntisserrilhado(lowCtx, low.width, low.height, tema.paleta);
      ctx.setTransform(escala, 0, 0, escala, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(low, 0, 0, W, H);
      ctx.imageSmoothingEnabled = true;
    }
  }

  // ---------------- laço ----------------
  function quadro(agora: number) {
    if (destruido) return;
    raf = requestAnimationFrame(quadro);
    const dt = Math.min(0.1, (agora - (ultimo || agora)) / 1000);
    ultimo = agora;
    if (estado !== "pausado" && estado !== "pergunta" && estado !== "fim") {
      acum += dt;
      while (acum >= PASSO) {
        atualizar(PASSO);
        acum -= PASSO;
      }
    } else if (estado === "pergunta" || estado === "fim") {
      // mantém clima e partículas vivos ao fundo
      atualizarClima(dt);
      tempo += dt;
    }
    if (estado === "pausado" && !redesenhar) return;
    redesenhar = false;
    desenhar();
  }

  const ro = new ResizeObserver(() => redimensionar());
  ro.observe(canvas);
  redimensionar();
  canvas.addEventListener("pointerdown", onPointer);
  window.addEventListener("keydown", onKey);
  document.addEventListener("visibilitychange", onVis);

  const inst: GameInstance = {
    iniciar() {
      reiniciar();
      ultimo = 0;
      acum = 0;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(quadro);
    },
    pausar() {
      if (estado === "jogando" || estado === "pronto") {
        estadoAntesPausa = estado;
        redesenhar = true; // o último quadro da partida fica como fundo da pausa
        mudarEstado("pausado");
      }
    },
    continuar() {
      if (estado === "pausado") {
        ultimo = 0;
        mudarEstado("pronto"); // retoma parado, esperando o toque
        void estadoAntesPausa;
      }
    },
    configurar(o) {
      if (o.estilo) {
        tema = temaPorId(o.estilo);
        som.onda = tema.onda;
        som.base = tema.somBase;
        if (tema.escala) prepararLow();
        clima = tema.climaFixo ?? "limpo";
      }
      if (o.nivel) nivel = o.nivel;
      if (o.personagem) personagem = achaPersonagem(o.personagem);
      if (o.som !== undefined) som.ligado = o.som;
      if (o.movimentoReduzido !== undefined) reduzido = o.movimentoReduzido;
      if (o.autoPoder !== undefined) autoPoder = o.autoPoder;
    },
    usarPoderProprio() {
      usarPoder();
    },
    destruir() {
      destruido = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVis);
      som.fechar();
    },
  };

  if (opcoes.debug) (window as unknown as { __jogador: typeof jog }).__jogador = jog;
  if (opcoes.debug) {
    (window as unknown as { __flap: unknown }).__flap = {
      get invulneravel() {
        return invulneravel;
      },
      set invulneravel(v: boolean) {
        invulneravel = v;
      },
      get orbesLigados() {
        return orbesLigados;
      },
      set orbesLigados(v: boolean) {
        orbesLigados = v;
        // as colunas iniciais já podem ter orbes: sem limpar, uma delas ainda abriria o quiz
        if (!v) orbes = [];
      },
      ativar: (id: string) => ativar(poderPorId(id)),
      estado: () => ({
        estado,
        W,
        passagens: nPilares,
        pontos,
        vidas,
        nMoedas,
        penalidades: nPenalidades,
        aviso: aviso?.titulo ?? null,
        ativos: Object.fromEntries(ativos),
        carga,
        efeitos: efeitos(),
        velocidade: velocidade(),
        velocidadeBase: 165 + Math.min(nPilares, 60) * 2,
        gravidade: GRAVIDADE,
        raio: RAIO * (efeitos().mini ? 0.6 : 1),
        aberturaBase: aberturaBase(),
        pilares: pilares.map((q) => ({
          x: q.x,
          vao: q.vao,
          centro: q.vao + (q.mov ? Math.sin(q.fase) * q.mov : 0),
          abertura: q.abertura,
          rachada: !!q.rachada,
          passou: q.passou,
          penalizada: !!q.penalizada,
          arquivado: !!q.arquivado,
        })),
        moedas: moedas.map((m) => ({ x: m.x, y: m.y, pega: m.pega })),
        jogador: { x: jog.x, y: jog.y, vy: jog.vy, graca: jog.graca },
      }),
    };
  }

  // Tela de fundo animada antes de iniciar (menu)
  reiniciar();
  raf = requestAnimationFrame(quadro);
  return inst;
}
