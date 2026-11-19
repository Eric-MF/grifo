"use client";

import { fmtNota, fmtTempo } from "@/lib/formato";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PromoSlot } from "@/components/PromoSlot";
import { RichText } from "@/components/RichText";
import { ShareCard } from "@/components/ShareCard";
import { SITE } from "@/config/site";
import { useMostrarPeca } from "@/components/NomePeca";
import type { Exame } from "@/content/schema";
import { numeralComArabico } from "@/content/titulo";
import { gerarCodigo, impressao, impressaoHex, type ModoCorrecao } from "@/lib/codigo/codigo";
import { NOTA_CORTE, type ResultadoParte } from "@/lib/correcao/grader";
import type { DadosCard } from "@/lib/share/card";
import { caminhoPreviaNota } from "@/lib/share/previas";
import { atualizarTentativa, listarTentativas, obterTentativa, type Tentativa } from "@/lib/tentativas";
import { CorrecaoIA } from "./CorrecaoIA";
import { CorrecaoParte, PainelCorrecao, RotulosLaterais } from "./CorrecaoParte";
import styles from "./resultado.module.css";

/**
 * Leva a página à primeira tabela de correção abaixo da barra de controles (ou, se não houver nenhuma abaixo, à última
 * acima). Se alguma tabela já está na tela, a página fica como está.
 */
function irParaPrimeiraTabela() {
  const margem = 120;
  const tabelas = [...document.querySelectorAll<HTMLElement>("[data-tabela-correcao]")];
  const naTela = tabelas.some((t) => {
    const r = t.getBoundingClientRect();
    return r.bottom > margem && r.top < window.innerHeight;
  });
  if (naTela) return;
  const alvo = tabelas.find((t) => t.getBoundingClientRect().top > margem) ?? tabelas.filter((t) => t.getBoundingClientRect().top <= margem).at(-1);
  if (!alvo) return;
  window.scrollTo({ top: window.scrollY + alvo.getBoundingClientRect().top - margem, behavior: "smooth" });
}

/** Enquanto a tentativa é lida do navegador (e no HTML estático, antes de a página ganhar vida). */
export function CarregandoResultado() {
  return (
    <div className={`container section ${styles.carregando}`} role="status" aria-live="polite">
      <span className={styles.carregador} aria-hidden />
      <p>Abrindo a correção…</p>
    </div>
  );
}

/** O nome curto de uma parte na correção: "Peça", ou "Q1", "Q2"… (economiza espaço nas listas). */
function rotuloCurto(parte: string) {
  return parte === "peca" ? "Peça" : `Q${parte.slice(1)}`;
}

