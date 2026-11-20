// Os gestos das barras da leitura em voz alta, no celular (toques de verdade, pelo CDP): no treino, a barra do microfone
// presa embaixo e o trecho lido destacado e à vista; dois toques no ▶ (a questão do começo), segurar e deslizar até um
// item do menu, deslizar na velocidade e nas frases, o microfone silenciado e o anel do som. No Ouvir do Vade Mecum, o
// menu de segurar das setas, deslizar pelos artigos, o prazo pelo menu do ▶, dois toques no rótulo e o volume deslizado.
// A voz e o microfone são falsos. node tests/e2e/gestos-voz.mjs [BASE]
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const falhas = [];
const checar = (ok, msg) => {
  if (!ok) falhas.push(msg);
};

// a voz falsa (__fala.ms por letra, na velocidade 1) e o microfone falso (__falar entrega a frase como reconhecida)
const FALSOS = () => {
  const vozes = [{ name: "Luciana", lang: "pt-BR", voiceURI: "luciana", localService: true, default: true }];
  const fala = { ditos: [], iniciados: [], taxas: [], fila: [], atual: null, timer: null, ms: 4 };
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
      if (f.volume > 0 && f.text.trim()) fala.iniciados.push(f.text);
      f.onstart?.({});
      fala.timer = setTimeout(() => {
        if (fala.atual !== f) return;
        fala.atual = null;
        if (f.volume > 0 && f.text.trim()) {
          fala.ditos.push(f.text);
          fala.taxas.push(f.rate);
        }
        f.onend?.({});
        seguinte();
      }, Math.max(20, (f.text.length * fala.ms) / f.rate));
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
  const ativos = new Set();
  window.__ativos = ativos;
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
};

const b = await chromium.launch();
const erros = [];

/** Uma página de celular com os falsos e os toques pelo CDP. */
async function celular(tema = "light") {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, colorScheme: tema });
  await ctx.addInitScript(FALSOS);
  const p = await ctx.newPage();
  p.on("pageerror", (e) => erros.push(e.message));
  const cdp = await ctx.newCDPSession(p);
  const toque = (type, pt) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pt ? [{ x: pt.x, y: pt.y }] : [] });
  const centro = async (alvo) => {
    const r = await (typeof alvo === "string" ? p.locator(alvo) : alvo).first().boundingBox();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  };
  const g = {
    p,
    ctx,
    toque,
    centro,
    async tocar(alvo) {
      const c = await centro(alvo);
      await toque("touchStart", c);
      await toque("touchEnd");
    },
    async doisToques(alvo) {
      const c = await centro(alvo);
      await toque("touchStart", c);
      await toque("touchEnd");
      await p.waitForTimeout(60);
      await toque("touchStart", c);
      await toque("touchEnd");
    },
    /** segura até o menu abrir; com `item`, desliza até ele e solta */
    async segurar(alvo, item) {
      const c = await centro(alvo);
      await toque("touchStart", c);
      await p.waitForTimeout(600);
      if (!item) return toque("touchEnd");
      const menu = p.getByRole("menu");
      const i = await centro(menu.getByRole("menuitem", { name: item }).or(menu.getByRole("menuitemradio", { name: item })));
      await toque("touchMove", { x: c.x, y: c.y - 30 });
      await toque("touchMove", i);
      await p.waitForTimeout(80);
      await toque("touchEnd");
    },
    /** desliza a partir do botão; `fim` antes de soltar (para ler o balão) */
    async deslizar(alvo, dx, dy, antesDeSoltar) {
      const c = await centro(alvo);
      await toque("touchStart", c);
      const passos = 10;
      for (let k = 1; k <= passos; k++) {
        await toque("touchMove", { x: c.x + (dx * k) / passos, y: c.y + (dy * k) / passos });
        await p.waitForTimeout(16);
      }
      await p.waitForTimeout(100);
      const balao = await antesDeSoltar?.();
      await toque("touchEnd");
      return balao;
    },
    balao: () => p.locator("[class*=balao]").first().textContent({ timeout: 1000 }).catch(() => ""),
  };
  return g;
}

