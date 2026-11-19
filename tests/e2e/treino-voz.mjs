// Responder falando no treino: a questão é lida em voz alta (o caso, a pergunta e as alternativas), a resposta dita
// durante a leitura não vale (pode ser o eco dela) e "parar", "repetir" e "ler as alternativas" mandam na leitura; a
// letra e o nome da peça respondem as alternativas, a fala preenche a peça e o fundamento, "responder" envia, "próxima"
// segue e "desligar o microfone" desliga; a tela fica acesa enquanto o microfone ouve. O reconhecimento de fala, a voz e
// a trava da tela são falsos. node tests/e2e/treino-voz.mjs [BASE]
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const falhas = [];
const checar = (ok, msg) => {
  if (!ok) falhas.push(msg);
};

// o microfone falso (__falar entrega a frase como reconhecida) e a trava da tela falsa (conta os pedidos e as solturas)
const FALSOS = () => {
  const ativos = new Set();
  class Reconhecimento {
    constructor() {
      this.onresult = this.onerror = this.onend = this.onstart = null;
      this.indice = 0;
    }
    start() {
      ativos.add(this);
      setTimeout(() => this.onstart?.(), 5);
    }
    stop() {
      this.abort();
    }
    abort() {
      ativos.delete(this);
    }
  }
  window.webkitSpeechRecognition = Reconhecimento;
  window.SpeechRecognition = Reconhecimento;
  window.__falar = (texto, final = true) => {
    for (const r of ativos) {
      const results = { length: r.indice + 1 };
      results[r.indice] = { 0: { transcript: texto }, length: 1, isFinal: final };
      r.onresult?.({ resultIndex: r.indice, results });
      if (final) r.indice++;
    }
    return ativos.size;
  };
  // a voz falsa: __fala.ditos guarda o que foi dito; __fala.ms é o tempo de cada letra
  const vozes = [{ name: "Luciana", lang: "pt-BR", voiceURI: "luciana", localService: true, default: true }];
  const fala = { ditos: [], fila: [], atual: null, timer: null, ms: 0.3 };
  window.__fala = fala;
  class Fala {
    constructor(text) {
      Object.assign(this, { text, lang: "", voice: null, rate: 1, pitch: 1, volume: 1, onstart: null, onend: null, onerror: null });
    }
  }
  const seguinte = () => {
    if (fala.atual) return;
    const f = fala.fila.shift();
    if (!f) return;
    fala.atual = f;
    setTimeout(() => {
      if (fala.atual !== f) return;
      f.onstart?.({});
      fala.timer = setTimeout(() => {
        if (fala.atual !== f) return;
        fala.atual = null;
        if (f.volume > 0 && f.text.trim()) fala.ditos.push(f.text);
        f.onend?.({});
        seguinte();
      }, Math.max(15, f.text.length * fala.ms));
    }, 5);
  };
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: {
      get speaking() {
        return !!fala.atual;
      },
      get pending() {
        return fala.fila.length > 0;
      },
      paused: false,
      speak(f) {
        fala.fila.push(f);
        seguinte();
      },
      cancel() {
        const todas = [fala.atual, ...fala.fila].filter(Boolean);
        fala.atual = null;
        fala.fila = [];
        clearTimeout(fala.timer);
        for (const f of todas) setTimeout(() => f.onerror?.({ error: "interrupted" }), 0);
      },
      pause() {},
      resume() {},
      getVoices: () => vozes,
      addEventListener() {},
      removeEventListener() {},
    },
  });
  window.SpeechSynthesisUtterance = Fala;
  const tela = { pedidos: 0, soltas: 0 };
  window.__tela = tela;
  Object.defineProperty(navigator, "wakeLock", {
    configurable: true,
    value: {
      request: async () => {
        tela.pedidos++;
        const t = { released: false, release: async () => ((t.released = true), tela.soltas++) };
        return t;
      },
    },
  });
};

const b = await chromium.launch();
const erros = [];
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addInitScript(FALSOS);
const p = await ctx.newPage();
p.on("pageerror", (e) => erros.push(e.message));

