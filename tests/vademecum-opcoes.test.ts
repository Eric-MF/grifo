import { describe, expect, it } from "vitest";
import { trechos } from "@/lib/leis/referencias";
import type { Bloco } from "@/lib/leis/linha-do-tempo";
import { fatiar } from "@/lib/leis/texto";
import { OPCOES_TEXTO_PADRAO, opcoesTexto } from "@/lib/leis/opcoes";
import { artigoNaFaixa, blocosDoItem, dataDaLei, faixas, marcasPorBloco, opcoesDoVade, OPCOES_VADE_PADRAO, type GrifoVade } from "@/lib/leis/vademecum";

const bloco = (over: Partial<Bloco>): Bloco => ({ tipo: "paragrafo", texto: "", superada: false, atos: [], ...over });

// uma lei pequena: título, caput do art. 1º, um parágrafo, art. 2º (revogado), art. 3º
const lei: Bloco[] = [
  bloco({ tipo: "texto", texto: "Presidência da República" }),
  bloco({ tipo: "texto", texto: "DECRETO-LEI No 2.848, DE 7 DE DEZEMBRO DE 1940" }),
  bloco({ tipo: "estrutura", texto: "TÍTULO I" }),
  bloco({ tipo: "artigo", disp: "art1", rotulo: "Art. 1º", texto: "Art. 1º Não há crime sem lei anterior que o defina." }),
  bloco({ tipo: "paragrafo", disp: "art1.p1", texto: "§ 1º Considera-se crime a conduta tipificada." }),
  bloco({ tipo: "artigo", disp: "art2", rotulo: "Art. 2º", texto: "", superada: true }),
  bloco({ tipo: "artigo", disp: "art3", rotulo: "Art. 3º", texto: "Art. 3º A lei penal não retroage, salvo para beneficiar o réu." }),
];

const grifo = (over: Partial<GrifoVade>): GrifoVade => ({ i: 0, exato: "", prefixo: "", sufixo: "", cor: "#fde047", ...over });

describe("fatiar: os grifos por cima dos trechos", () => {
  it("parte um pedaço nos cortes de uma marca e mantém o texto inteiro", () => {
    const partes = fatiar("Não há crime", 0, [{ ini: 4, fim: 6, cor: "#f00" }]);
    expect(partes.map((p) => p.texto).join("")).toBe("Não há crime");
    expect(partes.find((p) => p.marca)?.texto).toBe("há");
  });

  it("usa a posição do pedaço dentro do bloco (um trecho que começa depois do início)", () => {
    // o pedaço "crime" começa na posição 8 do bloco; a marca cobre "crime" (8-13)
    const partes = fatiar("crime", 8, [{ ini: 8, fim: 13, cor: "#0f0" }]);
    expect(partes).toEqual([{ texto: "crime", marca: { ini: 8, fim: 13, cor: "#0f0" } }]);
  });

  it("sem marca que toque o pedaço, o pedaço sai inteiro e sem marca", () => {
    expect(fatiar("abc", 0, [{ ini: 10, fim: 12, cor: "#000" }])).toEqual([{ texto: "abc" }]);
  });
});

describe("a posição dos trechos é a do texto do bloco (base do grifo sobre o link)", () => {
  it("os trechos de trechos() somam exatamente o texto, com e sem referência", () => {
    const textos = [
      "nos termos do art. 121 do Código Penal, e do art. 2º, § 1º, da Lei 8.072/90.",
      "Art. 10. O art. 35 da Lei nº 6.368, de 21 de outubro de 1976, passa a vigorar acrescido de parágrafo único.",
      "Art. 5º São crimes hediondos os previstos nos arts. 12, 13 e 14.",
    ];
    for (const t of textos) {
      const soma = trechos(t, "lei-8072").map((x) => x.texto).join("");
      expect(soma).toBe(t);
    }
  });
});

describe("marcasPorBloco: o grifo é achado pelo texto, mesmo que o índice do bloco tenha mudado", () => {
  it("acha o trecho no bloco certo e guarda a cor", () => {
    const m = marcasPorBloco(lei, [grifo({ i: 4, disp: "art1.p1", exato: "Considera-se crime", prefixo: "§ 1º ", sufixo: " tipificada" })]);
    expect(m.get(4)).toEqual([{ ini: 5, fim: 5 + "Considera-se crime".length, cor: "#fde047", nota: undefined, inteiro: false }]);
  });

  it("um grifo que não se acha mais na lei fica de fora", () => {
    expect(marcasPorBloco(lei, [grifo({ exato: "trecho que sumiu da lei", i: 4 })]).size).toBe(0);
  });
});

