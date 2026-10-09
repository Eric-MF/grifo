// Cria content/exames/NN/exame.yaml só com os enunciados do caderno (sem gabarito):
// o exame aparece em /provas e pode ser lido, mas não tem correção automática.
//   node scripts/exame-sem-gabarito.ts 40 "Apelação" apelacao "observação…"
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { stringify } from "yaml";
import { toRoman } from "../src/lib/correcao/citacoes.ts";
import { enunciadosDoCaderno } from "./enunciados-caderno.ts";

const [num, nome, tipo, obs] = process.argv.slice(2);
const numero = Number(num);
const id = String(numero).padStart(2, "0");
const cad = enunciadosDoCaderno(numero);
if (!cad) throw new Error(`caderno ${id} não encontrado em .examples/_text`);
const exame = {
  id,
  numero,
  numeral: toRoman(numero),
  corrigivel: false,
  revisao: { status: "rascunho", por: "", em: "", notas: "Sem gabarito no acervo; enunciados extraídos do caderno." },
  observacoes: obs ?? "O padrão de resposta deste exame não está no acervo do Grifo; a correção automática será liberada quando ele for incluído.",
  peca: { nome, tipo, aliases: [], enunciado: cad.peca, gabarito_comentado: "", itens: [] },
  questoes: cad.questoes.map((e, i) => ({ n: i + 1, enunciado: e, gabarito_comentado: "", itens: [] })),
};
const dir = join(new URL("..", import.meta.url).pathname, "content/exames", id);
mkdirSync(dir, { recursive: true });
const f = join(dir, "exame.yaml");
if (existsSync(f) && !process.argv.includes("--force")) throw new Error(`${f} já existe`);
writeFileSync(f, `# ${toRoman(numero)} Exame de Ordem Unificado — Direito Penal (sem gabarito no acervo)\n${stringify(exame, { lineWidth: 0, blockQuote: "literal" })}`);
console.log(`${f}: ${cad.peca.length} c na peça; questões ${cad.questoes.map((q) => q.length).join("/")}`);
