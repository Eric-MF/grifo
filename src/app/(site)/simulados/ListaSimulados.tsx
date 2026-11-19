"use client";

// A aba de Simulados. No topo, o painel do andamento: o anel dos exames feitos, a evolução das notas (cada ponto abre a
// correção), a prova em andamento ou o próximo sugerido e o mapa de todos os exames, um quadrado por exame. Depois, a
// busca com os filtros e duas listas: os exames feitos (com a nota de cada parte, as tentativas e a evolução) e os que
// faltam. No celular, cada lista mostra os 10 mais recentes e um "Mostrar todos". Tudo o que é pessoal vem do navegador,
// lido depois de montar; o HTML estático já traz os exames.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ToggleNomePeca, useMostrarPeca } from "@/components/NomePeca";
import { numeralComArabico } from "@/content/titulo";
import { NOTA_CORTE } from "@/lib/correcao/grader";
import { sugerirSimulado } from "@/lib/estatisticas/desempenho";
import { fmtNota, fmtTempo } from "@/lib/formato";
import { lerRascunho, listarTentativas, type Tentativa, type VersaoSimulado } from "@/lib/tentativas";
import styles from "./simulados.module.css";

export interface ExameDaLista {
  id: string;
  numero: number;
  numeral: string;
  variante: string | null;
  aplicacao: string | null;
  peca: string;
  corrigivel: boolean;
  revisado: boolean;
  /** há aviso de lei nova na versão atualizada */
  leiNova: boolean;
  preliminar: boolean;
  /** a chave do tipo de peça (content/pecas.yaml), para a sugestão do próximo simulado */
  pecaTipo: string;
  era: "cespe" | "fgv";
  /** posição cronológica (0 = o mais antigo) */
  ordem: number;
}

type Filtro = "todos" | "nao-feitos" | "feitos" | "andamento";
const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: "todos", rotulo: "Todos" },
  { id: "feitos", rotulo: "Feitos" },
  { id: "nao-feitos", rotulo: "Não feitos" },
  { id: "andamento", rotulo: "Em andamento" },
];
/** no celular, quantos exames cada lista mostra antes do "Mostrar todos" */
const NO_CELULAR = 10;

interface Feito {
  melhor: Tentativa;
  primeira: Tentativa;
  ultima: Tentativa;
  vezes: number;
}
interface Andamento {
  decorrido: number;
  atualizadoEm: number;
  versao: VersaoSimulado;
}
interface Pessoal {
  feitos: Map<string, Feito>;
  andamento: Map<string, Andamento>;
  /** as tentativas em ordem de data, da mais antiga */
  tentativas: Tentativa[];
}

function lerPessoal(exames: ExameDaLista[]): Pessoal {
  const tentativas = listarTentativas()
    .filter((t) => t?.resultado?.partes)
    .sort((a, b) => a.criadaEm - b.criadaEm);
  const feitos: Pessoal["feitos"] = new Map();
  for (const t of tentativas) {
    const f = feitos.get(t.exameId);
    if (!f) feitos.set(t.exameId, { melhor: t, primeira: t, ultima: t, vezes: 1 });
    else feitos.set(t.exameId, { ...f, melhor: t.resultado.total >= f.melhor.resultado.total ? t : f.melhor, ultima: t, vezes: f.vezes + 1 });
  }
  const andamento: Pessoal["andamento"] = new Map();
  for (const e of exames) {
    const r = lerRascunho(e.id);
    if (r && (r.peca?.trim() || r.questoes?.some((q) => q?.trim()) || r.decorrido > 0))
      andamento.set(e.id, { decorrido: r.decorrido, atualizadoEm: r.atualizadoEm, versao: r.versao ?? "original" });
  }
  return { feitos, andamento, tentativas };
}

const dataBR = (iso: string) => iso.split("-").reverse().join("/");
const diaMes = (t: number) => new Date(t).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const hrefCorrecao = (t: Tentativa) => `/simulados/${t.exameId}/resultado/?t=${t.id}`;
const estadoDaNota = (n: number) => (n >= NOTA_CORTE ? "ok" : "bad");

