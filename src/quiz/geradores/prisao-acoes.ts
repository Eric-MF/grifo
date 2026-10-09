// Medidas contra a prisão e ações autônomas: relaxamento, liberdade provisória,
// revogação da preventiva, habeas corpus, queixa-crime e revisão criminal.
import { COMARCAS, CRIMES, CRIMES_HONRA, data, nome, outroNome } from "../dados";
import type { Gerador } from "../types";

const ILEGAL = [
  "foi preso(a) em flagrante três dias depois do fato, em sua casa, sem que houvesse perseguição",
  "foi preso(a) em flagrante em situação preparada pela polícia, que induziu a prática do crime",
  "foi preso(a) em flagrante, mas a comunicação ao juiz só ocorreu cinco dias depois e não houve audiência de custódia",
  "foi preso(a) em flagrante sem que lhe fosse entregue a nota de culpa",
];

const relaxamento: Gerador = {
  id: "relaxamento",
  peca: "relaxamento-prisao",
  peso: 3,
  gerar(rng) {
    const n = nome(rng);
    const c = rng.pick(CRIMES);
    return {
      caso: `${n}, acusado(a) de ${c.nome}, ${rng.pick(ILEGAL)}. A prisão ainda não foi convertida em preventiva. Você foi contratado(a) para buscar a liberdade do(a) cliente.`,
      comando: "Qual a medida cabível (diferente de habeas corpus) e o seu fundamento?",
      resposta: { peca: "relaxamento-prisao", fundamentos: ["art. 5º, LXV, CF", "art. 310, I, CPP"] },
      explicacao:
        "Prisão ilegal deve ser imediatamente relaxada pela autoridade judiciária (art. 5º, LXV, da CF; art. 310, I, do CPP). O pedido é de Relaxamento de Prisão, e não de liberdade provisória, que pressupõe prisão legal.",
      distratores: ["liberdade-provisoria", "revogacao-preventiva", "habeas-corpus", "rese"],
    };
  },
};

const liberdadeProvisoria: Gerador = {
  id: "liberdade-provisoria",
  peca: "liberdade-provisoria",
  peso: 2,
  gerar(rng) {
    const n = nome(rng);
    const c = rng.pick(CRIMES);
    return {
      caso: `${n} foi preso(a) em flagrante, de forma regular, logo após praticar ${c.nome}. É primário(a), tem residência fixa e trabalho lícito, e não estão presentes os requisitos da prisão preventiva. O auto de prisão observou todas as formalidades.`,
      comando: "Qual a medida cabível (diferente de habeas corpus) e o seu fundamento?",
      resposta: { peca: "liberdade-provisoria", fundamentos: ["art. 321 CPP", "art. 310, III, CPP", "art. 5º, LXVI, CF"] },
      explicacao:
        "Se a prisão em flagrante é legal, mas ausentes os requisitos da preventiva, cabe pedido de Liberdade Provisória, com ou sem fiança (art. 5º, LXVI, da CF; arts. 310, III, e 321 do CPP).",
      distratores: ["relaxamento-prisao", "revogacao-preventiva", "habeas-corpus", "rese"],
    };
  },
};

const revogacaoPreventiva: Gerador = {
  id: "revogacao-preventiva",
  peca: "revogacao-preventiva",
  peso: 2,
  gerar(rng) {
    const n = nome(rng);
    const c = rng.pick(CRIMES);
    const motivo = rng.pick([
      "a testemunha que teria sido ameaçada já foi ouvida em juízo",
      "o(a) acusado(a) comprovou residência fixa e emprego lícito",
      "a instrução já foi encerrada",
    ]);
    return {
      caso: `O juiz decretou a prisão preventiva de ${n}, acusado(a) de ${c.nome}, para garantir a instrução criminal. Agora, ${motivo}, de modo que o motivo da prisão deixou de existir.`,
      comando: "Qual a medida cabível (diferente de habeas corpus) e o seu fundamento?",
      resposta: { peca: "revogacao-preventiva", fundamentos: ["art. 316 CPP"] },
      explicacao:
        "Se no curso do processo desaparece o motivo da preventiva, o juiz deve revogá-la (art. 316 do CPP). O pedido é de Revogação da Prisão Preventiva, pois a prisão foi legal quando decretada.",
      distratores: ["relaxamento-prisao", "liberdade-provisoria", "habeas-corpus", "rese"],
    };
  },
};