/** A pergunta na tela (das props do React) e, nas alternativas, a posição da certa. */
const questao = () =>
  p.evaluate(() => {
    const el = document.querySelector("[data-questao]");
    const fibra = el && el[Object.keys(el).find((k) => k.startsWith("__reactFiber"))];
    let pergunta = null;
    for (let x = fibra; x; x = x.return)
      if (x.memoizedProps?.pergunta) {
        pergunta = x.memoizedProps.pergunta;
        break;
      }
    const botoes = [...document.querySelectorAll("[data-alt]")];
    let certa = -1;
    botoes.forEach((b, k) => {
      const f = b[Object.keys(b).find((c) => c.startsWith("__reactFiber"))];
      let facil = null;
      for (let x = f; x; x = x.return)
        if (x.memoizedProps?.facil) {
          facil = x.memoizedProps.facil;
          break;
        }
      const chave = pergunta.formato === "peca" ? pergunta.resposta.peca : pergunta.formato === "objetiva" ? pergunta.correta : facil?.opcoes.find((o) => o.correta)?.texto;
      if (f.key === chave) certa = k;
    });
    return { id: pergunta.id, formato: pergunta.formato, certa, textos: botoes.map((b) => b.textContent.slice(1)) };
  });
const falar = (t, final = true) => p.evaluate(([t, f]) => window.__falar(t, f), [t, final]);
/** Espera a voz acabar de ler (parada de verdade, não entre um trecho e outro) e o instante depois, em que o eco ainda chega. */
const esperarLeitura = async () => {
  for (let tentativa = 0; tentativa < 20; tentativa++) {
    await p.waitForFunction(() => !window.__fala.atual && !window.__fala.fila.length, null, { timeout: 15_000 });
    const antes = await p.evaluate(() => window.__fala.ditos.length);
    await p.waitForTimeout(1200);
    const quieta = await p.evaluate((n) => !window.__fala.atual && !window.__fala.fila.length && window.__fala.ditos.length === n, antes);
    if (quieta) return;
  }
};
const linha = () => p.locator("[class*=linhaVoz]").textContent();
const esperarOutra = (id) =>
  p.waitForFunction(
    (id) => {
      const el = document.querySelector("[data-questao]");
      const f = el && el[Object.keys(el).find((k) => k.startsWith("__reactFiber"))];
      for (let x = f; x; x = x.return) if (x.memoizedProps?.pergunta) return x.memoizedProps.pergunta.id !== id;
      return false;
    },
    id,
    { timeout: 10_000 },
  );

const ditos = () => p.evaluate(() => window.__fala.ditos.slice());
/** Espera a voz dizer algo que case com `re` (a partir do dito número `desde`). */
const esperarDito = (re, desde = 0, timeout = 15_000) =>
  p
    .waitForFunction(([fonte, desde]) => window.__fala.ditos.slice(desde).some((d) => new RegExp(fonte).test(d)), [re.source, desde], { timeout })
    .then(() => true)
    .catch(() => false);
const corpoDaQuestao = async () => (await p.locator("[data-questao]").textContent()) ?? "";

await p.goto(`${BASE}/treino/`, { waitUntil: "networkidle" });
await p.evaluate(() => {
  localStorage.clear();
  // o microfone padrão, aberto pelo próprio navegador (sem getUserMedia)
  localStorage.setItem("grifo:leitor:ouvir", JSON.stringify({ microfone: "padrao", sensibilidade: "normal" }));
});
await p.reload({ waitUntil: "networkidle" });

// 1. a opção no início
const opcao = p.getByRole("checkbox", { name: /Responder falando/ });
checar(await opcao.isEnabled(), "a opção de responder falando está desligada num navegador com reconhecimento de fala");
await opcao.check();
checar((await p.evaluate(() => localStorage.getItem("grifo:treino:voz"))) === "true", "a opção de responder falando não ficou gravada");

