// Confere a aba Estatísticas em um site já servido: node tests/e2e/estatisticas.mjs [BASE]
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const falhas = [];
const checar = (ok, msg) => {
  if (!ok) falhas.push(msg);
};

const b = await chromium.launch();
const erros = [];

// ---------- 1. Exames anteriores, sem dados pessoais ----------
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage();
p.on("pageerror", (e) => erros.push(e.message));
await p.goto(`${BASE}/estatisticas/`, { waitUntil: "networkidle" });
await p.evaluate(() => localStorage.clear());
await p.reload({ waitUntil: "networkidle" });
// espera a página reagir (no next dev, a hidratação demora)
await p.getByRole("button", { name: "Ver os 14 exames ↓" }).waitFor();
await p.waitForFunction(() => document.querySelector("[role=tab][aria-selected=true]") && !!window.next);

const resumo = () => p.locator("[aria-live=polite]").first().innerText();
checar(/^46 exames do II/.test(await resumo()), `o filtro padrão (FGV) não mostra 46 exames: "${await resumo()}"`);
const andares = await p.locator("[data-andar]").filter({ has: p.locator("span") }).first().innerText();
checar(/APELAÇÃO/i.test(andares), `o 1º andar da pirâmide não é a Apelação: "${andares}"`);

// os formatos das peças do topo: pirâmide com 5 andares, pódio, pizza e mosaico, e a escolha fica salva
const vista = p.locator("section[aria-labelledby=t-piramide]");
await vista.getByRole("button", { name: "5 peças" }).click();
checar((await vista.locator("[role=list] > [role=listitem]").count()) === 5, "a pirâmide com 5 peças não tem 5 andares");
checar((await vista.locator("ol > li").count()) === 5, "a lista ao lado da pirâmide não tem 5 peças");
await vista.getByRole("button", { name: "Pódio", exact: true }).click();
checar((await vista.getByRole("list", { name: "O pódio das três peças do topo" }).getByRole("listitem").count()) === 3, "o pódio não tem 3 degraus");
await vista.getByRole("button", { name: "Pizza", exact: true }).click();
checar((await vista.locator("svg path").count()) === 6, "a pizza de 5 peças não tem 5 fatias e as outras");
await vista.getByRole("button", { name: "Mosaico", exact: true }).click();
checar((await vista.locator("[role=list] [role=listitem]").count()) === 6, "o mosaico de 5 peças não tem 5 blocos e as outras");
await vista.getByRole("button", { name: "Palpite do próximo" }).click();
checar(/%/.test(await vista.locator("ol > li").first().innerText()), "o critério do palpite não mostra a chance");
await p.reload({ waitUntil: "networkidle" });
await p.getByRole("button", { name: "Ver os 14 exames ↓" }).waitFor();
await p.waitForTimeout(500);
checar((await vista.getByRole("button", { name: "Mosaico", exact: true }).getAttribute("aria-pressed")) === "true", "a escolha do formato não ficou salva");
await vista.getByRole("button", { name: "Pirâmide", exact: true }).click();
await vista.getByRole("button", { name: "Mais cobradas" }).click();
await vista.getByRole("button", { name: "3 peças" }).click();

