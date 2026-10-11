// Confere a página de provas em um site já servido: node tests/e2e/provas.mjs [BASE]
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const falhas = [];
const checar = (ok, msg) => {
  if (!ok) falhas.push(msg);
};

const b = await chromium.launch();
const p = await b.newPage();
await p.goto(`${BASE}/provas/`, { waitUntil: "networkidle" });

const cabecalhos = await p.locator("thead th").allTextContents();
checar(cabecalhos.some((t) => t.includes("1ª fase")), "coluna '1ª fase' ausente na tabela de provas");

const linha47 = p.locator("tr#exame-47");
checar((await linha47.count()) === 1, "linha do 47º exame ausente");
const textoLinha47 = await linha47.textContent();
checar(textoLinha47.includes("2ª fase em breve"), "47 sem o aviso '2ª fase em breve'");
checar((await linha47.locator('a[href="/simulados/47/"]').count()) === 0, "47 tem link de simulado");
checar((await linha47.locator('a[href="/downloads/originais/objetiva-caderno-47.pdf"]').count()) === 1, "47 sem caderno da 1ª fase");
checar((await linha47.locator('a[href="/downloads/originais/objetiva-gabarito-47.pdf"]').count()) === 1, "47 sem gabarito da 1ª fase");

const hrefs = await p.locator('table a[href^="/downloads/"]').evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href")))]);
checar(hrefs.length > 0, "nenhum link de download na tabela");
for (const href of hrefs) {
  const r = await p.request.get(`${BASE}${href}`);
  checar(r.ok(), `download quebrado (${r.status()}): ${href}`);
}

checar((await p.locator("details", { hasText: "Baixar vários arquivos" }).evaluate((d) => d.open)) === false, "painel 'Baixar vários arquivos' deveria começar recolhido");

const nomes = await p.locator("table a[download]").evaluateAll((as) => as.map((a) => a.getAttribute("download")));
checar(nomes.length > 0, "nenhum link com nome de arquivo para download");
checar(nomes.every((n) => n.endsWith(".pdf") && /^[12]ª fase/.test(n)), "nome de arquivo sem fase no início");

await p.locator('button[aria-label="Visualizar I Exame"]').click();
const dialogo = p.locator("dialog[open]");
await dialogo.waitFor();
const abas = await dialogo.locator("[role=group] button").allTextContents();
checar(abas.includes("Conferir texto") && !abas.includes("Simulado"), "diálogo deveria ter 'Conferir texto' no lugar de 'Simulado'");

await b.close();

if (falhas.length) {
  console.error(falhas.map((f) => `✗ ${f}`).join("\n"));
  process.exit(1);
}
console.log(`provas: ${hrefs.length} downloads conferidos, 47 com 1ª fase e sem simulado`);
