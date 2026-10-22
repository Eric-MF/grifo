import { describe, expect, it } from "vitest";
import { ajustarAlvo, buscarTexto, dispDaLinha, faixaDosArtigos, leiNaBusca, temDispositivo, type ArtigoTexto } from "../src/lib/leis/busca.ts";

// artigos montados à mão: uma linha por bloco, com o dispositivo de cada linha
const art5: ArtigoTexto = [
  "art5",
  "Art. 5º",
  "Art. 5º Todos são iguais perante a lei\nI - homens e mulheres são iguais\nXXXV - a lei não excluirá da apreciação do Poder Judiciário lesão\n§ 1º As normas definidoras",
  ["", "i1", "i35", "p1"],
];
const art121: ArtigoTexto = [
  "art121",
  "Art. 121",
  "Art. 121 Matar alguém\nPena - reclusão, de seis a vinte anos\n§ 2º Se o homicídio é cometido:\nIV - à traição",
  ["", "", "p2", "p2.i4"],
];
// sem a coluna de dispositivos (artigo antigo, sem o 4º elemento)
const semDisps: ArtigoTexto = ["art9", "Art. 9", "Art. 9 Texto simples"];

describe("dispDaLinha — o id completo do dispositivo de cada linha", () => {
  it("linha de inciso e de parágrafo com inciso", () => {
    expect(dispDaLinha(art5, 2)).toBe("art5.i35");
    expect(dispDaLinha(art121, 3)).toBe("art121.p2.i4");
  });

  it("caput (disp vazio) dá o próprio artigo", () => {
    expect(dispDaLinha(art5, 0)).toBe("art5");
    expect(dispDaLinha(art121, 1)).toBe("art121");
  });

  it("sem a coluna de dispositivos, ou linha fora da lista, dá o artigo", () => {
    expect(dispDaLinha(semDisps, 0)).toBe("art9");
    expect(dispDaLinha(art5, 9)).toBe("art5");
  });
});

describe("temDispositivo — se o artigo tem o dispositivo", () => {
  it("existe", () => {
    expect(temDispositivo(art5, "art5.i35")).toBe(true);
    expect(temDispositivo(art5, "art5.p1")).toBe(true);
    expect(temDispositivo(art121, "art121.p2.i4")).toBe(true);
    expect(temDispositivo(art5, "art5")).toBe(true);
  });

  it("não existe", () => {
    expect(temDispositivo(art5, "art5.i36")).toBe(false);
    expect(temDispositivo(art5, "art5.p35")).toBe(false);
    expect(temDispositivo(art5, "art6.i1")).toBe(false);
  });

  it("sem a coluna de dispositivos, só o próprio artigo existe", () => {
    expect(temDispositivo(semDisps, "art9")).toBe(true);
    expect(temDispositivo(semDisps, "art9.p1")).toBe(false);
  });
});

describe("ajustarAlvo — destino da busca rápida", () => {
  it("parágrafo que o artigo não tem vai para o inciso de mesmo número", () => {
    expect(ajustarAlvo({ art: "art5", disp: "art5.p35" }, art5)).toBe("art5.i35");
  });

  it("parágrafo com alínea: troca o parágrafo e mantém a alínea", () => {
    const a: ArtigoTexto = ["art5", "Art. 5º", "x\ny", ["", "i35.aa"]];
    expect(ajustarAlvo({ art: "art5", disp: "art5.p35.aa" }, a)).toBe("art5.i35.aa");
  });

  it("sem a alínea, cai até o inciso", () => {
    const a: ArtigoTexto = ["art5", "Art. 5º", "x\ny", ["", "i35"]];
    expect(ajustarAlvo({ art: "art5", disp: "art5.p35.aa" }, a)).toBe("art5.i35");
  });

  it("parágrafo que existe fica como está", () => {
    expect(ajustarAlvo({ art: "art5", disp: "art5.p1" }, art5)).toBe("art5.p1");
  });

  it("sem a coluna de dispositivos, fica o digitado", () => {
    expect(ajustarAlvo({ art: "art5", disp: "art5.p35" }, ["art5", "Art. 5º", "texto"])).toBe("art5.p35");
  });

  it("nada existe: devolve o dispositivo digitado", () => {
    expect(ajustarAlvo({ art: "art5", disp: "art5.p99" }, art5)).toBe("art5.p99");
  });

  it("sem dispositivo digitado, ou sem o artigo, devolve o artigo", () => {
    expect(ajustarAlvo({ art: "art5" }, art5)).toBe("art5");
    expect(ajustarAlvo({ art: "art5" }, undefined)).toBe("art5");
    expect(ajustarAlvo({ art: "art5", disp: "art5.i1" }, undefined)).toBe("art5.i1");
  });
});

