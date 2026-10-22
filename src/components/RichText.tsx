import { Fragment, type ReactNode } from "react";
import { linkifica } from "./Citacoes";

/** Um trecho a grifar: a linha (índice em `text.split("\n")`) e as posições do trecho nela. */
export interface TrechoGrifado {
  linha: number;
  ini: number;
  fim: number;
}

interface Contexto {
  data?: string;
  citacoes: boolean;
  porLinha: Map<number, TrechoGrifado[]>;
  classeMarca?: string;
}

// Markdown mínimo usado nos enunciados/gabaritos: parágrafos, **negrito**, *itálico*.
// **negrito** pode conter *itálico* (ex.: "**… diferente de *habeas corpus* …**").
const MARKDOWN = /(\*\*((?:[^*]|\*(?!\*))+?)\*\*|\*([^*]+)\*)/g;

/** Um pedaço de texto de uma linha, com os trechos grifados marcados e as citações viradas em links (se ligadas). */
function trecho(linha: string, a: number, b: number, ctx: Contexto, chave: string, links: boolean): ReactNode[] {
  const saida: ReactNode[] = [];
  let pos = a;
  const grifos = (ctx.porLinha.get(chaveLinha(chave)) ?? []).filter((g) => g.fim > a && g.ini < b).sort((x, y) => x.ini - y.ini);
  const texto = (de: number, ate: number) => {
    if (ate <= de) return;
    if (links && ctx.citacoes) saida.push(...linkifica(linha.slice(de, ate), `${chave}.${de}`, ctx.data));
    else saida.push(linha.slice(de, ate));
  };
  for (const g of grifos) {
    const ini = Math.max(g.ini, a);
    const fim = Math.min(g.fim, b);
    if (ini < pos) continue;
    texto(pos, ini);
    saida.push(
      <mark key={`${chave}.m${ini}`} className={ctx.classeMarca}>
        {linha.slice(ini, fim)}
      </mark>,
    );
    pos = fim;
  }
  texto(pos, b);
  return saida;
}

/** A linha do índice que a chave carrega (a chave começa com o índice da linha, até o primeiro ponto). */
const chaveLinha = (chave: string) => Number(chave.split(".")[0]);

/** O texto de uma linha com o markdown mínimo, a partir do trecho [de, ate) dela. */
function inline(linha: string, de: number, ate: number, ctx: Contexto, chave: string, links: boolean): ReactNode[] {
  const s = linha.slice(de, ate);
  const out: ReactNode[] = [];
  const re = new RegExp(MARKDOWN.source, "g");
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(...trecho(linha, de + last, de + m.index, ctx, `${chave}.${k}`, links));
    if (m[2] !== undefined) {
      const ini = de + m.index + 2;
      out.push(<strong key={`${chave}.s${k}`}>{inline(linha, ini, ini + m[2].length, ctx, `${chave}.s${k}`, links)}</strong>);
    } else {
      const ini = de + m.index + 1;
      // o itálico não vira link (como antes): só recebe o grifo, se houver
      out.push(<em key={`${chave}.e${k}`}>{trecho(linha, ini, ini + m[3]!.length, ctx, `${chave}.e${k}`, false)}</em>);
    }
    last = m.index + m[0].length;
    k++;
  }
  if (last < s.length) out.push(...trecho(linha, de + last, de + s.length, ctx, `${chave}.${k}`, links));
  return out;
}

/**
 * Texto de enunciado ou gabarito. `citacoes` liga as citações de artigo (com a prévia); desligado, a citação é texto
 * comum. `grifos` marca trechos pelo índice da linha e pela posição nela; `destaque` realça a linha inteira.
 */
export function RichText({
  text,
  className,
  data,
  citacoes = true,
  grifos = [],
  classeGrifo,
  classeLinha,
}: {
  text: string;
  className?: string;
  data?: string;
  citacoes?: boolean;
  grifos?: TrechoGrifado[];
  classeGrifo?: string;
  classeLinha?: string;
}) {
  const linhas = text.split("\n");
  const porLinha = new Map<number, TrechoGrifado[]>();
  for (const g of grifos) porLinha.set(g.linha, [...(porLinha.get(g.linha) ?? []), g]);
  const ctx: Contexto = { data, citacoes, porLinha, classeMarca: classeGrifo };
  // parágrafos: as linhas não vazias seguidas; uma linha em branco separa um parágrafo do outro
  const paragrafos: number[][] = [];
  let atual: number[] = [];
  linhas.forEach((l, i) => {
    if (l.trim()) atual.push(i);
    else if (atual.length) {
      paragrafos.push(atual);
      atual = [];
    }
  });
  if (atual.length) paragrafos.push(atual);
  return (
    <div className={className}>
      {paragrafos.map((p, k) => (
        <p key={k}>
          {p.map((i, j) => {
            const linha = linhas[i]!;
            const conteudo = inline(linha, 0, linha.length, ctx, `${i}`, true);
            return (
              <Fragment key={i}>
                {j > 0 && <br />}
                {porLinha.has(i) && classeLinha ? <span className={classeLinha} data-destacada="1">{conteudo}</span> : conteudo}
              </Fragment>
            );
          })}
        </p>
      ))}
    </div>
  );
}
