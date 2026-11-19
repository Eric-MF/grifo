// Os nomes das pessoas nas questões: as marcas {p1}, {p2}… (postas no build, src/lib/nomes/marcar.ts) viram nomes
// das mitologias grega e romana (content/nomes-mitologia.yaml), sorteados a cada vez que a questão aparece.
import nomes from "@/content/generated/nomes-mitologia.json";
import type { Genero } from "@/lib/nomes/marcar";
import type { Pergunta } from "./types";

const MARCA = /\{p(\d+)\}/g;
const semAcento = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

function embaralhar<T>(lista: readonly T[], aleatorio: () => number): T[] {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * A questão com nomes no lugar das marcas: um nome diferente para cada pessoa, do gênero dela (o texto concorda com
 * ele), e nenhum que já apareça no resto do texto (para não confundir duas pessoas). A mesma pessoa tem o mesmo nome
 * em todo lugar: caso, comando, alternativas, padrão de respostas e termos da correção.
 */
export function comNomes<T extends Pergunta>(p: T, aleatorio: () => number = Math.random): T {
  const pessoas = p.pessoas;
  if (!pessoas?.length) return p;
  const json = JSON.stringify(p);
  const palavras = new Set(semAcento(json.replace(MARCA, " ")).match(/[a-z]+/g));
  const livres: Record<Genero, string[]> = {
    m: embaralhar(nomes.masculinos.filter((n) => !palavras.has(semAcento(n))), aleatorio),
    f: embaralhar(nomes.femininos.filter((n) => !palavras.has(semAcento(n))), aleatorio),
  };
  const escolhidos = pessoas.map((g) => livres[g].pop() ?? (g === "m" ? "Fulano" : "Fulana"));
  return aplicarNomes(p, escolhidos);
}

/**
 * A questão com estes nomes no lugar das marcas ({p1} é o primeiro), e com eles guardados em `nomes`: assim a mesma
 * questão, com os mesmos nomes, pode ser refeita depois (o resultado guardado de um recorde do treino).
 */
export function aplicarNomes<T extends Pergunta>(p: T, escolhidos: readonly string[]): T {
  // escapado como texto de JSON: a troca é segura mesmo com um nome lido do navegador
  const json = JSON.stringify(p).replace(MARCA, (m, i: string) => {
    const nome = escolhidos[Number(i) - 1];
    return typeof nome === "string" ? JSON.stringify(nome).slice(1, -1) : m;
  });
  return { ...(JSON.parse(json) as T), nomes: [...escolhidos] };
}
