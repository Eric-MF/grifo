"use client";

import Link from "next/link";
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { fmtNota } from "@/lib/formato";
import { gravarJSON, lerJSON } from "@/lib/storage";
import {
  buscarExames,
  contarArtigos,
  contarTeses,
  filtrarExames,
  FILTRO_PADRAO,
  fmtMedia,
  fmtPct,
  origemDosArtigos,
  rankingDePecas,
  type FiltroExames,
  type OrdemRanking,
  type ParteProva,
} from "@/lib/estatisticas/exames";
import { OPCOES_PADRAO } from "@/lib/estatisticas/busca";
import { palpite, PESO_PADRAO } from "@/lib/estatisticas/palpite";
import { anoDoExame } from "@/lib/estatisticas/rotulos";
import { NOMES_GRUPOS_TESE } from "@/lib/estatisticas/teses";
import { ERAS, NOMES_GRUPOS, nomeEra, ORIGENS, type DadosEstatisticas, type Era, type ExameEstat, type OrigemArtigo } from "@/lib/estatisticas/tipos";
import type { ExameResumo } from "@/content/load";
import type { GrupoPeca } from "@/content/schema";
import type { NavegacaoExames } from "../provas/VisualizarExame";
import type { DadosPessoais } from "./dadosPessoais";
import { FichaPeca } from "./FichaPeca";
import { Barra, corDoGrupo, dicaDoExame, LinkArtigo, Medalha, Numeral, QuandoCaiu, SeloPeca } from "./Graficos";
import { BarraBusca, TrechosDoExame, useBuscaExames, type EstadoBusca } from "./BuscaExames";
import { Palpite } from "./Palpite";
import { CRITERIOS, FORMATOS, QUANTAS, VistaPecas, type Criterio, type Formato, type ItemVista, type Quantas } from "./VistaPecas";
import styles from "./estatisticas.module.css";

const ULTIMOS: { n: number | null; nome: string }[] = [
  { n: null, nome: "Todos" },
  { n: 20, nome: "Últimos 20" },
  { n: 10, nome: "Últimos 10" },
  { n: 5, nome: "Últimos 5" },
];
const ORDENS: { id: OrdemRanking; nome: string }[] = [
  { id: "vezes", nome: "Mais cobradas" },
  { id: "jejum", nome: "Há mais tempo sem cair" },
  { id: "recentes", nome: "Caíram por último" },
  { id: "nome", nome: "A–Z" },
];
const PARTES: { id: ParteProva; nome: string }[] = [
  { id: "peca", nome: "Na peça" },
  { id: "questoes", nome: "Nas questões" },
  { id: "tudo", nome: "Na prova toda" },
];
const ARTIGOS_POR_VEZ = 12;
// o visualizador da aba Provas, só baixado quando a pessoa abre uma prova
const VisualizarExame = lazy(() => import("../provas/VisualizarExame").then((m) => ({ default: m.VisualizarExame })));
/** o caderno original abre na página 2, a do enunciado da peça */
const PAGINA_DO_ENUNCIADO = 2;
/** o clique simples abre o visualizador; com Ctrl, ⌘, Shift ou o botão do meio, o link segue para /provas/ */
const cliqueSimples = (ev: MouseEvent) => ev.button === 0 && !ev.ctrlKey && !ev.metaKey && !ev.shiftKey && !ev.altKey;
/** a forma das peças do topo e o peso do palpite, guardados no navegador */
const CHAVE_VISTA = "grifo:estatisticas:vista";
interface PrefVista {
  formato: Formato;
  quantas: Quantas;
  criterio: Criterio;
  peso: number;
}
const VISTA_PADRAO: PrefVista = { formato: "piramide", quantas: 3, criterio: "vezes", peso: PESO_PADRAO };

/** "do II (2010) ao XLVII (2026)", com a dica do número em algarismos em cada numeral */
function Intervalo({ lista }: { lista: ExameEstat[] }) {
  if (!lista.length) return null;
  const r = (e: ExameEstat) => (
    <>
      <Numeral e={e} />
      {anoDoExame(e) ? ` (${anoDoExame(e)})` : ""}
    </>
  );
  return lista.length === 1 ? (
    r(lista[0]!)
  ) : (
    <>
      do {r(lista[0]!)} ao {r(lista.at(-1)!)}
    </>
  );
}

function rolarAte(el: Element | null) {
  if (!el) return;
  const reduzido = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduzido ? "auto" : "smooth", block: "start" });
}

