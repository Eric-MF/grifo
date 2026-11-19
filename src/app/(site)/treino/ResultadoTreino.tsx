"use client";

// A página final do treino: os números, o acerto por nível e por tipo e a revisão de cada questão. Serve ao fim do
// treino e ao resultado guardado de um recorde (/treino/resultado/).
import { type CSSProperties, type ReactNode, useId, useState } from "react";
import { nomeCategoria } from "@/quiz/categorias";
import { QuestaoRevista } from "@/quiz/PerguntaCorpo";
import { maximoTreino, NOME_NIVEL, TAMANHO_TREINO } from "@/quiz/pontuacao";
import { melhorSequencia, pontosDe, type LinhaResultado, type ModoTreino } from "@/quiz/recordes";
import styles from "./treino.module.css";

export const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Uma questão do resultado: a linha resume (acerto, tempo e pontos) e abre a questão como ficou depois de respondida. */
function RodadaRevista({ n, linha, comNivel }: { n: number; linha: LinhaResultado; comNivel: boolean }) {
  const [aberta, setAberta] = useState(false);
  const corpo = useId();
  const { pergunta, revisao } = linha;
  // a questão que saiu do acervo (o resultado guardado) fica só com o resumo
  const podeAbrir = !!(pergunta && revisao);
  return (
    <li className={styles.rodada} data-acertou={linha.acertou ? "1" : undefined} data-aberta={aberta ? "1" : undefined}>
      <button
        type="button"
        className={styles.rever}
        aria-expanded={podeAbrir ? aberta : undefined}
        aria-controls={podeAbrir ? corpo : undefined}
        disabled={!podeAbrir}
        onClick={() => setAberta((a) => !a)}
      >
        <span className={styles.rodadaN}>
          <span className="sr-only">Questão </span>
          {n}
        </span>
        <span className={styles.rodadaTitulo}>
          <strong>{linha.titulo}</strong>
          <small>
            {nomeCategoria(linha.categoria)}
            {comNivel ? ` · ${NOME_NIVEL[linha.nivel]}` : ""}
            {podeAbrir ? "" : " · a questão saiu do acervo"}
          </small>
        </span>
        <span className={styles.rodadaNumeros}>
          <span className={styles.selo}>{linha.acertou ? "✓ Acerto" : "✗ Erro"}</span>
          <span>
            {fmt(linha.segundos)} · {linha.pontos} pts
          </span>
        </span>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
      {podeAbrir && (
        <div id={corpo} className={styles.rodadaCorpo} hidden={!aberta}>
          {aberta && <QuestaoRevista pergunta={pergunta} nivel={linha.nivel} revisao={revisao} />}
        </div>
      )}
    </li>
  );
}

type Filtro = "todas" | "erros" | "acertos";
/** Quantas linhas da revisão aparecem de cada vez: com 50 questões (ou um modo infinito longo) a lista não cansa. */
const POR_VEZ = 20;

/** Acertos de cada grupo (nível ou tipo de pergunta), na ordem em que aparecem. */
function porGrupo(linhas: LinhaResultado[], grupo: (r: LinhaResultado) => string): { nome: string; acertos: number; total: number }[] {
  const m = new Map<string, { acertos: number; total: number }>();
  for (const r of linhas) {
    const g = m.get(grupo(r)) ?? { acertos: 0, total: 0 };
    g.total++;
    if (r.acertou) g.acertos++;
    m.set(grupo(r), g);
  }
  return [...m].map(([nome, g]) => ({ nome, ...g }));
}

