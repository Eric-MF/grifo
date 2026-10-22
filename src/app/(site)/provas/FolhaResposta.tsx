"use client";

import { useEffect, useId, useState } from "react";
import { layoutGravado } from "@/lib/folha/layout";
import { lerUltimoExame } from "@/lib/folha/ultimo-exame";
import styles from "./folha.module.css";

interface Props {
  /** os exames, do mais novo ao mais antigo */
  exames: { numero: number; numeral: string }[];
  /** o caderno de caligrafia ainda é teste: só aparece no `npm run dev` */
  caligrafia?: boolean;
}

// o gerador (pdf-lib) só é baixado quando alguém pede a folha
const gerador = () => Promise.all([import("@/lib/folha/pdf"), import("@/lib/folha/navegador")]);

/**
 * Folha de respostas gerada na hora: leva o minuto, a hora e a data do download, e o exame escolhido (por padrão, o
 * último que a pessoa baixou nesta página). "Sem número" deixa o "__" para preencher à mão.
 */
export function FolhaResposta({ exames, caligrafia = false }: Props) {
  const [exame, setExame] = useState("");
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState(false);
  const campo = useId();

  useEffect(() => {
    const ultimo = lerUltimoExame();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lê localStorage depois de montar (site estático)
    if (ultimo && exames.some((e) => e.numero === ultimo)) setExame(String(ultimo));
  }, [exames]);

  const baixar = async () => {
    setGerando(true);
    setErro(false);
    try {
      const [{ gerarFolha }, { baixarPdf, carregarRecursos }] = await gerador();
      const numero = exame ? Number(exame) : null;
      const { bytes } = await gerarFolha({ layout: layoutGravado(), exame: numero, recursos: await carregarRecursos() });
      baixarPdf(bytes, `folha-de-respostas-penal${numero ? `-${numero}` : ""}.pdf`);
    } catch {
      setErro(true);
    } finally {
      setGerando(false);
    }
  };

  return (
    <>
      <div className={styles.acoes}>
        <label className={styles.campo} htmlFor={campo}>
          <span>Exame no rodapé</span>
          <select id={campo} value={exame} onChange={(e) => setExame(e.target.value)}>
            <option value="">Sem número (__º)</option>
            {exames.map((e) => (
              <option key={e.numero} value={e.numero}>
                {e.numero}º Exame ({e.numeral})
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn btn-gold" onClick={baixar} disabled={gerando} aria-busy={gerando}>
          {gerando ? "Gerando a folha…" : "Baixar folha de respostas (PDF)"}
        </button>
      </div>
      {erro && (
        <p className={styles.erro} role="alert">
          Não foi possível gerar a folha. Tente de novo.
        </p>
      )}
      {caligrafia && <Caligrafia />}
    </>
  );
}

/** Caderno de caligrafia (teste): as linhas da folha de respostas na folha inteira, com a meia linha opcional. */
function Caligrafia() {
  const layout = layoutGravado();
  const [paginas, setPaginas] = useState(5);
  const [meia, setMeia] = useState(true);
  const [fracao, setFracao] = useState(layout.caligrafia.meiaLinha);
  const [gerando, setGerando] = useState(false);
  const altura = layout.linhas.altura;

  const baixar = async () => {
    setGerando(true);
    try {
      const { gerarCaligrafia } = await import("@/lib/folha/pdf");
      const { baixarPdf } = await import("@/lib/folha/navegador");
      baixarPdf(await gerarCaligrafia({ layout, paginas, meiaLinha: meia, fracao }), `caderno-de-caligrafia-oab-${paginas}p.pdf`);
    } finally {
      setGerando(false);
    }
  };

  return (
    <div className={styles.caligrafia}>
      <h3>
        Caderno de caligrafia <span className="badge">em teste · só no ambiente de desenvolvimento</span>
      </h3>
      <p className="muted">
        As mesmas linhas da folha de respostas ({String(altura).replace(".", ",")} mm de altura), ocupando a folha inteira, para treinar a
        letra no espaçamento da prova.
      </p>
      <div className={styles.acoes}>
        <label className={styles.campo}>
          <span>Páginas</span>
          <input type="number" min={1} max={60} value={paginas} onChange={(e) => setPaginas(Math.max(1, Math.min(60, Number(e.target.value) || 1)))} />
        </label>
        <label className={styles.marcar}>
          <input type="checkbox" checked={meia} onChange={(e) => setMeia(e.target.checked)} />
          Linha de meia altura (letra minúscula)
        </label>
        <label className={styles.campo} aria-disabled={!meia}>
          <span>
            Altura da meia linha: {(fracao * altura).toFixed(1).replace(".", ",")} mm ({Math.round(fracao * 100)}%)
          </span>
          <input type="range" min={0.2} max={0.8} step={0.01} value={fracao} disabled={!meia} onChange={(e) => setFracao(Number(e.target.value))} />
        </label>
        <button type="button" className="btn" onClick={baixar} disabled={gerando} aria-busy={gerando}>
          {gerando ? "Gerando…" : "Baixar caderno de caligrafia (PDF)"}
        </button>
      </div>
    </div>
  );
}
