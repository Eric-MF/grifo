// Deriva o rótulo legível de cada componente a partir da descrição do item na
// tabela FGV, que marca cada trecho com seu valor:
//   "Tempestividade: prazo de 5 dias (0,10), na forma da Súmula 700 do STF ou do Art. 586 do CPP (0,10)."
//   → ["Tempestividade: prazo de 5 dias", "na forma da Súmula 700 do STF ou do Art. 586 do CPP"]
// Só aplica quando a quantidade e os valores dos trechos batem com os componentes.
import type { Item } from "./schema.ts";

function rotulosDaDescricao(item: Item): string[] | null {
  const partes: { texto: string; valor: number }[] = [];
  const re = /\((\d+),(\d{1,2})\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(item.descricao))) {
    const texto = item.descricao
      .slice(last, m.index)
      .replace(/^[\s.,;:)–-]+/, "")
      .replace(/\s+/g, " ")
      .trim();
    partes.push({ texto, valor: Number(`${m[1]}.${m[2]}`) });
    last = m.index + m[0].length;
  }
  if (partes.length !== item.componentes.length) return null;
  if (partes.some((p, i) => Math.abs(p.valor - item.componentes[i].valor) > 0.001)) return null;
  return partes.map((p) => p.texto.replace(/^(e|ou)\s+/i, "").replace(/^./, (c) => c.toUpperCase()));
}

export function aplicarRotulos(itens: Item[]) {
  for (const it of itens) {
    const r = rotulosDaDescricao(it);
    if (!r) continue;
    it.componentes.forEach((c, i) => {
      if (!c.rotulo && r[i]) c.rotulo = r[i];
    });
  }
}
