"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode, type Ref, type RefObject, type TextareaHTMLAttributes } from "react";
import { flushSync } from "react-dom";
import { Citado } from "@/components/Citacoes";
import { linkContato } from "@/config/site";
import { contextoCorrecao } from "@/lib/correcao/cliente";
import { registrarAtividade } from "@/lib/atividade";
import { atualizarConquistas, registrarArtigo, registrarResposta } from "@/lib/conquistas";
import { eventosDeDispositivos, registrar as registrarErros } from "@/lib/erros";
import { toRoman } from "@/lib/correcao/citacoes";
import { artigoParaPrevia } from "@/lib/leis/artigo-previa";
import { ajustarAlvo, temDispositivo, type ArtigoTexto } from "@/lib/leis/busca";
import type { Classes } from "@/lib/leis/html";
import type { Bloco } from "@/lib/leis/linha-do-tempo";
import { alternativas, opcoesDaTese, registrarResultado, type OpcoesFacil } from "./banco";
import { nomeCategoria } from "./categorias";
import { copiarTexto, textoParaCopiar, textoResposta } from "./copiar";
import { LETRAS, type Letra, type Nivel, type Pergunta, type PerguntaObjetiva, type PerguntaPeca, type PerguntaTese } from "./types";
import {
  artigoNaFrase,
  corrigirObjetiva,
  corrigirResposta,
  corrigirTese,
  artigoFalado,
  nomePeca,
  pecasFaladas,
  previaDaPeca,
  previaDoFundamento,
  type ArtigoCitado,
  type Correcao,
  type CorrecaoPeca,
  type CorrecaoTese,
  type Respondida,
} from "./verificar";
import type { LeituraDaQuestao } from "./locutor";
import { interpretarResposta } from "./voz";
import styles from "./quiz.module.css";

/** O que a questão fez com a frase dita (responder falando): o texto vai para a linha do microfone. */
export interface RetornoVoz {
  entendeu: boolean;
  texto: string;
  /** a pessoa pediu para desligar o microfone */
  desligar?: boolean;
}
/** Quem trata a frase dita na questão da vez (o treino a entrega aqui). */
export type TratadorVoz = (falas: string[]) => RetornoVoz;
type TratadorCorpo = (falas: string[]) => RetornoVoz | null;
/** a peça e o artigo reconhecidos na fala, como a correção os lê */
const RECONHECER = { peca: pecasFaladas, artigo: artigoFalado };

interface Props {
  pergunta: Pergunta;
  nivel: Nivel;
  /** o topo da questão; como função, recebe o botão de copiar, para pô-lo no topo no celular */
  cabecalho?: ReactNode | ((copiar: (onde: Exclude<OndeCopiar, "canto">) => ReactNode) => ReactNode);
  /** com a correção, a questão como ficou depois de respondida (para revê-la no fim do treino) */
  aoResponder?: (c: Correcao, revisao: Revisao) => void;
  rotuloContinuar: string;
  aoContinuar: (c: Correcao) => void;
  /** instante (performance.now) a partir do qual as alternativas podem ser tocadas; sem isso, sempre podem */
  liberadaEm?: () => number;
  /**
   * Uma questão atrás da outra só com o teclado (o treino): a questão abre com o campo de digitar ou a alternativa A
   * focados, a letra (A a E) ou o número (1 a 5) responde a alternativa e, respondida, o foco vai para o botão de
   * continuar. O jogo não usa: lá a barra de espaço bate as asas e acionaria o botão focado sem querer.
   */
  continuo?: boolean;
  /** no treino, acertou: vai sozinho para a próxima questão, sem esperar o botão */
  pularAcerto?: boolean;
  /** no celular, o caso arrastado para a direita (no treino, abre a resposta da questão anterior) */
  aoDeslizarCaso?: () => void;
  /**
   * Responder falando (o treino): a questão põe aqui quem trata cada frase dita (src/quiz/voz.ts). Com ele, no celular, o
   * teclado não abre sozinho: a resposta vem pela voz.
   */
  vozRef?: RefObject<TratadorVoz | null>;
  /** o que ler da questão em voz alta (responder falando), quando ela abre */
  aoLerQuestao?: (l: LeituraDaQuestao) => void;
}

/** Onde fica o copiar: no canto do caso, no topo da questão (celular) ou como item de menu (modo foco do treino). */
type OndeCopiar = "canto" | "topo" | "menu";

/**
 * Os campos de digitar não são de cadastro: sem preenchimento automático, correção e maiúscula automáticas (no
 * celular, o teclado deixa de sugerir senha, cartão e endereço) e fora dos gerenciadores de senha.
 */
const SEM_SUGESTOES = {
  autoComplete: "off",
  autoCorrect: "off",
  autoCapitalize: "none",
  spellCheck: false,
  inputMode: "text",
  "data-1p-ignore": "",
  "data-lpignore": "true",
  "data-form-type": "other",
} as const;

/**
 * Campo de uma linha feito com textarea, não com input: o Chrome do Android mostra, em todo input de formulário, a barra
 * de preencher senha, cartão e endereço acima do teclado (e ignora autocomplete="off"); na textarea, não (a busca do
 * Google faz igual). O Enter não quebra a linha: chama `aoEnter`. A quebra que vier colada vira espaço.
 */
function CampoLinha({
  onChange,
  aoEnter,
  ref,
  ...props
}: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> & {
  value: string;
  onChange: (v: string) => void;
  aoEnter: (campo: HTMLTextAreaElement) => void;
  ref?: Ref<HTMLTextAreaElement>;
}) {
  return (
    <textarea
      ref={ref}
      rows={1}
      className={styles.linha}
      {...SEM_SUGESTOES}
      {...props}
      onChange={(e) => onChange(e.target.value.replace(/\s*\n\s*/g, " "))}
      onKeyDown={(e) => {
        if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
        e.preventDefault();
        if (!e.repeat) aoEnter(e.currentTarget);
      }}
    />
  );
}

/**
 * No celular, o campo focado tem de ficar à vista acima do teclado, com a prévia embaixo dele. O navegador nem sempre
 * rola (o teclado ainda está abrindo, ou o campo já estava "na tela" antes de o teclado cobrir); então confere de novo
 * enquanto o teclado abre. O topo flutuante do modo foco também não pode cobrir o campo.
 */
function mostrarAcimaDoTeclado(campo: HTMLElement) {
  const conferir = () => {
    if (document.activeElement !== campo) return;
    const caixa = (campo.closest("[data-campo]") ?? campo).getBoundingClientRect();
    const vv = window.visualViewport;
    // em cima, o topo flutuante do modo foco e a faixa da barra de notificações
    const topo = (vv?.offsetTop ?? 0) + 110;
    // folga a mais embaixo: a barra de sugestões do teclado (senha, cartão, endereço) pode cobrir o fim da tela visível
    const fundo = (vv ? vv.offsetTop + vv.height : window.innerHeight) - 110;
    // só desce, e só o que falta: subir dependeria de onde a página estava, e cada questão abriria num lugar
    const falta = Math.min(caixa.bottom - fundo, caixa.top - topo);
    if (falta > 0) window.scrollBy({ top: falta });
  };
  for (const ms of [60, 320, 650, 1000]) setTimeout(conferir, ms);
  window.visualViewport?.addEventListener("resize", conferir);
  campo.addEventListener("blur", () => window.visualViewport?.removeEventListener("resize", conferir), { once: true });
}

/** Quanto o acerto fica na tela antes de pular para a próxima questão. */
const ESPERA_PULAR_MS = 600;

/**
 * Celular ou tablet: o toque é o ponteiro principal ("pointer: coarse", ou sem "hover"), ou há toque numa página com
 * largura de celular (com a S Pen o Chrome pode dar o ponteiro como fino), ou numa tela estreita de celular (a largura
 * do aparelho, que não muda com "site para computador"). Notebook com tela de toque não conta: a tela é larga e o
 * principal é o mouse, e a questão segue o teclado (alternativa A focada, Tab, letras).
 */
const toque = () =>
  window.matchMedia("(pointer: coarse), (hover: none)").matches ||
  (navigator.maxTouchPoints > 0 && (window.innerWidth <= 760 || window.screen.width <= 900));
/** Celular ou tablet (ver `toque`): no modo foco, sem o caso ao lado, mesmo com "site para computador". */
export const ehToque = () => typeof window !== "undefined" && toque();

/**
 * O campo de digitar da questão (ou, com `alternativas`, a alternativa A, se não houver campo). Só na parte da resposta:
 * no topo há outros controles (o volume e a largura no menu do modo foco, escondidos), que não podem receber o foco.
 */
