// Classes do CSS do leitor para o HTML dos blocos (src/lib/leis/html.ts): o servidor e o
// navegador usam o mesmo módulo, então os nomes gerados batem.
import type { Classes } from "@/lib/leis/html";
import styles from "./leitor.module.css";

export const CLASSES: Classes = {
  b: styles.b,
  txt: styles.txt,
  ref: styles.ref,
  atos: styles.atos,
  ato: styles.ato,
  info: styles.info,
  infoLinha: styles.infoLinha,
  estrela: styles.estrela,
  naoEncontrada: styles.naoEncontrada,
  rotulo: styles.rotulo,
  tipos: {
    estrutura: styles.estrutura,
    rubrica: styles.rubrica,
    artigo: styles.artigo,
    paragrafo: styles.paragrafo,
    inciso: styles.inciso,
    alinea: styles.alinea,
    texto: styles.texto,
  },
};
