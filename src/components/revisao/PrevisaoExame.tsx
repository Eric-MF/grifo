"use client";

import { useLayoutEffect, useRef, type MouseEvent } from "react";
import type { Componente, Exame, Item, Peca } from "@/content/schema";

const rotuloDe = (c: Componente) =>
  c.rotulo ?? (c.dispositivo?.length ? c.dispositivo.join(" ou ") : c.termos?.join(" + ") ?? (c.alternativas ?? []).map((a) => a.join(" + ")).join(" ou "));

function Itens({ itens, base }: { itens: Item[]; base: string }) {
  return (
    <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {itens.map((it, k) => (
        <li key={k} data-yaml={`${base}.itens.${k}`} style={{ borderTop: "1px solid #e4e4e4", padding: "6px 4px" }}>
          <div>
            <b data-yaml={`${base}.itens.${k}.n`}>{it.n}</b>{" "}
            {it.secao && <span data-yaml={`${base}.itens.${k}.secao`} style={{ fontSize: 12, color: "#555", marginRight: 6 }}>[{it.secao}]</span>}
            <span data-yaml={`${base}.itens.${k}.descricao`}>{it.descricao}</span>{" "}
            <span style={{ fontSize: 12, color: "#555" }}>
              ({it.valores ? it.valores.join(" / ") : it.teto ?? "—"})
            </span>
          </div>
          {it.componentes.length > 0 && (
            <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
              {it.componentes.map((c, j) => (
                <li key={c.id} data-yaml={`${base}.itens.${k}.componentes.${j}`} style={{ fontSize: 13 }}>
                  <b>{c.id}</b> ({c.valor.toFixed(2)}) {rotuloDe(c)}
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}

function Parte({ parte, base, titulo }: { parte: Peca | Exame["questoes"][number]; base: string; titulo: string }) {
  const gabarito = parte.gabarito_comentado;
  return (
    <section data-yaml={base} style={{ marginBottom: 18 }}>
      <h3 style={{ fontSize: 15, margin: "0 0 6px" }}>{titulo}</h3>
      <div data-yaml={`${base}.enunciado`} style={{ whiteSpace: "pre-wrap", fontSize: 13.5, lineHeight: 1.5, marginBottom: 8 }}>
        {parte.enunciado}
      </div>
      {gabarito && (
        <details data-yaml={`${base}.gabarito_comentado`} style={{ fontSize: 13, marginBottom: 8 }}>
          <summary>Gabarito comentado</summary>
          <div style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>{gabarito}</div>
        </details>
      )}
      <Itens itens={parte.itens} base={base} />
    </section>
  );
}

const estilo = `
[data-yaml] { cursor: pointer; }
[data-ativo="1"] { outline: 2px solid #1d6fd6; outline-offset: 2px; background: #e6f0ff; border-radius: 3px; }
`;

export function PrevisaoExame({ exame, destaque, aoEscolher }: { exame: Exame; destaque: string | null; aoEscolher: (caminho: string) => void }) {
  const raiz = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = raiz.current;
    if (!el) return;
    el.querySelectorAll("[data-ativo]").forEach((n) => n.removeAttribute("data-ativo"));
    if (destaque === null) return;
    const casam = Array.from(el.querySelectorAll<HTMLElement>("[data-yaml]")).filter((n) => {
      const chave = n.dataset.yaml ?? "";
      return destaque === chave || destaque.startsWith(`${chave}.`);
    });
    const melhor = casam.sort((a, b) => (b.dataset.yaml?.length ?? 0) - (a.dataset.yaml?.length ?? 0))[0];
    if (melhor) {
      melhor.setAttribute("data-ativo", "1");
      melhor.scrollIntoView({ block: "nearest" });
    }
  }, [destaque]);

  const clicar = (e: MouseEvent<HTMLDivElement>) => {
    const alvo = (e.target as HTMLElement).closest<HTMLElement>("[data-yaml]");
    if (alvo?.dataset.yaml) aoEscolher(alvo.dataset.yaml);
  };

  return (
    <div ref={raiz} onClick={clicar} style={{ fontFamily: "Georgia, serif", color: "#111", background: "#fff", padding: "12px 14px", border: "1px solid #ccc", minHeight: 360, maxHeight: 620, overflow: "auto" }}>
      <style>{estilo}</style>
      {exame.observacoes && (
        <p data-yaml="observacoes" style={{ background: "#fff4c2", color: "#1a1600", padding: 6, fontSize: 12.5, fontFamily: "system-ui, sans-serif" }}>
          {exame.observacoes}
        </p>
      )}
      <h2 style={{ fontSize: 17, margin: "0 0 10px", fontFamily: "system-ui, sans-serif" }}>
        {exame.numeral} Exame — {exame.peca.nome}
      </h2>
      <Parte parte={exame.peca} base="peca" titulo={`Peça: ${exame.peca.nome}`} />
      {exame.questoes.map((q, k) => (
        <Parte key={q.n} parte={q} base={`questoes.${k}`} titulo={`Questão ${q.n}`} />
      ))}
    </div>
  );
}
