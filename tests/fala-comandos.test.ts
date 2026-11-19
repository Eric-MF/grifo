import { describe, expect, it } from "vitest";
import { alvoFalado, interpretarComando, palavrasDe, pareceComando } from "../src/lib/fala/comandos-voz.ts";
import { alvoDigitado } from "../src/lib/leis/busca.ts";

const tipo = (fala: string, recentes?: string) => interpretarComando(fala, recentes ? new Set(palavrasDe(recentes)) : undefined)?.tipo ?? null;

describe("interpretarComando", () => {
  it.each([
    ["Pausa", "pausar"],
    ["pare", "pausar"],
    ["para de ler", "pausar"],
    ["espera aí", "pausar"],
    ["continua", "continuar"],
    ["Pode continuar", "continuar"],
    ["volta a ler", "continuar"],
    ["lê", "continuar"],
    ["encerrar", "encerrar"],
    ["pare a leitura", "encerrar"],
    ["próximo", "proximo"],
    ["Avança", "proximo"],
    ["volta", "anterior"],
    ["anterior", "anterior"],
    ["repete", "repetir"],
    ["de novo", "repetir"],
    ["próximo artigo", "proximoArtigo"],
    ["pula esse artigo", "proximoArtigo"],
    ["artigo anterior", "artigoAnterior"],
    ["volta um artigo", "artigoAnterior"],
    ["repete o artigo", "repetirArtigo"],
    ["volta para o começo do artigo", "repetirArtigo"],
    ["mais rápido", "maisRapido"],
    ["mais devagar", "maisDevagar"],
    ["velocidade normal", "velocidadeNormal"],
    ["mais alto", "maisAlto"],
    ["aumenta o volume", "maisAlto"],
    ["fala mais baixo", "maisBaixo"],
    ["abaixa o volume", "maisBaixo"],
    ["diminui a velocidade", "maisDevagar"],
    ["onde estou", "ondeEstou"],
    ["que artigo é esse", "ondeEstou"],
    ["ajuda", "ajuda"],
    ["o que eu posso dizer", "ajuda"],
  ])("“%s” → %s", (fala, esperado) => {
    expect(tipo(fala)).toBe(esperado);
  });

  it("fala sem comando não dispara nada", () => {
    expect(tipo("se o agente comete o crime impelido por motivo de relevante valor social")).toBeNull();
    expect(tipo("")).toBeNull();
  });

  it("ir para o artigo: com o número em algarismos ou por extenso, e o dispositivo", () => {
    expect(interpretarComando("ir para o artigo 121")).toEqual({ tipo: "irPara", alvo: "121", sumula: false });
    expect(interpretarComando("vai para o artigo cento e vinte e um")).toEqual({ tipo: "irPara", alvo: "121", sumula: false });
    expect(interpretarComando("leia o artigo quinto")).toEqual({ tipo: "irPara", alvo: "5", sumula: false });
    expect(interpretarComando("ir para o artigo 121 parágrafo segundo inciso quarto")).toEqual({ tipo: "irPara", alvo: "121 paragrafo 2 inciso 4", sumula: false });
    expect(interpretarComando("abre o artigo 155 A")).toEqual({ tipo: "irPara", alvo: "155-a", sumula: false });
    expect(interpretarComando("ir para a súmula 711")).toEqual({ tipo: "irPara", alvo: "711", sumula: true });
    // "artigo 121" sozinho vale; dito pela própria voz no começo do artigo (o eco), não
    expect(interpretarComando("artigo 121")).toEqual({ tipo: "irPara", alvo: "121", sumula: false });
    const lido = new Set(palavrasDe("Artigo cento e vinte e um. Matar alguém:"));
    expect(interpretarComando("artigo 121", lido)).toBeNull();
    expect(interpretarComando("artigo cento e vinte e um", lido)).toBeNull();
    expect(interpretarComando("artigo 500", lido)).toEqual({ tipo: "irPara", alvo: "500", sumula: false });
    // com mais palavras depois, é a leitura ("artigo 121 matar alguém"), não um comando
    expect(interpretarComando("artigo 121 matar alguém")).toBeNull();
    expect(interpretarComando("pula o artigo 500")).toEqual({ tipo: "irPara", alvo: "500", sumula: false });
  });

  it("a lei no fim da frase", () => {
    expect(interpretarComando("artigo 33 da lei de drogas")).toEqual({ tipo: "irPara", alvo: "33", sumula: false, lei: "lei-11343" });
    expect(interpretarComando("ir para o artigo 581 do CPP")).toEqual({ tipo: "irPara", alvo: "581", sumula: false, lei: "cpp" });
    expect(interpretarComando("vai para o artigo quinto da Constituição")).toEqual({ tipo: "irPara", alvo: "5", sumula: false, lei: "cf" });
    expect(interpretarComando("artigo 33 da lei 11.343")).toEqual({ tipo: "irPara", alvo: "33", sumula: false, lei: "lei-11343" });
    expect(interpretarComando("súmula 711 do STF")).toEqual({ tipo: "irPara", alvo: "711", sumula: true, lei: "sumulas-stf" });
    expect(interpretarComando("abre o CPP")).toEqual({ tipo: "lei", lei: "cpp" });
    expect(interpretarComando("ir para a lei Maria da Penha")).toEqual({ tipo: "lei", lei: "lei-11340" });
  });

  it("divisões: capítulo, título, livro, primeiro e último artigo", () => {
    expect(interpretarComando("ir direto para o capítulo II do título II do CPP")).toEqual({
      tipo: "divisao",
      onde: "inicio",
      caminho: [
        { nivel: "capitulo", n: "2" },
        { nivel: "titulo", n: "2" },
      ],
      lei: "cpp",
    });
    expect(interpretarComando("vai para o capítulo dois do título segundo do livro três")).toEqual({
      tipo: "divisao",
      onde: "inicio",
      caminho: [
        { nivel: "capitulo", n: "2" },
        { nivel: "titulo", n: "2" },
        { nivel: "livro", n: "3" },
      ],
    });
    expect(interpretarComando("abre a parte especial")).toEqual({ tipo: "divisao", onde: "inicio", caminho: [{ nivel: "parte", n: "especial" }] });
    expect(interpretarComando("ir para o título nove a")).toEqual({ tipo: "divisao", onde: "inicio", caminho: [{ nivel: "titulo", n: "9-a" }] });
    expect(interpretarComando("último artigo do título dois")).toEqual({ tipo: "divisao", onde: "ultimoArtigo", caminho: [{ nivel: "titulo", n: "2" }] });
    expect(interpretarComando("vai para o último artigo do título 2 do livro 3")).toEqual({
      tipo: "divisao",
      onde: "ultimoArtigo",
      caminho: [
        { nivel: "titulo", n: "2" },
        { nivel: "livro", n: "3" },
      ],
    });
    expect(interpretarComando("último artigo deste capítulo")).toEqual({ tipo: "divisao", onde: "ultimoArtigo", caminho: [{ nivel: "capitulo", n: null }] });
    expect(interpretarComando("primeiro artigo do capítulo três")).toEqual({ tipo: "divisao", onde: "primeiroArtigo", caminho: [{ nivel: "capitulo", n: "3" }] });
    expect(interpretarComando("último artigo da lei")).toEqual({ tipo: "divisao", onde: "ultimoArtigo", caminho: [] });
    expect(interpretarComando("fim da lei")).toEqual({ tipo: "divisao", onde: "ultimoArtigo", caminho: [] });
    expect(interpretarComando("volta para o início")).toEqual({ tipo: "divisao", onde: "inicio", caminho: [] });
    expect(interpretarComando("fim do capítulo")).toEqual({ tipo: "divisao", onde: "ultimoArtigo", caminho: [{ nivel: "capitulo", n: null }] });
    expect(interpretarComando("ir para o início do artigo")).toEqual({ tipo: "repetirArtigo" });
  });

  it.each([
    ["próximo capítulo", "capitulo", 1],
    ["capítulo seguinte", "capitulo", 1],
    ["pula esse capítulo", "capitulo", 1],
    ["próxima seção", "secao", 1],
    ["título anterior", "titulo", -1],
    ["volta um capítulo", "capitulo", -1],
  ] as const)("“%s” → %s %i", (fala, nivel, passo) => {
    expect(interpretarComando(fala)).toEqual({ tipo: "divisaoVizinha", nivel, passo });
  });

  it("pelo nome", () => {
    expect(interpretarComando("ir para o RESE")).toEqual({ tipo: "nome", nome: "rese" });
    expect(interpretarComando("vai para o recurso em sentido estrito")).toEqual({ tipo: "nome", nome: "recurso em sentido estrito" });
    expect(interpretarComando("vai para homicídio")).toEqual({ tipo: "nome", nome: "homicidio" });
    expect(interpretarComando("ir para o título dos crimes contra a vida")).toEqual({ tipo: "nome", nome: "dos crimes contra a vida" });
    expect(interpretarComando("abre a legítima defesa do código penal")).toEqual({ tipo: "nome", nome: "legitima defesa", lei: "cp" });
    // os comandos de sempre não viram nome
    expect(tipo("volta a ler")).toBe("continuar");
    expect(tipo("vai para frente")).toBe("proximo");
    expect(tipo("ir para o próximo")).toBe("proximo");
  });

  it("procurar palavras", () => {
    expect(interpretarComando("procura motivo torpe")).toEqual({ tipo: "procurar", texto: "motivo torpe" });
    expect(interpretarComando("procura motivo torpe no artigo 121")).toEqual({ tipo: "procurar", texto: "motivo torpe", artigo: "121" });
    expect(interpretarComando("busca a palavra perdão judicial no código penal")).toEqual({ tipo: "procurar", texto: "perdao judicial", lei: "cp" });
    expect(interpretarComando("onde fala de violenta emoção")).toEqual({ tipo: "procurar", texto: "violenta emocao" });
    expect(interpretarComando("onde está escrito furto de coisa comum")).toEqual({ tipo: "procurar", texto: "furto de coisa comum" });
    expect(interpretarComando("procura o artigo 121")).toEqual({ tipo: "irPara", alvo: "121", sumula: false });
    expect(interpretarComando("próximo resultado")).toEqual({ tipo: "procurarDeNovo", passo: 1 });
    expect(interpretarComando("procura de novo")).toEqual({ tipo: "procurarDeNovo", passo: 1 });
    expect(interpretarComando("resultado anterior")).toEqual({ tipo: "procurarDeNovo", passo: -1 });
    // a leitura do CPP fala em "busca e apreensão": o eco não vira busca
    const lido = new Set(palavrasDe("Da busca e da apreensão. A busca será domiciliar ou pessoal."));
    expect(interpretarComando("a busca sera domiciliar ou pessoal", lido)).toBeNull();
  });

  it("o destino falado é entendido pela busca do leitor", () => {
    expect(alvoDigitado(alvoFalado("121 parágrafo segundo inciso quarto")!)).toEqual({ art: "art121", disp: "art121.p2.i4" });
    expect(alvoDigitado(alvoFalado("cinco inciso sessenta e três")!)).toEqual({ art: "art5", disp: "art5.i63" });
    expect(alvoDigitado(alvoFalado("155 a")!)).toEqual({ art: "art155-a" });
    expect(alvoDigitado(alvoFalado("121 parágrafo único")!)).toEqual({ art: "art121", disp: "art121.pu" });
    expect(alvoFalado("banana")).toBeNull();
  });

  it("o microfone ouvindo a própria leitura não dispara comando", () => {
    const lido = "Parágrafo único. Aplica-se o disposto no artigo anterior, e a pena é aplicada novamente.";
    expect(tipo("aplica-se o disposto no artigo anterior", lido)).toBeNull();
    expect(tipo("a pena é aplicada novamente", lido)).toBeNull();
    // o comando da pessoa no meio da leitura ainda vale
    expect(tipo("aplica-se o disposto pausa", lido)).toBe("pausar");
    expect(tipo("mais rápido", lido)).toBe("maisRapido");
  });

  it("o começo de um comando (para pausar a leitura enquanto a pessoa fala), e não o eco da leitura", () => {
    const lido = new Set(palavrasDe("Artigo cento e vinte e um. Matar alguém: Pena: reclusão, de seis a vinte anos. O próximo inciso trata do caso anterior."));
    expect(pareceComando("ir para")).toBe(true);
    expect(pareceComando("vai")).toBe(true);
    expect(pareceComando("ok procura")).toBe(true);
    expect(pareceComando("matar alguém pena reclusão pausa", lido)).toBe(true);
    expect(pareceComando("artigo 500", lido)).toBe(true);
    // o que a própria voz disse não pausa
    expect(pareceComando("matar alguém pena reclusão", lido)).toBe(false);
    expect(pareceComando("o próximo inciso trata do caso anterior", lido)).toBe(false);
    expect(pareceComando("artigo", lido)).toBe(false);
    // conversa comum, sem palavra de comando
    expect(pareceComando("hoje vai chover")).toBe(false);
  });
});
