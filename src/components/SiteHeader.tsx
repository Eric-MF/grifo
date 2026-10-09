import Link from "next/link";
import { NAV, SITE } from "@/config/site";
import { Logo } from "./Logo";
import { MenuMobile } from "./MenuMobile";
import { ViewModeMenu } from "./ViewModeMenu";
import styles from "./SiteHeader.module.css";

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.bar}`}>
        <Link href="/" className={styles.brand} aria-label={`${SITE.nome} — início`}>
          <Logo size={38} className={styles.logo} title="" />
          <span className={styles.name}>{SITE.nome}</span>
        </Link>
        <nav aria-label="Principal" className={styles.nav}>
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={styles.link}>
              {item.label}
            </Link>
          ))}
        </nav>
        <MenuMobile />
        <ViewModeMenu />
      </div>
    </header>
  );
}
