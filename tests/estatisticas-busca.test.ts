import { describe, expect, it } from "vitest";
import {
  atende,
  compilar,
  lerConsulta,
  normalizar,
  OPCOES_PADRAO,
  trechoDe,
  type OpcoesBusca,
} from "../src/lib/estatisticas/busca";

const acha = (q: string, textos: string[], o: OpcoesBusca = OPCOES_PADRAO) =>
  atende(
    textos.map((t) => normalizar(t, o).texto),
    compilar(lerConsulta(q), o),
  );

const at = (texto: string, frase = false, prefixo = false) => ({ texto, frase, prefixo });

describe("lerConsulta", () => {
  it("lê palavras, expressões entre aspas, exclusões, alternativas e prefixos na ordem", () => {
    const c = lerConsulta('a "b c" -d e|f g OU h -"i j" k*');
    expect(c.clausulas).toEqual([
      { negada: false, alternativas: [at("a")] },
      { negada: false, alternativas: [at("b c", true)] },
      { negada: true, alternativas: [at("d")] },
      { negada: false, alternativas: [at("e"), at("f")] },
      { negada: false, alternativas: [at("g"), at("h")] },
      { negada: true, alternativas: [at("i j", true)] },
      { negada: false, alternativas: [at("k", false, true)] },
    ]);
  });

  it("'furto | roubo' e 'furto|roubo' viram uma cláusula com as duas alternativas", () => {
    for (const q of ["furto | roubo", "furto|roubo"]) {
      const c = lerConsulta(q);
      expect(c.clausulas).toHaveLength(1);
      expect(c.clausulas[0]!.alternativas.map((a) => a.texto)).toEqual(["furto", "roubo"]);
    }
  });

  it("'ou' minúsculo é palavra comum, não alternativa", () => {
    expect(lerConsulta("furto ou roubo").clausulas).toHaveLength(3);
  });

  it("um hífen sozinho é texto, e 396-A fica inteiro", () => {
    expect(lerConsulta("-").clausulas).toEqual([{ negada: false, alternativas: [at("-")] }]);
    expect(lerConsulta("396-A").clausulas).toEqual([{ negada: false, alternativas: [at("396-A")] }]);
  });

  it("aspas sem fechar valem até o fim", () => {
    expect(lerConsulta('"legítima defesa').clausulas).toEqual([
      { negada: false, alternativas: [at("legítima defesa", true)] },
    ]);
  });

  it("consulta vazia ou só com espaços não tem cláusulas e compila como vazia", () => {
    for (const q of ["", "   "]) {
      const c = lerConsulta(q);
      expect(c.clausulas).toEqual([]);
      expect(compilar(c, OPCOES_PADRAO).vazia).toBe(true);
    }
  });
});

