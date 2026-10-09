"use client";

import { useEffect, useRef, useState } from "react";
import { SITE } from "@/config/site";
import { baixar, canvasParaBlob, carregarImagem, compartilharImagem, desenharCard, type DadosCard, type Formato } from "@/lib/share/card";
import styles from "./ShareCard.module.css";

/** Pré-visualização do card + botões de compartilhar/baixar/redes. */
export function ShareCard({ dados, nomeArquivo, textoPost, fundo, caminho = "/simulados/" }: { dados: DadosCard; nomeArquivo: string; textoPost: string; fundo?: string; caminho?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [formato, setFormato] = useState<Formato>("retrato");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let vivo = true;
    (async () => {
      const img = fundo ? await carregarImagem(fundo) : null;
      if (vivo && ref.current) await desenharCard(ref.current, { ...dados, fundo: img }, formato);
    })();
    return () => {
      vivo = false;
    };
  }, [dados, formato, fundo]);

  const url = SITE.url + caminho;
  const enc = encodeURIComponent;
  const compartilhar = async () => {
    if (!ref.current) return;
    try {
      const r = await compartilharImagem(ref.current, nomeArquivo, textoPost, url);
      setMsg(r === "baixado" ? "Imagem baixada. Agora é só postar!" : "");
    } catch {
      /* usuário cancelou */
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.preview} data-formato={formato}>
        <canvas ref={ref} role="img" aria-label={`Card: ${dados.titulo}, nota ${dados.nota}`} />
      </div>
      <div className={styles.side}>
        <div className={styles.formatos} role="radiogroup" aria-label="Formato">
          {(["retrato", "paisagem"] as Formato[]).map((f) => (
            <button key={f} type="button" role="radio" aria-checked={formato === f} className={styles.fmt} onClick={() => setFormato(f)}>
              {f === "retrato" ? "Stories / feed" : "Link / LinkedIn"}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-gold" onClick={compartilhar}>
          Compartilhar imagem
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={async () => ref.current && baixar(await canvasParaBlob(ref.current), nomeArquivo)}
        >
          Baixar PNG
        </button>
        <div className={styles.redes}>
          <a href={`https://wa.me/?text=${enc(`${textoPost} ${url}`)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
          <a href={`https://twitter.com/intent/tweet?text=${enc(textoPost)}&url=${enc(url)}`} target="_blank" rel="noopener noreferrer">X</a>
          <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`} target="_blank" rel="noopener noreferrer">LinkedIn</a>
          <a href={`https://t.me/share/url?url=${enc(url)}&text=${enc(textoPost)}`} target="_blank" rel="noopener noreferrer">Telegram</a>
        </div>
        {msg && <p className={styles.msg}>{msg}</p>}
      </div>
    </div>
  );
}
