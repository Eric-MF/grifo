import type { MetadataRoute } from "next";
import { SITE } from "@/config/site";
import { examesCorrigiveis } from "@/content/load";
import { leisDoLeitor } from "@/content/leis";
import { JOGOS } from "@/games/registry";
import { TRIBUNAIS, type Tribunal } from "@/lib/leis/sumulas";

// O mapa do site para os buscadores (sitemap.xml, gerado no build). Só as páginas públicas: ficam de fora as que
// mostram dados do próprio aluno (resultados, minha leitura), as de impressão (/print) e as que não se indexam.
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const url = (caminho: string) => `${SITE.url}${caminho}`;
  const fixas = ["/", "/provas/", "/provas/todos/", "/simulados/", "/estatisticas/", "/leis/", "/vademecum/", "/jogos/", "/treino/", "/verificar/"];
  return [
    ...fixas.map((c) => ({ url: url(c), changeFrequency: "weekly" as const, priority: c === "/" ? 1 : 0.8 })),
    ...examesCorrigiveis().map(({ exame }) => ({ url: url(`/simulados/${exame}/`), changeFrequency: "monthly" as const, priority: 0.6 })),
    ...leisDoLeitor().map((l) => ({ url: url(`/leis/${l.id}/`), changeFrequency: "weekly" as const, priority: 0.6 })),
    ...(Object.keys(TRIBUNAIS) as Tribunal[]).map((t) => ({ url: url(`/leis/sumulas/${t}/`), changeFrequency: "weekly" as const, priority: 0.6 })),
    ...JOGOS.map((j) => ({ url: url(`/jogos/${j.slug}/`), changeFrequency: "monthly" as const, priority: 0.5 })),
  ];
}
