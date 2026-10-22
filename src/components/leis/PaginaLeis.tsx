"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { carregarRemissivo, carregarVersoes, type Remissivo } from "@/lib/leis/dados";
import type { Bloco } from "@/lib/leis/linha-do-tempo";
import { CORES_TEXTO, opcoesTexto, type Filtro, type OpcoesTexto } from "@/lib/leis/opcoes";
import prontosJson from "@/content/generated/grifos.json";
import { prontosDosBlocos, type GrifosProntos } from "@/lib/leis/grifos";
import { corDoPronto, idDosProntos, lerLegendas, sistemaAtivo, type Sistema } from "@/lib/leis/legendas";
import {
  artigoDe,
  blocosDoItem,
  blocosEscolhidos,
  dataDaLei,
  faixas,
  marcasPorBloco,
  OPCOES_VADE_PADRAO,
  type ErroVade,
  type GrifoVade,
  type OpcoesVade,
} from "@/lib/leis/vademecum";
import type { Trecho } from "@/lib/leis/referencias";
import type { MarcaTexto } from "@/lib/leis/texto";
import { lerJSON } from "@/lib/storage";
import { LinksArtigo, resolverNaPagina, useLeis } from "./SecaoLei";
import { TextoLei } from "./TextoLei";
import styles from "./leitor.module.css";

export interface SecaoPedida {
  lei: string;
  /** faixas ("1-120, 155") ou conjunto de artigos ("art121"); com o filtro "erros", a lista de artigos com erro */
  artigos?: string | Set<string>;
  /** o que entra da lei: o texto (ou os artigos escolhidos), só os grifos ou só os erros */
  filtro?: Filtro;
  /** grifos do usuário copiados no momento da criação */
  grifos?: GrifoVade[];
  /** artigos com erro do usuário, copiados no momento da criação (para o ● e para o filtro "erros") */
  errados?: ErroVade[];
  /** conteúdo extra no lugar do ● (usado em "Minha leitura") */
  etiqueta?: (artigo: string) => ReactNode;
}

/** Sem opções pedidas (ex.: "Minha leitura"), vale a leitura salva no navegador. */
export const opcoesDoLeitor = (): OpcoesVade => ({ ...OPCOES_VADE_PADRAO, texto: opcoesTexto(lerJSON<Partial<OpcoesTexto>>("grifo:leitor", {})) });

