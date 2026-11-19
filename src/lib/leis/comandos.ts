// Comandos da caixa "Ir para" do leitor: "/telacheia", "/escuro" etc. Só descreve e encontra; quem executa é o leitor.

import { semAcento } from "./busca";

export type IdComando =
  | "telacheia" | "escuro" | "papel" | "branco" | "sepia" | "verde"
  | "maior" | "menor" | "semserifa" | "serifada" | "mono"
  | "original" | "revogados" | "vide" | "anotacoes" | "informacoes" | "planalto" | "prontos" | "erros"
  | "tudo" | "sogrifos" | "soerros" | "soautomaticos"
  | "grifar" | "borracha" | "grifos" | "buscar" | "leis" | "indice" | "remissivo" | "leitura" | "mais"
  | "inicio" | "fim" | "parei" | "compartilhar" | "imprimir" | "barra" | "ouvir" | "comandos";

export interface Comando {
  id: IdComando;
  /** o que se digita depois da barra, já normalizado ("telacheia") */
  nome: string;
  /** outros nomes aceitos, normalizados */
  apelidos: string[];
  /** o que o comando faz, para a lista da caixa */
  titulo: string;
  /** só nas leis (não nas súmulas) / só nas súmulas */
  soLeis?: boolean;
  soSumulas?: boolean;
}

/** minúsculo, sem acento e só letras e algarismos: "Tela-Cheia" → "telacheia" */
export function normalizarComando(s: string): string {
  return semAcento(s).replace(/[^a-z0-9]/g, "");
}

/** o texto da caixa é um comando: começa por "/" (espaços antes não contam) */
export function ehComando(consulta: string): boolean {
  return /^\s*\//.test(consulta);
}

// os comandos que valem para a lei ou para a súmula
function disponiveis(opcoes: { sumula: boolean }): Comando[] {
  return COMANDOS.filter((c) => !(c.soLeis && opcoes.sumula) && !(c.soSumulas && !opcoes.sumula));
}

/** os comandos que servem para o que foi digitado ("/es" → escuro…), na ordem da lista; "/" sozinho → todos */
export function comandosPara(consulta: string, opcoes: { sumula: boolean }): Comando[] {
  if (!ehComando(consulta)) return [];
  const q = normalizarComando(consulta.trimStart().slice(1));
  const lista = disponiveis(opcoes);
  if (!q) return lista;
  // grupos na ordem de prioridade: exato, começa pelo nome, começa por apelido, contém
  const grupos: ((c: Comando) => boolean)[] = [
    (c) => c.nome === q || c.apelidos.includes(q),
    (c) => c.nome.startsWith(q),
    (c) => c.apelidos.some((a) => a.startsWith(q)),
    (c) => c.nome.includes(q) || c.apelidos.some((a) => a.includes(q)),
  ];
  const saida: Comando[] = [];
  for (const casa of grupos) {
    for (const c of lista) {
      if (!saida.includes(c) && casa(c)) saida.push(c);
    }
  }
  return saida;
}

/** o comando com esse nome ou apelido exato, ou null */
export function comandoExato(consulta: string, opcoes: { sumula: boolean }): Comando | null {
  if (!ehComando(consulta)) return null;
  const q = normalizarComando(consulta.trimStart().slice(1));
  return disponiveis(opcoes).find((c) => c.nome === q || c.apelidos.includes(q)) ?? null;
}

