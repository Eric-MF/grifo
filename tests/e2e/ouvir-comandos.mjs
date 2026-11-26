// Os comandos de voz do Ouvir além de ir e voltar: a velocidade e o volume ditos, os dispositivos dentro do artigo,
// grifar e ir aos grifos, a estrela, vários artigos de uma vez, o prazo, o fim do artigo e os comandos do leitor (o
// fundo, o texto revogado). A voz e o microfone são falsos. node tests/e2e/ouvir-comandos.mjs [BASE]
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const falhas = [];
const checar = (ok, msg) => {
  if (!ok) falhas.push(msg);
};

const FALSOS = () => {
  const vozes = [
    { name: "Luciana", lang: "pt-BR", voiceURI: "luciana", localService: true, default: true },
    { name: "Google português do Brasil", lang: "pt-BR", voiceURI: "google-br", localService: false, default: false },
    { name: "Joana", lang: "pt-PT", voiceURI: "joana", localService: true, default: false },
  ];
  const estado = { ditos: [], taxas: [], volumes: [], fila: [], atual: null, timer: null, mudo: false };
  window.__fala = estado;
  class Fala {
    constructor(text) {
      this.text = text;
      this.lang = "";
      this.voice = null;
      this.rate = 1;
      this.pitch = 1;
      this.volume = 1;
      this.onstart = this.onend = this.onerror = null;
    }
  }
  const proxima = () => {
    if (estado.atual || estado.mudo) return;
    const f = estado.fila.shift();
    if (!f) return;
    estado.atual = f;
    setTimeout(() => {
      if (estado.atual !== f) return;
      f.onstart?.({});
      // 4 ms por letra, na velocidade 1
      estado.timer = setTimeout(() => {
        if (estado.atual !== f) return;
        estado.atual = null;
        if (f.volume > 0 && f.text.trim()) {
          estado.ditos.push(f.text);
          estado.taxas.push(f.rate);
          estado.volumes.push(f.volume);
        }
        f.onend?.({});
        proxima();
      }, Math.max(20, (f.text.length * 4) / f.rate));
    }, 5);
  };
  const synth = {
    get speaking() {
      return !!estado.atual;
    },
    get pending() {
      return estado.fila.length > 0;
    },
    paused: false,
    speak(f) {
      estado.fila.push(f);
      proxima();
    },
    cancel() {
      const todas = [estado.atual, ...estado.fila].filter(Boolean);
      estado.atual = null;
      estado.fila = [];
      clearTimeout(estado.timer);
      for (const f of todas) setTimeout(() => f.onerror?.({ error: "interrupted" }), 0);
    },
    pause() {},
    resume() {},
    getVoices: () => vozes,
    addEventListener() {},
    removeEventListener() {},
  };
  Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
  window.SpeechSynthesisUtterance = Fala;

  // o microfone falso: __falar("pausa") entrega a frase como reconhecida
  const ativos = new Set();
  class Reconhecimento {
    constructor() {
      this.onresult = this.onerror = this.onend = this.onstart = null;
      this.indice = 0;
    }
    // como o Chrome do computador: aceita um microfone escolhido (start(trilha)) e recusa trilha encerrada
    start(trilha) {
      if (trilha !== undefined && (!trilha || trilha.kind !== "audio" || trilha.readyState !== "live")) throw new DOMException("trilha inválida", "InvalidStateError");
      (window.__trilhas ??= []).push(trilha ? trilha.readyState : "padrao");
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
      const res = { 0: { transcript: texto }, length: 1, isFinal: final };
      const results = { length: r.indice + 1 };
      results[r.indice] = res;
      r.onresult?.({ resultIndex: r.indice, results });
      if (final) r.indice++;
    }
    return ativos.size;
  };
};


const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } });
await ctx.addInitScript(FALSOS);
const p = await ctx.newPage();
const erros = [];
p.on("pageerror", (e) => erros.push(e.message));
await p.goto(`${BASE}/leis/cp/`, { waitUntil: "networkidle" });
// os comandos ligados, com o microfone padrão aberto pelo próprio navegador
await p.evaluate(() => {
  localStorage.clear();
  localStorage.setItem("grifo:leitor:ouvir", JSON.stringify({ comandos: true, microfone: "padrao", sensibilidade: "normal" }));
});
await p.goto(`${BASE}/leis/cp/#art121`, { waitUntil: "networkidle" });
await p.reload({ waitUntil: "networkidle" });
await p.waitForSelector("#art121");
await p.waitForFunction(() => !document.body.textContent.includes("Carregando o restante da lei"), null, { timeout: 30000 }).catch(() => {});
await p.waitForTimeout(600);

