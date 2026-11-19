"use client";

// O PDF desenhado na própria página, com o pdf.js: para os navegadores que não mostram PDF dentro da página (o Chrome
// do celular baixa o arquivo, tanto no quadro quanto numa aba nova). As páginas são desenhadas quando chegam perto da
// parte visível do visor, uma por vez; o zoom redesenha na largura nova. Embaixo, a página atual e o zoom.
import { useEffect, useRef, useState, type RefObject } from "react";
import { abrirPdf, paginaComoImagem, type PDFDocumentProxy } from "@/lib/pdfjs";
import styles from "./provas.module.css";

const ZOOMS = [1, 1.5, 2, 3] as const;

type Enfileirar = (tarefa: () => Promise<void>) => void;
/**
 * A fila de desenho de um visor: uma página por vez (o pdf.js travaria desenhando todas juntas). Cada visor tem a sua,
 * e uma página que não termina em 15 s não segura as outras.
 */
function novaFila(): Enfileirar {
  const fila: (() => Promise<void>)[] = [];
  let desenhando = false;
  return (tarefa) => {
    fila.push(tarefa);
    if (desenhando) return;
    desenhando = true;
    void (async () => {
      while (fila.length) {
        const t = fila.shift()!;
        await Promise.race([t().catch(() => {}), new Promise((ok) => setTimeout(ok, 15_000))]);
      }
      desenhando = false;
    })();
  };
}

/** Se o navegador não mostra PDF dentro da página: sem leitor embutido, ou num aparelho de toque (celular, tablet). */
export function precisaDoVisorProprio(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.pdfViewerEnabled === false || window.matchMedia("(pointer: coarse)").matches;
}

export function VisorPdf({
  url,
  titulo,
  paginaInicial,
  baixar,
}: {
  url: string;
  titulo: string;
  paginaInicial?: number;
  /** o botão de baixar, na barra de baixo (no celular a barra de cima some) */
  baixar?: { href: string; nome: string };
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const [enfileirar] = useState(novaFila);
  const [aberto, setAberto] = useState<{ url: string; doc: PDFDocumentProxy; paginas: number; razao: number } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [zoom, setZoom] = useState<(typeof ZOOMS)[number]>(1);
  const [atual, setAtual] = useState(1);
  const doc = aberto?.url === url ? aberto : null;

  useEffect(() => {
    let vivo = true;
    let d: PDFDocumentProxy | null = null;
    abrirPdf(url).then(
      async (x) => {
        if (!vivo) return void x.loadingTask.destroy();
        d = x;
        const v = (await x.getPage(1)).getViewport({ scale: 1 });
        if (vivo) setAberto({ url, doc: x, paginas: x.numPages, razao: v.height / v.width });
      },
      () => vivo && setErro(url),
    );
    return () => {
      vivo = false;
      void d?.loadingTask.destroy();
    };
  }, [url]);

  // a página em que o documento abre (a do enunciado, vindo das estatísticas)
  useEffect(() => {
    if (!doc || !paginaInicial || paginaInicial < 2) return;
    caixa.current?.querySelector<HTMLElement>(`[data-pagina="${paginaInicial}"]`)?.scrollIntoView({ block: "start" });
  }, [doc, paginaInicial]);

  const aoRolar = () => {
    const c = caixa.current;
    if (!c) return;
    const meio = c.getBoundingClientRect().top + c.clientHeight / 3;
    const paginas = [...c.querySelectorAll<HTMLElement>("[data-pagina]")];
    const visivel = paginas.find((p) => p.getBoundingClientRect().bottom > meio);
    if (visivel) setAtual(Number(visivel.dataset.pagina));
  };
  const mudarZoom = (passo: -1 | 1) => {
    const c = caixa.current;
    const i = ZOOMS.indexOf(zoom);
    const novo = ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, i + passo))]!;
    if (novo === zoom || !c) return;
    // a mesma parte do documento fica à vista: a rolagem acompanha a escala
    const fator = novo / zoom;
    const topo = c.scrollTop;
    const esquerda = c.scrollLeft;
    setZoom(novo);
    requestAnimationFrame(() => {
      c.scrollTop = topo * fator;
      c.scrollLeft = esquerda * fator + (novo > zoom ? (c.clientWidth * (fator - 1)) / 2 : 0);
    });
  };

  if (erro === url)
    return (
      <div className={styles.corpo}>
        <p className="muted">Não consegui abrir este PDF aqui. Use o botão “Baixar” acima.</p>
      </div>
    );
  return (
    <div className={styles.visorProprio}>
      <div ref={caixa} className={styles.paginasPdf} onScroll={aoRolar} aria-label={titulo} role="document" tabIndex={0}>
        {!doc && <p className={styles.carregandoPdf}>Carregando o PDF…</p>}
        {doc &&
          Array.from({ length: doc.paginas }, (_, k) => (
            <PaginaDoVisor key={`${url}-${k}`} doc={doc.doc} n={k + 1} razao={doc.razao} zoom={zoom} raiz={caixa} enfileirar={enfileirar} />
          ))}
      </div>
      {doc && (
        <div className={styles.controlesPdf}>
          <span aria-live="polite">
            Página {atual} de {doc.paginas}
          </span>
          <span className={styles.zoomPdf} role="group" aria-label="Zoom">
            <button type="button" onClick={() => mudarZoom(-1)} disabled={zoom === ZOOMS[0]} aria-label="Diminuir o zoom">
              −
            </button>
            <span>{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => mudarZoom(1)} disabled={zoom === ZOOMS.at(-1)} aria-label="Aumentar o zoom">
              +
            </button>
          </span>
          {baixar && (
            <a className={styles.baixarVisor} href={baixar.href} download={baixar.nome} aria-label="Baixar o PDF">
              <span aria-hidden>⬇</span> Baixar
            </a>
          )}
        </div>
      )}
    </div>
  );
}

