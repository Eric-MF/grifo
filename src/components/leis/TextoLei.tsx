// Texto da lei: um elemento por bloco, com âncora no dispositivo vigente, links das referências e as
// anotações do Planalto. O que é riscado ou revogado vai no HTML, marcado com data-sup / data-marco:
// o leitor esconde ou mostra só com CSS. Serve ao leitor (servidor) e ao Vade Mecum (cliente).
import { Fragment, type CSSProperties, type ReactNode } from "react";
import type { FaixaVisivel, VideGrifo } from "@/lib/leis/grifos";
import { marcoDeRevogacao, type Bloco } from "@/lib/leis/linha-do-tempo";
import { trechos, type Trecho } from "@/lib/leis/referencias";
import { rotaDaLei } from "@/lib/leis/sumulas";
import { corrigido, fatiar, type MarcaTexto } from "@/lib/leis/texto";
import styles from "./leitor.module.css";

/** Os grifos prontos de um bloco, já com a aparência no sistema da lei: as palavras grifadas e o "vide" (ver grifos.ts). */
export interface ProntosDoBloco {
  faixas: FaixaVisivel[];
  vide: VideGrifo[];
}

interface Props {
  id: string;
  url: string;
  blocos: Bloco[];
  /** só estes blocos (índices em `blocos`); sem isso, todos */
  itens?: { i: number; bloco: Bloco }[];
  /** prefixo das âncoras, quando várias leis dividem a página */
  prefixo?: string;
  /** reescreve o destino de cada referência */
  resolver?: (t: Trecho) => Trecho;
  /** conteúdo extra logo depois do texto de cada artigo */
  aposArtigo?: (b: Bloco) => ReactNode;
  estrelas?: boolean;
  /** grifos do usuário por bloco (índice em `blocos`), para destacar o trecho dentro do texto */
  marcas?: Map<number, MarcaTexto[]>;
  /** grifos prontos do Grifo por bloco: as palavras-chave grifadas dentro do texto e o "vide" depois dele */
  prontos?: Map<number, ProntosDoBloco>;
}

export function TextoLei({ id, url, blocos, itens, prefixo = "", resolver, aposArtigo, estrelas = true, marcas, prontos }: Props) {
  const lista = itens ?? blocos.map((bloco, i) => ({ i, bloco }));
  // a âncora do dispositivo fica na primeira redação vigente (ou na primeira, se todas forem superadas)
  const ancoraEm = new Map<string, number>();
  for (const { i, bloco: b } of lista) {
    if (!b.disp || b.tipo === "texto") continue;
    const atual = ancoraEm.get(b.disp);
    if (atual === undefined || (blocos[atual].superada && !b.superada)) ancoraEm.set(b.disp, i);
  }

  // parágrafo inteiro grifado: a forma é do bloco (como no leitor). Parágrafos seguidos com a mesma cor se encostam.
  const inteiros = new Map<number, { cor: string; nota: boolean }>();
  for (const { i, bloco: b } of lista) {
    const m = marcas?.get(i)?.find((x) => x.inteiro && x.ini === 0 && x.fim === (b.texto ?? "").length);
    if (m) inteiros.set(i, { cor: m.cor, nota: m.cor === "nota" });
  }
  const ligaAntes = new Set<number>();
  const ligaDepois = new Set<number>();
  for (let k = 0; k + 1 < lista.length; k++) {
    const a = inteiros.get(lista[k]!.i);
    const b = inteiros.get(lista[k + 1]!.i);
    if (a && b && a.cor === b.cor && a.nota === b.nota) {
      ligaDepois.add(lista[k]!.i);
      ligaAntes.add(lista[k + 1]!.i);
    }
  }

  return (
    <div className={styles.folha} data-lei={id}>
      {lista.map(({ i, bloco: b }) => {
        const pronto = prontos?.get(i);
        const inteiro = inteiros.get(i);
        const props = {
          "data-i": i,
          "data-disp": b.disp,
          "data-sup": b.superada ? 1 : 0,
          "data-marco": marcoDeRevogacao(b) ? 1 : 0,
          "data-com-pronto": pronto ? 1 : undefined,
          "data-marca-bloco": inteiro ? 1 : undefined,
          "data-marca-nota": inteiro?.nota ? 1 : undefined,
          "data-liga-antes": ligaAntes.has(i) ? 1 : undefined,
          "data-liga-depois": ligaDepois.has(i) ? 1 : undefined,
          style: inteiro && !inteiro.nota ? ({ "--c": inteiro.cor } as CSSProperties) : undefined,
          id: b.disp && ancoraEm.get(b.disp) === i ? prefixo + b.disp : undefined,
          className: `${styles.b} ${styles[b.tipo]}`,
        };
        const conteudo = (
          <>
            {estrelas && b.tipo === "artigo" && !b.superada && (
              <button type="button" className={styles.estrela} data-estrela={b.disp} aria-label={`Marcar ${b.rotulo ?? "artigo"} como importante`} aria-pressed="false">
                ☆
              </button>
            )}
            <span className={styles.txt}>
              {comGrifos(
                // "Art. 1o" aparece como "Art. 1º" e sem trema, como no leitor (a troca não muda o tamanho do texto, então as marcas continuam certas)
                trechos(corrigido(b.texto), id, b.rotulo).map((bruto) => (resolver && bruto.href ? resolver(bruto) : bruto)),
                // com o parágrafo inteiro grifado, a forma é a do bloco: os trechos não são grifados de novo
                inteiros.has(i) ? [] : (marcas?.get(i) ?? []),
                pronto?.faixas ?? [],
              )}
            </span>
            {b.atos.length > 0 && (
              <span className={styles.atos}>
                {b.atos.map((a, k) => {
                  const href = a.href ? new URL(a.href, url).href : undefined;
                  return href ? (
                    <a key={k} href={href} className={styles.ato} data-tipo={a.tipo} rel="noopener" target="_blank">
                      {a.bruto}
                    </a>
                  ) : (
                    <span key={k} className={styles.ato} data-tipo={a.tipo}>
                      {a.bruto}
                    </span>
                  );
                })}
              </span>
            )}
            {pronto && pronto.vide.length > 0 && <Vide vides={pronto.vide} lei={id} resolver={resolver} />}
            {aposArtigo && b.tipo === "artigo" && !b.superada && aposArtigo(b)}
          </>
        );
        if (b.tipo === "estrutura") return <h3 key={i} {...props}>{conteudo}</h3>;
        if (b.tipo === "rubrica") return <h4 key={i} {...props}>{conteudo}</h4>;
        return <p key={i} {...props}>{conteudo}</p>;
      })}
    </div>
  );
}

