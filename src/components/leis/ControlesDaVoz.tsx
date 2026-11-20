"use client";

// Os controles da voz e do microfone com gestos, nas duas barras da leitura em voz alta (o Ouvir do Vade Mecum e o
// microfone do treino): o botão da voz (o toque troca a velocidade, deslizar para os lados a ajusta, para cima e para
// baixo muda o volume, segurar mostra valores prontos) e as opções do microfone no menu de segurar dele.
import { useRef } from "react";
import { BotaoGesto, type ItemDoMenu } from "@/components/BotaoGesto";
import { NA_LEITURA, type NaLeitura, type Sensibilidade } from "@/lib/fala/escuta";
import { VELOCIDADE_MAX, VELOCIDADE_MIN, VOLUME_MIN } from "@/lib/fala/prefs-voz";

/** "1,25×" */
export const fmtVelocidade = (v: number) => `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}×`;
const VELOCIDADES = [0.8, 1, 1.2, 1.4, 1.6, 1.8, 2];
/** A velocidade seguinte do toque: da mais lenta à mais rápida, e volta. */
export const velocidadeSeguinte = (v: number) => VELOCIDADES.find((x) => x > v + 0.001) ?? VELOCIDADES[0]!;
const VELOCIDADES_PRONTAS = [0.8, 1, 1.25, 1.5, 1.75, 2];
const VOLUMES_PRONTOS = [0.4, 0.7, 1];
/** Cada passo do dedo muda a velocidade em 0,05 e o volume em 5%. */
const PASSO_VELOCIDADE = 0.05;
const PASSO_VOLUME = 0.05;
const arredondar = (v: number, min: number, max: number) => Math.round(Math.min(max, Math.max(min, v)) * 100) / 100;
/** A velocidade depois de deslizar `passos` (para a direita, mais rápida). */
export const velocidadeDeslizada = (v: number, passos: number) => arredondar(Math.round((v + passos * PASSO_VELOCIDADE) * 20) / 20, VELOCIDADE_MIN, VELOCIDADE_MAX);
/** O volume depois de deslizar `passos` (para cima, mais alto). */
export const volumeDeslizado = (v: number, passos: number) => arredondar(Math.round((v + passos * PASSO_VOLUME) * 20) / 20, VOLUME_MIN, 1);
const pct = (v: number) => `${Math.round(v * 100)}%`;

export interface VozDaBarra {
  velocidade: number;
  volume: number;
}

/**
 * O botão da voz: o toque troca a velocidade (tocar várias vezes seguidas vai subindo); deslizar para os lados ajusta a
 * velocidade e para cima e para baixo, o volume; segurar mostra velocidades e volumes prontos.
 */
export function BotaoDaVoz({
  id,
  voz,
  aoMudar,
  className,
  legenda = "veloc.",
  classeNumero,
}: {
  id: string;
  voz: VozDaBarra;
  aoMudar: (m: Partial<VozDaBarra>) => void;
  className?: string;
  legenda?: string;
  classeNumero?: string;
}) {
  const partida = useRef(voz);
  const proxima = velocidadeSeguinte(voz.velocidade);
  return (
    <BotaoGesto
      id={id}
      rotulo={`Velocidade ${fmtVelocidade(voz.velocidade)}: toque para ${fmtVelocidade(proxima)}`}
      dica="Deslize para os lados: velocidade · para cima e para baixo: volume · Segure: valores prontos"
      legenda={legenda}
      className={className}
      aoToque={() => {
        aoMudar({ velocidade: proxima });
        return `Velocidade ${fmtVelocidade(proxima)}`;
      }}
      deslizar={{
        eixo: "xy",
        comecar: () => (partida.current = voz),
        previa: (eixo, passos) =>
          eixo === "x"
            ? { texto: `Velocidade ${fmtVelocidade(velocidadeDeslizada(partida.current.velocidade, passos))}`, detalhe: "← mais devagar · mais rápido →" }
            : { texto: `Volume da voz ${pct(volumeDeslizado(partida.current.volume, passos))}`, detalhe: "↓ mais baixo · mais alto ↑" },
        aplicar: (eixo, passos) => {
          if (eixo === "x") {
            const v = velocidadeDeslizada(partida.current.velocidade, passos);
            aoMudar({ velocidade: v });
            return `Velocidade ${fmtVelocidade(v)}`;
          }
          const v = volumeDeslizado(partida.current.volume, passos);
          aoMudar({ volume: v });
          return `Volume da voz ${pct(v)}`;
        },
      }}
      menu={{
        titulo: "Voz",
        itens: () => [
          ...VELOCIDADES_PRONTAS.map(
            (v): ItemDoMenu => ({ id: `vel-${v}`, rotulo: fmtVelocidade(v), grupo: "Velocidade", marcado: Math.abs(voz.velocidade - v) < 0.01, fazer: () => aoMudar({ velocidade: v }) }),
          ),
          ...VOLUMES_PRONTOS.map((v): ItemDoMenu => ({ id: `vol-${v}`, rotulo: pct(v), grupo: "Volume da voz", marcado: Math.abs(voz.volume - v) < 0.01, fazer: () => aoMudar({ volume: v }) })),
        ],
      }}
    >
      <span className={classeNumero}>{fmtVelocidade(voz.velocidade)}</span>
    </BotaoGesto>
  );
}

