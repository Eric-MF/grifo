"use client";

// Editor do layout da folha de respostas (só no `npm run dev`, em /revisao/folha/). A prévia é o próprio PDF gerado,
// desenhado pelo pdfjs: o que se vê é o que sai no download. Um PDF de referência pode ficar por trás (ou por cima),
// com transparência, para conferir posições. "Gravar" escreve content/folha-resposta.json, e os próximos downloads
// seguem o padrão gravado.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { ALINHAMENTOS, FONTES, LayoutSchema, PADRAO, layoutGravado, type Layout } from "@/lib/folha/layout";
import { gerarCaligrafia, gerarFolha, paginasDaFolha, sorteioFixo, type CaixaElemento, type Recursos } from "@/lib/folha/pdf";
import { baixarPdf, carregarRecursos } from "@/lib/folha/navegador";
import styles from "./editorFolha.module.css";

// ---------- pdfjs (a prévia e a referência) ----------
let pdfjs: Promise<typeof import("pdfjs-dist")> | null = null;
function carregarPdfjs() {
  pdfjs ??= import("pdfjs-dist").then((m) => {
    m.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
    return m;
  });
  return pdfjs;
}

// imagens escaneadas (CCITT/fax, JBIG2, JPEG 2000) precisam do WebAssembly do pdfjs; fontes não embutidas, das padrão
const APOIO = "/revisao/folha/pdfjs/";
const OPCOES_PDFJS = { wasmUrl: `${APOIO}wasm/`, standardFontDataUrl: `${APOIO}standard_fonts/`, cMapUrl: `${APOIO}cmaps/`, cMapPacked: true };
/** largura da folha A4 em pontos */
const A4_PT = (210 / 25.4) * 72;

/**
 * Como a página é pintada (pixel a pixel, pela escuridão de cada ponto):
 * - "original": como está no PDF;
 * - "colorir": o escuro na cor dada, o claro continua branco;
 * - "inverter": o claro vira fundo preto e o escuro (o traço) fica claro, na cor dada.
 * A página fica sempre opaca: a prévia se mistura com a referência por multiplicação (o branco some) ou, com a
 * referência invertida, por tela (o preto some). Transparência pixel a pixel não serve: o Chrome soma a cor dos
 * pontos transparentes, e a folha toda ficaria da cor do traço.
 */
type ModoCor = "original" | "colorir" | "inverter";
interface Pintura {
  modo: ModoCor;
  cor: string;
}
const rgbDe = (hex: string) => [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16) || 0) as [number, number, number];

function pintar(tela: HTMLCanvasElement, { modo, cor }: Pintura) {
  if (modo === "original") return;
  const [r, g, b] = rgbDe(cor);
  const ctx = tela.getContext("2d")!;
  const img = ctx.getImageData(0, 0, tela.width, tela.height);
  const px = img.data;
  for (let i = 0; i < px.length; i += 4) {
    // 0 no branco, 1 no preto
    const t = 1 - (px[i]! * 0.299 + px[i + 1]! * 0.587 + px[i + 2]! * 0.114) / 255;
    if (modo === "colorir") {
      px[i] = 255 + (r - 255) * t;
      px[i + 1] = 255 + (g - 255) * t;
      px[i + 2] = 255 + (b - 255) * t;
    } else {
      px[i] = r * t;
      px[i + 1] = g * t;
      px[i + 2] = b * t;
    }
  }
  ctx.putImageData(img, 0, 0);
}

/**
 * Desenha uma página de um PDF no canvas em tamanho real: `larguraA4` é a largura (CSS) de uma folha A4, e uma página
 * mais larga ou mais estreita (um escaneado, por exemplo) sai proporcionalmente maior ou menor, na mesma escala.
 * Devolve o tamanho da página em mm.
 */
async function desenharPagina(doc: PDFDocumentProxy, numero: number, canvas: HTMLCanvasElement, larguraA4: number, pintura: Pintura = { modo: "original", cor: "#000000" }) {
  const page = await doc.getPage(numero);
  const base = page.getViewport({ scale: 1 });
  const largura = (larguraA4 * base.width) / A4_PT;
  const vp = page.getViewport({ scale: (largura * (window.devicePixelRatio || 1)) / base.width });
  const tela = document.createElement("canvas");
  tela.width = Math.round(vp.width);
  tela.height = Math.round(vp.height);
  await page.render({ canvas: tela, viewport: vp, background: "#ffffff" }).promise;
  pintar(tela, pintura);
  // desenha fora da tela e copia de uma vez: sem piscar entre um ajuste e outro
  canvas.width = tela.width;
  canvas.height = tela.height;
  canvas.style.width = `${largura}px`;
  canvas.style.height = `${(largura * base.height) / base.width}px`;
  canvas.getContext("2d")!.drawImage(tela, 0, 0);
  return { largura: (base.width / 72) * 25.4, altura: (base.height / 72) * 25.4 };
}

