// Recursos e respostas a recursos.
import { COMARCAS, CRIMES, CRIMES_JURI, data, nome, outroNome, vara } from "../dados";
import type { Gerador } from "../types";

export const apelacao: Gerador = {
  id: "apelacao",
  peca: "apelacao",
  peso: 4,
  gerar(rng) {
    const n = nome(rng);
    const c = rng.pick(CRIMES);
    const pena = rng.int(2, 9);
    return {
      caso: rng.pick([
        `${n} foi condenado(a) pelo juízo da ${vara(rng, c)} por ${c.nome} à pena de ${pena} anos de reclusão. A defesa foi intimada da sentença em ${data(rng)} e entende que não há prova suficiente para a condenação.`,
        `Após a instrução, sobreveio sentença condenando ${n} por ${c.nome}. O juiz fixou a pena-base acima do mínimo com fundamento na gravidade abstrata do delito. Não há omissão, obscuridade ou contradição na decisão.`,
        `O juiz singular julgou procedente a pretensão acusatória e condenou ${n} às penas do crime de ${c.nome}, em regime inicial fechado. Você, advogado(a) constituído(a), foi intimado(a) da sentença.`,
      ]),
      comando: "Qual o recurso cabível contra a sentença?",
      resposta: { peca: "apelacao", fundamentos: ["art. 593, I, CPP"] },
      explicacao:
        "Contra a sentença definitiva de condenação ou absolvição proferida por juiz singular cabe Apelação, no prazo de 5 dias (art. 593, I, do CPP), com razões em 8 dias (art. 600 do CPP).",
      distratores: ["rese", "embargos-declaracao", "revisao-criminal", "agravo-execucao"],
    };
  },
};

const ALINEAS_JURI = [
  { al: "d", fato: "Os jurados condenaram o réu, embora todas as provas dos autos apontassem que ele estava em outra cidade no momento do crime", tese: "a decisão dos jurados foi manifestamente contrária à prova dos autos" },
  { al: "c", fato: "Os jurados condenaram o réu e, na dosimetria, o juiz-presidente aplicou duas vezes a mesma qualificadora, como qualificadora e como agravante", tese: "houve erro na aplicação da pena" },
  { al: "a", fato: "Após a pronúncia, o réu foi julgado pelo plenário sem que a defesa fosse intimada da data da sessão", tese: "ocorreu nulidade posterior à pronúncia" },
  { al: "b", fato: "O juiz-presidente, na sentença, reconheceu uma qualificadora que os jurados haviam afastado na votação dos quesitos", tese: "a sentença do juiz-presidente foi contrária à decisão dos jurados" },
] as const;

const apelacaoJuri: Gerador = {
  id: "apelacao-juri",
  peca: "apelacao",
  peso: 3,
  gerar(rng) {
    const n = nome(rng);
    const c = rng.pick(CRIMES_JURI);
    const a = rng.pick(ALINEAS_JURI);
    return {
      caso: `${n} foi submetido(a) a julgamento pelo Tribunal do Júri da Comarca de ${rng.pick(COMARCAS)} por ${c.nome}. ${a.fato}. Como advogado(a), você entende que ${a.tese}.`,
      comando: "Qual o recurso cabível e o seu fundamento (com a alínea)?",
      resposta: { peca: "apelacao", fundamentos: [`art. 593, III, ${a.al}, CPP`] },
      explicacao: `Das decisões do Tribunal do Júri cabe Apelação (art. 593, III, do CPP). A alínea "${a.al}" corresponde ao caso: ${a.tese}.`,
      distratores: ["rese", "revisao-criminal", "embargos-infringentes", "habeas-corpus"],
    };
  },
};

const apelacaoJecrim: Gerador = {
  id: "apelacao-jecrim",
  peca: "apelacao",
  gerar(rng) {
    const n = nome(rng);
    return {
      caso: `${n} foi condenado(a) pelo Juizado Especial Criminal da Comarca de ${rng.pick(COMARCAS)} pela contravenção de vias de fato. A defesa quer impugnar a sentença, que desconsiderou a ausência de representação.`,
      comando: "Qual o recurso cabível e o seu fundamento legal?",
      resposta: { peca: "apelacao", fundamentos: ["art. 82 Lei 9.099"] },
      explicacao:
        "No Juizado Especial Criminal, a apelação contra a sentença está no art. 82 da Lei nº 9.099/1995, com prazo de 10 dias e razões apresentadas junto com a petição de interposição.",
      distratores: ["rese", "embargos-declaracao", "habeas-corpus", "recurso-extraordinario"],
    };
  },
};

