import { RichText } from "@/components/RichText";
import type { Exame } from "@/content/schema";
import { CHAVE_EMPRESAS } from "@/lib/nomes/trocar";

// O fim dos PDFs atualizados: tudo o que muda em relação à prova original. Os nomes das pessoas e das empresas, as
// leis que mudaram, a jurisprudência que mudou a leitura da lei e o resto (a tabela de pontos que a banca não
// publicou…) e os erros materiais da prova corrigidos no enunciado. Só o padrão de resposta traz a lista.

const rotuloDaParte = (alvo: string) => (alvo === "peca" ? "Peça" : `Questão ${alvo.slice(1)}`);
const dataBr = (d: string) => d.split("-").reverse().join("/");

export function Diferencas({ exame, Titulo }: { exame: Exame; Titulo: (p: { children: string }) => React.ReactNode }) {
  const at = exame.atualizado;
  const nomes = at?.nomes ?? {};
  // os nomes que ficam (um autor citado no gabarito) e as grafias repetidas da mesma pessoa não entram na lista
  const partes = Object.entries(nomes)
    .filter(([alvo]) => alvo !== CHAVE_EMPRESAS)
    .map(([alvo, m]) => [alvo, Object.entries(m).filter(([de, para], i, xs) => de !== para && xs.findIndex(([, p]) => p === para) === i)] as const)
    .filter(([, m]) => m.length);
  const empresas = Object.entries(nomes[CHAVE_EMPRESAS] ?? {});
  const leis = (at?.notas ?? []).filter((n) => n.tipo !== "jurisprudencia");
  const juris = (at?.notas ?? []).filter((n) => n.tipo === "jurisprudencia");
  const correcoes = at?.correcoes ?? [];
  const outras = at?.diferencas ?? [];
  const nota = (n: (typeof leis)[number], i: number) => (
    <div key={i} className="nota-atual">
      <b>
        {rotuloDaParte(n.alvo)}
        {n.item ? `, item ${n.item}` : ""} — {n.lei}
      </b>
      <RichText text={n.texto} data={exame.aplicacao} />
    </div>
  );
  return (
    <div className="diferencas">
      <p>
        Esta versão de estudo traz o conteúdo da prova{exame.aplicacao ? ` aplicada em ${dataBr(exame.aplicacao)}` : ""}, no layout atual do caderno e
        do padrão de resposta da FGV, com a marca do Grifo. Mudam só os pontos abaixo.
      </p>
      {(partes.length > 0 || empresas.length > 0) && (
        <>
          <Titulo>Nomes</Titulo>
          <p>As pessoas{empresas.length ? " e as empresas" : ""} ganharam nomes da mitologia greco-romana ligados ao papel de cada uma no caso.</p>
          <ul className="dif-nomes">
            {partes.map(([alvo, m]) => (
              <li key={alvo}>
                <b>{rotuloDaParte(alvo)}:</b>{" "}
                {m.map(([de, para]) => `${de} → ${para}`).join("; ")}
              </li>
            ))}
            {empresas.length > 0 && (
              <li>
                <b>Empresas:</b> {empresas.map(([de, para]) => `${de} → ${para}`).join("; ")}
              </li>
            )}
          </ul>
        </>
      )}
      {leis.length > 0 && (
        <>
          <Titulo>Atualização legislativa</Titulo>
          {leis.map(nota)}
        </>
      )}
      {juris.length > 0 && (
        <>
          <Titulo>Jurisprudência posterior à prova</Titulo>
          <p>O STF ou o STJ mudou a forma de ler a lei citada na prova: cobrada hoje, a tese seria outra.</p>
          {juris.map(nota)}
        </>
      )}
      {correcoes.length > 0 && (
        <>
          <Titulo>Erro material corrigido</Titulo>
          {correcoes.map((c, i) => (
            <div key={i} className="nota-atual">
              <b>{rotuloDaParte(c.alvo)} — </b>
              <RichText text={c.motivo} data={exame.aplicacao} />
            </div>
          ))}
        </>
      )}
      {outras.length > 0 && (
        <>
          <Titulo>Outras diferenças</Titulo>
          {outras.map((d, i) => (
            <div key={i} className="nota-atual">
              {d.alvo && <b>{rotuloDaParte(d.alvo)} — </b>}
              <RichText text={d.texto} data={exame.aplicacao} />
            </div>
          ))}
        </>
      )}
    </div>
  );
}
