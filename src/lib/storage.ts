// Acesso seguro ao localStorage (modo privado, cota cheia, SSR).
export function lerJSON<T>(chave: string, padrao: T): T {
  try {
    const raw = localStorage.getItem(chave);
    return raw ? (JSON.parse(raw) as T) : padrao;
  } catch {
    return padrao;
  }
}
export function gravarJSON(chave: string, valor: unknown) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
    return true;
  } catch {
    return false;
  }
}
export function remover(chave: string) {
  try {
    localStorage.removeItem(chave);
  } catch {
    /* ignora */
  }
}
