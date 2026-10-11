"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type CSSProperties, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import indice from "@/content/generated/leis-indice.json";
import prontosJson from "@/content/generated/grifos.json";
import { gravarJSON, lerJSON } from "@/lib/storage";
import { artigoDigitado, buscarTexto, sugerirArtigos, type Achado, type ArtigoTexto } from "@/lib/leis/busca";
import { codificar, decodificar, LIMITE_LINK, pareceCompartilhado, type Compartilhado } from "@/lib/leis/compartilhar";
import { carregarArtigos, carregarDatas, carregarLei } from "@/lib/leis/dados";
import { agregar, lerEventos, maisErrados, type Agregado } from "@/lib/erros";
import { grifoDe, type GrifosProntos } from "@/lib/leis/grifos";
import { htmlBlocos, mapaAncoras } from "@/lib/leis/html";
import { gravarLegendas, lerLegendas, sistemaAtivo, todosSistemas, type CorLegenda, type Sistema } from "@/lib/leis/legendas";
import { textoEm, type Bloco } from "@/lib/leis/linha-do-tempo";
import { gravarMarcacoes, lerMarcacoes, localizar, novaMarcacao, type Marcacao } from "@/lib/leis/marcacoes";
import {
  imantar,
  indicePorPosicao,
  modoPorPosicao,
  mover as moverIndice,
  proximoPonto,
  PX_POR_MARCA,
  secoesDosArtigos,
  type Modo,
} from "@/lib/leis/rolagem";
import { CLASSES } from "./classes";
import styles from "./leitor.module.css";

export interface PrefsLeitor {
  fonte: "sans" | "serif" | "mono";
  tamanho: number;
  entrelinha: number;
  fundo: "papel" | "branco" | "sepia" | "escuro" | "verde";
  revogados: boolean;
  anotacoes: boolean;
  /** marcar os artigos em que o usuário mais erra */
  erros: boolean;
  destino: "grifo" | "planalto";
  /** grifos prontos do Grifo (content/grifos.yaml) */
  prontos: boolean;
}
export const PREFS_PADRAO: PrefsLeitor = {
  fonte: "sans",
  tamanho: 18,
  entrelinha: 1.7,
  fundo: "papel",
  revogados: false,
  anotacoes: true,
  erros: true,
  destino: "grifo",
  prontos: true,
};
const K_PREFS = "grifo:leitor";
const K_IMPORTANTES = "grifo:leis:importantes";
const K_HISTORICO = "grifo:leis:historico";
const K_POSICOES = "grifo:leitor:posicoes";
const FUNDOS: { id: PrefsLeitor["fundo"]; nome: string }[] = [
  { id: "papel", nome: "Papel" },
  { id: "branco", nome: "Branco" },
  { id: "sepia", nome: "Sépia" },
  { id: "verde", nome: "Verde" },
  { id: "escuro", nome: "Escuro" },
];
const PRONTOS = prontosJson as GrifosProntos;
const LOTE = 200;

type Painel = "leis" | "buscar" | "grifos" | "aa" | "mais" | "divisoes";
type Posicoes = Record<string, { art: string; rotulo: string; em: number }>;

const blocosDe = (raiz: HTMLElement) => Array.from(raiz.querySelectorAll<HTMLElement>("[data-i]"));
const txtDe = (el: HTMLElement) => el.querySelector<HTMLElement>(`:scope > .${CLASSES.txt}`);
const proximoQuadro = () => new Promise<void>((r) => requestAnimationFrame(() => setTimeout(r, 0)));

function desmarcar(raiz: HTMLElement) {
  raiz.querySelectorAll("mark[data-m]").forEach((m) => m.replaceWith(...Array.from(m.childNodes)));
  raiz.normalize();
}

/** Envolve o intervalo [ini, fim) do texto de `el` em <mark>, atravessando links e outros nós. */
function envolver(el: HTMLElement, ini: number, fim: number, m: Marcacao, rotulo: string, nova: boolean) {
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
    mark.dataset.m = m.id;
    mark.className = `${styles.marca}${nova ? ` ${styles.nova}` : ""}`;
    if (m.cor === "nota") mark.dataset.soNota = "1";
    else mark.style.setProperty("--c", m.cor);
    if (m.nota) mark.dataset.nota = "1";
    mark.title = [rotulo, m.nota].filter(Boolean).join(" — ");
    alvo.replaceWith(mark);
    mark.append(alvo);
  }
}

interface Historico {
  pilha: string[];
  pos: number;
}
const HISTORICO_VAZIO: Historico = { pilha: [], pos: -1 };

// Como voltar e avançar do navegador: deslizar percorre as leis já abertas, não a ordem do índice.
function registrarVisita(lei: string) {
  const h = lerJSON<Historico>(K_HISTORICO, HISTORICO_VAZIO);
  if (h.pilha[h.pos] === lei) return;
  if (h.pilha[h.pos - 1] === lei) h.pos--;
  else if (h.pilha[h.pos + 1] === lei) h.pos++;
  else {
    h.pilha = [...h.pilha.slice(0, h.pos + 1), lei].slice(-30);
    h.pos = h.pilha.length - 1;
  }
  gravarJSON(K_HISTORICO, h);
}

