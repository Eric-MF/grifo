"use client";
// Seção "Poderes" do menu: as melhorias dos poderes compradas com moedas (ver flap-suitcase/melhorias.ts). Uma grade
// de ícones, com um anel do quanto cada poder já foi melhorado, e o painel do poder escolhido: a prévia animada do
// personagem no estilo em uso, com a aura do nível visual, e as 4 trilhas com os 5 marcadores, o ganho e o
// contrapeso do próximo nível e o preço. As cores vêm do estilo escolhido, para combinar com ele.
//
// Segurar e deslizar pela grade mostra cada poder (num balão acima do dedo e no painel), e soltar abre o último; soltar
// fora volta ao que estava (ver useDeslizar).
//
// Ao abrir um poder ou comprar um nível, se a prévia não estiver à vista (no celular deitado, o painel abre abaixo da
// tela), a rolagem anda o mínimo para mostrá-la; se já estiver à vista, nada se mexe.

import { forwardRef, useEffect, useRef, useState, type CSSProperties, type JSX } from "react";
import { abreviarMoedas } from "./contadores";
import { nivelMelhoria, type Progresso } from "./progresso";
import type { CoresMenu, GameModule, PoderMelhoravel, TrilhaMelhoria } from "./types";
import { useDeslizar } from "./useDeslizar";
import styles from "./games.module.css";

/** Ícones das trilhas: traço simples, na cor do destaque do estilo. */
const ICONES_TRILHA: Record<string, () => JSX.Element> = {
  duracao: () => (
    <svg viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l3 2M10 2h4" />
    </svg>
  ),
  forca: () => (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M12 20V5M6 11l6-6 6 6M5 21h14" />
    </svg>
  ),
  recarga: () => (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
    </svg>
  ),
  frequencia: () => (
    <svg viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M4 12a8 8 0 0 1 8-8M20 12a8 8 0 0 1-8 8" />
    </svg>
  ),
  efeito: () => (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M12 3l2.2 6.3H21l-5.4 4 2 6.4L12 16l-5.6 3.7 2-6.4L3 9.3h6.8z" />
    </svg>
  ),
  visual: () => (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />
    </svg>
  ),
};

type Desenhar = NonNullable<GameModule["desenharPoder"]>;

/** Prévia animada: o personagem no estilo escolhido, com a aura no nível visual, sobre o céu do estilo. */
const PreviaPoder = forwardRef<HTMLCanvasElement, { desenhar: Desenhar; poder: string; nivel: number; estilo: string; personagem: string; ceu: [string, string] }>(function PreviaPoder(
  { desenhar, poder, nivel, estilo, personagem, ceu },
  fora,
) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    const c = cv?.getContext("2d");
    if (!cv || !c) return;
    // o tamanho do canvas acompanha o da tela: girar o celular muda a prévia (100% de largura em pé, 150 px deitado),
    // e sem acompanhar o desenho ficava esticado ou achatado
    const ajustar = () => {
      const dpr = window.devicePixelRatio || 1;
      const largura = Math.round((cv.clientWidth || 150) * dpr);
      const altura = Math.round((cv.clientHeight || 96) * dpr);
      if (cv.width === largura && cv.height === altura) return false;
      cv.width = largura;
      cv.height = altura;
      return true;
    };
    ajustar();
    // com menos movimento pedido pelo sistema, a prévia fica parada num quadro
    const parado = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const t0 = performance.now();
    let raf = 0;
    const quadro = (agora: number) => {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, cv.width, cv.height);
      const esc = (cv.height / 96) * 0.95;
      c.setTransform(esc, 0, 0, esc, cv.width / 2 + 10 * esc, cv.height / 2 + 8 * esc);
      desenhar(c, poder, nivel, estilo, personagem, parado ? 1.2 : (agora - t0) / 1000);
      if (!parado) raf = requestAnimationFrame(quadro);
    };
    raf = requestAnimationFrame(quadro);
    const ro = new ResizeObserver(() => {
      // parada, a prévia é desenhada de novo no tamanho novo; animada, o próximo quadro já sai nele
      if (ajustar() && parado) quadro(performance.now());
    });
    ro.observe(cv);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [desenhar, poder, nivel, estilo, personagem]);
  return (
    <canvas
      ref={(el) => {
        ref.current = el;
        if (typeof fora === "function") fora(el);
        else if (fora) fora.current = el;
      }}
      className={styles.previaPoder}
      style={{ background: `linear-gradient(${ceu[0]}, ${ceu[1]})` }}
      aria-hidden
    />
  );
});

