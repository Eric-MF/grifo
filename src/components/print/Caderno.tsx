import { Logo } from "@/components/Logo";
import { RichText } from "@/components/RichText";
import type { Exame } from "@/content/schema";
import { SITE } from "@/config/site";

// Caderno de prova no layout atual da FGV (40º Exame), com marca Grifo no lugar da FGV.
// Usado apenas pelas rotas /print/* para gerar os PDFs "atualizados".

const EXTENSO = ["zero", "uma", "duas", "três", "quatro", "cinco"];

export function MarcaGrifo() {
  return (
    <span className="marca">
      <Logo size={20} title="" />
      GRIFO
    </span>
  );
}

function Cabecalho({ exame }: { exame: Exame }) {
  return (
    <div className="cab">
      <img src="/img/logo-grifo-em-progresso.svg" alt="Grifo em Progresso · grifo.net" />
      <span className="exame">{exame.numero}º Exame de Ordem Unificado</span>
    </div>
  );
}

function Rodape({ rotulo }: { rotulo: string }) {
  return (
    <div className="rod">
      <MarcaGrifo />
      <span>{rotulo}</span>
    </div>
  );
}

function Selo() {
  return <span className="selo">Versão atualizada Grifo · não oficial</span>;
}

export function FolhaPautada({ inicio, total = 30, rotulo, exame }: { inicio: number; total?: number; rotulo: string; exame?: Exame }) {
  return (
    <section className="folha">
      {exame ? <Cabecalho exame={exame} /> : <div className="cab" />}
      <Selo />
      <table className="linhas">
        <tbody>
          {Array.from({ length: total }, (_, i) => {
            const n = inicio + i;
            return (
              <tr key={n} className={n % 5 === 0 ? "q5" : undefined}>
                <td className="num">{n}</td>
                <td />
              </tr>
            );
          })}
        </tbody>
      </table>
      <Rodape rotulo={rotulo} />
    </section>
  );
}

function Bloco({ icone, titulo, children }: { icone: string; titulo: string; children: React.ReactNode }) {
  return (
    <div className="bloco">
      <div className="bloco-cab">
        <span className="ic" aria-hidden>
          {icone}
        </span>
        <h2>{titulo}</h2>
      </div>
      <ul>{children}</ul>
    </div>
  );
}

function Capa({ exame }: { exame: Exame }) {
  const nq = exame.questoes.length;
  return (
    <section className="folha">
      <Selo />
      <div className="capa-topo">
        <img src="/img/logo-grifo-em-progresso.svg" alt="Grifo em Progresso · grifo.net" />
        <h1>
          {exame.numero}
          <sup style={{ fontSize: "0.6em", textDecoration: "underline" }}>o</sup> EXAME DE ORDEM UNIFICADO
        </h1>
      </div>
      <div className="capa-titulo">
        <p className="area">DIREITO PENAL</p>
        <p className="tipo">Prova Prático-Profissional</p>
      </div>
      <div className="capa-grade">
        <div>
          <Bloco icone="📝" titulo="SUA PROVA">
            <li>
              Além deste caderno de rascunho contendo o enunciado da <b>Peça Prático-Profissional</b> e das{" "}
              <b>
                {nq} ({EXTENSO[nq]}) Questões Discursivas
              </b>
              , você receberá do fiscal de aplicação um caderno para transcrição dos textos definitivos.
            </li>
          </Bloco>
          <Bloco icone="⏱" titulo="TEMPO">
            <li>
              <b>5 (cinco) horas</b> é o tempo disponível para a realização da prova, incluído o tempo para preenchimento do
              caderno de textos definitivos.
            </li>
            <li>
              <b>2 (duas) horas</b> após o início da prova será possível retirar-se da sala, sem levar o caderno de rascunho.
            </li>
            <li>
              <b>1 (uma) hora</b> antes do término do período de prova será possível retirar-se da sala levando o caderno de
              rascunho.
            </li>
          </Bloco>
          <Bloco icone="⊘" titulo="NÃO SERÁ PERMITIDO">
            <li>Qualquer tipo de comunicação entre os examinandos.</li>
            <li>Levantar da cadeira sem a devida autorização do fiscal de aplicação.</li>
            <li>
              Portar aparelhos eletrônicos, relógio de qualquer espécie, óculos escuros, acessórios de chapelaria, lápis,
              lapiseira, borracha ou corretivo de qualquer espécie.
            </li>
            <li>Usar o sanitário ao término da prova, após deixar a sala.</li>
          </Bloco>
        </div>
        <div>
          <Bloco icone="⚠" titulo="INFORMAÇÕES GERAIS">
            <li>
              Verifique se todos os seus aparelhos eletrônicos foram acondicionados e lacrados dentro da embalagem própria. O
              porte de equipamento proibido acarreta a <b>anulação</b> da prova e a <b>eliminação</b> do exame.
            </li>
            <li>Verifique se a disciplina constante da capa deste caderno coincide com a registrada no seu caderno de textos definitivos.</li>
            <li>Confira seus dados pessoais e assine seu nome, no espaço reservado, com caneta esferográfica transparente de cor azul ou preta.</li>
            <li>
              Para fins de avaliação, serão levadas em consideração apenas as respostas constantes do caderno de textos
              definitivos.
            </li>
            <li>Ao terminar a prova, entregue <b>obrigatoriamente</b> o caderno de textos definitivos ao fiscal de aplicação.</li>
            <li>Os 3 (três) últimos examinandos de cada sala só poderão sair juntos.</li>
            <li>Qualquer semelhança nominal e/ou situacional presente nos enunciados das questões é mera coincidência.</li>
            <li>
              <b>Esta é uma versão de estudo elaborada pelo Grifo</b>, com o enunciado original da prova
              {exame.aplicacao ? ` aplicada em ${exame.aplicacao.split("-").reverse().join("/")}` : ""} no layout atual do
              caderno. Notas de atualização legislativa, quando houver, aparecem ao final.
            </li>
          </Bloco>
        </div>
      </div>
      <div className="capa-rodape">
        <MarcaGrifo />
      </div>
    </section>
  );
}