function campoDaQuestao(raiz: Element | null | undefined, alternativas = false): HTMLElement | null {
  const resposta = raiz?.querySelector("[data-resposta]");
  return resposta?.querySelector<HTMLElement>(alternativas ? "textarea, input[type=text], [data-alt]" : "textarea, input[type=text]") ?? null;
}

/** Põe o foco no campo da questão aberta (ou na alternativa A), sem rolar; respondida, não faz nada. */
export function focarCampoDaQuestao() {
  campoDaQuestao(document.querySelector("[data-questao]"), true)?.focus({ preventScroll: true });
}

/**
 * Diagnóstico do foco no celular: com "?diag" no endereço, uma caixinha no pé da tela mostra o que aconteceu (se a
 * tela foi vista como de toque, onde o foco foi parar). Para descobrir, no aparelho, por que o teclado não abriu.
 */
function diag(msg: string) {
  if (!window.location.search.includes("diag")) return;
  let caixa = document.getElementById("grifo-diag");
  if (!caixa) {
    caixa = document.createElement("pre");
    caixa.id = "grifo-diag";
    Object.assign(caixa.style, { position: "fixed", left: "4px", right: "4px", bottom: "4px", zIndex: "99", margin: "0", padding: "6px", font: "11px/1.3 monospace", background: "rgb(0 0 0 / 0.8)", color: "#fff", borderRadius: "6px", pointerEvents: "none", whiteSpace: "pre-wrap" });
    document.body.append(caixa);
  }
  const ativo = document.activeElement;
  const linha = `${(performance.now() / 1000).toFixed(1)}s ${msg} · toque=${toque()} · foco=${ativo?.tagName.toLowerCase()}${ativo?.getAttribute("name") ? `[${ativo.getAttribute("name")}]` : ""}`;
  caixa.textContent = [...(caixa.textContent ?? "").split("\n").slice(-7), linha].join("\n");
}

/**
 * Avança para a próxima questão dentro do próprio toque, como um Tab: a questão nova é desenhada na hora (flushSync) e o
 * campo de digitar dela recebe o foco ainda no toque, que é quando o celular aceita abrir o teclado. Questão de
 * alternativas não tem campo: fica no topo. Fora do celular, só avança (a questão nova cuida do foco).
 */
/**
 * Celular: um campo de digitar da questão ficou com o foco. A página ganha o espaço da barra de notificações (e o menu
 * do modo foco desce) e o campo sobe acima do teclado. Chamado no foco e também por quem dá o foco por código: o
 * React descarta o evento de foco que acontece enquanto ele monta a questão nova.
 */
function aoDigitar(campo: HTMLElement) {
  document.body.setAttribute("data-digitando", "");
  mostrarAcimaDoTeclado(campo);
}

/**
 * Celular: foca o campo de digitar da questão nova sempre do mesmo ponto, o topo da página, sem o navegador centralizar
 * o campo; depois, com o teclado aberto, a página só desce o que falta (o rodapé do modo foco dá o espaço embaixo).
 * Assim a questão abre igual da primeira vez e das seguintes, qualquer que fosse a rolagem da anterior.
 */
function focarDoTopo(campo: HTMLElement) {
  window.scrollTo({ top: 0, behavior: "instant" });
  campo.focus({ preventScroll: true });
  if (document.activeElement === campo) aoDigitar(campo);
}

export function avancarNoToque(avancar: () => void) {
  if (!toque()) {
    diag("toque: não é celular, só avança");
    return avancar();
  }
  segurarTeclado();
  flushSync(avancar);
  const campo = campoDaQuestao(document.querySelector("[data-questao]"));
  if (campo) {
    focarDoTopo(campo);
  }
  diag(`toque: ${campo ? "campo focado" : "sem campo"}`);
  setTimeout(soltarTeclado);
  setTimeout(() => diag("depois de 0,3 s"), 300);
}
let ponte: HTMLTextAreaElement | null = null;
/**
 * No celular, o teclado só abre com o foco dado no próprio toque; a próxima questão aparece depois, fora dele. Então
 * o toque foca um campo invisível (o teclado abre ou continua aberto) e a questão nova passa o foco para o campo dela.
 * Se não vier campo (questão de alternativas, fim do treino), o campo invisível some e o teclado fecha.
 */
export function segurarTeclado() {
  if (!toque()) return;
  ponte?.remove();
  const el = document.createElement("textarea");
  el.setAttribute("aria-hidden", "true");
  el.tabIndex = -1;
  // 16px: o iPhone não dá zoom no campo
  Object.assign(el.style, { position: "fixed", top: "0", left: "0", width: "1px", height: "1px", opacity: "0", fontSize: "16px", border: "0", padding: "0" });
  document.body.append(el);
  el.focus({ preventScroll: true });
  ponte = el;
  setTimeout(() => {
    if (ponte === el) soltarTeclado();
  }, 1500);
}
function soltarTeclado() {
  ponte?.remove();
  ponte = null;
}

function registrarArtigos(p: Pergunta, c: Correcao) {
  const lex = contextoCorrecao().lex;
  if (p.formato === "peca" && c.formato === "peca") {
    const acertouArtigo = (c.acertouFundamento ?? c.acertouPeca) ? 1 : 0;
    registrarErros(eventosDeDispositivos(p.resposta.fundamentos, acertouArtigo, "quiz", lex, { q: p.id }));
  } else if (p.formato === "tese" && c.formato === "tese") {
    // o artigo conta pelo que o nível pediu dele; sem ele (médio, fácil de tese), pelo acerto da questão
    registrarErros(eventosDeDispositivos(p.artigos.slice(0, 1), (c.acertouArtigo ?? c.acertou) ? 1 : 0, "discursiva", lex, { q: p.id }));
  } else if (p.formato === "objetiva") {
    registrarErros(eventosDeDispositivos(p.dispositivos, c.acertou ? 1 : 0, "objetiva", lex, { q: p.id }));
  }
}

/**
 * Clique numa alternativa responde a questão, mas um arraste sobre o botão (para selecionar o texto dele)
 * não: o mouse precisa ter ficado parado entre o aperto e a soltura.
 */
