"use client";

import { useState, type ReactNode } from "react";
import type { Dispositivo } from "@/lib/revisao/tipos";
import { BuscaDispositivo } from "./BuscaDispositivo";

const campo = (nome: string, valor: string, cita = true) => (valor.trim() ? `  ${nome}: ${cita ? JSON.stringify(valor.trim()) : valor.trim()}` : null);

function Saida({ texto }: { texto: string }) {
  return (
    <div style={{ marginTop: 8 }}>
      <pre style={{ background: "#f4f4f4", padding: 8, overflow: "auto", fontSize: 12, margin: 0 }}>{texto}</pre>
      <button type="button" onClick={() => navigator.clipboard?.writeText(texto)}>
        Copiar
      </button>
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section style={{ border: "1px solid #ccc", padding: "0.75rem 1rem", marginBottom: "1rem" }}>
      <h2 style={{ fontSize: 16, marginTop: 0 }}>{titulo}</h2>
      {children}
    </section>
  );
}

const entrada = { display: "block", width: "100%", marginBottom: 6, fontSize: 13, padding: 4 } as const;

export function FormLei() {
  const [f, setF] = useState({ id: "", assinatura: "", publicacao: "", vigencia: "", url: "", pendencia: "", nota: "", manual: false });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const linhas = [
    campo("assinatura", f.assinatura, false),
    campo("publicacao", f.publicacao, false),
    campo("vigencia", f.vigencia, false),
    campo("pendencia", f.pendencia),
    campo("nota", f.nota),
    f.manual ? "  manual: true" : null,
    campo("url", f.url),
  ].filter(Boolean);
  const texto = f.id.trim() ? `${f.id.trim()}:\n${linhas.join("\n")}` : "";
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState("");

  async function buscarNoPlanalto() {
    if (!f.id.trim()) return setAviso("Preencha o id antes: a busca usa o número da lei.");
    if (!f.url.trim()) return setAviso("Cole o link do Planalto antes de buscar.");
    setBuscando(true);
    setAviso("");
    try {
      const r = await fetch(`/revisao/planalto/?${new URLSearchParams({ url: f.url.trim(), id: f.id.trim() })}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.erro ?? `status ${r.status}`);
      const { assinatura, publicacao, vigencia, pendencias } = j.datas;
      setF((atual) => ({
        ...atual,
        assinatura: assinatura ?? "",
        publicacao: publicacao ?? "",
        vigencia: vigencia ?? "",
        pendencia: pendencias.join("; "),
        nota: "Planalto (busca automática, conferir)",
      }));
      setAviso("Campos preenchidos a partir do Planalto. Confira antes de copiar.");
    } catch (erro) {
      setAviso(`Não foi possível buscar: ${erro instanceof Error ? erro.message : String(erro)}`);
    } finally {
      setBuscando(false);
    }
  }

  return (
    <Bloco titulo="Inserir lei em content/leis-alteradoras.yaml">
      <input style={entrada} placeholder="id (ex.: lei-15000)" value={f.id} onChange={set("id")} />
      <input style={entrada} placeholder="assinatura AAAA-MM-DD" value={f.assinatura} onChange={set("assinatura")} />
      <input style={entrada} placeholder="publicação AAAA-MM-DD" value={f.publicacao} onChange={set("publicacao")} />
      <input style={entrada} placeholder="vigência AAAA-MM-DD (deixe vazio se houver cláusula)" value={f.vigencia} onChange={set("vigencia")} />
      <input style={entrada} placeholder="link do Planalto" value={f.url} onChange={set("url")} />
      <button type="button" onClick={buscarNoPlanalto} disabled={buscando} style={{ marginBottom: 6 }}>
        {buscando ? "Buscando…" : "Buscar no Planalto"}
      </button>
      {aviso && <p style={{ fontSize: 13, margin: "0 0 6px" }}>{aviso}</p>}
      <input style={entrada} placeholder="pendência (o que falta conferir)" value={f.pendencia} onChange={set("pendencia")} />
      <input style={entrada} placeholder="nota (fonte e cláusula)" value={f.nota} onChange={set("nota")} />
      <label style={{ fontSize: 13 }}>
        <input type="checkbox" checked={f.manual} onChange={(e) => setF({ ...f, manual: e.target.checked })} /> veio de busca na web (manual)
      </label>
      {texto && <Saida texto={texto} />}
    </Bloco>
  );
}

export function FormArtigo({ diplomas }: { diplomas: { id: string; nome: string; planalto: string }[] }) {
  const [f, setF] = useState({ diploma: diplomas[0]?.id ?? "", artigo: "", texto: "" });
  const d = diplomas.find((x) => x.id === f.diploma);
  const n = f.artigo.trim();
  const preencher = (x: Dispositivo) =>
    setF({
      diploma: diplomas.some((y) => y.id === x.lei) ? x.lei : f.diploma,
      artigo: x.artigo.toUpperCase(),
      texto: x.texto.replace(/^Art\.?\s*\d+(?:-[A-Z]+)?\.?\s*/i, ""),
    });
  const bloco = n
    ? JSON.stringify({ tipo: "artigo", disp: `art${n}`, rotulo: `Art. ${n}.`, texto: `Art. ${n}. ${f.texto.trim()}`, superada: false, atos: [] }, null, 2)
    : "";
  return (
    <Bloco titulo="Artigo: conferir e inserir em content/leis-texto/<diploma>.json">
      <BuscaDispositivo
        rotulo="Buscar no Grifo para preencher"
        botao="Preencher com este artigo"
        destino="O texto vem do Grifo. Confira no Planalto antes de inserir."
        comValor={false}
        aoEscolher={(x) => preencher(x)}
      />
      <select style={entrada} value={f.diploma} onChange={(e) => setF({ ...f, diploma: e.target.value })}>
        {diplomas.map((x) => (
          <option key={x.id} value={x.id}>
            {x.nome} ({x.id})
          </option>
        ))}
      </select>
      <input style={entrada} placeholder="número do artigo (ex.: 154-A)" value={f.artigo} onChange={(e) => setF({ ...f, artigo: e.target.value })} />
      {n && d && (
        <p style={{ fontSize: 13 }}>
          <a href={`/leis/${d.id}/#art${n}`} target="_blank" rel="noreferrer">Abrir no Grifo</a>
          {d.planalto && (
            <>
              {" · "}
              <a href={`${d.planalto}#art${n}`} target="_blank" rel="noreferrer">Abrir no Planalto</a>
            </>
          )}
        </p>
      )}
      <textarea style={{ ...entrada, minHeight: 80 }} placeholder="texto do artigo, como no Planalto" value={f.texto} onChange={(e) => setF({ ...f, texto: e.target.value })} />
      {bloco && <Saida texto={bloco} />}
      {bloco && <p style={{ fontSize: 12, color: "#555" }}>Cole o bloco dentro de &quot;blocos&quot;, na posição do artigo.</p>}
    </Bloco>
  );
}

export function FormVideo() {
  const [f, setF] = useState({ tema: "", url: "", nota: "" });
  const busca = f.tema.trim() ? `https://www.youtube.com/results?search_query=${encodeURIComponent(`${f.tema.trim()} direito penal`)}` : "";
  const texto = f.url.trim() ? `- url: ${JSON.stringify(f.url.trim())}\n  tema: ${JSON.stringify(f.tema.trim())}\n  nota: ${JSON.stringify(f.nota.trim())}` : "";
  return (
    <Bloco titulo="Vídeos do YouTube">
      <input style={entrada} placeholder="tema (ex.: concurso material)" value={f.tema} onChange={(e) => setF({ ...f, tema: e.target.value })} />
      {busca && (
        <p style={{ fontSize: 13 }}>
          <a href={busca} target="_blank" rel="noreferrer">Buscar no YouTube</a>
        </p>
      )}
      <input style={entrada} placeholder="link do vídeo sugerido" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} />
      <input style={entrada} placeholder="nota (o que o vídeo cobre e se é confiável)" value={f.nota} onChange={(e) => setF({ ...f, nota: e.target.value })} />
      {texto && <Saida texto={texto} />}
    </Bloco>
  );
}
