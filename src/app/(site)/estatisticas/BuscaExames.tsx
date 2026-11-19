"use client";

// A busca da lista de exames. Por padrão, nos dados de cada exame (número, ano, banca, peça e teses), como sempre foi;
// com "Buscar em", nos enunciados e nos gabaritos, da peça, das questões ou de tudo, com os trechos achados embaixo de
// cada exame. A consulta aceita "expressões", -exclusões, alternativas (a | b), começo de palavra (prescri*) e
// pontuação e símbolos como estão (§, º, "art. 386, VII").
import { useDeferredValue, useId, useMemo, useState, type MouseEventHandler, type ReactNode } from "react";
import { atende, compilar, lerConsulta, trechoDe, type OpcoesBusca, type Trecho } from "@/lib/estatisticas/busca";
import type { ExameEstat } from "@/lib/estatisticas/tipos";
import { rotuloDoTexto, useTextosDosExames, type EstadoTextos, type TipoTexto } from "./buscaTextos";
import styles from "./estatisticas.module.css";

export type OndeBuscar = "dados" | "enunciado" | "gabarito" | "textos";
export type ParteBusca = "tudo" | "peca" | "questoes";
export const ONDE: { id: OndeBuscar; nome: string }[] = [
  { id: "dados", nome: "Número, ano, peça e tese" },
  { id: "enunciado", nome: "Enunciados" },
  { id: "gabarito", nome: "Gabaritos" },
  { id: "textos", nome: "Enunciados e gabaritos" },
];
const PARTES_BUSCA: { id: ParteBusca; nome: string }[] = [
  { id: "tudo", nome: "Toda a prova" },
  { id: "peca", nome: "Só a peça" },
  { id: "questoes", nome: "Só as questões" },
];
const EXEMPLOS: { q: string; diz: string }[] = [
  { q: "prescrição roubo", diz: "as duas palavras, em qualquer lugar do exame" },
  { q: '"legítima defesa"', diz: "as palavras juntas, nessa ordem" },
  { q: "furto | roubo", diz: "uma ou outra (vale também furto OU roubo)" },
  { q: "nulidade -citação", diz: "com a primeira e sem a segunda" },
  { q: "prescri*", diz: "palavras que começam assim (com “Palavra inteira” ligada)" },
  { q: '"art. 386, VII"', diz: "números, pontuação e símbolos (§, º, -A) valem como estão" },
];
/** Até 3 trechos por exame na lista; o resto só conta. */
const TRECHOS_POR_EXAME = 3;

export interface TrechoAchado extends Trecho {
  rotulo: string;
  tipo: TipoTexto;
}
export interface ResultadoBusca {
  /** os exames que atendem (na ordem da lista) */
  exames: ExameEstat[];
  /** os trechos de cada exame, quando a busca é nos textos */
  trechos: Map<string, { trechos: TrechoAchado[]; total: number }>;
  estado: EstadoTextos["estado"] | "dados";
  /** a busca é nos textos e há consulta */
  nosTextos: boolean;
}

export interface EstadoBusca {
  busca: string;
  onde: OndeBuscar;
  parte: ParteBusca;
  opcoes: OpcoesBusca;
}

/**
 * Os exames da lista que a busca acha. `buscarDados` é a busca de sempre (nos dados); nos textos, cada exame atende
 * quando todas as exigências aparecem em algum texto escolhido (e as excluídas, em nenhum).
 */
export function useBuscaExames(lista: ExameEstat[], b: EstadoBusca, buscarDados: (lista: ExameEstat[], q: string, o: OpcoesBusca) => ExameEstat[]): ResultadoBusca {
  const consulta = useDeferredValue(b.busca);
  const nosTextos = b.onde !== "dados";
  const textos = useTextosDosExames(nosTextos, b.opcoes);
  const compilada = useMemo(() => compilar(lerConsulta(consulta), b.opcoes), [consulta, b.opcoes]);
  const textosProntos = textos.estado === "pronto" ? textos.textos : null;
  const nos = useMemo(() => {
    if (!nosTextos || compilada.vazia || !textosProntos) return null;
    const tipos: TipoTexto[] = b.onde === "enunciado" ? ["enunciado"] : b.onde === "gabarito" ? ["gabarito"] : ["enunciado", "gabarito"];
    const trechos = new Map<string, { trechos: TrechoAchado[]; total: number }>();
    const exames = lista.filter((e) => {
      const ts = (textosProntos.get(e.id) ?? []).filter(
        (t) => tipos.includes(t.tipo) && (b.parte === "tudo" || (b.parte === "peca" ? t.parte === "peca" : t.parte !== "peca")),
      );
      if (!ts.length || !atende(ts.map((t) => t.norm.texto), compilada)) return false;
      const achados: TrechoAchado[] = [];
      let total = 0;
      for (const t of ts) {
        const tr = trechoDe(t.texto, t.norm, compilada);
        if (!tr) continue;
        total += tr.achados;
        if (achados.length < TRECHOS_POR_EXAME) achados.push({ ...tr, rotulo: rotuloDoTexto(t), tipo: t.tipo });
      }
      trechos.set(e.id, { trechos: achados, total });
      return true;
    });
    return { exames, trechos };
  }, [nosTextos, compilada, textosProntos, lista, b.onde, b.parte]);

  if (!nosTextos) return { exames: buscarDados(lista, consulta, b.opcoes), trechos: new Map(), estado: "dados", nosTextos: false };
  if (compilada.vazia) return { exames: lista, trechos: new Map(), estado: textos.estado, nosTextos: false };
  if (!nos) return { exames: lista, trechos: new Map(), estado: textos.estado, nosTextos: false };
  return { ...nos, estado: "pronto", nosTextos: true };
}

