"use client";

import { useEffect, useRef, useState } from "react";
import { copiarTexto } from "@/lib/copiar";
import styles from "./diagSelecao.module.css";

// Diagnóstico da rolagem por seleção (Fase 0). Só aparece no servidor de desenvolvimento e com ?diagSelecao=1.
// Não altera nada: só observa os eventos e registra o que o leitor vê (alças, zona, posição, altura da tela).
const LIMITE_LINHAS = 1500;
const LIMITE_ALCA = 56;
const arredonda = (n: number) => Math.round(n);

// Os mesmos cálculos da rolagem por seleção do leitor (ver Leitor.tsx): zona, velocidade e distância da alça.
function limites(y: number | null): { topo: number; fundo: number; zona: number; vel: number | null } {
  const topoEls: (Element | null)[] = [document.querySelector("header"), ...Array.from(document.querySelectorAll('[class*="secaoAtual"], [class*="nomeLei"]'))];
  const topo = Math.max(0, ...topoEls.map((el) => (el ? el.getBoundingClientRect().bottom : 0)));
  const dock = document.querySelector('nav[aria-label="Controles de leitura"]');
  const fundo = Math.min(window.innerHeight, dock ? dock.getBoundingClientRect().top : window.innerHeight);
  const zona = Math.max(110, (fundo - topo) * 0.28);
  let vel: number | null = null;
  if (y !== null) {
    if (y < topo + zona) vel = -24 * Math.min(1, (topo + zona - y) / zona);
    else if (y > fundo - zona) vel = 24 * Math.min(1, (y - (fundo - zona)) / zona);
    else vel = 0;
  }
  return { topo: arredonda(topo), fundo: arredonda(fundo), zona: arredonda(zona), vel: vel === null ? null : Math.round(vel * 10) / 10 };
}

function alca(x: number, y: number): string {
  const sel = getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return "sel=0";
  const r = sel.getRangeAt(0);
  const ini = document.createRange();
  ini.setStart(r.startContainer, r.startOffset);
  ini.collapse(true);
  const fim = document.createRange();
  fim.setEnd(r.endContainer, r.endOffset);
  fim.collapse(false);
  const a = ini.getBoundingClientRect();
  const b = fim.getBoundingClientRect();
  const dA = Math.hypot(x - a.left, y - a.bottom);
  const dB = Math.hypot(x - b.left, y - b.bottom);
  const perto = Math.min(dA, dB) <= LIMITE_ALCA;
  return `alca=${perto ? "sim" : "nao"} dA=${arredonda(dA)} dB=${arredonda(dB)} ponta=${dB <= dA ? "fim" : "ini"} ca=(${arredonda(a.left)},${arredonda(a.bottom)}) cb=(${arredonda(b.left)},${arredonda(b.bottom)}) sel=${sel.toString().length}`;
}

