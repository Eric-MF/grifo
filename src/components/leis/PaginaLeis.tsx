"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { carregarRemissivo, carregarVersoes, type Remissivo } from "@/lib/leis/dados";
import { artigoDaRef, coresPorArtigo, type CorDaRef } from "@/lib/leis/remissivo-cores";
import type { Bloco } from "@/lib/leis/linha-do-tempo";
import { CORES_TEXTO, opcoesTexto, type Filtro, type OpcoesTexto } from "@/lib/leis/opcoes";
import prontosJson from "@/content/generated/grifos.json";
import { blocosComProntos, faixasVisiveis, grifosDoJson, prontosDosBlocos } from "@/lib/leis/grifos";
import { corDoGrifo, lerLegendas, prontosNoSistema, rotuloDoGrifo, sistemaDoLeitor, type Estado } from "@/lib/leis/legendas";
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
import { corrigido, type MarcaTexto } from "@/lib/leis/texto";
import { lerJSON } from "@/lib/storage";
import { LinksArtigo, resolverNaPagina, useLeis } from "./SecaoLei";
import { TextoLei, type ProntosDoBloco } from "./TextoLei";
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

const PRONTOS = grifosDoJson(prontosJson);

/**
 * Os grifos prontos da lei no sistema com que ela abre no leitor (o mesmo que o leitor mostra): as palavras de cada bloco
 * e o "vide", e os blocos que o filtro "grifos automáticos" mostra.
 */
function prontosDaLei(blocos: Bloco[], lei: string, legendas: Estado | null) {
  if (!legendas) return { prontos: new Map<number, ProntosDoBloco>(), automaticos: new Set<number>() };
  const sistema = sistemaDoLeitor(legendas, lei, PRONTOS);
  const grifos = prontosNoSistema(PRONTOS, sistema, lei);
  // as posições valem no texto como ele aparece ("Art. 1º"), que tem o mesmo tamanho do original
  const doGrifo = blocos.map((b) => ({ disp: b.disp, superada: b.superada, texto: corrigido(b.texto), tipo: b.tipo }));
  const prontos = new Map<number, ProntosDoBloco>();
  for (const [i, p] of prontosDosBlocos(doGrifo, grifos)) {
    const faixas = faixasVisiveis(p, grifos, (g) => corDoGrifo(sistema, g), (g) => rotuloDoGrifo(sistema, g));
    if (faixas.length || p.vide.length) prontos.set(i, { faixas, vide: p.vide });
  }
  return { prontos, automaticos: blocosComProntos(doGrifo, grifos) };
}

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

/**
 * As cores do índice remissivo da lei: por artigo, as dos grifos do usuário (se a página os mostra) e as dos grifos
 * prontos (idem), no sistema com que a lei abre no leitor.
 */
function coresDoRemissivo(lei: string, marcas: readonly { disp?: string; cor: string }[], comProntos: boolean, legendas: Estado | null) {
  if (!legendas) return new Map<string, CorDaRef[]>();
  const sistema = sistemaDoLeitor(legendas, lei, PRONTOS);
  const ordem = (cor: string) => {
    const k = sistema.cores.findIndex((c) => c.cor.toLowerCase() === cor.toLowerCase());
    return k < 0 ? sistema.cores.length : k;
  };
  return coresPorArtigo({
    marcas,
    prontos: comProntos ? prontosNoSistema(PRONTOS, sistema, lei) : [],
    corDoPronto: (g) => corDoGrifo(sistema, g),
    rotuloDoPronto: (g) => rotuloDoGrifo(sistema, g),
    rotuloDaMarca: (cor) => sistema.cores.find((c) => c.cor.toLowerCase() === cor.toLowerCase())?.rotulo ?? "Grifo",
    ordem,
  });
}

/**
 * Índice alfabético-remissivo de uma lei, do content/remissivos/ (palavra-chave → artigos). A referência do artigo
 * grifado aparece com a cor do grifo, como no texto (forte: do usuário; clara: pronto do Grifo).
 */
function IndiceRemissivo({ lei, nome, cores, ids }: { lei: string; nome: string; cores: Map<string, CorDaRef[]>; ids: Set<string> }) {
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
            {e.subitens.map((s, k) => {
              const id = artigoDaRef(s.ref, ids);
              const lista = (id && cores.get(id)) || [];
              const principal = lista.find((c) => c.meu) ?? lista[0];
              return (
                <dd key={k}>
                  {s.texto ? `${s.texto}: ` : ""}
                  {principal ? (
                    <span
                      className={styles.refGrifada}
                      data-meu={principal.meu ? "1" : undefined}
                      style={{ "--c": principal.cor } as CSSProperties}
                      title={lista.map((c) => `${c.rotulo} (${c.meu ? "seu grifo" : "grifo pronto"})`).join(", ")}
                    >
                      {s.ref}
                    </span>
                  ) : (
                    s.ref
                  )}
                  {lista.length > 1 && (
                    <span className={styles.coresRef} aria-hidden>
                      {lista.map((c) => (
                        <span key={c.cor} data-meu={c.meu ? "1" : undefined} style={{ "--c": c.cor } as CSSProperties} />
                      ))}
                    </span>
                  )}
                </dd>
              );
            })}
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

  // os sistemas de cores do usuário dão os grifos prontos e as cores deles, lei a lei, como no leitor
  const [legendas, setLegendas] = useState<Estado | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lê localStorage após montar (site estático)
    setLegendas(lerLegendas());
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
        const { prontos, automaticos } = prontosDaLei(blocos, l.id, legendas);
        const itens = itensDaSecao(blocos, s, texto.revogados, automaticos);
        const marcas: Map<number, MarcaTexto[]> = texto.grifos || s.filtro === "grifos" ? marcasPorBloco(blocos, s.grifos ?? []) : new Map();
        const cores = opcoes.indices.remissivo ? coresDoRemissivo(l.id, texto.grifos ? (s.grifos ?? []) : [], texto.prontos, legendas) : new Map<string, CorDaRef[]>();
        const ids = new Set(blocos.flatMap((b) => (b.disp ? [artigoDe(b.disp)] : [])));
        return [{ s, l, blocos, itens, marcas, prontos, cores, ids, data: dataDaLei(l.blocos) }];
      }),
    [secoes, leis, versoes, legendas, texto.revogados, texto.grifos, texto.prontos, opcoes.indices.remissivo],
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
      {montadas.map(({ s, l, blocos, itens, marcas, prontos, cores, ids }, k) => {
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
            {opcoes.indices.remissivo && <IndiceRemissivo lei={l.id} nome={l.nome} cores={cores} ids={ids} />}
          </section>
        );
      })}
    </div>
  );
}