// ---------- 1. o treino ----------
{
  const g = await celular();
  const { p } = g;
  await p.goto(`${BASE}/treino/`, { waitUntil: "networkidle" });
  await p.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("grifo:leitor:ouvir", JSON.stringify({ microfone: "padrao", sensibilidade: "normal" }));
    localStorage.setItem("grifo:treino:voz", "true");
  });
  await p.reload({ waitUntil: "networkidle" });
  await p.evaluate(() => (window.__fala.ms = 22));
  await p.getByRole("button", { name: /Começar o modo automático/ }).tap();
  const barra = p.locator("[data-barra-voz]");
  await barra.waitFor();
  await p.waitForFunction(() => !!window.__fala.atual, null, { timeout: 8000 }).catch(() => {});
  await p.waitForTimeout(300);
  const lugar = () =>
    p.evaluate(() => {
      const bar = document.querySelector("[data-barra-voz]").getBoundingClientRect();
      const el = document.querySelector("[data-questao] [data-lendo]");
      const r = el?.getBoundingClientRect();
      return {
        barra: { top: bar.top, bottom: bar.bottom, fixa: getComputedStyle(document.querySelector("[data-barra-voz]")).position === "fixed" },
        parte: el ? (el.dataset.ler ?? (el.hasAttribute("data-alt") ? "alt" : "?")) : null,
        visivel: !!r && r.top < bar.top && r.bottom > 60,
        destaque: typeof CSS !== "undefined" && "highlights" in CSS ? CSS.highlights.has("grifo-fala") : true,
        dito: window.__fala.atual?.text ?? "",
      };
    });
  let l = await lugar();
  checar(l.barra.fixa && l.barra.bottom <= 844 && l.barra.bottom > 780, `a barra do microfone não está presa embaixo da tela: ${JSON.stringify(l.barra)}`);
  checar(l.parte === "caso" && l.destaque, `lendo o caso, ele não está destacado (com o trecho dito): ${JSON.stringify(l)}`);
  // a página rola, e a barra continua à vista
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(100);
  const noAlto = await barra.boundingBox();
  checar(noAlto && noAlto.y + noAlto.height <= 844 && noAlto.y > 600, "com a página no alto, a barra do microfone saiu da tela");
  // chegando às alternativas, a que é lida fica destacada e à vista (acima da barra)
  await p.waitForFunction(() => /^Letra/.test(window.__fala.atual?.text ?? ""), null, { timeout: 60_000 }).catch(() => {});
  await p.waitForTimeout(700);
  l = await lugar();
  checar(l.parte === "alt" && l.visivel, `a alternativa lida não está destacada e à vista, acima da barra: ${JSON.stringify(l)}`);
  if (process.env.CAPTURAS) await p.screenshot({ path: `${process.env.CAPTURAS}/gestos-treino.png` });

  // dois toques no ▶: a questão do começo
  const tocarSel = "[data-barra-voz] button[aria-label='Pausar a leitura'], [data-barra-voz] button[aria-label='Continuar a leitura'], [data-barra-voz] button[aria-label='Ler a questão de novo']";
  let k = await p.evaluate(() => window.__fala.iniciados.length);
  await g.doisToques(tocarSel);
  await p.waitForFunction((k) => window.__fala.iniciados.length > k, k, { timeout: 4000 }).catch(() => {});
  const primeiro = await p.evaluate((k) => window.__fala.iniciados[k] ?? "", k);
  checar(primeiro && !/^Letra/.test(primeiro) && (await lugar()).parte === "caso", `dois toques no ▶ não leram a questão do começo: ${primeiro}`);
  checar(await p.evaluate(() => !!window.__fala.atual), "depois dos dois toques, a leitura não seguiu (o primeiro toque pausou?)");

  // segurar o ▶, deslizar até "Ler só as alternativas" e soltar
  k = await p.evaluate(() => window.__fala.iniciados.length);
  await g.segurar(tocarSel, "Ler só as alternativas");
  await p.waitForFunction((k) => window.__fala.iniciados.length > k, k, { timeout: 4000 }).catch(() => {});
  checar(/^Letra á/.test(await p.evaluate((k) => window.__fala.iniciados[k] ?? "", k)), "segurar o ▶ e soltar em “Ler só as alternativas” não leu as alternativas");
  checar((await p.getByRole("menu").count()) === 0, "o menu ficou aberto depois de escolher o item");

  // segurar e soltar parado: o menu fica aberto; um toque fora o fecha
  await g.segurar("[data-barra-voz] button[aria-label='Próxima frase']");
  await p.waitForTimeout(200);
  checar((await p.getByRole("menu", { name: "Ler a partir de" }).count()) === 1, "segurar e soltar parado na seta não deixou o menu aberto");
  if (process.env.CAPTURAS) await p.screenshot({ path: `${process.env.CAPTURAS}/gestos-treino-menu.png` });
  await g.tocar("[data-questao] [data-ler='comando']");
  await p.waitForTimeout(200);
  checar((await p.getByRole("menu").count()) === 0, "o toque fora não fechou o menu");

  // deslizar na velocidade: o balão mostra o valor; ao soltar, ele vale (e fica gravado, como no Ouvir)
  const voz = "[data-barra-voz] button[aria-label^='Velocidade']";
  const balaoVel = await g.deslizar(voz, 90, 0, g.balao);
  await p.waitForTimeout(300);
  const vel = await p.evaluate(() => JSON.parse(localStorage.getItem("grifo:leitor:ouvir")).velocidade);
  checar(/Velocidade 1,3×/.test(balaoVel) && vel === 1.3, `deslizar a velocidade não a pôs em 1,3× (balão: ${balaoVel}; gravada: ${vel})`);
  const balaoVol = await g.deslizar(voz, 0, 75, g.balao);
  await p.waitForTimeout(300);
  const vol = await p.evaluate(() => JSON.parse(localStorage.getItem("grifo:leitor:ouvir")).volume);
  checar(/Volume da voz 75%/.test(balaoVol) && vol === 0.75, `deslizar para baixo não baixou o volume para 75% (balão: ${balaoVol}; gravado: ${vol})`);

  // deslizar nas frases: o balão mostra a frase; ao soltar, a leitura vai para ela
  const balaoFrase = await g.deslizar("[data-barra-voz] button[aria-label='Frase anterior']", -60, 0, g.balao);
  checar(/^Frase \d+ de \d+/.test(balaoFrase), `deslizar na seta não mostrou a frase no balão: ${balaoFrase}`);

  // o microfone: o anel mostra o som que chega; o toque silencia, e outro volta a ouvir
  await p.evaluate(() => window.__falar("letra", false));
  await p.waitForTimeout(120);
  const som = await p.evaluate(() => Number(getComputedStyle(document.querySelector("[data-barra-voz] [class*=anel]")).getPropertyValue("--som")));
  checar(som > 0.2, `chegando a voz, o anel do microfone não cresceu (--som ${som})`);
  const mic = "[data-barra-voz] button[aria-label^='Microfone']";
  await g.tocar(mic);
  await p.waitForTimeout(500);
  checar((await barra.getAttribute("data-estado")) === "silenciada" && (await p.evaluate(() => window.__ativos.size)) === 0, "o toque no microfone não o silenciou");
  await g.tocar(mic);
  await p.waitForFunction(() => window.__ativos.size > 0, null, { timeout: 4000 }).catch(() => {});
  checar((await p.evaluate(() => window.__ativos.size)) > 0, "o segundo toque no microfone não o fez ouvir de novo");
  checar(!(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)), "no celular, a página do treino rola para o lado com a barra");
  await g.ctx.close();
}

