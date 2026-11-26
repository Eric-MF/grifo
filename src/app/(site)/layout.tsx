import { AvisoCookies } from "@/components/AvisoCookies";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { PopupArtigos } from "@/components/leis/PopupArtigos";
import { RegistroDeUso } from "@/components/RegistroDeUso";

export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <a href="#conteudo" className="skip-link">
        Pular para o conteúdo
      </a>
      <SiteHeader />
      <main id="conteudo">{children}</main>
      <SiteFooter />
      <PopupArtigos />
      <RegistroDeUso />
      <AvisoCookies />
    </>
  );
}
