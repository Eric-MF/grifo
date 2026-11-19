// O recorde do treino de questões: gravado no modo infinito a cada resposta, visto no início do treino e nas
// estatísticas, com a página final guardada (/treino/resultado/). node tests/e2e/treino-recorde.mjs [BASE]
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const falhas = [];
const checar = (ok, msg) => {
  if (!ok) falhas.push(msg);
};

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const erros = [];
p.on("pageerror", (e) => erros.push(e.message));

/**
 * Responde a questão da tela: a alternativa certa (`certa`) ou uma errada. A certa sai das props do React (a pergunta
 * do PerguntaCorpo e, na tese, as opções do fácil), pela chave de cada botão. Devolve o id e o caso da questão.
 */
async function responder(certa) {
  await p.locator("[data-alt]").first().waitFor();
  const q = await p.evaluate((certa) => {
    const botoes = [...document.querySelectorAll("[data-alt]")];
    const fibra = (el) => el[Object.keys(el).find((k) => k.startsWith("__reactFiber"))];
    let pergunta = null;
    let facil = null;
    for (let x = fibra(botoes[0]); x; x = x.return) {
      const props = x.memoizedProps;
      if (props?.facil && !facil) facil = props.facil;
      if (props?.pergunta) {
        pergunta = props.pergunta;
        break;
      }
    }
    const chave = pergunta.formato === "peca" ? pergunta.resposta.peca : pergunta.formato === "objetiva" ? pergunta.correta : facil.opcoes.find((o) => o.correta).texto;
    botoes.find((el) => (fibra(el).key === chave) === certa).setAttribute("data-teste-alvo", "");
    return { id: pergunta.id, caso: pergunta.caso };
  }, certa);
  await p.locator("[data-teste-alvo]").click();
  return q;
}
/** Espera a próxima questão: sozinha, depois do acerto, ou pelo botão, depois do erro. */
async function proxima(anterior) {
  const botao = p.getByRole("button", { name: "Próxima pergunta" });
  if (await botao.isVisible().catch(() => false)) await botao.click();
  await p.waitForFunction(
    (id) => {
      const el = document.querySelector("[data-alt]");
      if (!el) return false;
      const f = el[Object.keys(el).find((k) => k.startsWith("__reactFiber"))];
      for (let x = f; x; x = x.return) if (x.memoizedProps?.pergunta) return x.memoizedProps.pergunta.id !== id;
      return false;
    },
    anterior.id,
    { timeout: 15000 },
  );
}
/** Com CAPTURAS=<pasta>, guarda as telas para conferir. */
const capturar = async (nome, inteira = false) => {
  if (process.env.CAPTURAS) await p.screenshot({ path: `${process.env.CAPTURAS}/${nome}.png`, fullPage: inteira });
};
const ler = (chave) => p.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "null"), chave);
const sessoesGuardadas = () => p.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("grifo:treino:sessao:")));

await p.goto(`${BASE}/treino/`, { waitUntil: "networkidle" });
await p.evaluate(() => localStorage.clear());
await p.reload({ waitUntil: "networkidle" });

// 1. sem recorde: o padrão é o modo automático infinito
const caixa = p.getByRole("region", { name: /Seu recorde/ });
await caixa.waitFor();
checar(/Modo automático · infinito/.test(await caixa.textContent()), "a caixa do recorde não diz o modo automático infinito");
checar(/Ainda sem recorde neste modo/.test(await caixa.textContent()), "sem treino, a caixa deveria dizer que não há recorde");

