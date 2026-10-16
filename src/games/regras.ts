// Avaliação das regras de desbloqueio. Pura: recebe os contadores de conquista, o progresso e os itens,
// e diz quais itens liberam agora e quanto cobrar. Quem chama aplica o resultado (ver GameHost).
import type { Conquistas } from "@/lib/conquistas";
import { formatarMoedas } from "./contadores";
import type { ItemJogo, Regra } from "./types";

export interface Contexto {
  conquistas: Conquistas;
  moedas: number;
  comprados: string[];
  /** todos os itens do menu (estilos e personagens), para a regra "todas as compras" */
  itens: ItemJogo[];
  agora: Date;
}

export interface Avaliacao {
  /** ids de itens liberados agora */
  novos: string[];
  /** moedas descontadas ao liberar (Dracofisco, juros do Gafanhoto de Mora) */
  cobrar: number;
  /** a ausência pendente foi cobrada e deve ser consumida */
  consumiuAusencia: boolean;
}

function cumprida(r: Regra, item: ItemJogo, c: Contexto): boolean {
  const k = c.conquistas;
  switch (r.tipo) {
    case "categoria":
      return (k.acertosPorCategoria[r.categoria] ?? 0) >= r.acertos;
    case "sequencia":
      return k.acertosSeguidos >= r.acertos;
    case "modo-escuro":
      return k.diasEscuro.sequencia >= r.dias;
    case "resposta-rapida":
      return k.menorTempoRespostaMs !== null && k.menorTempoRespostaMs < r.ms;
    case "pausa-longa":
      return k.maiorPausaMs > r.ms;
    case "foco":
      return k.maiorFocoMs >= r.ms;
    case "artigos":
      return k.cliquesArtigos >= r.cliques;
    case "tentativa-compra":
      return k.tentativasCompra > 0;
    case "todas-compras":
      return c.itens.filter((i) => i.id !== item.id && i.custo !== undefined).every((i) => c.comprados.includes(i.id));
    case "horario": {
      const h = c.agora.getHours();
      return r.de <= r.ate ? h >= r.de && h < r.ate : h >= r.de || h < r.ate;
    }
    case "moedas":
      return c.moedas >= r.minimo;
    case "ausencia":
      return k.ausenciaPendente;
  }
}

/** Quais itens liberam agora, quanto cobrar e se a ausência foi cobrada. Só mexe em itens ainda bloqueados. */
export function avaliarItens(c: Contexto): Avaliacao {
  const novos: string[] = [];
  let cobrar = 0;
  for (const item of c.itens) {
    if (!item.regras?.length || c.comprados.includes(item.id)) continue;
    const regra = item.regras.find((r) => r.tipo !== "ausencia" && cumprida(r, item, c));
    if (!regra) continue;
    novos.push(item.id);
    if (regra.tipo === "moedas") cobrar += regra.cobra;
  }
  // Ausência: a volta depois de muitos dias cobra juros uma vez, e libera o item que tem essa regra.
  let consumiuAusencia = false;
  if (c.conquistas.ausenciaPendente) {
    for (const item of c.itens) {
      const r = item.regras?.find((x) => x.tipo === "ausencia");
      if (!r || r.tipo !== "ausencia") continue;
      if (!c.comprados.includes(item.id) && !novos.includes(item.id)) novos.push(item.id);
      cobrar += Math.floor(c.moedas * r.juros);
      consumiuAusencia = true;
      break;
    }
  }
  return { novos, cobrar, consumiuAusencia };
}

/** Texto da condição para mostrar no lugar do nome de um item bloqueado. */
export function textoRequisito(item: ItemJogo, nomeCategoria: (id: string) => string): string | undefined {
  if (!item.regras?.length) return undefined;
  return item.regras
    .map((r): string => {
      switch (r.tipo) {
        case "categoria":
          return `${r.acertos} respostas certas em ${nomeCategoria(r.categoria)}`;
        case "sequencia":
          return `${r.acertos} respostas certas seguidas`;
        case "modo-escuro":
          return `${r.dias} dias seguidos com o tema escuro`;
        case "resposta-rapida":
          return `uma resposta em menos de ${r.ms / 1000} s`;
        case "pausa-longa":
          return `pausar o jogo por mais de ${r.ms / 60000} min e voltar`;
        case "foco":
          return `${r.ms / 60000} min seguidos na tela do jogo, sem trocar de aba`;
        case "artigos":
          return `clicar em ${r.cliques} artigos nas respostas`;
        case "tentativa-compra":
          return "tentar comprar sem moedas suficientes";
        case "todas-compras":
          return "ter todos os outros itens compráveis";
        case "horario":
          return `entre ${r.de}h e ${r.ate}h`;
        case "moedas":
          return `juntar ${formatarMoedas(r.minimo)}`;
        case "ausencia":
          return `voltar depois de mais de ${r.dias} dias sem abrir o site`;
      }
    })
    .join(" ou ");
}
