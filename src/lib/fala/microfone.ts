// Escolher o microfone dos comandos de voz. Com fone Bluetooth, ligar o microfone do fone faz o sistema trocar o som para o
// modo de chamada (o "Headset" do Windows, pior); no automático, quando o microfone padrão é o do fone Bluetooth (ou o de
// um aplicativo que usa o celular como microfone, mudo quando o aplicativo está fechado), usa-se outro: o do computador.
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
// os aplicativos que fazem do celular o microfone do computador: sem o aplicativo aberto no celular, o microfone fica mudo
const APP_DO_CELULAR = /(?<![a-z0-9])(wo ?mic|droidcam|iriun|camo|epoccam|ivcam|audiorelay|phone ?mic|micstream|megaphone)(?![a-z0-9])/;
const EMBUTIDO = /built[- ]?in|interno|integrado|internal|matriz|conjunto de microfones|array|macbook|imac|laptop|notebook|webcam|camera/;
// os chips de som da placa-mãe: o microfone do notebook (ou a entrada de microfone do computador) costuma ter o nome deles
const DA_PLACA = /realtek|intel|conexant|synaptics|cirrus|senary|smart sound|high definition audio|(?<![a-z0-9])(amd|idt)(?![a-z0-9])/;

/** Tira o "Padrão - " (ou "Default - " etc.) que o Chrome põe na frente do nome. */
export function semPrefixo(rotulo: string): string {
  return rotulo.trim().replace(PREFIXO, "").trim();
}

/** O microfone é de fone Bluetooth? (Um fone USB com fio não troca o perfil do som, então não conta.) */
export function ehBluetooth(rotulo: string): boolean {
  const s = norm(semPrefixo(rotulo));
  // o Chrome do Android chama o microfone do próprio celular de "Headset earpiece" e "Speakerphone"
  if (USB.test(s) || /earpiece|speakerphone/.test(s)) return false;
  return BLUETOOTH.test(s);
}

/** A entrada capta o próprio som do computador (mixagem, loopback, cabo virtual), não um microfone? */
export function ehVirtual(rotulo: string): boolean {
  return VIRTUAL.test(norm(rotulo));
}

/** O microfone é o de um aplicativo que usa o celular como microfone (WO Mic, DroidCam, Iriun…)? */
export function ehDoCelular(rotulo: string): boolean {
  return APP_DO_CELULAR.test(norm(semPrefixo(rotulo)));
}

/** O microfone é o do próprio aparelho (notebook, celular, computador de mesa com microfone interno)? */
export function ehEmbutido(rotulo: string): boolean {
  return EMBUTIDO.test(norm(semPrefixo(rotulo)));
}

/** Quanto o microfone serve no lugar do fone Bluetooth: 3 o embutido, 2 o do chip de som, 1 outro de verdade, 0 não serve. */
function nota(m: Microfone): number {
  if (ehBluetooth(m.rotulo) || ehVirtual(m.rotulo) || ehDoCelular(m.rotulo)) return 0;
  if (ehEmbutido(m.rotulo)) return 3;
  return DA_PLACA.test(norm(semPrefixo(m.rotulo))) ? 2 : 1;
}

/**
 * Os microfones a tentar, do melhor para o pior (vazio: o padrão do sistema). "auto" troca o padrão Bluetooth (ou o de
 * um aplicativo do celular) pelos outros microfones do computador, o embutido primeiro; o escolhido vem antes deles.
 */
export function microfonesParaTentar(lista: Microfone[], pref: PreferenciaMicrofone): string[] {
  const reais = lista.filter((m) => m.id !== "default" && m.id !== "communications" && m.id !== "");
  if (pref === "padrao") return [];
  const escolhido = pref !== "auto" && reais.some((m) => m.id === pref) ? [pref] : [];

  const padrao = lista.find((m) => m.id === "default");
  const referencia = padrao ?? reais[0];
  if (!referencia) return escolhido;
  const rotuloPadrao = semPrefixo(referencia.rotulo);
  const grupoPadrao = referencia.grupo;
  if (!ehBluetooth(rotuloPadrao) && !ehDoCelular(rotuloPadrao)) return escolhido;

  const outros = reais
    .filter((m) => m.id !== pref && (grupoPadrao === "" || m.grupo !== grupoPadrao) && nota(m) > 0)
    .sort((a, b) => nota(b) - nota(a));
  return [...escolhido, ...outros.map((m) => m.id)];
}

/**
 * O deviceId a abrir, ou null para o padrão do sistema. "auto" troca o padrão Bluetooth por outro microfone do computador,
 * se houver; o embutido tem preferência.
 */
export function escolherMicrofone(lista: Microfone[], pref: PreferenciaMicrofone): string | null {
  return microfonesParaTentar(lista, pref)[0] ?? null;
}

/** O nome do microfone que o sistema abre como padrão (vazio: sem a permissão, os nomes não vêm). */
export function rotuloDoPadrao(lista: Microfone[]): string {
  const m = lista.find((x) => x.id === "default") ?? lista.find((x) => x.id !== "communications" && x.id !== "");
  return m ? semPrefixo(m.rotulo) : "";
}

/** Nome curto para mostrar na tela. */
export function nomeDoMicrofone(rotulo: string): string {
  return semPrefixo(rotulo) || "Microfone sem nome";
}
