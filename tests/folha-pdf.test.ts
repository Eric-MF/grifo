import { describe, expect, it } from "vitest";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { LayoutSchema, PADRAO, layoutGravado, mesclar } from "../src/lib/folha/layout.ts";
import { gerarCaligrafia, gerarFolha, linhasDaCaligrafia, palavrasDoTexto, sorteioFixo } from "../src/lib/folha/pdf.ts";

async function textos(bytes: Uint8Array): Promise<string[]> {
  const doc = await getDocument({ data: bytes.slice(), verbosity: 0 }).promise;
  const paginas: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const c = await (await doc.getPage(p)).getTextContent();
    paginas.push(c.items.map((i) => ("str" in i ? i.str : "")).join(" ").replace(/\s+/g, " "));
  }
  return paginas;
}

const AGORA = new Date(2026, 9, 20, 14, 5);

describe("folha de respostas", () => {
  it("o padrão passa no schema e o arquivo gravado se mescla sobre ele", () => {
    expect(LayoutSchema.safeParse(PADRAO).success).toBe(true);
    expect(layoutGravado().linhas.quantidade).toBe(30);
    const m = mesclar(PADRAO, { linhas: { altura: 8 } });
    expect(m.linhas.altura).toBe(8);
    expect(m.linhas.quantidade).toBe(30);
  });

  it("'**trecho**' destaca e '\\*' é um asterisco; a pontuação colada fica na mesma palavra", () => {
    const p = palavrasDoTexto("**\\*ATENÇÃO:** transcrever a **PEÇA PROFISSIONAL**. Caso");
    expect(p.map((w) => w.map((x) => (x.destaque ? `[${x.t}]` : x.t)).join(""))).toEqual(["[*ATENÇÃO:]", "transcrever", "a", "[PEÇA]", "[PROFISSIONAL].", "Caso"]);
  });

  it("5 páginas de peça e 4 de questões, com cabeçalho, linhas e rodapé", async () => {
    const { bytes, caixas } = await gerarFolha({ layout: PADRAO, exame: 41, agora: AGORA, sorteio: sorteioFixo(7) });
    const t = await textos(bytes);
    expect(t).toHaveLength(9);
    expect(t[0]).toContain("PEÇA");
    expect(t[0]).toContain("PROFISSIONAL - PÁGINA");
    expect(t[0]).toContain("1/5");
    expect(t[0]).toContain("*ATENÇÃO:");
    expect(t[0]).toContain("05142010202641");
    expect(t[0]).toContain("DIREITO PENAL");
    expect(t[0]).toContain("41º EXAME DE ORDEM UNIFICADO - 2ª FASE");
    expect(t[0]).toContain("SIMULADO PRÁTICO-PROFISSIONAL");
    expect(t[0]).toContain("Página 1 de 9");
    expect(t[0]).toMatch(/\b[1-9]\/[1-9]\d{4} - [1-9]\d{13}\b/);
    expect(t[0]).not.toMatch(/VERSÃO ATUALIZADA/i);
    // a numeração das linhas da peça continua de uma página para a outra
    expect(t[4]).toContain("5/5");
    expect(t[4]).toMatch(/\b121\b.*\b150\b/);
    expect(t[5]).toContain("QUESTÃO 1");
    expect(t[5]).toContain("QUESTÃO PRÁTICA Nº 01.");
    expect(t[5]).toContain("Em hipótese alguma");
    expect(t[5]).toMatch(/\b1\b.*\b30\b/);
    expect(t[8]).toContain("QUESTÃO 4");
    expect(t[8]).toContain("Página 9 de 9");
    // o número do canto é o mesmo em todas as páginas, de 1 a 15
    const canto = caixas.filter((c) => c.chave === "numero");
    expect(canto).toHaveLength(9);
    for (const chave of ["pecaTitulo", "atencao", "barras", "linhas", "codigo", "rodapeLinha", "logoGrifo", "palavraGrifo", "exame", "pagina"])
      expect(caixas.some((c) => c.chave === chave && c.pagina === 0)).toBe(true);
  });

  it("sem exame, o rodapé fica com '__' e o número do código de barras sem o exame", async () => {
    const { bytes } = await gerarFolha({ layout: PADRAO, exame: null, agora: AGORA, sorteio: sorteioFixo(1), paginas: [0] });
    const [t] = await textos(bytes);
    expect(t).toContain("__º EXAME DE ORDEM UNIFICADO - 2ª FASE");
    expect(t).toContain("051420102026");
    expect(t).not.toContain("05142010202641");
  });

  it("só as páginas pedidas (a prévia do editor)", async () => {
    const { bytes } = await gerarFolha({ layout: PADRAO, agora: AGORA, paginas: [6] });
    const t = await textos(bytes);
    expect(t).toHaveLength(1);
    expect(t[0]).toContain("QUESTÃO 2");
    expect(t[0]).toContain("Página 7 de 9");
  });
});

describe("fundo cinza nos números de 5 em 5", () => {
  // os retângulos preenchidos de cinza de uma página (pdfjs devolve a cor de preenchimento em hexadecimal)
  async function cinzas(bytes: Uint8Array): Promise<number> {
    const { OPS } = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const doc = await getDocument({ data: bytes.slice(), verbosity: 0 }).promise;
    const ops = await (await doc.getPage(1)).getOperatorList();
    let n = 0;
    ops.fnArray.forEach((f, k) => {
      if (f === OPS.setFillRGBColor && ops.argsArray[k]?.[0] === "#d9d9d9") n++;
    });
    return n;
  }

  it("6 caixas por página de 30 linhas (5, 10 … 30), e nenhuma quando desligado", async () => {
    expect(await cinzas((await gerarFolha({ layout: PADRAO, agora: AGORA, paginas: [0] })).bytes)).toBe(6);
    // na 2ª página da peça (linhas 31 a 60), também 35, 40 … 60
    expect(await cinzas((await gerarFolha({ layout: PADRAO, agora: AGORA, paginas: [1] })).bytes)).toBe(6);
    const sem = mesclar(PADRAO, { linhas: { cinzaCada5: false } });
    expect(await cinzas((await gerarFolha({ layout: sem, agora: AGORA, paginas: [0] })).bytes)).toBe(0);
  });
});

describe("caderno de caligrafia", () => {
  it("as linhas da folha de respostas, quantas couberem, sem cabeçalho nem rodapé", async () => {
    expect(linhasDaCaligrafia(PADRAO)).toBe(38);
    const t = await textos(await gerarCaligrafia({ layout: PADRAO, paginas: 3, meiaLinha: true }));
    expect(t).toHaveLength(3);
    expect(t[1]).toMatch(/\b1\b.*\b38\b/);
    expect(t[1]).toContain("2/3");
    expect(t[1]).not.toContain("DIREITO PENAL");
    expect(t[1]).not.toContain("GRIFO");
  });
});
