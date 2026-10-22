// Texto da lei numa data: cada dispositivo tem versões (a riscada antes da vigente, como no
// compilado do Planalto); uma versão vale da vigência do ato que a criou até a vigência da seguinte
// ou da revogação. Sem a data exata do ato, usa 1º de janeiro do ano e marca como aproximado.

export type TipoAto = "redacao" | "incluido" | "revogado" | "vide" | "vigencia" | "renumerado" | "outro";
export interface Ato {
  tipo: TipoAto;
  lei?: string;
  /** dispositivo de `lei` para onde o ato aponta (o "Vide" entre súmulas): vira link interno */
  art?: string;
  ano?: number;
  data?: string;
  href?: string;
  bruto: string;
}
/** Informação extra de um dispositivo (as súmulas têm julgamento, fonte, jurisprudência…): só aparece quando o leitor pede. */
export interface InfoBloco {
  rotulo: string;
  texto: string;
  href?: string;
}
export interface Bloco {
  tipo: "estrutura" | "rubrica" | "artigo" | "paragrafo" | "inciso" | "alinea" | "texto";
  disp?: string;
  rotulo?: string;
  texto: string;
  superada: boolean;
  atos: Ato[];
  ancora?: string;
  info?: InfoBloco[];
  /** quando o texto foi escrito (AAAA-MM-DD): nas súmulas, a aprovação; as citações seguem a lei da época */
  data?: string;
  /** links que o Planalto pôs no texto (posições em `texto`; href relativo à página da lei no Planalto) */
  links?: { ini: number; fim: number; href: string }[];
}
/** Vigência escalonada: a emenda entra em vigor por artigo, em datas próprias. */
export interface Marco {
  data: string;
  aproximada?: boolean;
  disp: string[];
}
/** Vigência de uma lei conforme o local, quando o texto divide por região. */
export interface Local {
  vigencia: string;
  rotulo: string;
}
/** Datas das leis alteradoras (content/leis-alteradoras.yaml) */
export interface DatasLei {
  nome?: string;
  vigencia?: string;
  publicacao?: string;
  aproximada?: boolean;
  padrao?: string;
  locais?: Record<string, Local>;
  marcos?: Marco[];
}
export type Datas = Record<string, DatasLei | undefined>;

interface Inicio {
  data: string | null;
  aproximado: boolean;
}
export interface Versao {
  indices: number[];
  inicio: Inicio;
  fim: Inicio;
}

const CRIA: TipoAto[] = ["redacao", "incluido", "renumerado"];

/** Vigências por local: o local escolhido vale; sem escolha, vale o `padrao` do diploma. */
export function datasComLocal(datas: Datas, escolhas: Record<string, string> = {}): Datas {
  return Object.fromEntries(
    Object.entries(datas).map(([id, d]) => {
      if (!d?.locais) return [id, d];
      const escolhido = escolhas[id] && d.locais[escolhas[id]] ? escolhas[id] : d.padrao;
      const local = escolhido ? d.locais[escolhido] : undefined;
      return [id, local ? { ...d, vigencia: local.vigencia, aproximada: undefined } : d];
    }),
  );
}

export function dataDoAto(a: Ato, datas: Datas, disp?: string): Inicio {
  const d = a.lei ? datas[a.lei] : undefined;
  const artigo = disp?.split(".")[0];
  const marco = artigo ? d?.marcos?.find((m) => m.disp.includes(artigo)) : undefined;
  if (marco) return { data: marco.data, aproximado: !!marco.aproximada };
  if (d?.vigencia) return { data: d.vigencia, aproximado: !!d.aproximada };
  if (a.data) return { data: a.data, aproximado: true };
  if (a.ano) return { data: `${a.ano}-01-01`, aproximado: true };
  return { data: null, aproximado: true };
}