/** Versões superadas (o texto revogado) de cada lei, carregadas só quando o usuário pede. */
function useVersoes(ids: string[]) {
  const [versoes, setVersoes] = useState<Record<string, Record<number, Bloco>>>({});
  const chave = ids.join("|");
  useEffect(() => {
    let vivo = true;
    Promise.all(chave.split("|").filter(Boolean).map(async (id) => [id, await carregarVersoes(id)] as const))
      .then((es) => vivo && setVersoes(Object.fromEntries(es)))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [chave]);
  return versoes;
}

const PRONTOS = prontosJson as GrifosProntos;

function itensDaSecao(blocos: Bloco[], s: SecaoPedida, revogados: boolean, automaticos: Set<number>) {
  if (s.filtro === "grifos" || s.filtro === "erros" || s.filtro === "automaticos") {
    const artigos = s.filtro === "erros" ? (typeof s.artigos === "string" ? s.artigos : (s.errados ?? []).map((e) => e.artigo).join(", ")) : undefined;
    return blocosDoItem(blocos, { filtro: s.filtro, artigos, grifos: s.grifos }, revogados, automaticos);
  }
  const filtro = typeof s.artigos === "string" ? { faixas: faixas(s.artigos) } : s.artigos ? { artigos: s.artigos } : undefined;
  return blocosEscolhidos(blocos, filtro, revogados);
}

const mensagemVazia = (s: SecaoPedida) =>
  s.filtro === "grifos"
    ? "Nenhum grifo desta lei."
    : s.filtro === "erros"
      ? "Nenhum artigo com erro nesta lei."
      : s.filtro === "automaticos"
        ? "Nenhum grifo automático nesta lei."
        : "Nenhum artigo desta lei na seleção.";

/** "1940-12-07" → "07/12/1940"; "1988-00-00" → "1988" */
function rotuloData(d: string) {
  if (!d) return "";
  const [a, m, dia] = d.split("-");
  return m === "00" ? a! : dia === "00" ? `${m}/${a}` : `${dia}/${m}/${a}`;
}

function IndiceCronologico({ itens }: { itens: { k: number; nome: string; data: string }[] }) {
  return (
    <section className={styles.indice} data-role="indice-cronologico">
      <h2>Índice cronológico</h2>
      <ol className={styles.indiceCronologico}>
        {itens.map((x) => (
          <li key={x.k}>
            <a href={`#lei-${x.k}`}>
              <span className={styles.indiceData}>{rotuloData(x.data) || "—"}</span> {x.nome}
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Índice alfabético-remissivo de uma lei, do content/remissivos/ (palavra-chave → artigos). */
function IndiceRemissivo({ lei, nome }: { lei: string; nome: string }) {
  const [dados, setDados] = useState<Remissivo | "sem" | null>(null);
  useEffect(() => {
    let vivo = true;
    carregarRemissivo(lei)
      .then((d) => vivo && setDados(d))
      .catch(() => vivo && setDados("sem"));
    return () => {
      vivo = false;
    };
  }, [lei]);
  if (dados === null) return <p className="muted">Carregando o índice…</p>;
  if (dados === "sem") return <p className={styles.miuda}>Este diploma não tem índice alfabético-remissivo no Grifo.</p>;
  return (
    <section className={styles.indice} data-role="indice-remissivo" aria-label={`Índice alfabético-remissivo de ${nome}`}>
      <h2>Índice alfabético-remissivo</h2>
      <dl className={styles.remissivo}>
        {dados.entradas.map((e) => (
          <div key={e.palavra} className={styles.remissivoItem}>
            <dt>{e.palavra}</dt>
            {e.subitens.map((s, k) => (
              <dd key={k}>
                {s.texto ? `${s.texto}: ` : ""}
                {s.ref}
              </dd>
            ))}
          </div>
        ))}
      </dl>
    </section>
  );
}

function pontosDoErro(e: ErroVade) {
  return (
    <span className={styles.erroVade} data-nivel={e.nivel ?? ""} title={`${e.erros} ${e.erros === 1 ? "erro" : "erros"} em ${e.tentativas} ${e.tentativas === 1 ? "tentativa" : "tentativas"}`}>
      {"●".repeat(Math.min(e.erros, 5))}
      {e.erros > 5 ? "+" : ""}
    </span>
  );
}

/**
 * Várias leis numa página: o índice cronológico (se pedido), o sumário, cada lei com o seu filtro, as marcações do
 * usuário, o "Vide", as referências e os links "Grifo"/"Planalto" (que a impressão esconde). Serve à tela e ao arquivo
 * baixado; as opções de impressão (colunas, nova página) são só CSS.
 */
export function PaginaLeis({ secoes, titulo, opcoes: pedidas }: { secoes: SecaoPedida[]; titulo?: string; opcoes?: OpcoesVade }) {
  const [salvas, setSalvas] = useState<OpcoesVade | null>(null);
  useEffect(() => {
    if (pedidas) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lê localStorage após montar (site estático)
    setSalvas(opcoesDoLeitor());
  }, [pedidas]);
  const opcoes = pedidas ?? salvas ?? OPCOES_VADE_PADRAO;
  const texto = opcoes.texto;
  const cor = CORES_TEXTO[texto.corTexto].cor;

  // o sistema de cores do usuário (o ativo) dá a cor dos grifos automáticos; sem ele, o padrão do Grifo
  const [sistema, setSistema] = useState<Sistema | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lê localStorage após montar (site estático)
    setSistema(sistemaAtivo(lerLegendas()));
  }, []);
  const ids = useMemo(() => [...new Set(secoes.map((s) => s.lei))], [secoes]);
  const { leis, erro } = useLeis(ids);
  const versoes = useVersoes(texto.revogados ? ids : []);

  const montadas = useMemo(
    () =>
      secoes.flatMap((s) => {
        const l = leis[s.lei];
        if (!l) return [];
        const v = texto.revogados ? versoes[s.lei] : undefined;
        const blocos = v ? l.blocos.map((b, i) => v[i] ?? b) : l.blocos;
        const prontos = sistema
          ? prontosDosBlocos(blocos, PRONTOS, idDosProntos(sistema), l.id, (rotulo) => corDoPronto(sistema, rotulo))
          : new Map<number, { tipo: "area" | "destaque"; rotulo: string; cor: string; nota?: string }>();
        const itens = itensDaSecao(blocos, s, texto.revogados, new Set(prontos.keys()));
        const marcas: Map<number, MarcaTexto[]> = texto.grifos || s.filtro === "grifos" ? marcasPorBloco(blocos, s.grifos ?? []) : new Map();
        return [{ s, l, blocos, itens, marcas, prontos, data: dataDaLei(l.blocos) }];
      }),
    [secoes, leis, versoes, sistema, texto.revogados, texto.grifos],
  );

  // o que está na página: lei → artigos (para as âncoras internas entre as leis)
  const presentes = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const { s, itens } of montadas) {
      const set = m.get(s.lei) ?? new Set<string>();
      for (const { bloco } of itens) if (bloco.disp) set.add(artigoDe(bloco.disp));
      m.set(s.lei, set);
    }
    return m;
  }, [montadas]);
  const presente = (lei: string, art: string) => !!presentes.get(lei)?.has(artigoDe(art));

  // índice cronológico: cada lei uma vez, na ordem da data (a do título do texto)
  const cronologico = useMemo(() => {
    const vistas = new Set<string>();
    const itens: { k: number; nome: string; data: string }[] = [];
    montadas.forEach((m, k) => {
      if (vistas.has(m.l.id)) return;
      vistas.add(m.l.id);
      itens.push({ k, nome: m.l.nome, data: m.data });
    });
    return itens.sort((a, b) => (a.data || "9999").localeCompare(b.data || "9999"));
  }, [montadas]);

  if (erro) return <p className={styles.aviso}>{erro}</p>;
  if (ids.some((id) => !leis[id])) return <p className="muted">Carregando o texto das leis…</p>;

  const etiqueta = (s: SecaoPedida, artigo: string) => {
    if (s.etiqueta) return s.etiqueta(artigo);
    if (!texto.erros) return null;
    const alvo = artigo.replace(/^art/, "").toLowerCase();
    const e = (s.errados ?? []).find((x) => x.artigo.toLowerCase() === alvo);
    return e ? pontosDoErro(e) : null;
  };

  return (
    <div
      className={styles.leitor}
      data-leitor
      data-vademecum-corpo
      data-fonte={texto.fonte}
      data-fundo={texto.fundo}
      data-revogados={texto.revogados ? "1" : "0"}
      data-anotacoes={texto.anotacoes ? "1" : "0"}
      data-vide={texto.vide ? "1" : "0"}
      data-colunas={opcoes.impressao.colunas ? "3" : "1"}
      data-nova-pagina={opcoes.impressao.novaPaginaPorLei ? "1" : "0"}
      style={
        {
          "--leitor-tamanho": `${texto.tamanho}px`,
          "--leitor-entrelinha": texto.entrelinha,
          ...(cor ? { "--leitor-fg": cor } : {}),
        } as CSSProperties
      }
    >
      {titulo && <h1>{titulo}</h1>}
      {opcoes.indices.cronologico && cronologico.length > 0 && <IndiceCronologico itens={cronologico} />}
      {!opcoes.indices.cronologico && montadas.length > 1 && (
        <ol className={styles.sumario}>
          {montadas.map(({ s, l }, k) => (
            <li key={k}>
              <a href={`#lei-${k}`}>{l.nome}</a>
              {typeof s.artigos === "string" && <span className="muted"> · arts. {s.artigos}</span>}
            </li>
          ))}
        </ol>
      )}
      {montadas.map(({ s, l, blocos, itens, marcas, prontos }, k) => {
        const base = resolverNaPagina(l.id, presente);
        const resolver = (t: Trecho): Trecho => {
          const r = base(t);
          return texto.destino === "planalto" && t.planalto ? { ...r, href: t.planalto } : r;
        };
        return (
          <section key={k} id={`lei-${k}`} className={styles.secao} data-role="lei">
            <h2>{l.nome}</h2>
            <div className={styles.corpo}>
              {itens.length ? (
                <TextoLei
                  id={l.id}
                  url={l.url}
                  blocos={blocos}
                  itens={itens}
                  prefixo={`${l.id}--`}
                  estrelas={false}
                  resolver={resolver}
                  marcas={marcas}
                  prontos={texto.prontos ? prontos : undefined}
                  aposArtigo={(b: Bloco) => (
                    <>
                      {etiqueta(s, artigoDe(b.disp!))}
                      <LinksArtigo lei={l.id} url={l.url} disp={b.disp!} />
                    </>
                  )}
                />
              ) : (
                <p className="muted">{mensagemVazia(s)}</p>
              )}
            </div>
            {opcoes.indices.remissivo && <IndiceRemissivo lei={l.id} nome={l.nome} />}
          </section>
        );
      })}
    </div>
  );
}