const RESE = [
  {
    inc: "IV",
    caso: (n: string, c: string) => `Encerrada a primeira fase do procedimento do Júri, o juiz pronunciou ${n} por ${c}, embora não houvesse indícios suficientes de autoria.`,
    exp: "Contra a decisão de pronúncia cabe Recurso em Sentido Estrito (art. 581, IV, do CPP).",
    juri: true,
  },
  {
    inc: "IX",
    caso: (n: string, c: string) => `${n} responde por ${c}. A defesa requereu o reconhecimento da prescrição da pretensão punitiva, mas o juiz indeferiu o pedido, afirmando que o prazo ainda não havia transcorrido.`,
    exp: "Contra a decisão que indefere o pedido de reconhecimento da prescrição ou de outra causa extintiva da punibilidade cabe RESE (art. 581, IX, do CPP).",
  },
  {
    inc: "XV",
    caso: (n: string, c: string) => `${n} foi condenado(a) por ${c}. A defesa interpôs apelação dentro do prazo legal, mas o juiz não a recebeu, considerando-a intempestiva por erro na contagem do prazo.`,
    exp: "Contra a decisão que denega a apelação ou a julga deserta cabe RESE (art. 581, XV, do CPP).",
  },
  {
    inc: "XXV",
    caso: (n: string, c: string) => `O Ministério Público e ${n}, investigado(a) por ${c}, celebraram acordo de não persecução penal. O juiz, porém, recusou a homologação do acordo.`,
    exp: "Contra a decisão que recusa homologação à proposta de acordo de não persecução penal cabe RESE (art. 581, XXV, do CPP, incluído pela Lei 13.964/2019).",
  },
  {
    inc: "I",
    caso: (n: string, c: string) => `Você é advogado(a) de ${n}, vítima de ${c}, que ofereceu queixa-crime subsidiária diante da inércia do Ministério Público. O juiz rejeitou a queixa por entender ausente a justa causa.`,
    exp: "Contra a decisão que não recebe a denúncia ou a queixa cabe RESE (art. 581, I, do CPP).",
  },
  {
    inc: "X",
    caso: (n: string) => `${n} impetrou habeas corpus perante o juiz de primeiro grau contra ato do delegado de polícia que instaurou inquérito sem justa causa. O juiz negou a ordem.`,
    exp: "Contra a decisão do juiz que concede ou nega a ordem de habeas corpus cabe RESE (art. 581, X, do CPP).",
  },
  {
    inc: "II",
    caso: (n: string, c: string) => `Na ação penal movida contra ${n} por ${c}, o juiz, de ofício, declarou-se incompetente e remeteu os autos a outra comarca. Você representa o assistente de acusação, que discorda da decisão.`,
    exp: "Contra a decisão que conclui pela incompetência do juízo cabe RESE (art. 581, II, do CPP).",
  },
] as const;

export const rese: Gerador = {
  id: "rese",
  peca: "rese",
  peso: 4,
  gerar(rng) {
    const r = rng.pick(RESE);
    const n = nome(rng);
    const c = ("juri" in r && r.juri ? rng.pick(CRIMES_JURI) : rng.pick(CRIMES)).nome;
    return {
      caso: r.caso(n, c),
      comando: "Qual o recurso cabível e o seu fundamento legal (com o inciso)?",
      resposta: { peca: "rese", fundamentos: [`art. 581, ${r.inc}, CPP`] },
      explicacao: `${r.exp} O prazo de interposição é de 5 dias (art. 586 do CPP).`,
      distratores: ["apelacao", "carta-testemunhavel", "agravo-execucao", "habeas-corpus"],
    };
  },
};

const contrarrazoesApelacao: Gerador = {
  id: "contrarrazoes-apelacao",
  peca: "contrarrazoes-apelacao",
  peso: 2,
  gerar(rng) {
    const n = nome(rng);
    const c = rng.pick(CRIMES);
    return {
      caso: `${n} foi absolvido(a) da imputação de ${c.nome}. Inconformado, o Ministério Público interpôs apelação e apresentou suas razões. A defesa foi intimada para se manifestar sobre o recurso.`,
      comando: "Qual a peça cabível em favor do(a) réu(ré)?",
      resposta: { peca: "contrarrazoes-apelacao", fundamentos: ["art. 600 CPP"] },
      explicacao:
        "Interposta a apelação pela acusação, a defesa apresenta Contrarrazões de Apelação no prazo de 8 dias (art. 600 do CPP), pedindo a manutenção da sentença.",
      distratores: ["apelacao", "memoriais", "contrarrazoes-rese", "embargos-infringentes"],
    };
  },
};