export function Leitor({ lei, nome, url, total, inicial }: { lei: string; nome: string; url: string; total: number; inicial: string }) {
  const router = useRouter();
  const folha = useRef<HTMLDivElement>(null);
  const html = useMemo(() => ({ __html: inicial }), [inicial]);
  const [prefs, setPrefs] = useState<PrefsLeitor>(PREFS_PADRAO);
  const [painel, setPainel] = useState<Painel | null>(null);
  const [pronto, setPronto] = useState(false);
  const [artigos, setArtigos] = useState<ArtigoTexto[]>([]);
  const [atual, setAtual] = useState(0);
  const [oculto, setOculto] = useState(false);
  const [data, setData] = useState("");
  const [tempo, setTempo] = useState<{ carregando: boolean; aprox: number; erro?: string } | null>(null);
  const [marcas, setMarcas] = useState<Marcacao[]>([]);
  const [legendas, setLegendas] = useState(() => ({ ativo: "materias", meus: [] as Sistema[] }));
  const [marcador, setMarcador] = useState<{ ativo: boolean; cor: string }>({ ativo: false, cor: "" });
  const [selecao, setSelecao] = useState<{ x: number; y: number; fundo: number; acima: boolean; toque: boolean; i: number; ini: number; fim: number } | null>(null);
  const [errados, setErrados] = useState<Agregado[]>([]);
  const [secaoVisivel, setSecaoVisivel] = useState(false);
  const [nomeVisivel, setNomeVisivel] = useState(false);
  const [telaCheia, setTelaCheia] = useState(false);
  const [aberta, setAberta] = useState<{ id: string; x: number; y: number } | null>(null);
  const [estrelas, setEstrelas] = useState<string[]>([]);
  const [mapa, setMapa] = useState<ReturnType<typeof secoesDosArtigos>>({ secoes: [], marcos: [], divisoes: [] });
  const [regra, setRegra] = useState<{ x: number; y: number; rotulo: string; nota?: string; destaque: boolean } | null>(null);
  const [compartilhar, setCompartilhar] = useState<{ comMarcas: boolean; link: string; carga?: Compartilhado } | null>(null);
  const [recebido, setRecebido] = useState<Compartilhado | null>(null);
  const [vendoRecebido, setVendoRecebido] = useState(false);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  const [perdidas, setPerdidas] = useState(0);
  const [editandoSistema, setEditandoSistema] = useState<Sistema | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; acao?: { rotulo: string; fazer: () => void } } | null>(null);
  const [posicoes, setPosicoes] = useState<Posicoes>({});
  const blocos = useRef<Bloco[] | null>(null);
  const novaMarca = useRef<string | null>(null);
  const antesDoSalto = useRef<number | null>(null);
  const barraFixa = useRef(0);
  // Saltos do próprio leitor não devem recolher a barra: ela fica para trocar de artigo.
  const saltoFixo = () => {
    barraFixa.current = Date.now() + 2000;
  };

  const sistema = sistemaAtivo(legendas);
  const corMarcador = marcador.cor === "borracha" ? "borracha" : marcador.cor && sistema.cores.some((c) => c.cor === marcador.cor) ? marcador.cor : sistema.cores[0]?.cor;

  // ---------- preferências e estado salvo ----------
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- lê localStorage e o link após montar (site estático) */
    setPrefs({ ...PREFS_PADRAO, ...lerJSON<Partial<PrefsLeitor>>(K_PREFS, {}) });
    setMarcas(lerMarcacoes(lei));
    setLegendas(lerLegendas());
    setPosicoes(lerJSON<Posicoes>(K_POSICOES, {}));
    setErrados(maisErrados(agregar(lerEventos().filter((e) => e.d === lei), { janelaDias: null }), "baixo"));
    const h = location.hash.match(/^#c=(v1\..+)$/);
    if (h) decodificar<unknown>(h[1]).then((c) => pareceCompartilhado(c) && c.lei === lei && setRecebido(c));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [lei]);
  const mudarPrefs = (p: Partial<PrefsLeitor>) =>
    setPrefs((a) => {
      const n = { ...a, ...p };
      gravarJSON(K_PREFS, n);
      return n;
    });

  useEffect(() => {
    registrarVisita(lei);
  }, [lei]);
  useEffect(() => {
    const h = lerJSON<Historico>(K_HISTORICO, HISTORICO_VAZIO);
    for (const vizinha of [h.pilha[h.pos - 1], h.pilha[h.pos + 1]]) if (vizinha && vizinha !== lei) router.prefetch(`/leis/${vizinha}/`);
  }, [lei, router]);

  // A página toda fica na cor da leitura: sem moldura de outra cor e sem clarão ao rolar rápido.
  useLayoutEffect(() => {
    const raiz = document.documentElement;
    raiz.dataset.leitorFundo = prefs.fundo;
    return () => {
      delete raiz.dataset.leitorFundo;
    };
  }, [prefs.fundo]);

  // Âncora do endereço ou volta para onde o leitor parou
  const irParaArtigo = useCallback((art: string, suave = false) => {
    const alvo = document.getElementById(art);
    if (!alvo) return false;
    alvo.scrollIntoView({ block: "start", behavior: suave ? "smooth" : "instant" });
    alvo.classList.add(styles.destaque);
    setTimeout(() => alvo.classList.remove(styles.destaque), 1600);
    return true;
  }, []);

  // Com posição salva ou âncora, o texto fica escondido até o salto: o começo da lei não aparece antes.
  useLayoutEffect(() => {
    const h = decodeURIComponent(location.hash.slice(1));
    const salvo = lerJSON<Posicoes>(K_POSICOES, {})[lei];
    if (((h && !h.startsWith("c=")) || salvo) && folha.current) folha.current.style.visibility = "hidden";
  }, [lei]);

  // ---------- texto: o começo veio pronto do servidor; o resto chega aos poucos ----------
  // A posição salva (ou a âncora) é alcançada logo no primeiro lote: o restante do texto cresce abaixo dela.
  useEffect(() => {
    let vivo = true;
    (async () => {
      const [l, a] = await Promise.all([carregarLei(lei), carregarArtigos(lei)]);
      if (!vivo) return;
      blocos.current = l.blocos;
      setArtigos(a.artigos);
      setMapa(secoesDosArtigos(l.blocos, a.artigos));
      setEstrelas(lerJSON<string[]>(K_IMPORTANTES, []));
      const el = folha.current!;
      const ancoras = mapaAncoras(l.blocos);
      const h = decodeURIComponent(location.hash.slice(1));
      const porAncora = !!h && !h.startsWith("c=");
      const salvo = lerJSON<Posicoes>(K_POSICOES, {})[lei];
      const destino = porAncora ? h : salvo && salvo.art !== a.artigos[0]?.[0] ? salvo.art : null;
      const alvo = destino ? ancoras.get(destino) : undefined;
      let posicionado = false;
      const posicionar = () => {
        posicionado = true;
        el.style.visibility = "";
        saltoFixo();
        if (!destino || !irParaArtigo(destino)) return;
        // os blocos acima ganham altura real ao serem desenhados e empurram o alvo: alinha de novo
        requestAnimationFrame(() => document.getElementById(destino)?.scrollIntoView({ block: "start", behavior: "instant" }));
        if (!porAncora && salvo) setAviso({ texto: `Você parou no ${salvo.rotulo}.`, acao: { rotulo: "Ir para o início", fazer: () => window.scrollTo({ top: 0, behavior: "instant" }) } });
      };
      // continua de onde parou (o efeito pode rodar duas vezes em desenvolvimento)
      let i = Number(el.lastElementChild?.getAttribute("data-i") ?? -1) + 1;
      if (!destino) el.style.visibility = "";
      if (alvo !== undefined && alvo < i) posicionar();
      while (vivo && i < total) {
        const fim = !posicionado && alvo !== undefined ? Math.min(total, alvo + LOTE) : Math.min(total, i + LOTE);
        el.insertAdjacentHTML("beforeend", htmlBlocos(l.blocos, i, fim, lei, url, ancoras, CLASSES));
        i = fim;
        if (!posicionado && alvo !== undefined && alvo < i) posicionar();
        await proximoQuadro();
      }
      if (!posicionado && destino) posicionar();
      if (vivo) setPronto(true);
    })().catch(() => {
      if (folha.current) folha.current.style.visibility = "";
      if (vivo) setAviso({ texto: "Não foi possível carregar o restante do texto. Verifique a conexão e recarregue." });
    });
    return () => {
      vivo = false;
    };
  }, [lei, url, total, irParaArtigo]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 6000);
    return () => clearTimeout(t);
  }, [aviso]);

  // Links: Grifo ou Planalto
  useEffect(() => {
    if (!pronto) return;
    folha.current?.querySelectorAll<HTMLAnchorElement>("a[data-planalto]").forEach((a) => {
      const planalto = prefs.destino === "planalto" || !a.dataset.grifo;
      a.href = (planalto ? a.dataset.planalto : a.dataset.grifo) ?? a.href;
      if (planalto) a.target = "_blank";
      else a.removeAttribute("target");
    });
  }, [prefs.destino, pronto]);

  // Artigos importantes (estrela)
  useEffect(() => {
    const el = folha.current;
    if (!el || !pronto) return;
    const importantes = new Set(lerJSON<string[]>(K_IMPORTANTES, []));
    const pintar = () =>
      el.querySelectorAll<HTMLButtonElement>("button[data-estrela]").forEach((b) => {
        const on = importantes.has(`${lei}:${b.dataset.estrela}`);
        b.setAttribute("aria-pressed", String(on));
        b.textContent = on ? "★" : "☆";
      });
    pintar();
    const clique = (e: MouseEvent) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-estrela]");
      if (!b) return;
      const k = `${lei}:${b.dataset.estrela}`;
      if (importantes.has(k)) importantes.delete(k);
      else importantes.add(k);
      gravarJSON(K_IMPORTANTES, [...importantes]);
      setEstrelas([...importantes]);
      pintar();
    };
    el.addEventListener("click", clique);
    return () => el.removeEventListener("click", clique);
  }, [lei, pronto]);

  // Grifos prontos do sistema de cores ativo
  useEffect(() => {
    const el = folha.current;
    if (!el || !pronto) return;
    const regra = grifoDe(PRONTOS, sistema.id, lei);
    const cor = (rotulo: string) => sistema.cores.find((c) => c.rotulo === rotulo)?.cor;
    for (const b of blocosDe(el)) {
      const g = prefs.prontos && b.dataset.disp && b.dataset.sup === "0" ? regra(b.dataset.disp) : null;
      const c = g ? cor(g.regra.rotulo) : undefined;
      if (g && c) {
        b.dataset.pronto = g.destaque ? "destaque" : "area";
        b.style.setProperty("--pronto", c);
        b.dataset.regra = g.regra.rotulo;
        if (g.regra.nota) b.dataset.regraNota = g.regra.nota;
        else delete b.dataset.regraNota;
      } else if (b.dataset.pronto) {
        delete b.dataset.pronto;
        delete b.dataset.regra;
        delete b.dataset.regraNota;
        b.style.removeProperty("--pronto");
      }
    }
  }, [pronto, prefs.prontos, sistema, lei]);

  // Marcações do usuário
  const rotuloDaCor = useCallback(
    (cor: string) => (cor === "nota" ? "Anotação" : (todosSistemas(legendas).flatMap((s) => s.cores).find((c) => c.cor === cor)?.rotulo ?? "")),
    [legendas],
  );
  const exibidas = useMemo<Marcacao[]>(
    () => (vendoRecebido && recebido ? recebido.m.map((m, k) => ({ ...m, id: `r${k}`, em: 0 })) : marcas),
    [vendoRecebido, recebido, marcas],
  );
  useEffect(() => {
    const el = folha.current;
    if (!el || !pronto) return;
    desmarcar(el);
    const bs = blocosDe(el);
    const textos = bs.map((b) => txtDe(b)?.textContent ?? "");
    const disps = bs.map((b) => b.dataset.disp);
    let faltaram = 0;
    for (const m of exibidas) {
      const onde = localizar(m, textos, disps);
      const txt = onde ? txtDe(bs[onde.i]) : null;
      if (!onde || !txt) faltaram++;
      else envolver(txt, onde.ini, onde.fim, m, rotuloDaCor(m.cor), m.id === novaMarca.current);
    }
    novaMarca.current = null;
    setPerdidas(faltaram);
  }, [exibidas, rotuloDaCor, pronto]);
  const salvarMarcas = (ms: Marcacao[]) => {
    setMarcas(ms);
    gravarMarcacoes(lei, ms);
  };
  const criarMarca = useCallback(
    (s: { i: number; ini: number; fim: number }, cor: string) => {
      const bloco = folha.current?.querySelector<HTMLElement>(`[data-i="${s.i}"]`);
      if (!bloco) return null;
      const m = novaMarcacao(txtDe(bloco)?.textContent ?? "", s.ini, s.fim, s.i, bloco.dataset.disp, cor);
      novaMarca.current = m.id;
      setMarcas((ms) => {
        const n = [...ms, m];
        gravarMarcacoes(lei, n);
        return n;
      });
      getSelection()?.removeAllRanges();
      return m;
    },
    [lei],
  );

  // Seleção: no modo marca-texto grifa na hora; fora dele, mostra as cores
  const marcadorRef = useRef({ ativo: false, cor: "" });
  useEffect(() => {
    marcadorRef.current = { ativo: marcador.ativo, cor: corMarcador ?? "" };
  }, [marcador.ativo, corMarcador]);
  useEffect(() => {
    const el = folha.current;
    if (!el) return;
    const soltar = () => {
      const sel = getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) return setSelecao(null);
      const r = sel.getRangeAt(0);
      const txtIni = r.startContainer.parentElement?.closest<HTMLElement>(`.${CLASSES.txt}`);
      const txtFim = r.endContainer.parentElement?.closest<HTMLElement>(`.${CLASSES.txt}`);
      if (!txtIni || txtIni !== txtFim || !el.contains(txtIni)) return setSelecao(null);
      const bloco = txtIni.closest<HTMLElement>("[data-i]")!;
      const antes = document.createRange();
      antes.setStart(txtIni, 0);
      antes.setEnd(r.startContainer, r.startOffset);
      const ini = antes.toString().length;
      const fim = ini + r.toString().length;
      if (fim - ini < 2) return setSelecao(null);
      const s = { i: Number(bloco.dataset.i), ini, fim };
      const { ativo, cor } = marcadorRef.current;
      if (ativo && cor && cor !== "borracha") {
        criarMarca(s, cor);
        return setSelecao(null);
      }
      const ret = r.getBoundingClientRect();
      const base = el.offsetParent?.getBoundingClientRect();
      const toque = matchMedia("(pointer: coarse)").matches;
      setSelecao({
        x: ret.left + ret.width / 2 - (base?.left ?? 0),
        y: ret.top - (base?.top ?? 0),
        fundo: ret.bottom - (base?.top ?? 0),
        acima: !toque || ret.top > 170,
        toque,
        ...s,
      });
    };
    // A seleção por toque muda enquanto as alças são arrastadas (e o toque nem sempre dispara mouseup/touchend
    // no fim): por isso ela é lida quando para de mudar, e não em um evento de soltar.
    let tocando = false;
    let adiar: ReturnType<typeof setTimeout> | undefined;
    const agendar = (ms: number) => {
      clearTimeout(adiar);
      adiar = setTimeout(() => {
        if (!tocando) soltar();
      }, ms);
    };
    const aoMudar = () => agendar(tocando ? 500 : 200);
    const inicioToque = () => {
      tocando = true;
    };
    const fimToque = () => {
      tocando = false;
      agendar(350);
    };
    const soltarMouse = () => agendar(0);
    document.addEventListener("selectionchange", aoMudar);
    el.addEventListener("touchstart", inicioToque, { passive: true });
    el.addEventListener("touchend", fimToque);
    el.addEventListener("touchcancel", fimToque);
    el.addEventListener("mouseup", soltarMouse);
    return () => {
      clearTimeout(adiar);
      document.removeEventListener("selectionchange", aoMudar);
      el.removeEventListener("touchstart", inicioToque);
      el.removeEventListener("touchend", fimToque);
      el.removeEventListener("touchcancel", fimToque);
      el.removeEventListener("mouseup", soltarMouse);
    };
  }, [criarMarca]);

  // Toque no texto: abre o grifo, apaga (borracha) ou mostra/esconde os controles
  useEffect(() => {
    const el = folha.current;
    if (!el) return;
    const clique = (e: MouseEvent) => {
      const alvo = e.target as HTMLElement;
      if (getSelection()?.toString()) return;
      setRegra(null);
      const bloco = alvo.closest<HTMLElement>("[data-regra]");
      if (bloco && alvo === bloco && !marcadorRef.current.ativo) {
        const ret = bloco.getBoundingClientRect();
        setRegra({ x: ret.left, y: ret.bottom, rotulo: bloco.dataset.regra!, nota: bloco.dataset.regraNota, destaque: bloco.dataset.pronto === "destaque" });
        return;
      }
      const mark = alvo.closest<HTMLElement>("mark[data-m]");
      if (mark) {
        if (marcadorRef.current.ativo && marcadorRef.current.cor === "borracha") {
          setMarcas((ms) => {
            const n = ms.filter((m) => m.id !== mark.dataset.m);
            gravarMarcacoes(lei, n);
            return n;
          });
          return;
        }
        const ret = mark.getBoundingClientRect();
        const base = el.offsetParent?.getBoundingClientRect();
        setAberta({ id: mark.dataset.m!, x: ret.left + ret.width / 2 - (base?.left ?? 0), y: ret.bottom - (base?.top ?? 0) });
        return;
      }
      if (alvo.closest("a, button")) return;
      setOculto((o) => !o);
    };
    el.addEventListener("click", clique);
    return () => el.removeEventListener("click", clique);
  }, [lei]);
  const marcaAberta = marcas.find((m) => m.id === aberta?.id);

  // ---------- rolagem: esconde os controles, acompanha o artigo atual e guarda a posição ----------
  const artigosRef = useRef<ArtigoTexto[]>([]);
  useEffect(() => {
    artigosRef.current = artigos;
  }, [artigos]);
  const artigoNaTela = useCallback(() => {
    const lista = artigosRef.current;
    let lo = 0;
    let hi = lista.length - 1;
    let achado = 0;
    while (lo <= hi) {
      const meio = (lo + hi) >> 1;
      const el = document.getElementById(lista[meio][0]);
      if (!el) {
        hi = meio - 1;
        continue;
      }
      if (el.getBoundingClientRect().top <= 140) {
        achado = meio;
        lo = meio + 1;
      } else hi = meio - 1;
    }
    return achado;
  }, []);
  useEffect(() => {
    let ultimoY = window.scrollY;
    let quadro = 0;
    let medir: ReturnType<typeof setTimeout> | null = null;
    let salvar: ReturnType<typeof setTimeout> | null = null;
    let esconder: ReturnType<typeof setTimeout> | null = null;
    // Achar o artigo da tela força o navegador a calcular o layout: no máximo a cada 150 ms, nunca a cada quadro.
    const acompanhar = () => {
      medir = null;
      if (!artigosRef.current.length) return;
      const k = artigoNaTela();
      setAtual(k);
      if (salvar) clearTimeout(salvar);
      salvar = setTimeout(() => {
        const a = artigosRef.current[k];
        if (!a) return;
        const todas = lerJSON<Posicoes>(K_POSICOES, {});
        todas[lei] = { art: a[0], rotulo: a[1], em: Date.now() };
        gravarJSON(K_POSICOES, todas);
      }, 800);
    };
    const rolar = () => {
      setSecaoVisivel(true);
      setNomeVisivel(!!folha.current && folha.current.getBoundingClientRect().top < 80);
      if (esconder) clearTimeout(esconder);
      esconder = setTimeout(() => setSecaoVisivel(false), 2500);
      cancelAnimationFrame(quadro);
      quadro = requestAnimationFrame(() => {
        const y = window.scrollY;
        if (Date.now() < barraFixa.current) {
          setOculto(false);
          ultimoY = y;
        } else if (Math.abs(y - ultimoY) > 6) {
          setOculto(y > ultimoY && y > 240);
          ultimoY = y;
        }
      });
      medir ??= setTimeout(acompanhar, 150);
    };
    window.addEventListener("scroll", rolar, { passive: true });
    return () => {
      window.removeEventListener("scroll", rolar);
      cancelAnimationFrame(quadro);
      if (medir) clearTimeout(medir);
      if (salvar) clearTimeout(salvar);
      if (esconder) clearTimeout(esconder);
    };
  }, [lei, artigoNaTela]);
  // no computador, levar o mouse para perto da barra a traz de volta
  useEffect(() => {
    const mover = (e: PointerEvent) => e.pointerType === "mouse" && e.clientY > window.innerHeight - 130 && setOculto(false);
    window.addEventListener("pointermove", mover, { passive: true });
    return () => window.removeEventListener("pointermove", mover);
  }, []);
  // o cabeçalho do site some junto com os controles
  const escondido = oculto && !painel && !selecao && !aberta && !regra;
  useEffect(() => {
    if (!regra) return;
    const fechar = () => setRegra(null);
    window.addEventListener("scroll", fechar, { passive: true, once: true });
    return () => window.removeEventListener("scroll", fechar);
  }, [regra]);
  useEffect(() => {
    document.body.toggleAttribute("data-leitor-oculto", escondido);
    return () => document.body.removeAttribute("data-leitor-oculto");
  }, [escondido]);

  // ---------- linha do tempo ----------
  useEffect(() => {
    const el = folha.current;
    if (!el || !pronto) return;
    if (!data) {
      delete el.dataset.tempo;
      setTempo(null); // eslint-disable-line react-hooks/set-state-in-effect -- volta ao texto atual
      return;
    }
    let vivo = true;
    setTempo({ carregando: true, aprox: 0 });
    carregarDatas()
      .then((datas) => {
        if (!vivo || !blocos.current) return;
        const visiveis = textoEm(blocos.current, data, datas);
        const porIndice = new Map(visiveis.map((v) => [v.i, v.aproximado]));
        for (const b of blocosDe(el)) {
          const i = Number(b.dataset.i);
          b.dataset.vis = porIndice.has(i) ? "1" : "0";
          b.dataset.aprox = porIndice.get(i) ? "1" : "0";
        }
        el.dataset.tempo = "1";
        setTempo({ carregando: false, aprox: visiveis.filter((v) => v.aproximado).length });
      })
      .catch(() => vivo && setTempo({ carregando: false, aprox: 0, erro: "Não foi possível carregar o histórico desta lei." }));
    return () => {
      vivo = false;
    };
  }, [data, pronto]);

  // ---------- compartilhar ----------
  const gerarLink = async (comMarcas: boolean) => {
    const base = `${location.origin}/leis/${lei}/`;
    if (!comMarcas) return setCompartilhar({ comMarcas, link: base });
    const carga: Compartilhado = {
      lei,
      m: marcas.map(({ i, disp, exato, prefixo, sufixo, cor, nota }) => ({ i, disp, exato, prefixo, sufixo, cor, ...(nota ? { nota } : {}) })),
      s: sistema,
    };
    setCompartilhar({ comMarcas, link: `${base}#c=${await codificar(carga)}`, carga });
  };
  const baixarArquivo = () => {
    if (!compartilhar?.carga) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(compartilhar.carga)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${lei}.grifo.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const abrirArquivo = async (arquivo: File) => {
    setErroArquivo(null);
    let c: unknown;
    try {
      c = JSON.parse(await arquivo.text());
    } catch {
      return setErroArquivo("Esse arquivo não é um grifo do Grifo.");
    }
    if (!pareceCompartilhado(c)) return setErroArquivo("Esse arquivo não é um grifo do Grifo.");
    if (c.lei !== lei) return setErroArquivo(`Esse arquivo é de outra lei (${c.lei}).`);
    setRecebido(c);
    setVendoRecebido(false);
  };
  const mudarLegendas = (n: typeof legendas) => {
    setLegendas(n);
    gravarLegendas(n);
  };
  const descartarRecebido = () => {
    setRecebido(null);
    setVendoRecebido(false);
    history.replaceState(null, "", location.pathname);
  };
  const importarRecebido = () => {
    if (!recebido) return;
    const ja = new Set(marcas.map((m) => `${m.i}|${m.exato}`));
    const novas = recebido.m.filter((m) => !ja.has(`${m.i}|${m.exato}`)).map((m, k) => ({ ...m, id: `${Date.now().toString(36)}${k}`, em: Date.now() }));
    salvarMarcas([...marcas, ...novas]);
    if (recebido.s && !todosSistemas(legendas).some((s) => s.id === recebido.s!.id)) mudarLegendas({ ...legendas, meus: [...legendas.meus, recebido.s] });
    descartarRecebido();
  };

  const abrir = (p: Painel) => {
    setPainel((a) => (a === p ? null : p));
    setSelecao(null);
  };
  const fecharPainel = useCallback(() => setPainel(null), []);
  useEffect(() => {
    const sincronizar = () => setTelaCheia(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", sincronizar);
    return () => document.removeEventListener("fullscreenchange", sincronizar);
  }, []);
  const semTelaCheia = () =>
    setAviso({ texto: "Este navegador não abre a página em tela cheia. Para ler sem as barras, adicione o Grifo à tela inicial do aparelho." });
  const entrarTelaCheia = () => {
    if (document.fullscreenElement) return setAviso({ texto: "Já está em tela cheia." });
    if (!document.fullscreenEnabled) return semTelaCheia();
    document.documentElement.requestFullscreen().catch(semTelaCheia);
  };
  const sairTelaCheia = () => {
    if (!document.fullscreenElement) return setAviso({ texto: "Já está fora da tela cheia." });
    document.exitFullscreen().catch(() => {});
  };
  const alternarTelaCheia = () => (document.fullscreenElement ? sairTelaCheia() : entrarTelaCheia());
  // Durante o arrasto do slide, salta sem o realce; o realce fica para o artigo onde o dedo soltou.
  const irPorIndice = useCallback(
    (k: number, marcar = true) => {
      const a = artigosRef.current[k];
      if (!a) return;
      if (marcar) {
        irParaArtigo(a[0]);
        setAtual(k);
      } else document.getElementById(a[0])?.scrollIntoView({ block: "start", behavior: "instant" });
    },
    [irParaArtigo],
  );
  const voltarDoSlide = useCallback(
    (de: number, para: number) => {
      const a = artigosRef.current[de];
      if (!a || Math.abs(para - de) < 3) return;
      setAviso({ texto: `Você estava no ${a[1]}.`, acao: { rotulo: "Voltar", fazer: () => irPorIndice(de) } });
    },
    [irPorIndice],
  );
  const faixasTrilho = useMemo<FaixaTrilho[]>(() => {
    if (!prefs.prontos) return [];
    const regraDe = grifoDe(PRONTOS, sistema.id, lei);
    const faixas: FaixaTrilho[] = [];
    artigos.forEach(([id], k) => {
      const g = regraDe(id);
      const cor = g && sistema.cores.find((c) => c.rotulo === g.regra.rotulo)?.cor;
      if (!g || !cor) return;
      const rotulo = g.regra.rotulo;
      const ult = faixas.at(-1);
      if (ult && ult.cor === cor && ult.rotulo === rotulo && ult.ate === k - 1) ult.ate = k;
      else faixas.push({ de: k, ate: k, cor, rotulo });
    });
    return faixas;
  }, [artigos, prefs.prontos, sistema, lei]);
  const pontosTrilho = useMemo<PontoTrilho[]>(() => {
    const ind = new Map(artigos.map((a, k) => [a[0], k]));
    const pontos = new Map<string, PontoTrilho>();
    for (const m of exibidas) {
      const k = m.disp ? ind.get(m.disp.split(".")[0]) : undefined;
      if (k !== undefined && !pontos.has(`m${k}`)) pontos.set(`m${k}`, { k, cor: m.cor === "nota" ? "" : m.cor, tipo: "marca" });
    }
    for (const e of estrelas) {
      const k = e.startsWith(`${lei}:`) ? ind.get(e.slice(lei.length + 1)) : undefined;
      if (k !== undefined) pontos.set(`e${k}`, { k, cor: "#d4a017", tipo: "estrela" });
    }
    const ocupados = new Set([...pontos.values()].map((p) => p.k));
    for (const f of faixasTrilho) if (!ocupados.has(f.de)) pontos.set(`p${f.de}`, { k: f.de, cor: f.cor, tipo: "pronto" });
    return [...pontos.values()].sort((a, b) => a.k - b.k);
  }, [artigos, exibidas, estrelas, faixasTrilho, lei]);

  const detalhesTrilho = useMemo(() => {
    const porK = new Map<number, Detalhe[]>();
    const adicionar = (k: number, d: Detalhe) => porK.set(k, [...(porK.get(k) ?? []), d]);
    const ind = new Map(artigos.map((a, k) => [a[0], k]));
    for (const m of exibidas) {
      const k = m.disp ? ind.get(m.disp.split(".")[0]) : undefined;
      if (k === undefined) continue;
      const texto = `${rotuloDaCor(m.cor) || "Grifo"}: “${resumo(m.exato)}”${m.nota ? ` — ${resumo(m.nota, 60)}` : ""}`;
      adicionar(k, { cor: m.cor === "nota" ? "" : m.cor, texto });
    }
    for (const e of estrelas) {
      const k = e.startsWith(`${lei}:`) ? ind.get(e.slice(lei.length + 1)) : undefined;
      if (k !== undefined) adicionar(k, { cor: "#d4a017", texto: "Artigo marcado como importante" });
    }
    for (const f of faixasTrilho) adicionar(f.de, { cor: f.cor, texto: `Grifo pronto: ${f.rotulo}` });
    return porK;
  }, [artigos, exibidas, estrelas, faixasTrilho, lei, rotuloDaCor]);

  const porArtigo = useMemo(() => new Map(errados.map((a) => [`art${a.artigo}`, a])), [errados]);
  useEffect(() => {
    const el = folha.current;
    if (!el || !pronto) return;
    for (const b of blocosDe(el)) {
      const a = b.dataset.disp && b.dataset.sup === "0" ? porArtigo.get(b.dataset.disp) : undefined;
      if (!a) {
        delete b.dataset.erro;
        delete b.dataset.pontos;
        continue;
      }
      b.dataset.erro = a.nivel ?? "";
      b.dataset.pontos = "●".repeat(Math.min(a.erros, 5)) + (a.erros > 5 ? "+" : "");
    }
  }, [porArtigo, pronto]);

  return (
    <div
      className={styles.leitor}
      data-leitor
      data-fonte={prefs.fonte}
      data-fundo={prefs.fundo}
      data-revogados={prefs.revogados ? "1" : "0"}
      data-anotacoes={prefs.anotacoes ? "1" : "0"}
      data-erros={prefs.erros ? "1" : "0"}
      data-marcador={marcador.ativo ? "1" : "0"}
      style={{ "--leitor-tamanho": `${prefs.tamanho}px`, "--leitor-entrelinha": prefs.entrelinha } as CSSProperties}
    >
      {recebido && (
        <div className={styles.aviso} role="status">
          Este link traz {recebido.m.length} grifo(s){recebido.s ? ` no sistema “${recebido.s.nome}”` : ""}.
          <button type="button" className="btn btn-sm" onClick={() => setVendoRecebido((v) => !v)}>
            {vendoRecebido ? "Ver os meus" : "Ver os do link"}
          </button>
          <button type="button" className="btn btn-sm btn-gold" onClick={importarRecebido}>
            Importar para meu Grifo
          </button>
          <button type="button" className={styles.link} onClick={descartarRecebido}>
            descartar
          </button>
        </div>
      )}
      {data && tempo && (
        <div className={`${styles.aviso} ${styles.avisoTempo}`} role="status">
          <span>
            {tempo.carregando
              ? "Montando o texto da data…"
              : (tempo.erro ?? `Texto vigente em ${data.split("-").reverse().join("/")}${tempo.aprox ? ` · ${tempo.aprox} trecho(s) com data aproximada (≈)` : ""}.`)}
          </span>
          <button type="button" className={styles.link} onClick={() => setData("")}>
            voltar ao texto atual
          </button>
        </div>
      )}
      {perdidas > 0 && <p className={styles.aviso}>{perdidas} grifo(s) não foram reencontrados no texto atual (a lei pode ter mudado).</p>}

      {nomeVisivel && <p className={`${styles.nomeLei} ${secaoVisivel ? styles.nomeLeiVisivel : ""}`}>{nome}</p>}

      {mapa.secoes[atual] && (
        <button
          type="button"
          className={`${styles.secaoAtual} ${secaoVisivel ? styles.secaoAtualVisivel : ""}`}
          onClick={() => abrir("divisoes")}
          tabIndex={secaoVisivel ? 0 : -1}
          aria-label={`Ver as divisões da lei. Agora: ${mapa.secoes[atual]}`}
        >
          {mapa.secoes[atual]}
        </button>
      )}

      <div className={styles.corpo}>
        <div ref={folha} className={styles.folha} data-lei={lei} dangerouslySetInnerHTML={html} />
        {!pronto && <p className={styles.carregandoResto}>Carregando o restante da lei…</p>}
      </div>

      {artigos.length > 1 && (
        <Trilho
          artigos={artigos}
          atual={atual}
          oculto={escondido}
          aoIr={irPorIndice}
          aoSoltar={voltarDoSlide}
          pontos={pontosTrilho}
          faixas={faixasTrilho}
          secoes={mapa.secoes}
          marcos={mapa.marcos}
          detalhes={detalhesTrilho}
        />
      )}

      {/* Barra de controles: sempre ao alcance, some ao rolar para baixo e volta ao tocar no texto */}
      <nav className={`${styles.dock} ${escondido ? styles.dockOculto : ""}`} aria-label="Controles de leitura">
        {marcador.ativo && (
          <div className={styles.paleta} role="radiogroup" aria-label="Cor do marca-texto">
            {sistema.cores.map((c) => (
              <button
                key={c.cor + c.rotulo}
                type="button"
                role="radio"
                aria-checked={corMarcador === c.cor}
                aria-label={c.rotulo}
                title={c.rotulo}
                style={{ "--c": c.cor } as CSSProperties}
                onClick={() => setMarcador({ ativo: true, cor: c.cor })}
              />
            ))}
            <button
              type="button"
              role="radio"
              aria-checked={corMarcador === "borracha"}
              aria-label="Borracha: toque num grifo para apagar"
              title="Borracha"
              className={styles.borracha}
              onClick={() => setMarcador({ ativo: true, cor: "borracha" })}
            >
              ⌫
            </button>
          </div>
        )}
        <div className={styles.botoes}>
          <BotaoDock
            icone="☰"
            rotulo="Leis"
            ativo={painel === "leis"}
            onClick={() => abrir("leis")}
            aoDeslizar={(sentido) => {
              const h = lerJSON<Historico>(K_HISTORICO, HISTORICO_VAZIO);
              const destino = h.pilha[h.pos + (sentido === "direita" ? -1 : 1)];
              if (!destino) return setAviso({ texto: sentido === "direita" ? "Nenhuma lei lida antes desta." : "Nenhuma lei lida depois desta." });
              router.push(`/leis/${destino}/`);
            }}
            aoSegurar={() => {
              saltoFixo();
              window.scrollTo({ top: 0, behavior: "instant" });
              setAviso({ texto: "Início da lei." });
            }}
          />
          <BotaoDock
            icone="⌕"
            rotulo="Buscar"
            ativo={painel === "buscar"}
            onClick={() => abrir("buscar")}
            aoDeslizar={(sentido) => {
              const k = atual + (sentido === "direita" ? -1 : 1);
              const a = artigos[k];
              if (!a) return setAviso({ texto: sentido === "direita" ? "Este é o primeiro artigo." : "Este é o último artigo." });
              antesDoSalto.current = window.scrollY;
              saltoFixo();
              irPorIndice(k);
              setAviso({ texto: a[1] });
            }}
            aoSegurar={() => {
              const y = antesDoSalto.current;
              if (y === null) return setAviso({ texto: "Nenhum salto de artigo para desfazer." });
              antesDoSalto.current = null;
              saltoFixo();
              window.scrollTo({ top: y, behavior: "instant" });
              setAviso({ texto: "Voltou ao ponto anterior." });
            }}
          />
          <BotaoDock
            icone="🖍"
            rotulo={marcador.ativo ? "Grifando" : "Grifar"}
            ativo={marcador.ativo}
            destaque
            onClick={() => {
              setMarcador((m) => ({ ativo: !m.ativo, cor: m.cor === "borracha" ? "" : m.cor }));
              setPainel(null);
            }}
            aoDeslizar={(sentido) => {
              const cores = sistema.cores;
              const passo = sentido === "direita" ? 1 : -1;
              const k = cores.findIndex((c) => c.cor === corMarcador);
              const n = cores.length;
              const j = k < 0 ? (passo > 0 ? 0 : n - 1) : (k + passo + n) % n;
              const nova = cores[j];
              if (!nova) return;
              setMarcador({ ativo: true, cor: nova.cor });
              setAviso({ texto: `Grifo: ${nova.rotulo || "cor " + (j + 1)}` });
            }}
            aoSegurar={() => {
              setMarcador({ ativo: true, cor: "borracha" });
              setPainel(null);
              setAviso({ texto: "Borracha: toque num grifo para apagar." });
            }}
          />
          <BotaoDock
            icone="Aa"
            rotulo="Leitura"
            ativo={painel === "aa"}
            onClick={() => abrir("aa")}
            aoDeslizar={(_sentido, dx) => {
              const tamanho = tamanhoComPasso(prefs.tamanho, dx);
              if (tamanho === prefs.tamanho) return;
              mudarPrefs({ tamanho });
              setAviso({ texto: `Texto: ${tamanho}px` });
            }}
            previa={(dx) => {
              if (Math.abs(dx) < 12) return null;
              const tamanho = tamanhoComPasso(prefs.tamanho, dx);
              return { texto: "Aa", tamanho, rotulo: `${tamanho}px` };
            }}
            aoSegurar={() => {
              mudarPrefs({ tamanho: PREFS_PADRAO.tamanho });
              setAviso({ texto: `Texto: ${PREFS_PADRAO.tamanho}px (padrão)` });
            }}
          />
          <BotaoDock
            icone="⛶"
            rotulo="Tela cheia"
            ativo={telaCheia}
            onClick={alternarTelaCheia}
            aoDeslizar={(sentido) => (sentido === "direita" ? entrarTelaCheia() : sairTelaCheia())}
            aoSegurar={() => {
              const p = lerJSON<Posicoes>(K_POSICOES, {})[lei];
              if (!p) return setAviso({ texto: "Ainda não há posição salva nesta lei." });
              saltoFixo();
              if (!irParaArtigo(p.art, true)) return setAviso({ texto: "Não encontrei onde você parou." });
              setAviso({ texto: `Você parou no ${p.rotulo}.` });
            }}
          />
          <BotaoDock
            icone="⋯"
            rotulo="Mais"
            ativo={painel === "mais" || painel === "grifos"}
            onClick={() => abrir("mais")}
            aoDeslizar={(sentido) => {
              const k = FUNDOS.findIndex((f) => f.id === prefs.fundo);
              const nova = FUNDOS[(k + (sentido === "direita" ? 1 : -1) + FUNDOS.length) % FUNDOS.length];
              mudarPrefs({ fundo: nova.id });
              setAviso({ texto: `Fundo: ${nova.nome}` });
            }}
            aoSegurar={() => {
              setPainel("grifos");
              setSelecao(null);
            }}
          />
        </div>
      </nav>

      {painel && (
        <Folha titulo={{ leis: "Leis", buscar: "Buscar", grifos: "Grifos", aa: "Leitura", mais: "Mais", divisoes: "Divisões da lei" }[painel]} onFechar={fecharPainel}>
          {painel === "leis" && <PainelLeis atual={lei} posicoes={posicoes} />}
          {painel === "buscar" && (
            <PainelBusca
              lei={lei}
              artigos={artigos}
              aoIr={(art) => {
                setPainel(null);
                setTimeout(() => irParaArtigo(art), 50);
              }}
            />
          )}
          {painel === "divisoes" && (
            <ol className={styles.divisoes}>
              {mapa.divisoes.map((d, n) => (
                <li key={n} data-nivel={d.nivel}>
                  <button
                    type="button"
                    onClick={() => {
                      setPainel(null);
                      setTimeout(() => irParaArtigo(artigos[d.k][0], true), 50);
                    }}
                  >
                    <span>{d.rotulo}</span>
                    <em>{artigos[d.k]?.[1]}</em>
                  </button>
                </li>
              ))}
            </ol>
          )}
          {painel === "aa" && (
            <div className={styles.grupos}>
              <fieldset>
                <legend>Letra</legend>
                <div className={styles.chips}>
                  {(
                    [
                      ["sans", "Sem serifa"],
                      ["serif", "Serifada"],
                      ["mono", "Monoespaçada"],
                    ] as const
                  ).map(([id, n]) => (
                    <button key={id} type="button" aria-pressed={prefs.fonte === id} data-fonte-amostra={id} onClick={() => mudarPrefs({ fonte: id })}>
                      {n}
                    </button>
                  ))}
                </div>
                <label>
                  Tamanho · {prefs.tamanho}px
                  <input type="range" min={14} max={28} value={prefs.tamanho} onChange={(e) => mudarPrefs({ tamanho: Number(e.target.value) })} />
                </label>
                <label>
                  Entrelinha · {prefs.entrelinha.toFixed(1)}
                  <input type="range" min={1.3} max={2.4} step={0.1} value={prefs.entrelinha} onChange={(e) => mudarPrefs({ entrelinha: Number(e.target.value) })} />
                </label>
              </fieldset>
              <fieldset>
                <legend>Fundo</legend>
                <div className={styles.chips}>
                  {FUNDOS.map((f) => (
                    <button key={f.id} type="button" data-fundo-amostra={f.id} aria-pressed={prefs.fundo === f.id} onClick={() => mudarPrefs({ fundo: f.id })}>
                      {f.nome}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend>Exibir</legend>
                <label className={styles.opcao}>
                  <input type="checkbox" checked={prefs.prontos} onChange={(e) => mudarPrefs({ prontos: e.target.checked })} /> Grifos prontos do Grifo
                </label>
                <label className={styles.opcao}>
                  <input type="checkbox" checked={prefs.erros} onChange={(e) => mudarPrefs({ erros: e.target.checked })} /> Marcar os artigos em que mais errei
                </label>
                <p className={styles.miuda}>Cada ● ao lado do artigo é um erro (até 5). Vermelho: nível alto; âmbar: médio; cinza: baixo.</p>
                <label className={styles.opcao}>
                  <input type="checkbox" checked={prefs.revogados} onChange={(e) => mudarPrefs({ revogados: e.target.checked })} /> Texto revogado e redações anteriores
                </label>
                <label className={styles.opcao}>
                  <input type="checkbox" checked={prefs.anotacoes} onChange={(e) => mudarPrefs({ anotacoes: e.target.checked })} /> Anotações do Planalto (“Redação dada pela…”)
                </label>
                <label className={styles.opcao}>
                  <input type="checkbox" checked={prefs.destino === "planalto"} onChange={(e) => mudarPrefs({ destino: e.target.checked ? "planalto" : "grifo" })} /> Abrir referências no texto do Planalto
                </label>
              </fieldset>
            </div>
          )}
          {painel === "grifos" && (
            <PainelGrifos
              legendas={legendas}
              sistema={sistema}
              marcas={marcas}
              rotuloDaCor={rotuloDaCor}
              prontos={prefs.prontos}
              mudarProntos={(v) => mudarPrefs({ prontos: v })}
              mudarLegendas={mudarLegendas}
              editar={setEditandoSistema}
              aoIr={(m) => {
                setPainel(null);
                setTimeout(() => document.querySelector(`mark[data-m="${m.id}"]`)?.scrollIntoView({ block: "center", behavior: "instant" }), 50);
              }}
              remover={(m) => salvarMarcas(marcas.filter((x) => x.id !== m.id))}
            />
          )}
          {painel === "mais" && (
            <div className={styles.grupos}>
              <fieldset>
                <legend>Artigos em que mais errei</legend>
                {errados.length ? (
                  <ol className={styles.errados}>
                    {errados.slice(0, 12).map((a) => {
                      const id = `art${a.artigo}`;
                      const rotulo = artigos.find((x) => x[0] === id)?.[1] ?? `Art. ${a.artigo.replace("-", "-")}`;
                      return (
                        <li key={id} data-nivel={a.nivel}>
                          <button
                            type="button"
                            onClick={() => {
                              setPainel(null);
                              setTimeout(() => irParaArtigo(id, true), 50);
                            }}
                          >
                            <strong>{rotulo}</strong>
                            <span>
                              {a.erros} {a.erros === 1 ? "erro" : "erros"} em {a.erros + a.acertos} {a.erros + a.acertos === 1 ? "tentativa" : "tentativas"}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <p className={styles.miuda}>Nenhum erro registrado nesta lei. Os erros do quiz, dos simulados e das objetivas aparecem aqui.</p>
                )}
                <div className={styles.chips}>
                  <Link href="/leis/minha-leitura/">Minha leitura (todas as leis)</Link>
                </div>
              </fieldset>
              <fieldset>
                <legend>Grifos e cores</legend>
                <button type="button" className="btn btn-sm btn-gold" onClick={() => setPainel("grifos")}>
                  Meus grifos e sistemas de cores
                </button>
              </fieldset>
              <fieldset>
                <legend>Linha do tempo</legend>
                <label>
                  Ver a lei como estava em
                  <input type="date" value={data} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setData(e.target.value)} />
                </label>
                <p className={styles.miuda}>
                  Por exemplo, a data do fato. Reconstruído das anotações do compilado do Planalto: redações intermediárias omitidas, suspensões do STF e vetos
                  derrubados não aparecem.
                </p>
              </fieldset>
              <fieldset>
                <legend>Levar a lei</legend>
                <div className={styles.chips}>
                  <button type="button" onClick={() => gerarLink(false)}>
                    Compartilhar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPainel(null);
                      setTimeout(() => window.print(), 100);
                    }}
                  >
                    Imprimir / PDF
                  </button>
                  <label className="btn btn-sm">
                    Abrir arquivo .grifo.json
                    <input
                      type="file"
                      accept=".json,application/json"
                      hidden
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (f) abrirArquivo(f);
                      }}
                    />
                  </label>
                  <Link href="/vademecum/">Vade-mécum</Link>
                  <Link href="/leis/minha-leitura/">Minha leitura</Link>
                </div>
                {erroArquivo && (
                  <p className={styles.miuda} role="alert">
                    {erroArquivo}
                  </p>
                )}
              </fieldset>
            </div>
          )}
        </Folha>
      )}

      {selecao && !marcador.ativo && (
        <div
          className={styles.flutuante}
          style={{ left: selecao.x, top: selecao.acima ? selecao.y - (selecao.toque ? 108 : 58) : selecao.fundo + 64 }}
          role="toolbar"
          aria-label="Grifar trecho"
        >
          {sistema.cores.map((c) => (
            <button
              key={c.cor + c.rotulo}
              type="button"
              style={{ "--c": c.cor } as CSSProperties}
              title={c.rotulo}
              aria-label={`Grifar como ${c.rotulo || c.cor}`}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => {
                criarMarca(selecao, c.cor);
                setSelecao(null);
              }}
            />
          ))}
          <button
            type="button"
            className={styles.nota}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              const m = criarMarca(selecao, "nota");
              if (m) setAberta({ id: m.id, x: selecao.x, y: selecao.y });
              setSelecao(null);
            }}
            aria-label="Anotar sem cor"
          >
            ✎
          </button>
        </div>
      )}

      {regra && (
        <div
          className={styles.regra}
          style={{ left: Math.max(8, Math.min(regra.x + 12, window.innerWidth - 336)), top: Math.min(regra.y + 6, window.innerHeight - 170) }}
          role="dialog"
          aria-label={`Grifo pronto: ${regra.rotulo}`}
        >
          <strong>{regra.rotulo}</strong>
          {regra.nota && <span>{regra.nota}</span>}
          <small>
            {regra.destaque
              ? "Destaque: citado em pelo menos 5 questões de Penal."
              : "Tema de prova. O grifo mais forte marca o que mais cai."}
          </small>
        </div>
      )}

      {aberta && marcaAberta && (
        <div className={styles.popover} style={{ left: aberta.x, top: aberta.y + 8 }} role="dialog" aria-label="Grifo">
          <p className={styles.citacao}>“{marcaAberta.exato}”</p>
          <div className={styles.cores}>
            {sistema.cores.map((c) => (
              <button
                key={c.cor + c.rotulo}
                type="button"
                style={{ "--c": c.cor } as CSSProperties}
                aria-pressed={marcaAberta.cor === c.cor}
                title={c.rotulo}
                aria-label={c.rotulo}
                onClick={() => salvarMarcas(marcas.map((m) => (m.id === marcaAberta.id ? { ...m, cor: c.cor } : m)))}
              />
            ))}
          </div>
          <textarea
            defaultValue={marcaAberta.nota ?? ""}
            placeholder="Anotação"
            rows={3}
            onBlur={(e) => salvarMarcas(marcas.map((m) => (m.id === marcaAberta.id ? { ...m, nota: e.target.value || undefined } : m)))}
          />
          <div className={styles.acoes}>
            <button type="button" className="btn btn-sm" onClick={() => setAberta(null)}>
              Fechar
            </button>
            <button
              type="button"
              className={styles.link}
              onClick={() => {
                salvarMarcas(marcas.filter((m) => m.id !== marcaAberta.id));
                setAberta(null);
              }}
            >
              apagar grifo
            </button>
          </div>
        </div>
      )}

      {compartilhar && (
        <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="compartilhar-titulo">
          <div className={styles.modalCaixa}>
            <h2 id="compartilhar-titulo">Compartilhar {nome}</h2>
            <label className={styles.opcao}>
              <input type="checkbox" checked={compartilhar.comMarcas} disabled={!marcas.length} onChange={(e) => gerarLink(e.target.checked)} /> Incluir meus{" "}
              {marcas.length} grifo(s) e anotações
            </label>
            <input readOnly value={compartilhar.link} onFocus={(e) => e.target.select()} aria-label="Link" />
            <p className="muted">
              {compartilhar.link.length > LIMITE_LINK
                ? `O link ficou com ${Math.round(compartilhar.link.length / 1024)} KB, grande demais para apps de mensagem. Baixe o arquivo e envie-o; quem receber usa "Abrir arquivo .grifo.json" na lei.`
                : "O conteúdo vai no próprio link (depois do #) e não passa por nenhum servidor. Quem abrir o link vê as anotações."}
            </p>
            <div className={styles.acoes}>
              <button type="button" className="btn btn-sm btn-gold" disabled={compartilhar.link.length > LIMITE_LINK} onClick={() => navigator.clipboard?.writeText(compartilhar.link)}>
                Copiar link
              </button>
              {compartilhar.carga && (
                <button type="button" className={compartilhar.link.length > LIMITE_LINK ? "btn btn-sm btn-gold" : "btn btn-sm"} onClick={baixarArquivo}>
                  Baixar .grifo.json
                </button>
              )}
              <button type="button" className="btn btn-sm" onClick={() => setCompartilhar(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {editandoSistema && (
        <EditorSistema
          sistema={editandoSistema}
          onCancelar={() => setEditandoSistema(null)}
          onSalvar={(s) => {
            const meus = legendas.meus.some((x) => x.id === s.id) ? legendas.meus.map((x) => (x.id === s.id ? s : x)) : [...legendas.meus, s];
            mudarLegendas({ ativo: s.id, meus });
            setEditandoSistema(null);
          }}
          onExcluir={() => {
            mudarLegendas({ ativo: "materias", meus: legendas.meus.filter((x) => x.id !== editandoSistema.id) });
            setEditandoSistema(null);
          }}
        />
      )}

      {aviso && (
        <div className={styles.toast} role="status">
          {aviso.texto}
          {aviso.acao && (
            <button
              type="button"
              className={styles.link}
              onClick={() => {
                aviso.acao!.fazer();
                setAviso(null);
              }}
            >
              {aviso.acao.rotulo}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

type Sentido = "direita" | "esquerda";
const DISTANCIA_SWIPE = 36;
const PASSO_TEXTO_PX = 36;
const TEMPO_SEGURAR = 500;

function tamanhoComPasso(atual: number, dx: number) {
  return Math.min(28, Math.max(14, atual + Math.trunc(dx / PASSO_TEXTO_PX)));
}

function BotaoDock({
  icone,
  rotulo,
  ativo,
  destaque,
  onClick,
  aoDeslizar,
  aoSegurar,
  previa,
}: {
  icone: string;
  rotulo: string;
  ativo: boolean;
  destaque?: boolean;
  onClick: () => void;
  aoDeslizar?: (sentido: Sentido, dx: number) => void;
  aoSegurar?: () => void;
  previa?: (dx: number) => { texto: string; tamanho: number; rotulo: string } | null;
}) {
  const inicio = useRef<{ x: number; y: number } | null>(null);
  const eixo = useRef<"x" | "y" | null>(null);
  const deslizou = useRef(false);
  const segurou = useRef(false);
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [arrasto, setArrasto] = useState<number | null>(null);
  const cancelarSegurar = () => {
    if (relogio.current) clearTimeout(relogio.current);
    relogio.current = null;
  };
  const pv = arrasto !== null && previa ? previa(arrasto) : null;
  return (
    <button
      type="button"
      className={`${styles.botaoDock} ${destaque ? styles.botaoGrifar : ""}`}
      aria-pressed={ativo}
      onPointerDown={(e) => {
        inicio.current = { x: e.clientX, y: e.clientY };
        eixo.current = null;
        deslizou.current = false;
        segurou.current = false;
        cancelarSegurar();
        if (aoSegurar)
          relogio.current = setTimeout(() => {
            relogio.current = null;
            segurou.current = true;
            inicio.current = null;
            setArrasto(null);
            aoSegurar();
          }, TEMPO_SEGURAR);
      }}
      onPointerMove={(e) => {
        const i = inicio.current;
        if (!i) return;
        const dx = e.clientX - i.x;
        const dy = e.clientY - i.y;
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) cancelarSegurar();
        if (!eixo.current && (Math.abs(dx) >= 12 || Math.abs(dy) >= 12)) eixo.current = Math.abs(dx) > Math.abs(dy) * 1.5 ? "x" : "y";
        if (previa && eixo.current === "x") setArrasto(dx);
      }}
      onPointerUp={(e) => {
        const i = inicio.current;
        inicio.current = null;
        cancelarSegurar();
        setArrasto(null);
        if (!i || !aoDeslizar || eixo.current !== "x") return;
        const dx = e.clientX - i.x;
        if (Math.abs(dx) < DISTANCIA_SWIPE) return;
        deslizou.current = true;
        aoDeslizar(dx > 0 ? "direita" : "esquerda", dx);
      }}
      onPointerCancel={() => {
        inicio.current = null;
        cancelarSegurar();
        setArrasto(null);
      }}
      onContextMenu={aoSegurar ? (e) => e.preventDefault() : undefined}
      onClick={() => {
        if (segurou.current) return void (segurou.current = false);
        if (deslizou.current) return void (deslizou.current = false);
        onClick();
      }}
    >
      <span aria-hidden className={styles.icone}>
        {icone}
      </span>
      <span>{rotulo}</span>
      {pv && (
        <span className={styles.previa} aria-hidden>
          <span className={styles.previaTexto} style={{ fontSize: `${pv.tamanho}px` }}>
            {pv.texto}
          </span>
          <span className={styles.previaRotulo}>{pv.rotulo}</span>
        </span>
      )}
    </button>
  );
}

function Folha({ titulo, onFechar, children }: { titulo: string; onFechar: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [onFechar]);
  return (
    <>
      <div className={styles.veu} onClick={onFechar} aria-hidden />
      <section className={styles.folhaPainel} role="dialog" aria-label={titulo}>
        <header className={styles.folhaTopo}>
          <h2>{titulo}</h2>
          <button type="button" className={styles.fechar} onClick={onFechar} aria-label="Fechar">
            ✕
          </button>
        </header>
        <div className={styles.folhaCorpo}>{children}</div>
      </section>
    </>
  );
}

interface PontoTrilho {
  k: number;
  /** "" = anotação sem cor */
  cor: string;
  tipo: "marca" | "estrela" | "pronto";
}
interface FaixaTrilho {
  de: number;
  ate: number;
  cor: string;
  rotulo: string;
}
interface Detalhe {
  cor: string;
  texto: string;
}
const NOMES_MODO: Record<Modo, string> = { rapido: "Rápido", fino: "Artigo a artigo", marcas: "Grifos" };
const ORDEM_MODOS: Modo[] = ["marcas", "fino", "rapido"];
const vibrar = () => {
  try {
    navigator.vibrate?.(6);
  } catch {}
};
const resumo = (t: string, n = 90) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);
const semRotulo = (texto: string) => texto.replace(/^(Art\.\s*\S+|Parágrafo único\.?)\s*[-–.:]?\s*/i, "");

/**
 * Slide lateral de artigos. O terço da tela onde está o dedo escolhe o modo: esquerda, só grifos;
 * meio, artigo a artigo; direita, o pino acompanha o dedo. No toque, só o pino arrasta: no resto da
 * faixa o dedo rola a página, e um toque curto leva ao ponto.
 */
function Trilho({
  artigos,
  atual,
  oculto,
  aoIr,
  aoSoltar,
  pontos,
  faixas,
  secoes,
  marcos,
  detalhes,
}: {
  artigos: ArtigoTexto[];
  atual: number;
  oculto: boolean;
  aoIr: (k: number, marcar?: boolean) => void;
  aoSoltar: (de: number, para: number) => void;
  pontos: PontoTrilho[];
  faixas: FaixaTrilho[];
  secoes: string[];
  marcos: { k: number; rotulo: string }[];
  detalhes: Map<number, Detalhe[]>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pino = useRef<HTMLSpanElement>(null);
  const [altura, setAltura] = useState(0);
  const [info, setInfo] = useState<{ k: number; y: number; modo: Modo; toque: boolean; emCima: boolean } | null>(null);
  const [ativo, setAtivo] = useState(false);
  const estado = useRef<{ y: number; k: number; mostrado: number; acc: number; modo: Modo; toque: boolean; inicio: number } | null>(null);
  const toqueNaFaixa = useRef<{ y: number; t: number } | null>(null);
  const quadro = useRef(0);
  const pendente = useRef(-1);
  const total = artigos.length;
  const ks = useMemo(() => [...new Set(pontos.map((p) => p.k))], [pontos]);
  const mostrar = ativo && info ? info.k : atual;
  const pct = (k: number) => `${(k / Math.max(1, total - 1)) * 100}%`;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setAltura(e.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => () => cancelAnimationFrame(quadro.current), []);

  // no máximo um salto de página por quadro
  const ir = (k: number) => {
    pendente.current = k;
    quadro.current ||= requestAnimationFrame(() => {
      quadro.current = 0;
      aoIr(pendente.current, false);
    });
  };
  const mostrarInfo = (k: number, clientY: number, modo: Modo, toque: boolean) => {
    const r = ref.current!.getBoundingClientRect();
    setInfo({ k, y: Math.max(0, Math.min(r.height, clientY - r.top)), modo, toque, emCima: clientY < window.innerHeight / 2 });
  };

  const iniciar = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button > 0) return;
    const r = e.currentTarget.getBoundingClientRect();
    const noPino = !!pino.current?.contains(e.target as Node);
    const toque = e.pointerType !== "mouse";
    if (toque && !noPino) {
      toqueNaFaixa.current = { y: e.clientY, t: e.timeStamp };
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    const k = noPino ? atual : indicePorPosicao(e.clientY - r.top, r.height, total);
    if (!noPino) ir(k);
    estado.current = { y: e.clientY, k, mostrado: k, acc: 0, modo: "rapido", toque, inicio: atual };
    mostrarInfo(k, e.clientY, "rapido", toque);
    setAtivo(true);
  };
  const mover = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = estado.current;
    if (!s) return;
    const dy = e.clientY - s.y;
    s.y = e.clientY;
    const modo = modoPorPosicao(e.clientX, window.innerWidth, ks.length > 0);
    if (modo !== s.modo) {
      s.modo = modo;
      s.acc = 0;
      s.k = s.mostrado;
      vibrar();
    }
    let k: number;
    if (modo === "marcas") {
      s.acc += dy;
      while (Math.abs(s.acc) >= PX_POR_MARCA) {
        const dir = Math.sign(s.acc);
        s.k = proximoPonto(ks, Math.round(s.k), dir);
        s.acc -= dir * PX_POR_MARCA;
      }
      k = Math.round(s.k);
    } else {
      const h = e.currentTarget.getBoundingClientRect().height;
      s.k = moverIndice(s.k, dy, modo, total, h);
      // no rápido, os grifos atraem o pino a até 6 px
      k = Math.round((modo === "rapido" ? imantar(s.k, ks, (6 * (total - 1)) / Math.max(1, h)) : null) ?? s.k);
    }
    if (k !== s.mostrado) {
      s.mostrado = k;
      ir(k);
      if (ks.includes(k)) vibrar();
    }
    mostrarInfo(k, e.clientY, modo, s.toque);
  };
  const soltar = (e: React.PointerEvent<HTMLDivElement>) => {
    const t = toqueNaFaixa.current;
    toqueNaFaixa.current = null;
    if (t) {
      if (e.type === "pointerup" && Math.abs(e.clientY - t.y) < 10 && e.timeStamp - t.t < 500) {
        const r = e.currentTarget.getBoundingClientRect();
        const k = indicePorPosicao(e.clientY - r.top, r.height, total);
        aoIr(k);
        aoSoltar(atual, k);
      }
      return;
    }
    const s = estado.current;
    estado.current = null;
    if (!s) return;
    cancelAnimationFrame(quadro.current);
    quadro.current = 0;
    setAtivo(false);
    aoIr(s.mostrado);
    aoSoltar(s.inicio, s.mostrado);
  };
  const tecla = (e: React.KeyboardEvent) => {
    const passos: Record<string, number> = { ArrowDown: 1, ArrowUp: -1, PageDown: 10, PageUp: -10, Home: -total, End: total };
    if (!(e.key in passos)) return;
    e.preventDefault();
    aoIr(Math.max(0, Math.min(total - 1, atual + passos[e.key])));
  };

  const a = info ? artigos[info.k] : undefined;
  const nPonto = info ? ks.indexOf(info.k) : -1;
  const det = info ? (detalhes.get(info.k) ?? []) : [];
  return (
    <div
      ref={ref}
      className={`${styles.trilho} ${oculto && !ativo ? styles.trilhoOculto : ""} ${ativo ? styles.trilhoAtivo : ""}`}
      role="slider"
      tabIndex={0}
      aria-label="Ir para o artigo"
      aria-valuemin={0}
      aria-valuemax={total - 1}
      aria-valuenow={mostrar}
      aria-valuetext={[artigos[mostrar]?.[1], secoes[mostrar]].filter(Boolean).join(", ")}
      onPointerDown={iniciar}
      onPointerMove={mover}
      onPointerUp={soltar}
      onPointerCancel={soltar}
      onKeyDown={tecla}
    >
      <span className={styles.trilhoLinha} aria-hidden>
        {faixas.map((f) => (
          <span key={f.de} className={styles.trilhoFaixa} style={{ top: pct(f.de), height: `max(3px, ${pct(f.ate - f.de)})`, "--c": f.cor } as CSSProperties} />
        ))}
      </span>
      {marcos.map((m) => (
        <span key={m.k} className={styles.trilhoMarco} style={{ top: pct(m.k) }} aria-hidden />
      ))}
      {pontos.map((p) => (
        <span
          key={`${p.tipo}${p.k}`}
          className={styles.trilhoPonto}
          data-tipo={p.tipo}
          style={{ top: pct(p.k), ...(p.cor ? { "--c": p.cor } : {}) } as CSSProperties}
          aria-hidden
        />
      ))}
      <span ref={pino} className={styles.trilhoPino} style={{ transform: `translateY(${(mostrar / Math.max(1, total - 1)) * altura}px)` }} aria-hidden />
      {info && a && (
        <div
          className={`${styles.trilhoBalao} ${ativo ? styles.trilhoBalaoVisivel : ""} ${info.toque ? styles.trilhoBalaoToque : ""}`}
          data-em-cima={info.emCima ? "1" : "0"}
          style={info.toque ? undefined : { top: info.y }}
          aria-hidden
        >
          <strong className={styles.trilhoArtigo}>{a[1]}</strong>
          {secoes[info.k] && <span className={styles.trilhoSecao}>{secoes[info.k]}</span>}
          {det.length > 0 && (
            <span className={styles.trilhoDetalhes}>
              {det.slice(0, 3).map((d, n) => (
                <span key={n} className={styles.trilhoDetalhe} style={d.cor ? ({ "--c": d.cor } as CSSProperties) : undefined}>
                  {d.texto}
                </span>
              ))}
              {det.length > 3 && <span className={styles.trilhoDetalhe}>e mais {det.length - 3}</span>}
            </span>
          )}
          <span className={styles.trilhoPrevia}>{semRotulo(a[2])}</span>
          <span className={styles.trilhoModos}>
            {ORDEM_MODOS.map((m) => (
              <span key={m} data-on={info.modo === m ? "1" : "0"} data-off={m === "marcas" && !ks.length ? "1" : "0"}>
                {NOMES_MODO[m]}
              </span>
            ))}
          </span>
          <span className={styles.trilhoDica}>
            {info.modo === "marcas"
              ? nPonto >= 0
                ? `Grifo ${nPonto + 1} de ${ks.length}`
                : `${ks.length} grifos`
              : info.modo === "fino"
                ? ks.length
                  ? "Esquerda: só os grifos · direita: rápido"
                  : "Direita: rápido"
                : ks.length
                  ? "Meio: artigo a artigo · Esquerda: só os grifos"
                  : "Esquerda: artigo a artigo"}
          </span>
        </div>
      )}
    </div>
  );
}

function PainelLeis({ atual, posicoes }: { atual: string; posicoes: Posicoes }) {
  const recentes = [...indice]
    .filter((l) => posicoes[l.id] && l.id !== atual)
    .sort((a, b) => posicoes[b.id].em - posicoes[a.id].em)
    .slice(0, 3);
  return (
    <>
      {recentes.length > 0 && (
        <>
          <h3 className={styles.subtitulo}>Continuar lendo</h3>
          <ul className={styles.listaLeis}>
            {recentes.map((l) => (
              <li key={l.id}>
                <a href={`/leis/${l.id}/#${posicoes[l.id].art}`}>
                  <strong>{l.nome}</strong>
                  <span>parou no {posicoes[l.id].rotulo}</span>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
      <h3 className={styles.subtitulo}>Todas as leis</h3>
      <ul className={styles.listaLeis}>
        {indice.map((l) => (
          <li key={l.id}>
            <a href={`/leis/${l.id}/`} aria-current={l.id === atual ? "page" : undefined}>
              <strong>{l.nome}</strong>
              <span>{posicoes[l.id] ? `parou no ${posicoes[l.id].rotulo}` : `${l.artigos} artigos`}</span>
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}

function PainelBusca({ lei, artigos, aoIr }: { lei: string; artigos: ArtigoTexto[]; aoIr: (art: string) => void }) {
  const [consulta, setConsulta] = useState("");
  const [todas, setTodas] = useState(false);
  const [outras, setOutras] = useState<{ id: string; nome: string; achados: Achado[] }[] | "carregando" | null>(null);
  const porNumero = artigoDigitado(consulta);
  const sugestoes = porNumero ? sugerirArtigos(consulta, artigos) : [];
  const achados = !porNumero && consulta.trim().length >= 3 ? buscarTexto(consulta, artigos) : [];
  const buscaOutras = todas && !porNumero && consulta.trim().length >= 3;

  useEffect(() => {
    if (!buscaOutras) return;
    let vivo = true;
    const t = setTimeout(() => {
      setOutras("carregando");
      Promise.all(indice.filter((l) => l.id !== lei).map((l) => carregarArtigos(l.id).catch(() => null))).then((ls) => {
        if (!vivo) return;
        setOutras(ls.flatMap((l) => (l ? [{ id: l.id, nome: l.nome, achados: buscarTexto(consulta, l.artigos, 12) }] : [])).filter((x) => x.achados.length));
      });
    }, 250);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [buscaOutras, consulta, lei]);

  const linha = (a: Achado) => (
    <>
      <strong>{a.rotulo}</strong>
      <span>
        {a.antes}
        <mark>{a.achado}</mark>
        {a.depois}
      </span>
    </>
  );

  return (
    <div className={styles.busca}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (sugestoes[0]) aoIr(sugestoes[0][0]);
          else if (achados[0]) aoIr(achados[0].art);
        }}
      >
        <input
          autoFocus
          type="search"
          enterKeyHint="search"
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          placeholder="Número do artigo (121, 155-A) ou palavras"
          aria-label="Buscar artigo ou texto"
        />
      </form>
      <label className={styles.opcao}>
        <input type="checkbox" checked={todas} onChange={(e) => setTodas(e.target.checked)} /> Procurar também nas outras leis
      </label>
      {porNumero && (
        <ul className={styles.resultados}>
          {sugestoes.length ? (
            sugestoes.map((a) => (
              <li key={a[0]}>
                <button type="button" onClick={() => aoIr(a[0])}>
                  <strong>{a[1]}</strong>
                  <span>{a[2].slice(a[1].length, 160)}…</span>
                </button>
              </li>
            ))
          ) : (
            <li className={styles.miuda}>Nenhum artigo com esse número nesta lei.</li>
          )}
        </ul>
      )}
      {!porNumero && consulta.trim().length >= 3 && (
        <>
          <p className={styles.miuda}>
            {achados.length ? `${achados.length}${achados.length >= 60 ? "+" : ""} artigo(s) nesta lei.` : "Nada nesta lei."} Use aspas para a expressão exata.
          </p>
          <ul className={styles.resultados}>
            {achados.map((a) => (
              <li key={a.art}>
                <button type="button" onClick={() => aoIr(a.art)}>
                  {linha(a)}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {buscaOutras && outras === "carregando" && <p className={styles.miuda}>Procurando nas outras leis…</p>}
      {buscaOutras &&
        Array.isArray(outras) &&
        outras.map((o) => (
          <section key={o.id}>
            <h3 className={styles.subtitulo}>{o.nome}</h3>
            <ul className={styles.resultados}>
              {o.achados.map((a) => (
                <li key={a.art}>
                  <a href={`/leis/${o.id}/#${a.art}`}>{linha(a)}</a>
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}

function PainelGrifos(props: {
  legendas: { ativo: string; meus: Sistema[] };
  sistema: Sistema;
  marcas: Marcacao[];
  rotuloDaCor: (c: string) => string;
  prontos: boolean;
  mudarProntos: (v: boolean) => void;
  mudarLegendas: (l: { ativo: string; meus: Sistema[] }) => void;
  editar: (s: Sistema) => void;
  aoIr: (m: Marcacao) => void;
  remover: (m: Marcacao) => void;
}) {
  const { legendas, sistema, marcas } = props;
  return (
    <div className={styles.grupos}>
      <fieldset>
        <legend>Sistema de cores</legend>
        <div className={styles.chips}>
          {todosSistemas(legendas).map((s) => (
            <button key={s.id} type="button" aria-pressed={s.id === sistema.id} onClick={() => props.mudarLegendas({ ...legendas, ativo: s.id })}>
              {s.nome}
            </button>
          ))}
        </div>
        <ul className={styles.legenda}>
          {sistema.cores.map((c) => (
            <li key={c.cor + c.rotulo}>
              <span className={styles.amostra} style={{ "--c": c.cor } as CSSProperties} />
              {c.rotulo}
            </li>
          ))}
        </ul>
        <label className={styles.opcao}>
          <input type="checkbox" checked={props.prontos} onChange={(e) => props.mudarProntos(e.target.checked)} /> Mostrar os grifos prontos deste sistema
        </label>
        <div className={styles.chips}>
          <button type="button" onClick={() => props.editar({ id: `meu-${Date.now().toString(36)}`, nome: "Meu sistema", cores: [{ cor: "#fde047", rotulo: "" }] })}>
            + Criar sistema
          </button>
          {legendas.meus.some((s) => s.id === sistema.id) && (
            <button type="button" onClick={() => props.editar(sistema)}>
              Editar “{sistema.nome}”
            </button>
          )}
        </div>
      </fieldset>
      <fieldset>
        <legend>Meus grifos nesta lei ({marcas.length})</legend>
        {marcas.length === 0 ? (
          <p className={styles.miuda}>Toque em “Grifar”, escolha a cor e passe o dedo (ou o mouse) sobre o texto.</p>
        ) : (
          <ul className={styles.resultados}>
            {marcas.map((m) => (
              <li key={m.id} className={styles.itemGrifo}>
                <button type="button" onClick={() => props.aoIr(m)}>
                  <span className={styles.amostra} style={{ "--c": m.cor === "nota" ? "transparent" : m.cor } as CSSProperties} />
                  <span>
                    <strong>{props.rotuloDaCor(m.cor) || "Grifo"}</strong> “{m.exato.slice(0, 90)}”{m.nota ? ` — ${m.nota}` : ""}
                  </span>
                </button>
                <button type="button" className={styles.link} onClick={() => props.remover(m)} aria-label="Apagar grifo">
                  apagar
                </button>
              </li>
            ))}
          </ul>
        )}
      </fieldset>
    </div>
  );
}

function EditorSistema({ sistema, onSalvar, onCancelar, onExcluir }: { sistema: Sistema; onSalvar: (s: Sistema) => void; onCancelar: () => void; onExcluir: () => void }) {
  const [nome, setNome] = useState(sistema.nome);
  const [cores, setCores] = useState<CorLegenda[]>(sistema.cores);
  const mudar = (k: number, p: Partial<CorLegenda>) => setCores((cs) => cs.map((c, i) => (i === k ? { ...c, ...p } : c)));
  return (
    <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="sistema-titulo">
      <div className={styles.modalCaixa}>
        <h2 id="sistema-titulo">Sistema de cores</h2>
        <label>
          Nome <input value={nome} onChange={(e) => setNome(e.target.value)} />
        </label>
        {cores.map((c, k) => (
          <div key={k} className={styles.linhaCor}>
            <input type="color" value={c.cor} onChange={(e) => mudar(k, { cor: e.target.value })} aria-label="Cor" />
            <input value={c.rotulo} placeholder="Significado (ex.: Competência)" onChange={(e) => mudar(k, { rotulo: e.target.value })} />
            <button type="button" className={styles.link} onClick={() => setCores((cs) => cs.filter((_, i) => i !== k))} disabled={cores.length === 1}>
              remover
            </button>
          </div>
        ))}
        <button type="button" className={styles.link} onClick={() => setCores((cs) => [...cs, { cor: "#93c5fd", rotulo: "" }])}>
          + cor
        </button>
        <div className={styles.acoes}>
          <button type="button" className="btn btn-sm btn-gold" onClick={() => onSalvar({ ...sistema, nome: nome.trim() || "Meu sistema", cores: cores.filter((c) => c.cor) })}>
            Salvar
          </button>
          <button type="button" className="btn btn-sm" onClick={onCancelar}>
            Cancelar
          </button>
          <button type="button" className={styles.link} onClick={onExcluir}>
            excluir sistema
          </button>
        </div>
      </div>
    </div>
  );
}
