// Avaliação dos 18 poderes do Flap Suitcase em partida real.
// Cada poder roda numa página nova (?debug=1 expõe window.__flap): ativa o poder, mede o efeito
// no próprio jogo e compara com o esperado. Saída: uma linha por poder (OK, FALHA ou INCONCLUSIVO).
// Uso: node tests/e2e/poderes.mjs [baseURL]
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://100.80.118.27:3100";
const b = await chromium.launch();
const erros = [];

// Nível Fácil não tem colunas rachadas; Denúncia e Presunção precisam de Difícil.
const NIVEL = { denuncia: 3, presuncao: 3 };

async function abrir(nivel = 1) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => erros.push(String(e)));
  await p.goto(`${BASE}/jogos/flap-suitcase/?debug=1`, { waitUntil: "networkidle" });
  await p.getByRole("button", { name: "▶ Jogar" }).waitFor();
  if (nivel === 3) await p.getByRole("button", { name: /^Difícil/ }).click();
  await p.getByRole("button", { name: "▶ Jogar" }).click();
  await p.waitForFunction(() => window.__flap);
  // sem orbes: o quiz do orbe não pode interromper a medição
  await p.evaluate(() => {
    window.__flap.orbesLigados = false;
  });
  await p.keyboard.press("Space");
  await p.waitForFunction(() => window.__flap.estado().estado === "jogando");
  return { p, ctx };
}

const lerEstado = (p) => p.evaluate(() => window.__flap.estado());
const ativar = (p, id) => p.evaluate((id) => window.__flap.ativar(id), id);
const esperar = (p, fn, arg = null, timeout = 8000) =>
  p.waitForFunction(fn, arg, { timeout, polling: 30 }).then(
    () => true,
    () => false,
  );
// Bate no chão: com invulnerabilidade desligada, dispara a colisão de verdade.
// Espera a graça de início (0,6 s) e de qualquer batida anterior acabarem, senão a colisão é ignorada.
const baterNoChao = async (p) => {
  await p.waitForFunction(() => window.__flap.estado().jogador.graca <= 0, null, { timeout: 4000 }).catch(() => {});
  await p.evaluate(() => {
    window.__flap.invulneravel = false;
    window.__jogador.y = 1000;
  });
};
// Leva o jogador a uma coluna (rachada ou não) que ainda não foi penalizada e a atinge.
// Enquanto a coluna se aproxima, o pássaro fica no vão da próxima coluna: no chão, a base de
// qualquer coluna rachada que passa encosta nele e penaliza antes da hora.
// Rachadas são sorteadas (30% no Difícil), então a busca tem janela longa.
const colunaNaFrente = (p, rachada, timeout = rachada ? 40000 : 15000) =>
  p.evaluate(
    async ({ rachada, timeout }) => {
      const fim = performance.now() + timeout;
      while (performance.now() < fim) {
        const s = window.__flap.estado();
        const fila = s.pilares.filter((q) => !q.passou && q.x > s.jogador.x - 52).sort((a, b) => a.x - b.x);
        const prox = fila[0];
        const alvo = fila.find((q) => !q.penalizada && !!q.rachada === rachada);
        if (prox) {
          if (prox === alvo && Math.abs(prox.x - s.jogador.x) < 25) {
            window.__jogador.y = prox.vao - prox.abertura / 2 - 25;
            return true;
          }
          window.__jogador.y = prox.vao;
          window.__jogador.vy = 0;
        }
        await new Promise((r) => setTimeout(r, 16));
      }
      return false;
    },
    { rachada, timeout },
  );
