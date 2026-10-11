"use client";

import { fmtNota } from "@/lib/formato";
import { useEffect, useRef, useState } from "react";
import type { Exame } from "@/content/schema";
import { ErroIA, PROVEDORES, provedor, temFallback } from "@/lib/ia/provedores";
import type { ProvedorId } from "@/lib/ia/types";
import { gravarJSON, lerJSON, remover } from "@/lib/storage";
import { salvarTentativa, type Tentativa } from "@/lib/tentativas";
import styles from "./ia.module.css";

const K_PREFS = "grifo:ia:prefs";
const K_CHAVES = "grifo:ia:chaves";
const lerPrefs = () => lerJSON<{ prov?: ProvedorId; modelos?: Record<string, string> }>(K_PREFS, {});
const lerChaves = () => lerJSON<Record<string, string>>(K_CHAVES, {});

export function CorrecaoIA({ exame, tentativa, onConcluir }: { exame: Exame; tentativa: Tentativa; onConcluir: (t: Tentativa) => void }) {
  const [prov, setProv] = useState<ProvedorId>("anthropic");
  const [modelo, setModelo] = useState(PROVEDORES[0].modelos[0]);
  const [chave, setChave] = useState("");
  const [lembrar, setLembrar] = useState(false);
  const [estado, setEstado] = useState<"idle" | "rodando" | "erro">("idle");
  const [erro, setErro] = useState("");
  const [inicio, setInicio] = useState(0);
  const [agora, setAgora] = useState(0);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    const p = lerPrefs();
    const chaves = lerChaves();
    const pv = p.prov ?? "anthropic";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lê localStorage após montar (site estático)
    setProv(pv);
    setModelo(p.modelos?.[pv] ?? provedor(pv).modelos[0]);
    if (chaves[pv]) {
      setChave(chaves[pv]);
      setLembrar(true);
    }
  }, []);

  useEffect(() => {
    if (estado !== "rodando") return;
    const t = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [estado]);

  const trocarProvedor = (pv: ProvedorId) => {
    setProv(pv);
    const p = lerPrefs();
    setModelo(p.modelos?.[pv] ?? provedor(pv).modelos[0]);
    setChave(lerChaves()[pv] ?? "");
  };

  const apagarChaves = () => {
    remover(K_CHAVES);
    setChave("");
    setLembrar(false);
  };

  const corrigir = async () => {
    if (!chave.trim()) return;
    const prefs = lerPrefs();
    gravarJSON(K_PREFS, { prov, modelos: { ...prefs.modelos, [prov]: modelo } });
    const chaves = lerChaves();
    if (lembrar) gravarJSON(K_CHAVES, { ...chaves, [prov]: chave.trim() });
    else if (chaves[prov]) {
      delete chaves[prov];
      gravarJSON(K_CHAVES, chaves);
    }

    abort.current = new AbortController();
    setEstado("rodando");
    setErro("");
    setInicio(Date.now());
    setAgora(Date.now());
    try {
      const { corrigirComIA } = await import("@/lib/ia/corrigir");
      const ia = await corrigirComIA(exame, tentativa.respostas, { provedor: prov, modelo: modelo.trim(), chave: chave.trim(), signal: abort.current.signal });
      const nova = { ...tentativa, ia };
      salvarTentativa(nova);
      setEstado("idle");
      onConcluir(nova);
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        setEstado("idle");
        return;
      }
      setEstado("erro");
      setErro(e instanceof ErroIA ? e.message : `Erro inesperado: ${(e as Error).message}`);
    }
  };

  const info = provedor(prov);
  return (
    <div className={`card ${styles.box}`}>
      {tentativa.ia && (
        <div className={styles.feito}>
          <strong>
            Nota da IA: {fmtNota(tentativa.ia.total)} ({provedor(tentativa.ia.provedor).nome} · {tentativa.ia.modelo})
          </strong>
          {tentativa.ia.comentarioGeral && <p>{tentativa.ia.comentarioGeral}</p>}
          <p className="muted">Os comentários da IA aparecem em azul em cada item da tabela acima. Você pode corrigir de novo com outro provedor.</p>
        </div>
      )}
      <p className={styles.intro}>
        Use a sua chave de API para uma segunda correção, feita por um modelo de linguagem com a mesma tabela de pontos. A
        chamada vai <strong>direto do seu navegador para o provedor</strong>: o Grifo não recebe nem armazena a sua chave,
        e o custo é cobrado na sua conta do provedor.
      </p>
      <div className={styles.grid}>
        <label className={styles.field}>
          <span>Provedor</span>
          <select value={prov} onChange={(e) => trocarProvedor(e.target.value as ProvedorId)} disabled={estado === "rodando"}>
            {PROVEDORES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>Modelo</span>
          <input list={`modelos-${prov}`} value={modelo} onChange={(e) => setModelo(e.target.value)} disabled={estado === "rodando"} spellCheck={false} />
          <datalist id={`modelos-${prov}`}>
            {info.modelos.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </label>
        <label className={`${styles.field} ${styles.wide}`}>
          <span>
            Chave de API ·{" "}
            <a href={info.ondeObterChave} target="_blank" rel="noopener noreferrer">
              onde obter
            </a>
          </span>
          <input
            type="password"
            autoComplete="off"
            value={chave}
            onChange={(e) => setChave(e.target.value)}
            placeholder="cole aqui a sua chave"
            disabled={estado === "rodando"}
            spellCheck={false}
          />
        </label>
      </div>
      <label className={styles.lembrar}>
        <input type="checkbox" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} />
        Lembrar a chave neste navegador (fica salva no armazenamento local; não use em computador compartilhado)
      </label>
      <div className={styles.acoes}>
        {estado === "rodando" ? (
          <>
            <span className={styles.progresso} aria-live="polite">
              <span className={styles.spinner} aria-hidden /> Corrigindo… {Math.round((agora - inicio) / 1000)}s (pode levar alguns minutos)
            </span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => abort.current?.abort()}>
              Cancelar
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-primary" onClick={corrigir} disabled={!chave.trim() || !modelo.trim()}>
            {tentativa.ia ? "Corrigir de novo com IA" : "Corrigir com IA"}
          </button>
        )}
        <button type="button" className={styles.link} onClick={apagarChaves}>
          Apagar chaves salvas
        </button>
      </div>
      {estado === "erro" && (
        <p className={styles.erro} role="alert">
          {erro}
        </p>
      )}
      {prov === "anthropic" && temFallback(modelo) && (
        <p className={styles.nota}>
          Com modelos Claude Opus 5, Opus 5.5 e Fable 5.1, o fallback do servidor fica ligado: se o modelo recusar o pedido, a
          própria Anthropic reexecuta a correção em outro modelo recomendado.
        </p>
      )}
    </div>
  );
}
