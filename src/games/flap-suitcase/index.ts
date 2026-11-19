import type { CoresMenu, GameModule } from "../types";
import { criarJogo } from "./engine";
import { PODERES, poderPorId } from "./powers";
import { PRECOS_NIVEL, trilhasDoPoder } from "./melhorias";
import { auraAtras, auraFrente, auraRastro, coresAura } from "./aura";
import { motivoDe } from "./motivos";
import { desenharMecanica, desenharMomento, temMecanica, type CenaMomento, type DadosMecanica, type Momento } from "./momentos";
import { TEXTOS_MOMENTO } from "./momentos-textos";
import type { IdPoder } from "./powers";
import { CUSTO_ESTILOS, CUSTO_TETO, ESTILOS_EM_SEQUENCIA, GRUPOS_ESTILOS, PERSONAGENS } from "./progressao";
import { desenharPersonagem } from "./personagens";
import { arte8bit } from "./arte8bit";
import { temaPorId, TEMAS } from "./catalogo";
import { colunaGrega } from "./themes";
import { textoRequisito } from "../regras";
import { nomeCategoria } from "@/quiz/categorias";
import type { Categoria } from "@/quiz/types";

const poderDe = (id: string) => PODERES.find((q) => q.personagem === id);

/** Ícones dos poderes para a auréola da prévia (o motor tem o seu próprio cache). */
const icones = new Map<string, HTMLImageElement>();
function iconeDoPoder(id: string): HTMLImageElement {
  let img = icones.get(id);
  if (!img) {
    img = new Image();
    img.src = poderPorId(id).icone;
    icones.set(id, img);
  }
  return img;
}

