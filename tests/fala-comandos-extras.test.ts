import { describe, expect, it } from "vitest";
import { interpretarComando, palavrasDe } from "../src/lib/fala/comandos-voz.ts";

const c = (fala: string, recentes?: string) => interpretarComando(fala, recentes ? new Set(palavrasDe(recentes)) : undefined);

describe("a velocidade, o volume e o tom ditos", () => {
  it.each([
    ["velocidade máxima", { tipo: "velocidade", extremo: "max" }],
    ["Velocidade mínima", { tipo: "velocidade", extremo: "min" }],
    ["o mais rápido possível", { tipo: "velocidade", extremo: "max" }],
    ["velocidade 2", { tipo: "velocidade", valor: 2 }],
    ["velocidade dois", { tipo: "velocidade", valor: 2 }],
    ["velocidade 1,5", { tipo: "velocidade", valor: 1.5 }],
    ["velocidade um e meio", { tipo: "velocidade", valor: 1.5 }],
    ["velocidade um vírgula vinte e cinco", { tipo: "velocidade", valor: 1.25 }],
    ["muda a velocidade para 1.8", { tipo: "velocidade", valor: 1.8 }],
    ["velocidade 150%", { tipo: "velocidade", valor: 1.5 }],
    ["velocidade cento e vinte por cento", { tipo: "velocidade", valor: 1.2 }],
    ["velocidade em dobro", { tipo: "velocidade", valor: 2 }],
    ["muito mais rápido", { tipo: "velocidade", passo: 0.5 }],
    ["bem mais devagar", { tipo: "velocidade", passo: -0.5 }],
    ["volume máximo", { tipo: "volume", extremo: "max" }],
    ["volume mínimo", { tipo: "volume", extremo: "min" }],
    ["volume 50%", { tipo: "volume", valor: 0.5 }],
    ["volume cinquenta", { tipo: "volume", valor: 0.5 }],
    ["volume 7", { tipo: "volume", valor: 0.7 }],
    ["volume pela metade", { tipo: "volume", valor: 0.5 }],
    ["voz mais grave", { tipo: "tom", passo: -1 }],
    ["tom mais agudo", { tipo: "tom", passo: 1 }],
    ["tom normal", { tipo: "tom" }],
    ["qual é a velocidade", { tipo: "info", sobre: "velocidade" }],
    ["que lei é essa", { tipo: "info", sobre: "lei" }],
    ["quanto falta para parar", { tipo: "info", sobre: "prazo" }],
  ])("“%s”", (fala, esperado) => {
    expect(c(fala)).toEqual(esperado);
  });

  it("os de antes continuam: mais rápido, velocidade normal, mais alto", () => {
    expect(c("mais rápido")?.tipo).toBe("maisRapido");
    expect(c("velocidade normal")?.tipo).toBe("velocidadeNormal");
    expect(c("mais alto")?.tipo).toBe("maisAlto");
  });
});

describe("os grifos", () => {
  it.each([
    ["ir para o primeiro grifo", { tipo: "grifo", qual: "primeiro" }],
    ["primeiro Grifo", { tipo: "grifo", qual: "primeiro" }],
    ["próximo grifo", { tipo: "grifo", qual: "proximo" }],
    ["grifo anterior", { tipo: "grifo", qual: "anterior" }],
    ["último grifo", { tipo: "grifo", qual: "ultimo" }],
    ["volta um grifo", { tipo: "grifo", qual: "anterior" }],
    ["vai para o grifo", { tipo: "grifo", qual: "proximo" }],
    ["próximo grifo amarelo", { tipo: "grifo", qual: "proximo", cor: "amarelo" }],
    ["próximo grifo de teses", { tipo: "grifo", qual: "proximo", cor: "teses" }],
    ["meu próximo grifo", { tipo: "grifo", qual: "proximo", de: "meus" }],
    ["próximo grifo automático", { tipo: "grifo", qual: "proximo", de: "prontos" }],
    ["próxima marcação verde", { tipo: "grifo", qual: "proximo", cor: "verde" }],
  ])("“%s”", (fala, esperado) => {
    expect(c(fala)).toEqual(esperado);
  });

  it.each([
    ["grifa", { tipo: "grifar", alcance: "trecho" }],
    ["grifa isso", { tipo: "grifar", alcance: "trecho" }],
    ["marca esse trecho de amarelo", { tipo: "grifar", alcance: "trecho", cor: "amarelo" }],
    ["grifar como tese", { tipo: "grifar", alcance: "trecho", cor: "tese" }],
    ["grifa o parágrafo", { tipo: "grifar", alcance: "dispositivo" }],
    ["grifa o artigo inteiro de verde", { tipo: "grifar", alcance: "artigo", cor: "verde" }],
    ["apaga o grifo", { tipo: "desgrifar", alcance: "trecho" }],
    ["tira os grifos do artigo", { tipo: "desgrifar", alcance: "artigo" }],
    ["desgrifa", { tipo: "desgrifar", alcance: "trecho" }],
  ])("“%s”", (fala, esperado) => {
    expect(c(fala)).toEqual(esperado);
  });

  it("a palavra grifo que a própria voz acabou de ler não vira comando", () => {
    expect(c("próximo grifo", "o próximo grifo do trecho")).toBeNull();
  });
});

