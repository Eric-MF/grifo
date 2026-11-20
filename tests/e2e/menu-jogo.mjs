// O menu do jogo: o botão de informações, as opções de pergunta com a explicação ao tocar, os ícones de som, efeitos e
// poder automático, a ficha do personagem, o gesto de segurar e deslizar pelos personagens (soltar fora volta ao que
// estava), o poder da ficha abrindo o painel de Poderes e, no celular deitado, a prévia do poder aparecendo só quando
// estava fora da vista. Falha (código 1) se algo não funcionar.
// Uso: node tests/e2e/menu-jogo.mjs [baseURL]
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://100.80.118.27:3100";
const falhas = [];
const ok = (cond, msg) => {
  if (!cond) falhas.push(msg);
};

const b = await chromium.launch();
async function abrir(w, h, toque) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: toque, isMobile: toque });
  await ctx.addInitScript(() => {
    localStorage.setItem("grifo:prefs", JSON.stringify({ layout: "celular" }));
    localStorage.setItem("grifo:jogo:flap-suitcase", JSON.stringify({ opcoes: { estilo: "classico", nivel: 1, som: true, personagem: "maleta" }, progresso: { xp: 99999, moedas: 0, comprados: ["classico"] } }));
  });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/jogos/flap-suitcase/`, { waitUntil: "networkidle" });
  await p.getByRole("button", { name: "▶ Jogar" }).waitFor();
  return { p, ctx };
}
const caixa = (p) => p.locator('[class*="menuBox"]').first();
const nomeNaFicha = (p) => p.locator('[class*="fichaNome"] strong').first().textContent();

try {
  // ---------- celular em pé ----------
  {
    const { p, ctx } = await abrir(390, 844, true);
    // informações
    ok((await p.locator("#info-jogo").count()) === 0, "a informação começa fechada");
    await p.getByRole("button", { name: "Como jogar" }).click();
    ok(await p.locator("#info-jogo").isVisible(), "o botão de informações abre o como jogar");
    ok(/bater as asas/.test((await p.locator("#info-jogo").textContent()) ?? ""), "o como jogar tem a explicação");
    ok(/Poder automático:/.test((await p.locator("#info-jogo").textContent()) ?? ""), "o como jogar tem a legenda dos botões do alto");
    ok((await p.getByText("Como jogar", { exact: true }).count()) === 0 || !(await p.locator("details summary", { hasText: "Como jogar" }).count()), "a seção antiga Como jogar saiu");
    // ícones do topo
    const som = p.getByRole("button", { name: "Som", exact: true });
    ok((await som.getAttribute("aria-pressed")) === "true", "o som começa ligado");
    await som.click();
    ok((await som.getAttribute("aria-pressed")) === "false", "o ícone do som desliga");
    const salvo = await p.evaluate(() => JSON.parse(localStorage.getItem("grifo:jogo:flap-suitcase")).opcoes.som);
    ok(salvo === false, "o som desligado fica gravado");
    ok((await p.getByRole("status").filter({ hasText: "Som desligado" }).count()) === 1, "tocar no som diz o que mudou");
    await p.getByRole("button", { name: "Poder automático" }).click();
    ok((await p.getByRole("status").filter({ hasText: "Poder manual" }).count()) === 1, "tocar no poder automático diz o que ele faz");
    await p.getByRole("button", { name: "Poder automático" }).click();
    // opções de pergunta: por padrão, o automático e todos os tipos; a explicação só aparece ao tocar
    ok((await p.getByRole("button", { name: "Automático", exact: true }).getAttribute("aria-pressed")) === "true", "o modo automático das perguntas não vem ligado por padrão");
    for (const tipo of ["Peça e fundamento", "Por dentro da peça", "Questões discursivas", "Objetivas da 1ª fase"])
      ok((await p.getByRole("button", { name: tipo, exact: true }).getAttribute("aria-pressed")) === "true", `o tipo ${tipo} não vem ligado por padrão`);
    ok((await p.locator('[class*="perguntas"] [class*="explica"]').count()) === 0, "a explicação começa fechada");
    await p.getByRole("button", { name: "Automático", exact: true }).click();
    const explica = p.locator('[class*="perguntas"] [class*="explica"]').first();
    ok(/Como no treino/.test((await explica.textContent()) ?? ""), "tocar no Automático mostra o que ele é");
    await p.getByRole("button", { name: "Médio", exact: true }).click();
    ok(/Recorde/.test((await explica.textContent()) ?? ""), "tocar na dificuldade mostra a explicação dela");
    await p.getByRole("button", { name: "Por dentro da peça" }).click();
    ok(/endereçamento/.test((await explica.textContent()) ?? ""), "tocar no tipo mostra o que ele cobra");
    ok((await p.getByRole("button", { name: "Por dentro da peça" }).getAttribute("aria-pressed")) === "false", "o tipo marcado, tocado, não fica desmarcado");
    await p.getByRole("button", { name: "Por dentro da peça" }).click();
    ok((await p.getByRole("button", { name: "Por dentro da peça" }).getAttribute("aria-pressed")) === "true", "o tipo tocado de novo não fica marcado");
    // personagens: o quadro só com o desenho, o nome na ficha
    ok((await nomeNaFicha(p)) === "Maleta do estagiário", "a ficha mostra o personagem atual");
    await p.getByRole("button", { name: "Grifo", exact: true }).click();
    ok((await nomeNaFicha(p)) === "Grifo", "tocar num personagem o escolhe e mostra na ficha");
    ok((await p.getByRole("button", { name: "Grifo", exact: true }).getAttribute("aria-pressed")) === "true", "o personagem escolhido fica marcado");
    // segurar e deslizar: o toque de verdade (CDP), parado um instante e depois andando pelos quadros
    const cdp = await ctx.newCDPSession(p);
    const centro = async (nome) => {
      const r = await p.getByRole("button", { name: nome, exact: true }).boundingBox();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    };
    await p.getByRole("button", { name: "Juiz", exact: true }).scrollIntoViewIfNeeded();
    const a = await centro("Juiz");
    const bb = await centro("Promotor");
    const toque = (type, pt) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pt ? [{ x: pt.x, y: pt.y }] : [] });
    await toque("touchStart", a);
    await p.waitForTimeout(420);
    await toque("touchMove", { x: (a.x + bb.x) / 2, y: (a.y + bb.y) / 2 });
    await toque("touchMove", bb);
    await p.waitForTimeout(80);
    ok((await nomeNaFicha(p)) === "Promotor", "deslizando, a ficha mostra o personagem sob o dedo");
    const balao = p.locator('[class*="balao"]').first();
    ok(await balao.isVisible(), "deslizando, aparece o balão com o nome");
    ok(/Promotor/.test((await balao.textContent()) ?? ""), "o balão é do personagem sob o dedo");
    const rb = await balao.boundingBox();
    const rq = await p.getByRole("button", { name: "Promotor", exact: true }).boundingBox();
    ok(rb && rq && rb.y + rb.height <= rq.y + 2, "o balão fica acima do personagem, fora do dedo");
    ok((await p.getByRole("button", { name: "Grifo", exact: true }).getAttribute("aria-pressed")) === "true", "deslizando, o atual ainda não muda");
    await toque("touchEnd");
    await p.waitForTimeout(120);
    ok((await p.getByRole("button", { name: "Promotor", exact: true }).getAttribute("aria-pressed")) === "true", "soltar sobre um personagem o escolhe");
    ok((await p.locator('[class*="balao"]').count()) === 0, "ao soltar, o balão some");
    // de novo, mas soltando fora da grade: volta ao que estava
    const c = await centro("Juiz");
    await toque("touchStart", c);
    await p.waitForTimeout(420);
    await toque("touchMove", { x: c.x, y: c.y - 5 });
    const fora = await p.locator('[class*="ficha"]').first().boundingBox();
    await toque("touchMove", { x: fora.x + fora.width / 2, y: fora.y + fora.height - 4 });
    await toque("touchEnd");
    await p.waitForTimeout(120);
    ok((await p.getByRole("button", { name: "Promotor", exact: true }).getAttribute("aria-pressed")) === "true", "soltar fora da grade mantém o personagem que estava");
    ok((await nomeNaFicha(p)) === "Promotor", "soltar fora volta a ficha ao atual");
    // o poder da ficha abre o painel de Poderes e desce até ele
    await p.locator('[class*="fichaPoder"]').first().click();
    await p.waitForTimeout(900);
    const painel = p.locator('[class*="poderPainel"]').first();
    ok(await painel.isVisible(), "o poder da ficha abre o painel do poder");
    ok(/Denúncia/.test((await painel.textContent()) ?? ""), "é o poder do personagem (Denúncia, do Promotor)");
    const rc = await caixa(p).boundingBox();
    const rp = await p.locator('[class*="previaPoder"]').first().boundingBox();
    ok(rp && rp.y >= rc.y && rp.y + rp.height <= rc.y + rc.height + 1, "o painel fica à vista, com a prévia do poder");
    // os poderes também deslizam: segura num, anda até outro e solta; soltar fora mantém o aberto
    const poderA = await p.getByRole("button", { name: /^Habeas Corpus:/ }).boundingBox();
    const poderB = await p.getByRole("button", { name: /^Prazo em Dobro:/ }).boundingBox();
    const meio = (r) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
    await p.getByRole("button", { name: /^Habeas Corpus:/ }).scrollIntoViewIfNeeded();
    const pa = meio(await p.getByRole("button", { name: /^Habeas Corpus:/ }).boundingBox());
    const pb = meio(await p.getByRole("button", { name: /^Prazo em Dobro:/ }).boundingBox());
    ok(poderA && poderB, "os poderes estão na grade");
    await toque("touchStart", pa);
    await p.waitForTimeout(420);
    await toque("touchMove", { x: (pa.x + pb.x) / 2, y: pa.y });
    await toque("touchMove", pb);
    await p.waitForTimeout(80);
    ok(/Prazo em Dobro/.test((await p.locator('[class*="balao"]').first().textContent()) ?? ""), "deslizando pelos poderes, o balão mostra o poder sob o dedo");
    await toque("touchEnd");
    await p.waitForTimeout(150);
    ok((await p.getByRole("button", { name: /^Prazo em Dobro:/ }).getAttribute("aria-pressed")) === "true", "soltar sobre um poder o abre");
    await toque("touchStart", pa);
    await p.waitForTimeout(420);
    await toque("touchMove", { x: pa.x, y: pa.y + 4 });
    const longe = await p.locator('[class*="poderPainel"]').first().boundingBox();
    await toque("touchMove", { x: longe.x + longe.width / 2, y: longe.y + longe.height / 2 });
    await toque("touchEnd");
    await p.waitForTimeout(150);
    ok((await p.getByRole("button", { name: /^Prazo em Dobro:/ }).getAttribute("aria-pressed")) === "true", "soltar fora da grade de poderes mantém o que estava aberto");
    await ctx.close();
  }
  // ---------- celular deitado: a prévia aparece só se estava fora da vista ----------
  {
    const { p, ctx } = await abrir(844, 390, true);
    const box = caixa(p);
    // os personagens: com a grade no pé da caixa, escolher um traz a ficha para a vista
    await box.evaluate((el, alvo) => {
      const b = el.querySelector(alvo).getBoundingClientRect();
      const c = el.getBoundingClientRect();
      el.scrollTop += b.bottom - c.bottom + 4;
    }, '[aria-label="Balança da Justiça"]');
    await p.waitForTimeout(200);
    await p.getByRole("button", { name: "Balança da Justiça", exact: true }).click();
    await p.waitForTimeout(800);
    const rcf = await box.boundingBox();
    const rf = await p.locator('[class*="ficha"]').first().boundingBox();
    ok(rf && rf.y + rf.height <= rcf.y + rcf.height + 1, "deitado: escolher o personagem traz a ficha para a vista");
    const botao = p.getByRole("button", { name: /^Habeas Corpus:/ });
    await botao.scrollIntoViewIfNeeded();
    // deixa o botão no pé da caixa, para o painel abrir abaixo da tela
    await box.evaluate((el, alvo) => {
      const b = el.querySelector(alvo).getBoundingClientRect();
      const c = el.getBoundingClientRect();
      el.scrollTop += b.bottom - c.bottom + 4;
    }, '[aria-label^="Habeas Corpus:"]');
    await p.waitForTimeout(200);
    const antes = await box.evaluate((el) => el.scrollTop);
    await botao.click();
    await p.waitForTimeout(900);
    const depois = await box.evaluate((el) => el.scrollTop);
    const rc = await box.boundingBox();
    const rp = await p.locator('[class*="previaPoder"]').first().boundingBox();
    ok(depois > antes, "deitado: abrir o poder abaixo da vista rola a caixa");
    ok(rp && rp.y + rp.height <= rc.y + rc.height + 1 && rp.y >= rc.y - 1, "deitado: a prévia do poder fica à vista");
    // com a prévia já à vista, abrir outro poder não mexe na rolagem
    const outro = p.getByRole("button", { name: /^Vade Mecum:/ });
    const parado = await box.evaluate((el) => el.scrollTop);
    const vis = await outro.boundingBox();
    if (vis && vis.y > rc.y && vis.y + vis.height < rc.y + rc.height) {
      await outro.click();
      await p.waitForTimeout(700);
      const rp2 = await p.locator('[class*="previaPoder"]').first().boundingBox();
      const visivel = rp2 && rp2.y >= rc.y - 1 && rp2.y + rp2.height <= rc.y + rc.height + 1;
      if (visivel) ok(Math.abs((await box.evaluate((el) => el.scrollTop)) - parado) < 2, "deitado: com a prévia à vista, nada rola");
    }
    // girar o celular muda o tamanho da prévia (100% de largura em pé, 150 px deitado): o desenho acompanha a
    // proporção nova, sem ficar achatado nem esticado
    const proporcao = () =>
      p.locator('canvas[class*="previaPoder"]').first().evaluate((c) => ({ css: c.clientWidth / c.clientHeight, buf: c.width / c.height }));
    for (const [largura, altura, rotulo] of [[390, 760, "em pé"], [760, 390, "deitado de novo"]]) {
      await p.setViewportSize({ width: largura, height: altura });
      await p.waitForTimeout(500);
      const r = await proporcao();
      ok(Math.abs(r.css - r.buf) < 0.02, `girar (${rotulo}): a prévia mantém a proporção (tela ${r.css.toFixed(2)}, desenho ${r.buf.toFixed(2)})`);
    }
    await ctx.close();
  }
  // ---------- PC ----------
  {
    const { p, ctx } = await abrir(1280, 800, false);
    await p.getByRole("button", { name: "Pombodoro", exact: true }).hover();
    await p.waitForTimeout(100);
    ok((await nomeNaFicha(p)) === "Pombodoro", "PC: passar o mouse mostra o personagem na ficha");
    await p.mouse.move(5, 5);
    await p.waitForTimeout(100);
    ok((await nomeNaFicha(p)) === "Maleta do estagiário", "PC: tirar o mouse volta a ficha ao atual");
    const recorde = await p.getByRole("button", { name: "Recorde" }).count();
    ok(recorde === 0, "PC: sem recorde guardado, não há botão de recorde");
    await ctx.close();
  }
} finally {
  await b.close();
}

if (falhas.length) {
  console.log(`FALHOU (${falhas.length}):`);
  for (const f of falhas) console.log(`  ${f}`);
  process.exit(1);
}
console.log("ok: menu do jogo (informações, perguntas, ícones, personagens, gesto de deslizar, poderes)");