export function ResultadoTreino({
  linhas,
  modo,
  strikes,
  onde,
  aviso,
  acoes,
}: {
  linhas: LinhaResultado[];
  modo: ModoTreino;
  strikes: number;
  /** no modo automático, onde ele está ("agora em Peça e fundamento · Médio") */
  onde?: string;
  /** o recorde: novo, ou o que há para bater */
  aviso?: ReactNode;
  acoes: ReactNode;
}) {
  const acertos = linhas.filter((r) => r.acertou).length;
  const erros = linhas.length - acertos;
  const muitas = linhas.length > TAMANHO_TREINO;
  // muitas questões: a revisão abre nos erros, que é o que importa rever
  const [filtro, setFiltro] = useState<Filtro>(() => (muitas && erros ? "erros" : "todas"));
  const [mostradas, setMostradas] = useState(POR_VEZ);
  const { automatico, nivel } = modo;
  const semFim = modo.tamanho === "infinito";
  const total = pontosDe(linhas);
  const media = linhas.reduce((s, r) => s + r.segundos, 0) / Math.max(1, linhas.length);
  const porcentagem = Math.round((100 * acertos) / Math.max(1, linhas.length));
  const sequencia = melhorSequencia(linhas);
  const niveisUsados = porGrupo(linhas, (r) => NOME_NIVEL[r.nivel]);
  const tipos = porGrupo(linhas, (r) => nomeCategoria(r.categoria));
  const filtradas = linhas.map((r, i) => ({ r, n: i + 1 })).filter(({ r }) => filtro === "todas" || (filtro === "erros" ? !r.acertou : r.acertou));
  const recapitulacoes = linhas.filter((r) => r.recapitulacao);
  return (
    <div className={styles.painel}>
      <p className={styles.eyebrow}>
        Resultado ·{" "}
        {automatico
          ? `${linhas.length} ${linhas.length === 1 ? "questão" : "questões"} · modo automático${onde ? ` · ${onde}` : ""}`
          : semFim
            ? `modo infinito · ${niveisUsados.map((g) => g.nome).join(", ")}`
            : `${linhas.length} questões · nível ${NOME_NIVEL[nivel]}`}
      </p>
      <p className={styles.total}>
        {total.toLocaleString("pt-BR")} <span>{semFim || automatico ? "pontos" : `de ${maximoTreino(nivel, linhas.length).toLocaleString("pt-BR")} pontos`}</span>
      </p>
      {aviso}
      <dl className={styles.numeros}>
        <div>
          <dt>Acertos</dt>
          <dd>
            {acertos} de {linhas.length} <small>({porcentagem}%)</small>
          </dd>
        </div>
        <div>
          <dt>Tempo médio</dt>
          <dd>{fmt(media)}</dd>
        </div>
        <div>
          <dt>Maior sequência</dt>
          <dd>
            {sequencia} {sequencia === 1 ? "acerto" : "acertos"}
          </dd>
        </div>
        <div>
          <dt>Strikes</dt>
          <dd>{strikes ? `★ ${strikes}` : "nenhum"}</dd>
        </div>
        {recapitulacoes.length > 0 && (
          <div>
            <dt>Recapitulações</dt>
            <dd>
              {recapitulacoes.filter((r) => r.acertou).length} de {recapitulacoes.length} certas
            </dd>
          </div>
        )}
      </dl>
      {/* com mais questões, o acerto por tipo (e por nível, se mudou no meio) mostra onde está o ponto fraco */}
      {(muitas || semFim || automatico) && (tipos.length > 1 || niveisUsados.length > 1) && (
        <div className={styles.grupos}>
          {[...(niveisUsados.length > 1 ? [{ titulo: "Por nível", lista: niveisUsados }] : []), ...(tipos.length > 1 ? [{ titulo: "Por tipo de pergunta", lista: tipos }] : [])].map(
            ({ titulo, lista }) => (
              <section key={titulo}>
                <h3>{titulo}</h3>
                <ul>
                  {lista.map((g) => (
                    <li key={g.nome}>
                      <span>{g.nome}</span>
                      <span className={styles.barra} style={{ "--p": `${(100 * g.acertos) / g.total}%` } as CSSProperties} aria-hidden />
                      <span>
                        {g.acertos} de {g.total}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ),
          )}
        </div>
      )}
      <section className={styles.revisao} aria-labelledby="revisao-titulo">
        <h2 id="revisao-titulo" className={styles.subtitulo}>
          Reveja as questões
        </h2>
        <p className={styles.regras}>Cada uma abre com o enunciado, as alternativas e a correção.</p>
        {muitas && (
          <div className={styles.filtros} role="group" aria-label="Quais questões mostrar">
            {(
              [
                ["todas", `Todas (${linhas.length})`],
                ["erros", `Erros (${erros})`],
                ["acertos", `Acertos (${acertos})`],
              ] as [Filtro, string][]
            ).map(([id, rotulo]) => (
              <button
                key={id}
                type="button"
                aria-pressed={filtro === id}
                onClick={() => {
                  setFiltro(id);
                  setMostradas(POR_VEZ);
                }}
              >
                {rotulo}
              </button>
            ))}
          </div>
        )}
        {filtradas.length ? (
          <ol className={styles.rodadas}>
            {filtradas.slice(0, mostradas).map(({ r, n }) => (
              <RodadaRevista key={`${n}-${r.pergunta?.id ?? r.titulo}`} n={n} linha={r} comNivel={niveisUsados.length > 1} />
            ))}
          </ol>
        ) : (
          <p className={styles.regras}>{filtro === "erros" ? "Nenhum erro. Parabéns!" : "Nenhum acerto desta vez."}</p>
        )}
        {filtradas.length > mostradas && (
          <button type="button" className="btn" onClick={() => setMostradas((m) => m + POR_VEZ)}>
            Mostrar mais {Math.min(POR_VEZ, filtradas.length - mostradas)} de {filtradas.length - mostradas}
          </button>
        )}
      </section>
      <div className={styles.acoes}>{acoes}</div>
    </div>
  );
}
