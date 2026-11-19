import { describe, expect, it } from "vitest";
import { dataNoAno, janelaAtual, pascoa, type DataFesta } from "@/games/calendario";

const ymd = (d: Date) => [d.getFullYear(), d.getMonth() + 1, d.getDate()];

describe("calendário das festas", () => {
  it("Páscoa", () => {
    expect(ymd(pascoa(2024))).toEqual([2024, 3, 31]);
    expect(ymd(pascoa(2025))).toEqual([2025, 4, 20]);
    expect(ymd(pascoa(2026))).toEqual([2026, 4, 5]);
    expect(ymd(pascoa(2027))).toEqual([2027, 3, 28]);
  });

  it("dias a partir da Páscoa: Carnaval e Sexta-feira Santa", () => {
    expect(ymd(dataNoAno({ tipo: "pascoa", dias: -47 }, 2026))).toEqual([2026, 2, 17]);
    expect(ymd(dataNoAno({ tipo: "pascoa", dias: -2 }, 2026))).toEqual([2026, 4, 3]);
  });

  it("Lavagem do Bonfim: 3ª quinta-feira de janeiro, contando a partir do dia 7", () => {
    expect(ymd(dataNoAno({ tipo: "semana", mes: 1, diaSemana: 4, ordem: 2, aPartirDe: 7 }, 2026))).toEqual([2026, 1, 15]);
  });

  it("Parintins: último sábado de junho", () => {
    expect(ymd(dataNoAno({ tipo: "semana", mes: 6, diaSemana: 6, ordem: -1 }, 2026))).toEqual([2026, 6, 27]);
  });

  it("Círio: 2º domingo de outubro", () => {
    expect(ymd(dataNoAno({ tipo: "semana", mes: 10, diaSemana: 0, ordem: 2 }, 2026))).toEqual([2026, 10, 11]);
  });

  it("Natal: janela de 3 dias antes a 3 depois", () => {
    const natal: DataFesta = { tipo: "fixa", dia: 25, mes: 12 };
    const j = janelaAtual(natal, new Date(2026, 11, 22, 0, 5));
    expect(j).not.toBeNull();
    expect(ymd(j!.inicio)).toEqual([2026, 12, 22]);
    expect(ymd(j!.fim)).toEqual([2026, 12, 28]);
    expect(janelaAtual(natal, new Date(2026, 11, 28, 23, 50))).not.toBeNull();
    expect(janelaAtual(natal, new Date(2026, 11, 21, 23, 59))).toBeNull();
    expect(janelaAtual(natal, new Date(2026, 11, 29, 0, 1))).toBeNull();
  });

  it("Ano-Novo: a janela atravessa a virada do ano", () => {
    const anoNovo: DataFesta = { tipo: "fixa", dia: 1, mes: 1 };
    const antes = janelaAtual(anoNovo, new Date(2026, 11, 30, 12));
    expect(antes).not.toBeNull();
    expect(ymd(antes!.data)).toEqual([2027, 1, 1]);
    expect(ymd(antes!.inicio)).toEqual([2026, 12, 29]);
    expect(ymd(antes!.fim)).toEqual([2027, 1, 4]);
    expect(janelaAtual(anoNovo, new Date(2027, 0, 4, 12))).not.toBeNull();
    expect(ymd(janelaAtual(anoNovo, new Date(2027, 0, 4, 12))!.data)).toEqual([2027, 1, 1]);
    expect(janelaAtual(anoNovo, new Date(2027, 0, 5, 12))).toBeNull();
    expect(janelaAtual(anoNovo, new Date(2026, 11, 28, 12))).toBeNull();
  });

  it("raio personalizado", () => {
    expect(janelaAtual({ tipo: "fixa", dia: 25, mes: 12 }, new Date(2026, 11, 20), 5)).not.toBeNull();
  });
});
