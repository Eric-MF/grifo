// Índice "citado por" das leis do leitor, calculado a partir dos textos coletados (só no servidor, no build).
// Usado pela rota /dados/citacoes.json e pela página de cada lei (para mostrar o rótulo só dos artigos citados).
import { blocosDeSumulas, carregarLei, leisDoLeitor, listaDeSumulas } from "@/content/leis";
import { citacoesDaLei } from "@/lib/leis/html";
import { idSumulas, NOME_SUMULAS, TRIBUNAIS, type Tribunal } from "@/lib/leis/sumulas";

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
  const juntar = (lista: ReturnType<typeof citacoesDaLei>) => {
    for (const c of lista) {
      const chave = `${c.para[0]}|${c.para[1]}`;
      const quem = (citacoes[chave] ??= []);
      if (!quem.some((x) => x.d === c.de[0] && x.a === c.de[1])) quem.push({ d: c.de[0], a: c.de[1], r: c.de[2] });
    }
  };
  for (const l of leis) {
    const texto = carregarLei(l.id);
    juntar(citacoesDaLei(texto.blocos, l.id, texto.url));
  }
  // as súmulas também citam artigos ("com base no art. 366 do CPP"): entram no "citado por" do artigo
  const tribunais = Object.keys(TRIBUNAIS) as Tribunal[];
  for (const t of tribunais) juntar(citacoesDaLei(blocosDeSumulas(t), idSumulas(t), listaDeSumulas(t).fonte));
  memo = {
    nomes: Object.fromEntries([...leis.map((l) => [l.id, l.nome]), ...tribunais.map((t) => [idSumulas(t), NOME_SUMULAS(t)])]),
    citacoes,
  };
  return memo;
}
