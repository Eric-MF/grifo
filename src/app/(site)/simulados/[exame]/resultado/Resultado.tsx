"use client";

import { fmtNota } from "@/lib/formato";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PromoSlot } from "@/components/PromoSlot";
import { RichText } from "@/components/RichText";
import { ShareCard } from "@/components/ShareCard";
import type { Exame } from "@/content/schema";
import { gerarCodigo, impressao, impressaoHex, type ModoCorrecao } from "@/lib/codigo/codigo";
import { NOTA_CORTE, type ResultadoParte } from "@/lib/correcao/grader";
import type { DadosCard } from "@/lib/share/card";
import { atualizarTentativa, listarTentativas, obterTentativa, type Tentativa } from "@/lib/tentativas";
import { CorrecaoIA } from "./CorrecaoIA";
import styles from "./resultado.module.css";


export function Resultado({ exame, fundoCard }: { exame: Exame; fundoCard?: string }) {
  const params = useSearchParams();
  const [t, setT] = useState<Tentativa | null | undefined>(undefined);
  const [fonte, setFonte] = useState<"auto" | "ia">("auto");
  const [codigos, setCodigos] = useState<{ auto?: string; ia?: string; imp?: number }>({});

  useEffect(() => {
    const id = params.get("t");
    const tent = id ? obterTentativa(id) : listarTentativas().find((x) => x.exameId === exame.id) ?? null;
    setT(tent);
  }, [params, exame.id]);

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
        atualizado: false,
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
      titulo: `${exame.numeral} Exame de Ordem`,
      subtitulo: `Peça: ${exame.peca.nome}`,
      nota,
      maximo: t.resultado.maximo,
      aprovado,
      destaque: aprovado ? "Aprovado(a)!" : nota >= 5 ? "Quase lá!" : "Em evolução",
      linhas: [
        { rotulo: "Peça", valor: fmtNota(partesNota[0] ?? 0) },
        ...exame.questoes.map((q, i) => ({ rotulo: `Q${q.n}`, valor: fmtNota(partesNota[i + 1] ?? 0) })),
      ],
      rodape: `${fonte === "ia" && t.ia ? `Corrigido por IA (${t.ia.modelo})` : "Correção automática Grifo"} · ${new Date(t.criadaEm).toLocaleDateString("pt-BR")}`,
      codigo: `Verifique em grifo.com/verificar · ${codigo}`,
    };
  }, [t, fonte, codigos, exame, nota, aprovado, partesNota]);

  if (t === undefined) return <div className="container section">Carregando…</div>;
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
  return (
    <div className="container section">
      <div className={styles.hero}>
        <div>
          <span className="eyebrow">Resultado · {exame.numeral} Exame</span>
          <h1 className={styles.nota}>
            <span className={aprovado ? styles.ok : undefined}>{fmtNota(nota)}</span>
            <small> / {fmtNota(r.maximo)}</small>
          </h1>
          <p className={`${styles.status} ${aprovado ? styles.ok : styles.bad}`}>
            {aprovado ? "Acima da nota de corte (6,00). Aprovado(a) no simulado!" : `Faltaram ${fmtNota(NOTA_CORTE - nota)} ponto(s) para a nota de corte (6,00).`}
          </p>
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
              <span>{p.parte === "peca" ? "Peça" : `Questão ${p.parte.slice(1)}`}</span>
              <span className={styles.bar} aria-hidden>
                <span style={{ width: `${Math.min(100, ((partesNota[i] ?? 0) / p.valor) * 100)}%` }} />
              </span>
              <strong>
                {fmtNota(partesNota[i] ?? 0)} <small>/ {fmtNota(p.valor)}</small>
              </strong>
            </li>
          ))}
        </ol>
      </div>

      {exame.observacoes && <p className={styles.disclaimer}>ℹ️ {exame.observacoes}</p>}
      <p className={styles.disclaimer}>
        A correção automática aplica a tabela oficial de distribuição de pontos da FGV e procura na sua resposta as teses e
        os dispositivos de cada item. É uma estimativa: o examinador avalia fundamentação e coerência de um jeito que nenhum
        sistema reproduz por completo.
      </p>

      <section className={styles.bloco} aria-labelledby="det">
        <h2 id="det">Onde você ganhou e perdeu pontos</h2>
        {r.partes.map((p, i) => (
          <Parte
            key={p.parte}
            parte={p}
            gabarito={i === 0 ? exame.peca.gabarito_comentado : exame.questoes[i - 1]?.gabarito_comentado}
            ia={t.ia?.itens.filter((x) => x.parte === p.parte)}
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
            textoPost={`Tirei ${fmtNota(nota)} no simulado do ${exame.numeral} Exame da OAB (2ª fase Penal) no Grifo!`}
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
          <Link className="btn btn-ghost" href={`/simulados/${exame.id}/`}>
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

function Parte({ parte, gabarito, ia }: { parte: ResultadoParte; gabarito?: string; ia?: { n: string; componentes: { id: string; obtido: number; justificativa: string }[] }[] }) {
  const [aberto, setAberto] = useState(parte.parte === "peca");
  return (
    <details className={styles.parte} open={aberto} onToggle={(e) => setAberto((e.target as HTMLDetailsElement).open)}>
      <summary>
        <span className={styles.parteTitulo}>{parte.titulo}</span>
        <span className={styles.parteNota}>
          {fmtNota(parte.obtido)} / {fmtNota(parte.valor)}
        </span>
      </summary>
      {parte.aviso && <p className={`${styles.aviso} ${styles[parte.aviso.tipo]}`}>{parte.aviso.mensagem}</p>}
      <table className={styles.tabela}>
        <thead>
          <tr>
            <th scope="col">Item</th>
            <th scope="col">O que a banca pedia</th>
            <th scope="col" className={styles.num}>
              Pontos
            </th>
          </tr>
        </thead>
        <tbody>
          {parte.itens.map((it) => {
            const itemIA = ia?.find((x) => x.n === it.n);
            return (
              <tr key={it.n} className={it.obtido === it.valor ? styles.cheio : it.obtido === 0 ? styles.zero : styles.parcial}>
                <td className={styles.itemN}>{it.n}</td>
                <td>
                  {it.secao && <span className={styles.secao}>{it.secao}</span>}
                  <p className={styles.desc}>{it.descricao}</p>
                  <ul className={styles.comps}>
                    {it.componentes.map((c) => {
                      const cIA = itemIA?.componentes.find((x) => x.id === c.id);
                      return (
                        <li key={c.id} className={c.obtido > 0 ? styles.hit : styles.miss}>
                          <span className={styles.icon} aria-hidden>
                            {c.obtido > 0 ? "✓" : "✗"}
                          </span>
                          <span>
                            <strong>{c.rotulo}</strong> <span className="muted">({fmtNota(c.valor)})</span>
                            {c.obtido > 0 && c.evidencias[0] && <span className={styles.evid}>“{c.evidencias[0]}”</span>}
                            {c.obtido === 0 && c.bloqueadoPor && (
                              <span className={styles.falta}>Só pontua junto com “{c.bloqueadoPor}” (a mera citação do dispositivo não pontua).</span>
                            )}
                            {c.obtido === 0 && !c.bloqueadoPor && c.faltou.length > 0 && (
                              <span className={styles.falta}>Não encontramos: {c.faltou.join("; ")}</span>
                            )}
                            {cIA && (
                              <span className={styles.iaNote}>
                                IA: {fmtNota(cIA.obtido)} · {cIA.justificativa}
                              </span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </td>
                <td className={styles.num}>
                  {fmtNota(it.obtido)}/{fmtNota(it.valor)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {gabarito && (
        <details className={styles.gabarito}>
          <summary>Ver gabarito comentado da FGV</summary>
          <RichText text={gabarito} />
        </details>
      )}
    </details>
  );
}