describe("atende", () => {
  it("as palavras valem em qualquer ordem dentro do texto", () => {
    expect(acha("prescrição roubo", ["Roubo… a prescrição da pretensão"])).toBe(true);
    expect(acha("prescrição roubo", ["só roubo"])).toBe(false);
  });

  it("as palavras podem estar em textos diferentes do mesmo exame", () => {
    expect(acha("roubo prescrição", ["houve roubo", "a prescrição"])).toBe(true);
  });

  it("sem maiúsculas nem acentos por padrão", () => {
    expect(acha("PRESCRICAO", ["prescrição"])).toBe(true);
  });

  it("a expressão entre aspas exige a sequência, com espaços e quebras de linha contando como um", () => {
    expect(acha('"pretensão punitiva"', ["a pretensão punitiva"])).toBe(true);
    expect(acha('"pretensão punitiva"', ["punitiva pretensão"])).toBe(false);
    expect(acha('"pretensão punitiva"', ["pretensão da punitiva"])).toBe(false);
    expect(acha('"pretensão punitiva"', ["pretensão\n\n  punitiva"])).toBe(true);
  });

  it("alternativas com | ou OU acham qualquer uma delas", () => {
    expect(acha("furto | estelionato", ["houve estelionato"])).toBe(true);
    expect(acha("furto OU estelionato", ["houve estelionato"])).toBe(true);
  });

  it("a exclusão vale para todos os textos do exame", () => {
    expect(acha("nulidade -citação", ["nulidade do processo"])).toBe(true);
    expect(acha("nulidade -citação", ["nulidade da citação"])).toBe(false);
    expect(acha("nulidade -citação", ["nulidade"])).toBe(true);
    expect(acha("nulidade -citação", ["nulidade", "falta de citação"])).toBe(false);
  });

  it("pontuação e símbolos valem como estão", () => {
    expect(acha('"art. 386, VII"', ["nos termos do art. 386, VII, do CPP"])).toBe(true);
    expect(acha('"art. 386, VII"', ["art. 386, VI"])).toBe(false);
    expect(acha("§ 1º", ["o § 1º do art. 157"])).toBe(true);
    expect(acha("396-A", ["art. 396-A do CPP"])).toBe(true);
  });

  it("consulta vazia atende qualquer coisa, até lista vazia de textos", () => {
    expect(acha("", [])).toBe(true);
    expect(acha("   ", ["qualquer coisa"])).toBe(true);
  });

  describe("opção palavraInteira", () => {
    const inteira: OpcoesBusca = { ...OPCOES_PADRAO, palavraInteira: true };

    it("'pena' acha 'apenas' sem a opção e não acha com a opção", () => {
      expect(acha("pena", ["apenas"])).toBe(true);
      expect(acha("pena", ["apenas"], inteira)).toBe(false);
    });

    it("'prescri*' acha 'prescrição' com a opção, e 'prescri' sem * não acha", () => {
      expect(acha("prescri*", ["prescrição"], inteira)).toBe(true);
      expect(acha("prescri", ["prescrição"], inteira)).toBe(false);
    });
  });

  describe("opção acentos", () => {
    it("com acentos, 'pena' não acha 'pená'; sem a opção, acha", () => {
      expect(acha("pena", ["pená"])).toBe(true);
      expect(acha("pena", ["pená"], { ...OPCOES_PADRAO, acentos: true })).toBe(false);
    });
  });

  describe("opção maiusculas", () => {
    it("com maiusculas, 'CP' acha 'do CP' e não acha 'do cp'", () => {
      const o: OpcoesBusca = { ...OPCOES_PADRAO, maiusculas: true };
      expect(acha("CP", ["do CP"], o)).toBe(true);
      expect(acha("CP", ["do cp"], o)).toBe(false);
    });
  });
});

describe("normalizar", () => {
  it("tira acentos, põe em minúsculas, junta espaços e guarda o mapa de volta ao original", () => {
    const n = normalizar("Ação  Penal", OPCOES_PADRAO);
    expect(n.texto).toBe("acao penal");
    expect(n.mapa).toHaveLength(n.texto.length);
    expect(n.mapa[0]).toBe(0);
    expect(n.mapa[n.texto.indexOf("p")]).toBe(6);
  });
});

describe("trechoDe", () => {
  const original = "Gabriel foi denunciado por roubo. A prescrição da pretensão punitiva ocorreu.";

  it("marca o achado com a grafia do original (com acento) e conta um achado", () => {
    const t = trechoDe(original, normalizar(original, OPCOES_PADRAO), compilar(lerConsulta("prescrição"), OPCOES_PADRAO));
    expect(t).not.toBeNull();
    expect(t!.marcas).toHaveLength(1);
    const [a, b] = t!.marcas[0]!;
    expect(t!.texto.slice(a, b)).toBe("prescrição");
    expect(t!.achados).toBe(1);
  });

  it("com duas palavras, marca as duas em ordem", () => {
    const t = trechoDe(original, normalizar(original, OPCOES_PADRAO), compilar(lerConsulta("roubo prescrição"), OPCOES_PADRAO));
    expect(t).not.toBeNull();
    expect(t!.marcas.map(([a, b]) => t!.texto.slice(a, b))).toEqual(["roubo", "prescrição"]);
  });

  it("num texto longo, corta em volta do achado com reticências e marca o alvo", () => {
    const longo = "palavra ".repeat(60) + "alvo" + "palavra ".repeat(60);
    const t = trechoDe(longo, normalizar(longo, OPCOES_PADRAO), compilar(lerConsulta("alvo"), OPCOES_PADRAO), 20);
    expect(t).not.toBeNull();
    expect(t!.texto.startsWith("…")).toBe(true);
    expect(t!.texto.endsWith("…")).toBe(true);
    expect(t!.marcas.map(([a, b]) => t!.texto.slice(a, b))).toEqual(["alvo"]);
    expect(t!.texto.replace(/[^\p{L}]/gu, "").length).toBeLessThan(120);
  });

  it("sem achado, dá null", () => {
    expect(trechoDe("texto sem nada", normalizar("texto sem nada", OPCOES_PADRAO), compilar(lerConsulta("xyz"), OPCOES_PADRAO))).toBeNull();
  });
});
