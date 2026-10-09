// Cria content/exames/NN/exame.yaml para um exame novo, escolhendo o melhor ponto de partida:
//
//   npm run novo:exame -- 41                    padrão de resposta em .examples/_text → rascunho automático
//   npm run novo:exame -- 41 "Porto Alegre"     variante regional
//   npm run novo:exame -- 41 --modelo           modelo em branco, para preencher à mão
//
// Ordem de tentativa: (1) texto do padrão de resposta da FGV → scripts/rascunho-exame.ts;
// (2) só o caderno → indica scripts/exame-sem-gabarito.ts; (3) modelo em branco.
// Passo a passo completo em docs/COMO-ADICIONAR.md.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { toRoman } from "../src/lib/correcao/citacoes.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const [numArg, varArg] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const modelo = process.argv.includes("--modelo");
const numero = Number(numArg);
if (!numero) {
  console.error('uso: npm run novo:exame -- <número> ["Variante"] [--modelo]');
  process.exit(1);
}
const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const nn = String(numero).padStart(2, "0");
const id = nn + (varArg ? `-${slug(varArg)}` : "");
const destino = join(ROOT, "content/exames", id, "exame.yaml");
if (existsSync(destino)) {
  console.error(`content/exames/${id}/exame.yaml já existe — edite-o diretamente.`);
  process.exit(1);
}

const textos = existsSync(join(ROOT, ".examples/_text")) ? readdirSync(join(ROOT, ".examples/_text")) : [];
const daVariante = (f: string) => (varArg ? f.includes(`(${varArg})`) : !f.includes("("));
const gabarito = textos.find((f) => f.startsWith(`gabarito - Exame da Ordem ${nn}º`) && daVariante(f));
const caderno = textos.find((f) => (f.startsWith(`caderno - OAB ${nn}º`) || f.startsWith(`raiz - Exame da Ordem ${nn}º - Caderno`)) && daVariante(f));

const passos = (extra: string[]) =>
  console.log(
    ["", "Próximos passos:", ...extra, "  • npm run validar   (aponta somas, dispositivos e TODOs pendentes)", "  • npm run dev → /revisao/" + id + "/  (PDF original ao lado da correção-teste)", "  • npm test         (o gabarito comentado precisa tirar ≥ 90%)", ""].join("\n"),
  );

if (gabarito && !modelo) {
  const r = spawnSync("node", ["scripts/rascunho-exame.ts", String(numero), ...(varArg ? [varArg] : []), "--resumo"], { cwd: ROOT, stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
  passos([
    "  • troque cada TODO por termos (ver docs/COMO-ADICIONAR.md › Rubrica) — direto no YAML ou num",
    `    content/_transcricao/termos/${id}.json + scripts/transcrever.sh ${numero}${varArg ? ` "${varArg}"` : ""} (pode ser regenerado)`,
  ]);
  process.exit(0);
}

if (caderno && !modelo) {
  console.log(`Há só o caderno de ${id} em .examples/_text (sem padrão de resposta). Para publicá-lo sem correção:\n`);
  console.log(`  node scripts/exame-sem-gabarito.ts ${numero} "Nome da Peça" tipo-da-peca "observação"\n`);
  console.log("(tipo-da-peca = chave de content/pecas.yaml). Para montar a rubrica à mão: acrescente --modelo.");
  process.exit(0);
}

// ---------------- modelo em branco ----------------
if (!modelo) console.log(`Nenhum texto de ${id} em .examples/_text (rode node scripts/extract-text.mjs após incluir os PDFs). Usando o modelo em branco.`);
const yaml = `# ${toRoman(numero)} Exame de Ordem Unificado — Direito Penal${varArg ? ` (${varArg})` : ""}
# Modelo em branco criado por \`npm run novo:exame\`. Substitua todos os TODO: enquanto
# houver algum, \`npm run validar\` falha e o exame não entra no site.
# Referência dos campos: docs/COMO-ADICIONAR.md e src/content/schema.ts.
id: "${id}"
numero: ${numero}
numeral: ${toRoman(numero)}${varArg ? `\nvariante: ${varArg}` : ""}
aplicacao: TODO-AAAA-MM-DD
area: penal
revisao: { status: rascunho, por: "", em: "", notas: "" }
corrigivel: true   # false = sem gabarito: só leitura em /provas, sem simulado corrigido
peca:
  nome: TODO Nome da Peça
  tipo: TODO          # chave de content/pecas.yaml (ex.: apelacao, rese, agravo-execucao)
  aliases: []          # outros nomes aceitos, minúsculos e sem acento
  enunciado: |
    TODO Enunciado da peça. Parágrafos separados por linha em branco; **negrito** e *itálico* funcionam.
  gabarito_comentado: |
    TODO Gabarito comentado da FGV.
  itens:
    # Um item = uma linha da tabela "Distribuição dos Pontos". Os componentes somam o valor do item;
    # todos os itens da peça somam 5,00 (ou use teto quando a FGV limita a pontuação).
    - n: "1"
      secao: Petição de Interposição
      descricao: "TODO Texto do item como na tabela, com os valores entre parênteses (0,10)."
      componentes:
        - { id: c1, valor: 0.10, termos: ["TODO termo obrigatório", "sinônimo a | sinônimo b"] }
        - { id: c2, valor: 0.10, dispositivo: ["art. 593 CPP"], requer: c1 }
    # … continue até somar 5,00
questoes:
${[1, 2, 3, 4]
  .map(
    (n) => `  - n: ${n}
    enunciado: |
      TODO Enunciado da questão ${n}, com os itens A) e B).
    gabarito_comentado: |
      TODO
    itens:
      - n: "A"
        descricao: "TODO (0,60)"
        componentes:
          - { id: c1, valor: 0.60, termos: ["TODO"] }
      - n: "B"
        descricao: "TODO (0,65)"
        componentes:
          - { id: c1, valor: 0.65, termos: ["TODO"] }`,
  )
  .join("\n")}
# Opcional: notas de atualização legislativa (aparecem no caderno/gabarito atualizados)
# atualizado:
#   revisao: { status: rascunho }
#   notas:
#     - { alvo: peca, item: "3", lei: "Lei 14.994/2024", texto: "…" }
`;
mkdirSync(join(ROOT, "content/exames", id), { recursive: true });
writeFileSync(destino, yaml);
console.log(`content/exames/${id}/exame.yaml criado a partir do modelo em branco.`);
passos(["  • preencha os TODO (enunciados, gabarito, tabela de pontos)", "  • coloque os PDFs em .examples/ e rode node scripts/sync-originais.ts para aparecerem em /provas"]);
