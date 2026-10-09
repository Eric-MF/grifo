// Cria o esqueleto de uma pergunta do quiz dos jogos.
//
//   npm run nova:pergunta -- <id> <peça> [arquivo]
//       acrescenta uma pergunta FIXA em content/perguntas/<arquivo>.yaml (padrão: extras.yaml)
//       ex.: npm run nova:pergunta -- oab41-apelacao apelacao exames
//
//   npm run nova:pergunta -- --gerador <id> <peça>
//       cria um GERADOR paramétrico em src/quiz/geradores/<id>.ts (milhares de variações)
//       e o registra em src/quiz/geradores/index.ts
//
// <peça> é uma chave de content/pecas.yaml. Os campos com TODO impedem a validação
// (`npm run validar` / `npm test`) até serem preenchidos. Detalhes: docs/COMO-ADICIONAR.md.
import { appendFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

const ROOT = new URL("..", import.meta.url).pathname;
const gerador = process.argv.includes("--gerador");
const [id, peca, arquivo = "extras"] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!id || !peca) {
  console.error("uso: npm run nova:pergunta -- <id> <peça> [arquivo]\n     npm run nova:pergunta -- --gerador <id> <peça>");
  process.exit(1);
}
if (!/^[a-z0-9-]+$/.test(id)) {
  console.error(`id "${id}" inválido: use só letras minúsculas, números e hífen.`);
  process.exit(1);
}
const pecas = parse(readFileSync(join(ROOT, "content/pecas.yaml"), "utf8")) as Record<string, { nome: string }>;
if (!pecas[peca]) {
  console.error(`peça "${peca}" não existe em content/pecas.yaml. Opções:\n  ${Object.keys(pecas).join(", ")}`);
  process.exit(1);
}

if (gerador) {
  const dest = join(ROOT, "src/quiz/geradores", `${id}.ts`);
  if (existsSync(dest)) {
    console.error(`src/quiz/geradores/${id}.ts já existe.`);
    process.exit(1);
  }
  const ident = id.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
  writeFileSync(
    dest,
    `// Gerador paramétrico: ${pecas[peca].nome}.
// Cada chamada de gerar() monta um caso diferente sorteando nomes, crimes, datas e
// variações de texto (rng é determinístico pela semente). Veja os geradores vizinhos
// (defesa.ts, recursos.ts, prisao-acoes.ts) para exemplos de variações.
import { CRIMES, data, nome, vara } from "../dados";
import type { Gerador } from "../types";

export const ${ident}: Gerador = {
  id: "${id}",
  peca: "${peca}",
  peso: 1, // chance relativa de sorteio
  gerar(rng) {
    const n = nome(rng);
    const c = rng.pick(CRIMES);
    const caso = rng.pick([
      \`TODO caso 1: \${n} foi condenado(a) por \${c.nome} (\${c.artigo}) pelo juízo da \${vara(rng, c)}, com intimação em \${data(rng)}.\`,
      \`TODO caso 2: outra forma de narrar a mesma situação para \${n}.\`,
    ]);
    return {
      caso,
      comando: "Qual a peça cabível e o seu fundamento legal?",
      resposta: { peca: "${peca}", fundamentos: ["TODO art. X, § Y, CPP"] },
      explicacao: "TODO por que esta é a peça cabível, com prazo e artigo.",
      distratores: [], // TODO 3 peças plausíveis (chaves de content/pecas.yaml)
    };
  },
};

export default [${ident}];
`,
  );
  const idx = join(ROOT, "src/quiz/geradores/index.ts");
  let s = readFileSync(idx, "utf8");
  const imports = [...s.matchAll(/^import .+;$/gm)];
  const ultimo = imports[imports.length - 1];
  s = s.slice(0, ultimo.index + ultimo[0].length) + `\nimport ${ident} from "./${id}";` + s.slice(ultimo.index + ultimo[0].length);
  s = s.replace(/export const GERADORES: Gerador\[\] = \[([^\]]*)\];/, (_, l: string) => `export const GERADORES: Gerador[] = [${l}, ...${ident}];`);
  writeFileSync(idx, s);
  console.log(`src/quiz/geradores/${id}.ts criado e registrado em index.ts.`);
  console.log("Preencha os TODO e rode `npm test`: os testes do quiz cobrem todo gerador registrado (variedade, peça, fundamentos, ausência de TODO).");
  process.exit(0);
}

// ---------------- pergunta fixa (YAML) ----------------
const dir = join(ROOT, "content/perguntas");
for (const f of readdirSync(dir).filter((x) => x.endsWith(".yaml"))) {
  const d = parse(readFileSync(join(dir, f), "utf8")) as { perguntas?: { id: string }[] };
  if (d?.perguntas?.some((q) => q.id === id)) {
    console.error(`id "${id}" já usado em content/perguntas/${f}.`);
    process.exit(1);
  }
}
const dest = join(dir, `${arquivo}.yaml`);
if (!existsSync(dest))
  writeFileSync(
    dest,
    `# Perguntas fixas do quiz (somam-se aos geradores de src/quiz/geradores).
# Nova pergunta: npm run nova:pergunta -- <id> <peça> ${arquivo}
perguntas:
`,
  );
appendFileSync(
  dest,
  `  - id: ${id}
    fonte: TODO          # ex.: "XLI Exame (Questão 2)" ou "Grifo"
    caso: >-
      TODO narrativa curta do caso (mínimo 40 caracteres), sem revelar a peça.
    peca: ${peca}
    fundamentos: ["TODO art. X CPP"]   # do mais esperado ao alternativo; o nível difícil exige § / inciso
    explicacao: "TODO por que esta é a peça cabível (prazo, artigo)."
    distratores: []      # 3 peças plausíveis para as alternativas do nível fácil
`,
);
console.log(`Pergunta "${id}" acrescentada em content/perguntas/${arquivo}.yaml. Preencha os TODO e rode \`npm run validar\`.`);
