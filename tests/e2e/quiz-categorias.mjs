// Confere o seletor de tipos de pergunta no Treino: node tests/e2e/quiz-categorias.mjs [BASE]
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const falhas = [];
const checar = (ok, msg) => {
  if (!ok) falhas.push(msg);
};

const b = await chromium.launch();
const p = await b.newPage();
const erros = [];
p.on("pageerror", (e) => erros.push(e.message));

await p.goto(`${BASE}/treino/`, { waitUntil: "networkidle" });
// o padrão é o modo automático (com os tipos na ordem dele): o seletor testado aqui é o do "Eu escolho"
await p.evaluate(() => {
  localStorage.clear();
  localStorage.setItem("grifo:treino:automatico:ligado", "false");
});
await p.reload({ waitUntil: "networkidle" });

const grupo = p.getByRole("group", { name: "Tipos de pergunta" });
checar((await grupo.count()) === 1, "fieldset 'Tipos de pergunta' ausente no Treino");

const rotulos = ["Peça e fundamento", "Por dentro da peça", "Questões discursivas", "Objetivas da 1ª fase"];
for (const r of rotulos) checar((await grupo.getByLabel(r).count()) === 1, `categoria '${r}' ausente`);

// por padrão, só a peça e fundamento
checar(await grupo.getByLabel("Peça e fundamento").isChecked(), "'Peça e fundamento' não vem marcada por padrão");
checar(!(await grupo.getByLabel("Objetivas da 1ª fase").isChecked()), "'Objetivas da 1ª fase' marcada por padrão");

// dica: aparece ao passar o mouse e ao focar pelo teclado
const dica = grupo.locator('[role="tooltip"]', { hasText: "Um caso curto" });
checar((await dica.count()) === 1, "dica da peça e fundamento ausente");
await grupo.getByText("Peça e fundamento", { exact: true }).hover();
checar(await dica.isVisible(), "dica não aparece ao passar o mouse");
await p.mouse.move(0, 0);
const habilitada = grupo.locator("label:has(input:not([disabled]))").first();
await habilitada.locator("input").focus();
checar(await habilitada.locator('[role="tooltip"]').isVisible(), "dica não aparece ao focar pelo teclado");

// categorias sem acervo ficam desativadas e marcadas 'em breve'
const vazias = [];
for (const r of rotulos) {
  if ((await grupo.locator("label", { hasText: r }).locator("small", { hasText: "em breve" }).count()) === 1) vazias.push(r);
  if (vazias.includes(r)) checar(await grupo.getByLabel(r).isDisabled(), `'${r}' sem acervo mas habilitada`);
}
const disponiveis = rotulos.filter((r) => !vazias.includes(r));

// a última categoria com acervo marcada não pode ser desmarcada
checar(await grupo.getByLabel("Peça e fundamento").isDisabled(), "a única categoria marcada pode ser desmarcada");

// acrescenta outra categoria disponível e confere a gravação
const extra = disponiveis.find((r) => r !== "Peça e fundamento");
if (extra) {
  await grupo.getByLabel(extra).check();
  checar(await grupo.getByLabel(extra).isChecked(), `não marcou '${extra}'`);
  checar(!(await grupo.getByLabel("Peça e fundamento").isDisabled()), "com duas marcadas, a peça deveria poder ser desmarcada");
  await p.reload({ waitUntil: "networkidle" });
  checar(await p.getByRole("group", { name: "Tipos de pergunta" }).getByLabel(extra).isChecked(), "seleção de categorias não persistiu");
  const salvo = await p.evaluate(() => localStorage.getItem("grifo:quiz:categorias"));
  checar(salvo !== null && salvo.includes("peca"), `grifo:quiz:categorias sem a peça: ${salvo}`);
} else {
  console.log("aviso: só 'Peça e fundamento' tem acervo; a múltipla seleção não foi exercitada");
}

await b.close();

if (erros.length) falhas.push(`erros de página: ${erros.join(" | ")}`);
if (falhas.length) {
  console.error(falhas.map((f) => `✗ ${f}`).join("\n"));
  process.exit(1);
}
console.log(`quiz-categorias: ${rotulos.length} categorias, ${vazias.length} em breve, dica, persistência e trava conferidas`);
