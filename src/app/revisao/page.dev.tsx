import Link from "next/link";
import { EditorYaml } from "@/components/revisao/EditorYaml";
import { FormArtigo, FormLei, FormVideo } from "@/components/revisao/Formularios";
import { arquivosEditaveis, autoteste, diplomasDev, filaDeLeis, idsExames, lerExameDev, pdfsOriginais } from "@/content/revisao";

export const metadata = { title: "Revisão (dev)", robots: { index: false } };

export default async function Revisao() {
  const linhas = idsExames().map((id) => {
    const { exame, erro } = lerExameDev(id);
    const teste = exame?.corrigivel ? autoteste(exame) : null;
    const pior = teste ? Math.min(...teste.partes.map((p) => p.obtidoBruto / p.valor)) : null;
    const comps = exame ? [exame.peca, ...exame.questoes].reduce((s, p) => s + p.itens.reduce((a, i) => a + i.componentes.length, 0), 0) : 0;
    return { id, exame, erro, pior, comps };
  });
  const revisados = linhas.filter((l) => l.exame?.revisao.status === "revisado").length;
  const fila = filaDeLeis();
  const arquivos = arquivosEditaveis();
  const origens = Object.fromEntries(arquivos.map((a) => [a, pdfsOriginais(a)]));
  const examesPendentes = linhas.filter((l) => l.exame?.revisao.status !== "revisado");
  return (
    <main style={{ maxWidth: 1400, margin: "0 auto", padding: "2rem 1rem", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontFamily: "inherit" }}>Revisão do conteúdo</h1>
      <p>
        {revisados} de {linhas.length} exames revisados. Este painel só existe no <code>npm run dev</code>. Para marcar um exame
        como revisado: <code>npm run revisar -- 38 &quot;Seu nome&quot; &quot;observações&quot;</code>.
      </p>

      <p>
        <Link href="/revisao/folha/">Editar o layout da folha de respostas e do caderno de caligrafia</Link>
      </p>

      <h2 style={{ fontSize: 18 }}>Fila de conferência</h2>
      <p style={{ fontSize: 13, color: "#555" }}>
        Leis com pendência primeiro, depois as que vieram de busca na web; por fim, os exames que ainda não foram revisados.
      </p>
      <ol style={{ fontSize: 13, lineHeight: 1.6 }}>
        {fila.map((f) => (
          <li key={f.id}>
            <b>{f.id}</b>: {f.motivo}
            {f.url && (
              <>
                {" · "}
                <a href={f.url} target="_blank" rel="noreferrer">Planalto</a>
              </>
            )}
            {f.nota && <span style={{ color: "#555" }}> ({f.nota})</span>}
          </li>
        ))}
        {examesPendentes.map(({ id, exame }) => (
          <li key={`exame-${id}`}>
            Exame {exame?.numeral ?? id}: revisão pendente · <Link href={`/revisao/${id}/`}>abrir</Link>
          </li>
        ))}
      </ol>

      <h2 id="editor" style={{ fontSize: 18 }}>Editar YAML</h2>
      <p style={{ fontSize: 13, color: "#555" }}>
        Confira o resultado e a diferença em relação ao gravado antes de aprovar. Só grava se o YAML passar pela validação do schema.
      </p>
      <EditorYaml arquivos={arquivos} origens={origens} />

      <h2 style={{ fontSize: 18 }}>Inserir</h2>
      <FormLei />
      <FormArtigo diplomas={diplomasDev()} />
      <FormVideo />

      <h2 style={{ fontSize: 18 }}>Exames</h2>
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