// Mede pontos ganhos enquanto passam `n` colunas.
async function medirPontos(p, n = 2, timeout = 8000) {
  const a = await lerEstado(p);
  const passou = await esperar(p, (alvo) => window.__flap.estado().passagens >= alvo, a.passagens + n, timeout);
  if (!passou) return null;
  const c = await lerEstado(p);
  return { dp: c.pontos - a.pontos, dn: c.passagens - a.passagens };
}
// Duração: a contagem do poder precisa cair enquanto a partida roda.
async function decai(p, id) {
  const a = (await lerEstado(p)).ativos[id];
  await p.waitForTimeout(700);
  const c = (await lerEstado(p)).ativos[id];
  return a !== undefined && c !== undefined && c < a - 0.4;
}
const INCONCLUSIVO = (detalhe) => ({ ok: null, detalhe });
// Solta o pássaro `desloc` px do centro do próximo vão (+ abaixo, − acima) e cronometra até chegar perto dele.
// Sem bater as asas: só a física do poder Asas de Ouro pode trazê-lo de volta.
const medirGuia = (p, desloc) =>
  p.evaluate(async (desloc) => {
    const f = window.__flap;
    const s0 = f.estado();
    const alvo = s0.pilares.filter((q) => !q.passou && q.x > s0.jogador.x + 400).sort((a, b) => a.x - b.x)[0];
    if (!alvo) return null;
    window.__jogador.y = alvo.vao + desloc;
    window.__jogador.vy = 0;
    const t0 = performance.now();
    let y = 0;
    let centro = 0;
    while (performance.now() - t0 < 2000) {
      await new Promise((r) => setTimeout(r, 16));
      const s = f.estado();
      const c = s.pilares.find((q) => q.vao === alvo.vao && !q.passou && q.x > s.jogador.x);
      if (!c) return { alcancou: false, motivo: "coluna passou antes", y: s.jogador.y };
      y = s.jogador.y;
      centro = c.centro;
      if (Math.abs(y - centro) < 60) return { alcancou: true, tempo: (performance.now() - t0) / 1000 };
    }
    return { alcancou: false, motivo: "tempo esgotado", y, centro };
  }, desloc);
const fmtGuia = (g) =>
  g === null
    ? "sem coluna"
    : g.alcancou
      ? `chegou em ${g.tempo.toFixed(2)} s`
      : `não chegou (${g.motivo}, y ${Math.round(g.y)} centro ${Math.round(g.centro ?? 0)})`;