// 2. o modo automático começa nas alternativas da peça: a questão é lida; a letra certa responde, a correção é dita e
// a próxima questão vem sozinha (e é lida)
checar(await p.getByRole("checkbox", { name: /Ouvir as questões/ }).isChecked(), "ouvir as questões não vem ligado com a voz");
// a voz falsa fala devagar aqui, para a linha ser vista no meio da leitura
await p.evaluate(() => (window.__fala.ms = 8));
await p.getByRole("button", { name: "Começar o modo automático" }).click();
await p.locator("[data-alt]").first().waitFor();
await p.waitForTimeout(150);
checar(/^Lendo…/.test(await linha()), `lendo a questão, a linha não diz que está lendo: ${await linha()}`);
await p.evaluate(() => (window.__fala.ms = 0.3));
await esperarLeitura();
const lido = (await ditos()).join(" | ");
checar(/Letra á:/.test(lido) && /Letra bê:/.test(lido), `as alternativas não foram lidas: ${lido.slice(0, 300)}`);
checar(/Diga a letra/.test(await linha()), `a linha do microfone não diz o que falar: ${await linha()}`);
checar((await p.evaluate(() => window.__tela.pedidos)) >= 1, "respondendo falando, a tela não ficou acesa (Wake Lock)");
let q = await questao();
await falar("letra", false);
checar(/^letra…$/.test(await linha()), `a frase parcial não aparece na linha: ${await linha()}`);
await falar("banana");
checar(/Não entendi banana\./.test(await linha()), `a frase sem sentido não diz que não entendeu: ${await linha()}`);
let k = (await ditos()).length;
await falar(`letra ${"abcd"[q.certa]}`);
checar(await esperarDito(/^Correto!$/, k), "o acerto não foi dito (“Correto!”)");
await esperarOutra(q.id).catch(() => checar(false, "depois do acerto dito, a próxima questão não veio sozinha"));
k = (await ditos()).length;
checar(await esperarDito(/^Letra á:/, k), "a questão que veio sozinha não foi lida");

// 3. lendo: a resposta dita não vale (pode ser o eco), "parar" para; "repetir" e "ler as alternativas" leem de novo; o
// nome da peça também responde
await p.evaluate(() => (window.__fala.ms = 8));
q = await questao();
await p.waitForTimeout(300);
checar(await p.evaluate(() => !!window.__fala.atual), "a questão nova não começou a ser lida");
await falar(q.textos[q.certa]);
await p.waitForTimeout(200);
checar((await p.getByRole("button", { name: "Próxima pergunta" }).count()) === 0, "a resposta dita durante a leitura valeu (pode ser o eco dela)");
await falar("parar");
await p.waitForTimeout(150);
checar(await p.evaluate(() => !window.__fala.atual && !window.__fala.fila.length), "“parar” não parou a leitura");
checar(/Leitura parada/.test(await linha()), `“parar” não diz que parou: ${await linha()}`);
// o primeiro trecho dito depois do comando (o que está sendo dito agora, ou o primeiro que acabou depois do dito número k)
const primeiroDepois = (k) =>
  p
    .waitForFunction((k) => window.__fala.ditos.length > k || !!window.__fala.atual, k, { timeout: 5000 })
    .then(() => p.evaluate((k) => window.__fala.ditos[k] ?? window.__fala.atual?.text ?? "", k));
let k3 = (await ditos()).length;
await falar("ler as alternativas");
const alt3 = await primeiroDepois(k3);
checar(/^Letra á:/.test(alt3), `“ler as alternativas” não começou pela letra A: ${alt3}`);
await falar("parar");
k3 = (await ditos()).length;
await falar("repetir");
const rel3 = await primeiroDepois(k3);
checar(!/^Letra/.test(rel3), `“repetir” não leu a questão desde o caso: ${rel3}`);
await falar("parar");
await p.evaluate(() => (window.__fala.ms = 0.3));
await falar(q.textos[q.certa]);
await esperarOutra(q.id).catch(() => checar(false, `o nome da peça dito (${q.textos[q.certa]}) não deu acerto e a próxima`));

