// As teses que a página de estatísticas procura nas tabelas de pontos da FGV. A busca é por palavras na descrição dos
// itens (sem acento, em minúsculas): "a tese aparece no padrão de resposta", e não uma classificação do gabarito.
import type { TeseInfo } from "./tipos";

interface Tese extends TeseInfo {
  re: RegExp;
}

export const TESES: Tese[] = [
  // processo penal
  { id: "absolvicao", nome: "Absolvição", grupo: "processo", re: /absolvi[cç][aã]o|absolver|absolvid/ },
  { id: "nulidade", nome: "Nulidades", grupo: "processo", busca: "nulidade", re: /\bnulidade|\bnul[oa]s?\b|\banula[rc]/ },
  { id: "absolvicao-sumaria", nome: "Absolvição sumária", grupo: "processo", busca: '"absolvição sumária"', re: /absolvi[cç][aã]o sumaria/ },
  { id: "desclassificacao", nome: "Desclassificação", grupo: "processo", busca: "desclassificação", re: /desclassific/ },
  { id: "juri", nome: "Tribunal do Júri", grupo: "processo", busca: "júri", re: /\bjuri\b|pronuncia/ },
  { id: "impronuncia", nome: "Impronúncia", grupo: "processo", busca: "impronúncia", re: /impronun/ },
  { id: "prova-ilicita", nome: "Prova ilícita", grupo: "processo", busca: "ilícita", re: /provas? ilicit|ilicitude d[ao]s? prova|ilicitas? por deriva|frutos? da arvore|provas? derivada/ },
  { id: "incompetencia", nome: "Incompetência", grupo: "processo", busca: "incompetência", re: /incompet/ },
  { id: "inepcia", nome: "Inépcia da denúncia ou queixa", grupo: "processo", busca: "inépcia", re: /inepc|inepta/ },
  { id: "justa-causa", nome: "Falta de justa causa", grupo: "processo", busca: '"justa causa"', re: /justa causa/ },
  { id: "prisao", nome: "Prisão e liberdade", grupo: "processo", busca: "preventiva", re: /prisao preventiva|liberdade provisoria|relaxamento|recorrer em liberdade|revoga[cç][aã]o da pris/ },
  { id: "suspensao-processo", nome: "Suspensão condicional do processo", grupo: "processo", busca: '"suspensão condicional do processo"', re: /suspens[aã]o condicional do processo/ },
  { id: "transacao", nome: "Transação penal", grupo: "processo", busca: '"transação penal"', re: /transa[cç][aã]o penal/ },
  { id: "anpp", nome: "Acordo de não persecução penal", grupo: "processo", busca: '"não persecução"', re: /acordo de n[aã]o persecu/ },
  { id: "emendatio", nome: "Emendatio e mutatio libelli", grupo: "processo", busca: "emendatio", re: /emendatio|mutatio/ },
  // crime
  { id: "atipicidade", nome: "Atipicidade", grupo: "crime", busca: "atipicidade", re: /atipic/ },
  { id: "tentativa", nome: "Tentativa", grupo: "crime", busca: "tentativa", re: /\btentativa\b|\btentad[oa]\b/ },
  { id: "qualificadora", nome: "Qualificadoras e causas de aumento", grupo: "crime", busca: "qualificadora", re: /qualificadora|causa de aumento|majorante/ },
  { id: "erro", nome: "Erro de tipo ou de proibição", grupo: "crime", re: /erro de tipo|erro de proibi|erro sobre/ },
  { id: "legitima-defesa", nome: "Legítima defesa", grupo: "crime", busca: '"legítima defesa"', re: /legitima defesa/ },
  { id: "desistencia", nome: "Desistência e arrependimento", grupo: "crime", busca: '"desistência voluntária"', re: /desistencia voluntaria|arrependimento (eficaz|posterior)/ },
  { id: "concurso", nome: "Concurso de crimes", grupo: "crime", re: /crime continuado|continuidade delitiva|concurso formal|concurso material/ },
  { id: "privilegio", nome: "Privilégio", grupo: "crime", busca: "privilegiado", re: /privilegi/ },
  { id: "insignificancia", nome: "Insignificância", grupo: "crime", busca: "insignificância", re: /insignific|bagatela/ },
  { id: "estado-necessidade", nome: "Estado de necessidade", grupo: "crime", busca: '"estado de necessidade"', re: /estado de necessidade/ },
  { id: "crime-impossivel", nome: "Crime impossível", grupo: "crime", busca: '"crime impossível"', re: /crime impossivel/ },
  { id: "drogas", nome: "Lei de Drogas", grupo: "crime", busca: "tráfico", re: /trafico|lei de drogas|11\.?343/ },
  { id: "violencia-domestica", nome: "Violência doméstica", grupo: "crime", busca: '"violência doméstica"', re: /maria da penha|violencia domestica/ },
  // pena e punibilidade
  { id: "regime", nome: "Regime inicial", grupo: "pena", busca: '"regime inicial"', re: /regime (inicial|aberto|semiaberto|semi-aberto|fechado|mais brando)/ },
  { id: "atenuantes", nome: "Atenuantes", grupo: "pena", busca: "atenuante", re: /atenuante|confiss[aã]o espontanea|menor de 21/ },
  { id: "dosimetria", nome: "Pena-base e dosimetria", grupo: "pena", busca: "dosimetria", re: /pena[- ]base|dosimetria|circunstancias judiciais|\bart\.? 59\b/ },
  { id: "substituicao", nome: "Penas restritivas de direitos", grupo: "pena", re: /substitui[cç][aã]o da pena|restritivas? de direito/ },
  { id: "extincao", nome: "Extinção da punibilidade", grupo: "pena", busca: '"extinção da punibilidade"', re: /extin[cç][aã]o da punibilidade/ },
  { id: "reincidencia", nome: "Reincidência", grupo: "pena", busca: "reincidência", re: /reincid/ },
  { id: "sursis", nome: "Sursis", grupo: "pena", busca: "sursis", re: /suspens[aã]o condicional da pena|\bsursis\b/ },
  { id: "prescricao", nome: "Prescrição", grupo: "pena", busca: "prescrição", re: /prescri[cç]/ },
  { id: "decadencia", nome: "Decadência", grupo: "pena", busca: "decadência", re: /decaden/ },
  { id: "detracao", nome: "Detração", grupo: "pena", busca: "detração", re: /detra[cç]/ },
  // execução
  { id: "progressao", nome: "Progressão de regime", grupo: "execucao", busca: "progressão", re: /progress[aã]o/ },
  { id: "falta-grave", nome: "Falta grave", grupo: "execucao", busca: '"falta grave"', re: /falta grave/ },
  { id: "livramento", nome: "Livramento condicional", grupo: "execucao", busca: '"livramento condicional"', re: /livramento condicional/ },
  { id: "remicao", nome: "Remição", grupo: "execucao", busca: "remição", re: /remi[cç][aã]o/ },
];

export const NOMES_GRUPOS_TESE = { processo: "Processo penal", crime: "Crime", pena: "Pena e punibilidade", execucao: "Execução" } as const;

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** As teses que aparecem num texto (a descrição dos itens de uma parte da prova), na ordem de TESES. */
export function tesesNoTexto(texto: string): string[] {
  const t = semAcento(texto);
  return TESES.filter((x) => x.re.test(t)).map((x) => x.id);
}

export const infoTeses = (): TeseInfo[] => TESES.map(({ id, nome, grupo, busca }) => ({ id, nome, grupo, ...(busca ? { busca } : {}) }));
