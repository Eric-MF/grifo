"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { carregarArtigos, carregarLei } from "@/lib/leis/dados";
import { lerMarcacoes, localizar } from "@/lib/leis/marcacoes";
import { textoAtual } from "@/lib/leis/linha-do-tempo";
import styles from "./popup.module.css";

interface Aberto {
  lei: string;
  art: string;
  href: string;
  alvo: string | null;
  /** posição do link na tela; null = painel inferior (toque) */
  ret: { left: number; top: number; bottom: number } | null;
}
interface Trecho {
  ini: number;
  fim: number;
  cor: string;
  nota: boolean;
}
interface Pedaco {
  t: string;
  marca?: Trecho;
}
interface Conteudo {
  nome: string;
  rotulo: string;
  paragrafos: Pedaco[][];
}

/** Marcações do usuário neste artigo, em posições do texto inteiro; vazio se o texto vigente não bate com o exibido. */
async function marcasDoArtigo(lei: string, art: string, texto: string): Promise<Trecho[]> {
  const marcas = lerMarcacoes(lei).filter((m) => m.disp?.split(".")[0] === art);
  if (!marcas.length) return [];
  const vigentes = textoAtual((await carregarLei(lei)).blocos)
    .map((x) => x.bloco)
    .filter((b) => b.disp?.split(".")[0] === art);
  const textos = vigentes.map((b) => b.texto);
  if (textos.join("\n") !== texto) return [];
  const disps = vigentes.map((b) => b.disp);
  const inicios: number[] = [];
  textos.reduce((pos, t) => {
    inicios.push(pos);
    return pos + t.length + 1;
  }, 0);
  return marcas.flatMap((m) => {
    const onde = localizar({ ...m, i: -1 }, textos, disps);
    if (!onde) return [];
    const base = inicios[onde.i]!;
    return [{ ini: base + onde.ini, fim: base + onde.fim, cor: m.cor, nota: !!m.nota }];
  });
}

/** Pedaços de uma linha; onde duas marcações se sobrepõem, vale a última. */
function pedacos(texto: string, trechos: Trecho[]): Pedaco[] {
  const cortes = [...new Set([0, texto.length, ...trechos.flatMap((x) => [x.ini, x.fim])])].sort((a, b) => a - b);
  const saida: Pedaco[] = [];
  for (let n = 0; n < cortes.length - 1; n++) {
    const a = cortes[n]!;
    const b = cortes[n + 1]!;
    const marca = trechos.filter((x) => x.ini <= a && x.fim >= b).at(-1);
    const ult = saida.at(-1);
    if (ult && ult.marca?.cor === marca?.cor && ult.marca?.nota === marca?.nota) ult.t += texto.slice(a, b);
    else saida.push({ t: texto.slice(a, b), marca });
  }
  return saida;
}

function paragrafos(texto: string, trechos: Trecho[]): Pedaco[][] {
  let inicio = 0;
  return texto.split("\n").map((linha) => {
    const fim = inicio + linha.length;
    const dentro = trechos
      .filter((x) => x.ini < fim && x.fim > inicio)
      .map((x) => ({ ...x, ini: Math.max(x.ini, inicio) - inicio, fim: Math.min(x.fim, fim) - inicio }));
    inicio = fim + 1;
    return pedacos(linha, dentro);
  });
}

const link = (el: EventTarget | null) => (el instanceof Element ? el.closest<HTMLAnchorElement>("a[data-lei][data-art]") : null);

