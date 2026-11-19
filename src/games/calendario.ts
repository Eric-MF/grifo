// Datas de feriados e festas, que podem mudar de ano para ano, e a janela de dias em que um item datado fica à venda.
// Tudo no fuso local do aparelho: a semana do feriado é a do calendário de quem joga.

/** Como achar a data de um evento num ano qualquer. */
export type DataFesta =
  | { tipo: "fixa"; dia: number; mes: number }
  // dias a partir do domingo de Páscoa (negativo: antes)
  | { tipo: "pascoa"; dias: number }
  // o n-ésimo `diaSemana` (0 = domingo) do mês, contando a partir do dia `aPartirDe` (padrão 1); ordem -1 = o último do mês
  | { tipo: "semana"; mes: number; diaSemana: number; ordem: number; aPartirDe?: number };

/** Domingo de Páscoa no calendário gregoriano (algoritmo de Meeus/Jones/Butcher). */
export function pascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

/** Data do evento no ano dado, à meia-noite local. */
export function dataNoAno(d: DataFesta, ano: number): Date {
  switch (d.tipo) {
    case "fixa":
      return new Date(ano, d.mes - 1, d.dia);
    case "pascoa": {
      const p = pascoa(ano);
      return new Date(ano, p.getMonth(), p.getDate() + d.dias);
    }
    case "semana": {
      if (d.ordem < 0) {
        const ultimo = new Date(ano, d.mes, 0);
        return new Date(ano, d.mes - 1, ultimo.getDate() - ((ultimo.getDay() - d.diaSemana + 7) % 7));
      }
      const inicio = new Date(ano, d.mes - 1, d.aPartirDe ?? 1);
      const primeiro = inicio.getDate() + ((d.diaSemana - inicio.getDay() + 7) % 7);
      return new Date(ano, d.mes - 1, primeiro + (d.ordem - 1) * 7);
    }
  }
}

/** Dias do calendário de `a` até `b`, sem contar a hora (nem a troca de horário de verão). */
const diasEntre = (a: Date, b: Date) =>
  Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86_400_000);

/**
 * A janela em que `agora` está: de `raio` dias antes a `raio` dias depois do evento, contando os dois extremos.
 * Fora dela, null. Olha o ano anterior e o seguinte também, porque a janela do Ano-Novo atravessa a virada.
 */
export function janelaAtual(d: DataFesta, agora: Date, raio = 3): { data: Date; inicio: Date; fim: Date } | null {
  for (const ano of [agora.getFullYear() - 1, agora.getFullYear(), agora.getFullYear() + 1]) {
    const data = dataNoAno(d, ano);
    if (Math.abs(diasEntre(data, agora)) > raio) continue;
    const [y, m, dia] = [data.getFullYear(), data.getMonth(), data.getDate()];
    return { data, inicio: new Date(y, m, dia - raio), fim: new Date(y, m, dia + raio) };
  }
  return null;
}
