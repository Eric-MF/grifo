"use client";

// A tabela das provas: um exame por linha, com o visualizador, os PDFs em três grupos (2ª fase atualizada, 2ª fase
// original e 1ª fase), cada um com o caderno e o gabarito, e o simulado (com a melhor nota da pessoa, se já fez). As
// linhas se separam por ano. No celular, cada linha vira um cartão compacto, e a lista mostra os 10 mais recentes e um
// "Mostrar todos".
import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import type { ExameResumo } from "@/content/load";
import { ToggleNomePeca, useMostrarPeca } from "@/components/NomePeca";
import { NOTA_CORTE } from "@/lib/correcao/grader";
import { gravarUltimoExame } from "@/lib/folha/ultimo-exame";
import { fmtNota } from "@/lib/formato";
import { listarTentativas } from "@/lib/tentativas";
import { BaixarTudo } from "./BaixarTudo";
import { nomeDoArquivo, type Chave } from "./nomes";
import type { PartePontos } from "./pontuacao";
import { type NavegacaoExames, VisualizarExame } from "./VisualizarExame";
import styles from "./provas.module.css";

/** no celular, quantos exames aparecem antes do "Mostrar todos" */
const NO_CELULAR = 10;

const GRUPOS: {
  id: string;
  titulo: string;
  dica: string;
  caderno: Chave;
  gabarito: Chave;
  destaque?: boolean;
  fase1?: boolean;
}[] = [
  {
    id: "atualizada",
    titulo: "2ª fase · atualizada",
    dica: "Nomes novos, erros corrigidos, lei nova",
    caderno: "cadernoAtualizado",
    gabarito: "gabaritoAtualizado",
    destaque: true,
  },
  {
    id: "original",
    titulo: "2ª fase · original",
    dica: "Como a FGV aplicou",
    caderno: "cadernoOriginal",
    gabarito: "gabaritoOriginal",
  },
  {
    id: "fase1",
    titulo: "1ª fase · Tipo 1",
    dica: "Todas as matérias",
    caderno: "objetivaCaderno",
    gabarito: "objetivaGabarito",
    fase1: true,
  },
];

function Baixar({
  e,
  chave,
  texto,
  label,
  destaque,
  preliminar,
}: {
  e: ExameResumo;
  chave: Chave;
  texto: string;
  label: string;
  destaque?: boolean;
  preliminar?: boolean;
}) {
  const href = e.downloads[chave];
  if (!href)
    return (
      <span className={styles.na} title="Não disponível" aria-label={`${label}: não disponível`}>
        {texto}
      </span>
    );
  return (
    <a
      className={`${styles.dl} ${destaque ? styles.dlGold : ""}`}
      href={href}
      download={nomeDoArquivo(e, chave)}
      aria-label={`${label}${preliminar ? " (preliminar)" : ""}`}
      title={preliminar ? "Gabarito preliminar: a FGV ainda não publicou o definitivo" : `Baixar o PDF: ${label}`}
      onClick={() => gravarUltimoExame(e.numero)}
    >
      <span aria-hidden className={styles.icone}>
        ⬇
      </span>
      {texto}
      {preliminar && <span className={styles.preliminar}>prelim.</span>}
    </a>
  );
}

const situacaoDe = (e: ExameResumo) => (e.fase2 === "em-breve" ? "2ª fase em breve" : e.peca === "—" ? "Gabarito não divulgado" : null);
const temPdf = (e: ExameResumo) => Object.values(e.downloads).some(Boolean);
const dataBR = (iso: string) => iso.split("-").reverse().join("/");
const anoDe = (e: ExameResumo) => e.aplicacao?.slice(0, 4) ?? "Sem data";