describe("blocosDoItem: o que entra de cada lei", () => {
  it("só os grifos: o parágrafo grifado, com o caput do artigo e o título antes dele", () => {
    const itens = blocosDoItem(lei, { filtro: "grifos", grifos: [grifo({ i: 4, disp: "art1.p1", exato: "Considera-se crime", prefixo: "§ 1º ", sufixo: " tipificada" })] });
    expect(itens.map((x) => x.bloco.disp ?? x.bloco.tipo)).toEqual(["estrutura", "art1", "art1.p1"]);
  });

  it("só os grifos sem nenhum grifo na lei: nada entra", () => {
    expect(blocosDoItem(lei, { filtro: "grifos", grifos: [] })).toEqual([]);
  });

  it("só os erros: somente os artigos da lista de erros, com os seus parágrafos", () => {
    // o título "TÍTULO I" (sem dispositivo) vem junto, como nas outras seleções de artigos
    const itens = blocosDoItem(lei, { filtro: "erros", artigos: "1" });
    expect(itens.map((x) => x.bloco.disp)).toEqual([undefined, "art1", "art1.p1"]);
  });

  it("só os erros sem erro nenhum: nada entra", () => {
    expect(blocosDoItem(lei, { filtro: "erros", artigos: "" })).toEqual([]);
  });

  it("artigos escolhidos (faixas): o texto vigente, sem o artigo revogado", () => {
    const itens = blocosDoItem(lei, { filtro: "tudo", artigos: "2-3" });
    expect(itens.map((x) => x.bloco.disp)).toEqual(["art3"]);
  });

  it("com o modo revogados ligado, o artigo revogado volta ao texto", () => {
    const itens = blocosDoItem(lei, { filtro: "tudo", artigos: "2-3" }, true);
    expect(itens.map((x) => x.bloco.disp)).toEqual(["art2", "art3"]);
  });
});

describe("dataDaLei: a data do título da lei", () => {
  it("lê o dia, o mês e o ano do título", () => {
    expect(dataDaLei(lei)).toBe("1940-12-07");
  });

  it("sem dia no título, usa o ano do registro", () => {
    expect(dataDaLei([bloco({ texto: "CONSTITUIÇÃO DA REPÚBLICA FEDERATIVA DO BRASIL DE 1988" })], 1988)).toBe("1988-00-00");
  });

  it("sem título nem ano, não há data", () => {
    expect(dataDaLei([bloco({ texto: "sem data" })])).toBe("");
  });
});

describe("opções: o padrão e os vades salvos antes das opções novas", () => {
  it("as opções de texto de um vade antigo ganham os padrões (inclusive o Vide, ligado)", () => {
    expect(opcoesTexto({ fonte: "serif" })).toEqual({ ...OPCOES_TEXTO_PADRAO, fonte: "serif" });
    expect(opcoesTexto(undefined).vide).toBe(true);
  });

  it("o vade sem opções tem os índices e as colunas desligados e o link de download ligado", () => {
    const o = opcoesDoVade(undefined);
    expect(o.indices).toEqual({ cronologico: false, remissivo: false });
    expect(o.impressao).toEqual({ colunas: false, novaPaginaPorLei: false });
    expect(o.download).toEqual({ links: true });
    expect(o.texto.vide).toBe(true);
  });

  it("opções parciais completam o resto com o padrão", () => {
    const o = opcoesDoVade({ indices: { cronologico: true, remissivo: false } });
    expect(o.indices.cronologico).toBe(true);
    expect(o.download.links).toBe(OPCOES_VADE_PADRAO.download.links);
  });
});

describe("artigoNaFaixa: artigos e súmulas (s-145) entram nas faixas pelo número", () => {
  const cem = faixas("100-200")!;
  it("a súmula entra na faixa do seu número", () => {
    expect(artigoNaFaixa("s-145", cem)).toBe(true);
  });

  it("a súmula fora da faixa fica de fora", () => {
    expect(artigoNaFaixa("s-99", cem)).toBe(false);
  });

  it("artigo e dispositivo continuam certos, e adct- segue excluído", () => {
    expect(artigoNaFaixa("art145.p1", cem)).toBe(true);
    expect(artigoNaFaixa("art99", cem)).toBe(false);
    expect(artigoNaFaixa("adct-art145", cem)).toBe(false);
  });
});
