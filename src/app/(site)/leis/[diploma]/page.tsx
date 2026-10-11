import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { CLASSES } from "@/components/leis/classes";
import { Leitor } from "@/components/leis/Leitor";
import { carregarLei, leisDoLeitor } from "@/content/leis";
import { htmlBlocos, mapaAncoras } from "@/lib/leis/html";
import styles from "./cabecalho.module.css";

export const dynamicParams = false;

/** Blocos que já vêm na página: o suficiente para a primeira tela; o resto o navegador acrescenta. */
const INICIAIS = 90;

export function generateStaticParams() {
  return leisDoLeitor().map((l) => ({ diploma: l.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ diploma: string }> }): Promise<Metadata> {
  const { diploma } = await params;
  const l = carregarLei(diploma);
  return { title: l.nome, description: `${l.nome}: texto atualizado do Planalto, com linha do tempo, grifos e anotações.` };
}

export default async function Page({ params }: { params: Promise<{ diploma: string }> }) {
  const { diploma } = await params;
  const l = carregarLei(diploma);
  const inicial = htmlBlocos(l.blocos, 0, INICIAIS, l.id, l.url, mapaAncoras(l.blocos), CLASSES);
  const pdf = existsSync(join(process.cwd(), "public/downloads/leis", `${l.id}.pdf`));
  return (
    <div className="container section">
      <div className={styles.cabecalho}>
        <span className="eyebrow">
          <Link href="/leis/">Lei seca</Link>
        </span>
        <h1>{l.nome}</h1>
        <p className="muted">
          Texto compilado do{" "}
          <a href={l.url} target="_blank" rel="noopener">
            Planalto
          </a>
          , coletado em {l.coletadoEm.split("-").reverse().join("/")}. Não substitui o texto publicado no Diário Oficial.
          {pdf && (
            <>
              {" "}
              <a href={`/downloads/leis/${l.id}.pdf`} download>
                Baixar PDF
              </a>
              .
            </>
          )}
        </p>
      </div>
      <Leitor lei={l.id} nome={l.nome} url={l.url} total={l.blocos.length} inicial={inicial} />
    </div>
  );
}
