// Texto da questão para copiar (ex.: para colar num e-mail de erro). `textoParaCopiar` é pura. `copiarTexto` manda o texto
// para a área de transferência com um clique: pela API quando o contexto é seguro (https ou localhost), e, fora dele,
// pelo evento de cópia clássico. Esse evento só conta como feito se de fato entregou o texto.
import { LETRAS, type Nivel, type Pergunta } from "./types";
import type { Correcao } from "./verificar";

/**
 * Texto da questão como aparece na tela: id, enunciado, comando e as alternativas (quando há), na ordem exibida
 * (`alts`: as peças do fácil de peça; `facil`: as alternativas do fácil de tese).
 * Com `resposta` (ver textoResposta), ela vai no fim, separada por uma linha em branco.
 */
export function textoParaCopiar(p: Pergunta, nivel: Nivel, comando: string, alts: { nome: string }[], facil: { texto: string }[], resposta?: string): string {
  const opcoes: string[] = [];
  if (p.formato === "peca" && nivel === 1) {
    alts.forEach((a, i) => opcoes.push(`${LETRAS[i]}) ${a.nome}`));
  } else if (p.formato === "tese" && nivel === 1) {
    facil.forEach((o, i) => opcoes.push(`${LETRAS[i]}) ${o.texto}`));
  } else if (p.formato === "objetiva") {
    for (const l of LETRAS) opcoes.push(`${l}) ${p.alternativas[l]}`);
  }
  // uma linha em branco separa o enunciado das alternativas, quando há alternativas
  return [`Questão: ${p.id}`, "", p.caso, "", comando, ...(opcoes.length ? ["", ...opcoes] : []), ...(resposta ? ["", resposta] : [])].join("\n");
}

/**
 * A resposta da questão, como aparece no feedback: a letra e o texto na objetiva, a peça e o fundamento na peça,
 * e a tese, o artigo e o padrão de respostas na tese.
 */
export function textoResposta(p: Pergunta, res: Correcao): string {
  if (res.formato === "peca") return `Resposta: ${res.pecaEsperada} — ${res.fundamentoEsperado}`;
  if (res.formato === "objetiva" && p.formato === "objetiva") return `Resposta: ${res.correta}) ${p.alternativas[res.correta]}`;
  if (res.formato === "tese") return `Resposta: ${res.teseEsperada} — ${res.artigoEsperado}\n\nPadrão de respostas: ${p.explicacao}`;
  return "";
}

/** Copia o texto. Devolve true só se o navegador confirmou a entrega à área de transferência. */
export async function copiarTexto(texto: string): Promise<boolean> {
  if (window.isSecureContext && typeof navigator.clipboard?.writeText === "function") {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch {
      // o navegador recusou (por exemplo, a página sem foco): tenta o caminho clássico
    }
  }
  return copiaPeloEvento(texto);
}

/**
 * Cópia clássica, fora de contexto seguro: seleciona um campo oculto e dispara o `copy`. O texto é entregue no próprio
 * evento (`clipboardData`), então não depende da seleção. Só vale se o evento rodou e o navegador aceitou a cópia.
 */
function copiaPeloEvento(texto: string): boolean {
  let entregue = false;
  const aoCopiar = (ev: ClipboardEvent) => {
    if (!ev.clipboardData) return;
    ev.clipboardData.setData("text/plain", texto);
    ev.preventDefault();
    entregue = true;
  };
  const campo = document.createElement("textarea");
  campo.value = texto;
  campo.setAttribute("readonly", "");
  campo.style.position = "fixed";
  campo.style.top = "0";
  campo.style.left = "0";
  campo.style.opacity = "0";
  document.body.appendChild(campo);
  campo.select();
  document.addEventListener("copy", aoCopiar);
  let aceita = false;
  try {
    aceita = document.execCommand("copy");
  } finally {
    document.removeEventListener("copy", aoCopiar);
    campo.remove();
  }
  return aceita && entregue;
}