export function Resultado({ original, atualizado, fundoCard }: { original: Exame; atualizado: Exame; fundoCard?: string }) {
  const params = useSearchParams();
  const [t, setT] = useState<Tentativa | null | undefined>(undefined);
  // a correção usa a versão em que a prova foi feita (as tentativas antigas são da original)
  const exame = t?.versao === "atualizada" ? atualizado : original;
  const naAtualizada = t?.versao === "atualizada";
  const [fonte, setFonte] = useState<"auto" | "ia">("auto");
  const [codigos, setCodigos] = useState<{ auto?: string; ia?: string; imp?: number }>({});
  const [mostrarPeca] = useMostrarPeca();
  // o ✂ "retirar pontuação" e os cortes valem só nesta visita: não são salvos, e cada simulado começa sem nenhum
  const [retirar, setRetirar] = useState(false);
  const [cortados, setCortados] = useState<ReadonlySet<string>>(() => new Set());
  const alternarRetirar = () => {
    const ligando = !retirar;
    setRetirar(ligando);
    // ao ligar o ✂, a página vai até a primeira tabela: é lá que os critérios aparecem para serem cortados
    if (ligando) requestAnimationFrame(irParaPrimeiraTabela);
  };
  const alternarCorte = (chave: string) =>
    setCortados((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(chave)) proximo.delete(chave);
      else proximo.add(chave);
      return proximo;
    });

  useEffect(() => {
    const id = params.get("t");
    const tent = id ? obterTentativa(id) : listarTentativas().find((x) => x.exameId === original.id) ?? null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lê URL e localStorage após montar (site estático)
    setT(tent);
  }, [params, original.id]);

  // Gera (uma vez) a impressão digital e os códigos de verificação.
  useEffect(() => {
    if (!t) return;
    let vivo = true;
    (async () => {
      const imp = await impressao({ e: t.exameId, r: t.respostas, p: t.resultado.partes.map((p) => p.obtido), ia: t.ia?.partes.map((p) => p.obtido) }, 16);
      const base = {
        tipo: "simulado" as const,
        exame: exame.numero,
        variante: exame.variante ? 1 : 0,
        atualizado: t.versao === "atualizada",
        data: new Date(t.criadaEm),
        duracaoMin: Math.round(t.duracaoSeg / 60),
        impressao: imp,
      };
      const auto = await gerarCodigo({ ...base, total: t.resultado.total, peca: t.resultado.partes[0].obtido, modo: "auto" });
      const ia = t.ia
        ? await gerarCodigo({ ...base, total: t.ia.total, peca: t.ia.partes[0]?.obtido ?? 0, modo: t.ia.provedor as ModoCorrecao })
        : undefined;
      if (!vivo) return;
      setCodigos({ auto, ia, imp });
      if (t.codigo !== auto) atualizarTentativa(t.id, { codigo: auto, impressao: imp });
    })();
    return () => {
      vivo = false;
    };
  }, [t, exame.numero, exame.variante]);

  const nota = fonte === "ia" && t?.ia ? t.ia.total : t?.resultado.total ?? 0;
  // memo: o card (useMemo abaixo) depende deste array; sem memo ele seria refeito a cada render
  const partesNota = useMemo(
    () => (fonte === "ia" && t?.ia ? t.ia.partes.map((p) => p.obtido) : t?.resultado.partes.map((p) => p.obtido) ?? []),
    [t, fonte],
  );
  const aprovado = nota >= NOTA_CORTE;

  const card: DadosCard | null = useMemo(() => {
    if (!t) return null;
    const codigo = (fonte === "ia" ? codigos.ia : codigos.auto) ?? "gerando…";
    return {
      titulo: `${numeralComArabico(exame)} Exame de Ordem`,
      subtitulo: mostrarPeca ? `Peça: ${exame.peca.nome}` : "2ª fase · Penal",
      nota,
      maximo: t.resultado.maximo,
      aprovado,
      destaque: aprovado ? "Aprovado(a)!" : nota >= 5 ? "Quase lá!" : "Em evolução",
      linhas: [
        { rotulo: "Peça", valor: fmtNota(partesNota[0] ?? 0) },
        ...exame.questoes.map((q, i) => ({ rotulo: `Q${q.n}`, valor: fmtNota(partesNota[i + 1] ?? 0) })),
      ],
      rodape: `${fonte === "ia" && t.ia ? `Corrigido por IA (${t.ia.modelo})` : "Correção automática Grifo"} · ${new Date(t.criadaEm).toLocaleDateString("pt-BR")}`,
      codigo: `Verifique em ${SITE.dominio}/verificar · ${codigo}`,
    };
  }, [t, fonte, codigos, exame, nota, aprovado, partesNota, mostrarPeca]);

  if (t === undefined) return <CarregandoResultado />;
  if (t === null) {
    return (
      <div className="container section">
        <h1>Resultado não encontrado</h1>
        <p className="lead">Os resultados ficam salvos só no navegador em que você fez a prova.</p>
        <Link className="btn btn-gold" href={`/simulados/${exame.id}/`}>
          Fazer este simulado
        </Link>
      </div>
    );
  }

  const r = t.resultado;
  // o tempo gasto em cada parte; as tentativas antigas não o guardam
  const tempoDaParte = (parte: string) =>
    t.tempos ? fmtTempo(parte === "peca" ? t.tempos.peca : t.tempos.questoes[Number(parte.slice(1)) - 1] ?? 0) : "—";
  return (
    <div className="container section">
      <RotulosLaterais texto={`${exame.numero}º Exame · 2ª fase · Direito Penal`} />
      <div className={styles.hero}>
        <div>
          <span className="eyebrow">
            Resultado · {numeralComArabico(exame)} Exame{naAtualizada ? " · versão atualizada" : ""}
          </span>
          <h1 className={styles.nota}>
            <span className={aprovado ? styles.ok : undefined}>{fmtNota(nota)}</span>
            <small> / {fmtNota(r.maximo)}</small>
          </h1>
          <p className={`${styles.status} ${aprovado ? styles.ok : styles.bad}`}>
            {aprovado ? "Acima da nota de corte (6,00). Aprovado(a) no simulado!" : `Faltaram ${fmtNota(NOTA_CORTE - nota)} ponto(s) para a nota de corte (6,00).`}
          </p>
          <p className={styles.tempoTotal}>⏱ Tempo total: {fmtTempo(t.duracaoSeg)}</p>
          {t.ia && (
            <div className={styles.fonte} role="radiogroup" aria-label="Nota exibida">
              <button type="button" role="radio" aria-checked={fonte === "auto"} onClick={() => setFonte("auto")}>
                Automática {fmtNota(r.total)}
              </button>
              <button type="button" role="radio" aria-checked={fonte === "ia"} onClick={() => setFonte("ia")}>
                IA {fmtNota(t.ia.total)}
              </button>
            </div>
          )}
        </div>
        <ol className={styles.barras}>
          {r.partes.map((p, i) => (
            <li key={p.parte}>
              <a className={styles.barraLink} href={`#parte-${p.parte}`} title="Ir para esta parte da correção">
                <span className={styles.barraRotulo}>{rotuloCurto(p.parte)}</span>
                <span className={styles.bar} aria-hidden>
                  <span style={{ width: `${Math.min(100, ((partesNota[i] ?? 0) / p.valor) * 100)}%` }} />
                </span>
                <span className={styles.barraTempo} title="Tempo gasto nesta parte">
                  {tempoDaParte(p.parte)}
                </span>
                <strong>
                  {fmtNota(partesNota[i] ?? 0)} <small>/ {fmtNota(p.valor)}</small>
                </strong>
              </a>
            </li>
          ))}
        </ol>
      </div>

      {exame.observacoes && <p className={styles.disclaimer}>ℹ️ {exame.observacoes}</p>}
      {naAtualizada && (exame.atualizado?.notas.length || exame.atualizado?.correcoes.length) ? (
        <section className={styles.versaoAtual} aria-labelledby="versao-atual">
          <h2 id="versao-atual">O que muda na versão atualizada</h2>
          {exame.atualizado.correcoes.map((c, i) => (
            <div key={`c${i}`}>
              <b>{rotuloCurto(c.alvo)} · Erro material corrigido</b>
              <RichText text={c.motivo} data={exame.aplicacao} />
            </div>
          ))}
          {exame.atualizado.notas.map((n, i) => (
            <div key={`n${i}`}>
              <b>
                {rotuloCurto(n.alvo)}
                {n.item ? `, item ${n.item}` : ""} · {n.lei}
              </b>
              <RichText text={n.texto} data={exame.aplicacao} />
            </div>
          ))}
        </section>
      ) : null}
      <p className={styles.disclaimer}>
        A correção automática aplica a tabela oficial de distribuição de pontos da FGV e procura na sua resposta as teses e
        os dispositivos de cada item. É uma estimativa: o examinador avalia fundamentação e coerência de um jeito que nenhum
        sistema reproduz por completo.
      </p>

      <section className={styles.bloco} aria-labelledby="det">
        <h2 id="det">Onde você ganhou e perdeu pontos</h2>
        <PainelCorrecao retirar={retirar} onRetirar={alternarRetirar} />
        {r.partes.map((p, i) => (
          <Parte
            key={p.parte}
            parte={p}
            enunciado={i === 0 ? exame.peca.enunciado : exame.questoes[i - 1]?.enunciado ?? ""}
            gabarito={i === 0 ? exame.peca.gabarito_comentado : exame.questoes[i - 1]?.gabarito_comentado}
            itens={i === 0 ? exame.peca.itens : exame.questoes[i - 1]?.itens ?? []}
            resposta={i === 0 ? t.respostas.peca : t.respostas.questoes[i - 1] ?? ""}
            aplicacao={exame.aplicacao}
            ia={t.ia?.itens.filter((x) => x.parte === p.parte)}
            retirar={retirar}
            cortados={cortados}
            onAlternarCorte={alternarCorte}
          />
        ))}
      </section>

      <section className={styles.bloco} aria-labelledby="ia">
        <h2 id="ia">Segunda opinião por IA</h2>
        <CorrecaoIA exame={exame} tentativa={t} onConcluir={(nova) => { setT(nova); setFonte("ia"); }} />
      </section>

      <section className={styles.bloco} aria-labelledby="share">
        <h2 id="share">Compartilhe sua nota</h2>
        {card && (
          <ShareCard
            dados={card}
            fundo={fundoCard}
            nomeArquivo={`grifo-exame-${exame.id}-nota-${fmtNota(nota)}.png`}
            previa={caminhoPreviaNota(nota, exame.id)}
            textoPost={`Tirei ${fmtNota(nota)} no simulado do ${numeralComArabico(exame)} Exame da OAB (2ª fase Penal) no Grifo!`}
          />
        )}
        <p className={styles.codigo}>
          Código de verificação: <code>{(fonte === "ia" ? codigos.ia : codigos.auto) ?? "…"}</code>
          {codigos.imp !== undefined && (
            <>
              {" "}· impressão digital da resposta: <code>{impressaoHex(codigos.imp, 16)}</code>
            </>
          )}{" "}
          · <Link href="/verificar/">verificar</Link>
        </p>
      </section>

      <div className={styles.fim}>
        <PromoSlot local="resultado" variant="compact" />
        <div className={styles.ctas}>
          <Link className="btn btn-ghost" href={`/simulados/${exame.id}/${naAtualizada ? "" : "?versao=original"}`}>
            Refazer este exame
          </Link>
          <Link className="btn btn-primary" href="/simulados/">
            Outros exames
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Uma peça ou questão na correção: o título com a nota, o aviso (se houver) e a correção detalhada. */
function Parte({
  parte,
  enunciado,
  gabarito,
  itens,
  resposta,
  aplicacao,
  ia,
  retirar,
  cortados,
  onAlternarCorte,
}: {
  parte: ResultadoParte;
  enunciado: string;
  gabarito?: string;
  itens: Exame["peca"]["itens"];
  resposta: string;
  aplicacao?: string;
  ia?: { n: string; componentes: { id: string; obtido: number; justificativa: string }[] }[];
  retirar: boolean;
  cortados: ReadonlySet<string>;
  onAlternarCorte: (chave: string) => void;
}) {
  // todas as partes começam abertas: o aluno vê a correção inteira, e pode recolher a que quiser
  const [aberto, setAberto] = useState(true);
  return (
    <details id={`parte-${parte.parte}`} className={styles.parte} style={{ scrollMarginTop: 110 }} open={aberto} onToggle={(e) => setAberto((e.target as HTMLDetailsElement).open)}>
      <summary>
        <span className={styles.parteTitulo}>{parte.parte === "peca" ? parte.titulo : rotuloCurto(parte.parte)}</span>
        <span className={styles.parteNota}>
          {fmtNota(parte.obtido)} / {fmtNota(parte.valor)}
        </span>
      </summary>
      {parte.aviso && <p className={`${styles.aviso} ${styles[parte.aviso.tipo]}`}>{parte.aviso.mensagem}</p>}
      <CorrecaoParte
        parte={parte}
        itens={itens}
        enunciado={enunciado}
        gabarito={gabarito}
        resposta={resposta}
        aplicacao={aplicacao}
        ia={ia}
        retirar={retirar}
        cortados={cortados}
        onAlternarCorte={onAlternarCorte}
      />
    </details>
  );
}
