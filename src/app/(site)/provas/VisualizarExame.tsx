"use client";

import { useEffect, useRef, useState } from "react";
import { useMostrarPeca } from "@/components/NomePeca";
import type { ExameResumo } from "@/content/load";
import { tituloExame } from "@/content/titulo";
import styles from "./provas.module.css";
import { pontuacaoDo, type PartePontos } from "./pontuacao";
import { ConferirTexto } from "./ConferirTexto";
import { type Chave, nomeDoArquivo } from "./nomes";
import { precisaDoVisorProprio, VisorPdf } from "./VisorPdf";

export type Aba = "conferir" | "pontuacao" | Chave;

// a ordem das abas: a 2ª fase atualizada primeiro (é a que abre), depois a original, a 1ª fase e a correção
const PDFS: { chave: Chave; rotulo: string; curto: string; grupo: string }[] = [
  { chave: "cadernoAtualizado", rotulo: "Caderno atualizado", curto: "Caderno", grupo: "Atualizada" },
  { chave: "gabaritoAtualizado", rotulo: "Gabarito atualizado", curto: "Gabarito", grupo: "Atualizada" },
  { chave: "cadernoOriginal", rotulo: "Caderno original", curto: "Caderno", grupo: "Original" },
  { chave: "gabaritoOriginal", rotulo: "Gabarito original", curto: "Gabarito", grupo: "Original" },
  { chave: "objetivaCaderno", rotulo: "Caderno da 1ª fase", curto: "Caderno", grupo: "1ª fase" },
  { chave: "objetivaGabarito", rotulo: "Gabarito da 1ª fase", curto: "Gabarito", grupo: "1ª fase" },
];
// a pontuação e o conferidor de texto
const FERRAMENTAS = "Correção";

const numero = (v: number) => v.toFixed(2).replace(".", ",");
/**
 * As notas que o item admite, quando há mais que "zero ou tudo": "0 / 0.15 / 0.25" → "Notas possíveis: 0,00 · 0,15 ·
 * 0,25"; "até 0.5" → "Até 0,50".
 */
function faixas(pontos: string): string | null {
  if (pontos.startsWith("até ")) return `Até ${numero(Number(pontos.slice(4)))}`;
  const vs = pontos.split(" / ").map(Number);
  if (vs.length <= 2 || vs.some((v) => Number.isNaN(v))) return null;
  return `Notas possíveis: ${vs.map(numero).join(" · ")}`;
}