/** O "vide" do grifo pronto: o outro dispositivo do mesmo tema, com o link resolvido como as referências do texto. */
function Vide({ vides, lei, resolver }: { vides: VideGrifo[]; lei: string; resolver?: (t: Trecho) => Trecho }) {
  return (
    <span className={styles.prontoVide} data-pronto-vide="1">
      vide{" "}
      {vides.map((v, k) => {
        const art = v.disp.split(".")[0]!;
        const bruto: Trecho = { texto: v.rotulo, href: v.lei === lei ? `#${art}` : `${rotaDaLei(v.lei)}#${art}`, lei: v.lei, art };
        const t = resolver ? resolver(bruto) : bruto;
        return (
          <Fragment key={k}>
            {k > 0 && "; "}
            <a href={t.href} data-lei={v.lei} data-art={art} data-disp={v.disp !== art ? v.disp : undefined}>
              {v.rotulo}
            </a>
          </Fragment>
        );
      })}
    </span>
  );
}

/** As palavras do grifo pronto num pedaço de texto (que começa na posição `ini` do bloco), como no leitor. */
function comProntos(texto: string, ini: number, faixas: FaixaVisivel[]): ReactNode {
  if (!faixas.length) return texto;
  return fatiar(texto, ini, faixas).map((p, j) =>
    p.marca ? (
      <mark
        key={j}
        className={styles.pronto}
        data-pronto={p.marca.linha && !p.marca.fundo ? "pedido" : "1"}
        data-essencial={p.marca.essencial ? "1" : undefined}
        title={[...p.marca.titulos, ...p.marca.notas].join("\n")}
        style={{ ...(p.marca.fundo ? { "--pronto-fundo": p.marca.fundo } : {}), ...(p.marca.linha ? { "--pronto-linha": p.marca.linha } : {}) } as CSSProperties}
      >
        {p.texto}
      </mark>
    ) : (
      <Fragment key={j}>{p.texto}</Fragment>
    ),
  );
}

/**
 * Os trechos de texto (com as referências em link) e, por cima, os grifos do usuário: cada pedaço grifado vai numa
 * <mark> com a cor do grifo; a anotação sem cor só ganha o sublinhado pontilhado (como no leitor). As palavras dos
 * grifos prontos ficam dentro, como no leitor (dentro de um grifo do usuário, só o sublinhado delas aparece).
 */
function comGrifos(pecas: Trecho[], marcas: MarcaTexto[], prontos: FaixaVisivel[]): ReactNode[] {
  let pos = 0;
  return pecas.map((t, k) => {
    const ini = pos;
    pos += t.texto.length;
    const partes = marcas.length ? fatiar(t.texto, ini, marcas) : [{ texto: t.texto }];
    let em = ini;
    const nos = partes.map((p, j) => {
      const comeco = em;
      em += p.texto.length;
      return p.marca ? (
        <mark
          key={j}
          className={styles.marca}
          data-so-nota={p.marca.cor === "nota" ? "1" : "0"}
          data-nota={p.marca.nota ? "1" : "0"}
          style={p.marca.cor === "nota" ? undefined : ({ "--c": p.marca.cor } as CSSProperties)}
        >
          {comProntos(p.texto, comeco, prontos)}
        </mark>
      ) : (
        <Fragment key={j}>{comProntos(p.texto, comeco, prontos)}</Fragment>
      );
    });
    return t.href ? (
      <a key={k} className={styles.ref} href={t.href} data-grifo={t.href} data-planalto={t.planalto}>
        {nos}
      </a>
    ) : (
      <Fragment key={k}>{nos}</Fragment>
    );
  });
}
