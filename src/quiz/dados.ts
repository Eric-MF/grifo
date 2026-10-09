// Ingredientes para variar os casos gerados (nomes, crimes, comarcas, datas).
import type { Rng } from "./types";

const NOMES = [
  "Ana", "Bruno", "Carla", "Diego", "Eduarda", "Fábio", "Gabriela", "Heitor", "Isabela", "João",
  "Kátia", "Lucas", "Mariana", "Nelson", "Olívia", "Paulo", "Queila", "Rafael", "Sofia", "Tiago",
  "Úrsula", "Vinícius", "Wanda", "Xavier", "Yara", "Zeca", "Alice", "Bernardo", "Cecília", "Davi",
  "Elisa", "Felipe", "Giovana", "Henrique", "Iara", "Júlio", "Lara", "Mateus", "Nina", "Otávio",
  "Priscila", "Renato", "Sabrina", "Thiago", "Valéria", "Wagner", "Beatriz", "Caio", "Débora", "Enzo",
  "Fernanda", "Gustavo", "Helena", "Igor", "Joana", "Leonardo", "Marta", "Natan", "Paula", "Roberto",
  "Sílvia", "Tânia", "Ulisses", "Vera", "Marieta", "Tício", "Mévio", "Caio Túlio", "Rodrigo", "Cláudio",
] as const;

export const COMARCAS = ["Alfa", "Beta", "Gama", "Delta", "Épsilon", "Zeta", "Ômega", "Campo Belo", "Flores", "Rio Claro", "Serra Alta", "Porto Novo", "Vila Real", "Monte Verde"] as const;

export interface Crime {
  nome: string;
  artigo: string;
  /** crime doloso contra a vida (competência do Júri) */
  juri?: boolean;
  /** crime de ação penal privada (queixa) */
  privada?: boolean;
  federal?: boolean;
}

export const CRIMES: Crime[] = [
  { nome: "furto simples", artigo: "art. 155, caput, do CP" },
  { nome: "furto qualificado pelo rompimento de obstáculo", artigo: "art. 155, § 4º, I, do CP" },
  { nome: "roubo majorado pelo concurso de pessoas", artigo: "art. 157, § 2º, II, do CP" },
  { nome: "estelionato", artigo: "art. 171 do CP" },
  { nome: "receptação", artigo: "art. 180 do CP" },
  { nome: "apropriação indébita", artigo: "art. 168 do CP" },
  { nome: "lesão corporal grave", artigo: "art. 129, § 1º, do CP" },
  { nome: "ameaça", artigo: "art. 147 do CP" },
  { nome: "tráfico de drogas", artigo: "art. 33 da Lei nº 11.343/2006" },
  { nome: "porte ilegal de arma de fogo de uso permitido", artigo: "art. 14 da Lei nº 10.826/2003" },
  { nome: "embriaguez ao volante", artigo: "art. 306 do CTB" },
  { nome: "falsidade ideológica", artigo: "art. 299 do CP" },
  { nome: "peculato", artigo: "art. 312 do CP", federal: true },
  { nome: "corrupção passiva", artigo: "art. 317 do CP" },
  { nome: "extorsão", artigo: "art. 158 do CP" },
  { nome: "dano qualificado", artigo: "art. 163, parágrafo único, do CP" },
  { nome: "moeda falsa", artigo: "art. 289 do CP", federal: true },
  { nome: "sonegação fiscal", artigo: "art. 1º, I, da Lei nº 8.137/1990" },
];

export const CRIMES_JURI: Crime[] = [
  { nome: "homicídio simples", artigo: "art. 121, caput, do CP", juri: true },
  { nome: "homicídio qualificado por motivo fútil", artigo: "art. 121, § 2º, II, do CP", juri: true },
  { nome: "homicídio qualificado pelo recurso que dificultou a defesa da vítima", artigo: "art. 121, § 2º, IV, do CP", juri: true },
  { nome: "tentativa de homicídio", artigo: "art. 121, caput, c/c art. 14, II, do CP", juri: true },
  { nome: "feminicídio", artigo: "art. 121-A do CP", juri: true },
];

export const CRIMES_HONRA: Crime[] = [
  { nome: "calúnia", artigo: "art. 138 do CP", privada: true },
  { nome: "difamação", artigo: "art. 139 do CP", privada: true },
  { nome: "injúria", artigo: "art. 140, caput, do CP", privada: true },
];

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export function data(rng: Rng, anoMin = 2019, anoMax = 2025) {
  const ano = rng.int(anoMin, anoMax);
  const mes = rng.int(0, 11);
  const dia = rng.int(1, 28);
  return `${dia === 1 ? "1º" : dia} de ${MESES[mes]} de ${ano}`;
}

export const nome = (rng: Rng) => rng.pick(NOMES);
export const comarca = (rng: Rng) => rng.pick(COMARCAS);

/** Nome diferente do(s) já usado(s). */
export function outroNome(rng: Rng, ...usados: string[]) {
  let n = nome(rng);
  for (let i = 0; i < 10 && usados.includes(n); i++) n = nome(rng);
  return n;
}

export const vara = (rng: Rng, crime?: Crime) =>
  crime?.juri
    ? `Vara do Tribunal do Júri da Comarca de ${comarca(rng)}`
    : crime?.federal && rng() < 0.5
      ? `Vara Federal Criminal de ${comarca(rng)}`
      : `${rng.int(1, 4)}ª Vara Criminal da Comarca de ${comarca(rng)}`;
