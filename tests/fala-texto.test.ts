import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { paraFala, partirFala, pecasDoTexto, type TipoBloco } from "../src/lib/fala/texto.ts";
import { corrigido } from "../src/lib/leis/texto.ts";

const falar = (t: string, tipo?: TipoBloco) => pecasDoTexto(t, tipo).map((p) => p.falar);

describe("paraFala: rótulos do começo do bloco", () => {
  it.each([
    ["Art. 121. Matar alguem:", "artigo", "Artigo cento e vinte e um. Matar alguém:"],
    ["Art. 5º Todos são iguais perante a lei", "artigo", "Artigo quinto. Todos são iguais perante a lei"],
    ["Art. 10 - O dia do começo inclui-se no cômputo do prazo.", "artigo", "Artigo dez. O dia do começo inclui-se no cômputo do prazo."],
    ["Art. 1o O processo penal reger-se-á", "artigo", "Artigo primeiro. O processo penal reger-se-á"],
    ["Art. 155-A. Texto.", "artigo", "Artigo cento e cinquenta e cinco á. Texto."],
    ["Art. 359-M-A. Quando os delitos", "artigo", "Artigo trezentos e cinquenta e nove eme á. Quando os delitos"],
    ["§ 2º-B. A pena é aumentada de:", "paragrafo", "Parágrafo segundo bê. A pena é aumentada de:"],
    ["§ 1 o -A. Divulgar, sem justa causa", "paragrafo", "Parágrafo primeiro á. Divulgar, sem justa causa"],
    ["Parágrafo único. Aplica-se", "paragrafo", "Parágrafo único. Aplica-se"],
    ["LXXVIII - a todos são assegurados", "inciso", "Inciso setenta e oito. a todos são assegurados"],
    ["VII – contra:", "inciso", "Inciso sétimo. contra:"],
    ["b) membro do Poder Judiciário", "alinea", "Alínea bê. membro do Poder Judiciário"],
    ["Súmula 711 A lei penal mais grave", "artigo", "Súmula setecentos e onze. A lei penal mais grave"],
    ["CAPÍTULO II", "estrutura", "Capítulo segundo."],
    ["Seção I", "estrutura", "Seção primeira."],
    ["DOS CRIMES CONTRA A VIDA", "estrutura", "Dos crimes contra a vida"],
    ["Pena - reclusão, de seis a vinte anos.", "texto", "Pena: reclusão, de seis a vinte anos."],
    ["Infração - gravíssima;", "texto", "Infração: gravíssima;"],
  ] as [string, TipoBloco, string][])("%s", (texto, tipo, esperado) => {
    expect(paraFala(texto, { inicio: true, tipo })).toBe(esperado);
  });
});

describe("paraFala: referências e números no meio do texto", () => {
  it.each([
    ["no art. 121, § 2º, I e IV, e no art. 157, § 3º", "no artigo cento e vinte e um, parágrafo segundo, inciso primeiro e quarto, e no artigo cento e cinquenta e sete, parágrafo terceiro"],
    ["nos arts. 142 e 144 da Constituição", "nos artigos cento e quarenta e dois e cento e quarenta e quatro da Constituição"],
    ["das alíneas a e b do inciso II do § 1º", "das alíneas á e bê do inciso segundo do parágrafo primeiro"],
    ["o disposto no caput deste artigo", "o disposto no cáput deste artigo"],
    ["os §§ 4º-A e 4º-B", "os parágrafos quarto á e quarto bê"],
    ["previsto no art. 195, I, “b”, e IV", "previsto no artigo cento e noventa e cinco, inciso primeiro, alínea bê, e quarto"],
    ["de 6 (seis) a 20 (vinte) anos", "de seis a vinte anos"],
    ["menor de 14 (quatorze) anos", "menor de quatorze anos"],
    ["de 20 (vinte) a 40 (quarenta anos)", "de vinte a quarenta anos"],
    ["de 1/3 (um terço) até a metade", "de um terço até a metade"],
    ["aumentada de 2/3", "aumentada de dois terços"],
    ["multa de R$ 1.000,00 a R$ 5.000.000,00", "multa de mil reais a cinco milhões de reais"],
    ["Lei nº 8.072, de 25 de julho de 1990", "Lei número oito mil e setenta e dois, de vinte e cinco de julho de mil novecentos e noventa"],
    ["Leis nºs 7.990, de 1989", "Leis números sete mil novecentos e noventa, de mil novecentos e oitenta e nove"],
    ["a EC 132/2023 e a Lei 9.099/95", "a EC cento e trinta e dois, de dois mil e vinte e três e a Lei nove mil e noventa e nove, de noventa e cinco"],
    ["em 1º de janeiro, na 2ª Turma", "em primeiro de janeiro, na segunda Turma"],
    ["de 1º/1/1996 a 30/6/1996", "de primeiro de janeiro de mil novecentos e noventa e seis a trinta de junho de mil novecentos e noventa e seis"],
    ["publicado no DOU de 5.9.2019", "publicado no DOU de cinco de setembro de dois mil e dezenove"],
    ["10% do valor; 0,5 ponto", "dez por cento do valor; zero vírgula cinco ponto"],
    ["110 km/h (cento e dez quilômetros por hora)", "cento e dez quilômetros por hora"],
    ["II - (VETADO);", "Inciso segundo. vetado;"],
    ["§ 3º (Revogado).", "Parágrafo terceiro. Revogado."],
    ["SDH/PR encaminhará", "SDH PR encaminhará"],
  ])("%s", (texto, esperado) => {
    expect(paraFala(texto, { inicio: /^[IVX§]/.test(texto) })).toBe(esperado.charAt(0).toUpperCase() + esperado.slice(1));
  });

  it("o que não tem o que dizer fica vazio", () => {
    expect(paraFala("...........................")).toBe("");
    expect(paraFala("*")).toBe("");
  });
});

