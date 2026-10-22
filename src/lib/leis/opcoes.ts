// Opções de texto: as mesmas no leitor da lei e na criação do Vade Mecum. Ficam aqui (sem componentes) para que
// os dois usem os mesmos nomes e padrões.

export type Fonte = "sans" | "serif" | "mono";
export type Fundo = "papel" | "branco" | "sepia" | "verde" | "escuro";
export type CorTexto = "padrao" | "preto" | "azul" | "cinza" | "marrom";
/** o que a lei mostra: o texto inteiro (ou os artigos escolhidos), só os grifos do usuário, só os artigos em que ele errou, ou só os grifos automáticos (temas de prova do Grifo) */
export type Filtro = "tudo" | "grifos" | "erros" | "automaticos";

export interface OpcoesTexto {
  fonte: Fonte;
  tamanho: number;
  entrelinha: number;
  fundo: Fundo;
  /** "padrao" segue a cor do fundo; as demais trocam a cor das letras */
  corTexto: CorTexto;
  /** texto revogado e redações anteriores */
  revogados: boolean;
  /** notas de redação: "Redação dada pela Lei…", "Incluído…", "Revogado…" */
  anotacoes: boolean;
  /** remissões entre parênteses: "(Vide EC 132/2023)", "(Vide art. 5º…)". Não são as de revogação. */
  vide: boolean;
  /** o ● ao lado dos artigos em que o usuário mais erra */
  erros: boolean;
  /** temas de prova destacados pelo Grifo (não são grifos do usuário) */
  prontos: boolean;
  /** os grifos e anotações do próprio usuário */
  grifos: boolean;
  /** para onde vão as referências ("art. 121"): ao texto do Grifo ou ao do Planalto */
  destino: "grifo" | "planalto";
}

export const OPCOES_TEXTO_PADRAO: OpcoesTexto = {
  fonte: "sans",
  tamanho: 18,
  entrelinha: 1.7,
  fundo: "papel",
  corTexto: "padrao",
  revogados: false,
  anotacoes: true,
  vide: true,
  erros: true,
  prontos: true,
  grifos: true,
  destino: "grifo",
};

/** cor das letras de cada escolha; "padrao" não muda nada */
export const CORES_TEXTO: Record<CorTexto, { nome: string; cor: string | null }> = {
  padrao: { nome: "Padrão do fundo", cor: null },
  preto: { nome: "Preto", cor: "#111111" },
  azul: { nome: "Azul-marinho", cor: "#14284b" },
  cinza: { nome: "Cinza", cor: "#3d3d3d" },
  marrom: { nome: "Marrom", cor: "#3b2c18" },
};

/** Opções de texto completas, com o que faltar preenchido pelo padrão (para dados salvos antes de uma opção existir). */
export const opcoesTexto = (v?: Partial<OpcoesTexto> | null): OpcoesTexto => ({ ...OPCOES_TEXTO_PADRAO, ...(v ?? {}) });
