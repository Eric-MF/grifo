"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { ExameResumo } from "@/content/load";
import { semAcento } from "@/lib/leis/busca";
import { abrirPdf, paginaComoImagem, type PDFDocumentProxy } from "@/lib/pdfjs";
import { nomeDoArquivo, type Chave } from "../nomes";
import styles from "./todos.module.css";
import { jsonDeGzip } from "@/lib/gzip";

type Tipo = "gabarito" | "caderno";
type Versao = "atualizado" | "original" | "fase1";

const TIPOS: [Tipo, string][] = [
  ["gabarito", "Gabaritos"],
  ["caderno", "Cadernos"],
];
const VERSOES: [Versao, string, string][] = [
  ["atualizado", "Atualizado", "2ª fase: a versão do Grifo, com as notas de lei nova (sem ela, a original)"],
  ["original", "Original", "2ª fase: o PDF da FGV, como foi publicado"],
  ["fase1", "1ª fase", "Caderno Tipo 1 e gabarito da prova objetiva (todas as matérias)"],
];

/** O PDF de um exame para o tipo e a versão escolhidos (o atualizado, se não houver, cai no original). */
function pdfDo(e: ExameResumo, tipo: Tipo, versao: Versao): { href: string; chave: Chave; rotulo: string } | null {
  const ordem: [Chave, string][] =
    versao === "fase1"
      ? [[tipo === "gabarito" ? "objetivaGabarito" : "objetivaCaderno", tipo === "gabarito" ? "Gabarito da 1ª fase" : "Caderno da 1ª fase"]]
      : versao === "original"
        ? [[tipo === "gabarito" ? "gabaritoOriginal" : "cadernoOriginal", tipo === "gabarito" ? "Gabarito original" : "Caderno original"]]
        : tipo === "gabarito"
          ? [["gabaritoAtualizado", "Gabarito atualizado"], ["gabaritoOriginal", "Gabarito original"]]
          : [["cadernoAtualizado", "Caderno atualizado"], ["cadernoOriginal", "Caderno original"]];
  for (const [chave, rotulo] of ordem) {
    const href = e.downloads[chave];
    if (href) return { href, chave, rotulo };
  }
  return null;
}

/** Perto da tela: até uma tela acima ou duas abaixo da parte visível. */
const perto = (el: Element) => {
  const r = el.getBoundingClientRect();
  return r.bottom > -window.innerHeight && r.top < 3 * window.innerHeight;
};
// as páginas são desenhadas uma por vez, na ordem em que chegam perto da tela: dezenas de PDFs na mesma página, todos
// pedindo ao mesmo tempo, travariam o pdf.js. Na vez de cada uma, se ela já saiu de perto da tela, fica para depois.
const fila: (() => Promise<void>)[] = [];
let desenhando = false;
function enfileirar(tarefa: () => Promise<void>) {
  fila.push(tarefa);
  if (desenhando) return;
  desenhando = true;
  void (async () => {
    while (fila.length) await fila.shift()!().catch(() => {});
    desenhando = false;
  })();
}

// ---------- busca no texto dos PDFs ----------
// O texto de cada página vem pronto do build (scripts/textos-provas.ts), comprimido, em três grupos; a página baixa só o
// grupo do que está à mostra, uma vez, na primeira busca. Como na busca das leis: sem acento, sem diferença de
// maiúsculas, todas as palavras na mesma página; entre aspas, a expressão exata.
type Textos = Record<string, string[]>;
const textosBaixados = new Map<string, Promise<Textos>>();
function baixarTextos(grupo: string): Promise<Textos> {
  if (!textosBaixados.has(grupo))
    textosBaixados.set(
      grupo,
      fetch(`/dados/provas/busca-${grupo}.json.gz`)
        .then((r) => jsonDeGzip<Textos>(r))
        .catch((erro) => {
          textosBaixados.delete(grupo);
          throw erro;
        }),
    );
  return textosBaixados.get(grupo)!;
}
const gruposDa = (versao: Versao) => (versao === "fase1" ? ["objetivas"] : versao === "original" ? ["originais"] : ["atualizados", "originais"]);

