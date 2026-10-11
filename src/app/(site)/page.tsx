import Link from "next/link";
import { Logo } from "@/components/Logo";
import { listarExames } from "@/content/load";
import { courseHref } from "@/config/site";
import { optionalImage } from "@/lib/images";
import styles from "./page.module.css";

const FERRAMENTAS = [
  {
    href: "/provas/",
    titulo: "Provas e gabaritos",
    texto:
      "Todos os cadernos e padrões de resposta da 2ª fase de Penal, no original e em versão atualizada com a legislação vigente.",
    cta: "Ver provas",
    icone: "📜",
  },
  {
    href: "/simulados/",
    titulo: "Simulado com nota",
    texto:
      "Escreva a peça e as questões em folha pautada no padrão FGV e receba a nota item a item, com os artigos que faltaram.",
    cta: "Fazer simulado",
    icone: "⚖️",
  },
  {
    href: "/jogos/flap-suitcase/",
    titulo: "Flap Suitcase",
    texto:
      "Guie a maleta alada entre colunas gregas. Cada poder cobra uma pergunta: qual é a peça cabível, com artigo e parágrafo.",
    cta: "Jogar agora",
    icone: "💼",
  },
];

const ULTIMO = listarExames()
  .filter((e) => e.transcrito)
  .reduce((a, b) => (b.numero > a.numero ? b : a));

const PASSOS = [
  { n: "1", t: "Escolha o exame", d: `Do I ao ${ULTIMO.numeral} Exame Unificado, com a peça cobrada em cada um.` },
  { n: "2", t: "Responda como na prova", d: "Folha com 150 linhas para a peça e 30 por questão, cronômetro de 5 horas." },
  { n: "3", t: "Receba a nota detalhada", d: "Correção pela tabela de pontos oficial, com o que você acertou e o que faltou." },
  { n: "4", t: "Compartilhe e evolua", d: "Card com a sua nota e código de verificação, e histórico dos seus simulados." },
];

const FAQ = [
  {
    q: "A correção automática é igual à da FGV?",
    a: "Ela segue a mesma tabela de distribuição de pontos publicada pela FGV e procura na sua resposta as teses e os dispositivos legais de cada item. É uma estimativa: o examinador humano avalia fundamentação e coerência de um jeito que nenhum sistema reproduz por completo. Se quiser uma segunda opinião, você pode corrigir também com uma IA usando a sua própria chave.",
  },
  {
    q: "O que muda na versão atualizada das provas?",
    a: "O enunciado e o gabarito ganham notas indicando onde a legislação mudou depois do exame (por exemplo, o Pacote Anticrime ou a Lei 14.994/2024) e como a resposta seria cobrada hoje. O visual segue o padrão atual do caderno de prova.",
  },
  {
    q: "Preciso criar conta?",
    a: "Não. Seus rascunhos, notas e recordes ficam salvos só no seu navegador.",
  },
  {
    q: "Os materiais são gratuitos?",
    a: "Sim. Provas, simulados e jogos são gratuitos. O Curso Completo OAB – Penal do Grifo é o próximo passo para quem quer preparação guiada.",
  },
];