// 4. o erro: a voz diz a peça certa e a errada; 2 s sem nada dito, lê o artigo certo e o errado, e segue sozinha
q = await questao();
await esperarLeitura();
k = (await ditos()).length;
await falar(`letra ${"abcd"[(q.certa + 1) % q.textos.length]}`);
checar(
  await esperarDito(/^Errado\. A peça certa é .+, com fundamento no .+, e não .+\.$/, k),
  `o erro não disse a peça certa e a errada: ${(await ditos()).slice(k).join(" | ")} · linha: ${await linha()} · questão: ${JSON.stringify(q)} · ${(await corpoDaQuestao()).slice(0, 200)}`,
);
checar(!(await esperarDito(/^O artigo certo/, k, 1200)), "os artigos foram lidos antes da pausa de 2 s");
checar(await esperarDito(/^O artigo certo, /, k, 8000), `depois da pausa, o artigo certo não foi lido: ${(await ditos()).slice(k).join(" | ")}`);
checar(await esperarDito(/^Artigo /, k, 8000), `depois da pausa, o texto do artigo não foi lido: ${(await ditos()).slice(k).join(" | ")}`);
await esperarOutra(q.id).catch(() => checar(false, "depois dos artigos, a próxima questão não veio sozinha"));

// 5. o erro, e "próxima" na pausa: segue já, sem ler os artigos
q = await questao();
await esperarLeitura();
k = (await ditos()).length;
await falar(`letra ${"abcd"[(q.certa + 1) % q.textos.length]}`);
await esperarDito(/^Errado\./, k);
await p.waitForTimeout(300);
await falar("próxima");
await esperarOutra(q.id).catch(() => checar(false, "“próxima” na pausa depois do erro não seguiu"));
await p.waitForTimeout(2500);
checar(!(await ditos()).slice(k).some((d) => /^O artigo certo/.test(d)), "com “próxima” na pausa, os artigos foram lidos mesmo assim");

// 6. "desligar o microfone" desliga a opção e solta a tela
await esperarLeitura();
await falar("desligar o microfone");
await p.waitForTimeout(200);
checar((await p.locator("[class*=linhaVoz]").count()) === 0, "a linha do microfone ficou depois de desligar");
checar(!(await p.getByRole("checkbox", { name: /Responder falando/ }).isChecked()), "desligar pela voz não desmarcou a opção");
checar((await p.evaluate(() => window.__tela.soltas)) >= 1, "desligado o microfone, a tela não foi solta");
checar((await falar("letra a")) === 0, "desligado, o microfone continuou ouvindo");

// 7. as de digitar, falando: sem as caixas, uma resposta só; cada frase muda só o que traz de válido
await p.getByRole("button", { name: /Encerrar e ver o resultado/ }).click();
await p.getByRole("button", { name: "Mudar nível ou quantidade" }).click();
await p.getByRole("button", { name: "Eu escolho" }).click();
await p.getByRole("button", { name: /^Médio/ }).click();
await p.getByRole("checkbox", { name: /Responder falando/ }).check();
await p.getByRole("button", { name: "Começar o modo infinito" }).click();
const dita = p.locator("[data-resposta-dita]");
await dita.waitFor();
checar((await p.locator('[name="grifo-peca"], [name="grifo-fundamento"]').count()) === 0, "falando, as caixas de digitar continuam na tela");
await esperarLeitura();
checar(/a peça e o artigo/.test(await linha()), `nas de digitar, a linha não pede a peça e o artigo: ${await linha()}`);
const textoDita = async () => (await dita.textContent()) ?? "";
await falar("Memorias");
await p.waitForTimeout(100);
checar(/PeçaMemoriais/.test(await textoDita()), `“Memorias” não virou Memoriais: ${await textoDita()}`);
await falar("artigo 593 inciso 3 alínea d do CPP");
await p.waitForTimeout(100);
checar(/Art\. 593, inciso III, alínea d — Código de Processo Penal/.test(await textoDita()) && /Memoriais/.test(await textoDita()), `o artigo dito não entrou (ou apagou a peça): ${await textoDita()}`);
await falar("hum deixa eu ver");
await p.waitForTimeout(100);
checar(/Memoriais/.test(await textoDita()) && /Não entendi/.test(await linha()), "a frase sem peça nem artigo mudou a resposta (ou não disse que não entendeu)");
await falar("apelação ou memoriais");
await p.waitForTimeout(100);
checar(/PeçaApelação/.test(await textoDita()), `na frase com duas peças, não valeu a primeira: ${await textoDita()}`);
await falar("apagar");
await p.waitForTimeout(100);
checar(/diga o nome da peça/.test(await textoDita()) && (await dita.getByRole("button", { name: "Responder" }).isDisabled()), "“apagar” não limpou a resposta");
await falar("responder");
checar(/Falta a peça/.test(await linha()), `“responder” sem a peça não avisou o que falta: ${await linha()}`);
q = { id: (await questao()).id };
k = (await ditos()).length;
await falar("habeas corpus artigo 648 inciso 1 do CPP responder");
checar(await esperarDito(/^(Correto!|Errado\. A peça certa é|A peça está certa:)/, k), `a correção da peça não foi lida: ${(await ditos()).slice(k).join(" | ")}`);
checar(!(await ditos()).slice(k).some((d) => /próxima/i.test(d)), "a correção dita fala “próxima” (o eco seguiria sozinho)");
await p.screenshot({ path: process.env.CAPTURAS ? `${process.env.CAPTURAS}/treino-voz.png` : "/dev/null" }).catch(() => {});
await esperarOutra(q.id).catch(() => checar(false, "depois da correção da peça, a próxima questão não veio sozinha"));
checar((await p.locator("[data-resposta-dita]").count()) === 1, "a próxima questão de digitar não abriu com a resposta dita");

