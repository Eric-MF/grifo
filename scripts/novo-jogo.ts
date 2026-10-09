// Cria um jogo novo na plataforma: src/games/<slug>/index.ts (a partir de
// scripts/modelos/jogo.ts.txt, já jogável) + a entrada em src/games/registry.ts.
//
//   npm run novo:jogo -- tribunal-runner "Tribunal Runner" [--emoji 🏃]
//
// O jogo aparece sozinho em /jogos e em /jogos/<slug>/. Detalhes: docs/COMO-ADICIONAR.md.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const argv = process.argv.slice(2);
const iEmoji = argv.indexOf("--emoji");
const emoji = iEmoji >= 0 ? argv[iEmoji + 1] : "🎮";
const [slug, titulo] = argv.filter((a, i) => !a.startsWith("--") && (iEmoji < 0 || i !== iEmoji + 1));
if (!slug || !titulo) {
  console.error('uso: npm run novo:jogo -- <slug> "Título" [--emoji 🎮]');
  process.exit(1);
}
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
  console.error(`slug "${slug}" inválido: use letras minúsculas, números e hífen (vira a URL /jogos/${slug}/).`);
  process.exit(1);
}
const dir = join(ROOT, "src/games", slug);
const registro = join(ROOT, "src/games/registry.ts");
let reg = readFileSync(registro, "utf8");
if (existsSync(dir) || reg.includes(`slug: "${slug}"`)) {
  console.error(`o jogo "${slug}" já existe.`);
  process.exit(1);
}
// O id entra no código de verificação com 4 bits (1–15) e nunca deve ser reutilizado.
const ids = [...reg.matchAll(/^\s+id: (\d+),/gm)].map((m) => Number(m[1]));
const id = Math.max(0, ...ids) + 1;
if (id > 15) {
  console.error("limite de 15 jogos do código de verificação atingido: aumente o campo `jogo` em src/lib/codigo/codigo.ts (nova versão do formato).");
  process.exit(1);
}

mkdirSync(dir, { recursive: true });
const modelo = readFileSync(join(ROOT, "scripts/modelos/jogo.ts.txt"), "utf8");
writeFileSync(join(dir, "index.ts"), modelo.replaceAll("__TITULO__", titulo));

const q = (s: string) => JSON.stringify(s);
const entrada = `  {
    id: ${id},
    slug: ${q(slug)},
    titulo: ${q(titulo)},
    descricao: "Pegue os processos que caem; o ⚖️ dourado traz uma pergunta de 2ª fase.",
    emoji: ${q(emoji)},
    dica: "Arraste, clique ou use ← → para pegar os processos",
    carregar: () => import(${q(`./${slug}`)}).then((m) => m.default),
  },
`;
const fimLista = reg.indexOf("];", reg.indexOf("export const JOGOS"));
reg = reg.slice(0, fimLista) + entrada + reg.slice(fimLista);
writeFileSync(registro, reg);

console.log(`src/games/${slug}/index.ts criado e registrado (id ${id}) em src/games/registry.ts.

Próximos passos:
  • npm run dev → /jogos/${slug}/   (já é jogável)
  • edite descricao/dica/capa em src/games/registry.ts e a lógica em src/games/${slug}/index.ts
  • capa opcional: assets/imagens/<nome>.jpg → node scripts/optimize-images.mjs → capa: "<nome>"`);