const ATENCAO =
  "Na elaboração dos textos da peça prático-profissional e das respostas às questões discursivas, o examinando deverá incluir todos os dados que se façam necessários, sem, contudo, produzir qualquer identificação ou informações além daquelas fornecidas e permitidas nos enunciados contidos no caderno de prova. A omissão de dados que forem legalmente exigidos ou necessários para a correta solução do problema proposto acarretará descontos na pontuação atribuída ao examinando nesta fase.";
const ATENCAO2 =
  "A detecção de qualquer marca identificadora no espaço destinado à transcrição dos textos definitivos acarretará a anulação da prova prático-profissional e a eliminação do examinando. Assim, por exemplo, no fechamento da peça, o examinando deve optar por utilizar apenas “reticências” ou “XXX”, ou seja: data “...” ou Data “XXX”, local “...” ou Local “XXX”, Advogado “...” ou Advogado “XXX”, inscrição OAB “...” ou Inscrição OAB “XXX”.";

export function Caderno({ exame }: { exame: Exame }) {
  let pagina = 1;
  const prox = () => ++pagina;
  const paginasPeca = Math.ceil(exame.peca.linhas / 30);
  const notas = exame.atualizado?.notas ?? [];
  return (
    <>
      <Capa exame={exame} />
      <section className="folha">
        <Cabecalho exame={exame} />
        <Selo />
        <div className="atencao">
          <h3>ATENÇÃO</h3>
          <p style={{ margin: "0 0 1.5mm" }}>{ATENCAO}</p>
          <p style={{ margin: 0 }}>{ATENCAO2}</p>
        </div>
        <h2 className="secao-tit">Peça Prático-Profissional</h2>
        <div className="texto ajuste" style={{ maxHeight: "180mm" }}>
          <RichText text={exame.peca.enunciado} data={exame.aplicacao} />
        </div>
        <Rodape rotulo={`Peça Prático-Profissional – Página ${prox()}`} />
      </section>
      {Array.from({ length: paginasPeca }, (_, i) => (
        <FolhaPautada key={i} exame={exame} inicio={i * 30 + 1} rotulo={`Peça Prático-Profissional – Página ${prox()}`} />
      ))}
      {exame.questoes.map((q) => (
        <div key={q.n}>
          <section className="folha">
            <Cabecalho exame={exame} />
            <Selo />
            <h2 className="secao-tit">Questão {q.n}</h2>
            <div className="texto ajuste" style={{ maxHeight: "235mm" }}>
              <RichText text={q.enunciado} data={exame.aplicacao} />
            </div>
            <Rodape rotulo={`Questão ${q.n} – Página ${prox()}`} />
          </section>
          <FolhaPautada exame={exame} inicio={1} total={q.linhas} rotulo={`Questão ${q.n} – Página ${prox()}`} />
        </div>
      ))}
      {notas.length > 0 && (
        <section className="folha">
          <Cabecalho exame={exame} />
          <Selo />
          <h2 className="secao-tit">Notas de atualização legislativa</h2>
          <div className="texto ajuste" style={{ maxHeight: "235mm" }}>
            {notas.map((n, i) => (
              <div key={i} className="nota-atual">
                <b>
                  {n.alvo === "peca" ? "Peça" : `Questão ${n.alvo.slice(1)}`}
                  {n.item ? `, item ${n.item}` : ""} — {n.lei}
                </b>
                <RichText text={n.texto} data={exame.aplicacao} />
              </div>
            ))}
          </div>
          <Rodape rotulo={`Atualização – Página ${prox()}`} />
        </section>
      )}
      <section className="folha" style={{ display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "9pt", margin: "0 0 3mm" }}>Realização</p>
          <span className="marca" style={{ fontSize: "16pt" }}>
            <Logo size={48} title="" /> GRIFO
          </span>
          <p style={{ fontSize: "8pt", color: "#666", marginTop: "3mm" }}>{SITE.dominio} · versão de estudo, não oficial</p>
        </div>
      </section>
      <AjusteTexto />
    </>
  );
}

/** Reduz a fonte dos blocos .ajuste até caberem na página (enunciados longos). */
function AjusteTexto() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `document.querySelectorAll('.ajuste').forEach(function(el){var s=10.5;el.style.fontSize=s+'pt';while(el.scrollHeight>el.clientHeight+1&&s>7.5){s-=0.25;el.style.fontSize=s+'pt';}});`,
      }}
    />
  );
}
