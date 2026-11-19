"use client";

import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { CANAL_VIDEOS } from "@/config/site";
import { gravarJSON, lerJSON } from "@/lib/storage";

/** O que um vídeo do canal vale: moedas e XP, 5 por minuto. */
export const XP_POR_MINUTO = 5;
/** Quanto de um vídeo já visto (em segundos) vale `porMinuto` (moedas ou XP). Vídeo inteiro visto arredonda para
 *  cima (1 s de um vídeo de 1 s vale 1; 1 min 1 s vale 6); antes do fim, vale só o que é inteiro. */
export const ganhoAte = (vistos: number, duracao: number, porMinuto: number) =>
  vistos >= duracao - 1 ? Math.ceil((duracao * porMinuto) / 60 - 1e-9) : Math.floor((vistos * porMinuto) / 60 + 1e-9);

interface Registro {
  /** segundos já vistos somando todas as vezes (no máximo a duração) */
  vistos: number;
  duracao: number;
  moedas: number;
  xp: number;
}
/** O que já foi pago por vídeo, no navegador do jogador (limpar os dados do site zera). */
const CHAVE_PAGOS = "grifo:videos:pagos";
// versões antigas guardavam só os segundos vistos (um número): aceita os dois formatos, sem NaN
const lerPagos = (): Record<string, Registro> => {
  const bruto = lerJSON<Record<string, Registro | number>>(CHAVE_PAGOS, {});
  const saida: Record<string, Registro> = {};
  for (const [id, r] of Object.entries(bruto)) {
    if (typeof r === "number") saida[id] = { vistos: r, duracao: 0, moedas: Math.floor((r * MOEDAS_POR_MINUTO) / 60), xp: Math.floor((r * XP_POR_MINUTO) / 60) };
    else if (r && typeof r === "object") saida[id] = { vistos: Number(r.vistos) || 0, duracao: Number(r.duracao) || 0, moedas: Number(r.moedas) || 0, xp: Number(r.xp) || 0 };
  }
  return saida;
};
const vazio = (): Registro => ({ vistos: 0, duracao: 0, moedas: 0, xp: 0 });
import listaJson from "../../content/videos-youtube.json";
import styles from "./video.module.css";

/** A chance de uma pergunta trazer o vídeo. */
export const CHANCE_VIDEO = 1 / 10;
/** Moedas por minuto assistido de verdade. */
export const MOEDAS_POR_MINUTO = 5;

// o tipo vem escrito: com o canal ainda sem vídeos, o JSON tem a lista vazia (e o TypeScript a leria como never[])
interface VideoDoCanal {
  id: string;
  titulo: string;
  publicado: string;
}
const lista = listaJson as { videos: VideoDoCanal[] };
const IDS = new Set(lista.videos.map((v) => v.id));
// a API do tocador do YouTube, carregada uma vez, só quando alguém escolhe assistir
interface PlayerYT {
  getPlayerState(): number;
  getVideoData(): { video_id?: string; author?: string };
  getDuration(): number;
  getCurrentTime(): number;
  destroy(): void;
}
type ApiYT = { Player: new (el: HTMLElement, o: Record<string, unknown>) => PlayerYT };
let apiYT: Promise<ApiYT> | null = null;
function carregarApi(): Promise<ApiYT> {
  apiYT ??= new Promise((ok) => {
    const w = window as unknown as { YT?: ApiYT; onYouTubeIframeAPIReady?: () => void };
    if (w.YT?.Player) return ok(w.YT);
    const anterior = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      anterior?.();
      ok(w.YT!);
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.head.append(s);
  });
  return apiYT;
}

/**
 * O vídeo que pode aparecer ao lado da pergunta do jogo: em uma pergunta a cada 10, um bannerzinho com um vídeo do canal
 * (CANAL_VIDEOS). Ao assistir, o vídeo pode ir para a tela cheia e sair quando quiser. Só conta o tempo em que o
 * tocador está tocando, com a aba à vista e um vídeo do próprio canal. Quando o tempo visto chega à duração do vídeo
 * (somando todas as vezes), o vídeo fecha sozinho. Moedas e XP entram na partida ao fechar, com uma animação.
 */
