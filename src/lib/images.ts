import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Imagens opcionais em public/img (geradas por scripts/optimize-images.mjs).
 * Só usar em Server Components: verifica no build se o arquivo existe, para que
 * o site continue funcionando (com o fallback desenhado em CSS/SVG) sem elas.
 */
export function optionalImage(name: string) {
  const dir = join(process.cwd(), "public", "img");
  if (!existsSync(join(dir, `${name}.webp`))) return null;
  const srcSet = [800, 1400]
    .filter((w) => existsSync(join(dir, `${name}-${w}.webp`)))
    .map((w) => `/img/${name}-${w}.webp ${w}w`)
    .concat(`/img/${name}.webp 2000w`)
    .join(", ");
  return { src: `/img/${name}.webp`, srcSet };
}