const contrarrazoesRese: Gerador = {
  id: "contrarrazoes-rese",
  peca: "contrarrazoes-rese",
  gerar(rng) {
    const n = nome(rng);
    const c = rng.pick(CRIMES);
    return {
      caso: `O juiz rejeitou a denúncia oferecida contra ${n} por ${c.nome}, por falta de justa causa. O Ministério Público interpôs recurso em sentido estrito, e a defesa foi intimada para responder.`,
      comando: "Qual a peça cabível em favor do(a) denunciado(a)?",
      resposta: { peca: "contrarrazoes-rese", fundamentos: ["art. 588 CPP"] },
      explicacao:
        "Interposto o RESE, o recorrido apresenta Contrarrazões em 2 dias (art. 588 do CPP). Na rejeição da denúncia, a defesa deve ser intimada para contrarrazoar (Súmula 707 do STF).",
      distratores: ["contrarrazoes-apelacao", "rese", "resposta-acusacao", "memoriais"],
    };
  },
};

const embargosDeclaracao: Gerador = {
  id: "embargos-declaracao",
  peca: "embargos-declaracao",
  peso: 2,
  gerar(rng) {
    const n = nome(rng);
    const c = rng.pick(CRIMES);
    const acordao = rng() < 0.5;
    const vicio = rng.pick([
      "deixou de apreciar o pedido de substituição da pena privativa de liberdade por restritivas de direitos",
      "afirmou que as circunstâncias judiciais eram favoráveis, mas fixou a pena-base acima do mínimo",
      "fixou a pena, mas não indicou o regime inicial de cumprimento",
    ]);
    return {
      caso: acordao
        ? `O Tribunal de Justiça negou provimento à apelação de ${n}, condenado(a) por ${c.nome}. O acórdão ${vicio}.`
        : `O juiz condenou ${n} por ${c.nome}. A sentença ${vicio}. A defesa quer sanar o vício perante o próprio juiz.`,
      comando: "Qual a peça cabível e o seu fundamento legal?",
      resposta: { peca: "embargos-declaracao", fundamentos: [acordao ? "art. 619 CPP" : "art. 382 CPP"] },
      explicacao: acordao
        ? "Contra acórdão com ambiguidade, obscuridade, contradição ou omissão cabem Embargos de Declaração em 2 dias (art. 619 do CPP)."
        : "Contra sentença com obscuridade, ambiguidade, contradição ou omissão cabem Embargos de Declaração em 2 dias (art. 382 do CPP).",
      distratores: ["apelacao", "embargos-infringentes", "rese", "revisao-criminal"],
    };
  },
};

const embargosInfringentes: Gerador = {
  id: "embargos-infringentes",
  peca: "embargos-infringentes",
  peso: 2,
  gerar(rng) {
    const n = nome(rng);
    const c = rng.pick(CRIMES);
    return {
      caso: `O Tribunal de Justiça, por maioria de votos (2 x 1), negou provimento à apelação de ${n}, condenado(a) por ${c.nome}. O voto vencido absolvia o(a) réu(ré) por insuficiência de provas.`,
      comando: "Qual o recurso cabível e o seu fundamento legal?",
      resposta: { peca: "embargos-infringentes", fundamentos: ["art. 609, parágrafo único, CPP"] },
      explicacao:
        "Quando não for unânime a decisão de segunda instância desfavorável ao réu, cabem Embargos Infringentes e de Nulidade, em 10 dias, limitados ao objeto da divergência (art. 609, parágrafo único, do CPP).",
      distratores: ["embargos-declaracao", "recurso-especial", "revisao-criminal", "apelacao"],
    };
  },
};

const cartaTestemunhavel: Gerador = {
  id: "carta-testemunhavel",
  peca: "carta-testemunhavel",
  gerar(rng) {
    const n = nome(rng);
    const c = rng.pick(CRIMES_JURI);
    return {
      caso: `${n} foi pronunciado(a) por ${c.nome}. A defesa interpôs recurso em sentido estrito no prazo, mas o juiz negou-lhe seguimento, sem fundamento legal.`,
      comando: "Qual a medida cabível e o seu fundamento legal (com o inciso)?",
      resposta: { peca: "carta-testemunhavel", fundamentos: ["art. 639, I, CPP"] },
      explicacao:
        "Dá-se Carta Testemunhável da decisão que denegar o recurso (art. 639, I, do CPP), requerida em 48 horas ao escrivão (art. 640). Se o juiz não recebe a APELAÇÃO, o cabível é o RESE (art. 581, XV).",
      distratores: ["rese", "apelacao", "habeas-corpus", "embargos-declaracao"],
    };
  },
};

const EXECUCAO = [
  "indeferiu o pedido de progressão para o regime semiaberto, embora cumpridos o requisito objetivo e o bom comportamento carcerário",
  "negou o livramento condicional com base apenas na gravidade abstrata do crime",
  "reconheceu falta grave sem instaurar procedimento disciplinar nem ouvir a defesa",
  "indeferiu a remição pelos dias trabalhados, comprovados por atestado do presídio",
  "somou as penas de três condenações, sem reconhecer a continuidade delitiva",
  "determinou a regressão para o regime fechado sem a oitiva prévia do condenado",
];

