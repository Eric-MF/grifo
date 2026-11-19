// Atualização automática das súmulas (do STF, vinculantes e do STJ) a partir dos sites do STF e do STJ, pelo proxy do projeto (PJE_PROXY, em ../.env).
//
//   node scripts/sumulas/atualizar.ts              confere as listas: baixa o que é novo ou mudou de situação
//   node scripts/sumulas/atualizar.ts --completo   também relê o texto de todas as súmulas do STF (demorado)
//   node scripts/sumulas/atualizar.ts --visivel    abre o navegador na tela
//   node scripts/sumulas/atualizar.ts --so=vinculantes   só uma lista (stf, vinculantes ou stj)
//
// O site é a fonte atual: o texto que ele dá substitui o do PDF. Um tribunal que não responde, ou que fica numa
// verificação do Cloudflare, mantém o conteúdo que já tem, e o relatório diz o motivo. Se algo mudou, regenera os dados
// do navegador (scripts/build-content.ts). Pensado para rodar sozinho (cron, ver scripts/sumulas/README.md).
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { alvoDoVide, ehDetalheSTF, ehDetalheSV, ehListaSTF, ehListaSTJ, type SumulaConteudo, URL_STF_LISTA, URL_STF_SUMULA, URL_STJ, URL_STJ_PAGINA_MAX, URL_SV_LISTA, URL_SV_SUMULA } from "./baixar.ts";
import { detalheSTF, listaSTF, listaSTJ, type SumulaSTJ } from "./parser.ts";
import { abrirSessao, type Sessao } from "./navegador.ts";

const ROOT = new URL("../..", import.meta.url).pathname;
const SAIDA = join(ROOT, "content", "sumulas");
const args = new Set(process.argv.slice(2));
const completo = args.has("--completo");
const visivel = args.has("--visivel");
const so = process.argv.find((a) => a.startsWith("--so="))?.slice("--so=".length);
const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));
const hoje = new Date().toISOString().slice(0, 10);

type Tribunal = "stf" | "stj" | "vinculantes";
interface Lista {
  tribunal: Tribunal;
  fonte: string;
  coletadoEm: string;
  total: number;
  baixadas: number;
  sumulas: SumulaConteudo[];
}
interface Relatorio {
  tribunal: Tribunal;
  linhas: string[];
  mudou: boolean;
  erro?: string;
}

/** As fontes de cada lista; uma lista que ainda não existe começa vazia (a primeira coleta baixa tudo). */
const FONTES: Record<Tribunal, string> = { stf: URL_STF_LISTA, vinculantes: URL_SV_LISTA, stj: URL_STJ(1) };
function lerLista(t: Tribunal): Lista {
  const arquivo = join(SAIDA, `${t}.json`);
  if (!existsSync(arquivo)) return { tribunal: t, fonte: FONTES[t], coletadoEm: hoje, total: 0, baixadas: 0, sumulas: [] };
  return JSON.parse(readFileSync(arquivo, "utf8"));
}

function gravarLista(lista: Lista, sumulas: SumulaConteudo[]) {
  const ordenadas = [...sumulas].sort((a, b) => a.numero - b.numero);
  const novo: Lista = {
    ...lista,
    coletadoEm: hoje,
    total: ordenadas.length,
    baixadas: ordenadas.filter((s) => s.baixada).length,
    sumulas: ordenadas,
  };
  writeFileSync(join(SAIDA, `${lista.tribunal}.json`), JSON.stringify(novo, null, 1));
}

/** As duas listas do portal do STF: as súmulas (base 30) e as vinculantes (base 26), com a mesma página. */
const PORTAL_STF = {
  stf: { nome: "STF", lista: URL_STF_LISTA, sumula: URL_STF_SUMULA, detalhe: ehDetalheSTF, qual: (n: number) => `a súmula ${n} do STF` },
  vinculantes: { nome: "Vinculantes", lista: URL_SV_LISTA, sumula: URL_SV_SUMULA, detalhe: ehDetalheSV, qual: (n: number) => `a súmula vinculante ${n}` },
} as const;

/** O STF: a lista traz o número e a situação de cada súmula; o texto vem da página de cada uma (só quando precisa). */
async function atualizarStf(sessao: Sessao, rel: Relatorio, t: "stf" | "vinculantes" = "stf"): Promise<boolean> {
  const portal = PORTAL_STF[t];
  const lista = lerLista(t);
  const html = await sessao.ler(portal.lista, ehListaSTF, `a lista de súmulas (${portal.nome})`);
  const itens = listaSTF(html);
  if (!itens.length) throw new Error(`a lista (${portal.nome}) veio sem súmulas`);
  const porNumero = new Map(lista.sumulas.map((s) => [s.numero, s]));
  let mudou = false;
  let textos = 0;
  let novas = 0;
  let situacoes = 0;
  for (const it of itens) {
    const atual = porNumero.get(it.numero);
    const situacaoMudou = !!atual && atual.status !== it.status;
    if (situacaoMudou) situacoes++;
    if (!atual) novas++;
    const precisaTexto = completo || !atual?.baixada || situacaoMudou;
    if (!precisaTexto) continue;
    const url = portal.sumula(it.id);
    const det = detalheSTF(await sessao.ler(url, portal.detalhe, portal.qual(it.numero)));
    const observacoes = det.observacoes.filter((o) => !o.vide);
    porNumero.set(it.numero, {
      tribunal: t,
      numero: it.numero,
      status: it.status,
      baixada: true,
      origem: "site",
      enunciado: det.enunciado,
      url,
      vide: det.observacoes.filter((o) => o.vide).map((o) => ({ texto: o.texto, ...(alvoDoVide(o.vide) ? { alvo: alvoDoVide(o.vide) } : {}) })),
      extras: {
        ...(det.dataAprovacao ? { dataAprovacao: det.dataAprovacao } : {}),
        ...(det.dataPublicacao ? { dataPublicacao: det.dataPublicacao } : {}),
        ...(det.teses.length ? { teses: det.teses } : {}),
        ...(det.precedentesRepresentativos.length ? { precedentesRepresentativos: det.precedentesRepresentativos } : {}),
        ...(det.jurisprudencia.length ? { jurisprudencia: det.jurisprudencia } : {}),
        ...(observacoes.length ? { observacoes: observacoes.map((o) => o.texto) } : {}),
      },
    });
    textos++;
    mudou = true;
    await pausa(2000);
  }
  for (const it of itens) {
    const s = porNumero.get(it.numero);
    if (s && s.status !== it.status) {
      s.status = it.status;
      mudou = true;
    }
  }
  rel.linhas.push(`${portal.nome}: ${itens.length} súmulas na lista; ${novas} novas; ${situacoes} com situação alterada; ${textos} textos relidos`);
  if (mudou) gravarLista(lista, [...porNumero.values()]);
  return mudou;
}

