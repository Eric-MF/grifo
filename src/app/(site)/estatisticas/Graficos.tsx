"use client";

// Peças visuais da página de estatísticas: barras, o selo da peça, o medalhão do artigo, as bolinhas de "quando caiu",
// o gráfico das notas e o calendário de estudo. Tudo em HTML e SVG, nas cores dos temas.
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { fmtNota } from "@/lib/formato";
import { lerJSON, gravarJSON } from "@/lib/storage";
import type { Calendario, DiaCalendario } from "@/lib/estatisticas/desempenho";
import { dica, detalheDoExame, exameEmAlgarismos } from "@/lib/estatisticas/rotulos";
import { nomeEra, type ExameEstat, type PecaInfo, type PreviaArtigo } from "@/lib/estatisticas/tipos";
import styles from "./estatisticas.module.css";

export const corDoGrupo = (p: PecaInfo | undefined) => `var(--peca-${p?.grupo ?? "recurso"})`;

/** Barra horizontal de 0 a 1, na cor dada (padrão: o degradê azul-ouro das notas). */
export function Barra({ fracao, cor, rotulo, fina }: { fracao: number; cor?: string; rotulo?: string; fina?: boolean }) {
  const f = Math.max(0, Math.min(1, fracao));
  return (
    <span
      className={`${styles.barra} ${fina ? styles.barraFina : ""}`}
      role={rotulo ? "img" : undefined}
      aria-label={rotulo}
      aria-hidden={rotulo ? undefined : true}
      style={cor ? ({ "--cor": cor } as CSSProperties) : undefined}
    >
      <span style={{ width: `${f * 100}%` }} data-cor={cor ? "" : undefined} />
    </span>
  );
}

/** O selo com o nome da peça, na cor do grupo. `oculto`: a peça escondida (exame que a pessoa ainda não fez). */
export function SeloPeca({
  peca,
  vezes,
  oculto,
  onRevelar,
  children,
}: {
  peca: PecaInfo | undefined;
  vezes?: number;
  oculto?: boolean;
  onRevelar?: () => void;
  children?: ReactNode;
}) {
  if (oculto)
    return (
      <button type="button" className={`${styles.selo} ${styles.seloOculto}`} onClick={onRevelar} title="Mostrar a peça deste exame">
        Peça oculta · mostrar
      </button>
    );
  return (
    <span className={styles.selo} style={{ "--cor": corDoGrupo(peca) } as CSSProperties}>
      {peca?.nome ?? "—"}
      {vezes && vezes > 1 ? <span className={styles.seloVezes}>×{vezes}</span> : null}
      {children}
    </span>
  );
}

/** O número do artigo em que a peça se apoia, num medalhão ("593 · CPP"). */
export function Medalha({ peca }: { peca: PecaInfo | undefined }) {
  const f = peca?.fundamentos[0]?.texto ?? "";
  const m = f.match(/^Art\. (\d+(?:-[A-Z])?)º?.*?\b(CPP|CP|CF|LEP|CPC)\b/);
  return (
    <span className={styles.medalha} style={{ "--cor": corDoGrupo(peca) } as CSSProperties} aria-hidden>
      <b data-longo={(m?.[1]?.length ?? 0) > 3 || undefined}>{m?.[1] ?? "§"}</b>
      <small>{m?.[2] ?? ""}</small>
    </span>
  );
}

/** A dica de um exame: o número em algarismos ("45º Exame") em destaque, e embaixo o nome, a data, a banca e o `mais`. */
export const dicaDoExame = (e: ExameEstat, ...mais: (string | null | undefined | false)[]) =>
  dica(exameEmAlgarismos(e), detalheDoExame(e, nomeEra(e.era)), ...mais);

/** O numeral do exame ("XLV") no meio do texto, com a dica do número em algarismos ao passar o mouse. */
export function Numeral({ e, mais, children }: { e: ExameEstat; mais?: string; children?: ReactNode }) {
  return (
    <span className={styles.numeral} {...dicaDoExame(e, mais)}>
      {children ?? e.numeral}
    </span>
  );
}

/**
 * O link de um artigo ou súmula citado: abre a prévia do texto (o pop-up dos links de artigo, src/components/leis/
 * PopupArtigos.tsx) com o mouse por cima e com o clique, como dentro das leis; "Abrir artigo", na prévia, vai ao leitor.
 */
export function LinkArtigo({ href, previa, className, children }: { href: string; previa?: PreviaArtigo; className?: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} data-lei={previa?.lei} data-art={previa?.art} data-disp={previa?.disp}>
      {children}
    </a>
  );
}

/** As vezes em que a peça caiu, como bolinhas ao longo dos exames da lista (o mais antigo à esquerda). `dicaDe`: a
 * dica de cada bolinha (o exame), com o mouse por cima ou segurando o dedo. */
