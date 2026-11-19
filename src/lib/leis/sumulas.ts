// Súmulas do STF, do STJ e as vinculantes (só o STF as tem) lidas como as leis: cada súmula com texto é um dispositivo
// (id "s-154") de uma "lei" própria ("sumulas-stj", "sumulas-vinculantes"). Assim o leitor é o mesmo: barra de leitura, grifos, slide, "Vide" com prévia e "Leis".
// O que muda fica aqui: a fonte, o rótulo "Súmula N", o status e as informações adicionais.
// Pura (sem arquivos): a página e o build usam a mesma conversão.
import type { Remissivo, RemissivoEntrada, SumulaDados, SumulasDoTribunal } from "./dados";
import type { Ato, Bloco, InfoBloco } from "./linha-do-tempo";

/** As listas de súmulas: as do STF, as vinculantes (também do STF) e as do STJ. A ordem é a do Vade Mecum. */
export type Tribunal = "vinculantes" | "stf" | "stj";
/** O tribunal de cada lista (para "Ver no site do STF"). */
export const TRIBUNAIS: Record<Tribunal, string> = { vinculantes: "STF", stf: "STF", stj: "STJ" };
export const NOME_SUMULAS = (t: Tribunal) => (t === "vinculantes" ? "Súmulas Vinculantes" : `Súmulas do ${TRIBUNAIS[t]}`);
/** "Súmula 145", "Súmula Vinculante 11". */
export const rotuloSumula = (t: Tribunal, numero: number | string) => `Súmula ${t === "vinculantes" ? "Vinculante " : ""}${numero}`;

/** Id da "lei" das súmulas de um tribunal: guarda grifos, leitura e posição como a de uma lei. */
export const idSumulas = (t: Tribunal) => `sumulas-${t}`;
/** Id de uma súmula dentro da sua lista: âncora, grifo e link ("s-154"). */
export const idSumula = (numero: number) => `s-${numero}`;
export const ehSumulas = (id: string) => id.startsWith("sumulas-");

/** O caminho do site de uma lei ou das súmulas de um tribunal. */
export function rotaDaLei(id: string): string {
  return ehSumulas(id) ? `/leis/sumulas/${id.slice("sumulas-".length)}/` : `/leis/${id}/`;
}

/** A cor das súmulas (no Vade Mecum e no leitor): diferente das cores dos tipos de lei (Códigos, Constituição, Estatutos, Leis).
 * A variável segue o tema (globals.css). */
export const COR_SUMULAS = "var(--lei-sumulas)";

/** As listas de súmulas que aparecem no painel "Leis" do leitor, depois das leis. */
export const LISTAS_SUMULAS: { id: string; nome: string }[] = (Object.keys(TRIBUNAIS) as Tribunal[]).map((t) => ({ id: idSumulas(t), nome: NOME_SUMULAS(t) }));

const STATUS: Record<Exclude<SumulaDados["status"], "vigente">, string> = { superada: "Superada", cancelada: "Cancelada" };

/** As informações adicionais de uma súmula, como linhas de rótulo e texto (listas com uma linha por item). */
export function infoDaSumula(s: SumulaDados): InfoBloco[] {
  const e = s.extras;
  const linhas: InfoBloco[] = [];
  if (e.ramo) linhas.push({ rotulo: "Ramo", texto: e.ramo });
  if (e.julgamento) linhas.push({ rotulo: "Julgamento", texto: e.julgamento });
  if (e.fonte) linhas.push({ rotulo: "Fonte", texto: e.fonte });
  if (e.dataAprovacao) linhas.push({ rotulo: "Aprovação", texto: e.dataAprovacao });
  if (e.dataPublicacao) linhas.push({ rotulo: "Publicação", texto: e.dataPublicacao });
  if (e.teses?.length) linhas.push({ rotulo: e.teses.length === 1 ? "Tese de repercussão geral" : "Teses de repercussão geral", texto: e.teses.join("\n") });
  if (e.precedentesRepresentativos?.length)
    linhas.push({
      rotulo: e.precedentesRepresentativos.length === 1 ? "Precedente representativo" : "Precedentes representativos",
      texto: e.precedentesRepresentativos.map((j) => [j.titulo, j.ementa, j.referencia ? `[${j.referencia}]` : ""].filter(Boolean).join(" ")).join("\n"),
    });
  if (e.jurisprudencia?.length)
    linhas.push({
      rotulo: "Jurisprudência selecionada",
      texto: e.jurisprudencia.map((j) => [j.titulo, j.ementa, j.referencia ? `[${j.referencia}]` : ""].filter(Boolean).join(" ")).join("\n"),
    });
  if (e.observacoes?.length) linhas.push({ rotulo: "Observações", texto: e.observacoes.join("\n") });
  if (e.referenciaLegislativa?.length)
    linhas.push({
      rotulo: "Referência legislativa",
      texto: e.referenciaLegislativa.map((r) => `${r.norma}${r.artigos.length ? ` · art. ${r.artigos.join(", ")}` : ""}`).join("\n"),
    });
  if (e.precedentes?.length) linhas.push({ rotulo: "Precedentes", texto: e.precedentes.join("\n") });
  if (s.url) linhas.push({ rotulo: "Site", texto: `Ver no site do ${TRIBUNAIS[s.tribunal]}`, href: s.url });
  return linhas;
}