export function AbaExames({
  dados,
  provas,
  pessoais,
  ocultar,
  onOcultar,
}: {
  dados: DadosEstatisticas;
  /** os exames do site como a aba Provas os tem, para o visualizador */
  provas: ExameResumo[];
  pessoais: DadosPessoais | null;
  ocultar: boolean;
  onOcultar: (v: boolean) => void;
}) {
  const [filtro, setFiltro] = useState<FiltroExames>(FILTRO_PADRAO);
  const [ordem, setOrdem] = useState<OrdemRanking>("vezes");
  const [dentro, setDentro] = useState<"teses" | "artigos">("teses");
  const [parte, setParte] = useState<ParteProva>("peca");
  const [origem, setOrigem] = useState<OrigemArtigo | null>(null);
  const [artigosVistos, setArtigosVistos] = useState(ARTIGOS_POR_VEZ);
  const [artigoAberto, setArtigoAberto] = useState<string | null>(null);
  // os filtros da lista de exames
  const [peca, setPeca] = useState<string | null>(null);
  const [tese, setTese] = useState<string | null>(null);
  const [artigo, setArtigo] = useState<string | null>(null);
  const [busca, setBusca] = useState<EstadoBusca>({ busca: "", onde: "dados", parte: "tudo", opcoes: OPCOES_PADRAO });
  const [antigosPrimeiro, setAntigosPrimeiro] = useState(false);
  const [alvo, setAlvo] = useState<string | null>(null);
  const [revelados, setRevelados] = useState<Set<string>>(new Set());
  const [ficha, setFicha] = useState<string | null>(null);
  const [vista, setVista] = useState<PrefVista>(VISTA_PADRAO);
  const [vendo, setVendo] = useState<string | null>(null);
  const listaRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const v = lerJSON<Partial<PrefVista>>(CHAVE_VISTA, {});
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a escolha fica no navegador
    setVista({
      // a rosca virou pizza: quem tinha escolhido a rosca fica com a pizza
      formato: (v.formato as string) === "rosca" ? "pizza" : FORMATOS.some((f) => f.id === v.formato) ? v.formato! : VISTA_PADRAO.formato,
      quantas: QUANTAS.includes(v.quantas as Quantas) ? v.quantas! : VISTA_PADRAO.quantas,
      criterio: CRITERIOS.some((c) => c.id === v.criterio) ? v.criterio! : VISTA_PADRAO.criterio,
      peso: typeof v.peso === "number" && v.peso >= 0 && v.peso <= 2 ? v.peso : VISTA_PADRAO.peso,
    });
  }, []);
  const mudarVista = (m: Partial<PrefVista>) =>
    setVista((v) => {
      const nova = { ...v, ...m };
      gravarJSON(CHAVE_VISTA, nova);
      return nova;
    });

  const nome = (t: string) => dados.pecas[t]?.nome ?? t;
  const feito = (e: ExameEstat) => !!pessoais?.melhores.has(e.id);
  const oculto = (e: ExameEstat) => ocultar && e.noSite && !feito(e) && !revelados.has(e.id);
  const revelar = (id: string) => setRevelados((r) => new Set(r).add(id));

  const lista = useMemo(() => filtrarExames(dados.exames, filtro), [dados.exames, filtro]);
  // a mesma época sem o corte dos "últimos N": o teste do palpite anda por ela
  const historia = useMemo(() => filtrarExames(dados.exames, { ...filtro, ultimos: null, reaplicacoes: false }), [dados.exames, filtro]);
  // contas pequenas (uns 80 exames e 300 artigos): refeitas a cada desenho
  const ranking = rankingDePecas(lista, nome, ordem);
  const porVezes = ordem === "vezes" ? ranking : rankingDePecas(lista, nome, "vezes");
  const top3 = porVezes.slice(0, 3);
  const doSite = lista.filter((e) => e.noSite);
  const teses = contarTeses(doSite, parte);
  const artigos = contarArtigos(dados.artigos, doSite, parte, origem);
  const origens = origemDosArtigos(origem ? contarArtigos(dados.artigos, doSite, parte, null) : artigos);
  const totalOrigens = origens.reduce((s, o) => s + o.n, 0);
  const tesePorId = new Map(dados.teses.map((t) => [t.id, t]));

  // os grupos de peças: a parte de cada um nas vezes em que as peças caíram
  const grupos = (() => {
    const m = new Map<GrupoPeca, number>();
    for (const l of porVezes) {
      const g = dados.pecas[l.tipo]?.grupo ?? "recurso";
      m.set(g, (m.get(g) ?? 0) + l.vezes);
    }
    const total = [...m.values()].reduce((s, n) => s + n, 0);
    return [...m].map(([g, n]) => ({ g, n, f: total ? n / total : 0 })).sort((a, b) => b.n - a.n);
  })();

  // na sequência, cada peça tem um tom do seu grupo: a mais cobrada do grupo vai cheia, as outras mais claras
  const TONS = [100, 58, 34, 20];
  const tomDa = new Map<string, number>();
  for (const l of porVezes) {
    const g = dados.pecas[l.tipo]?.grupo;
    const k = porVezes.filter((x) => dados.pecas[x.tipo]?.grupo === g && x.vezes > l.vezes).length;
    tomDa.set(l.tipo, TONS[Math.min(k, TONS.length - 1)]!);
  }
  const corDaPeca = (t: string) => {
    const tom = tomDa.get(t) ?? 100;
    return tom === 100 ? corDoGrupo(dados.pecas[t]) : `color-mix(in srgb, ${corDoGrupo(dados.pecas[t])} ${tom}%, var(--surface))`;
  };
  const maxVezes = porVezes[0]?.vezes ?? 1;

  // as peças do topo, pelas vezes ou pelo palpite
  const itensVista: ItemVista[] =
    vista.criterio === "palpite"
      ? palpite(lista, vista.peso).map((l) => ({
          tipo: l.tipo,
          nome: nome(l.tipo),
          valor: l.chance,
          rotulo: l.chance < 0.01 ? "<1%" : fmtPct(l.chance),
          detalhe: `chance estimada · caiu ${l.vezes}× · ${l.desdeUltima === 0 ? "caiu no último" : `não cai há ${l.desdeUltima}`}`,
          cor: corDaPeca(l.tipo),
          medalha: <Medalha peca={dados.pecas[l.tipo]} />,
        }))
      : porVezes.map((l) => ({
          tipo: l.tipo,
          nome: nome(l.tipo),
          valor: l.vezes,
          rotulo: `${l.vezes}×`,
          detalhe: `${l.vezes} ${l.vezes === 1 ? "exame" : "exames"} · ${fmtPct(l.fracao)}${l.desdeUltima === 0 ? " · caiu no último" : ` · última há ${l.desdeUltima}`}`,
          cor: corDaPeca(l.tipo),
          medalha: <Medalha peca={dados.pecas[l.tipo]} />,
        }));

  const descricaoFiltro = `${filtro.eras.length === ERAS.length ? "todas as épocas" : filtro.eras.map(nomeEra).join(" e ")}${filtro.ultimos ? `, últimos ${filtro.ultimos}` : ""}`;

  // a lista de exames, com os filtros dela
  const artigoSel = artigo ? dados.artigos.find((a) => a.chave === artigo) : undefined;
  const textoBusca = (e: ExameEstat) =>
    [
      e.titulo,
      e.numeral,
      String(e.numero),
      e.apelido ?? "",
      e.ano ?? "",
      nomeEra(e.era),
      e.variante ?? "",
      ...(oculto(e) ? [] : e.pecas.map(nome)),
      ...[...e.teses.peca, ...e.teses.questoes].map((t) => tesePorId.get(t)?.nome ?? ""),
    ].join(" ");
  const comFiltros = useMemo(
    () =>
      lista.filter(
        (e) =>
          (!peca || e.pecas.includes(peca)) &&
          (!tese || (parte === "peca" ? e.teses.peca : parte === "questoes" ? e.teses.questoes : [...e.teses.peca, ...e.teses.questoes]).includes(tese)) &&
          (!artigoSel || (parte === "peca" ? artigoSel.peca : parte === "questoes" ? artigoSel.questoes : [...artigoSel.peca, ...artigoSel.questoes]).includes(e.id)),
      ),
    [lista, peca, tese, artigoSel, parte],
  );
  const achados = useBuscaExames(comFiltros, busca, (l, q, o) => buscarExames(l, q, textoBusca, o));
  const filtrada = achados.exames;
  const totalAchados = [...achados.trechos.values()].reduce((n, t) => n + t.total, 0);
  const ordenada = antigosPrimeiro ? filtrada : [...filtrada].reverse();
  // embaixo da busca: os exames achados, separados pela peça (com a peça escondida, num grupo só)
  const buscando = !!busca.busca.trim() && (busca.onde === "dados" || achados.nosTextos);
  const porPeca = (() => {
    if (!buscando) return [];
    const m = new Map<string, { chave: string; nome: string; cor: string; exames: ExameEstat[] }>();
    for (const e of ordenada)
      for (const t of oculto(e) ? ["?"] : [...new Set(e.pecas)]) {
        const g = m.get(t) ?? { chave: t, nome: t === "?" ? "Peça escondida" : nome(t), cor: t === "?" ? "var(--muted)" : corDaPeca(t), exames: [] };
        g.exames.push(e);
        m.set(t, g);
      }
    return [...m.values()].sort((a, b) => b.exames.length - a.exames.length || a.nome.localeCompare(b.nome, "pt-BR"));
  })();

  // o visualizador da aba Provas, aberto pelo "Ver a prova"; as setas andam pelos exames da lista, na ordem dos números
  const provaPorId = useMemo(() => new Map(provas.map((p) => [p.id, p])), [provas]);
  const vizinhos = (id: string): NavegacaoExames => {
    const daLista = filtrada.filter((e) => provaPorId.has(e.id)).map((e) => e.id);
    const seq = daLista.includes(id) ? daLista : dados.exames.filter((e) => provaPorId.has(e.id)).map((e) => e.id);
    const i = seq.indexOf(id);
    return {
      anterior: i > 0 ? provaPorId.get(seq[i - 1]!) : undefined,
      proximo: i >= 0 && i < seq.length - 1 ? provaPorId.get(seq[i + 1]!) : undefined,
      onIr: (x) => setVendo(x.id),
    };
  };
  const abrirProva = (id: string) => (ev: MouseEvent) => {
    if (!provaPorId.has(id) || !cliqueSimples(ev)) return;
    ev.preventDefault();
    setVendo(id);
  };
  const filtrosLista = [
    peca && { rotulo: `Peça: ${nome(peca)}`, limpar: () => setPeca(null) },
    tese && { rotulo: `Tese: ${tesePorId.get(tese)?.nome ?? tese} (${PARTES.find((p) => p.id === parte)!.nome.toLowerCase()})`, limpar: () => setTese(null) },
    artigoSel && { rotulo: `${artigoSel.rotulo} (${PARTES.find((p) => p.id === parte)!.nome.toLowerCase()})`, limpar: () => setArtigo(null) },
  ].filter(Boolean) as { rotulo: string; limpar: () => void }[];

  const artigosDoExame = useMemo(() => {
    const m = new Map<string, { peca: string[]; questoes: string[] }>();
    for (const a of dados.artigos)
      for (const p of ["peca", "questoes"] as const)
        for (const id of a[p]) {
          const x = m.get(id) ?? { peca: [], questoes: [] };
          x[p].push(a.chave);
          m.set(id, x);
        }
    return m;
  }, [dados.artigos]);
  const artigoPorChave = useMemo(() => new Map(dados.artigos.map((a) => [a.chave, a])), [dados.artigos]);

  const irParaLista = () => requestAnimationFrame(() => rolarAte(listaRef.current));
  // até o exame na lista, sem tirar a busca (ele está nela)
  const irNaLista = (id: string) => {
    setAlvo(id);
    requestAnimationFrame(() => rolarAte(document.getElementById(`exame-${id}`)));
  };
  const irParaExame = (id: string) => {
    setBusca((b) => ({ ...b, busca: "" }));
    setPeca(null);
    setTese(null);
    setArtigo(null);
    setAlvo(id);
    requestAnimationFrame(() => rolarAte(document.getElementById(`exame-${id}`)));
  };
  const filtrarPorPeca = (t: string) => {
    setPeca(t);
    setFicha(null);
    irParaLista();
  };

  const mudarEras = (era: Era) =>
    setFiltro((f) => {
      const tem = f.eras.includes(era);
      if (tem && f.eras.length === 1) return f;
      return { ...f, eras: tem ? f.eras.filter((x) => x !== era) : [...f.eras, era] };
    });

  const ultimo = lista.at(-1);
  const linhaFicha = ficha ? porVezes.find((l) => l.tipo === ficha) : undefined;

  return (
    <>
      <section className={`card ${styles.filtros}`} aria-label="Filtros dos exames">
        <div className={styles.filtroLinha}>
          <span className={styles.rotuloFiltro} id="rot-epoca">
            Época
          </span>
          <div className={styles.chips} role="group" aria-labelledby="rot-epoca">
            {ERAS.map((e) => (
              <button key={e.id} type="button" className={styles.chip} aria-pressed={filtro.eras.includes(e.id)} onClick={() => mudarEras(e.id)} title={e.desc}>
                {e.nome}
              </button>
            ))}
            <button
              type="button"
              className={styles.chip}
              aria-pressed={filtro.eras.length === ERAS.length}
              onClick={() => setFiltro((f) => ({ ...f, eras: ERAS.map((e) => e.id) }))}
            >
              Todas
            </button>
          </div>
        </div>
        <div className={styles.filtroLinha}>
          <span className={styles.rotuloFiltro} id="rot-periodo">
            Exames
          </span>
          <div className={styles.segmentado} role="group" aria-labelledby="rot-periodo">
            {ULTIMOS.map((u) => (
              <button key={u.nome} type="button" aria-pressed={filtro.ultimos === u.n} onClick={() => setFiltro((f) => ({ ...f, ultimos: u.n }))}>
                {u.nome}
              </button>
            ))}
          </div>
          <label className={styles.caixa}>
            <input type="checkbox" checked={filtro.reaplicacoes} onChange={(e) => setFiltro((f) => ({ ...f, reaplicacoes: e.target.checked }))} />
            Incluir as reaplicações (Porto Velho e Porto Alegre)
          </label>
        </div>
        <p className={styles.resumoFiltro} aria-live="polite">
          <strong>{lista.length}</strong> {lista.length === 1 ? "exame" : "exames"} <Intervalo lista={lista} />
          {filtro.eras.some((e) => e !== "fgv" && e !== "cespe") && " · os da OAB/SP listam até quatro peças por exame"}
        </p>
      </section>

      {lista.length === 0 ? (
        <p className="muted">Nenhum exame com esses filtros.</p>
      ) : (
        <>
          <div className={styles.kpis}>
            <div className={styles.kpi}>
              <span className={styles.kpiRotulo}>Exames</span>
              <strong className={styles.kpiValor}>{lista.length}</strong>
              <span className={styles.kpiSub}>
                <Intervalo lista={lista} />
              </span>
            </div>
            {top3[0] && (
              <div className={styles.kpi}>
                <span className={styles.kpiRotulo}>Peça mais cobrada</span>
                <strong className={styles.kpiValor}>{nome(top3[0].tipo)}</strong>
                <span className={styles.kpiSub}>
                  em {top3[0].vezes} de {lista.length} exames ({fmtPct(top3[0].fracao)})
                </span>
              </div>
            )}
            <div className={styles.kpi}>
              <span className={styles.kpiRotulo}>Peças diferentes</span>
              <strong className={styles.kpiValor}>{porVezes.length}</strong>
              <span className={styles.kpiSub}>
                {porVezes.length > 3 &&
                  `as três primeiras caíram em ${fmtPct(lista.filter((e) => e.pecas.some((t) => top3.some((l) => l.tipo === t))).length / lista.length)} dos exames`}
              </span>
            </div>
            {ultimo && (
              <div className={styles.kpi}>
                <span className={styles.kpiRotulo}>Mais recente</span>
                <strong className={styles.kpiValor}>
                  <Numeral e={ultimo} />
                  {ultimo.variante ? ` · ${ultimo.variante}` : ""}
                </strong>
                <span className={styles.kpiSub}>
                  {oculto(ultimo) ? "peça oculta" : ultimo.pecas.map(nome).join(", ")}
                  {anoDoExame(ultimo) ? ` · ${anoDoExame(ultimo)}` : ""}
                </span>
              </div>
            )}
          </div>

          <section className={styles.secao} aria-labelledby="t-piramide">
            <h2 id="t-piramide">{vista.criterio === "palpite" ? "O palpite em destaque" : vista.formato === "piramide" ? "A pirâmide da aprovação" : "As peças que mais caem"}</h2>
            <p className="muted">
              {vista.criterio === "palpite" ? `As ${vista.quantas} peças com mais chance no palpite do próximo exame` : `As ${vista.quantas} peças que mais caíram`} (
              {descricaoFiltro}). Escolha o formato, quantas peças e o critério. Toque numa peça para ver a ficha dela.
            </p>
            <div className={styles.controlesVista}>
              <div className={styles.segmentado} role="group" aria-label="Formato">
                {FORMATOS.map((f) => (
                  <button key={f.id} type="button" aria-pressed={vista.formato === f.id} onClick={() => mudarVista({ formato: f.id })}>
                    {f.nome}
                  </button>
                ))}
              </div>
              <div className={styles.segmentado} role="group" aria-label="Quantas peças">
                {QUANTAS.map((q) => (
                  <button key={q} type="button" aria-pressed={vista.quantas === q} onClick={() => mudarVista({ quantas: q })} aria-label={`${q} peças`}>
                    {q}
                  </button>
                ))}
              </div>
              <div className={styles.segmentado} role="group" aria-label="Critério">
                {CRITERIOS.map((c) => (
                  <button key={c.id} type="button" aria-pressed={vista.criterio === c.id} onClick={() => mudarVista({ criterio: c.id })}>
                    {c.nome}
                  </button>
                ))}
              </div>
            </div>
            {vista.formato === "podio" && vista.quantas > 3 && <p className={styles.notaVista}>O pódio tem três degraus; as outras peças estão na lista.</p>}
            <VistaPecas itens={itensVista} formato={vista.formato} quantas={vista.quantas} criterio={vista.criterio} total={lista.length} onAbrir={setFicha} />
          </section>

          <section className={styles.secao} aria-labelledby="t-palpite">
            <h2 id="t-palpite">E no próximo exame?</h2>
            <p className="muted">
              Um palpite feito com os exames do filtro: quanto mais uma peça cai, e quanto mais tempo ela está sem cair comparado com o intervalo médio dela, maior a
              chance estimada. Mude o filtro (época, últimos exames) e o peso para ver o palpite mudar.
            </p>
            <Palpite
              lista={lista}
              historia={historia}
              janela={filtro.ultimos}
              pecas={dados.pecas}
              peso={vista.peso}
              onPeso={(peso) => mudarVista({ peso })}
              onAbrir={setFicha}
            />
          </section>

          <section className={styles.secao} aria-labelledby="t-ranking">
            <div className={styles.secaoTopo}>
              <h2 id="t-ranking">Todas as peças</h2>
              <label className={styles.ordenar}>
                Ordenar
                <select value={ordem} onChange={(e) => setOrdem(e.target.value as OrdemRanking)}>
                  {ORDENS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nome}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className={styles.grupos} role="img" aria-label={`Os grupos de peças: ${grupos.map((g) => `${NOMES_GRUPOS[g.g]} ${fmtPct(g.f)}`).join(", ")}`}>
              <div className={styles.gruposBarra} aria-hidden>
                {grupos.map((g) => (
                  <span key={g.g} style={{ flexGrow: g.n, "--cor": `var(--peca-${g.g})` } as CSSProperties} title={`${NOMES_GRUPOS[g.g]}: ${fmtPct(g.f)}`} />
                ))}
              </div>
              <ul className={styles.gruposLegenda} aria-hidden>
                {grupos.map((g) => (
                  <li key={g.g} style={{ "--cor": `var(--peca-${g.g})` } as CSSProperties}>
                    {NOMES_GRUPOS[g.g]} <b>{fmtPct(g.f)}</b>
                  </li>
                ))}
              </ul>
            </div>
            <ol className={styles.ranking}>
              {ranking.map((l) => {
                const p = dados.pecas[l.tipo];
                const ultimaOculta = oculto(l.ultima);
                return (
                  <li key={l.tipo} className={styles.linhaRanking}>
                    <Medalha peca={p} />
                    <div className={styles.rankingNome}>
                      <button type="button" className={styles.linkBotao} onClick={() => setFicha(l.tipo)}>
                        {nome(l.tipo)}
                      </button>
                      <span className={styles.grupoPeca} style={{ color: corDoGrupo(p) }}>
                        {p ? NOMES_GRUPOS[p.grupo] : ""}
                      </span>
                    </div>
                    <div className={styles.rankingBarra}>
                      <Barra fracao={l.vezes / maxVezes} cor={corDoGrupo(p)} />
                      <span className={styles.rankingNum}>
                        <b>{l.vezes}</b> {fmtPct(l.fracao)}
                      </span>
                    </div>
                    <QuandoCaiu
                      posicoes={l.posicoes}
                      total={lista.length}
                      cor={corDoGrupo(p)}
                      rotulo={`Caiu em ${l.vezes} dos ${lista.length} exames, do mais antigo (à esquerda) ao mais recente`}
                      dicaDe={(pos) => dicaDoExame(lista[pos]!)}
                    />
                    <p className={styles.rankingMeta}>
                      {l.desdeUltima === 0 ? (
                        "Caiu no exame mais recente"
                      ) : (
                        <>
                          Última:{" "}
                          {ultimaOculta ? null : (
                            <>
                              <Numeral e={l.ultima} />
                              {anoDoExame(l.ultima) ? ` (${anoDoExame(l.ultima)})` : ""},{" "}
                            </>
                          )}
                          há {l.desdeUltima} {l.desdeUltima === 1 ? "exame" : "exames"}
                        </>
                      )}
                      {l.intervaloMedio !== null && ` · volta a cada ${fmtMedia(l.intervaloMedio)} exames, em média`}
                      {l.maiorJejum !== null && l.maiorJejum > 1 && ` · maior intervalo: ${l.maiorJejum}`}
                    </p>
                    <button type="button" className={styles.verExames} onClick={() => filtrarPorPeca(l.tipo)}>
                      Ver {l.vezes === 1 ? "o exame" : `os ${l.vezes} exames`} ↓
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className={styles.secao} aria-labelledby="t-sequencia">
            <h2 id="t-sequencia">A sequência das peças</h2>
            <p className="muted">Um quadrado por exame, do mais antigo ao mais recente, na cor da peça. Toque num exame para ir até ele na lista.</p>
            <div className={styles.sequenciaRolagem}>
              <ol className={styles.sequencia} style={{ "--n": lista.length, "--vao": lista.length > 60 ? "2px" : "3px" } as CSSProperties}>
                {lista.map((e, i) => {
                  const esconder = oculto(e);
                  const pecasTexto = esconder ? "peça oculta" : [...new Set(e.pecas)].map(nome).join(", ");
                  const titulo = `${e.titulo}${anoDoExame(e) ? ` (${anoDoExame(e)})` : ""}: ${pecasTexto}. Ir até ele na lista`;
                  return (
                    <li key={e.id}>
                      <button type="button" onClick={() => irParaExame(e.id)} aria-label={titulo} data-oculto={esconder || undefined} {...dicaDoExame(e, pecasTexto)}>
                        {[...new Set(e.pecas)].map((t) => (
                          <span key={t} style={{ "--cor": corDaPeca(t) } as CSSProperties} />
                        ))}
                      </button>
                      {/* o numeral de cinco em cinco e no último; o que ficaria colado ao último sai */}
                      <span className={styles.sequenciaRotulo} aria-hidden>
                        {(i % 5 === 0 && lista.length - 1 - i >= 3) || i === lista.length - 1 ? <span>{e.numeral}</span> : null}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
            <ul className={styles.legendaPecas} aria-label="As cores da sequência">
              {porVezes.map((l) => (
                <li key={l.tipo} style={{ "--cor": corDaPeca(l.tipo) } as CSSProperties}>
                  {nome(l.tipo)}
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.secao} aria-labelledby="t-dentro">
            <h2 id="t-dentro">O que mais cai dentro da prova</h2>
            {doSite.length === 0 ? (
              <p className="muted">Os exames da OAB/SP não têm a tabela de pontos no site. Escolha a época FGV ou CESPE para ver as teses e os artigos.</p>
            ) : (
              <>
                <p className="muted">
                  Das tabelas de pontos dos {doSite.length} {doSite.length === 1 ? "exame" : "exames"} do filtro que estão no site. Uma tese conta quando aparece na
                  descrição de algum item; um artigo, quando a tabela o cita.
                </p>
                <div className={styles.controlesDentro}>
                  <div className={styles.segmentado} role="group" aria-label="O que mostrar">
                    <button type="button" aria-pressed={dentro === "teses"} onClick={() => setDentro("teses")}>
                      Teses
                    </button>
                    <button type="button" aria-pressed={dentro === "artigos"} onClick={() => setDentro("artigos")}>
                      Artigos e súmulas
                    </button>
                  </div>
                  <div className={styles.segmentado} role="group" aria-label="Parte da prova">
                    {PARTES.map((p) => (
                      <button key={p.id} type="button" aria-pressed={parte === p.id} onClick={() => setParte(p.id)}>
                        {p.nome}
                      </button>
                    ))}
                  </div>
                </div>

                {dentro === "teses" ? (
                  <div className={styles.gruposTeses}>
                    {(Object.keys(NOMES_GRUPOS_TESE) as (keyof typeof NOMES_GRUPOS_TESE)[]).map((g) => {
                      const doGrupo = teses.filter((c) => tesePorId.get(c.id)?.grupo === g);
                      if (!doGrupo.length) return null;
                      return (
                        <div key={g} className={styles.grupoTese}>
                          <h3>{NOMES_GRUPOS_TESE[g]}</h3>
                          <ul className={styles.chips}>
                            {doGrupo.map((c) => (
                              <li key={c.id}>
                                <button type="button" className={styles.chip} aria-pressed={tese === c.id} onClick={() => setTese(tese === c.id ? null : c.id)}>
                                  {tesePorId.get(c.id)?.nome ?? c.id} <span className={styles.chipNum}>{c.exames.length}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                    {tese && (
                      <ResumoEscolha
                        titulo={`${tesePorId.get(tese)?.nome}: em ${teses.find((c) => c.id === tese)?.exames.length ?? 0} exames`}
                        exames={(teses.find((c) => c.id === tese)?.exames ?? []).map((id) => lista.find((e) => e.id === id)!).filter(Boolean)}
                        onIrPara={irParaExame}
                        onVerNaLista={irParaLista}
                        extra={
                          tesePorId.get(tese)?.busca ? (
                            <Link href={`/provas/todos/?tipo=gabarito&versao=original&busca=${encodeURIComponent(tesePorId.get(tese)!.busca!)}`}>Ler nos gabaritos →</Link>
                          ) : null
                        }
                      />
                    )}
                  </div>
                ) : (
                  <>
                    <div className={styles.chips} role="group" aria-label="De onde vem o artigo">
                      <button type="button" className={styles.chip} aria-pressed={origem === null} onClick={() => setOrigem(null)}>
                        Todos
                      </button>
                      {ORIGENS.map((o) => (
                        <button key={o.id} type="button" className={styles.chip} aria-pressed={origem === o.id} onClick={() => setOrigem(origem === o.id ? null : o.id)}>
                          {o.nome}
                        </button>
                      ))}
                    </div>
                    {totalOrigens > 0 && (
                      <p className={styles.origens}>
                        De onde vêm as citações:{" "}
                        {origens.map((o, i) => (
                          <span key={o.origem}>
                            {i > 0 && " · "}
                            {ORIGENS.find((x) => x.id === o.origem)?.nome} <b>{fmtPct(o.n / totalOrigens)}</b>
                          </span>
                        ))}
                      </p>
                    )}
                    <ol className={styles.artigos}>
                      {artigos.slice(0, artigosVistos).map((c, i) => {
                        const aberto = artigoAberto === c.id;
                        const exames = c.exames.map((id) => lista.find((e) => e.id === id)!).filter(Boolean);
                        return (
                          <li key={c.id} className={styles.artigo}>
                            <span className={styles.artigoPos}>{i + 1}</span>
                            <div className={styles.artigoTexto}>
                              {c.artigo.url ? (
                                <LinkArtigo href={c.artigo.url} previa={c.artigo.previa} className={styles.artigoNome}>
                                  {c.artigo.rotulo}
                                </LinkArtigo>
                              ) : (
                                <span className={styles.artigoNome}>{c.artigo.rotulo}</span>
                              )}
                              {c.artigo.resumo && <span className={styles.artigoResumo}>{c.artigo.resumo}</span>}
                            </div>
                            <div className={styles.artigoBarra}>
                              <Barra fracao={c.exames.length / (artigos[0]?.exames.length ?? 1)} cor="var(--primary)" />
                              <button
                                type="button"
                                className={styles.linkBotao}
                                aria-expanded={aberto}
                                onClick={() => setArtigoAberto(aberto ? null : c.id)}
                              >
                                {c.exames.length} {c.exames.length === 1 ? "exame" : "exames"} {aberto ? "▴" : "▾"}
                              </button>
                            </div>
                            {aberto && (
                              <ResumoEscolha
                                exames={exames}
                                onIrPara={irParaExame}
                                onVerNaLista={() => {
                                  setArtigo(c.id);
                                  irParaLista();
                                }}
                              />
                            )}
                          </li>
                        );
                      })}
                    </ol>
                    {artigos.length > artigosVistos && (
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setArtigosVistos((n) => n + ARTIGOS_POR_VEZ)}>
                        Mostrar mais {Math.min(ARTIGOS_POR_VEZ, artigos.length - artigosVistos)} de {artigos.length - artigosVistos}
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </section>
        </>
      )}

      <section className={styles.secao} aria-labelledby="t-lista" ref={listaRef}>
        <div className={styles.secaoTopo}>
          <h2 id="t-lista">Os exames</h2>
          <label className={styles.interruptor}>
            <input type="checkbox" role="switch" checked={ocultar} onChange={(e) => onOcultar(e.target.checked)} />
            <span>Esconder a peça dos exames que ainda não fiz</span>
          </label>
        </div>
        <p className="muted">
          Esta página mostra a peça de cada exame. Se você quer fazer um simulado sem saber a peça, ligue a opção acima: a peça dos simulados que você ainda não fez fica escondida.
        </p>
        <BarraBusca
          b={busca}
          onMudar={(m) => setBusca((b) => ({ ...b, ...m }))}
          extra={
            <>
              <label className={styles.ordenar}>
                Mostrar
                <select value={antigosPrimeiro ? "antigos" : "recentes"} onChange={(e) => setAntigosPrimeiro(e.target.value === "antigos")}>
                  <option value="recentes">Mais recentes primeiro</option>
                  <option value="antigos">Mais antigos primeiro</option>
                </select>
              </label>
              <span className={styles.contagem} aria-live="polite">
                {filtrada.length === lista.length ? `${lista.length} exames` : `${filtrada.length} de ${lista.length} exames`}
                {achados.nosTextos && ` · ${totalAchados} ${totalAchados === 1 ? "achado" : "achados"}`}
              </span>
            </>
          }
        />
        {busca.onde !== "dados" && (
          <p className={styles.estadoBusca} aria-live="polite">
            {achados.estado === "carregando"
              ? "Baixando os textos das provas…"
              : achados.estado === "erro"
                ? "Não foi possível baixar os textos das provas. Confira a conexão e tente de novo."
                : !busca.busca.trim()
                  ? "Digite o que procurar nos textos das provas. Os exames antigos da OAB/SP não têm texto no site."
                  : null}
          </p>
        )}
        {porPeca.length > 0 && <AchadosPorPeca grupos={porPeca} contagem={(id) => (achados.nosTextos ? achados.trechos.get(id)?.total : undefined)} onIr={irNaLista} oculto={oculto} />}
        {filtrosLista.length > 0 && (
          <ul className={styles.filtrosAtivos} aria-label="Filtros da lista">
            {filtrosLista.map((f) => (
              <li key={f.rotulo}>
                <button type="button" onClick={f.limpar} aria-label={`Tirar o filtro ${f.rotulo}`}>
                  {f.rotulo} <span aria-hidden>✕</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {ordenada.length === 0 ? (
          <p className="muted">Nenhum exame com esses filtros.</p>
        ) : (
          <ul className={styles.exames}>
            {ordenada.map((e) => {
              const melhor = pessoais?.melhores.get(e.id);
              const esconder = oculto(e);
              const doExame = artigosDoExame.get(e.id);
              const tesesPeca = e.teses.peca.map((t) => tesePorId.get(t)?.nome).filter(Boolean);
              const artigosPeca = (doExame?.peca ?? []).map((k) => artigoPorChave.get(k)!).filter(Boolean);
              const contagem = new Map<string, number>();
              for (const t of e.pecas) contagem.set(t, (contagem.get(t) ?? 0) + 1);
              return (
                <li key={e.id} id={`exame-${e.id}`} className={styles.exame} data-alvo={alvo === e.id || undefined}>
                  <span className={styles.num} data-antigo={!e.noSite || undefined} {...dicaDoExame(e)}>
                    {e.numeral}
                  </span>
                  <div className={styles.exameInfo}>
                    <p className={styles.exameTitulo}>
                      <strong>{e.titulo}</strong>
                      <span className="muted">
                        {[e.noSite ? `${e.numero}º` : null, anoDoExame(e), e.apelido].filter(Boolean).join(" · ")}
                      </span>
                      <span className={styles.banca}>{nomeEra(e.era)}</span>
                      {e.preliminar && <span className={styles.preliminar}>gabarito preliminar</span>}
                    </p>
                    <div className={styles.examePecas}>
                      {[...contagem].map(([t, n]) => (
                        <SeloPeca key={t} peca={dados.pecas[t]} vezes={n} oculto={esconder} onRevelar={() => revelar(e.id)} />
                      ))}
                      {!esconder && e.pecaNaProva?.includes("(") && <span className="muted">{e.pecaNaProva.replace(/^[^(]*/, "")}</span>}
                    </div>
                    {achados.nosTextos && achados.trechos.get(e.id) && (
                      <TrechosDoExame
                        achado={achados.trechos.get(e.id)!}
                        esconderGabarito={esconder}
                        onRevelar={() => revelar(e.id)}
                        href={e.links.prova}
                        onVer={abrirProva(e.id)}
                      />
                    )}
                    {e.noSite && !esconder && (tesesPeca.length > 0 || artigosPeca.length > 0) && (
                      <details className={styles.exameDetalhes}>
                        <summary>Na tabela de pontos da peça</summary>
                        {tesesPeca.length > 0 && (
                          <p>
                            <span className={styles.rotuloFiltro}>Teses</span> {tesesPeca.join(" · ")}
                          </p>
                        )}
                        {artigosPeca.length > 0 && (
                          <p>
                            <span className={styles.rotuloFiltro}>Artigos</span>{" "}
                            {artigosPeca.map((a, i) => (
                              <span key={a.chave}>
                                {i > 0 && " · "}
                                {a.url ? (
                                  <LinkArtigo href={a.url} previa={a.previa}>
                                    {a.rotulo}
                                  </LinkArtigo>
                                ) : (
                                  a.rotulo
                                )}
                              </span>
                            ))}
                          </p>
                        )}
                      </details>
                    )}
                  </div>
                  <div className={styles.exameAcoes}>
                    {melhor && (
                      <Link
                        href={`/simulados/${e.id}/resultado/?t=${melhor.id}`}
                        className={styles.suaNota}
                        data-estado={melhor.aprovado ? "ok" : "bad"}
                        title={`Sua melhor nota${melhor.vezes > 1 ? ` em ${melhor.vezes} tentativas` : ""}: ver a correção`}
                      >
                        {melhor.aprovado ? "✓" : "✗"} {fmtNota(melhor.total)}
                      </Link>
                    )}
                    {e.noSite ? (
                      <>
                        {e.links.simulado && (
                          <Link className="btn btn-gold btn-sm" href={e.links.simulado}>
                            {melhor ? "Refazer" : "Fazer"} o simulado
                          </Link>
                        )}
                        <span className={styles.linksExame}>
                          {e.links.prova && (
                            <Link href={e.links.prova} onClick={abrirProva(e.id)}>
                              Ver a prova
                            </Link>
                          )}
                          {e.links.caderno && (
                            <a href={e.links.caderno} download>
                              Caderno ⬇
                            </a>
                          )}
                          {e.links.gabarito && (
                            <a href={e.links.gabarito} download>
                              Gabarito ⬇
                            </a>
                          )}
                          {e.links.fgv && (
                            <a href={e.links.fgv} target="_blank" rel="noopener" aria-label={`Página do ${e.titulo} no site da FGV`}>
                              FGV ↗
                            </a>
                          )}
                        </span>
                      </>
                    ) : (
                      <span className="muted">Sem prova no site</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {ficha && dados.pecas[ficha] && (
        <FichaPeca
          key={ficha}
          peca={dados.pecas[ficha]!}
          linha={linhaFicha}
          lista={lista}
          descricaoFiltro={descricaoFiltro}
          onIrPara={(id) => {
            setFicha(null);
            irParaExame(id);
          }}
          onVerNaLista={() => filtrarPorPeca(ficha)}
          onFechar={() => setFicha(null)}
        />
      )}

      {vendo && provaPorId.get(vendo) && (
        <Suspense fallback={null}>
          <VisualizarExame
            exame={provaPorId.get(vendo)!}
            abaInicial="cadernoOriginal"
            paginaDoCaderno={PAGINA_DO_ENUNCIADO}
            navegacao={vizinhos(vendo)}
            onFechar={() => setVendo(null)}
          />
        </Suspense>
      )}
    </>
  );
}

/** "XX" ou, nas reaplicações, "XX PV" (as iniciais do lugar) */
const numeralCurto = (e: ExameEstat) => `${e.numeral}${e.variante ? ` ${e.variante.split(" ").map((p) => p[0]).join("")}` : ""}`;

/**
 * Embaixo da busca, os exames achados separados pela peça, cada grupo na cor dela. Na busca nos textos, o número
 * pequeno em cima do numeral é quantas vezes a busca achou naquele exame. Tocar num exame leva até ele na lista.
 */
function AchadosPorPeca({
  grupos,
  contagem,
  onIr,
  oculto,
}: {
  grupos: { chave: string; nome: string; cor: string; exames: ExameEstat[] }[];
  contagem: (id: string) => number | undefined;
  onIr: (id: string) => void;
  oculto: (e: ExameEstat) => boolean;
}) {
  return (
    <ul className={styles.achadosPorPeca} aria-label="Os exames achados, por peça">
      {grupos.map((g) => (
        <li key={g.chave} style={{ "--cor": g.cor } as CSSProperties} data-escondida={g.chave === "?" || undefined}>
          <span className={styles.achadosPeca}>
            {g.nome} <span className={styles.chipNum}>{g.exames.length}</span>
          </span>
          <span className={styles.achadosNums}>
            {g.exames.map((e) => {
              const n = contagem(e.id);
              const achou = n ? `${n} ${n === 1 ? "achado" : "achados"}` : null;
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => onIr(e.id)}
                  aria-label={`${e.titulo}${achou ? `, ${achou}` : ""}: ir até ele na lista`}
                  {...dicaDoExame(e, oculto(e) ? "peça oculta" : null, n ? `a busca achou ${n} ${n === 1 ? "vez" : "vezes"} nele` : null)}
                >
                  {numeralCurto(e)}
                  {n ? <sup>{n}</sup> : null}
                </button>
              );
            })}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Os exames de uma tese ou de um artigo, como botões que levam a cada um na lista. */
function ResumoEscolha({
  titulo,
  exames,
  onIrPara,
  onVerNaLista,
  extra,
}: {
  titulo?: string;
  exames: ExameEstat[];
  onIrPara: (id: string) => void;
  onVerNaLista: () => void;
  extra?: ReactNode;
}) {
  return (
    <div className={styles.escolha}>
      {titulo && <p className={styles.escolhaTitulo}>{titulo}</p>}
      <ul className={styles.chipsExames}>
        {[...exames].reverse().map((e) => (
          <li key={e.id}>
            <button type="button" onClick={() => onIrPara(e.id)} aria-label={`${e.titulo}: ir até ele na lista`} {...dicaDoExame(e)}>
              {numeralCurto(e)}
            </button>
          </li>
        ))}
      </ul>
      <p className={styles.escolhaAcoes}>
        <button type="button" className={styles.linkBotao} onClick={onVerNaLista}>
          Ver na lista de exames ↓
        </button>
        {extra}
      </p>
    </div>
  );
}