/** Bloco que só registra a revogação ("Art. 214. (Revogado pela Lei …)"), sem texto próprio. */
export function marcoDeRevogacao(b: Bloco): boolean {
  if (!b.texto || !b.atos.some((a) => a.tipo === "revogado")) return false;
  const resto = b.texto.replace(b.rotulo ?? "", "").replace(/[\s.\-–—:]/g, "").replace(/\(?revogad[oa]s?\)?/gi, "");
  return resto.length === 0;
}

/** Versões de cada dispositivo, em ordem de documento. */
export function versoes(blocos: Bloco[], datas: Datas): Map<string, Versao[]> {
  const porDisp = new Map<string, Versao[]>();
  blocos.forEach((b, i) => {
    if (!b.disp) return;
    const disp = b.disp;
    const lista = porDisp.get(disp) ?? [];
    porDisp.set(disp, lista);
    if (marcoDeRevogacao(b)) {
      const ultima = lista[lista.length - 1];
      const ato = b.atos.find((a) => a.tipo === "revogado")!;
      if (ultima) ultima.fim = dataDoAto(ato, datas, disp);
      return;
    }
    if (b.tipo !== "texto" || !lista.length) lista.push({ indices: [], inicio: { data: null, aproximado: false }, fim: { data: null, aproximado: false } });
    lista[lista.length - 1].indices.push(i);
  });
  for (const [disp, lista] of porDisp) {
    for (const v of lista) {
      const ato = v.indices.flatMap((i) => blocos[i].atos).find((a) => CRIA.includes(a.tipo));
      if (ato) v.inicio = dataDoAto(ato, datas, disp);
    }
    lista.forEach((v, k) => {
      const prox = lista[k + 1];
      if (prox && prox.inicio.data) v.fim = prox.inicio;
      const revogacao = v.indices.flatMap((i) => blocos[i].atos).find((a) => a.tipo === "revogado");
      if (!prox && revogacao) v.fim = dataDoAto(revogacao, datas, disp);
    });
  }
  return porDisp;
}

export interface BlocoNaData {
  i: number;
  bloco: Bloco;
  aproximado: boolean;
}

/** Blocos do texto que vigorava em `data` (AAAA-MM-DD). */
export function textoEm(blocos: Bloco[], data: string, datas: Datas): BlocoNaData[] {
  const vs = versoes(blocos, datas);
  const versaoDe = new Map<number, Versao>();
  for (const lista of vs.values()) for (const v of lista) for (const i of v.indices) versaoDe.set(i, v);
  const saida: BlocoNaData[] = [];
  const visivel = (i: number) => {
    const bloco = blocos[i];
    const v = versaoDe.get(i);
    if (!v) return false;
    const comecou = v.inicio.data === null || v.inicio.data <= data;
    const acabou = v.fim.data !== null && v.fim.data <= data;
    // versão riscada sem data de fim conhecida não aparece: não dá para saber até quando valeu
    return comecou && !acabou && !(bloco.superada && v.fim.data === null);
  };
  blocos.forEach((bloco, i) => {
    if (bloco.tipo === "rubrica") {
      // a rubrica acompanha o artigo que ela intitula
      const j = blocos.findIndex((b, k) => k > i && b.disp);
      if (j >= 0 ? visivel(j) : !bloco.superada) saida.push({ i, bloco, aproximado: false });
      return;
    }
    if (!bloco.disp) {
      if (!bloco.superada) saida.push({ i, bloco, aproximado: false });
      return;
    }
    const v = versaoDe.get(i);
    if (v && visivel(i)) saida.push({ i, bloco, aproximado: v.inicio.aproximado || v.fim.aproximado });
  });
  return saida;
}

/** Texto atual: o que não está riscado nem é só o registro de uma revogação. */
export function textoAtual(blocos: Bloco[], { revogados = false } = {}): { i: number; bloco: Bloco }[] {
  return blocos.flatMap((bloco, i) => (revogados || (!bloco.superada && !marcoDeRevogacao(bloco)) ? [{ i, bloco }] : []));
}