/** As palavras e as expressões (entre aspas) da busca, sem acento. */
function termosDa(consulta: string): string[] {
  const frases = [...consulta.matchAll(/"([^"]+)"/g)].map((m) => semAcento(m[1]!).trim()).filter(Boolean);
  const palavras = semAcento(consulta.replace(/"[^"]*"/g, " "))
    .split(/[^a-z0-9§º-]+/)
    .filter((p) => p.length >= 2);
  return [...frases, ...palavras];
}

interface Achado {
  e: ExameResumo;
  pagina: number;
  antes: string;
  achado: string;
  depois: string;
}
const LIMITE_ACHADOS = 300;

const titulo = (e: ExameResumo) => `${e.numeral} Exame${e.variante ? ` · ${e.variante}` : ""}`;

export function TodosNumaPagina({ exames }: { exames: ExameResumo[] }) {
  const [tipo, setTipo] = useState<Tipo>("gabarito");
  const [versao, setVersao] = useState<Versao>("atualizado");
  // a busca (as palavras digitadas; o texto dos PDFs só baixa na primeira)
  const [consulta, setConsulta] = useState("");
  // a escolha vem do endereço (?tipo=caderno&versao=original), para o link da página de provas e para voltar
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    /* eslint-disable react-hooks/set-state-in-effect -- site estático: o endereço só existe no navegador */
    if (p.get("tipo") === "caderno" || p.get("tipo") === "gabarito") setTipo(p.get("tipo") as Tipo);
    if (VERSOES.some(([v]) => v === p.get("versao"))) setVersao(p.get("versao") as Versao);
    // ?busca= (as teses das estatísticas): a busca já começa feita
    if (p.get("busca")) setConsulta(p.get("busca")!);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);
  const escolher = (t: Tipo, v: Versao) => {
    setTipo(t);
    setVersao(v);
    const p = new URLSearchParams({ tipo: t, versao: v });
    window.history.replaceState(null, "", `?${p}`);
  };
  // o exame escolhido no índice fica no alto da tela enquanto os PDFs de cima carregam e crescem (até mexer na página)
  const alvo = useRef<{ id: string; pagina?: number; ate: number } | null>(null);
  const documentos = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = documentos.current;
    if (!el) return;
    const manter = () => {
      const a = alvo.current;
      if (!a) return;
      if (Date.now() > a.ate) return void (alvo.current = null);
      (document.getElementById(`pdf-${a.id}-p${a.pagina}`) ?? document.getElementById(`pdf-${a.id}`))?.scrollIntoView({ block: "start" });
    };
    const soltar = () => (alvo.current = null);
    const ro = new ResizeObserver(manter);
    ro.observe(el);
    window.addEventListener("wheel", soltar, { passive: true });
    window.addEventListener("touchmove", soltar, { passive: true });
    window.addEventListener("keydown", soltar);
    return () => {
      ro.disconnect();
      window.removeEventListener("wheel", soltar);
      window.removeEventListener("touchmove", soltar);
      window.removeEventListener("keydown", soltar);
    };
    // a lista é outra (outro elemento) a cada troca de tipo ou de versão
  }, [tipo, versao]);
  const irPara = (id: string, pagina?: number) => {
    alvo.current = { id, pagina, ate: Date.now() + 15_000 };
    (document.getElementById(`pdf-${id}-p${pagina}`) ?? document.getElementById(`pdf-${id}`))?.scrollIntoView({ block: "start" });
  };
  const lista = useMemo(
    () =>
      exames
        .map((e) => ({ e, pdf: pdfDo(e, tipo, versao) }))
        .filter((x): x is { e: ExameResumo; pdf: NonNullable<ReturnType<typeof pdfDo>> } => !!x.pdf),
    [exames, tipo, versao],
  );

  // a busca: o texto baixado na primeira vez que se digita, e a lista de páginas que têm todas as palavras
  const adiada = useDeferredValue(consulta);
  const [textos, setTextos] = useState<{ chave: string; t: Textos } | null>(null);
  const [falhou, setFalhou] = useState(false);
  const chaveTextos = gruposDa(versao).join("+");
  useEffect(() => {
    if (!consulta.trim() || textos?.chave === chaveTextos) return;
    let vivo = true;
    Promise.all(gruposDa(versao).map(baixarTextos)).then(
      (partes) => vivo && setTextos({ chave: chaveTextos, t: Object.assign({}, ...partes) }),
      () => vivo && setFalhou(true),
    );
    return () => {
      vivo = false;
    };
  }, [consulta, chaveTextos, versao, textos]);
  // o texto sem acento, calculado uma vez por grupo (semAcento não muda o tamanho: as posições valem no original)
  const normalizados = useMemo(() => {
    const m = new Map<string, string[]>();
    if (textos?.chave === chaveTextos) for (const [href, ps] of Object.entries(textos.t)) m.set(href, ps.map(semAcento));
    return m;
  }, [textos, chaveTextos]);
  const termos = useMemo(() => termosDa(adiada), [adiada]);
  const { achados, semTexto } = useMemo(() => {
    const achados: Achado[] = [];
    let semTexto = 0;
    if (!termos.length || !normalizados.size) return { achados, semTexto };
    for (const { e, pdf } of lista) {
      const ps = normalizados.get(pdf.href);
      const originais = textos?.t[pdf.href];
      if (!ps || !originais) continue;
      if (!ps.some(Boolean)) semTexto++;
      ps.forEach((t, k) => {
        if (achados.length >= LIMITE_ACHADOS || !termos.every((p) => t.includes(p))) return;
        const i = t.indexOf(termos[0]!);
        const fim = i + termos[0]!.length;
        const o = originais[k]!;
        achados.push({
          e,
          pagina: k + 1,
          antes: (i > 70 ? "…" : "") + o.slice(Math.max(0, i - 70), i).replace(/\s+/g, " "),
          achado: o.slice(i, fim),
          depois: o.slice(fim, fim + 110).replace(/\s+/g, " ") + (fim + 110 < o.length ? "…" : ""),
        });
      });
    }
    return { achados, semTexto };
  }, [termos, normalizados, lista, textos]);
  const examesAchados = new Set(achados.map((a) => a.e.id)).size;
  // nas páginas, só se destacam as palavras de 3 letras ou mais (o "in" de "reformatio in pejus" pintaria a página toda)
  const destacar = useMemo(() => termos.filter((t) => t.length >= 3), [termos]);

  return (
    <>
      <div className={styles.barra} role="toolbar" aria-label="O que mostrar">
        <div className={styles.grupo} role="radiogroup" aria-label="Tipo">
          {TIPOS.map(([t, nome]) => (
            <button key={t} type="button" role="radio" aria-checked={tipo === t} onClick={() => escolher(t, versao)}>
              {nome}
            </button>
          ))}
        </div>
        <div className={styles.grupo} role="radiogroup" aria-label="Versão">
          {VERSOES.map(([v, nome, dica]) => (
            <button key={v} type="button" role="radio" aria-checked={versao === v} title={dica} onClick={() => escolher(tipo, v)}>
              {nome}
            </button>
          ))}
        </div>
        <label className={styles.ir}>
          <span className="sr-only">Ir para o exame</span>
          <select
            value=""
            onChange={(ev) => {
              if (ev.target.value) irPara(ev.target.value);
              ev.target.value = "";
            }}
          >
            <option value="">Ir para o exame…</option>
            {lista.map(({ e }) => (
              <option key={e.id} value={e.id}>
                {titulo(e)}
              </option>
            ))}
          </select>
        </label>
        <span className="muted">{lista.length} PDF(s)</span>
        <label className={styles.busca}>
          <span className="sr-only">Buscar no texto dos PDFs</span>
          <input type="search" placeholder="Buscar no texto (palavras ou “expressão”)" value={consulta} onChange={(ev) => setConsulta(ev.target.value)} />
        </label>
      </div>
      {consulta.trim() && (
        <div className={styles.resultados} aria-live="polite">
          {falhou ? (
            <p className="muted">Não consegui baixar o texto dos PDFs agora. Tente de novo.</p>
          ) : !normalizados.size ? (
            <p className="muted">Carregando o texto dos PDFs…</p>
          ) : termos.length === 0 ? (
            <p className="muted">Digite pelo menos duas letras.</p>
          ) : (
            <>
              <p className={styles.resumoBusca}>
                {achados.length
                  ? `${achados.length >= LIMITE_ACHADOS ? `Mais de ${LIMITE_ACHADOS}` : achados.length} página(s) em ${examesAchados} exame(s)`
                  : "Nenhuma página com todas as palavras"}
                {semTexto > 0 && <span className="muted"> · {semTexto} PDF(s) escaneado(s), sem texto para buscar</span>}
              </p>
              <ol className={styles.listaAchados}>
                {achados.map((a) => (
                  <li key={`${a.e.id}-${a.pagina}`}>
                    <button type="button" onClick={() => irPara(a.e.id, a.pagina)}>
                      <strong>
                        {titulo(a.e)} · p. {a.pagina}
                      </strong>
                      <span>
                        {a.antes}
                        <mark>{a.achado}</mark>
                        {a.depois}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      )}
      <div ref={documentos} className={styles.documentos} key={`${tipo}-${versao}`}>
        {lista.map(({ e, pdf }) => (
          <section key={e.id} id={`pdf-${e.id}`} className={styles.documento} aria-label={`${pdf.rotulo} do ${titulo(e)}`}>
            <header className={styles.cabeca}>
              <h2>
                {titulo(e)}
                {e.aplicacao && <span className="muted"> · {e.aplicacao.slice(0, 4)}</span>}
              </h2>
              <span className={styles.qual}>
                {pdf.rotulo}
                {pdf.chave === "gabaritoOriginal" && e.preliminar.gabarito && <span className={styles.preliminar}>preliminar</span>}
                {pdf.chave === "objetivaGabarito" && e.preliminar.objetiva && <span className={styles.preliminar}>preliminar</span>}
              </span>
              <a className={styles.baixar} href={pdf.href} download={nomeDoArquivo(e, pdf.chave)}>
                ⬇ Baixar PDF
              </a>
            </header>
            <DocumentoPdf url={pdf.href} id={e.id} termos={destacar} />
          </section>
        ))}
      </div>
    </>
  );
}

/**
 * Um PDF desenhado na página: abre quando chega perto da tela (a uns 1,5 tela de distância) e desenha cada página
 * também só quando ela se aproxima. A página vira uma imagem (o canvas é descartado), para a memória aguentar dezenas
 * de PDFs na mesma página.
 */
function DocumentoPdf({ url, id, termos }: { url: string; id: string; termos: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [paginas, setPaginas] = useState<number[]>([]);
  const [proporcao, setProporcao] = useState(297 / 210);
  const [erro, setErro] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let vivo = true;
    let aberto: PDFDocumentProxy | null = null;
    const io = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada?.isIntersecting) return;
        io.disconnect();
        abrirPdf(url).then(
          async (d) => {
            if (!vivo) return void d.loadingTask.destroy();
            aberto = d;
            const v = (await d.getPage(1)).getViewport({ scale: 1 });
            if (!vivo) return;
            setProporcao(v.height / v.width);
            setPaginas(Array.from({ length: d.numPages }, (_, k) => k + 1));
            setDoc(d);
          },
          () => vivo && setErro(true),
        );
      },
      { rootMargin: "100% 0px" },
    );
    io.observe(el);
    return () => {
      vivo = false;
      io.disconnect();
      void aberto?.loadingTask.destroy();
    };
  }, [url]);
  return (
    <div ref={ref} className={styles.paginas} style={!doc ? { minHeight: "60vh" } : undefined}>
      {erro && (
        <p className="muted">
          Não consegui abrir este PDF aqui. <a href={url}>Abrir o arquivo</a>.
        </p>
      )}
      {!doc && !erro && <p className={styles.carregando}>Carregando o PDF…</p>}
      {doc && paginas.map((n) => <PaginaPdf key={n} doc={doc} n={n} proporcao={proporcao} id={`pdf-${id}-p${n}`} termos={termos} />)}
    </div>
  );
}

