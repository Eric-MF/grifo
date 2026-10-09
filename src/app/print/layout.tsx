import type { Metadata } from "next";
import "./print.css";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Páginas só para gerar PDF (scripts/build-pdfs.ts). Sem cabeçalho/rodapé do site. */
export default function PrintLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="print-root">{children}</div>;
}
