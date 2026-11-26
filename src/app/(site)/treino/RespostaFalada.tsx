"use client";

// Responder falando no treino: a opção (no início e abaixo da questão), a barra do microfone presa embaixo da tela, com
// o que dizer, o que foi ouvido e o que a questão fez com isso, os controles da leitura (como os do Ouvir do Vade Mecum,
// com os mesmos gestos) e os ajustes da voz e do microfone. A escuta em si fica no Treino (uma só, de uma questão para a outra); a interpretação
// da fala, em src/quiz/voz.ts.
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { AnelDoSom, BotaoGesto, Camada, CamadaDosGestos, type ItemDoMenu } from "@/components/BotaoGesto";
import { BotaoDaVoz, fmtVelocidade, GESTOS_DO_TREINO, itensDoMicrofone, MENU_SEM_TOQUE } from "@/components/leis/ControlesDaVoz";
import { MicrofoneDosComandos } from "@/components/leis/MicrofoneDosComandos";
import leitor from "@/components/leis/leitor.module.css";
import ouvirCss from "@/components/leis/ouvir.module.css";
import { AVISO_VOZ, LINK_AVISO_VOZ } from "@/lib/fala/aviso-voz";
import type { EstadoEscuta } from "@/lib/fala/escuta";
import { vozesEmPortugues, type EstadoNarrador } from "@/lib/fala/narrador";
import { VELOCIDADE_MAX, VELOCIDADE_MIN, VOLUME_MIN, type PrefsDaVoz } from "@/lib/fala/prefs-voz";
import type { RetornoVoz } from "@/quiz/PerguntaCorpo";
import { COMANDOS_DO_TREINO } from "@/quiz/voz";
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
  aoAjustes,
}: {
  valor: boolean;
  onChange: (v: boolean) => void;
  disponivel: boolean;
  ler: boolean;
  aoLer: (v: boolean) => void;
  podeLer: boolean;
  /** abre os ajustes da voz e do microfone */
  aoAjustes: () => void;
}) {
  return (
    <div className={styles.opcaoVoz}>
      <label className={styles.opcao}>
        <input type="checkbox" checked={valor && disponivel} disabled={!disponivel} onChange={(e) => onChange(e.target.checked)} />
        <span>
          <strong>Responder falando</strong>
          <small>
            {disponivel
              ? (
                <>
                  Diga a letra da alternativa ou a resposta (a peça e o artigo, ou o ponto central); “responder” envia e “próxima” segue. A tela do celular
                  não apaga enquanto o microfone ouve. {AVISO_VOZ} <Link href={LINK_AVISO_VOZ}>Privacidade</Link>
                </>
              )
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
              A voz lê o caso, a pergunta e as alternativas e, depois da resposta, a correção, com o trecho lido destacado e à vista. Enquanto ela lê, diga
              “pausa” para responder já; “continua”, “volta”, “avança”, “repete”, “mais rápido” e “mais devagar” valem como no Ouvir do Vade Mecum. Na barra
              do microfone, presa embaixo, segure um botão para mais opções e deslize na velocidade ou nas setas. Com fone de ouvido, o microfone não ouve a
              leitura.
            </small>
          </span>
        </label>
      )}
      {valor && disponivel && (
        <button type="button" className={`${styles.linkBotao} ${styles.opcaoDentro}`} onClick={aoAjustes}>
          Voz e microfone: qual microfone ouve, velocidade, volume e o que dizer
        </button>
      )}
    </div>
  );
}

function Icone({ children, cheio = false }: { children: ReactNode; cheio?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cheio ? styles.iconeCheio : undefined}>
      {children}
    </svg>
  );
}