// ---------- 2. o Ouvir do Vade Mecum ----------
{
  const g = await celular();
  const { p } = g;
  await p.goto(`${BASE}/leis/cp/`, { waitUntil: "networkidle" });
  await p.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("grifo:leitor:ouvir", JSON.stringify({ comandos: true, microfone: "padrao", sensibilidade: "normal", microfoneNaLeitura: "ouvir" }));
  });
  await p.goto(`${BASE}/leis/cp/#art121`, { waitUntil: "networkidle" });
  await p.reload({ waitUntil: "networkidle" });
  await p.waitForSelector("#art121");
  await p.waitForFunction(() => !document.body.textContent.includes("Carregando o restante da lei"), null, { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(600);
  await p.evaluate(() => (window.__fala.ms = 20));
  await p.evaluate(() => [...document.querySelectorAll('nav[aria-label="Controles de leitura"] button')].find((x) => x.textContent.trim().endsWith("Ouvir")).click());
  await p.waitForFunction(() => !!window.__fala.atual, null, { timeout: 10_000 });
  await p.evaluate(() => window.__falar("ir para o artigo 121"));
  await p.waitForTimeout(400);
  await p.evaluate(() => window.__falar("pausa"));
  await p.waitForTimeout(300);
  const barra = p.locator("[data-barra-ouvir]");
  const artigoLido = () => p.evaluate(() => document.querySelector("[data-falando]")?.closest?.("[data-i]")?.getAttribute("data-disp")?.split(".")[0] ?? null);

  // deslizar no "próximo artigo": o balão diz até onde vai; ao soltar, a leitura vai para lá
  const proximoArtigo = "[data-barra-ouvir] button[aria-label='Próximo artigo']";
  const balao = await g.deslizar(proximoArtigo, 3 * 26 + 8, 0, g.balao);
  await p.waitForTimeout(500);
  checar(/^Art\. 122/.test(balao) && /Avança 3 artigos/.test(balao), `deslizar três passos no próximo artigo não mostrou o art. 122 (121-A e 121-B no meio): ${balao}`);
  checar((await artigoLido()) === "art122", `ao soltar, a leitura não foi ao art. 122: ${await artigoLido()}`);
  if (process.env.CAPTURAS) await p.screenshot({ path: `${process.env.CAPTURAS}/gestos-ouvir.png` });

  // segurar o "artigo anterior": o menu de ir para; "Repetir o artigo" lê do começo dele
  await g.segurar("[data-barra-ouvir] button[aria-label='Artigo anterior']");
  await p.waitForTimeout(200);
  const menu = (await p.getByRole("menu").textContent().catch(() => "")) ?? "";
  checar(/Grifo anterior/.test(menu) && /Artigo importante anterior/.test(menu) && /Capítulo anterior/.test(menu), `o menu do artigo anterior não tem os grifos, a estrela e o capítulo: ${menu.slice(0, 160)}`);
  if (process.env.CAPTURAS) await p.screenshot({ path: `${process.env.CAPTURAS}/gestos-ouvir-menu.png` });
  await p.getByRole("menuitem", { name: "Repetir o artigo" }).tap();
  await p.waitForTimeout(400);
  checar((await artigoLido()) === "art122", `“Repetir o artigo” não ficou no art. 122: ${await artigoLido()}`);

  // segurar o ▶ e soltar em "30 min": a leitura para sozinha em 30 minutos
  await g.segurar("[data-barra-ouvir] button[aria-label='Pausar'], [data-barra-ouvir] button[aria-label='Continuar a leitura']", "30 min");
  await p.waitForTimeout(300);
  checar(/para em 30 min/.test((await barra.textContent()) ?? ""), `o “30 min” do menu do ▶ não pôs o prazo: ${await barra.textContent()}`);

  // dois toques no rótulo: onde estou, dito
  const k = await p.evaluate(() => window.__fala.iniciados.length);
  await g.doisToques("[data-barra-ouvir] button[aria-label$='mostrar o trecho que está sendo lido']");
  await p.waitForFunction((k) => window.__fala.iniciados.slice(k).some((t) => /^Você está/.test(t)), k, { timeout: 4000 }).catch(() => {});
  checar(await p.evaluate((k) => window.__fala.iniciados.slice(k).some((t) => /^Você está/.test(t)), k), "dois toques no rótulo não disseram onde a leitura está");

  // a voz: deslizar para baixo baixa o volume
  await g.deslizar("[data-barra-ouvir] button[aria-label^='Velocidade']", 0, 45);
  await p.waitForTimeout(300);
  const vol = await p.evaluate(() => JSON.parse(localStorage.getItem("grifo:leitor:ouvir")).volume);
  checar(vol === 0.85, `deslizar a voz para baixo não baixou o volume para 85%: ${vol}`);
  checar(!(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)), "no celular, o leitor rola para o lado com a barra do Ouvir");
  await g.ctx.close();
}

await b.close();
checar(erros.length === 0, `erros na página: ${erros.join(" | ")}`);
if (falhas.length) {
  console.error(`gestos-voz: ${falhas.length} falha(s)\n- ${falhas.join("\n- ")}`);
  process.exit(1);
}
console.log("gestos-voz: ok (treino: barra presa embaixo, trecho destacado e à vista, dois toques, segurar e deslizar no menu, velocidade e volume deslizados, frases, anel do som, microfone silenciado; Ouvir: artigos deslizados, menu das setas, prazo pelo menu, onde estou, volume)");