export function QuandoCaiu({
  posicoes,
  total,
  cor,
  rotulo,
  dicaDe,
}: {
  posicoes: number[];
  total: number;
  cor: string;
  rotulo: string;
  dicaDe?: (posicao: number) => ReturnType<typeof dica>;
}) {
  return (
    <span className={styles.trilhaPontos} style={{ "--cor": cor } as CSSProperties} role="img" aria-label={rotulo}>
      {posicoes.map((p) => (
        <span key={p} style={{ left: `${total > 1 ? (p / (total - 1)) * 100 : 50}%` }} {...dicaDe?.(p)} />
      ))}
    </span>
  );
}

/** A largura de um elemento, acompanhando a tela (0 enquanto está escondido). */
export function useLargura<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [largura, setLargura] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setLargura(Math.round(e!.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, largura] as const;
}

export interface PontoNota {
  id: string;
  valor: number;
  aprovado?: boolean;
  /** o que aparece embaixo do ponto (o numeral do exame) */
  rotulo: string;
  /** a frase da dica e do leitor de tela */
  descricao: string;
  href: string;
}

/** O gráfico das notas: uma linha com um ponto por simulado, a linha de corte e o eixo de 0 ao máximo. */
export function GraficoNotas({ pontos, maximo, corte, legenda }: { pontos: PontoNota[]; maximo: number; corte?: number; legenda: string }) {
  const [ref, largura] = useLargura<HTMLDivElement>();
  const [ativo, setAtivo] = useState<number | null>(null);
  const altura = 230;
  const m = { esq: 34, dir: 14, topo: 14, base: 34 };
  const w = Math.max(0, largura - m.esq - m.dir);
  const h = altura - m.topo - m.base;
  const x = (i: number) => m.esq + (pontos.length > 1 ? (i / (pontos.length - 1)) * w : w / 2);
  const y = (v: number) => m.topo + h - (Math.max(0, Math.min(maximo, v)) / maximo) * h;
  const passo = maximo > 5 ? 2 : 1;
  const marcas = Array.from({ length: Math.floor(maximo / passo) + 1 }, (_, i) => i * passo);
  // com muitos pontos, o rótulo sai de tantos em tantos
  const cada = Math.max(1, Math.ceil(pontos.length / Math.max(1, Math.floor(w / 46))));
  const caminho = pontos.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(" ");
  const a = ativo === null ? null : pontos[ativo];
  return (
    <div className={styles.grafico} ref={ref}>
      {largura > 0 && (
        <svg width={largura} height={altura} role="img" aria-label={legenda}>
          {marcas.map((v) => (
            <g key={v}>
              <line x1={m.esq} x2={m.esq + w} y1={y(v)} y2={y(v)} className={styles.grade} />
              <text x={m.esq - 8} y={y(v) + 4} textAnchor="end" className={styles.eixo}>
                {v}
              </text>
            </g>
          ))}
          {corte !== undefined && (
            <g>
              <line x1={m.esq} x2={m.esq + w} y1={y(corte)} y2={y(corte)} className={styles.corte} />
              <text x={m.esq + w} y={y(corte) - 6} textAnchor="end" className={styles.corteTexto}>
                aprovação {fmtNota(corte)}
              </text>
            </g>
          )}
          <path d={caminho} className={styles.linhaNotas} />
          {pontos.map((p, i) => (
            <a
              key={p.id}
              href={p.href}
              aria-label={p.descricao}
              onMouseEnter={() => setAtivo(i)}
              onMouseLeave={() => setAtivo(null)}
              onFocus={() => setAtivo(i)}
              onBlur={() => setAtivo(null)}
            >
              <circle cx={x(i)} cy={y(p.valor)} r={ativo === i ? 7 : 5} className={styles.ponto} data-estado={p.aprovado === undefined ? undefined : p.aprovado ? "ok" : "bad"} />
              {/* área de toque maior que o ponto */}
              <circle cx={x(i)} cy={y(p.valor)} r={14} fill="transparent" />
              {i % cada === 0 || i === pontos.length - 1 ? (
                <text x={x(i)} y={altura - 12} textAnchor="middle" className={styles.eixo}>
                  {p.rotulo}
                </text>
              ) : null}
            </a>
          ))}
        </svg>
      )}
      {a && (
        <span className={styles.dicaGrafico} style={{ left: x(ativo!), top: y(a.valor) }} aria-hidden>
          {a.descricao}
        </span>
      )}
    </div>
  );
}

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const DIAS_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const CHAVE_CALENDARIO = "grifo:estatisticas:calendario";