/** Uma caixa de destaque sobre a página, em % da largura e da altura (acompanha o tamanho da imagem). */
type Caixa = { x: number; y: number; w: number; h: number };

function PaginaPdf({ doc, n, proporcao, id, termos }: { doc: PDFDocumentProxy; n: number; proporcao: number; id: string; termos: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [razao, setRazao] = useState(proporcao);
  const [caixas, setCaixas] = useState<Caixa[]>([]);
  // as palavras buscadas, destacadas na página já desenhada: a posição de cada uma sai do texto do PDF
  const chaveTermos = termos.join("\u0000");
  useEffect(() => {
    let vivo = true;
    if (!src || !termos.length) {
      // sem busca, nada a destacar (limpo no próximo quadro, fora do efeito)
      requestAnimationFrame(() => vivo && setCaixas([]));
      return () => {
        vivo = false;
      };
    }
    void (async () => {
      const pagina = await doc.getPage(n);
      const vp = pagina.getViewport({ scale: 1 });
      const { items } = await pagina.getTextContent();
      const novas: Caixa[] = [];
      for (const it of items) {
        if (!("str" in it) || !it.str) continue;
        const t = semAcento(it.str);
        const altura = it.height || Math.hypot(it.transform[2], it.transform[3]);
        for (const termo of termos) {
          for (let i = t.indexOf(termo); i >= 0; i = t.indexOf(termo, i + termo.length)) {
            const x0 = it.transform[4] + (it.width * i) / t.length;
            const x1 = it.transform[4] + (it.width * (i + termo.length)) / t.length;
            const [a, b] = vp.convertToViewportPoint(x0, it.transform[5] - altura * 0.2) as [number, number];
            const [c, d] = vp.convertToViewportPoint(x1, it.transform[5] + altura * 0.9) as [number, number];
            novas.push({ x: (Math.min(a, c) / vp.width) * 100, y: (Math.min(b, d) / vp.height) * 100, w: (Math.abs(c - a) / vp.width) * 100, h: (Math.abs(d - b) / vp.height) * 100 });
          }
        }
      }
      if (vivo) setCaixas(novas);
    })().catch(() => {});
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- os termos entram pela chave (a lista muda a cada render)
  }, [src, doc, n, chaveTermos]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let vivo = true;
    let endereco: string | null = null;
    const desenhar = async () => {
      if (!vivo) return;
      // já saiu de perto da tela: volta a esperar
      if (!perto(el)) return void io.observe(el);
      try {
        const largura = Math.min(1500, Math.ceil(el.clientWidth * Math.min(2, window.devicePixelRatio || 1)));
        const img = await paginaComoImagem(doc, n, largura);
        if (!img) return;
        if (!vivo) return void URL.revokeObjectURL(img.url);
        endereco = img.url;
        setRazao(img.razao);
        setSrc(endereco);
      } catch {
        // a página que não abre fica em branco; o botão "Baixar PDF" continua valendo
      }
    };
    const io = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada?.isIntersecting) return;
        io.disconnect();
        enfileirar(desenhar);
      },
      // desenha um pouco antes de chegar: rolando, a página seguinte já está pronta
      { rootMargin: "150% 0px" },
    );
    io.observe(el);
    return () => {
      vivo = false;
      io.disconnect();
      if (endereco) URL.revokeObjectURL(endereco);
    };
  }, [doc, n]);
  return (
    <div ref={ref} id={id} className={styles.pagina} style={{ aspectRatio: `1 / ${razao}` }}>
      {src && <img src={src} alt={`Página ${n}`} loading="lazy" />}
      {caixas.map((c, k) => (
        <span key={k} className={styles.destaque} style={{ left: `${c.x}%`, top: `${c.y}%`, width: `${c.w}%`, height: `${c.h}%` }} aria-hidden />
      ))}
    </div>
  );
}
