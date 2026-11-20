"use client";

// Os botões das barras da leitura em voz alta (o Ouvir do Vade Mecum e o microfone do treino) com gestos: o toque, os
// dois toques, segurar (abre o menu do botão: deslizar o dedo até um item e soltar o escolhe; soltar parado deixa o menu
// aberto, para tocar) e deslizar (a velocidade, o volume, andar pelos trechos), com um balão acima do dedo mostrando o que
// vai acontecer. O que cada toque fez aparece num balão; nas primeiras vezes, ele diz também os outros gestos do botão.
// Com o mouse, o botão direito abre o menu; com o teclado, a tecla de menu (ou Shift+F10). A máquina dos gestos é
// src/lib/gestos.ts.
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as EventoTecla, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Gesto, type Eixo, type EventoGesto } from "@/lib/gestos";
import { gravarJSON, lerJSON } from "@/lib/storage";
import css from "./botaoGesto.module.css";

/** Um item do menu de segurar. Com `grupo`, os itens do grupo ficam lado a lado, como opções; `marcado`: o escolhido. */
export interface ItemDoMenu {
  id: string;
  rotulo: string;
  grupo?: string;
  marcado?: boolean;
  desativado?: boolean;
  fazer: () => void;
}

/** O texto do balão: uma linha, ou com o detalhe embaixo. */
export type TextoDoBalao = string | { texto: string; detalhe?: string };

export interface Deslizar {
  eixo: Eixo | "xy";
  passoPx?: number;
  /** o dedo começou a deslizar (guarde o valor de partida) */
  comecar?: () => void;
  /** o texto do balão enquanto desliza */
  previa: (eixo: Eixo, passos: number) => TextoDoBalao;
  /** soltou depois de andar `passos`; o texto devolvido aparece no balão */
  aplicar: (eixo: Eixo, passos: number) => Retorno;
}

/** Onde os balões e os menus aparecem: uma camada dentro da barra (assim eles herdam as cores dela). */
export const CamadaDosGestos = createContext<HTMLElement | null>(null);

/** A camada dos balões, posta dentro da barra (que precisa ser `position: fixed` ou `relative`). */
export function Camada({ aoMontar }: { aoMontar: (el: HTMLDivElement | null) => void }) {
  return <div ref={aoMontar} className={css.camada} />;
}

const CHAVE_DICAS = "grifo:gestos:dicas";
/** Quantas vezes o balão de cada botão diz os outros gestos dele. */
const VEZES_DA_DICA = 3;
const BALAO_MS = 1600;
const DICA_MS = 3200;

type Retorno = string | void;

/** Um balão (ou menu) aberto por vez, em todas as barras: o de outro botão fecha quando um abre. */
let abertoAgora: { dono: string; fechar: () => void } | null = null;
function abrirSo(dono: string, fechar: () => void) {
  if (abertoAgora && abertoAgora.dono !== dono) abertoAgora.fechar();
  abertoAgora = { dono, fechar };
}

/** Onde fica o balão (ou o menu), na camada: acima do botão, centrado no dedo (ou no botão). */
interface Posicao {
  left: number;
  bottom: number;
}

interface Balao {
  texto: string;
  detalhe?: string;
  pos: Posicao;
  /** some sozinho (o do deslizar fica enquanto o dedo anda) */
  some: boolean;
  dica?: string;
}

interface Menu {
  itens: ItemDoMenu[];
  pos: Posicao;
  /** o item sob o dedo (segurando) */
  foco: string | null;
  porTeclado: boolean;
}