/** A conversão de uma súmula do STJ lida no site para o formato do Grifo (o site traz tudo da súmula). */
const conteudoStj = (s: SumulaSTJ, url: string): SumulaConteudo => ({
  tribunal: "stj",
  numero: s.numero,
  status: "vigente",
  baixada: true,
  origem: "site",
  enunciado: s.enunciado,
  url,
  vide: [],
  extras: {
    ...(s.ramo ? { ramo: s.ramo } : {}),
    ...(s.julgamento ? { julgamento: s.julgamento } : {}),
    ...(s.fonte ? { fonte: s.fonte } : {}),
    ...(s.referenciaLegislativa.length ? { referenciaLegislativa: s.referenciaLegislativa } : {}),
    ...(s.precedentes.length ? { precedentes: s.precedentes } : {}),
  },
});

/** O STJ: as páginas da lista trazem o texto e os dados de cada súmula. O site substitui o que estava. */
async function atualizarStj(sessao: Sessao, rel: Relatorio): Promise<boolean> {
  const lista = lerLista("stj");
  const doSite: SumulaSTJ[] = [];
  for (let p = 1; p <= URL_STJ_PAGINA_MAX; p++) {
    let html: string;
    try {
      html = await sessao.ler(URL_STJ(p), ehListaSTJ, `a página ${p} das súmulas do STJ`);
    } catch (erro) {
      // a primeira página é obrigatória; depois, a falha de uma página além do fim é o fim da lista
      if (p === 1) throw erro;
      break;
    }
    const itens = listaSTJ(html);
    if (!itens.length) break;
    doSite.push(...itens);
    await pausa(1500);
  }
  if (!doSite.length) throw new Error("as páginas do STJ vieram sem súmulas");
  const porNumero = new Map(lista.sumulas.map((s) => [s.numero, s]));
  let mudou = false;
  let alteradas = 0;
  for (const s of doSite) {
    const novo = conteudoStj(s, lista.fonte);
    const antigo = porNumero.get(s.numero);
    if (!antigo || JSON.stringify([antigo.enunciado, antigo.extras]) !== JSON.stringify([novo.enunciado, novo.extras])) {
      alteradas++;
      mudou = true;
      porNumero.set(s.numero, { ...novo, vide: antigo?.vide ?? [] });
    }
  }
  rel.linhas.push(`STJ: ${doSite.length} súmulas no site; ${alteradas} novas ou alteradas; ${porNumero.size - doSite.length} só do PDF mantidas`);
  if (mudou) gravarLista(lista, [...porNumero.values()]);
  return mudou;
}

async function main() {
  const relatorios: Relatorio[] = [];
  let algumOk = false;
  let mudouAlgo = false;
  let sessao: Sessao;
  try {
    sessao = await abrirSessao({ visivel });
  } catch (erro) {
    console.log(`não abri o navegador: ${(erro as Error).message}`);
    process.exit(1);
  }
  try {
    for (const [tribunal, atualizar] of [
      ["stf", atualizarStf],
      ["vinculantes", (s: Sessao, r: Relatorio) => atualizarStf(s, r, "vinculantes")],
      ["stj", atualizarStj],
    ] as const) {
      if (so && so !== tribunal) continue;
      const rel: Relatorio = { tribunal, linhas: [], mudou: false };
      try {
        rel.mudou = await atualizar(sessao, rel);
        algumOk = true;
        mudouAlgo ||= rel.mudou;
      } catch (erro) {
        rel.erro = (erro as Error).message;
      }
      relatorios.push(rel);
    }
  } finally {
    await sessao.fechar();
  }
  for (const r of relatorios) {
    for (const l of r.linhas) console.log(l);
    if (r.erro) console.log(`${r.tribunal.toUpperCase()}: não atualizado: ${r.erro}. O conteúdo atual foi mantido.`);
  }
  if (mudouAlgo) {
    console.log("regenerando os dados do navegador (build-content)");
    execFileSync(process.execPath, [join(ROOT, "scripts", "build-content.ts")], { stdio: "inherit", cwd: ROOT });
  } else console.log("nada mudou");
  process.exit(algumOk ? 0 : 1);
}

if (import.meta.main) await main();