/**
 * A data de aprovação da súmula (AAAA-MM-DD): "Sessão Plenária de 13-12-1963" (STF), "julgado em 25/04/1990" (STJ);
 * nas vinculantes, a de publicação ("DJE de 6-6-2007").
 */
export function dataDaSumula(s: SumulaDados): string | undefined {
  const m = `${s.extras.dataAprovacao ?? ""} ${s.extras.julgamento ?? ""} ${s.extras.dataPublicacao ?? ""}`.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  return m ? `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}` : undefined;
}

/**
 * Os dispositivos de leitura das súmulas de um tribunal: só as que têm texto (as da lista sem texto ainda não
 * entram no leitor). O "Vide" vira link quando a súmula citada também tem texto, em qualquer das listas; um "Vide
 * Súmula Vinculante N" sem alvo (das súmulas do STF coletadas antes das vinculantes) ganha o alvo pelo texto.
 */
export function blocosDaSumulas(dados: SumulasDoTribunal, disponiveis: Partial<Record<Tribunal, ReadonlySet<number>>>): Bloco[] {
  return dados.sumulas
    .filter((s) => s.baixada)
    .sort((a, b) => a.numero - b.numero)
    .map((s) => {
      const id = idSumula(s.numero);
      const atos: Ato[] = [];
      if (s.status !== "vigente") atos.push({ tipo: "outro", bruto: `(${STATUS[s.status]})` });
      for (const v of s.vide) {
        const n = !v.alvo && v.texto.match(/Súmula\s+Vinculante\s+(?:n[º°.]?\s*)?(\d+)/i)?.[1];
        const pedido = v.alvo ?? (n ? { tribunal: "vinculantes" as const, numero: Number(n) } : undefined);
        const alvo = pedido && disponiveis[pedido.tribunal]?.has(pedido.numero) ? pedido : null;
        atos.push({ tipo: "vide", bruto: `(${v.texto.replace(/\.$/, "")})`, ...(alvo ? { lei: idSumulas(alvo.tribunal), art: idSumula(alvo.numero) } : {}) });
      }
      // nas súmulas do STF, a observação "Veja Súmula Vinculante 37." é um Vide para a vinculante
      for (const o of s.extras.observacoes ?? []) {
        if (!/^Vej[ao]\b/i.test(o)) continue;
        for (const m of o.matchAll(/Súmula\s+Vinculante\s+(?:n[º°.]?\s*)?(\d+)/gi)) {
          const numero = Number(m[1]);
          if (!disponiveis.vinculantes?.has(numero)) continue;
          atos.push({ tipo: "vide", bruto: `(Vide Súmula Vinculante ${numero})`, lei: idSumulas("vinculantes"), art: idSumula(numero) });
        }
      }
      const info = infoDaSumula(s);
      const data = dataDaSumula(s);
      return {
        tipo: "artigo",
        disp: id,
        ancora: id,
        rotulo: rotuloSumula(dados.tribunal, s.numero),
        // o rótulo entra no texto, como o "Art. N" das leis: o leitor separa e destaca quando alguém cita a súmula
        texto: `${rotuloSumula(dados.tribunal, s.numero)} ${s.enunciado}`,
        superada: s.status !== "vigente",
        atos,
        ...(data ? { data } : {}),
        ...(info.length ? { info } : {}),
      };
    });
}

