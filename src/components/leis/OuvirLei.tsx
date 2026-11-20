"use client";

// A leitura em voz alta no leitor: a barra de controles (presa embaixo enquanto a leitura está aberta), o "▶ Ler daqui" do
// parágrafo tocado e o painel de ajustes (voz, velocidade, o que ler, quando parar, comandos de voz, microfone e botões do
// fone). Os botões da barra têm gestos (BotaoGesto): dois toques, segurar (um menu com mais opções) e deslizar (andar
// pelos trechos e artigos, a velocidade e o volume), para não precisar abrir os ajustes. O motor é useOuvir.
import { useEffect, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { AnelDoSom, BotaoGesto, Camada, CamadaDosGestos, type Deslizar, type ItemDoMenu } from "@/components/BotaoGesto";
import { ouveMicrofoneEscolhido } from "@/lib/fala/escuta";
import { avisoDaTela, telaPodeFicarAcesa } from "@/lib/tela-acesa";
import { COMANDOS_FALADOS } from "@/lib/fala/comandos-voz";
import { ACOES_DO_FONE, type AcaoDoFone } from "@/lib/fala/fone";
import { VELOCIDADE_MAX, VELOCIDADE_MIN, type Ouvir } from "./useOuvir";
import { BotaoDaVoz, GESTOS_DO_OUVIR, itensDoMicrofone, MENU_SEM_TOQUE } from "./ControlesDaVoz";
import { MicrofoneDosComandos } from "./MicrofoneDosComandos";
import { OpcaoCartao } from "./OpcaoCartao";
import leitor from "./leitor.module.css";
import styles from "./ouvir.module.css";

const fmt = (v: number) => `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}×`;

function Icone({ children, cheio = false }: { children: ReactNode; cheio?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cheio ? styles.iconeCheio : styles.icone}>
      {children}
    </svg>
  );
}

const ESTADO: Record<Ouvir["estado"], string> = { lendo: "Lendo", pausado: "Pausado", parado: "Parado" };

