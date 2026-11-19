import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Carlito, Cormorant_Garamond, Inter } from "next/font/google";
import { IMAGEM_COMPARTILHAR, SITE } from "@/config/site";
import { PREFS_BOOT_SCRIPT } from "@/lib/prefs";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});
// Métrica idêntica à Calibri usada nos cadernos da FGV (páginas de impressão).
const carlito = Carlito({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-carlito", display: "swap" });
const atkinson = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-atkinson",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.nome} · ${SITE.slogan}`, template: `%s · ${SITE.nome}` },
  description: SITE.descricao,
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: SITE.nome,
    title: `${SITE.nome} · ${SITE.slogan}`,
    description: SITE.descricao,
    // a imagem da prévia do link (X, Facebook, LinkedIn, WhatsApp, Telegram): as redes não recebem imagem pelo link
    // de compartilhar, só leem esta da página
    images: [{ url: IMAGEM_COMPARTILHAR, width: 1200, height: 630, alt: `${SITE.nome} · 2ª fase OAB · Direito Penal` }],
  },
  twitter: { card: "summary_large_image", images: [IMAGEM_COMPARTILHAR] },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f4ee" },
    { media: "(prefers-color-scheme: dark)", color: "#03112c" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${cormorant.variable} ${atkinson.variable} ${carlito.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFS_BOOT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
