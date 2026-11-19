"use client";

// O resumo do desempenho que abre sobre o link "Estatísticas" do cabeçalho: os simulados (quantos, a média, a
// tendência e as últimas notas), o treino, a sequência de dias de estudo, o ponto fraco da peça e o artigo que a pessoa
// mais erra. Tudo do navegador, lido ao abrir. Cada bolinha das notas abre a correção daquele simulado; o mouse sobre um
// dia do calendário mostra o que houve nele.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type CSSProperties } from "react";
import { ATIVIDADE_VAZIA, lerAtividade } from "@/lib/atividade";
import { NOTA_CORTE } from "@/lib/correcao/grader";
import { agregar, lerEventos, maisErrados } from "@/lib/erros";
import { calendario, melhoresPorExame, pct, resumirTentativa, resumoSimulados, resumoTreino, type DiaCalendario } from "@/lib/estatisticas/desempenho";
import { fmtNota } from "@/lib/formato";
import { listarTentativas } from "@/lib/tentativas";
import { CATEGORIAS, nomeCategoria } from "@/quiz/categorias";
import type { Categoria } from "@/quiz/types";
import styles from "./ResumoDesempenho.module.css";
import { diaCurto, numeralDe, pctTexto, plural } from "./resumos/comum";

const hrefDaCorrecao = (t: { id: string; exameId: string }) => `/simulados/${t.exameId}/resultado/?t=${t.id}`;

function ler() {
  const tentativas = listarTentativas()
    .filter((t) => t?.resultado?.partes)
    .map(resumirTentativa)
    .sort((a, b) => a.quando - b.quando);
  let atividade = ATIVIDADE_VAZIA;
  try {
    atividade = lerAtividade();
  } catch {
    /* sem armazenamento: fica vazio */
  }
  const eventos = lerEventos();
  return { tentativas, atividade, eventos, agora: Date.now() };
}

