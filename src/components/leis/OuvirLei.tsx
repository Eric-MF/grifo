"use client";

// A leitura em voz alta no leitor: a barra de controles (presa embaixo enquanto a leitura está aberta), o "▶ Ler daqui" do
// parágrafo tocado e o painel de ajustes (voz, velocidade, o que ler, quando parar, comandos de voz, microfone e botões do
// fone). O motor é useOuvir.
import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { avisoDaTela, telaPodeFicarAcesa } from "@/lib/tela-acesa";
import { COMANDOS_FALADOS } from "@/lib/fala/comandos-voz";
import { listarMicrofones, ouveMicrofoneEscolhido, type Sensibilidade } from "@/lib/fala/escuta";
import { ACOES_DO_FONE, type AcaoDoFone } from "@/lib/fala/fone";
import { ehVirtual, nomeDoMicrofone, type Microfone } from "@/lib/fala/microfone";
import { VELOCIDADE_MAX, VELOCIDADE_MIN, type Ouvir } from "./useOuvir";
import { OpcaoCartao } from "./OpcaoCartao";
import leitor from "./leitor.module.css";
import styles from "./ouvir.module.css";

const VELOCIDADES = [0.8, 1, 1.2, 1.4, 1.6, 1.8, 2];
const fmt = (v: number) => `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}×`;

function Icone({ children, cheio = false }: { children: ReactNode; cheio?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cheio ? styles.iconeCheio : styles.icone}>
      {children}
    </svg>
  );
}

/** Um botão da barra: o ícone e, embaixo, o que ele faz (o toque não mostra o title). */
function Controle({ rotulo, legenda, onClick, children, className, pressionado, extra }: { rotulo: string; legenda?: string; onClick: () => void; children: ReactNode; className?: string; pressionado?: boolean; extra?: Record<string, string | undefined> }) {
  return (
    <button type="button" className={`${styles.controle} ${className ?? ""}`} aria-label={rotulo} title={rotulo} aria-pressed={pressionado} onClick={onClick} {...extra}>
      {children}
      {legenda && <span className={styles.legenda}>{legenda}</span>}
    </button>
  );
}

const ESTADO: Record<Ouvir["estado"], string> = { lendo: "Lendo", pausado: "Pausado", parado: "Parado" };

