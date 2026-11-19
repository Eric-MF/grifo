"use client";

// Responder falando no treino: a opção (no início e abaixo da questão) e a linha do microfone acima da questão, com o
// que dizer, o que foi ouvido e o que a questão fez com isso. A escuta em si fica no Treino (uma só, de uma questão para
// a outra); a interpretação da fala, em src/quiz/voz.ts.
import type { EstadoEscuta } from "@/lib/fala/escuta";
import type { RetornoVoz } from "@/quiz/PerguntaCorpo";
import styles from "./treino.module.css";

/** A última frase ouvida: parcial (ainda falando) ou final, com o que a questão fez com ela. */
export interface Ouvido {
  texto: string;
  final: boolean;
  retorno?: RetornoVoz;
}

const PROBLEMAS: Partial<Record<EstadoEscuta, string>> = {
  negada: "O microfone está bloqueado para este site. Libere-o nas permissões do navegador e ligue de novo.",
  "sem-microfone": "Nenhum microfone encontrado.",
  indisponivel: "Este navegador não reconhece fala. Use o Chrome, o Edge ou o Safari.",
  erro: "O reconhecimento de fala parou (sem internet?). Desligue e ligue de novo.",
};

/** O ícone do microfone. */
export function IconeMicrofone({ riscado = false }: { riscado?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" />
      {riscado && <path d="M4 4l16 16" />}
    </svg>
  );
}

/**
 * A opção de responder falando e, ligada, a de ouvir as questões. Sem reconhecimento de fala no navegador, fica
 * desligada e diz por quê.
 */
export function OpcaoVoz({
  valor,
  onChange,
  disponivel,
  ler,
  aoLer,
  podeLer,
}: {
  valor: boolean;
  onChange: (v: boolean) => void;
  disponivel: boolean;
  ler: boolean;
  aoLer: (v: boolean) => void;
  podeLer: boolean;
}) {
  return (
    <div className={styles.opcaoVoz}>
      <label className={styles.opcao}>
        <input type="checkbox" checked={valor && disponivel} disabled={!disponivel} onChange={(e) => onChange(e.target.checked)} />
        <span>
          <strong>Responder falando</strong>
          <small>
            {disponivel
              ? "Diga a letra da alternativa ou a resposta (a peça e o artigo, ou o ponto central); “responder” envia e “próxima” segue. A tela do celular não apaga enquanto o microfone ouve."
              : "Este navegador não reconhece fala: use o Chrome, o Edge ou o Safari."}
          </small>
        </span>
      </label>
      {valor && disponivel && podeLer && (
        <label className={`${styles.opcao} ${styles.opcaoDentro}`}>
          <input type="checkbox" checked={ler} onChange={(e) => aoLer(e.target.checked)} />
          <span>
            <strong>Ouvir as questões</strong>
            <small>
              A voz lê o caso, a pergunta e as alternativas e, depois da resposta, a correção. Enquanto ela lê, diga “parar” para responder já; “repetir”
              lê de novo e “ler as alternativas”, só elas. Com fone de ouvido, o microfone não ouve a leitura.
            </small>
          </span>
        </label>
      )}
    </div>
  );
}

/** A linha do microfone, acima da questão: ouvindo, o que dizer; depois de cada frase, o que foi entendido. */
export function LinhaDaVoz({
  estado,
  ouvido,
  dica,
  depois,
  lendo = false,
  aoDesligar,
}: {
  estado: EstadoEscuta;
  ouvido: Ouvido | null;
  dica: string;
  /** o que dizer em seguida, depois do que foi entendido (respondida: "próxima") */
  depois?: string;
  /** a voz está lendo a questão (ou a correção) */
  lendo?: boolean;
  aoDesligar: () => void;
}) {
  const problema = PROBLEMAS[estado];
  const ouvindo = estado === "ouvindo";
  let texto: React.ReactNode = dica;
  if (problema) texto = problema;
  else if (!ouvindo && !ouvido) texto = "Ligando o microfone…";
  else if (lendo)
    texto = (
      <>
        Lendo… <span className={styles.depoisVoz}>Diga “parar” para responder já.</span>
      </>
    );
  else if (ouvido && !ouvido.final) texto = <q>{ouvido.texto}…</q>;
  else if (ouvido?.retorno?.entendeu)
    texto = depois ? (
      <>
        {ouvido.retorno.texto} <span className={styles.depoisVoz}>{depois}</span>
      </>
    ) : (
      ouvido.retorno.texto
    );
  else if (ouvido)
    texto = (
      <>
        Não entendi <q>{ouvido.texto}</q>. {dica}
      </>
    );
  return (
    <div className={styles.linhaVoz} data-estado={problema ? "problema" : lendo ? "lendo" : ouvindo ? "ouvindo" : "ligando"} data-entendeu={ouvido?.final ? (ouvido.retorno?.entendeu ? "1" : "0") : undefined}>
      <span className={styles.pontoVoz} aria-hidden="true">
        <IconeMicrofone />
      </span>
      <p role="status" aria-live="polite">
        {texto}
      </p>
      <button type="button" className={styles.desligarVoz} onClick={aoDesligar} aria-label="Desligar o microfone (parar de responder falando)">
        <IconeMicrofone riscado />
      </button>
    </div>
  );
}
