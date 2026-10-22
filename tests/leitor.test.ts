import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/storage", () => ({ lerJSON: (_: string, d: unknown) => d, gravarJSON: () => true }));
const { localizar, novaMarcacao } = await import("../src/lib/leis/marcacoes.ts");
const { codificar, decodificar, LIMITE_LINK, pareceCompartilhado } = await import("../src/lib/leis/compartilhar.ts");

describe("marcações: reancoragem pelo texto", () => {
  const textos = ["Art. 1º Não há crime sem lei anterior que o defina.", "Pena - reclusão.", "Art. 2º Ninguém pode ser punido por fato que lei posterior deixa de considerar crime."];
  const m = novaMarcacao(textos[2], textos[2].indexOf("lei posterior"), textos[2].indexOf("lei posterior") + 13, 2, "art2", "#fde047");

  it("acha no bloco original", () => expect(localizar(m, textos, ["art1", "art1", "art2"])).toEqual({ i: 2, ini: textos[2].indexOf("lei posterior"), fim: textos[2].indexOf("lei posterior") + 13 }));

  it("acha depois que os blocos mudaram de posição", () => {
    const novos = ["Rubrica nova", ...textos];
    expect(localizar(m, novos, [undefined, "art1", "art1", "art2"])?.i).toBe(3);
  });

  it("entre duas ocorrências, escolhe a de contexto parecido", () => {
    const t = ["a lei posterior revoga; lei posterior deixa de considerar crime"];
    const alvo = novaMarcacao(textos[2], textos[2].indexOf("lei posterior"), textos[2].indexOf("lei posterior") + 13, 0, undefined, "x");
    expect(localizar(alvo, t, [undefined])?.ini).toBe(t[0].lastIndexOf("lei posterior"));
  });

  it("texto que sumiu não é localizado", () => expect(localizar(m, ["outro texto"], [undefined])).toBeNull());
});

describe("link compartilhado", () => {
  it("ida e volta", async () => {
    const dados = { t: "Meu Vade Mecum", d: [{ lei: "cp" }, { lei: "cpp", artigos: "1-28, 28-A" }] };
    const c = await codificar(dados);
    expect(c.startsWith("v1.")).toBe(true);
    expect(c).toMatch(/^[\w.-]+$/);
    expect(await decodificar(c)).toEqual(dados);
  });

  it("só referências cabem com folga no limite", async () => {
    const c = await codificar({ d: ["cp", "cpp", "lep", "cf", "lei-11343"].map((lei) => ({ lei })) });
    expect(c.length).toBeLessThan(LIMITE_LINK / 10);
  });

  it("rejeita versão desconhecida ou lixo", async () => {
    expect(await decodificar("v9.abc")).toBeNull();
    expect(await decodificar("v1.!!!")).toBeNull();
  });
});

describe("Vade Mecum: faixas de artigos", async () => {
  const { faixas, artigoNaFaixa, blocosEscolhidos } = await import("../src/lib/leis/vademecum.ts");
  it("entende faixas, artigos soltos e letras", () => {
    const f = faixas("1-120, 155, 157-A a 157-C")!;
    expect(artigoNaFaixa("art1", f)).toBe(true);
    expect(artigoNaFaixa("art120.p1", f)).toBe(true);
    expect(artigoNaFaixa("art121", f)).toBe(false);
    expect(artigoNaFaixa("art155", f)).toBe(true);
    expect(artigoNaFaixa("art157-b", f)).toBe(true);
    expect(artigoNaFaixa("art157", f)).toBe(false);
    expect(artigoNaFaixa("adct-art1", f)).toBe(false);
  });
  it("rejeita o que não entende", () => expect(faixas("um a dez")).toBeNull());
  it("leva junto o título e a rubrica que vêm antes do artigo", () => {
    const b = (tipo: string, texto: string, disp?: string) => ({ tipo, texto, disp, superada: false, atos: [] }) as never;
    const blocos = [b("estrutura", "TÍTULO I"), b("rubrica", "Homicídio simples"), b("artigo", "Art. 121", "art121"), b("rubrica", "Induzimento"), b("artigo", "Art. 122", "art122")];
    expect(blocosEscolhidos(blocos, { faixas: faixas("121") }).map((x) => x.bloco.texto)).toEqual(["TÍTULO I", "Homicídio simples", "Art. 121"]);
    expect(blocosEscolhidos(blocos, { artigos: new Set(["art122"]) }).map((x) => x.bloco.texto)).toEqual(["Induzimento", "Art. 122"]);
  });
});

describe("pareceCompartilhado", () => {
  const marca = { i: 3, exato: "trecho", prefixo: "", sufixo: "", cor: "#f5d76e" };

  it("aceita a carga de um grifo, com ou sem sistema de cores", () => {
    expect(pareceCompartilhado({ lei: "cp", m: [marca] })).toBe(true);
    expect(pareceCompartilhado({ lei: "cp", m: [], s: { id: "x", nome: "X" } })).toBe(true);
  });

  it("recusa JSON que não é grifo", () => {
    expect(pareceCompartilhado(null)).toBe(false);
    expect(pareceCompartilhado([])).toBe(false);
    expect(pareceCompartilhado({ lei: "cp" })).toBe(false);
    expect(pareceCompartilhado({ lei: "cp", m: [{ ...marca, i: "3" }] })).toBe(false);
    expect(pareceCompartilhado({ lei: "cp", m: [{ ...marca, cor: undefined }] })).toBe(false);
  });
});
