// Último toque para voar, compartilhado entre o motor e o quiz do jogo. Enquanto o jogador está batendo as
// asas, as alternativas não respondem: só liberam 1 s depois do último toque para voar.
export const ESPERA_ALTERNATIVA_MS = 1000;

export const toques = { ultimoVoo: 0 };

/** Instante (em performance.now) a partir do qual uma alternativa pode ser tocada. */
export const liberadaEm = () => toques.ultimoVoo + ESPERA_ALTERNATIVA_MS;