const origens = new WeakMap<Element, { x: number; y: number; arrastando?: boolean }>();
/** Quanto é preciso arrastar a alternativa para o lado para riscá-la (ou tirar o risco). */
const ARRASTE_RISCAR = 80;
type EventoPonteiro = { currentTarget: HTMLElement; clientX: number; clientY: number; pointerId: number; pointerType: string; buttons: number };
function soltarArraste(el: HTMLElement) {
  delete el.dataset.arrastando;
  el.style.removeProperty("translate");
  el.style.removeProperty("--arraste");
}
function alternativa(acao: () => void) {
  return {
    onPointerDown(e: EventoPonteiro) {
      origens.set(e.currentTarget, { x: e.clientX, y: e.clientY });
    },
    // arrastar para o lado com o dedo (ou a caneta) risca a alternativa; de novo, tira o risco. Não responde. Com o
    // mouse, o arraste continua sendo para selecionar o texto.
    onPointerMove(e: EventoPonteiro) {
      const el = e.currentTarget;
      const o = origens.get(el);
      if (!o || e.pointerType === "mouse" || e.buttons === 0) return;
      const dx = e.clientX - o.x;
      const dy = e.clientY - o.y;
      if (!o.arrastando) {
        if (Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        o.arrastando = true;
        el.dataset.arrastando = "";
        el.setPointerCapture?.(e.pointerId);
      }
      el.style.translate = `${Math.max(-140, Math.min(140, dx))}px 0`;
      el.style.setProperty("--arraste", String(Math.min(1, Math.abs(dx) / ARRASTE_RISCAR)));
    },
    onPointerUp(e: EventoPonteiro) {
      const el = e.currentTarget;
      const o = origens.get(el);
      if (!o?.arrastando) return;
      if (Math.abs(e.clientX - o.x) >= ARRASTE_RISCAR) el.toggleAttribute("data-riscada");
      soltarArraste(el);
    },
    // no computador, o botão direito risca (e tira o risco), sem abrir o menu do navegador
    onContextMenu(e: { currentTarget: HTMLElement; preventDefault: () => void }) {
      e.preventDefault();
      e.currentTarget.toggleAttribute("data-riscada");
    },
    onPointerCancel(e: EventoPonteiro) {
      origens.delete(e.currentTarget);
      soltarArraste(e.currentTarget);
    },
    onClick(e: { currentTarget: Element; detail: number; clientX: number; clientY: number }) {
      const origem = origens.get(e.currentTarget);
      // detail 0 é o clique do teclado (Enter/Espaço): não tem movimento e sempre responde; arrastar não responde
      if (e.detail > 0 && origem && (origem.arrastando || Math.hypot(e.clientX - origem.x, e.clientY - origem.y) > 4)) return;
      acao();
    },
  };
}

/**
 * Copia o texto da questão com um clique: um ícone no canto do enunciado. Ao copiar, as folhas viram um visto e um
 * aviso curto aparece ao lado ("Copiada"); depois tudo volta ao normal, e pode copiar de novo. Se o navegador não
 * deixar copiar, o aviso diz isso.
 */
function CopiarQuestao({ texto, onde = "canto" }: { texto: string; onde?: OndeCopiar }) {
  const [estado, setEstado] = useState<"parado" | "copiada" | "falhou">("parado");
  const [rodada, setRodada] = useState(0);
  useEffect(() => {
    if (estado === "parado") return;
    const id = setTimeout(() => setEstado("parado"), 2200);
    return () => clearTimeout(id);
  }, [estado, rodada]);
  const copiar = () => {
    setRodada((r) => r + 1);
    void copiarTexto(texto).then((ok) => setEstado(ok ? "copiada" : "falhou"));
  };
  if (onde === "menu")
    return (
      <button type="button" className={`${styles.itemMenu} ${styles.copiar}`} data-estado={estado} onClick={copiar}>
        <svg className={styles.copiarIcone} viewBox="0 0 24 24" aria-hidden="true">
          <rect className={styles.copiarFolha} x="8" y="8" width="12" height="12" rx="2.5" />
          <path className={styles.copiarFolha} d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8" />
          <path className={styles.copiarVisto} d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
        <span role="status">{estado === "copiada" ? "Questão copiada" : estado === "falhou" ? "Não foi possível copiar" : "Copiar questão"}</span>
      </button>
    );
  return (
    <span className={onde === "topo" ? styles.copiarTopo : styles.copiarCanto}>
      <span className={styles.copiarAviso} data-estado={estado} role="status">
        {estado === "copiada" ? "Questão copiada" : estado === "falhou" ? "Não foi possível copiar" : ""}
      </span>
      <button type="button" className={`${styles.icone} ${styles.copiar}`} data-estado={estado} data-dica="Copiar questão" aria-label="Copiar questão" onClick={copiar}>
        <svg className={styles.copiarIcone} viewBox="0 0 24 24" aria-hidden="true">
          <rect className={styles.copiarFolha} x="8" y="8" width="12" height="12" rx="2.5" />
          <path className={styles.copiarFolha} d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8" />
          <path className={styles.copiarVisto} d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </button>
    </span>
  );
}

/** Relatar erro e sugerir melhoria: ícones no canto da resposta, que abrem o e-mail já com o id da questão. */
function Contatos({ questao }: { questao: string }) {
  return (
    <span className={styles.contatos}>
      <a className={styles.icone} href={linkContato("erro", questao)} data-dica="Relatar erro" aria-label="Relatar erro">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 21V4M5 4h11l-1.8 4L16 12H5" />
        </svg>
      </a>
      <a className={styles.icone} href={linkContato("sugestao", questao)} data-dica="Sugerir melhoria" aria-label="Sugerir melhoria">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9.5 18h5M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z" />
        </svg>
      </a>
    </span>
  );
}

export interface AlternativaVista {
  letra: string;
  texto: string;
  correta: boolean;
  escolhida: boolean;
}

/** A questão depois de respondida, como estava na tela: o bastante para revê-la no fim do treino. */
export interface Revisao {
  comando: string;
  /** as alternativas na ordem da tela (vazio nas questões digitadas) */
  alternativas: AlternativaVista[];
  /** o texto copiado pelo ícone: a questão com a resposta no fim */
  copia: string;
  correcao: Correcao;
}

/** As alternativas como estavam na tela (só nas questões com alternativas), com a certa e a marcada. */
function alternativasVistas(
  pergunta: Pergunta,
  nivel: Nivel,
  alts: { tipo: string; nome: string }[],
  facil: OpcoesFacil | null,
  marcada: number | null,
  res: Correcao | null,
): AlternativaVista[] {
  if (pergunta.formato === "peca" && nivel === 1)
    return alts.map((a, i) => ({ letra: LETRAS[i]!, texto: a.nome, correta: a.tipo === pergunta.resposta.peca, escolhida: marcada === i }));
  if (pergunta.formato === "tese" && nivel === 1 && facil)
    return facil.opcoes.map((o, i) => ({ letra: LETRAS[i]!, texto: o.texto, correta: o.correta, escolhida: marcada === i }));
  if (pergunta.formato === "objetiva")
    return LETRAS.map((l) => ({ letra: l, texto: pergunta.alternativas[l], correta: l === pergunta.correta, escolhida: res?.formato === "objetiva" && res.escolhida === l }));
  return [];
}

/**
 * Depois de responder, as alternativas saem da tela para dar lugar à correção. Este botão as mostra de novo, só para
 * leitura: a certa em verde e, se o aluno errou, a que ele marcou em vermelho.
 */
function RevisarAlternativas({ itens, abertaDeInicio = false }: { itens: AlternativaVista[]; abertaDeInicio?: boolean }) {
  const [aberta, setAberta] = useState(abertaDeInicio);
  const id = useId();
  return (
    <div className={styles.revisao} data-aberta={aberta ? "1" : undefined}>
      <button type="button" className={styles.revisaoBotao} aria-expanded={aberta} aria-controls={id} onClick={() => setAberta((a) => !a)}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 6l6 6-6 6" />
        </svg>
        {aberta ? "Ocultar as alternativas" : `Ver as alternativas (${itens.length})`}
      </button>
      <div className={styles.revisaoCorpo} id={id} hidden={!aberta}>
        <ol className={styles.revisaoLista}>
          {itens.map((a) => (
            <li key={a.letra} className={styles.revisaoItem} data-correta={a.correta ? "1" : undefined} data-errada={a.escolhida && !a.correta ? "1" : undefined}>
              <span className={styles.altLetra}>{a.letra}</span>
              <span className={styles.revisaoTexto}>{a.texto}</span>
              {(a.correta || a.escolhida) && (
                <span className={styles.revisaoSelo}>{a.correta ? (a.escolhida ? "Sua resposta · correta" : "Correta") : "Sua resposta"}</span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/** Quanto o caso precisa ser arrastado para a direita para valer (o toque curto ou a rolagem não contam). */
const ARRASTE_CASO = 90;

/**
 * O caso arrastado para a direita com o dedo: acompanha o dedo (com resistência) e, passado o limite, chama `aoDeslizar`.
 * Só gesto quase horizontal: a rolagem da página e a seleção do texto seguem normais.
 */
function deslizarCaso(aoDeslizar?: () => void) {
  if (!aoDeslizar) return {};
  let x0 = 0;
  let y0 = 0;
  let arrastando = false;
  let desistiu = false;
  const soltar = (el: HTMLElement) => {
    el.style.transition = "transform 0.2s ease";
    el.style.transform = "";
    el.removeAttribute("data-deslizando");
  };
  return {
    onTouchStart: (e: React.TouchEvent<HTMLElement>) => {
      if (e.touches.length !== 1) return;
      x0 = e.touches[0]!.clientX;
      y0 = e.touches[0]!.clientY;
      arrastando = false;
      desistiu = false;
    },
    onTouchMove: (e: React.TouchEvent<HTMLElement>) => {
      if (desistiu || e.touches.length !== 1) return;
      const dx = e.touches[0]!.clientX - x0;
      const dy = e.touches[0]!.clientY - y0;
      if (!arrastando) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) desistiu = true;
        else if (dx > 14 && dx > Math.abs(dy) * 1.5) arrastando = true;
        return;
      }
      const el = e.currentTarget;
      el.style.transition = "none";
      el.style.transform = `translateX(${Math.max(0, dx) * 0.55}px)`;
      el.toggleAttribute("data-deslizando", dx >= ARRASTE_CASO);
    },
    onTouchEnd: (e: React.TouchEvent<HTMLElement>) => {
      if (!arrastando) return;
      const dx = e.changedTouches[0]!.clientX - x0;
      soltar(e.currentTarget);
      arrastando = false;
      if (dx >= ARRASTE_CASO) aoDeslizar();
    },
    onTouchCancel: (e: React.TouchEvent<HTMLElement>) => {
      arrastando = false;
      soltar(e.currentTarget);
    },
  };
}

/** Etiqueta (fora das de peça) e o enunciado com o ícone de copiar no canto. */
function Caso({
  pergunta,
  copia,
  etiqueta = true,
  copiarFora = false,
  aoDeslizar,
}: {
  pergunta: Pergunta;
  copia: string;
  etiqueta?: boolean;
  copiarFora?: boolean;
  aoDeslizar?: () => void;
}) {
  return (
    <>
      {etiqueta && pergunta.formato !== "peca" && (
        <p className={styles.etiqueta}>
          {nomeCategoria(pergunta.categorias[0])} · {pergunta.fonte}
        </p>
      )}
      {/* copiarFora: no celular, o copiar fica no topo da questão (o do cartão some) */}
      <div className={styles.enunciado} data-copiar-fora={copiarFora ? "" : undefined} data-desliza={aoDeslizar ? "" : undefined} {...deslizarCaso(aoDeslizar)}>
        <p className={styles.caso}>{pergunta.caso}</p>
        <CopiarQuestao texto={copia} />
      </div>
      {/* a tese traz só a introdução curta; o caso inteiro da prova fica a um toque, para quem quiser os detalhes */}
      {pergunta.formato === "tese" && pergunta.enunciado && (
        <details className={styles.casoCompleto}>
          <summary>Ler o caso completo da prova</summary>
          <p>{pergunta.enunciado}</p>
        </details>
      )}
    </>
  );
}

/** O caso e o comando. */
function Enunciado({ pergunta, comando, copia, etiqueta = true }: { pergunta: Pergunta; comando: string; copia: string; etiqueta?: boolean }) {
  return (
    <>
      <Caso pergunta={pergunta} copia={copia} etiqueta={etiqueta} />
      <p className={styles.comando}>{comando}</p>
    </>
  );
}

/** A correção: verde ou vermelha, com os ícones de relatar erro e sugerir melhoria no canto. */
function Resposta({ pergunta, nivel, res, anunciar = false, children }: { pergunta: Pergunta; nivel: Nivel; res: Correcao; anunciar?: boolean; children?: ReactNode }) {
  return (
    <div
      className={`${styles.feedback} ${res.acertou ? styles.fbOk : styles.fbErro}`}
      aria-live={anunciar ? "assertive" : undefined}
      onClickCapture={(e) => {
        if ((e.target as Element).closest("a.citacao")) atualizarConquistas(registrarArtigo);
      }}
    >
      <div className={styles.fbTopo}>
        <strong className={styles.fbTitulo}>{res.acertou ? "✓ Correto!" : "✗ Não foi dessa vez"}</strong>
        <Contatos questao={pergunta.id} />
      </div>
      <Retorno pergunta={pergunta} res={res} nivel={nivel} />
      {children}
    </div>
  );
}

/**
 * A questão já respondida, só para leitura (o resultado do treino): o enunciado, as alternativas abertas, com a certa
 * e a marcada, e a correção. A etiqueta fica de fora: a linha do resultado já diz o tipo e a fonte.
 */
export function QuestaoRevista({ pergunta, nivel, revisao }: { pergunta: Pergunta; nivel: Nivel; revisao: Revisao }) {
  return (
    <div className={styles.revista}>
      <Enunciado pergunta={pergunta} comando={revisao.comando} copia={revisao.copia} etiqueta={false} />
      {revisao.alternativas.length > 0 && <RevisarAlternativas itens={revisao.alternativas} abertaDeInicio />}
      <Resposta pergunta={pergunta} nivel={nivel} res={revisao.correcao} />
    </div>
  );
}

/** Caso, comando, resposta (alternativas ou digitada) e feedback. Serve ao jogo e ao treino. */
export function PerguntaCorpo({
  pergunta,
  nivel,
  cabecalho,
  aoResponder,
  rotuloContinuar,
  aoContinuar,
  liberadaEm,
  continuo = false,
  pularAcerto = false,
  aoDeslizarCaso,
  vozRef,
  aoLerQuestao,
}: Props) {
  const [res, setRes] = useState<Correcao | null>(null);
  // a alternativa marcada (posição na tela), para mostrar de novo as alternativas depois da correção
  const [escolha, setEscolha] = useState<number | null>(null);
  const caixa = useRef<HTMLDivElement>(null);
  // o campo que a questão focou sozinha ao abrir: o primeiro Tab, com ele ainda vazio, fica nele (ver `teclas`)
  const autoFocado = useRef<HTMLTextAreaElement | null>(null);
  const inicio = useRef(0);
  const [agora, setAgora] = useState(() => performance.now());
  const aguardando = liberadaEm !== undefined && !res;
  // Tempo até a primeira escolha (Ícaro Liminar) começa quando a pergunta aparece.
  useEffect(() => {
    inicio.current = performance.now();
  }, [pergunta]);
  useEffect(() => {
    if (!aguardando) return;
    const id = setInterval(() => setAgora(performance.now()), 100);
    return () => clearInterval(id);
  }, [aguardando]);
  const bloqueada = aguardando && agora < liberadaEm();

  // Foco na caixa, não em botão ou campo: no jogo, com a barra de espaço para bater as asas, um botão
  // focado seria acionado sem querer. No treino (continuo), o foco vai para o campo de digitar ou para a alternativa A.
  // No celular, a questão vai direto para o campo de digitar (com o teclado aberto, quando se chega por um toque em
  // "Próxima pergunta", "Começar" ou pelo pulo do acerto); sem campo (alternativas), fica no topo, para ler o caso.
  useEffect(() => {
    if (continuo && toque()) {
      // respondendo falando, o teclado não abre: a questão fica no topo, para ler o caso
      const digitar = vozRef ? null : campoDaQuestao(caixa.current);
      if (digitar) {
        focarDoTopo(digitar);
      } else {
        // alternativas: a questão volta para o topo, para ler o caso
        caixa.current?.focus({ preventScroll: true });
        caixa.current?.scrollIntoView({ block: "start" });
      }
      // depois, não na hora: em desenvolvimento o efeito roda duas vezes e a segunda ainda precisa da ponte
      setTimeout(soltarTeclado);
      return;
    }
    const campo = continuo ? campoDaQuestao(caixa.current, true) : null;
    if (!campo) return caixa.current?.focus();
    // o campo fica embaixo do caso: o foco não rola a página até ele, a questão é que volta para o topo
    campo.focus({ preventScroll: true });
    if (campo.matches("input, textarea")) autoFocado.current = campo as HTMLTextAreaElement;
    const topo = caixa.current?.getBoundingClientRect().top ?? 0;
    if (topo < 0 || topo > window.innerHeight * 0.5) caixa.current?.scrollIntoView({ block: "start" });
  }, [pergunta]); // eslint-disable-line react-hooks/exhaustive-deps -- só ao trocar de questão
  // Celular: se o campo de digitar não ficou com o foco (o navegador recusou, ou o foco saiu), tenta de novo 5 s depois
  // de a questão aparecer, se ela ainda não foi respondida e nada está sendo digitado.
  useEffect(() => {
    if (!continuo || !toque() || vozRef) return;
    const t = setTimeout(() => {
      const digitar = campoDaQuestao(caixa.current);
      // respondida, o campo já saiu da tela
      if (!digitar || document.activeElement?.matches("input, textarea, select")) return diag("5 s: nada a fazer");
      focarDoTopo(digitar);
      diag("5 s: focou de novo");
    }, 5000);
    return () => clearTimeout(t);
  }, [pergunta]); // eslint-disable-line react-hooks/exhaustive-deps -- só ao trocar de questão
  // a faixa da barra de notificações (digitando) sai junto com a questão; a próxima põe de novo se focar o campo
  useEffect(() => () => document.body.removeAttribute("data-digitando"), []);
  // No treino, a letra ou o número da alternativa responde ("b" ou "2" é a B), sem precisar de Tab antes: vale com o
  // foco em qualquer lugar da questão ou da página (menos num campo ou num menu). O Enter segurado não responde a
  // próxima questão sozinho: a repetição da tecla é ignorada. Com o foco perdido (na página), o Tab vai para o campo de
  // digitar ou para a alternativa A (respondida, para "Próxima pergunta"), não para o menu do site.
  // respondida no treino: o próximo Enter continua
  const continuar = useRef<HTMLButtonElement>(null);
  const teclas = (e: KeyboardEvent | globalThis.KeyboardEvent) => {
    if (!continuo) return;
    if (e.key === "Enter" && e.repeat) {
      e.preventDefault();
      return;
    }
    const alvo = e.target as Element;
    const solto = alvo === document.body || alvo === caixa.current;
    // a questão abriu com o foco no campo da peça: quem aperta Tab para chegar a ele não deve pular para o fundamento
    if (e.key === "Tab" && !e.shiftKey && alvo === autoFocado.current) {
      autoFocado.current = null;
      if (!(alvo as HTMLTextAreaElement).value) {
        e.preventDefault();
        return;
      }
    }
    if (e.key === "Tab" && !e.shiftKey && solto) {
      const destino = res ? continuar.current : campoDaQuestao(caixa.current, true);
      if (destino) {
        e.preventDefault();
        destino.focus();
      }
      return;
    }
    if (!solto && !caixa.current?.contains(alvo)) return;
    if (res || e.ctrlKey || e.metaKey || e.altKey || alvo.closest("input, textarea, select, [contenteditable], [role=group]")) return;
    const k = "abcde".indexOf(e.key.toLowerCase()) >= 0 ? "abcde".indexOf(e.key.toLowerCase()) : "12345".indexOf(e.key);
    if (e.key.length !== 1 || k < 0) return;
    const botao = caixa.current?.querySelectorAll<HTMLButtonElement>("[data-alt]")[k];
    if (!botao || botao.disabled) return;
    e.preventDefault();
    botao.focus();
    botao.click();
  };
  const teclasRef = useRef(teclas);
  useEffect(() => {
    teclasRef.current = teclas;
  });
  // na página toda (não só dentro da questão), para valer mesmo com o foco perdido
  useEffect(() => {
    if (!continuo) return;
    const ouvir = (e: globalThis.KeyboardEvent) => teclasRef.current(e);
    document.addEventListener("keydown", ouvir);
    return () => document.removeEventListener("keydown", ouvir);
  }, [continuo]);
  const pula = !!res?.acertou && continuo && pularAcerto;
  useEffect(() => {
    // pulando, o foco fica onde está (no celular, com o teclado aberto para a próxima)
    if (res && continuo && !pula) continuar.current?.focus({ preventScroll: true });
  }, [res, continuo, pula]);
  // acertou com o pulo ligado: a próxima questão vem sozinha, depois de um instante para ver o acerto
  const seguir = useRef(aoContinuar);
  useEffect(() => {
    seguir.current = aoContinuar;
  });
  useEffect(() => {
    if (!pula || !res) return;
    const t = setTimeout(() => seguir.current(res), ESPERA_PULAR_MS);
    return () => clearTimeout(t);
  }, [pula, res]);

  // Ordem das alternativas sorteada uma vez por pergunta: a tela e a cópia mostram a mesma ordem.
  const alts = useMemo(() => (pergunta.formato === "peca" && nivel === 1 ? alternativas(pergunta) : []), [pergunta, nivel]);
  // a tese no fácil: o artigo da tese dada ou a tese do artigo dado, sorteado uma vez por pergunta
  const facil = useMemo(() => (pergunta.formato === "tese" && nivel === 1 ? opcoesDaTese(pergunta) : null), [pergunta, nivel]);
  const comando =
    pergunta.formato === "peca" && nivel === 1
      ? pergunta.comando.replace(/ e o seu fundamento.*\?$/, "?")
      : pergunta.formato === "tese" && facil
        ? facil.modo === "artigo"
          ? `Em que dispositivo se apoia esta tese: “${pergunta.tese}”?`
          : `Que tese ${artigoNaFrase(pergunta.artigos[0]!)} fundamenta neste caso?`
        : pergunta.comando;
  // antes de responder, copia a questão; depois, a questão com a resposta no fim
  const copia = (r: Correcao | null) => textoParaCopiar(pergunta, nivel, comando, alts, facil?.opcoes ?? [], r ? textoResposta(pergunta, r) : undefined);

  const concluir = (r: Correcao, marcada?: number) => {
    const tempoMs = performance.now() - inicio.current;
    registrarResultado(pergunta, r.acertou);
    registrarArtigos(pergunta, r);
    atualizarConquistas((c) => registrarResposta(c, { acertou: r.acertou, categorias: pergunta.categorias, tempoMs }));
    registrarAtividade({ acertou: r.acertou, categorias: pergunta.categorias, peca: pergunta.formato === "peca" ? pergunta.resposta.peca : undefined, tempoMs });
    setEscolha(marcada ?? null);
    // vai pular: no celular, se o teclado está aberto, segura ele para a próxima questão
    if (r.acertou && continuo && pularAcerto && document.activeElement?.matches("input, textarea")) segurarTeclado();
    setRes(r);
    aoResponder?.(r, { comando, alternativas: alternativasVistas(pergunta, nivel, alts, facil, marcada ?? null, r), copia: copia(r), correcao: r });
  };

  // as alternativas como estavam na tela, para rever depois de responder
  const vistas = alternativasVistas(pergunta, nivel, alts, facil, escolha, res);

  // Responder falando: a frase dita escolhe a alternativa (o mesmo botão do clique e da tecla), preenche os campos de
  // digitar (quem trata é o corpo da questão: CorpoPeca, CorpoTese) ou, depois da correção, segue para a próxima
  const corpoVoz = useRef<TratadorCorpo | null>(null);
  const textosDasAlternativas =
    pergunta.formato === "peca" && nivel === 1
      ? alts.map((a) => a.nome)
      : pergunta.formato === "tese" && facil
        ? facil.opcoes.map((o) => o.texto)
        : pergunta.formato === "objetiva"
          ? LETRAS.map((l) => pergunta.alternativas[l])
          : null;
  useEffect(() => {
    if (!vozRef) return;
    vozRef.current = (falas) => {
      const geral = interpretarResposta(falas, { tipo: "respondida" });
      if (geral?.tipo === "desligar") return { entendeu: true, texto: "Microfone desligado.", desligar: true };
      if (res) return geral?.tipo === "proxima" ? (aoContinuar(res), { entendeu: true, texto: "Próxima questão." }) : { entendeu: false, texto: "" };
      if (textosDasAlternativas) {
        const a = interpretarResposta(falas, { tipo: "alternativas", textos: textosDasAlternativas, pecas: pergunta.formato === "peca" }, RECONHECER);
        if (a?.tipo !== "alternativa") return { entendeu: false, texto: "" };
        const botao = caixa.current?.querySelectorAll<HTMLButtonElement>("[data-alt]")[a.indice];
        if (!botao || botao.disabled) return { entendeu: false, texto: "" };
        botao.click();
        return { entendeu: true, texto: `Letra ${LETRAS[a.indice] ?? a.indice + 1}: ${textosDasAlternativas[a.indice]}` };
      }
      return corpoVoz.current?.(falas) ?? { entendeu: false, texto: "" };
    };
    return () => {
      vozRef.current = null;
    };
  });
  // a leitura em voz alta da questão, quando ela abre (o caso, o comando e as alternativas como estão na tela)
  const lerQuestao = useRef(aoLerQuestao);
  useEffect(() => {
    lerQuestao.current = aoLerQuestao;
  });
  useEffect(() => {
    lerQuestao.current?.({ caso: pergunta.caso, comando, alternativas: textosDasAlternativas ?? [] });
  }, [pergunta]); // eslint-disable-line react-hooks/exhaustive-deps -- só ao trocar de questão

  return (
    <div
      ref={caixa}
      className={styles.quizBox}
      data-questao
      tabIndex={-1}
      onFocus={(e) => {
        if (!toque() || !e.target.matches("input:not([type=checkbox]), textarea")) return;
        aoDigitar(e.target);
      }}
      onBlur={(e) => {
        if (!e.target.matches("input, textarea")) return;
        // depois do toque, não na hora: digitando, a página desce (o espaço da barra de notificações); se subisse já no
        // toque que tira o foco do campo (em "Responder"), o botão fugiria do dedo e o toque cairia no formulário
        setTimeout(() => {
          if (!document.activeElement?.matches("input:not([type=checkbox]), textarea")) document.body.removeAttribute("data-digitando");
        }, 400);
      }}
    >
      {typeof cabecalho === "function" ? cabecalho((onde) => <CopiarQuestao texto={copia(res)} onde={onde} />) : cabecalho}
      {/* no modo foco do treino, em tela larga, o caso fica à esquerda (fixo) e o resto à direita; fora dele, um embaixo do outro */}
      <div className={styles.miolo}>
        <div className={styles.ladoCaso}>
          <Caso pergunta={pergunta} copia={copia(res)} copiarFora={typeof cabecalho === "function"} aoDeslizar={aoDeslizarCaso} />
        </div>
        <div className={styles.ladoResposta} data-resposta>
          <p className={styles.comando}>{comando}</p>
          {!res && pergunta.formato === "peca" && <CorpoPeca pergunta={pergunta} nivel={nivel} alts={alts} concluir={concluir} bloqueada={bloqueada} vozRef={corpoVoz} falando={!!vozRef} />}
          {!res && pergunta.formato === "tese" && <CorpoTese pergunta={pergunta} nivel={nivel} facil={facil} concluir={concluir} bloqueada={bloqueada} vozRef={corpoVoz} falando={!!vozRef} />}
          {!res && pergunta.formato === "objetiva" && <CorpoObjetiva pergunta={pergunta} concluir={concluir} bloqueada={bloqueada} />}
          {res && vistas.length > 0 && <RevisarAlternativas itens={vistas} />}

          {res && (
            <Resposta pergunta={pergunta} nivel={nivel} res={res} anunciar>
              <button
                ref={continuar}
                type="button"
                className="btn btn-primary"
                // respondendo falando, o toque só segue (o teclado não abre para a próxima)
                onClick={() => (continuo && !vozRef ? avancarNoToque(() => aoContinuar(res)) : aoContinuar(res))}
              >
                {rotuloContinuar}
              </button>
            </Resposta>
          )}
        </div>
      </div>
    </div>
  );
}

/** A prévia abaixo do campo: o que a correção vai ler do que já foi digitado (a linha fica reservada, sem pular). */
function Previa({ id, vazio, erro = false, children }: { id: string; vazio: boolean; erro?: boolean; children: ReactNode }) {
  return (
    <p id={id} className={styles.previa} data-vazia={vazio ? "1" : undefined} data-erro={erro ? "1" : undefined}>
      {children}
    </p>
  );
}

/**
 * Respondendo falando, no lugar das caixas de digitar: a resposta dita, uma só. Cada frase muda só o que traz de
 * válido (a peça reconhecida, o artigo reconhecido); "responder" (ou o botão) envia.
 */
function RespostaDita({ linhas, pronta, responder }: { linhas: { rotulo: string; valor: string; falta: string; aviso?: string }[]; pronta: boolean; responder: () => void }) {
  return (
    <div className={styles.respostaDita} data-resposta-dita>
      <dl>
        {linhas.map((l) => (
          <div key={l.rotulo} data-vazia={l.valor ? undefined : "1"}>
            <dt>{l.rotulo}</dt>
            <dd>
              {l.valor || <span>{l.falta}</span>}
              {l.valor && l.aviso && <small> · {l.aviso}</small>}
            </dd>
          </div>
        ))}
      </dl>
      <button type="button" className="btn btn-gold" disabled={!pronta} onClick={responder}>
        Responder
      </button>
    </div>
  );
}

function CorpoPeca({
  pergunta,
  nivel,
  alts,
  concluir,
  bloqueada,
  vozRef,
  falando,
}: {
  pergunta: PerguntaPeca;
  nivel: Nivel;
  alts: { tipo: string; nome: string }[];
  concluir: (c: Correcao, marcada?: number) => void;
  bloqueada: boolean;
  vozRef: RefObject<TratadorCorpo | null>;
  /** respondendo falando: sem as caixas de digitar, a resposta dita (uma só: a peça e o fundamento) */
  falando: boolean;
}) {
  const [peca, setPeca] = useState("");
  const [fund, setFund] = useState("");
  const campoFund = useRef<HTMLTextAreaElement>(null);
  const id = useId();
  const responder = (escolhida?: string, marcada?: number) => concluir(corrigirResposta(pergunta, nivel, { peca: escolhida ?? peca, fundamento: fund }), marcada);
  const pecas = useMemo(() => (nivel > 1 ? previaDaPeca(peca) : []), [peca, nivel]);
  const fundamento = useMemo(() => (nivel > 1 ? previaDoFundamento(fund) : null), [fund, nivel]);
  // responder falando: a fala preenche a peça e o fundamento; "responder" envia com o que acabou de ser dito
  useEffect(() => {
    if (nivel === 1) return;
    vozRef.current = (falas) => {
      const a = interpretarResposta(falas, { tipo: "peca", peca, fundamento: fund }, RECONHECER);
      if (!a) return null;
      if (a.tipo === "apagar") {
        if (a.campo !== "fundamento") setPeca("");
        if (a.campo !== "peca") setFund("");
        return { entendeu: true, texto: a.campo === "peca" ? "Peça apagada." : a.campo === "fundamento" ? "Fundamento apagado." : "Resposta apagada." };
      }
      if (a.tipo !== "preencher" && a.tipo !== "enviar") return null;
      const novaPeca = a.tipo === "preencher" ? (a.campos.peca ?? peca) : peca;
      const novoFund = a.tipo === "preencher" ? (a.campos.fundamento ?? fund) : fund;
      setPeca(novaPeca);
      setFund(novoFund);
      if (a.tipo === "enviar" || a.enviar) {
        if (!novaPeca.trim()) return { entendeu: true, texto: "Falta a peça: diga o nome dela." };
        if (!novoFund.trim()) return { entendeu: true, texto: "Falta o fundamento: diga o artigo." };
        concluir(corrigirResposta(pergunta, nivel, { peca: novaPeca, fundamento: novoFund }));
        return { entendeu: true, texto: "Resposta enviada." };
      }
      return { entendeu: true, texto: `Peça: ${novaPeca || "—"} · Fundamento: ${novoFund || "—"}. Diga “responder” para enviar.` };
    };
    return () => {
      vozRef.current = null;
    };
  });

  if (nivel === 1) {
    return (
      <div className={styles.alts}>
        {alts.map((a, i) => (
          <button key={a.tipo} type="button" className={styles.alt} data-alt disabled={bloqueada} {...alternativa(() => responder(a.tipo, i))}>
            <span className={styles.altLetra}>{"ABCD"[i]}</span>
            {a.nome}
          </button>
        ))}
      </div>
    );
  }
  if (falando)
    return (
      <RespostaDita
        linhas={[
          { rotulo: "Peça", valor: peca, falta: "diga o nome da peça" },
          {
            rotulo: nivel === 3 ? "Fundamento (com parágrafo, inciso ou alínea)" : "Fundamento (artigo e lei)",
            valor: fund,
            falta: "diga o artigo e a lei",
            aviso: fundamento?.semLei ? "falta a lei (diga, por exemplo, “do CPP”)" : undefined,
          },
        ]}
        pronta={!!peca.trim() && !!fund.trim()}
        responder={() => responder()}
      />
    );
  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        responder();
      }}
    >
      <div className={styles.campo} data-campo>
        <label>
          <span>Peça</span>
          <CampoLinha
            value={peca}
            onChange={setPeca}
            placeholder="ex.: Recurso em Sentido Estrito"
            name="grifo-peca"
            enterKeyHint="next"
            // Enter na peça vai para o fundamento (sem ele, a resposta não vai)
            aoEnter={(campo) => (fund.trim() ? campo.form?.requestSubmit() : campoFund.current?.focus())}
            required
            aria-describedby={`${id}-peca`}
          />
        </label>
        <Previa id={`${id}-peca`} vazio={!peca.trim()} erro={peca.trim().length >= 3 && !pecas.length}>
          {pecas.length > 1 ? (
            <>
              Mais de uma peça: <strong>{pecas.join(", ")}</strong>. Digite só a cabível.
            </>
          ) : pecas.length ? (
            <>
              Será considerada: <strong>{pecas[0]}</strong>
            </>
          ) : peca.trim().length >= 3 ? (
            "Não reconhecemos essa peça."
          ) : null}
        </Previa>
      </div>
      <div className={styles.campo} data-campo>
        <label>
          <span>Fundamento legal {nivel === 3 ? "(com parágrafo, inciso ou alínea)" : "(artigo e lei)"}</span>
          <CampoLinha
            value={fund}
            onChange={setFund}
            placeholder={nivel === 3 ? "ex.: art. 581, IV, do CPP" : "ex.: art. 581 do CPP"}
            ref={campoFund}
            name="grifo-fundamento"
            enterKeyHint="send"
            aoEnter={(campo) => campo.form?.requestSubmit()}
            required
            aria-describedby={`${id}-fund`}
          />
        </label>
        <Previa id={`${id}-fund`} vazio={!fund.trim()} erro={!!fund.trim() && (!fundamento?.citacoes.length || fundamento.semLei)}>
          {fundamento?.citacoes.length ? (
            <>
              Será considerado: <strong>{fundamento.citacoes.join("; ")}</strong>
              {fundamento.semLei && " · falta a lei (ex.: CPP, CP, Lei 11.343)"}
            </>
          ) : fund.trim() ? (
            "Nenhum artigo reconhecido. Ex.: 581, IV, CPP"
          ) : null}
        </Previa>
      </div>
      <button type="submit" className="btn btn-gold">
        Responder
      </button>
    </form>
  );
}

function CorpoTese({
  pergunta,
  nivel,
  facil,
  concluir,
  bloqueada,
  vozRef,
  falando,
}: {
  pergunta: PerguntaTese;
  nivel: Nivel;
  facil: OpcoesFacil | null;
  concluir: (c: Correcao, marcada?: number) => void;
  bloqueada: boolean;
  vozRef: RefObject<TratadorCorpo | null>;
  /** respondendo falando: sem as caixas de digitar, a resposta dita (o ponto central e, no difícil, o artigo) */
  falando: boolean;
}) {
  const [tese, setTese] = useState("");
  const [artigo, setArtigo] = useState("");
  const campoArtigo = useRef<HTMLTextAreaElement>(null);
  const id = useId();
  const fundamento = useMemo(() => (nivel === 3 ? previaDoFundamento(artigo) : null), [artigo, nivel]);
  const responder = () => concluir(corrigirTese(pergunta, nivel, { tese, artigo }));
  // responder falando: a fala preenche o ponto central (e, no difícil, o artigo); "responder" envia
  useEffect(() => {
    if (nivel === 1 && facil) return;
    vozRef.current = (falas) => {
      const a = interpretarResposta(falas, { tipo: "tese", comArtigo: nivel === 3, tese, artigo }, RECONHECER);
      if (!a) return null;
      if (a.tipo === "apagar") {
        if (a.campo !== "artigo") setTese("");
        if (a.campo !== "tese") setArtigo("");
        return { entendeu: true, texto: a.campo === "tese" ? "Ponto central apagado." : a.campo === "artigo" ? "Artigo apagado." : "Resposta apagada." };
      }
      if (a.tipo !== "preencher" && a.tipo !== "enviar") return null;
      const novaTese = a.tipo === "preencher" ? (a.campos.tese ?? tese) : tese;
      const novoArtigo = a.tipo === "preencher" ? (a.campos.artigo ?? artigo) : artigo;
      setTese(novaTese);
      setArtigo(novoArtigo);
      if (a.tipo === "enviar" || a.enviar) {
        if (!novaTese.trim()) return { entendeu: true, texto: "Falta o ponto central: diga a tese." };
        if (nivel === 3 && !novoArtigo.trim()) return { entendeu: true, texto: "Falta o artigo: diga o dispositivo." };
        concluir(corrigirTese(pergunta, nivel, { tese: novaTese, artigo: novoArtigo }));
        return { entendeu: true, texto: "Resposta enviada." };
      }
      return {
        entendeu: true,
        texto: `Ponto central: ${novaTese || "—"}${nivel === 3 ? ` · Artigo: ${novoArtigo || "—"}` : ""}. Diga “responder” para enviar.`,
      };
    };
    return () => {
      vozRef.current = null;
    };
  });

  if (nivel === 1 && facil) {
    return (
      <div className={styles.alts}>
        {facil.opcoes.map((o, i) => (
          <button
            key={o.texto}
            type="button"
            className={styles.alt}
            data-alt
            disabled={bloqueada}
            {...alternativa(() => concluir(corrigirTese(pergunta, nivel, { alternativa: { modo: facil.modo, ...o } }), i))}
          >
            <span className={styles.altLetra}>{"ABCD"[i]}</span>
            {o.texto}
          </button>
        ))}
      </div>
    );
  }
  if (falando)
    return (
      <RespostaDita
        linhas={[
          { rotulo: "Ponto central", valor: tese, falta: "diga a tese em poucas palavras" },
          ...(nivel === 3
            ? [
                {
                  rotulo: "Artigo (com parágrafo, inciso ou alínea)",
                  valor: artigo,
                  falta: "diga o artigo e a lei",
                  aviso: fundamento?.semLei ? "falta a lei (diga, por exemplo, “do CP”)" : undefined,
                },
              ]
            : []),
        ]}
        pronta={!!tese.trim() && (nivel === 2 || !!artigo.trim())}
        responder={responder}
      />
    );
  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        responder();
      }}
    >
      <div className={styles.campo} data-campo>
        <label>
          <span>O ponto central da resposta</span>
          <CampoLinha
            value={tese}
            onChange={setTese}
            placeholder="em poucas palavras"
            name="grifo-tese"
            enterKeyHint={nivel === 3 ? "next" : "send"}
            // no difícil, o Enter na tese vai para o artigo (sem ele, a resposta não vai)
            aoEnter={(campo) => (nivel === 2 || artigo.trim() ? campo.form?.requestSubmit() : campoArtigo.current?.focus())}
            required
          />
        </label>
      </div>
      {nivel === 3 && (
        <div className={styles.campo} data-campo>
          <label>
            <span>Artigo (com parágrafo, inciso ou alínea)</span>
            <CampoLinha
              value={artigo}
              onChange={setArtigo}
              placeholder="ex.: art. 121, § 3º, do CP"
              ref={campoArtigo}
              name="grifo-artigo"
              enterKeyHint="send"
              aoEnter={(campo) => campo.form?.requestSubmit()}
              required
              aria-describedby={`${id}-artigo`}
            />
          </label>
          <Previa id={`${id}-artigo`} vazio={!artigo.trim()} erro={!!artigo.trim() && (!fundamento?.citacoes.length || fundamento.semLei)}>
            {fundamento?.citacoes.length ? (
              <>
                Será considerado: <strong>{fundamento.citacoes.join("; ")}</strong>
                {fundamento.semLei && " · falta a lei (ex.: CPP, CP, Lei 11.343)"}
              </>
            ) : artigo.trim() ? (
              "Nenhum artigo reconhecido. Ex.: 121, § 3º, CP"
            ) : null}
          </Previa>
        </div>
      )}
      <button type="submit" className="btn btn-gold">
        Responder
      </button>
    </form>
  );
}

