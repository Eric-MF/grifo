"use client";

import { type CSSProperties, type KeyboardEvent, type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { gravarJSON, lerJSON } from "@/lib/storage";
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
 * Tamanho da letra, em px: o slide e o campo vão de LETRA_MIN a LETRA_MAX. A altura da linha é o dobro da letra (ver o
 * CSS), então o texto continua dentro da pauta em qualquer tamanho.
 */
const LETRA_MIN = 12;
const LETRA_MAX = 28;
const LETRA_PADRAO = 15;
/** O último tamanho que o aluno escolheu em qualquer folha: vale para a folha que ainda está vazia. */
const LETRA_ULTIMA_KEY = "grifo:folha-letra";

/** O corretor ortográfico do navegador: desligado por padrão, e a escolha vale para todas as folhas. */
const CORRETOR_KEY = "grifo:folha-corretor";
const lerCorretor = (): boolean => lerJSON<boolean>(CORRETOR_KEY, false) === true;

type Alinha = "esquerda" | "centro" | "direita";
const ALINHA_CSS: Record<Alinha, string> = { esquerda: "left", centro: "center", direita: "right" };

/** Os ajustes de cada folha (a letra de cada questão e da peça é a sua). */
interface Ajustes {
  letra?: number;
}
const ajustesKey = (id: string) => `grifo:folha:${id}`;
const lerAjustes = (id: string): Ajustes => lerJSON<Ajustes>(ajustesKey(id), {});

function lerUltimaLetra(): number {
  const v = Number(lerJSON<number | null>(LETRA_ULTIMA_KEY, null));
  return Number.isInteger(v) && v >= LETRA_MIN && v <= LETRA_MAX ? v : LETRA_PADRAO;
}

/** O tamanho desta folha: a folha vazia segue o último tamanho escolhido; a que tem texto segue o seu. */
function letraDa(id: string, vazia: boolean): number {
  const propria = lerAjustes(id).letra;
  const ultima = lerUltimaLetra();
  return vazia ? ultima : (propria ?? ultima);
}

function gravarLetra(id: string, px: number) {
  gravarJSON(ajustesKey(id), { ...lerAjustes(id), letra: px });
  gravarJSON(LETRA_ULTIMA_KEY, px);
  window.dispatchEvent(new Event(EVENTO_FOLHA));
}

function gravarCorretor(ligado: boolean) {
  gravarJSON(CORRETOR_KEY, ligado);
  window.dispatchEvent(new Event(EVENTO_FOLHA));
}

/**
 * Quebra suave (Shift+Enter): o texto guarda um caractere invisível antes da quebra. A linha que termina numa quebra
 * suave é esticada até a margem, como no Word. O Enter comum separa parágrafos.
 */
const QUEBRA_SUAVE = "​";
/**
 * Alinhamento de cada parágrafo: um caractere invisível no começo do parágrafo. Sem marca, o parágrafo é à esquerda.
 * A escolha vale só para o parágrafo em que o cursor está.
 */
const MARCA_CENTRO = "⁠";
const MARCA_DIREITA = "⁡";

const alinhaDaMarca = (c: string | undefined): Alinha => (c === MARCA_CENTRO ? "centro" : c === MARCA_DIREITA ? "direita" : "esquerda");

/** Onde começa o parágrafo que contém a posição: depois do último Enter (a quebra suave não separa). */
function inicioDoParagrafo(texto: string, pos: number): number {
  for (let i = pos - 1; i >= 0; i--) if (texto[i] === "\n" && texto[i - 1] !== QUEBRA_SUAVE) return i + 1;
  return 0;
}

/** O alinhamento do parágrafo que contém a posição. */
const alinhaDoParagrafo = (texto: string, pos: number): Alinha => alinhaDaMarca(texto[inicioDoParagrafo(texto, pos)]);

/**
 * Os blocos que mostram o texto: um por linha digitada. Cada linha segue o alinhamento do seu parágrafo; a que termina
 * numa quebra suave é esticada até a margem.
 */
function blocosDoTexto(texto: string): ReactNode[] {
  let alinha: Alinha = "esquerda";
  let novoParagrafo = true;
  return texto.split("\n").map((linha, i) => {
    if (novoParagrafo) alinha = alinhaDaMarca(linha[0]);
    const suave = linha.endsWith(QUEBRA_SUAVE);
    let conteudo = suave ? linha.slice(0, -1) : linha;
    if (novoParagrafo && (conteudo[0] === MARCA_CENTRO || conteudo[0] === MARCA_DIREITA)) conteudo = conteudo.slice(1);
    novoParagrafo = !suave;
    const estilo: CSSProperties = { textAlign: ALINHA_CSS[alinha] as CSSProperties["textAlign"] };
    if (suave) estilo.textAlignLast = "justify";
    // o recuo (Tab) do início da linha é um bloco de largura fixa: a justificação não o estica, e a 1ª palavra não sai do lugar
    const recuos = /^\t*/.exec(conteudo)?.[0].length ?? 0;
    const corpo = conteudo.slice(recuos);
    return (
      <div key={i} style={estilo}>
        {Array.from({ length: recuos }, (_, k) => (
          <span key={k} className={styles.recuo} />
        ))}
        {corpo || "\u200b"}
      </div>
    );
  });
}

/** Ícone de alinhamento: três filetes, alinhados à esquerda, ao centro ou à direita. */
function IconeAlinha({ alinha }: { alinha: Alinha }) {
  const larguras = [12, 8, 12];
  // a borda de cada filete: à esquerda (x=2), centrada (x=8) ou à direita (x=14)
  const inicio = (w: number) => (alinha === "esquerda" ? 2 : alinha === "centro" ? 8 - w / 2 : 14 - w);
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
      {larguras.map((w, i) => (
        <rect key={i} x={inicio(w)} y={2 + i * 4.5} width={w} height="1.6" rx="0.8" fill="currentColor" />
      ))}
    </svg>
  );
}