// o palpite do próximo exame: o aviso, o 48º, o peso e o teste no passado
const palpite = p.locator("section[aria-labelledby=t-palpite]");
const textoPalpite = await palpite.innerText();
checar(/É só uma estimativa/.test(textoPalpite), "o palpite não avisa que é só uma estimativa");
checar(/XLVIII Exame \(48º\)/.test(textoPalpite), "o palpite não é para o XLVIII Exame (48º)");
checar(/Testado em 36 exames/.test(textoPalpite), `o teste do palpite não usou os 36 exames desde o XII: ${textoPalpite.match(/Testado em \d+ exames/)?.[0]}`);
const primeiroComPeso = await palpite.locator("ol > li").first().innerText();
await palpite.getByRole("slider").fill("0");
checar(/Só a frequência/.test(await palpite.innerText()), "o peso 0 não diz \"Só a frequência\"");
checar(/Apelação/.test(await palpite.locator("ol > li").first().innerText()), "só pela frequência, a 1ª do palpite não é a Apelação");
await palpite.getByRole("slider").fill("1");
checar((await palpite.locator("ol > li").first().innerText()) === primeiroComPeso, "voltar o peso a 1 não voltou o palpite");
// a barra do teste mostra a porcentagem e os exames com o mouse por cima
const barraTeste = palpite.locator("[class*=testeBarras] > span").first();
// no meio da tela: em cima, o cabeçalho e as abas (fixos) cobririam a barra
await barraTeste.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
await p.waitForTimeout(300);
const caixaBarra = await barraTeste.boundingBox();
await p.mouse.move(caixaBarra.x + 20, caixaBarra.y + 8);
await p.waitForTimeout(250);
const dicaBarra = await p.locator("[class*=balao]").evaluate((e) => e.textContent).catch((e) => `erro: ${e.message.split("\n")[0]}`);
const sobBarra = await p.evaluate(([x, y]) => document.elementFromPoint(x, y)?.outerHTML.slice(0, 80), [caixaBarra.x + 20, caixaBarra.y + 8]);
checar(/1ª do palpite: \d+%[\s\S]*acertou no \d+º/.test(dicaBarra), `a barra do teste não mostra a porcentagem e os exames na dica: "${dicaBarra}" (sob o mouse: ${sobBarra})`);
await p.mouse.move(5, 5);
// a sequência das peças cabe sem rolar no computador
const rolaSequencia = await p.locator("[class*=sequenciaRolagem]").evaluate((r) => r.scrollWidth - r.clientWidth);
checar(rolaSequencia <= 0, `a sequência das peças rola de lado no computador (${rolaSequencia} px)`);

// o número em algarismos na dica do romano
const num45 = p.locator("#exame-45 [data-dica]").first();
await num45.scrollIntoViewIfNeeded();
await p.waitForTimeout(300);
const caixa45 = await num45.boundingBox();
await p.mouse.move(caixa45.x + caixa45.width / 2, caixa45.y + caixa45.height / 2);
await p.waitForTimeout(250);
checar(/45º Exame/.test(await p.locator("[class*=balao]").innerText().catch(() => "")), "a dica do XLV não mostra \"45º Exame\"");
await p.mouse.move(5, 5);

// "Ver os 14 exames" filtra a lista pela peça
await p.getByRole("button", { name: "Ver os 14 exames ↓" }).click();
await p.waitForTimeout(300);
checar((await p.locator("li[id^=exame-]").count()) === 14, "o filtro da Apelação não deixou 14 exames na lista");
checar((await p.getByRole("button", { name: /Tirar o filtro Peça: Apelação/ }).count()) === 1, "o filtro da peça não aparece como selo");
await p.getByRole("button", { name: /Tirar o filtro Peça: Apelação/ }).click();
checar((await p.locator("li[id^=exame-]").count()) === 46, "tirar o filtro não voltou aos 46 exames");

// os últimos 5 e a época
await p.getByRole("group", { name: "Exames" }).getByRole("button", { name: "Últimos 5" }).click();
checar(/^5 exames do XLIII/.test(await resumo()), `"Últimos 5" não deu do XLIII ao XLVII: "${await resumo()}"`);
await p.getByRole("group", { name: "Exames" }).getByRole("button", { name: "Todos" }).click();
await p.getByRole("button", { name: "Todas", exact: true }).click();
const todas = await resumo();
checar(/^78 exames do 110º/.test(todas), `"Todas" as épocas não deu 78 exames desde o 110º: "${todas}"`);
await p.getByRole("checkbox", { name: /Incluir as reaplicações/ }).check();
checar(/^80 exames/.test(await resumo()), "com as reaplicações, não foram 80 exames");
// só a VUNESP: sem tabela de pontos no site
for (const era of ["FGV", "CESPE/UnB", "VUNESP e CESPE"]) await p.getByRole("group", { name: "Época" }).getByRole("button", { name: era, exact: true }).click();
checar(/^19 exames do 110º/.test(await resumo()), `só a VUNESP não deu 19 exames: "${await resumo()}"`);
checar((await p.getByText("Os exames da OAB/SP não têm a tabela de pontos no site").count()) === 1, "a VUNESP mostrou teses e artigos sem tabela");
checar((await p.getByText("Sem prova no site").count()) === 19, "os exames da VUNESP não dizem que estão sem prova no site");
await p.getByRole("group", { name: "Época" }).getByRole("button", { name: "FGV", exact: true }).click();
await p.getByRole("group", { name: "Época" }).getByRole("button", { name: "VUNESP", exact: true }).click();
await p.getByRole("checkbox", { name: /Incluir as reaplicações/ }).uncheck();

