// Gera as prévias de compartilhar com a pontuação de cada um, em public/c/ (ver src/lib/share/previas.ts): para cada
// nota do simulado, com uma casa (0,0 a 10,0), e cada pontuação dos jogos (0 a PONTOS_MAX_PREVIA, e "mais"), uma página com a
// og:image e a imagem 1200 x 630, na arte da prévia do site (a borda grega e o grifo), com a pontuação no centro.
// As redes não rodam JavaScript: leem a og:image da página; quem clica é levado ao simulado ou ao jogo.
// Só refaz quando algo do desenho muda (o carimbo em public/c/.versao). Uso: node scripts/gerar-previas.ts [--forcar]
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createCanvas, GlobalFonts, Path2D, type Canvas } from "@napi-rs/canvas";
import sharp from "sharp";
import { LOGO_PATHS } from "../src/components/logo-paths.ts";
import { SITE } from "../src/config/site.ts";
import { JOGOS } from "../src/games/registry.ts";
import { NOTA_CORTE } from "../src/lib/correcao/grader.ts";
import { meandro } from "../src/lib/share/meandro.ts";
import { ARQUIVO_PREVIA, notaDaPrevia, PASTA_PREVIAS, PONTOS_MAX_PREVIA, trechoDaNota, trechoDosPontos } from "../src/lib/share/previas.ts";

const RAIZ = new URL("..", import.meta.url).pathname;
const SAIDA = join(RAIZ, "public", PASTA_PREVIAS);
const FONTES = join(RAIZ, "assets/fontes");
const W = 1200;
const H = 630;
const NAVY = "#03112c";
const GOLD = "#d69c45";
const GOLD_LIGHT = "#f0c97f";
const INK = "#eef2f7";
const CINZA = "#b9c6d6";

// ---------- o que entra no carimbo: se nada disso mudou, as prévias já estão em dia ----------
const ARQUIVOS_DO_DESENHO = [
  "scripts/gerar-previas.ts",
  "src/lib/share/previas.ts",
  "src/lib/share/meandro.ts",
  "src/components/logo-paths.ts",
  "assets/fontes/Inter-500.woff",
  "assets/fontes/Inter-800.woff",
  "assets/fontes/CormorantGaramond-700.woff",
];
const carimbo = createHash("sha256")
  .update(ARQUIVOS_DO_DESENHO.map((f) => readFileSync(join(RAIZ, f))).join("\n"))
  .update(JSON.stringify([SITE.url, NOTA_CORTE, JOGOS.map((j) => [j.slug, j.titulo, j.descricao])]))
  .digest("hex");
const ARQUIVO_CARIMBO = join(SAIDA, ".versao");
if (!process.argv.includes("--forcar") && existsSync(ARQUIVO_CARIMBO) && readFileSync(ARQUIVO_CARIMBO, "utf8") === carimbo) {
  console.log("prévias: em dia");
  process.exit(0);
}

for (const [arquivo, nome] of [
  ["Inter-500.woff", "Inter Previa 500"],
  ["Inter-800.woff", "Inter Previa 800"],
  ["CormorantGaramond-700.woff", "Cormorant Previa"],
]) {
  GlobalFonts.registerFromPath(join(FONTES, arquivo), nome);
}
const serif = (px: number) => `700 ${px}px "Cormorant Previa"`;
const sans = (peso: 500 | 800, px: number) => `${peso} ${px}px "Inter Previa ${peso}"`;

type Ctx = CanvasRenderingContext2D;
const ctxDe = (c: Canvas) => c.getContext("2d") as unknown as Ctx;

/** O grifo dourado de `tam` px, com o canto de cima à esquerda em (x, y); `espelhado` vira para a direita. */
function grifo(ctx: Ctx, x: number, y: number, tam: number, espelhado: boolean) {
  ctx.save();
  ctx.translate(espelhado ? x + tam : x, y);
  ctx.scale(((espelhado ? -1 : 1) * tam) / 210, tam / 210);
  ctx.fillStyle = GOLD;
  for (const d of LOGO_PATHS) ctx.fill(new Path2D(d) as unknown as globalThis.Path2D);
  ctx.restore();
}

/** Texto centrado em x, com espaçamento entre letras (em px). */
function centrado(ctx: Ctx, t: string, x: number, y: number, fonte: string, cor: string, espaco = 0) {
  ctx.font = fonte;
  ctx.fillStyle = cor;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.letterSpacing = `${espaco}px`;
  ctx.fillText(t, x + espaco / 2, y);
  ctx.letterSpacing = "0px";
}

