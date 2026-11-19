// Dados da aba Estatísticas, montados no build (só no servidor): os exames do site e os antigos da OAB/SP, as fichas das
// peças, as teses e os artigos de cada tabela de pontos e a linha do tempo. A página recebe tudo pronto e só filtra.
import "server-only";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import historicoJson from "./generated/historico.json";
import indiceLeitor from "./generated/leis-indice.json";
import leisJson from "./generated/leis.json";
import pecasJson from "./generated/pecas.json";
import sumulasNumeros from "./generated/sumulas-numeros.json";
import { carregarLei, leisDoLeitor } from "./leis";
import { carregarExame, listarExames, type ExameResumo } from "./load";
import type { Historico, Leis, PecasCatalogo } from "./schema";
import { buildLexico, parseDispositivo, toRoman } from "@/lib/correcao/citacoes";
import { GRUPOS_LEIS } from "@/lib/leis/leitura";
import { dispositivosDoSufixo } from "@/lib/leis/prefixo";
import { infoTeses, tesesNoTexto } from "@/lib/estatisticas/teses";
import type { ArtigoEstat, DadosEstatisticas, Era, ExameEstat, MarcoLinha, OrigemArtigo, PecaInfo, PreviaArtigo } from "@/lib/estatisticas/tipos";

const leis = leisJson as Leis;
const pecas = pecasJson as PecasCatalogo;
const historico = historicoJson as Historico;
const NO_LEITOR = new Set(indiceLeitor.map((l) => l.id));
const lex = buildLexico(leis);

const ano = (data: string | null) => (data ? Number(data.slice(0, 4)) : null);

/** A data no eixo do tempo, em anos: "2014-02-09" → 2014,11. */
function noEixo(data: string): number {
  const [a, m, d] = data.split("-").map(Number) as [number, number, number];
  const inicio = Date.UTC(a, 0, 1);
  return a + (Date.UTC(a, m - 1, d) - inicio) / (Date.UTC(a + 1, 0, 1) - inicio);
}
/** "2010-02" ou "2010" no eixo: o começo do mês (ou do ano); com `fim`, o fim dele. */
const mesNoEixo = (s: string, fim = false) => {
  const [a, m] = s.split("-").map(Number) as [number, number | undefined];
  return m === undefined ? a + (fim ? 1 : 0) : a + (m - (fim ? 0 : 1)) / 12;
};
const ordinal = (n: string) => (/^\d$/.test(n) ? `${n}º` : n.toUpperCase());

function tituloDoExame(e: ExameResumo) {
  return `${e.numeral} Exame${e.variante ? ` · ${e.variante}` : ""}`;
}

/** Os exames do site (unificados): o I é do CESPE (2010.1); do II em diante, da FGV. */
function examesDoSite(): ExameEstat[] {
  return listarExames()
    .filter((e) => e.transcrito)
    .map((e): ExameEstat => {
      const ex = carregarExame(e.id);
      const textoDe = (p: { itens: { descricao: string }[] }) => p.itens.map((i) => i.descricao).join("\n");
      const atualizado = e.downloads.cadernoAtualizado ?? e.downloads.cadernoOriginal;
      return {
        id: e.id,
        ordem: 0,
        numero: e.numero,
        numeral: e.numeral,
        titulo: tituloDoExame(e),
        apelido: e.numero === 1 ? "2010.1" : e.numero === 2 ? "2010.2" : e.numero === 3 ? "2010.3" : null,
        ano: ano(e.aplicacao),
        anoEstimado: false,
        data: e.aplicacao,
        quando: e.aplicacao ? noEixo(e.aplicacao) : null,
        era: e.numero === 1 ? "cespe" : "fgv",
        variante: e.variante,
        pecas: [e.pecaTipo],
        pecaNaProva: e.peca,
        noSite: true,
        corrigivel: e.corrigivel,
        preliminar: e.preliminar.gabarito,
        questoes: ex.questoes.length,
        links: {
          simulado: e.corrigivel ? `/simulados/${e.id}/` : undefined,
          prova: `/provas/?ver=${encodeURIComponent(e.id)}#exame-${e.id}`,
          caderno: atualizado ?? undefined,
          gabarito: (e.downloads.gabaritoAtualizado ?? e.downloads.gabaritoOriginal) ?? undefined,
          fgv: e.fgv ?? undefined,
        },
        teses: { peca: tesesNoTexto(textoDe(ex.peca)), questoes: [...new Set(ex.questoes.flatMap((q) => tesesNoTexto(textoDe(q))))] },
      };
    });
}

