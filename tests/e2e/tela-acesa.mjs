// A tela não apaga durante a leitura em voz alta da lei: a trava (Wake Lock) é pedida ao ler, pedida de novo quando o
// sistema a solta com a página à vista e, recusada, no próximo toque; sem a trava no navegador (o endereço sem https), o
// Ouvir avisa que a tela pode apagar. A voz e a trava são falsas. node tests/e2e/tela-acesa.mjs [BASE]
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const falhas = [];
const checar = (ok, msg) => {
  if (!ok) falhas.push(msg);
};

// a voz falsa (fala devagar: a leitura dura o teste todo) e a trava falsa: __tela conta os pedidos e as solturas;
// __tela.soltarPeloSistema() solta a trava como o Android faz; com __tela.recusar, o pedido é recusado
const FALSOS = (comTrava) => {
  const fala = { ditos: [], fila: [], atual: null, timer: null };
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
        if (f.text.trim()) fala.ditos.push(f.text);
        f.onend?.({});
        seguinte();
      }, 400 + f.text.length * 20);
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
      getVoices: () => [{ name: "Luciana", lang: "pt-BR", voiceURI: "luciana", localService: true, default: true }],
      addEventListener() {},
      removeEventListener() {},
    },
  });
  window.SpeechSynthesisUtterance = Fala;
  const tela = { pedidos: 0, soltas: 0, recusar: false, atual: null };
  window.__tela = tela;
  tela.soltarPeloSistema = () => {
    const t = tela.atual;
    if (!t || t.released) return false;
    t.released = true;
    t.dispatchEvent(new Event("release"));
    return true;
  };
  Object.defineProperty(navigator, "wakeLock", {
    configurable: true,
    value: comTrava
      ? {
          request: async () => {
            tela.pedidos++;
            if (tela.recusar) throw new DOMException("recusada", "NotAllowedError");
            const t = new EventTarget();
            t.released = false;
            t.release = async () => {
              if (t.released) return;
              t.released = true;
              tela.soltas++;
              t.dispatchEvent(new Event("release"));
            };
            tela.atual = t;
            return t;
          },
        }
      : undefined,
  });
};

const b = await chromium.launch();
const erros = [];

async function abrirLei(comTrava) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(FALSOS, comTrava);
  const p = await ctx.newPage();
  p.on("pageerror", (e) => erros.push(e.message));
  await p.goto(`${BASE}/leis/cp/#art121`, { waitUntil: "networkidle" });
  await p.waitForSelector("#art121");
  await p.waitForTimeout(800);
  await p.evaluate(() => [...document.querySelectorAll('nav[aria-label="Controles de leitura"] button')].find((x) => x.textContent.trim().endsWith("Ouvir")).click());
  await p.waitForFunction(() => !!window.__fala.atual, null, { timeout: 10_000 });
  await p.waitForTimeout(300);
  return { ctx, p };
}
const tela = (p) => p.evaluate(() => ({ pedidos: window.__tela.pedidos, soltas: window.__tela.soltas, valendo: !!window.__tela.atual && !window.__tela.atual.released }));

// 1. lendo, a tela fica acesa; solta pelo sistema, a trava é pedida de novo; recusada, o Ouvir avisa e o toque tenta de novo
{
  const { ctx, p } = await abrirLei(true);
  let t = await tela(p);
  checar(t.pedidos >= 1 && t.valendo, `lendo, a tela não ficou acesa: ${JSON.stringify(t)}`);
  const antes = t.pedidos;
  await p.evaluate(() => window.__tela.soltarPeloSistema());
  await p.waitForTimeout(300);
  t = await tela(p);
  checar(t.pedidos === antes + 1 && t.valendo, `solta pelo sistema durante a leitura, a trava não foi pedida de novo: ${JSON.stringify(t)}`);
  await p.evaluate(() => {
    window.__tela.recusar = true;
    window.__tela.soltarPeloSistema();
  });
  await p.waitForTimeout(300);
  checar(await p.getByText(/A tela pode apagar: o navegador recusou/).first().isVisible().catch(() => false), "com a trava recusada, o Ouvir não avisa que a tela pode apagar");
  await p.evaluate(() => (window.__tela.recusar = false));
  await p.mouse.click(640, 450);
  await p.waitForTimeout(300);
  t = await tela(p);
  checar(t.valendo, `recusada a trava, o toque na tela não a pediu de novo: ${JSON.stringify(t)}`);
  // pausada a leitura, a tela pode apagar
  await p.locator("[data-barra-ouvir]").getByRole("button", { name: "Pausar" }).click();
  await p.waitForTimeout(600);
  t = await tela(p);
  checar(!t.valendo, `pausada a leitura, a tela continuou presa acesa: ${JSON.stringify(t)}`);
  await ctx.close();
}

// 2. sem a trava no navegador: o aviso de que a tela pode apagar, ao ler e nos ajustes
{
  const { ctx, p } = await abrirLei(false);
  checar(await p.getByText(/A tela pode apagar/).first().isVisible().catch(() => false), "sem a trava no navegador, o Ouvir não avisa que a tela pode apagar");
  await p.locator("[data-barra-ouvir]").getByRole("button", { name: "Ajustes da leitura em voz alta" }).click();
  const painel = p.getByRole("dialog", { name: "Ouvir em voz alta" });
  await painel.waitFor();
  checar(/A tela pode apagar/.test((await painel.textContent()) ?? ""), "sem a trava, os ajustes não dizem que a tela pode apagar");
  await ctx.close();
}

await b.close();
checar(erros.length === 0, `erros na página: ${erros.join(" | ")}`);
if (falhas.length) {
  console.error(`tela-acesa: ${falhas.length} falha(s)\n- ${falhas.join("\n- ")}`);
  process.exit(1);
}
console.log("tela-acesa: ok (acesa ao ler, pedida de novo quando o sistema solta, aviso e toque quando recusada, solta ao pausar, aviso sem a trava)");
