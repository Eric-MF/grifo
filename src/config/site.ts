// Configurações centrais do site. Tudo que muda com frequência (links, textos de marca,
// provedores de IA) fica aqui para não precisar caçar pelo código.

export const SITE = {
  nome: "Grifo",
  dominio: "www.grifo.com",
  url: "https://www.grifo.com",
  slogan: "Aprovação na 2ª Fase OAB – Penal",
  descricao:
    "Provas anteriores, gabaritos, simulados com correção automática e jogos para a 2ª fase da OAB em Direito Penal.",
} as const;

/**
 * Link do Curso Completo OAB – Penal.
 * TODO: preencher quando o curso tiver página própria. Enquanto vazio, os anúncios
 * da casa apontam para a seção #curso da landing.
 */
export const COURSE_URL = "";
export const courseHref = () => COURSE_URL || "/#curso";

export const NAV = [
  { href: "/provas/", label: "Provas" },
  { href: "/simulados/", label: "Simulados" },
  { href: "/leis/", label: "Lei seca" },
  { href: "/jogos/", label: "Jogos" },
  { href: "/#curso", label: "Curso" },
] as const;

/**
 * E-mails de contato. O "+" é a marcação do Gmail: sugestões e erros chegam na mesma caixa,
 * separados pelo endereço.
 */
export const CONTATO = {
  sugestao: "contatos.grifo+sugestoes@gmail.com",
  erro: "contatos.grifo+erro@gmail.com",
} as const;

/** Link mailto para sugerir ou relatar erro. Com `questao` (id da pergunta), o corpo já traz o id. */
export function linkContato(tipo: keyof typeof CONTATO, questao?: string): string {
  const assunto = tipo === "erro" ? "Grifo: erro" : "Grifo: sugestão";
  const corpo = questao ? `Questão: ${questao}\n\n` : "";
  // com a questão, o assunto traz o mesmo texto do corpo logo em frente: quem vê só o assunto já sabe qual é a questão
  const assuntoCompleto = questao ? `${assunto} — Questão: ${questao}` : assunto;
  return `mailto:${CONTATO[tipo]}?subject=${encodeURIComponent(assuntoCompleto)}${corpo ? `&body=${encodeURIComponent(corpo)}` : ""}`;
}

/**
 * Rede de anúncios. Enquanto `provider` for "none", os espaços do tipo "ad"
 * mostram um anúncio da casa. Para AdSense: provider "adsense" + client "ca-pub-…"
 * (e os slots em content/promos.yaml).
 */
export const ADS = {
  provider: "none" as "none" | "adsense",
  client: "",
};