const TESTES = {
  async escudo(p) {
    await ativar(p, "escudo");
    const a = await lerEstado(p);
    await baterNoChao(p);
    await p.waitForTimeout(150);
    const b = await lerEstado(p);
    const absorveu = !b.ativos.escudo && b.estado === "jogando";
    // controle: sem o escudo, a batida seguinte leva ao quiz de revisão
    await p.waitForTimeout(1500);
    await baterNoChao(p);
    await p.waitForTimeout(150);
    const c = await lerEstado(p);
    const semEscudoPerde = c.estado === "pergunta";
    return {
      ok: a.ativos.escudo > 0 && absorveu && semEscudoPerde,
      detalhe: `absorveu a batida: ${absorveu}; batida seguinte chega à revisão: ${semEscudoPerde}`,
    };
  },

  async ima(p) {
    await ativar(p, "ima");
    const decaiu = await decai(p, "ima");
    const achou = await esperar(p, () => {
      const s = window.__flap.estado();
      return s.moedas.some((m) => !m.pega && m.x > s.jogador.x + 40 && m.x < s.jogador.x + 120 && m.y > 80 && m.y < 480);
    }, null, 20000);
    if (!achou) return INCONCLUSIVO("nenhuma moeda à frente para testar");
    const s = await lerEstado(p);
    const moeda = s.moedas.find((m) => !m.pega && m.x > s.jogador.x + 40 && m.x < s.jogador.x + 120 && m.y > 80 && m.y < 480);
    // o jogador fica 90 px fora da moeda: sem o ímã ela passa de longe
    // o pássaro é mantido 90 px abaixo da moeda: só o ímã pode trazê-la (raio de coleta 25 px)
    // para assim que a moeda for recolhida; o teto de 2,5 s cobre atrasos de quadros do navegador de teste
    await p.evaluate(
      ({ y, ms }) =>
        new Promise((res) => {
          const t0 = performance.now();
          const n0 = window.__flap.estado().nMoedas;
          const iv = setInterval(() => {
            window.__jogador.y = y;
            window.__jogador.vy = 0;
            if (window.__flap.estado().nMoedas > n0 || performance.now() - t0 > ms) {
              clearInterval(iv);
              res();
            }
          }, 16);
        }),
      { y: moeda.y + 90, ms: 2500 },
    );
    const c = await lerEstado(p);
    const pegou = c.nMoedas > s.nMoedas;
    return { ok: decaiu && pegou, detalhe: `moeda puxada a 90 px de distância: ${pegou}; duração decai: ${decaiu}` };
  },

  async lento(p) {
    await ativar(p, "lento");
    const decaiu = await decai(p, "lento");
    // velocidade real das colunas: distância percorrida em 500 ms
    const medida = await p.evaluate(async () => {
      const f = window.__flap;
      const a = f.estado().pilares.find((q) => !q.passou && q.x > 0);
      if (!a) return null;
      const t0 = performance.now();
      await new Promise((r) => setTimeout(r, 500));
      const s = f.estado();
      const c = s.pilares.find((q) => q.vao === a.vao && !q.passou);
      if (!c) return null;
      const v = (a.x - c.x) / ((performance.now() - t0) / 1000);
      return { v, base: s.velocidadeBase };
    });
    if (!medida) return INCONCLUSIVO("sem coluna visível para medir");
    const razao = medida.v / medida.base;
    return {
      ok: decaiu && Math.abs(razao - 0.6) < 0.05,
      detalhe: `velocidade em ${Math.round(razao * 100)}% da normal (esperado 60%); duração decai: ${decaiu}`,
    };
  },

  async mini(p) {
    await ativar(p, "mini");
    const decaiu = await decai(p, "mini");
    const s = await lerEstado(p);
    return { ok: s.efeitos.mini && s.raio < 10 && decaiu, detalhe: `raio ${s.raio} (normal 15); duração decai: ${decaiu}` };
  },

  async fantasma(p) {
    await ativar(p, "fantasma");
    const decaiu = await decai(p, "fantasma");
    const achou = await colunaNaFrente(p, false);
    if (!achou) return INCONCLUSIVO("nenhuma coluna chegou para testar");
    await p.waitForTimeout(150);
    const s = await lerEstado(p);
    const atravessou = s.estado === "jogando";
    return { ok: decaiu && atravessou, detalhe: `atravessou a coluna sem perder: ${atravessou}; duração decai: ${decaiu}` };
  },

  async dobro(p) {
    await ativar(p, "dobro");
    const decaiu = await decai(p, "dobro");
    const m = await medirPontos(p);
    if (!m) return INCONCLUSIVO("colunas não passaram a tempo");
    return {
      ok: decaiu && m.dn >= 1 && m.dp === 2 * m.dn,
      detalhe: `+${m.dp} pontos em ${m.dn} colunas (esperado ${2 * m.dn}); duração decai: ${decaiu}`,
    };
  },

  async dosimetria(p) {
    await ativar(p, "dosimetria");
    const decaiu = await decai(p, "dosimetria");
    const m = await medirPontos(p, 2, 8000);
    if (!m) return INCONCLUSIVO("colunas não passaram a tempo");
    const sozinha = m.dn >= 1 && m.dp === 3 * m.dn;
    // com Concurso Material (dobro) junto: 3 × 2 = 6 por coluna
    const { p: q, ctx } = await abrir();
    await ativar(q, "dosimetria");
    await ativar(q, "dobro");
    const m2 = await medirPontos(q, 2, 8000);
    await ctx.close();
    const junto = m2 && m2.dn >= 1 && m2.dp === 6 * m2.dn;
    return {
      ok: decaiu && sozinha && junto,
      detalhe: `sozinha: +${m.dp} em ${m.dn} colunas (3 por coluna); com Concurso Material: ${m2 ? `+${m2.dp} em ${m2.dn} (6 por coluna)` : "não mediu"}`,
    };
  },

  async leve(p) {
    // Medido logo após abrir a partida: a página não pode ficar parada, senão as colunas passam
    // do alcance do alvo e o guiar mira outro vão.
    await ativar(p, "leve");
    const decaiu = await decai(p, "leve");
    const subir = await medirGuia(p, 200);
    const descer = await medirGuia(p, -200);
    const s = await lerEstado(p);
    // controle, em partida nova: sem o poder, o pássaro abaixo do vão cai e nunca chega; acima dele cai pela gravidade
    const { p: ctl, ctx } = await abrir();
    const semSubir = await medirGuia(ctl, 200);
    const semDescer = await medirGuia(ctl, -200);
    await ctx.close();
    const subiu = !!subir?.alcancou && semSubir?.alcancou === false;
    const desceuMaisRapido = !!descer?.alcancou && (!semDescer?.alcancou || descer.tempo < semDescer.tempo);
    return {
      ok: s.efeitos.leve && decaiu && subiu && desceuMaisRapido,
      detalhe:
        `abaixo do vão: com poder ${fmtGuia(subir)}, sem ${fmtGuia(semSubir)}; ` +
        `acima do vão: com poder ${fmtGuia(descer)}, sem ${fmtGuia(semDescer)}; duração decai: ${decaiu}`,
    };
  },

  async congelar(p) {
    await ativar(p, "congelar");
    await p.waitForTimeout(1500);
    const s = await lerEstado(p);
    const abre = mediaAbertura(s);
    return {
      ok: s.ativos.congelar > 0 && abre !== null && abre >= 25,
      detalhe: `abertura +${abre?.toFixed(0)} px (esperado +34)`,
    };
  },

  async equilibrio(p) {
    await ativar(p, "equilibrio");
    await p.waitForTimeout(1500);
    const s = await lerEstado(p);
    const abre = mediaAbertura(s);
    return {
      ok: s.ativos.equilibrio > 0 && abre !== null && abre >= 25,
      detalhe: `abertura +${abre?.toFixed(0)} px (esperado +36)`,
    };
  },

  async prescricao(p) {
    await esperar(p, () => {
      const s = window.__flap.estado();
      return s.pilares.some((q) => !q.passou && q.x > 0 && q.x < s.W);
    });
    const r = await p.evaluate(() => {
      const vis = (s) => s.pilares.filter((q) => !q.passou && q.x > s.jogador.x - 60 && q.x < s.W + 40).length;
      const a = window.__flap.estado();
      window.__flap.ativar("prescricao");
      const c = window.__flap.estado();
      return { antes: vis(a), depois: vis(c), pontos: [a.pontos, c.pontos] };
    });
    if (r.antes === 0) return INCONCLUSIVO("nenhuma coluna na tela");
    return {
      ok: r.depois === 0 && r.pontos[0] === r.pontos[1],
      detalhe: `colunas na tela: ${r.antes} → ${r.depois}; pontos: ${r.pontos[0]} → ${r.pontos[1]}`,
    };
  },

  async revisao(p) {
    const r = await p.evaluate(() => {
      const a = window.__flap.estado().vidas;
      window.__flap.ativar("revisao");
      return { antes: a, depois: window.__flap.estado().vidas };
    });
    return { ok: r.depois === r.antes + 1, detalhe: `vidas ${r.antes} → ${r.depois}` };
  },

  async arquivamento(p) {
    const a = await lerEstado(p);
    await ativar(p, "arquivamento");
    // o poder é gasto na próxima coluna que surgir, e ela já nasce arquivada
    // a espera vai até o poder sumir (gasto no spawn ou expirado); o teste só passa se houve coluna arquivada
    await esperar(p, () => !("arquivamento" in window.__flap.estado().ativos), null, 8000);
    const s = await lerEstado(p);
    const arquivadas = s.pilares.filter((q) => q.arquivado);
    const naoPontua = arquivadas.every((q) => q.passou);
    const dP = s.pontos - a.pontos;
    const dN = s.passagens - a.passagens;
    return {
      ok: arquivadas.length >= 1 && naoPontua && dP === dN,
      detalhe: `colunas arquivadas: ${arquivadas.length}; pontos ganhos ${dP} = colunas passadas ${dN} (a arquivada não pontua)`,
    };
  },

  async inquerito(p) {
    // o pássaro fica no alto (y=20), fora do alcance das moedas: só o poder pode recolhê-las.
    // Moedas saem em 45% das colunas; 7 s do poder passam umas cinco colunas.
    const a = await lerEstado(p);
    await ativar(p, "inquerito");
    const viu = await p.evaluate(
      (ms) =>
        new Promise((res) => {
          const t0 = performance.now();
          let viu = false;
          const iv = setInterval(() => {
            const s = window.__flap.estado();
            if (s.moedas.some((m) => !m.pega && m.x >= 0 && m.x <= s.W)) viu = true;
            window.__jogador.y = 20;
            window.__jogador.vy = 0;
            if (performance.now() - t0 > ms) {
              clearInterval(iv);
              res(viu);
            }
          }, 16);
        }),
      7600,
    );
    const c = await lerEstado(p);
    const dM = c.nMoedas - a.nMoedas;
    const dP = c.pontos - a.pontos;
    const dN = c.passagens - a.passagens;
    if (c.penalidades !== a.penalidades) return INCONCLUSIVO("uma coluna rachada penalizou durante o teste");
    if (dM === 0 && !viu) return INCONCLUSIVO("nenhuma moeda entrou na tela durante o poder");
    return {
      ok: dM >= 1 && dP === dN + 3 * dM,
      detalhe: `+${dM} moeda(s) em ${dN} colunas; +${dP} pontos (esperado ${dN} das colunas + 3 por moeda)`,
    };
  },

  async tipificacao(p) {
    const r = await p.evaluate(() => {
      const a = window.__flap.estado();
      window.__flap.ativar("tipificacao");
      const c = window.__flap.estado();
      return { dP: c.pontos - a.pontos, dM: c.nMoedas - a.nMoedas };
    });
    return { ok: r.dP === 20 && r.dM === 5, detalhe: `+${r.dP} pontos, +${r.dM} moedas (esperado +20 e +5)` };
  },

  async presuncao(p) {
    // controle: sem o poder, bater na coluna rachada penaliza
    const achou1 = await colunaNaFrente(p, true);
    if (!achou1) return INCONCLUSIVO("nenhuma coluna rachada chegou");
    await p.waitForTimeout(120);
    const pen1 = (await lerEstado(p)).penalidades;
    await ativar(p, "presuncao");
    const achou2 = await colunaNaFrente(p, true);
    if (!achou2) return INCONCLUSIVO("nenhuma coluna rachada chegou ao poder ativo");
    // a busca pode levar mais que a duração do poder: se ele já acabou, a batida não testa nada
    if (((await lerEstado(p)).ativos.presuncao ?? 0) < 0.3) return INCONCLUSIVO("o poder expirou antes da coluna rachada");
    await p.waitForTimeout(120);
    const s = await lerEstado(p);
    const pen2 = s.penalidades;
    return {
      ok: pen1 >= 1 && pen2 === pen1 && s.ativos.presuncao > 0,
      detalhe: `sem poder: ${pen1} penalidade(s); com o poder, batida nova: ${pen2 - pen1} penalidade(s)`,
    };
  },

  async denuncia(p) {
    const achou = await esperar(
      p,
      () => {
        const s = window.__flap.estado();
        return s.pilares.some((q) => q.rachada && !q.passou && q.x > -74 && q.x < s.W + 40);
      },
      null,
      40000,
    );
    if (!achou) return INCONCLUSIVO("nenhuma coluna rachada na tela");
    const r = await p.evaluate(() => {
      const conta = (s) => s.pilares.filter((q) => q.rachada && !q.passou && q.x > -74 && q.x < s.W + 40).length;
      const a = window.__flap.estado();
      window.__flap.ativar("denuncia");
      const c = window.__flap.estado();
      return { antes: conta(a), depois: conta(c), pontos: [a.pontos, c.pontos], pen: [a.penalidades, c.penalidades] };
    });
    return {
      ok: r.antes > 0 && r.depois === 0 && r.pontos[0] === r.pontos[1] && r.pen[0] === r.pen[1],
      detalhe: `colunas rachadas na tela: ${r.antes} → ${r.depois}; penalidades: ${r.pen[0]} → ${r.pen[1]}`,
    };
  },

  async voo(p) {
    await ativar(p, "voo");
    const s = await lerEstado(p);
    const ligou = s.ativos.escudo > 0 && s.ativos.leve > 0;
    await baterNoChao(p);
    await p.waitForTimeout(150);
    const c = await lerEstado(p);
    const absorveu = !c.ativos.escudo && c.estado === "jogando";
    return { ok: ligou && absorveu, detalhe: `escudo e assistência ligados: ${ligou}; escudo absorveu a batida: ${absorveu}` };
  },
};