function CorpoObjetiva({ pergunta, concluir, bloqueada }: { pergunta: PerguntaObjetiva; concluir: (c: Correcao, marcada?: number) => void; bloqueada: boolean }) {
  return (
    <div className={styles.alts}>
      {LETRAS.map((l: Letra, i) => (
        <button key={l} type="button" className={styles.alt} data-alt disabled={bloqueada} {...alternativa(() => concluir(corrigirObjetiva(pergunta, l), i))}>
          <span className={styles.altLetra}>{l}</span>
          {pergunta.alternativas[l]}
        </button>
      ))}
    </div>
  );
}

// A prévia só serve aqui pelos blocos (o texto do artigo); o HTML dela não é usado.
const SEM_CLASSES: Classes = {
  b: "", txt: "", ref: "", rotulo: "", atos: "", ato: "", info: "", infoLinha: "", estrela: "", naoEncontrada: "",
  tipos: { estrutura: "", rubrica: "", artigo: "", paragrafo: "", inciso: "", alinea: "", texto: "" },
};

/**
 * O que diz o artigo que o aluno digitou: o artigo inteiro numa caixa com rolagem, com o parágrafo, inciso ou alínea
 * citados em destaque (a caixa já abre neles). Lei fora do leitor: só o link da citação; artigo que a lei não tem: um aviso.
 */
