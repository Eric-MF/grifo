// Melhorias dos poderes do Flap Suitcase, de ponta a ponta: a Duração, a Recarga, o Efeito e a Força de cada poder
// são lidos pela API de testes (window.__flap, só com ?debug=1) e comparados com os valores esperados; a compra no
// menu é feita pelos botões de verdade, e a gravação conferida no localStorage. Cada verificação roda num contexto novo.
// Falha (código 1) se algum número sair da tolerância, se a compra não acontecer como deve ou se a página gerar erro
// ou aviso no console. No fim imprime cada falha, ou um "ok" se não houver nenhuma.
// Uso: node tests/e2e/melhorias.mjs [baseURL]
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://100.80.118.27:3100";
const CHAVE_JOGO = "grifo:jogo:flap-suitcase";
const CHAVE_CONQUISTAS = "grifo:conquistas";

const falhas = [];
const erros = [];
const falha = (nome, msg) => falhas.push(`${nome}: ${msg}`);

/** Confere um número com o esperado (dentro da tolerância) e registra a falha com os dois valores. */
function conferir(nome, rotulo, real, esperado, tolerancia = 0) {
  if (typeof real !== "number" || !Number.isFinite(real) || Math.abs(real - esperado) > tolerancia)
    falha(nome, `${rotulo}: esperado ${esperado}${tolerancia ? ` ± ${tolerancia}` : ""}, veio ${real}`);
}

const navegador = await chromium.launch();

/** Abre um contexto novo com o progresso salvo pedido (gravado antes da primeira navegação) e uma página 1280x860. */
async function abrirPagina(nome, { personagem = "maleta", moedas = 0 } = {}) {
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 860 } });
  await ctx.addInitScript(
    ([personagem, moedas, chave]) => {
      try {
        localStorage.setItem(chave, JSON.stringify({ opcoes: { estilo: "classico", nivel: 1, som: false, autoPoder: false, personagem }, progresso: { xp: 0, moedas, comprados: [] } }));
      } catch {
        // sem armazenamento (about:blank): a navegação seguinte grava de novo
      }
    },
    [personagem, moedas, CHAVE_JOGO],
  );
  const page = await ctx.newPage();
  page.on("pageerror", (e) => erros.push(`${nome}: ${e}`));
  page.on("console", (m) => m.type() === "error" && erros.push(`${nome}: ${m.text()}`));
  return { ctx, page };
}

/** Roda um roteiro numa página nova; uma exceção vira falha desta verificação sem derrubar as outras. */
async function verificacao(nome, opcoes, roteiro) {
  const { ctx, page } = await abrirPagina(nome, opcoes);
  try {
    await roteiro(page, nome);
  } catch (e) {
    falha(nome, `interrompida: ${String(e.message).split("\n")[0]}`);
  } finally {
    await ctx.close();
  }
}

/** Abre a página de testes, começa uma partida e para os orbes (sem orbes, as moedas não entram nas contas). */
async function comecarPartida(page) {
  await page.goto(`${BASE}/jogos/flap-suitcase/?debug=1`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "▶ Jogar" }).click();
  await page.waitForFunction(() => window.__flap !== undefined);
  await page.evaluate(() => (window.__flap.orbesLigados = false));
  await page.keyboard.press("Space");
}

const estadoDoJogo = (page) => page.evaluate(() => window.__flap.estado());
const aplicarMelhorias = (page, m) => page.evaluate((m) => window.__flap.melhorias(m), m);
const ativar = (page, id) => page.evaluate((id) => window.__flap.ativar(id), id);
const lerSalvo = (page) => page.evaluate((c) => JSON.parse(localStorage.getItem(c) ?? "null"), CHAVE_JOGO);
const lerTentativasCompra = (page) =>
  page.evaluate((c) => JSON.parse(localStorage.getItem(c) ?? "{}").tentativasCompra ?? 0, CHAVE_CONQUISTAS);

/** Vai ao menu (sem Jogar), abre todos os grupos e o painel de Habeas Corpus; devolve o botão da 1ª trilha. */
async function abrirPainelHabeasCorpus(page) {
  await page.goto(`${BASE}/jogos/flap-suitcase/`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "▶ Jogar" }).waitFor();
  // a seção Poderes pode estar dentro de um grupo fechado
  await page.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));
  const poder = page.getByRole("button", { name: /^Habeas Corpus:/ });
  await poder.scrollIntoViewIfNeeded();
  await poder.click();
  return page.locator('[class*="poderPainel"] li').first().getByRole("button");
}

