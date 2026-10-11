// Dados das leis no navegador, baixados uma vez por página (public/dados/leis/, gerados pelo build).
import type { ArtigoTexto } from "./busca";
import type { Bloco, Datas } from "./linha-do-tempo";

export interface LeiCompleta {
  id: string;
  nome: string;
  url: string;
  blocos: Bloco[];
}
export interface ArtigosDaLei {
  id: string;
  nome: string;
  artigos: ArtigoTexto[];
}

const caches = new Map<string, Promise<unknown>>();
function obter<T>(url: string): Promise<T> {
  if (!caches.has(url))
    caches.set(
      url,
      fetch(url).then((r) => {
        if (!r.ok) throw new Error(`${r.status} em ${url}`);
        return r.json();
      }),
    );
  return caches.get(url) as Promise<T>;
}

export const carregarLei = (lei: string) => obter<LeiCompleta>(`/dados/leis/${lei}.json`);
export const carregarArtigos = (lei: string) => obter<ArtigosDaLei>(`/dados/leis/${lei}.artigos.json`);
/** Texto superado de cada dispositivo, pelo índice do bloco. */
export const carregarVersoes = (lei: string) => obter<Record<number, Bloco>>(`/dados/leis/${lei}.versoes.json`);
export const carregarDatas = () => obter<Datas>("/dados/leis/_datas.json");
