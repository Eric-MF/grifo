// O microfone do fone Bluetooth e a voz: quando quem ouve é o microfone do fone (não há outro, ou ele foi o escolhido), ele
// fecha enquanto a voz lê (o fone sai do modo de chamada, o "Headset") e abre de novo quando ela para; a voz, logo depois
// de ele fechar, espera o fone voltar ao som normal. Com o microfone do notebook, ele fica ouvindo (os comandos valem no
// meio da leitura); com "Sempre ligado", também. No treino (responder falando) e no Ouvir do Vade Mecum. No celular
// (Android, que bipa a cada vez que o reconhecimento liga), o microfone fecha na leitura e entra em pausa depois de 5
// minutos sem ouvir nada (aqui, encurtados), até um toque. A voz, o reconhecimento e os microfones são falsos. node tests/e2e/fone-bluetooth.mjs [BASE]
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const falhas = [];
const checar = (ok, msg) => {
  if (!ok) falhas.push(msg);
};

// os microfones da vez: __microfones antes de carregar a página (só o do fone, ou o do fone e o do notebook)
const FALSOS = ({ comNotebook = false, celular = false } = {}) => {
  const log = [];
  window.__log = log;
  // a pausa do microfone do celular depois do silêncio: 5 minutos no site, 1,5 s aqui
  if (celular) window.__grifoSilencioMs = 1500;
  const ativos = new Set();
  window.__ativos = ativos;
  class Reconhecimento {
    constructor() {
      this.onresult = this.onerror = this.onend = this.onstart = null;
      this.indice = 0;
    }
    // como o Chrome do computador: aceita um microfone escolhido e recusa trilha encerrada
    start(trilha) {
      if (trilha !== undefined && (!trilha || trilha.kind !== "audio" || trilha.readyState !== "live")) throw new DOMException("trilha inválida", "InvalidStateError");
      ativos.add(this);
      log.push({ t: performance.now(), e: "ouvir" });
      setTimeout(() => this.onstart?.(), 5);
      // como o Android: sem nada dito, a escuta acaba sozinha depois de um silêncio
      if (celular)
        this.silencio = setTimeout(() => {
          if (!ativos.has(this)) return;
          ativos.delete(this);
          this.onerror?.({ error: "no-speech" });
          this.onend?.();
        }, 400);
    }
    stop() {
      this.abort();
    }
    abort() {
      clearTimeout(this.silencio);
      if (ativos.delete(this)) log.push({ t: performance.now(), e: "fechar" });
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
  // a voz falsa: fala `ms` por letra e guarda o que disse
  const fala = { ditos: [], fila: [], atual: null, timer: null, ms: 6 };
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
        if (f.text.trim()) log.push({ t: performance.now(), e: "falar", texto: f.text });
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
      getVoices: () => [{ name: "Luciana", lang: "pt-BR", voiceURI: "luciana", localService: true, default: true }],
      addEventListener() {},
      removeEventListener() {},
    },
  });
  window.SpeechSynthesisUtterance = Fala;
  // o Chrome do computador em https, com o fone Bluetooth como microfone padrão
  Object.defineProperty(navigator, "userAgentData", { configurable: true, value: { brands: [{ brand: "Chromium", version: "153" }], mobile: celular } });
  const lista = [
    { kind: "audioinput", deviceId: "default", label: "Padrão - Headset (Freedom 2 Hands-Free AG Audio)", groupId: "bt" },
    { kind: "audioinput", deviceId: "fone", label: "Headset (Freedom 2 Hands-Free AG Audio)", groupId: "bt" },
    ...(comNotebook ? [{ kind: "audioinput", deviceId: "notebook", label: "Conjunto de microfones (Realtek(R) Audio)", groupId: "nb" }] : []),
    { kind: "audiooutput", deviceId: "default", label: "Padrão - Fones de ouvido (Freedom 2 Stereo)", groupId: "bt" },
  ];
  window.__gum = [];
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      enumerateDevices: async () => lista,
      getUserMedia: async (c) => {
        window.__gum.push(JSON.parse(JSON.stringify(c)));
        const ac = new AudioContext();
        const o = ac.createOscillator();
        const d = ac.createMediaStreamDestination();
        o.connect(d);
        o.start();
        return d.stream;
      },
      addEventListener() {},
      removeEventListener() {},
    },
  });
  Object.defineProperty(navigator, "wakeLock", { configurable: true, value: { request: async () => ({ released: false, release: async () => {} }) } });
};

const b = await chromium.launch();
const erros = [];

