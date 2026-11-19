"use client";
// Pré-visualização do card e o compartilhar.
// - No celular (e onde o navegador sabe compartilhar arquivos), tocar numa rede abre a lista de apps do sistema já com
//   a imagem do card: o app escolhido a recebe.
// - No computador, cada rede abre o site dela, com o texto e o link quando ela deixa. Os links de compartilhar das
//   redes não levam imagem: o link é o da prévia da pessoa, cuja imagem (com a nota ou os pontos dela) a rede mostra;
//   a imagem do card inteiro vai com Copiar imagem ou Baixar PNG, que têm botões próprios.
// - Só se a imagem não ficar pronta, o celular também vai pelo link, com o texto.

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { SITE } from "@/config/site";
import { baixar, canvasParaBlob, carregarImagem, desenharCard, type DadosCard, type Formato } from "@/lib/share/card";
import { ARQUIVO_PREVIA } from "@/lib/share/previas";
import { REDES, type Rede } from "@/lib/share/redes";
import { IconeBaixar, IconeCompartilhar, IconeCopiar, IconeRede } from "./IconesRedes";
import styles from "./ShareCard.module.css";

/** Copia a imagem para a área de transferência (devolve se deu certo). */
async function copiarImagem(blob: Blob): Promise<boolean> {
  try {
    if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) return false;
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return true;
  } catch {
    return false;
  }
}

/**
 * `previa`: a página da prévia da pessoa (caminhoPreviaNota, caminhoPreviaJogo), com a imagem da pontuação dela; é o
 * endereço que vai nas redes. Sem ela, vai `caminho`, que leva a imagem geral do site.
 */
export function ShareCard({
  dados,
  nomeArquivo,
  textoPost,
  fundo,
  caminho = "/simulados/",
  previa,
}: {
  dados: DadosCard;
  nomeArquivo: string;
  textoPost: string;
  fundo?: string;
  caminho?: string;
  previa?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [formato, setFormato] = useState<Formato>("retrato");
  // a imagem do card, pronta a cada desenho (o compartilhar do sistema precisa dela já pronta no toque), e se o
  // navegador sabe mandá-la pela lista de apps
  const [imagem, setImagem] = useState<{ blob: Blob; arquivo: File; sistema: boolean } | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let vivo = true;
    (async () => {
      const img = fundo ? await carregarImagem(fundo) : null;
      if (!vivo || !ref.current) return;
      await desenharCard(ref.current, { ...dados, fundo: img }, formato);
      try {
        const blob = await canvasParaBlob(ref.current);
        const arquivo = new File([blob], nomeArquivo, { type: "image/png" });
        if (vivo) setImagem({ blob, arquivo, sistema: !!navigator.canShare?.({ files: [arquivo] }) });
      } catch {
        /* sem imagem: as redes vão pelo link, com o texto */
      }
    })();
    return () => {
      vivo = false;
    };
  }, [dados, formato, fundo, nomeArquivo]);

  const url = SITE.url + (previa ?? caminho);
  // a imagem da prévia (na pasta da página, sem o ?exame=), para o Pinterest
  const imagemPrevia = previa ? `${SITE.url}${previa.split("?")[0]}${ARQUIVO_PREVIA}` : undefined;
  const textoComLink = `${textoPost} ${url}`;
  const colar = () => (/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘V" : "Ctrl+V");

  /** A lista de apps do sistema, com a imagem (desistir dela não é erro). */
  const pelaListaDoSistema = async () => {
    if (!imagem?.sistema) return;
    try {
      await navigator.share({ files: [imagem.arquivo], title: dados.titulo, text: textoComLink });
    } catch (e) {
      if ((e as Error).name !== "AbortError") setMsg("Não deu para compartilhar pelo sistema: use Copiar imagem ou Baixar PNG.");
    }
  };

  /** Tocar numa rede: no celular, a imagem vai pela lista de apps; no computador, o link abre o site da rede. */
  const naRede = (rede: Rede, e: MouseEvent<HTMLAnchorElement>) => {
    setMsg("");
    const celular = window.matchMedia?.("(pointer: coarse)").matches ?? false;
    if (celular && imagem?.sistema) {
      e.preventDefault();
      void pelaListaDoSistema();
      return;
    }
    setMsg(
      rede.recebeLink
        ? `O ${rede.nome} abre com o texto e o link. Para levar a imagem do card, use Copiar imagem e cole (${colar()}) na publicação, ou Baixar PNG.`
        : `O ${rede.nome} não recebe link pelo navegador: use Baixar PNG e publique a imagem por lá.`,
    );
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.preview} data-formato={formato}>
        <canvas ref={ref} role="img" aria-label={`Card: ${dados.titulo}, nota ${dados.nota}`} />
      </div>
      <div className={styles.side}>
        <div className={styles.formatos} role="radiogroup" aria-label="Formato">
          {(["retrato", "paisagem"] as Formato[]).map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={formato === f}
              className={styles.fmt}
              onClick={() => {
                // a imagem antiga sai já: até a nova ficar pronta, não se compartilha o formato errado
                setFormato(f);
                setImagem(null);
              }}
            >
              {f === "retrato" ? "Stories / feed" : "Link / LinkedIn"}
            </button>
          ))}
        </div>
        {/* a lista de apps do sistema com a imagem, onde o navegador sabe fazer isso (celular, Windows, macOS) */}
        {imagem?.sistema && (
          <button type="button" className={`btn btn-gold ${styles.principal}`} onClick={() => void pelaListaDoSistema()}>
            <span className={styles.icone}>
              <IconeCompartilhar />
            </span>
            Compartilhar imagem
          </button>
        )}
        <div className={styles.acoes}>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={!imagem}
            onClick={async () => {
              if (!imagem) return;
              const ok = await copiarImagem(imagem.blob);
              setMsg(ok ? `Imagem copiada. Cole (${colar()}) onde quiser.` : "Este navegador não copia imagens: use Baixar PNG.");
            }}
          >
            <span className={styles.icone}>
              <IconeCopiar />
            </span>
            Copiar imagem
          </button>
          <button type="button" className="btn btn-ghost" disabled={!imagem} onClick={() => imagem && baixar(imagem.blob, nomeArquivo)}>
            <span className={styles.icone}>
              <IconeBaixar />
            </span>
            Baixar PNG
          </button>
        </div>
        <p className={styles.rotulo} id="redes-rotulo">
          Compartilhar em
        </p>
        <ul className={styles.redes} aria-labelledby="redes-rotulo">
          {REDES.map((r) => {
            const link = r.link(textoPost, url, imagemPrevia);
            return (
              <li key={r.id}>
                <a
                  className={styles.rede}
                  data-rede={r.id}
                  href={link}
                  {...(link.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  onClick={(e) => naRede(r, e)}
                  aria-label={`Compartilhar no ${r.nome}`}
                >
                  <span className={styles.redeIcone}>
                    <IconeRede rede={r.id} />
                  </span>
                  <span className={styles.redeNome}>{r.nome}</span>
                </a>
              </li>
            );
          })}
        </ul>
        {msg && (
          <p className={styles.msg} role="status">
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}
