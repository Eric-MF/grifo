// As prévias de compartilhar: o endereço de cada nota e de cada pontuação, e (quando já geradas, em public/c/) as
// páginas com a og:image da nota certa.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SITE } from "../src/config/site";
import { fmtNota } from "../src/lib/formato";
import { ARQUIVO_PREVIA, caminhoPreviaJogo, caminhoPreviaNota, notaDaPrevia, PONTOS_MAX_PREVIA, trechoDaNota, trechoDosPontos } from "../src/lib/share/previas";

describe("endereço da prévia", () => {
  it("a nota fica com uma casa, e o trecho leva hífen no lugar da vírgula", () => {
    expect(trechoDaNota(7.5)).toBe("7-5");
    expect(trechoDaNota(0)).toBe("0-0");
    expect(trechoDaNota(10)).toBe("10-0");
    expect(trechoDaNota(0.3)).toBe("0-3");
    expect(trechoDaNota(4.05)).toBe("4-0");
    expect(notaDaPrevia(7.55)).toBe("7,5");
  });
  it("a segunda casa é cortada, não arredondada: abaixo do corte nunca vira aprovado", () => {
    expect(notaDaPrevia(5.95)).toBe("5,9");
    expect(notaDaPrevia(5.99)).toBe("5,9");
    expect(notaDaPrevia(6)).toBe("6,0");
    expect(notaDaPrevia(9.99)).toBe("9,9");
  });
  it("em todos os centésimos, a prévia é a nota mostrada (fmtNota) sem a segunda casa", () => {
    for (let c = 0; c <= 1000; c++) {
      const nota = c / 100;
      expect(notaDaPrevia(nota), fmtNota(nota)).toBe(fmtNota(nota).slice(0, -1));
    }
  });
  it("fora de 0 a 10, fica na ponta", () => {
    expect(trechoDaNota(-1)).toBe("0-0");
    expect(trechoDaNota(12)).toBe("10-0");
  });
  it("com o exame, o endereço leva o exame para o redirecionamento", () => {
    expect(caminhoPreviaNota(7.5, 38)).toBe("/c/nota/7-5/?exame=38");
    expect(caminhoPreviaNota(7.5)).toBe("/c/nota/7-5/");
  });
  it("os pontos acima do máximo vão na prévia de 'mais'", () => {
    expect(trechoDosPontos(0)).toBe("0");
    expect(trechoDosPontos(123)).toBe("123");
    expect(trechoDosPontos(PONTOS_MAX_PREVIA)).toBe(String(PONTOS_MAX_PREVIA));
    expect(trechoDosPontos(PONTOS_MAX_PREVIA + 1)).toBe("mais");
    expect(caminhoPreviaJogo("flap-suitcase", 42)).toBe("/c/jogo/flap-suitcase/42/");
  });
});

const PASTA = join(import.meta.dirname, "..", "public");
describe.skipIf(!existsSync(join(PASTA, "c", ".versao")))("páginas geradas (public/c/)", () => {
  it("cada nota tem a página e a imagem, com a og:image dela", () => {
    for (const nota of [0, 0.3, 5.15, 6, 7.5, 10]) {
      const caminho = caminhoPreviaNota(nota);
      const pasta = join(PASTA, caminho);
      expect(existsSync(join(pasta, ARQUIVO_PREVIA)), caminho).toBe(true);
      const html = readFileSync(join(pasta, "index.html"), "utf8");
      expect(html).toContain(`<meta property="og:image" content="${SITE.url}${caminho}${ARQUIVO_PREVIA}">`);
      expect(html).toContain(`Tirei ${notaDaPrevia(nota)} no simulado`);
      expect(html).toContain('<meta name="twitter:card" content="summary_large_image">');
      expect(html).toContain('<meta name="robots" content="noindex">');
    }
  });
  it("todas as 101 notas (0,0 a 10,0) e todos os pontos do jogo (0 a 1.000 e mais) estão lá", () => {
    for (let c = 0; c <= 1000; c++) expect(existsSync(join(PASTA, caminhoPreviaNota(c / 100), ARQUIVO_PREVIA))).toBe(true);
    for (let p = 0; p <= PONTOS_MAX_PREVIA + 1; p++) expect(existsSync(join(PASTA, caminhoPreviaJogo("flap-suitcase", p), ARQUIVO_PREVIA))).toBe(true);
  });
  it("não sobram as prévias antigas, de duas casas", () => {
    expect(existsSync(join(PASTA, "c", "nota", "7-50"))).toBe(false);
  });
  it("as imagens ficam abaixo do limite do WhatsApp (300 KB)", () => {
    for (const nota of [0, 8.88, 10]) expect(readFileSync(join(PASTA, caminhoPreviaNota(nota), ARQUIVO_PREVIA)).length).toBeLessThan(300 * 1024);
  });
});