// 1. Habeas Corpus, Duração 5: 12 s de base + 1,2 s por nível = 18 s
await verificacao("1. Habeas Corpus, Duração 5", {}, async (page, nome) => {
  await comecarPartida(page);
  await aplicarMelhorias(page, { "escudo:duracao": 5 });
  await ativar(page, "escudo");
  conferir(nome, "ativos.escudo (s)", (await estadoDoJogo(page)).ativos.escudo, 18, 0.3);
});

// 2. Recarga: a Recarga 5 e a Força 5 do Arquivamento (personagem da maleta) somam ao tempo de carga
await verificacao("2. Recarga", {}, async (page, nome) => {
  await comecarPartida(page);
  await aplicarMelhorias(page, { "arquivamento:recarga": 5 });
  conferir(nome, "segundosCarga (recarga 5)", (await estadoDoJogo(page)).segundosCarga, 10);
  await aplicarMelhorias(page, { "arquivamento:forca": 5 });
  conferir(nome, "segundosCarga (recarga 5 + força 5)", (await estadoDoJogo(page)).segundosCarga, 15);
});

// 3. Prazo em Dobro, Efeito 5: o lento deixa a velocidade em 0,4 da base
await verificacao("3. Prazo em Dobro, Efeito 5", {}, async (page, nome) => {
  await comecarPartida(page);
  await aplicarMelhorias(page, { "lento:efeito": 5 });
  await ativar(page, "lento");
  const e = await estadoDoJogo(page);
  conferir(nome, "velocidade / velocidadeBase", e.velocidade / e.velocidadeBase, 0.4, 0.02);
});

// 4. Insignificância, Efeito 5: o raio do pássaro cai para 6 px
await verificacao("4. Insignificância, Efeito 5", {}, async (page, nome) => {
  await comecarPartida(page);
  await aplicarMelhorias(page, { "mini:efeito": 5 });
  await ativar(page, "mini");
  conferir(nome, "raio", (await estadoDoJogo(page)).raio, 6, 0.1);
});

// 5. Vade Mecum, Duração 5: o contrapeso do mundo sobe 1,5% por nível enquanto dura (1 + 0,075)
await verificacao("5. Vade Mecum, Duração 5", {}, async (page, nome) => {
  await comecarPartida(page);
  await aplicarMelhorias(page, { "ima:duracao": 5 });
  await ativar(page, "ima");
  const e = await estadoDoJogo(page);
  conferir(nome, "velocidade / velocidadeBase", e.velocidade / e.velocidadeBase, 1.075, 0.01);
});

// 6. Renascer, Força 5 (100% de chance de vida extra): três renascimentos dão 3 vidas; depois a fênix cai e perde uma
await verificacao("6. Renascer", { personagem: "fenixame" }, async (page, nome) => {
  await comecarPartida(page);
  await aplicarMelhorias(page, { "renascer:forca": 5 });
  for (let i = 0; i < 3; i++) await ativar(page, "renascer");
  conferir(nome, "vidas depois de 3 ativações", (await estadoDoJogo(page)).vidas, 3);
  // sem colisões ignoradas e sem Space: a fênix cai no chão
  await page.evaluate(() => (window.__flap.invulneravel = false));
  const inicio = Date.now();
  let e = await estadoDoJogo(page);
  while (e.vidas === 3 && Date.now() - inicio < 4000) {
    await page.waitForTimeout(15);
    e = await estadoDoJogo(page);
  }
  conferir(nome, "vidas depois da queda", e.vidas, 2);
  if (e.vidas === 2 && (typeof e.graca !== "number" || e.graca < 0.6 || e.graca > 0.76))
    falha(nome, `graça ao perder a vida: esperado entre 0.6 e 0.76 (0.75 s no nível 5), veio ${e.graca}`);
});

// 7. Tesouro, Força 5: 20 moedas de base + 4 por nível = 40. Melhoria, ativação e leituras no mesmo passo, sem o jogo andar no meio
await verificacao("7. Tesouro, Força 5", { personagem: "dracofisco" }, async (page, nome) => {
  await comecarPartida(page);
  const r = await page.evaluate(() => {
    const antes = window.__flap.estado().nMoedas;
    window.__flap.melhorias({ "tesouro:forca": 5 });
    window.__flap.ativar("tesouro");
    return { antes, depois: window.__flap.estado().nMoedas };
  });
  conferir(nome, "ganho de moedas", r.depois - r.antes, 40);
});

