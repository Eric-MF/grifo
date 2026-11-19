// O texto de cada página dos PDFs de provas (cadernos e gabaritos, originais e atualizados), para a busca da página
// "Tudo numa página" (/provas/todos/). Sai em public/dados/provas/busca-<grupo>.json.gz: { "<endereço do PDF>": [texto
// da página 1, da página 2, …] }. PDF escaneado (sem texto) fica com páginas vazias.
// A leitura de cada PDF fica guardada em .cache/textos-provas.json (pelo tamanho e pela data do arquivo): só os PDFs
// novos ou trocados são lidos de novo.
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const DOWNLOADS = join(ROOT, "public", "downloads");
const SAIDA = join(ROOT, "public", "dados", "provas");
const CACHE = join(ROOT, ".cache", "textos-provas.json");

type Cache = Record<string, { tamanho: number; data: number; paginas: string[] }>;

async function paginasDoPdf(arquivo: string): Promise<string[]> {
  const doc = await getDocument({ data: new Uint8Array(readFileSync(arquivo)), verbosity: 0 }).promise;
  const paginas: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const { items } = await (await doc.getPage(i)).getTextContent();
    let texto = "";
    let y: number | null = null;
    for (const it of items) {
      if (!("str" in it)) continue;
      const yi = Math.round(it.transform[5]);
      if (y !== null && Math.abs(yi - y) > 2) texto += "\n";
      else if (texto && !/\s$/.test(texto) && it.str && !/^\s/.test(it.str)) texto += it.hasEOL ? "\n" : "";
      texto += it.str;
      y = yi;
    }
    paginas.push(texto.replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").trim());
  }
  await doc.loadingTask.destroy();
  return paginas;
}

/** Os grupos: a página de busca baixa só o grupo do que está à mostra. */
const GRUPOS: { nome: string; pasta: string; filtro: (f: string) => boolean }[] = [
  { nome: "originais", pasta: "originais", filtro: (f) => /^(caderno|gabarito)-/.test(f) },
  { nome: "atualizados", pasta: "atualizados", filtro: (f) => /^(caderno|gabarito)-/.test(f) },
  { nome: "objetivas", pasta: "originais", filtro: (f) => /^objetiva-/.test(f) },
];

export async function gerarTextosDasProvas({ quieto = false } = {}) {
  const cache: Cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};
  const novo: Cache = {};
  let lidos = 0;
  mkdirSync(SAIDA, { recursive: true });
  for (const g of GRUPOS) {
    const dir = join(DOWNLOADS, g.pasta);
    if (!existsSync(dir)) continue;
    const saida: Record<string, string[]> = {};
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".pdf") && g.filtro(x)).sort()) {
      const arquivo = join(dir, f);
      const { size, mtimeMs } = statSync(arquivo);
      const chave = `/downloads/${g.pasta}/${f}`;
      const guardado = cache[chave];
      let paginas = guardado && guardado.tamanho === size && guardado.data === mtimeMs ? guardado.paginas : null;
      if (!paginas) {
        try {
          paginas = await paginasDoPdf(arquivo);
        } catch {
          paginas = [];
        }
        lidos++;
      }
      novo[chave] = { tamanho: size, data: mtimeMs, paginas };
      saida[chave] = paginas;
    }
    writeFileSync(join(SAIDA, `busca-${g.nome}.json.gz`), gzipSync(JSON.stringify(saida), { level: 9 }));
  }
  mkdirSync(join(ROOT, ".cache"), { recursive: true });
  writeFileSync(CACHE, JSON.stringify(novo));
  if (!quieto) console.log(`textos das provas: ${Object.keys(novo).length} PDFs (${lidos} lidos agora)`);
}

if (import.meta.main) await gerarTextosDasProvas();