export function ListaSimulados({ exames, nomesPecas }: { exames: ExameDaLista[]; nomesPecas: Record<string, string> }) {
  const [mostrarPeca] = useMostrarPeca();
  const [pessoal, setPessoal] = useState<Pessoal | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");
  const [antigosPrimeiro, setAntigosPrimeiro] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- lê localStorage após montar (site estático)
  useEffect(() => setPessoal(lerPessoal(exames)), [exames]);

  const feitos = useMemo<Pessoal["feitos"]>(() => pessoal?.feitos ?? new Map(), [pessoal]);
  const andamento = useMemo<Pessoal["andamento"]>(() => pessoal?.andamento ?? new Map(), [pessoal]);
  const corrigiveis = exames.filter((e) => e.corrigivel);

  const visiveis = useMemo(() => {
    const q = semAcento(busca.trim());
    const r = exames.filter(
      (e) => !q || semAcento(`${e.numero} ${e.numeral} ${e.variante ?? ""} ${e.aplicacao?.slice(0, 4) ?? ""} ${mostrarPeca ? e.peca : ""}`).includes(q),
    );
    return antigosPrimeiro ? [...r].reverse() : r;
  }, [exames, busca, antigosPrimeiro, mostrarPeca]);
  const listaFeitos = filtro === "todos" || filtro === "feitos" ? visiveis.filter((e) => feitos.has(e.id)) : [];
  const listaFazer =
    filtro === "feitos"
      ? []
      : visiveis.filter((e) => !feitos.has(e.id) && (filtro !== "andamento" || andamento.has(e.id)) && (filtro !== "nao-feitos" || e.corrigivel));
  // em andamento também pode ser um exame já feito (refeito): ele aparece nos feitos, com o aviso
  const andamentoFeitos = filtro === "andamento" ? visiveis.filter((e) => feitos.has(e.id) && andamento.has(e.id)) : [];

  const contagem: Record<Filtro, number> = {
    todos: exames.length,
    feitos: feitos.size,
    "nao-feitos": corrigiveis.filter((e) => !feitos.has(e.id)).length,
    andamento: andamento.size,
  };

  return (
    <>
      <Painel exames={exames} corrigiveis={corrigiveis.length} pessoal={pessoal} nomesPecas={nomesPecas} mostrarPeca={mostrarPeca} />

      <div className={styles.barra}>
        <input
          type="search"
          className={styles.busca}
          placeholder={mostrarPeca ? "Buscar por número, ano ou peça" : "Buscar por número ou ano"}
          aria-label="Buscar exame"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <div className={styles.filtros} role="group" aria-label="Mostrar">
          {FILTROS.map((f) => (
            <button key={f.id} type="button" aria-pressed={filtro === f.id} onClick={() => setFiltro(f.id)} disabled={f.id !== "todos" && !pessoal}>
              {f.rotulo}
              {pessoal && <span>{contagem[f.id]}</span>}
            </button>
          ))}
        </div>
        <div className={styles.barraFim}>
          <button type="button" className={styles.ordem} onClick={() => setAntigosPrimeiro((v) => !v)} aria-label="Inverter a ordem">
            {antigosPrimeiro ? "↑ Mais antigos primeiro" : "↓ Mais recentes primeiro"}
          </button>
          <ToggleNomePeca />
        </div>
      </div>

      {(listaFeitos.length > 0 || andamentoFeitos.length > 0) && (
        <section className={styles.secao} aria-labelledby="t-feitos">
          <h2 id="t-feitos">
            Feitos por você <span>{listaFeitos.length || andamentoFeitos.length}</span>
          </h2>
          <ListaLimitada classe={styles.listaFeitos} itens={listaFeitos.length ? listaFeitos : andamentoFeitos} chave="feitos">
            {(e) => <CartaoFeito e={e} f={feitos.get(e.id)!} andamento={andamento.get(e.id)} mostrarPeca={mostrarPeca} />}
          </ListaLimitada>
        </section>
      )}

      {filtro !== "feitos" && (
        <section className={styles.secao} aria-labelledby="t-fazer">
          <h2 id="t-fazer">
            {filtro === "andamento" ? "Em andamento" : feitos.size ? "Para fazer" : "Exames"} <span>{listaFazer.length}</span>
          </h2>
          {listaFazer.length ? (
            <ListaLimitada classe={styles.list} itens={listaFazer} chave="fazer">
              {(e) => <CartaoExame e={e} andamento={andamento.get(e.id)} mostrarPeca={mostrarPeca} />}
            </ListaLimitada>
          ) : (
            <p className={styles.nenhum}>
              {filtro === "andamento" ? "Nenhum simulado em andamento." : busca ? "Nenhum exame encontrado." : "Você já fez todos os exames. Refaça os de nota mais baixa!"}
            </p>
          )}
        </section>
      )}
      {filtro === "feitos" && !listaFeitos.length && <p className={styles.nenhum}>{busca ? "Nenhum exame encontrado." : "Você ainda não terminou nenhum simulado."}</p>}
    </>
  );
}