/** Os exames da OAB/SP anteriores à unificação (content/historico.yaml), sem prova no site. */
function examesAntigos(): ExameEstat[] {
  // sem a data, o exame fica no eixo repartindo o ano com os outros do mesmo ano (uns três por ano)
  const doAno = (n: number) => historico.exames_antigos.filter((x) => x.ano === n).sort((a, b) => a.numero - b.numero);
  const posicao = (e: (typeof historico.exames_antigos)[number]) => {
    if (e.data) return noEixo(e.data);
    if (!e.ano) return null;
    const lista = doAno(e.ano);
    return e.ano + (lista.findIndex((x) => x.numero === e.numero) + 0.5) / lista.length;
  };
  return historico.exames_antigos.map(
    (e): ExameEstat => ({
      id: `sp-${e.numero}`,
      ordem: 0,
      numero: e.numero,
      numeral: `${e.numero}º`,
      titulo: `${e.numero}º Exame da OAB/SP`,
      apelido: e.rotulo ?? null,
      ano: e.ano ?? null,
      anoEstimado: !!e.estimado,
      data: e.data ?? null,
      quando: posicao(e),
      era: e.banca as Era,
      variante: null,
      pecas: e.pecas,
      pecaNaProva: null,
      noSite: false,
      corrigivel: false,
      preliminar: false,
      questoes: 0,
      links: {},
      teses: { peca: [], questoes: [] },
    }),
  );
}

/** O link do artigo: no leitor do Grifo quando a lei está nele; senão, no Planalto (quando há). */
function urlDoArtigo(diploma: string, art: string, inciso?: string): string | undefined {
  if (NO_LEITOR.has(diploma)) return `/leis/${diploma}/#art${art}${inciso ? `.i${inciso}` : ""}`;
  const planalto = leis.diplomas[diploma]?.planalto;
  return planalto ? `${planalto}#art${art.replace("-", "")}` : undefined;
}

/** A prévia do artigo (o pop-up dos links de artigo), só para as leis do leitor. `depois`: o texto que segue o número
 * do artigo (", § 3º, CPP"), de onde sai o parágrafo ou o inciso destacado. */
function previaDoArtigo(diploma: string, art: string, depois = ""): PreviaArtigo | undefined {
  if (!NO_LEITOR.has(diploma)) return undefined;
  const id = `art${art}`;
  const disps = dispositivosDoSufixo(depois, id);
  return { lei: diploma, art: id, ...(disps.length ? { disp: disps.join(" ") } : {}) };
}

function nomeCurtoDaLei(diploma: string): string {
  const d = leis.diplomas[diploma];
  // fora do cadastro (lei-7960): o número com o ponto do milhar
  if (!d) return diploma.replace(/^lei-(\d+)$/, (_, n: string) => `Lei ${n.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`);
  if (d.sigla) return d.sigla;
  return d.numero ? `Lei ${d.numero}${d.ano ? `/${d.ano}` : ""}` : d.nome;
}

/** "do CPP", "da CF", "da LEP", "da Lei 9.099/1995": o artigo da contração vem do nome da lei. */
const FEMININAS = new Set(["CF", "LEP", "LMP", "CADH", "LCP"]);
const daLei = (nome: string) => `${FEMININAS.has(nome) || nome.startsWith("Lei ") ? "da" : "do"} ${nome}`;