export function VideoDaPergunta({ seed, aoGanharMoedas }: { seed: number; aoGanharMoedas: (ganho: { moedas: number; xp: number }) => void }) {
  // o sorteio é da pergunta (a semente dela, um número de 0 a 1 sorteado pelo jogo): a mesma pergunta não sorteia de novo
  const video = useMemo(() => {
    const chance = (seed * 7919.7) % 1;
    if (!lista.videos.length || chance >= CHANCE_VIDEO) return null;
    return lista.videos[Math.floor(((seed * 104729.3) % 1) * lista.videos.length)]!;
  }, [seed]);
  const [estado, setEstado] = useState<"banner" | "assistindo" | "ganhou" | "fechado">("banner");
  // o que o jogador já tinha deste vídeo ao abrir, e o que está vendo agora (segundos)
  const [base, setBase] = useState<Registro>(vazio);
  const [visto, setVisto] = useState(0);
  const [duracao, setDuracao] = useState(0);
  const [ganho, setGanho] = useState({ moedas: 0, xp: 0 });
  const [valendo, setValendo] = useState(true);
  const [cheia, setCheia] = useState(true);
  const caixa = useRef<HTMLElement>(null);
  const lugar = useRef<HTMLDivElement>(null);
  const ganhar = useRef(aoGanharMoedas);
  useEffect(() => {
    ganhar.current = aoGanharMoedas;
  }, [aoGanharMoedas]);

  // o total desta vez (o que já havia + o que está sendo visto), e o que ele vale agora em moedas e XP
  const dur = duracao || base.duracao;
  const totalVisto = dur ? Math.min(dur, base.vistos + visto) : 0;
  const moedasAgora = dur ? Math.max(0, ganhoAte(totalVisto, dur, MOEDAS_POR_MINUTO) - base.moedas) : 0;
  const xpAgora = dur ? Math.max(0, ganhoAte(totalVisto, dur, XP_POR_MINUTO) - base.xp) : 0;

  // pagar: grava o total visto e entra com o que ainda não tinha sido pago (uma vez por fechamento)
  const fechando = useRef(false);
  const fechar = () => {
    if (fechando.current) return;
    fechando.current = true;
    const atual = lerPagos()[video!.id] ?? vazio();
    const d = duracao || atual.duracao;
    const vistos = d ? Math.min(d, atual.vistos + visto) : atual.vistos;
    const moedas = d ? Math.max(atual.moedas, ganhoAte(vistos, d, MOEDAS_POR_MINUTO)) : atual.moedas;
    const xp = d ? Math.max(atual.xp, ganhoAte(vistos, d, XP_POR_MINUTO)) : atual.xp;
    const novo = { vistos, duracao: d, moedas, xp };
    gravarJSON(CHAVE_PAGOS, { ...lerPagos(), [video!.id]: novo });
    const g = { moedas: moedas - atual.moedas, xp: xp - atual.xp };
    setGanho(g);
    if (g.moedas > 0 || g.xp > 0) {
      ganhar.current(g);
      setEstado("ganhou");
    } else setEstado("fechado");
    if (document.fullscreenElement && lugar.current?.contains(document.fullscreenElement)) void document.exitFullscreen().catch(() => {});
  };
  // o fechar mais recente, para o relógio (que roda dentro de um efeito) chamar o fechamento automático
  const fecharRef = useRef(fechar);
  useEffect(() => {
    fecharRef.current = fechar;
  });

  useEffect(() => {
    if (estado !== "assistindo" || !video || !lugar.current) return;
    fechando.current = false;
    let player: PlayerYT | null = null;
    let vivo = true;
    let ultimo = performance.now();
    let contados = 0;
    const jaVisto = lerPagos()[video.id] ?? vazio();
    setBase(jaVisto);
    setVisto(0);
    const alvo = document.createElement("div");
    lugar.current.append(alvo);
    void carregarApi().then((YT) => {
      if (!vivo) return;
      player = new YT.Player(alvo, {
        videoId: video.id,
        width: "100%",
        height: "100%",
        playerVars: { autoplay: 1, rel: 0, playsinline: 1, modestbranding: 1, fs: 1 },
      });
    });
    const relogio = window.setInterval(() => {
      const agora = performance.now();
      // o tempo de verdade desde a última conferência (no máximo 1,5 s: a aba em segundo plano não acumula)
      const passou = Math.min(1.5, (agora - ultimo) / 1000);
      ultimo = agora;
      if (!player || typeof player.getPlayerState !== "function") return;
      const dados = player.getVideoData?.() ?? {};
      const doCanal = !!dados.video_id && (IDS.has(dados.video_id) || dados.author === CANAL_VIDEOS.nome);
      setValendo(doCanal || !dados.video_id);
      const d = player.getDuration?.() || 0;
      if (d) setDuracao(d);
      // 1 = tocando
      if (player.getPlayerState() !== 1 || !doCanal || document.visibilityState !== "visible") return;
      contados += passou;
      setVisto(contados);
      const fim = d || jaVisto.duracao;
      // chegou ao limite de exibição do vídeo (somando as vezes que já assistiu): fecha sozinho e paga
      if (fim && jaVisto.vistos + contados >= fim) fecharRef.current();
    }, 500);
    return () => {
      vivo = false;
      window.clearInterval(relogio);
      player?.destroy();
      alvo.remove();
    };
    // o efeito é do estado "assistindo": o vídeo e os valores de partida são os do começo dele
  }, [estado, video]);

  // a tela cheia sai com o vídeo; saindo dela (Esc, gesto, botão do próprio vídeo), o vídeo fica numa janela grande
  // Quando o vídeo entra em tela cheia por cima de outra (o palco do jogo), o palco fica guardado; quando o vídeo sai,
  // o palco volta à tela cheia. Assim, voltar tira só o vídeo de tela cheia, e o jogo continua em tela cheia.
  const telaAntes = useRef<Element | null>(null);
  const palco = useRef<Element | null>(null);
  useEffect(() => {
    telaAntes.current = document.fullscreenElement;
    const noVideo = (el: Element | null) => !!el && !!lugar.current?.contains(el);
    const mudou = () => {
      const agora = document.fullscreenElement;
      const antes = telaAntes.current;
      telaAntes.current = agora;
      setCheia(!!agora);
      if (noVideo(agora) && antes && !noVideo(antes)) palco.current = antes;
      if (!agora && noVideo(antes) && palco.current) {
        const guardado = palco.current as HTMLElement;
        palco.current = null;
        void guardado.requestFullscreen?.().catch(() => {});
      }
    };
    document.addEventListener("fullscreenchange", mudou);
    return () => document.removeEventListener("fullscreenchange", mudou);
  }, []);
  // só o vídeo vai para a tela cheia (o iframe), e nunca dentro de outra tela cheia: assim o botão de sair do próprio
  // YouTube, e o gesto de voltar do celular, funcionam
  const alternarCheia = async () => {
    const atual = document.fullscreenElement;
    const quadro = (lugar.current?.querySelector("iframe") ?? lugar.current) as HTMLElement | null;
    if (atual && lugar.current?.contains(atual)) {
      await document.exitFullscreen().catch(() => {});
      return;
    }
    if (atual) {
      // o palco do jogo está em tela cheia: sai dele para o vídeo entrar, e volta a ele quando o vídeo sair
      palco.current = atual;
      await document.exitFullscreen().catch(() => {});
    }
    await quadro?.requestFullscreen?.().catch(() => {});
  };

  // o banner some se o jogador já viu o vídeo inteiro (não há mais moedas nele)
  const jaEsgotado = (() => {
    const r = lerPagos()[video?.id ?? ""];
    return !!r && r.duracao > 0 && r.vistos >= r.duracao;
  })();
  if (!video || estado === "fechado" || (estado === "banner" && jaEsgotado)) return null;
  if (estado === "ganhou")
    return (
      <div className={styles.ganhou} role="status" onAnimationEnd={(e) => e.target === e.currentTarget && setEstado("fechado")}>
        <span className={styles.chuva} aria-hidden>
          {Array.from({ length: Math.min(12, Math.max(4, ganho.moedas))}, (_, k) => (
            <span key={k} className={styles.moeda} style={{ "--k": k } as CSSProperties} />
          ))}
        </span>
        {ganho.moedas > 0 && (
          <span>
            <strong>+{ganho.moedas}</strong> {ganho.moedas === 1 ? "moeda" : "moedas"}
          </span>
        )}
        {ganho.xp > 0 && (
          <span>
            <strong>+{ganho.xp}</strong> XP
          </span>
        )}
      </div>
    );
  if (estado === "banner")
    return (
      <aside className={styles.banner} aria-label="Vídeo que dá moedas">
        <img className={styles.capa} src={`https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`} alt="" loading="lazy" />
        <div className={styles.texto}>
          <strong>{video.titulo}</strong>
          <span>
            {CANAL_VIDEOS.nome} · ganhe {MOEDAS_POR_MINUTO} moedas e {XP_POR_MINUTO} XP por minuto assistido
          </span>
        </div>
        <div className={styles.botoes}>
          <button
            type="button"
            className="btn btn-gold btn-sm"
            onClick={() => {
              // o vídeo abre numa janela grande; a tela cheia é do botão do próprio YouTube (ou do botão "Tela cheia")
              setEstado("assistindo");
            }}
          >
            ▶ Assistir
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEstado("fechado")}>
            Agora não
          </button>
        </div>
      </aside>
    );
  return (
    <aside ref={caixa} className={styles.tocador} data-cheia={cheia ? "1" : undefined} data-janela={cheia ? undefined : "1"} aria-label={`Vídeo: ${video.titulo}`}>
      <div ref={lugar} className={styles.quadro} />
      {/* sempre visível por cima do vídeo: sair a qualquer momento, mesmo em tela cheia no celular */}
      <button type="button" className={styles.sair} onClick={fechar} aria-label="Fechar o vídeo e pegar as moedas">
        ✕ Fechar
      </button>
      <div className={styles.rodape}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={alternarCheia}>
          {cheia ? "Sair da tela cheia" : "⛶ Tela cheia"}
        </button>
        <p className={styles.conta} aria-live="polite">
          {!valendo ? (
            <>Este vídeo não é do canal {CANAL_VIDEOS.nome}: não conta moedas.</>
          ) : (
            <>
              {Math.floor(visto / 60)} min {String(Math.floor(visto % 60)).padStart(2, "0")} s assistidos · <strong>+{moedasAgora} {moedasAgora === 1 ? "moeda" : "moedas"}</strong> · +{xpAgora} XP
              {dur > 0 && totalVisto >= dur && <span className={styles.esgotado}> · vídeo visto por inteiro</span>}
            </>
          )}
        </p>
        <button type="button" className="btn btn-gold btn-sm" onClick={fechar}>
          Fechar e pegar
        </button>
      </div>
    </aside>
  );
}
