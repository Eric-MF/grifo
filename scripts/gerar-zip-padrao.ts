// Monta public/downloads/grupos/padrao.zip com o download padrão da aba Provas (2ª fase atualizada).
// Só regenera quando algum PDF ou o índice de exames é mais novo que o ZIP.
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { deflateRawSync } from "node:zlib";
import { montarZip } from "../src/lib/zip.ts";
import { CAMINHO_ZIP_PADRAO, CHAVES_PADRAO, arquivosDe } from "../src/app/(site)/provas/nomes.ts";

const RAIZ = new URL("..", import.meta.url).pathname;
const INDICE = join(RAIZ, "src/content/generated/exames-index.json");
const SAIDA = join(RAIZ, "public", CAMINHO_ZIP_PADRAO);

const bruto = JSON.parse(readFileSync(INDICE, "utf8"));
const exames = Array.isArray(bruto) ? bruto : bruto.exames;
const arquivos = arquivosDe(exames, CHAVES_PADRAO);

const dataSaida = existsSync(SAIDA) ? statSync(SAIDA).mtimeMs : 0;
const fontes = [INDICE, ...arquivos.map((a) => join(RAIZ, "public", a.href))];
const defasado = fontes.some((f) => !existsSync(f) || statSync(f).mtimeMs > dataSaida);
if (!defasado) {
  console.log("padrao.zip em dia");
  process.exit(0);
}

const entradas = arquivos.map((a) => ({
  nome: `${a.pasta}/${a.nome}`,
  dados: new Uint8Array(readFileSync(join(RAIZ, "public", a.href))),
}));
const zip = await montarZip(entradas, (d) => deflateRawSync(d, { level: 9 })).arrayBuffer();
mkdirSync(dirname(SAIDA), { recursive: true });
writeFileSync(SAIDA, new Uint8Array(zip));
console.log(`padrao.zip: ${arquivos.length} arquivos, ${(zip.byteLength / 1e6).toFixed(1)} MB`);
