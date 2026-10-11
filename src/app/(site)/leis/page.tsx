import type { Metadata } from "next";
import Link from "next/link";
import { leisDoLeitor } from "@/content/leis";
import styles from "./leis.module.css";

export const metadata: Metadata = {
  title: "Lei seca",
  description: "Leitura da lei crua, atualizada a partir do Planalto: texto vigente, linha do tempo, marcações e vade-mécum.",
};

export default function LeisPage() {
  const leis = leisDoLeitor();
  return (
    <div className="container section">
      <span className="eyebrow">Lei seca</span>
      <h1>Leitura da lei crua</h1>
      <p className="lead">
        O texto compilado do Planalto, só com a redação em vigor (as anteriores aparecem se você pedir). Escolha uma data para ver a lei
        como estava naquele dia, marque com cores, anote e monte o seu vade-mécum.
      </p>
      <div className={styles.atalhos}>
        <Link className="btn btn-gold" href="/leis/minha-leitura/">
          Minha leitura: os artigos que mais erro
        </Link>
        <Link className="btn" href="/vademecum/">
          Montar vade-mécum
        </Link>
      </div>
      <ul className={styles.lista}>
        {leis.map((l) => (
          <li key={l.id}>
            <Link href={`/leis/${l.id}/`}>
              <strong>{l.nome}</strong>
              <span className="muted">
                {l.artigos} artigos · texto do Planalto de {l.coletadoEm.split("-").reverse().join("/")}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