// 2. o modo infinito grava o recorde a cada resposta
await p.getByRole("button", { name: "Começar o modo automático" }).click();
const q1 = await responder(true);
await p.waitForTimeout(300);
let rec = await ler("grifo:treino:recordes");
const r1 = rec?.modos?.["auto:infinito"];
checar(r1?.pontos > 0 && r1?.questoes === 1 && !!r1?.sessao, `depois do 1º acerto, o recorde do infinito não foi gravado: ${JSON.stringify(rec)}`);
checar((await sessoesGuardadas()).length === 1, "a sessão do recorde não foi guardada");
await proxima(q1);
const q2 = await responder(false);
await proxima(q2);
await responder(true);
await p.waitForTimeout(300);
rec = await ler("grifo:treino:recordes");
checar(rec?.modos?.["auto:infinito"]?.questoes === 3 && rec.modos["auto:infinito"].acertos === 2, `o recorde não acompanhou as 3 respostas: ${JSON.stringify(rec?.modos)}`);
checar(rec?.sequencia?.seguidos === 1, `a maior sequência deveria ser 1: ${JSON.stringify(rec?.sequencia)}`);
const sessao = rec.modos["auto:infinito"].sessao;
const guardada = await ler(`grifo:treino:sessao:${sessao}`);
checar(guardada?.rodadas?.length === 3, "a sessão guardada não tem as 3 questões");
checar(!JSON.stringify(guardada).includes(q1.caso.slice(0, 80)), "a sessão guardada leva o texto da questão (deveria levar só o id)");
const pontos = rec.modos["auto:infinito"].pontos;

// 3. encerrar: a página final diz o recorde novo
await p.waitForTimeout(500);
await p.getByRole("button", { name: /Encerrar e ver o resultado/ }).click();
await p.getByText(/Novo recorde: Modo automático · infinito!/).waitFor();
checar(await p.getByText("Nova maior sequência: 1 acerto seguido!").isVisible(), "a página final não diz a maior sequência nova");
const totalTexto = (await p.locator("p", { hasText: /^\s*[\d.]+\s+pontos$/ }).first().textContent()) ?? "";
checar(totalTexto.replace(/\D/g, "") === String(pontos), `o total da página final (${totalTexto}) não é o do recorde (${pontos})`);
await capturar("treino-fim", true);

// 4. no início, o recorde com o link para a página final
await p.getByRole("button", { name: "Mudar nível ou quantidade" }).click();
await caixa.waitFor();
const textoCaixa = await caixa.textContent();
checar(textoCaixa.includes(pontos.toLocaleString("pt-BR")) && /2 de 3 acertos/.test(textoCaixa), `a caixa do recorde não mostra os pontos e os acertos: ${textoCaixa}`);
await capturar("treino-inicio");
await caixa.getByRole("link", { name: "Ver a página final do recorde" }).click();
await p.waitForURL(/\/treino\/resultado\/\?s=/);
await p.getByText(/^Recorde/).first().waitFor();
checar(/também a maior sequência de acertos/.test(await p.locator("main").textContent()), "a página guardada não diz que é também a maior sequência");
const linhas = p.locator("ol li");
checar((await linhas.count()) === 3, `a página guardada deveria ter 3 questões, tem ${await linhas.count()}`);
const total2 = (await p.locator("p", { hasText: /^\s*[\d.]+\s+pontos$/ }).first().textContent()) ?? "";
checar(total2.replace(/\D/g, "") === String(pontos), `a página guardada mostra ${total2}, não ${pontos}`);
// a questão abre como foi respondida, com os mesmos nomes
await linhas.first().getByRole("button").click();
const corpo = linhas.first().locator("[id]").last();
await p.waitForTimeout(200);
checar(((await linhas.first().textContent()) ?? "").includes(q1.caso.slice(0, 60)), "a questão refeita não tem o mesmo caso (ou os mesmos nomes)");
checar(await corpo.isVisible(), "a questão da página guardada não abre");
await capturar("treino-guardado", true);

// 5. nas estatísticas, os recordes com os links
await p.goto(`${BASE}/estatisticas/#desempenho`, { waitUntil: "networkidle" });
const cardRecordes = p.locator(".card", { has: p.getByRole("heading", { name: "Recordes" }) });
await cardRecordes.waitFor();
const textoCard = (await cardRecordes.textContent()) ?? "";
checar(textoCard.includes("Treino · Modo automático · infinito") && textoCard.includes(pontos.toLocaleString("pt-BR")), `as estatísticas não mostram o recorde do infinito: ${textoCard}`);
checar(textoCard.includes("Treino · maior sequência de acertos"), "as estatísticas não mostram a maior sequência");
const links = cardRecordes.getByRole("link", { name: "Ver a página final" });
checar((await links.count()) === 2, `as estatísticas deveriam ter 2 links para a página final, têm ${await links.count()}`);
await links.first().click();
await p.waitForURL(new RegExp(`/treino/resultado/\\?s=${sessao}`));