/** Ícones da largura da folha: ajustar (setas para os lados) e papel (folha com a margem). */
function IconeAjustar() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 8h12M5 5 2 8l3 3M11 5l3 3-3 3" />
    </svg>
  );
}
function IconePapel() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="1.8" width="10" height="12.4" rx="1" />
      <path d="M5.5 5h5M5.5 8h5M5.5 11h3" />
    </svg>
  );
}

const ALINHAS: { valor: Alinha; rotulo: string; atalho: string }[] = [
  { valor: "esquerda", rotulo: "Alinhar o parágrafo à esquerda (Alt+Shift+E)", atalho: "Alt+Shift+E" },
  { valor: "centro", rotulo: "Centralizar o parágrafo (Alt+Shift+C)", atalho: "Alt+Shift+C" },
  { valor: "direita", rotulo: "Alinhar o parágrafo à direita (Alt+Shift+D)", atalho: "Alt+Shift+D" },
];

/**
 * Folha de respostas pautada, no padrão do caderno de textos definitivos da FGV:
 * linhas numeradas (reiniciando em 1 a cada peça/questão), faixa cinza a cada 5 linhas
 * e limite rígido de linhas. As linhas contadas são as do PAPEL (largura fixa, em rem),
 * medidas num espelho invisível. Assim a contagem não muda com a janela nem com a fonte.
 * O texto é desenhado numa camada por baixo do cursor (a área de digitação fica transparente),
 * para que a quebra suave possa esticar a linha e cada parágrafo tenha o seu alinhamento.
 */