/** O tempo que falta para a leitura parar sozinha ("12 min"), atualizado a cada 20 s. */
function useFalta(prazo: number | null): string | null {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    if (prazo === null) return;
    const t = window.setInterval(() => setAgora(Date.now()), 20_000);
    return () => window.clearInterval(t);
  }, [prazo]);
  if (prazo === null) return null;
  const min = Math.max(0, Math.ceil((prazo - agora) / 60_000));
  return min >= 60 ? `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60}` : ""}` : `${min} min`;
}

/** A barra presa embaixo: o que está sendo lido, tocar/pausar, trecho e artigo vizinhos, velocidade e comandos de voz. */
export function BarraOuvir({ ouvir, dockVisivel, painelAberto, abrirAjustes }: { ouvir: Ouvir; dockVisivel: boolean; painelAberto: boolean; abrirAjustes: () => void }) {
  const falta = useFalta(ouvir.prazo?.fim ?? null);
  if (!ouvir.ativo) return null;
  const lendo = ouvir.estado === "lendo";
  const proxima = VELOCIDADES.find((v) => v > ouvir.prefs.velocidade + 0.001) ?? VELOCIDADES[0]!;
  const ouvindo = (ouvir.prefs.comandos || ouvir.esperandoComando) && ouvir.escuta === "ouvindo";
  return (
    <div className={styles.barra} data-barra-ouvir data-ouvir data-dock={dockVisivel ? "1" : "0"} data-painel={painelAberto ? "1" : undefined} role="region" aria-label="Leitura em voz alta">
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
        <button type="button" className={styles.onde} onClick={ouvir.voltarAoTrecho} title="Mostrar o trecho que está sendo lido">
          {ouvir.rotulo || (ouvir.estado === "parado" ? "Toque em ▶ para começar" : "—")}
        </button>
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
        <Controle rotulo="Artigo anterior" legenda="artigo" onClick={() => ouvir.pularArtigo(-1)}>
          <Icone>
            <path d="M12 6l-6 6 6 6M18 6l-6 6 6 6" />
          </Icone>
        </Controle>
        <Controle rotulo="Trecho anterior" legenda="trecho" onClick={() => ouvir.pular(-1)}>
          <Icone>
            <path d="M15 6l-6 6 6 6" />
          </Icone>
        </Controle>
        <Controle rotulo={lendo ? "Pausar" : "Continuar a leitura"} className={styles.tocar} onClick={ouvir.alternar}>
          <Icone cheio>{lendo ? <path d="M7 5h4v14H7zM13 5h4v14h-4z" /> : <path d="M8 5v14l11-7z" />}</Icone>
        </Controle>
        <Controle rotulo="Próximo trecho" legenda="trecho" onClick={() => ouvir.pular(1)}>
          <Icone>
            <path d="M9 6l6 6-6 6" />
          </Icone>
        </Controle>
        <Controle rotulo="Próximo artigo" legenda="artigo" onClick={() => ouvir.pularArtigo(1)}>
          <Icone>
            <path d="M6 6l6 6-6 6M12 6l6 6-6 6" />
          </Icone>
        </Controle>
        <Controle rotulo={`Velocidade ${fmt(ouvir.prefs.velocidade)}: toque para ${fmt(proxima)}`} legenda="veloc." className={styles.velocidade} onClick={() => ouvir.mudarVelocidade(proxima - ouvir.prefs.velocidade)}>
          <span className={styles.numero}>{fmt(ouvir.prefs.velocidade)}</span>
        </Controle>
        {ouvir.podeEscutar && (
          <Controle
            rotulo={ouvir.prefs.comandos ? "Comandos de voz ligados: toque para desligar" : "Ligar os comandos de voz"}
            legenda="voz"
            pressionado={ouvir.prefs.comandos}
            className={styles.microfone}
            extra={{ "data-ouvindo": ouvindo ? "1" : undefined }}
            onClick={() => ouvir.alternarComandos()}
          >
            <Icone>
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
              {!ouvir.prefs.comandos && <path d="M4 4l16 16" />}
            </Icone>
          </Controle>
        )}
      </div>
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
const SENSIBILIDADES: [Sensibilidade, string][] = [
  ["normal", "Normal"],
  ["alta", "Alta"],
  ["maxima", "Máxima"],
];

/** O nível do som que o microfone ouve: a barra enche com a voz. */
function NivelDoMicrofone({ nivel }: { nivel: () => number | null }) {
  const barra = useRef<HTMLSpanElement>(null);
  const [medido, setMedido] = useState(true);
  useEffect(() => {
    let quadro = 0;
    let ultimo = true;
    const passo = () => {
      const n = nivel();
      if (barra.current) barra.current.style.width = `${Math.round((n ?? 0) * 100)}%`;
      if ((n !== null) !== ultimo) setMedido((ultimo = n !== null));
      quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [nivel]);
  if (!medido) return null;
  return (
    <div className={styles.nivelCaixa}>
      <span className={styles.nivel} role="img" aria-label="Nível do som do microfone">
        <span ref={barra} />
      </span>
      <span className={leitor.miuda}>Fale um comando: com a voz normal, a barra deve passar do meio. Se não passar, aumente a sensibilidade.</span>
    </div>
  );
}

/** O microfone dos comandos (no Chrome e no Edge do computador): qual, com quanto reforço, e o nível do som. */
function MicrofoneDosComandos({ ouvir }: { ouvir: Ouvir }) {
  const { prefs, mudarPrefs } = ouvir;
  const [escolhe, setEscolhe] = useState(false);
  const [lista, setLista] = useState<Microfone[]>([]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- o teste do navegador só roda no cliente
    setEscolhe(ouveMicrofoneEscolhido());
    let vivo = true;
    const carregar = () =>
      void listarMicrofones().then((l) => {
        if (vivo) setLista(l.filter((m) => m.rotulo && m.id && m.id !== "default" && m.id !== "communications" && !ehVirtual(m.rotulo)));
      });
    carregar();
    navigator.mediaDevices?.addEventListener?.("devicechange", carregar);
    return () => {
      vivo = false;
      navigator.mediaDevices?.removeEventListener?.("devicechange", carregar);
    };
    // os nomes aparecem depois da permissão do microfone: a lista é lida de novo quando ele abre
  }, [ouvir.microfoneEmUso]);
  if (!escolhe)
    return (
      <details className={styles.dicas}>
        <summary>Fone Bluetooth com o som pior ao ligar os comandos?</summary>
        <p>
          Quando o microfone do fone é usado, o sistema troca o fone para o modo de chamada, com som pior. Neste navegador, o Grifo não escolhe o microfone: escolha o do
          computador como entrada padrão do sistema (Windows: Configurações ▸ Sistema ▸ Som ▸ Entrada; Mac: Ajustes do Sistema ▸ Som ▸ Entrada). No Chrome e no Edge do
          computador, o Grifo faz isso sozinho.
        </p>
      </details>
    );
  const emUso = ouvir.microfoneEmUso;
  return (
    <div className={styles.microfoneCaixa}>
      <label>
        Microfone
        <select value={prefs.microfone} onChange={(e) => mudarPrefs({ microfone: e.target.value })}>
          <option value="auto">Automático: evita o do fone Bluetooth</option>
          <option value="padrao">O padrão do sistema</option>
          {lista.map((m) => (
            <option key={m.id} value={m.id}>
              {nomeDoMicrofone(m.rotulo)}
            </option>
          ))}
        </select>
      </label>
      <span className={leitor.miuda}>
        Com fone Bluetooth, usar o microfone dele faz o sistema trocar o som para o modo de chamada (pior). No automático, se o padrão for o do fone, o Grifo ouve pelo
        microfone do computador.
        {prefs.comandos && emUso !== undefined && <strong> Ouvindo pelo: {emUso ? nomeDoMicrofone(emUso) : "padrão do sistema"}.</strong>}
      </span>
      <span className={leitor.miuda}>Sensibilidade (para o microfone longe, como o do notebook)</span>
      <div className={leitor.chips}>
        {SENSIBILIDADES.map(([v, n]) => (
          <button key={v} type="button" aria-pressed={prefs.sensibilidade === v} onClick={() => mudarPrefs({ sensibilidade: v })}>
            {n}
          </button>
        ))}
      </div>
      {ouvir.escuta === "ouvindo" && <NivelDoMicrofone nivel={ouvir.nivelDoMicrofone} />}
    </div>
  );
}

const ESCUTA: Record<Ouvir["escuta"], string> = {
  desligada: "Desligados.",
  ouvindo: "Ouvindo: pode falar.",
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
            <MicrofoneDosComandos ouvir={ouvir} />
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
