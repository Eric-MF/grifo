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
 * Rede de anúncios. Enquanto `provider` for "none", os espaços do tipo "ad"
 * mostram um anúncio da casa. Para AdSense: provider "adsense" + client "ca-pub-…"
 * (e os slots em content/promos.yaml).
 */
export const ADS = {
  provider: "none" as "none" | "adsense",
  client: "",
};
