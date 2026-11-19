// A tela do celular não apaga sozinha enquanto a leitura em voz alta lê (ou espera um comando de voz) e enquanto o
// treino ouve a resposta falada: a Screen Wake Lock (navigator.wakeLock), que o navegador só oferece em https ou no
// localhost. Uma trava só, para todos que a querem na página. O navegador a solta quando a página sai da frente e pode
// soltá-la sozinho (o Android na economia de bateria): enquanto alguém a quer, ela é pedida de novo ao voltar à frente,
// quando cai, no próximo toque na tela (há navegador que só a dá com um toque) e, por garantia, a cada 20 s.
import { useEffect, useSyncExternalStore } from "react";

/**
 * "acesa": a trava vale. "indisponivel": o navegador não tem a trava (o endereço não é https, ou o navegador é antigo).
 * "recusada": o navegador recusou o pedido (economia de bateria, por exemplo). "livre": ninguém a quer.
 */
export type EstadoTela = "livre" | "acesa" | "indisponivel" | "recusada";

let querem = 0;
let trava: WakeLockSentinel | null = null;
let pedindo = false;
let estado: EstadoTela = "livre";
let relogio: ReturnType<typeof setInterval> | null = null;
const ouvintes = new Set<() => void>();

const temTrava = () => typeof navigator !== "undefined" && "wakeLock" in navigator && !!navigator.wakeLock;
function mudar(e: EstadoTela) {
  if (estado === e) return;
  estado = e;
  for (const f of ouvintes) f();
}

async function pedir() {
  if (!querem || pedindo || (trava && !trava.released)) return;
  if (!temTrava()) return mudar("indisponivel");
  // com a página fora da frente, o pedido é recusado: ele volta quando ela volta
  if (document.visibilityState !== "visible") return;
  pedindo = true;
  try {
    const t = await navigator.wakeLock.request("screen");
    if (!querem) {
      void t.release().catch(() => {});
      return;
    }
    trava = t;
    mudar("acesa");
    // solta pelo sistema com a página à vista: pede de novo na hora
    t.addEventListener("release", () => {
      if (trava !== t) return;
      trava = null;
      if (querem && document.visibilityState === "visible") void pedir();
    });
  } catch {
    mudar("recusada");
  } finally {
    pedindo = false;
  }
}

const aoVoltar = () => {
  if (document.visibilityState === "visible") void pedir();
};
const aoTocar = () => {
  if (!trava || trava.released) void pedir();
};

function querer() {
  querem++;
  if (querem > 1) return;
  document.addEventListener("visibilitychange", aoVoltar);
  window.addEventListener("pointerdown", aoTocar, { capture: true, passive: true });
  window.addEventListener("keydown", aoTocar, { capture: true, passive: true });
  relogio = setInterval(aoVoltar, 20_000);
  void pedir();
}

function largar() {
  querem = Math.max(0, querem - 1);
  if (querem) return;
  document.removeEventListener("visibilitychange", aoVoltar);
  window.removeEventListener("pointerdown", aoTocar, { capture: true });
  window.removeEventListener("keydown", aoTocar, { capture: true });
  if (relogio) clearInterval(relogio);
  relogio = null;
  const t = trava;
  trava = null;
  void t?.release().catch(() => {});
  mudar("livre");
}

const assinar = (f: () => void) => {
  ouvintes.add(f);
  return () => {
    ouvintes.delete(f);
  };
};

/** A tela fica acesa enquanto `quer`. Devolve o estado da trava (para a tela avisar quando o navegador não deixa). */
export function useTelaAcesa(quer: boolean): EstadoTela {
  const e = useSyncExternalStore(
    assinar,
    () => estado,
    () => "livre" as const,
  );
  useEffect(() => {
    if (!quer) return;
    querer();
    return largar;
  }, [quer]);
  return quer ? e : "livre";
}

/** O navegador tem a trava da tela (em https ou no localhost, e num navegador que a ofereça)? */
export const telaPodeFicarAcesa = () => temTrava();

/** O que dizer quando a tela pode apagar: o navegador não tem a trava, ou a recusou. */
export function avisoDaTela(e: EstadoTela): string | null {
  if (e === "indisponivel")
    return typeof window !== "undefined" && !window.isSecureContext
      ? "A tela pode apagar: neste endereço (sem https) o navegador não deixa mantê-la acesa. No site (https), deixa."
      : "A tela pode apagar: este navegador não deixa o site mantê-la acesa.";
  if (e === "recusada") return "A tela pode apagar: o navegador recusou mantê-la acesa (a economia de bateria pode impedir). Toque na tela para tentar de novo.";
  return null;
}
