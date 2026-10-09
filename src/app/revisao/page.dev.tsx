import Link from "next/link";
import { autoteste, idsExames, lerExameDev } from "@/content/revisao";

export const metadata = { title: "Revisão (dev)", robots: { index: false } };

export default function Revisao() {
  const linhas = idsExames().map((id) => {
    const { exame, erro } = lerExameDev(id);
    const teste = exame?.corrigivel ? autoteste(exame) : null;
    const pior = teste ? Math.min(...teste.partes.map((p) => p.obtidoBruto / p.valor)) : null;
    const comps = exame ? [exame.peca, ...exame.questoes].reduce((s, p) => s + p.itens.reduce((a, i) => a + i.componentes.length, 0), 0) : 0;
    return { id, exame, erro, pior, comps };
  });
  const revisados = linhas.filter((l) => l.exame?.revisao.status === "revisado").length;
  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1rem", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontFamily: "inherit" }}>Revisão do conteúdo</h1>
      <p>
        {revisados} de {linhas.length} exames revisados. Este painel só existe no <code>npm run dev</code>. Para marcar um exame
        como revisado: <code>npm run revisar -- 38 &quot;Seu nome&quot; &quot;observações&quot;</code>.
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "2px solid #999" }}>
            <th>Exame</th>
            <th>Peça</th>
            <th>Componentes</th>
            <th>Autoteste (pior parte)</th>
            <th>Status</th>
            <th>Observações</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map(({ id, exame, erro, pior, comps }) => (
            <tr key={id} style={{ borderBottom: "1px solid #ddd" }}>
              <td>
                <Link href={`/revisao/${id}/`}>{exame?.numeral ?? id}</Link>
              </td>
              <td>{exame?.peca.nome}</td>
              <td>{comps}</td>
              <td style={{ color: pior === null ? "#888" : pior >= 0.9 ? "green" : "crimson" }}>
                {pior === null ? (exame?.corrigivel === false ? "sem gabarito" : "—") : `${Math.round(pior * 100)}%`}
              </td>
              <td>{erro ? <b style={{ color: "crimson" }}>erro</b> : exame?.revisao.status === "revisado" ? `✓ ${exame.revisao.por}` : "rascunho"}</td>
              <td style={{ fontSize: 12, color: "#555" }}>{erro ?? exame?.observacoes ?? exame?.revisao.notas}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
