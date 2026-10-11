// Confere o leitor de leis em um site já servido: node tests/e2e/leis.mjs [BASE]
import { chromium } from "playwright";
import { existsSync, mkdtempSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3000";
const LEI = `${BASE}/leis/cp/`;
const falhas = [];
const checar = (ok, msg) => {
  if (!ok) falhas.push(msg);
};

const b = await chromium.launch();
const ctx = await b.newContext({ acceptDownloads: true });
const p = await ctx.newPage();
const erros = [];
p.on("pageerror", (e) => erros.push(e.message));

const abrirMais = async () => {
  await p.getByRole("button", { name: "Mais", exact: false }).first().click();
};
const abrirAa = async () => {
  await p.getByRole("button", { name: /Leitura/ }).first().click();
};
const visiveis = (sel) => p.locator(sel).evaluateAll((els) => els.filter((e) => e.offsetParent !== null).length);

await p.goto(LEI, { waitUntil: "networkidle" });
await p.evaluate(() => localStorage.clear());
await p.reload({ waitUntil: "networkidle" });

// 1. Revogados ocultos por padrão e mostrados pela opção
const revogados = await p.locator('[data-sup="1"]').count();
checar(revogados > 0, "cp sem dispositivos revogados no DOM");
checar((await p.locator("[data-revogados]").first().getAttribute("data-revogados")) === "0", "revogados não começam ocultos");
checar((await visiveis('[data-sup="1"]')) === 0, "revogados visíveis por padrão");

await abrirAa();
const caixaRevogados = p.getByLabel("Texto revogado e redações anteriores");
await caixaRevogados.check();
checar((await p.locator("[data-revogados]").first().getAttribute("data-revogados")) === "1", "opção não mostrou revogados");
checar((await visiveis('[data-sup="1"]')) > 0, "nenhum revogado visível com a opção marcada");
await p.waitForFunction(() => [...document.querySelectorAll('[data-sup="1"] .txt')].some((e) => e.offsetParent !== null && e.textContent.trim().length > 0), null, { timeout: 5000 }).catch(() => falhas.push("texto revogado não carregou ao marcar a opção"));

// 2. Preferência persiste após recarregar
await p.reload({ waitUntil: "networkidle" });
checar((await p.locator("[data-revogados]").first().getAttribute("data-revogados")) === "1", "preferência de revogados não persistiu");
await abrirAa();
checar(await p.getByLabel("Texto revogado e redações anteriores").isChecked(), "checkbox de revogados desmarcado após recarregar");

// 3. Links: preferência de abrir no Planalto
const contaLinks = () =>
  p.evaluate(() => {
    const raiz = document.querySelector("[data-revogados]");
    const todos = [...raiz.querySelectorAll("a[href]")].map((a) => a.getAttribute("href"));
    return {
      internos: todos.filter((h) => h.startsWith("/leis/")).length,
      planalto: todos.filter((h) => h.startsWith("https://www.planalto.gov.br")).length,
    };
  });
const antes = await contaLinks();
await p.getByLabel("Abrir referências no texto do Planalto").check();
const depois = await contaLinks();
checar(depois.planalto > antes.planalto && depois.internos < antes.internos, `preferência de link não trocou os destinos (${JSON.stringify(antes)} → ${JSON.stringify(depois)})`);
const trocaLinks = `${antes.internos} internos e ${antes.planalto} do Planalto → ${depois.internos} e ${depois.planalto}`;
await p.getByLabel("Abrir referências no texto do Planalto").uncheck();
await p.getByLabel("Abrir referências no texto do Planalto").check();
await p.reload({ waitUntil: "networkidle" });
await abrirAa();
checar(await p.getByLabel("Abrir referências no texto do Planalto").isChecked(), "preferência de destino dos links não persistiu");
await p.getByLabel("Abrir referências no texto do Planalto").uncheck();

// 4. Grifo persiste após recarregar (recarrega para fechar o painel de leitura)
await p.reload({ waitUntil: "networkidle" });
const selecionado = await p.evaluate(() => {
  for (const bloco of document.querySelectorAll('[data-i][data-sup="0"]')) {
    const walker = document.createTreeWalker(bloco, NodeFilter.SHOW_TEXT);
    for (let no = walker.nextNode(); no; no = walker.nextNode()) {
      if (no.textContent.length >= 40 && !no.parentElement.closest("button")) {
        const r = document.createRange();
        r.setStart(no, 0);
        r.setEnd(no, 30);
        const s = window.getSelection();
        s.removeAllRanges();
        s.addRange(r);
        return true;
      }
    }
  }
  return false;
});
checar(selecionado, "nenhum trecho de texto vigente para grifar");
if (selecionado) {
  const barra = p.getByRole("toolbar", { name: "Grifar trecho" });
  await barra.waitFor({ timeout: 3000 }).catch(() => falhas.push("barra de grifo não apareceu ao selecionar texto"));
  await barra.locator("button").first().click({ timeout: 5000 }).catch((e) => falhas.push(`botão de grifo não clicável: ${e.message.split("\n")[0]}`));
  await p.waitForTimeout(300);
  const gravado = await p.evaluate(() => {
    const chave = Object.keys(localStorage).find((k) => k.startsWith("grifo:marcacoes:cp"));
    return chave ? JSON.parse(localStorage.getItem(chave)) : [];
  });
  checar(gravado.length >= 1, "grifo não foi gravado em grifo:marcacoes:cp");
  await p.reload({ waitUntil: "networkidle" });
  const depoisRecarga = await p.evaluate(() => {
    const chave = Object.keys(localStorage).find((k) => k.startsWith("grifo:marcacoes:cp"));
    return chave ? JSON.parse(localStorage.getItem(chave)).length : 0;
  });
  checar(depoisRecarga === gravado.length && depoisRecarga >= 1, "grifo não sobreviveu ao recarregar");
}

// 5. Compartilhar: link com o texto no fragmento, sem servidor
await abrirMais();
await p.getByRole("button", { name: "Compartilhar", exact: true }).click();
const link = await p.getByLabel("Link", { exact: true }).inputValue();
checar(link.startsWith(LEI), `link compartilhado fora do esperado: ${link.slice(0, 80)}`);
checar(link.length < 8 * 1024, "link compartilhado acima de 8 KB sem grifos");
await p.locator('[aria-labelledby="compartilhar-titulo"]').getByRole("button", { name: "Fechar", exact: true }).click();

// 5b. Link acima de 8 KB: baixar o .grifo.json, conferir o conteúdo e apagar o arquivo
const grandes = Array.from({ length: 24 }, (_, k) => ({ id: `teste-${k}`, i: 0, disp: "art121", exato: `trecho de teste ${k}`, prefixo: "", sufixo: "", cor: "#f5d76e", nota: Array.from({ length: 800 }, () => Math.random().toString(36)[2] ?? "a").join(""), em: Date.now() }));
await p.evaluate((lista) => {
  const chave = Object.keys(localStorage).find((k) => k.startsWith("grifo:marcacoes:cp")) ?? "grifo:marcacoes:cp";
  localStorage.setItem(chave, JSON.stringify(lista));
}, grandes);
await p.reload({ waitUntil: "networkidle" });
await abrirMais();
await p.getByRole("button", { name: "Compartilhar", exact: true }).click();
const modal = p.locator('[aria-labelledby="compartilhar-titulo"]');
const caixa = modal.locator('input[type="checkbox"]');
if (!(await caixa.isChecked())) await caixa.click();
const linkDoModal = () => modal.getByLabel("Link", { exact: true }).inputValue();
for (let t = 0; t < 20 && (await linkDoModal()).length <= 8 * 1024; t++) await p.waitForTimeout(150);
checar((await linkDoModal()).length > 8 * 1024, "link com grifos grandes não passou de 8 KB");
const botaoBaixar = modal.getByRole("button", { name: "Baixar .grifo.json", exact: true });
const [download] = await Promise.all([p.waitForEvent("download", { timeout: 5000 }).catch(() => null), botaoBaixar.click()]);
if (!download) falhas.push("Baixar .grifo.json não gerou download");
else {
  const arquivo = join(mkdtempSync(join(tmpdir(), "grifo-")), download.suggestedFilename());
  await download.saveAs(arquivo);
  const baixado = JSON.parse(readFileSync(arquivo, "utf8"));
  checar(download.suggestedFilename() === "cp.grifo.json", `nome do download inesperado: ${download.suggestedFilename()}`);
  checar(baixado.lei === "cp" && baixado.m.length === grandes.length, "arquivo baixado não traz todos os grifos");
  unlinkSync(arquivo);
  checar(!existsSync(arquivo), "arquivo baixado não foi excluído");
}
await modal.getByRole("button", { name: "Fechar", exact: true }).click();

// 6. Abrir arquivo .grifo.json: aceita a mesma lei e recusa outra
const pasta = mkdtempSync(join(tmpdir(), "grifo-"));
const grifo = (lei) => join(pasta, `${lei}.grifo.json`);
const marca = { i: 0, exato: "trecho", prefixo: "", sufixo: "", cor: "#f5d76e" };
writeFileSync(grifo("cp"), JSON.stringify({ lei: "cp", m: [marca] }));
writeFileSync(grifo("cpp"), JSON.stringify({ lei: "cpp", m: [marca] }));
await p.goto(LEI, { waitUntil: "networkidle" });
await abrirMais();
await p.locator('input[type="file"]').setInputFiles(grifo("cpp"));
await p.getByRole("alert").filter({ hasText: "outra lei" }).waitFor({ timeout: 3000 }).catch(() => {});
checar((await p.getByRole("alert").filter({ hasText: "outra lei" }).count()) === 1, "arquivo de outra lei não foi recusado");
await p.locator('input[type="file"]').setInputFiles(grifo("cp"));
await p.getByRole("status").filter({ hasText: "Este link traz 1 grifo" }).waitFor({ timeout: 3000 }).catch(() => {});
checar((await p.getByRole("status").filter({ hasText: "Este link traz 1 grifo" }).count()) === 1, "arquivo .grifo.json da mesma lei não foi aberto");

// 7. Imprimir / PDF chama a impressão
await p.evaluate(() => {
  window.__impressoes = 0;
  window.print = () => {
    window.__impressoes++;
  };
});
if ((await p.locator('[role="dialog"][aria-label="Mais"]').count()) === 0) await abrirMais();
await p.getByRole("button", { name: "Imprimir / PDF" }).click();
await p.waitForTimeout(400);
checar((await p.evaluate(() => window.__impressoes)) === 1, "Imprimir / PDF não chamou window.print");

// 8. Vigência por local (Lei 263): a escolha fica salva
await abrirMais();
checar((await p.getByLabel("Vigência da Lei 263/1948", { exact: false }).count()) === 1, "seletor de local da Lei 263 não apareceu");
await p.getByLabel("Vigência da Lei 263/1948", { exact: false }).selectOption("df");
await p.reload({ waitUntil: "networkidle" });
await abrirMais();
checar((await p.getByLabel("Vigência da Lei 263/1948", { exact: false }).inputValue()) === "df", "local da Lei 263 não persistiu");

await b.close();

if (erros.length) falhas.push(`erros de página: ${erros.join(" | ")}`);
if (falhas.length) {
  console.error(falhas.map((f) => `✗ ${f}`).join("\n"));
  process.exit(1);
}
console.log(`leis: ${revogados} revogados ocultos por padrão; links ${trocaLinks}; grifo, compartilhar e impressão conferidos`);