// ---------- caminhos no layout ("cabecalho.pecaTitulo.x") ----------
function obter(obj: unknown, caminho: string): unknown {
  return caminho.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], obj);
}
function definir<T>(obj: T, caminho: string, valor: unknown): T {
  const [k, ...resto] = caminho.split(".");
  const atual = obj as Record<string, unknown>;
  return { ...atual, [k!]: resto.length ? definir(atual[k!], resto.join("."), valor) : valor } as T;
}
const arred = (v: number, passo: number) => Math.round(v / passo) * passo;

// ---------- os grupos do painel ----------
type Campo =
  | { tipo: "num"; caminho: string; rotulo: string; min: number; max: number; passo: number; unidade?: string; fator?: number }
  | { tipo: "fonte"; caminho: string; rotulo: string }
  | { tipo: "alinhamento"; caminho: string; rotulo: string }
  | { tipo: "bool"; caminho: string; rotulo: string }
  | { tipo: "texto"; caminho: string; rotulo: string; linhas?: number; dica?: string };
interface Grupo {
  id: string;
  titulo: string;
  /** onde ficam x e y (para arrastar e mover com as setas) */
  base?: string;
  campos: Campo[];
}

const posicao = (base: string, rotuloY = "Vertical (linha de base)"): Campo[] => [
  { tipo: "num", caminho: `${base}.x`, rotulo: "Horizontal", min: 0, max: 210, passo: 0.1, unidade: "mm" },
  { tipo: "num", caminho: `${base}.y`, rotulo: rotuloY, min: 0, max: 297, passo: 0.1, unidade: "mm" },
];
const letra = (base: string): Campo[] => [
  ...posicao(base),
  { tipo: "num", caminho: `${base}.tamanho`, rotulo: "Tamanho da letra", min: 4, max: 72, passo: 0.5, unidade: "pt" },
  { tipo: "fonte", caminho: `${base}.fonte`, rotulo: "Fonte" },
  { tipo: "bool", caminho: `${base}.negrito`, rotulo: "Negrito" },
  { tipo: "alinhamento", caminho: `${base}.alinhamento`, rotulo: "Alinhado pelo x" },
];
const imagem = (base: string): Campo[] => [
  ...posicao(base, "Vertical (base da imagem)"),
  { tipo: "num", caminho: `${base}.altura`, rotulo: "Altura", min: 2, max: 30, passo: 0.1, unidade: "mm" },
  { tipo: "alinhamento", caminho: `${base}.alinhamento`, rotulo: "Alinhada pelo x" },
];
const texto = (caminho: string, rotulo: string, dica?: string, linhas?: number): Campo => ({ tipo: "texto", caminho, rotulo, dica, linhas });

