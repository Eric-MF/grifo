// A vez da voz e a do microfone. Com o microfone do fone Bluetooth aberto, o fone fica no modo de chamada (o "Headset"
// do Windows): a voz da leitura sai com o som de ligação, ou só por ele. A escuta que usa esse microfone fecha-o
// enquanto a voz lê e o abre de novo quando ela para (src/lib/fala/escuta.ts); a voz, logo depois de o microfone fechar,
// espera o fone voltar ao som normal antes de começar (src/lib/fala/narrador.ts). Sem nenhuma escuta assim, nada muda.

/** Quanto o fone leva para sair do modo de chamada e voltar ao som normal, depois de o microfone fechar. */
export const VOLTA_DO_FONE_MS = 1200;

const lendo = new Set<object>();
const ouvintes = new Set<(lendo: boolean) => void>();
let fechadoEm = -Infinity;

/** O narrador `quem` começou (true) ou parou (false) de falar. */
export function marcarVoz(quem: object, fala: boolean) {
  const antes = lendo.size > 0;
  if (fala) lendo.add(quem);
  else lendo.delete(quem);
  const agora = lendo.size > 0;
  if (antes !== agora) for (const f of [...ouvintes]) f(agora);
}

/** Alguma voz está lendo? */
export const vozNoAr = () => lendo.size > 0;

/** Avisa quando a voz começa e para; devolve o que desliga o aviso. */
export function aoMudarVoz(f: (lendo: boolean) => void): () => void {
  ouvintes.add(f);
  return () => void ouvintes.delete(f);
}

/** Um microfone que muda o som (o do fone Bluetooth) acabou de fechar para a voz falar. */
export function microfoneFechou(agora = Date.now()) {
  fechadoEm = agora;
}

/** Quanto a voz espera antes de começar: o resto do tempo de o fone voltar ao som normal (0, se não fechou nenhum). */
export function esperaParaFalar(agora = Date.now()): number {
  return Math.max(0, fechadoEm + VOLTA_DO_FONE_MS - agora);
}

/** Para os testes: tudo como no começo. */
export function zerarVez() {
  lendo.clear();
  ouvintes.clear();
  fechadoEm = -Infinity;
}