describe("partirFala", () => {
  it("não parte depois de abreviatura (“art.”, “n.”) nem deixa o rótulo sozinho", () => {
    const t = "Art. 1º Não há crime sem lei anterior que o defina. Não há pena sem prévia cominação legal.";
    expect(partirFala(t).map((p) => t.slice(p.ini, p.fim))).toEqual(["Art. 1º Não há crime sem lei anterior que o defina.", "Não há pena sem prévia cominação legal."]);
  });

  it("parte no ponto e vírgula e nos dois-pontos", () => {
    const t = "São efeitos: I - a perda; II - a incapacidade para o exercício do poder familiar, tutela ou curatela nos crimes dolosos;";
    const pecas = partirFala(t, 60).map((p) => t.slice(p.ini, p.fim));
    expect(pecas.length).toBeGreaterThanOrEqual(2);
    expect(pecas[0]).toBe("São efeitos: I - a perda;");
    expect(pecas[1]).toMatch(/^II - a incapacidade/);
  });

  it("parte uma frase longa na vírgula, sem separar a referência (“art. 157, I e II”)", () => {
    const t =
      "Se o agente comete o crime impelido por motivo de relevante valor social ou moral, ou sob o domínio de violenta emoção, logo em seguida a injusta provocação da vítima, nos termos do art. 157, I e II, o juiz pode reduzir a pena de um sexto a um terço.";
    const pecas = partirFala(t, 120).map((p) => t.slice(p.ini, p.fim));
    expect(pecas.length).toBeGreaterThan(1);
    for (const p of pecas) expect(p.length).toBeLessThanOrEqual(120);
    expect(pecas.some((p) => /^I e II/.test(p))).toBe(false);
  });

  it("os intervalos apontam para o texto do bloco (para destacar o trecho dito)", () => {
    const t = "§ 1º Se resulta:  incapacidade para as ocupações habituais, por mais de trinta dias; perigo de vida.";
    for (const p of pecasDoTexto(t, "paragrafo")) {
      expect(t.slice(p.ini, p.fim).trim()).toBe(t.slice(p.ini, p.fim));
      expect(p.fim).toBeGreaterThan(p.ini);
    }
  });
});

describe("todas as leis do Grifo", () => {
  // o texto de cada lei como o leitor mostra; nada pode sobrar para a voz soletrar ou ler como símbolo
  const pasta = join(process.cwd(), "content/leis-texto");
  const arquivos = readdirSync(pasta).filter((f) => f.endsWith(".json") && !f.startsWith("_"));
  it.each(arquivos)("%s", (arquivo) => {
    const lei = JSON.parse(readFileSync(join(pasta, arquivo), "utf8")) as { blocos?: { tipo: TipoBloco; texto: string; superada?: boolean }[] };
    const problemas: string[] = [];
    for (const b of lei.blocos ?? []) {
      if (b.superada || !b.texto) continue;
      for (const f of falar(corrigido(b.texto), b.tipo)) {
        if (/\d|§|undefined|NaN|[<>@#*=|~^$]/.test(f) || /(?<![\wÀ-ÿ-])(?:[IVX]{2,})(?![\wÀ-ÿ])/.test(f) || f.length > 280) problemas.push(f.slice(0, 160));
      }
    }
    // alguns poucos casos tolerados (siglas como "IPCA-E" e referências raras); o resto tem de sair limpo
    expect(problemas.length, problemas.slice(0, 5).join("\n")).toBeLessThanOrEqual(3);
  });
});