export function DiagSelecao() {
  const [ativo, setAtivo] = useState(false);
  const [aberto, setAberto] = useState(true);
  const [saida, setSaida] = useState("");
  const [marcador, setMarcador] = useState("");
  const [aviso, setAviso] = useState("");
  const linhas = useRef<string[]>([]);
  const caixaRef = useRef<HTMLTextAreaElement>(null);
  const mudou = useRef(false);

  // liga só depois de montar, e só com o parâmetro na URL (e fora da versão de produção)
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (!/[?&]diagSelecao=1/.test(window.location.search)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- liga o diagnóstico depois de montar (só com o parâmetro)
    setAtivo(true);
  }, []);

  useEffect(() => {
    if (!ativo) return;
    const t0 = performance.now();
    const agora = () => Math.round(performance.now() - t0);
    const escrever = (linha: string) => {
      linhas.current.push(`${String(agora()).padStart(6)} ${linha}`);
      if (linhas.current.length > LIMITE_LINHAS) linhas.current.splice(0, linhas.current.length - LIMITE_LINHAS);
      mudou.current = true;
    };
    const ignorar = (alvo: EventTarget | null) => alvo instanceof Element && !!alvo.closest("[data-diag]");
    const vv = () => (window.visualViewport ? `${Math.round(window.visualViewport.height)}@${Math.round(window.visualViewport.offsetTop)}` : "-");

    escrever(
      `inicio ua="${navigator.userAgent}" dpr=${window.devicePixelRatio} iW=${window.innerWidth} iH=${window.innerHeight} vv=${vv()} caretRange=${typeof document.caretRangeFromPoint === "function" ? "sim" : "nao"} caretPos=${typeof document.caretPositionFromPoint === "function" ? "sim" : "nao"}`,
    );

    let emToque = false;
    let ultimoMove = 0;
    const aoTocar = (tipo: string) => (e: TouchEvent) => {
      if (ignorar(e.target)) return;
      if (tipo === "touchstart") emToque = true;
      if (tipo === "touchmove") {
        if (performance.now() - ultimoMove < 80) return;
        ultimoMove = performance.now();
      }
      const t = e.touches[0] ?? e.changedTouches[0];
      const y = t ? t.clientY : null;
      const lim = limites(y);
      const detalhe = t ? alca(t.clientX, t.clientY) : "";
      escrever(
        `${tipo} n=${e.touches.length}${t ? ` x=${arredonda(t.clientX)} y=${arredonda(t.clientY)}` : ""} ${detalhe} topo=${lim.topo} fundo=${lim.fundo} zona=${lim.zona} vel=${lim.vel} sY=${Math.round(window.scrollY)} iH=${window.innerHeight} vv=${vv()}`,
      );
      if (tipo === "touchend" || tipo === "touchcancel") emToque = false;
    };
    const aoSoltarPonteiro = (e: PointerEvent) => {
      if (!ignorar(e.target)) escrever(`pointercancel tipo=${e.pointerType}`);
    };
    let ultimoScroll = 0;
    const aoRolar = () => {
      if (performance.now() - ultimoScroll < 150) return;
      ultimoScroll = performance.now();
      escrever(`scroll sY=${Math.round(window.scrollY)} iH=${window.innerHeight} vv=${vv()}`);
    };
    let ultimaSelecao = 0;
    const aoSelecionar = () => {
      if (performance.now() - ultimaSelecao < 150) return;
      ultimaSelecao = performance.now();
      const sel = getSelection();
      escrever(`selecao len=${sel ? sel.toString().length : 0} colapsada=${sel ? sel.isCollapsed : "-"} sY=${Math.round(window.scrollY)}`);
    };
    const aoRedimensionar = () => escrever(`resize iW=${window.innerWidth} iH=${window.innerHeight} vv=${vv()}`);
    const aoVisibilidade = () => escrever(`visibilidade ${document.visibilityState}`);

    // taxa de quadros, registrada a cada segundo enquanto há um toque
    let quadros = 0;
    let rafId = 0;
    const quadro = () => {
      quadros++;
      rafId = requestAnimationFrame(quadro);
    };
    rafId = requestAnimationFrame(quadro);
    const fpsTimer = window.setInterval(() => {
      if (emToque) escrever(`fps ${quadros}`);
      quadros = 0;
    }, 1000);

    const opcoes = { capture: true, passive: true } as const;
    const touchstart = aoTocar("touchstart");
    const touchmove = aoTocar("touchmove");
    const touchend = aoTocar("touchend");
    const touchcancel = aoTocar("touchcancel");
    document.addEventListener("touchstart", touchstart, opcoes);
    document.addEventListener("touchmove", touchmove, opcoes);
    document.addEventListener("touchend", touchend, opcoes);
    document.addEventListener("touchcancel", touchcancel, opcoes);
    document.addEventListener("pointercancel", aoSoltarPonteiro, opcoes);
    document.addEventListener("selectionchange", aoSelecionar);
    window.addEventListener("scroll", aoRolar, { passive: true });
    window.addEventListener("resize", aoRedimensionar);
    document.addEventListener("visibilitychange", aoVisibilidade);

    const descarga = window.setInterval(() => {
      if (mudou.current) {
        mudou.current = false;
        setSaida(linhas.current.join("\n"));
      }
    }, 300);

    return () => {
      document.removeEventListener("touchstart", touchstart, opcoes);
      document.removeEventListener("touchmove", touchmove, opcoes);
      document.removeEventListener("touchend", touchend, opcoes);
      document.removeEventListener("touchcancel", touchcancel, opcoes);
      document.removeEventListener("pointercancel", aoSoltarPonteiro, opcoes);
      document.removeEventListener("selectionchange", aoSelecionar);
      window.removeEventListener("scroll", aoRolar);
      window.removeEventListener("resize", aoRedimensionar);
      document.removeEventListener("visibilitychange", aoVisibilidade);
      window.clearInterval(fpsTimer);
      window.clearInterval(descarga);
      cancelAnimationFrame(rafId);
    };
  }, [ativo]);

  if (!ativo) return null;
  return (
    <div data-diag>
      <button type="button" data-diag className={styles.botao} onClick={() => setAberto((a) => !a)}>
        diag
      </button>
      {aberto && (
        <div className={styles.painel} data-diag>
          <div className={styles.linha}>
            <strong className={styles.titulo}>Diagnóstico</strong>
            <button type="button" data-diag onClick={() => setAberto(false)}>
              Recolher
            </button>
          </div>
          <div className={styles.linha}>
            <input data-diag value={marcador} onChange={(e) => setMarcador(e.target.value)} placeholder="nome do cenário" />
            <button
              type="button"
              data-diag
              onClick={() => {
                linhas.current.push(`---- ${marcador || "marca"} ----`);
                mudou.current = true;
                setMarcador("");
              }}
            >
              Marcar
            </button>
            <button
              type="button"
              data-diag
              onClick={async () => {
                const ok = await copiarTexto(linhas.current.join("\n"));
                if (ok) {
                  setAviso(`Copiado: ${linhas.current.length} linhas.`);
                } else {
                  // sem acesso à área de transferência: seleciona o texto da caixa para o menu do celular copiar
                  caixaRef.current?.select();
                  setAviso("Não consegui copiar sozinho. O texto da caixa foi selecionado: toque nele e escolha Copiar.");
                }
              }}
            >
              Copiar tudo
            </button>
            <button
              type="button"
              data-diag
              onClick={() => {
                linhas.current = [];
                mudou.current = true;
                setSaida("");
              }}
            >
              Limpar
            </button>
          </div>
          <textarea ref={caixaRef} data-diag readOnly value={saida} />
          {aviso && <p className={styles.nota} role="status">{aviso}</p>}
          <p className={styles.nota}>Segure no texto para copiar tudo e mande para análise.</p>
        </div>
      )}
    </div>
  );
}
