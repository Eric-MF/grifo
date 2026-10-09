// Tipos compartilhados da correção por IA.
export type ProvedorId = "anthropic" | "openai" | "gemini" | "openrouter" | "groq" | "mistral" | "deepseek";

interface ComponenteIA {
  id: string;
  obtido: number;
  justificativa: string;
  trecho?: string;
}
interface ItemIA {
  parte: string; // "peca" | "q1".."q4"
  n: string;
  componentes: ComponenteIA[];
}
export interface ResultadoIA {
  provedor: ProvedorId;
  modelo: string;
  criadoEm: number;
  itens: ItemIA[];
  /** Notas por parte somadas pelo site (não pela IA). */
  partes: { parte: string; obtido: number; valor: number }[];
  total: number;
  comentarioGeral: string;
}