const agravoExecucao: Gerador = {
  id: "agravo-execucao",
  peca: "agravo-execucao",
  peso: 4,
  gerar(rng) {
    const n = nome(rng);
    const c = rng.pick(CRIMES);
    return {
      caso: `${n} cumpre pena por ${c.nome}. O Juízo da Vara de Execuções Penais da Comarca de ${rng.pick(COMARCAS)} ${rng.pick(EXECUCAO)}. A defesa foi intimada da decisão.`,
      comando: "Qual o recurso cabível e o seu fundamento legal?",
      resposta: { peca: "agravo-execucao", fundamentos: ["art. 197 LEP"] },
      explicacao:
        "Das decisões do juiz da execução cabe Agravo em Execução, sem efeito suspensivo (art. 197 da LEP), no prazo de 5 dias (Súmula 700 do STF), seguindo o rito do RESE, inclusive o juízo de retratação (art. 589 do CPP).",
      distratores: ["rese", "apelacao", "habeas-corpus", "revisao-criminal"],
    };
  },
};

const recursoEspecial: Gerador = {
  id: "recurso-especial",
  peca: "recurso-especial",
  gerar(rng) {
    const n = nome(rng);
    const c = rng.pick(CRIMES);
    return {
      caso: `O Tribunal de Justiça do Estado de ${rng.pick(COMARCAS)}, por unanimidade, manteve a condenação de ${n} por ${c.nome}, negando vigência a dispositivo do Código Penal ao afastar o reconhecimento da confissão espontânea. Não cabem mais recursos ordinários, e a matéria foi prequestionada.`,
      comando: "Qual o recurso cabível e o seu fundamento constitucional?",
      resposta: { peca: "recurso-especial", fundamentos: ["art. 105, III, a, CF"] },
      explicacao:
        "Contra acórdão de TJ ou TRF que contraria lei federal ou lhe nega vigência cabe Recurso Especial ao STJ (art. 105, III, a, da CF), no prazo de 15 dias.",
      distratores: ["recurso-extraordinario", "embargos-infringentes", "revisao-criminal", "recurso-ordinario-constitucional"],
    };
  },
};

const recursoExtraordinario: Gerador = {
  id: "recurso-extraordinario",
  peca: "recurso-extraordinario",
  gerar(rng) {
    const n = nome(rng);
    return {
      caso: `O Tribunal de Justiça, em decisão unânime e de última instância, manteve a condenação de ${n} com base exclusivamente em provas obtidas por meio ilícito, em ofensa direta ao art. 5º, LVI, da Constituição. A matéria foi prequestionada e há repercussão geral.`,
      comando: "Qual o recurso cabível e o seu fundamento constitucional?",
      resposta: { peca: "recurso-extraordinario", fundamentos: ["art. 102, III, a, CF"] },
      explicacao:
        "Contra decisão de última instância que contraria dispositivo da Constituição cabe Recurso Extraordinário ao STF (art. 102, III, a, da CF), com demonstração da repercussão geral.",
      distratores: ["recurso-especial", "habeas-corpus", "revisao-criminal", "embargos-infringentes"],
    };
  },
};

const roc: Gerador = {
  id: "roc-hc",
  peca: "recurso-ordinario-constitucional",
  gerar(rng) {
    const n = nome(rng);
    const m = outroNome(rng, n);
    return {
      caso: `${m}, advogado(a), impetrou habeas corpus no Tribunal de Justiça em favor de ${n}, preso(a) preventivamente há mais de um ano sem sentença. O Tribunal, em única instância, denegou a ordem.`,
      comando: "Qual o recurso cabível contra o acórdão denegatório e o seu fundamento?",
      resposta: { peca: "recurso-ordinario-constitucional", fundamentos: ["art. 105, II, a, CF"] },
      explicacao:
        "Contra decisão denegatória de habeas corpus proferida em única ou última instância por TJ ou TRF cabe Recurso Ordinário Constitucional ao STJ (art. 105, II, a, da CF), em 5 dias (art. 30 da Lei 8.038/1990).",
      distratores: ["recurso-especial", "recurso-extraordinario", "habeas-corpus", "embargos-infringentes"],
    };
  },
};

const geradores = [
  apelacao,
  apelacaoJuri,
  apelacaoJecrim,
  rese,
  contrarrazoesApelacao,
  contrarrazoesRese,
  embargosDeclaracao,
  embargosInfringentes,
  cartaTestemunhavel,
  agravoExecucao,
  recursoEspecial,
  recursoExtraordinario,
  roc,
];

export default geradores;