/** O que a barra do microfone faz: o Treino executa (a leitura, a voz, o microfone, a questão). */
export interface AcoesDaBarra {
  /** pausar, continuar ou ler de novo; o texto volta no balão */
  alternar(): string | void;
  /** a questão do começo */
  doComeco(): string | void;
  pular(passo: 1 | -1): string | void;
  /** o começo da parte (o caso, a pergunta, cada alternativa) seguinte ou desta */
  pularParte(passo: 1 | -1): string | void;
  /** a frase em que a leitura está e quantas há (para o deslizar) */
  posicao(): { k: number; total: number } | null;
  /** o começo da frase `k` e a parte dela ("Caso", "Letra B") */
  previa(k: number): { texto: string; parte: string } | null;
  irPara(k: number): void;
  /** ler a partir do caso, da pergunta ou das alternativas */
  irParaParte(parte: "caso" | "comando" | "alt"): void;
  parar(): void;
  lerAlternativas(): void;
  lerCorrecao(): void;
  lerArtigos(): void;
  ajuda(): void;
  /** rola a tela até o trecho que está sendo lido */
  mostrarTrecho(): void;
  /** de novo a frase que está sendo lida */
  repetirFrase(): string | void;
  mudarVoz(m: Partial<PrefsDaVoz>): void;
  /** o toque no microfone: silencia, ou volta a ouvir (também depois da pausa dos silêncios) */
  microfone(): string | void;
  /** pausa a leitura e abre o microfone já, para a pessoa falar */
  falarAgora(): string | void;
  proxima(): void;
  ajustes(): void;
  desligar(): void;
}

/** O nome da parte da questão para mostrar ("caso" → "Caso", "alt1" → "Letra B"). */
export const nomeDaParte = (parte: string | undefined) =>
  parte === "caso" ? "Caso" : parte === "comando" ? "Pergunta" : parte?.startsWith("alt") ? `Letra ${"ABCDE"[Number(parte.slice(3))] ?? ""}` : parte === "correcao" ? "Correção" : "";

/** Deslizar nas setas da leitura: o dedo anda pelas frases, e o balão mostra o começo de cada uma. */
function useDeslizarFrases(acoes: AcoesDaBarra) {
  const partida = useRef<{ k: number; total: number } | null>(null);
  const alvo = (passos: number) => {
    const p = partida.current;
    return p ? Math.max(0, Math.min(p.total - 1, p.k + passos)) : null;
  };
  return {
    eixo: "x" as const,
    passoPx: 22,
    comecar: () => (partida.current = acoes.posicao()),
    previa: (_: unknown, passos: number) => {
      const k = alvo(passos);
      const pv = k === null ? null : acoes.previa(k);
      if (k === null || !pv) return "Nada sendo lido: toque em ▶";
      return { texto: `Frase ${k + 1} de ${partida.current!.total}${pv.parte ? ` · ${pv.parte}` : ""}`, detalhe: `“${pv.texto}”` };
    },
    aplicar: (_: unknown, passos: number) => {
      const k = alvo(passos);
      if (k === null) return;
      acoes.irPara(k);
      return `Frase ${k + 1}`;
    },
  };
}

/**
 * A barra do microfone, presa embaixo da tela enquanto se responde falando (sempre à vista, como a do Ouvir): o
 * microfone (com o anel do som que ele ouve), o que dizer e o que foi entendido, e os controles da leitura. Os botões
 * têm gestos: dois toques, segurar (um menu) e deslizar (BotaoGesto).
 */
