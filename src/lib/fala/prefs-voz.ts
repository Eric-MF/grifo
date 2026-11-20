// A voz e o microfone do Grifo: as preferências do Ouvir (grifo:leitor:ouvir) que valem também no treino (a voz que lê
// as questões e o microfone que ouve as respostas). Mudadas no treino, valem no Ouvir, e vice-versa; o resto das
// preferências do Ouvir (o que ler, os botões do fone…) fica como está.
import { gravarJSON, lerJSON } from "@/lib/storage";
import type { NaLeitura, Sensibilidade } from "./escuta";

export const CHAVE_VOZ_DO_GRIFO = "grifo:leitor:ouvir";
export const VELOCIDADE_MIN = 0.5;
export const VELOCIDADE_MAX = 2.5;
export const VOLUME_MIN = 0.2;

export interface PrefsDaVoz {
  /** a voz escolhida (voiceURI); null: a melhor em português do aparelho */
  voz: string | null;
  velocidade: number;
  tom: number;
  /** o volume da voz, de 0,2 a 1 */
  volume: number;
  /** "auto" (evita o microfone do fone Bluetooth), "padrao" ou o deviceId */
  microfone: string;
  sensibilidade: Sensibilidade;
  microfoneNaLeitura: NaLeitura;
}

export const PREFS_DA_VOZ: PrefsDaVoz = { voz: null, velocidade: 1, tom: 1, volume: 1, microfone: "auto", sensibilidade: "alta", microfoneNaLeitura: "auto" };

const entre = (v: unknown, min: number, max: number, padrao: number) => (typeof v === "number" && Number.isFinite(v) ? Math.round(Math.min(max, Math.max(min, v)) * 100) / 100 : padrao);

/** As preferências guardadas, com o padrão no que faltar (ou estiver fora do lugar). */
export function lerPrefsDaVoz(): PrefsDaVoz {
  const g = lerJSON<Partial<PrefsDaVoz> | null>(CHAVE_VOZ_DO_GRIFO, null) ?? {};
  return {
    voz: typeof g.voz === "string" ? g.voz : null,
    velocidade: entre(g.velocidade, VELOCIDADE_MIN, VELOCIDADE_MAX, 1),
    tom: entre(g.tom, 0.5, 1.5, 1),
    volume: entre(g.volume, VOLUME_MIN, 1, 1),
    microfone: typeof g.microfone === "string" && g.microfone ? g.microfone : "auto",
    sensibilidade: g.sensibilidade === "normal" || g.sensibilidade === "maxima" ? g.sensibilidade : "alta",
    microfoneNaLeitura: g.microfoneNaLeitura === "ouvir" || g.microfoneNaLeitura === "fechar" ? g.microfoneNaLeitura : "auto",
  };
}

/** Grava a mudança junto com o resto das preferências do Ouvir; devolve as preferências da voz como ficaram. */
export function gravarPrefsDaVoz(mudanca: Partial<PrefsDaVoz>): PrefsDaVoz {
  const tudo = lerJSON<Record<string, unknown> | null>(CHAVE_VOZ_DO_GRIFO, null) ?? {};
  gravarJSON(CHAVE_VOZ_DO_GRIFO, { ...tudo, ...mudanca });
  return lerPrefsDaVoz();
}

/** A velocidade um passo acima (1) ou abaixo (-1), dentro dos limites. */
export const outraVelocidade = (v: number, passo: 1 | -1) => entre(v + passo * 0.15, VELOCIDADE_MIN, VELOCIDADE_MAX, 1);
/** O volume um passo acima (1) ou abaixo (-1), dentro dos limites. */
export const outroVolume = (v: number, passo: 1 | -1) => entre(v + passo * 0.2, VOLUME_MIN, 1, 1);
