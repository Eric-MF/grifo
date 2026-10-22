import type { Metadata } from "next";
import Link from "next/link";
import { Fragment, type CSSProperties } from "react";
import { ProgressoGeral, ProgressoLei } from "@/components/leis/BarraLeitura";
import { SecaoSumulas } from "@/components/leis/SecaoSumulas";
import { leisDoLeitor } from "@/content/leis";
import { GRUPOS_LEIS, TEMPO_LEITURA_MS } from "@/lib/leis/leitura";
import styles from "./leis.module.css";

export const metadata: Metadata = {
  title: "Vade Mecum",
  description: "Leitura da lei crua, atualizada a partir do Planalto: texto vigente, linha do tempo, marcações e Vade Mecum.",
};

export default function LeisPage() {
  const leis = leisDoLeitor();
  return (
    <div className="container section">
      <span className="eyebrow">Vade Mecum</span>
      <h1>Leis e Súmulas</h1>
      <p className="lead">
        O texto compilado do Planalto, só com a redação em vigor (as anteriores aparecem se você pedir). Escolha uma data para ver a lei
        como estava naquele dia, marque com cores, anote e monte o seu Vade Mecum.
      </p>
      <div className={styles.atalhos}>
        <Link className="btn btn-gold" href="/leis/minha-leitura/">
          Minha leitura: os artigos que mais erro
        </Link>
        <Link className="btn" href="/vademecum/">
          Montar Vade Mecum
        </Link>
      </div>
      <p className="muted">
        Um artigo conta como lido quando fica na tela por {TEMPO_LEITURA_MS / 1000} s, depois de todos os anteriores: os artigos são lidos do
        primeiro ao último.
      </p>
      <section className={styles.grupo} style={{ "--cor": "var(--primary)" } as CSSProperties}>
        <h2 className={styles.grupoTitulo}>Leitura geral</h2>
        <ProgressoGeral leis={leis.map((l) => ({ id: l.id, total: l.unidades }))} cor="var(--primary)" />
      </section>
      {GRUPOS_LEIS.map((g) => {
        // por tamanho do nome: os nomes curtos se agrupam e as linhas da grade ficam mais uniformes
        const itens = leis.filter((l) => l.tipo === g.tipo).sort((a, b) => a.nome.length - b.nome.length || a.nome.localeCompare(b.nome, "pt-BR"));
        return (
          <Fragment key={g.tipo}>
            {/* as súmulas ficam logo antes das Leis, depois de Estatutos */}
            {g.tipo === "lei" && <SecaoSumulas />}
            {itens.length > 0 && (
              <section className={styles.grupo} style={{ "--cor": g.cor } as CSSProperties}>
                <h2 className={styles.grupoTitulo}>{g.titulo}</h2>
                <ul className={styles.lista}>
                  {itens.map((l) => (
                    <li key={l.id} className={styles.item}>
                      <Link href={`/leis/${l.id}/`}>
                        <strong>{l.nome}</strong>
                        <span className="muted">
                          {l.artigos} artigos · texto do Planalto de {l.coletadoEm.split("-").reverse().join("/")}
                        </span>
                      </Link>
                      <ProgressoLei lei={l.id} total={l.unidades} cor={g.cor} />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
