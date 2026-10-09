// Converte as imagens-fonte de assets/imagens/*.{png,jpg} em WebP otimizados em public/img/.
// Gera larguras 800/1400/2000 (sufixo -800, -1400) + a versão cheia sem sufixo.
// Uso: node scripts/optimize-images.mjs
import { readdirSync, mkdirSync, existsSync, statSync } from "node:fs";
import { join, parse } from "node:path";
import sharp from "sharp";

const SRC = new URL("../assets/imagens/", import.meta.url).pathname;
const OUT = new URL("../public/img/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
if (!existsSync(SRC)) process.exit(0);

for (const file of readdirSync(SRC)) {
  if (!/\.(png|jpe?g|webp)$/i.test(file)) continue;
  const { name } = parse(file);
  const input = join(SRC, file);
  const target = join(OUT, `${name}.webp`);
  if (existsSync(target) && statSync(target).mtimeMs > statSync(input).mtimeMs) continue;
  const img = sharp(input);
  const { width } = await img.metadata();
  await img.clone().resize({ width: Math.min(width, 2000) }).webp({ quality: 80 }).toFile(target);
  for (const w of [800, 1400]) {
    if (w < width) await img.clone().resize({ width: w }).webp({ quality: 78 }).toFile(join(OUT, `${name}-${w}.webp`));
  }
  console.log("ok", name);
}
