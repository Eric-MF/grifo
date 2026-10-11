import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { parse } from "yaml";

vi.mock("@/lib/storage", () => ({ lerJSON: (_: string, d: unknown) => d, gravarJSON: () => true }));
const { htmlBloco, mapaAncoras } = await import("../src/lib/leis/html.ts");
const { artigoDigitado, buscarTexto, sugerirArtigos } = await import("../src/lib/leis/busca.ts");
const { imantar, indicePorPosicao, modoPorPosicao, mover, proximoPonto, secoesDosArtigos } = await import("../src/lib/leis/rolagem.ts");
const { grifoDe } = await import("../src/lib/leis/grifos.ts");
const { SISTEMAS_PRONTOS } = await import("../src/lib/leis/legendas.ts");

const C = { b: "b", txt: "txt", ref: "ref", atos: "atos", ato: "ato", estrela: "est", tipos: { estrutura: "e", rubrica: "r", artigo: "a", paragrafo: "p", inciso: "i", alinea: "al", texto: "t" } };
const bloco = (o: Record<string, unknown>) => ({ superada: false, atos: [], ...o }) as never;

describe("HTML dos blocos", () => {
  const blocos = [
    bloco({ tipo: "artigo", disp: "art121", rotulo: "Art. 121", texto: "Art. 121. Matar <alguém>, salvo o art. 59 e a Lei nº 8.072, de 25 de julho de 1990", atos: [{ tipo: "redacao", bruto: "(Redação dada pela Lei nº 1)", href: "../L1.htm" }] }),
    bloco({ tipo: "artigo", disp: "art121", rotulo: "Art. 121", texto: "Art. 121. antigo", superada: true }),
  ];
  const html = htmlBloco(blocos[0], 0, "cp", "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848.htm", mapaAncoras(blocos), C);

  it("escapa o texto e põe a âncora no bloco vigente", () => {
    expect(html).toContain('id="art121"');
    expect(html).toContain("Matar &lt;alguém&gt;");
    expect(htmlBloco(blocos[1], 1, "cp", "https://x/", mapaAncoras(blocos), C)).not.toContain("id=");
  });
  it("referências levam lei e artigo para o pop-up", () => {
    expect(html).toContain('href="#art59"');
    expect(html).toContain('data-lei="cp" data-art="art59"');
    expect(html).toContain('href="/leis/lei-8072/"');
  });
  it("anotação aponta para a lei alteradora no Planalto", () => {
    expect(html).toContain('href="https://www.planalto.gov.br/ccivil_03/L1.htm"');
  });
  it("estrela só no artigo vigente", () => {
    expect(html).toContain('data-estrela="art121"');
    expect(htmlBloco(blocos[1], 1, "cp", "https://x/", mapaAncoras(blocos), C)).not.toContain("data-estrela");
  });
});

describe("busca", () => {
  const artigos: [string, string, string][] = [
    ["art121", "Art. 121", "Art. 121. Matar alguém: Pena - reclusão, de seis a vinte anos."],
    ["art121-a", "Art. 121-A", "Art. 121-A. Matar a mulher por razões da condição do sexo feminino"],
    ["art155", "Art. 155", "Art. 155 - Subtrair, para si ou para outrem, coisa alheia móvel"],
    ["art1210", "Art. 1210", "Art. 1210 qualquer"],
  ];
  it("reconhece número de artigo digitado", () => {
    expect(artigoDigitado("art. 155-A")).toBe("art155-a");
    expect(artigoDigitado("5º")).toBe("art5");
    expect(artigoDigitado("homicídio")).toBeNull();
  });
  it("sugere o exato primeiro", () => expect(sugerirArtigos("121", artigos).map((a) => a[0])).toEqual(["art121", "art121-a", "art1210"]));
  it("acha palavras sem acento e em qualquer ordem", () => {
    expect(buscarTexto("reclusao matar", artigos).map((a) => a.art)).toEqual(["art121"]);
    expect(buscarTexto("MULHER", artigos)[0]).toMatchObject({ art: "art121-a", achado: "mulher" });
  });
  it("entre aspas, a expressão exata", () => {
    expect(buscarTexto('"coisa alheia"', artigos).map((a) => a.art)).toEqual(["art155"]);
    expect(buscarTexto('"alheia coisa"', artigos)).toEqual([]);
  });
});

