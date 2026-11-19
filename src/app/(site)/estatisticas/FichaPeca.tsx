"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { fmtMedia, fmtPct, type LinhaRanking } from "@/lib/estatisticas/exames";
import { NOMES_GRUPOS, type ExameEstat, type PecaInfo } from "@/lib/estatisticas/tipos";
import { corDoGrupo, dicaDoExame, LinkArtigo, Medalha, QuandoCaiu } from "./Graficos";
import styles from "./estatisticas.module.css";

/** A ficha da peça: quando cabe, o prazo, o fundamento (com link para a lei) e as vezes em que caiu nos exames do filtro. */
export function FichaPeca({
  peca,
  linha,
  lista,
  descricaoFiltro,
  onIrPara,
  onVerNaLista,
  onFechar,
}: {
  peca: PecaInfo;
  linha: LinhaRanking | undefined;
  lista: ExameEstat[];
  descricaoFiltro: string;
  /** fecha a ficha e leva ao exame na lista */
  onIrPara: (id: string) => void;
  onVerNaLista: () => void;
  onFechar: () => void;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = dialogo.current;
    if (d && !d.open) d.showModal();
  }, []);
  const exames = linha ? linha.posicoes.map((p) => lista[p]!) : [];
  return (
    <dialog ref={dialogo} onClose={onFechar} aria-labelledby="ficha-titulo" className={styles.ficha}>
      <header className={styles.fichaTopo}>
        <Medalha peca={peca} />
        <div>
          <span className={styles.fichaGrupo} style={{ color: corDoGrupo(peca) }}>
            {NOMES_GRUPOS[peca.grupo]}
          </span>
          <h2 id="ficha-titulo">{peca.nome}</h2>
        </div>
        <button type="button" className={styles.fechar} onClick={() => dialogo.current?.close()} aria-label="Fechar">
          ✕
        </button>
      </header>
      <dl className={styles.fichaDados}>
        {peca.cabimento && (
          <>
            <dt>Quando cabe</dt>
            <dd>{peca.cabimento}</dd>
          </>
        )}
        {peca.prazo && (
          <>
            <dt>Prazo</dt>
            <dd>{peca.prazo[0]!.toUpperCase() + peca.prazo.slice(1)}</dd>
          </>
        )}
        {peca.fundamentos.length > 0 && (
          <>
            <dt>Fundamento</dt>
            <dd>
              {peca.fundamentos.map((f, i) => (
                <span key={f.texto}>
                  {i > 0 && " · "}
                  {f.url ? (
                    <LinkArtigo href={f.url} previa={f.previa}>
                      {f.texto}
                    </LinkArtigo>
                  ) : (
                    f.texto
                  )}
                </span>
              ))}
            </dd>
          </>
        )}
      </dl>
      <section className={styles.fichaProvas} aria-labelledby="ficha-provas">
        <h3 id="ficha-provas">Nas provas ({descricaoFiltro})</h3>
        {linha ? (
          <>
            <p>
              Caiu em <strong>{linha.vezes}</strong> de {lista.length} exames ({fmtPct(linha.fracao)}).{" "}
              {linha.desdeUltima === 0 ? "Caiu no exame mais recente." : `A última vez foi há ${linha.desdeUltima} ${linha.desdeUltima === 1 ? "exame" : "exames"}.`}
              {linha.intervaloMedio !== null && ` Em média, volta a cada ${fmtMedia(linha.intervaloMedio)} exames; o maior intervalo foi de ${linha.maiorJejum}.`}
            </p>
            <QuandoCaiu
              posicoes={linha.posicoes}
              total={lista.length}
              cor={corDoGrupo(peca)}
              rotulo={`As ${linha.vezes} vezes em que caiu, do exame mais antigo ao mais recente`}
              dicaDe={(p) => dicaDoExame(lista[p]!)}
            />
            <ul className={styles.chipsExames}>
              {exames.map((e) => (
                <li key={e.id}>
                  <button type="button" onClick={() => onIrPara(e.id)} aria-label={`${e.titulo}: ver na lista`} {...dicaDoExame(e, "Ver na lista")}>
                    {e.numeral}
                    {e.variante ? ` ${e.variante.split(" ").map((p) => p[0]).join("")}` : ""}
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="muted">Não caiu em nenhum exame do filtro.</p>
        )}
      </section>
      <div className={styles.fichaAcoes}>
        {linha && (
          <button type="button" className="btn btn-primary btn-sm" onClick={onVerNaLista}>
            Ver os {linha.vezes} exames na lista
          </button>
        )}
        <Link className="btn btn-ghost btn-sm" href="/treino/">
          Treinar peça e fundamento
        </Link>
      </div>
    </dialog>
  );
}
