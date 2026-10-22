// Gera, no navegador, o PDF da folha de respostas (peça e questões) e o caderno de caligrafia, a partir do layout em mm
// (src/lib/folha/layout.ts). A folha leva a hora do download e o exame escolhido, por isso não é um arquivo pronto.
import { LineCapStyle, PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { LOGO_PATHS } from "@/components/logo-paths";
import { code128B, codigoDaFolha, modulosCode128, numeroDoCanto, numeroDoDownload } from "./codigos";
import type { Layout, Texto } from "./layout";

const MM = 72 / 25.4;
const A4 = { largura: 210, altura: 297 };
const PRETO = rgb(0, 0, 0);
/** altura das maiúsculas da Helvetica, em frações do tamanho da letra */
const ALTURA_MAIUSCULA = 0.718;

/** Onde cada elemento foi desenhado (mm), para o editor saber o que foi clicado. */
export interface CaixaElemento {
  pagina: number;
  chave: string;
  x: number;
  y: number;
  largura: number;
  altura: number;
}

export interface Recursos {
  /** a logo "Grifo em Progresso" já em PNG (o PDF não leva SVG) e a proporção largura/altura dela */
  logoProgresso?: { png: Uint8Array; proporcao: number };
}

export interface PedidoFolha {
  layout: Layout;
  /** o número do exame no rodapé e no número do código de barras; sem ele, "__" */
  exame?: number | null;
  agora?: Date;
  /** números aleatórios (o do canto e os códigos das páginas); o editor passa um fixo, para nada mudar a cada ajuste */
  sorteio?: () => number;
  /** só estas páginas (0 = a 1ª da peça); sem isso, todas */
  paginas?: number[];
  recursos?: Recursos;
}

/** Sorteio repetível (mulberry32), para a prévia do editor não mudar os códigos a cada ajuste. */
export function sorteioFixo(semente: number): () => number {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const preencher = (modelo: string, valores: Record<string, string | number>) =>
  modelo.replace(/\{(\w+)\}/g, (m, k: string) => (k in valores ? String(valores[k]) : m));

class Fontes {
  private cache = new Map<string, Promise<PDFFont>>();
  constructor(private doc: PDFDocument) {}
  obter(fonte: Texto["fonte"], negrito: boolean): Promise<PDFFont> {
    const nome = {
      helvetica: negrito ? StandardFonts.HelveticaBold : StandardFonts.Helvetica,
      times: negrito ? StandardFonts.TimesRomanBold : StandardFonts.TimesRoman,
      courier: negrito ? StandardFonts.CourierBold : StandardFonts.Courier,
    }[fonte];
    let f = this.cache.get(nome);
    if (!f) {
      f = this.doc.embedFont(nome);
      this.cache.set(nome, f);
    }
    return f;
  }
}

/** Uma página em desenho: converte mm (de cima para baixo) para pontos do PDF (de baixo para cima) e guarda as caixas. */
class Folha {
  constructor(
    readonly page: PDFPage,
    readonly fontes: Fontes,
    readonly indice: number,
    readonly caixas: CaixaElemento[],
  ) {}
  px = (mm: number) => mm * MM;
  py = (mm: number) => (A4.altura - mm) * MM;
  marcar(chave: string, x: number, y: number, largura: number, altura: number) {
    this.caixas.push({ pagina: this.indice, chave, x, y, largura, altura });
  }

  async texto(chave: string, tx: Texto, texto: string) {
    const f = await this.fontes.obter(tx.fonte, tx.negrito);
    const w = f.widthOfTextAtSize(texto, tx.tamanho) / MM;
    const x = tx.alinhamento === "centro" ? tx.x - w / 2 : tx.alinhamento === "direita" ? tx.x - w : tx.x;
    this.page.drawText(texto, { x: this.px(x), y: this.py(tx.y), size: tx.tamanho, font: f, color: PRETO });
    const alto = (tx.tamanho * ALTURA_MAIUSCULA) / MM;
    this.marcar(chave, x, tx.y - alto, w, alto + (tx.tamanho * 0.2) / MM);
  }

  linha(x0: number, y0: number, x1: number, y1: number, espessura: number) {
    this.page.drawLine({ start: { x: this.px(x0), y: this.py(y0) }, end: { x: this.px(x1), y: this.py(y1) }, thickness: espessura, color: PRETO, lineCap: LineCapStyle.Projecting });
  }
}

interface Pedaco {
  t: string;
  destaque: boolean;
}

/** "**trecho**" vira destaque (negrito e sublinhado); "\*" é um asterisco. As palavras guardam os pedaços de cada estilo. */
export function palavrasDoTexto(md: string): Pedaco[][] {
  const partes = md.replace(/\\\*/g, "\u0001").split("**");
  const palavras: Pedaco[][] = [];
  let atual: Pedaco[] = [];
  partes.forEach((parte, k) => {
    const destaque = k % 2 === 1;
    const pedacos = parte.replace(/\u0001/g, "*").split(/(\s+)/);
    for (const p of pedacos) {
      if (!p) continue;
      if (/^\s+$/.test(p)) {
        if (atual.length) palavras.push(atual);
        atual = [];
      } else atual.push({ t: p, destaque });
    }
  });
  if (atual.length) palavras.push(atual);
  return palavras;
}

async function paragrafo(folha: Folha, chave: string, a: Layout["cabecalho"]["atencao"], md: string) {
  const normal = await folha.fontes.obter(a.fonte, false);
  const forte = await folha.fontes.obter(a.fonte, true);
  const larg = (p: Pedaco) => (p.destaque ? forte : normal).widthOfTextAtSize(p.t, a.tamanho) / MM;
  const palavras = palavrasDoTexto(md).map((pedacos) => ({ pedacos, largura: pedacos.reduce((s, p) => s + larg(p), 0) }));
  const espaco = normal.widthOfTextAtSize(" ", a.tamanho) / MM;
  // quebra gulosa
  const linhas: (typeof palavras)[] = [];
  let atual: typeof palavras = [];
  let ocupado = 0;
  for (const p of palavras) {
    const com = atual.length ? ocupado + espaco + p.largura : p.largura;
    if (atual.length && com > a.largura) {
      linhas.push(atual);
      atual = [p];
      ocupado = p.largura;
    } else {
      atual.push(p);
      ocupado = com;
    }
  }
  if (atual.length) linhas.push(atual);

  const passo = (a.tamanho * a.entrelinha) / MM;
  linhas.forEach((ps, li) => {
    const y = a.y + li * passo;
    const soma = ps.reduce((s, p) => s + p.largura, 0);
    const ultima = li === linhas.length - 1;
    const vao = a.justificar && !ultima && ps.length > 1 ? (a.largura - soma) / (ps.length - 1) : espaco;
    let x = a.x;
    ps.forEach((p, pi) => {
      // o sublinhado também passa no espaço entre duas palavras destacadas
      const anterior = ps[pi - 1];
      if (anterior && anterior.pedacos.at(-1)!.destaque && p.pedacos[0]!.destaque) sublinhar(folha, x - vao, x, y, a.tamanho);
      for (const pd of p.pedacos) {
        const w = larg(pd);
        folha.page.drawText(pd.t, { x: folha.px(x), y: folha.py(y), size: a.tamanho, font: pd.destaque ? forte : normal, color: PRETO });
        if (pd.destaque) sublinhar(folha, x, x + w, y, a.tamanho);
        x += w;
      }
      x += vao;
    });
  });
  const alto = (a.tamanho * ALTURA_MAIUSCULA) / MM;
  folha.marcar(chave, a.x, a.y - alto, a.largura, alto + (linhas.length - 1) * passo + (a.tamanho * 0.25) / MM);
}

function sublinhar(folha: Folha, x0: number, x1: number, yBase: number, tamanho: number) {
  const y = yBase + (tamanho * 0.12) / MM;
  folha.page.drawLine({ start: { x: folha.px(x0), y: folha.py(y) }, end: { x: folha.px(x1), y: folha.py(y) }, thickness: tamanho * 0.06, color: PRETO });
}

function barras(folha: Folha, caixa: Layout["cabecalho"]["barras"], texto: string) {
  const larguras = code128B(texto);
  const modulo = caixa.largura / modulosCode128(larguras);
  let x = caixa.x;
  larguras.forEach((w, k) => {
    if (k % 2 === 0) folha.page.drawRectangle({ x: folha.px(x), y: folha.py(caixa.y + caixa.altura), width: w * modulo * MM, height: caixa.altura * MM, color: PRETO });
    x += w * modulo;
  });
  folha.marcar("barras", caixa.x, caixa.y, caixa.largura, caixa.altura);
}

/** As linhas numeradas: grade preta, números centrados na coluna da esquerda. */
async function pauta(folha: Folha, l: Layout["linhas"], primeiro: number, quantidade = l.quantidade, y0 = l.y, meiaLinha?: number) {
  const fim = y0 + quantidade * l.altura;
  // o fundo cinza vem antes, para as linhas da grade ficarem por cima dele
  if (l.cinzaCada5)
    for (let i = 0; i < quantidade; i++) {
      if ((primeiro + i) % 5 !== 0) continue;
      const topo = y0 + (i + 1) * l.altura;
      folha.page.drawRectangle({ x: folha.px(l.x), y: folha.py(topo), width: l.colunaNumero * MM, height: l.altura * MM, color: rgb(1 - l.cinza, 1 - l.cinza, 1 - l.cinza) });
    }
  for (let i = 0; i <= quantidade; i++) folha.linha(l.x, y0 + i * l.altura, l.x + l.largura, y0 + i * l.altura, l.espessura);
  for (const x of [l.x, l.x + l.colunaNumero, l.x + l.largura]) folha.linha(x, y0, x, fim, l.espessura);
  const f = await folha.fontes.obter(l.fonteNumero, l.negritoNumero);
  for (let i = 0; i < quantidade; i++) {
    const n = String(primeiro + i);
    const w = f.widthOfTextAtSize(n, l.tamanhoNumero) / MM;
    const y = y0 + i * l.altura + l.altura / 2 + (l.tamanhoNumero * ALTURA_MAIUSCULA) / MM / 2;
    folha.page.drawText(n, { x: folha.px(l.x + l.colunaNumero / 2 - w / 2), y: folha.py(y), size: l.tamanhoNumero, font: f, color: PRETO });
    if (meiaLinha !== undefined) {
      const ym = y0 + (i + 1) * l.altura - meiaLinha * l.altura;
      folha.page.drawLine({
        start: { x: folha.px(l.x + l.colunaNumero), y: folha.py(ym) },
        end: { x: folha.px(l.x + l.largura), y: folha.py(ym) },
        thickness: 0.35,
        color: rgb(0.62, 0.62, 0.62),
        dashArray: [1.6, 1.8],
      });
    }
  }
  folha.marcar("linhas", l.x, y0, l.largura, fim - y0);
}

/** A peça tem `paginasPeca` páginas (numeração das linhas contínua); cada questão, uma (numeração de 1 a `quantidade`). */
export function paginasDaFolha(layout: Layout) {
  return [
    ...Array.from({ length: layout.paginasPeca }, (_, k) => ({ tipo: "peca" as const, n: k + 1 })),
    ...Array.from({ length: layout.questoes }, (_, k) => ({ tipo: "questao" as const, n: k + 1 })),
  ];
}

export async function gerarFolha(pedido: PedidoFolha): Promise<{ bytes: Uint8Array; caixas: CaixaElemento[] }> {
  const { layout: L, exame = null } = pedido;
  const agora = pedido.agora ?? new Date();
  const sorteio = pedido.sorteio ?? Math.random;
  const doc = await PDFDocument.create();
  doc.setTitle("Folha de respostas · Simulado prático-profissional");
  doc.setCreator("Grifo · grifo.net.br");
  const fontes = new Fontes(doc);
  const caixas: CaixaElemento[] = [];
  const todas = paginasDaFolha(L);
  const total = todas.length;
  const canto = numeroDoCanto(sorteio);
  const numero = numeroDoDownload(agora, exame);
  const codigos = todas.map(() => codigoDaFolha(sorteio));
  const logo = pedido.recursos?.logoProgresso ? await doc.embedPng(pedido.recursos.logoProgresso.png) : null;
  const c = L.cabecalho;

  for (const k of pedido.paginas ?? todas.map((_, i) => i)) {
    const pg = todas[k];
    if (!pg) continue;
    const folha = new Folha(doc.addPage([A4.largura * MM, A4.altura * MM]), fontes, k, caixas);

    // cabeçalho: à esquerda, o título e o aviso; à direita, o número, o código de barras e a matéria
    if (pg.tipo === "peca") {
      await folha.texto("pecaTitulo", c.pecaTitulo, L.textos.pecaTitulo);
      await folha.texto("pecaSubtitulo", c.pecaSubtitulo, L.textos.pecaSubtitulo);
      await folha.texto("pecaPagina", c.pecaPagina, preencher(L.textos.pecaPagina, { p: pg.n, total: L.paginasPeca }));
      await paragrafo(folha, "atencao", c.atencao, L.textos.atencaoPeca);
    } else {
      await folha.texto("questaoTitulo", c.questaoTitulo, preencher(L.textos.questaoTitulo, { n: pg.n }));
      await paragrafo(folha, "atencao", c.atencao, preencher(L.textos.atencaoQuestao, { n: pg.n, nn: String(pg.n).padStart(2, "0") }));
    }
    await folha.texto("numero", c.numero, String(canto));
    barras(folha, c.barras, "grifo");
    await folha.texto("numeroBarras", c.numeroBarras, numero);
    await folha.texto("materia", c.materia, L.materia);

    // linhas e o código logo abaixo da última
    await pauta(folha, L.linhas, pg.tipo === "peca" ? (pg.n - 1) * L.linhas.quantidade + 1 : 1);
    await folha.texto("codigo", L.linhas.codigo, codigos[k]!);

    // rodapé: a linha fina; em cima, as logos e a matéria; embaixo, o exame, o simulado e a página
    const r = L.rodape;
    folha.linha(r.linha.x, r.linha.y, r.linha.x + r.linha.largura, r.linha.y, r.linha.espessura);
    folha.marcar("rodapeLinha", r.linha.x, r.linha.y - 0.8, r.linha.largura, 1.6);
    const lg = r.logoGrifo;
    const xg = lg.alinhamento === "centro" ? lg.x - lg.altura / 2 : lg.alinhamento === "direita" ? lg.x - lg.altura : lg.x;
    for (const d of LOGO_PATHS) folha.page.drawSvgPath(d, { x: folha.px(xg), y: folha.py(lg.y - lg.altura), scale: (lg.altura * MM) / 210, color: rgb(3 / 255, 17 / 255, 44 / 255) });
    folha.marcar("logoGrifo", xg, lg.y - lg.altura, lg.altura, lg.altura);
    await folha.texto("palavraGrifo", r.palavraGrifo, "GRIFO");
    await folha.texto("exame", r.exame, preencher(L.textos.rodapeExame, { exame: exame ?? "__" }));
    if (logo && pedido.recursos?.logoProgresso) {
      const lp = r.logoProgresso;
      const w = lp.altura * pedido.recursos.logoProgresso.proporcao;
      const xp = lp.alinhamento === "centro" ? lp.x - w / 2 : lp.alinhamento === "direita" ? lp.x - w : lp.x;
      folha.page.drawImage(logo, { x: folha.px(xp), y: folha.py(lp.y), width: w * MM, height: lp.altura * MM });
      folha.marcar("logoProgresso", xp, lp.y - lp.altura, w, lp.altura);
    }
    await folha.texto("simulado", r.simulado, L.textos.rodapeSimulado);
    await folha.texto("rodapeMateria", r.materia, L.materia);
    await folha.texto("pagina", r.pagina, preencher(L.textos.rodapePagina, { i: k + 1, total }));
  }
  return { bytes: await doc.save(), caixas };
}

export interface PedidoCaligrafia {
  layout: Layout;
  paginas: number;
  /** a linha de meia altura, para treinar a letra minúscula */
  meiaLinha: boolean;
  /** a altura dela, em frações da linha (a partir da base); sem isso, a do layout */
  fracao?: number;
}

/** Quantas linhas cabem na folha, com a altura e a largura das linhas da folha de respostas. */
export function linhasDaCaligrafia(layout: Layout): number {
  const { margemTopo, margemBase } = layout.caligrafia;
  return Math.floor((A4.altura - margemTopo - margemBase) / layout.linhas.altura);
}

/** Caderno de caligrafia: só as linhas da folha de respostas, a folha inteira, sem cabeçalho nem rodapé. */
export async function gerarCaligrafia(p: PedidoCaligrafia): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle("Caderno de caligrafia · Grifo");
  doc.setCreator("Grifo · grifo.net.br");
  const fontes = new Fontes(doc);
  const { linhas: l, caligrafia: cal } = p.layout;
  const quantidade = linhasDaCaligrafia(p.layout);
  // as linhas ficam centradas na altura livre
  const sobra = A4.altura - cal.margemTopo - cal.margemBase - quantidade * l.altura;
  const y0 = cal.margemTopo + sobra / 2;
  const discreto = { ...cal.numeroPagina };
  for (let i = 0; i < p.paginas; i++) {
    const folha = new Folha(doc.addPage([A4.largura * MM, A4.altura * MM]), fontes, i, []);
    await pauta(folha, l, 1, quantidade, y0, p.meiaLinha ? (p.fracao ?? cal.meiaLinha) : undefined);
    const f = await fontes.obter(discreto.fonte, discreto.negrito);
    const texto = `${i + 1}/${p.paginas}`;
    const w = f.widthOfTextAtSize(texto, discreto.tamanho) / MM;
    const x = discreto.alinhamento === "direita" ? discreto.x - w : discreto.alinhamento === "centro" ? discreto.x - w / 2 : discreto.x;
    folha.page.drawText(texto, { x: folha.px(x), y: folha.py(discreto.y), size: discreto.tamanho, font: f, color: rgb(0.6, 0.6, 0.6) });
  }
  return doc.save();
}