export default function ResumoDesempenho({ totalSimulados, onSair }: { totalSimulados: number; onSair: () => void }) {
  const d = useMemo(() => ler(), []);
  const router = useRouter();
  const [diaVisto, setDiaVisto] = useState<string | null>(null);
  const sim = resumoSimulados(d.tentativas);
  const feitos = melhoresPorExame(d.tentativas).size;
  const treino = resumoTreino(d.atividade, null);
  const respostas = treino.a + treino.e;
  const cal = calendario(d.atividade, d.tentativas, d.eventos, new Date(d.agora), 2);
  const dias = cal.semanas.flat();
  const ultimas = d.tentativas.slice(-10);
  const fraca = [...sim.secoes].filter((s) => s.f.v >= 0.5).sort((a, b) => pct(a.f) - pct(b.f))[0];
  const errado = maisErrados(agregar(d.eventos, { janelaDias: null, agora: d.agora }), "baixo")[0];
  const categorias = CATEGORIAS.map((c) => ({ c, p: treino.porCategoria[c.id] }))
    .filter((x) => x.p && x.p[0] + x.p[1] >= 5)
    .map((x) => ({ nome: x.c.nome, f: x.p![0] / (x.p![0] + x.p![1]) }))
    .sort((a, b) => a.f - b.f);
  const nada = !d.tentativas.length && !respostas && !d.eventos.length;

  if (nada)
    return (
      <div className={styles.vazio}>
        <p className={styles.titulo}>Seu desempenho</p>
        <p>Ainda não há nada seu por aqui. Faça um simulado ou treine questões: o resumo aparece neste cartão.</p>
        <p className={styles.acoes}>
          <Link href="/simulados/" onClick={onSair}>
            Fazer um simulado
          </Link>
          <Link href="/treino/" onClick={onSair}>
            Treinar questões
          </Link>
        </p>
      </div>
    );

  // as últimas notas: uma linha de 0 a 10, com a linha de corte
  const W = 300;
  const H = 54;
  const x = (i: number) => (ultimas.length > 1 ? 6 + (i / (ultimas.length - 1)) * (W - 12) : W / 2);
  const y = (v: number) => 4 + (1 - Math.max(0, Math.min(10, v)) / 10) * (H - 8);
  const anel = 2 * Math.PI * 15;

  return (
    <div className={styles.corpo}>
      <p className={styles.titulo}>
        Seu desempenho <span>neste navegador</span>
      </p>

      <div className={styles.numeros}>
        <div>
          <svg viewBox="0 0 36 36" className={styles.anel} aria-hidden>
            <circle cx="18" cy="18" r="15" />
            <circle cx="18" cy="18" r="15" style={{ strokeDasharray: `${(feitos / Math.max(1, totalSimulados)) * anel} ${anel}` } as CSSProperties} />
          </svg>
          <b>{feitos}</b>
          <small>de {totalSimulados} simulados</small>
        </div>
        <div>
          <b data-estado={sim.media === null ? undefined : sim.media >= NOTA_CORTE ? "ok" : "bad"}>{sim.media === null ? "—" : fmtNota(sim.media)}</b>
          <small>
            média{sim.tendencia !== null && <span data-estado={sim.tendencia >= 0 ? "ok" : "bad"}> {sim.tendencia >= 0 ? "▲" : "▼"} {fmtNota(Math.abs(sim.tendencia))}</span>}
          </small>
        </div>
        <div>
          <b>{respostas ? pctTexto(treino.a / respostas) : "—"}</b>
          <small>{respostas ? `de acerto em ${respostas.toLocaleString("pt-BR")} respostas` : "sem treino ainda"}</small>
        </div>
      </div>

      {ultimas.length > 0 && (
        <div className={styles.bloco}>
          <span className={styles.rotulo}>
            {ultimas.length === 1 ? "Último simulado" : `Últimos ${ultimas.length} simulados`} · {sim.aprovados} de {sim.n} com nota de aprovação
          </span>
          <svg viewBox={`0 0 ${W} ${H}`} className={styles.notas} role="group" aria-label={`Notas: ${ultimas.map((t) => `${numeralDe(t.exameId)} ${fmtNota(t.total)}`).join(", ")}`}>
            <line x1="0" x2={W} y1={y(NOTA_CORTE)} y2={y(NOTA_CORTE)} className={styles.corte} />
            {ultimas.length > 1 && <polyline points={ultimas.map((t, i) => `${x(i)},${y(t.total)}`).join(" ")} className={styles.linha} />}
            {ultimas.map((t, i) => (
              // cada bolinha abre a correção daquele simulado (a área de toque é maior que o desenho)
              <a
                key={t.id}
                href={hrefDaCorrecao(t)}
                className={styles.ponto}
                aria-label={`${numeralDe(t.exameId)} Exame: ${fmtNota(t.total)}. Abrir a correção`}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;
                  e.preventDefault();
                  onSair();
                  router.push(hrefDaCorrecao(t));
                }}
              >
                <title>{`${numeralDe(t.exameId)} Exame: ${fmtNota(t.total)} · ${new Date(t.quando).toLocaleDateString("pt-BR")} — abrir a correção`}</title>
                <circle cx={x(i)} cy={y(t.total)} r="10" className={styles.alvo} />
                <circle cx={x(i)} cy={y(t.total)} r="3.5" data-estado={t.aprovado ? "ok" : "bad"} />
              </a>
            ))}
          </svg>
          {(() => {
            const u = ultimas.at(-1)!;
            return (
              <span className={styles.legenda}>
                o último: {numeralDe(u.exameId)} Exame, <b data-estado={u.aprovado ? "ok" : "bad"}>{fmtNota(u.total)}</b> · peça {pctTexto(pct(sim.peca))} · questões{" "}
                {pctTexto(pct(sim.questoes))}
              </span>
            );
          })()}
        </div>
      )}

      <div className={styles.bloco}>
        <span className={styles.rotulo}>
          {cal.sequenciaAtual} {cal.sequenciaAtual === 1 ? "dia seguido" : "dias seguidos"} de estudo · recorde de {cal.maiorSequencia}
        </span>
        <span className={styles.dias} onPointerLeave={() => setDiaVisto(null)}>
          {dias.map((x) => (
            <span
              key={x.dia}
              data-nivel={x.futuro ? undefined : x.nivel}
              data-futuro={x.futuro || undefined}
              data-hoje={x.dia === cal.hoje || undefined}
              data-visto={x.dia === diaVisto || undefined}
              onPointerEnter={() => !x.futuro && setDiaVisto(x.dia)}
              aria-hidden
            />
          ))}
        </span>
        <DetalheDoDia dia={dias.find((x) => x.dia === (diaVisto ?? cal.hoje))!} hoje={cal.hoje} atividade={d.atividade} tentativas={d.tentativas} onSair={onSair} />
      </div>

      {(fraca || categorias[0] || errado) && (
        <ul className={styles.pontos}>
          {fraca && pct(fraca.f) < 0.75 && (
            <li>
              <span>Ponto fraco da peça</span>
              <b>
                {fraca.nome} · {pctTexto(pct(fraca.f))}
              </b>
            </li>
          )}
          {categorias[0] && categorias[0].f < 0.8 && (
            <li>
              <span>Mais erra no treino</span>
              <b>
                {categorias[0].nome} · {pctTexto(categorias[0].f)}
              </b>
            </li>
          )}
          {errado && (
            <li>
              <span>Artigo que mais erra</span>
              <b>
                {errado.diploma.startsWith("sumulas-")
                  ? `Súmula ${errado.artigo} do ${errado.diploma.slice(8).toUpperCase()}`
                  : `Art. ${errado.artigo.toUpperCase()} · ${errado.diploma.toUpperCase()}`}{" "}
                · {errado.erros} {errado.erros === 1 ? "erro" : "erros"}
              </b>
            </li>
          )}
        </ul>
      )}

      <p className={styles.acoes}>
        <Link href="/estatisticas/#desempenho" onClick={onSair}>
          Ver tudo em Estatísticas →
        </Link>
      </p>
    </div>
  );
}