const GRUPOS: Grupo[] = [
  {
    id: "geral",
    titulo: "Geral",
    campos: [
      texto("materia", "Matéria (cabeçalho e rodapé)"),
      { tipo: "num", caminho: "paginasPeca", rotulo: "Páginas da peça", min: 1, max: 10, passo: 1 },
      { tipo: "num", caminho: "questoes", rotulo: "Questões", min: 0, max: 10, passo: 1 },
    ],
  },
  { id: "pecaTitulo", titulo: "Peça · “PEÇA”", base: "cabecalho.pecaTitulo", campos: [texto("textos.pecaTitulo", "Texto"), ...letra("cabecalho.pecaTitulo")] },
  { id: "pecaSubtitulo", titulo: "Peça · “PROFISSIONAL - PÁGINA”", base: "cabecalho.pecaSubtitulo", campos: [texto("textos.pecaSubtitulo", "Texto"), ...letra("cabecalho.pecaSubtitulo")] },
  { id: "pecaPagina", titulo: "Peça · página (1/5)", base: "cabecalho.pecaPagina", campos: [texto("textos.pecaPagina", "Texto", "{p}: a página; {total}: quantas são"), ...letra("cabecalho.pecaPagina")] },
  { id: "questaoTitulo", titulo: "Questão · título", base: "cabecalho.questaoTitulo", campos: [texto("textos.questaoTitulo", "Texto", "{n}: o número da questão"), ...letra("cabecalho.questaoTitulo")] },
  {
    id: "atencao",
    titulo: "Aviso “*ATENÇÃO”",
    base: "cabecalho.atencao",
    campos: [
      texto("textos.atencaoPeca", "Texto na peça", "**trecho**: negrito e sublinhado; \\*: asterisco", 4),
      texto("textos.atencaoQuestao", "Texto nas questões", "{nn}: o número da questão com 2 algarismos", 4),
      ...posicao("cabecalho.atencao", "Vertical (base da 1ª linha)"),
      { tipo: "num", caminho: "cabecalho.atencao.largura", rotulo: "Largura", min: 30, max: 200, passo: 0.5, unidade: "mm" },
      { tipo: "num", caminho: "cabecalho.atencao.tamanho", rotulo: "Tamanho da letra", min: 4, max: 20, passo: 0.25, unidade: "pt" },
      { tipo: "num", caminho: "cabecalho.atencao.entrelinha", rotulo: "Entrelinha", min: 0.9, max: 2.5, passo: 0.05, unidade: "×" },
      { tipo: "fonte", caminho: "cabecalho.atencao.fonte", rotulo: "Fonte" },
      { tipo: "bool", caminho: "cabecalho.atencao.justificar", rotulo: "Justificado" },
    ],
  },
  { id: "numero", titulo: "Número do canto (1 a 15)", base: "cabecalho.numero", campos: letra("cabecalho.numero") },
  {
    id: "barras",
    titulo: "Código de barras (“grifo”)",
    base: "cabecalho.barras",
    campos: [
      ...posicao("cabecalho.barras", "Vertical (topo)"),
      { tipo: "num", caminho: "cabecalho.barras.largura", rotulo: "Largura", min: 10, max: 100, passo: 0.5, unidade: "mm" },
      { tipo: "num", caminho: "cabecalho.barras.altura", rotulo: "Altura", min: 3, max: 30, passo: 0.25, unidade: "mm" },
    ],
  },
  { id: "numeroBarras", titulo: "Número do download (sob as barras)", base: "cabecalho.numeroBarras", campos: letra("cabecalho.numeroBarras") },
  { id: "materia", titulo: "Matéria (cabeçalho)", base: "cabecalho.materia", campos: letra("cabecalho.materia") },
  {
    id: "linhas",
    titulo: "Linhas",
    base: "linhas",
    campos: [
      ...posicao("linhas", "Vertical (topo)"),
      { tipo: "num", caminho: "linhas.largura", rotulo: "Largura", min: 100, max: 210, passo: 0.5, unidade: "mm" },
      { tipo: "num", caminho: "linhas.altura", rotulo: "Altura de cada linha", min: 4, max: 12, passo: 0.05, unidade: "mm" },
      { tipo: "num", caminho: "linhas.quantidade", rotulo: "Linhas por página", min: 10, max: 40, passo: 1 },
      { tipo: "num", caminho: "linhas.colunaNumero", rotulo: "Coluna dos números", min: 4, max: 15, passo: 0.1, unidade: "mm" },
      { tipo: "num", caminho: "linhas.espessura", rotulo: "Espessura do traço", min: 0.1, max: 2, passo: 0.05, unidade: "pt" },
      { tipo: "num", caminho: "linhas.tamanhoNumero", rotulo: "Tamanho dos números", min: 4, max: 14, passo: 0.25, unidade: "pt" },
      { tipo: "fonte", caminho: "linhas.fonteNumero", rotulo: "Fonte dos números" },
      { tipo: "bool", caminho: "linhas.negritoNumero", rotulo: "Números em negrito" },
      { tipo: "bool", caminho: "linhas.cinzaCada5", rotulo: "Fundo cinza nos números de 5 em 5" },
      { tipo: "num", caminho: "linhas.cinza", rotulo: "Tom do cinza (0% branco, 100% preto)", min: 0, max: 1, passo: 0.01, unidade: "%", fator: 100 },
    ],
  },
  { id: "codigo", titulo: "Código sob as linhas", base: "linhas.codigo", campos: letra("linhas.codigo") },
  {
    id: "rodapeLinha",
    titulo: "Rodapé · linha",
    base: "rodape.linha",
    campos: [
      ...posicao("rodape.linha", "Vertical"),
      { tipo: "num", caminho: "rodape.linha.largura", rotulo: "Largura", min: 20, max: 210, passo: 0.5, unidade: "mm" },
      { tipo: "num", caminho: "rodape.linha.espessura", rotulo: "Espessura", min: 0.1, max: 2, passo: 0.05, unidade: "pt" },
    ],
  },
  { id: "logoGrifo", titulo: "Rodapé · logo do Grifo", base: "rodape.logoGrifo", campos: imagem("rodape.logoGrifo") },
  { id: "palavraGrifo", titulo: "Rodapé · “GRIFO”", base: "rodape.palavraGrifo", campos: letra("rodape.palavraGrifo") },
  { id: "exame", titulo: "Rodapé · exame", base: "rodape.exame", campos: [texto("textos.rodapeExame", "Texto", "{exame}: o número do exame, ou __"), ...letra("rodape.exame")] },
  { id: "logoProgresso", titulo: "Rodapé · logo Grifo em Progresso", base: "rodape.logoProgresso", campos: imagem("rodape.logoProgresso") },
  { id: "simulado", titulo: "Rodapé · simulado", base: "rodape.simulado", campos: [texto("textos.rodapeSimulado", "Texto"), ...letra("rodape.simulado")] },
  { id: "rodapeMateria", titulo: "Rodapé · matéria", base: "rodape.materia", campos: letra("rodape.materia") },
  { id: "pagina", titulo: "Rodapé · página", base: "rodape.pagina", campos: [texto("textos.rodapePagina", "Texto", "{i}: a página no caderno; {total}: o total"), ...letra("rodape.pagina")] },
  {
    id: "caligrafia",
    titulo: "Caderno de caligrafia",
    campos: [
      { tipo: "num", caminho: "caligrafia.margemTopo", rotulo: "Margem de cima", min: 0, max: 30, passo: 0.5, unidade: "mm" },
      { tipo: "num", caminho: "caligrafia.margemBase", rotulo: "Margem de baixo", min: 0, max: 30, passo: 0.5, unidade: "mm" },
      { tipo: "num", caminho: "caligrafia.meiaLinha", rotulo: "Meia linha (altura padrão)", min: 0.2, max: 0.8, passo: 0.01, unidade: "%", fator: 100 },
      ...letra("caligrafia.numeroPagina"),
    ],
  },
];
const GRUPO_DA_CHAVE = new Map(GRUPOS.map((g) => [g.id, g]));