/** A distribuição dos pontos do padrão de resposta, parte a parte; os critérios da correção automática ficam recolhidos. */
function Pontuacao({ partes }: { partes: PartePontos[] }) {
  const total = partes.reduce((soma, p) => soma + p.valor, 0);
  const idDa = (titulo: string) => `pontos-${titulo.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <div className={styles.pontos}>
      <p className="muted">A distribuição dos pontos do padrão de resposta da FGV, item a item. Total: {numero(total)} pontos.</p>
      <nav className={styles.partesPontos} aria-label="Partes da prova">
        {partes.map((p) => (
          <a key={p.titulo} href={`#${idDa(p.titulo)}`}>
            {p.titulo} <b>{numero(p.valor)}</b>
          </a>
        ))}
      </nav>
      {partes.map((p) => (
        <section key={p.titulo} id={idDa(p.titulo)} className={styles.partePontos}>
          <h3>
            {p.titulo} <span>vale {numero(p.valor)}</span>
          </h3>
          <ol className={styles.itensPontos}>
            {p.itens.map((it) => {
              const valor = it.componentes.reduce((s, c) => s + c.valor, 0);
              return (
                <li key={it.n}>
                  <span className={styles.nItem}>{it.n}</span>
                  <div>
                    <p>{it.descricao}</p>
                    {faixas(it.pontos) && <p className={styles.faixas}>{faixas(it.pontos)}</p>}
                    {it.anulado !== undefined && <p className={styles.faixas}>Anulado: {numero(it.anulado)} para todos</p>}
                    {it.componentes.length > 0 && (
                      <details className={styles.criterios}>
                        <summary>
                          {it.componentes.length === 1 ? "1 critério" : `${it.componentes.length} critérios`} da correção automática
                        </summary>
                        <ul>
                          {it.componentes.map((c) => (
                            <li key={c.id}>
                              <b>{numero(c.valor)}</b> {c.rotulo}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                  <span className={styles.valorItem}>{numero(valor)}</span>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}

/** Os exames vizinhos, para as setas e o deslizar do dedo: o anterior e o próximo na ordem dos números. */
export interface NavegacaoExames {
  anterior?: ExameResumo;
  proximo?: ExameResumo;
  onIr: (e: ExameResumo) => void;
}

/** Um gesto de lado que não é rolagem: o dedo andou mais na horizontal, e não dentro de algo que rola de lado. */
const DESLIZE_MIN = 60;
function rolaDeLado(el: EventTarget | null, ate: Element) {
  for (let n = el instanceof Element ? el : null; n && n !== ate; n = n.parentElement) {
    if (n.matches("input, textarea, select")) return true;
    if (n.scrollWidth > n.clientWidth + 1 && /auto|scroll/.test(getComputedStyle(n).overflowX)) return true;
  }
  return false;
}

export function VisualizarExame({
  exame,
  pontuacao,
  onFechar,
  abaInicial,
  paginaDoCaderno,
  navegacao,
}: {
  exame: ExameResumo;
  /** a pontuação já pronta; sem ela, vem do recorte do exame (/dados/exames) quando a aba abre */
  pontuacao?: PartePontos[];
  onFechar: () => void;
  abaInicial?: Aba;
  /** a página em que o caderno original abre (a 2 é a do enunciado da peça) */
  paginaDoCaderno?: number;
  navegacao?: NavegacaoExames;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [mostrarPeca] = useMostrarPeca();
  // no celular o navegador não mostra PDF no quadro (nem numa aba nova: ele baixa); aí o PDF é desenhado aqui, com o
  // pdf.js. O visualizador só existe no navegador (abre num clique), então a decisão pode sair já na criação.
  const [visorProprio] = useState(precisaDoVisorProprio);
  // o iPhone não põe um elemento em tela cheia: lá o botão some
  const [podeTelaCheia] = useState(() => typeof document !== "undefined" && document.fullscreenEnabled !== false);
  const pdfs = PDFS.filter((p) => exame.downloads[p.chave]);
  const abas: Aba[] = [...pdfs.map((p) => p.chave), ...(exame.corrigivel ? (["pontuacao", "conferir"] as const) : [])];
  // as abas em grupos (2ª fase atualizada, original, 1ª fase e a correção), na mesma ordem
  const grupos = abas.reduce<{ nome: string; abas: Aba[] }[]>((gs, a) => {
    const nome = PDFS.find((p) => p.chave === a)?.grupo ?? FERRAMENTAS;
    const g = gs.at(-1);
    if (g?.nome === nome) g.abas.push(a);
    else gs.push({ nome, abas: [a] });
    return gs;
  }, []);
  // a aba escolhida vale para os exames vizinhos também; quando um não tem, fica a primeira dele
  const [escolhida, setEscolhida] = useState<Aba | null>(abaInicial ?? null);
  const atual = escolhida && abas.includes(escolhida) ? escolhida : abas[0];

  const telaCheia = useRef<HTMLDivElement>(null);
  const [emTelaCheia, setEmTelaCheia] = useState(false);
  const [carregada, setCarregada] = useState<{ id: string; partes: PartePontos[] | null } | null>(null);
  // de que lado o exame novo entra (para a animação)
  const [lado, setLado] = useState<"anterior" | "proximo" | null>(null);
  const toque = useRef<{ x: number; y: number; lado: boolean } | null>(null);

  useEffect(() => {
    const d = dialogo.current;
    if (d && !d.open) d.showModal();
    // o foco fica no pop, não no primeiro botão (que ganharia o contorno de foco sem ninguém ter usado o teclado)
    d?.focus();
    const sincronizar = () => setEmTelaCheia(document.fullscreenElement === telaCheia.current);
    document.addEventListener("fullscreenchange", sincronizar);
    return () => document.removeEventListener("fullscreenchange", sincronizar);
  }, []);

  // sem a pontuação pronta, ela sai do recorte do exame que o conferidor de texto já usa
  const precisaPontos = atual === "pontuacao" && !pontuacao && carregada?.id !== exame.id;
  useEffect(() => {
    if (!precisaPontos) return;
    let vale = true;
    fetch(`/dados/exames/${exame.id}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((x) => vale && setCarregada({ id: exame.id, partes: pontuacaoDo(x) }))
      .catch(() => vale && setCarregada({ id: exame.id, partes: null }));
    return () => {
      vale = false;
    };
  }, [precisaPontos, exame.id]);
  const partes = pontuacao ?? (carregada?.id === exame.id ? carregada.partes : undefined);

  const alternarTelaCheia = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void telaCheia.current?.requestFullscreen();
  };
  const ir = (para: "anterior" | "proximo") => {
    const e = navegacao?.[para];
    if (!e) return;
    setLado(para);
    navegacao.onIr(e);
  };

  const rotulo = (a: Aba) => {
    if (a === "conferir") return "Conferir texto";
    if (a === "pontuacao") return "Pontuação";
    return PDFS.find((p) => p.chave === a)?.rotulo ?? a;
  };
  const rotuloCurto = (a: Aba) => PDFS.find((p) => p.chave === a)?.curto ?? rotulo(a);
  // no celular, as abas em duas linhas: o grupo (Atualizada, Original…) e, embaixo, o que mostrar dele
  const grupoAtual = grupos.find((g) => atual && g.abas.includes(atual)) ?? grupos[0];
  const escolherGrupo = (g: (typeof grupos)[number]) => {
    // trocando de grupo, fica o mesmo documento (o gabarito da original, vindo do gabarito da atualizada)
    const mesmo = g.abas.find((a) => atual && rotuloCurto(a) === rotuloCurto(atual));
    setEscolhida(mesmo ?? g.abas[0]!);
  };
  const subtitulo = [
    exame.aplicacao ? exame.aplicacao.split("-").reverse().join("/") : null,
    mostrarPeca && exame.peca && exame.peca !== "—" ? exame.peca : null,
    exame.preliminar.gabarito ? "gabarito preliminar" : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const href = atual && atual !== "conferir" && atual !== "pontuacao" ? exame.downloads[atual] : null;
  const nome = atual && atual !== "conferir" && atual !== "pontuacao" ? nomeDoArquivo(exame, atual) : "";
  // o leitor de PDF do navegador abre na página do #page
  const src = href && atual === "cadernoOriginal" && paginaDoCaderno ? `${href}#page=${paginaDoCaderno}` : href;
  const seta = (para: "anterior" | "proximo") => {
    const e = navegacao?.[para];
    return (
      <button
        type="button"
        className={styles.seta}
        data-lado={para}
        onClick={() => ir(para)}
        disabled={!e}
        aria-label={e ? `${para === "anterior" ? "Exame anterior" : "Próximo exame"}: ${tituloExame(e)}` : para === "anterior" ? "Não há exame anterior" : "Não há próximo exame"}
        title={e ? tituloExame(e) : undefined}
      >
        {para === "anterior" && <span aria-hidden>‹</span>}
        {e && <span className={styles.setaNumeral}>{e.numeral}</span>}
        {para === "proximo" && <span aria-hidden>›</span>}
      </button>
    );
  };

  return (
    <dialog
      ref={dialogo}
      tabIndex={-1}
      onClose={onFechar}
      aria-labelledby="visualizar-titulo"
      className={styles.dialogo}
      onKeyDown={(ev) => {
        // as setas do teclado trocam de exame (fora dos campos de texto)
        if (!navegacao || ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey || rolaDeLado(ev.target, ev.currentTarget)) return;
        if (ev.key === "ArrowLeft") ir("anterior");
        else if (ev.key === "ArrowRight") ir("proximo");
      }}
    >
      <div
        ref={telaCheia}
        className={styles.telaCheia}
        onTouchStart={(ev) => {
          const t = ev.touches[0];
          toque.current = navegacao && t && ev.touches.length === 1 ? { x: t.clientX, y: t.clientY, lado: rolaDeLado(ev.target, ev.currentTarget) } : null;
        }}
        onTouchEnd={(ev) => {
          const t0 = toque.current;
          const t = ev.changedTouches[0];
          toque.current = null;
          if (!t0 || !t || t0.lado) return;
          const dx = t.clientX - t0.x;
          const dy = t.clientY - t0.y;
          // o dedo para a esquerda traz o próximo; para a direita, o anterior
          if (Math.abs(dx) >= DESLIZE_MIN && Math.abs(dx) > 1.5 * Math.abs(dy)) ir(dx < 0 ? "proximo" : "anterior");
        }}
      >
      <header className={styles.dialogoTopo}>
        <div className={styles.dialogoTitulo}>
          {navegacao && seta("anterior")}
          <span className={styles.num} aria-hidden>
            {exame.numeral}
          </span>
          <div className={styles.dialogoNome}>
            <h2 id="visualizar-titulo" aria-live="polite">
              {tituloExame(exame)}
            </h2>
            {subtitulo && <p>{subtitulo}</p>}
          </div>
          {navegacao && seta("proximo")}
        </div>
        <div className={styles.dialogoAcoes}>
          {podeTelaCheia && (
            <button
              type="button"
              className={styles.botaoIcone}
              onClick={alternarTelaCheia}
              aria-label={emTelaCheia ? "Sair da tela cheia" : "Tela cheia"}
              title={emTelaCheia ? "Sair da tela cheia" : "Tela cheia"}
            >
              <span aria-hidden>{emTelaCheia ? "⤡" : "⤢"}</span>
            </button>
          )}
          <button type="button" className={styles.botaoIcone} onClick={() => dialogo.current?.close()} aria-label="Fechar" title="Fechar (Esc)">
            <span aria-hidden>✕</span>
          </button>
        </div>
      </header>
      <div key={exame.id} className={styles.dialogoConteudo} data-entra={lado ?? undefined}>
      {grupoAtual && (
        <div className={styles.abasCelular}>
          <div className={styles.segmentos} role="group" aria-label="Versão">
            {grupos.map((g) => (
              <button key={g.nome} type="button" aria-pressed={g === grupoAtual} onClick={() => escolherGrupo(g)}>
                {g.nome}
              </button>
            ))}
          </div>
          <div className={styles.documentos} role="group" aria-label="O que mostrar">
            {grupoAtual.abas.map((a) => (
              <button key={a} type="button" aria-pressed={atual === a} aria-label={rotulo(a)} onClick={() => setEscolhida(a)}>
                {rotuloCurto(a)}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className={styles.abas} role="group" aria-label="O que mostrar">
        {grupos.map((g) => (
          <div key={g.nome} className={styles.grupoAbas} data-ferramentas={g.nome === FERRAMENTAS || undefined}>
            <span className={styles.grupoNome}>{g.nome}</span>
            {g.abas.map((a) => (
              <button key={a} type="button" aria-pressed={atual === a} aria-label={rotulo(a)} onClick={() => setEscolhida(a)}>
                {rotuloCurto(a)}
              </button>
            ))}
          </div>
        ))}
      </div>
      {atual === "conferir" && (
        <div className={styles.corpo}>
          <ConferirTexto exameId={exame.id} />
        </div>
      )}
      {atual === "pontuacao" && (
        <div className={styles.corpo}>
          {partes ? <Pontuacao partes={partes} /> : <p className="muted">{partes === null ? "Não foi possível carregar a pontuação." : "Carregando a pontuação…"}</p>}
        </div>
      )}
      {href && src && (
        <>
          <div className={styles.barraPdf} data-visor-proprio={visorProprio || undefined}>
            <span>
              {rotulo(atual)} · {exame.numeral} Exame
            </span>
            {/* no celular a aba nova também baixaria o arquivo, e o "Baixar" já faz isso */}
            {!visorProprio && (
              <a href={href} target="_blank" rel="noreferrer">
                Abrir em nova aba ↗
              </a>
            )}
            <a href={href} download={nome} className={styles.baixarPdf}>
              ⬇ Baixar
            </a>
          </div>
          {visorProprio ? (
            <VisorPdf
              key={href}
              url={href}
              titulo={`${rotulo(atual)} do ${exame.numeral} Exame`}
              paginaInicial={atual === "cadernoOriginal" ? paginaDoCaderno : undefined}
              baixar={{ href, nome }}
            />
          ) : (
            <iframe key={src} className={styles.visor} src={src} title={`${rotulo(atual)} do ${exame.numeral} Exame`} />
          )}
        </>
      )}
      {abas.length === 0 && <p className={styles.corpo}>Nada publicado para este exame ainda.</p>}
      </div>
      </div>
    </dialog>
  );
}
