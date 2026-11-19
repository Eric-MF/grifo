// Uma opção dos painéis do leitor (Leitura, Mais, Ouvir): o cartão com a caixa (ou o botão de escolha), o título e o que muda.
import styles from "./leitor.module.css";

/** Opção de "Mostrar no texto" e "Marcações": cartão com a caixa (ou o botão de escolha), o título e o que muda. */
export function OpcaoCartao({
  tipo,
  nome,
  marcada,
  titulo,
  dica,
  onChange,
}: {
  tipo: "radio" | "checkbox";
  nome?: string;
  marcada: boolean;
  titulo: string;
  dica: string;
  onChange: (marcada: boolean) => void;
}) {
  return (
    <label className={styles.opcaoCartao} data-marcada={marcada ? "1" : "0"}>
      <input type={tipo} name={nome} checked={marcada} onChange={(e) => onChange(e.target.checked)} />
      <span className={styles.opcaoTexto}>
        <strong>{titulo}</strong>
        <small>{dica}</small>
      </span>
    </label>
  );
}
