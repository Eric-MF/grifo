"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import styles from "./AnswerSheet.module.css";

interface Props {
  id: string;
  label: string;
  linhas: number;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

/** Na versão celular, "ajustar" deixa o texto seguir a largura da tela; "papel" mantém a folha com largura fixa. */
type ModoFolha = "ajustar" | "papel";
const FOLHA_KEY = "grifo:folha-modo";
const EVENTO_FOLHA = "grifo:folha";

function lerModo(): ModoFolha {
  try {
    return localStorage.getItem(FOLHA_KEY) === "papel" ? "papel" : "ajustar";
  } catch {
    return "ajustar";
  }
}

function assinarModo(aoMudar: () => void) {
  window.addEventListener(EVENTO_FOLHA, aoMudar);
  return () => window.removeEventListener(EVENTO_FOLHA, aoMudar);
}

function gravarModo(modo: ModoFolha) {
  try {
    localStorage.setItem(FOLHA_KEY, modo);
  } catch {
    /* modo privado: apenas não persiste */
  }
  window.dispatchEvent(new Event(EVENTO_FOLHA));
}

/**
 * Folha de respostas pautada, no padrão do caderno de textos definitivos da FGV:
 * linhas numeradas (reiniciando em 1 a cada peça/questão), faixa cinza a cada 5 linhas
 * e limite rígido de linhas. As linhas contadas são as do PAPEL (largura fixa, em rem),
 * medidas num espelho invisível. Assim a contagem não muda com a janela nem com a fonte.
 */
export function AnswerSheet({ id, label, linhas, value, onChange, disabled }: Props) {
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const medidaRef = useRef<{ texto: string; n: number } | null>(null);
  const avisoRef = useRef<number | null>(null);
  const [usadas, setUsadas] = useState(0);
  const [cheia, setCheia] = useState(false);
  const modo = useSyncExternalStore(assinarModo, lerModo, (): ModoFolha => "ajustar");
  const ajustar = modo === "ajustar";

  const medir = useCallback((texto: string, usarCache = true) => {
    const m = mirrorRef.current;
    const a = areaRef.current;
    if (!m || !a) return 0;
    if (usarCache && medidaRef.current?.texto === texto) return medidaRef.current.n;
    const lh = parseFloat(getComputedStyle(a).lineHeight) || 32;
    m.textContent = texto.length ? texto + "​" : "";
    const n = texto.length ? Math.round(m.scrollHeight / lh) : 0;
    medidaRef.current = { texto, n };
    return n;
  }, []);

  // Na versão celular com "ajustar", a área cresce com o texto. Fora disso, volta à altura da folha.
  const ajustarAltura = useCallback(
    (a: HTMLTextAreaElement) => {
      if (!ajustar || document.documentElement.dataset.layout !== "celular") {
        a.style.height = "";
        return;
      }
      a.style.height = "auto";
      a.style.height = `${a.scrollHeight}px`;
    },
    [ajustar],
  );

  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- medição do DOM antes da pintura
    setUsadas(medir(value));
    if (areaRef.current) ajustarAltura(areaRef.current);
  }, [value, medir, ajustarAltura]);

  // Remede quando a largura muda (janela, fonte ou versão). Ignora alturas, para não entrar em laço.
  useEffect(() => {
    const a = areaRef.current;
    if (!a) return;
    let largura = -1;
    const ro = new ResizeObserver(([entrada]) => {
      const w = entrada.contentRect.width;
      if (w === largura) return;
      largura = w;
      setUsadas(medir(a.value, false));
      ajustarAltura(a);
    });
    ro.observe(a);
    return () => ro.disconnect();
  }, [medir, ajustarAltura]);

  useEffect(
    () => () => {
      if (avisoRef.current) window.clearTimeout(avisoRef.current);
    },
    [],
  );

  const handle = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    const n = medir(next);
    if (n > linhas && next.length > value.length) {
      // Excedeu a folha: desfaz a digitação e avisa.
      e.target.value = value;
      setCheia(true);
      if (avisoRef.current) window.clearTimeout(avisoRef.current);
      avisoRef.current = window.setTimeout(() => setCheia(false), 1600);
      return;
    }
    onChange(next);
  };

  return (
    <div className={`${styles.wrap} ${ajustar ? styles.ajustar : ""}`}>
      <div className={styles.meta}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        <div className={styles.direita}>
          <div className={styles.escolha} role="group" aria-label="Largura da folha">
            <button type="button" aria-pressed={ajustar} onClick={() => gravarModo("ajustar")}>
              Ajustar à tela
            </button>
            <button type="button" aria-pressed={!ajustar} onClick={() => gravarModo("papel")}>
              Largura fixa
            </button>
          </div>
          <span className={`${styles.count} ${usadas >= linhas ? styles.countFull : ""}`} aria-live="polite">
            {usadas}/{linhas} linhas
          </span>
        </div>
      </div>
      <div className={styles.scroll}>
        <div className={`${styles.sheet} ${cheia ? styles.shake : ""}`} style={{ ["--linhas" as string]: linhas }}>
          <ol className={styles.gutter} aria-hidden>
            {Array.from({ length: linhas }, (_, i) => (
              <li key={i} className={(i + 1) % 5 === 0 ? styles.fifth : undefined}>
                {i + 1}
              </li>
            ))}
          </ol>
          <div className={styles.page}>
            <textarea
              ref={areaRef}
              id={id}
              className={styles.area}
              value={value}
              onChange={handle}
              disabled={disabled}
              spellCheck
              lang="pt-BR"
              autoCapitalize="sentences"
              aria-describedby={`${id}-hint`}
            />
            <div ref={mirrorRef} className={`${styles.area} ${styles.mirror}`} aria-hidden />
          </div>
        </div>
      </div>
      <p id={`${id}-hint`} className={styles.hint}>
        {cheia ? (
          "A folha acabou: na prova não é possível escrever além da última linha."
        ) : (
          <>
            Escreva como no caderno de textos definitivos. Cada linha da folha conta, inclusive as quebradas automaticamente.
            <span className={styles.dicaAjuste}> As linhas são contadas na largura do papel da prova.</span>
          </>
        )}
      </p>
    </div>
  );
}