/** Uma página: um espaço do tamanho dela até ser desenhada, quando chega perto da parte visível do visor. */
function PaginaDoVisor({
  doc,
  n,
  razao,
  zoom,
  raiz,
  enfileirar,
}: {
  doc: PDFDocumentProxy;
  n: number;
  razao: number;
  zoom: number;
  raiz: RefObject<HTMLDivElement | null>;
  enfileirar: Enfileirar;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  // a imagem na tela: no zoom, ela fica até a nova chegar, e só então é liberada
  const naTela = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (naTela.current) URL.revokeObjectURL(naTela.current);
    },
    [],
  );
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let vivo = true;
    const desenhar = async () => {
      if (!vivo) return;
      // a largura na tela vezes a densidade do aparelho, com um teto (páginas enormes não cabem na memória do celular)
      const largura = Math.min(2400, Math.ceil(el.clientWidth * Math.min(2.5, window.devicePixelRatio || 1)));
      const r = await paginaComoImagem(doc, n, largura);
      if (!r) return;
      if (!vivo) return void URL.revokeObjectURL(r.url);
      if (naTela.current) URL.revokeObjectURL(naTela.current);
      naTela.current = r.url;
      setSrc(r.url);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e?.isIntersecting) return;
        io.disconnect();
        enfileirar(desenhar);
      },
      { root: raiz.current, rootMargin: "120% 0px" },
    );
    io.observe(el);
    return () => {
      vivo = false;
      io.disconnect();
    };
  }, [doc, n, zoom, raiz, enfileirar]);
  return (
    <div ref={ref} data-pagina={n} className={styles.paginaPdf} style={{ width: `calc(min(100%, 860px) * ${zoom})`, aspectRatio: `1 / ${razao}` }}>
      {src && <img src={src} alt={`Página ${n}`} draggable={false} />}
    </div>
  );
}
