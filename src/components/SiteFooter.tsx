import Link from "next/link";
import { CONTATO, linkContato, NAV, SITE } from "@/config/site";
import { Logo } from "./Logo";
import styles from "./SiteFooter.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className="meander" aria-hidden />
      <div className={`container ${styles.inner}`}>
        <div className={styles.brand}>
          <Logo size={44} title="" />
          <div>
            <strong>{SITE.nome}</strong>
            <p className={styles.small}>{SITE.slogan}</p>
          </div>
        </div>
        <nav aria-label="Rodapé" className={styles.nav}>
          {NAV.map((i) => (
            <Link key={i.href} href={i.href}>
              {i.label}
            </Link>
          ))}
          <Link href="/verificar/">Verificar nota</Link>
        </nav>
        <p className={styles.small}>
          Sugestões: <a href={linkContato("sugestao")}>{CONTATO.sugestao}</a> · Erros: <a href={linkContato("erro")}>{CONTATO.erro}</a>
        </p>
        <p className={styles.small}>
          Material de estudo independente. Não temos vínculo com a OAB ou a FGV. Provas e gabaritos oficiais
          são reproduzidos para fins educacionais.
        </p>
        <p className={styles.small}>© {new Date().getFullYear()} {SITE.nome} · {SITE.dominio}</p>
      </div>
    </footer>
  );
}
