export interface DatasPlanalto {
  assinatura?: string;
  publicacao?: string;
  vigencia?: string;
  pendencias: string[];
}

const MESES = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const EXTENSO: Record<string, number> = { trinta: 30, quarenta: 40, "quarenta e cinco": 45, sessenta: 60, noventa: 90, "cento e oitenta": 180 };
const DATA_EXTENSO = "(\\d{1,2})\\s*[ºo°]?\\s*(?:de\\s+)?([A-Za-zÀ-ÿ]+)\\s+de\\s+(\\d{4})";

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const iso = (ano: number, mes: number, dia: number) => `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

function dataExtenso(dia: string, mes: string, ano: string): string | undefined {
  const indice = MESES.indexOf(semAcento(mes));
  const d = Number(dia);
  if (indice < 0 || d < 1 || d > 31) return undefined;
  return iso(Number(ano), indice + 1, d);
}

function somarDias(data: string, dias: number): string {
  const [a, m, d] = data.split("-").map(Number);
  const t = new Date(Date.UTC(a, m - 1, d + dias));
  return iso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

export function textoDoHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/\s+/g, " ");
}

function classificarVigencia(clausula: string, publicacao: string | undefined): string | undefined {
  if (/na\s+data\s+de\s+sua\s+publica[çc][ãa]o/i.test(clausula)) return publicacao;
  const explicita = clausula.match(new RegExp(`(?:em|a\\s+partir\\s+d[oe]|no\\s+dia)\\s+${DATA_EXTENSO}`, "i"));
  if (explicita) return dataExtenso(explicita[1], explicita[2], explicita[3]);
  const prazo = clausula.match(/ap[óo]s\s+(?:decorridos?\s+)?(\d+|[a-zç]+(?:\s+e\s+[a-zç]+)?)\s*(?:\([^)]*\)\s*)?dias/i);
  if (prazo && publicacao) {
    const n = /^\d+$/.test(prazo[1]) ? Number(prazo[1]) : EXTENSO[semAcento(prazo[1])];
    if (n) return somarDias(publicacao, n);
  }
  return undefined;
}

/** `id` (ex.: "lei-6404") escolhe, entre as citações de lei do texto, a que tem o mesmo número. */
export function extrairDatasPlanalto(html: string, id?: string): DatasPlanalto {
  const texto = textoDoHtml(html);
  const pendencias: string[] = [];
  const numero = Number(id?.match(/(\d+)$/)?.[1]);

  const titulos = [
    ...texto.matchAll(new RegExp(`(?:DECRETO-LEI|DECRETO|LEI COMPLEMENTAR|LEI|MEDIDA PROVIS[ÓO]RIA|EMENDA CONSTITUCIONAL)\\s+(?:N[º°o]\\.?\\s*)?([\\d.\\/]+)[^.]{0,40}?,?\\s+DE\\s+${DATA_EXTENSO}`, "gi")),
  ];
  const titulo = titulos.find((m) => Number(m[1].replace(/\D/g, "")) === numero);
  const assinatura = titulo ? dataExtenso(titulo[2], titulo[3], titulo[4]) : undefined;
  if (!assinatura) pendencias.push("assinatura não encontrada no título da página");

  const textual = texto.match(new RegExp(`publicad[oa]\\s+no\\s+(?:DOU|Di[áa]rio\\s+Oficial\\s+da\\s+Uni[ãa]o)[^.;]{0,60}?(?:de\\s+)?${DATA_EXTENSO}`, "i"));
  const numerica = texto.match(/DOU\s+de\s+(\d{1,2})[./](\d{1,2})[./](\d{4})/i);
  const publicacao = textual
    ? dataExtenso(textual[1], textual[2], textual[3])
    : numerica
      ? iso(Number(numerica[3]), Number(numerica[2]), Number(numerica[1]))
      : undefined;
  if (!publicacao) pendencias.push("publicação não encontrada na página: confira no DOU");

  const candidatas = [...texto.matchAll(/entra[m]?\s+em\s+vigor[^.]{0,160}/gi)]
    .map((m) => classificarVigencia(m[0], publicacao))
    .filter((d): d is string => Boolean(d));
  const distintas = [...new Set(candidatas)];
  let vigencia: string | undefined;
  if (distintas.length === 1) {
    vigencia = distintas[0];
    pendencias.push("vigência extraída do texto: confira a cláusula final da lei");
  } else if (distintas.length > 1) pendencias.push(`cláusulas de vigência com datas diferentes (${distintas.join(", ")}): escolha uma`);
  else pendencias.push("vigência não identificada no texto: confira o último artigo da lei");

  return { assinatura, publicacao, vigencia, pendencias };
}