async function abrir(comNotebook, prefs = {}) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(FALSOS, { comNotebook });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => erros.push(e.message));
  await p.goto(`${BASE}/treino/`, { waitUntil: "networkidle" });
  await p.evaluate((prefs) => {
    localStorage.clear();
    localStorage.setItem("grifo:leitor:ouvir", JSON.stringify(prefs));
    localStorage.setItem("grifo:treino:voz", "true");
  }, prefs);
  await p.reload({ waitUntil: "networkidle" });
  return { ctx, p };
}
const ouvindo = (p) => p.evaluate(() => window.__ativos.size);
const lendo = (p) => p.evaluate(() => !!window.__fala.atual);
const linha = (p) => p.locator("[data-texto-voz]").textContent();
const esperarLendo = (p) => p.waitForFunction(() => !!window.__fala.atual, null, { timeout: 8000 });
const esperarQuieta = (p) => p.waitForFunction(() => !window.__fala.atual && !window.__fala.fila.length, null, { timeout: 20_000 });

// 1. só o microfone do fone: fechado enquanto a voz lê, aberto quando ela para; a voz espera o fone voltar ao normal
{
  const { ctx, p } = await abrir(false);
  await p.getByRole("button", { name: "Começar o modo automático" }).click();
  await p.locator("[data-alt]").first().waitFor();
  await esperarLendo(p);
  await p.waitForTimeout(300);
  checar((await ouvindo(p)) === 0, "com o microfone do fone, ele ficou ouvindo enquanto a voz lia (o fone fica no modo de chamada)");
  checar(/O microfone volta quando a voz parar/.test(await linha(p)), `lendo, a linha não diz que o microfone volta depois: ${await linha(p)}`);
  await esperarQuieta(p);
  await p.waitForFunction(() => window.__ativos.size > 0, null, { timeout: 4000 }).catch(() => {});
  checar((await ouvindo(p)) === 1, "parada a voz, o microfone do fone não voltou a ouvir");
  checar(/Diga a letra/.test(await linha(p)), `ouvindo de novo, a linha não diz o que falar: ${await linha(p)}`);
  // a resposta: o microfone fecha para a correção ser dita, e a voz espera o fone voltar ao som normal
  const antes = await p.evaluate(() => window.__log.length);
  await p.evaluate(() => window.__falar("letra a"));
  await p.waitForFunction((n) => window.__log.slice(n).some((x) => x.e === "falar"), antes, { timeout: 8000 }).catch(() => {});
  const depois = await p.evaluate((n) => window.__log.slice(n), antes);
  const fechou = depois.find((x) => x.e === "fechar");
  const falou = depois.find((x) => x.e === "falar");
  checar(!!fechou && !!falou && falou.t - fechou.t >= 1000, `a correção não esperou o fone voltar ao som normal: ${JSON.stringify(depois.slice(0, 4))}`);
  // nos ajustes: quem ouve é o do fone, e o que o microfone faz na leitura
  await esperarQuieta(p);
  await p.getByRole("button", { name: "Ajustes da voz e do microfone" }).click();
  const janela = p.getByRole("dialog", { name: /Voz e microfone/ });
  await janela.waitFor();
  const texto = (await janela.textContent()) ?? "";
  checar(/(Ouvindo|Vai ouvir) pelo: Headset \(Freedom 2 Hands-Free AG Audio\)/.test(texto), `os ajustes não dizem que o microfone é o do fone: ${texto.slice(0, 300)}`);
  checar((await janela.getByRole("button", { name: "Automático", exact: true }).getAttribute("aria-pressed")) === "true", "o microfone na leitura não vem no automático");
  // "Sempre ligado": o microfone do fone ouve durante a leitura
  await janela.getByRole("button", { name: "Sempre ligado" }).click();
  checar((await p.evaluate(() => JSON.parse(localStorage.getItem("grifo:leitor:ouvir")).microfoneNaLeitura)) === "ouvir", "“Sempre ligado” não ficou gravado");
  await p.keyboard.press("Escape");
  // trocada a opção, a escuta abre de novo
  await p.waitForFunction(() => window.__ativos.size > 0, null, { timeout: 4000 }).catch(() => {});
  await p.evaluate(() => window.__falar("ler a questão"));
  await esperarLendo(p);
  await p.waitForTimeout(800);
  checar((await ouvindo(p)) === 1, "com “Sempre ligado”, o microfone fechou durante a leitura");
  await ctx.close();
}

// 2. o fone e o microfone do notebook: o automático ouve pelo do notebook, que fica aberto durante a leitura
{
  const { ctx, p } = await abrir(true);
  await p.getByRole("button", { name: "Começar o modo automático" }).click();
  await p.locator("[data-alt]").first().waitFor();
  await esperarLendo(p);
  await p.waitForTimeout(600);
  const pedidos = await p.evaluate(() => window.__gum.map((c) => c.audio?.deviceId?.exact ?? "padrão"));
  checar(pedidos.includes("notebook") && !pedidos.includes("fone"), `o automático não abriu o microfone do notebook: ${pedidos.join(", ")}`);
  checar((await ouvindo(p)) === 1, "com o microfone do notebook, ele não ficou ouvindo durante a leitura");
  checar(await lendo(p), "a voz não estava lendo");
  await ctx.close();
}

