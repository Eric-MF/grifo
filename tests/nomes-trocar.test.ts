import { describe, expect, it } from "vitest";
import type { Exame } from "@/content/schema";
import { criarLeitor } from "@/lib/nomes/marcar";
import { trocarNomes } from "@/lib/nomes/trocar";

const leitor = criarLeitor({
  masculinos: ["João", "José", "Júnior", "Junior", "William", "Wiliam", "Ruan"],
  femininos: ["Maria", "Ana"],
  sobrenomes: ["Campos", "Silva"],
  antes_de_lugar: ["São", "Rua"],
  expressoes: ["Maria da Penha"],
});

interface Parte {
  enunciado: string;
  gabarito?: string;
  item?: string;
}

interface Nota {
  alvo: string;
  lei: string;
  texto: string;
}

function montarExame(peca: Parte, q1: Parte = { enunciado: "Responda." }, notas?: Nota[]): Exame {
  const bloco = (p: Parte) => ({
    enunciado: p.enunciado,
    gabarito_comentado: p.gabarito ?? "",
    itens: [{ n: "1", descricao: p.item ?? "", componentes: [] }],
  });
  return {
    id: "99",
    numero: 99,
    numeral: "XCIX",
    peca: { nome: "Peça de teste", tipo: "Peça", aliases: [], linhas: 150, valor: 5, ...bloco(peca) },
    questoes: [{ n: 1, linhas: 30, valor: 1.25, ...bloco(q1) }],
    ...(notas
      ? { atualizado: { revisao: { status: "rascunho", por: "", em: "", notas: "" }, notas, nomes: {}, diferencas: [] } }
      : {}),
  } as unknown as Exame;
}

