import type { GameModule } from "../types";
import { criarJogo } from "./engine";
import { PODERES } from "./powers";
import { CUSTO_ESTILOS, PERSONAGENS } from "./progressao";
import { desenharPersonagem } from "./personagens";
import { temaPorId, TEMAS } from "./themes";

const poderDe = (id: string) => PODERES.find((q) => q.personagem === id);

const modulo: GameModule = {
  criar: criarJogo,
  estilos: TEMAS.map((t) => ({ id: t.id, nome: t.nome, descricao: t.descricao, custo: CUSTO_ESTILOS[t.id] })),
  personagens: PERSONAGENS.map((p) => {
    const poder = poderDe(p.id);
    return {
      id: p.id,
      nome: p.nome,
      descricao: p.descricao,
      xp: p.xp,
      poder: poder && { nome: poder.nome, descricao: poder.descricao, icone: poder.icone, duracao: poder.duracao },
      desenhar: (c, estilo) => desenharPersonagem(c, p.id, temaPorId(estilo), 0.5, 0),
    };
  }),
  comoJogar: {
    texto:
      "Toque na tela, clique ou aperte espaço para a maleta bater as asas. Passe entre as colunas e pegue moedas. Cada coluna passada rende experiência (XP); níveis mais difíceis rendem mais. As colunas rachadas são mais estreitas: bater nelas não encerra a partida, mas traz uma penalidade. Os orbes coloridos são poderes: para ativá-los, responda qual é a peça cabível no caso. Se bater, você tem uma chance de Revisão Criminal. As moedas compram estilos; o XP libera personagens, e cada personagem tem um poder próprio que aparece com mais frequência. P ou Esc pausa.",
    itens: PODERES.map((p) => {
      const dono = PERSONAGENS.find((q) => q.id === p.personagem);
      return { icone: p.icone, texto: `${p.nome}: ${p.descricao}${dono ? ` (poder do personagem ${dono.nome})` : ""}` };
    }),
  },
};
export default modulo;