const origemDe = (diploma: string): OrigemArtigo =>
  diploma === "cp" || diploma === "cpp" || diploma === "lep" || diploma === "cf" ? diploma : "leis";

/** A epígrafe (no CP, "Furto") ou o começo do caput de cada artigo das leis do leitor, lidos uma vez. */
const resumos = new Map<string, Map<string, string>>();
function resumoDoArtigo(diploma: string, art: string, inciso?: string): string | undefined {
  if (!NO_LEITOR.has(diploma)) return undefined;
  let m = resumos.get(diploma);
  if (!m) {
    m = new Map();
    const blocos = carregarLei(diploma).blocos;
    blocos.forEach((b, i) => {
      if (b.superada || !b.disp) return;
      const anterior = blocos[i - 1];
      const corpo = (b.texto ?? "").replace(/^(Art\.|[IVXLC]+)\s*[\w.º°-]*\s*[-–.]?\s*/, "").trim();
      if (b.tipo === "artigo") m!.set(b.disp, anterior?.tipo === "rubrica" && !anterior.superada ? anterior.texto : corpo);
      else if (b.tipo === "inciso") m!.set(b.disp, corpo);
    });
    resumos.set(diploma, m);
  }
  const t = m.get(`art${art}${inciso ? `.i${inciso}` : ""}`);
  if (!t) return undefined;
  return t.length > 110 ? `${t.slice(0, 107).replace(/\s+\S*$/, "")}…` : t;
}

function enunciadoDaSumula(tribunal: string, n: number): string | undefined {
  const arq = join(process.cwd(), "content", "sumulas", `${tribunal}.json`);
  if (!existsSync(arq)) return undefined;
  const lista = (JSON.parse(readFileSync(arq, "utf8")) as { sumulas: { numero: number; enunciado?: string }[] }).sumulas;
  const t = lista.find((s) => s.numero === n)?.enunciado;
  return t && t.length > 110 ? `${t.slice(0, 107).replace(/\s+\S*$/, "")}…` : t;
}

/** Os artigos e súmulas citados nos dispositivos das tabelas de pontos, com os exames em que aparecem. */
function artigosCitados(exames: ExameEstat[]): ArtigoEstat[] {
  const m = new Map<string, ArtigoEstat>();
  for (const e of exames.filter((x) => x.noSite)) {
    const ex = carregarExame(e.id);
    const partes: ["peca" | "questoes", { itens: { componentes: { dispositivo?: string[] }[] }[] }][] = [
      ["peca", ex.peca],
      ...ex.questoes.map((q) => ["questoes", q] as ["questoes", typeof q]),
    ];
    for (const [parte, p] of partes)
      for (const it of p.itens)
        for (const c of it.componentes)
          for (const d of c.dispositivo ?? []) {
            const cit = parseDispositivo(d, lex);
            if (!cit) continue;
            let item: Omit<ArtigoEstat, "peca" | "questoes"> | null = null;
            if (cit.tipo === "art" && cit.diploma) {
              // o art. 5º da CF tem 78 incisos: o que conta é o inciso
              const inciso = cit.diploma === "cf" && cit.art === "5" ? cit.incs[0] : undefined;
              const art = cit.art.toLowerCase();
              const chave = `${cit.diploma}:${art}${inciso ? `.i${inciso}` : ""}`;
              const rotulo = `Art. ${ordinal(cit.art)}${inciso ? `, ${toRoman(Number(inciso))},` : ""} ${daLei(nomeCurtoDaLei(cit.diploma))}`;
              item = {
                chave,
                rotulo,
                origem: origemDe(cit.diploma),
                resumo: resumoDoArtigo(cit.diploma, art, inciso),
                url: urlDoArtigo(cit.diploma, art, inciso),
                previa: previaDoArtigo(cit.diploma, art, inciso ? `, ${toRoman(Number(inciso))},` : ""),
              };
            } else if (cit.tipo === "sumula") {
              const t = cit.vinculante ? "vinculantes" : cit.tribunal;
              if (t !== "stf" && t !== "stj" && t !== "vinculantes") continue;
              const n = Number(cit.n);
              const chave = `sumula:${t}:${n}`;
              const rotulo = t === "vinculantes" ? `Súmula Vinculante ${n}` : `Súmula ${n} do ${t.toUpperCase()}`;
              const noSite = (sumulasNumeros as Record<string, number[]>)[t]?.includes(n);
              item = {
                chave,
                rotulo,
                origem: "sumulas",
                resumo: enunciadoDaSumula(t, n),
                url: noSite ? `/leis/sumulas/${t}/#s-${n}` : undefined,
                previa: noSite ? { lei: `sumulas-${t}`, art: `s-${n}` } : undefined,
              };
            }
            if (!item) continue;
            const a = m.get(item.chave) ?? { ...item, peca: [], questoes: [] };
            if (!a[parte].includes(e.id)) a[parte].push(e.id);
            m.set(item.chave, a);
          }
  }
  return [...m.values()];
}

