"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { parseDocument } from "yaml";
import type { Exame } from "@/content/schema";
import { diffLinhas } from "@/lib/diff-linhas";
import { type Caminho, caminhoDeTexto, caminhoDoItem, caminhoEm, inserirComponente, intervaloDe, textoDeCaminho } from "@/lib/revisao/mapa";
import type { Dispositivo } from "@/lib/revisao/tipos";
import { BuscaDispositivo } from "./BuscaDispositivo";
import { OrigemPanel } from "./OrigemPanel";
import { PrevisaoExame } from "./PrevisaoExame";

const ROTA = "/revisao/arquivo/";
const semInscricao = () => () => {};
const hoje = () => new Date().toISOString().slice(0, 10);

interface Validacao {
  arquivo: string;
  texto: string;
  erros: string[];
  resultado: unknown;
}

type Resposta = { texto?: string; erros?: string[]; resultado?: unknown; erro?: string; gravado?: boolean };
type Pdfs = { gabarito: string | null; caderno: string | null };

const TEMPO_LIMITE = 15_000;

/** Espera o `npm run dev` cair e voltar (reinício após gravar) e recarrega a página. */
async function aguardarReinicio(): Promise<boolean> {
  let caiu = false;
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    try {
      const r = await fetch(window.location.href, { cache: "no-store" });
      if (r.ok && caiu) {
        window.location.reload();
        return true;
      }
    } catch {
      caiu = true;
    }
  }
  return false;
}

function motivo(e: unknown) {
  return e instanceof DOMException && e.name === "TimeoutError" ? `o servidor não respondeu em ${TEMPO_LIMITE / 1000} s` : "falha de conexão com o servidor de desenvolvimento";
}

async function pedir(corpo: object | null, nome: string) {
  const signal = AbortSignal.timeout(TEMPO_LIMITE);
  const r = corpo
    ? await fetch(ROTA, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...corpo, nome }), signal })
    : await fetch(`${ROTA}${nome.split("/").map((parte) => encodeURIComponent(parte)).join("/")}`, { signal });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, j: j as Resposta };
}

function rotuloDoItem(exame: Exame, item: Caminho): string | null {
  const [parte, ...resto] = item;
  if (parte === "peca" && typeof resto[1] === "number") return `peça, item ${exame.peca.itens[resto[1]]?.n}`;
  if (parte === "questoes" && typeof resto[0] === "number" && typeof resto[2] === "number") {
    const q = exame.questoes[resto[0]];
    return `questão ${q?.n}, item ${q?.itens[resto[2]]?.n}`;
  }
  return null;
}

const estilo = {
  caixa: { border: "1px solid #ccc", padding: "0.75rem 1rem", marginBottom: "1rem" },
  area: { width: "100%", minHeight: 420, fontFamily: "ui-monospace, monospace", fontSize: 12.5, lineHeight: 1.45, background: "#fff", color: "#111", border: "1px solid #bbb", padding: 8, boxSizing: "border-box" },
  pre: { background: "#f6f6f6", color: "#111", padding: 8, margin: 0, maxHeight: 300, overflow: "auto", fontSize: 12 },
  botao: { padding: "0.4rem 0.9rem", marginRight: 8, marginTop: 6 },
  secao: { border: "1px solid #ddd", padding: "8px 10px", marginTop: 12 },
} as const;

const estiloGrade = `
.editor-grade { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr); gap: 16px; align-items: start; }
@media (max-width: 900px) { .editor-grade { grid-template-columns: minmax(0, 1fr); } }
`;

