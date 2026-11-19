"use client";

// Sortear um simulado: um exame ao acaso entre os que faltam (ou entre todos), sem dizer a peça. Dá para sortear a
// peça primeiro (todas com a mesma chance) ou ficar numa peça só.
import Link from "next/link";
import { useState } from "react";
import { fmtNota } from "@/lib/formato";
import { anoDoExame, exameEmAlgarismos } from "@/lib/estatisticas/rotulos";
import type { ExameEstat, PecaInfo } from "@/lib/estatisticas/tipos";
import { Numeral } from "./Graficos";
import styles from "./estatisticas.module.css";

/** "exame": qualquer exame (a peça que mais cai sai mais); "peca": a peça ao acaso, depois o exame; ou um tipo de peça. */
type Modo = "exame" | "peca" | string;

const aoAcaso = <T,>(xs: T[], evitar?: T): T | undefined => {
  const pool = xs.length > 1 && evitar !== undefined ? xs.filter((x) => x !== evitar) : xs;
  return pool[Math.floor(Math.random() * pool.length)];
};

export function Sorteio({
  exames,
  melhores,
  pecas,
  onSorteado,
}: {
  /** os exames com simulado */
  exames: ExameEstat[];
  melhores: Map<string, { total: number; id: string }>;
  pecas: Record<string, PecaInfo>;
  onSorteado: (id: string) => void;
}) {
  const [incluirFeitos, setIncluirFeitos] = useState(false);
  const [modo, setModo] = useState<Modo>("exame");
  const [sorteado, setSorteado] = useState<ExameEstat | null>(null);
  const base = exames.filter((e) => incluirFeitos || !melhores.has(e.id));
  const tipo = (e: ExameEstat) => e.pecas[0]!;
  const tipos = [...new Set(base.map(tipo))].sort((a, b) => (pecas[a]?.nome ?? a).localeCompare(pecas[b]?.nome ?? b, "pt-BR"));
  const umTipo = modo !== "exame" && modo !== "peca";
  const pool = umTipo ? base.filter((e) => tipo(e) === modo) : base;

  const sortear = () => {
    let candidatos = pool;
    if (modo === "peca") {
      const t = aoAcaso(tipos);
      candidatos = base.filter((e) => tipo(e) === t);
    }
    const e = aoAcaso(candidatos, sorteado ?? undefined);
    if (!e) return;
    setSorteado(e);
    onSorteado(e.id);
  };
  const melhor = sorteado ? melhores.get(sorteado.id) : undefined;

  return (
    <div className={styles.sorteio}>
      <span className={styles.sugestaoRotulo}>Sortear um simulado</span>
      <p className={styles.sorteioDiz}>Um exame ao acaso, sem mostrar a peça: para treinar como na prova, sem saber o que vem.</p>
      <div className={styles.sorteioControles}>
        <label className={styles.ordenar}>
          Sortear
          <select value={modo} onChange={(e) => setModo(e.target.value)}>
            <option value="exame">qualquer exame</option>
            <option value="peca">a peça primeiro (todas com a mesma chance)</option>
            <optgroup label="Só de uma peça">
              {tipos.map((t) => (
                <option key={t} value={t}>
                  {pecas[t]?.nome ?? t} ({base.filter((e) => tipo(e) === t).length})
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <label className={styles.caixa}>
          <input
            type="checkbox"
            checked={incluirFeitos}
            onChange={(e) => {
              setIncluirFeitos(e.target.checked);
              if (!e.target.checked && umTipo && !exames.some((x) => !melhores.has(x.id) && tipo(x) === modo)) setModo("exame");
            }}
          />
          Incluir os que já fiz
        </label>
        <button type="button" className="btn btn-primary btn-sm" onClick={sortear} disabled={!pool.length}>
          {sorteado ? "Sortear outro" : "Sortear"}
        </button>
        <span className="muted">
          {pool.length
            ? `entre ${pool.length} ${pool.length === 1 ? "exame" : "exames"}`
            : incluirFeitos
              ? "nenhum exame com essa escolha"
              : "você já fez todos: marque “Incluir os que já fiz”"}
        </span>
      </div>
      <div aria-live="polite">
        {sorteado && (
          <div className={styles.sorteado}>
            <p>
              <strong>
                <Numeral e={sorteado}>{sorteado.titulo}</Numeral>
              </strong>{" "}
              <span className="muted">
                ({exameEmAlgarismos(sorteado)}
                {anoDoExame(sorteado) ? `, ${anoDoExame(sorteado)}` : ""})
              </span>
              {umTipo && <> · {pecas[tipo(sorteado)]?.nome}</>}
              {melhor && <span className="muted"> · você já fez: melhor nota {fmtNota(melhor.total)}</span>}
            </p>
            <Link className="btn btn-gold btn-sm" href={sorteado.links.simulado ?? "/simulados/"}>
              Fazer o simulado
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
