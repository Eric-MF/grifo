// Momentos do Visual no jogo de verdade: cada um dos 32 poderes é ligado no nível 5 do Visual e disparado com
// window.__flap.momento (na tela, com o personagem certo). Os poderes com mecânica (leve, ima, inquerito, congelar,
// arquivamento e voo) também são ativados, para o desenho da mecânica rodar por dois segundos. Falha (código 1) se
// alguma página gerar erro não tratado; no fim imprime os poderes com erro, ou um "ok" se não houver nenhum.
// Uso: node tests/e2e/momentos.mjs [baseURL]
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://100.80.118.27:3100";
const CHAVE_JOGO = "grifo:jogo:flap-suitcase";

/** Os 32 poderes de powers.ts, com o personagem que os usa (os poderes dos orbes são da maleta). */
const PODERES = [
  ["escudo", "maleta"],
  ["ima", "maleta"],
  ["lento", "maleta"],
  ["mini", "maleta"],
  ["fantasma", "maleta"],
  ["dobro", "maleta"],
  ["leve", "maleta"],
  ["congelar", "maleta"],
  ["prescricao", "maleta"],
  ["revisao", "maleta"],
  ["arquivamento", "maleta"],
  ["equilibrio", "balanca"],
  ["inquerito", "delegado"],
  ["presuncao", "defensor"],
  ["dosimetria", "juiz"],
  ["denuncia", "promotor"],
  ["tipificacao", "codigo"],
  ["voo", "grifo"],
  ["galope", "pecasus"],
  ["garras", "gabaruda"],
  ["renascer", "fenixame"],
  ["sabedoria", "corujuris"],
  ["tesouro", "dracofisco"],
  ["liberdade", "harpia-corpus"],
  ["eco", "morcegravo"],
  ["asas-de-cera", "icaro-liminar"],
  ["pterossauro", "prescritodactilo"],
  ["foco", "pombodoro"],
  ["agravo", "agraviao"],
  ["chifre", "sumulicornio"],
  ["penhora", "falcao-falimentar"],
  ["praga", "gafanhoto-mora"],
];

/** Os poderes com mecânica enquanto duram: também são ativados. */
const ATIVAR = new Set(["leve", "ima", "inquerito", "congelar", "arquivamento", "voo"]);

const falhas = [];
const navegador = await chromium.launch();

/** Abre um contexto com o personagem pedido (gravado antes de cada navegação) e uma página, com o coletor de erros. */
async function abrirPagina(personagem, sob) {
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 860 } });
  await ctx.addInitScript(
    ([personagem, chave]) => {
      try {
        localStorage.setItem(chave, JSON.stringify({ opcoes: { estilo: "classico", nivel: 1, som: false, autoPoder: false, personagem }, progresso: { xp: 0, moedas: 0, comprados: [] } }));
      } catch {
        // sem armazenamento (about:blank): a navegação seguinte grava de novo
      }
    },
    [personagem, CHAVE_JOGO],
  );
  const page = await ctx.newPage();
  page.on("pageerror", (e) => sob.erros.push(String(e?.message ?? e).split("\n")[0]));
  return { ctx, page };
}

/** Mantém o pássaro no ar por `ms`: bate as asas quando ele desce abaixo de y 330. */
async function voar(page, ms) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    const y = await page.evaluate(() => window.__jogador?.y ?? 0);
    if (y > 330) await page.keyboard.press("Space");
    await page.waitForTimeout(40);
  }
}

/** Roda um poder numa página já aberta: começa a partida, liga o Visual 5, dispara o momento (e a mecânica, se houver). */
async function testarPoder(page, id, sob) {
  sob.erros = [];
  try {
    await page.goto(`${BASE}/jogos/flap-suitcase/?debug=1`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "▶ Jogar" }).click();
    await page.waitForFunction(() => window.__flap !== undefined);
    await page.evaluate(() => (window.__flap.orbesLigados = false));
    await page.keyboard.press("Space");
    await voar(page, 1200);
    await page.evaluate((id) => window.__flap.melhorias({ [`${id}:visual`]: 5 }), id);
    await page.evaluate((id) => window.__flap.momento(id), id);
    await voar(page, 600);
    if (ATIVAR.has(id)) {
      await page.evaluate((id) => window.__flap.ativar(id), id);
      await voar(page, 2000);
    }
  } catch (e) {
    sob.erros.push(`interrompido: ${String(e?.message ?? e).split("\n")[0]}`);
  }
  if (sob.erros.length) falhas.push(`${id}: ${[...new Set(sob.erros)].join(" | ")}`);
}

// Um contexto e uma página por personagem; o poder é trocado recarregando a página.
const porPersonagem = new Map();
for (const [id, personagem] of PODERES) {
  if (!porPersonagem.has(personagem)) porPersonagem.set(personagem, []);
  porPersonagem.get(personagem).push(id);
}

for (const [personagem, ids] of porPersonagem) {
  const sob = { erros: [] };
  const { ctx, page } = await abrirPagina(personagem, sob);
  try {
    for (const id of ids) await testarPoder(page, id, sob);
  } finally {
    await ctx.close();
  }
}

await navegador.close();

if (falhas.length) {
  console.log(`FALHOU: ${falhas.length} poder(es) com erro:`);
  for (const f of falhas) console.log(`  ${f}`);
  process.exit(1);
}
console.log(`ok: momentos de ${PODERES.length} poderes sem erros`);