/** Uma lista de cartões que, no celular, mostra os 10 primeiros e um botão para o resto (no computador, todos). */
function ListaLimitada({ itens, classe, chave, children }: { itens: ExameDaLista[]; classe: string; chave: string; children: (e: ExameDaLista) => ReactNode }) {
  const [todos, setTodos] = useState(false);
  return (
    <>
      <ul className={classe} data-todos={todos || undefined} id={`lista-${chave}`}>
        {itens.map((e, i) => (
          <li key={e.id} data-alem={i >= NO_CELULAR || undefined}>
            {children(e)}
          </li>
        ))}
      </ul>
      {itens.length > NO_CELULAR && (
        <button type="button" className={styles.mostrarTodos} aria-expanded={todos} aria-controls={`lista-${chave}`} onClick={() => setTodos((v) => !v)}>
          {todos ? "Mostrar só os 10 mais recentes" : `Mostrar todos (${itens.length})`}
        </button>
      )}
    </>
  );
}

/** As etiquetas do exame: lei nova, gabarito preliminar, beta. */
function Etiquetas({ e }: { e: ExameDaLista }) {
  return (
    <span className={styles.etiquetas}>
      {e.leiNova && <span title="A versão atualizada traz aviso de lei nova">Lei nova</span>}
      {e.preliminar && <span title="A FGV ainda não publicou o gabarito definitivo">Gabarito preliminar</span>}
      {!e.revisado && <span title="Transcrição ainda não revisada">Beta</span>}
      {!e.corrigivel && <span>Gabarito em breve</span>}
    </span>
  );
}

/** Um exame ainda não feito: compacto, com o tempo de prova se estiver em andamento. */
function CartaoExame({ e, andamento, mostrarPeca }: { e: ExameDaLista; andamento?: Andamento; mostrarPeca: boolean }) {
  return (
    <Link href={e.corrigivel ? `/simulados/${e.id}/` : `/provas/#exame-${e.id}`} className={`card ${styles.item}`} data-estado={andamento ? "andamento" : undefined}>
      <span className={styles.num}>{e.numeral}</span>
      <span className={styles.info}>
        <strong>
          {e.numero}º Exame{e.variante ? ` (${e.variante})` : ""}
        </strong>
        <span className="muted">{[e.aplicacao ? dataBR(e.aplicacao) : null, mostrarPeca ? e.peca : null].filter(Boolean).join(" · ")}</span>
        <Etiquetas e={e} />
      </span>
      <span className={styles.situacao}>
        {andamento ? (
          <>
            <small>em andamento</small>
            <b>{fmtTempo(andamento.decorrido)}</b>
          </>
        ) : (
          e.corrigivel && <span className={styles.fazer}>Fazer →</span>
        )}
      </span>
    </Link>
  );
}

/**
 * Um exame feito: a melhor nota num anel, a nota de cada parte em barras, a evolução desde a primeira tentativa e as
 * ações (ver a correção da melhor, refazer).
 */