describe("buscarTexto — dispositivo da linha em que a palavra aparece", () => {
  it("palavra num inciso: traz o dispositivo", () => {
    const [achado] = buscarTexto("lesao", [art5]);
    expect(achado?.art).toBe("art5");
    expect(achado?.disp).toBe("art5.i35");
  });

  it("palavra num inciso de parágrafo: traz o dispositivo completo", () => {
    const [achado] = buscarTexto("traicao", [art121]);
    expect(achado?.disp).toBe("art121.p2.i4");
  });

  it("palavra no caput: sem disp", () => {
    const [achado] = buscarTexto("iguais", [art5]);
    expect(achado?.art).toBe("art5");
    expect(achado && "disp" in achado).toBe(false);
  });

  it("palavra na linha do caput do art. 121 (Pena): sem disp", () => {
    const [achado] = buscarTexto("pena", [art121]);
    expect(achado?.achado).toBe("Pena");
    expect(achado && "disp" in achado).toBe(false);
  });

  it("artigo sem a coluna de dispositivos: sem disp", () => {
    const [achado] = buscarTexto("simples", [semDisps]);
    expect(achado && "disp" in achado).toBe(false);
  });
});

describe("leiNaBusca — lei do leitor junto de palavras", () => {
  it("lei no fim, com ou sem conector", () => {
    expect(leiNaBusca("absolvição cpp")).toEqual({ lei: "cpp", resto: "absolvicao" });
    expect(leiNaBusca("absolvição do CPP")).toEqual({ lei: "cpp", resto: "absolvicao" });
    expect(leiNaBusca("absolvição no cpp")).toEqual({ lei: "cpp", resto: "absolvicao" });
    expect(leiNaBusca("lesão corporal código penal")).toEqual({ lei: "cp", resto: "lesao corporal" });
    expect(leiNaBusca("tráfico lei de drogas")).toEqual({ lei: "lei-11343", resto: "trafico" });
  });

  it("lei no começo, com ou sem conector", () => {
    expect(leiNaBusca("cpp absolvição sumária")).toEqual({ lei: "cpp", resto: "absolvicao sumaria" });
    expect(leiNaBusca("cpp, absolvição")).toEqual({ lei: "cpp", resto: "absolvicao" });
    expect(leiNaBusca("cpp do absolvição")).toEqual({ lei: "cpp", resto: "absolvicao" });
  });

  it("nulo: referência a artigo, lei sem palavras, texto sem lei", () => {
    expect(leiNaBusca("100 cp")).toBeNull();
    expect(leiNaBusca("cpp")).toBeNull();
    expect(leiNaBusca("constituição")).toBeNull();
    expect(leiNaBusca("pena")).toBeNull();
    expect(leiNaBusca("biblioteca")).toBeNull();
    expect(leiNaBusca("lcp absolvição")).toBeNull();
  });
});

describe("faixaDosArtigos — a faixa de artigos da lei, para a caixa do atalho", () => {
  it("do primeiro ao último número, sem o ADCT nem a letra do artigo", () => {
    const a = (id: string): ArtigoTexto => [id, id, id];
    expect(faixaDosArtigos([a("art1"), a("art5"), a("art250"), a("adct-art138")])).toBe("1-250");
    expect(faixaDosArtigos([a("art1"), a("art359-u"), a("art361")])).toBe("1-361");
    expect(faixaDosArtigos([a("s-1"), a("s-736")])).toBe("1-736");
    expect(faixaDosArtigos([])).toBeNull();
  });
});

describe("buscarTexto — o trecho mostrado fica na linha do achado", () => {
  it("não começa no inciso anterior nem passa para o seguinte", () => {
    const a: ArtigoTexto = ["art5", "Art. 5º", "Art. 5º Todos são iguais\nXXXIV - são a todos assegurados\nXXXV - a lei não excluirá da apreciação\nXXXVI - a lei não prejudicará", ["", "i34", "i35", "i36"]];
    const [r] = buscarTexto("apreciação", [a]);
    expect(r).toMatchObject({ disp: "art5.i35", antes: "XXXV - a lei não excluirá da ", achado: "apreciação" });
    expect(r!.depois).toBe("…");
  });
});
