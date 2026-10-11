import type { ReactNode } from "react";
import { fmtNota } from "@/lib/formato";
import { RichText } from "@/components/RichText";
import type { Exame, Item } from "@/content/schema";
import { MarcaGrifo } from "./Caderno";

// Padrão de resposta no layout da FGV (barras "Enunciado"/"Gabarito Comentado" e
// tabela "Distribuição dos Pontos"), com marca Grifo e notas de atualização.


function valoresDoItem(it: Item) {
  if (it.valores?.length) return it.valores.map(fmtNota).join("/");
  const total = it.teto ?? it.componentes.reduce((s, c) => s + c.valor, 0);
  return `0,00/${fmtNota(total)}`;
}

/** Destaca em vermelho os valores "(0,10)" dentro da descrição, como a FGV. */
function DescricaoComValores({ texto }: { texto: string }) {
  const partes = texto.split(/(\(\d+,\d{1,2}\))/g);
  return (
    <>
      {partes.map((p, i) =>
        /^\(\d+,\d{1,2}\)$/.test(p) ? (
          <span key={i} className="v">
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function Tabela({ itens }: { itens: Item[] }) {
  const linhas: ReactNode[] = [];
  let secao: string | undefined;
  for (const it of itens) {
    if (it.secao && it.secao !== secao) {
      secao = it.secao;
      linhas.push(
        <tr key={`s-${it.n}`} className="sec">
          <td>{it.secao}</td>
          <td />
        </tr>,
      );
    }
    linhas.push(
      <tr key={it.n}>
        <td>
          <b>{it.n}.</b> <DescricaoComValores texto={it.descricao} />
        </td>
        <td className="v">{valoresDoItem(it)}</td>
      </tr>,
    );
  }
  return (
    <table className="tabela">
      <thead>
        <tr>
          <th>ITEM</th>
          <th>PONTUAÇÃO</th>
        </tr>
      </thead>
      <tbody>{linhas}</tbody>
    </table>
  );
}

function Cabecalho({ exame, titulo }: { exame: Exame; titulo: string }) {
  return (
    <>
      <div className="pr-cab">
        <img src="/img/oab-capa.png" alt="OAB" />
        <div className="tit">
          <b>ORDEM DOS ADVOGADOS DO BRASIL</b>
          <span>{exame.numeral} Exame de Ordem Unificado</span>
        </div>
        <div style={{ textAlign: "right" }}>
          <MarcaGrifo />
        </div>
      </div>
      <div className="pr-meta">
        <span>Prova Prático-Profissional</span>
        {exame.aplicacao && <span>Aplicada em {exame.aplicacao.split("-").reverse().join("/")}</span>}
      </div>
      <div className="pr-area">
        ÁREA: DIREITO PENAL
        <br />
        PADRÃO DE RESPOSTA – {titulo}
      </div>
    </>
  );
}

export function PadraoResposta({ exame }: { exame: Exame }) {
  const notas = exame.atualizado?.notas ?? [];
  const notasDe = (alvo: string) => notas.filter((n) => n.alvo === alvo);
  const partes = [
    { alvo: "peca", titulo: "PEÇA PROFISSIONAL", enunciado: exame.peca.enunciado, gabarito: exame.peca.gabarito_comentado, itens: exame.peca.itens },
    ...exame.questoes.map((q) => ({
      alvo: `q${q.n}`,
      titulo: `QUESTÃO ${String(q.n).padStart(2, "0")}`,
      enunciado: q.enunciado,
      gabarito: q.gabarito_comentado,
      itens: q.itens,
    })),
  ];
  return (
    <>
      {partes.map((p, i) => (
        <article key={p.alvo} className={`fluxo ${i > 0 ? "quebra" : ""}`}>
          <Cabecalho exame={exame} titulo={p.titulo} />
          {i === 0 && (
            <p className="nota-atual" style={{ marginTop: 0 }}>
              Versão de estudo elaborada pelo Grifo a partir do padrão de resposta oficial
              {exame.observacoes ? `. ${exame.observacoes}` : "."}
            </p>
          )}
          <div className="barra laranja">Enunciado</div>
          <div className="texto">
            <RichText text={p.enunciado} data={exame.aplicacao} />
          </div>
          {p.gabarito && (
            <>
              <div className="barra azul">Gabarito Comentado</div>
              <div className="texto">
                <RichText text={p.gabarito} data={exame.aplicacao} />
              </div>
            </>
          )}
          {p.itens.length > 0 && (
            <>
              <div className="barra azul">Distribuição dos Pontos</div>
              <Tabela itens={p.itens} />
            </>
          )}
          {notasDe(p.alvo).length > 0 && (
            <>
              <div className="barra laranja">Atualização legislativa</div>
              {notasDe(p.alvo).map((n, k) => (
                <div key={k} className="nota-atual">
                  <b>
                    {n.item ? `Item ${n.item} — ` : ""}
                    {n.lei}
                  </b>
                  <RichText text={n.texto} data={exame.aplicacao} />
                </div>
              ))}
            </>
          )}
        </article>
      ))}
    </>
  );
}