function TextoDoArtigo({ artigo }: { artigo: ArtigoCitado }) {
  const [estado, setEstado] = useState<{ blocos: Bloco[]; nome: string } | "sem-artigo" | null>(null);
  // o que foi digitado e o artigo não tem ("§ 4º" no art. 581) e, se for o caso, o inciso de mesmo número, que a busca
  // do leitor abriria no lugar: ele aparece em destaque, mas o erro de digitação fica dito
  const ausentes = useMemo(() => {
    if (!estado || estado === "sem-artigo") return [];
    const a: ArtigoTexto = [artigo.art, "", "", estado.blocos.map((b) => (b.disp?.startsWith(`${artigo.art}.`) ? b.disp.slice(artigo.art.length + 1) : ""))];
    return artigo.disps
      .filter((d) => !temDispositivo(a, d))
      .map((d) => {
        const outro = ajustarAlvo({ art: artigo.art, disp: d }, a);
        return { disp: d, inciso: outro !== d && temDispositivo(a, outro) ? outro : null };
      });
  }, [estado, artigo]);
  const caixa = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!artigo.lei) return;
    let vivo = true;
    artigoParaPrevia(artigo.lei, artigo.art, false, SEM_CLASSES)
      .then((p) => vivo && setEstado(p ? { blocos: p.blocos, nome: p.nome } : "sem-artigo"))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [artigo]);
  // os citados e, na alínea, o inciso de que ela faz parte (o caput só quando só o artigo foi citado)
  const destacados = [...artigo.disps, ...ausentes.flatMap((x) => x.inciso ?? [])];
  const citados = new Set(destacados.flatMap((d) => d.split(".").map((_, k, partes) => partes.slice(0, k + 1).join("."))).filter((d) => d !== artigo.art));
  useEffect(() => {
    const el = caixa.current?.querySelector<HTMLElement>("[data-citado]");
    if (el && caixa.current) caixa.current.scrollTop = el.offsetTop - 8;
  }, [estado]);
  if (estado === "sem-artigo") return <p className={styles.fbDetalhe}>Essa lei não tem esse artigo.</p>;
  if (!estado) return null;
  const nomeArt = `art. ${artigo.art.replace(/^art/, "").toUpperCase()}${/^art\d$/.test(artigo.art) ? "º" : ""}`;
  return (
    <>
      {ausentes.map((x) => (
        <p key={x.disp} className={styles.inexistente}>
          <strong>{rotuloDoDisp(x.disp)} não existe</strong> no {nomeArt}.
          {x.inciso && (
            <>
              {" "}
              Esse número é do {rotuloDoDisp(x.inciso)}, destacado abaixo. Na correção, “§” ou “p” vale sempre como parágrafo, então o inciso não
              conta.
            </>
          )}
        </p>
      ))}
      <div ref={caixa} className={styles.artigoTexto} tabIndex={0} role="region" aria-label={`Texto do ${artigo.texto}`}>
        {estado.blocos
          .filter((b) => b.tipo !== "rubrica")
          .map((b, i) => (
            <p key={i} data-tipo={b.tipo} data-citado={b.disp && citados.has(b.disp) ? "1" : undefined}>
              {b.texto}
            </p>
          ))}
      </div>
    </>
  );
}