/** O tempo que falta para a leitura parar sozinha ("12 min"), atualizado a cada 20 s. */
function useFalta(prazo: number | null): string | null {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    if (prazo === null) return;
    setAgora(Date.now()); // eslint-disable-line react-hooks/set-state-in-effect -- o prazo novo conta de agora
    const t = window.setInterval(() => setAgora(Date.now()), 20_000);
    return () => window.clearInterval(t);
  }, [prazo]);
  if (prazo === null) return null;
  const min = Math.max(0, Math.ceil((prazo - agora) / 60_000));
  return min >= 60 ? `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60}` : ""}` : `${min} min`;
}

/** Deslizar nas setas: o dedo anda pelos trechos (ou pelos artigos), e o balão mostra até onde a leitura vai. */
function deslizarPelaLei(ouvir: Ouvir, artigo: boolean, sumula: boolean): Deslizar {
  const nome = artigo ? (sumula ? "enunciados" : "artigos") : "trechos";
  return {
    eixo: "x",
    passoPx: artigo ? 26 : 22,
    previa: (_, passos) => {
      const alvo = ouvir.previaAdiante(passos, artigo);
      if (!alvo) return "Comece a leitura para andar pela lei";
      return { texto: alvo, detalhe: passos ? `${passos > 0 ? "Avança" : "Volta"} ${Math.abs(passos)} ${Math.abs(passos) === 1 ? nome.slice(0, -1) : nome}` : "Solte para ficar aqui" };
    },
    aplicar: (_, passos) => {
      ouvir.comando({ tipo: "pularVarios", n: Math.abs(passos), artigo, passo: passos > 0 ? 1 : -1 });
    },
  };
}

/** O menu de segurar das setas de artigo: ir ao grifo, à estrela, ao erro ou à divisão seguinte (ou anterior). */
function irParaNaLei(ouvir: Ouvir, passo: 1 | -1, sumula: boolean): ItemDoMenu[] {
  const qual = passo > 0 ? "proximo" : "anterior";
  const p = passo > 0;
  return [
    { id: "grifo", rotulo: p ? "Próximo grifo" : "Grifo anterior", fazer: () => ouvir.comando({ tipo: "grifo", qual }) },
    { id: "meu", rotulo: p ? "Meu próximo grifo" : "Meu grifo anterior", fazer: () => ouvir.comando({ tipo: "grifo", qual, de: "meus" }) },
    { id: "pronto", rotulo: p ? "Próximo grifo automático" : "Grifo automático anterior", fazer: () => ouvir.comando({ tipo: "grifo", qual, de: "prontos" }) },
    { id: "estrela", rotulo: p ? "Próximo artigo importante ★" : "Artigo importante anterior ★", fazer: () => ouvir.comando({ tipo: "importante", acao: qual }) },
    { id: "erro", rotulo: p ? "Próximo artigo com erro" : "Artigo com erro anterior", fazer: () => ouvir.comando({ tipo: "erro", qual }) },
    ...(sumula
      ? []
      : [
          { id: "capitulo", rotulo: p ? "Próximo capítulo" : "Capítulo anterior", fazer: () => ouvir.comando({ tipo: "divisaoVizinha", nivel: "capitulo", passo }) },
          { id: "titulo", rotulo: p ? "Próximo título" : "Título anterior", fazer: () => ouvir.comando({ tipo: "divisaoVizinha", nivel: "titulo", passo }) },
        ]),
    { id: "repetir", rotulo: sumula ? "Repetir a súmula" : "Repetir o artigo", fazer: ouvir.repetirArtigo },
  ];
}

/** O menu de segurar das setas de trecho: dentro do artigo (o parágrafo, o inciso, a alínea vizinhos; o começo). */
function noArtigo(ouvir: Ouvir, passo: 1 | -1, sumula: boolean): ItemDoMenu[] {
  const p = passo > 0;
  const nivel = (n: "paragrafo" | "inciso" | "alinea", nome: string, f = false): ItemDoMenu => ({
    id: n,
    rotulo: p ? `${f ? "Próxima" : "Próximo"} ${nome}` : `${nome[0]!.toUpperCase()}${nome.slice(1)} anterior`,
    fazer: () => ouvir.comando({ tipo: "dispositivo", nivel: n, passo }),
  });
  return [
    { id: "repetir", rotulo: "Repetir este trecho", fazer: () => ouvir.comando({ tipo: "repetir" }) },
    { id: "comeco", rotulo: sumula ? "Do começo da súmula" : "Do começo do artigo", fazer: ouvir.repetirArtigo },
    ...(sumula ? [] : [nivel("paragrafo", "parágrafo"), nivel("inciso", "inciso"), nivel("alinea", "alínea", true)]),
  ];
}

const TEMPOS_DO_MENU: [number | null, string][] = [
  [null, "Não"],
  [15, "15 min"],
  [30, "30 min"],
  [45, "45 min"],
  [60, "1 hora"],
];

/** A barra presa embaixo: o que está sendo lido, tocar/pausar, trecho e artigo vizinhos, velocidade e comandos de voz. */
export function BarraOuvir({ ouvir, dockVisivel, painelAberto, abrirAjustes, sumula = false }: { ouvir: Ouvir; dockVisivel: boolean; painelAberto: boolean; abrirAjustes: () => void; sumula?: boolean }) {
  const falta = useFalta(ouvir.prazo?.fim ?? null);
  const [camada, setCamada] = useState<HTMLDivElement | null>(null);
  const [comSensibilidade, setComSensibilidade] = useState(false);
  useEffect(() => {
    if (ouvir.ativo) setComSensibilidade(ouveMicrofoneEscolhido()); // eslint-disable-line react-hooks/set-state-in-effect -- o teste do navegador só roda no cliente
  }, [ouvir.ativo]);
  if (!ouvir.ativo) return null;
  const lendo = ouvir.estado === "lendo";
  const ouvindo = (ouvir.prefs.comandos || ouvir.esperandoComando) && ouvir.escuta === "ouvindo";
  // no celular, depois dos silêncios: o toque no microfone o faz ouvir de novo (em vez de desligar os comandos)
  const emPausa = ouvir.prefs.comandos && ouvir.escuta === "em-pausa";
  const artigo = sumula ? "súmula" : "artigo";
  return (
    <div className={styles.barra} data-barra-ouvir data-ouvir data-dock={dockVisivel ? "1" : "0"} data-painel={painelAberto ? "1" : undefined} role="region" aria-label="Leitura em voz alta">
      <Camada aoMontar={setCamada} />
      <CamadaDosGestos.Provider value={camada}>
        {!ouvir.seguindo && (
          <div className={styles.longe}>
            <button type="button" onClick={ouvir.voltarAoTrecho}>
              <Icone>
                <path d="M9 14l-5-5 5-5" />
                <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
              </Icone>
              Voltar ao trecho lido
            </button>
            <button type="button" className={styles.lerDaqui} onClick={ouvir.lerDaTela}>
              <Icone cheio>
                <path d="M8 5v14l11-7z" />
              </Icone>
              Ler daqui
            </button>
          </div>
        )}
        <div className={styles.topo}>
          <span className={styles.estado} data-estado={ouvir.esperandoComando ? "comando" : ouvir.estado} aria-live="polite">
            <span className={styles.ondas} aria-hidden>
              <i />
              <i />
              <i />
            </span>
            {ouvir.esperandoComando ? "Fale o comando" : ESTADO[ouvir.estado]}
          </span>
          <BotaoGesto
            id="ouvir-onde"
            rotulo={`${ouvir.rotulo || "A leitura"}: mostrar o trecho que está sendo lido`}
            dica="Dois toques: onde estou, dito em voz alta"
            className={styles.onde}
            aoToque={ouvir.voltarAoTrecho}
            aoDuplo={() => ouvir.comando({ tipo: "ondeEstou" })}
          >
            {ouvir.rotulo || (ouvir.estado === "parado" ? "Toque em ▶ para começar" : "—")}
          </BotaoGesto>
          {falta && (
            <span className={styles.prazo} title="A leitura para sozinha">
              para em {falta}
            </span>
          )}
          <button type="button" className={styles.iconeTopo} onClick={abrirAjustes} aria-label="Ajustes da leitura em voz alta" title="Ajustes: voz, velocidade, o que ler">
            <Icone>
              <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
              <circle cx="15" cy="7" r="2" />
              <circle cx="9" cy="17" r="2" />
            </Icone>
          </button>
          <button type="button" className={styles.iconeTopo} onClick={ouvir.fechar} aria-label="Fechar a leitura em voz alta" title="Fechar">
            <Icone>
              <path d="M6 6l12 12M18 6L6 18" />
            </Icone>
          </button>
        </div>
        <div className={styles.controles}>
          <BotaoGesto
            id="ouvir-artigo-anterior"
            rotulo={`${sumula ? "Súmula anterior" : "Artigo anterior"}`}
            legenda={artigo}
            dica={`Deslize: escolha ${sumula ? "a súmula" : "o artigo"} · Segure: grifo, estrela, erro${sumula ? "" : ", capítulo"}…`}
            className={styles.controle}
            aoToque={() => ouvir.pularArtigo(-1)}
            deslizar={deslizarPelaLei(ouvir, true, sumula)}
            menu={{ titulo: "Ir para o anterior", itens: () => irParaNaLei(ouvir, -1, sumula) }}
          >
            <Icone>
              <path d="M12 6l-6 6 6 6M18 6l-6 6 6 6" />
            </Icone>
          </BotaoGesto>
          <BotaoGesto
            id="ouvir-trecho-anterior"
            rotulo="Trecho anterior"
            legenda="trecho"
            dica={`Deslize: escolha o trecho · Segure: repetir, do começo${sumula ? "" : ", parágrafo, inciso"}…`}
            className={styles.controle}
            aoToque={() => ouvir.pular(-1)}
            deslizar={deslizarPelaLei(ouvir, false, sumula)}
            menu={{ titulo: sumula ? "Nesta súmula" : "Neste artigo", itens: () => noArtigo(ouvir, -1, sumula) }}
          >
            <Icone>
              <path d="M15 6l-6 6 6 6" />
            </Icone>
          </BotaoGesto>
          <BotaoGesto
            id="ouvir-tocar"
            rotulo={lendo ? "Pausar" : "Continuar a leitura"}
            dica="Dois toques: ler do ponto da tela · Segure: ao fim do artigo, parar sozinho…"
            className={`${styles.controle} ${styles.tocar}`}
            aoToque={ouvir.alternar}
            aoDuplo={() => {
              ouvir.lerDaTela();
              return "Lendo do ponto da tela";
            }}
            menu={{
              titulo: "Leitura",
              itens: () => [
                ...(
                  [
                    ["seguir", "Seguir"],
                    ["repetir", "Repetir"],
                    ["parar", "Pausar"],
                  ] as const
                ).map(([modo, nome]): ItemDoMenu => ({
                  id: `fim-${modo}`,
                  rotulo: nome,
                  grupo: `Ao terminar ${sumula ? "a súmula" : "o artigo"}`,
                  marcado: ouvir.prefs.aoFimDoArtigo === modo,
                  fazer: () => ouvir.comando({ tipo: "aoFimDoArtigo", modo }),
                })),
                ...TEMPOS_DO_MENU.map(
                  ([min, nome]): ItemDoMenu => ({
                    id: `tempo-${min ?? "nao"}`,
                    rotulo: nome,
                    grupo: "Parar sozinho",
                    marcado: min === null ? ouvir.prazo === null : ouvir.prazo?.minutos === min,
                    fazer: () => ouvir.comando({ tipo: "pararEm", minutos: min }),
                  }),
                ),
                { id: "trecho", rotulo: "Voltar ao trecho lido", fazer: ouvir.voltarAoTrecho },
                { id: "onde", rotulo: "Onde estou? (dito em voz alta)", fazer: () => ouvir.comando({ tipo: "ondeEstou" }) },
                { id: "fechar", rotulo: "Fechar a leitura", fazer: ouvir.fechar },
              ],
            }}
          >
            <Icone cheio>{lendo ? <path d="M7 5h4v14H7zM13 5h4v14h-4z" /> : <path d="M8 5v14l11-7z" />}</Icone>
          </BotaoGesto>
          <BotaoGesto
            id="ouvir-trecho-proximo"
            rotulo="Próximo trecho"
            legenda="trecho"
            dica={`Deslize: escolha o trecho · Segure: repetir, do começo${sumula ? "" : ", parágrafo, inciso"}…`}
            className={styles.controle}
            aoToque={() => ouvir.pular(1)}
            deslizar={deslizarPelaLei(ouvir, false, sumula)}
            menu={{ titulo: sumula ? "Nesta súmula" : "Neste artigo", itens: () => noArtigo(ouvir, 1, sumula) }}
          >
            <Icone>
              <path d="M9 6l6 6-6 6" />
            </Icone>
          </BotaoGesto>
          <BotaoGesto
            id="ouvir-artigo-proximo"
            rotulo={sumula ? "Próxima súmula" : "Próximo artigo"}
            legenda={artigo}
            dica={`Deslize: escolha ${sumula ? "a súmula" : "o artigo"} · Segure: grifo, estrela, erro${sumula ? "" : ", capítulo"}…`}
            className={styles.controle}
            aoToque={() => ouvir.pularArtigo(1)}
            deslizar={deslizarPelaLei(ouvir, true, sumula)}
            menu={{ titulo: "Ir para o próximo", itens: () => irParaNaLei(ouvir, 1, sumula) }}
          >
            <Icone>
              <path d="M6 6l6 6-6 6M12 6l6 6-6 6" />
            </Icone>
          </BotaoGesto>
          <BotaoDaVoz id="ouvir-voz" voz={ouvir.prefs} aoMudar={ouvir.mudarPrefs} className={`${styles.controle} ${styles.velocidade}`} classeNumero={styles.numero} />
          {ouvir.podeEscutar && (
            <BotaoGesto
              id="ouvir-microfone"
              rotulo={
                emPausa ? "Microfone em pausa (5 minutos sem ouvir nada): toque para falar" : ouvir.prefs.comandos ? "Comandos de voz ligados: toque para desligar" : "Ligar os comandos de voz"
              }
              legenda={emPausa ? "falar" : "voz"}
              dica="Dois toques: ouvir um comando agora · Segure: o microfone na leitura"
              pressionado={ouvir.prefs.comandos}
              className={`${styles.controle} ${styles.microfone}`}
              atributos={{ "data-ouvindo": ouvindo ? "1" : undefined }}
              aoToque={() => {
                if (emPausa) return ouvir.acordarMicrofone();
                ouvir.alternarComandos();
              }}
              aoDuplo={ouvir.ouvirUmComando}
              menu={{
                titulo: "Microfone",
                itens: () => [
                  ...itensDoMicrofone(ouvir.prefs, ouvir.mudarPrefs, comSensibilidade),
                  { id: "comando", rotulo: "Ouvir um comando agora", fazer: ouvir.ouvirUmComando },
                  { id: "ligar", rotulo: ouvir.prefs.comandos ? "Desligar os comandos de voz" : "Ligar os comandos de voz", fazer: () => ouvir.alternarComandos() },
                  { id: "ajustes", rotulo: "Ajustes e o que dizer…", fazer: abrirAjustes },
                ],
              }}
            >
              <Icone>
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                {!ouvir.prefs.comandos && <path d="M4 4l16 16" />}
              </Icone>
              <AnelDoSom nivel={ouvir.somDoMicrofone} ativo={ouvindo} />
            </BotaoGesto>
          )}
        </div>
      </CamadaDosGestos.Provider>
    </div>
  );
}

/** "▶ Ler daqui": aparece ao tocar num parágrafo com a leitura aberta. */
export function BolhaLerDaqui({ ouvir }: { ouvir: Ouvir }) {
  const b = ouvir.bolha;
  if (!b) return null;
  const largura = 220;
  const left = Math.max(8, Math.min(b.x - largura / 2, window.innerWidth - largura - 8));
  const top = Math.max(8, b.y - 64);
  return (
    <div className={styles.bolha} data-ouvir style={{ left, top, width: largura } as CSSProperties} role="dialog" aria-label="Ler a partir daqui">
      <button
        type="button"
        onClick={() => {
          ouvir.lerDoBloco(b.i);
        }}
      >
        <Icone cheio>
          <path d="M8 5v14l11-7z" />
        </Icone>
        <span>
          <strong>Ler daqui</strong>
          <small>{b.rotulo}</small>
        </span>
      </button>
      <button type="button" className={styles.bolhaFechar} onClick={ouvir.fecharBolha} aria-label="Fechar">
        ✕
      </button>
    </div>
  );
}

const PAUSAS: [number, string][] = [
  [0, "Nenhuma"],
  [700, "Curta"],
  [1500, "Média"],
  [3000, "Longa"],
];
const TEMPOS: [number | null, string][] = [
  [null, "Não"],
  [15, "15 min"],
  [30, "30 min"],
  [45, "45 min"],
  [60, "1 hora"],
];
const ESCUTA: Record<Ouvir["escuta"], string> = {
  desligada: "Desligados.",
  ouvindo: "Ouvindo: pode falar.",
  "em-espera": "Microfone desligado enquanto a voz lê: volta quando ela parar (para falar já, pause a leitura).",
  "em-pausa": "Microfone em pausa: 5 minutos sem ouvir nada (no celular, o sistema bipa a cada vez que ele liga). Toque no microfone da barra para falar.",
  silenciada: "Microfone silenciado: toque no microfone da barra para ouvir de novo.",
  negada: "O microfone está bloqueado para este site.",
  "sem-microfone": "Nenhum microfone encontrado.",
  indisponivel: "Este navegador não reconhece comandos de voz.",
  erro: "O reconhecimento parou de responder.",
};

/** O painel "Ouvir": voz, velocidade, de onde começar, o que ler, quando parar e os comandos de voz. */
export function AjustesOuvir({ ouvir, sumula, fecharPainel }: { ouvir: Ouvir; sumula: boolean; fecharPainel: () => void }) {
  const { prefs, mudarPrefs } = ouvir;
  const [artigo, setArtigo] = useState("");
  const [naoAchou, setNaoAchou] = useState(false);
  const falta = useFalta(ouvir.prazo?.fim ?? null);
  const brasil = ouvir.vozes.filter((v) => /^pt[-_]br/i.test(v.lang));
  const outras = ouvir.vozes.filter((v) => !/^pt[-_]br/i.test(v.lang));
  const ler = (e: FormEvent) => {
    e.preventDefault();
    if (!artigo.trim()) return;
    if (ouvir.lerDoArtigo(artigo)) {
      setNaoAchou(false);
      fecharPainel();
    } else setNaoAchou(true);
  };
  const nome = (v: SpeechSynthesisVoice) => `${v.name}${v.localService ? "" : " · pela internet"}`;
  return (
    <div className={leitor.grupos} data-ouvir>
      {!ouvir.suportado && (
        <p className={styles.alerta} role="alert">
          Este navegador não tem voz para ler em voz alta. No Chrome, no Edge, no Safari e no Firefox recentes ela existe.
        </p>
      )}
      <fieldset>
        <legend>Começar de</legend>
        <div className={styles.comecar}>
          <button
            type="button"
            className="btn btn-sm btn-gold"
            onClick={() => {
              fecharPainel();
              ouvir.lerDaTela();
            }}
          >
            ▶ Do ponto da tela
          </button>
          <form className={styles.irPara} onSubmit={ler}>
            <input
              value={artigo}
              onChange={(e) => {
                setArtigo(e.target.value);
                setNaoAchou(false);
              }}
              inputMode="text"
              placeholder={sumula ? "Súmula (ex.: 711)" : "Artigo (ex.: 121, 121 § 2º, 5 LXIII)"}
              aria-label={sumula ? "Ler a partir da súmula" : "Ler a partir do artigo"}
            />
            <button type="submit" className="btn btn-sm">
              Ler
            </button>
          </form>
        </div>
        {naoAchou && (
          <p className={styles.alerta} role="alert">
            Não achei {sumula ? "essa súmula" : "esse artigo"} no texto à mostra.
          </p>
        )}
        <p className={leitor.miuda}>Com a leitura aberta, toque num parágrafo do texto e em “▶ Ler daqui” para começar dele.</p>
      </fieldset>

      <fieldset>
        <legend>Gestos da barra</legend>
        <details className={styles.dicas}>
          <summary>Além do toque: dois toques, segurar e deslizar</summary>
          <dl className={`${styles.comandos} ${styles.gestos}`}>
            {GESTOS_DO_OUVIR.map(([botao, faz]) => (
              <div key={botao}>
                <dt>{botao}</dt>
                <dd>{faz}</dd>
              </div>
            ))}
          </dl>
          <p>{MENU_SEM_TOQUE}</p>
        </details>
      </fieldset>

      <fieldset>
        <legend>Voz</legend>
        {ouvir.vozes.length ? (
          <label>
            <span className={leitor.miuda}>As vozes são as do seu aparelho; a primeira da lista é a que soa melhor.</span>
            <select value={ouvir.vozAtual?.voiceURI ?? ""} onChange={(e) => mudarPrefs({ voz: e.target.value || null })}>
              {brasil.length > 0 && (
                <optgroup label="Português do Brasil">
                  {brasil.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {nome(v)}
                    </option>
                  ))}
                </optgroup>
              )}
              {outras.length > 0 && (
                <optgroup label="Outros portugueses">
                  {outras.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {nome(v)}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>
        ) : (
          <p className={leitor.miuda}>Nenhuma voz em português apareceu: a leitura usa a voz padrão do aparelho.</p>
        )}
        <div className={leitor.chips}>
          <button type="button" onClick={ouvir.testarVoz}>
            ▶ Ouvir um exemplo
          </button>
        </div>
        <details className={styles.dicas}>
          <summary>Como ter uma voz melhor</summary>
          <ul>
            <li>
              <strong>Android:</strong> Configurações ▸ Sistema ▸ Idiomas ▸ Saída de texto para fala: escolha o “Serviços de fala do Google” e baixe a voz em português (Brasil).
            </li>
            <li>
              <strong>iPhone e iPad:</strong> Ajustes ▸ Acessibilidade ▸ Conteúdo Falado ▸ Vozes ▸ Português (Brasil): baixe uma voz “Melhorada” ou “Premium”.
            </li>
            <li>
              <strong>Computador:</strong> no Edge, as vozes “Natural” (Francisca, Antônio) são as melhores; no Chrome, a “Google português do Brasil”.
            </li>
          </ul>
        </details>
      </fieldset>

      <fieldset>
        <legend>Velocidade · {fmt(prefs.velocidade)}</legend>
        <input
          type="range"
          min={VELOCIDADE_MIN}
          max={VELOCIDADE_MAX}
          step={0.05}
          value={prefs.velocidade}
          onChange={(e) => mudarPrefs({ velocidade: Number(e.target.value) })}
          aria-label="Velocidade da voz"
        />
        <div className={leitor.chips}>
          {[0.8, 1, 1.25, 1.5, 2].map((v) => (
            <button key={v} type="button" aria-pressed={Math.abs(prefs.velocidade - v) < 0.01} onClick={() => mudarPrefs({ velocidade: v })}>
              {fmt(v)}
            </button>
          ))}
        </div>
        <label>
          Tom da voz · {prefs.tom.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
          <input type="range" min={0.5} max={1.5} step={0.05} value={prefs.tom} onChange={(e) => mudarPrefs({ tom: Number(e.target.value) })} />
          <span className={leitor.miuda}>Algumas vozes não mudam de tom.</span>
        </label>
        <label>
          Volume da voz · {Math.round(prefs.volume * 100)}%
          <input type="range" min={0.2} max={1} step={0.1} value={prefs.volume} onChange={(e) => mudarPrefs({ volume: Number(e.target.value) })} />
          <span className={leitor.miuda}>Em relação ao volume do aparelho, que continua valendo (“mais alto” e “mais baixo” também mudam).</span>
        </label>
      </fieldset>

      <fieldset>
        <legend>Ao terminar {sumula ? "a súmula" : "o artigo"}</legend>
        <div className={leitor.opcoesCartao}>
          <OpcaoCartao tipo="radio" nome="ouvir-fim" marcada={prefs.aoFimDoArtigo === "seguir"} titulo={sumula ? "Seguir para a próxima" : "Seguir para o próximo"} dica="Lê a lei em sequência, até o fim." onChange={() => mudarPrefs({ aoFimDoArtigo: "seguir" })} />
          <OpcaoCartao
            tipo="radio"
            nome="ouvir-fim"
            marcada={prefs.aoFimDoArtigo === "repetir"}
            titulo={sumula ? "Repetir a súmula" : "Repetir o artigo"}
            dica="Lê o mesmo trecho de novo, sem parar: bom para decorar."
            onChange={() => mudarPrefs({ aoFimDoArtigo: "repetir" })}
          />
          <OpcaoCartao tipo="radio" nome="ouvir-fim" marcada={prefs.aoFimDoArtigo === "parar"} titulo="Pausar" dica="Pausa no começo do seguinte; ▶ (ou “continua”) segue." onChange={() => mudarPrefs({ aoFimDoArtigo: "parar" })} />
        </div>
        <span className={leitor.miuda}>Pausa entre {sumula ? "as súmulas" : "os artigos"}</span>
        <div className={leitor.chips}>
          {PAUSAS.map(([ms, n]) => (
            <button key={ms} type="button" aria-pressed={prefs.pausaArtigo === ms} onClick={() => mudarPrefs({ pausaArtigo: ms })}>
              {n}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Parar sozinho{falta ? ` · em ${falta}` : ""}</legend>
        <div className={leitor.chips}>
          {TEMPOS.map(([min, n]) => (
            <button key={n} type="button" aria-pressed={min === null ? ouvir.prazo === null : ouvir.prazo?.minutos === min} onClick={() => ouvir.pararDepoisDe(min)}>
              {n}
            </button>
          ))}
        </div>
        <span className={leitor.miuda}>No fim do prazo, a leitura termina o trecho e pausa.</span>
      </fieldset>

      <fieldset>
        <legend>O que ler</legend>
        <div className={leitor.opcoesCartao}>
          {!sumula && (
            <OpcaoCartao tipo="checkbox" marcada={prefs.titulos} titulo="Títulos e capítulos" dica="“Título primeiro. Da aplicação da lei penal.”" onChange={(v) => mudarPrefs({ titulos: v })} />
          )}
          {!sumula && <OpcaoCartao tipo="checkbox" marcada={prefs.rubricas} titulo="Nome acima do artigo" dica="A rubrica: “Homicídio simples”, “Furto qualificado”." onChange={(v) => mudarPrefs({ rubricas: v })} />}
          <OpcaoCartao
            tipo="checkbox"
            marcada={prefs.notas}
            titulo="Anotações entre parênteses"
            dica="“Redação dada pela Lei…”, “Vide…”: só as que estão à mostra (painel Leitura)."
            onChange={(v) => mudarPrefs({ notas: v })}
          />
        </div>
        <p className={leitor.miuda}>
          A leitura segue o que está à mostra: com “Mostrar somente grifos” ou outro filtro, só o que ele mostra; o texto revogado, só com ele ligado.
        </p>
      </fieldset>

      <fieldset>
        <legend>Na tela</legend>
        <div className={leitor.opcoesCartao}>
          <OpcaoCartao tipo="checkbox" marcada={prefs.acompanhar} titulo="Acompanhar a leitura" dica="O texto rola junto, com o trecho lido destacado." onChange={(v) => mudarPrefs({ acompanhar: v })} />
          <OpcaoCartao tipo="checkbox" marcada={prefs.telaLigada} titulo="Manter a tela ligada" dica="A tela não apaga enquanto lê. Com ela apagada, o navegador pode parar a voz." onChange={(v) => mudarPrefs({ telaLigada: v })} />
        </div>
        {prefs.telaLigada && (ouvir.tela === "recusada" || ouvir.tela === "indisponivel" || !telaPodeFicarAcesa()) && (
          <p className={leitor.miuda} role="note">
            {avisoDaTela(ouvir.tela === "recusada" ? "recusada" : "indisponivel")}
          </p>
        )}
      </fieldset>

      <fieldset>
        <legend>Comandos de voz</legend>
        {ouvir.podeEscutar ? (
          <>
            <OpcaoCartao
              tipo="checkbox"
              marcada={prefs.comandos}
              titulo="Ouvir comandos pelo microfone"
              dica={prefs.comandos ? ESCUTA[ouvir.escuta] : "Para controlar sem as mãos: o navegador pede o microfone na primeira vez."}
              onChange={(v) => ouvir.alternarComandos(v)}
            />
            <MicrofoneDosComandos
              prefs={prefs}
              mudarPrefs={mudarPrefs}
              ligada={prefs.comandos}
              escuta={ouvir.escuta}
              microfoneEmUso={ouvir.microfoneEmUso}
              nivelDoMicrofone={ouvir.nivelDoMicrofone}
            />
            <details className={styles.dicas} open>
              <summary>O que dizer</summary>
              <dl className={styles.comandos}>
                {COMANDOS_FALADOS.map(([dizer, faz]) => (
                  <div key={dizer}>
                    <dt>{dizer}</dt>
                    <dd>{faz}</dd>
                  </div>
                ))}
              </dl>
            </details>
            <p className={leitor.miuda}>
              Enquanto a voz lê pelo alto-falante, o microfone também a ouve: diga o comando com clareza, ou use os dois toques no fone (abaixo), que pausam a leitura antes
              de ouvir. O reconhecimento é o do navegador (no Chrome e no Edge, o áudio vai para o serviço de voz deles); o Grifo não grava nada.
            </p>
          </>
        ) : (
          <p className={leitor.miuda}>Este navegador não reconhece comandos de voz. No Chrome, no Edge e no Safari eles funcionam.</p>
        )}
      </fieldset>

      <fieldset>
        <legend>Botões do fone</legend>
        <OpcaoCartao
          tipo="checkbox"
          marcada={prefs.botoesDoFone}
          titulo="Controlar pelos botões do fone"
          dica="E pelas teclas de mídia do teclado. Um toque pausa e continua."
          onChange={(v) => mudarPrefs({ botoesDoFone: v })}
        />
        {prefs.botoesDoFone && (
          <div className={styles.toques}>
            {(
              [
                ["doisToques", "Dois toques"],
                ["tresToques", "Três toques"],
              ] as const
            ).map(([chave, nome]) => (
              <label key={chave}>
                {nome}
                <select value={prefs[chave]} onChange={(e) => mudarPrefs({ [chave]: e.target.value as AcaoDoFone })}>
                  {ACOES_DO_FONE.map(([v, n]) => (
                    <option key={v} value={v} disabled={v === "comando" && !ouvir.podeEscutar}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <p className={leitor.miuda}>
              “Ouvir um comando de voz” pausa a leitura, toca um bipe e ouve um comando (mesmo com os comandos de voz desligados); sem comando, outro bipe, e a leitura
              continua. Os toques variam de fone para fone: os dois toques são o “próxima faixa” do fone, e os três, o “faixa anterior”. Os botões de volume mudam o volume
              do aparelho (o site não os recebe); para a voz, diga “mais alto” ou “mais baixo”.
            </p>
          </div>
        )}
      </fieldset>
    </div>
  );
}
