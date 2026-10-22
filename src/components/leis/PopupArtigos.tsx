"use client";

import { type CSSProperties, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import prontosJson from "@/content/generated/grifos.json";
import { artigoParaPrevia, type ArtigoPrevia } from "@/lib/leis/artigo-previa";
import { prontosDosBlocos, type GrifosProntos } from "@/lib/leis/grifos";
import type { Classes } from "@/lib/leis/html";
import { corDoPronto, idDosProntos, lerLegendas, sistemaDoLeitor, todosSistemas } from "@/lib/leis/legendas";
import { lerMarcacoes, localizar, type Marcacao } from "@/lib/leis/marcacoes";
import { rotaDaLei } from "@/lib/leis/sumulas";
import { lerJSON } from "@/lib/storage";
import styles from "./popup.module.css";

/** Um artigo mostrado na prévia. A prévia guarda os que o leitor abriu por dentro dela, para voltar e avançar. */
interface Entrada {
  lei: string;
  art: string;
  href: string;
  alvo: string | null;
  /** os dispositivos que o link nomeia ("inciso XI do art. 5º" → art5.i11): destacados e levados à vista */
  disps: string[];
  /** "lei|dispositivo" citado, quando a prévia veio do "citado por": o link que faz a citação é destacado */
  cita?: string;
}
interface Aberto {
  entradas: Entrada[];
  pos: number;
  /** posição do link na tela; null = painel inferior (toque) */
  ret: { left: number; top: number; bottom: number } | null;
  /** posição ao lado do cartão "Citado por" (não cobre a lista); undefined = posição junto do link */
  lado?: { x: number; y: number };
  /** a prévia foi usada por dentro (um link dela foi aberto): fica aberta até um clique fora dela ou o Esc */
  fixa: boolean;
  /** de que lado entra o texto novo, na troca */
  dir?: "voltar" | "avancar";
}

// Classes do HTML dos blocos (src/lib/leis/html.ts) na prévia: o mesmo texto e os mesmos links do leitor, sem estrela,
// atos e informações adicionais (o CSS os esconde).
const CLASSES: Classes = {
  b: styles.b,
  txt: styles.txt,
  ref: styles.ref,
  rotulo: styles.rotulo,
  atos: styles.oculto,
  ato: styles.oculto,
  info: styles.oculto,
  infoLinha: styles.oculto,
  estrela: styles.oculto,
  naoEncontrada: styles.naoEncontrada,
  tipos: {
    estrutura: styles.estrutura,
    rubrica: styles.rubrica,
    artigo: styles.artigo,
    paragrafo: styles.paragrafo,
    inciso: styles.inciso,
    alinea: styles.alinea,
    texto: styles.paragrafo,
  },
};

const PREVIA = '[role="dialog"][aria-label="Texto do artigo"]';
const PRONTOS = prontosJson as GrifosProntos;

/** O grifo tocado na prévia: o significado da cor e o comentário (a anotação do grifo, ou a nota do grifo pronto). */
interface Detalhe {
  /** o texto mostrado quando o grifo foi tocado (troca de artigo apaga o detalhe) */
  chave: string;
  cor: string;
  rotulo: string;
  nota?: string;
  pronto: boolean;
}

// o link de artigo tem prévia, a menos que esteja num trecho com a prévia desligada (data-previa="0", no simulado)
const link = (el: EventTarget | null) => {
  if (!(el instanceof Element)) return null;
  const a = el.closest<HTMLAnchorElement>("a[data-lei][data-art]");
  return a && !a.closest('[data-previa="0"]') ? a : null;
};
const naPrevia = (el: EventTarget | null) => el instanceof Element && !!el.closest(PREVIA);

const entradaDe = (a: HTMLAnchorElement): Entrada => ({
  lei: a.dataset.lei!,
  art: a.dataset.art!,
  href: a.href,
  alvo: a.getAttribute("target"),
  disps: (a.dataset.disp ?? "").split(" ").filter(Boolean),
  cita: a.dataset.cita,
});

const LARGURA = 340; // largura do cartão (CSS: min(340px, 100vw - 24px))

/** Prévia à direita do cartão "Citado por", ou à esquerda se não couber; undefined se nenhum lado couber. */
function aoLado(cartao: DOMRect, topo: number): { x: number; y: number } | undefined {
  const direita = cartao.right + 8;
  const esquerda = cartao.left - 8 - LARGURA;
  const x = direita + LARGURA <= window.innerWidth - 12 ? direita : esquerda >= 12 ? esquerda : null;
  if (x === null) return undefined;
  // a altura da prévia é no máximo 46vh: sobe o que for preciso para ela caber
  return { x, y: Math.max(12, Math.min(topo, window.innerHeight * 0.54 - 12)) };
}

/** Envolve o intervalo [ini, fim) do texto de `el` em <mark>, atravessando links e outros nós. */
function envolver(el: HTMLElement, ini: number, fim: number, m: Marcacao, rotulo: string) {
  const andar = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const pedacos: { no: Text; a: number; b: number }[] = [];
  let pos = 0;
  for (let n = andar.nextNode() as Text | null; n; n = andar.nextNode() as Text | null) {
    const a = Math.max(ini, pos);
    const b = Math.min(fim, pos + n.data.length);
    if (a < b) pedacos.push({ no: n, a: a - pos, b: b - pos });
    pos += n.data.length;
  }
  for (const { no, a, b } of pedacos) {
    const alvo = no.splitText(a);
    alvo.splitText(b - a);
    const mark = document.createElement("mark");
    mark.className = styles.marca;
    if (m.cor === "nota") mark.dataset.soNota = "1";
    else mark.style.setProperty("--c", m.cor);
    if (m.nota) mark.dataset.nota = "1";
    // o significado e o comentário: no título (mouse) e no detalhe que o toque abre
    mark.dataset.rotulo = rotulo;
    if (m.nota) mark.dataset.comentario = m.nota;
    mark.title = m.nota ? `${rotulo}: ${m.nota}` : rotulo;
    alvo.replaceWith(mark);
    mark.append(alvo);
  }
}

/**
 * Acerta o HTML da prévia depois de desenhado: os links levam ao artigo na página da lei (o "#art5" do leitor é da
 * página da própria lei), os do Planalto abrem em outra aba, e os grifos aparecem como no leitor: os do usuário e os
 * grifos prontos do sistema de cores da lei (se estiverem ligados na leitura).
 */
function prepararTexto(cont: HTMLElement, lei: string, dados: ArtigoPrevia) {
  const prefs = lerJSON<{ destino?: string; prontos?: boolean }>("grifo:leitor", {});
  const planalto = prefs.destino === "planalto";
  cont.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((a) => {
    for (const attr of ["href", "data-grifo"]) {
      const h = a.getAttribute(attr);
      if (h?.startsWith("#")) a.setAttribute(attr, `${rotaDaLei(lei)}${h}`);
    }
    if (planalto && a.dataset.planalto) a.setAttribute("href", a.dataset.planalto);
    if (!a.dataset.lei || (planalto && a.dataset.planalto)) {
      a.target = "_blank";
      a.rel = "noopener";
    }
  });
  cont.querySelectorAll<HTMLElement>("[data-dica]").forEach((s) => (s.title = s.dataset.dica!));
  // a estrela (marcar como importante) é do leitor: na prévia, sai também do texto copiado
  cont.querySelectorAll("button").forEach((b) => b.remove());
  if (dados.revogado) return;
  // um elemento por bloco, na ordem de dados.blocos
  const els = Array.from(cont.children) as HTMLElement[];
  const legendas = lerLegendas();
  const sistema = sistemaDoLeitor(legendas, lei, PRONTOS);
  // grifos prontos: a barra na margem (tema de prova) ou a moldura (destaque), com a nota do Grifo como comentário
  if (prefs.prontos !== false) {
    const prontos = prontosDosBlocos(dados.blocos, PRONTOS, idDosProntos(sistema), lei, (rotulo) => corDoPronto(sistema, rotulo));
    for (const [i, g] of prontos) {
      const el = els[i];
      if (!el) continue;
      el.dataset.pronto = g.tipo;
      el.style.setProperty("--pronto", g.cor);
      el.dataset.rotulo = g.rotulo;
      if (g.nota) el.dataset.comentario = g.nota;
      el.title = g.nota ? `${g.rotulo}: ${g.nota}` : g.rotulo;
    }
    if (prontos.size) cont.dataset.comProntos = "1";
  }
  const art = dados.blocos[0]?.disp?.split(".")[0];
  const marcas = lerMarcacoes(lei).filter((m) => m.disp?.split(".")[0] === art);
  if (!marcas.length) return;
  // o nome da cor vem primeiro do sistema da lei, como no leitor
  const cores = [sistema, ...todosSistemas(legendas)].flatMap((s) => s.cores);
  const rotuloDaCor = (cor: string) => (cor === "nota" ? "Anotação" : (cores.find((c) => c.cor.toLowerCase() === cor.toLowerCase())?.rotulo || "Grifo"));
  const textos = dados.blocos.map((b) => b.texto);
  const disps = dados.blocos.map((b) => b.disp);
  for (const m of marcas) {
    const onde = localizar({ ...m, i: -1 }, textos, disps);
    const txt = onde && els[onde.i]?.querySelector<HTMLElement>(`.${styles.txt}`);
    if (onde && txt) envolver(txt, onde.ini, onde.fim, m, rotuloDaCor(m.cor));
  }
}

/**
 * Destaca (com um brilho que some aos poucos) o link que faz a citação, quando a prévia veio do "citado por", e o
 * inciso ou parágrafo que o link nomeia. O primeiro deles é levado à vista dentro da prévia.
 */
function destacar(cont: HTMLElement, e: Entrada) {
  // o dispositivo que a lei não tem ("§ 1º, II" num parágrafo sem incisos) fica no nível mais próximo que existe
  const bloco = (d: string): HTMLElement[] => {
    const achados = Array.from(cont.querySelectorAll<HTMLElement>(`[data-disp="${CSS.escape(d)}"]`));
    const acima = d.slice(0, d.lastIndexOf("."));
    return achados.length || !acima.includes(".") ? achados : bloco(acima);
  };
  const alvos = [...new Set(e.disps.flatMap(bloco))].map((b) => b.querySelector<HTMLElement>(`.${styles.txt}`) ?? b);
  let citantes: HTMLElement[] = [];
  if (e.cita) {
    const [lei, disp] = e.cita.split("|") as [string, string];
    const base = disp.split(".")[0];
    const links = Array.from(cont.querySelectorAll<HTMLAnchorElement>("a[data-lei][data-art]")).filter((a) => a.dataset.lei === lei);
    // citação de um inciso ou parágrafo: o link que o nomeia; sem ele (o link cita só o artigo), os links do artigo
    const doDisp = disp.includes(".") ? links.filter((a) => (a.dataset.disp ?? "").split(" ").some((d) => d === disp || d.startsWith(`${disp}.`))) : [];
    citantes = doDisp.length ? doDisp : links.filter((a) => a.dataset.art === base);
  }
  for (const el of citantes) el.classList.add(styles.citante);
  for (const el of alvos) el.classList.add(styles.alvo);
  const primeiro = citantes[0] ?? alvos[0];
  if (!primeiro) return;
  const c = cont.getBoundingClientRect();
  const r = primeiro.getBoundingClientRect();
  if (r.top < c.top || r.bottom > c.bottom) cont.scrollTop += r.top - c.top - Math.max(8, (c.height - Math.min(r.height, c.height)) / 3);
}

/**
 * Pop-up com o texto do artigo ao passar o mouse (ou tocar) num link de artigo, em qualquer página. Os links do texto
 * funcionam dentro dela: abrem o artigo citado na própria prévia, e Ctrl+Z / Ctrl+Alt+Z (ou deslizar para os lados,
 * no toque) voltam e avançam. Um clique fora fecha tudo.
 */
export function PopupArtigos() {
  const [aberto, setAberto] = useState<Aberto | null>(null);
  const [conteudo, setConteudo] = useState<{ chave: string; dados: ArtigoPrevia | "erro" } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sobreCartao = useRef(false);
  const abertoRef = useRef<Aberto | null>(null);
  const textoRef = useRef<HTMLDivElement>(null);
  const toqueIni = useRef<{ x: number; y: number } | null>(null);
  const [telaCheia, setTelaCheia] = useState<Element | null>(null);
  const [toque, setToque] = useState(false);
  const [detalhe, setDetalhe] = useState<Detalhe | null>(null);

  // os listeners leem a prévia aberta por aqui (eles não reexecutam a cada mudança)
  useEffect(() => {
    abertoRef.current = aberto;
  }, [aberto]);

  useEffect(() => {
    const mudou = () => setTelaCheia(document.fullscreenElement !== document.documentElement ? document.fullscreenElement : null);
    document.addEventListener("fullscreenchange", mudou);
    return () => document.removeEventListener("fullscreenchange", mudou);
  }, []);

  const voltar = useCallback(() => setAberto((a) => (a && a.pos > 0 ? { ...a, pos: a.pos - 1, dir: "voltar", fixa: true } : a)), []);
  const avancar = useCallback(() => setAberto((a) => (a && a.pos < a.entradas.length - 1 ? { ...a, pos: a.pos + 1, dir: "avancar", fixa: true } : a)), []);

  useEffect(() => {
    // celular e tablet: sem mouse por cima para ler. Aparelhos que se dizem "hover" mas são de toque contam como toque.
    const mq = window.matchMedia("(hover: none), (pointer: coarse)");
    const ehToque = () => mq.matches;
    setToque(mq.matches); // eslint-disable-line react-hooks/set-state-in-effect -- lê o tipo de tela depois de montar
    const abrir = (a: HTMLAnchorElement, comoPainel: boolean) => {
      const r = a.getBoundingClientRect();
      const cartao = comoPainel ? undefined : a.closest("[data-citado-por]")?.getBoundingClientRect();
      setAberto({
        entradas: [entradaDe(a)],
        pos: 0,
        ret: comoPainel ? null : { left: r.left + r.width / 2, top: r.top, bottom: r.bottom },
        lado: cartao ? aoLado(cartao, r.top) : undefined,
        fixa: false,
      });
    };
    // link aberto de dentro da prévia: o artigo dele entra no lugar, e o anterior fica para o Ctrl+Z
    // (o "Abrir artigo" segue o link que abriu a prévia: numa prova, em outra aba)
    const navegar = (a: HTMLAnchorElement) =>
      setAberto((x) => {
        if (!x) return x;
        const nova = entradaDe(a);
        nova.alvo ??= x.entradas[0]!.alvo;
        return { ...x, entradas: [...x.entradas.slice(0, x.pos + 1), nova], pos: x.pos + 1, fixa: true, dir: "avancar" };
      });
    const limpar = () => timer.current && clearTimeout(timer.current);
    const sobre = (e: PointerEvent) => {
      const a = link(e.target);
      // dentro da prévia, o link abre com o clique; com a prévia fixa, passar por outros links não a troca
      if (!a || e.pointerType !== "mouse" || naPrevia(a) || abertoRef.current?.fixa) return;
      limpar();
      timer.current = setTimeout(() => abrir(a, false), 280);
    };
    const fora = (e: PointerEvent) => {
      if (!link(e.target) || e.pointerType !== "mouse" || naPrevia(e.target) || abertoRef.current?.fixa) return;
      limpar();
      timer.current = setTimeout(() => !sobreCartao.current && !abertoRef.current?.fixa && setAberto(null), 220);
    };
    const clique = (e: MouseEvent) => {
      const a = link(e.target);
      if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.button > 0) return;
      if (naPrevia(a)) {
        e.preventDefault();
        e.stopPropagation();
        navegar(a);
        return;
      }
      if (ehToque()) {
        // no toque, o primeiro clique só abre a prévia; o segundo, no mesmo link (o número) ou em "Abrir artigo", vai ao artigo
        const atual = abertoRef.current;
        const vista = atual?.entradas[atual.pos];
        if (vista && vista.lei === a.dataset.lei && vista.art === a.dataset.art) return;
        // a interrupção impede também os cliques de quem está por baixo (o índice do leitor navega no seu próprio onClick)
        e.preventDefault();
        e.stopPropagation();
        abrir(a, true);
        return;
      }
      if (a.target !== "_blank") return;
      e.preventDefault();
      abrir(a, false);
    };
    // clique fora da prévia fecha (no toque, quem fecha é o fundo escuro do painel)
    const apertar = (e: PointerEvent) => {
      if (!abertoRef.current || naPrevia(e.target)) return;
      if (abertoRef.current.ret) setAberto(null);
    };
    const foco = (e: FocusEvent) => {
      const a = link(e.target);
      if (a && !ehToque() && !naPrevia(a) && !abertoRef.current?.fixa) abrir(a, false);
      // o foco foi para outra coisa (botão, campo): a prévia aberta pelo Tab fecha
      else if (!a && !naPrevia(e.target) && abertoRef.current && !abertoRef.current.fixa) {
        limpar();
        setAberto(null);
      }
    };
    // o foco saiu da página (Tab depois do último link): a prévia fecha. Clicar no texto da prévia também tira o foco do
    // link sem destino, mas a página continua com o foco, e a prévia fica.
    const saiu = (e: FocusEvent) => {
      if (e.relatedTarget || !link(e.target)) return;
      setTimeout(() => {
        if (!document.hasFocus() && abertoRef.current && !abertoRef.current.fixa) setAberto(null);
      }, 0);
    };
    // Esc fecha a prévia aberta, e só ela: sem parar aqui, o Esc da prova (que pausa) dispara junto.
    // Ctrl+Z volta ao artigo anterior da prévia e Ctrl+Alt+Z (ou Ctrl+Shift+Z, Ctrl+Y) avança; com a prévia aberta,
    // o atalho é dela (não desfaz o último grifo apagado do leitor).
    const tecla = (e: KeyboardEvent) => {
      if (!abertoRef.current) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        setAberto(null);
        return;
      }
      if (!(e.ctrlKey || e.metaKey) || (e.target instanceof Element && e.target.closest("input, textarea, select, [contenteditable]"))) return;
      const z = e.code === "KeyZ" || e.key.toLowerCase() === "z";
      const avante = (z && (e.altKey || e.shiftKey)) || (!e.altKey && !e.shiftKey && (e.code === "KeyY" || e.key.toLowerCase() === "y"));
      if (!z && !avante) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (avante) avancar();
      else voltar();
    };
    const rolar = () => !ehToque() && !abertoRef.current?.fixa && setAberto(null);
    document.addEventListener("pointerover", sobre);
    document.addEventListener("pointerout", fora);
    document.addEventListener("click", clique, true);
    document.addEventListener("pointerdown", apertar, true);
    document.addEventListener("focusin", foco);
    document.addEventListener("focusout", saiu);
    window.addEventListener("keydown", tecla, true);
    window.addEventListener("scroll", rolar, { passive: true });
    return () => {
      limpar();
      document.removeEventListener("pointerover", sobre);
      document.removeEventListener("pointerout", fora);
      document.removeEventListener("click", clique, true);
      document.removeEventListener("pointerdown", apertar, true);
      document.removeEventListener("focusin", foco);
      document.removeEventListener("focusout", saiu);
      window.removeEventListener("keydown", tecla, true);
      window.removeEventListener("scroll", rolar);
    };
  }, [voltar, avancar]);

  const entrada = aberto ? aberto.entradas[aberto.pos] : undefined;
  // a forma do texto é a da leitura ("Redação original" ligada ou não)
  const original = !!lerJSON<{ original?: boolean }>("grifo:leitor", {}).original;
  const chave = entrada ? `${entrada.lei}|${entrada.art}|${original ? 1 : 0}` : "";

  useEffect(() => {
    if (!entrada) return;
    let vivo = true;
    artigoParaPrevia(entrada.lei, entrada.art, original, CLASSES)
      .then((dados) => vivo && setConteudo({ chave, dados: dados ?? "erro" }))
      .catch(() => vivo && setConteudo({ chave, dados: "erro" }));
    return () => {
      vivo = false;
    };
  }, [chave]); // eslint-disable-line react-hooks/exhaustive-deps -- a chave resume a lei, o artigo e a forma

  const dados = conteudo?.chave === chave ? conteudo.dados : null;
  // depois de desenhar o texto: links, grifos e destaques (o texto é trocado inteiro a cada artigo, pela key)
  useLayoutEffect(() => {
    const cont = textoRef.current;
    if (!cont || !entrada || !dados || dados === "erro") return;
    prepararTexto(cont, entrada.lei, dados);
    destacar(cont, entrada);
  }, [dados, entrada]);

  if (!aberto || !entrada) return null;
  const painel = !aberto.ret;
  const abaixo = aberto.ret ? aberto.ret.bottom < window.innerHeight * 0.55 : true;
  const estilo = aberto.lado
    ? { left: aberto.lado.x, top: aberto.lado.y, transform: "none" }
    : aberto.ret
      ? { left: Math.min(Math.max(aberto.ret.left, 170), window.innerWidth - 170), ...(abaixo ? { top: aberto.ret.bottom + 8 } : { bottom: window.innerHeight - aberto.ret.top + 8 }) }
      : undefined;
  const varios = aberto.entradas.length > 1;
  const chaveTexto = `${aberto.pos}|${chave}`;
  const grifoTocado = detalhe?.chave === chaveTexto ? detalhe : null;
  // o primeiro artigo abre pelo endereço do próprio link; os abertos por dentro da prévia, pelo endereço do artigo
  const href = entrada.href;
  const fechar = () => setAberto(null);

  return createPortal(
    <>
      {painel && <div className={styles.fundo} onClick={fechar} aria-hidden />}
      <div
        className={painel ? styles.painel : `${styles.cartao} ${aberto.lado ? styles.aoLado : ""}`}
        style={estilo}
        role="dialog"
        aria-label="Texto do artigo"
        onPointerEnter={() => (sobreCartao.current = true)}
        onPointerLeave={(e) => {
          if (e.pointerType !== "mouse") return;
          sobreCartao.current = false;
          if (!abertoRef.current?.fixa) setAberto(null);
        }}
        onTouchStart={(e) => {
          const t = e.touches[0];
          toqueIni.current = e.touches.length === 1 && t ? { x: t.clientX, y: t.clientY } : null;
        }}
        onTouchEnd={(e) => {
          const ini = toqueIni.current;
          const t = e.changedTouches[0];
          toqueIni.current = null;
          if (!ini || !t) return;
          const dx = t.clientX - ini.x;
          const dy = t.clientY - ini.y;
          // deslizar para a direita volta; para a esquerda, avança (como o histórico do navegador)
          if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
          if (dx > 0) voltar();
          else avancar();
        }}
      >
        <div className={styles.topo}>
          {varios && (
            <span className={styles.historico}>
              <button type="button" className={styles.passo} onClick={voltar} disabled={aberto.pos === 0} aria-label="Voltar ao artigo anterior" title="Voltar (Ctrl+Z)">
                <svg viewBox="0 0 24 24" aria-hidden>
                  <path d="M15 6l-6 6 6 6" />
                </svg>
              </button>
              <button
                type="button"
                className={styles.passo}
                onClick={avancar}
                disabled={aberto.pos === aberto.entradas.length - 1}
                aria-label="Avançar ao próximo artigo"
                title="Avançar (Ctrl+Alt+Z)"
              >
                <svg viewBox="0 0 24 24" aria-hidden>
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
            </span>
          )}
          <p className={styles.lei}>{dados && dados !== "erro" ? dados.nome : " "}</p>
        </div>
        {dados === null && <p className={styles.carregando}>Carregando…</p>}
        {dados === "erro" && <p className={styles.carregando}>Não foi possível mostrar este artigo.</p>}
        {dados && dados !== "erro" && (
          <>
            {dados.revogado && <p className={styles.carregando}>Revogado: não está mais em vigor. Mostramos a última redação.</p>}
            <div
              key={chaveTexto}
              ref={textoRef}
              className={styles.texto}
              data-dir={aberto.dir}
              dangerouslySetInnerHTML={{ __html: dados.html }}
              onClick={(e) => {
                // tocar num grifo mostra o que a cor significa e o comentário dele; os links seguem o caminho deles
                const alvo = e.target as Element;
                if (alvo.closest("a")) return;
                const g = alvo.closest<HTMLElement>("[data-rotulo]");
                setDetalhe(
                  g
                    ? {
                        chave: chaveTexto,
                        cor: g.style.getPropertyValue("--c") || g.style.getPropertyValue("--pronto"),
                        rotulo: g.dataset.rotulo!,
                        nota: g.dataset.comentario,
                        pronto: !!g.dataset.pronto,
                      }
                    : null,
                );
              }}
            />
            {grifoTocado && (
              <div className={styles.detalhe} style={grifoTocado.cor ? ({ "--c": grifoTocado.cor } as CSSProperties) : undefined} role="status">
                <span className={styles.amostra} aria-hidden />
                <strong>{grifoTocado.rotulo}</strong>
                <small>{grifoTocado.pronto ? "Grifo pronto do Grifo" : "Seu grifo"}</small>
                {grifoTocado.nota && <p className={styles.comentario}>{grifoTocado.nota}</p>}
              </div>
            )}
          </>
        )}
        <div className={styles.acoes}>
          <a className="btn btn-sm btn-gold" href={href} target={entrada.alvo ?? undefined} rel={entrada.alvo ? "noopener" : undefined} onClick={fechar}>
            Abrir artigo
          </a>
          {painel && (
            <button type="button" className="btn btn-sm" onClick={fechar}>
              Fechar
            </button>
          )}
          {varios && <span className={styles.dica}>{toque ? "Deslize para os lados para voltar e avançar" : "Ctrl+Z volta · Ctrl+Alt+Z avança"}</span>}
        </div>
      </div>
    </>,
    telaCheia ?? document.body,
  );
}