const partes = (dia: string) => dia.split("-").map(Number) as [number, number, number];
const semanaDe = (dia: string) => {
  const [a, m, d] = partes(dia);
  return new Date(a, m - 1, d).getDay();
};
/** "terça, 14 de outubro de 2026" */
export const diaPorExtenso = (dia: string) => {
  const [a, m, d] = partes(dia);
  return `${DIAS_SEMANA[semanaDe(dia)]}, ${d} de ${MESES[m - 1]} de ${a}`;
};
/** "ter, 14 de out." */
const diaCurto = (dia: string) => {
  const [, m, d] = partes(dia);
  return `${DIAS_SEMANA[semanaDe(dia)]!.slice(0, 3)}, ${d} de ${MESES[m - 1]!.slice(0, 3)}.`;
};
const plural = (n: number, um: string, varios: string) => `${n.toLocaleString("pt-BR")} ${n === 1 ? um : varios}`;

/** O que o dia teve, numa frase: "23 respostas (18 certas) e 1 simulado". */
export function resumoDoDia(d: DiaCalendario): string {
  if (d.futuro) return "Ainda não chegou";
  const r = d.respostas ? `${plural(d.respostas, "resposta", "respostas")} (${plural(d.acertos, "certa", "certas")})` : "";
  const s = d.simulados ? plural(d.simulados, "simulado", "simulados") : "";
  return [r, s].filter(Boolean).join(" e ") || "Sem estudo";
}

type VistaCal = "semanas" | "mes";

/**
 * O calendário de estudo, em duas formas: "Semanas" (uma coluna por semana, os meses separados e os sete dias da
 * semana nomeados) e "Mês" (o mês com o número de cada dia). Cada dia é um botão: o mouse por cima mostra a data e o
 * que houve; o clique (ou o Enter) abre o detalhe embaixo. As setas andam pelos dias.
 */