// 8. Tipificação, Força 5: +20 + 4 por nível pontos (40) e +5 + 1 por nível moedas (10)
await verificacao("8. Tipificação, Força 5", { personagem: "codigo" }, async (page, nome) => {
  await comecarPartida(page);
  const r = await page.evaluate(() => {
    const antes = window.__flap.estado();
    window.__flap.melhorias({ "tipificacao:forca": 5 });
    window.__flap.ativar("tipificacao");
    const depois = window.__flap.estado();
    return { pontos: depois.pontos - antes.pontos, moedas: depois.nMoedas - antes.nMoedas };
  });
  // a leitura é síncrona; a folga de 1 ponto fica por conta de uma coluna passada no mesmo quadro
  if (r.pontos < 40 || r.pontos > 41) falha(nome, `pontos ganhos: esperado 40 (ou 41), veio ${r.pontos}`);
  if (r.moedas < 10 || r.moedas > 11) falha(nome, `moedas ganhas: esperado 10 (ou 11), veio ${r.moedas}`);
});

// 9. Compra no menu: 500 moedas, 150 pela Duração do Habeas Corpus
await verificacao("9. Compra da melhoria no menu", { personagem: "maleta", moedas: 500 }, async (page, nome) => {
  const primeiraTrilha = await abrirPainelHabeasCorpus(page);
  await primeiraTrilha.click();
  const confirmar = page.getByRole("button", { name: "Melhorar", exact: true });
  await confirmar.waitFor({ state: "visible", timeout: 3000 });
  await confirmar.click();
  // o jogo grava logo depois do clique; espera um pouco antes de ler
  let salvo = null;
  for (let i = 0; i < 20; i++) {
    salvo = await lerSalvo(page);
    if (salvo?.progresso?.moedas === 350) break;
    await page.waitForTimeout(100);
  }
  conferir(nome, "progresso.moedas", salvo?.progresso?.moedas, 350);
  conferir(nome, 'progresso.melhorias["escudo:duracao"]', salvo?.progresso?.melhorias?.["escudo:duracao"], 1);
});

// 11. Garras: quebra 2 colunas no nível 0 e 7 na Força 5 (as que não estão na tela quebram quando surgem). Antes o
// alvo era o alcance do pulso das Asas de Ouro, que só pegava a coluna mais perto
for (const [forca, esperado] of [[0, 2], [5, 7]]) {
  await verificacao(`11. Garras, Força ${forca}`, { personagem: "gabaruda" }, async (page, nome) => {
    await comecarPartida(page);
    await page.waitForTimeout(800);
    await page.evaluate((f) => {
      window.__flap.melhorias({ "garras:forca": f });
      window.__flap.ativar("garras");
    }, forca);
    // espera as pendentes surgirem e quebrarem, mantendo o pássaro no ar
    const inicio = Date.now();
    let e = await estadoDoJogo(page);
    while ((e.garrasPendentes > 0 || e.quebradas < esperado) && Date.now() - inicio < 12000) {
      if (e.jogador.y > 330) await page.keyboard.press("Space");
      await page.waitForTimeout(40);
      e = await estadoDoJogo(page);
    }
    conferir(nome, "colunas quebradas", e.quebradas, esperado);
    conferir(nome, "pendentes no fim", e.garrasPendentes, 0);
    // depois de quebrar todas, as colunas novas voltam a surgir (antes, sem nenhuma coluna, nenhuma surgia mais)
    const depois = Date.now();
    while (!e.pilares.some((q) => !q.passou && q.x < e.W) && Date.now() - depois < 4000) {
      if (e.jogador.y > 330) await page.keyboard.press("Space");
      await page.waitForTimeout(40);
      e = await estadoDoJogo(page);
    }
    conferir(nome, "colunas na tela depois", e.pilares.filter((q) => !q.passou && q.x < e.W).length > 0 ? 1 : 0, 1);
  });
}

// 10. Compra sem moedas: nada de diálogo, e a tentativa conta para o Falcão Falimentar
await verificacao("10. Compra sem moedas", { personagem: "maleta", moedas: 0 }, async (page, nome) => {
  await page.goto(`${BASE}/jogos/flap-suitcase/`, { waitUntil: "networkidle" });
  const antes = await lerTentativasCompra(page);
  const primeiraTrilha = await abrirPainelHabeasCorpus(page);
  await primeiraTrilha.click();
  await page.waitForTimeout(300);
  const dialogo = await page.getByRole("button", { name: "Melhorar", exact: true }).isVisible().catch(() => false);
  if (dialogo) falha(nome, "apareceu o diálogo de confirmação 'Melhorar' sem moedas");
  conferir(nome, "tentativasCompra (aumento)", (await lerTentativasCompra(page)) - antes, 1);
});

await navegador.close();

for (const e of erros) falha("erro no navegador", e);

if (falhas.length) {
  console.log(`FALHOU: ${falhas.length} problema(s):`);
  for (const f of falhas) console.log(`  ${f}`);
  process.exit(1);
}
console.log("ok: todas as verificações de melhorias passaram");
