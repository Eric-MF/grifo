"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import indice from "@/content/generated/leis-indice.json";
import { faixas, gravarVademecuns, lerVademecuns, linkLeitura, salvarVademecum, type ItemVade, type Vademecum } from "@/lib/leis/vademecum";
import styles from "./vademecum.module.css";

const nomeLei = (id: string) => indice.find((l) => l.id === id)?.nome ?? id;

const novo = (): Vademecum => ({ id: Date.now().toString(36), titulo: "Meu vade-mécum", itens: [{ lei: "cp" }, { lei: "cpp" }], em: Date.now() });

export function EditorVademecum() {
  const [salvos, setSalvos] = useState<Vademecum[]>([]);
  const [atual, setAtual] = useState<Vademecum | null>(null);
  const [lei, setLei] = useState(indice[0]?.id ?? "");
  const [artigos, setArtigos] = useState("");
  const [copiado, setCopiado] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lê localStorage após montar (site estático)
    setSalvos(lerVademecuns());
  }, []);

  const guardar = (v: Vademecum) => {
    salvarVademecum(v);
    setSalvos(lerVademecuns());
    setAtual(v);
  };
  const mover = (k: number, d: -1 | 1) => {
    if (!atual) return;
    const itens = [...atual.itens];
    [itens[k], itens[k + d]] = [itens[k + d], itens[k]];
    guardar({ ...atual, itens });
  };
  const faixaInvalida = artigos.trim() !== "" && faixas(artigos) === null;
  const copiarLink = async (v: Vademecum) => {
    const url = location.origin + (await linkLeitura(v));
    await navigator.clipboard?.writeText(url);
    setCopiado(v.id);
  };

  if (atual) {
    return (
      <div className={styles.editor}>
        <label className={styles.titulo}>
          Título
          <input value={atual.titulo} onChange={(e) => guardar({ ...atual, titulo: e.target.value })} />
        </label>
        <ol className={styles.itens}>
          {atual.itens.map((it: ItemVade, k) => (
            <li key={`${it.lei}-${k}`}>
              <span>
                <strong>{nomeLei(it.lei)}</strong>
                {it.artigos ? <span className="muted"> · arts. {it.artigos}</span> : <span className="muted"> · inteira</span>}
              </span>
              <span className={styles.botoes}>
                <button type="button" onClick={() => mover(k, -1)} disabled={k === 0} aria-label="Subir">
                  ↑
                </button>
                <button type="button" onClick={() => mover(k, 1)} disabled={k === atual.itens.length - 1} aria-label="Descer">
                  ↓
                </button>
                <button type="button" onClick={() => guardar({ ...atual, itens: atual.itens.filter((_, i) => i !== k) })} aria-label="Remover">
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ol>
        <form
          className={styles.adicionar}
          onSubmit={(e) => {
            e.preventDefault();
            if (faixaInvalida) return;
            guardar({ ...atual, itens: [...atual.itens, { lei, ...(artigos.trim() ? { artigos: artigos.trim() } : {}) }] });
            setArtigos("");
          }}
        >
          <label>
            Lei
            <select value={lei} onChange={(e) => setLei(e.target.value)}>
              {indice.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            Artigos (opcional)
            <input value={artigos} onChange={(e) => setArtigos(e.target.value)} placeholder="ex.: 1-120, 155, 157-A" aria-invalid={faixaInvalida} />
          </label>
          <button type="submit" className="btn btn-sm" disabled={faixaInvalida}>
            Adicionar
          </button>
          {faixaInvalida && <p className={styles.erro}>Use números e faixas: 1-120, 155, 157-A.</p>}
        </form>
        <div className={styles.acoes}>
          <button type="button" className="btn btn-gold" disabled={!atual.itens.length} onClick={async () => location.assign(await linkLeitura(atual))}>
            Ler e imprimir
          </button>
          <button type="button" className="btn" disabled={!atual.itens.length} onClick={() => copiarLink(atual)}>
            {copiado === atual.id ? "Link copiado" : "Copiar link para compartilhar"}
          </button>
          <button type="button" className="btn" onClick={() => setAtual(null)}>
            Voltar à lista
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.editor}>
      <button type="button" className="btn btn-gold" onClick={() => guardar(novo())}>
        Novo vade-mécum
      </button>
      {salvos.length > 0 && (
        <ul className={styles.salvos}>
          {salvos.map((v) => (
            <li key={v.id}>
              <span>
                <strong>{v.titulo}</strong>
                <span className="muted"> · {v.itens.map((i) => nomeLei(i.lei).split(" (")[0]).join(", ")}</span>
              </span>
              <span className={styles.botoes}>
                <button type="button" onClick={() => setAtual(v)}>
                  Editar
                </button>
                <button type="button" onClick={async () => location.assign(await linkLeitura(v))}>
                  Ler
                </button>
                <button type="button" onClick={() => copiarLink(v)}>
                  {copiado === v.id ? "Copiado" : "Link"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    gravarVademecuns(salvos.filter((x) => x.id !== v.id));
                    setSalvos(lerVademecuns());
                  }}
                  aria-label={`Excluir ${v.titulo}`}
                >
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="muted">
        Para montar um com os artigos que você mais erra, use <Link href="/leis/minha-leitura/">Minha leitura</Link>.
      </p>
    </div>
  );
}
