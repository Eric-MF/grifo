// Os botões do fone (e as teclas de mídia do teclado) durante a leitura em voz alta. O navegador entrega esses botões à
// página que está tocando mídia (a Media Session): enquanto o Ouvir está aberto, a página toca um silêncio feito na hora,
// em memória (nenhum arquivo de som), e recebe o toque simples (tocar/pausar), os dois toques (próxima faixa) e os três
// (faixa anterior). Os botões de volume ficam com o sistema: eles mudam o volume de tudo, e a página não os recebe.

/** O que os dois toques (ou os três) fazem. */
export type AcaoDoFone =
  | "comando"
  | "repetirArtigo"
  | "proximoArtigo"
  | "artigoAnterior"
  | "repetir"
  | "proximo"
  | "anterior"
  | "maisRapido"
  | "maisDevagar"
  | "ondeEstou"
  | "nada";

export const ACOES_DO_FONE: [AcaoDoFone, string][] = [
  ["comando", "Ouvir um comando de voz"],
  ["repetirArtigo", "Repetir o artigo"],
  ["proximoArtigo", "Próximo artigo"],
  ["artigoAnterior", "Artigo anterior"],
  ["repetir", "Repetir o trecho"],
  ["proximo", "Próximo trecho"],
  ["anterior", "Trecho anterior"],
  ["maisRapido", "Mais rápido"],
  ["maisDevagar", "Mais devagar"],
  ["ondeEstou", "Dizer onde estou"],
  ["nada", "Nada"],
];

/**
 * Um WAV de silêncio (PCM de 8 bits, mono), montado em memória. Tem mais de 5 s porque o Chrome não dá os controles de
 * mídia a sons curtos (os de aviso).
 */
export function silencioWav(segundos = 6, taxa = 8000): Blob {
  const n = Math.round(segundos * taxa);
  const b = new ArrayBuffer(44 + n);
  const v = new DataView(b);
  const texto = (pos: number, s: string) => [...s].forEach((c, k) => v.setUint8(pos + k, c.charCodeAt(0)));
  texto(0, "RIFF");
  v.setUint32(4, 36 + n, true);
  texto(8, "WAVE");
  texto(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, taxa, true);
  v.setUint32(28, taxa, true); // bytes por segundo
  v.setUint16(32, 1, true); // bytes por amostra
  v.setUint16(34, 8, true); // bits
  texto(36, "data");
  v.setUint32(40, n, true);
  // no PCM de 8 bits, o silêncio é 128
  new Uint8Array(b, 44).fill(128);
  return new Blob([b], { type: "audio/wav" });
}

let ctx: AudioContext | null = null;
/** Um bipe curto feito na hora (um oscilador): "abrir" (agudo, pode falar) ou "fechar" (grave, não ouviu nada). */
export function bipe(tipo: "abrir" | "fechar") {
  if (typeof AudioContext === "undefined") return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state !== "running") void ctx.resume().catch(() => {});
    const t = ctx.currentTime + 0.02;
    const notas = tipo === "abrir" ? [660, 990] : [520, 360];
    notas.forEach((f, k) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0, t + k * 0.11);
      g.gain.linearRampToValueAtTime(0.25, t + k * 0.11 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, t + k * 0.11 + 0.1);
      o.connect(g).connect(ctx!.destination);
      o.start(t + k * 0.11);
      o.stop(t + k * 0.11 + 0.11);
    });
  } catch {
    // sem áudio: fica só o aviso na tela
  }
}