export function BotaoGesto({
  id,
  rotulo,
  dica,
  legenda,
  className,
  pressionado,
  atributos,
  desativado,
  aoToque,
  aoDuplo,
  menu,
  deslizar,
  children,
}: {
  /** o nome do botão, para contar as vezes em que a dica apareceu */
  id: string;
  rotulo: string;
  /** os outros gestos do botão ("Dois toques: do começo · Segure: mais opções") */
  dica?: string;
  legenda?: string;
  className?: string;
  pressionado?: boolean;
  atributos?: Record<string, string | undefined>;
  desativado?: boolean;
  /** o toque; o texto devolvido aparece no balão */
  aoToque: () => Retorno;
  aoDuplo?: () => Retorno;
  menu?: { titulo: string; itens: () => ItemDoMenu[] };
  deslizar?: Deslizar;
  children: ReactNode;
}) {
  const botao = useRef<HTMLButtonElement>(null);
  const camada = useContext(CamadaDosGestos);
  const camadaRef = useRef(camada);
  useEffect(() => {
    camadaRef.current = camada;
  }, [camada]);
  const [balao, setBalao] = useState<Balao | null>(null);
  const [aberto, setAberto] = useState<Menu | null>(null);
  const abertoRef = useRef<Menu | null>(null);
  useEffect(() => {
    abertoRef.current = aberto;
  }, [aberto]);
  // os de agora (o gesto é criado uma vez; o que ele chama muda a cada desenho)
  const atual = useRef({ aoToque, aoDuplo, menu, deslizar, dica });
  const deslizando = useRef(false);
  useEffect(() => {
    atual.current = { aoToque, aoDuplo, menu, deslizar, dica };
  });

  // a posição é medida no evento (o desenho só a usa): acima da barra inteira (sem cobrir o que ela diz), no dedo
  const posicao = (x?: number): Posicao => {
    const r = botao.current?.getBoundingClientRect();
    const cx = x ?? (r ? r.left + r.width / 2 : 0);
    const c = camadaRef.current?.getBoundingClientRect();
    if (!c) return { left: cx, bottom: r ? window.innerHeight - r.top + 8 : 0 };
    return { left: cx - c.left, bottom: c.height + 8 };
  };
  const fecharTudo = useRef(() => {
    setBalao(null);
    setAberto(null);
  });
  const abrir = () => abrirSo(id, fecharTudo.current);
  const mostrar = (texto: Retorno, comDica = true) => {
    const d = atual.current.dica;
    const vistas = lerJSON<Record<string, number>>(CHAVE_DICAS, {});
    const vezes = vistas[id] ?? 0;
    const daDica = comDica && !!d && vezes < VEZES_DA_DICA;
    if (daDica) gravarJSON(CHAVE_DICAS, { ...vistas, [id]: vezes + 1 });
    if (!texto && !daDica) return setBalao(null);
    abrir();
    setBalao({ texto: texto || rotulo, pos: posicao(), some: true, dica: daDica ? d : undefined });
  };
  const abrirMenu = (porTeclado: boolean) => {
    const m = atual.current.menu;
    if (!m) return;
    setBalao(null);
    abrir();
    setAberto({ itens: m.itens(), pos: posicao(), foco: null, porTeclado });
  };
  const fecharMenu = (devolverFoco = false) => {
    setAberto(null);
    if (devolverFoco) botao.current?.focus();
  };
  const escolher = (it: ItemDoMenu | undefined) => {
    if (!it || it.desativado) return;
    setAberto(null);
    it.fazer();
  };
  const itemNoPonto = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-item-menu]");
    return el && el.dataset.dono === id ? (el.dataset.itemMenu ?? null) : null;
  };

  const tratar = (e: EventoGesto) => {
    const a = atual.current;
    switch (e.tipo) {
      case "toque":
        return mostrar(a.aoToque());
      case "duplo":
        if (a.aoDuplo) mostrar(a.aoDuplo(), false);
        return;
      case "segurou":
        navigator.vibrate?.(10);
        return abrirMenu(false);
      case "moveuSegurando": {
        const foco = itemNoPonto(e.x, e.y);
        setAberto((m) => (m && m.foco !== foco ? { ...m, foco } : m));
        return;
      }
      case "soltouSegurando": {
        const m = abertoRef.current;
        const foco = itemNoPonto(e.x, e.y);
        if (m && foco) return escolher(m.itens.find((it) => it.id === foco));
        // soltou parado: o menu fica aberto, para tocar; soltou fora dele depois de andar: fecha
        if (e.moveu) setAberto(null);
        return;
      }
      case "deslizou": {
        if (!a.deslizar) return;
        if (!deslizando.current) {
          deslizando.current = true;
          a.deslizar.comecar?.();
        }
        const t = a.deslizar.previa(e.eixo, e.passos);
        abrir();
        return setBalao({ ...(typeof t === "string" ? { texto: t } : t), pos: posicao(e.x), some: false });
      }
      case "soltouDeslizando": {
        deslizando.current = false;
        const feito = a.deslizar && e.passos ? a.deslizar.aplicar(e.eixo, e.passos) : undefined;
        if (feito) abrir();
        return setBalao(feito ? { texto: feito, pos: posicao(), some: true } : null);
      }
      case "cancelou":
        deslizando.current = false;
        return setBalao((b) => (b && !b.some ? null : b));
    }
  };
  const tratarRef = useRef(tratar);
  useEffect(() => {
    tratarRef.current = tratar;
  });
  const gesto = useRef<Gesto | null>(null);
  const opcoes = { duplo: !!aoDuplo, segurar: !!menu, deslizar: deslizar?.eixo ?? null, passoPx: deslizar?.passoPx };
  useEffect(() => {
    const g = new Gesto({}, (e) => tratarRef.current(e));
    gesto.current = g;
    return () => {
      g.destruir();
      gesto.current = null;
    };
  }, []);
  useEffect(() => {
    gesto.current?.configurar(opcoes);
  });

  // o balão some sozinho
  useEffect(() => {
    if (!balao?.some) return;
    const t = window.setTimeout(() => setBalao(null), balao.dica ? DICA_MS : BALAO_MS);
    return () => window.clearTimeout(t);
  }, [balao]);
  // o menu aberto fecha com um toque fora dele, com o Esc ou se a página rolar
  useEffect(() => {
    if (!aberto) return;
    const fora = (ev: PointerEvent) => {
      const alvo = ev.target as Element | null;
      if (alvo?.closest?.(`[data-menu-de="${id}"]`) || botao.current?.contains(alvo)) return;
      setAberto(null);
    };
    const tecla = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        fecharMenu(true);
      }
    };
    document.addEventListener("pointerdown", fora, true);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fora, true);
      document.removeEventListener("keydown", tecla);
    };
  }, [aberto, id]);
  const menuEl = useRef<HTMLDivElement>(null);
  const balaoEl = useRef<HTMLDivElement>(null);
  // o menu aberto pelo teclado começa no primeiro item
  useEffect(() => {
    if (aberto?.porTeclado) menuEl.current?.querySelector<HTMLButtonElement>("[data-item-menu]:not(:disabled)")?.focus();
  }, [aberto?.porTeclado]);
  // o balão e o menu não saem da tela: o que passaria da borda anda para dentro
  useLayoutEffect(() => {
    for (const el of [menuEl.current, balaoEl.current]) {
      if (!el) continue;
      el.style.translate = "";
      const r = el.getBoundingClientRect();
      const dentro = r.left < 8 ? 8 - r.left : r.right > window.innerWidth - 8 ? window.innerWidth - 8 - r.right : 0;
      if (dentro) el.style.translate = `${dentro}px 0`;
    }
  });

  const ancora = camada ?? (typeof document === "undefined" ? null : document.body);

  const grupos: { nome?: string; itens: ItemDoMenu[] }[] = [];
  for (const it of aberto?.itens ?? []) {
    const g = grupos.at(-1);
    if (g && g.nome === it.grupo) g.itens.push(it);
    else grupos.push({ nome: it.grupo, itens: [it] });
  }
  const andarNoMenu = (ev: EventoTecla) => {
    if (!["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End"].includes(ev.key)) return;
    ev.preventDefault();
    const lista = [...(menuEl.current?.querySelectorAll<HTMLButtonElement>("[data-item-menu]:not(:disabled)") ?? [])];
    const k = lista.indexOf(document.activeElement as HTMLButtonElement);
    const n = ev.key === "Home" ? 0 : ev.key === "End" ? lista.length - 1 : k + (ev.key === "ArrowDown" || ev.key === "ArrowRight" ? 1 : -1);
    lista[(n + lista.length) % lista.length]?.focus();
  };

  return (
    <>
      <button
        ref={botao}
        type="button"
        className={`${css.botao} ${className ?? ""}`}
        aria-label={rotulo}
        title={dica ? `${rotulo} · ${dica}` : rotulo}
        aria-pressed={pressionado}
        aria-haspopup={menu ? "menu" : undefined}
        aria-expanded={menu ? !!aberto : undefined}
        disabled={desativado}
        {...atributos}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // o ponteiro já saiu
          }
          gesto.current?.apertar(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => gesto.current?.mover(e.clientX, e.clientY)}
        onPointerUp={(e) => gesto.current?.soltar(e.clientX, e.clientY)}
        onPointerCancel={() => gesto.current?.cancelar()}
        onClick={(e) => {
          // o clique do toque já foi tratado pelo gesto; o do teclado (Enter, espaço) chega sem ponteiro (detail 0)
          if (e.detail !== 0) return;
          mostrar(aoToque());
        }}
        onContextMenu={(e) => {
          // no Android, segurar também abre o menu do navegador: o do botão já abriu pelo gesto
          e.preventDefault();
          if (!menu || abertoRef.current) return;
          const tocando = (e.nativeEvent as PointerEvent).pointerType === "touch";
          if (!tocando) abrirMenu(e.button !== 2);
        }}
      >
        {children}
        {legenda && <span className={css.legenda}>{legenda}</span>}
      </button>
      {ancora &&
        balao &&
        !aberto &&
        createPortal(
          <div ref={balaoEl} className={css.balao} style={balao.pos} data-ouvir role="status">
            <strong>{balao.texto}</strong>
            {balao.detalhe && <span className={css.detalhe}>{balao.detalhe}</span>}
            {balao.dica && <small>{balao.dica}</small>}
          </div>,
          ancora,
        )}
      {ancora &&
        aberto &&
        menu &&
        createPortal(
          <div ref={menuEl} className={css.menu} style={aberto.pos} role="menu" aria-label={menu.titulo} data-menu-de={id} data-ouvir onKeyDown={andarNoMenu}>
            <p className={css.titulo}>{menu.titulo}</p>
            {grupos.map((g, k) => (
              <div key={k} className={g.nome ? css.grupo : css.acoes} role="group" aria-label={g.nome}>
                {g.nome && <span className={css.nomeGrupo}>{g.nome}</span>}
                <div className={g.nome ? css.opcoes : css.lista}>
                  {g.itens.map((it) => (
                    <button
                      key={it.id}
                      type="button"
                      role={it.marcado === undefined ? "menuitem" : "menuitemradio"}
                      aria-checked={it.marcado}
                      data-item-menu={it.id}
                      data-dono={id}
                      data-foco={aberto.foco === it.id ? "1" : undefined}
                      disabled={it.desativado}
                      onClick={() => escolher(it)}
                    >
                      {it.rotulo}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {dica && <p className={css.dicaMenu}>{dica}</p>}
          </div>,
          ancora,
        )}
    </>
  );
}

/**
 * O som que o microfone ouve, em volta do ícone: o anel cresce com a voz. Sem a medida do navegador (no celular), ele
 * acompanha o que o reconhecimento percebe (som, fala, palavras chegando).
 */
export function AnelDoSom({ nivel, ativo }: { nivel: () => number | null; ativo: boolean }) {
  const anel = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = anel.current;
    if (!el) return;
    if (!ativo) {
      el.style.setProperty("--som", "0");
      return;
    }
    let quadro = 0;
    let v = 0;
    const passo = () => {
      const n = nivel() ?? 0;
      // sobe depressa e desce devagar, como um medidor de som
      v += (n - v) * (n > v ? 0.55 : 0.1);
      el.style.setProperty("--som", v.toFixed(3));
      quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [nivel, ativo]);
  return <span ref={anel} className={css.anel} data-ativo={ativo ? "1" : undefined} aria-hidden />;
}