const esperar = (ms) => p.waitForTimeout(ms);
const falar = async (t) => {
  const n = await p.evaluate((t) => window.__falar(t), t);
  await esperar(350);
  return n;
};
const prefsOuvir = () => p.evaluate(() => JSON.parse(localStorage.getItem("grifo:leitor:ouvir") ?? "{}"));
const prefsLeitor = () => p.evaluate(() => JSON.parse(localStorage.getItem("grifo:leitor") ?? "{}"));
/** o dispositivo do bloco que está sendo lido */
const lendoDisp = () => p.evaluate(() => document.querySelector("[data-falando]")?.getAttribute("data-disp") ?? null);
// a ordem dos blocos lidos (a voz falsa é rápida: a leitura anda logo depois do comando)
await p.evaluate(() => {
  window.__lidos = [];
  new MutationObserver((ms) => {
    for (const m of ms) if (m.target.dataset?.falando) window.__lidos.push(m.target.getAttribute("data-disp"));
  }).observe(document.body, { attributes: true, subtree: true, attributeFilter: ["data-falando"] });
});
/**
 * fala o comando e devolve o primeiro dispositivo lido depois dele. Com `outro` (o destino é com certeza outro bloco: os
 * grifos, os artigos), as marcações do bloco que estava sendo lido não contam: o pedaço seguinte dele pode ser marcado
 * logo antes do salto. Sem `outro`, contam ("parágrafo 2" dito já no § 2º lê o § 2º de novo).
 */
const irPorVoz = async (t, { outro = false } = {}) => {
  const [k, antes] = await p.evaluate(() => [window.__lidos.length, document.querySelector("[data-falando]")?.getAttribute("data-disp") ?? null]);
  await falar(t);
  const destino = ([k, antes]) => window.__lidos.slice(k).find((d) => d !== antes) ?? null;
  const primeiro = ([k]) => window.__lidos[k] ?? null;
  const ler = outro ? destino : primeiro;
  await p.waitForFunction(ler, [k, antes], { timeout: 4000 }).catch(() => {});
  return p.evaluate(ler, [k, antes]);
};
/** o prazo escolhido nos ajustes (o botão marcado em "Parar sozinho") */
const prefsPrazo = async () => {
  await p.locator("[data-barra-ouvir]").getByRole("button", { name: "Ajustes da leitura em voz alta" }).click();
  const painel = p.getByRole("dialog", { name: "Ouvir em voz alta" });
  await painel.waitFor();
  const marcado = await painel.locator("fieldset", { hasText: "Parar sozinho" }).locator('button[aria-pressed="true"]').textContent().catch(() => "");
  await p.keyboard.press("Escape");
  await esperar(200);
  return Number.parseInt(marcado ?? "", 10) || null;
};

// a leitura do artigo 121, com o microfone ouvindo
await p.evaluate(() => {
  document.querySelector("#art121").scrollIntoView({ block: "center" });
});
await esperar(400);
await p.evaluate(() => [...document.querySelectorAll('nav[aria-label="Controles de leitura"] button')].find((x) => x.textContent.trim().endsWith("Ouvir")).click());
await p.waitForFunction(() => !!window.__fala.atual, null, { timeout: 10_000 });
await esperar(600);
checar((await falar("pausa")) > 0, "o microfone não está ouvindo os comandos");
// a leitura começa do alto da tela (o capítulo, antes do artigo 121): vai ao artigo
await falar("ir para o artigo 121");
await esperar(300);

// 1. a velocidade e o volume ditos
await falar("velocidade máxima");
checar((await prefsOuvir()).velocidade === 2.5, `“velocidade máxima” não pôs a velocidade em 2,5: ${(await prefsOuvir()).velocidade}`);
await falar("velocidade 1,5");
checar((await prefsOuvir()).velocidade === 1.5, `“velocidade 1,5” não pôs a velocidade em 1,5: ${(await prefsOuvir()).velocidade}`);
await falar("velocidade dois");
checar((await prefsOuvir()).velocidade === 2, `“velocidade dois” não pôs a velocidade em 2: ${(await prefsOuvir()).velocidade}`);
await esperar(500);
checar(await p.evaluate(() => window.__fala.taxas.at(-1) === 2), `a velocidade nova não vale na leitura: ${await p.evaluate(() => window.__fala.taxas.slice(-3))}`);
await falar("velocidade normal");
await falar("volume 50%");
checar((await prefsOuvir()).volume === 0.5, `“volume 50%” não pôs o volume na metade: ${(await prefsOuvir()).volume}`);
await falar("volume máximo");

// 2. dentro do artigo: o parágrafo 2, o inciso quarto, o próximo inciso, o caput
let lido = await irPorVoz("parágrafo 2");
checar(lido === "art121.p2", `“parágrafo 2” não foi ao § 2º do art. 121: ${lido}`);
lido = await irPorVoz("inciso quarto");
checar(lido === "art121.p2.i4", `“inciso quarto” não foi ao inciso IV do § 2º: ${lido}`);
lido = await irPorVoz("próximo inciso");
checar(lido === "art121.p2.i5", `“próximo inciso” não foi ao inciso V: ${lido}`);
lido = await irPorVoz("inciso anterior");
checar(lido === "art121.p2.i4", `“inciso anterior” não voltou ao inciso IV: ${lido}`);