// 3. o Ouvir do Vade Mecum, com os comandos de voz e só o microfone do fone: fechado na leitura, aberto na pausa
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(FALSOS, {});
  const p = await ctx.newPage();
  p.on("pageerror", (e) => erros.push(e.message));
  await p.goto(`${BASE}/leis/cp/#art121`, { waitUntil: "networkidle" });
  await p.evaluate(() => localStorage.setItem("grifo:leitor:ouvir", JSON.stringify({ comandos: true })));
  await p.reload({ waitUntil: "networkidle" });
  await p.waitForSelector("#art121");
  await p.waitForTimeout(600);
  await p.evaluate(() => [...document.querySelectorAll('nav[aria-label="Controles de leitura"] button')].find((x) => x.textContent.trim().endsWith("Ouvir")).click());
  await esperarLendo(p);
  await p.waitForTimeout(1500);
  checar(await lendo(p), "o Ouvir não estava lendo");
  checar((await ouvindo(p)) === 0, "no Ouvir, o microfone do fone ficou ouvindo enquanto a voz lia");
  await p.locator("[data-barra-ouvir]").getByRole("button", { name: "Pausar" }).click();
  await p.waitForFunction(() => window.__ativos.size > 0, null, { timeout: 4000 }).catch(() => {});
  checar((await ouvindo(p)) === 1, "pausada a leitura do Ouvir, o microfone não voltou a ouvir");
  await p.evaluate(() => window.__falar("continua"));
  await esperarLendo(p).catch(() => checar(false, "“continua”, dito com a leitura pausada, não continuou"));
  await p.waitForTimeout(300);
  checar((await ouvindo(p)) === 0, "a leitura voltou e o microfone do fone continuou ouvindo");
  await ctx.close();
}

// 4. o celular Android, sem fone: o microfone fecha na leitura (ouviria a própria voz) e, depois de um tempo sem ouvir
// nada, entra em pausa (o Android bipa a cada vez que ele liga); um toque, ou a próxima leitura, o faz ouvir de novo
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Mobile Safari/537.36" });
  await ctx.addInitScript(FALSOS, { celular: true });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => erros.push(e.message));
  await p.goto(`${BASE}/treino/`, { waitUntil: "networkidle" });
  await p.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("grifo:treino:voz", "true");
  });
  await p.reload({ waitUntil: "networkidle" });
  await p.getByRole("button", { name: "Começar o modo automático" }).tap();
  await p.locator("[data-alt]").first().waitFor();
  await esperarLendo(p);
  await p.waitForTimeout(300);
  checar((await ouvindo(p)) === 0, "no celular, o microfone ficou ouvindo enquanto a voz lia (ouve a própria leitura, e o Android bipa a cada frase)");
  await esperarQuieta(p);
  // as escutas que acabam no silêncio: depois de algumas, o microfone para de religar
  await p.waitForFunction(() => /Microfone em pausa/.test(document.querySelector("[data-texto-voz]")?.textContent ?? ""), null, { timeout: 8000 }).catch(() => {});
  const ligadas = await p.evaluate(() => window.__log.filter((x) => x.e === "ouvir").length);
  checar(ligadas >= 2, `no silêncio, o microfone do celular não ficou religando até o tempo da pausa (ligou ${ligadas} vezes)`);
  checar(/Microfone em pausa/.test(await linha(p)), `em pausa, a linha não diz como voltar a falar: ${await linha(p)}`);
  await p.waitForTimeout(2000);
  checar((await p.evaluate(() => window.__log.filter((x) => x.e === "ouvir").length)) === ligadas, "em pausa, o microfone do celular continuou religando (e bipando)");
  // o toque no microfone: ouve de novo, e a resposta vale, mesmo dita só como frase parcial (o Chrome do Android às vezes
  // encerra a escuta sem dar a final)
  await p.getByRole("button", { name: /ouvir de novo/i }).tap();
  await p.waitForFunction(() => window.__ativos.size > 0, null, { timeout: 4000 }).catch(() => {});
  checar((await ouvindo(p)) === 1, "o toque no microfone em pausa não o fez ouvir de novo");
  const k = await p.evaluate(() => window.__fala.ditos.length);
  await p.evaluate(() => window.__falar("letra a", false));
  await p
    .waitForFunction((k) => window.__fala.ditos.length > k || !!window.__fala.atual, k, { timeout: 8000 })
    .catch(() => checar(false, "a resposta dita só como frase parcial, com a escuta acabando sozinha, não valeu (não foi corrigida em voz alta)"));
  await ctx.close();
}

await b.close();
checar(erros.length === 0, `erros na página: ${erros.join(" | ")}`);
if (falhas.length) {
  console.error(`fone-bluetooth: ${falhas.length} falha(s)\n- ${falhas.join("\n- ")}`);
  process.exit(1);
}
console.log("fone-bluetooth: ok (o microfone do fone fecha na leitura e volta depois; a voz espera o fone; o do notebook fica ouvindo; “Sempre ligado”; Ouvir; no celular, fecha na leitura e pausa no silêncio)");
