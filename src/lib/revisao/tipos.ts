export interface Dispositivo {
  lei: string;
  nome: string;
  sigla: string;
  artigo: string;
  rotulo: string;
  texto: string;
  citacao: string;
  url: string;
  planalto: string;
}

export interface LeiTexto {
  id: string;
  sigla: string;
  nome: string;
  planalto: string;
  blocos: { tipo: string; texto: string; superada?: boolean; rotulo?: string }[];
}
