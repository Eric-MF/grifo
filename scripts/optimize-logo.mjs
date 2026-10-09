// Gera public/logo.svg (e variantes) a partir de Grifo.svg, removendo a camada
// oculta de referência (PNGs embutidos) e os metadados do Inkscape.
// Uso: node scripts/optimize-logo.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import sharp from "sharp";

const src = readFileSync(new URL("../Grifo.svg", import.meta.url), "utf8");

// Só os <path> da camada "Grifo" (layer1) que não estão ocultos.
const layer = src.slice(src.indexOf('id="layer1"'));
const paths = [...layer.matchAll(/<path\b[\s\S]*?\/>/g)]
  .map((m) => m[0])
  .filter((p) => !/display:none/.test(p))
  .map((p) => p.match(/\sd="([^"]+)"/)[1].replace(/\s+/g, " ").trim());

const svg = (fill) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 210">` +
  `<g fill="${fill}">${paths.map((d) => `<path d="${d}"/>`).join("")}</g></svg>\n`;

mkdirSync(new URL("../public/", import.meta.url), { recursive: true });
const out = (name, content) => writeFileSync(new URL(`../public/${name}`, import.meta.url), content);

out("logo.svg", svg("#03112C"));
out("logo-ouro.svg", svg("#D69C45"));
out("logo-branco.svg", svg("#FFFFFF"));
// Versão com currentColor para uso inline no React.
writeFileSync(
  new URL("../src/components/logo-paths.ts", import.meta.url),
  `// Gerado por scripts/optimize-logo.mjs — não editar à mão.\nexport const LOGO_PATHS = ${JSON.stringify(paths)};\n`,
);

// Ícones: grifo ouro sobre fundo azul-marinho.
const icon = (size) =>
  sharp(Buffer.from(svg("#D69C45")))
    .resize(Math.round(size * 0.8), Math.round(size * 0.8))
    .extend({
      top: Math.round(size * 0.1), bottom: size - Math.round(size * 0.8) - Math.round(size * 0.1),
      left: Math.round(size * 0.1), right: size - Math.round(size * 0.8) - Math.round(size * 0.1),
      background: "#03112C",
    })
    .flatten({ background: "#03112C" })
    .png();
await icon(512).toFile(new URL("../public/icon-512.png", import.meta.url).pathname);
await icon(192).toFile(new URL("../public/icon-192.png", import.meta.url).pathname);
await icon(180).toFile(new URL("../src/app/apple-icon.png", import.meta.url).pathname);
writeFileSync(new URL("../src/app/icon.svg", import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -20 250 250"><rect x="-20" y="-20" width="250" height="250" rx="48" fill="#03112C"/><g fill="#D69C45">${paths.map((d) => `<path d="${d}"/>`).join("")}</g></svg>\n`);

console.log(`logo: ${paths.length} paths, ${svg("#000").length} bytes`);