// 6. um treino que não bate o recorde: o aviso aponta o recorde; a sessão dele não é guardada
await p.goto(`${BASE}/treino/`, { waitUntil: "networkidle" });
await p.getByRole("button", { name: /modo automático/ }).first().click();
await responder(false);
await p.waitForTimeout(500);
await p.getByRole("button", { name: /Encerrar e ver o resultado/ }).click();
await p.getByText("Seu recorde neste modo:").waitFor();
checar((await p.getByRole("link", { name: "ver a página final" }).count()) === 1, "o aviso não leva à página final do recorde");
checar((await sessoesGuardadas()).length === 1, `só a sessão do recorde deveria estar guardada: ${await sessoesGuardadas()}`);

// 7. o recorde de antes (só os pontos) e a quantidade fixa
await p.evaluate(() => {
  localStorage.setItem("grifo:treino", JSON.stringify({ 2: 900 }));
  localStorage.setItem("grifo:treino:automatico:ligado", "false");
  localStorage.setItem("grifo:treino:tamanho", "10");
});
await p.goto(`${BASE}/treino/`, { waitUntil: "networkidle" });
await p.getByRole("button", { name: /^Médio/ }).click();
const textoFixo = (await caixa.textContent()) ?? "";
checar(/Médio · 10 questões/.test(textoFixo) && /900\s*de 1\.500 pontos/.test(textoFixo), `o recorde de antes não aparece: ${textoFixo}`);
checar(/não foi guardada/.test(textoFixo), "o recorde de antes deveria dizer que a página final não foi guardada");
checar(/Recorde: 900 de 1\.500/.test((await p.getByRole("button", { name: /^Médio/ }).textContent()) ?? ""), "o botão do Médio não mostra o recorde de antes");
await p.getByRole("button", { name: /^Difícil/ }).click();
checar(/o primeiro treino completo marca o recorde/.test((await caixa.textContent()) ?? ""), "na quantidade fixa, sem recorde, deveria dizer que conta o treino completo");

// 8. a questão que saiu do acervo fica só com o resumo; a sessão que não existe avisa
await p.evaluate((id) => {
  const k = `grifo:treino:sessao:${id}`;
  const s = JSON.parse(localStorage.getItem(k));
  s.rodadas[1].id = "saiu-do-acervo";
  localStorage.setItem(k, JSON.stringify(s));
}, sessao);
await p.goto(`${BASE}/treino/resultado/?s=${sessao}`, { waitUntil: "networkidle" });
await p.locator("ol li").nth(1).waitFor();
checar(/a questão saiu do acervo/.test((await p.locator("ol li").nth(1).textContent()) ?? ""), "a questão que saiu do acervo não diz isso");
checar(await p.locator("ol li").nth(1).getByRole("button").isDisabled(), "a questão que saiu do acervo não deveria abrir");
await p.goto(`${BASE}/treino/resultado/?s=nao-existe`, { waitUntil: "networkidle" });
checar(await p.getByText("Este resultado não está guardado neste navegador.").isVisible(), "a sessão que não existe não avisa");

// 9. celular: sem rolagem para o lado
await p.setViewportSize({ width: 390, height: 844 });
for (const url of ["/treino/", `/treino/resultado/?s=${sessao}`]) {
  await p.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
  await p.waitForTimeout(300);
  const larga = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  checar(!larga, `${url}: a página rola para o lado no celular`);
  await capturar(`treino-celular-${url.includes("resultado") ? "guardado" : "inicio"}`, true);
}

await b.close();
checar(erros.length === 0, `erros na página: ${erros.join(" | ")}`);
if (falhas.length) {
  console.error(`treino-recorde: ${falhas.length} falha(s)\n- ${falhas.join("\n- ")}`);
  process.exit(1);
}
console.log("treino-recorde: ok (o recorde do infinito a cada resposta, a página final guardada, o início, as estatísticas e o celular)");
