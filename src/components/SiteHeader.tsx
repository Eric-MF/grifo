import Link from "next/link";
import { NAV, SITE } from "@/config/site";
import { listarExames } from "@/content/load";
import { RotuloComIndicador } from "./IndicadorNavegacao";
import { LinkComResumo, type TipoResumo } from "./LinkComResumo";
import { Logo } from "./Logo";
import { MenuMobile } from "./MenuMobile";
import { ViewModeMenu } from "./ViewModeMenu";
import styles from "./SiteHeader.module.css";

const RESUMO_DO_LINK: Record<string, TipoResumo> = {
  "/provas/": "provas",
  "/simulados/": "simulados",
  "/estatisticas/": "estatisticas",
  "/leis/": "leis",
  "/jogos/": "jogos",
  "/#curso": "curso",
};

export function SiteHeader() {
  const totalSimulados = listarExames().filter((e) => e.corrigivel).length;
  return (
    <header className={styles.header}>
      <div className={`container ${styles.bar}`}>
        <Link href="/" className={styles.brand} aria-label={`${SITE.nome} — início`}>
          <Logo size={38} className={styles.logo} title="" />
          <span className={styles.name}>{SITE.nome}</span>
        </Link>
        <nav aria-label="Principal" className={styles.nav}>
          {NAV.map((item) => {
            // cada área abre o seu resumo com o mouse por cima
            const tipo = RESUMO_DO_LINK[item.href];
            return tipo ? (
              <LinkComResumo key={item.href} href={item.href} label={item.label} className={styles.link} tipo={tipo} totalSimulados={totalSimulados} />
            ) : (
              <Link key={item.href} href={item.href} className={styles.link}>
                <RotuloComIndicador>{item.label}</RotuloComIndicador>
              </Link>
            );
          })}
        </nav>
        <MenuMobile />
        <ViewModeMenu />
      </div>
    </header>
  );
}
