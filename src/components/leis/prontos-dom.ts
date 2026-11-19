// Os grifos prontos desenhados direto no DOM do texto da lei (o leitor e a prévia dos artigos montam o HTML pronto, e
// não pelo React): as palavras de cada entrada viram <mark data-pronto> dentro do texto do bloco, e o "vide" entra
// depois do texto. Ver src/lib/leis/grifos.ts.
import { faixasVisiveis, prontosDosBlocos, type GrifoPronto, type VideGrifo } from "@/lib/leis/grifos";
import { rotaDaLei } from "@/lib/leis/sumulas";

export interface ClassesProntos {
  /** a <mark> das palavras grifadas */
  marca: string;
  /** a linha do "vide" depois do texto */
  vide: string;
}

/** Tira os grifos prontos desenhados (as palavras e os "vide"), para desenhar de novo. As marcações do usuário ficam. */
export function desmarcarProntos(raiz: HTMLElement) {
  raiz.querySelectorAll("mark[data-pronto]").forEach((m) => m.replaceWith(...Array.from(m.childNodes)));
  raiz.querySelectorAll("[data-pronto-vide]").forEach((v) => v.remove());
  raiz.querySelectorAll<HTMLElement>("[data-com-pronto]").forEach((b) => delete b.dataset.comPronto);
  raiz.normalize();
}

/** Envolve o intervalo [ini, fim) do texto de `el` numa <mark> de grifo pronto, atravessando links e outros nós. */
function envolverPronto(el: HTMLElement, ini: number, fim: number, faca: (m: HTMLElement) => void) {
  const andar = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const pedacos: { no: Text; a: number; b: number }[] = [];
  let pos = 0;
  for (let n = andar.nextNode() as Text | null; n; n = andar.nextNode() as Text | null) {
    const len = n.data.length;
    const a = Math.max(ini, pos);
    const b = Math.min(fim, pos + len);
    if (a < b) pedacos.push({ no: n, a: a - pos, b: b - pos });
    pos += len;
  }
  for (const { no, a, b } of pedacos) {
    const alvo = no.splitText(a);
    alvo.splitText(b - a);
    const mark = document.createElement("mark");
    faca(mark);
    alvo.replaceWith(mark);
    mark.append(alvo);
  }
}

/** O "vide" do grifo pronto: links para o outro dispositivo do mesmo tema, que abrem a prévia como as referências. */
function linhaDoVide(vides: readonly VideGrifo[], lei: string, classe: string): HTMLElement {
  const s = document.createElement("span");
  s.className = classe;
  s.dataset.prontoVide = "1";
  s.append("vide ");
  vides.forEach((v, k) => {
    if (k) s.append("; ");
    const art = v.disp.split(".")[0]!;
    const a = document.createElement("a");
    a.href = v.lei === lei ? `#${art}` : `${rotaDaLei(v.lei)}#${art}`;
    // a prévia do artigo (PopupArtigos) abre com data-lei/data-art e destaca o dispositivo de data-disp
    a.dataset.lei = v.lei;
    a.dataset.art = art;
    if (v.disp !== art) a.dataset.disp = v.disp;
    a.textContent = v.rotulo;
    s.append(a);
  });
  return s;
}

/**
 * Desenha os grifos prontos nos blocos: `blocos` são os elementos de cada bloco, `txtDe` acha o elemento do texto de um
 * bloco (é nele que as posições das palavras valem) e `tipoDe` o tipo do bloco (o "vide" não fica num bloco "texto").
 * Devolve quantos blocos receberam grifo.
 */
export function pintarProntos(
  blocos: readonly HTMLElement[],
  txtDe: (b: HTMLElement) => HTMLElement | null,
  grifos: readonly GrifoPronto[],
  corDe: (g: GrifoPronto) => string | undefined,
  rotuloDe: (g: GrifoPronto) => string,
  lei: string,
  classes: ClassesProntos,
  tipoDe: (b: HTMLElement) => string | undefined = () => undefined,
): number {
  if (!grifos.length) return 0;
  const pinturas = prontosDosBlocos(
    blocos.map((b) => ({ disp: b.dataset.disp, superada: b.dataset.sup === "1", texto: txtDe(b)?.textContent ?? "", tipo: tipoDe(b) })),
    grifos,
  );
  let n = 0;
  for (const [i, p] of pinturas) {
    const b = blocos[i];
    const txt = b && txtDe(b);
    if (!b || !txt) continue;
    const faixas = faixasVisiveis(p, grifos, corDe, rotuloDe);
    for (const f of faixas)
      envolverPronto(txt, f.ini, f.fim, (m) => {
        m.className = classes.marca;
        m.dataset.pronto = f.linha && !f.fundo ? "pedido" : "1";
        if (f.fundo) m.style.setProperty("--pronto-fundo", f.fundo);
        if (f.linha) m.style.setProperty("--pronto-linha", f.linha);
        m.dataset.regra = f.titulos.join("\n");
        if (f.notas.length) m.dataset.regraNota = f.notas.join(" · ");
        if (f.essencial) m.dataset.essencial = "1";
        m.title = [...f.titulos, ...f.notas].join("\n");
      });
    if (p.vide.length) b.append(linhaDoVide(p.vide, lei, classes.vide));
    if (faixas.length || p.vide.length) {
      b.dataset.comPronto = "1";
      n++;
    }
  }
  return n;
}
