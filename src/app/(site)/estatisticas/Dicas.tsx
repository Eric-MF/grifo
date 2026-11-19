"use client";

// O balão das dicas da página de estatísticas. Qualquer elemento com data-dica (o título, em destaque) e data-dica-mais
// (as linhas de baixo, separadas por "\n") mostra o balão na hora: com o mouse por cima, com o foco do teclado e, no
// toque, segurando o dedo. Segurando, dá para deslizar: o balão acompanha o elemento sob o dedo, acima dele, e soltar
// não aciona o botão. O balão só repete o que o aria-label do elemento já diz (fica fora da árvore de acessibilidade).
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import styles from "./estatisticas.module.css";

interface Aberta {
  titulo: string;
  mais: string[];
  /** o ponto de referência: o meio do topo do elemento (ou o dedo) */
  x: number;
  y: number;
  /** a base do elemento, para abrir embaixo quando não cabe em cima */
  base: number;
  /** a dica do dedo: fica mais acima, para o dedo não cobrir */
  dedo: boolean;
  onde: Element;
}

const SEGURAR_MS = 350;
const alvoDe = (el: EventTarget | null, raiz: HTMLElement) => {
  const a = el instanceof Element ? el.closest<HTMLElement>("[data-dica]") : null;
  return a && raiz.contains(a) ? a : null;
};

export function Dicas({ raiz }: { raiz: RefObject<HTMLElement | null> }) {
  const [aberta, setAberta] = useState<Aberta | null>(null);
  const balao = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const r = raiz.current;
    if (!r) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let segurando = false;
    let inicio: { x: number; y: number } | null = null;
    const deElemento = (a: HTMLElement): Aberta => {
      const ret = a.getBoundingClientRect();
      return {
        titulo: a.dataset.dica!,
        mais: (a.dataset.dicaMais ?? "").split("\n").filter(Boolean),
        x: ret.left + ret.width / 2,
        y: ret.top,
        base: ret.bottom,
        dedo: false,
        onde: a,
      };
    };
    const noDedo = (a: HTMLElement, x: number, y: number): Aberta => ({ ...deElemento(a), x, y, base: y, dedo: true });
    const parar = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };

    const sobre = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const a = alvoDe(e.target, r);
      if (a) setAberta(deElemento(a));
    };
    const fora = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const de = alvoDe(e.target, r);
      if (de && alvoDe(e.relatedTarget, r) !== de) setAberta((x) => (x?.onde === de ? null : x));
    };
    const foco = (e: FocusEvent) => {
      const a = alvoDe(e.target, r);
      if (a && a.matches(":focus-visible")) setAberta(deElemento(a));
    };
    const semFoco = () => setAberta((x) => (x && !x.dedo ? null : x));

    // toque: segurar abre; deslizar segurando troca a dica; soltar fecha e não clica
    const apertar = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      const a = alvoDe(e.target, r);
      if (!a) return;
      inicio = { x: e.clientX, y: e.clientY };
      parar();
      timer = setTimeout(() => {
        segurando = true;
        navigator.vibrate?.(8);
        setAberta(noDedo(a, inicio!.x, inicio!.y));
      }, SEGURAR_MS);
    };
    const mover = (e: PointerEvent) => {
      if (e.pointerType !== "touch" || segurando || !inicio) return;
      // o dedo andou antes de completar o tempo: é rolagem, não dica
      if (Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y) > 8) parar();
    };
    const arrastar = (e: TouchEvent) => {
      if (!segurando) return;
      e.preventDefault();
      const t = e.touches[0];
      if (!t) return;
      const sob = alvoDe(document.elementFromPoint(t.clientX, t.clientY), r);
      setAberta((x) => (sob ? noDedo(sob, t.clientX, t.clientY) : x ? { ...x, x: t.clientX, y: t.clientY, base: t.clientY } : x));
    };
    const soltar = () => {
      parar();
      inicio = null;
      if (!segurando) return;
      segurando = false;
      setAberta(null);
      // o clique que vem depois de soltar não aciona o botão nem o link
      const engolir = (ev: Event) => {
        ev.preventDefault();
        ev.stopPropagation();
      };
      r.addEventListener("click", engolir, { capture: true, once: true });
      setTimeout(() => r.removeEventListener("click", engolir, { capture: true }), 450);
    };
    const menu = (e: Event) => {
      // o menu do aparelho (copiar o link…) que o toque longo abre
      if (segurando || alvoDe(e.target, r)) e.preventDefault();
    };
    // ao rolar, o balão do mouse acompanha o elemento (quando o elemento sai de baixo do mouse, o pointerout fecha)
    const rolar = () => setAberta((x) => (x && !x.dedo ? (x.onde.isConnected ? deElemento(x.onde as HTMLElement) : null) : x));

    r.addEventListener("pointerover", sobre);
    r.addEventListener("pointerout", fora);
    r.addEventListener("focusin", foco);
    r.addEventListener("focusout", semFoco);
    r.addEventListener("pointerdown", apertar);
    r.addEventListener("pointermove", mover);
    r.addEventListener("touchmove", arrastar, { passive: false });
    window.addEventListener("pointerup", soltar);
    window.addEventListener("pointercancel", soltar);
    r.addEventListener("contextmenu", menu);
    window.addEventListener("scroll", rolar, { passive: true, capture: true });
    return () => {
      parar();
      r.removeEventListener("pointerover", sobre);
      r.removeEventListener("pointerout", fora);
      r.removeEventListener("focusin", foco);
      r.removeEventListener("focusout", semFoco);
      r.removeEventListener("pointerdown", apertar);
      r.removeEventListener("pointermove", mover);
      r.removeEventListener("touchmove", arrastar);
      window.removeEventListener("pointerup", soltar);
      window.removeEventListener("pointercancel", soltar);
      r.removeEventListener("contextmenu", menu);
      window.removeEventListener("scroll", rolar, { capture: true });
    };
  }, [raiz]);

  // o balão não sai da tela: centrado no elemento, empurrado para dentro nas bordas; embaixo quando não cabe em cima
  useLayoutEffect(() => {
    const b = balao.current;
    if (!b || !aberta) return;
    const w = b.offsetWidth;
    const h = b.offsetHeight;
    const folga = aberta.dedo ? 44 : 10;
    const x = Math.min(Math.max(aberta.x, w / 2 + 8), window.innerWidth - w / 2 - 8);
    const emCima = aberta.y - folga - h >= 8;
    b.style.left = `${x}px`;
    b.style.top = `${emCima ? aberta.y - folga - h : aberta.base + 10}px`;
    b.dataset.lado = emCima ? "cima" : "baixo";
  }, [aberta]);

  if (!aberta) return null;
  // dentro da ficha da peça (um <dialog> modal), o balão vai para dentro dela: fora, ficaria atrás
  const destino = aberta.onde.closest("dialog[open]") ?? document.body;
  return createPortal(
    <div ref={balao} className={styles.balao} aria-hidden>
      <strong>{aberta.titulo}</strong>
      {aberta.mais.map((l, i) => (
        <span key={i}>{l}</span>
      ))}
    </div>,
    destino,
  );
}
