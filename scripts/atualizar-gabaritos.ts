// Troca os gabaritos preliminares pelos definitivos quando a FGV os publica (e traz a 2ª fase de um exame novo).
//
//   node scripts/atualizar-gabaritos.ts            confere na FGV os exames recentes (os que têm gabarito preliminar)
//   node scripts/atualizar-gabaritos.ts --sem-rede só refaz o site com o que já está em .examples/fgv
//
// Quando sai um definitivo:
//   1. baixa os arquivos (scripts/baixar-fgv.mjs) e põe no site (scripts/sync-originais.ts): o gabarito original de
//      /provas passa a ser o definitivo, sem a marca de preliminar;
//   2. se o exame já tem tabela no Grifo (content/exames/<id>), extrai o texto do definitivo e gera o rascunho da
//      tabela da FGV em content/_transcricao/definitivos/<id>.yaml, para conferir e trocar a tabela (a do preliminar é
//      estimada); o exame ganha o aviso em revisao.notas. A tabela atual fica valendo até a troca, feita por uma pessoa;
//   3. regenera os dados do site (scripts/build-content.ts).
// Pensado para o cron, como as súmulas: scripts/gabaritos-cron.sh (semanal).
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const MANIFEST = join(ROOT, "public", "downloads", "originais", "manifest.json");
const semRede = process.argv.includes("--sem-rede");

interface Entrada {
  id: string;
  numero: number;
  variante: string | null;
  gabarito: string | null;
  gabaritoPreliminar?: boolean;
  objetivaGabaritoPreliminar?: boolean;
  fase2: "aplicada" | "em-breve";
}
const lerManifest = (): Entrada[] => (existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : []);
const node = (...args: string[]) => execFileSync(process.execPath, args, { stdio: "inherit", cwd: ROOT });

const antes = lerManifest();
const ultimo = Math.max(0, ...antes.map((e) => e.numero));
// os que ainda podem mudar: gabarito da 2ª fase preliminar, 2ª fase ainda não aplicada, a 1ª fase dos dois últimos
// exames com gabarito preliminar (nos antigos a FGV não publica o definitivo da objetiva) e o próximo exame
const pendentes = antes.filter((e) => e.gabaritoPreliminar || e.fase2 === "em-breve" || (e.objetivaGabaritoPreliminar && e.numero >= ultimo - 1));
const desde = Math.min(ultimo + 1, ...pendentes.map((e) => e.numero));
console.log(`exames a conferir: a partir do ${desde}º (${pendentes.map((e) => e.id).join(", ") || "só o próximo"})`);

if (!semRede) node("scripts/baixar-fgv.mjs", `--desde=${desde}`);
node("scripts/sync-originais.ts");

const depois = new Map(lerManifest().map((e) => [e.id, e]));
const definitivos = antes.filter((e) => e.gabaritoPreliminar && depois.get(e.id) && !depois.get(e.id)!.gabaritoPreliminar);
const novos = [...depois.values()].filter((e) => !antes.some((a) => a.id === e.id) || (antes.find((a) => a.id === e.id)!.fase2 === "em-breve" && e.fase2 === "aplicada"));
const objetivas = antes.filter((e) => e.objetivaGabaritoPreliminar && depois.get(e.id) && !depois.get(e.id)!.objetivaGabaritoPreliminar);

for (const e of definitivos) {
  console.log(`${e.id}: saiu o gabarito definitivo da 2ª fase; o PDF do site foi trocado`);
  const yaml = join(ROOT, "content", "exames", e.id, "exame.yaml");
  if (!existsSync(yaml)) continue;
  // o texto do definitivo, no lugar em que o rascunho o procura; o rascunho vai para content/_transcricao/definitivos
  const pdf = join(ROOT, ".examples", "fgv", String(e.numero).padStart(2, "0"), "pratica", "direito-penal", "padrao-definitivo.pdf");
  const guardado = `${yaml}.atual`;
  try {
    node(join(ROOT, "scripts", "texto-do-pdf.mjs"), pdf, join(ROOT, ".examples", "_text", `gabarito - Exame da Ordem ${String(e.numero).padStart(2, "0")}º.txt`));
    // o rascunho escreve no lugar do exame: a tabela atual fica guardada ao lado e volta em seguida
    const peca = readFileSync(yaml, "utf8").match(/^peca:\n  nome: (.+)$/m)?.[1]?.replace(/^"|"$/g, "");
    copyFileSync(yaml, guardado);
    node("scripts/rascunho-exame.ts", String(e.numero), "--force", ...(peca ? [`--peca=${peca}`] : []));
    const destino = join(ROOT, "content", "_transcricao", "definitivos");
    mkdirSync(destino, { recursive: true });
    renameSync(yaml, join(destino, `${e.id}.yaml`));
    console.log(`  rascunho da tabela definitiva: content/_transcricao/definitivos/${e.id}.yaml (conferir e trocar a tabela estimada)`);
  } catch (erro) {
    console.log(`  não consegui gerar o rascunho da tabela: ${(erro as Error).message.split("\n")[0]}`);
  } finally {
    if (existsSync(guardado)) renameSync(guardado, yaml);
  }
  const texto = readFileSync(yaml, "utf8");
  const aviso = `Gabarito definitivo publicado pela FGV (visto em ${new Date().toISOString().slice(0, 10)}): trocar a tabela pela de content/_transcricao/definitivos/${e.id}.yaml.`;
  if (!texto.includes("Gabarito definitivo publicado")) writeFileSync(yaml, texto.replace(/^(  notas: )(.*)$/m, (_, a: string, b: string) => `${a}${JSON.stringify(`${aviso} ${b.replace(/^"|"$/g, "")}`)}`));
}
for (const e of objetivas) console.log(`${e.id}: saiu o gabarito definitivo da 1ª fase; o PDF do site foi trocado`);
for (const e of novos) console.log(`${e.id}: novo no site (${e.fase2 === "aplicada" ? "2ª fase aplicada" : "2ª fase em breve"}); para o simulado, rodar scripts/rascunho-exame.ts ${e.numero}`);

if (definitivos.length || objetivas.length || novos.length) {
  console.log("regenerando os dados do site (build-content)");
  node("scripts/build-content.ts");
} else console.log("nada mudou");
