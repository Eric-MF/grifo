"use client";
// Miniatura do personagem, desenhada com o mesmo código do jogo e no estilo escolhido. O tamanho na tela vem do CSS
// (`className`); o canvas tem 72×64 pontos lógicos, na densidade da tela.
import { useEffect, useRef } from "react";

export function Retrato({ desenhar, estilo, className }: { desenhar: (c: CanvasRenderingContext2D, estilo: string) => void; estilo: string; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    const c = cv?.getContext("2d");
    if (!cv || !c) return;
    const dpr = Math.max(2, window.devicePixelRatio || 1);
    cv.width = 72 * dpr;
    cv.height = 64 * dpr;
    c.setTransform(dpr * 0.6, 0, 0, dpr * 0.6, 36 * dpr, 34 * dpr);
    desenhar(c, estilo);
  }, [desenhar, estilo]);
  return <canvas ref={ref} className={className} width={72} height={64} aria-hidden />;
}
