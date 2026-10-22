// Índice "citado por" das leis do leitor, calculado a partir dos textos coletados (só no servidor, no build).
// Usado pela rota /dados/citacoes.json e pela página de cada lei (para mostrar o rótulo só dos artigos citados).
import { carregarLei, leisDoLeitor } from "@/content/leis";
import { citacoesDaLei } from "@/lib/leis/html";

export interface IndiceCitacoes {
  nomes: Record<string, string>;
  citacoes: Record<string, { d: string; a: string; r: string }[]>;
}

let memo: IndiceCitacoes | null = null;

/** "lei|artigo" → quem cita. Calculado uma vez por processo de build. */
export function indiceDeCitacoes(): IndiceCitacoes {
  if (memo) return memo;
  const leis = leisDoLeitor();
  const citacoes: IndiceCitacoes["citacoes"] = {};
  for (const l of leis) {
    const texto = carregarLei(l.id);
    for (const c of citacoesDaLei(texto.blocos, l.id, texto.url)) {
      const chave = `${c.para[0]}|${c.para[1]}`;
      const lista = (citacoes[chave] ??= []);
      if (!lista.some((x) => x.d === c.de[0] && x.a === c.de[1])) lista.push({ d: c.de[0], a: c.de[1], r: c.de[2] });
    }
  }
  memo = { nomes: Object.fromEntries(leis.map((l) => [l.id, l.nome])), citacoes };
  return memo;
}