export function BarraDaVoz({
  estado,
  ouvido,
  dica,
  depois,
  leitura = null,
  prefs,
  nivel,
  respondida,
  comSensibilidade,
  acoes,
}: {
  estado: EstadoEscuta;
  ouvido: Ouvido | null;
  dica: string;
  /** o que dizer em seguida, depois do que foi entendido (respondida: "próxima") */
  depois?: string;
  /** a leitura da questão (ou da correção) em voz alta; null: sem leitura */
  leitura?: EstadoNarrador | null;
  prefs: PrefsDaVoz;
  /** quanto som o microfone ouve (de 0 a 1) */
  nivel: () => number | null;
  respondida: boolean;
  /** o navegador deixa escolher o microfone (e reforçar o som): a sensibilidade vale */
  comSensibilidade: boolean;
  acoes: AcoesDaBarra;
}) {
  const [camada, setCamada] = useState<HTMLDivElement | null>(null);
  const barra = useRef<HTMLDivElement>(null);
  const frases = useDeslizarFrases(acoes);
  // a altura da barra: a página ganha esse espaço embaixo, e o trecho lido fica acima dela (globals.css)
  useEffect(() => {
    const el = barra.current;
    if (!el) return;
    const raiz = document.documentElement;
    const medir = () => raiz.style.setProperty("--dock-voz", `${Math.ceil(el.getBoundingClientRect().height)}px`);
    medir();
    raiz.setAttribute("data-dock-voz", "");
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(medir);
    ro?.observe(el);
    return () => {
      ro?.disconnect();
      raiz.removeAttribute("data-dock-voz");
      raiz.style.removeProperty("--dock-voz");
    };
  }, []);
  const problema = PROBLEMAS[estado];
  const emPausa = estado === "em-pausa";
  const silenciada = estado === "silenciada";
  const ouvindo = estado === "ouvindo";
  const lendo = leitura === "lendo";
  let texto: ReactNode = dica;
  if (problema) texto = problema;
  else if (silenciada)
    texto = (
      <>
        Microfone silenciado. <span className={styles.depoisVoz}>Toque nele para voltar a ouvir.</span>
      </>
    );
  else if (lendo && estado === "em-espera")
    texto = (
      <>
        Lendo… <span className={styles.depoisVoz}>O microfone volta quando a voz parar. Para responder já, pause.</span>
      </>
    );
  else if (lendo)
    texto = (
      <>
        Lendo… <span className={styles.depoisVoz}>Diga “pausa” para responder já.</span>
      </>
    );
  else if (emPausa)
    texto = (
      <>
        Microfone em pausa: 5 minutos sem ouvir nada.{" "}
        <span className={styles.depoisVoz}>Toque no microfone para falar.</span>
      </>
    );
  else if (!ouvindo && !ouvido) texto = "Ligando o microfone…";
  else if (leitura === "pausado" && !ouvido)
    texto = (
      <>
        Leitura pausada. <span className={styles.depoisVoz}>{dica} Ou diga “continua”.</span>
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
  const partes = (passo: 1 | -1) => (): ItemDoMenu[] => [
    { id: "parte", rotulo: passo > 0 ? "A parte seguinte" : "O começo desta parte", fazer: () => void acoes.pularParte(passo) },
    { id: "repetir", rotulo: "Repetir a frase", fazer: acoes.repetirFrase },
    { id: "inicio", rotulo: "Do começo da questão", fazer: () => acoes.irParaParte("caso") },
    { id: "comando", rotulo: "A pergunta", fazer: () => acoes.irParaParte("comando") },
    { id: "alt", rotulo: "As alternativas", fazer: () => acoes.irParaParte("alt") },
    ...(respondida ? [{ id: "correcao", rotulo: "A correção", fazer: acoes.lerCorrecao }] : []),
  ];
  const mic = emPausa ? "Microfone em pausa: toque para ouvir de novo" : silenciada ? "Microfone silenciado: toque para ouvir" : "Microfone: toque para silenciar";
  return createPortal(
    <div
      ref={barra}
      className={styles.barraVoz}
      role="region"
      aria-label="Responder falando"
      data-barra-voz
      data-estado={problema ? "problema" : silenciada ? "silenciada" : lendo ? "lendo" : ouvindo ? "ouvindo" : emPausa ? "pausa" : "ligando"}
      data-entendeu={ouvido?.final ? (ouvido.retorno?.entendeu ? "1" : "0") : undefined}
    >
      <Camada aoMontar={setCamada} />
      <CamadaDosGestos.Provider value={camada}>
        <div className={styles.topoVoz}>
          <BotaoGesto
            id="treino-microfone"
            rotulo={mic}
            dica="Dois toques: pausa a leitura para você falar · Segure: o microfone na leitura"
            className={`${styles.pontoVoz} ${emPausa || silenciada ? styles.acordarVoz : ""}`}
            pressionado={!silenciada}
            aoToque={acoes.microfone}
            aoDuplo={acoes.falarAgora}
            menu={{
              titulo: "Microfone",
              itens: () => [
                ...itensDoMicrofone(prefs, acoes.mudarVoz, comSensibilidade),
                { id: "ajustes", rotulo: "Ajustes da voz e do microfone…", fazer: acoes.ajustes },
                { id: "desligar", rotulo: "Desligar o responder falando", fazer: acoes.desligar },
              ],
            }}
          >
            <IconeMicrofone riscado={silenciada} />
            <AnelDoSom nivel={nivel} ativo={ouvindo} />
          </BotaoGesto>
          <BotaoGesto
            id="treino-texto"
            rotulo="Mostrar na tela o trecho lido"
            dica="Dois toques: repete a frase"
            className={styles.textoVoz}
            aoToque={acoes.mostrarTrecho}
            aoDuplo={acoes.repetirFrase}
          >
            <span role="status" aria-live="polite" data-texto-voz>
              {texto}
            </span>
          </BotaoGesto>
          <button type="button" className={styles.desligarVoz} onClick={acoes.ajustes} aria-label="Ajustes da voz e do microfone" title="Voz e microfone">
            <Icone>
              <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
              <circle cx="15" cy="7" r="2" />
              <circle cx="9" cy="17" r="2" />
            </Icone>
          </button>
          <button type="button" className={styles.desligarVoz} onClick={acoes.desligar} aria-label="Desligar o microfone (parar de responder falando)">
            <IconeMicrofone riscado />
          </button>
        </div>
        {leitura && (
          <div className={styles.controlesLeitura} role="group" aria-label="Controles da leitura em voz alta">
            <BotaoGesto
              id="treino-anterior"
              rotulo="Frase anterior"
              legenda="frase"
              dica="Deslize: escolha a frase · Segure: ir para o caso, a pergunta, as alternativas"
              aoToque={() => acoes.pular(-1)}
              deslizar={frases}
              menu={{ titulo: "Ler a partir de", itens: partes(-1) }}
            >
              <Icone>
                <path d="M15 6l-6 6 6 6" />
              </Icone>
            </BotaoGesto>
            <BotaoGesto
              id="treino-tocar"
              rotulo={lendo ? "Pausar a leitura" : leitura === "pausado" ? "Continuar a leitura" : "Ler a questão de novo"}
              dica="Dois toques: a questão do começo · Segure: parar, só as alternativas, a correção"
              className={styles.tocarLeitura}
              aoToque={acoes.alternar}
              aoDuplo={acoes.doComeco}
              menu={{
                titulo: "Leitura",
                itens: () => [
                  { id: "parar", rotulo: "Parar a leitura", desativado: leitura === "parado", fazer: acoes.parar },
                  { id: "alternativas", rotulo: "Ler só as alternativas", fazer: acoes.lerAlternativas },
                  { id: "correcao", rotulo: "Ler a correção", desativado: !respondida, fazer: acoes.lerCorrecao },
                  { id: "artigos", rotulo: "Ler os artigos da correção", desativado: !respondida, fazer: acoes.lerArtigos },
                  { id: "ajuda", rotulo: "Dizer os comandos de voz", fazer: acoes.ajuda },
                ],
              }}
            >
              <Icone cheio>{lendo ? <path d="M7 5h4v14H7zM13 5h4v14h-4z" /> : <path d="M8 5v14l11-7z" />}</Icone>
            </BotaoGesto>
            <BotaoGesto
              id="treino-proximo"
              rotulo="Próxima frase"
              legenda="frase"
              dica="Deslize: escolha a frase · Segure: ir para o caso, a pergunta, as alternativas"
              aoToque={() => acoes.pular(1)}
              deslizar={frases}
              menu={{ titulo: "Ler a partir de", itens: partes(1) }}
            >
              <Icone>
                <path d="M9 6l6 6-6 6" />
              </Icone>
            </BotaoGesto>
            <BotaoDaVoz id="treino-voz" voz={prefs} aoMudar={acoes.mudarVoz} className={styles.velocidadeLeitura} />
            {respondida && (
              <BotaoGesto id="treino-proxima" rotulo="Próxima questão" legenda="próxima" className={styles.proximaVoz} aoToque={acoes.proxima}>
                <Icone>
                  <path d="M6 6l6 6-6 6M13 6l6 6-6 6" />
                </Icone>
              </BotaoGesto>
            )}
          </div>
        )}
      </CamadaDosGestos.Provider>
    </div>,
    document.body,
  );
}

/**
 * Os ajustes da voz e do microfone, numa janela por cima da questão: a voz, a velocidade e o volume (os mesmos do Ouvir
 * do Vade Mecum), o microfone (qual, a sensibilidade, o nível e o que ele faz enquanto a voz lê) e o que dizer.
 */
export function AjustesDaVoz({
  prefs,
  aoMudar,
  podeLer,
  aoExemplo,
  ligada,
  escuta,
  microfoneEmUso,
  nivelDoMicrofone,
  aoFechar,
}: {
  prefs: PrefsDaVoz;
  aoMudar: (p: Partial<PrefsDaVoz>) => void;
  podeLer: boolean;
  /** lê uma frase de exemplo com a voz escolhida */
  aoExemplo: () => void;
  /** o microfone está ouvindo (responder falando, numa questão) */
  ligada: boolean;
  escuta: EstadoEscuta;
  microfoneEmUso: string | null | undefined;
  nivelDoMicrofone: () => number | null;
  aoFechar: () => void;
}) {
  const janela = useRef<HTMLDialogElement>(null);
  const titulo = useId();
  const [vozes, setVozes] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    const d = janela.current;
    if (d && !d.open) d.showModal();
  }, []);
  useEffect(() => {
    if (!podeLer) return;
    const carregar = () => setVozes(vozesEmPortugues(window.speechSynthesis.getVoices()));
    carregar();
    window.speechSynthesis.addEventListener?.("voiceschanged", carregar);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", carregar);
  }, [podeLer]);
  const atual = vozes.find((v) => v.voiceURI === prefs.voz) ?? vozes[0];
  const nome = (v: SpeechSynthesisVoice) => `${v.name}${v.localService ? "" : " · pela internet"}`;
  return (
    <dialog
      ref={janela}
      className={styles.ajustesVoz}
      aria-labelledby={titulo}
      onClose={aoFechar}
      onClick={(e) => {
        if (e.target === e.currentTarget) janela.current?.close();
      }}
    >
      <div className={styles.anteriorCorpo}>
        <header className={styles.anteriorTopo}>
          <h2 id={titulo}>
            Voz e microfone
            <small>Os mesmos do Ouvir do Vade Mecum</small>
          </h2>
          <button type="button" className="btn" onClick={() => janela.current?.close()} autoFocus>
            Fechar
          </button>
        </header>
        <div className={leitor.grupos}>
          {podeLer && (
            <fieldset>
              <legend>Voz</legend>
              {vozes.length > 0 && (
                <label>
                  <span className={leitor.miuda}>As vozes são as do seu aparelho; a primeira da lista é a que soa melhor.</span>
                  <select value={atual?.voiceURI ?? ""} onChange={(e) => aoMudar({ voz: e.target.value || null })}>
                    {vozes.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {nome(v)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className={leitor.chips}>
                <button type="button" onClick={aoExemplo}>
                  ▶ Ouvir um exemplo
                </button>
              </div>
              <label>
                Velocidade · {fmtVelocidade(prefs.velocidade)}
                <input type="range" min={VELOCIDADE_MIN} max={VELOCIDADE_MAX} step={0.05} value={prefs.velocidade} onChange={(e) => aoMudar({ velocidade: Number(e.target.value) })} />
              </label>
              <div className={leitor.chips}>
                {[0.8, 1, 1.25, 1.5, 2].map((v) => (
                  <button key={v} type="button" aria-pressed={Math.abs(prefs.velocidade - v) < 0.01} onClick={() => aoMudar({ velocidade: v })}>
                    {fmtVelocidade(v)}
                  </button>
                ))}
              </div>
              <label>
                Volume da voz · {Math.round(prefs.volume * 100)}%
                <input type="range" min={VOLUME_MIN} max={1} step={0.1} value={prefs.volume} onChange={(e) => aoMudar({ volume: Number(e.target.value) })} />
                <span className={leitor.miuda}>Em relação ao volume do aparelho, que continua valendo (“mais alto” e “mais baixo” também mudam).</span>
              </label>
            </fieldset>
          )}
          <fieldset>
            <legend>Responder falando</legend>
            <MicrofoneDosComandos prefs={prefs} mudarPrefs={aoMudar} ligada={ligada} escuta={escuta} microfoneEmUso={microfoneEmUso} nivelDoMicrofone={nivelDoMicrofone} />
          </fieldset>
          <fieldset>
            <legend>Gestos da barra</legend>
            <dl className={`${ouvirCss.comandos} ${ouvirCss.gestos}`}>
              {GESTOS_DO_TREINO.map(([botao, faz]) => (
                <div key={botao}>
                  <dt>{botao}</dt>
                  <dd>{faz}</dd>
                </div>
              ))}
            </dl>
            <p className={leitor.miuda}>{MENU_SEM_TOQUE}</p>
          </fieldset>
          <fieldset>
            <legend>O que dizer</legend>
            <dl className={ouvirCss.comandos}>
              {COMANDOS_DO_TREINO.map(([dizer, faz]) => (
                <div key={dizer}>
                  <dt>{dizer}</dt>
                  <dd>{faz}</dd>
                </div>
              ))}
            </dl>
            <p className={leitor.miuda}>O reconhecimento é o do navegador (no Chrome e no Edge, o áudio vai para o serviço de voz deles); o Grifo não grava nada.</p>
          </fieldset>
        </div>
      </div>
    </dialog>
  );
}