export function TabelaProvas({ exames, pecas, pontuacao }: { exames: ExameResumo[]; pecas: string[]; pontuacao: Record<string, PartePontos[]> }) {
  const [mostrarPeca] = useMostrarPeca();
  const [peca, setPeca] = useState("");
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<ExameResumo | null>(null);
  const [todos, setTodos] = useState(false);
  // a melhor nota de cada exame nos simulados (do navegador)
  const [notas, setNotas] = useState<Map<string, { total: number; id: string }>>(new Map());
  const filtroPeca = mostrarPeca ? peca : "";
  useEffect(() => {
    // ?ver=<exame> (o link "Ver prova" das estatísticas) abre o visualizador desse exame
    const id = new URLSearchParams(window.location.search).get("ver");
    const e = id ? exames.find((x) => x.id === id) : undefined;
    const melhores = new Map<string, { total: number; id: string }>();
    for (const t of listarTentativas()) {
      if (!t?.resultado) continue;
      const m = melhores.get(t.exameId);
      if (!m || t.resultado.total > m.total) melhores.set(t.exameId, { total: t.resultado.total, id: t.id });
    }
    /* eslint-disable react-hooks/set-state-in-effect -- site estático: o endereço e o localStorage só existem no navegador */
    if (e) setAberto(e);
    setNotas(melhores);
    // o link para um exame da lista (#exame-<id>) que estaria escondido no celular abre a lista inteira
    const alvo = window.location.hash.match(/^#exame-(.+)$/)?.[1];
    if (alvo && exames.findIndex((x) => x.id === alvo) >= NO_CELULAR) setTodos(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [exames]);
  const fechar = () => {
    setAberto(null);
    const p = new URLSearchParams(window.location.search);
    if (!p.has("ver")) return;
    p.delete("ver");
    window.history.replaceState(null, "", `${window.location.pathname}${p.size ? `?${p}` : ""}${window.location.hash}`);
  };

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return exames.filter(
      (e) =>
        (!filtroPeca || e.peca === filtroPeca) &&
        (!q || `${e.numero} ${e.numeral} ${e.aplicacao?.slice(0, 4) ?? ""} ${mostrarPeca ? e.peca : ""} ${e.variante ?? ""}`.toLowerCase().includes(q)),
    );
  }, [exames, filtroPeca, busca, mostrarPeca]);

  // as setas do visualizador andam pela tabela como está filtrada (do mais recente ao mais antigo)
  const vizinhos = (e: ExameResumo): NavegacaoExames => {
    const abre = (x: ExameResumo) => x.corrigivel || temPdf(x);
    const comPdf = (lista.some((x) => x.id === e.id) ? lista : exames).filter(abre);
    const i = comPdf.findIndex((x) => x.id === e.id);
    return {
      anterior: i >= 0 ? comPdf[i + 1] : undefined,
      proximo: i > 0 ? comPdf[i - 1] : undefined,
      onIr: (x) => {
        setAberto(x);
        const p = new URLSearchParams(window.location.search);
        if (!p.has("ver")) return;
        p.set("ver", x.id);
        window.history.replaceState(null, "", `${window.location.pathname}?${p}${window.location.hash}`);
      },
    };
  };

  const colunas = 5 + (mostrarPeca ? 1 : 0);
  return (
    <>
      <div className={styles.filtros}>
        <label className={styles.busca}>
          <span className="sr-only">Buscar</span>
          <input
            type="search"
            placeholder={mostrarPeca ? "Buscar por número, ano ou peça" : "Buscar por número ou ano"}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </label>
        {mostrarPeca && (
          <label>
            <span className="sr-only">Filtrar por peça</span>
            <select value={filtroPeca} onChange={(e) => setPeca(e.target.value)}>
              <option value="">Todas as peças</option>
              {pecas.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
        )}
        <ToggleNomePeca />
        <span className={styles.contagem}>
          {lista.length} {lista.length === 1 ? "exame" : "exames"}
        </span>
      </div>
      <BaixarTudo exames={lista} />
      <div className={styles.scroll}>
        <table className={styles.tabela} data-todos={todos || undefined}>
          <thead>
            <tr>
              <th scope="col">Exame</th>
              {mostrarPeca && <th scope="col">Peça cobrada</th>}
              {GRUPOS.map((g) => (
                <th key={g.id} scope="col" className={styles.c} title={g.dica} data-grupo={g.id}>
                  {g.titulo}
                  <small>{g.dica}</small>
                </th>
              ))}
              <th scope="col" className={styles.c}>
                Simulado
              </th>
            </tr>
          </thead>
          <tbody>
            {lista.map((e, i) => {
              const novoAno = i === 0 || anoDe(lista[i - 1]!) !== anoDe(e);
              const alem = i >= NO_CELULAR || undefined;
              const situacao = situacaoDe(e);
              const nota = notas.get(e.id);
              return (
                <Fragment key={e.id}>
                  {novoAno && (
                    <tr className={styles.ano} data-alem={alem}>
                      <th colSpan={colunas} scope="rowgroup">
                        {anoDe(e)}
                      </th>
                    </tr>
                  )}
                  <tr id={`exame-${e.id}`} className={styles.linha} data-alem={alem}>
                    <th scope="row" className={styles.exame}>
                      <div className={styles.exameCel}>
                        <span className={styles.num}>{e.numeral}</span>
                        <span className={styles.exameInfo}>
                          <strong>
                            {e.numero}º Exame
                            {e.variante ? ` · ${e.variante}` : ""}
                          </strong>
                          <span className={styles.sub}>
                            {e.aplicacao ? dataBR(e.aplicacao) : "—"}
                            {e.fgv && (
                              <>
                                {" · "}
                                <a
                                  className={styles.fgv}
                                  href={e.fgv}
                                  target="_blank"
                                  rel="noopener"
                                  aria-label={`Página do ${e.numeral} Exame no site da FGV (documentos para baixar)`}
                                >
                                  FGV ↗
                                </a>
                              </>
                            )}
                          </span>
                          <span className={styles.etiquetas}>
                            {e.preliminar.gabarito && <span title="A FGV ainda não publicou o gabarito definitivo">Gabarito preliminar</span>}
                            {e.temAtualizacao && <span title="A versão atualizada traz aviso de lei nova">Lei nova</span>}
                            {!mostrarPeca && situacao && <span>{situacao}</span>}
                          </span>
                        </span>
                        {e.corrigivel || temPdf(e) ? (
                          <button type="button" className={styles.ver} onClick={() => setAberto(e)} aria-label={`Visualizar ${e.numeral} Exame`}>
                            <span aria-hidden>👁</span> Visualizar
                          </button>
                        ) : null}
                      </div>
                    </th>
                    {mostrarPeca && <td className={styles.peca}>{situacao ? <span className="muted">{situacao}</span> : e.peca}</td>}
                    {GRUPOS.map((g) => (
                      <td key={g.id} className={`${styles.c} ${styles.grupoPdf}`} data-grupo={g.id}>
                        <span className={styles.rotuloGrupo}>{g.titulo}</span>
                        <span className={styles.par}>
                          <Baixar e={e} chave={g.caderno} texto="Caderno" label={`${g.titulo}: caderno do ${e.numeral} Exame`} destaque={g.destaque} />
                          <Baixar
                            e={e}
                            chave={g.gabarito}
                            texto="Gabarito"
                            label={`${g.titulo}: gabarito ${g.fase1 && !e.preliminar.objetiva ? "definitivo " : ""}do ${e.numeral} Exame`}
                            destaque={g.destaque}
                            preliminar={g.fase1 ? e.preliminar.objetiva : e.preliminar.gabarito}
                          />
                        </span>
                      </td>
                    ))}
                    <td className={`${styles.c} ${styles.simulado}`}>
                      <span className={styles.rotuloGrupo}>Simulado</span>
                      {e.corrigivel ? (
                        nota ? (
                          <span className={styles.par}>
                            <Link
                              className={`${styles.nota} ${nota.total >= NOTA_CORTE ? styles.ok : styles.bad}`}
                              href={`/simulados/${e.id}/resultado/?t=${nota.id}`}
                              title="A sua melhor nota: abrir a correção"
                            >
                              {fmtNota(nota.total)}
                            </Link>
                            <Link className={styles.sim} href={`/simulados/${e.id}/`} aria-label={`Refazer o simulado do ${e.numeral} Exame`}>
                              Refazer
                            </Link>
                          </span>
                        ) : (
                          <Link className={styles.sim} href={`/simulados/${e.id}/`} aria-label={`Fazer o simulado do ${e.numeral} Exame`}>
                            Fazer →
                          </Link>
                        )
                      ) : (
                        <span className={styles.na}>—</span>
                      )}
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {lista.length > NO_CELULAR && (
        <button type="button" className={styles.mostrarTodos} aria-expanded={todos} onClick={() => setTodos((v) => !v)}>
          {todos ? "Mostrar só os 10 mais recentes" : `Mostrar todos (${lista.length})`}
        </button>
      )}
      {lista.length === 0 && <p className="muted">Nenhum exame encontrado.</p>}
      {aberto && <VisualizarExame exame={aberto} pontuacao={pontuacao[aberto.id]} onFechar={fechar} navegacao={vizinhos(aberto)} />}
    </>
  );
}