/** "art581.p4" → "§ 4º"; "art121.p2.i4" → "§ 2º, inciso IV"; "art593.i3.ad" → "inciso III, alínea d". */
function rotuloDoDisp(disp: string): string {
  return disp
    .split(".")
    .slice(1)
    .map((s) => {
      if (s === "pu") return "parágrafo único";
      const m = s.match(/^([pia])([0-9a-z]+?)(?:-([a-z]))?$/);
      if (!m) return s;
      const letra = m[3] ? `-${m[3].toUpperCase()}` : "";
      if (m[1] === "p") return `§ ${m[2]}º${letra}`;
      if (m[1] === "i") return `inciso ${toRoman(Number(m[2]))}${letra}`;
      return `alínea ${m[2]}`;
    })
    .join(", ");
}

/** A resposta do aluno, abaixo da certa: a peça que ele deu, com o fundamento padrão dela, e o artigo que ele digitou. */
function SuaResposta({ res, r, nivel }: { res: CorrecaoPeca; r: Respondida; nivel: Nivel }) {
  const nome = r.tipo ? nomePeca(r.tipo) : null;
  // o texto digitado só aparece quando difere do nome reconhecido ("rese" → Recurso em Sentido Estrito)
  const digitou = nivel > 1 && r.peca && (!nome || r.peca.toLowerCase() !== nome.toLowerCase()) ? r.peca : null;
  return (
    <div className={styles.suaResposta}>
      <p className={styles.fbRotulo}>Sua resposta</p>
      <p data-certo={res.acertouPeca ? "1" : "0"}>
        <span className={styles.marca} aria-label={res.acertouPeca ? "peça certa" : "peça errada"}>
          {res.acertouPeca ? "✓" : "✗"}
        </span>{" "}
        {nome ? <strong>{nome}</strong> : <strong>“{r.peca}”</strong>}
        {digitou && nome && <span className={styles.fbDetalhe}> (você digitou “{digitou}”)</span>}
        {!res.acertouPeca &&
          (nome ? (
            r.fundamentoDaPeca.length > 0 && (
              <>
                {" "}
                — fundamento: <Citado texto={r.fundamentoDaPeca.join("; ")} />
              </>
            )
          ) : (
            <span className={styles.fbDetalhe}> — não reconhecemos essa peça</span>
          ))}
      </p>
      {r.fundamento !== undefined && (
        <div data-certo={res.acertouFundamento ? "1" : "0"}>
          <p>
            <span className={styles.marca} aria-label={res.acertouFundamento ? "fundamento certo" : "fundamento errado"}>
              {res.acertouFundamento ? "✓" : "✗"}
            </span>{" "}
            Fundamento que você digitou:{" "}
            {r.artigos.length ? (
              r.artigos.map((a, i) => (
                <span key={i}>
                  {i > 0 && "; "}
                  <Citado texto={a.texto} />
                </span>
              ))
            ) : (
              <>
                “{r.fundamento}” <span className={styles.fbDetalhe}>(não reconhecemos nenhum artigo)</span>
              </>
            )}
          </p>
          {!res.acertouFundamento && r.artigos.slice(0, 3).map((a, i) => <TextoDoArtigo key={i} artigo={a} />)}
        </div>
      )}
    </div>
  );
}

