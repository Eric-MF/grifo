// Configurações centrais do site. Tudo que muda com frequência (links, textos de marca,
// provedores de IA) fica aqui para não precisar caçar pelo código.

export const SITE = {
  nome: "Grifo",
  dominio: "grifo.net.br",
  url: "https://grifo.net.br",
  slogan: "Aprovação na 2ª Fase OAB – Penal",
  descricao:
    "Provas anteriores, gabaritos, simulados com correção automática e jogos para a 2ª fase da OAB em Direito Penal.",
} as const;

/** A imagem da prévia dos links do site nas redes (1200 x 630, em public/). */
export const IMAGEM_COMPARTILHAR = "/compartilhar-1200x630.jpg";

/**
 * Link do Curso Completo OAB – Penal.
 * TODO: preencher quando o curso tiver página própria. Enquanto vazio, os anúncios
 * da casa apontam para a seção #curso da landing.
 */
export const COURSE_URL = "";
export const courseHref = () => COURSE_URL || "/#curso";

/** O que o curso oferece: a seção da página inicial e o resumo do link "Curso" do cabeçalho. */
export const CURSO_ITENS = [
  "Estrutura de todas as peças cobradas pela FGV",
  "Teses recorrentes de Direito Penal e Processo Penal",
  "Correção individual das suas peças",
  "Cronograma até o dia da prova",
] as const;

export const NAV = [
  { href: "/provas/", label: "Provas" },
  { href: "/simulados/", label: "Simulados" },
  { href: "/estatisticas/", label: "Estatísticas" },
  { href: "/leis/", label: "Vade Mecum" },
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

/**
 * O canal do YouTube dos vídeos que aparecem nas perguntas dos jogos (e que dão moedas): o canal do Grifo. Sem vídeos,
 * o banner não aparece. Quando o canal publicar, rodar `node scripts/videos-youtube.ts` para refazer a lista
 * (content/videos-youtube.json).
 */
export const CANAL_VIDEOS = { nome: "Grifo", id: "UCjUg50FbIlF7tXXFzLVz7gw", url: "https://www.youtube.com/@grifo-net-br" } as const;
