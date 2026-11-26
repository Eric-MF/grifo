// O aviso de privacidade do microfone: quem reconhece a fala é o navegador, e o do Chrome (e o de outros) manda o áudio
// para os servidores da empresa dele. O Grifo não recebe nem grava o áudio. Dito no texto das opções de voz e, na
// primeira vez que os comandos do Ouvir ligam, num aviso.
export const AVISO_VOZ =
  "Quem reconhece a fala é o navegador: no Chrome, o áudio vai para o Google enquanto o microfone ouve (no Edge, para a Microsoft; no Safari, para a Apple). O Grifo não recebe nem grava o áudio.";
export const LINK_AVISO_VOZ = "/privacidade/#voz";
const CHAVE = "grifo:aviso-voz";

/** É a primeira vez que o microfone liga neste navegador? (a partir daí, não) */
export function primeiraVezDoMicrofone(): boolean {
  try {
    if (localStorage.getItem(CHAVE)) return false;
    localStorage.setItem(CHAVE, "1");
    return true;
  } catch {
    return false;
  }
}
