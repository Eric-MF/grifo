// O trecho que a voz está dizendo, destacado na tela: um intervalo do texto (CSS Custom Highlight "grifo-fala", com a cor
// em globals.css), sem mexer no HTML da página. Serve ao leitor das leis (useOuvir) e à questão lida no treino.

type Destaques = { set(nome: string, h: unknown): void; delete(nome: string): void };
const NOME = "grifo-fala";
const registro = (): Destaques | null => (typeof CSS !== "undefined" && "highlights" in CSS ? (CSS as unknown as { highlights: Destaques }).highlights : null);

/** O intervalo [ini, fim) do texto de `el` como Range (para destacar o trecho dito). */
export function faixaDoTexto(el: HTMLElement, ini: number, fim: number): Range | null {
  const andar = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let pos = 0;
  let r: Range | null = null;
  for (let n = andar.nextNode() as Text | null; n; n = andar.nextNode() as Text | null) {
    const tam = n.data.length;
    if (!r && ini <= pos + tam) {
      r = document.createRange();
      r.setStart(n, Math.max(0, ini - pos));
    }
    if (r && fim <= pos + tam) {
      r.setEnd(n, Math.max(0, fim - pos));
      return r;
    }
    pos += tam;
  }
  return null;
}

/** Destaca o intervalo (null: tira o destaque). Sem o destaque no navegador, nada acontece (fica o do parágrafo). */
export function destacarFaixa(r: Range | null) {
  const reg = registro();
  const H = (globalThis as { Highlight?: new (...r: Range[]) => unknown }).Highlight;
  if (reg && H && r) reg.set(NOME, new H(r));
  else reg?.delete(NOME);
}
