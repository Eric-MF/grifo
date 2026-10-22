import { describe, expect, it } from "vitest";
import type { SumulasDoTribunal } from "../src/lib/leis/dados.ts";
import { htmlBloco, mapaAncoras } from "../src/lib/leis/html.ts";
import { blocosDaSumulas, disponiveisDe, idSumula, rotaDaLei } from "../src/lib/leis/sumulas.ts";

const C = { b: "b", txt: "txt", ref: "ref", atos: "atos", ato: "ato", info: "inf", infoLinha: "infl", estrela: "est", naoEncontrada: "nao", rotulo: "rot", tipos: { estrutura: "e", rubrica: "r", artigo: "a", paragrafo: "p", inciso: "i", alinea: "al", texto: "t" } };

type Sumula = SumulasDoTribunal["sumulas"][number];
const sumula = (o: Partial<Sumula> & { numero: number }): Sumula => ({
  tribunal: "stj",
  status: "vigente",
  baixada: true,
  enunciado: `Enunciado ${o.numero}.`,
  url: "https://scon.stj.jus.br/SCON/",
  vide: [],
  extras: {},
  ...o,
});
const lista = (tribunal: "stf" | "stj", sumulas: Sumula[]): SumulasDoTribunal => ({
  tribunal,
  fonte: "https://fonte.example/",
  coletadoEm: "2026-10-17",
  total: sumulas.length,
  baixadas: sumulas.filter((s) => s.baixada).length,
  sumulas,
});

describe("súmulas como leitura de lei", () => {
  it("usa só as súmulas com texto, em ordem de número", () => {
    const stj = lista("stj", [sumula({ numero: 12 }), sumula({ numero: 3 }), sumula({ numero: 7, baixada: false })]);
    const blocos = blocosDaSumulas(stj, { stf: new Set(), stj: new Set([3, 12]) });
    expect(blocos.map((b) => b.disp)).toEqual(["s-3", "s-12"]);
  });

  it("o rótulo entra no texto, como o 'Art. N' das leis, e a âncora é a própria súmula", () => {
    const [b] = blocosDaSumulas(lista("stj", [sumula({ numero: 3, enunciado: "É válido." })]), { stf: new Set(), stj: new Set([3]) });
    expect(b).toMatchObject({ tipo: "artigo", rotulo: "Súmula 3", ancora: "s-3", texto: "Súmula 3 É válido.", superada: false });
  });

  it("súmula superada ou cancelada fica de fora da leitura atual e mostra o status como anotação", () => {
    const [b] = blocosDaSumulas(lista("stj", [sumula({ numero: 5, status: "cancelada" })]), { stf: new Set(), stj: new Set([5]) });
    expect(b!.superada).toBe(true);
    expect(b!.atos[0]).toEqual({ tipo: "outro", bruto: "(Cancelada)" });
  });

  it("o Vide só vira link quando a súmula citada também tem texto", () => {
    const s = sumula({
      numero: 3,
      vide: [
        { texto: "Vide Súmula 12 do STJ.", alvo: { tribunal: "stj", numero: 12 } },
        { texto: "Vide Súmula 999 do STJ", alvo: { tribunal: "stj", numero: 999 } },
      ],
    });
    const [b] = blocosDaSumulas(lista("stj", [s]), { stf: new Set(), stj: new Set([3, 12]) });
    expect(b!.atos[0]).toEqual({ tipo: "vide", bruto: "(Vide Súmula 12 do STJ)", lei: "sumulas-stj", art: "s-12" });
    expect(b!.atos[1]).toEqual({ tipo: "vide", bruto: "(Vide Súmula 999 do STJ)" });
  });

  it("as informações adicionais vêm como linhas, com o link para o site do tribunal", () => {
    const s = sumula({
      numero: 3,
      extras: { julgamento: "11/03/2020", jurisprudencia: [{ titulo: "HC", ementa: "x", referencia: "HC 1" }] },
      url: "https://fonte.example/3",
    });
    const [b] = blocosDaSumulas(lista("stj", [s]), { stf: new Set(), stj: new Set([3]) });
    expect(b!.info).toEqual([
      { rotulo: "Julgamento", texto: "11/03/2020" },
      { rotulo: "Jurisprudência selecionada", texto: "HC x [HC 1]" },
      { rotulo: "Site", texto: "Ver no site do STJ", href: "https://fonte.example/3" },
    ]);
  });

  it("disponiveisDe lista os números com texto de cada tribunal", () => {
    const disponiveis = disponiveisDe(lista("stf", [sumula({ numero: 1, tribunal: "stf" }), sumula({ numero: 2, baixada: false })]), lista("stj", [sumula({ numero: 9 })]));
    expect([...disponiveis.stf]).toEqual([1]);
    expect([...disponiveis.stj]).toEqual([9]);
  });

  it("rota e id: as súmulas têm o seu caminho e os seus dispositivos", () => {
    expect(rotaDaLei("sumulas-stj")).toBe("/leis/sumulas/stj/");
    expect(rotaDaLei("cp")).toBe("/leis/cp/");
    expect(idSumula(154)).toBe("s-154");
  });

  it("o HTML do bloco traz a âncora, o Vide como link interno com prévia e as informações (escondidas por padrão)", () => {
    const s = sumula({
      numero: 3,
      vide: [{ texto: "Vide Súmula 12 do STJ", alvo: { tribunal: "stj", numero: 12 } }],
      extras: { julgamento: "11/03/2020" },
    });
    const blocos = blocosDaSumulas(lista("stj", [s]), { stf: new Set(), stj: new Set([3, 12]) });
    const html = htmlBloco(blocos[0]!, 0, "sumulas-stj", "https://fonte.example/", mapaAncoras(blocos, "sumulas-stj"), C);
    expect(html).toContain('id="s-3"');
    expect(html).toContain('href="/leis/sumulas/stj/#s-12"');
    expect(html).toContain('data-lei="sumulas-stj" data-art="s-12"');
    expect(html).toContain('<span class="inf"><span class="infl"><strong>Julgamento:</strong> 11/03/2020</span>');
  });
});
