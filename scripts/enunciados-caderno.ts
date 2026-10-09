// Extrai os enunciados (peça e questões) do texto de um CADERNO de prova
// (.examples/_text/caderno - …). Usado quando o padrão de resposta não traz o enunciado.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const DIR = join(ROOT, ".examples/_text");

export function textoCaderno(numero: number, variante?: string): string | null {
  const n = String(numero).padStart(2, "0");
  const arq = readdirSync(DIR).find(
    (f) =>
      (f.startsWith(`caderno - OAB ${n}º`) || f.startsWith(`raiz - Exame da Ordem ${n}º`)) &&
      (variante ? f.includes(`(${variante})`) : !f.includes("(")),
  );
  return arq && existsSync(join(DIR, arq)) ? readFileSync(join(DIR, arq), "utf8").normalize("NFC") : null;
}

const RUIDO = [
  /^=== PÁGINA/,
  /EXAME DE ORDEM UNIFICADO/i,
  /^Página \d+$/i,
  /^\d{1,3}$/, // números das linhas de rascunho
  /^RASCUNHO$/i,
  /^(PEÇA PRÁTICO-PROFISSIONAL|QUESTÃO \d)\s*[–-]\s*PÁGINA \d+$/i,
  /FGV CONHECIMENTO/i,
  /^Realização$/i,
  /^UnB\/CESPE/i,
  /^Exame de Ordem \d{4}\.\d/i,
  /^DIREITO PENAL$/i,
];

function paragrafos(linhas: string[]) {
  const out: string[] = [];
  let cur = "";
  for (const l of linhas) {
    cur = cur ? `${cur}${cur.endsWith("-") ? "" : " "}${l}` : l;
    if (/[.:;?)”"]$/.test(l)) {
      out.push(cur);
      cur = "";
    }
  }
  if (cur) out.push(cur);
  for (let i = out.length - 1; i > 0; i--) if (/^\(Valor/.test(out[i])) out.splice(i - 1, 2, `${out[i - 1]} ${out[i]}`);
  return out
    .map((p) => p.replace(/^<\s+/, "• "))
    .map((p) => (/^([A-Ea-e]\)|•)\s/.test(p) ? `**${p.replace(/\*/g, "")}**` : p))
    .join("\n\n");
}

/** { peca, questoes: [q1..q4] } a partir do caderno; strings vazias quando não encontrar. */
export function enunciadosDoCaderno(numero: number, variante?: string) {
  const txt = textoCaderno(numero, variante);
  if (!txt) return null;
  const linhas = txt.split("\n").map((l) => l.trim()).filter((l) => l && !RUIDO.some((r) => r.test(l)));
  const marcas: { tipo: "peca" | number; i: number }[] = [];
  linhas.forEach((l, i) => {
    if (/^(PEÇA PRÁTICO-PROFISSIONAL|(PEÇA PROFISSIONAL)+)$/i.test(l) && !marcas.some((m) => m.tipo === "peca")) marcas.push({ tipo: "peca", i });
    const q = l.match(/^QUESTÃO\s*0?(\d)(?:QUESTÃO\s*0?\d)*$/i);
    if (q && !marcas.some((m) => m.tipo === Number(q[1]))) marcas.push({ tipo: Number(q[1]), i });
  });
  marcas.sort((a, b) => a.i - b.i);
  const pedaco = (k: number) => linhas.slice(marcas[k].i + 1, marcas[k + 1]?.i ?? linhas.length);
  const res = { peca: "", questoes: ["", "", "", ""] };
  marcas.forEach((m, k) => {
    let corpo = pedaco(k);
    const parada = corpo.findIndex((l) => /^TEXTO DEFINITIVO|^Não utilize este espaço/i.test(l));
    if (parada >= 0) corpo = corpo.slice(0, parada);
    const fim = corpo.findIndex((l) => /^\(?Valor:?\s*[\d,]+\)?\.?$/i.test(l) || /\(Valor:?\s*[\d,]+\)\.?$/i.test(l));
    // inclui até a última linha com "(Valor …)" do bloco
    const ultimoValor = corpo.map((l, i) => (/Valor:?\s*[\d,]+/i.test(l) ? i : -1)).filter((i) => i >= 0).pop();
    if (ultimoValor !== undefined) {
      let fimBloco = ultimoValor + 1;
      while (fimBloco < corpo.length && /^(Obs|A simples|A mera|O examinando|Utilize|Na elaboração)/i.test(corpo[fimBloco])) fimBloco++;
      corpo = corpo.slice(0, fimBloco);
    } else if (fim >= 0) corpo = corpo.slice(0, fim + 1);
    const p = paragrafos(corpo);
    if (m.tipo === "peca") res.peca = p;
    else res.questoes[m.tipo - 1] = p;
  });
  return res;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = enunciadosDoCaderno(Number(process.argv[2]), process.argv[3]);
  console.log(JSON.stringify(r, null, 1));
}
