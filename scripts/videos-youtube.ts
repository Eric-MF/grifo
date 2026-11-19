// A lista de vídeos do canal dos jogos (CANAL_VIDEOS, em src/config/site.ts), pelo feed público do YouTube (os 15 mais
// recentes, sem chave de API). Sai em content/videos-youtube.json: [{ id, titulo, publicado }].
//   node scripts/videos-youtube.ts
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { CANAL_VIDEOS } from "../src/config/site.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const r = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CANAL_VIDEOS.id}`);
if (!r.ok) throw new Error(`o feed do canal respondeu ${r.status}`);
const xml = await r.text();
const desescapar = (t: string) => t.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const videos = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, e]) => ({
  id: e!.match(/<yt:videoId>([^<]+)</)![1]!,
  titulo: desescapar(e!.match(/<title>([^<]*)</)?.[1] ?? ""),
  publicado: e!.match(/<published>([^<]+)</)?.[1]?.slice(0, 10) ?? "",
}));
// o feed vazio é o canal ainda sem vídeos: a lista fica vazia, e o banner dos jogos não aparece
if (!xml.includes("<feed")) throw new Error("o feed do canal não veio no formato esperado");
writeFileSync(join(ROOT, "content", "videos-youtube.json"), JSON.stringify({ canal: CANAL_VIDEOS, coletadoEm: new Date().toISOString().slice(0, 10), videos }, null, 1) + "\n");
console.log(videos.length ? `${videos.length} vídeos de ${CANAL_VIDEOS.nome}` : `${CANAL_VIDEOS.nome}: o canal ainda não tem vídeos`);