export function EditorYaml({ arquivos, origens }: { arquivos: string[]; origens: Record<string, Pdfs> }) {
  const busca = useSyncExternalStore(semInscricao, () => window.location.search, () => "");
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const pedido = new URLSearchParams(busca).get("arquivo");
  const arquivo = escolhido ?? (pedido && arquivos.includes(pedido) ? pedido : (arquivos[0] ?? ""));
  const [gravado, setGravado] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [validacao, setValidacao] = useState<Validacao | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [falha, setFalha] = useState<{ arquivo: string; msg: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [revisor, setRevisor] = useState("");
  const [notas, setNotas] = useState("");
  const [destaque, setDestaque] = useState<string | null>(null);
  const versao = useRef(0);
  const area = useRef<HTMLTextAreaElement>(null);

  const ehExame = /^content\/exames\//.test(arquivo);
  const alterado = gravado !== null && texto !== gravado;
  const trechos = useMemo(() => (gravado === null ? [] : diffLinhas(gravado, texto)), [gravado, texto]);
  const mudancas = trechos.filter((t) => t.tipo !== "igual").length;
  const validadoAgora = validacao?.arquivo === arquivo && validacao.texto === texto;
  const pronto = validadoAgora && validacao.erros.length === 0;
  const falhaAtual = gravado === null && falha?.arquivo === arquivo ? falha.msg : null;
  const exame = ehExame && pronto && validacao ? (validacao.resultado as Exame) : null;
  const itemDestaque = destaque ? caminhoDoItem(caminhoDeTexto(destaque)) : null;
  const rotuloItem = exame && itemDestaque ? rotuloDoItem(exame, itemDestaque) : null;
  const destinoItem = rotuloItem ?? (itemDestaque ? textoDeCaminho(itemDestaque) : null);

  useEffect(() => {
    if (!arquivo) return;
    let vivo = true;
    pedir(null, arquivo)
      .then(({ ok, j }) => {
        if (!vivo) return;
        if (!ok || j.texto === undefined) return setFalha({ arquivo, msg: `Não foi possível abrir ${arquivo}: ${j.erro ?? "resposta inválida do servidor"}` });
        setGravado(j.texto);
        setTexto(j.texto);
        setValidacao(null);
      })
      .catch((e: unknown) => vivo && setFalha({ arquivo, msg: `Não foi possível abrir ${arquivo}: ${motivo(e)}` }));
    return () => {
      vivo = false;
    };
  }, [arquivo]);

  useEffect(() => {
    if (gravado === null) return;
    const minha = ++versao.current;
    const t = setTimeout(() => {
      pedir({ texto, gravar: false }, arquivo)
        .then(({ ok, j }) => {
          if (minha !== versao.current) return;
          setValidacao({ arquivo, texto, erros: ok ? (j.erros ?? []) : [j.erro ?? "falha na validação"], resultado: j.resultado ?? null });
        })
        .catch(() => minha === versao.current && setValidacao({ arquivo, texto, erros: ["sem resposta do servidor de desenvolvimento"], resultado: null }));
    }, 350);
    return () => clearTimeout(t);
  }, [arquivo, texto, gravado]);

  const trocar = (nome: string) => {
    if (alterado && !window.confirm("Há alterações não gravadas. Trocar de arquivo mesmo assim?")) return;
    setAviso(null);
    setDestaque(null);
    setEscolhido(nome);
  };

  const marcarCursor = (pos: number) => {
    const caminho = caminhoEm(texto, pos);
    setDestaque(caminho ? textoDeCaminho(caminho) : null);
  };

  const escolherNoResultado = (caminho: string) => {
    setDestaque(caminho);
    const faixa = intervaloDe(texto, caminhoDeTexto(caminho));
    const el = area.current;
    if (!faixa || !el) return;
    el.focus({ preventScroll: true });
    el.setSelectionRange(faixa[0], faixa[1]);
  };

  const inserir = (d: Dispositivo, valor: number) => {
    if (!itemDestaque || !(valor > 0)) return setAviso("Escolha um item no YAML e um valor maior que zero.");
    const novo = inserirComponente(texto, itemDestaque, { valor, dispositivo: [d.citacao] });
    if (novo === null) return setAviso("Não encontrei o item escolhido no YAML.");
    setTexto(novo);
    setAviso(`Componente inserido em ${rotuloItem ?? "o item"} com ${d.citacao}. Confira o resultado e grave.`);
  };

  const gravar = async () => {
    setEnviando(true);
    setAviso(null);
    const { ok, j } = await pedir({ texto, gravar: true }, arquivo).catch((): { ok: boolean; j: Resposta } => ({ ok: false, j: { erro: "sem resposta do servidor de desenvolvimento" } }));
    setEnviando(false);
    if (!ok) return setValidacao({ arquivo, texto, erros: j.erros ?? [j.erro ?? "não gravado"], resultado: null });
    setGravado(texto);
    setAviso(`Gravado às ${new Date().toLocaleTimeString("pt-BR")}. Reiniciando o servidor de desenvolvimento…`);
    if (!(await aguardarReinicio())) setAviso("Gravado. O servidor não voltou a tempo: recarregue a página.");
  };

  const aprovarExame = () => {
    const doc = parseDocument(texto);
    if (doc.errors.length) return setAviso("Corrija o YAML antes de aprovar.");
    doc.setIn(["revisao", "status"], "revisado");
    doc.setIn(["revisao", "por"], revisor.trim());
    doc.setIn(["revisao", "em"], hoje());
    if (notas.trim()) doc.setIn(["revisao", "notas"], notas.trim());
    setTexto(doc.toString({ lineWidth: 0, blockQuote: "literal" }));
    setAviso("Bloco revisao preenchido no texto. Confira a diferença e grave.");
  };

  const visiveis = trechos.map((t, k) => ({ ...t, k })).filter((t, idx, todos) => t.tipo !== "igual" || todos.slice(Math.max(0, idx - 2), idx + 3).some((o) => o.tipo !== "igual"));
  const pdfs = origens[arquivo] ?? { gabarito: null, caderno: null };

  return (
    <section style={estilo.caixa}>
      <style>{estiloGrade}</style>
      <label style={{ display: "block", marginBottom: 8, fontSize: 13 }}>
        Arquivo{" "}
        <select value={arquivo} onChange={(e) => trocar(e.target.value)} style={{ fontSize: 13, padding: 4, maxWidth: "100%" }}>
          {arquivos.map((f) => (
            <option key={f} value={f}>
              {f.replace(/^content\//, "")}
            </option>
          ))}
        </select>
      </label>
      <p style={{ fontSize: 13, margin: "4px 0 8px", color: falhaAtual ? "#8b0000" : alterado ? "#8a4b00" : "#2b6b2b", fontWeight: falhaAtual ? 700 : 400 }}>
        {falhaAtual ?? (gravado === null ? "Carregando…" : alterado ? `Alterado, não gravado (${mudancas} linha(s) diferente(s))` : "Igual ao gravado no disco")}
      </p>

      <div>
        <button type="button" onClick={gravar} disabled={!alterado || !pronto || enviando} style={{ ...estilo.botao, fontWeight: 700, marginLeft: 0 }}>
          {enviando ? "Gravando…" : "Aprovar e gravar"}
        </button>
        <button type="button" onClick={() => gravado !== null && setTexto(gravado)} disabled={!alterado} style={estilo.botao}>
          Desfazer alterações
        </button>
        {aviso && <span style={{ fontSize: 13, marginLeft: 6 }}>{aviso}</span>}
      </div>

      <div className="editor-grade" style={{ marginTop: 8 }}>
        <div>
          <textarea
            ref={area}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onSelect={(e) => marcarCursor(e.currentTarget.selectionStart)}
            spellCheck={false}
            style={estilo.area}
            aria-label="Conteúdo do YAML"
          />

          {ehExame && (
            <fieldset style={{ ...estilo.secao, borderStyle: "dashed", fontSize: 13 }}>
              <legend>Inserir componente com dispositivo legal</legend>
              <BuscaDispositivo
                rotulo="Buscar artigo"
                botao="Inserir no item"
                destino={destinoItem ? `Vai para ${destinoItem}.` : undefined}
                bloqueado={destinoItem ? undefined : "Clique em um item do YAML para escolher onde inserir."}
                comValor
                aoEscolher={inserir}
              />
            </fieldset>
          )}

          {ehExame && (
            <fieldset style={{ ...estilo.secao, borderStyle: "dashed", fontSize: 13 }}>
              <legend>Aprovação do exame</legend>
              <input placeholder="nome do revisor" value={revisor} onChange={(e) => setRevisor(e.target.value)} style={{ marginRight: 6, padding: 4 }} />
              <input placeholder="notas (opcional)" value={notas} onChange={(e) => setNotas(e.target.value)} style={{ marginRight: 6, padding: 4, width: "min(360px, 100%)" }} />
              <button type="button" onClick={aprovarExame} disabled={!revisor.trim()} style={estilo.botao}>
                Aprovar no texto
              </button>
              <div style={{ fontSize: 12, color: "#555" }}>Preenche revisao.status, por, em e notas. Só grava quando você clicar em Gravar.</div>
            </fieldset>
          )}

          <h3 style={{ fontSize: 14, margin: "14px 0 6px" }}>Diferença em relação ao gravado</h3>
          {!alterado ? (
            <p style={{ fontSize: 13, color: "#555" }}>Nenhuma diferença.</p>
          ) : (
            <div style={{ ...estilo.pre, fontFamily: "ui-monospace, monospace", maxHeight: 360 }}>
              {visiveis.map((t, idx) => {
                const anterior = visiveis[idx - 1];
                const pulo = anterior && t.k - anterior.k > 1;
                const cor = t.tipo === "mais" ? { background: "#dff5e3", color: "#0b3d17" } : t.tipo === "menos" ? { background: "#fde2e4", color: "#6b0010" } : { color: "#555" };
                const sinal = t.tipo === "mais" ? "+ " : t.tipo === "menos" ? "- " : "  ";
                return (
                  <div key={t.k}>
                    {pulo && <div style={{ color: "#777" }}>…</div>}
                    <div style={{ ...cor, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                      {sinal}
                      {t.texto}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <h3 style={{ fontSize: 14, margin: "0 0 6px" }}>Como fica no site</h3>
          {!validadoAgora ? (
            <p style={{ fontSize: 13, color: "#555" }}>Validando…</p>
          ) : validacao.erros.length ? (
            <ul style={{ fontSize: 13, color: "#8b0000", margin: 0, paddingLeft: 18 }}>
              {validacao.erros.map((e, k) => (
                <li key={k}>{e}</li>
              ))}
            </ul>
          ) : exame ? (
            <PrevisaoExame exame={exame} destaque={destaque} aoEscolher={escolherNoResultado} />
          ) : (
            <>
              <p style={{ fontSize: 13, color: "#2b6b2b", margin: "0 0 6px" }}>YAML válido. Dado como o site vai usar:</p>
              <pre style={estilo.pre}>{JSON.stringify(validacao.resultado, null, 2)}</pre>
            </>
          )}

          {exame && (
            <div style={estilo.secao}>
              <OrigemPanel exame={exame} destaque={destaque} pdfs={pdfs} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