export const COMANDOS: Comando[] = [
  { id: "telacheia", nome: "telacheia", apelidos: ["cheia", "fullscreen"], titulo: "Tela cheia (liga e desliga)" },
  { id: "escuro", nome: "escuro", apelidos: ["noturno", "dark", "preto"], titulo: "Fundo escuro" },
  { id: "papel", nome: "papel", apelidos: ["claro"], titulo: "Fundo papel" },
  { id: "branco", nome: "branco", apelidos: [], titulo: "Fundo branco" },
  { id: "sepia", nome: "sepia", apelidos: [], titulo: "Fundo sépia" },
  { id: "verde", nome: "verde", apelidos: [], titulo: "Fundo verde" },
  { id: "maior", nome: "maior", apelidos: ["aumentar"], titulo: "Letra maior" },
  { id: "menor", nome: "menor", apelidos: ["diminuir"], titulo: "Letra menor" },
  { id: "semserifa", nome: "semserifa", apelidos: ["sans"], titulo: "Letra sem serifa" },
  { id: "serifada", nome: "serifada", apelidos: ["serifa", "serif"], titulo: "Letra serifada" },
  { id: "mono", nome: "mono", apelidos: ["monoespacada"], titulo: "Letra monoespaçada" },
  { id: "original", nome: "original", apelidos: ["redacaooriginal"], titulo: "Redação original do Planalto (liga e desliga)", soLeis: true },
  { id: "revogados", nome: "revogados", apelidos: ["revogado", "superadas", "canceladas"], titulo: "Texto revogado e redações anteriores (liga e desliga)" },
  { id: "vide", nome: "vide", apelidos: ["remissoes"], titulo: "“Vide” entre parênteses (liga e desliga)" },
  { id: "anotacoes", nome: "anotacoes", apelidos: ["redacao", "notas"], titulo: "Anotações de redação (liga e desliga)", soLeis: true },
  { id: "informacoes", nome: "informacoes", apelidos: ["info"], titulo: "Informações adicionais das súmulas (liga e desliga)", soSumulas: true },
  { id: "planalto", nome: "planalto", apelidos: ["links"], titulo: "Abrir as referências no Planalto (liga e desliga)", soLeis: true },
  { id: "prontos", nome: "prontos", apelidos: ["grifosprontos"], titulo: "Grifos prontos do Grifo (liga e desliga)", soLeis: true },
  { id: "erros", nome: "erros", apelidos: ["errei", "maiserrei"], titulo: "Marcar os artigos em que mais errei (liga e desliga)", soLeis: true },
  { id: "tudo", nome: "tudo", apelidos: ["todos", "textointeiro"], titulo: "Mostrar tudo" },
  { id: "sogrifos", nome: "sogrifos", apelidos: ["meusgrifos"], titulo: "Mostrar somente os meus grifos" },
  { id: "soerros", nome: "soerros", apelidos: [], titulo: "Mostrar apenas os erros", soLeis: true },
  { id: "soautomaticos", nome: "soautomaticos", apelidos: ["soprontos", "automaticos"], titulo: "Mostrar somente grifos automáticos", soLeis: true },
  { id: "grifar", nome: "grifar", apelidos: ["marcador", "marcatexto"], titulo: "Grifar (liga e desliga o marcador)" },
  { id: "borracha", nome: "borracha", apelidos: ["apagar"], titulo: "Borracha (apaga grifos)" },
  { id: "grifos", nome: "grifos", apelidos: ["sistemas", "cores"], titulo: "Meus grifos e sistemas de cores" },
  { id: "buscar", nome: "buscar", apelidos: ["busca", "procurar"], titulo: "Buscar em todas as leis" },
  { id: "leis", nome: "leis", apelidos: ["trocar", "outralei"], titulo: "Abrir outra lei" },
  { id: "indice", nome: "indice", apelidos: ["sumario", "divisoes", "titulos"], titulo: "Índice: títulos e capítulos" },
  { id: "remissivo", nome: "remissivo", apelidos: ["indiceremissivo"], titulo: "Índice remissivo", soLeis: true },
  { id: "leitura", nome: "leitura", apelidos: ["aa", "letra", "fonte"], titulo: "Opções de leitura (letra, fundo, filtros)" },
  { id: "mais", nome: "mais", apelidos: ["opcoes", "menu"], titulo: "Mais opções" },
  { id: "inicio", nome: "inicio", apelidos: ["topo", "comeco"], titulo: "Ir ao início" },
  { id: "fim", nome: "fim", apelidos: ["final"], titulo: "Ir ao fim" },
  { id: "parei", nome: "parei", apelidos: ["ondeparei", "continuar"], titulo: "Voltar para onde parei" },
  { id: "compartilhar", nome: "compartilhar", apelidos: ["link"], titulo: "Compartilhar" },
  { id: "imprimir", nome: "imprimir", apelidos: ["pdf"], titulo: "Imprimir ou salvar em PDF" },
  { id: "ouvir", nome: "ouvir", apelidos: ["voz", "ler", "audio", "falar", "escutar", "vozalta"], titulo: "Ouvir a lei em voz alta" },
  { id: "barra", nome: "barra", apelidos: ["rolagem", "barradorolagem"], titulo: "Barra de rolagem do navegador (liga e desliga)" },
  { id: "comandos", nome: "comandos", apelidos: ["ajuda", "help"], titulo: "Lista dos comandos" },
];