function Retorno({ pergunta, res, nivel }: { pergunta: Pergunta; res: Correcao; nivel: Nivel }) {
  if (res.formato === "peca") {
    return (
      <>
        {!res.acertou && <p className={styles.fbRotulo}>Resposta correta</p>}
        <p>
          <strong>{res.pecaEsperada}</strong> — <Citado texto={res.fundamentoEsperado} />
        </p>
        <p className={styles.fbExp}>
          <Citado texto={pergunta.explicacao} />
        </p>
        {!res.acertou && res.respondida && <SuaResposta res={res} r={res.respondida} nivel={nivel} />}
      </>
    );
  }
  if (res.formato === "objetiva" && pergunta.formato === "objetiva") {
    return (
      <>
        {!res.acertou && (
          <p className={styles.fbDetalhe}>
            Você marcou {res.escolhida}. A resposta é a letra {res.correta}: {pergunta.alternativas[res.correta]}
          </p>
        )}
        <p className={styles.fbExp}>{pergunta.explicacao}</p>
      </>
    );
  }
  if (res.formato !== "tese") return null;
  return (
    <>
      {!res.acertou && <p className={styles.fbRotulo}>Resposta correta</p>}
      <p>
        <strong>{res.teseEsperada}</strong> — <Citado texto={res.artigoEsperado} />
      </p>
      {!res.acertou && nivel > 1 && <SuaTese res={res} nivel={nivel} />}
      <p className={styles.fbExp}>
        <strong>Padrão de respostas: </strong>
        <Citado texto={pergunta.explicacao} />
      </p>
    </>
  );
}

