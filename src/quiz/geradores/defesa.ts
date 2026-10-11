// Peças da defesa no curso da ação penal: resposta à acusação e memoriais.
import { CRIMES, CRIMES_JURI, data, nome, vara } from "../dados";
import type { Gerador } from "../types";

const TESES_RA = [
  "o fato narrado evidentemente não constitui crime",
  "há causa excludente da ilicitude, pois agiu em legítima defesa",
  "a punibilidade já está extinta pela prescrição",
  "a denúncia é inepta, sem descrever a conduta individualizada",
];

const respostaAcusacao: Gerador = {
  id: "resposta-acusacao",
  peca: "resposta-acusacao",
  peso: 3,
  gerar(rng) {
    const n = nome(rng);
    const c = rng.pick(CRIMES);
    const tese = rng.pick(TESES_RA);
    const v = rng.pick([
      `${n} foi denunciado(a) pela prática de ${c.nome} (${c.artigo}). O juízo da ${vara(rng, c)} recebeu a denúncia e determinou a citação, que ocorreu em ${data(rng)}. A defesa entende que ${tese}.`,
      `Recebida a denúncia oferecida contra ${n} por ${c.nome}, o(a) acusado(a) foi citado(a) pessoalmente para se defender. Você foi procurado(a) no dia seguinte à citação e constatou que ${tese}.`,
      `O Ministério Público ofereceu denúncia contra ${n}, imputando-lhe ${c.nome}. O juiz recebeu a peça acusatória e ordenou a citação do(a) réu(ré), que ainda não apresentou nenhuma manifestação nos autos.`,
    ]);
    return {
      caso: v,
      comando: "Qual a peça cabível, neste momento, em favor do(a) acusado(a)?",
      resposta: { peca: "resposta-acusacao", fundamentos: ["art. 396-A CPP", "art. 396 CPP"] },
      explicacao:
        "Recebida a denúncia e citado o réu, a defesa apresenta Resposta à Acusação no prazo de 10 dias (arts. 396 e 396-A do CPP), podendo arguir preliminares e pedir a absolvição sumária (art. 397 do CPP).",
      distratores: ["memoriais", "habeas-corpus", "rese", "apelacao"],
    };
  },
};

const respostaAcusacaoJuri: Gerador = {
  id: "resposta-acusacao-juri",
  peca: "resposta-acusacao",
  gerar(rng) {
    const n = nome(rng);
    const c = rng.pick(CRIMES_JURI);
    return {
      caso: `${n} foi denunciado(a) por ${c.nome} (${c.artigo}). A denúncia foi recebida pelo juízo da Vara do Tribunal do Júri, que determinou a citação do(a) acusado(a) para responder à acusação por escrito. A citação ocorreu em ${data(rng)}.`,
      comando: "Qual a peça cabível em favor do(a) acusado(a)?",
      resposta: { peca: "resposta-acusacao", fundamentos: ["art. 406 CPP", "art. 396-A CPP"] },
      explicacao:
        "No procedimento do Júri, a defesa responde à acusação por escrito em 10 dias, na forma do art. 406 do CPP (primeira fase, antes da pronúncia).",
      distratores: ["memoriais", "rese", "apelacao", "revisao-criminal"],
    };
  },
};

export const memoriais: Gerador = {
  id: "memoriais",
  peca: "memoriais",
  peso: 3,
  gerar(rng) {
    const n = nome(rng);
    const c = rng.pick(CRIMES);
    const motivo = rng.pick([
      "diante da complexidade do caso",
      "em razão do número de acusados",
      "a requerimento das partes, por ser complexa a causa",
    ]);
    return {
      caso: `Na ação penal em que ${n} responde por ${c.nome}, encerrou-se a instrução com a oitiva das testemunhas e o interrogatório. O juiz da ${vara(rng, c)}, ${motivo}, substituiu os debates orais e concedeu às partes prazo sucessivo de 5 dias para manifestação por escrito. O Ministério Público já se manifestou pedindo a condenação.`,
      comando: "Qual a peça cabível em favor do(a) réu(ré)?",
      resposta: { peca: "memoriais", fundamentos: ["art. 403, § 3º, CPP"] },
      explicacao:
        "Encerrada a instrução e substituídos os debates orais por manifestação escrita, a defesa apresenta Memoriais (alegações finais por escrito) no prazo de 5 dias, conforme o art. 403, § 3º, do CPP.",
      distratores: ["resposta-acusacao", "apelacao", "contrarrazoes-apelacao", "embargos-declaracao"],
    };
  },
};

const memoriaisJuri: Gerador = {
  id: "memoriais-juri",
  peca: "memoriais",
  gerar(rng) {
    const n = nome(rng);
    const c = rng.pick(CRIMES_JURI);
    return {
      caso: `${n} responde por ${c.nome} perante a Vara do Tribunal do Júri. Encerrada a instrução da primeira fase, o juiz converteu os debates em manifestação escrita e abriu prazo para a defesa, após o Ministério Público requerer a pronúncia.`,
      comando: "Qual a peça cabível em favor do(a) acusado(a)?",
      resposta: { peca: "memoriais", fundamentos: ["art. 403, § 3º, CPP", "art. 411, § 4º, CPP"] },
      explicacao:
        "Na primeira fase do Júri, as alegações finais são orais (art. 411, § 4º, do CPP), mas, convertidas em escritas, a defesa apresenta Memoriais, com aplicação analógica do art. 403, § 3º, do CPP, pedindo impronúncia, absolvição sumária ou desclassificação.",
      distratores: ["resposta-acusacao", "rese", "apelacao", "revisao-criminal"],
    };
  },
};

const geradores = [respostaAcusacao, respostaAcusacaoJuri, memoriais, memoriaisJuri];

export default geradores;
