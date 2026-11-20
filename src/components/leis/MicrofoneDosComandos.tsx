"use client";

// O microfone que ouve a voz da pessoa, nos ajustes do Ouvir (os comandos de voz) e do treino (responder falando): qual
// microfone (no Chrome e no Edge do computador), com quanto reforço, o nível do som e o que ele faz enquanto a voz lê.
// As preferências são as mesmas nos dois lugares (grifo:leitor:ouvir).
import { useEffect, useRef, useState } from "react";
import { NA_LEITURA, listarMicrofones, ouveMicrofoneEscolhido, type EstadoEscuta, type NaLeitura, type Sensibilidade } from "@/lib/fala/escuta";
import { ehVirtual, nomeDoMicrofone, type Microfone } from "@/lib/fala/microfone";
import leitor from "./leitor.module.css";
import styles from "./ouvir.module.css";

export interface PrefsMicrofone {
  /** "auto" (evita o do fone Bluetooth), "padrao" ou o deviceId */
  microfone: string;
  sensibilidade: Sensibilidade;
  microfoneNaLeitura: NaLeitura;
}

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

/** Enquanto a voz lê: o microfone fica ouvindo, fecha sempre, ou fecha só quando é o do fone Bluetooth. */
function NaLeituraEscolha({ valor, aoMudar, emEspera }: { valor: NaLeitura; aoMudar: (v: NaLeitura) => void; emEspera: boolean }) {
  const dica = NA_LEITURA.find(([v]) => v === valor)?.[2];
  return (
    <>
      <span className={leitor.miuda}>Enquanto a voz lê, o microfone</span>
      <div className={leitor.chips} role="group" aria-label="O microfone enquanto a voz lê">
        {NA_LEITURA.map(([v, n]) => (
          <button key={v} type="button" aria-pressed={valor === v} onClick={() => aoMudar(v)}>
            {n}
          </button>
        ))}
      </div>
      <span className={leitor.miuda}>
        {dica}
        {emEspera && <strong> Agora: desligado, volta quando a voz parar.</strong>}
      </span>
    </>
  );
}

export function MicrofoneDosComandos({
  prefs,
  mudarPrefs,
  ligada,
  escuta,
  microfoneEmUso,
  nivelDoMicrofone,
}: {
  prefs: PrefsMicrofone;
  mudarPrefs: (p: Partial<PrefsMicrofone>) => void;
  /** a escuta está ligada (os comandos de voz, ou o responder falando) */
  ligada: boolean;
  escuta: EstadoEscuta;
  /** o microfone que está ouvindo; null: o padrão do sistema; undefined: ainda não se sabe */
  microfoneEmUso: string | null | undefined;
  nivelDoMicrofone: () => number | null;
}) {
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
  }, [microfoneEmUso]);
  const naLeitura = <NaLeituraEscolha valor={prefs.microfoneNaLeitura} aoMudar={(v) => mudarPrefs({ microfoneNaLeitura: v })} emEspera={ligada && escuta === "em-espera"} />;
  if (!escolhe)
    return (
      <div className={styles.microfoneCaixa}>
        {naLeitura}
        <details className={styles.dicas}>
          <summary>Fone Bluetooth com o som pior ao ligar o microfone?</summary>
          <p>
            Quando o microfone do fone é usado, o sistema troca o fone para o modo de chamada, com som pior. Neste navegador, o Grifo não escolhe o microfone: escolha o do
            computador como entrada padrão do sistema (Windows: Configurações ▸ Sistema ▸ Som ▸ Entrada; Mac: Ajustes do Sistema ▸ Som ▸ Entrada), ou deixe o microfone
            desligado enquanto a voz lê (acima). No Chrome e no Edge do computador, o Grifo escolhe o microfone sozinho.
          </p>
        </details>
      </div>
    );
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
        Com fone Bluetooth, usar o microfone dele faz o sistema trocar o som para o modo de chamada (o “Headset”, pior). No automático, se o padrão for o do fone (ou o de um
        aplicativo que usa o celular como microfone), o Grifo ouve pelo microfone do computador.
        {ligada && microfoneEmUso !== undefined && (
          <strong>
            {" "}
            {escuta === "em-espera" ? "Vai ouvir pelo" : "Ouvindo pelo"}: {microfoneEmUso ? nomeDoMicrofone(microfoneEmUso) : "padrão do sistema"}.
          </strong>
        )}
      </span>
      {naLeitura}
      <span className={leitor.miuda}>Sensibilidade (para o microfone longe, como o do notebook)</span>
      <div className={leitor.chips}>
        {SENSIBILIDADES.map(([v, n]) => (
          <button key={v} type="button" aria-pressed={prefs.sensibilidade === v} onClick={() => mudarPrefs({ sensibilidade: v })}>
            {n}
          </button>
        ))}
      </div>
      {ligada && escuta === "ouvindo" && <NivelDoMicrofone nivel={nivelDoMicrofone} />}
    </div>
  );
}