/** O ponto central e o artigo que o aluno digitou, cada um com o certo ou o errado; o artigo errado, com o texto dele. */
function SuaTese({ res, nivel }: { res: CorrecaoTese; nivel: Nivel }) {
  const r = res.respondida;
  return (
    <div className={styles.suaResposta}>
      <p className={styles.fbRotulo}>Sua resposta</p>
      <p data-certo={res.acertouTese ? "1" : "0"}>
        <span className={styles.marca} aria-label={res.acertouTese ? "ponto central certo" : "ponto central errado"}>
          {res.acertouTese ? "✓" : "✗"}
        </span>{" "}
        “{r.tese}”
      </p>
      {nivel === 3 && r.artigo !== undefined && (
        <div data-certo={res.acertouArtigo ? "1" : "0"}>
          <p>
            <span className={styles.marca} aria-label={res.acertouArtigo ? "artigo certo" : "artigo errado"}>
              {res.acertouArtigo ? "✓" : "✗"}
            </span>{" "}
            Artigo que você digitou:{" "}
            {r.artigos.length ? (
              r.artigos.map((a, i) => (
                <span key={i}>
                  {i > 0 && "; "}
                  <Citado texto={a.texto} />
                </span>
              ))
            ) : (
              <>
                “{r.artigo}” <span className={styles.fbDetalhe}>(não reconhecemos nenhum artigo)</span>
              </>
            )}
          </p>
          {!res.acertouArtigo && r.artigos.slice(0, 3).map((a, i) => <TextoDoArtigo key={i} artigo={a} />)}
        </div>
      )}
    </div>
  );
}
