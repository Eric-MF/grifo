// Foto dos grifos e dos erros de uma lei, tirada no navegador. O Vade Mecum guarda essa foto dentro de cada item,
// para o link levar tudo junto; ao abrir de novo, a foto é refeita, então os grifos feitos depois aparecem.
import { agregar, lerEventos, maisErrados } from "@/lib/erros";
import { lerMarcacoes } from "./marcacoes";
import type { ErroVade, GrifoVade, ItemVade, Vademecum } from "./vademecum";

export function fotoDaLei(lei: string): { grifos: GrifoVade[]; errados: ErroVade[] } {
  const grifos: GrifoVade[] = lerMarcacoes(lei).map((m) => ({
    i: m.i,
    disp: m.disp,
    exato: m.exato,
    prefixo: m.prefixo,
    sufixo: m.sufixo,
    cor: m.cor,
    ...(m.nota ? { nota: m.nota } : {}),
    ...(m.inteiro ? { inteiro: true } : {}),
    ...(m.grupo ? { grupo: m.grupo } : {}),
  }));
  const errados: ErroVade[] = [...maisErrados(agregar(lerEventos().filter((e) => e.d === lei), { janelaDias: null }), "baixo")].map((a) => ({
    artigo: a.artigo,
    erros: a.erros,
    tentativas: a.erros + a.acertos,
    ...(a.nivel ? { nivel: a.nivel } : {}),
  }));
  return { grifos, errados };
}

/** O vade-mécum com a foto atual de cada lei: os grifos e os erros de agora (o que o usuário fez depois aparece). */
export function atualizarVade(v: Vademecum): Vademecum {
  const itens: ItemVade[] = v.itens.map((it) => {
    const foto = fotoDaLei(it.lei);
    const novo: ItemVade = { ...it, grifos: foto.grifos, errados: foto.errados };
    // "só os erros" acompanha a lista de artigos com erro de agora
    if (it.filtro === "erros") novo.artigos = foto.errados.map((e) => e.artigo).join(", ");
    return novo;
  });
  return { ...v, itens };
}

/** Mesmo vade-mécum (título e o que entra de cada lei), sem comparar as fotos guardadas. */
export function mesmoVade(v: Pick<Vademecum, "titulo" | "itens">, titulo: string, itens: ItemVade[]): boolean {
  return (
    v.titulo === titulo &&
    v.itens.length === itens.length &&
    v.itens.every((x, k) => x.lei === itens[k]!.lei && (x.filtro ?? "tudo") === (itens[k]!.filtro ?? "tudo") && (x.artigos ?? "") === (itens[k]!.artigos ?? ""))
  );
}