/** A barra da busca: o campo, onde buscar, a parte da prova e as opções (com a ajuda da sintaxe). */
export function BarraBusca({ b, onMudar, extra }: { b: EstadoBusca; onMudar: (m: Partial<EstadoBusca>) => void; extra: ReactNode }) {
  const id = useId();
  const [aberto, setAberto] = useState(false);
  const nosTextos = b.onde !== "dados";
  const opcoesLigadas = Object.values(b.opcoes).filter(Boolean).length;
  const opcao = (chave: keyof OpcoesBusca, nome: string, diz: string) => (
    <label className={styles.caixa} title={diz}>
      <input type="checkbox" checked={b.opcoes[chave]} onChange={(e) => onMudar({ opcoes: { ...b.opcoes, [chave]: e.target.checked } })} />
      <span>
        {nome} <span className="muted">· {diz}</span>
      </span>
    </label>
  );
  return (
    <div className={styles.buscaCaixa}>
      <div className={styles.barraLista}>
        <label className={styles.busca}>
          <span className="sr-only">Buscar exame</span>
          <input
            type="search"
            placeholder={nosTextos ? 'Palavras, "expressão exata", -sem, a | b…' : "Buscar exame, ano, peça ou tese…"}
            value={b.busca}
            onChange={(e) => onMudar({ busca: e.target.value })}
          />
        </label>
        <label className={styles.ordenar}>
          Buscar em
          <select value={b.onde} onChange={(e) => onMudar({ onde: e.target.value as OndeBuscar })}>
            {ONDE.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className={styles.botaoOpcoes} aria-expanded={aberto} aria-controls={`${id}-opcoes`} onClick={() => setAberto((a) => !a)}>
          Opções da busca{opcoesLigadas ? ` (${opcoesLigadas})` : ""} {aberto ? "▴" : "▾"}
        </button>
        {extra}
      </div>
      {nosTextos && (
        <div className={styles.segmentado} role="group" aria-label="Parte da prova em que buscar">
          {PARTES_BUSCA.map((p) => (
            <button key={p.id} type="button" aria-pressed={b.parte === p.id} onClick={() => onMudar({ parte: p.id })}>
              {p.nome}
            </button>
          ))}
        </div>
      )}
      {aberto && (
        <div id={`${id}-opcoes`} className={`card ${styles.opcoesBusca}`}>
          <div className={styles.opcoesCaixas}>
            {opcao("palavraInteira", "Palavra inteira", "“pena” não acha “apenas”")}
            {opcao("acentos", "Diferenciar acentos", "“pena” não acha “pená”")}
            {opcao("maiusculas", "Diferenciar maiúsculas", "“CP” não acha “cp”")}
          </div>
          <p className={styles.rotuloFiltro}>Como buscar (toque num exemplo para usar)</p>
          <ul className={styles.exemplosBusca}>
            {EXEMPLOS.map((x) => (
              <li key={x.q}>
                <button type="button" onClick={() => onMudar({ busca: x.q, ...(nosTextos ? {} : { onde: "textos" as OndeBuscar }) })}>
                  <code>{x.q}</code>
                </button>
                <span>{x.diz}</span>
              </li>
            ))}
          </ul>
          <p className="muted">
            A busca nos textos usa o enunciado e o padrão de resposta (o comentado e os itens da tabela de pontos) de cada exame do site. Os exames antigos da OAB/SP
            não têm texto.
          </p>
        </div>
      )}
    </div>
  );
}

/** O texto do trecho com os achados em <mark>. */
function ComMarcas({ t }: { t: Trecho }) {
  const out: ReactNode[] = [];
  let pos = 0;
  t.marcas.forEach(([a, b], i) => {
    if (a > pos) out.push(t.texto.slice(pos, a));
    out.push(<mark key={i}>{t.texto.slice(a, b)}</mark>);
    pos = b;
  });
  if (pos < t.texto.length) out.push(t.texto.slice(pos));
  return <>{out}</>;
}

/** Os trechos achados num exame. Com a peça escondida, os do gabarito ficam fechados (eles dizem a peça). */
export function TrechosDoExame({
  achado,
  esconderGabarito,
  onRevelar,
  href,
  onVer,
}: {
  achado: { trechos: TrechoAchado[]; total: number };
  esconderGabarito: boolean;
  onRevelar: () => void;
  href?: string;
  /** o "Ver a prova" abre o visualizador */
  onVer?: MouseEventHandler<HTMLAnchorElement>;
}) {
  const resto = achado.total - achado.trechos.reduce((n, t) => n + t.marcas.length, 0);
  return (
    <div className={styles.trechos}>
      <ul>
        {achado.trechos.map((t, i) => (
          <li key={i}>
            <span className={styles.trechoOnde}>{t.rotulo}</span>
            {esconderGabarito && t.tipo === "gabarito" ? (
              <button type="button" className={styles.linkBotao} onClick={onRevelar}>
                Trecho do gabarito escondido (diz a peça) · mostrar
              </button>
            ) : (
              <span className={styles.trechoTexto}>
                <ComMarcas t={t} />
              </span>
            )}
          </li>
        ))}
      </ul>
      <p className={styles.trechosRodape}>
        {achado.total} {achado.total === 1 ? "achado" : "achados"}
        {resto > 0 ? ` (${resto} fora dos trechos acima)` : ""}
        {href && (
          <>
            {" · "}
            <a href={href} onClick={onVer}>
              Ver a prova
            </a>
          </>
        )}
      </p>
    </div>
  );
}
