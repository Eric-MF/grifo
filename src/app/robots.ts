import type { MetadataRoute } from "next";
import { SITE } from "@/config/site";

// robots.txt (gerado no build): tudo aberto aos buscadores, menos as páginas de impressão (que viram os PDFs) e os
// resultados do próprio aluno; o mapa do site vai junto.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/print/", "/treino/resultado/", "/leis/minha-leitura/"] },
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
