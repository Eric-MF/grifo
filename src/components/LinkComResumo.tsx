"use client";

// Os links do cabeçalho com resumo: com o mouse por cima (ou o foco do teclado), abrem um cartão compacto com o que
// importa daquela área (o desempenho em "Estatísticas", a prova mais recente em "Provas", a lei em que a pessoa parou
// no "Vade Mecum"…). Cada resumo é carregado só na primeira vez. No toque, é só o link. O clique navega na hora: ele
// desarma o cartão que ia abrir e fecha o aberto, e a barrinha sob o rótulo mostra que a página está vindo.
import Link from "next/link";
import { lazy, Suspense, useEffect, useRef, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { RotuloComIndicador } from "./IndicadorNavegacao";
import styles from "./ResumoDesempenho.module.css";

export type TipoResumo = "provas" | "simulados" | "estatisticas" | "leis" | "jogos" | "curso";
export interface PropsResumo {
  onSair: () => void;
  totalSimulados: number;
}

const RESUMOS: Record<TipoResumo, { componente: ComponentType<PropsResumo>; rotulo: string }> = {
  provas: { componente: lazy(() => import("./resumos/ResumoProvas")), rotulo: "Resumo das provas" },
  simulados: { componente: lazy(() => import("./resumos/ResumoSimulados")), rotulo: "Resumo dos seus simulados" },
  estatisticas: { componente: lazy(() => import("./ResumoDesempenho")), rotulo: "Resumo do seu desempenho" },
  leis: { componente: lazy(() => import("./resumos/ResumoLeis")), rotulo: "Resumo do Vade Mecum" },
  jogos: { componente: lazy(() => import("./resumos/ResumoJogos")), rotulo: "Resumo dos jogos" },
  curso: { componente: lazy(() => import("./resumos/ResumoCurso")), rotulo: "Sobre o curso" },
};
const LARGURA = 340;

export function LinkComResumo({ href, label, className, tipo, totalSimulados }: { href: string; label: string; className?: string; tipo: TipoResumo; totalSimulados: number }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const link = useRef<HTMLAnchorElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { componente: Resumo, rotulo } = RESUMOS[tipo];

  const limpar = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const abrir = () => {
    const r = link.current?.getBoundingClientRect();
    if (!r) return;
    setPos({ x: Math.min(Math.max(8, r.left + r.width / 2 - LARGURA / 2), window.innerWidth - LARGURA - 8), y: r.bottom + 8 });
  };
  const abrirDepois = () => {
    limpar();
    timer.current = setTimeout(abrir, 160);
  };
  const fecharDepois = () => {
    limpar();
    timer.current = setTimeout(() => setPos(null), 220);
  };
  // o clique (ou o toque) leva à página: o cartão que ia abrir não abre mais, e o aberto fecha
  const fecharJa = () => {
    limpar();
    setPos(null);
  };

  useEffect(() => {
    if (!pos) return;
    const fechar = () => setPos(null);
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    window.addEventListener("scroll", fechar, { passive: true });
    window.addEventListener("keydown", tecla);
    return () => {
      window.removeEventListener("scroll", fechar);
      window.removeEventListener("keydown", tecla);
    };
  }, [pos]);
  useEffect(() => limpar, []);

  return (
    <>
      <Link
        ref={link}
        href={href}
        className={className}
        onPointerEnter={(e) => e.pointerType === "mouse" && abrirDepois()}
        onPointerLeave={(e) => e.pointerType === "mouse" && fecharDepois()}
        onFocus={(e) => e.currentTarget.matches(":focus-visible") && abrir()}
        // o foco que vai para dentro do cartão (Tab) não o fecha
        onBlur={(e) => !(e.relatedTarget instanceof Element && e.relatedTarget.closest(`.${styles.cartao}`)) && setPos(null)}
        onPointerDown={fecharJa}
        onClick={fecharJa}
      >
        <RotuloComIndicador>{label}</RotuloComIndicador>
      </Link>
      {pos &&
        createPortal(
          <div
            className={styles.cartao}
            style={{ left: pos.x, top: pos.y, width: LARGURA }}
            onPointerEnter={limpar}
            onPointerLeave={fecharDepois}
            role="dialog"
            aria-label={rotulo}
          >
            <Suspense fallback={<p className={styles.carregando}>Lendo os seus dados…</p>}>
              <Resumo totalSimulados={totalSimulados} onSair={() => setPos(null)} />
            </Suspense>
          </div>,
          document.body,
        )}
    </>
  );
}