// ---------- campos ----------
function CampoNumero({ c, valor, mudar }: { c: Extract<Campo, { tipo: "num" }>; valor: number; mudar: (v: number) => void }) {
  const fator = c.fator ?? 1;
  const casas = Math.max(0, -Math.floor(Math.log10((c.passo * fator) || 1)));
  return (
    <label className={styles.campo}>
      <span className={styles.rotulo}>{c.rotulo}</span>
      <span className={styles.controle}>
        <input type="range" min={c.min} max={c.max} step={c.passo} value={valor} onChange={(e) => mudar(Number(e.target.value))} />
        <input
          type="number"
          className={styles.numero}
          min={c.min * fator}
          max={c.max * fator}
          step={c.passo * fator}
          value={Number((valor * fator).toFixed(casas))}
          onChange={(e) => e.target.value !== "" && mudar(Number(e.target.value) / fator)}
        />
        <span className={styles.unidade}>{c.unidade}</span>
      </span>
    </label>
  );
}

function CampoGrupo({ g, layout, mudar }: { g: Grupo; layout: Layout; mudar: (caminho: string, v: unknown) => void }) {
  return (
    <div className={styles.campos}>
      {g.campos.map((c) => {
        const v = obter(layout, c.caminho);
        if (c.tipo === "num") return <CampoNumero key={c.caminho} c={c} valor={v as number} mudar={(n) => mudar(c.caminho, n)} />;
        if (c.tipo === "bool")
          return (
            <label key={c.caminho} className={styles.marcar}>
              <input type="checkbox" checked={v as boolean} onChange={(e) => mudar(c.caminho, e.target.checked)} />
              {c.rotulo}
            </label>
          );
        if (c.tipo === "fonte" || c.tipo === "alinhamento") {
          const opcoes = c.tipo === "fonte" ? FONTES : ALINHAMENTOS;
          const nomes: Record<string, string> = { helvetica: "Helvetica (Arial)", times: "Times", courier: "Courier", esquerda: "à esquerda", centro: "no centro", direita: "à direita" };
          return (
            <label key={c.caminho} className={styles.campo}>
              <span className={styles.rotulo}>{c.rotulo}</span>
              <select value={v as string} onChange={(e) => mudar(c.caminho, e.target.value)}>
                {opcoes.map((o) => (
                  <option key={o} value={o}>
                    {nomes[o]}
                  </option>
                ))}
              </select>
            </label>
          );
        }
        return (
          <label key={c.caminho} className={styles.campo}>
            <span className={styles.rotulo}>{c.rotulo}</span>
            {c.linhas ? (
              <textarea rows={c.linhas} value={v as string} onChange={(e) => mudar(c.caminho, e.target.value)} />
            ) : (
              <input type="text" value={v as string} onChange={(e) => mudar(c.caminho, e.target.value)} />
            )}
            {c.dica && <small className={styles.dica}>{c.dica}</small>}
          </label>
        );
      })}
    </div>
  );
}

function Botao({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button type="button" className={styles.botao} {...p}>
      {children}
    </button>
  );
}

const LARGURAS = [520, 680, 820, 1000];