export function PainelPoderes({
  poderes,
  progresso,
  cores,
  estilo,
  personagem,
  desenhar,
  pixel,
  onMelhorar,
  aberto: abertoFora,
  onAbrir,
  pedidoRolar,
}: {
  /** só os que o jogador pode ver (os próprios de personagens bloqueados ficam de fora) */
  poderes: PoderMelhoravel[];
  progresso: Progresso;
  cores?: CoresMenu;
  estilo: string;
  /** personagem escolhido: aparece na prévia dos poderes dos orbes */
  personagem: string;
  desenhar?: Desenhar;
  /** estilo Pixel: o painel usa a moldura 9-slice do menu (a variável --moldura da caixa do menu) */
  pixel?: boolean;
  onMelhorar: (poder: PoderMelhoravel, trilha: TrilhaMelhoria) => void;
  /** o poder aberto, quando quem usa o painel o controla (a ficha do personagem abre o poder dele) */
  aberto?: string | null;
  onAbrir?: (id: string | null) => void;
  /** muda quando quem usa o painel pede para descer até ele (a ficha do personagem): rola até o começo do painel */
  pedidoRolar?: number;
}) {
  const [abertoDentro, setAbertoDentro] = useState<string | null>(null);
  const aberto = abertoFora !== undefined ? abertoFora : abertoDentro;
  const setAberto = (id: string | null) => (onAbrir ? onAbrir(id) : setAbertoDentro(id));
  // nível visual mostrado na prévia enquanto o mouse está sobre a trilha Visual (null: o comprado)
  const [previa, setPrevia] = useState<number | null>(null);
  // segurar e deslizar pela grade: o poder sob o dedo aparece no balão e no painel; soltar abre esse
  const { ref: grade, previa: sobDedo, balao, deslizando, handlers, consumirClique } = useDeslizar({
    atributo: "poder",
    onSoltar: (id) => {
      setAberto(id);
      setPrevia(null);
    },
  });
  const poderAberto = poderes.find((p) => p.id === aberto);
  const poder = poderes.find((p) => p.id === (sobDedo ?? aberto));
  const poderBalao = sobDedo ? poderes.find((p) => p.id === sobDedo) : undefined;
  // mostra a prévia quando o poder abre ou ganha um nível: só rola se ela estiver fora da vista ("nearest")
  const previaRef = useRef<HTMLCanvasElement>(null);
  const painelRef = useRef<HTMLDivElement>(null);
  const niveisDoAberto = poderAberto ? poderAberto.trilhas.map((t) => nivelMelhoria(progresso, poderAberto.id, t.id)).join(",") : "";
  const montou = useRef(false);
  const ultimoPedido = useRef(pedidoRolar ?? 0);
  useEffect(() => {
    const pedido = pedidoRolar ?? 0;
    const desce = pedido !== ultimoPedido.current;
    ultimoPedido.current = pedido;
    if (!montou.current) {
      montou.current = true;
      return;
    }
    if (!aberto) return;
    // pedido de fora: desce até o começo do painel; senão, só o necessário para a prévia aparecer
    const alvo = desce ? painelRef.current : previaRef.current;
    const quadro = requestAnimationFrame(() => alvo?.scrollIntoView({ block: desce ? "start" : "nearest", behavior: "smooth" }));
    return () => cancelAnimationFrame(quadro);
  }, [aberto, niveisDoAberto, pedidoRolar]);
  const vars = cores
    ? ({ "--estilo-fundo": cores.fundo, "--estilo-borda": cores.borda, "--estilo-acento": cores.acento, "--estilo-texto": cores.texto } as CSSProperties)
    : undefined;

  return (
    <div className={styles.poderesMenu} style={vars}>
      <div ref={grade} className={styles.poderesGrade} data-deslizando={deslizando || undefined} {...handlers}>
        {poderes.map((p) => {
          const feitos = p.trilhas.reduce((s, t) => s + nivelMelhoria(progresso, p.id, t.id), 0);
          const total = p.trilhas.reduce((s, t) => s + t.precos.length, 0);
          return (
            <button
              key={p.id}
              type="button"
              className={styles.poderBotao}
              data-poder={p.id}
              data-mostrado={(deslizando && sobDedo === p.id) || undefined}
              aria-pressed={aberto === p.id}
              aria-label={`${p.nome}: ${feitos} de ${total} níveis`}
              title={p.nome}
              onClick={() => {
                if (consumirClique()) return;
                setAberto(aberto === p.id ? null : p.id);
                setPrevia(null);
              }}
            >
              <svg className={styles.poderAnel} viewBox="0 0 40 40" aria-hidden>
                <circle cx="20" cy="20" r="18" />
                {feitos > 0 && <circle cx="20" cy="20" r="18" pathLength={total} strokeDasharray={`${feitos} ${total}`} />}
              </svg>
              <img src={p.icone} alt="" />
            </button>
          );
        })}
        {/* deslizando, o dedo cobre o painel: o nome e o resumo do poder sob ele aparecem num balão acima */}
        {balao && poderBalao && (
          <div className={styles.balao} style={{ left: balao.left, top: balao.top }} aria-hidden>
            <strong>{poderBalao.nome}</strong>
            <span>{poderBalao.descricao}</span>
          </div>
        )}
      </div>
      {poder && (
        <div ref={painelRef} className={styles.poderPainel} data-pixel={pixel || undefined}>
          <div className={styles.poderTopo}>
            {desenhar && (
              <PreviaPoder
                ref={previaRef}
                desenhar={desenhar}
                poder={poder.id}
                nivel={previa ?? nivelMelhoria(progresso, poder.id, "visual")}
                estilo={estilo}
                personagem={poder.personagem ?? personagem}
                ceu={cores?.ceu ?? ["#6aa8dc", "#dcecf6"]}
              />
            )}
            <div>
              <strong>{poder.nome}</strong>
              <p>{poder.descricao}</p>
              <p className={styles.poderAjuda}>Cada nível tem um contrapeso; o Visual é só aparência.</p>
            </div>
          </div>
          <ul className={styles.trilhas}>
            {poder.trilhas.map((t) => {
              const n = nivelMelhoria(progresso, poder.id, t.id);
              const max = t.precos.length;
              const preco = t.precos[n];
              const Icone = ICONES_TRILHA[t.id];
              // na trilha Visual, passar o mouse mostra a camada na prévia
              const ver = (nivel: number) =>
                t.id === "visual" ? { onMouseEnter: () => setPrevia(nivel), onMouseLeave: () => setPrevia(null), onFocus: () => setPrevia(nivel), onBlur: () => setPrevia(null) } : {};
              const atual = t.niveis[n];
              const proximo = t.niveis[n + 1];
              return (
                <li key={t.id} className={styles.trilha}>
                  <span className={styles.trilhaIcone}>{Icone && <Icone />}</span>
                  <div className={styles.trilhaTexto}>
                    <span className={styles.trilhaNome}>
                      {t.nome}
                      <span className={styles.pips} role="img" aria-label={`nível ${n} de ${max}`}>
                        {t.precos.map((_, i) => (
                          <span key={i} data-cheio={i < n || undefined} {...ver(i + 1)} />
                        ))}
                      </span>
                    </span>
                    {proximo ? (
                      <small>
                        {atual?.ganho} → <b>{proximo.ganho}</b>
                      </small>
                    ) : (
                      <small>
                        <b>{atual?.ganho}</b>
                      </small>
                    )}
                    {/* o contrapeso de agora e o do próximo nível, como no ganho */}
                    {atual?.contrapeso && proximo?.contrapeso ? (
                      <small className={styles.contrapeso}>
                        Contrapeso: {atual.contrapeso} → <b>{proximo.contrapeso}</b>
                      </small>
                    ) : (
                      (proximo ?? atual)?.contrapeso && <small className={styles.contrapeso}>Contrapeso: {(proximo ?? atual)!.contrapeso}</small>
                    )}
                  </div>
                  {preco !== undefined ? (
                    <button type="button" className={styles.melhorar} data-falta={progresso.moedas < preco || undefined} onClick={() => onMelhorar(poder, t)} {...ver(n + 1)}>
                      <span className={styles.moedaIcone} aria-hidden /> {abreviarMoedas(preco)}
                    </button>
                  ) : (
                    <span className={styles.maximo}>Máximo</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
