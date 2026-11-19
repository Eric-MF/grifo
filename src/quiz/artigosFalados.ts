// Responder falando, depois do erro: o artigo certo e o que a pessoa citou, lidos em voz alta. De cada um, o caput e o
// que foi citado (o inciso, a alínea, com o parágrafo ou o inciso de que fazem parte): não o artigo inteiro, que pode
// ter dezenas de incisos. Sem nada citado e com o caput terminando em dois-pontos, o que vem logo depois, até um limite.
import { artigoParaPrevia } from "@/lib/leis/artigo-previa";
import type { Classes } from "@/lib/leis/html";
import type { Pergunta } from "./types";
import { artigosCitados, type ArtigoCitado, type Correcao } from "./verificar";

/** Um bloco do texto do artigo, no que a leitura precisa. */
export interface BlocoDoArtigo {
  disp?: string;
  tipo?: string;
  texto?: string;
}

/** O artigo da resposta certa: o fundamento da peça, o artigo da tese ou o dispositivo da objetiva. */
export function artigoCerto(p: Pergunta): ArtigoCitado | null {
  const texto = p.formato === "peca" ? p.resposta.fundamentos[0] : p.formato === "tese" ? p.artigos[0] : p.dispositivos[0];
  return (texto && artigosCitados(texto)[0]) || null;
}

/**
 * O artigo errado que a pessoa deu: o que ela citou (se não é o certo) ou, escolhida a peça errada nas alternativas, o
 * fundamento dessa peça. null: nada a comparar.
 */
export function artigoErrado(r: Correcao): ArtigoCitado | null {
  if (r.formato === "peca") {
    if (r.acertouFundamento === false) return r.respondida?.artigos[0] ?? null;
    if (r.acertouFundamento === null && !r.acertouPeca) return artigosCitados(r.respondida?.fundamentoDaPeca[0] ?? "")[0] ?? null;
    return null;
  }
  if (r.formato === "tese" && r.acertouArtigo === false) return r.respondida.artigos[0] ?? null;
  return null;
}

/** As notas entre parênteses ("Redação dada pela Lei…", "Incluído pela…", "Vide…"): não se leem. */
const NOTA = /\s*\((?:Reda[çc][ãa]o dada|Inclu[íi]d[oa]|Acrescid[oa]|Vide|Revogad[oa]|Renumerad[oa]|Vig[êe]ncia)[^)]*\)/gi;

/** O trecho do artigo a ler: o caput e o citado (com o parágrafo ou o inciso de que faz parte); sem rubricas nem títulos. */
export function trechoDoArtigo(blocos: readonly BlocoDoArtigo[], citado: Pick<ArtigoCitado, "art" | "disps">, maximo = 700): string {
  const dele = blocos.filter((b) => b.disp && (b.disp === citado.art || b.disp.startsWith(`${citado.art}.`)) && b.tipo !== "rubrica" && b.tipo !== "estrutura" && b.texto?.trim());
  const querer = new Set<string>([citado.art]);
  for (const d of citado.disps) {
    const partes = d.split(".");
    for (let k = 2; k <= partes.length; k++) querer.add(partes.slice(0, k).join("."));
  }
  const escolhidos = dele.filter((b) => querer.has(b.disp!));
  // só o artigo citado e o caput pedindo continuação ("Caberá apelação…:"): o que vem logo depois, até o limite
  const caput = escolhidos.at(-1);
  if (!citado.disps.length && caput && /:\s*$/.test((caput.texto ?? "").replace(NOTA, ""))) {
    let tamanho = escolhidos.reduce((s, b) => s + (b.texto?.length ?? 0), 0);
    for (const b of dele.slice(dele.indexOf(caput) + 1)) {
      if (tamanho + (b.texto?.length ?? 0) > maximo) break;
      escolhidos.push(b);
      tamanho += b.texto?.length ?? 0;
    }
  }
  return escolhidos
    .map((b) => (b.texto ?? "").replace(NOTA, "").trim())
    .filter(Boolean)
    .join(" ");
}

const SEM_CLASSES: Classes = {
  b: "",
  txt: "",
  ref: "",
  rotulo: "",
  atos: "",
  ato: "",
  info: "",
  infoLinha: "",
  estrela: "",
  naoEncontrada: "",
  tipos: { estrutura: "", rubrica: "", artigo: "", paragrafo: "", inciso: "", alinea: "", texto: "" },
};

async function lerTrecho(a: ArtigoCitado): Promise<{ nome: string; texto: string } | null> {
  if (!a.lei || !a.art) return null;
  const p = await artigoParaPrevia(a.lei, a.art, false, SEM_CLASSES).catch(() => null);
  if (!p) return null;
  const texto = trechoDoArtigo(p.blocos, a);
  return texto ? { nome: p.nome, texto } : null;
}

const mesmo = (a: ArtigoCitado | null, b: ArtigoCitado | null) => !!a && !!b && a.lei === b.lei && a.art === b.art && a.disps.join() === b.disps.join();

/**
 * O que ler depois do erro: o artigo certo e o errado (o que a pessoa citou, ou o da peça que ela escolheu), cada um
 * com o nome da lei. Vazio: não há artigo do leitor para ler (uma súmula, uma lei fora do Vade Mecum).
 */
export async function artigosParaLer(p: Pergunta, r: Correcao): Promise<string[]> {
  const certo = artigoCerto(p);
  const errado = artigoErrado(r);
  const [c, e] = await Promise.all([certo ? lerTrecho(certo) : null, errado && !mesmo(certo, errado) ? lerTrecho(errado) : null]);
  const textos: string[] = [];
  if (c) textos.push(`O artigo certo, ${c.nome}: ${c.texto}`);
  if (e) textos.push(`${r.formato === "peca" && r.acertouFundamento === null ? "O artigo da peça que você escolheu" : "O que você citou"}, ${e.nome}: ${e.texto}`);
  return textos;
}
