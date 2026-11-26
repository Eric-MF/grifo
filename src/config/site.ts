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

/** Quem responde pelos dados pessoais do site (o controlador, na LGPD) e o canal dos pedidos de privacidade. */
export const CONTROLADOR = { nome: "Eric Mussi Fernandes", email: "contatos.grifo@gmail.com" } as const;
/** A data da versão da política de privacidade (/privacidade/). */
export const PRIVACIDADE_ATUALIZADA = "2026-11-25";

/**
 * O Google Tag Manager do site. Só existe no domínio publicado (grifo.net.br): o servidor de desenvolvimento, os
 * testes e as prévias locais não mandam visitas para o Google. E só carrega depois que a pessoa aceita os cookies de
 * estatística (o aviso de cookies): sem a escolha, ou recusando, nada vai para o Google. Vazio desliga a tag.
 */
export const GTM_ID = "GTM-58FT9VPR";
export const DOMINIOS_COM_TAG: readonly string[] = [SITE.dominio, `www.${SITE.dominio}`];
/** Onde fica a escolha do aviso de cookies: "aceito" ou "recusado" (texto puro, lido também pelo script do <head>). */
export const CHAVE_CONSENTIMENTO = "grifo:consentimento";

/**
 * O script da tag (no <head>): o Modo de consentimento do Google começa negando tudo; com a escolha "aceito" guardada,
 * libera as estatísticas e carrega o contêiner. `window.__grifoTag(escolha)` aplica uma escolha nova sem recarregar.
 * Os cookies de anúncio ficam sempre negados (o site não tem anúncios).
 */
export const GTM_SCRIPT = GTM_ID
  ? `(function(){if(${JSON.stringify(DOMINIOS_COM_TAG)}.indexOf(location.hostname)<0)return;var w=window,d=document;w.dataLayer=w.dataLayer||[];function gtag(){w.dataLayer.push(arguments);}w.gtag=gtag;var c=null;try{c=localStorage.getItem(${JSON.stringify(CHAVE_CONSENTIMENTO)})}catch(_){}gtag("consent","default",{ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied",analytics_storage:c==="aceito"?"granted":"denied"});var feito=false;function carregar(){if(feito)return;feito=true;gtag("js",new Date());w.dataLayer.push({"gtm.start":new Date().getTime(),event:"gtm.js"});var s=d.createElement("script");s.async=true;s.src="https://www.googletagmanager.com/gtm.js?id=${GTM_ID}";d.head.appendChild(s);}w.__grifoTag=function(e){gtag("consent","update",{analytics_storage:e==="aceito"?"granted":"denied"});if(e==="aceito")carregar();};if(c==="aceito")carregar();})();`
  : "";
