// Sistemas de cores das marcações: cada cor tem um significado. Dois prontos e os do usuário.
import { gravarJSON, lerJSON } from "@/lib/storage";

export interface CorLegenda {
  cor: string;
  rotulo: string;
}
export interface Sistema {
  id: string;
  nome: string;
  cores: CorLegenda[];
}

const AMARELO = "#fde047";
const VERDE = "#86efac";
const AZUL = "#93c5fd";
const ROSA = "#f9a8d4";
const VERMELHO = "#fca5a5";
const ROXO = "#c4b5fd";

export const SISTEMAS_PRONTOS: Sistema[] = [
  {
    id: "materias",
    nome: "Matérias",
    cores: [
      { cor: AMARELO, rotulo: "Competência" },
      { cor: VERDE, rotulo: "Recursos" },
      { cor: AZUL, rotulo: "Procedimentos" },
      { cor: ROSA, rotulo: "Direitos fundamentais" },
    ],
  },
  {
    id: "teses",
    nome: "Teses da peça",
    cores: [
      { cor: AZUL, rotulo: "Competência" },
      { cor: VERDE, rotulo: "Teses preliminares" },
      { cor: AMARELO, rotulo: "Teses principais" },
      { cor: VERMELHO, rotulo: "Teses subsidiárias" },
      { cor: ROXO, rotulo: "Pedidos acessórios" },
    ],
  },
];

interface Estado {
  ativo: string;
  meus: Sistema[];
}
const K = "grifo:legendas";
export const lerLegendas = (): Estado => lerJSON<Estado>(K, { ativo: "materias", meus: [] });
export const gravarLegendas = (e: Estado) => gravarJSON(K, e);
export const todosSistemas = (e: Estado) => [...SISTEMAS_PRONTOS, ...e.meus];
export const sistemaAtivo = (e: Estado) => todosSistemas(e).find((s) => s.id === e.ativo) ?? SISTEMAS_PRONTOS[0];
