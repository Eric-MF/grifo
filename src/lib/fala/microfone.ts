// Escolher o microfone dos comandos de voz. Com fone Bluetooth, ligar o microfone do fone faz o sistema trocar o som para o
// modo de chamada (pior); no automático, quando o microfone padrão é o do fone Bluetooth, usa-se outro (o do computador).
// Funções puras; quem abre o microfone é src/lib/fala/escuta.ts.

export interface Microfone {
  /** deviceId; "default" e "communications" são os apelidos do Chrome para o padrão do sistema */
  id: string;
  /** label do enumerateDevices ("Padrão - Headset (WH-1000XM4 Hands-Free AG Audio)") */
  rotulo: string;
  /** groupId: o microfone e o alto-falante do mesmo aparelho têm o mesmo */
  grupo: string;
}
/** "auto": evita o microfone do fone Bluetooth; "padrao": o do sistema; outro valor: o deviceId escolhido */
export type PreferenciaMicrofone = string;

const PREFIXO = /^(padrão|padrao|default|comunicações|comunicacoes|communications)\s*[-–]\s*/i;
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const BLUETOOTH =
  /hands[- ]?free|bluetooth|airpods|wh-1000|wf-1000|beats|soundcore|jabra|head unit|headset|fones? de ouvido|(?<![a-z0-9])(bt|jbl|bose|buds|earbuds|hfp|hsp)(?![a-z0-9])/;
const USB = /(?<![a-z0-9])usb(?![a-z0-9])/;
const VIRTUAL = /monitor of|stereo mix|mixagem estereo|(?<![a-z0-9])cable(?![a-z0-9])|virtual|voicemeeter|loopback|blackhole|soundflower/;
const EMBUTIDO = /built[- ]?in|interno|integrado|internal|matriz|array|macbook|imac|laptop|notebook|webcam|camera/;

/** Tira o "Padrão - " (ou "Default - " etc.) que o Chrome põe na frente do nome. */
export function semPrefixo(rotulo: string): string {
  return rotulo.trim().replace(PREFIXO, "").trim();
}

/** O microfone é de fone Bluetooth? (Um fone USB com fio não troca o perfil do som, então não conta.) */
export function ehBluetooth(rotulo: string): boolean {
  const s = norm(semPrefixo(rotulo));
  if (USB.test(s)) return false;
  return BLUETOOTH.test(s);
}

/** A entrada capta o próprio som do computador (mixagem, loopback, cabo virtual), não um microfone? */
export function ehVirtual(rotulo: string): boolean {
  return VIRTUAL.test(norm(rotulo));
}

/** O microfone é o do próprio aparelho (notebook, celular, computador de mesa com microfone interno)? */
export function ehEmbutido(rotulo: string): boolean {
  return EMBUTIDO.test(norm(semPrefixo(rotulo)));
}

/**
 * O deviceId a abrir, ou null para o padrão do sistema. "auto" troca o padrão Bluetooth por outro microfone do computador,
 * se houver; o embutido tem preferência.
 */
export function escolherMicrofone(lista: Microfone[], pref: PreferenciaMicrofone): string | null {
  const reais = lista.filter((m) => m.id !== "default" && m.id !== "communications" && m.id !== "");
  if (pref === "padrao") return null;
  if (pref !== "auto" && reais.some((m) => m.id === pref)) return pref;

  const padrao = lista.find((m) => m.id === "default");
  const referencia = padrao ?? reais[0];
  if (!referencia) return null;
  const rotuloPadrao = semPrefixo(referencia.rotulo);
  const grupoPadrao = referencia.grupo;
  if (!ehBluetooth(rotuloPadrao)) return null;

  const candidatos = reais.filter((m) => !ehBluetooth(m.rotulo) && !ehVirtual(m.rotulo) && (grupoPadrao === "" || m.grupo !== grupoPadrao));
  return candidatos.find((m) => ehEmbutido(m.rotulo))?.id ?? candidatos[0]?.id ?? null;
}

/** Nome curto para mostrar na tela. */
export function nomeDoMicrofone(rotulo: string): string {
  return semPrefixo(rotulo) || "Microfone sem nome";
}
