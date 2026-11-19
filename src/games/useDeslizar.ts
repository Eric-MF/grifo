"use client";
// Segurar e deslizar por uma grade de itens (os personagens e os poderes do menu): o dedo fica parado um instante e
// depois anda pelos itens, mostrando cada um (a `previa`); ao soltar sobre um item, ele é escolhido; soltar fora da
// grade volta ao que estava. Antes do instante parado, andar com o dedo é rolagem comum. Com o mouse, segurar o botão e
// arrastar faz o mesmo, e (com `aoPassar`) só passar por cima já mostra o item.

import { useEffect, useRef, useState, type PointerEvent as EventoPonteiro } from "react";

/** Quanto tempo o dedo fica parado para começar a deslizar, e quanto pode andar antes (aí é rolagem). */
const SEGURAR_MS = 260;
const TOLERANCIA_PX = 9;

interface Opcoes {
  /** o atributo `data-*` que cada item da grade leva, com o id ("personagem" para `data-personagem`) */
  atributo: string;
  /** soltou o dedo sobre o item `id` */
  onSoltar: (id: string) => void;
  /** com o mouse, passar por cima já mostra o item (sem segurar) */
  aoPassar?: boolean;
}

export function useDeslizar({ atributo, onSoltar, aoPassar = false }: Opcoes) {
  const ref = useRef<HTMLDivElement>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  // onde fica o balão do item sob o dedo (calculado nos eventos, não no desenho)
  const [balao, setBalao] = useState<{ left: number; top: number } | null>(null);
  const [deslizando, setDeslizando] = useState(false);
  const gesto = useRef<{ id: number; x: number; y: number; ativo: boolean; timer: number } | null>(null);
  const ignorarClique = useRef(false);
  const soltarRef = useRef(onSoltar);
  useEffect(() => {
    soltarRef.current = onSoltar;
  }, [onSoltar]);

  const idNoPonto = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>(`[data-${atributo}]`);
    return el && ref.current?.contains(el) ? (el.getAttribute(`data-${atributo}`) ?? null) : null;
  };

  // enquanto desliza, o dedo não rola a página (o toque já começou: só dá para barrar no touchmove, não passivo)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const barrar = (ev: TouchEvent) => {
      if (gesto.current?.ativo) ev.preventDefault();
    };
    el.addEventListener("touchmove", barrar, { passive: false });
    return () => el.removeEventListener("touchmove", barrar);
  }, []);
  useEffect(() => () => window.clearTimeout(gesto.current?.timer), []);

  const mostrar = (id: string | null) => {
    setPrevia(id);
    setBalao(posicaoDoBalao(ref.current, atributo, id));
  };
  const terminar = () => {
    if (gesto.current) window.clearTimeout(gesto.current.timer);
    gesto.current = null;
    setDeslizando(false);
    mostrar(null);
  };

  const handlers = {
    onPointerDown(e: EventoPonteiro<HTMLDivElement>) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const g = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        ativo: false,
        timer: window.setTimeout(() => {
          g.ativo = true;
          setDeslizando(true);
          mostrar(idNoPonto(g.x, g.y));
          navigator.vibrate?.(8);
          try {
            ref.current?.setPointerCapture(g.id);
          } catch {
            /* o ponteiro já saiu */
          }
        }, SEGURAR_MS),
      };
      gesto.current = g;
    },
    onPointerMove(e: EventoPonteiro<HTMLDivElement>) {
      const g = gesto.current;
      if (!g || g.id !== e.pointerId) {
        if (aoPassar && e.pointerType === "mouse" && !g) mostrar(idNoPonto(e.clientX, e.clientY));
        return;
      }
      if (!g.ativo) {
        // andou antes de segurar: é rolagem
        if (Math.hypot(e.clientX - g.x, e.clientY - g.y) > TOLERANCIA_PX) {
          window.clearTimeout(g.timer);
          gesto.current = null;
        }
        return;
      }
      g.x = e.clientX;
      g.y = e.clientY;
      mostrar(idNoPonto(e.clientX, e.clientY));
    },
    onPointerUp(e: EventoPonteiro<HTMLDivElement>) {
      const g = gesto.current;
      if (!g || g.id !== e.pointerId) return;
      window.clearTimeout(g.timer);
      if (g.ativo) {
        // o clique que vem depois do soltar não escolhe de novo
        ignorarClique.current = true;
        const id = idNoPonto(e.clientX, e.clientY);
        if (id) soltarRef.current(id);
      }
      terminar();
    },
    onPointerCancel: terminar,
    onPointerLeave(e: EventoPonteiro<HTMLDivElement>) {
      if (e.pointerType === "mouse" && !gesto.current) mostrar(null);
    },
    onContextMenu(e: { preventDefault: () => void }) {
      e.preventDefault();
    },
  };

  /** O clique que vem logo depois de soltar o deslizar: não conta (devolve true para ignorar). */
  const consumirClique = () => {
    if (!ignorarClique.current) return false;
    ignorarClique.current = false;
    return true;
  };

  return { ref, previa, balao: deslizando ? balao : null, deslizando, handlers, consumirClique };
}

/**
 * Onde pôr o balão do item `id` da grade, em coordenadas da grade: centrado acima dele, sem sair dos lados (`meia`
 * é metade da largura do balão).
 */
export function posicaoDoBalao(grade: HTMLElement | null, atributo: string, id: string | null, meia = 130): { left: number; top: number } | null {
  if (!grade || !id) return null;
  const el = grade.querySelector<HTMLElement>(`[data-${atributo}="${CSS.escape(id)}"]`);
  if (!el) return null;
  const largura = grade.clientWidth;
  const centro = el.offsetLeft + el.offsetWidth / 2;
  return { left: Math.max(Math.min(meia, largura / 2), Math.min(largura - Math.min(meia, largura / 2), centro)), top: el.offsetTop - 6 };
}