/**
 * O fundo, igual para todas as prévias de um tipo: o azul com a luz no meio, a borda grega, os dois grifos de frente
 * um para o outro (como os suportes de um brasão) e, no alto, o nome GRIFO e a linha da 2ª fase.
 */
function fundo(rotulo: string): Canvas {
  const c = createCanvas(W, H);
  const ctx = ctxDe(c);
  const g = ctx.createRadialGradient(W * 0.5, H * 0.46, 40, W * 0.5, H * 0.5, W * 0.72);
  g.addColorStop(0, "#0d2e60");
  g.addColorStop(1, NAVY);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  meandro(ctx, W, H, 26, 30);
  grifo(ctx, 82, 190, 250, true);
  grifo(ctx, W - 82 - 250, 190, 250, false);
  centrado(ctx, "GRIFO", W / 2, 132, serif(64), INK, 4);
  centrado(ctx, "2ª FASE OAB · DIREITO PENAL", W / 2, 164, sans(800, 17), GOLD_LIGHT, 2.5);
  centrado(ctx, rotulo, W / 2, 222, sans(800, 21), GOLD_LIGHT, 3);
  centrado(ctx, SITE.dominio, W / 2, 556, sans(800, 24), GOLD, 1);
  return c;
}

/** A pontuação no centro, do maior tamanho que caiba entre os grifos, e a linha de baixo (o "de 10,00"). */
function pontuacao(ctx: Ctx, valor: string, cor: string, abaixo: string, destaque?: { texto: string; cor: string }) {
  let px = 200;
  ctx.font = sans(800, px);
  const larg = ctx.measureText(valor).width;
  // entre os grifos sobram uns 530 px: o número fica um pouco menor que isso, para não encostar nas asas
  if (larg > 480) px = Math.floor((px * 480) / larg);
  // uma sombra leve atrás do número, para ele saltar do fundo
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 6;
  centrado(ctx, valor, W / 2, 392, sans(800, px), cor, -2);
  ctx.restore();
  // abaixo da vírgula, que desce do número
  centrado(ctx, abaixo, W / 2, 466, sans(500, 30), CINZA);
  if (destaque) {
    ctx.font = sans(800, 22);
    const lp = ctx.measureText(destaque.texto).width + 40;
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.strokeStyle = destaque.cor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(W / 2 - lp / 2, 482, lp, 38, 19);
    ctx.fill();
    ctx.stroke();
    centrado(ctx, destaque.texto, W / 2, 509, sans(800, 22), destaque.cor);
  }
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** A página da prévia: só as tags que as redes leem e o caminho para quem clica. */
function pagina(o: { titulo: string; descricao: string; caminho: string; destino: string; redirecionar: string }) {
  const url = `${SITE.url}${o.caminho}`;
  const imagem = `${url}${ARQUIVO_PREVIA}`;
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(o.titulo)} · ${esc(SITE.nome)}</title>
<meta name="description" content="${esc(o.descricao)}">
<meta name="robots" content="noindex">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(SITE.nome)}">
<meta property="og:locale" content="pt_BR">
<meta property="og:title" content="${esc(o.titulo)}">
<meta property="og:description" content="${esc(o.descricao)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(imagem)}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="${W}">
<meta property="og:image:height" content="${H}">
<meta property="og:image:alt" content="${esc(o.titulo)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(o.titulo)}">
<meta name="twitter:description" content="${esc(o.descricao)}">
<meta name="twitter:image" content="${esc(imagem)}">
<script>${o.redirecionar}</script>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:${NAVY};color:${INK};font:16px system-ui,sans-serif}a{color:${GOLD_LIGHT}}img{max-width:min(92vw,600px);height:auto;border-radius:12px;display:block;margin:0 auto 1rem}</style>
</head>
<body>
<main><img src="${ARQUIVO_PREVIA}" alt="${esc(o.titulo)}" width="${W}" height="${H}"><p style="text-align:center"><a href="${esc(o.destino)}">Abrir no ${esc(SITE.nome)}</a></p></main>
</body>
</html>
`;
}

/**
 * Grava a imagem e a página de uma prévia na sua pasta. O JPEG sai pelo mozjpeg (sharp), uns 30% menor que o do
 * canvas na mesma qualidade: são milhares de imagens, e a do WhatsApp tem de ficar abaixo de 300 KB.
 */
async function gravar(pasta: string, imagem: Canvas, html: string) {
  mkdirSync(pasta, { recursive: true });
  const { data } = ctxDe(imagem).getImageData(0, 0, W, H);
  const jpeg = await sharp(Buffer.from(data.buffer, data.byteOffset, data.byteLength), { raw: { width: W, height: H, channels: 4 } })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
  writeFileSync(join(pasta, ARQUIVO_PREVIA), jpeg);
  writeFileSync(join(pasta, "index.html"), html);
}

/** Uma prévia: o fundo pronto e a pontuação por cima. */
function desenhar(base: Canvas, valor: string, cor: string, abaixo: string, destaque?: { texto: string; cor: string }) {
  const c = createCanvas(W, H);
  const ctx = ctxDe(c);
  ctx.drawImage(base as unknown as CanvasImageSource, 0, 0);
  pontuacao(ctx, valor, cor, abaixo, destaque);
  return c;
}

/** Roda as tarefas de `n` em `n` (a codificação do JPEG vai para outras threads). */
async function emLotes<T>(itens: T[], n: number, fazer: (x: T) => Promise<void>) {
  for (let i = 0; i < itens.length; i += n) await Promise.all(itens.slice(i, i + n).map(fazer));
}

rmSync(SAIDA, { recursive: true, force: true });
const inicio = Date.now();

// ---------- as notas do simulado ----------
const baseNota = fundo("NOTA NO SIMULADO");
// uma casa depois da vírgula (a segunda é cortada: ver decimosDaNota)
const notas = Array.from({ length: 101 }, (_, d) => d / 10);
await emLotes(notas, 16, async (nota) => {
  const texto = notaDaPrevia(nota);
  const aprovado = nota >= NOTA_CORTE;
  const destaque = aprovado ? { texto: "Aprovado(a)!", cor: GOLD } : nota >= 5 ? { texto: "Quase lá!", cor: INK } : { texto: "Em evolução", cor: CINZA };
  const caminho = `/${PASTA_PREVIAS}/nota/${trechoDaNota(nota)}/`;
  await gravar(
    join(SAIDA, "nota", trechoDaNota(nota)),
    desenhar(baseNota, texto, aprovado ? GOLD : INK, "de 10,0", destaque),
    pagina({
      titulo: `Tirei ${texto} no simulado da 2ª fase OAB Penal`,
      descricao: "Simulados com correção automática da 2ª fase da OAB em Direito Penal, no Grifo.",
      caminho,
      destino: "/simulados/",
      // com o exame no endereço (?exame=38), quem clica vai para o simulado dele
      redirecionar: `var e=new URLSearchParams(location.search).get("exame");location.replace(e&&/^[0-9a-z-]+$/i.test(e)?"/simulados/"+e+"/":"/simulados/");`,
    }),
  );
});

// ---------- os pontos de cada jogo ----------
for (const jogo of JOGOS) {
  const base = fundo(`PONTOS NO ${jogo.titulo.toLocaleUpperCase("pt-BR")}`);
  const pontos = [...Array.from({ length: PONTOS_MAX_PREVIA + 1 }, (_, i) => i), PONTOS_MAX_PREVIA + 1];
  await emLotes(pontos, 16, async (p) => {
    const mais = p > PONTOS_MAX_PREVIA;
    const n = (x: number) => x.toLocaleString("pt-BR");
    const valor = mais ? `${n(PONTOS_MAX_PREVIA)}+` : n(p);
    const titulo = mais ? `Fiz mais de ${n(PONTOS_MAX_PREVIA)} pontos no ${jogo.titulo}` : `Fiz ${n(p)} ${p === 1 ? "ponto" : "pontos"} no ${jogo.titulo}`;
    await gravar(
      join(SAIDA, "jogo", jogo.slug, trechoDosPontos(p)),
      desenhar(base, valor, GOLD, p === 1 ? "ponto" : "pontos"),
      pagina({
        titulo,
        descricao: jogo.descricao,
        caminho: `/${PASTA_PREVIAS}/jogo/${jogo.slug}/${trechoDosPontos(p)}/`,
        destino: `/jogos/${jogo.slug}/`,
        redirecionar: `location.replace("/jogos/${jogo.slug}/");`,
      }),
    );
  });
}

writeFileSync(ARQUIVO_CARIMBO, carimbo);
console.log(`prévias: ${notas.length} notas e ${JOGOS.length} jogo(s), em ${((Date.now() - inicio) / 1000).toFixed(1)} s`);