/** Os números das súmulas com texto de cada lista (para o "Vide" saber o que tem link). Lista que falta: nenhuma. */
export function disponiveisDe(listas: Partial<Record<Tribunal, SumulasDoTribunal>>): Record<Tribunal, Set<number>> {
  const com = (d?: SumulasDoTribunal) => new Set(d?.sumulas.filter((s) => s.baixada).map((s) => s.numero) ?? []);
  return { vinculantes: com(listas.vinculantes), stf: com(listas.stf), stj: com(listas.stj) };
}

const normalizar = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
// a palavra-chave como o índice das leis a escreve, sem o que vem entre parênteses ("APELAÇÃO(ÕES)" → "apelacao")
const chaveDaPalavra = (p: string) => normalizar(p.replace(/\([^)]*\)/g, "")).replace(/[^a-z0-9 -]+/g, " ").replace(/\s+/g, " ").trim();
// palavras dos índices das leis que nas súmulas aparecem em tudo e não ajudam a achar nada
const GENERICAS = new Set(["direito", "direitos", "causa", "justica", "processo", "julgamento", "mandado", "supremo tribunal federal", "superior tribunal de justica", "lei", "acao", "decisao"]);
const escapar = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Índice alfabético das súmulas de um tribunal (o mesmo formato do índice remissivo das leis). As palavras-chave são
 * as dos índices das leis do leitor (`vocabulario`) e, no STJ, os assuntos do "ramo" ("DIREITO PENAL - EXECUÇÃO
 * PENAL" → "EXECUÇÃO PENAL"); cada uma lista as súmulas em que aparece, com o começo do enunciado. Uma palavra que
 * aparece em mais de um quinto das súmulas não diz nada e fica de fora.
 */
export function remissivoDasSumulas(dados: SumulasDoTribunal, vocabulario: string[]): Remissivo {
  const sumulas = dados.sumulas.filter((s) => s.baixada).sort((a, b) => a.numero - b.numero);
  const textos = sumulas.map((s) => normalizar(s.enunciado));
  const porChave = new Map<string, { palavra: string; nums: Set<number> }>();
  const incluir = (palavra: string, numero: number) => {
    const chave = chaveDaPalavra(palavra);
    if (chave.length < 4) return;
    const e = porChave.get(chave) ?? { palavra: palavra.replace(/\([^)]*\)/g, "").trim(), nums: new Set<number>() };
    e.nums.add(numero);
    porChave.set(chave, e);
  };
  for (const palavra of new Set(vocabulario)) {
    const chave = chaveDaPalavra(palavra);
    if (chave.length < 4 || GENERICAS.has(chave)) continue;
    // a palavra inteira, também com o plural regular ("recurso" acha "recursos")
    const re = new RegExp(`(?<![a-z0-9])${escapar(chave)}(?:s|es)?(?![a-z0-9])`);
    sumulas.forEach((s, k) => re.test(textos[k]!) && incluir(palavra, s.numero));
  }
  for (const s of sumulas) {
    const assunto = s.extras.ramo?.split(" - ").slice(1).join(" - ").trim();
    if (assunto) incluir(assunto, s.numero);
  }
  const porNumero = new Map(sumulas.map((s) => [s.numero, s]));
  const entradas: RemissivoEntrada[] = [...porChave.values()]
    .filter((e) => e.nums.size <= Math.max(10, sumulas.length / 5))
    .map((e) => ({
      palavra: e.palavra.toUpperCase(),
      total: e.nums.size,
      subitens: [...e.nums]
        .sort((a, b) => a - b)
        .map((n) => {
          const s = porNumero.get(n)!;
          const texto = s.enunciado.length > 110 ? `${s.enunciado.slice(0, 109).replace(/\s+\S*$/, "")}…` : s.enunciado;
          return { texto: s.status === "vigente" ? texto : `(${STATUS[s.status]}) ${texto}`, ref: rotuloSumula(dados.tribunal, n) };
        }),
    }))
    .sort((a, b) => normalizar(a.palavra).localeCompare(normalizar(b.palavra)));
  return {
    fonte: dados.fonte,
    paginas: 0,
    palavras: entradas.length,
    subitens: entradas.reduce((t, e) => t + e.subitens.length, 0),
    entradas,
  };
}
