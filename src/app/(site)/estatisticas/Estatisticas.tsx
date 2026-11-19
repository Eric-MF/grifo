"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { gravarJSON, lerJSON } from "@/lib/storage";
import type { ExameResumo } from "@/content/load";
import type { DadosEstatisticas } from "@/lib/estatisticas/tipos";
import { AbaDesempenho } from "./AbaDesempenho";
import { AbaExames } from "./AbaExames";
import { AbaLinha } from "./AbaLinha";
import { useDadosPessoais } from "./dadosPessoais";
import { Dicas } from "./Dicas";
import styles from "./estatisticas.module.css";

const ABAS = [
  { id: "exames", nome: "Exames anteriores", curto: "Exames" },
  { id: "desempenho", nome: "Meu desempenho", curto: "Desempenho" },
  { id: "linha", nome: "Linha do tempo", curto: "Linha do tempo" },
] as const;
type Aba = (typeof ABAS)[number]["id"];

const CHAVE_OCULTAR = "grifo:estatisticas:ocultar";

/** As três abas da página, com a escolhida no endereço (#exames, #desempenho, #linha) para o link e o voltar. */
export function Estatisticas({ dados, provas }: { dados: DadosEstatisticas; provas: ExameResumo[] }) {
  const [aba, setAba] = useState<Aba>("exames");
  // esconder a peça dos exames que a pessoa ainda não fez (para fazer o simulado sem saber a peça)
  const [ocultar, setOcultar] = useState(false);
  const pessoais = useDadosPessoais(dados.leis);
  const base = useId();
  const botoes = useRef<(HTMLButtonElement | null)[]>([]);
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const lerHash = () => {
      const h = location.hash.slice(1);
      if (ABAS.some((a) => a.id === h)) setAba(h as Aba);
    };
    /* eslint-disable react-hooks/set-state-in-effect -- site estático: o endereço e o localStorage só existem no navegador */
    lerHash();
    setOcultar(lerJSON<boolean>(CHAVE_OCULTAR, false));
    /* eslint-enable react-hooks/set-state-in-effect */
    window.addEventListener("hashchange", lerHash);
    return () => window.removeEventListener("hashchange", lerHash);
  }, []);

  const escolher = (a: Aba, focar = false) => {
    setAba(a);
    history.replaceState(null, "", `#${a}`);
    if (focar) botoes.current[ABAS.findIndex((x) => x.id === a)]?.focus();
  };
  const teclas = (e: KeyboardEvent) => {
    const i = ABAS.findIndex((x) => x.id === aba);
    const prox = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? ABAS.length - 1 : null;
    if (prox === null) return;
    e.preventDefault();
    escolher(ABAS[(prox + ABAS.length) % ABAS.length]!.id, true);
  };
  const mudarOcultar = (v: boolean) => {
    setOcultar(v);
    gravarJSON(CHAVE_OCULTAR, v);
  };

  return (
    <div ref={raiz} className={styles.raiz}>
      <div className={styles.abas} role="tablist" aria-label="Estatísticas" onKeyDown={teclas}>
        {ABAS.map((a, i) => (
          <button
            key={a.id}
            ref={(el) => {
              botoes.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${base}-aba-${a.id}`}
            aria-controls={`${base}-painel-${a.id}`}
            aria-selected={aba === a.id}
            tabIndex={aba === a.id ? 0 : -1}
            className={styles.aba}
            onClick={() => escolher(a.id)}
            aria-label={a.nome}
          >
            {/* no celular, o nome curto: as três abas cabem sem rolar */}
            <span className={styles.abaLonga}>{a.nome}</span>
            <span className={styles.abaCurta} aria-hidden>
              {a.curto}
            </span>
          </button>
        ))}
      </div>
      {ABAS.map((a) => (
        <div
          key={a.id}
          role="tabpanel"
          id={`${base}-painel-${a.id}`}
          aria-labelledby={`${base}-aba-${a.id}`}
          hidden={aba !== a.id}
          className={styles.painel}
        >
          {/* as três ficam montadas: os filtros de uma continuam como estavam ao voltar para ela */}
          {a.id === "exames" ? (
            <AbaExames dados={dados} provas={provas} pessoais={pessoais} ocultar={ocultar} onOcultar={mudarOcultar} />
          ) : a.id === "desempenho" ? (
            <AbaDesempenho dados={dados} pessoais={pessoais} ocultar={ocultar} visivel={aba === "desempenho"} />
          ) : (
            <AbaLinha dados={dados} oculto={(e) => ocultar && e.noSite && !pessoais?.melhores.has(e.id)} />
          )}
        </div>
      ))}
      <Dicas raiz={raiz} />
    </div>
  );
}
