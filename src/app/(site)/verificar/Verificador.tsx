"use client";

import { categoriasDaMascara, nomeCategoria } from "@/quiz/categorias";
import { NOME_NIVEL } from "@/quiz/pontuacao";
import type { Nivel } from "@/quiz/types";
import { JOGOS } from "@/games/registry";
import { fmtNota } from "@/lib/formato";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { impressaoHex, verificarCodigo, type Verificacao } from "@/lib/codigo/codigo";
import { provedor } from "@/lib/ia/provedores";
import type { ProvedorId } from "@/lib/ia/types";
import styles from "./verificar.module.css";

const tituloJogo = (id: number) => JOGOS.find((j) => j.id === id)?.titulo;

const MOTIVOS = {
  formato: "O código não tem o formato esperado. Confira se copiou todos os caracteres.",
  digito: "O dígito verificador não confere: há um caractere digitado errado ou trocado de lugar.",
  assinatura: "O código não foi emitido pelo Grifo, ou foi alterado.",
  versao: "Versão de código desconhecida.",
};

export function Verificador() {
  const params = useSearchParams();
  const [codigo, setCodigo] = useState("");
  const [res, setRes] = useState<Verificacao | null>(null);

  const verificar = async (c: string) => setRes(c.trim() ? await verificarCodigo(c) : null);

  useEffect(() => {
    const c = params.get("c");
    if (c) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lê a URL após montar (site estático)
      setCodigo(c);
      verificar(c);
    }
  }, [params]);

  return (
    <div>
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          verificar(codigo);
        }}
      >
        <label htmlFor="codigo" className="sr-only">
          Código de verificação
        </label>
        <input
          id="codigo"
          className={styles.input}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          placeholder="Ex.: 1A2B-3C4D-5E6F-7G8H-…"
          autoComplete="off"
          spellCheck={false}
        />
        <button className="btn btn-gold" type="submit">
          Verificar
        </button>
      </form>

      {res && !res.ok && (
        <div className={`${styles.res} ${styles.bad}`} role="alert">
          <strong>✗ Código inválido</strong>
          <p>{MOTIVOS[res.motivo]}</p>
        </div>
      )}
      {res?.ok && (
        <div className={`${styles.res} ${styles.ok}`} role="status">
          <strong>✓ Código autêntico</strong>
          {res.dados.tipo === "simulado" ? (
            <dl className={styles.dl}>
              <dt>Exame</dt>
              <dd>
                {res.dados.exame}º Exame de Ordem{res.dados.atualizado ? " (versão atualizada)" : ""}
              </dd>
              <dt>Nota total</dt>
              <dd className={styles.nota}>{fmtNota(res.dados.total)} / 10,00</dd>
              <dt>Peça</dt>
              <dd>{fmtNota(res.dados.peca)} / 5,00</dd>
              <dt>Correção</dt>
              <dd>{res.dados.modo === "auto" ? "Automática do Grifo" : `IA · ${provedor(res.dados.modo as ProvedorId)?.nome ?? res.dados.modo}`}</dd>
              <dt>Data</dt>
              <dd>{res.dados.data.toLocaleDateString("pt-BR", { timeZone: "UTC" })}</dd>
              <dt>Duração</dt>
              <dd>{res.dados.duracaoMin ? `${Math.floor(res.dados.duracaoMin / 60)}h${String(res.dados.duracaoMin % 60).padStart(2, "0")}` : "sem cronômetro"}</dd>
              <dt>Impressão digital</dt>
              <dd>
                <code>{impressaoHex(res.dados.impressao, 16)}</code>
              </dd>
            </dl>
          ) : (
            <dl className={styles.dl}>
              <dt>Jogo</dt>
              <dd>{tituloJogo(res.dados.jogo) ?? `Jogo ${res.dados.jogo}`}</dd>
              <dt>Pontos</dt>
              <dd className={styles.nota}>{res.dados.pontos.toLocaleString("pt-BR")}</dd>
              <dt>Nível</dt>
              <dd>{NOME_NIVEL[res.dados.nivel as Nivel]}</dd>
              {res.dados.categorias !== undefined && (
                <>
                  <dt>Tipos de pergunta</dt>
                  <dd>{categoriasDaMascara(res.dados.categorias).map(nomeCategoria).join(", ")}</dd>
                </>
              )}
              <dt>Perguntas</dt>
              <dd>
                {res.dados.acertos} de {res.dados.perguntas} certas
              </dd>
              <dt>Data</dt>
              <dd>{res.dados.data.toLocaleDateString("pt-BR", { timeZone: "UTC" })}</dd>
            </dl>
          )}
          <p className={styles.obs}>Compare estes dados com os da imagem compartilhada. Se forem diferentes, a imagem foi editada.</p>
        </div>
      )}
    </div>
  );
}
