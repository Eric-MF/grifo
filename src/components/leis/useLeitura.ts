"use client";

import { type RefObject, useEffect, useRef, useState } from "react";
import { gravarLeitura, LEITURA_INICIAL, lerLeitura, type Leitura, proximaUnidade, registrarLeitura, TEMPO_LEITURA_MS } from "@/lib/leis/leitura";

/**
 * Acompanha a leitura da lei na tela. A unidade da vez conta quando fica visível por TEMPO_LEITURA_MS;
 * só a próxima da ordem pode contar, então os artigos são lidos do primeiro para o último.
 */
export function useLeitura(lei: string, folha: RefObject<HTMLElement | null>, ids: string[], rotulos: Record<string, string>): Leitura {
  const [leitura, setLeitura] = useState<Leitura>(LEITURA_INICIAL);
  const atual = useRef<Leitura>(LEITURA_INICIAL);
  const dados = useRef({ ids, rotulos });

  useEffect(() => {
    dados.current = { ids, rotulos };
  }, [ids, rotulos]);

  useEffect(() => {
    const l = lerLeitura(lei);
    atual.current = l;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lê o localStorage depois de montar (site estático)
    setLeitura(l);
  }, [lei]);

  useEffect(() => {
    const el = folha.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const visiveis = new Set<string>();
    let timer: number | undefined;
    let aguardando: string | null = null;

    const ajustar = () => {
      const prox = proximaUnidade(atual.current, dados.current.ids);
      if (timer !== undefined && aguardando === prox && prox !== null && visiveis.has(prox)) return;
      if (timer !== undefined) window.clearTimeout(timer);
      timer = undefined;
      aguardando = null;
      if (prox === null || !visiveis.has(prox)) return;
      aguardando = prox;
      timer = window.setTimeout(() => {
        timer = undefined;
        aguardando = null;
        if (proximaUnidade(atual.current, dados.current.ids) === prox && visiveis.has(prox)) {
          const nova = registrarLeitura(atual.current, dados.current.ids, prox, dados.current.rotulos);
          atual.current = nova;
          gravarLeitura(lei, nova);
          setLeitura(nova);
        }
        ajustar();
      }, TEMPO_LEITURA_MS);
    };

    // visível: pelo menos metade da unidade (ou metade da tela, se ela for maior que a tela) está na tela
    const io = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          const id = (e.target as HTMLElement).dataset.disp;
          if (!id) continue;
          const metade = Math.min(e.boundingClientRect.height, window.innerHeight) * 0.5;
          if (e.isIntersecting && e.intersectionRect.height >= metade) visiveis.add(id);
          else visiveis.delete(id);
        }
        ajustar();
      },
      { threshold: [0, 0.5, 1] },
    );

    const observados = new WeakSet<Element>();
    const observar = () => {
      for (const u of el.querySelectorAll<HTMLElement>('[data-disp][data-sup="0"]')) {
        if (observados.has(u)) continue;
        observados.add(u);
        io.observe(u);
      }
    };
    observar();
    // o restante da lei entra aos poucos, depois do primeiro render: cada parte nova também é observada
    const mo = new MutationObserver(observar);
    mo.observe(el, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      io.disconnect();
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [lei, folha]);

  return leitura;
}
