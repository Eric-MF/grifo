// Acesso seguro ao localStorage (modo privado, cota cheia, SSR).
export function lerJSON<T>(chave: string, padrao: T): T {
  try {
    const raw = localStorage.getItem(chave);
    return raw ? (JSON.parse(raw) as T) : padrao;
  } catch {
    return padrao;
  }
}
/** O navegador recusou a gravação por falta de espaço (a cota do site)? Outros erros (modo privado) não contam. */
function ehCotaCheia(e: unknown): boolean {
  return e instanceof DOMException && (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED" || e.code === 22);
}

/** Grava. Devolve false só quando não há espaço: quem guarda dados do aluno avisa nesse caso. */
export function gravarJSON(chave: string, valor: unknown): boolean {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
    return true;
  } catch (e) {
    return !ehCotaCheia(e);
  }
}
export function remover(chave: string) {
  try {
    localStorage.removeItem(chave);
  } catch {
    /* ignora */
  }
}
