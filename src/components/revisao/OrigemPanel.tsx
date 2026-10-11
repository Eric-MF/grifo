"use client";

import { useEffect, useState } from "react";
import type { Exame } from "@/content/schema";
import { pesquisar } from "@/lib/revisao/busca-cliente";
import type { Dispositivo } from "@/lib/revisao/tipos";

type Achado = { citacao: string; dispositivo?: Dispositivo; erro?: string };
type Lista = { chave: string; achados: Achado[] };
type Aba = "gabarito" | "caderno";

const resolver = (obj: unknown, partes: string[]): unknown => partes.reduce<unknown>((o, p) => (o as Record<string, unknown> | undefined)?.[p], obj);

/** Citações de lei que sustentam o item (ou o componente) selecionado no editor. */
function citacoesDe(exame: Exame, destaque: string | null): { citacoes: string[]; criterios: string[]; sujeito: string | null } {
  if (!destaque) return { citacoes: [], criterios: [], sujeito: null };
  const partes = destaque.split(".");
  const j = partes.lastIndexOf("componentes");
  if (j >= 0 && partes[j + 1] !== undefined) {
    const comp = resolver(exame, partes.slice(0, j + 2)) as Exame["peca"]["itens"][number]["componentes"][number] | undefined;
    if (comp) {
      return {
        citacoes: comp.dispositivo ?? [],
        criterios: [...(comp.termos ? [`termos: ${comp.termos.join(" + ")}`] : []), ...(comp.alternativas ? [`alternativas: ${comp.alternativas.map((a) => a.join(" + ")).join(" | ")}`] : [])],
        sujeito: `componente ${comp.id}`,
      };
    }
  }
  const i = partes.lastIndexOf("itens");
  if (i >= 0 && typeof partes[i + 1] === "string" && /^\d+$/.test(partes[i + 1])) {
    const item = resolver(exame, partes.slice(0, i + 2)) as Exame["peca"]["itens"][number] | undefined;
    if (item) {
      return {
        citacoes: item.componentes.flatMap((c) => c.dispositivo ?? []),
        criterios: item.componentes.filter((c) => !c.dispositivo?.length).map((c) => `${c.id}: ${c.rotulo ?? (c.termos ?? []).join(" + ")} (sem citação de lei)`),
        sujeito: `item ${item.n}`,
      };
    }
  }
  return { citacoes: [], criterios: [], sujeito: null };
}

const numeroDoArtigo = (citacao: string) => citacao.match(/art\.?\s*(\d+(?:-[a-z])?)/i)?.[1].toLowerCase();

function escolher(citacao: string, resultados: Dispositivo[]): Achado {
  const numero = numeroDoArtigo(citacao);
  const dispositivo = resultados.find((d) => d.artigo === numero);
  return dispositivo ? { citacao, dispositivo } : { citacao, erro: "artigo não encontrado no texto de lei do Grifo; conferir no Planalto" };
}

export function OrigemPanel({ exame, destaque, pdfs }: { exame: Exame; destaque: string | null; pdfs: { gabarito: string | null; caderno: string | null } }) {
  const { citacoes, criterios, sujeito } = citacoesDe(exame, destaque);
  const chave = citacoes.join("|");
  const [lista, setLista] = useState<Lista | null>(null);
  const [aba, setAba] = useState<Aba | null>(null);
  const abas = (["gabarito", "caderno"] as const).filter((k) => pdfs[k]);
  const atual: Aba | undefined = aba && pdfs[aba] ? aba : abas[0];

  useEffect(() => {
    if (!chave) return;
    let vivo = true;
    const cs = chave.split("|");
    Promise.all(
      cs.map((c) =>
        pesquisar(c)
          .then((r) => escolher(c, r))
          .catch((e: unknown) => ({ citacao: c, erro: e instanceof Error ? e.message : "falha na busca" })),
      ),
    ).then((achados) => vivo && setLista({ chave, achados }));
    return () => {
      vivo = false;
    };
  }, [chave]);

  const achados = lista?.chave === chave ? lista.achados : null;

  return (
    <div style={{ fontSize: 13 }}>
      <h3 style={{ fontSize: 14, margin: "0 0 6px" }}>Origem{sujeito ? ` · ${sujeito}` : ""}</h3>
      {!sujeito && <p style={{ color: "#777", margin: "0 0 8px" }}>Clique em um item ou componente para ver a lei que o sustenta.</p>}
      {criterios.map((c) => (
        <p key={c} style={{ margin: "0 0 4px", color: "#333" }}>
          {c}
        </p>
      ))}
      {sujeito && citacoes.length === 0 && <p style={{ color: "#777", margin: "0 0 8px" }}>Sem citação de lei: confira o gabarito abaixo.</p>}
      {citacoes.length > 0 && !achados && <p style={{ color: "#777" }}>Buscando os textos…</p>}
      {achados?.map((a) => (
        <div key={a.citacao} style={{ border: "1px solid #ddd", padding: 8, marginBottom: 8 }}>
          <b>{a.citacao}</b>
          {a.dispositivo ? (
            <>
              <div style={{ color: "#555", fontSize: 12 }}>
                {a.dispositivo.nome} · {a.dispositivo.rotulo}
              </div>
              <div style={{ whiteSpace: "pre-wrap", margin: "4px 0", maxHeight: 180, overflow: "auto" }}>{a.dispositivo.texto}</div>
              <a href={a.dispositivo.url} target="_blank" rel="noreferrer">
                ver no Grifo
              </a>{" "}
              ·{" "}
              <a href={a.dispositivo.planalto} target="_blank" rel="noreferrer">
                Planalto
              </a>
            </>
          ) : (
            <div style={{ color: "#8b0000" }}>{a.erro}</div>
          )}
        </div>
      ))}
      {atual && (
        <section style={{ marginTop: 10 }}>
          <h3 style={{ fontSize: 14, margin: "0 0 6px" }}>Padrão de resposta original</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
            {abas.map((k) => (
              <button key={k} type="button" aria-pressed={atual === k} onClick={() => setAba(k)} style={{ fontWeight: atual === k ? 700 : 400 }}>
                {k === "gabarito" ? "Gabarito" : "Caderno"}
              </button>
            ))}
            <a href={pdfs[atual] ?? undefined} target="_blank" rel="noreferrer">
              abrir em nova aba
            </a>
            <a href={pdfs[atual] ?? undefined} download>
              baixar
            </a>
          </div>
          <iframe key={atual} src={pdfs[atual] ?? undefined} title={`${atual === "gabarito" ? "Gabarito" : "Caderno"} original`} style={{ width: "100%", height: "60vh", border: "1px solid #ccc" }} />
        </section>
      )}
    </div>
  );
}
