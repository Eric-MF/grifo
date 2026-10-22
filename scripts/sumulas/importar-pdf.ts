// Importa as súmulas dos PDFs (STF e STJ) para content/sumulas/{stf,stj}.json.
//
//   node scripts/sumulas/importar-pdf.ts [--stf <pdf>] [--stj <pdf>]
//
// Regra de fusão: o texto que já veio do site (origem "site") é mantido, porque o site é a fonte atual. O PDF preenche
// as súmulas que ainda não têm texto e cobre o resto. Depois rode `node scripts/build-content.ts` para gerar os dados
// do navegador. O coletor do site (baixar.ts) e a atualização automática (atualizar.ts) usam o mesmo arquivo.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { SumulaConteudo } from "./baixar.ts";
import { lerStf, lerStj, textoDoPdf } from "./pdf.ts";

const ROOT = new URL("../..", import.meta.url).pathname;
const SAIDA = join(ROOT, "content", "sumulas");
const PADRAO = {
  stf: join(ROOT, ".examples", "Vade Mecum", "Enunciados_Sumulas_STF_1_a_736_Completo.pdf"),
  stj: join(ROOT, ".examples", "Vade Mecum", "SumulasSTJ.pdf"),
};

const argumento = (nome: string) => {
  const i = process.argv.indexOf(nome);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

type Tribunal = "stf" | "stj";
interface Lista {
  tribunal: Tribunal;
  fonte: string;
  coletadoEm: string;
  total: number;
  baixadas: number;
  sumulas: SumulaConteudo[];
}

const lerLista = (t: Tribunal): Lista => JSON.parse(readFileSync(join(SAIDA, `${t}.json`), "utf8"));

/** As súmulas da lista com o texto do PDF, sem trocar o que já veio do site. */
export function fundir(atuais: SumulaConteudo[], doPdf: SumulaConteudo[], fonte: string): SumulaConteudo[] {
  const porNumero = new Map<number, SumulaConteudo>(
    atuais.map((s) => [s.numero, s.baixada && !s.origem ? { ...s, origem: "site" as const } : s]),
  );
  let trocadas = 0;
  for (const p of doPdf) {
    const antes = porNumero.get(p.numero);
    if (antes?.baixada && antes.origem !== "pdf") continue;
    porNumero.set(p.numero, {
      ...p,
      // o status do PDF vale quando diz superada ou cancelada; o que o site disse continua valendo nos outros casos
      status: p.status !== "vigente" ? p.status : (antes?.status ?? "vigente"),
      url: antes?.url ?? fonte,
      origem: "pdf",
    });
    trocadas++;
  }
  console.log(`  ${trocadas} súmulas vieram do PDF`);
  return [...porNumero.values()].sort((a, b) => a.numero - b.numero);
}

async function main() {
  const caminhos = { stf: argumento("--stf") ?? PADRAO.stf, stj: argumento("--stj") ?? PADRAO.stj };
  const hoje = new Date().toISOString().slice(0, 10);
  for (const t of ["stf", "stj"] as Tribunal[]) {
    if (!existsSync(caminhos[t])) throw new Error(`PDF não encontrado: ${caminhos[t]}`);
    console.log(`${t.toUpperCase()}: lendo ${caminhos[t]}`);
    const texto = await textoDoPdf(caminhos[t]);
    const doPdf = t === "stf" ? lerStf(texto) : lerStj(texto);
    console.log(`  ${doPdf.length} súmulas no PDF`);
    const atual = lerLista(t);
    const sumulas = fundir(atual.sumulas, doPdf, atual.fonte);
    const lista: Lista = {
      tribunal: t,
      fonte: atual.fonte,
      coletadoEm: hoje,
      total: sumulas.length,
      baixadas: sumulas.filter((s) => s.baixada).length,
      sumulas,
    };
    writeFileSync(join(SAIDA, `${t}.json`), JSON.stringify(lista, null, 1));
    console.log(`  ${t.toUpperCase()}: ${lista.total} súmulas na lista, ${lista.baixadas} com texto`);
  }
}

if (import.meta.main) await main();