/** Pop-up com o texto do artigo ao passar o mouse (ou tocar) num link de artigo, em qualquer página. */
export function PopupArtigos() {
  const [aberto, setAberto] = useState<Aberto | null>(null);
  const [conteudo, setConteudo] = useState<Conteudo | "erro" | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sobreCartao = useRef(false);
  const [telaCheia, setTelaCheia] = useState<Element | null>(null);

  useEffect(() => {
    const mudou = () => setTelaCheia(document.fullscreenElement !== document.documentElement ? document.fullscreenElement : null);
    document.addEventListener("fullscreenchange", mudou);
    return () => document.removeEventListener("fullscreenchange", mudou);
  }, []);

  useEffect(() => {
    const toque = window.matchMedia("(hover: none)");
    const abrir = (a: HTMLAnchorElement, comoPainel: boolean) => {
      const r = a.getBoundingClientRect();
      setAberto({
        lei: a.dataset.lei!,
        art: a.dataset.art!,
        href: a.href,
        alvo: a.getAttribute("target"),
        ret: comoPainel ? null : { left: r.left + r.width / 2, top: r.top, bottom: r.bottom },
      });
    };
    const limpar = () => timer.current && clearTimeout(timer.current);
    const sobre = (e: PointerEvent) => {
      const a = link(e.target);
      if (!a || e.pointerType !== "mouse") return;
      limpar();
      timer.current = setTimeout(() => abrir(a, false), 280);
    };
    const fora = (e: PointerEvent) => {
      if (!link(e.target) || e.pointerType !== "mouse") return;
      limpar();
      timer.current = setTimeout(() => !sobreCartao.current && setAberto(null), 220);
    };
    const clique = (e: MouseEvent) => {
      const a = link(e.target);
      if (!a || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (!toque.matches && a.target !== "_blank") return;
      e.preventDefault();
      abrir(a, toque.matches);
    };
    const foco = (e: FocusEvent) => {
      const a = link(e.target);
      if (a && !toque.matches) abrir(a, false);
    };
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAberto(null);
    const rolar = () => !toque.matches && setAberto(null);
    document.addEventListener("pointerover", sobre);
    document.addEventListener("pointerout", fora);
    document.addEventListener("click", clique, true);
    document.addEventListener("focusin", foco);
    document.addEventListener("keydown", tecla);
    window.addEventListener("scroll", rolar, { passive: true });
    return () => {
      limpar();
      document.removeEventListener("pointerover", sobre);
      document.removeEventListener("pointerout", fora);
      document.removeEventListener("click", clique, true);
      document.removeEventListener("focusin", foco);
      document.removeEventListener("keydown", tecla);
      window.removeEventListener("scroll", rolar);
    };
  }, []);

  useEffect(() => {
    if (!aberto) return;
    let vivo = true;
    setConteudo(null); // eslint-disable-line react-hooks/set-state-in-effect -- limpa o anterior enquanto carrega
    carregarArtigos(aberto.lei)
      .then(async (d) => {
        const a = d.artigos.find((x) => x[0] === aberto.art);
        if (!a) {
          if (vivo) setConteudo("erro");
          return;
        }
        const trechos = await marcasDoArtigo(aberto.lei, aberto.art, a[2]).catch(() => []);
        if (vivo) setConteudo({ nome: d.nome, rotulo: a[1], paragrafos: paragrafos(a[2], trechos) });
      })
      .catch(() => vivo && setConteudo("erro"));
    return () => {
      vivo = false;
    };
  }, [aberto]);

  if (!aberto) return null;
  const painel = !aberto.ret;
  const abaixo = aberto.ret ? aberto.ret.bottom < window.innerHeight * 0.55 : true;
  const estilo = aberto.ret
    ? { left: Math.min(Math.max(aberto.ret.left, 170), window.innerWidth - 170), ...(abaixo ? { top: aberto.ret.bottom + 8 } : { bottom: window.innerHeight - aberto.ret.top + 8 }) }
    : undefined;

  return createPortal(
    <>
      {painel && <div className={styles.fundo} onClick={() => setAberto(null)} aria-hidden />}
      <div
        className={painel ? styles.painel : styles.cartao}
        style={estilo}
        role="dialog"
        aria-label="Texto do artigo"
        onPointerEnter={() => (sobreCartao.current = true)}
        onPointerLeave={(e) => {
          if (e.pointerType !== "mouse") return;
          sobreCartao.current = false;
          setAberto(null);
        }}
      >
        {conteudo === null && <p className={styles.carregando}>Carregando…</p>}
        {conteudo === "erro" && <p className={styles.carregando}>Não foi possível mostrar este artigo.</p>}
        {conteudo && conteudo !== "erro" && (
          <>
            <p className={styles.lei}>{conteudo.nome}</p>
            <div className={styles.texto}>
              {conteudo.paragrafos.map((linha, k) => (
                <p key={k}>
                  {linha.map((p, j) =>
                    p.marca ? (
                      <mark
                        key={j}
                        className={styles.marca}
                        data-so-nota={p.marca.cor === "nota" ? "1" : undefined}
                        data-nota={p.marca.nota ? "1" : undefined}
                        style={p.marca.cor === "nota" ? undefined : ({ "--c": p.marca.cor } as React.CSSProperties)}
                      >
                        {p.t}
                      </mark>
                    ) : (
                      p.t
                    ),
                  )}
                </p>
              ))}
            </div>
          </>
        )}
        <div className={styles.acoes}>
          <a className="btn btn-sm btn-gold" href={aberto.href} target={aberto.alvo ?? undefined} rel={aberto.alvo ? "noopener" : undefined} onClick={() => setAberto(null)}>
            Abrir artigo
          </a>
          {painel && (
            <button type="button" className="btn btn-sm" onClick={() => setAberto(null)}>
              Fechar
            </button>
          )}
        </div>
      </div>
    </>,
    telaCheia ?? document.body,
  );
}
