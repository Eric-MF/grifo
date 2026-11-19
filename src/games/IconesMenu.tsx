// Ícones do menu dos jogos: traço simples na cor do texto (o CSS dá a espessura e o tamanho; ver `.icone svg` em
// games.module.css). Os de opção (modo, nível, tipo de pergunta) mostram o que a opção faz.
import type { JSX } from "react";
import type { Categoria } from "@/quiz/types";

const Svg = ({ children }: { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" aria-hidden>
    {children}
  </svg>
);

export const IconeInfo = () => (
  <Svg>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v6M12 7.5v.5" />
  </Svg>
);
export const IconeSom = ({ ligado }: { ligado: boolean }) => (
  <Svg>
    <path d="M4 9h4l5-4v14l-5-4H4z" />
    {ligado ? <path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11" /> : <path d="M16.5 9.5l5 5M21.5 9.5l-5 5" />}
  </Svg>
);
/** Efeitos visuais: brilhos; desligados ("menos efeitos"), riscados. */
export const IconeEfeitos = ({ ligado }: { ligado: boolean }) => (
  <Svg>
    <path d="M10 3l1.6 4.4L16 9l-4.4 1.6L10 15l-1.6-4.4L4 9l4.4-1.6z" />
    <path d="M17.5 13.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" />
    {!ligado && <path d="M3.5 20.5l17-17" />}
  </Svg>
);
/** Poder automático: o raio com a seta girando em volta; desligado, riscado. */
export const IconePoderAuto = ({ ligado }: { ligado: boolean }) => (
  <Svg>
    <path d="M13 3 7 13h5l-1 8 6-10h-5z" />
    <path d="M4.5 8.5A8.5 8.5 0 0 1 9 4M19.5 15.5A8.5 8.5 0 0 1 15 20" />
    {!ligado && <path d="M3.5 20.5l17-17" />}
  </Svg>
);
export const IconeTrofeu = () => (
  <Svg>
    <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
    <path d="M8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3M12 13v4M8 20h8M9 17h6" />
  </Svg>
);
export const IconeHistorico = () => (
  <Svg>
    <path d="M3 12a9 9 0 1 0 2.6-6.4" />
    <path d="M3 4v5h5" />
    <path d="M12 7v5l3 2" />
  </Svg>
);
export const IconeLiberado = () => (
  <Svg>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 7.7-1.5" />
  </Svg>
);
export const IconeFechar = () => (
  <Svg>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);
export const IconeCadeado = () => (
  <Svg>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </Svg>
);
export const IconeSeta = () => (
  <Svg>
    <path d="M12 5v14M6 13l6 6 6-6" />
  </Svg>
);

/** Modo "Escolhido": os controles que você mesmo ajusta. */
export const IconeEscolhido = () => (
  <Svg>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </Svg>
);
/** Modo "Automático": a seta que sobe sozinha de degrau em degrau. */
export const IconeAutomatico = () => (
  <Svg>
    <path d="M4 19h4v-4h4v-4h4V7h4" />
    <path d="M15 4h5v5" />
  </Svg>
);
/** Nível 1 a 3: as barras de força, cheias até o nível. */
export const IconeNivel = ({ n }: { n: number }) => (
  <svg viewBox="0 0 24 24" aria-hidden>
    {[0, 1, 2].map((i) => (
      <rect key={i} x={4 + i * 6} y={16 - i * 5} width="4" height={4 + i * 5} rx="1" data-cheio={i < n || undefined} />
    ))}
  </svg>
);

/** Ícone de cada tipo de pergunta. */
export const ICONES_CATEGORIA: Record<Categoria, () => JSX.Element> = {
  // a peça: a folha com o selo
  peca: () => (
    <Svg>
      <path d="M6 3h9l3 3v15H6z" />
      <path d="M9 9h6M9 12h6" />
      <circle cx="12" cy="17" r="2" />
    </Svg>
  ),
  // por dentro da peça: a folha e a lupa
  "peca-detalhe": () => (
    <Svg>
      <path d="M5 3h8l3 3v5M5 3v18h7" />
      <path d="M8 8h5M8 11h3" />
      <circle cx="16" cy="16" r="3" />
      <path d="M18.2 18.2 21 21" />
    </Svg>
  ),
  // discursiva: a caneta escrevendo nas linhas
  discursiva: () => (
    <Svg>
      <path d="M4 20h7M4 16h4" />
      <path d="M14.5 4.5l5 5L11 18l-5 1 1-5z" />
    </Svg>
  ),
  // objetiva: as alternativas, uma marcada
  objetiva: () => (
    <Svg>
      <rect x="4" y="4" width="4" height="4" rx="1" />
      <rect x="4" y="10" width="4" height="4" rx="1" />
      <rect x="4" y="16" width="4" height="4" rx="1" />
      <path d="M11 6h9M11 12h9M11 18h9M5 12l1 1 1.5-2" />
    </Svg>
  ),
};
