import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { CLASSES } from "@/components/leis/classes";
import { Leitor } from "@/components/leis/Leitor";
import type { SumulasDoTribunal } from "@/lib/leis/dados";
import { htmlBlocos, mapaAncoras } from "@/lib/leis/html";
import { unidadesDeLeitura } from "@/lib/leis/leitura";
import { blocosDaSumulas, COR_SUMULAS, disponiveisDe, idSumulas, NOME_SUMULAS, TRIBUNAIS, type Tribunal } from "@/lib/leis/sumulas";
import styles from "../../[diploma]/cabecalho.module.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return (Object.keys(TRIBUNAIS) as Tribunal[]).map((tribunal) => ({ tribunal }));
}

/** A lista de um tribunal (content/sumulas, gerado por scripts/sumulas/baixar.ts). */
function listaDo(t: Tribunal): SumulasDoTribunal {
  return JSON.parse(readFileSync(join(process.cwd(), "content", "sumulas", `${t}.json`), "utf8")) as SumulasDoTribunal;
}

export async function generateMetadata({ params }: { params: Promise<{ tribunal: string }> }): Promise<Metadata> {
  const { tribunal } = await params;
  const t = tribunal as Tribunal;
  return {
    title: NOME_SUMULAS(t),
    description: `${NOME_SUMULAS(t)} para leitura, com os Vide entre elas e as informações adicionais de cada uma.`,
  };
}

export default async function SumulasPage({ params }: { params: Promise<{ tribunal: string }> }) {
  const { tribunal } = await params;
  const t = tribunal as Tribunal;
  const d = listaDo(t);
  // as súmulas saem como uma lei: a mesma leitura, com o Vide que liga as súmulas dos dois tribunais
  const blocos = blocosDaSumulas(d, disponiveisDe(listaDo("stf"), listaDo("stj")));
  const id = idSumulas(t);
  // as informações adicionais não vão no HTML da página: o leitor as baixa (comprimidas) quando o aluno as pede
  const semInfo = blocos.map((b) => ({ ...b, info: undefined }));
  const inicial = htmlBlocos(semInfo, 0, semInfo.length, id, d.fonte, mapaAncoras(semInfo, id), CLASSES);
  const { ids, rotulos } = unidadesDeLeitura(blocos);
  return (
    <div className="container section">
      {/* as cores do cabeçalho são as do papel do leitor, como na página de uma lei (no tema escuro do site, o texto
          claro do site sumia no fundo claro do leitor) */}
      <div className={styles.cabecalho}>
        <span className="eyebrow">
          <Link href="/leis/">Leis e Súmulas</Link>
        </span>
        <h1>{NOME_SUMULAS(t)}</h1>
        <p className="muted">
          {d.baixadas} com texto de {d.total} na lista do portal, coletadas em {d.coletadoEm.split("-").reverse().join("/")}.{" "}
          <a href={d.fonte} target="_blank" rel="noopener">
            Ver no site do {TRIBUNAIS[t]}
          </a>
          . <Link href="/leis/">Voltar a Leis e Súmulas</Link>
        </p>
      </div>
      <Leitor lei={id} nome={NOME_SUMULAS(t)} url={d.fonte} total={blocos.length} inicial={inicial} ids={ids} rotulos={rotulos} cor={COR_SUMULAS} />
    </div>
  );
}