const HC = [
  { inc: "I", caso: (n: string) => `A autoridade policial instaurou inquérito contra ${n} por um fato evidentemente atípico, e ${n} está sendo intimado(a) para depor sob ameaça de condução coercitiva`, tese: "não há justa causa" },
  { inc: "II", caso: (n: string) => `${n} está preso(a) preventivamente há mais de dois anos, sem que a instrução tenha sequer começado, por inércia exclusiva da acusação`, tese: "alguém está preso por mais tempo do que determina a lei" },
  { inc: "VII", caso: (n: string) => `${n} continua preso(a), embora a punibilidade já tenha sido declarada extinta pela prescrição`, tese: "extinta a punibilidade" },
] as const;

const habeasCorpus: Gerador = {
  id: "habeas-corpus",
  peca: "habeas-corpus",
  gerar(rng) {
    const n = nome(rng);
    const h = rng.pick(HC);
    return {
      caso: `${h.caso(n)}. Você quer uma medida rápida, que dispensa procuração e pode ser impetrada diretamente no tribunal competente.`,
      comando: "Qual a medida cabível e o seu fundamento no CPP (com o inciso)?",
      resposta: { peca: "habeas-corpus", fundamentos: [`art. 648, ${h.inc}, CPP`] },
      explicacao: `Cabe Habeas Corpus sempre que alguém sofrer ou se achar ameaçado de sofrer coação ilegal na liberdade de locomoção (art. 5º, LXVIII, da CF). O art. 648, ${h.inc}, do CPP considera a coação ilegal quando ${h.tese}.`,
      distratores: ["relaxamento-prisao", "revogacao-preventiva", "mandado-seguranca", "rese"],
    };
  },
};

export const queixa: Gerador = {
  id: "queixa-crime",
  peca: "queixa-crime",
  peso: 3,
  gerar(rng) {
    const n = nome(rng);
    const autor = outroNome(rng, n);
    const c = rng.pick(CRIMES_HONRA);
    const fato = {
      calúnia: `imputou falsamente a ${n}, em grupo de mensagens da vizinhança, a prática de um furto`,
      difamação: `espalhou para os colegas de trabalho de ${n} que ele(a) chegava embriagado(a) ao serviço`,
      injúria: `chamou ${n} de "ladrão(ladra) e vagabundo(a)" em uma reunião de condomínio`,
    }[c.nome as "calúnia" | "difamação" | "injúria"];
    return {
      caso: `Em ${data(rng, 2024, 2025)}, ${autor} ${fato}. ${n} procurou você dois meses depois, com provas do ocorrido, desejando ver ${autor} processado(a) criminalmente. O caso não envolve funcionário público nem outra hipótese de ação pública.`,
      comando: "Qual a peça cabível e o seu fundamento legal?",
      resposta: { peca: "queixa-crime", fundamentos: ["art. 41 CPP", "art. 30 CPP", "art. 145 CP", "art. 100, § 2º, CP"] },
      explicacao:
        "Nos crimes contra a honra, em regra, a ação penal é privada (art. 145 do CP): o ofendido oferece Queixa-Crime (arts. 30 e 41 do CPP), no prazo decadencial de 6 meses (art. 38 do CPP), com procuração com poderes especiais (art. 44 do CPP).",
      distratores: ["resposta-acusacao", "mandado-seguranca", "habeas-corpus", "memoriais"],
    };
  },
};

const REVISAO = [
  { inc: "III", fato: (n: string) => `surgiu uma prova nova: a gravação de uma câmera que mostra ${n} em outra cidade no horário do crime` },
  { inc: "II", fato: () => "descobriu-se que o laudo pericial que fundamentou a condenação era comprovadamente falso" },
  { inc: "I", fato: () => "verificou-se que a sentença condenou por fato que a lei penal vigente à época não definia como crime, contrariando o texto expresso da lei" },
] as const;

const revisaoCriminal: Gerador = {
  id: "revisao-criminal",
  peca: "revisao-criminal",
  peso: 3,
  gerar(rng) {
    const n = nome(rng);
    const c = rng.pick(CRIMES);
    const r = rng.pick(REVISAO);
    return {
      caso: `${n} foi condenado(a) por ${c.nome} pelo juízo da Comarca de ${rng.pick(COMARCAS)}, e a sentença transitou em julgado em ${data(rng, 2019, 2023)}. Anos depois, ${r.fato(n)}.`,
      comando: "Qual a ação cabível e o seu fundamento legal (com o inciso)?",
      resposta: { peca: "revisao-criminal", fundamentos: [`art. 621, ${r.inc}, CPP`] },
      explicacao: `Após o trânsito em julgado da condenação, cabe Revisão Criminal, a qualquer tempo (art. 622 do CPP). A hipótese se enquadra no art. 621, ${r.inc}, do CPP.`,
      distratores: ["apelacao", "habeas-corpus", "embargos-infringentes", "agravo-execucao"],
    };
  },
};

export default [relaxamento, liberdadeProvisoria, revogacaoPreventiva, habeasCorpus, queixa, revisaoCriminal];