export default function Home() {
  const hero = optionalImage("hero-partenon-1");
  const capaJogo = optionalImage("maleta-colunas-1");

  return (
    <>
      <section className={styles.hero}>
        {hero ? (
          <img className={styles.heroImg} src={hero.src} srcSet={hero.srcSet} sizes="100vw" alt="" fetchPriority="high" />
        ) : (
          <div className={styles.heroFallback} aria-hidden>
            <TempleSilhouette />
          </div>
        )}
        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroText}>
            <span className={styles.heroEyebrow}>2ª Fase OAB · Direito Penal</span>
            <h1>
              A peça certa.
              <br />
              Os artigos certos.
              <br />
              <span className={styles.gold}>A aprovação.</span>
            </h1>
            <p className={styles.heroLead}>
              Treine com todas as provas anteriores da FGV, receba nota item a item e fixe as peças jogando.
            </p>
            <div className={styles.ctas}>
              <Link href="/simulados/" className="btn btn-gold">
                Fazer um simulado grátis
              </Link>
              <Link href="/provas/" className={`btn ${styles.btnLight}`}>
                Baixar provas anteriores
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <span className="eyebrow">Ferramentas gratuitas</span>
          <h2>Tudo o que a 2ª fase cobra, num só lugar</h2>
          <div className={`grid grid-3 ${styles.tools}`}>
            {FERRAMENTAS.map((f) => (
              <Link key={f.href} href={f.href} className={`card ${styles.tool}`}>
                <span className={styles.toolIcon} aria-hidden>
                  {f.icone}
                </span>
                <h3>{f.titulo}</h3>
                <p className="muted">{f.texto}</p>
                <span className={styles.toolCta}>{f.cta} →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <span className="eyebrow">Como funciona</span>
          <h2>Do enunciado à nota em quatro passos</h2>
          <ol className={styles.steps}>
            {PASSOS.map((p) => (
              <li key={p.n} className={styles.step}>
                <span className={styles.stepN}>{p.n}</span>
                <h3>{p.t}</h3>
                <p className="muted">{p.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section">
        <div className={`container ${styles.gameBanner}`}>
          <div>
            <span className="eyebrow">Estudar também é jogar</span>
            <h2>Flap Suitcase</h2>
            <p className="lead">
              Uma maleta com asas, colunas gregas e milhares de perguntas sobre peças, artigos e prazos. Escolha
              o estilo (fofo, retrofuturista, steampunk…) e o nível de dificuldade.
            </p>
            <Link href="/jogos/flap-suitcase/" className="btn btn-primary">
              Jogar agora
            </Link>
          </div>
          {capaJogo ? (
            <img className={styles.gameImg} src={capaJogo.src} srcSet={capaJogo.srcSet} sizes="(max-width: 800px) 100vw, 560px" alt="Maleta com asas voando entre colunas gregas" loading="lazy" />
          ) : (
            <div className={styles.gameImgFallback} aria-hidden>
              💼
            </div>
          )}
        </div>
      </section>

      <section id="curso" className={styles.course}>
        <div className={`container ${styles.courseInner}`}>
          <Logo size={96} className={styles.courseLogo} title="" />
          <div>
            <span className={styles.heroEyebrow}>Curso Completo OAB – Penal</span>
            <h2>Preparação guiada até a aprovação</h2>
            <ul className={styles.courseList}>
              <li>Estrutura de todas as peças cobradas pela FGV</li>
              <li>Teses recorrentes de Direito Penal e Processo Penal</li>
              <li>Correção individual das suas peças</li>
              <li>Cronograma até o dia da prova</li>
            </ul>
            <a href={courseHref()} className="btn btn-gold">
              Quero conhecer o curso
            </a>
            <p className={styles.courseSoon}>Inscrições em breve.</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className={`container ${styles.faq}`}>
          <span className="eyebrow">Perguntas frequentes</span>
          <h2>Dúvidas comuns</h2>
          {FAQ.map((f) => (
            <details key={f.q} className={styles.faqItem}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}

/** Templo em silhueta usado enquanto a imagem do hero não é adicionada. */
function TempleSilhouette() {
  const cols = Array.from({ length: 7 }, (_, i) => i);
  return (
    <svg viewBox="0 0 600 400" preserveAspectRatio="xMinYMax meet" className={styles.temple}>
      <polygon points="40,110 300,40 560,110" />
      <rect x="40" y="110" width="520" height="34" />
      {cols.map((i) => (
        <rect key={i} x={62 + i * 72} y="150" width="38" height="200" rx="4" />
      ))}
      <rect x="20" y="350" width="560" height="22" />
      <rect x="0" y="372" width="600" height="28" />
    </svg>
  );
}
