// Confere a leitura em voz alta do leitor ("Ouvir") num site já servido: node tests/e2e/ouvir.mjs [BASE] [PASTA_CAPTURAS]
// A voz e o microfone do navegador são trocados por falsos (o Chromium sem tela não tem voz): a voz falsa "fala" cada
// pedaço em alguns milissegundos e guarda o texto; o microfone falso entrega a frase que o teste mandar.
import { chromium, devices } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const PASTA = process.argv[3] ?? null;
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

// os botões do fone (a Media Session guarda as ações para o teste chamar) e os microfones: o padrão é o do fone Bluetooth
const MIDIA = () => {
  const m = { acoes: {}, metadata: null, estado: "none" };
  window.__midia = m;
  Object.defineProperty(navigator, "mediaSession", {
    configurable: true,
    value: {
      setActionHandler(a, f) {
        if (f) m.acoes[a] = f;
        else delete m.acoes[a];
      },
      get metadata() {
        return m.metadata;
      },
      set metadata(v) {
        m.metadata = v;
      },
      get playbackState() {
        return m.estado;
      },
      set playbackState(v) {
        m.estado = v;
      },
    },
  });
  // o Chrome do computador em https (no http do servidor de desenvolvimento, o navegador esconde os dois)
  Object.defineProperty(navigator, "userAgentData", { configurable: true, value: { brands: [{ brand: "Chromium", version: "153" }], mobile: false } });
  window.__gum = [];
  const lista = [
    { kind: "audioinput", deviceId: "default", label: "Padrão - Headset (WH-1000XM4 Hands-Free AG Audio)", groupId: "bt" },
    { kind: "audioinput", deviceId: "fone", label: "Headset (WH-1000XM4 Hands-Free AG Audio)", groupId: "bt" },
    { kind: "audioinput", deviceId: "notebook", label: "Matriz de microfones (Intel® Smart Sound)", groupId: "nb" },
    { kind: "audiooutput", deviceId: "default", label: "Padrão - Fones de ouvido (WH-1000XM4)", groupId: "bt" },
  ];
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
};

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const ditos = (p) => p.evaluate(() => window.__fala.ditos.slice());
const esperarDito = async (p, re, msg, ms = 8000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const d = await ditos(p);
    if (d.some((x) => re.test(x))) return true;
    await esperar(60);
  }
  falhas.push(`${msg} (ditos: ${(await ditos(p)).slice(-4).join(" | ")})`);
  return false;
};
// os controles do leitor somem ao rolar para baixo (e o texto ainda se ajusta depois do salto): o botão é tocado direto
const clicarNoDock = (p, rotulo) =>
  p.evaluate((r) => {
    const b = [...document.querySelectorAll('nav[aria-label="Controles de leitura"] button')].find((x) => x.textContent.trim().endsWith(r));
    b.click();
  }, rotulo);
// leva o bloco à altura pedida da tela; os blocos fora da tela têm altura estimada, então o salto é corrigido algumas vezes
const levar = async (p, id, altura) => {
  for (let k = 0; k < 4; k++) {
    await p.evaluate(
      ([id, y]) => window.scrollTo({ top: document.getElementById(id).getBoundingClientRect().top + scrollY - y, behavior: "instant" }),
      [id, altura(await p.evaluate(() => innerHeight))],
    );
    await esperar(250);
  }
};
const limparDitos = (p) => p.evaluate(() => (window.__fala.ditos.length = 0));
const capturar = async (p, nome) => {
  if (PASTA) await p.screenshot({ path: `${PASTA}/${nome}.png` });
};