function fichaDaPeca(tipo: string): PecaInfo {
  const p = pecas[tipo] ?? historico.pecas_extras[tipo];
  if (!p) throw new Error(`estatísticas: peça "${tipo}" fora do catálogo`);
  return {
    tipo,
    nome: p.nome,
    grupo: p.grupo ?? "recurso",
    fundamentos: p.fundamento.map((f) => {
      const c = parseDispositivo(f, lex);
      if (c?.tipo !== "art" || !c.diploma) return { texto: f };
      // o texto do catálogo, com o parágrafo e o inciso: "art. 403, § 3º, CPP" → "Art. 403, § 3º, do CPP"
      const m = f.match(/^art\.\s*(.+?)(,?)\s+([A-Z]{2,4})$/i);
      const texto = m ? `Art. ${m[1]}${m[2] || m[1].includes(",") ? "," : ""} ${daLei(nomeCurtoDaLei(c.diploma))}` : f;
      const inciso = c.diploma === "cf" && c.art === "5" ? c.incs[0] : undefined;
      const art = c.art.toLowerCase();
      const depois = f.replace(/^art\.\s*[\d.]+(?:-[a-z])?/i, "");
      return { texto, url: urlDoArtigo(c.diploma, art, inciso), previa: previaDoArtigo(c.diploma, art, depois) };
    }),
    prazo: p.prazo,
    cabimento: p.cabimento,
  };
}

function linhaDoTempo(exames: ExameEstat[]): MarcoLinha[] {
  return historico.linha_do_tempo.map((m) => {
    const e = m.exame ? exames.find((x) => x.id === m.exame) : undefined;
    return {
      quando: m.quando,
      de: mesNoEixo(m.de),
      ate: m.ate ? mesNoEixo(m.ate, true) : null,
      rotulo: m.rotulo,
      titulo: m.titulo,
      texto: m.texto,
      era: m.era,
      destaque: m.destaque,
      exame: e ? { id: e.id, titulo: e.titulo, href: e.links.simulado ?? e.links.prova ?? "/provas/" } : undefined,
    };
  });
}

export function dadosEstatisticas(): DadosEstatisticas {
  // os antigos (110º a 140º) vêm antes do I Exame Unificado; os do site, pela ordem do número e da reaplicação
  const exames = [...examesAntigos().sort((a, b) => a.numero - b.numero), ...examesDoSite()].map((e, ordem) => ({ ...e, ordem }));
  const tipos = [...new Set(exames.flatMap((e) => e.pecas))];
  const grupoDaLei = (tipo: string) => GRUPOS_LEIS.find((g) => g.tipo === tipo)?.cor ?? "var(--primary)";
  return {
    exames,
    pecas: Object.fromEntries(tipos.map((t) => [t, fichaDaPeca(t)])),
    artigos: artigosCitados(exames),
    teses: infoTeses(),
    linha: linhaDoTempo(exames),
    leis: leisDoLeitor().map((l) => ({ id: l.id, nome: l.nome, unidades: l.unidades, cor: grupoDaLei(l.tipo) })),
  };
}