// 8. a pronúncia dos nomes: nenhum dos que a escrita engana foi dito como está escrito
const enganam = ["Medeia", "Galateia", "Reia", "Eneias", "Ájax", "Pólux", "Polixena", "Apolo", "Hefesto", "Minerva", "Laerte", "Diomedes", "Ganimedes"];
const ditosTodos = (await ditos()).join(" ");
const faladosErrado = enganam.filter((n) => new RegExp(`(?<![\\p{L}])${n}(?![\\p{L}])`, "u").test(ditosTodos));
checar(!faladosErrado.length, `nomes ditos como estão escritos: ${faladosErrado.join(", ")}`);
await ctx.close();

// 9. celular: falando, a resposta dita (sem caixas) e o teclado fechado
const cel = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
await cel.addInitScript(FALSOS);
const c = await cel.newPage();
c.on("pageerror", (e) => erros.push(e.message));
await c.goto(`${BASE}/treino/`, { waitUntil: "networkidle" });
await c.evaluate(() => {
  localStorage.clear();
  localStorage.setItem("grifo:leitor:ouvir", JSON.stringify({ microfone: "padrao", sensibilidade: "normal" }));
  localStorage.setItem("grifo:treino:voz", "true");
  localStorage.setItem("grifo:treino:automatico:ligado", "false");
});
await c.reload({ waitUntil: "networkidle" });
await c.getByRole("button", { name: /^Médio/ }).tap();
await c.getByRole("button", { name: "Começar o modo infinito" }).tap();
await c.locator("[data-resposta-dita]").waitFor();
await c.waitForTimeout(600);
checar(await c.evaluate(() => window.__fala.ditos.length > 0 || !!window.__fala.atual), "no celular, a questão não foi lida");
checar(!(await c.evaluate(() => document.activeElement?.matches("input, textarea"))), "no celular, com a voz ligada, o teclado abriu sozinho");
checar((await c.locator("[class*=linhaVoz]").count()) === 1, "no celular, a linha do microfone não aparece");
const larga = await c.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
checar(!larga, "no celular, a página rola para o lado com a resposta dita");
if (process.env.CAPTURAS) await c.screenshot({ path: `${process.env.CAPTURAS}/treino-voz-celular.png` });
await cel.close();

await b.close();
checar(erros.length === 0, `erros na página: ${erros.join(" | ")}`);
if (falhas.length) {
  console.error(`treino-voz: ${falhas.length} falha(s)\n- ${falhas.join("\n- ")}`);
  process.exit(1);
}
console.log("treino-voz: ok (leitura, eco, parar, repetir, acerto que segue sozinho, erro com pausa e artigos, resposta dita única, próxima, desligar, pronúncia, tela acesa e celular)");
