// Os nomes da mitologia nos cadernos e gabaritos atualizados (os PDFs de /print): cada pessoa de cada parte da prova
// (a peça, as questões) vira o nome escolhido em `atualizado.nomes` do YAML do exame. A pessoa inteira ("Maria
// Campos", "João dos Anjos") vira só o nome novo, onde quer que apareça: no enunciado, no gabarito comentado, na
// tabela de pontos e nas notas de atualização da parte. Quem é pessoa sai do mesmo leitor das questões (marcar.ts).
import type { Exame } from "@/content/schema";
import type { Genero, LeitorDePessoas } from "./marcar";

/**
 * Por parte ("peca", "q1"…): o nome da prova (o primeiro nome, como o leitor acha) → o nome novo. Em `empresas`, para a
 * prova toda: o nome da empresa (ou do lugar inventado) como está no texto → o novo, trocado tal e qual.
 */
export type NomesPorParte = Record<string, Record<string, string>>;
export const CHAVE_EMPRESAS = "empresas";

export interface ProblemaNomes {
  alvo: string;
  tipo: "sem-nome" | "sobrando" | "repetido" | "colide" | "genero" | "empresa-ausente";
  chave: string;
  detalhe?: string;
}

/** As partes da prova com os textos de cada uma (o que a troca alcança). */
export function partesDoExame(e: Exame) {
  return [
    { alvo: "peca", parte: e.peca },
    ...e.questoes.map((q) => ({ alvo: `q${q.n}`, parte: q })),
  ];
}

const semAcento = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    // "William" e "Wiliam": a letra dobrada não faz outra pessoa
    .replace(/(.)\1/g, "$1");

function substituir(texto: string, leitor: LeitorDePessoas, mapa: Record<string, string>): string {
  let saida = "";
  let ultimo = 0;
  for (const a of leitor.achar(texto)) {
    const novo = mapa[a.chave];
    // sem nome novo, ou o mesmo nome (um autor citado no gabarito, que fica como está): o texto não muda
    if (!novo || novo === a.chave) continue;
    saida += texto.slice(ultimo, a.inicio) + novo;
    ultimo = a.fim;
  }
  return saida + texto.slice(ultimo);
}

/** As pessoas de cada parte: o primeiro nome e o gênero, na ordem em que aparecem. */
export function pessoasPorParte(e: Exame, leitor: LeitorDePessoas): Record<string, { chave: string; genero: Genero }[]> {
  const out: Record<string, { chave: string; genero: Genero }[]> = {};
  for (const { alvo, parte } of partesDoExame(e)) {
    const textos = [parte.enunciado, parte.gabarito_comentado, ...parte.itens.map((i) => i.descricao), ...(e.atualizado?.notas ?? []).filter((n) => n.alvo === alvo).map((n) => n.texto)];
    const vistas = new Map<string, Genero>();
    for (const t of textos) for (const a of leitor.achar(t)) if (!vistas.has(a.chave)) vistas.set(a.chave, a.genero);
    out[alvo] = [...vistas].map(([chave, genero]) => ({ chave, genero }));
  }
  return out;
}

/**
 * O exame com os nomes trocados e o que não bate: pessoa sem nome novo, nome que sobra (a pessoa não está na parte),
 * dois nomes iguais na mesma parte, nome novo igual ao de outra pessoa da parte e, quando o nome novo está numa das
 * listas da mitologia, gênero trocado. Não altera o exame recebido.
 */
export function trocarNomes(
  exame: Exame,
  leitor: LeitorDePessoas,
  nomes: NomesPorParte,
  generoDoNome: (nome: string) => Genero | undefined = () => undefined,
): { exame: Exame; problemas: ProblemaNomes[] } {
  const copia = structuredClone(exame);
  const problemas: ProblemaNomes[] = [];
  // as empresas primeiro, nos textos ainda com os nomes da prova; as mais longas antes ("Banco Peixe S.A." e "Banco Peixe")
  const empresas = Object.entries(nomes[CHAVE_EMPRESAS] ?? {}).sort(([a], [b]) => b.length - a.length);
  if (empresas.length) {
    const textos = partesDoExame(copia).flatMap(({ parte }) => [parte.enunciado, parte.gabarito_comentado, ...parte.itens.map((i) => i.descricao)]);
    for (const [de] of empresas) if (!textos.some((t) => t.includes(de))) problemas.push({ alvo: CHAVE_EMPRESAS, tipo: "empresa-ausente", chave: de });
    const troca = (t: string) => empresas.reduce((x, [de, para]) => x.split(de).join(para), t);
    for (const { parte } of partesDoExame(copia)) {
      parte.enunciado = troca(parte.enunciado);
      parte.gabarito_comentado = troca(parte.gabarito_comentado);
      for (const it of parte.itens) it.descricao = troca(it.descricao);
    }
    for (const n of copia.atualizado?.notas ?? []) n.texto = troca(n.texto);
  }
  // as pessoas depois das empresas: o nome de pessoa dentro do nome da empresa ("Ruan S/A") já saiu
  const pessoas = pessoasPorParte(copia, leitor);
  for (const { alvo, parte } of partesDoExame(copia)) {
    const mapa = nomes[alvo] ?? {};
    const daParte = pessoas[alvo] ?? [];
    const chaves = new Set(daParte.map((p) => p.chave));
    for (const p of daParte) {
      const novo = mapa[p.chave];
      if (!novo) problemas.push({ alvo, tipo: "sem-nome", chave: p.chave });
      else if (generoDoNome(novo) && generoDoNome(novo) !== p.genero) problemas.push({ alvo, tipo: "genero", chave: p.chave, detalhe: novo });
    }
    const usados = new Map<string, string>();
    for (const [chave, novo] of Object.entries(mapa)) {
      if (!chaves.has(chave)) problemas.push({ alvo, tipo: "sobrando", chave });
      // a mesma pessoa escrita de dois jeitos ("Júnior" e "Junior", "William" e "Wiliam") tem o mesmo nome novo
      const outra = usados.get(novo);
      if (outra !== undefined && semAcento(outra) !== semAcento(chave)) problemas.push({ alvo, tipo: "repetido", chave, detalhe: `${novo} (também de ${outra})` });
      usados.set(novo, chave);
      // o nome novo não pode ser o de outra pessoa da mesma parte: o leitor (e quem lê) confundiria as duas
      if (chaves.has(novo) && novo !== chave) problemas.push({ alvo, tipo: "colide", chave, detalhe: novo });
    }
    if (!Object.keys(mapa).length) continue;
    const troca = (t: string) => substituir(t, leitor, mapa);
    parte.enunciado = troca(parte.enunciado);
    parte.gabarito_comentado = troca(parte.gabarito_comentado);
    for (const it of parte.itens) it.descricao = troca(it.descricao);
    for (const n of copia.atualizado?.notas ?? []) if (n.alvo === alvo) n.texto = troca(n.texto);
  }
  for (const alvo of Object.keys(nomes)) if (alvo !== CHAVE_EMPRESAS && !pessoas[alvo]) problemas.push({ alvo, tipo: "sobrando", chave: "(parte inexistente)" });
  return { exame: copia, problemas };
}