describe("trocarNomes", () => {
  it("troca a pessoa inteira pelo nome novo, com o sobrenome, no enunciado, no gabarito e nos itens da parte", () => {
    const exame = montarExame({
      enunciado: "Maria Campos encontrou João.",
      gabarito: "Maria Campos é a autora.",
      item: "Maria Campos",
    });
    const { exame: novo, problemas } = trocarNomes(exame, leitor, { peca: { Maria: "Atena", João: "Zeus" } });
    expect(novo.peca.enunciado).toBe("Atena encontrou Zeus.");
    expect(novo.peca.gabarito_comentado).toBe("Atena é a autora.");
    expect(novo.peca.itens[0]!.descricao).toBe("Atena");
    expect(problemas).toEqual([]);
  });

  it("cada parte usa o seu mapa: o João da peça e o da questão 1 recebem nomes diferentes", () => {
    const exame = montarExame({ enunciado: "João viu o caso." }, { enunciado: "João pediu parecer." });
    const { exame: novo, problemas } = trocarNomes(exame, leitor, {
      peca: { João: "Zeus" },
      q1: { João: "Hermes" },
    });
    expect(novo.peca.enunciado).toBe("Zeus viu o caso.");
    expect(novo.questoes[0]!.enunciado).toBe("Hermes pediu parecer.");
    expect(problemas).toEqual([]);
  });

  it("pessoa sem nome novo gera sem-nome e o texto dela fica como está", () => {
    const exame = montarExame({ enunciado: "Maria Campos encontrou Ana." });
    const { exame: novo, problemas } = trocarNomes(exame, leitor, { peca: { Maria: "Atena" } });
    expect(problemas).toEqual([{ alvo: "peca", tipo: "sem-nome", chave: "Ana" }]);
    expect(novo.peca.enunciado).toBe("Atena encontrou Ana.");
  });

  it("nome no mapa que não aparece na parte gera sobrando", () => {
    const exame = montarExame({ enunciado: "Maria Campos encontrou o templo." });
    const { problemas } = trocarNomes(exame, leitor, { peca: { Maria: "Atena", Ruan: "Hades" } });
    expect(problemas).toEqual([{ alvo: "peca", tipo: "sobrando", chave: "Ruan" }]);
  });

  it("dois nomes iguais para pessoas diferentes geram repetido; grafias da mesma pessoa não", () => {
    const dup = trocarNomes(montarExame({ enunciado: "Maria Campos encontrou Ana." }), leitor, {
      peca: { Maria: "Atena", Ana: "Atena" },
    });
    expect(dup.problemas).toEqual([
      { alvo: "peca", tipo: "repetido", chave: "Ana", detalhe: "Atena (também de Maria)" },
    ]);

    const grafias = trocarNomes(
      montarExame({ enunciado: "Júnior e Junior são sócios. William Silva e Wiliam também." }),
      leitor,
      { peca: { Júnior: "Hércules", Junior: "Hércules", William: "Hermes", Wiliam: "Hermes" } },
    );
    expect(grafias.problemas).toEqual([]);
  });

  it("nome novo igual ao de outra pessoa da mesma parte gera colide", () => {
    const exame = montarExame({ enunciado: "João encontrou José." });
    const { problemas } = trocarNomes(exame, leitor, { peca: { João: "José", José: "Zeus" } });
    expect(problemas).toEqual([{ alvo: "peca", tipo: "colide", chave: "João", detalhe: "José" }]);
  });

  it("nome novo de outro gênero gera genero; do mesmo gênero, não", () => {
    const generoDoNome = (n: string) => (n === "Atena" ? "f" : undefined);

    const trocado = trocarNomes(montarExame({ enunciado: "João encontrou o templo." }), leitor, { peca: { João: "Atena" } }, generoDoNome);
    expect(trocado.problemas).toEqual([{ alvo: "peca", tipo: "genero", chave: "João", detalhe: "Atena" }]);

    const mesmo = trocarNomes(montarExame({ enunciado: "Maria encontrou o templo." }), leitor, { peca: { Maria: "Atena" } }, generoDoNome);
    expect(mesmo.problemas).toEqual([]);
  });

  it("o mesmo nome (autor citado no gabarito) não muda o texto, nem com sobrenome", () => {
    const exame = montarExame({ enunciado: "José Silva foi citado.", gabarito: "Segundo José, a tese vale." });
    const { exame: novo, problemas } = trocarNomes(exame, leitor, { peca: { José: "José" } });
    expect(novo.peca.enunciado).toBe("José Silva foi citado.");
    expect(novo.peca.gabarito_comentado).toBe("Segundo José, a tese vale.");
    expect(problemas).toEqual([]);
  });

  it("empresa troca o texto tal e qual em todas as partes e nas notas; Ruan dentro de Ruan S/A não é pessoa", () => {
    const exame = montarExame(
      { enunciado: "A Ruan S/A contratou o advogado.", gabarito: "A Ruan S/A é a parte.", item: "Ruan S/A" },
      { enunciado: "Ruan S/A pediu parecer." },
      [{ alvo: "peca", lei: "Lei 13.964/2019", texto: "Ruan S/A na nota." }],
    );
    const { exame: novo, problemas } = trocarNomes(exame, leitor, { empresas: { "Ruan S/A": "Olimpo S/A" } });
    expect(novo.peca.enunciado).toBe("A Olimpo S/A contratou o advogado.");
    expect(novo.peca.gabarito_comentado).toBe("A Olimpo S/A é a parte.");
    expect(novo.peca.itens[0]!.descricao).toBe("Olimpo S/A");
    expect(novo.questoes[0]!.enunciado).toBe("Olimpo S/A pediu parecer.");
    expect(novo.atualizado!.notas[0]!.texto).toBe("Olimpo S/A na nota.");
    expect(problemas).toEqual([]);
  });

  it("empresa que não aparece em nenhum texto gera empresa-ausente", () => {
    const exame = montarExame({ enunciado: "Texto sem empresa." });
    const { problemas } = trocarNomes(exame, leitor, { empresas: { "Banco Peixe S.A.": "Banco Hefesto" } });
    expect(problemas).toEqual([{ alvo: "empresas", tipo: "empresa-ausente", chave: "Banco Peixe S.A." }]);
  });

  it("as notas de atualização de uma parte recebem a troca dela", () => {
    const exame = montarExame({ enunciado: "Texto sem nomes." }, { enunciado: "Responda." }, [
      { alvo: "q1", lei: "Lei 13.964/2019", texto: "Súmula de João Silva." },
    ]);
    const { exame: novo, problemas } = trocarNomes(exame, leitor, { q1: { João: "Zeus" } });
    expect(novo.atualizado!.notas[0]!.texto).toBe("Súmula de Zeus.");
    expect(problemas).toEqual([]);
  });

  it("'Maria da Penha', uma expressão, não é trocada", () => {
    const exame = montarExame({ enunciado: "Maria Campos citou a Maria da Penha." });
    const { exame: novo, problemas } = trocarNomes(exame, leitor, { peca: { Maria: "Atena" } });
    expect(novo.peca.enunciado).toBe("Atena citou a Maria da Penha.");
    expect(problemas).toEqual([]);
  });

  it("não altera o exame recebido", () => {
    const exame = montarExame(
      { enunciado: "Maria Campos encontrou João.", gabarito: "Maria Campos é a autora.", item: "Maria Campos" },
      { enunciado: "João pediu parecer." },
      [{ alvo: "q1", lei: "Lei 13.964/2019", texto: "Súmula de João Silva." }],
    );
    const antes = structuredClone(exame);
    const { exame: novo } = trocarNomes(exame, leitor, {
      peca: { Maria: "Atena", João: "Zeus" },
      q1: { João: "Hermes" },
    });
    expect(exame).toEqual(antes);
    expect(novo).not.toBe(exame);
    expect(novo.peca.enunciado).toBe("Atena encontrou Zeus.");
  });
});
