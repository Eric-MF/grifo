"use client";

// O resumo de "Curso" no cabeçalho: o que o curso oferece (o mesmo da seção da página inicial) e o link para ele.
import Link from "next/link";
import { courseHref, CURSO_ITENS } from "@/config/site";
import type { PropsResumo } from "../LinkComResumo";
import styles from "../ResumoDesempenho.module.css";

export default function ResumoCurso({ onSair }: PropsResumo) {
  return (
    <div className={styles.corpo}>
      <p className={styles.titulo}>
        Curso OAB Penal <span>inscrições em breve</span>
      </p>
      <p className={styles.texto}>Preparação guiada até a aprovação na 2ª fase:</p>
      <ul className={styles.itens}>
        {CURSO_ITENS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className={styles.acoes}>
        <Link href={courseHref()} onClick={onSair}>
          Quero conhecer o curso →
        </Link>
      </p>
    </div>
  );
}
