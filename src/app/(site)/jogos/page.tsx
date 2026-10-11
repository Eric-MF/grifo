import type { Metadata } from "next";
import Link from "next/link";
import { JOGOS } from "@/games/registry";
import { optionalImage } from "@/lib/images";
import styles from "@/games/games.module.css";

export const metadata: Metadata = {
  title: "Jogos para estudar a 2ª fase",
  description: "Jogos leves no navegador para fixar peças, artigos e prazos da 2ª fase OAB de Direito Penal.",
};

export default function JogosPage() {
  const treinoCapa = optionalImage("treino-2fase");
  const breveCapa = optionalImage("em-breve");
  return (
    <div className="container section">
      <span className="eyebrow">Jogos</span>
      <h1>Estude jogando</h1>
      <p className="lead">
        Jogos leves, que rodam no navegador. A cada poder, uma pergunta de 2ª fase: qual a peça cabível, com o artigo e, no
        nível difícil, o parágrafo ou o inciso.
      </p>
      <div className={styles.lista}>
        {JOGOS.map((j) => {
          const capa = j.capa ? optionalImage(j.capa) : null;
          return (
            <Link key={j.slug} href={`/jogos/${j.slug}/`} className={`card ${styles.jogoCard}`}>
              {capa ? (
                <img className={styles.jogoCapa} src={capa.src} srcSet={capa.srcSet} sizes="400px" alt="" loading="lazy" />
              ) : (
                <div className={styles.jogoCapa} aria-hidden>
                  {j.emoji}
                </div>
              )}
              <div className={styles.jogoInfo}>
                <h2 style={{ fontSize: "1.5rem" }}>{j.titulo}</h2>
                <p className="muted">{j.descricao}</p>
                <span className="btn btn-gold btn-sm">Jogar</span>
              </div>
            </Link>
          );
        })}
        <Link href="/treino/" className={`card ${styles.jogoCard}`}>
          {treinoCapa ? (
            <img className={styles.jogoCapa} src={treinoCapa.src} srcSet={treinoCapa.srcSet} sizes="400px" alt="" loading="lazy" />
          ) : (
            <div className={styles.jogoCapa} aria-hidden>
              📝
            </div>
          )}
          <div className={styles.jogoInfo}>
            <h2 style={{ fontSize: "1.5rem" }}>Treino da 2ª fase</h2>
            <p className="muted">
              Dez perguntas de peça e fundamento, pontuadas por acerto, rapidez e nível. Sem jogo, só estudo.
            </p>
            <span className="btn btn-gold btn-sm">Treinar</span>
          </div>
        </Link>
        <div className={`card ${styles.jogoCard} ${styles.breve}`} aria-hidden>
          {breveCapa ? (
            <img className={styles.jogoCapa} src={breveCapa.src} srcSet={breveCapa.srcSet} sizes="400px" alt="" loading="lazy" />
          ) : (
            <div className={styles.jogoCapa}>⚖️</div>
          )}
          <div className={styles.jogoInfo}>
            <h2 style={{ fontSize: "1.5rem" }}>Em breve</h2>
            <p className="muted">Novos jogos a caminho.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