// teses: a escolha filtra a lista e leva aos gabaritos
await p.getByRole("button", { name: /^Prescrição \d+$/ }).click();
const nPrescricao = Number((await p.getByRole("button", { name: /^Prescrição \d+$/ }).innerText()).match(/\d+/)[0]);
checar((await p.locator("li[id^=exame-]").count()) === nPrescricao, "a tese Prescrição não filtrou a lista pelo número do selo");
const gabaritos = await p.getByRole("link", { name: "Ler nos gabaritos →" }).getAttribute("href");
checar(gabaritos?.includes("busca=prescri%C3%A7%C3%A3o"), `o link dos gabaritos não leva a busca: ${gabaritos}`);
await p.getByRole("button", { name: /^Prescrição \d+$/ }).click();

// artigos: o mais citado e o link para o leitor
await p.getByRole("button", { name: "Artigos e súmulas" }).click();
await p.getByRole("group", { name: "Parte da prova" }).getByRole("button", { name: "Na prova toda" }).click();
const linkArtigo = await p.locator("ol a[href^='/leis/']").first().getAttribute("href");
checar(/^\/leis\/(cf|cpp|cp)\/#art/.test(linkArtigo ?? ""), `o artigo mais citado não abre no leitor: ${linkArtigo}`);
// o clique no artigo abre a prévia do texto, como dentro das leis
await p.locator("ol a[data-lei][data-art]").first().click();
const previa = p.getByRole("dialog", { name: "Texto do artigo" });
await previa.waitFor({ timeout: 10_000 }).catch(() => {});
checar(await previa.isVisible(), "o clique no artigo não abriu a prévia do texto");
await previa.getByText(/Art\. \d+/).first().waitFor({ timeout: 10_000 }).catch(() => {});
checar(/Art\. \d+/.test(await previa.innerText().catch(() => "")), "a prévia não mostra o texto do artigo");
await p.keyboard.press("Escape");

// a ficha da peça abre e fecha
await p.locator("[data-andar='1']").first().click();
const ficha = p.getByRole("dialog");
checar(await ficha.isVisible(), "a ficha da peça não abriu");
checar(/593/.test(await ficha.innerText()) && /5 dias/.test(await ficha.innerText()), "a ficha da Apelação não tem o art. 593 e o prazo");
// a prévia do fundamento abre por cima da ficha, e o Esc fecha uma de cada vez
await ficha.locator("a[data-lei]").first().click();
await previa.waitFor({ timeout: 10_000 }).catch(() => {});
checar(await previa.isVisible(), "o fundamento da ficha não abriu a prévia do artigo");
await p.keyboard.press("Escape");
checar(!(await previa.isVisible()) && (await ficha.isVisible()), "o 1º Esc não fechou só a prévia");
await p.keyboard.press("Escape");
checar(!(await ficha.isVisible()), "Esc não fechou a ficha");

// a sequência leva ao exame na lista
await p.locator("ol li button[aria-label^='XLV Exame']").first().click();
await p.waitForTimeout(500);
checar((await p.locator("#exame-45[data-alvo]").count()) === 1, "o quadrado do XLV não marcou o exame na lista");

// esconder as peças dos exames não feitos
await p.getByRole("switch", { name: "Esconder a peça dos exames que ainda não fiz" }).check();
checar((await p.getByRole("button", { name: "Peça oculta · mostrar" }).count()) === 46, "esconder as peças não escondeu as 46");
await p.reload({ waitUntil: "networkidle" });
await p.getByRole("button", { name: "Peça oculta · mostrar" }).first().waitFor({ timeout: 10_000 }).catch(() => {});
checar((await p.getByRole("button", { name: "Peça oculta · mostrar" }).count()) === 46, "a escolha de esconder as peças não ficou salva");
await p.getByRole("button", { name: "Peça oculta · mostrar" }).first().click();
checar((await p.getByRole("button", { name: "Peça oculta · mostrar" }).count()) === 45, "mostrar uma peça escondida não mostrou só ela");

// a busca nos textos: enunciados e gabaritos, expressão exata, exclusão, só a peça
const listaSec = p.locator("section[aria-labelledby=t-lista]");
await p.getByRole("switch", { name: "Esconder a peça dos exames que ainda não fiz" }).uncheck();
await listaSec.getByRole("combobox", { name: "Buscar em" }).selectOption("textos");
await listaSec.getByRole("searchbox").fill('"legítima defesa"');
await listaSec.locator("[class*=trechos]").first().waitFor({ timeout: 15_000 }).catch(() => {});
const nLegitima = await listaSec.locator("li[id^=exame-]").count();
checar(nLegitima > 3 && nLegitima < 46, `"legítima defesa" nos textos não filtrou a lista: ${nLegitima}`);
checar((await listaSec.locator("[class*=trechos] mark").first().innerText().catch(() => "")).toLowerCase() === "legítima defesa", "o trecho não marca a expressão achada");
await listaSec.getByRole("searchbox").fill('"legítima defesa" -putativa');
await p.waitForTimeout(400);
checar((await listaSec.locator("li[id^=exame-]").count()) <= nLegitima, "a exclusão aumentou a lista");
// embaixo da busca, os exames achados por peça, com quantos achados em cima de cada numeral
const porPeca = listaSec.getByRole("list", { name: "Os exames achados, por peça" });
const nNumerais = await porPeca.getByRole("button").count();
checar(nNumerais >= (await listaSec.locator("li[id^=exame-]").count()), `a lista por peça não tem todos os exames achados: ${nNumerais}`);
checar(/^\d+$/.test(await porPeca.locator("sup").first().innerText().catch(() => "")), "a lista por peça não mostra quantos achados em cada exame");
// "Ver a prova" abre o visualizador no caderno original, na página do enunciado, e as setas trocam de exame
await listaSec.getByRole("link", { name: "Ver a prova" }).first().click();
const visor = p.locator("dialog[open]");
await visor.waitFor({ timeout: 10_000 });
checar((await visor.getByRole("button", { name: "Caderno original", pressed: true }).count()) > 0, "o visualizador não abriu no caderno original");
// com o leitor de PDF do navegador, um iframe em #page=2; sem ele (o Chromium do teste, o celular), o visor próprio, que
// desenha as páginas e leva à 2
if (await visor.locator("iframe").count()) checar(/#page=2$/.test((await visor.locator("iframe").getAttribute("src")) ?? ""), "o caderno original não abriu na página 2");
else {
  await visor.locator("[data-pagina]").first().waitFor({ timeout: 20_000 }).catch(() => {});
  checar((await visor.locator('[data-pagina="2"]').count()) === 1, "o visor próprio não tem a página 2 do caderno");
}
checar(p.url().includes("/estatisticas/"), "\"Ver a prova\" saiu da página de estatísticas");
const tituloVisor = await visor.locator("h2").innerText();
const setaAnterior = visor.getByRole("button", { name: /^Exame anterior/ });
if (await setaAnterior.isEnabled()) {
  await setaAnterior.click();
  checar((await visor.locator("h2").innerText()) !== tituloVisor, "a seta não trocou de exame");
  checar((await visor.getByRole("button", { name: "Caderno original", pressed: true }).count()) > 0, "trocar de exame mudou a aba");
}
await visor.getByRole("button", { name: "Fechar" }).click();
await listaSec.getByRole("group", { name: "Parte da prova em que buscar" }).getByRole("button", { name: "Só a peça" }).click();
await p.waitForTimeout(400);
checar((await listaSec.locator("[class*=trechoOnde]").allInnerTexts()).every((t) => /^peça/i.test(t)), "\"Só a peça\" mostrou trechos das questões");
await listaSec.getByRole("searchbox").fill('"art. 386, VII"');
await p.waitForTimeout(400);
checar((await listaSec.locator("li[id^=exame-]").count()) >= 1, 'a busca com pontuação ("art. 386, VII") não achou nada');
await listaSec.getByRole("combobox", { name: "Buscar em" }).selectOption("dados");
await listaSec.getByRole("searchbox").fill("");
await listaSec.locator("[class*=contagem]").filter({ hasText: /^46 exames$/ }).waitFor({ timeout: 8000 }).catch(() => {});
const nDados = await listaSec.locator("li[id^=exame-]").count();
checar(nDados === 46, `voltar à busca nos dados não voltou aos 46 exames: ${nDados} (${await listaSec.locator("[class*=contagem]").innerText()})`);

// as abas pelo endereço e pelo teclado
await p.getByRole("tab", { name: "Exames anteriores" }).focus();
await p.keyboard.press("ArrowRight");
checar((await p.evaluate(() => location.hash)) === "#desempenho", "a seta não passou para a aba Meu desempenho");
checar((await p.getByText("Ainda não há nada seu por aqui").count()) === 1, "sem dados, o desempenho não mostra o aviso");
await p.goto(`${BASE}/estatisticas/#linha`, { waitUntil: "networkidle" });
checar(await p.getByRole("tab", { name: "Linha do tempo" }).getAttribute("aria-selected") === "true", "#linha não abriu a linha do tempo");
const linha = p.getByRole("tabpanel", { name: "Linha do tempo" });
checar((await linha.getByRole("list", { name: "Os marcos da história" }).getByRole("button").count()) === 10, "o eixo não tem os 10 marcos");
await linha.getByRole("button", { name: /^Marco 6: Era FGV/ }).click();
const capitulo = linha.locator("li[data-atual]");
checar(/A FGV assume/.test(await capitulo.innerText()), "o marco da Era FGV não ficou marcado na história");
checar((await capitulo.getByRole("link", { name: /^Fazer o simulado do II Exame/ }).count()) === 1, "o marco da Era FGV não leva ao II Exame");
checar(/2 provas de Penal no período/i.test(await capitulo.innerText()), "o marco da Era FGV não lista o II e o III");
checar(/A prova de Penal que fez o país refazer a 2ª fase/.test(await linha.innerText()), "falta o marco da 2ª fase anulada (2009.3)");
checar((await linha.locator("[class*=tracos] > *").count()) === 80, `o eixo não tem um traço por prova (80): ${await linha.locator("[class*=tracos] > *").count()}`);
await ctx.close();

// ---------- 2. Meu desempenho, com dados ----------
const ctx2 = await b.newContext({ viewport: { width: 390, height: 800 } });
const agora = Date.now();
const DIA = 86_400_000;
const parte = (n, obtido) => ({ parte: `q${n}`, titulo: `Questão ${n}`, valor: 1.25, obtido, obtidoBruto: obtido, itens: [], linhasUsadas: 10 });
const tentativa = (id, exameId, dias, peca, q) => ({
  id,
  exameId,
  criadaEm: agora - dias * DIA,
  duracaoSeg: 4 * 3600,
  respostas: { peca: "", questoes: [] },
  resultado: {
    exameId,
    total: peca + q * 4,
    maximo: 10,
    aprovado: peca + q * 4 >= 6,
    partes: [
      {
        parte: "peca",
        titulo: "Peça",
        valor: 5,
        obtido: peca,
        obtidoBruto: peca,
        linhasUsadas: 90,
        itens: [
          { n: "1", secao: "Endereçamento", descricao: "", valor: 1, obtido: 1, componentes: [] },
          { n: "2", secao: "Mérito", descricao: "", valor: 3, obtido: peca - 1.5, componentes: [] },
          { n: "3", secao: "Pedidos", descricao: "", valor: 1, obtido: 0.5, componentes: [] },
        ],
      },
      parte(1, q),
      parte(2, q),
      parte(3, q),
      parte(4, q),
    ],
  },
});
const hoje = new Date(agora);
const dia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
await ctx2.addInitScript(
  ({ ts, dia }) => {
    if (sessionStorage.getItem("semeado")) return;
    sessionStorage.setItem("semeado", "1");
    localStorage.setItem("grifo:tentativas", JSON.stringify(ts));
    localStorage.setItem("grifo:atividade", JSON.stringify({ v: 1, dias: { [dia]: { a: 8, e: 2, ms: 200000, c: { peca: [8, 2] }, p: { apelacao: [8, 2] } } } }));
  },
  { ts: [tentativa("b", "45", 1, 3.5, 1), tentativa("a", "44", 10, 2, 0.5)], dia },
);
const q = await ctx2.newPage();
q.on("pageerror", (e) => erros.push(e.message));
await q.goto(`${BASE}/estatisticas/#desempenho`, { waitUntil: "networkidle" });
const painel = q.getByRole("tabpanel", { name: "Meu desempenho" });
await painel.locator("svg circle").first().waitFor({ timeout: 10_000 }).catch(() => {});
const texto = await painel.innerText();
checar(/Simulados\s*2/i.test(texto), "o desempenho não conta os 2 simulados");
checar(/80%/.test(texto), "a taxa de acerto do treino (8 de 10) não é 80%");
checar((await painel.locator("svg circle").count()) >= 2, "o gráfico das notas não tem os pontos");
checar((await painel.getByRole("link", { name: /^45º Exame \(XLV Exame\), \d{4}: sua melhor nota, 7,50/ }).count()) === 1, "o mapa não mostra a nota do XLV");
// o calendário: o dia escolhido mostra o que houve; o mês tem o número dos dias
const cal = painel.locator("section[aria-labelledby=t-calendario]");
await cal.scrollIntoViewIfNeeded();
checar(/10 respostas \(8 certas\)/.test(await cal.innerText()), "o detalhe de hoje no calendário não mostra as 10 respostas, 8 certas");
const ontem = new Date(agora - DIA);
await cal.getByRole("button", { name: new RegExp(`^[^,]+, ${ontem.getDate()} de .*: 1 simulado`) }).first().click();
checar(/XLV Exame.*7,50/s.test(await cal.innerText()), "o dia do simulado não mostra o XLV e a nota");
await cal.getByRole("button", { name: "Mês", exact: true }).click();
await cal.getByRole("group", { name: /^Os dias de / }).waitFor({ timeout: 5000 }).catch(() => {});
// os dias até o fim desta semana são botões; os depois dela, números apagados
const numeros = await cal.getByRole("group", { name: /^Os dias de / }).evaluate((g) => [...g.children].map((c) => c.textContent).filter((t) => /^\d+$/.test(t ?? "")).length);
const noMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
checar(numeros === noMes, `a forma Mês não tem os ${noMes} dias do mês: ${numeros}`);
checar((await cal.getByRole("group", { name: /^Os dias de / }).getByRole("button", { name: new RegExp(`, ${hoje.getDate()} de `) }).count()) === 1, "a forma Mês não tem o botão de hoje");
checar(/Próximo simulado sugerido/i.test(texto), "não há sugestão de próximo simulado");
const sugestao = painel.locator("[class*=sugestao]").first();
checar(!/caiu \d+ vez/.test(await sugestao.innerText()), "a sugestão mostra a explicação (com a peça) sem o clique");
await sugestao.getByRole("button", { name: "Por que este exame?" }).click();
checar(/caiu \d+ vez|você fez/i.test(await sugestao.innerText()), "o clique não mostrou a explicação da sugestão");
// o sorteio: um exame por fazer, marcado no mapa
await painel.getByRole("button", { name: "Sortear", exact: true }).click();
const sorteadoTexto = await painel.locator("[class*=sorteado]").innerText().catch(() => "");
checar(/Exame/.test(sorteadoTexto) && !/já fez/.test(sorteadoTexto), `o sorteio não trouxe um exame por fazer: "${sorteadoTexto}"`);
checar((await painel.locator("[class*=tile][data-alvo]").count()) === 1, "o exame sorteado não ficou marcado no mapa");
const ordemSecoes = await painel.locator("section h2").allInnerTexts();
checar(ordemSecoes.indexOf("Calendário de estudo") < ordemSecoes.indexOf("Onde você ganha e perde pontos"), "o calendário não veio antes de \"Onde você ganha e perde pontos\"");
const larga = await q.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
checar(larga <= 0, `no celular, a página rola para o lado (${larga} px)`);
await q.getByRole("tab", { name: "Exames anteriores" }).click();
checar((await q.locator("#exame-45").getByRole("link", { name: /7,50/ }).count()) === 1, "a lista de exames não mostra a nota do XLV");
await ctx2.close();

// ---------- 2b. O resumo do desempenho no link "Estatísticas" do cabeçalho ----------
const ctx4 = await b.newContext({ viewport: { width: 1280, height: 900 } });
await ctx4.addInitScript((ts) => localStorage.setItem("grifo:tentativas", JSON.stringify(ts)), [tentativa("b", "45", 1, 3.5, 1), tentativa("a", "44", 10, 2, 0.5)]);
const h = await ctx4.newPage();
h.on("pageerror", (e) => erros.push(e.message));
await h.goto(`${BASE}/provas/`, { waitUntil: "networkidle" });
await h.waitForTimeout(800);
const linkEstat = h.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Estatísticas" });
const caixaLink = await linkEstat.boundingBox();
await h.mouse.move(caixaLink.x + caixaLink.width / 2, caixaLink.y + caixaLink.height / 2);
const resumoNav = h.getByRole("dialog", { name: "Resumo do seu desempenho" });
await resumoNav.getByText(/simulados/).first().waitFor({ timeout: 10_000 }).catch(() => {});
const textoResumo = await resumoNav.innerText().catch(() => "");
checar(/2\s*de \d+ simulados/.test(textoResumo) && /m[ée]dia/i.test(textoResumo), `o resumo do cabeçalho não mostra os 2 simulados e a média: "${textoResumo.slice(0, 120)}"`);
await h.mouse.move(5, 500);
await h.waitForTimeout(500);
checar(!(await resumoNav.isVisible().catch(() => false)), "o resumo do cabeçalho não fechou ao tirar o mouse");
await ctx4.close();

// ---------- 3. Os links que a página usa ----------
const ctx3 = await b.newContext();
const r = await ctx3.newPage();
r.on("pageerror", (e) => erros.push(e.message));
await r.goto(`${BASE}/provas/?ver=45#exame-45`, { waitUntil: "networkidle" });
await r.getByRole("dialog").waitFor({ timeout: 10_000 }).catch(() => {});
checar(await r.getByRole("dialog").isVisible(), "/provas/?ver=45 não abriu o visualizador");
checar(/XLV Exame/.test(await r.getByRole("dialog").innerText()), "o visualizador aberto não é o do XLV");
await r.getByRole("dialog").getByRole("button", { name: "Fechar" }).click();
// a janela fecha com uma animação, e o endereço muda no fim dela
const semVer = await r.waitForFunction(() => !location.search.includes("ver="), null, { timeout: 3000 }).then(() => true, () => false);
checar(semVer, "fechar o visualizador não tirou o ?ver= do endereço");
await r.goto(`${BASE}/provas/todos/?tipo=gabarito&versao=original&busca=prescri%C3%A7%C3%A3o`, { waitUntil: "networkidle" });
await r.waitForFunction(() => document.querySelector("input[type=search]")?.value, null, { timeout: 10_000 }).catch(() => {});
checar((await r.getByRole("searchbox").first().inputValue()) === "prescrição", "?busca= não preencheu a busca dos documentos");
await ctx3.close();

await b.close();

if (erros.length) falhas.push(`erros de página: ${erros.join(" | ")}`);
if (falhas.length) {
  console.error(falhas.map((f) => `✗ ${f}`).join("\n"));
  process.exit(1);
}
console.log("estatisticas: filtros, formatos das peças (pizza), palpite e o teste dele, dicas, prévia dos artigos, teses, ficha, sequência sem rolagem, peças escondidas, busca nos textos (exames por peça, visualizador com setas), abas, linha do tempo, calendário, desempenho (sugestão, sorteio), resumo do cabeçalho e links conferidos");
