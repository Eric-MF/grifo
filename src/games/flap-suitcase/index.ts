import type { GameModule } from "../types";
import { criarJogo } from "./engine";
import { PODERES } from "./powers";
import { CUSTO_ESTILOS, PERSONAGENS } from "./progressao";
import { desenharPersonagem } from "./personagens";
import { arte8bit } from "./arte8bit";
import { temaPorId, TEMAS } from "./themes";
import { textoRequisito } from "../regras";
import { nomeCategoria } from "@/quiz/categorias";
import type { Categoria } from "@/quiz/types";

const poderDe = (id: string) => PODERES.find((q) => q.personagem === id);

/** Estilos que existem no código, mas não aparecem no menu. Para voltar a mostrar, tire o id desta lista. */
const FORA_DO_MENU = ["pixel"];

const modulo: GameModule = {
  criar: criarJogo,
  estilos: TEMAS.filter((t) => !FORA_DO_MENU.includes(t.id)).map((t) => ({ id: t.id, nome: t.nome, descricao: t.descricao, custo: CUSTO_ESTILOS[t.id] })),
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
      "Toque na tela, clique ou aperte espaço para a maleta bater as asas. Passe entre as colunas e pegue moedas. Cada coluna passada rende experiência (XP); níveis mais difíceis rendem mais. As colunas rachadas são mais estreitas: bater nelas não encerra a partida, mas traz uma penalidade. Os orbes coloridos são poderes: para ativá-los, responda qual é a peça cabível no caso. Se bater, você tem uma chance de Revisão Criminal. As moedas compram estilos; o XP libera personagens, e cada personagem tem um poder próprio que aparece com mais frequência. O poder do seu personagem é usado sozinho quando a barra enche; em Opções, desligue a opção para usá-lo tocando no alto da tela ou apertando E. P ou Esc pausa.",
    itens: PODERES.map((p) => {
      const dono = PERSONAGENS.find((q) => q.id === p.personagem);
      return { icone: p.icone, texto: `${p.nome}: ${p.descricao}${dono ? ` (poder do personagem ${dono.nome})` : ""}`, personagem: dono?.id };
    }),
  },
};
export default modulo;