const SENSIBILIDADES: [Sensibilidade, string][] = [
  ["normal", "Normal"],
  ["alta", "Alta"],
  ["maxima", "Máxima"],
];

/** As opções do microfone no menu de segurar: o que ele faz enquanto a voz lê e (no computador) a sensibilidade. */
export function itensDoMicrofone(
  prefs: { microfoneNaLeitura: NaLeitura; sensibilidade: Sensibilidade },
  aoMudar: (m: { microfoneNaLeitura?: NaLeitura; sensibilidade?: Sensibilidade }) => void,
  comSensibilidade: boolean,
): ItemDoMenu[] {
  const naLeitura = NA_LEITURA.map(
    ([v, nome]): ItemDoMenu => ({ id: `ler-${v}`, rotulo: nome, grupo: "Enquanto a voz lê", marcado: prefs.microfoneNaLeitura === v, fazer: () => aoMudar({ microfoneNaLeitura: v }) }),
  );
  if (!comSensibilidade) return naLeitura;
  return [
    ...naLeitura,
    ...SENSIBILIDADES.map(([v, nome]): ItemDoMenu => ({ id: `sens-${v}`, rotulo: nome, grupo: "Sensibilidade", marcado: prefs.sensibilidade === v, fazer: () => aoMudar({ sensibilidade: v }) })),
  ];
}

/** Os gestos da barra do microfone do treino, para os ajustes (o que cada botão faz além do toque). */
export const GESTOS_DO_TREINO: [string, string][] = [
  ["▶ (ler e pausar)", "Dois toques: a questão do começo. Segure: parar, só as alternativas, a correção, os artigos, os comandos de voz."],
  ["‹ e › (frases)", "Deslize: escolha a frase (o balão mostra o começo dela). Segure: a parte seguinte, repetir a frase, o caso, a pergunta, as alternativas."],
  ["Velocidade", "Toque: a próxima. Deslize para os lados: a velocidade; para cima e para baixo: o volume. Segure: valores prontos."],
  ["Microfone", "Toque: silencia ou volta a ouvir. Dois toques: pausa a leitura para você falar. Segure: o microfone na leitura e a sensibilidade. O anel verde em volta é o som que ele ouve."],
  ["Texto da barra", "Toque: mostra na tela o trecho lido. Dois toques: repete a frase."],
];

/** Os gestos da barra do Ouvir, para os ajustes. */
export const GESTOS_DO_OUVIR: [string, string][] = [
  ["▶ (ler e pausar)", "Dois toques: lê do ponto da tela. Segure: ao terminar o artigo, parar sozinho, onde estou, fechar."],
  ["‹ e › (trechos)", "Deslize: escolha o trecho (o balão diz qual). Segure: repetir o trecho, do começo do artigo, parágrafo, inciso e alínea vizinhos."],
  ["« e » (artigos)", "Deslize: escolha o artigo. Segure: grifo, meu grifo, grifo automático, artigo importante, artigo com erro, capítulo e título vizinhos."],
  ["Velocidade", "Toque: a próxima. Deslize para os lados: a velocidade; para cima e para baixo: o volume. Segure: valores prontos."],
  ["Microfone", "Toque: liga ou desliga os comandos. Dois toques: ouve um comando agora. Segure: o microfone na leitura e a sensibilidade. O anel verde em volta é o som que ele ouve."],
  ["Nome do trecho", "Toque: volta ao trecho lido. Dois toques: onde estou, dito em voz alta."],
];
/** Como abrir o menu de segurar sem o toque. */
export const MENU_SEM_TOQUE = "Com o mouse, o botão direito abre o menu de segurar; no teclado, a tecla de menu (ou Shift+F10).";