function CartaoFeito({
  e,
  f,
  andamento,
  mostrarPeca,
}: {
  e: ExameDaLista;
  f: Feito;
  andamento?: { decorrido: number };
  mostrarPeca: boolean;
}) {
  const m = f.melhor;
  const total = m.resultado.total;
  const maximo = m.resultado.maximo || 10;
  const estado = estadoDaNota(total);
  const anel = 2 * Math.PI * 22;
  const evolucao = f.vezes > 1 ? total - f.primeira.resultado.total : null;
  return (
    <article className={`card ${styles.feito}`} data-estado={estado}>
      <div className={styles.feitoTopo}>
        <span className={styles.num}>{e.numeral}</span>
        <span className={styles.info}>
          <Link href={hrefCorrecao(m)} className={styles.esticado}>
            <strong>
              {e.numero}º Exame{e.variante ? ` (${e.variante})` : ""}
            </strong>
          </Link>
          <span className="muted">{[e.aplicacao ? dataBR(e.aplicacao) : null, mostrarPeca ? e.peca : null].filter(Boolean).join(" · ")}</span>
          <Etiquetas e={e} />
        </span>
        <span className={styles.anelNota} data-estado={estado} title={`Melhor nota: ${fmtNota(total)} de ${fmtNota(maximo)}`}>
          <svg viewBox="0 0 52 52" aria-hidden>
            <circle cx="26" cy="26" r="22" />
            {total > 0 && <circle cx="26" cy="26" r="22" style={{ strokeDasharray: `${(total / maximo) * anel} ${anel}` }} />}
          </svg>
          <b>{fmtNota(total)}</b>
        </span>
      </div>

      <ul className={styles.partes} aria-label="Nota da melhor tentativa por parte">
        {m.resultado.partes.map((p) => {
          const fr = p.valor ? Math.max(0, Math.min(1, p.obtido / p.valor)) : 0;
          return (
            <li key={p.parte} data-peca={p.parte === "peca" || undefined} title={`${p.parte === "peca" ? "Peça" : `Questão ${p.parte.slice(1)}`}: ${fmtNota(p.obtido)} de ${fmtNota(p.valor)}`}>
              <span>{p.parte === "peca" ? "Peça" : `Q${p.parte.slice(1)}`}</span>
              <span className={styles.barraParte} aria-hidden>
                <span style={{ width: `${fr * 100}%` }} data-nivel={fr >= 0.7 ? "alto" : fr >= 0.4 ? "medio" : "baixo"} />
              </span>
              <b>{fmtNota(p.obtido)}</b>
            </li>
          );
        })}
      </ul>

      <p className={styles.feitoRodape}>
        <span>
          {f.vezes === 1 ? "1 tentativa" : `${f.vezes} tentativas`}
          {evolucao !== null && (
            <span data-estado={evolucao >= 0 ? "ok" : "bad"} title="Da primeira tentativa até a melhor">
              {" "}
              {evolucao >= 0 ? "▲" : "▼"} {fmtNota(Math.abs(evolucao))}
            </span>
          )}{" "}
          · última em {diaMes(f.ultima.criadaEm)}
          {m.versao === "atualizada" ? " · atualizada" : ""} · ⏱ {fmtTempo(m.duracaoSeg)}
        </span>
      </p>
      {andamento && <p className={styles.feitoAndamento}>Refazendo: {fmtTempo(andamento.decorrido)} de prova salvos</p>}
      <div className={styles.feitoAcoes}>
        <Link href={hrefCorrecao(m)} className="btn btn-ghost btn-sm">
          Ver a correção
        </Link>
        <Link href={`/simulados/${e.id}/`} className="btn btn-gold btn-sm">
          {andamento ? "Continuar" : "Refazer"}
        </Link>
      </div>
    </article>
  );
}

/**
 * O painel do topo: o anel dos feitos, a evolução das notas, o próximo passo (a prova em andamento e o simulado
 * sugerido, com a mesma regra das Estatísticas) e o mapa dos exames.
 */