async function rodar(nome, opcoes) {
  const b = await chromium.launch();
  const ctx = await b.newContext(opcoes);
  await ctx.addInitScript(FALSOS);
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", (e) => erros.push(e.message));
  await p.goto(`${BASE}/leis/cp/`, { waitUntil: "networkidle" });
  await p.evaluate(() => localStorage.clear());
  await p.goto(`${BASE}/leis/cp/#art121`, { waitUntil: "networkidle" });
  // só o # mudou: sem recarregar, o leitor não salta
  await p.reload({ waitUntil: "networkidle" });
  await p.waitForSelector("#art121");
  await p.waitForFunction(() => !document.body.textContent.includes("Carregando o restante da lei"), null, { timeout: 30000 }).catch(() => {});
  await esperar(1200);

  // 1. "Ouvir" no dock lê do ponto da tela (o art. 121 está no alto)
  await clicarNoDock(p, "Ouvir");
  const barra = p.locator("[data-barra-ouvir]");
  checar(await barra.isVisible(), `${nome}: a barra do Ouvir não apareceu`);
  await esperarDito(p, /cento e vinte e um|Homicídio simples/, `${nome}: não começou pelo art. 121`);
  await esperar(300);
  // o dispositivo destacado (a rubrica não tem dispositivo: vale o do bloco seguinte)
  const falando = await p.evaluate(() => {
    const el = document.querySelector("[data-falando]");
    return el?.dataset.disp ?? el?.nextElementSibling?.dataset.disp ?? null;
  });
  checar(!!falando && falando.startsWith("art121"), `${nome}: o trecho lido não está destacado no art. 121 (${falando}; barra: ${await barra.textContent()}; ditos: ${(await ditos(p)).slice(0, 4).join(" | ")})`);
  checar(/Art\. 121/.test(await barra.textContent()), `${nome}: a barra não diz o artigo lido`);
  await capturar(p, `${nome}-barra`);

  // 2. pausar e continuar
  await barra.getByRole("button", { name: "Pausar" }).click();
  await esperar(250);
  const parado = (await ditos(p)).length;
  await esperar(500);
  checar((await ditos(p)).length === parado, `${nome}: a voz continuou depois de pausar`);
  checar(/Pausado/i.test(await barra.textContent()), `${nome}: a barra não mostra "Pausado"`);
  await barra.getByRole("button", { name: "Continuar a leitura" }).click();
  await esperar(600);
  checar((await ditos(p)).length > parado, `${nome}: a voz não continuou`);

  // 3. próximo artigo (pausado, para o artigo de partida não mudar antes do toque): o seguinte começa pela rubrica ou pelo "Artigo"
  await barra.getByRole("button", { name: "Pausar" }).click();
  const artAntes = (await barra.textContent()).match(/Art\. [\dA-Z-]+/)?.[0];
  await limparDitos(p);
  await barra.getByRole("button", { name: "Próximo artigo" }).click();
  await esperar(500);
  const artDepois = (await barra.textContent()).match(/Art\. [\dA-Z-]+/)?.[0];
  checar(!!artAntes && !!artDepois && artAntes !== artDepois, `${nome}: "Próximo artigo" não mudou de artigo (${artAntes} → ${artDepois})`);
  checar(/^Artigo |^[A-ZÀ-Ú][a-zà-ú]+( [a-zà-ú]+)*$/.test((await ditos(p))[0] ?? ""), `${nome}: o próximo artigo não começou pelo começo (${(await ditos(p))[0]})`);

  // 4. velocidade: o botão troca, e a fala seguinte usa a nova
  const jaDitos = await p.evaluate(() => window.__fala.taxas.length);
  await barra.getByRole("button", { name: /^Velocidade/ }).click();
  await esperar(1500);
  const taxas = await p.evaluate((k) => window.__fala.taxas.slice(k), jaDitos);
  checar(taxas.length > 0 && taxas.every((t) => Math.abs(t - 1.2) < 0.01), `${nome}: a velocidade não mudou para 1,2 (${taxas})`);

  // 5. tocar num parágrafo: "Ler daqui"
  await barra.getByRole("button", { name: "Pausar" }).click();
  await levar(p, "art129", (h) => h / 3);
  // no texto, longe do rótulo "Art. 129" (que abre o "citado por")
  const caixa129 = await p.evaluate(() => {
    const r = document.getElementById("art129").getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  await p.mouse.click(caixa129.x + caixa129.width * 0.6, caixa129.y + 10);
  const bolha = p.getByRole("dialog", { name: "Ler a partir daqui" });
  checar(await bolha.isVisible().catch(() => false), `${nome}: o "Ler daqui" não apareceu ao tocar no parágrafo`);
  await capturar(p, `${nome}-ler-daqui`);
  await limparDitos(p);
  await bolha.getByRole("button", { name: /Ler daqui/ }).click();
  await esperarDito(p, /cento e vinte e nove/, `${nome}: "Ler daqui" não leu o art. 129`);

  // 6. rolar para longe: "Voltar ao trecho lido"
  await p.mouse.move(200, 300);
  await p.mouse.wheel(0, 6000);
  await esperar(900);
  checar(await barra.getByRole("button", { name: /Voltar ao trecho lido/ }).isVisible().catch(() => false), `${nome}: rolando para longe, não apareceu "Voltar ao trecho lido"`);
  await capturar(p, `${nome}-longe`);
  await barra.getByRole("button", { name: /Voltar ao trecho lido/ }).click();
  await esperar(900);
  const vis = await p.evaluate(() => {
    const r = document.querySelector("[data-falando]")?.getBoundingClientRect();
    return !!r && r.bottom > 0 && r.top < innerHeight;
  });
  checar(vis, `${nome}: "Voltar ao trecho lido" não mostrou o trecho`);

  // 7. ajustes: começar de outro artigo
  await barra.getByRole("button", { name: "Ajustes da leitura em voz alta" }).click();
  const painel = p.getByRole("dialog", { name: "Ouvir em voz alta" });
  checar(await painel.isVisible(), `${nome}: o painel de ajustes não abriu`);
  await capturar(p, `${nome}-ajustes`);
  await limparDitos(p);
  await painel.getByLabel("Ler a partir do artigo").fill("155 § 4º");
  await painel.getByRole("button", { name: "Ler", exact: true }).click();
  await esperarDito(p, /^Parágrafo quarto/, `${nome}: "Começar de 155 § 4º" não leu o parágrafo`);
  checar(/Art\. 155, § 4º/.test(await barra.textContent()), `${nome}: a barra não mostra o art. 155, § 4º`);

  // 8. comandos de voz
  await barra.getByRole("button", { name: "Ligar os comandos de voz" }).click();
  await esperar(300);
  checar((await p.evaluate(() => window.__falar("pausa"))) > 0, `${nome}: o microfone não ligou`);
  await esperar(300);
  checar(/Pausado/i.test(await barra.textContent()), `${nome}: "pausa" não pausou`);
  await limparDitos(p);
  await p.evaluate(() => window.__falar("ir para o artigo cento e cinquenta e sete"));
  await esperarDito(p, /^Artigo cento e cinquenta e sete/, `${nome}: "ir para o artigo cento e cinquenta e sete" não foi`);
  await limparDitos(p);
  await p.evaluate(() => window.__falar("próximo artigo"));
  await esperarDito(p, /cento e cinquenta e oito/, `${nome}: "próximo artigo" não pulou`);
  // o eco: o microfone ouvindo a própria leitura não dispara comando
  const eco = await p.evaluate(() => window.__fala.ditos.at(-1));
  const antesDoEco = await barra.textContent();
  await p.evaluate((t) => window.__falar(t), eco);
  await esperar(300);
  checar(/Lendo/i.test(await barra.textContent()) && /Lendo/i.test(antesDoEco), `${nome}: o eco da leitura mudou o estado`);
  await p.evaluate(() => window.__falar("encerrar"));
  await esperar(300);
  checar(!(await barra.isVisible().catch(() => false)), `${nome}: "encerrar" não fechou a barra`);

  // 9. o filtro do texto vale: com "somente grifos automáticos", só o que está à mostra é lido
  await clicarNoDock(p, "Leitura");
  await p.getByLabel("Mostrar somente grifos automáticos").check();
  await p.keyboard.press("Escape");
  await p.evaluate(() => {
    window.__escondidos = 0;
    new MutationObserver((ms) => {
      for (const m of ms) if (m.target.dataset?.falando && !m.target.getClientRects().length) window.__escondidos++;
    }).observe(document.body, { attributes: true, subtree: true, attributeFilter: ["data-falando"] });
  });
  await levar(p, "art121", () => 120);
  await clicarNoDock(p, "Ouvir");
  await esperar(2500);
  checar((await p.evaluate(() => window.__escondidos)) === 0, `${nome}: leu um trecho escondido pelo filtro`);
  checar((await ditos(p)).length > 3, `${nome}: com o filtro, não leu nada`);
  await barra.getByRole("button", { name: "Fechar a leitura em voz alta" }).click();

  checar(!erros.length, `${nome}: erros na página: ${erros.join(" | ")}`);
  await b.close();
}

await rodar("celular", { ...devices["Pixel 7"] });
await rodar("computador", { viewport: { width: 1280, height: 860 } });

// os botões do fone, o microfone escolhido, os comandos de navegação e a troca de lei pela voz
{
  const nome = "navegação";
  const b = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } });
  await ctx.addInitScript(FALSOS);
  await ctx.addInitScript(MIDIA);
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", (e) => erros.push(e.message));
  await p.goto(`${BASE}/leis/cp/`, { waitUntil: "networkidle" });
  await p.evaluate(() => localStorage.clear());
  await p.goto(`${BASE}/leis/cp/#art121`, { waitUntil: "networkidle" });
  await p.reload({ waitUntil: "networkidle" });
  await p.waitForSelector("#art121");
  await p.waitForFunction(() => !document.body.textContent.includes("Carregando o restante da lei"), null, { timeout: 30000 }).catch(() => {});
  await esperar(1200);
  await clicarNoDock(p, "Ouvir");
  const barra = p.locator("[data-barra-ouvir]");
  await esperarDito(p, /cento e vinte e um|Homicídio simples/, `${nome}: não começou pelo art. 121`);
  const midia = () => p.evaluate(() => ({ acoes: Object.keys(window.__midia.acoes), estado: window.__midia.estado, titulo: window.__midia.metadata?.title ?? "" }));
  const tocar = (acao) => p.evaluate((a) => window.__midia.acoes[a]?.(), acao);

  // 1. os botões do fone: um toque pausa e continua; o controle de mídia mostra o artigo
  const m0 = await midia();
  checar(["play", "pause", "nexttrack", "previoustrack"].every((a) => m0.acoes.includes(a)), `${nome}: os botões do fone não foram ligados (${m0.acoes})`);
  checar(/Art\. 121/.test(m0.titulo) && m0.estado === "playing", `${nome}: o controle de mídia não mostra o artigo lido (${m0.titulo}, ${m0.estado})`);
  await tocar("pause");
  await esperar(300);
  checar(/Pausado/.test(await barra.textContent()) && (await midia()).estado === "paused", `${nome}: o toque no fone não pausou`);
  await tocar("play");
  await esperar(300);
  checar(/Lendo/.test(await barra.textContent()), `${nome}: o toque no fone não continuou`);
  // três toques (padrão): repete o artigo
  await esperar(600);
  await limparDitos(p);
  await tocar("previoustrack");
  await esperarDito(p, /^(Artigo cento e vinte e um\.|Homicídio simples)/, `${nome}: os três toques não repetiram o artigo`);
  // dois toques (padrão): pausa e ouve um comando, com os comandos de voz desligados
  await tocar("nexttrack");
  await esperar(500);
  checar(/Fale o comando/.test(await barra.textContent()), `${nome}: os dois toques não abriram o microfone para um comando`);
  checar(await p.evaluate(() => window.__fala.atual === null), `${nome}: a voz continuou falando à espera do comando`);
  await limparDitos(p);
  await p.evaluate(() => window.__falar("artigo 129"));
  await esperarDito(p, /^Artigo cento e vinte e nove/, `${nome}: “artigo 129” depois dos dois toques não foi`);
  await esperar(500);
  checar((await p.evaluate(() => window.__falar("pausa"))) === 0, `${nome}: o microfone aberto só para um comando continuou ouvindo`);

  // 2. o microfone: no automático, o padrão (o do fone Bluetooth) fica de lado e o do notebook é aberto
  await barra.getByRole("button", { name: "Ligar os comandos de voz" }).click();
  await esperar(800);
  const gum = await p.evaluate(() => window.__gum);
  checar(gum.some((c) => c.audio?.deviceId?.exact === "notebook"), `${nome}: o automático não abriu o microfone do notebook (${JSON.stringify(gum)})`);
  checar((await p.evaluate(() => window.__trilhas ?? [])).includes("live"), `${nome}: o reconhecimento não recebeu o microfone escolhido`);
  await barra.getByRole("button", { name: "Ajustes da leitura em voz alta" }).click();
  const painel = p.getByRole("dialog", { name: "Ouvir em voz alta" });
  await esperar(400);
  checar(/Ouvindo pelo: Matriz de microfones/.test(await painel.textContent()), `${nome}: os ajustes não dizem qual microfone está ouvindo`);
  checar(await painel.getByRole("img", { name: "Nível do som do microfone" }).isVisible().catch(() => false), `${nome}: o nível do microfone não aparece`);
  await painel.getByRole("button", { name: "Máxima", exact: true }).click();
  await esperar(800);
  checar((await p.evaluate(() => window.__gum.length)) > gum.length, `${nome}: mudar a sensibilidade não reabriu o microfone`);
  await capturar(p, `${nome}-microfone`);
  await p.keyboard.press("Escape");
  await esperar(300);

  // 3. os comandos novos
  await limparDitos(p);
  await p.evaluate(() => window.__falar("último artigo do título primeiro"));
  await esperarDito(p, /^Último artigo do título primeiro\./, `${nome}: “último artigo do título primeiro” não foi`);
  checar(/Art\. 154/.test(await barra.textContent()), `${nome}: o último artigo do título I da parte especial não é o 154-B (${await barra.textContent()})`);
  await limparDitos(p);
  await p.evaluate(() => window.__falar("próximo capítulo"));
  await esperarDito(p, /^Capítulo primeiro/, `${nome}: “próximo capítulo” não foi ao capítulo do furto`);
  await limparDitos(p);
  await p.evaluate(() => window.__falar("procura motivo torpe"));
  await esperarDito(p, /^Encontrado no artigo cento e vinte e um, parágrafo segundo\./, `${nome}: “procura motivo torpe” não achou o art. 121, § 2º, I`);
  checar(/Art\. 121, § 2º, I(?![VXL])/.test(await barra.textContent()), `${nome}: a barra não mostra o achado (${await barra.textContent()})`);
  await limparDitos(p);
  await p.evaluate(() => window.__falar("mais baixo"));
  await esperar(1500);
  checar((await p.evaluate(() => window.__fala.volumes.slice(-2))).every((v) => Math.abs(v - 0.8) < 0.01), `${nome}: “mais baixo” não baixou a voz`);

  // a pessoa começa a falar um comando: a leitura pausa já na frase parcial; sem comando no fim, ela volta
  await esperar(800);
  checar(/Lendo/.test(await barra.textContent()), `${nome}: a leitura não estava em andamento antes do comando`);
  await p.evaluate(() => window.__falar("ir para", false));
  await esperar(250);
  checar(/Fale o comando/.test(await barra.textContent()) && (await p.evaluate(() => window.__fala.atual === null)), `${nome}: começar a falar um comando não pausou a leitura`);
  await limparDitos(p);
  await p.evaluate(() => window.__falar("ir para o artigo 129"));
  await esperarDito(p, /^Artigo cento e vinte e nove/, `${nome}: o comando falado depois da pausa automática não foi`);
  await p.evaluate(() => window.__falar("vai", false));
  await esperar(250);
  checar(/Fale o comando/.test(await barra.textContent()), `${nome}: “vai” no começo da frase não pausou a leitura`);
  await p.evaluate(() => window.__falar("vai chover hoje"));
  await esperar(400);
  checar(/Lendo/.test(await barra.textContent()), `${nome}: sem comando no fim da frase, a leitura não voltou`);

  // 4. outra lei pelo nome: “ir para o RESE” abre o CPP no recurso em sentido estrito, com os comandos ainda ligados
  await limparDitos(p);
  await p.evaluate(() => window.__falar("ir para o RESE"));
  await p.waitForURL(/\/leis\/cpp\/?/, { timeout: 30000 }).catch(() => {});
  await esperarDito(p, /^Código de Processo Penal\. Livro terceiro, título segundo\.$/, `${nome}: o RESE não começou pelo nome da lei e o caminho`, 40000);
  await esperarDito(p, /^Do recurso em sentido estrito/, `${nome}: o RESE não leu o nome do capítulo`);
  await esperar(300);
  checar((await p.evaluate(() => window.__falar("pausa"))) > 0, `${nome}: depois de trocar de lei, os comandos de voz pararam`);
  // lendo no livro III, “capítulo II do título II” é o RESE (o CPP tem três)
  await p.evaluate(() => window.__falar("ir para o artigo 593"));
  await esperar(600);
  await limparDitos(p);
  await p.evaluate(() => window.__falar("vai para o capítulo dois do título dois"));
  await esperarDito(p, /^Livro terceiro, título segundo\.$/, `${nome}: “capítulo dois do título dois” lendo no livro III não foi ao RESE`);
  // de outra lei, pelo número: “artigo 33 da lei de drogas”
  await limparDitos(p);
  await p.evaluate(() => window.__falar("artigo 33 da lei de drogas"));
  await p.waitForURL(/\/leis\/lei-11343\/?/, { timeout: 30000 }).catch(() => {});
  await esperarDito(p, /^Artigo trinta e três/, `${nome}: “artigo 33 da lei de drogas” não leu o art. 33`, 40000);
  checar((await ditos(p)).some((d) => /^Lei de Drogas\.$/.test(d)), `${nome}: ao abrir a outra lei, a voz não disse o nome dela`);

  checar(!erros.length, `${nome}: erros na página: ${erros.join(" | ")}`);
  await b.close();
}

// as súmulas usam o mesmo leitor: "Ouvir" lê os enunciados, com o número por extenso
{
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } });
  await ctx.addInitScript(FALSOS);
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", (e) => erros.push(e.message));
  await p.goto(`${BASE}/leis/sumulas/stf/#s-711`, { waitUntil: "networkidle" });
  await p.waitForSelector("#s-711");
  await esperar(1200);
  await clicarNoDock(p, "Ouvir");
  await esperarDito(p, /^Súmula setecentos e (onze|doze|treze)/, "súmulas: não leu a Súmula 711 por extenso");
  checar(/Súmula 7\d\d/.test(await p.locator("[data-barra-ouvir]").textContent()), "súmulas: a barra não diz a súmula lida");
  checar(!erros.length, `súmulas: erros na página: ${erros.join(" | ")}`);
  await b.close();
}

if (falhas.length) {
  console.error(`✗ ${falhas.length} falha(s):\n- ${falhas.join("\n- ")}`);
  process.exit(1);
}
console.log("✓ Ouvir: leitura, pausa, artigos, velocidade, Ler daqui, rolagem, ajustes, comandos de voz, filtro, botões do fone, microfone, navegação pela voz, outra lei e súmulas");
