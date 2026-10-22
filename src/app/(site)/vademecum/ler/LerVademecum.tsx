"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PaginaLeis, type SecaoPedida } from "@/components/leis/PaginaLeis";
import { corpoParaArquivo, documentoVade, nomeDoArquivo } from "@/lib/leis/baixar";
import { decodificar } from "@/lib/leis/compartilhar";
import { atualizarVade, mesmoVade } from "@/lib/leis/foto";
import { gravarVademecuns, lerVademecuns, opcoesDoVade, salvarVademecum, type ItemVade, type OpcoesVade, type Vademecum } from "@/lib/leis/vademecum";
import styles from "../vademecum.module.css";

interface Carga {
  t: string;
  d: ItemVade[];
  o?: Partial<OpcoesVade>;
}

type Ajustes = { impressao?: Partial<OpcoesVade["impressao"]>; download?: Partial<OpcoesVade["download"]> };

export function LerVademecum() {
  const [carga, setCarga] = useState<Carga | null | "invalido">(null);
  const [salvo, setSalvo] = useState(false);
  // o Vade Mecum salvo neste navegador (se este link é dele): mostra a foto de agora, não a do link
  const [local, setLocal] = useState<Vademecum | null>(null);
  // o que o leitor muda só nesta tela (impressão e download): não altera o Vade Mecum salvo
  const [ajustes, setAjustes] = useState<Ajustes>({});

  useEffect(() => {
    const ler = () => {
      const h = location.hash.match(/^#v=(v1\..+)$/);
      if (!h) return setCarga("invalido");
      decodificar<Carga>(h[1]).then((c) => {
        setCarga(c && Array.isArray(c.d) ? c : "invalido");
        if (c) {
          const igual = lerVademecuns().find((v) => mesmoVade(v, c.t, c.d));
          if (igual) {
            const atualizado = atualizarVade(igual);
            gravarVademecuns(lerVademecuns().map((x) => (x.id === igual.id ? atualizado : x)));
            setLocal(atualizado);
          } else setLocal(null);
          setSalvo(!!igual);
        }
      });
    };
    ler();
    window.addEventListener("hashchange", ler);
    return () => window.removeEventListener("hashchange", ler);
  }, []);

  const itens = useMemo<ItemVade[]>(() => (carga && carga !== "invalido" ? (local ? local.itens : carga.d) : []), [carga, local]);
  const secoes: SecaoPedida[] = useMemo(
    () =>
      itens.map((i) => ({
        lei: i.lei,
        artigos: i.artigos,
        filtro: i.filtro,
        grifos: i.grifos,
        errados: i.errados,
      })),
    [itens],
  );

  if (carga === null) return <p className="muted">Abrindo o Vade Mecum…</p>;
  if (carga === "invalido")
    return (
      <p>
        Este link de Vade Mecum não pôde ser lido. <Link href="/vademecum/">Monte um novo</Link>.
      </p>
    );

  const base = opcoesDoVade(carga.o);
  const opcoes: OpcoesVade = {
    ...base,
    impressao: { ...base.impressao, ...ajustes.impressao },
    download: { ...base.download, ...ajustes.download },
  };

  const imprimir = () => window.print();

  const baixar = () => {
    const corpo = document.querySelector<HTMLElement>("[data-vademecum-corpo]");
    if (!corpo) return;
    // o arquivo não herda as opções de impressão (colunas e nova página)
    const sem = { ...opcoes, impressao: { colunas: false, novaPaginaPorLei: false } };
    const html = documentoVade({ titulo: carga.t, corpo: corpoParaArquivo(corpo, sem), opcoes: sem });
    const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = nomeDoArquivo(carga.t);
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className={`${styles.acoes} ${styles.naoImprimir}`}>
        {!salvo && (
          <button
            type="button"
            className="btn"
            onClick={() => {
              const novo: Vademecum = { id: Date.now().toString(36), titulo: carga.t, itens: carga.d, em: Date.now(), opcoes: base };
              salvarVademecum(novo);
              setLocal(atualizarVade(novo));
              setSalvo(true);
            }}
          >
            Salvar no meu Grifo
          </button>
        )}
        <Link className="btn" href="/vademecum/">
          Meus Vade Mecum
        </Link>
      </div>

      <div className={`${styles.saidas} ${styles.naoImprimir}`}>
        <section className={styles.saida} aria-labelledby="saida-impressao">
          <h2 id="saida-impressao">Imprimir / PDF</h2>
          <label className={styles.opcaoSaida}>
            <input
              type="checkbox"
              checked={opcoes.impressao.colunas}
              onChange={(e) => setAjustes((a) => ({ ...a, impressao: { ...a.impressao, colunas: e.target.checked } }))}
            />
            <span>
              <strong>Três colunas</strong>
              <small>Só no papel: economiza folhas e segue o formato dos Vade Mecum impressos.</small>
            </span>
          </label>
          <label className={styles.opcaoSaida}>
            <input
              type="checkbox"
              checked={opcoes.impressao.novaPaginaPorLei}
              onChange={(e) => setAjustes((a) => ({ ...a, impressao: { ...a.impressao, novaPaginaPorLei: e.target.checked } }))}
            />
            <span>
              <strong>Cada lei em página nova</strong>
              <small>Só no papel, para separar as leis ao encadernar.</small>
            </span>
          </label>
          <p className={styles.nota}>O papel não tem como seguir link: os “Grifo” e “Planalto” não saem na impressão.</p>
          <button type="button" className="btn btn-gold" onClick={imprimir}>
            Imprimir / salvar em PDF
          </button>
        </section>

        <section className={styles.saida} aria-labelledby="saida-baixar">
          <h2 id="saida-baixar">Baixar arquivo</h2>
          <label className={styles.opcaoSaida}>
            <input
              type="checkbox"
              checked={opcoes.download.links}
              onChange={(e) => setAjustes((a) => ({ ...a, download: { ...a.download, links: e.target.checked } }))}
            />
            <span>
              <strong>Manter os links “Grifo” e “Planalto”</strong>
              <small>No arquivo, eles continuam clicáveis e abrem o artigo na lei.</small>
            </span>
          </label>
          <p className={styles.nota}>Um arquivo HTML que abre no navegador, sem precisar do site.</p>
          <button type="button" className="btn" onClick={baixar}>
            Baixar .html
          </button>
        </section>
      </div>

      <PaginaLeis secoes={secoes} titulo={carga.t} opcoes={opcoes} />
    </>
  );
}