// 3. grifar o trecho lido, ir aos grifos e apagar
await falar("pausa");
const grifado = await lendoDisp();
await falar("grifa este trecho");
const marcas = await p.evaluate(() => JSON.parse(localStorage.getItem("grifo:marcacoes:cp") ?? "[]"));
checar(marcas.length === 1, `“grifa este trecho” não criou um grifo (${marcas.length})`);
// o trecho que é o inciso inteiro vira o parágrafo grifado (a forma do bloco), não uma <mark>
checar(
  (await p.locator(`[data-i][data-disp="${grifado}"] mark[data-m], [data-i][data-disp="${grifado}"][data-marca-bloco]`).count()) > 0,
  `o grifo feito pela voz não aparece no trecho que estava sendo lido (${grifado})`,
);
lido = await irPorVoz("primeiro grifo", { outro: true });
const noPrimeiro = await p.evaluate((d) => !!document.querySelector(`[data-i][data-disp="${d}"] mark[data-m], [data-i][data-disp="${d}"] mark[data-pronto]`), lido);
checar(noPrimeiro, `“primeiro grifo” não foi a um trecho grifado: ${lido}`);
lido = await irPorVoz("meu próximo grifo", { outro: true });
checar(lido === grifado, `“meu próximo grifo” não foi ao grifo feito pela voz (${grifado}): ${lido}`);
await falar("pausa");
await falar("apaga o grifo");
checar((await p.evaluate(() => JSON.parse(localStorage.getItem("grifo:marcacoes:cp") ?? "[]").length)) === 0, "“apaga o grifo” não apagou o grifo do trecho");

// 4. a estrela do artigo
await falar("marca como importante");
checar(await p.evaluate(() => document.querySelector('button[data-estrela="art121"]')?.getAttribute("aria-pressed") === "true"), "“marca como importante” não pôs a estrela no art. 121");
await falar("tira a estrela");
checar(await p.evaluate(() => document.querySelector('button[data-estrela="art121"]')?.getAttribute("aria-pressed") === "false"), "“tira a estrela” não tirou a estrela do art. 121");

// 5. vários artigos de uma vez: do 121, três artigos adiante (a ordem é a dos artigos à mostra: o 121-A, o 121-B…)
await falar("continua");
const ordem = await p.evaluate(() =>
  [...document.querySelectorAll("[data-i][data-disp]")].map((e) => e.getAttribute("data-disp").split(".")[0]).filter((d, k, l) => /^art/.test(d) && l.indexOf(d) === k),
);
const deOnde = (await lendoDisp())?.split(".")[0];
lido = await irPorVoz("pula três artigos", { outro: true });
const esperado = ordem[ordem.indexOf(deOnde) + 3];
checar(lido?.split(".")[0] === esperado, `“pula três artigos” não foi do ${deOnde} ao ${esperado}: ${lido}`);

// 6. o prazo, o fim do artigo e o que ler
await falar("parar daqui a 15 minutos");
checar((await prefsPrazo()) === 15, "“parar daqui a 15 minutos” não pôs o prazo de 15 minutos");
checar(/para em \d+ min/.test((await p.locator("[data-barra-ouvir]").textContent()) ?? ""), "o prazo dito não aparece na barra");
await falar("cancela o timer");
await falar("repete este artigo sem parar");
checar((await prefsOuvir()).aoFimDoArtigo === "repetir", `“repete este artigo sem parar” não ligou o repetir: ${(await prefsOuvir()).aoFimDoArtigo}`);
await falar("leitura contínua");
checar((await prefsOuvir()).aoFimDoArtigo === "seguir", "“leitura contínua” não voltou a seguir");
await falar("pular os títulos");
checar((await prefsOuvir()).titulos === false, "“pular os títulos” não desligou os títulos");
await falar("ler os títulos");

// 7. os comandos do leitor
await falar("fundo escuro");
checar((await prefsLeitor()).fundo === "escuro", `“fundo escuro” não trocou o fundo: ${(await prefsLeitor()).fundo}`);
await falar("fundo claro");
const antesRevogados = !!(await prefsLeitor()).revogados;
await falar(antesRevogados ? "esconder os revogados" : "mostrar o texto revogado");
checar(!!(await prefsLeitor()).revogados === !antesRevogados, "mostrar/esconder o texto revogado pela voz não mudou a opção");
await falar(antesRevogados ? "esconder os revogados" : "mostrar o texto revogado");
checar(!!(await prefsLeitor()).revogados === !antesRevogados, "pedir de novo o mesmo estado do texto revogado o trocou de volta");
await falar(antesRevogados ? "mostrar o texto revogado" : "esconder os revogados");

// 8. as perguntas
const k = await p.evaluate(() => window.__fala.ditos.length);
await falar("qual é a velocidade");
await p.waitForFunction((k) => window.__fala.ditos.slice(k).some((d) => /Velocidade/.test(d)), k, { timeout: 5000 }).catch(() => checar(false, "“qual é a velocidade” não disse a velocidade"));

await b.close();
checar(!erros.length, `erros na página: ${erros.join(" | ")}`);
if (falhas.length) {
  console.error(`ouvir-comandos: ${falhas.length} falha(s)\n- ${falhas.join("\n- ")}`);
  process.exit(1);
}
console.log("ouvir-comandos: ok (velocidade e volume ditos, parágrafo e inciso, grifar e ir aos grifos, estrela, vários artigos, prazo, fim do artigo, títulos, fundo, revogados, perguntas)");