/** Luminância relativa de uma cor em hexadecimal (para escolher texto claro ou escuro sobre ela). */
function luminancia(hex: string) {
  const v = hex.replace("#", "");
  const n = v.length === 3 ? v.split("").map((c) => c + c).join("") : v.slice(0, 6);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Cores do painel dos poderes no estilo escolhido: a coluna dá o tom e a borda, a linha do recorde dá o destaque. */
function coresMenu(estilo: string): CoresMenu {
  const p = temaPorId(estilo).paleta;
  const acento = p.recorde.cor.startsWith("#") ? p.recorde.cor : p.moeda[0];
  return {
    fundo: p.coluna.corpo,
    borda: p.coluna.contorno,
    acento,
    texto: acento.startsWith("#") && luminancia(acento) > 0.45 ? "#14110c" : "#ffffff",
    ceu: [p.ceu[1][0], p.ceu[1][1]],
  };
}

/** Estilos que existem no código, mas não aparecem no menu. Para voltar a mostrar, tire o id desta lista. */
const FORA_DO_MENU = ["pixel"];

const modulo: GameModule = {
  criar: criarJogo,
  estilos: TEMAS.filter((t) => !FORA_DO_MENU.includes(t.id)).map((t) => ({
    id: t.id,
    nome: t.nome,
    descricao: t.descricao,
    custo: CUSTO_ESTILOS[t.id] ?? (t.grupo ? CUSTO_TETO : undefined),
    sequencial: ESTILOS_EM_SEQUENCIA.includes(t.id),
    grupo: t.grupo,
    janela: t.janela,
    amostra: t.amostra,
  })),
  gruposEstilos: GRUPOS_ESTILOS,
  personagens: PERSONAGENS.map((p) => {
    const poder = poderDe(p.id);
    return {
      id: p.id,
      nome: p.nome,
      descricao: p.descricao,
      xp: p.xp,
      xpLegado: p.xpLegado,
      regras: p.regras,
      secreto: p.secreto,
      comoObter: p.comoObter,
      requisito: textoRequisito({ id: p.id, nome: p.nome, descricao: p.descricao, regras: p.regras }, (id) => nomeCategoria(id as Categoria)),
      poder: poder && { nome: poder.nome, descricao: poder.descricao, icone: poder.icone, duracao: poder.duracao },
      // miniatura do menu: a mesma escala de pixels do jogo (buffer de 200 linhas: ~3,2 unidades lógicas por célula)
      desenhar: (c, estilo) => desenharPersonagem(c, p.id, temaPorId(estilo), 0.5, 0, 200 / 640),
    };
  }),
  // melhorias dos poderes (melhorias.ts): as 4 trilhas de cada poder, com os textos de cada nível e os preços
  poderes: PODERES.map((p) => ({
    id: p.id,
    nome: p.nome,
    descricao: p.descricao,
    icone: p.icone,
    cor: p.cor,
    personagem: p.personagem,
    trilhas: trilhasDoPoder(p).map((t) => ({ id: t.id, nome: t.nome, niveis: t.niveis, precos: PRECOS_NIVEL })),
  })),
  coresMenu,
  // prévia do painel: o personagem no estilo escolhido, com a aura do poder no nível visual (centro em 0, 0) e o momento
  // do poder (momentos.ts) repetido a cada poucos segundos, menor quando acontece numa coluna
  desenharPoder: (c, poder, nivelVisual, estilo, personagem, t) => {
    const tema = temaPorId(estilo);
    const motivo = motivoDe(poder);
    const cores = coresAura(motivo.cores[0].startsWith("#") ? motivo.cores[0] : poderPorId(poder).cor, tema);
    const id = poder as IdPoder;
    const texto = TEXTOS_MOMENTO[id];
    const cena: CenaMomento = {
      tema,
      cores,
      motivo,
      dono: poderPorId(poder).personagem,
      jogador: personagem,
      icone: iconeDoPoder(poder),
      t,
      altura: 140,
      largura: 140,
      coluna: (cx, len, v) => (tema.coluna ? tema.coluna(cx, 74, len, v, false, tema, t) : colunaGrega(cx, 74, len, v, false, tema)),
    };
    // a mecânica (o caminho da guia, as linhas do ímã, a lupa), com alvos de mentira à direita do personagem
    const mecanica: DadosMecanica | null =
      nivelVisual >= 1 && temMecanica(id) && id !== "congelar"
        ? { x: 0, y: 0, raio: 90, alvos: id === "leve" || id === "voo" ? [[64, -14, 30]] : id === "inquerito" ? [[60, -12, 0]] : [[54, -26, 0], [60, 22, 0]] }
        : null;
    let momento: { m: Momento; escala: number } | null = null;
    if (texto && nivelVisual >= 1) {
      const ciclo = texto.dur + 0.9;
      const idade = t % ciclo;
      if (idade < texto.dur) {
        // a prévia é pequena: o momento sai menor que no jogo, para caber (o de coluna, à direita do personagem)
        const [x, y, escala] = texto.ancora === "coluna" ? [40, 0, 0.42] : texto.ancora === "moeda" ? [24, -6, 0.7] : [0, 0, 0.6];
        momento = {
          m: { id, x, y, idade, nivel: nivelVisual, principal: true, ab: 46, dx: 70 / escala, dy: 8, n: 1, variante: 0, alvos: [[60, -20]], semente: Math.floor(t / ciclo) },
          escala,
        };
      }
    }
    auraRastro(c, nivelVisual, motivo, t);
    if (mecanica) desenharMecanica(c, id, nivelVisual, mecanica, cena);
    if (momento) desenharMomento(c, momento.m, cena, "atras", momento.escala);
    auraAtras(c, nivelVisual, cores, t);
    desenharPersonagem(c, personagem, tema, t * 9, t);
    auraFrente(c, nivelVisual, cores, t, motivo, iconeDoPoder(poder));
    if (momento) desenharMomento(c, momento.m, cena, "frente", momento.escala);
  },
  iconesHud: (estilo) =>
    estilo === "pixel"
      ? {
          coracao: arte8bit("hud/coracao.png"),
          pausa: arte8bit("hud/pausa.png"),
          somLigado: arte8bit("hud/som-ligado.png"),
          somDesligado: arte8bit("hud/som-desligado.png"),
          telaCheia: arte8bit("hud/tela-cheia.png"),
          moldura: arte8bit("hud/moldura.png"),
        }
      : null,
  comoJogar: {
    texto:
      "Toque na tela, clique ou aperte espaço para a maleta bater as asas. Passe entre as colunas e pegue moedas. Cada coluna passada rende experiência (XP); níveis mais difíceis rendem mais. As colunas rachadas são mais estreitas: bater nelas não encerra a partida, mas traz uma penalidade. Os orbes coloridos são poderes: para ativá-los, responda qual é a peça cabível no caso. Se bater, você tem uma chance de Revisão Criminal. As moedas compram estilos e melhoram os poderes (cada melhoria tem um contrapeso); o XP libera personagens, e cada personagem tem um poder próprio que aparece com mais frequência. O poder do seu personagem é usado sozinho quando a barra enche; para usá-lo quando quiser, desligue o poder automático no alto do menu e toque no poder no alto da tela ou aperte E. P ou Esc pausa.",
  },
};
export default modulo;