describe("a estrela, os erros e os dispositivos do artigo", () => {
  it.each([
    ["marca como importante", { tipo: "importante", acao: "marcar" }],
    ["marcar esse artigo como importante", { tipo: "importante", acao: "marcar" }],
    ["dá uma estrela", { tipo: "importante", acao: "marcar" }],
    ["tira a estrela", { tipo: "importante", acao: "desmarcar" }],
    ["próximo artigo importante", { tipo: "importante", acao: "proximo" }],
    ["próxima estrela", { tipo: "importante", acao: "proximo" }],
    ["próximo erro", { tipo: "erro", qual: "proximo" }],
    ["próximo artigo em que errei", { tipo: "erro", qual: "proximo" }],
    ["próximo parágrafo", { tipo: "dispositivo", nivel: "paragrafo", passo: 1 }],
    ["inciso anterior", { tipo: "dispositivo", nivel: "inciso", passo: -1 }],
    ["próxima alínea", { tipo: "dispositivo", nivel: "alinea", passo: 1 }],
    ["pula esse inciso", { tipo: "dispositivo", nivel: "inciso", passo: 1 }],
    ["parágrafo 2", { tipo: "dispositivo", nivel: "paragrafo", n: "2" }],
    ["vai para o parágrafo segundo", { tipo: "dispositivo", nivel: "paragrafo", n: "2" }],
    ["parágrafo único", { tipo: "dispositivo", nivel: "paragrafo", n: "u" }],
    ["inciso quarto", { tipo: "dispositivo", nivel: "inciso", n: "4" }],
    ["inciso IV", { tipo: "dispositivo", nivel: "inciso", n: "4" }],
    ["alínea b", { tipo: "dispositivo", nivel: "alinea", n: "b" }],
    ["alínea bê", { tipo: "dispositivo", nivel: "alinea", n: "b" }],
    ["volta ao caput", { tipo: "repetirArtigo" }],
    ["pula três artigos", { tipo: "pularVarios", n: 3, artigo: true, passo: 1 }],
    ["volta 2 trechos", { tipo: "pularVarios", n: 2, artigo: false, passo: -1 }],
  ])("“%s”", (fala, esperado) => {
    expect(c(fala)).toEqual(esperado);
  });

  it("“ir para o artigo 121 parágrafo 2” continua indo ao artigo", () => {
    expect(c("ir para o artigo 121 parágrafo 2")).toEqual({ tipo: "irPara", alvo: "121 paragrafo 2", sumula: false });
  });
});

describe("o prazo, o fim do artigo, o que ler e o leitor", () => {
  it.each([
    ["parar daqui a 15 minutos", { tipo: "pararEm", minutos: 15 }],
    ["para a leitura em meia hora", { tipo: "pararEm", minutos: 30 }],
    ["desligar em uma hora", { tipo: "pararEm", minutos: 60 }],
    ["timer de 20 minutos", { tipo: "pararEm", minutos: 20 }],
    ["cancela o timer", { tipo: "pararEm", minutos: null }],
    ["repete esse artigo sem parar", { tipo: "aoFimDoArtigo", modo: "repetir" }],
    ["parar no fim de cada artigo", { tipo: "aoFimDoArtigo", modo: "parar" }],
    ["leitura contínua", { tipo: "aoFimDoArtigo", modo: "seguir" }],
    ["pular os títulos", { tipo: "lerTambem", opcao: "titulos", ligar: false }],
    ["ler os títulos", { tipo: "lerTambem", opcao: "titulos", ligar: true }],
    ["sem o nome do crime", { tipo: "lerTambem", opcao: "rubricas", ligar: false }],
    ["ler as anotações", { tipo: "lerTambem", opcao: "notas", ligar: true }],
    ["sem pausa entre os artigos", { tipo: "pausaEntre", ms: 0 }],
    ["pausa longa entre os artigos", { tipo: "pausaEntre", ms: 3000 }],
    ["parar de acompanhar", { tipo: "acompanhar", ligar: false }],
    ["mostra o trecho", { tipo: "voltarAoTrecho" }],
    ["ler daqui", { tipo: "lerDaTela" }],
    ["desliga o microfone", { tipo: "desligarComandos" }],
    ["fundo escuro", { tipo: "leitor", id: "escuro" }],
    ["modo noturno", { tipo: "leitor", id: "escuro" }],
    ["fundo claro", { tipo: "leitor", id: "papel" }],
    ["letra maior", { tipo: "leitor", id: "maior" }],
    ["diminui a letra", { tipo: "leitor", id: "menor" }],
    ["tela cheia", { tipo: "leitor", id: "telacheia", ligar: true }],
    ["sair da tela cheia", { tipo: "leitor", id: "telacheia", ligar: false }],
    ["mostrar o texto revogado", { tipo: "leitor", id: "revogados", ligar: true }],
    ["esconder os revogados", { tipo: "leitor", id: "revogados", ligar: false }],
    ["sem os vides", { tipo: "leitor", id: "vide", ligar: false }],
    ["mostrar os grifos prontos", { tipo: "leitor", id: "prontos", ligar: true }],
    ["só os meus grifos", { tipo: "leitor", id: "sogrifos" }],
    ["mostrar só os grifos automáticos", { tipo: "leitor", id: "soautomaticos" }],
    ["somente os erros", { tipo: "leitor", id: "soerros" }],
    ["mostrar tudo", { tipo: "leitor", id: "tudo" }],
    ["ler de onde parei", { tipo: "leitor", id: "parei" }],
  ])("“%s”", (fala, esperado) => {
    expect(c(fala)).toEqual(esperado);
  });

  it("“onde parei” sozinho continua dizendo onde está; “desliga” sozinho encerra", () => {
    expect(c("onde parei")?.tipo).toBe("ondeEstou");
    expect(c("desliga")?.tipo).toBe("encerrar");
  });
});