/** O que houve no dia sob o mouse (ou hoje): as respostas e o acerto, o tempo, os tipos de pergunta e os simulados. */
function DetalheDoDia({
  dia,
  hoje,
  atividade,
  tentativas,
  onSair,
}: {
  dia: DiaCalendario;
  hoje: string;
  atividade: ReturnType<typeof ler>["atividade"];
  tentativas: ReturnType<typeof ler>["tentativas"];
  onSair: () => void;
}) {
  const at = atividade.dias[dia.dia];
  const sims = dia.tentativas.map((id) => tentativas.find((t) => t.id === id)).filter((t) => t !== undefined);
  const tipos = Object.entries(at?.c ?? {})
    .map(([c, p]) => ({ nome: nomeCategoria(c as Categoria), n: p[0] + p[1] }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 2);
  const minutos = at?.ms ? Math.round(at.ms / 60000) : 0;
  const titulo = dia.dia === hoje ? `Hoje, ${diaCurto(dia.dia)}` : diaCurto(dia.dia);
  return (
    <div className={styles.dia} aria-live="polite">
      <b>{titulo}</b>
      {!dia.respostas && !sims.length ? (
        <span> · sem estudo</span>
      ) : (
        <>
          {dia.respostas > 0 && (
            <span>
              {" "}
              · {plural(dia.respostas, "resposta", "respostas")}, {pctTexto(dia.acertos / dia.respostas)} certas
              {minutos > 0 ? ` · ${minutos} min` : ""}
            </span>
          )}
          {tipos.length > 0 && <small>{tipos.map((t) => `${t.nome} (${t.n})`).join(" · ")}</small>}
          {sims.map((t) => (
            <Link key={t.id} href={hrefDaCorrecao(t)} onClick={onSair}>
              Simulado do {numeralDe(t.exameId)} Exame: <b data-estado={t.aprovado ? "ok" : "bad"}>{fmtNota(t.total)}</b> →
            </Link>
          ))}
        </>
      )}
    </div>
  );
}
