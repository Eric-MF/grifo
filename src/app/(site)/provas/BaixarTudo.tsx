"use client";

import { useMemo, useState } from "react";
import type { ExameResumo } from "@/content/load";
import { montarZip, type EntradaZip } from "@/lib/zip";
import { type Arquivo, CAMINHO_ZIP_PADRAO, CHAVES_PADRAO, type Chave, arquivosDe, nomeDoZip } from "./nomes";
import styles from "./provas.module.css";

const TIPOS: { chave: Chave; grupo: string; rotulo: string }[] = [
  { chave: "objetivaCaderno", grupo: "1ª fase", rotulo: "Caderno (Tipo 1)" },
  { chave: "objetivaGabarito", grupo: "1ª fase", rotulo: "Gabarito definitivo" },
  { chave: "cadernoOriginal", grupo: "2ª fase · original", rotulo: "Caderno" },
  { chave: "gabaritoOriginal", grupo: "2ª fase · original", rotulo: "Gabarito" },
  { chave: "cadernoAtualizado", grupo: "2ª fase · atualizado", rotulo: "Caderno" },
  { chave: "gabaritoAtualizado", grupo: "2ª fase · atualizado", rotulo: "Gabarito" },
];

const TODOS = TIPOS.map((t) => t.chave);
const SEGUNDA_FASE: Chave[] = ["cadernoOriginal", "gabaritoOriginal", "cadernoAtualizado", "gabaritoAtualizado"];

const PREDEFINIDOS: { rotulo: string; chaves: Chave[] }[] = [
  { rotulo: "Todos", chaves: TODOS },
  { rotulo: "Só cadernos da 1ª fase", chaves: ["objetivaCaderno"] },
  { rotulo: "Só 2ª fase", chaves: SEGUNDA_FASE },
  { rotulo: "Só gabarito atualizado", chaves: ["gabaritoAtualizado"] },
  { rotulo: "Originais: caderno e gabarito da 2ª fase", chaves: ["cadernoOriginal", "gabaritoOriginal"] },
  { rotulo: "Originais: caderno e gabarito das 2 fases", chaves: ["cadernoOriginal", "gabaritoOriginal", "objetivaCaderno", "objetivaGabarito"] },
];

const LOTE = 6;

type Estado = { tipo: "parado" } | { tipo: "baixando"; feitos: number; total: number } | { tipo: "pronto"; falhas: number };

function ehPadrao(chaves: Set<Chave>) {
  return chaves.size === CHAVES_PADRAO.length && CHAVES_PADRAO.every((c) => chaves.has(c));
}

export function BaixarTudo({ exames }: { exames: ExameResumo[] }) {
  const [marcados, setMarcados] = useState<Set<Chave>>(() => new Set(CHAVES_PADRAO));
  const [estado, setEstado] = useState<Estado>({ tipo: "parado" });
  const baixando = estado.tipo === "baixando";

  const selecionados = useMemo(() => arquivosDe(exames, marcados), [exames, marcados]);
  const contagens = useMemo(() => PREDEFINIDOS.map((p) => arquivosDe(exames, p.chaves).length), [exames]);

  const alternar = (chave: Chave) =>
    setMarcados((atuais) => {
      const proximos = new Set(atuais);
      if (proximos.has(chave)) proximos.delete(chave);
      else proximos.add(chave);
      return proximos;
    });

  async function baixar(arquivos: Arquivo[], chaves: Set<Chave>) {
    if (arquivos.length === 0 || baixando) return;
    if (arquivos.length === 1) {
      disparar(arquivos[0].href, arquivos[0].nome);
      return;
    }
    if (ehPadrao(chaves)) {
      disparar(CAMINHO_ZIP_PADRAO, nomeDoZip(chaves));
      return;
    }
    const entradas: EntradaZip[] = [];
    let falhas = 0;
    setEstado({ tipo: "baixando", feitos: 0, total: arquivos.length });
    for (let i = 0; i < arquivos.length; i += LOTE) {
      const lote = arquivos.slice(i, i + LOTE);
      const resultados = await Promise.all(
        lote.map(async (a) => {
          try {
            const r = await fetch(a.href);
            if (!r.ok) throw new Error(String(r.status));
            return { nome: `${a.pasta}/${a.nome}`, dados: new Uint8Array(await r.arrayBuffer()) };
          } catch {
            return null;
          }
        }),
      );
      for (const r of resultados) {
        if (r) entradas.push(r);
        else falhas++;
      }
      setEstado({ tipo: "baixando", feitos: Math.min(i + LOTE, arquivos.length), total: arquivos.length });
    }
    const url = URL.createObjectURL(montarZip(entradas));
    disparar(url, nomeDoZip(chaves));
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    setEstado({ tipo: "pronto", falhas });
  }

  return (
    <details className={styles.lote}>
      <summary className={styles.resumoLote}>
        <span className={styles.tituloLote}>Baixar vários arquivos</span>
        <span className="muted">{marcados.size === 0 ? "nenhum tipo marcado" : `${selecionados.length} arquivo(s) marcado(s)`}</span>
      </summary>

      <div className={styles.conteudoLote}>
        <p className="muted">Atalhos baixam na hora. Para escolher tipos, marque abaixo e use “Baixar selecionados”.</p>
        <div className={styles.predefinidos} role="group" aria-label="Downloads prontos">
          {PREDEFINIDOS.map((p, i) => (
            <button
              key={p.rotulo}
              type="button"
              disabled={contagens[i] === 0 || baixando}
              onClick={() => baixar(arquivosDe(exames, p.chaves), new Set(p.chaves))}
            >
              {p.rotulo} <span className="muted">· {contagens[i]}</span>
            </button>
          ))}
        </div>

        <div className={styles.grupos}>
          {[...new Set(TIPOS.map((t) => t.grupo))].map((grupo) => (
            <fieldset key={grupo} className={styles.grupo}>
              <legend>{grupo}</legend>
              {TIPOS.filter((t) => t.grupo === grupo).map((t) => (
                <label key={t.chave}>
                  <input type="checkbox" checked={marcados.has(t.chave)} onChange={() => alternar(t.chave)} /> {t.rotulo}
                </label>
              ))}
            </fieldset>
          ))}
        </div>

        <div className={styles.acao}>
          <button
            type="button"
            className="btn btn-gold"
            onClick={() => baixar(selecionados, marcados)}
            disabled={selecionados.length === 0 || baixando}
          >
            {selecionados.length === 1 ? "Baixar 1 arquivo" : `Baixar ${selecionados.length} arquivos${selecionados.length > 1 ? " em ZIP" : ""}`}
          </button>
          <span className="muted" role="status">
            {estado.tipo === "baixando" && `Baixando ${estado.feitos} de ${estado.total}…`}
            {estado.tipo === "pronto" && (estado.falhas ? `Pronto, mas ${estado.falhas} arquivo(s) não puderam ser baixados.` : "Download pronto.")}
            {estado.tipo === "parado" && selecionados.length === 0 && "Escolha ao menos um tipo de arquivo."}
            {estado.tipo === "parado" && selecionados.length > 0 && "Aplica-se aos exames listados na tabela."}
          </span>
        </div>
      </div>
    </details>
  );
}

function disparar(href: string, nome: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