export function EditorFolha() {
  // ---------- o layout e o histórico (Ctrl+Z) ----------
  const [layout, setLayout] = useState<Layout>(() => layoutGravado());
  const [salvo, setSalvo] = useState<Layout>(() => layoutGravado());
  const atual = useRef(layout);
  const historico = useRef<{ antes: Layout[]; depois: Layout[]; ultimo: number }>({ antes: [], depois: [], ultimo: 0 });
  const [passos, setPassos] = useState({ antes: 0, depois: 0 });
  const contar = () => setPassos({ antes: historico.current.antes.length, depois: historico.current.depois.length });
  const aplicar = useCallback((novo: Layout, guardar = true) => {
    const h = historico.current;
    const agora = Date.now();
    // ajustes seguidos (arrastar, segurar o slider) contam como um só passo
    if (guardar && agora - h.ultimo > 600) {
      h.antes.push(atual.current);
      if (h.antes.length > 150) h.antes.shift();
      h.depois = [];
    }
    if (guardar) h.ultimo = agora;
    atual.current = novo;
    setLayout(novo);
    contar();
  }, []);
  const mudarCampo = useCallback((caminho: string, v: unknown) => aplicar(definir(atual.current, caminho, v)), [aplicar]);
  const desfazer = useCallback(() => {
    const h = historico.current;
    const anterior = h.antes.pop();
    if (!anterior) return;
    h.depois.push(atual.current);
    h.ultimo = 0;
    aplicar(anterior, false);
  }, [aplicar]);
  const refazer = useCallback(() => {
    const h = historico.current;
    const proximo = h.depois.pop();
    if (!proximo) return;
    h.antes.push(atual.current);
    h.ultimo = 0;
    aplicar(proximo, false);
  }, [aplicar]);

  // ---------- o que está na tela ----------
  const paginas = useMemo(() => paginasDaFolha(layout), [layout]);
  const [pagina, setPagina] = useState<number | "caligrafia">(0);
  const paginaValida = pagina === "caligrafia" ? pagina : Math.min(pagina, paginas.length - 1);
  const [exemplo, setExemplo] = useState(41);
  const [calMeia, setCalMeia] = useState(true);
  const [largura, setLargura] = useState(680);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [abertos, setAbertos] = useState<Set<string>>(() => new Set(["geral"]));
  const [caixas, setCaixas] = useState<CaixaElemento[]>([]);
  const [erroPrevia, setErroPrevia] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; tipo: "ok" | "erro" } | null>(null);
  const agora = useMemo(() => new Date(), []);
  const validacao = useMemo(() => LayoutSchema.safeParse(layout), [layout]);
  const mudado = useMemo(() => JSON.stringify(layout) !== JSON.stringify(salvo), [layout, salvo]);

  // ---------- referência ----------
  const [ref, setRef] = useState<{ doc: PDFDocumentProxy; nome: string } | null>(null);
  const [refVisivel, setRefVisivel] = useState(true);
  const [refPagina, setRefPagina] = useState(1);
  const [refOpacidade, setRefOpacidade] = useState(0.5);
  // a cor do traço da prévia (preto: como sai no PDF)
  const [corPrevia, setCorPrevia] = useState("#000000");
  const [refPorCima, setRefPorCima] = useState(false);
  const [refPintura, setRefPintura] = useState<Pintura>({ modo: "original", cor: "#1a6099" });
  // no modo invertido o fundo é preto: a prévia em preto sumiria, então passa a branco (e volta ao sair)
  const mudarModoRef = (modo: ModoCor) => {
    if (modo === "inverter" && corPrevia === "#000000") setCorPrevia("#ffffff");
    if (modo !== "inverter" && refPintura.modo === "inverter" && corPrevia === "#ffffff") setCorPrevia("#000000");
    setRefPintura((p) => ({ ...p, modo, cor: modo === "inverter" && p.modo !== "inverter" && p.cor === "#1a6099" ? "#ffd84d" : p.cor }));
  };
  const [refAjuste, setRefAjuste] = useState({ dx: 0, dy: 0, escala: 1 });
  const comReferencia = !!ref && refVisivel;
  const invertida = comReferencia && refPintura.modo === "inverter";
  // com a referência invertida, a prévia também se inverte (traço claro sobre preto) e se mistura por tela
  const pinturaPrevia = useMemo<Pintura>(
    () => (invertida ? { modo: "inverter", cor: corPrevia } : { modo: corPrevia === "#000000" ? "original" : "colorir", cor: corPrevia }),
    [invertida, corPrevia],
  );

  // ---------- prévia: gera o PDF da página e desenha (um por vez; o último pedido ganha) ----------
  const canvas = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [recursos, setRecursos] = useState<Recursos | null>(null);
  useEffect(() => {
    carregarRecursos().then(setRecursos);
  }, []);
  const ocupado = useRef(false);
  const pendente = useRef<(() => Promise<void>) | null>(null);
  const rodar = useCallback(async () => {
    if (ocupado.current) return;
    ocupado.current = true;
    try {
      while (pendente.current) {
        const tarefa = pendente.current;
        pendente.current = null;
        try {
          await tarefa();
          setErroPrevia(null);
        } catch (e) {
          setErroPrevia((e as Error).message);
        }
      }
    } finally {
      ocupado.current = false;
    }
  }, []);
  useEffect(() => {
    if (!recursos || !validacao.success) return;
    const l = validacao.data;
    pendente.current = async () => {
      const lib = await carregarPdfjs();
      let bytes: Uint8Array;
      let novas: CaixaElemento[] = [];
      if (paginaValida === "caligrafia") bytes = await gerarCaligrafia({ layout: l, paginas: 1, meiaLinha: calMeia });
      else ({ bytes, caixas: novas } = await gerarFolha({ layout: l, exame: exemplo || null, agora, sorteio: sorteioFixo(3), paginas: [paginaValida], recursos }));
      const doc = await lib.getDocument({ data: bytes }).promise;
      try {
        if (canvas.current) await desenharPagina(doc, 1, canvas.current, largura, pinturaPrevia);
      } finally {
        void doc.loadingTask.destroy();
      }
      setCaixas(novas);
    };
    void rodar();
  }, [validacao, paginaValida, exemplo, calMeia, largura, recursos, pinturaPrevia, agora, rodar]);

  const [refTamanho, setRefTamanho] = useState<{ largura: number; altura: number } | null>(null);
  const [refErro, setRefErro] = useState<string | null>(null);
  useEffect(() => {
    if (!ref || !canvasRef.current) return;
    const n = Math.min(Math.max(1, refPagina), ref.doc.numPages);
    desenharPagina(ref.doc, n, canvasRef.current, largura, refPintura).then(setRefTamanho, (e: Error) => setRefErro(`não foi possível desenhar a página: ${e.message}`));
  }, [ref, refPagina, largura, refVisivel, refPintura]);

  const abrirReferencia = async (arquivo: File) => {
    setRefErro(null);
    try {
      const lib = await carregarPdfjs();
      const doc = await lib.getDocument({ data: new Uint8Array(await arquivo.arrayBuffer()), ...OPCOES_PDFJS }).promise;
      void ref?.doc.loadingTask.destroy();
      setRef({ doc, nome: arquivo.name });
      setRefPagina(1);
      setRefVisivel(true);
    } catch (e) {
      setRefErro(`não foi possível abrir "${arquivo.name}": ${(e as Error).message}`);
    }
  };

  // ---------- selecionar, arrastar e mover com as setas ----------
  const painel = useRef<HTMLDivElement>(null);
  const selecionar = useCallback((id: string | null) => {
    setSelecionado(id);
    if (!id) return;
    setAbertos((a) => new Set(a).add(id));
    requestAnimationFrame(() => painel.current?.querySelector(`[data-grupo="${id}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
  }, []);
  const escala = largura / 210;
  const arrasto = useRef<{ base: string; px: number; py: number; x: number; y: number } | null>(null);
  const comecarArrasto = (e: React.PointerEvent, id: string) => {
    e.preventDefault();
    selecionar(id);
    const base = GRUPO_DA_CHAVE.get(id)?.base;
    if (!base) return;
    const v = obter(atual.current, base) as { x: number; y: number };
    arrasto.current = { base, px: e.clientX, py: e.clientY, x: v.x, y: v.y };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };
  const arrastar = (e: React.PointerEvent) => {
    const a = arrasto.current;
    if (!a) return;
    const x = arred(a.x + (e.clientX - a.px) / escala, 0.1);
    const y = arred(a.y + (e.clientY - a.py) / escala, 0.1);
    aplicar(definir(definir(atual.current, `${a.base}.x`, Number(x.toFixed(1))), `${a.base}.y`, Number(y.toFixed(1))));
  };

  const gravar = useCallback(async () => {
    const r = LayoutSchema.safeParse(atual.current);
    if (!r.success) return setAviso({ texto: "Há valores inválidos: corrija antes de gravar.", tipo: "erro" });
    try {
      const resp = await fetch("/revisao/folha/salvar/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ layout: r.data }) });
      const corpo = (await resp.json()) as { gravado?: boolean; erros?: string[]; erro?: string };
      if (!resp.ok || !corpo.gravado) throw new Error(corpo.erros?.join("; ") ?? corpo.erro ?? `erro ${resp.status}`);
      setSalvo(r.data);
      setAviso({ texto: "Gravado em content/folha-resposta.json. Os próximos downloads seguem este padrão.", tipo: "ok" });
    } catch (e) {
      setAviso({ texto: `Não gravou: ${(e as Error).message}`, tipo: "erro" });
    }
  }, []);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const emCampo = e.target instanceof Element && e.target.closest("input, textarea, select");
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void gravar();
      } else if (mod && !emCampo && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) refazer();
        else desfazer();
      } else if (mod && !emCampo && e.key.toLowerCase() === "y") {
        e.preventDefault();
        refazer();
      } else if (!emCampo && e.key === "Escape") setSelecionado(null);
      else if (!emCampo && selecionado && e.key.startsWith("Arrow")) {
        const base = GRUPO_DA_CHAVE.get(selecionado)?.base;
        if (!base) return;
        e.preventDefault();
        const passo = e.shiftKey ? 1 : 0.1;
        const eixo = e.key === "ArrowLeft" || e.key === "ArrowRight" ? "x" : "y";
        const sinal = e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 1;
        const v = obter(atual.current, `${base}.${eixo}`) as number;
        aplicar(definir(atual.current, `${base}.${eixo}`, Number((v + sinal * passo).toFixed(1))));
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [selecionado, aplicar, desfazer, refazer, gravar]);

  useEffect(() => {
    if (!mudado) return;
    const sair = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", sair);
    return () => window.removeEventListener("beforeunload", sair);
  }, [mudado]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 5000);
    return () => clearTimeout(t);
  }, [aviso]);

  const baixarTeste = async () => {
    if (!validacao.success) return;
    const { bytes } = await gerarFolha({ layout: validacao.data, exame: exemplo || null, recursos: recursos ?? undefined });
    baixarPdf(bytes, `folha-de-respostas-teste${exemplo ? `-${exemplo}` : ""}.pdf`);
  };
  const baixarCaligrafia = async () => {
    if (!validacao.success) return;
    baixarPdf(await gerarCaligrafia({ layout: validacao.data, paginas: 3, meiaLinha: calMeia }), "caderno-de-caligrafia-teste.pdf");
  };

  const altura = (largura * 297) / 210;
  const daPagina = caixas.filter((c) => c.pagina === paginaValida);
  const camadaRef = comReferencia && (
    <canvas
      ref={canvasRef}
      className={styles.referencia}
      style={{ opacity: refOpacidade, zIndex: refPorCima ? 2 : 0, transform: `translate(${refAjuste.dx * escala}px, ${refAjuste.dy * escala}px) scale(${refAjuste.escala})` }}
      aria-hidden
    />
  );

  return (
    <div className={styles.editor}>
      <header className={styles.topo}>
        <div className={styles.titulo}>
          <strong>Folha de respostas</strong>
          <span className={mudado ? styles.mudado : styles.salvoTag}>{mudado ? "alterações não gravadas" : "igual ao gravado"}</span>
        </div>
        <nav className={styles.paginas} aria-label="Página da prévia">
          {paginas.map((p, k) => (
            <button key={k} type="button" aria-pressed={paginaValida === k} onClick={() => setPagina(k)}>
              {p.tipo === "peca" ? `Peça ${p.n}` : `Questão ${p.n}`}
            </button>
          ))}
          <button type="button" aria-pressed={paginaValida === "caligrafia"} onClick={() => setPagina("caligrafia")}>
            Caligrafia
          </button>
        </nav>
        <div className={styles.acoes}>
          <Botao onClick={desfazer} title="Desfazer (Ctrl+Z)" disabled={!passos.antes}>
            Desfazer
          </Botao>
          <Botao onClick={refazer} title="Refazer (Ctrl+Shift+Z)" disabled={!passos.depois}>
            Refazer
          </Botao>
          <Botao onClick={() => aplicar(salvo)} disabled={!mudado} title="Voltar ao que está gravado">
            Descartar
          </Botao>
          <Botao onClick={() => confirm("Voltar todo o layout ao padrão de fábrica? (só grava se você clicar em Gravar)") && aplicar(PADRAO)}>Padrão de fábrica</Botao>
          <button type="button" className={`${styles.botao} ${styles.principal}`} onClick={gravar} disabled={!mudado || !validacao.success} title="Gravar (Ctrl+S)">
            Gravar
          </button>
        </div>
      </header>

      <div className={styles.corpo}>
        <section className={styles.palco} aria-label="Prévia">
          <div className={styles.barraPrevia}>
            <label>
              Zoom{" "}
              <select value={largura} onChange={(e) => setLargura(Number(e.target.value))}>
                {LARGURAS.map((w) => (
                  <option key={w} value={w}>
                    {Math.round((w / ((210 / 25.4) * 96)) * 100)}%
                  </option>
                ))}
              </select>
            </label>
            <label>
              Exame de exemplo{" "}
              <input type="number" min={0} max={99} value={exemplo} onChange={(e) => setExemplo(Number(e.target.value) || 0)} className={styles.curto} />
            </label>
            {paginaValida === "caligrafia" && (
              <label className={styles.marcar}>
                <input type="checkbox" checked={calMeia} onChange={(e) => setCalMeia(e.target.checked)} /> Meia linha
              </label>
            )}
            <label className={styles.marcar} title="A cor do traço da prévia, para separar do PDF de referência">
              Cor da prévia <input type="color" className={styles.cor} value={corPrevia} onChange={(e) => setCorPrevia(e.target.value)} />
            </label>
            {corPrevia !== "#000000" && <Botao onClick={() => setCorPrevia("#000000")}>Preto</Botao>}
            <Botao onClick={baixarTeste}>Baixar a folha (teste)</Botao>
            <Botao onClick={baixarCaligrafia}>Baixar caligrafia (teste)</Botao>
          </div>
          {erroPrevia && <p className={styles.erro}>Prévia: {erroPrevia}</p>}
          {!validacao.success && <p className={styles.erro}>Valores inválidos: {validacao.error.issues.map((i) => i.path.join(".")).join(", ")}</p>}
          <div className={styles.rolagem}>
            <div className={styles.folha} style={{ width: largura, height: altura, background: invertida ? "#000" : undefined }} onPointerMove={arrastar} onPointerUp={() => (arrasto.current = null)}>
              {camadaRef}
              <canvas ref={canvas} className={styles.previa} style={{ mixBlendMode: comReferencia && !refPorCima ? (invertida ? "screen" : "multiply") : undefined }} />
              <div className={styles.caixas}>
                {daPagina.map((c, k) => (
                  <div
                    key={`${c.chave}-${k}`}
                    className={styles.caixa}
                    data-selecionada={selecionado === c.chave ? "1" : undefined}
                    title={GRUPO_DA_CHAVE.get(c.chave)?.titulo}
                    style={{ left: c.x * escala - 2, top: c.y * escala - 2, width: c.largura * escala + 4, height: c.altura * escala + 4 }}
                    onPointerDown={(e) => comecarArrasto(e, c.chave)}
                  />
                ))}
              </div>
            </div>
          </div>
          <p className={styles.atalhos}>
            Clique num elemento para editar; arraste para mover. Setas: 0,1 mm (Shift: 1 mm) · Ctrl+Z desfaz · Ctrl+S grava · Esc tira a
            seleção.
          </p>
        </section>

        <aside className={styles.painel} ref={painel}>
          <details className={styles.grupo} open>
            <summary>PDF de referência</summary>
            <div className={styles.campos}>
              <label className={styles.campo}>
                <span className={styles.rotulo}>{ref ? ref.nome : "Nenhum arquivo"}</span>
                <input type="file" accept="application/pdf" onChange={(e) => e.target.files?.[0] && void abrirReferencia(e.target.files[0])} />
              </label>
              {refErro && <p className={styles.erroRef}>{refErro}</p>}
              {ref && refTamanho && (
                <small className={styles.dica}>
                  Página de {refTamanho.largura.toFixed(1).replace(".", ",")} × {refTamanho.altura.toFixed(1).replace(".", ",")} mm, em tamanho real
                  {Math.abs(refTamanho.largura - 210) > 1 || Math.abs(refTamanho.altura - 297) > 1 ? " (não é A4: ajuste a escala e a posição abaixo, se preciso)" : ""}.
                </small>
              )}
              {ref && (
                <>
                  <label className={styles.marcar}>
                    <input type="checkbox" checked={refVisivel} onChange={(e) => setRefVisivel(e.target.checked)} /> Mostrar
                  </label>
                  <label className={styles.marcar}>
                    <input type="checkbox" checked={refPorCima} onChange={(e) => setRefPorCima(e.target.checked)} /> Por cima da prévia
                  </label>
                  <label className={styles.campo}>
                    <span className={styles.rotulo}>Cor</span>
                    <select value={refPintura.modo} onChange={(e) => mudarModoRef(e.target.value as ModoCor)}>
                      <option value="original">Original</option>
                      <option value="colorir">Colorir a parte escura</option>
                      <option value="inverter">Inverter (fundo escuro) e colorir a parte clara</option>
                    </select>
                  </label>
                  {refPintura.modo !== "original" && (
                    <label className={styles.marcar}>
                      <input type="color" className={styles.cor} value={refPintura.cor} onChange={(e) => setRefPintura((p) => ({ ...p, cor: e.target.value }))} />
                      {refPintura.modo === "colorir" ? "Cor da parte escura" : "Cor da parte clara (o traço, depois de inverter)"}
                    </label>
                  )}
                  <CampoNumero c={{ tipo: "num", caminho: "", rotulo: "Opacidade", min: 0, max: 1, passo: 0.01, unidade: "%", fator: 100 }} valor={refOpacidade} mudar={setRefOpacidade} />
                  <CampoNumero c={{ tipo: "num", caminho: "", rotulo: `Página (de ${ref.doc.numPages})`, min: 1, max: ref.doc.numPages, passo: 1 }} valor={refPagina} mudar={setRefPagina} />
                  <CampoNumero c={{ tipo: "num", caminho: "", rotulo: "Deslocar na horizontal", min: -15, max: 15, passo: 0.1, unidade: "mm" }} valor={refAjuste.dx} mudar={(dx) => setRefAjuste((a) => ({ ...a, dx }))} />
                  <CampoNumero c={{ tipo: "num", caminho: "", rotulo: "Deslocar na vertical", min: -15, max: 15, passo: 0.1, unidade: "mm" }} valor={refAjuste.dy} mudar={(dy) => setRefAjuste((a) => ({ ...a, dy }))} />
                  <CampoNumero c={{ tipo: "num", caminho: "", rotulo: "Escala", min: 0.9, max: 1.1, passo: 0.001, unidade: "%", fator: 100 }} valor={refAjuste.escala} mudar={(escala) => setRefAjuste((a) => ({ ...a, escala }))} />
                  <Botao onClick={() => setRefAjuste({ dx: 0, dy: 0, escala: 1 })}>Zerar ajuste</Botao>
                </>
              )}
            </div>
          </details>
          {GRUPOS.map((g) => (
            <details
              key={g.id}
              className={styles.grupo}
              data-grupo={g.id}
              data-selecionado={selecionado === g.id ? "1" : undefined}
              open={abertos.has(g.id)}
              onToggle={(e) => {
                const aberto = (e.currentTarget as HTMLDetailsElement).open;
                setAbertos((a) => {
                  if (a.has(g.id) === aberto) return a;
                  const n = new Set(a);
                  if (aberto) n.add(g.id);
                  else n.delete(g.id);
                  return n;
                });
              }}
            >
              <summary onClick={() => g.base && setSelecionado(g.id)}>{g.titulo}</summary>
              <CampoGrupo g={g} layout={layout} mudar={mudarCampo} />
            </details>
          ))}
        </aside>
      </div>
      {aviso && (
        <div className={`${styles.aviso} ${aviso.tipo === "erro" ? styles.avisoErro : ""}`} role="status">
          {aviso.texto}
        </div>
      )}
    </div>
  );
}
