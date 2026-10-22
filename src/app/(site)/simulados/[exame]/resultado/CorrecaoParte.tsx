"use client";

import { type ReactNode, type RefObject, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { linkifica } from "@/components/Citacoes";
import { RichText, type TrechoGrifado } from "@/components/RichText";
import type { Componente, Item } from "@/content/schema";
import { contextoCorrecao } from "@/lib/correcao/cliente";
import type { ResultadoParte } from "@/lib/correcao/grader";
import { gabaritoComenta, marcasDoComponente, type Marca } from "@/lib/correcao/marcas";
import { type CriterioRetirado, criteriosPontuados, gerarRecursoDiferente } from "@/lib/correcao/recurso";
import { copiarTexto } from "@/lib/copiar";
import { fmtNota } from "@/lib/formato";
import { gravarJSON, lerJSON } from "@/lib/storage";
import styles from "./resultado.module.css";
import c from "./correcao.module.css";

// ---------- a disposição da correção (lembrada). O ✂ "retirar pontuação" não é salvo: fica na página, e cada simulado começa sem ----------

type Layout = "lado" | "coluna";
const K_PREFS = "grifo:correcao";
const EVENTO_PREFS = "grifo:correcao-prefs";

// As leituras devolvem valores primitivos (o useSyncExternalStore compara por valor).
const lerLayout = (): Layout => (lerJSON<{ layout?: string }>(K_PREFS, {}).layout === "coluna" ? "coluna" : "lado");
function gravarLayout(layout: Layout) {
  // grava só a disposição: qualquer valor antigo de outras preferências (como o ✂ de antes) sai junto
  gravarJSON(K_PREFS, { layout });
  window.dispatchEvent(new Event(EVENTO_PREFS));
}
function assinarPrefs(aoMudar: () => void) {
  window.addEventListener(EVENTO_PREFS, aoMudar);
  return () => window.removeEventListener(EVENTO_PREFS, aoMudar);
}

const TITULO_RETIRAR =
  "Retirar pontuação: corte (✂) os critérios que a tabela pontuou. O corte sai da pontuação e entra no recurso automático. Não fica salvo: vale só nesta correção.";

/**
 * A barra de controles da correção, uma só para todas as peças e questões: a disposição (lembrada) e o ✂ de retirar
 * pontuação (só nesta visita). Fica no topo da correção, transparente, e acompanha a rolagem; o mouse por cima a torna opaca.
 */
export function PainelCorrecao({ retirar, onRetirar }: { retirar: boolean; onRetirar: () => void }) {
  const layout = useSyncExternalStore(assinarPrefs, lerLayout, (): Layout => "lado");
  return (
    <div className={c.barraSlot}>
      <div className={c.painel} role="toolbar" aria-label="Controles da correção">
        <div className={c.segmento} role="group" aria-label="Disposição da correção">
          <button type="button" aria-label="Lado a lado" title="Lado a lado: a resposta ao lado da tabela" aria-pressed={layout === "lado"} onClick={() => gravarLayout("lado")}>
            ▤
          </button>
          <button type="button" aria-label="Em coluna" title="Em coluna: a resposta acima da tabela" aria-pressed={layout === "coluna"} onClick={() => gravarLayout("coluna")}>
            ▥
          </button>
        </div>
        <button type="button" role="switch" aria-checked={retirar} aria-label="Retirar pontuação" title={TITULO_RETIRAR} className={c.ferramenta} onClick={onRetirar}>
          ✂
        </button>
      </div>
    </div>
  );
}

/** Os rótulos das laterais da página (o exame, a fase e a matéria): discretos, na vertical, só nas telas largas. */
export function RotulosLaterais({ texto }: { texto: string }) {
  return (
    <>
      <p className={`${c.lateral} ${c.lateralEsquerda}`} aria-hidden>
        {texto}
      </p>
      <p className={`${c.lateral} ${c.lateralDireita}`} aria-hidden>
        {texto}
      </p>
    </>
  );
}

// ---------- a correção de uma parte ----------

/** A coluna do número do item: a menor largura que cabe, sem ganhar espaço da descrição (o estilo global da tabela venceria a classe). */
const COLUNA_ITEM = { width: "1%", whiteSpace: "nowrap" as const, padding: "0 0.35rem" };

/** Chave de um critério dentro da parte (o número do item e o id do critério). */
const chaveDe = (n: string, id: string) => `${n}|${id}`;

interface Props {
  parte: ResultadoParte;
  /** a definição da parte no exame: os termos e os dispositivos de cada critério */
  itens: Item[];
  enunciado: string;
  gabarito?: string;
  resposta: string;
  aplicacao?: string;
  ia?: { n: string; componentes: { id: string; obtido: number; justificativa: string }[] }[];
  /** o ✂ "retirar pontuação" da barra de controles (vale para todas as partes) */
  retirar: boolean;
  /** os critérios cortados em todas as partes, pela chave de `chaveCorte` */
  cortados: ReadonlySet<string>;
  onAlternarCorte: (chave: string) => void;
}

const COPIAR_ESTILO = ["fontFamily", "fontSize", "fontWeight", "fontStyle", "letterSpacing", "lineHeight", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth"] as const;

/** A altura (em px, dentro da área de texto) em que começa o caractere `indice`: mede com um espelho do texto, de mesmo estilo. */
function alturaDoCaractere(area: HTMLTextAreaElement, indice: number): number {
  const estilo = getComputedStyle(area);
  const espelho = document.createElement("div");
  for (const p of COPIAR_ESTILO) espelho.style[p] = estilo[p];
  Object.assign(espelho.style, {
    position: "absolute", top: "0", left: "-9999px", visibility: "hidden", whiteSpace: "pre-wrap", overflowWrap: "break-word",
    boxSizing: "border-box", width: `${area.clientWidth}px`,
  });
  espelho.append(area.value.slice(0, indice));
  const marcador = document.createElement("span");
  marcador.textContent = area.value.slice(indice);
  espelho.append(marcador);
  document.body.append(espelho);
  const altura = marcador.offsetTop;
  espelho.remove();
  return altura;
}

/** Se o elemento não aparece na tela, rola a página até ele (no modo em coluna, a resposta pode estar acima da tabela). */
function trazerParaTela(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  if (r.bottom < 120 || r.top > window.innerHeight - 120) window.scrollTo({ top: window.scrollY + r.top - 120, behavior: "smooth" });
}

/**
 * A correção de uma peça ou questão: a resposta, com o recurso automático logo abaixo quando há cortes, o enunciado, a
 * tabela da FGV e o gabarito comentado. Com ✂ ligado, cada critério pontuado ganha o corte, que o põe no recurso.
 */
export function CorrecaoParte({ parte, itens, enunciado, gabarito, resposta, aplicacao, ia, retirar, cortados, onAlternarCorte }: Props) {
  const ctx = useMemo(() => contextoCorrecao(), []);
  const layout = useSyncExternalStore(assinarPrefs, lerLayout, (): Layout => "lado");
  const [ativos, setAtivos] = useState<ReadonlySet<string>>(() => new Set());
  // o critério destacado no recurso (a marcação que some em fade); a chave diz a que conjunto de cortes ele pertence
  const [destaque, setDestaque] = useState<{ criterio: string; seq: number; chave: string } | null>(null);
  const respostaRef = useRef<HTMLDivElement>(null);
  const recursoRef = useRef<HTMLTextAreaElement>(null);
  const linhas = useMemo(() => resposta.split("\n"), [resposta]);
  const linhasEnunciado = useMemo(() => enunciado.split("\n"), [enunciado]);

  // o corte é global, mas cada parte tem os seus: a chave leva o nome da parte
  const chaveCorte = (chave: string) => `${parte.parte}|${chave}`;
  const cortadoAqui = (chave: string) => retirar && cortados.has(chaveCorte(chave));

  // a definição de cada critério que pontuou, e onde a resposta o comprova
  const marcas = useMemo(() => {
    const m = new Map<string, Marca[]>();
    for (const it of parte.itens) {
      const def = itens.find((x) => x.n === it.n);
      for (const comp of it.componentes) {
        const d = def?.componentes.find((x) => x.id === comp.id) as Componente | undefined;
        if (comp.obtido > 0 && d) m.set(chaveDe(it.n, comp.id), marcasDoComponente(d, linhas, ctx));
      }
    }
    return m;
  }, [parte, itens, linhas, ctx]);

  // o mesmo critério no enunciado: o grifo de acerto também aparece nele
  const marcasEnunciado = useMemo(() => {
    const m = new Map<string, TrechoGrifado[]>();
    for (const it of parte.itens) {
      const def = itens.find((x) => x.n === it.n);
      for (const comp of it.componentes) {
        const d = def?.componentes.find((x) => x.id === comp.id) as Componente | undefined;
        if (comp.obtido > 0 && d) m.set(chaveDe(it.n, comp.id), marcasDoComponente(d, linhasEnunciado, ctx));
      }
    }
    return m;
  }, [parte, itens, linhasEnunciado, ctx]);
  const grifosEnunciado = useMemo(() => [...ativos].flatMap((k) => marcasEnunciado.get(k) ?? []), [ativos, marcasEnunciado]);

  // os parágrafos do gabarito e, para cada um, os critérios que pontuaram e que ele comenta
  const paragrafos = useMemo(() => (gabarito ? gabarito.trim().split(/\n\s*\n/) : []), [gabarito]);
  const comentados = useMemo(
    () =>
      paragrafos.map((p) => {
        const chaves = new Set<string>();
        for (const it of parte.itens) {
          const def = itens.find((x) => x.n === it.n);
          for (const comp of it.componentes) {
            const d = def?.componentes.find((x) => x.id === comp.id);
            if (comp.obtido > 0 && d && gabaritoComenta(d, p, ctx)) chaves.add(chaveDe(it.n, comp.id));
          }
        }
        return chaves;
      }),
    [paragrafos, parte, itens, ctx],
  );

  // as marcas da resposta que estão ativas agora, por linha (parágrafo)
  const destaques = useMemo(() => {
    const porLinha = new Map<number, Marca[]>();
    for (const chave of ativos) for (const m of marcas.get(chave) ?? []) porLinha.set(m.linha, [...(porLinha.get(m.linha) ?? []), m]);
    return porLinha;
  }, [ativos, marcas]);

  // o que pode ser cortado: só os critérios que a tabela pontuou (✓); o corte vai para o recurso
  const criterios = useMemo(() => criteriosPontuados(parte, itens, linhas, ctx), [parte, itens, linhas, ctx]);
  const criterioPorChave = useMemo(() => new Map(criterios.map((r) => [chaveDe(r.n, r.id), r])), [criterios]);
  // os cortes desta parte. Ficam guardados mesmo com o ✂ desligado (o recurso some, mas volta com o texto que tinha)
  const criteriosCortados = useMemo(
    () => criterios.filter((r) => cortados.has(`${parte.parte}|${chaveDe(r.n, r.id)}`)),
    [criterios, cortados, parte.parte],
  );
  const recursoVisivel = retirar && criteriosCortados.length > 0;
  const chaveRecurso = criteriosCortados.map((r) => chaveDe(r.n, r.id)).sort().join(",");
  const destaqueVigente = destaque && destaque.chave === chaveRecurso ? destaque : undefined;

  const ativar = (chaves: Iterable<string>) => setAtivos(new Set(chaves));
  const desativar = () => setAtivos(new Set());

  /**
   * Clicar num item da tabela: rola a resposta até o trecho que pontuou. Se o item foi recortado e o recurso está na tela,
   * rola também o recurso até o critério. Se a resposta não aparece (no modo em coluna), a página vai até ela.
   */
  const irParaItem = (n: string, chaves: string[]) => {
    const caixa = respostaRef.current;
    const linha = chaves.flatMap((k) => marcas.get(k) ?? []).map((m) => m.linha).sort((a, b) => a - b)[0];
    const alvo = linha !== undefined && caixa ? caixa.querySelector<HTMLElement>(`[data-linha="${linha}"]`) : null;
    if (caixa && alvo) {
      // a distância medida na tela: independe de qual elemento é o "offsetParent" do parágrafo
      const distancia = alvo.getBoundingClientRect().top - caixa.getBoundingClientRect().top;
      caixa.scrollTo({ top: caixa.scrollTop + distancia - caixa.clientHeight / 3, behavior: "smooth" });
      trazerParaTela(caixa);
    }
    const cortado = recursoVisivel ? criteriosCortados.find((r) => r.n === n) : undefined;
    const area = recursoRef.current;
    if (cortado && area) {
      const indice = area.value.indexOf(`“${cortado.criterio}”`);
      if (indice >= 0) area.scrollTo({ top: Math.max(0, alturaDoCaractere(area, indice) - area.clientHeight / 3), behavior: "smooth" });
      // além da rolagem, o parágrafo do critério ganha uma marcação que some em fade; cada clique a reinicia
      setDestaque((atual) => ({ criterio: cortado.criterio, seq: (atual?.seq ?? 0) + 1, chave: chaveRecurso }));
    }
  };

  // a coluna da resposta: a resposta e, logo abaixo, o recurso automático (aparece com o primeiro corte)
  const caixaEl = (
    <div className={recursoVisivel ? `${c.coluna} ${c.colunaComRecurso}` : c.coluna}>
      <div ref={respostaRef} className={c.resposta} aria-label="Sua resposta">
        <p className={c.rotuloResposta}>Sua resposta</p>
        {resposta.trim() ? (
          linhas.map((linha, k) => <Paragrafo key={k} indice={k} linha={linha} marcas={destaques.get(k) ?? []} data={aplicacao} />)
        ) : (
          <p className="muted">Você não escreveu nada nesta parte.</p>
        )}
      </div>
      {criteriosCortados.length > 0 && (
        <div className={c.recurso} aria-label="Recurso automático" style={recursoVisivel ? undefined : { display: "none" }}>
          <RecursoParte
            key={chaveRecurso}
            titulo={parte.titulo}
            criterios={criteriosCortados}
            areaRef={recursoRef}
            destaque={destaqueVigente}
          />
        </div>
      )}
    </div>
  );

  const enunciadoEl = (
    <section className={c.secao}>
      <h4>Enunciado</h4>
      <RichText text={enunciado} data={aplicacao} grifos={grifosEnunciado} classeGrifo={c.marca} classeLinha={c.linhaEnunciado} />
    </section>
  );

  const tabelaEl = (
    <section className={c.secao}>
      <h4>Tabela de correção</h4>
      <p className={c.dica}>
        Passe o mouse num item ou num critério para ver o que concedeu o ponto. Clique numa linha para levar a resposta até ele.
      </p>
      <table className={styles.tabela} data-tabela-correcao>
        <thead>
          <tr>
            <th scope="col" className={c.colItem} style={COLUNA_ITEM}>
              Item
            </th>
            <th scope="col">O que a banca pedia</th>
            <th scope="col" className={styles.num}>
              Pontos
            </th>
          </tr>
        </thead>
        <tbody>
          {parte.itens.map((it) => {
            const itemIA = ia?.find((x) => x.n === it.n);
            const chavesItem = it.componentes.filter((x) => x.obtido > 0).map((x) => chaveDe(it.n, x.id));
            return (
              <tr
                key={it.n}
                className={`${it.obtido === it.valor ? styles.cheio : it.obtido === 0 ? styles.zero : styles.parcial} ${chavesItem.some((k) => ativos.has(k)) ? c.linhaAtiva : ""}`}
                onMouseEnter={() => chavesItem.length && ativar(chavesItem)}
                onMouseLeave={desativar}
                onClick={() => irParaItem(it.n, chavesItem)}
              >
                <td className={`${styles.itemN} ${c.colItem}`} style={COLUNA_ITEM}>{it.n}</td>
                <td>
                  {it.secao && <span className={styles.secao}>{it.secao}</span>}
                  {/* os critérios dizem o que o item pede: a descrição só aparece quando o item não tem critérios (anulado) */}
                  {it.componentes.length === 0 && <p className={styles.desc}>{it.descricao}</p>}
                  <ul className={styles.comps}>
                    {it.componentes.map((comp) => {
                      const cIA = itemIA?.componentes.find((x) => x.id === comp.id);
                      const chave = chaveDe(it.n, comp.id);
                      const trechos = (marcas.get(chave) ?? []).map((m) => linhas[m.linha]!.slice(m.ini, m.fim));
                      const pontuou = comp.obtido > 0;
                      const cortado = cortadoAqui(chave);
                      const podeCortar = retirar && pontuou && criterioPorChave.has(chave);
                      return (
                        <li
                          key={comp.id}
                          // com o ✂, o marcador ganha a largura do seu conteúdo (o texto não pode ser empurrado por cima)
                          style={podeCortar ? { gridTemplateColumns: "auto minmax(0, 1fr)" } : undefined}
                          className={`${pontuou ? styles.hit : styles.miss} ${ativos.has(chave) ? c.compAtivo : ""} ${pontuou ? c.comentado : ""} ${cortado ? c.compRetirado : ""}`}
                          onMouseEnter={() => pontuou && ativar([chave])}
                          onMouseLeave={desativar}
                        >
                          <span className={c.marcador}>
                            {podeCortar && (
                              <button
                                type="button"
                                className={c.btnCortar}
                                aria-pressed={cortado}
                                title={
                                  cortado
                                    ? "Desfazer o corte: este critério volta à pontuação e sai do recurso"
                                    : "Retirar pontos deste critério: ele sai da pontuação e entra no recurso automático"
                                }
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAlternarCorte(chaveCorte(chave));
                                }}
                              >
                                ✂
                              </button>
                            )}
                            <span className={styles.icon} aria-hidden>
                              {!pontuou ? "✗" : cortado ? <span className={c.sinalCorte}>−</span> : "✓"}
                            </span>
                          </span>
                          <span>
                            <strong>{comp.rotulo}</strong> <span className="muted">({fmtNota(comp.valor)})</span>
                            {cortado && <span className={c.selo}>Pontuação retirada</span>}
                            {pontuou && trechos.length > 0 && (
                              <span className={c.evidencia}>
                                “{trechos.flatMap((t, i) => [i > 0 ? " … " : "", ...linkifica(t, `e${i}`, aplicacao)])}”
                              </span>
                            )}
                            {!pontuou && comp.bloqueadoPor && (
                              <span className={styles.falta}>Só pontua junto com “{comp.bloqueadoPor}” (a mera citação do dispositivo não pontua).</span>
                            )}
                            {!pontuou && !comp.bloqueadoPor && comp.faltou.length > 0 && (
                              <span className={styles.falta}>Não encontramos: {comp.faltou.join("; ")}</span>
                            )}
                            {cIA && (
                              <span className={styles.iaNote}>
                                IA: {fmtNota(cIA.obtido)} · {cIA.justificativa}
                              </span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </td>
                <td className={styles.num}>
                  {fmtNota(it.obtido)}/{fmtNota(it.valor)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );

  const gabaritoEl = gabarito ? (
    <section className={c.secao}>
      <h4>Gabarito comentado da FGV</h4>
      <p className={c.dica}>Passe o mouse num parágrafo que comenta um critério: a resposta e o enunciado mostram o trecho que pontuou.</p>
      {paragrafos.map((p, k) => {
        const chaves = comentados[k]!;
        const comenta = chaves.size > 0;
        return (
          <div
            key={k}
            className={`${c.gabPar} ${comenta ? c.gabComenta : ""} ${comenta && [...chaves].some((x) => ativos.has(x)) ? c.gabAtivo : ""}`}
            onMouseEnter={() => comenta && ativar(chaves)}
            onMouseLeave={desativar}
          >
            <RichText text={p} data={aplicacao} />
          </div>
        );
      })}
    </section>
  ) : null;

  return layout === "lado" ? (
    <div className={c.lado}>
      {caixaEl}
      <div>
        {enunciadoEl}
        {tabelaEl}
        {gabaritoEl}
      </div>
    </div>
  ) : (
    <div>
      {caixaEl}
      {enunciadoEl}
      {tabelaEl}
      {gabaritoEl}
    </div>
  );
}

/** Os ícones das ações do recurso: traço fino, no tamanho do texto. */
const IconeCopiar = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
const IconeConferido = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
const IconeRefazer = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
  </svg>
);

/** Uma ação do recurso: o ícone, e o texto que aparece ao passar o mouse (ou ao focar, ou na confirmação). */
function AcaoRecurso({ rotulo, icone, revelado, onClick }: { rotulo: string; icone: ReactNode; revelado?: boolean; onClick: () => void }) {
  return (
    <button type="button" className={c.acaoRecurso} aria-label={rotulo} data-revelado={revelado ? "1" : undefined} onClick={onClick}>
      {icone}
      <span className={c.acaoTexto} aria-hidden>
        {rotulo}
      </span>
    </button>
  );
}

/** O recurso automático: o texto dos critérios cortados, editável. Copiar e outra redação ficam no cabeçalho, como ícones. */
function RecursoParte({
  titulo,
  criterios,
  areaRef,
  destaque,
}: {
  titulo: string;
  criterios: CriterioRetirado[];
  areaRef: RefObject<HTMLTextAreaElement | null>;
  /** o critério a destacar no texto; o número muda a cada clique, para a marcação recomeçar */
  destaque?: { criterio: string; seq: number };
}) {
  const [texto, setTexto] = useState(() => gerarRecursoDiferente(titulo, criterios, Math.random));
  const [aviso, setAviso] = useState<"copiado" | "falha" | null>(null);
  // a cópia do texto por baixo da área de texto: é onde a marcação aparece (a área de texto fica transparente por cima)
  const fundoRef = useRef<HTMLDivElement>(null);
  // a confirmação da cópia some sozinha, para não ocupar espaço
  useEffect(() => {
    if (!aviso) return;
    const pausa = setTimeout(() => setAviso(null), 2000);
    return () => clearTimeout(pausa);
  }, [aviso]);
  const outra = () => setTexto((atual) => gerarRecursoDiferente(titulo, criterios, Math.random, atual));
  const copiar = async () => setAviso((await copiarTexto(texto)) ? "copiado" : "falha");
  const sincronizar = (area: HTMLTextAreaElement) => {
    if (fundoRef.current) fundoRef.current.scrollTop = area.scrollTop;
  };
  // o parágrafo do critério destacado: da linha inteira (sem marcação se o texto já não traz o critério)
  let faixa: { ini: number; fim: number } | null = null;
  if (destaque) {
    const i = texto.indexOf(`“${destaque.criterio}”`);
    if (i >= 0) {
      const quebra = texto.indexOf("\n", i);
      faixa = { ini: texto.lastIndexOf("\n", i) + 1, fim: quebra < 0 ? texto.length : quebra };
    }
  }
  return (
    <>
      <div className={c.cabecalhoRecurso}>
        <div className={c.acoesRecurso}>
          <AcaoRecurso
            rotulo={aviso === "copiado" ? "Copiado" : aviso === "falha" ? "Selecione e copie" : "Copiar recurso"}
            icone={aviso === "copiado" ? <IconeConferido /> : <IconeCopiar />}
            revelado={aviso !== null}
            onClick={copiar}
          />
          <AcaoRecurso rotulo="Outra redação" icone={<IconeRefazer />} onClick={outra} />
        </div>
        <p className={c.rotuloResposta}>
          Recurso automático <span className={c.contagem}>{criterios.length}</span>
        </p>
      </div>
      <div className={c.recursoCampo}>
        <div ref={fundoRef} className={`${c.recursoMedidas} ${c.recursoFundo}`} aria-hidden>
          {faixa ? (
            <>
              {texto.slice(0, faixa.ini)}
              <mark key={destaque?.seq} className={c.marcaRecurso}>
                {texto.slice(faixa.ini, faixa.fim)}
              </mark>
              {texto.slice(faixa.fim)}
            </>
          ) : (
            texto
          )}
          {"\u200b"}
        </div>
        <textarea
          ref={areaRef}
          className={`${c.recursoMedidas} ${c.recursoTexto}`}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            sincronizar(e.currentTarget);
          }}
          onScroll={(e) => sincronizar(e.currentTarget)}
          aria-label="Texto do recurso"
        />
      </div>
      <span role="status" className={c.soLeitura}>
        {aviso === "copiado" ? "Recurso copiado." : aviso === "falha" ? "Não consegui copiar: selecione o texto e copie." : ""}
      </span>
    </>
  );
}

/** Um parágrafo da resposta; as palavras que pontuaram ficam marcadas, e o parágrafo inteiro é realçado. */
function Paragrafo({ indice, linha, marcas, data }: { indice: number; linha: string; marcas: Marca[]; data?: string }) {
  if (!linha.trim()) return <p className={c.paragrafo} data-linha={indice}>&nbsp;</p>;
  const ordenadas = [...marcas].sort((a, b) => a.ini - b.ini);
  const partes: ReactNode[] = [];
  let pos = 0;
  ordenadas.forEach((m, k) => {
    if (m.ini < pos) return;
    partes.push(...linkifica(linha.slice(pos, m.ini), `t${k}`, data));
    partes.push(
      <mark key={k} className={c.marca}>
        {linkifica(linha.slice(m.ini, m.fim), `m${k}`, data)}
      </mark>,
    );
    pos = m.fim;
  });
  partes.push(...linkifica(linha.slice(pos), "fim", data));
  return (
    <p className={c.paragrafo} data-linha={indice} data-destacada={ordenadas.length ? "1" : "0"}>
      {partes}
    </p>
  );
}