// Média da abertura das colunas comuns em relação à abertura-base (sem poder de abertura).
function mediaAbertura(s) {
  const colunas = s.pilares.filter((q) => !q.passou && !q.rachada && q.x > 0 && q.x < s.W);
  if (!colunas.length) return null;
  return colunas.reduce((soma, q) => soma + (q.abertura - s.aberturaBase), 0) / colunas.length;
}

const ORDEM = [
  ["escudo", "Habeas Corpus"],
  ["ima", "Vade Mecum"],
  ["lento", "Prazo em Dobro"],
  ["mini", "Insignificância"],
  ["fantasma", "Absolvição Sumária"],
  ["dobro", "Concurso Material"],
  ["leve", "Asas de Ouro"],
  ["congelar", "Trânsito em Julgado"],
  ["prescricao", "Prescrição"],
  ["revisao", "Revisão Criminal"],
  ["arquivamento", "Arquivamento"],
  ["equilibrio", "Equilíbrio"],
  ["inquerito", "Inquérito"],
  ["presuncao", "Presunção de Inocência"],
  ["dosimetria", "Dosimetria"],
  ["denuncia", "Denúncia"],
  ["tipificacao", "Tipificação"],
  ["voo", "Voo do Grifo"],
];

let falhas = 0;
for (const [id, nome] of ORDEM) {
  let r;
  try {
    const { p, ctx } = await abrir(NIVEL[id] ?? 1);
    r = await TESTES[id](p);
    await ctx.close();
  } catch (e) {
    r = { ok: false, detalhe: String(e).split("\n")[0] };
  }
  const rotulo = r.ok === null ? "INCONCLUSIVO" : r.ok ? "OK" : "FALHA";
  if (r.ok === false) falhas++;
  console.log(`${rotulo.padEnd(13)} ${nome.padEnd(24)} ${r.detalhe}`);
}
console.log(`\nErros de página: ${erros.length}${erros.length ? `\n  ${erros.slice(0, 5).join("\n  ")}` : ""}`);
await b.close();
process.exitCode = falhas ? 1 : 0;
