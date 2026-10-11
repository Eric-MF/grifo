// Datas de uma lei alteradora a partir da sua página no Planalto: publicação no DOU e início da vigência.
// Regra de contagem do prazo de vacância: LC 95/1998, art. 8º, § 1º (inclui o dia da publicação e o
// último dia; a lei entra em vigor no dia seguinte), ou seja, vigência = publicação + N dias.

export interface DatasLei {
  /** data no título ("LEI Nº 14.155, DE 27 DE MAIO DE 2021") */
  assinatura?: string;
  /** "publicado no DOU de 28.5.2021" */
  publicacao?: string;
  vigencia?: string;
  /** a publicação não aparece na página: as datas partem da assinatura */
  aproximada?: boolean;
  /** por que a vigência não foi deduzida, para revisão à mão */
  pendencia?: string;
}

const MESES: Record<string, number> = {
  janeiro: 1, fevereiro: 2, marco: 3, março: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};
const NUMEROS: Record<string, number> = {
  um: 1, dois: 2, tres: 3, três: 3, quatro: 4, seis: 6, doze: 12, quinze: 15, trinta: 30, "quarenta e cinco": 45, sessenta: 60,
  noventa: 90, "cento e vinte": 120, "cento e oitenta": 180, "trezentos e sessenta e cinco": 365,
};

const iso = (a: number, m: number, d: number) => `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
function somar(data: string, { dias = 0, meses = 0 }: { dias?: number; meses?: number }) {
  const t = new Date(`${data}T00:00:00Z`);
  t.setUTCMonth(t.getUTCMonth() + meses);
  t.setUTCDate(t.getUTCDate() + dias);
  return t.toISOString().slice(0, 10);
}
const ano4 = (a: string) => (a.length === 2 ? Number(a) + (Number(a) > 30 ? 1900 : 2000) : Number(a));
const quantidade = (s: string) => {
  const n = s.match(/(\d+)/)?.[1];
  if (n) return Number(n);
  const extenso = Object.entries(NUMEROS).sort((a, b) => b[0].length - a[0].length).find(([p]) => new RegExp(`\\b${p}\\b`, "i").test(s));
  return extenso?.[1];
};

export function textoDaPagina(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ");
}

export function datasDaLei(texto: string): DatasLei {
  const r: DatasLei = {};
  const titulo = texto.match(/\bN[ºo°]\s*[\d.]+(?:-\d+)?,?\s+DE\s+(\d{1,2})[ºo°]?\s+DE\s+([A-ZÇ]+)\s+DE\s+(\d{4})/i);
  if (titulo) {
    const mes = MESES[titulo[2].toLowerCase()];
    if (mes) r.assinatura = iso(Number(titulo[3]), mes, Number(titulo[1]));
  }
  const dou = texto.match(/(?:D\.?\s*O\.?\s*U\.?|Di[áa]rio Oficial(?: da Uni[ãa]o)?|\bD\.\s*O\.)\s*(?:de|em|do dia)?\s*(\d{1,2})[./](\d{1,2})[./](\d{2,4})/i);
  if (dou) r.publicacao = iso(ano4(dou[3]), Number(dou[2]), Number(dou[1]));
  else if (r.assinatura) {
    r.publicacao = r.assinatura;
    r.aproximada = true;
  }

  // a cláusula da própria lei é a última: as anteriores podem estar no texto que ela altera
  const clausula = [...texto.matchAll(/(?:entra(?:r[áa])?|entrar[áa]o|entram) em vigor ([^.;]{0,160})/gi)].pop()?.[1] ?? "";
  if (!r.publicacao) {
    r.pendencia = "sem data de publicação nem de assinatura";
    return r;
  }
  const explicita = clausula.match(/\bem (\d{1,2})\s*[ºo°]?\s*de\s+([a-zç]+)\s+de\s+(\d{4})/i);
  if (/na data (?:de |da )?(?:sua )?(?:publica[çc][ãa]o|promulga[çc][ãa]o)|a partir da (?:data de )?(?:sua )?publica[çc][ãa]o/i.test(clausula)) {
    r.vigencia = r.publicacao;
  } else if (explicita && MESES[explicita[2].toLowerCase()]) {
    r.vigencia = iso(Number(explicita[3]), MESES[explicita[2].toLowerCase()], Number(explicita[1]));
  } else if (/primeiro m[êe]s subseq[uü]ente|primeiro dia do m[êe]s seguinte/i.test(clausula)) {
    const p = new Date(`${r.publicacao}T00:00:00Z`);
    r.vigencia = iso(p.getUTCFullYear() + (p.getUTCMonth() === 11 ? 1 : 0), ((p.getUTCMonth() + 1) % 12) + 1, 1);
  } else if (/publica[çc][ãa]o/i.test(clausula) && /\b(dias?|meses|m[êe]s|anos?)\b/i.test(clausula) && !/dia do \d|dia do [a-z]+ m[êe]s/i.test(clausula)) {
    const n = quantidade(clausula.split(/\b(?:dias?|meses|m[êe]s|anos?)\b/i)[0]);
    const unidade = clausula.match(/\b(dias?|meses|m[êe]s|anos?)\b/i)![1].toLowerCase();
    if (n) r.vigencia = unidade.startsWith("dia") ? somar(r.publicacao, { dias: n }) : unidade.startsWith("ano") ? somar(r.publicacao, { meses: 12 * n }) : somar(r.publicacao, { meses: n });
  }
  if (!r.vigencia) r.pendencia = clausula ? `cláusula de vigência não reconhecida: "${clausula.trim().slice(0, 120)}"` : "sem cláusula de vigência";
  else if (r.aproximada) r.pendencia = "publicação no DOU não encontrada: datas a partir da assinatura";
  return r;
}
