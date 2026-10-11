import type { ExameResumo } from "@/content/load";

export type Chave = keyof ExameResumo["downloads"];

const DESCRICAO: Record<Chave, { pasta: string; arquivo: string; curto: string }> = {
  cadernoOriginal: { pasta: "2ª fase - original (FGV)", arquivo: "2ª fase - Penal - Caderno original (FGV)", curto: "2ª fase original, caderno" },
  gabaritoOriginal: { pasta: "2ª fase - original (FGV)", arquivo: "2ª fase - Penal - Gabarito original (FGV)", curto: "2ª fase original, gabarito" },
  cadernoAtualizado: { pasta: "2ª fase - atualizado (Grifo)", arquivo: "2ª fase - Penal - Caderno atualizado (Grifo)", curto: "2ª fase atualizado, caderno" },
  gabaritoAtualizado: { pasta: "2ª fase - atualizado (Grifo)", arquivo: "2ª fase - Penal - Gabarito atualizado (Grifo)", curto: "2ª fase atualizado, gabarito" },
  objetivaCaderno: { pasta: "1ª fase (FGV)", arquivo: "1ª fase - Todas as matérias - Caderno Tipo 1 (FGV)", curto: "1ª fase, caderno Tipo 1" },
  objetivaGabarito: { pasta: "1ª fase (FGV)", arquivo: "1ª fase - Todas as matérias - Gabarito definitivo (FGV)", curto: "1ª fase, gabarito definitivo" },
};

export const TODAS_AS_CHAVES = Object.keys(DESCRICAO) as Chave[];
export const CHAVES_PADRAO: Chave[] = ["cadernoAtualizado", "gabaritoAtualizado"];

export const pastaDoArquivo = (chave: Chave) => DESCRICAO[chave].pasta;
export const rotuloCurto = (chave: Chave) => DESCRICAO[chave].curto;

export function nomeDoArquivo(e: ExameResumo, chave: Chave): string {
  const ano = e.aplicacao ? new Date(e.aplicacao + "T12:00:00").getFullYear() : null;
  const partes = [DESCRICAO[chave].arquivo, `${e.numero}º Exame`, e.variante, ano].filter(Boolean);
  return `${partes.join(" - ")}.pdf`;
}

export type Arquivo = { href: string; nome: string; pasta: string };

export function arquivosDe(exames: ExameResumo[], chaves: Iterable<Chave>): Arquivo[] {
  const marcadas = new Set(chaves);
  const vistos = new Set<string>();
  const saida: Arquivo[] = [];
  for (const e of exames)
    for (const chave of TODAS_AS_CHAVES) {
      const href = e.downloads[chave];
      if (!marcadas.has(chave) || !href || vistos.has(href)) continue;
      vistos.add(href);
      saida.push({ href, nome: nomeDoArquivo(e, chave), pasta: pastaDoArquivo(chave) });
    }
  return saida;
}

export function nomeDoZip(chaves: Iterable<Chave>): string {
  const marcadas = new Set(chaves);
  return `Provas Penal - ${TODAS_AS_CHAVES.filter((c) => marcadas.has(c)).map(rotuloCurto).join("; ")}.zip`;
}

export const CAMINHO_ZIP_PADRAO = "/downloads/grupos/padrao.zip";
