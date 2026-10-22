// Texto da lei: um elemento por bloco, com âncora no dispositivo vigente, links das referências e as
// anotações do Planalto. O que é riscado ou revogado vai no HTML, marcado com data-sup / data-marco:
// o leitor esconde ou mostra só com CSS. Serve ao leitor (servidor) e ao Vade Mecum (cliente).
import { Fragment, type CSSProperties, type ReactNode } from "react";
import { marcoDeRevogacao, type Bloco } from "@/lib/leis/linha-do-tempo";
import { trechos, type Trecho } from "@/lib/leis/referencias";
import { corrigido, fatiar, type MarcaTexto } from "@/lib/leis/texto";
import styles from "./leitor.module.css";

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
  /** grifos automáticos (temas de prova do Grifo) por bloco: "area" (a barra na margem) ou "destaque" (grifado) */
  prontos?: Map<number, { tipo: "area" | "destaque"; rotulo: string; cor: string; nota?: string }>;
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
          // o grifo automático pinta como no leitor: a cor vem do sistema ativo, e a área é uma barra na margem
          "data-pronto": pronto?.tipo,
          "data-regra": pronto?.rotulo,
          "data-marca-bloco": inteiro ? 1 : undefined,
          "data-marca-nota": inteiro?.nota ? 1 : undefined,
          "data-liga-antes": ligaAntes.has(i) ? 1 : undefined,
          "data-liga-depois": ligaDepois.has(i) ? 1 : undefined,
          style: pronto || (inteiro && !inteiro.nota) ? ({ ...(pronto ? { "--pronto": pronto.cor } : {}), ...(inteiro && !inteiro.nota ? { "--c": inteiro.cor } : {}) } as CSSProperties) : undefined,
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

/**
 * Os trechos de texto (com as referências em link) e, por cima, os grifos do usuário: cada pedaço grifado vai numa
 * <mark> com a cor do grifo; a anotação sem cor só ganha o sublinhado pontilhado (como no leitor).
 */
function comGrifos(pecas: Trecho[], marcas: MarcaTexto[]): ReactNode[] {
  let pos = 0;
  return pecas.map((t, k) => {
    const ini = pos;
    pos += t.texto.length;
    const partes = marcas.length ? fatiar(t.texto, ini, marcas) : [{ texto: t.texto }];
    const nos = partes.map((p, j) =>
      p.marca ? (
        <mark
          key={j}
          className={styles.marca}
          data-so-nota={p.marca.cor === "nota" ? "1" : "0"}
          data-nota={p.marca.nota ? "1" : "0"}
          style={p.marca.cor === "nota" ? undefined : ({ "--c": p.marca.cor } as CSSProperties)}
        >
          {p.texto}
        </mark>
      ) : (
        <Fragment key={j}>{p.texto}</Fragment>
      ),
    );
    return t.href ? (
      <a key={k} className={styles.ref} href={t.href} data-grifo={t.href} data-planalto={t.planalto}>
        {nos}
      </a>
    ) : (
      <Fragment key={k}>{nos}</Fragment>
    );
  });
}