export function AnswerSheet({ id, label, linhas, value, onChange, disabled }: Props) {
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const medidaRef = useRef<HTMLDivElement>(null);
  const medidaCacheRef = useRef<{ texto: string; n: number } | null>(null);
  const avisoRef = useRef<number | null>(null);
  const [usadas, setUsadas] = useState(0);
  const [cheia, setCheia] = useState(false);
  const [rascunhoLetra, setRascunhoLetra] = useState<string | null>(null);
  // o alinhamento do parágrafo onde o cursor está (é o que os botões mostram e mudam)
  const [alinhaCursor, setAlinhaCursor] = useState<Alinha>("esquerda");
  const modo = useSyncExternalStore(assinarModo, lerModo, (): ModoFolha => "ajustar");
  const ajustar = modo === "ajustar";
  const corretor = useSyncExternalStore(assinarModo, lerCorretor, () => false);
  const vazia = value.length === 0;
  const letra = useSyncExternalStore(assinarModo, () => letraDa(id, vazia), () => LETRA_PADRAO);
  // em rem: a letra acompanha a escala do site (data-fonte), como o resto da folha
  const tamanho = `${letra / 16}rem`;

  const medir = useCallback((texto: string, usarCache = true) => {
    const m = medidaRef.current;
    const a = areaRef.current;
    if (!m || !a) return 0;
    if (usarCache && medidaCacheRef.current?.texto === texto) return medidaCacheRef.current.n;
    const lh = parseFloat(getComputedStyle(a).lineHeight) || 32;
    m.textContent = texto.length ? texto + "​" : "";
    const n = texto.length ? Math.round(m.scrollHeight / lh) : 0;
    medidaCacheRef.current = { texto, n };
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

  // com outra letra, a altura da linha muda: a medida guardada deixa de valer
  useLayoutEffect(() => {
    medidaCacheRef.current = null;
  }, [tamanho]);

  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- medição do DOM antes da pintura
    setUsadas(medir(value));
    if (areaRef.current) ajustarAltura(areaRef.current);
  }, [value, tamanho, medir, ajustarAltura]);

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

  /**
   * Mantém o cursor visível quando o texto chega perto da borda de baixo da tela: rola a página o suficiente para que
   * a linha digitada fique com um espaço abaixo para continuar escrevendo.
   */
  const garantirCursorVisivel = useCallback(() => {
    const a = areaRef.current;
    const pagina = a?.parentElement;
    if (!a || !pagina) return;
    const sonda = document.createElement("div");
    sonda.className = `${styles.area} ${styles.pinta} ${styles.sonda}`;
    sonda.append(document.createTextNode(a.value.slice(0, a.selectionStart)));
    const marca = document.createElement("span");
    marca.textContent = QUEBRA_SUAVE;
    sonda.append(marca);
    pagina.append(sonda);
    const r = marca.getBoundingClientRect();
    sonda.remove();
    const lh = parseFloat(getComputedStyle(a).lineHeight) || 32;
    const limite = window.innerHeight - Math.min(240, window.innerHeight * 0.3);
    if (r.top + lh > limite) window.scrollBy({ top: r.top + lh - limite });
  }, []);

  const mostrarCheia = () => {
    setCheia(true);
    if (avisoRef.current) window.clearTimeout(avisoRef.current);
    avisoRef.current = window.setTimeout(() => setCheia(false), 1600);
  };

  /** Atualiza o alinhamento que os botões mostram: o do parágrafo onde o cursor está. */
  const atualizarAlinhaCursor = () => {
    const a = areaRef.current;
    if (a) setAlinhaCursor(alinhaDoParagrafo(a.value, a.selectionStart));
  };

  const handle = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    const n = medir(next);
    if (n > linhas && next.length > value.length) {
      // Excedeu a folha: desfaz a digitação e avisa.
      e.target.value = value;
      mostrarCheia();
      return;
    }
    onChange(next);
    requestAnimationFrame(() => {
      garantirCursorVisivel();
      atualizarAlinhaCursor();
    });
  };

  /** Tab recua o parágrafo; Shift+Enter faz a quebra suave. O execCommand mantém o desfazer do navegador. */
  const aoTecla = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (disabled || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      document.execCommand("insertText", false, "\t");
    } else if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      document.execCommand("insertText", false, QUEBRA_SUAVE + "\n");
    }
  };

  /**
   * Troca o alinhamento do parágrafo onde o cursor está: a marca invisível do começo do parágrafo é trocada (ou tirada,
   * na esquerda). O cursor continua no mesmo lugar do texto.
   */
  const definirAlinha = (alinha: Alinha) => {
    const a = areaRef.current;
    if (!a || disabled) return;
    a.focus();
    const pos = a.selectionStart;
    const inicio = inicioDoParagrafo(a.value, pos);
    const marcaAtual = a.value[inicio] === MARCA_CENTRO || a.value[inicio] === MARCA_DIREITA;
    const marcaNova = alinha === "centro" ? MARCA_CENTRO : alinha === "direita" ? MARCA_DIREITA : "";
    if ((marcaAtual ? a.value[inicio] : "") === marcaNova) {
      setAlinhaCursor(alinha);
      return;
    }
    a.setSelectionRange(inicio, marcaAtual ? inicio + 1 : inicio);
    document.execCommand("insertText", false, marcaNova);
    const delta = (marcaNova ? 1 : 0) - (marcaAtual ? 1 : 0);
    const novaPos = pos > inicio ? pos + delta : pos;
    requestAnimationFrame(() => {
      a.setSelectionRange(novaPos, novaPos);
      atualizarAlinhaCursor();
    });
  };

  const escolherLetra = (px: number) => gravarLetra(id, px);

  /** Atalhos da folha (Alt+Shift+…), para escrever sem tirar a mão do teclado. Valem com o foco na folha. */
  const aoAtalho = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey || disabled) return;
    const acoes: Record<string, () => void> = {
      Equal: () => escolherLetra(Math.min(LETRA_MAX, letra + 1)),
      NumpadAdd: () => escolherLetra(Math.min(LETRA_MAX, letra + 1)),
      Minus: () => escolherLetra(Math.max(LETRA_MIN, letra - 1)),
      NumpadSubtract: () => escolherLetra(Math.max(LETRA_MIN, letra - 1)),
      KeyE: () => definirAlinha("esquerda"),
      KeyC: () => definirAlinha("centro"),
      KeyD: () => definirAlinha("direita"),
      KeyO: () => gravarCorretor(!corretor),
    };
    const acao = acoes[e.code];
    if (!acao) return;
    e.preventDefault();
    acao();
  };

  return (
    <div
      className={`${styles.wrap} ${ajustar ? styles.ajustar : ""}`}
      style={{ "--letra": tamanho } as CSSProperties}
      onKeyDown={aoAtalho}
    >
      <div className={styles.meta}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        <div className={styles.direita}>
          <div className={styles.letraWrap}>
            <button
              type="button"
              className={styles.icone}
              aria-label={`Tamanho da letra: ${letra} px`}
              title="Tamanho da letra (Alt+Shift+= aumenta, Alt+Shift+- diminui)"
              aria-keyshortcuts="Alt+Shift+Equal Alt+Shift+Minus"
            >
              <span className={styles.letraAa} aria-hidden>
                Aa
              </span>
            </button>
            <div className={styles.letraPainel} role="group" aria-label="Tamanho da letra desta folha">
              <div className={styles.letraCaixa}>
                <span className={styles.letraPequena} aria-hidden>
                  A
                </span>
                <input
                  type="range"
                  className={styles.letraSlide}
                  min={LETRA_MIN}
                  max={LETRA_MAX}
                  step={1}
                  value={letra}
                  onChange={(e) => escolherLetra(Number(e.target.value))}
                  aria-label="Tamanho da letra"
                  aria-valuetext={`${letra} px`}
                />
                <span className={styles.letraGrande} aria-hidden>
                  A
                </span>
                <input
                  type="number"
                  className={styles.letraNumero}
                  min={LETRA_MIN}
                  max={LETRA_MAX}
                  step={1}
                  value={rascunhoLetra ?? letra}
                  aria-label="Tamanho da letra em px"
                  onChange={(e) => {
                    setRascunhoLetra(e.target.value);
                    const n = Number(e.target.value);
                    if (Number.isInteger(n) && n >= LETRA_MIN && n <= LETRA_MAX) escolherLetra(n);
                  }}
                  onBlur={() => setRascunhoLetra(null)}
                />
                <span className={styles.letraUnidade}>px</span>
              </div>
            </div>
          </div>
          <div className={styles.alinhas} role="group" aria-label="Alinhamento do parágrafo">
            {ALINHAS.map((a) => (
              <button
                key={a.valor}
                type="button"
                className={styles.icone}
                title={a.rotulo}
                aria-label={a.rotulo}
                aria-keyshortcuts={a.atalho}
                aria-pressed={alinhaCursor === a.valor}
                onClick={() => definirAlinha(a.valor)}
              >
                <IconeAlinha alinha={a.valor} />
              </button>
            ))}
          </div>
          <button
            type="button"
            className={styles.icone}
            aria-pressed={corretor}
            title={corretor ? "Corretor ortográfico ligado (Alt+Shift+O)" : "Ligar o corretor ortográfico (Alt+Shift+O)"}
            aria-label="Corretor ortográfico"
            aria-keyshortcuts="Alt+Shift+O"
            onClick={() => gravarCorretor(!corretor)}
          >
            <span className={styles.corretorRotulo} aria-hidden>
              ABC
            </span>
          </button>
          <div className={styles.escolha} role="group" aria-label="Largura da folha">
            <button type="button" className={styles.icone} aria-pressed={ajustar} title="Ajustar à tela" aria-label="Ajustar à tela" onClick={() => gravarModo("ajustar")}>
              <IconeAjustar />
            </button>
            <button type="button" className={styles.icone} aria-pressed={!ajustar} title="Largura fixa" aria-label="Largura fixa" onClick={() => gravarModo("papel")}>
              <IconePapel />
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
              style={{ textAlign: ALINHA_CSS[alinhaCursor] as CSSProperties["textAlign"] }}
              value={value}
              onChange={handle}
              onKeyDown={aoTecla}
              onKeyUp={atualizarAlinhaCursor}
              onClick={atualizarAlinhaCursor}
              onSelect={atualizarAlinhaCursor}
              disabled={disabled}
              spellCheck={corretor}
              lang="pt-BR"
              autoCapitalize="sentences"
              aria-describedby={`${id}-hint`}
            />
            <div className={`${styles.area} ${styles.pinta}`} aria-hidden>
              {blocosDoTexto(value)}
            </div>
            <div ref={medidaRef} className={`${styles.area} ${styles.mirror}`} aria-hidden />
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
