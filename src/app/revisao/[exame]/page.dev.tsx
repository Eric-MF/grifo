import Link from "next/link";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { autoteste, idsExames, lerExameDev } from "@/content/revisao";

export function generateStaticParams() {
  return idsExames().map((exame) => ({ exame }));
}

export default async function RevisaoExame({ params }: { params: Promise<{ exame: string }> }) {
  const { exame: id } = await params;
  const { exame, erro, arquivo } = lerExameDev(id);
  if (!exame) return <main style={{ padding: "2rem" }}>Erro no YAML: {erro}</main>;
  const teste = exame.corrigivel ? autoteste(exame) : null;
  const pdf = `/downloads/originais/gabarito-${id}.pdf`;
  const temPdf = existsSync(join(process.cwd(), "public", pdf));
  return (
    <main style={{ display: "grid", gridTemplateColumns: temPdf ? "1fr 1fr" : "1fr", height: "100dvh", fontFamily: "system-ui, sans-serif", fontSize: 14 }}>
      {temPdf && <iframe src={pdf} title="Padrão de resposta original" style={{ width: "100%", height: "100%", border: 0, borderRight: "1px solid #ccc" }} />}
      <div style={{ overflow: "auto", padding: "1rem 1.25rem" }}>
        <p>
          <Link href="/revisao/">← todos</Link> · <Link href={`/revisao/?arquivo=content/exames/${id}/exame.yaml#editor`}>editar e aprovar o YAML</Link> ·{" "}
          <a href={`vscode://file${arquivo}`}>abrir no VS Code</a> · <code>{arquivo.replace(process.cwd() + "/", "")}</code>
        </p>
        <h1 style={{ fontFamily: "inherit", fontSize: 22 }}>
          {exame.numeral} Exame — {exame.peca.nome} ({exame.revisao.status})
        </h1>
        {exame.observacoes && <p style={{ background: "#ffe98a", color: "#1a1600", padding: 8, borderRadius: 4 }}>{exame.observacoes}</p>}
        {(teste?.partes ?? []).map((p) => (
          <section key={p.parte} style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ fontFamily: "inherit", fontSize: 17 }}>
              {p.titulo} — autoteste {p.obtidoBruto.toFixed(2)} / {p.valor.toFixed(2)}
            </h2>
            {p.itens.map((it) => (
              <div key={it.n} style={{ borderTop: "1px solid #eee", padding: "6px 0" }}>
                <b>{it.n}</b> {it.descricao}
                <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                  {it.componentes.map((c) => (
                    <li key={c.id} style={{ color: c.obtido > 0 ? "inherit" : "crimson" }}>
                      {c.obtido > 0 ? "✓" : "✗"} <b>{c.id}</b> ({c.valor.toFixed(2)}) {c.rotulo}
                      {c.obtido === 0 && c.faltou.length > 0 && <> — faltou: {c.faltou.join("; ")}</>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