export function CalendarioEstudo({ cal, detalhe }: { cal: Calendario; detalhe: (d: DiaCalendario) => ReactNode }) {
  const dias = cal.semanas.flat();
  const passados = dias.filter((d) => !d.futuro);
  const [vista, setVista] = useState<VistaCal>("semanas");
  const [sel, setSel] = useState(cal.hoje);
  const [mes, setMes] = useState(cal.hoje.slice(0, 7));
  const caixa = useRef<HTMLDivElement>(null);
  const botoes = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a forma escolhida fica no navegador
    setVista(lerJSON<VistaCal>(CHAVE_CALENDARIO, "semanas") === "mes" ? "mes" : "semanas");
  }, []);
  // nas semanas, a rolagem começa no fim: as semanas mais recentes à vista
  useEffect(() => {
    const c = caixa.current;
    if (c && vista === "semanas") c.scrollLeft = c.scrollWidth;
  }, [vista]);

  const mudarVista = (v: VistaCal) => {
    setVista(v);
    gravarJSON(CHAVE_CALENDARIO, v);
    setMes(sel.slice(0, 7));
  };
  const porDia = new Map(dias.map((d) => [d.dia, d]));
  const escolhido = porDia.get(sel) ?? porDia.get(cal.hoje)!;

  // as setas: nas semanas, cima e baixo andam um dia e os lados uma semana; no mês, o contrário
  const andar = (de: string, passo: number) => {
    const i = passados.findIndex((d) => d.dia === de);
    const j = Math.max(0, Math.min(passados.length - 1, i + passo));
    const alvo = passados[j]!.dia;
    setSel(alvo);
    setMes(alvo.slice(0, 7));
    requestAnimationFrame(() => botoes.current.get(alvo)?.focus());
  };
  const teclas = (e: KeyboardEvent) => {
    const passo =
      vista === "semanas"
        ? { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 }[e.key]
        : { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (passo === undefined) return;
    e.preventDefault();
    andar(sel, passo);
  };

  const celula = (d: DiaCalendario, comNumero: boolean) => (
    <button
      key={d.dia}
      ref={(el) => {
        if (el) botoes.current.set(d.dia, el);
        else botoes.current.delete(d.dia);
      }}
      type="button"
      className={styles.calDia}
      data-nivel={d.futuro ? undefined : d.nivel}
      data-futuro={d.futuro || undefined}
      data-hoje={d.dia === cal.hoje || undefined}
      data-simulado={d.simulados > 0 || undefined}
      aria-pressed={d.dia === escolhido.dia}
      aria-label={`${diaPorExtenso(d.dia)}: ${resumoDoDia(d)}`}
      tabIndex={d.dia === escolhido.dia ? 0 : -1}
      disabled={d.futuro}
      onClick={() => setSel(d.dia)}
      {...(d.futuro ? {} : dica(diaCurto(d.dia), resumoDoDia(d)))}
    >
      {comNumero ? partes(d.dia)[2] : null}
    </button>
  );

  // as semanas, separadas por mês: cada mês tem as colunas das semanas em que aparece, com os dias de outro mês vazios
  const meses: { chave: string; colunas: (DiaCalendario | null)[][] }[] = [];
  cal.semanas.forEach((s) => {
    for (const chave of [...new Set(s.map((d) => d.dia.slice(0, 7)))]) {
      let m = meses.find((x) => x.chave === chave);
      if (!m) meses.push((m = { chave, colunas: [] }));
      m.colunas.push(s.map((d) => (d.dia.startsWith(chave) ? d : null)));
    }
  });
  const nomeMes = (chave: string, comAno: boolean) => {
    const [a, m] = chave.split("-").map(Number) as [number, number];
    return `${MESES[m - 1]!.slice(0, 3)}${comAno ? ` ${a}` : ""}`;
  };

  // o mês escolhido, com os dias de 1 ao fim e o primeiro na coluna do dia da semana
  const mesesComDias = meses.map((m) => m.chave);
  const posMes = mesesComDias.indexOf(mes);
  const [am, mm] = mes.split("-").map(Number) as [number, number];
  const noMes = Array.from({ length: new Date(am, mm, 0).getDate() }, (_, k) => `${mes}-${String(k + 1).padStart(2, "0")}`);
  const vazias = semanaDe(noMes[0]!);

  return (
    <div className={styles.calendario} data-vista={vista}>
      <div className={styles.calTopo}>
        <div className={styles.segmentado} role="group" aria-label="Forma do calendário">
          <button type="button" aria-pressed={vista === "semanas"} onClick={() => mudarVista("semanas")}>
            Semanas
          </button>
          <button type="button" aria-pressed={vista === "mes"} onClick={() => mudarVista("mes")}>
            Mês
          </button>
        </div>
        {vista === "mes" && (
          <div className={styles.calNavMes}>
            <button type="button" className={styles.fechar} onClick={() => setMes(mesesComDias[posMes - 1]!)} disabled={posMes <= 0} aria-label="Mês anterior">
              ‹
            </button>
            <strong aria-live="polite">
              {MESES[mm - 1]} de {am}
            </strong>
            <button
              type="button"
              className={styles.fechar}
              onClick={() => setMes(mesesComDias[posMes + 1]!)}
              disabled={posMes >= mesesComDias.length - 1}
              aria-label="Próximo mês"
            >
              ›
            </button>
          </div>
        )}
      </div>

      {vista === "semanas" ? (
        <div className={styles.calRolagem} ref={caixa}>
          <div className={styles.calSemanas} role="group" aria-label={`Os dias das últimas ${cal.semanas.length} semanas`} onKeyDown={teclas}>
            <div className={styles.calDiasSemana} aria-hidden>
              <span />
              {DIAS_SEMANA.map((d) => (
                <span key={d}>
                  <span className={styles.calDiaLongo}>{d.slice(0, 3)}</span>
                  <span className={styles.calDiaCurto}>{d[0]!.toUpperCase()}</span>
                </span>
              ))}
            </div>
            {meses.map((m, i) => (
              <div key={m.chave} className={styles.calMes}>
                <span className={styles.calMesNome} aria-hidden>
                  {nomeMes(m.chave, i === 0 || m.chave.endsWith("-01"))}
                </span>
                <div className={styles.calColunas}>
                  {m.colunas.map((c, k) => (
                    <div key={k} className={styles.calColuna}>
                      {c.map((d, j) => (d ? celula(d, false) : <span key={j} className={styles.calVazio} aria-hidden />))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.calMesGrade} role="group" aria-label={`Os dias de ${MESES[mm - 1]} de ${am}`} onKeyDown={teclas}>
          {DIAS_SEMANA.map((d) => (
            <span key={d} className={styles.calCabeca} aria-hidden>
              {d.slice(0, 3)}
            </span>
          ))}
          {Array.from({ length: vazias }, (_, k) => (
            <span key={`v${k}`} aria-hidden />
          ))}
          {noMes.map((dia) => {
            const d = porDia.get(dia);
            return d ? (
              celula(d, true)
            ) : (
              <span key={dia} className={styles.calForaPeriodo} aria-hidden>
                {partes(dia)[2]}
              </span>
            );
          })}
        </div>
      )}

      <div className={styles.calLegenda} aria-hidden>
        menos
        {[0, 1, 2, 3, 4].map((n) => (
          <span key={n} data-nivel={n} />
        ))}
        mais
        <span className={styles.calLegendaSim}>
          <span data-simulado /> dia com simulado
        </span>
        <span className={styles.calLegendaSim}>
          <span data-hoje /> hoje
        </span>
      </div>

      <div className={styles.calDetalhe} aria-live="polite">
        <p className={styles.calDetalheData}>{diaPorExtenso(escolhido.dia)}</p>
        {detalhe(escolhido)}
      </div>
    </div>
  );
}
