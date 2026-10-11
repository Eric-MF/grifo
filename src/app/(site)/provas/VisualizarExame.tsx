"use client";

import { useEffect, useRef, useState } from "react";
import type { ExameResumo } from "@/content/load";
import { tituloExame } from "@/content/titulo";
import styles from "./provas.module.css";
import type { PartePontos } from "./pontuacao";
import { ConferirTexto } from "./ConferirTexto";
import { type Chave, nomeDoArquivo } from "./nomes";

type Aba = "conferir" | "pontuacao" | Chave;

const PDFS: { chave: Chave; rotulo: string }[] = [
  { chave: "cadernoOriginal", rotulo: "Caderno original" },
  { chave: "gabaritoOriginal", rotulo: "Gabarito original" },
  { chave: "cadernoAtualizado", rotulo: "Caderno atualizado" },
  { chave: "gabaritoAtualizado", rotulo: "Gabarito atualizado" },
  { chave: "objetivaCaderno", rotulo: "Caderno da 1ª fase" },
  { chave: "objetivaGabarito", rotulo: "Gabarito da 1ª fase" },
];

const numero = (v: number) => v.toFixed(2).replace(".", ",");

function Pontuacao({ partes }: { partes: PartePontos[] }) {
  const total = partes.reduce((soma, p) => soma + p.valor, 0);
  return (
    <div className={styles.pontos}>
      <p className="muted">Total: {numero(total)} pontos. Valores tirados do YAML do exame.</p>
      {partes.map((p) => (
        <section key={p.titulo}>
          <h3>
            {p.titulo} <span className="muted">· vale {numero(p.valor)}</span>
          </h3>
          <table className={styles.tabelaPontos}>
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Pontos</th>
                <th scope="col">Componentes</th>
              </tr>
            </thead>
            <tbody>
              {p.itens.map((it) => (
                <tr key={it.n}>
                  <td>
                    <b>{it.n}</b> {it.descricao}
                  </td>
                  <td>
                    {it.pontos}
                    {it.anulado !== undefined && <div className="muted">anulado: {numero(it.anulado)}</div>}
                  </td>
                  <td>
                    {it.componentes.map((c) => (
                      <div key={c.id}>
                        <b>{c.id}</b> ({numero(c.valor)}) {c.rotulo}
                      </div>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}

export function VisualizarExame({ exame, pontuacao, onFechar }: { exame: ExameResumo; pontuacao?: PartePontos[]; onFechar: () => void }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const pdfs = PDFS.filter((p) => exame.downloads[p.chave]);
  const abas: Aba[] = [...(exame.corrigivel ? (["conferir", "pontuacao"] as const) : []), ...pdfs.map((p) => p.chave)];
  const [escolhida, setEscolhida] = useState<Aba | null>(null);
  const atual = escolhida && abas.includes(escolhida) ? escolhida : abas[0];

  const telaCheia = useRef<HTMLDivElement>(null);
  const [emTelaCheia, setEmTelaCheia] = useState(false);

  useEffect(() => {
    const d = dialogo.current;
    if (d && !d.open) d.showModal();
    const sincronizar = () => setEmTelaCheia(document.fullscreenElement === telaCheia.current);
    document.addEventListener("fullscreenchange", sincronizar);
    return () => document.removeEventListener("fullscreenchange", sincronizar);
  }, []);

  const alternarTelaCheia = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void telaCheia.current?.requestFullscreen();
  };

  const rotulo = (a: Aba) => {
    if (a === "conferir") return "Conferir texto";
    if (a === "pontuacao") return "Pontuação";
    return PDFS.find((p) => p.chave === a)?.rotulo ?? a;
  };
  const href = atual && atual !== "conferir" && atual !== "pontuacao" ? exame.downloads[atual] : null;
  const nome = atual && atual !== "conferir" && atual !== "pontuacao" ? nomeDoArquivo(exame, atual) : "";

  return (
    <dialog ref={dialogo} onClose={onFechar} aria-labelledby="visualizar-titulo" className={styles.dialogo}>
      <div ref={telaCheia} className={styles.telaCheia}>
      <header className={styles.dialogoTopo}>
        <h2 id="visualizar-titulo">{tituloExame(exame)}</h2>
        <div className={styles.dialogoAcoes}>
          <button type="button" onClick={alternarTelaCheia}>
            {emTelaCheia ? "Sair da tela cheia" : "Tela cheia"}
          </button>
          <button type="button" onClick={() => dialogo.current?.close()}>
            Fechar
          </button>
        </div>
      </header>
      <div className={styles.abas} role="group" aria-label="O que mostrar">
        {abas.map((a) => (
          <button key={a} type="button" aria-pressed={atual === a} onClick={() => setEscolhida(a)}>
            {rotulo(a)}
          </button>
        ))}
      </div>
      {atual === "conferir" && (
        <div className={styles.corpo}>
          <ConferirTexto exameId={exame.id} />
        </div>
      )}
      {atual === "pontuacao" && <div className={styles.corpo}><Pontuacao partes={pontuacao ?? []} /></div>}
      {href && (
        <>
          <div className={styles.barraPdf}>
            <a href={href} target="_blank" rel="noreferrer">
              abrir em nova aba
            </a>
            <a href={href} download={nome}>
              baixar
            </a>
          </div>
          <iframe key={href} className={styles.visor} src={href} title={`${rotulo(atual)} do ${exame.numeral} Exame`} />
        </>
      )}
      {abas.length === 0 && <p className={styles.corpo}>Nada publicado para este exame ainda.</p>}
      </div>
    </dialog>
  );
}
