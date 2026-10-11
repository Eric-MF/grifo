"use client";

import { useEffect, useRef, useState } from "react";
import { pesquisar } from "@/lib/revisao/busca-cliente";
import type { Dispositivo } from "@/lib/revisao/tipos";

interface Estado {
  termo: string;
  resultados?: Dispositivo[];
  erro?: string;
}

const trecho = (texto: string) => (texto.length > 260 ? `${texto.slice(0, 260)}…` : texto);

export function BuscaDispositivo({
  rotulo,
  botao,
  destino,
  bloqueado,
  comValor,
  aoEscolher,
}: {
  rotulo: string;
  botao: string;
  destino?: string;
  bloqueado?: string;
  comValor: boolean;
  aoEscolher: (dispositivo: Dispositivo, valor: number) => void;
}) {
  const [digitado, setDigitado] = useState("");
  const [consulta, setConsulta] = useState("");
  const [estado, setEstado] = useState<Estado | null>(null);
  const [valor, setValor] = useState(0.1);
  const tempo = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (consulta.length < 2) return;
    let vivo = true;
    pesquisar(consulta)
      .then((resultados) => vivo && setEstado({ termo: consulta, resultados }))
      .catch((e: unknown) => vivo && setEstado({ termo: consulta, erro: e instanceof Error ? e.message : "falha na busca" }));
    return () => {
      vivo = false;
    };
  }, [consulta]);

  const digitar = (v: string) => {
    setDigitado(v);
    clearTimeout(tempo.current);
    tempo.current = setTimeout(() => setConsulta(v.trim()), 300);
  };

  const atual = estado?.termo === consulta ? estado : null;

  return (
    <div style={{ fontSize: 13 }}>
      <input
        type="search"
        value={digitado}
        onChange={(e) => digitar(e.target.value)}
        placeholder="Ex.: art. 157 CPP, provas ilícitas, lei 9296"
        aria-label={rotulo}
        style={{ width: "100%", padding: 6, boxSizing: "border-box", marginBottom: 6 }}
      />
      {(bloqueado ?? destino) && <div style={{ color: "#555", marginBottom: 6 }}>{bloqueado ?? destino}</div>}
      {consulta.length < 2 ? (
        <p style={{ color: "#777", margin: 0 }}>Digite ao menos 2 caracteres.</p>
      ) : !atual ? (
        <p style={{ color: "#777", margin: 0 }}>Buscando…</p>
      ) : atual.erro ? (
        <p style={{ color: "#8b0000", margin: 0 }}>Não foi possível buscar: {atual.erro}</p>
      ) : atual.resultados?.length === 0 ? (
        <p style={{ color: "#777", margin: 0 }}>Nenhum artigo vigente encontrado.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, maxHeight: 360, overflow: "auto" }}>
          {atual.resultados?.map((d) => (
            <li key={`${d.lei}:${d.artigo}`} style={{ borderTop: "1px solid #ddd", padding: "8px 0" }}>
              <div>
                <b>{d.citacao}</b> <span style={{ color: "#555" }}>· {d.nome}</span>
              </div>
              <div style={{ fontSize: 12.5, color: "#333", margin: "3px 0" }}>{trecho(d.texto)}</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button type="button" disabled={!!bloqueado} onClick={() => aoEscolher(d, valor)}>
                  {botao}
                </button>
                {comValor && (
                  <label>
                    valor{" "}
                    <input type="number" min={0.05} max={10} step={0.05} value={valor} onChange={(e) => setValor(Number(e.target.value))} style={{ width: 70 }} />
                  </label>
                )}
                <a href={d.url} target="_blank" rel="noreferrer">
                  ver no Grifo
                </a>
                <a href={d.planalto} target="_blank" rel="noreferrer">
                  Planalto
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