function Painel({
  exames,
  corrigiveis,
  pessoal,
  nomesPecas,
  mostrarPeca,
}: {
  exames: ExameDaLista[];
  corrigiveis: number;
  pessoal: Pessoal | null;
  nomesPecas: Record<string, string>;
  mostrarPeca: boolean;
}) {
  const router = useRouter();
  // a explicação da sugestão fica fechada: ela pode dizer a peça do exame
  const [motivoDe, setMotivoDe] = useState<string | null>(null);
  const feitos = pessoal?.feitos ?? new Map<string, Feito>();
  const andamento = pessoal?.andamento ?? new Map<string, Andamento>();
  const melhores = [...feitos.values()].map((f) => f.melhor.resultado.total);
  const media = melhores.length ? melhores.reduce((s, n) => s + n, 0) / melhores.length : null;
  const aprovados = melhores.filter((n) => n >= NOTA_CORTE).length;
  // a sugestão: um exame não feito da peça que mais cai entre as que a pessoa menos treinou; com todos feitos, o de nota mais baixa
  const sugestao = pessoal
    ? sugerirSimulado(
        exames.map((e) => ({ ...e, noSite: true, pecas: [e.pecaTipo] })),
        new Map([...feitos].map(([id, f]) => [id, { exameId: id, total: f.melhor.resultado.total }])),
        (t) => nomesPecas[t] ?? t,
        mostrarPeca,
      )
    : null;
  const emAndamento = [...andamento.entries()].sort((a, b) => b[1].atualizadoEm - a[1].atualizadoEm)[0];
  const exameEmAndamento = emAndamento && exames.find((x) => x.id === emAndamento[0]);
  const anel = 2 * Math.PI * 40;

  // a evolução: as últimas 12 tentativas, de 0 a 10, com a linha de corte
  const ultimas = (pessoal?.tentativas ?? []).slice(-12);
  const W = 320;
  const H = 110;
  const x = (i: number) => (ultimas.length > 1 ? 24 + (i / (ultimas.length - 1)) * (W - 36) : W / 2);
  const y = (v: number) => 8 + (1 - Math.max(0, Math.min(10, v)) / 10) * (H - 24);
  const numeralDe = (id: string) => exames.find((e) => e.id === id)?.numeral ?? id;

  // o mapa: do I ao último, na ordem da prova
  const cronologico = [...exames].reverse();

  return (
    <section className={styles.painel} aria-label="O seu andamento">
      <div className={styles.progressoGeral}>
        <span className={styles.anelGrande}>
          <svg viewBox="0 0 100 100" aria-hidden>
            <circle cx="50" cy="50" r="40" />
            {feitos.size > 0 && <circle cx="50" cy="50" r="40" style={{ strokeDasharray: `${(feitos.size / Math.max(1, corrigiveis)) * anel} ${anel}` }} />}
          </svg>
          <span>
            <b>{pessoal ? feitos.size : "—"}</b>
            <small>de {corrigiveis}</small>
          </span>
        </span>
        <dl className={styles.resumo}>
          <div>
            <dt>Média das melhores</dt>
            <dd data-estado={media === null ? undefined : estadoDaNota(media)}>{media === null ? "—" : fmtNota(media)}</dd>
          </div>
          <div>
            <dt>Acima do corte</dt>
            <dd>{melhores.length ? `${aprovados} de ${melhores.length}` : "—"}</dd>
          </div>
          <div>
            <dt>Tentativas</dt>
            <dd>{pessoal ? pessoal.tentativas.length : "—"}</dd>
          </div>
        </dl>
      </div>

      <div className={styles.evolucao}>
        <span className={styles.rotulo}>
          Evolução das notas <small className={styles.chaveCorte}>nota de corte {fmtNota(NOTA_CORTE)}</small>
        </span>
        {ultimas.length ? (
          <svg viewBox={`0 0 ${W} ${H}`} className={styles.grafico} role="group" aria-label={`Notas: ${ultimas.map((t) => `${numeralDe(t.exameId)} ${fmtNota(t.resultado.total)}`).join(", ")}`}>
            {[0, 5, 10].map((v) => (
              <g key={v}>
                <line x1="20" x2={W} y1={y(v)} y2={y(v)} className={styles.grade} />
                <text x="0" y={y(v) + 4} className={styles.eixo}>
                  {v}
                </text>
              </g>
            ))}
            <line x1="20" x2={W} y1={y(NOTA_CORTE)} y2={y(NOTA_CORTE)} className={styles.corte} />
            {ultimas.length > 1 && <polyline points={ultimas.map((t, i) => `${x(i)},${y(t.resultado.total)}`).join(" ")} className={styles.linha} />}
            {ultimas.map((t, i) => (
              <a
                key={t.id}
                href={hrefCorrecao(t)}
                className={styles.ponto}
                aria-label={`${numeralDe(t.exameId)} Exame: ${fmtNota(t.resultado.total)}. Abrir a correção`}
                onClick={(ev) => {
                  if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button > 0) return;
                  ev.preventDefault();
                  router.push(hrefCorrecao(t));
                }}
              >
                <title>{`${numeralDe(t.exameId)} Exame · ${fmtNota(t.resultado.total)} · ${new Date(t.criadaEm).toLocaleDateString("pt-BR")} — abrir a correção`}</title>
                <circle cx={x(i)} cy={y(t.resultado.total)} r="11" className={styles.alvo} />
                <circle cx={x(i)} cy={y(t.resultado.total)} r="4.5" data-estado={estadoDaNota(t.resultado.total)} />
              </a>
            ))}
            {ultimas.length > 1 && (
              <>
                <text x={x(0)} y={H - 2} textAnchor="middle" className={styles.eixo}>
                  {numeralDe(ultimas[0]!.exameId)}
                </text>
                <text x={x(ultimas.length - 1)} y={H - 2} textAnchor="middle" className={styles.eixo}>
                  {numeralDe(ultimas.at(-1)!.exameId)}
                </text>
              </>
            )}
          </svg>
        ) : (
          <p className={styles.semDados}>Faça o primeiro simulado: cada nota vira um ponto aqui, e o ponto abre a correção.</p>
        )}
      </div>

      <div className={styles.atalhos}>
        {exameEmAndamento && emAndamento && (
          <Link href={`/simulados/${exameEmAndamento.id}/`} className={`${styles.atalho} ${styles.atalhoAndamento}`}>
            <span className={styles.rotulo}>Em andamento{emAndamento[1].versao === "atualizada" ? " · versão atualizada" : ""}</span>
            <strong>{numeralComArabico(exameEmAndamento)} Exame</strong>
            <span>⏱ {fmtTempo(emAndamento[1].decorrido)} de prova · continuar →</span>
          </Link>
        )}
        {sugestao && (
          <div className={styles.sugestao}>
            <span className={styles.rotulo}>Próximo simulado sugerido</span>
            <strong>
              {numeralComArabico(sugestao.exame)} Exame
              {sugestao.exame.aplicacao ? <small> · {sugestao.exame.aplicacao.slice(0, 4)}</small> : null}
            </strong>
            {motivoDe === sugestao.exame.id ? (
              <p className={styles.sugestaoMotivo}>
                {sugestao.motivo}{" "}
                <button type="button" className={styles.linkBotao} onClick={() => setMotivoDe(null)}>
                  Esconder
                </button>
              </p>
            ) : (
              <p className={styles.sugestaoMotivo}>
                <button type="button" className={styles.linkBotao} onClick={() => setMotivoDe(sugestao.exame.id)} aria-describedby="aviso-motivo-simulado">
                  Por que este exame?
                </button>{" "}
                <span id="aviso-motivo-simulado">
                  {mostrarPeca ? "Atenção: a explicação diz qual é a peça. Se quer fazer sem saber, não abra." : "A explicação não diz a peça."}
                </span>
              </p>
            )}
            <Link className="btn btn-gold btn-sm" href={`/simulados/${sugestao.exame.id}/`}>
              {andamento.has(sugestao.exame.id) ? "Continuar o simulado" : feitos.has(sugestao.exame.id) ? "Refazer o simulado" : "Fazer o simulado"}
            </Link>
          </div>
        )}
      </div>

      <div className={styles.mapa}>
        <span className={styles.rotulo}>
          Mapa dos exames <small>do I ao {cronologico.at(-1)?.numeral}</small>
        </span>
        <ol className={styles.quadros}>
          {cronologico.map((e) => {
            const f = feitos.get(e.id);
            const estado = andamento.has(e.id) && !f ? "andamento" : f ? estadoDaNota(f.melhor.resultado.total) : e.corrigivel ? undefined : "sem";
            return (
              <li key={e.id}>
                <Link
                  href={f ? hrefCorrecao(f.melhor) : e.corrigivel ? `/simulados/${e.id}/` : `/provas/#exame-${e.id}`}
                  data-estado={estado}
                  title={`${e.numeral} Exame${e.variante ? ` (${e.variante})` : ""} · ${f ? `melhor nota ${fmtNota(f.melhor.resultado.total)}` : andamento.has(e.id) ? "em andamento" : "não feito"}`}
                >
                  {e.numero}
                  {e.variante ? "*" : ""}
                </Link>
              </li>
            );
          })}
        </ol>
        <span className={styles.legenda}>
          <span data-estado="ok">acima do corte</span>
          <span data-estado="bad">abaixo</span>
          <span data-estado="andamento">em andamento</span>
          <span>não feito</span>
        </span>
      </div>
    </section>
  );
}