describe("slide lateral", () => {
  it("o terço da tela onde está o dedo escolhe o modo", () => {
    expect(modoPorPosicao(100, 900, true)).toBe("marcas");
    expect(modoPorPosicao(450, 900, true)).toBe("fino");
    expect(modoPorPosicao(800, 900, true)).toBe("rapido");
    expect(modoPorPosicao(100, 900, false)).toBe("fino");
    expect(modoPorPosicao(800, 900, false)).toBe("rapido");
    expect(modoPorPosicao(-50, 900, true)).toBe("marcas");
    expect(modoPorPosicao(5000, 900, true)).toBe("rapido");
  });
  it("rápido acompanha o dedo; fino anda um artigo a cada 14 px", () => {
    expect(mover(0, 500, "rapido", 801, 500)).toBe(800);
    expect(mover(400, -250, "rapido", 801, 500)).toBe(0);
    expect(mover(10, 28, "fino", 801, 500)).toBe(12);
    expect(mover(5, -1000, "fino", 100, 500)).toBe(0);
    expect(mover(5, 1000, "rapido", 100, 500)).toBe(99);
    expect(indicePorPosicao(250, 500, 801)).toBe(400);
    expect(indicePorPosicao(-20, 500, 801)).toBe(0);
  });
  it("marcações: próximo ponto e ímã", () => {
    const pontos = [3, 40, 90];
    expect(proximoPonto(pontos, 3, 1)).toBe(40);
    expect(proximoPonto(pontos, 50, -1)).toBe(40);
    expect(proximoPonto(pontos, 95, 1)).toBe(90);
    expect(proximoPonto(pontos, 1, -1)).toBe(3);
    expect(imantar(42.5, pontos, 3)).toBe(40);
    expect(imantar(60, pontos, 3)).toBeNull();
  });
  it("divisão de cada artigo e marcos dos títulos", () => {
    const b = (tipo: string, texto: string, disp?: string) => ({ tipo, texto, disp, superada: false });
    const { secoes, marcos } = secoesDosArtigos(
      [
        b("estrutura", "DECRETO-LEI Nº 3.689"),
        b("estrutura", "TÍTULO II"),
        b("estrutura", "DO INQUÉRITO POLICIAL"),
        b("artigo", "Art. 4º", "art4"),
        b("estrutura", "CAPÍTULO I"),
        b("estrutura", "DA PRISÃO EM FLAGRANTE E DA"),
        b("estrutura", "AUDIÊNCIA DE CUSTÓDIA"),
        b("artigo", "Art. 5º", "art5"),
        b("estrutura", "TÍTULO III"),
        b("artigo", "Art. 24", "art24"),
      ],
      [["art4"], ["art5"], ["art24"]],
    );
    expect(secoes).toEqual(["Título II · Do inquérito policial", "Título II › Capítulo I · Da prisão em flagrante e da audiência de custódia", "Título III"]);
    expect(marcos).toEqual([
      { k: 0, rotulo: "Título II" },
      { k: 2, rotulo: "Título III" },
    ]);
  });
});

describe("grifos prontos (content/grifos.yaml)", () => {
  const prontos = parse(readFileSync(join(import.meta.dirname, "..", "content", "grifos.yaml"), "utf8"));
  it("cada regra usa uma cor do seu sistema", () => {
    for (const [sistema, regras] of Object.entries(prontos) as [string, { rotulo: string }[]][]) {
      const cores = SISTEMAS_PRONTOS.find((s) => s.id === sistema)!.cores.map((c) => c.rotulo);
      for (const r of regras) expect(cores, `${sistema}: ${r.rotulo}`).toContain(r.rotulo);
    }
  });
  it("área leva a cor; destaque é grifado", () => {
    const g = grifoDe(prontos, "materias", "cpp");
    expect(g("art581.i4")).toMatchObject({ regra: { rotulo: "Recursos" }, destaque: true });
    expect(g("art580")).toMatchObject({ regra: { rotulo: "Recursos" }, destaque: false });
    expect(g("art70")).toMatchObject({ regra: { rotulo: "Competência" }, destaque: false });
    expect(g("art1")).toBeNull();
    const t = grifoDe(prontos, "teses", "cpp");
    expect(t("art387.p1")?.regra.rotulo).toBe("Pedidos acessórios");
    expect(t("art387")).toBeNull();
    const cf = grifoDe(prontos, "materias", "cf");
    expect(cf("art5.i57")).toMatchObject({ regra: { rotulo: "Direitos fundamentais" }, destaque: true });
    expect(cf("art5.i1")).toMatchObject({ destaque: false });
    expect(cf("art102.i1.a-a")?.regra.rotulo).toBe("Competência");
  });
});
