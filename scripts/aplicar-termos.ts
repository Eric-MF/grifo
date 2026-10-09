// Aplica termos/dispositivos a um rascunho de exame, a partir de um JSON:
//   { "1.c1": ["vara criminal", "sao goncalo"],                         ← termos
//     "4.c3": { "dispositivo": ["art. 107, IV, CP", "art. 38 CPP"] },   ← substitui
//     "q2:A.c1": { "alternativas": [["ameaca"], ["lesao", "incondicionada"]] },
//     "5.c2": { "termos": ["..."], "requer": "c1", "rotulo": "..." } }
// Chave: "<item>.<componente>" na peça, "qN:<item>.<componente>" nas questões.
//   node scripts/aplicar-termos.ts 30 termos.json
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { isMap, isSeq, parseDocument, type YAMLMap } from "yaml";

const [id, arq] = process.argv.slice(2);
const file = join(new URL("..", import.meta.url).pathname, "content/exames", id, "exame.yaml");
const doc = parseDocument(readFileSync(file, "utf8"));
const patch: Record<string, unknown> = JSON.parse(readFileSync(arq, "utf8"));

let aplicados = 0;
for (const [chave, valor] of Object.entries(patch)) {
  // "_exame": campos na raiz do exame (ex.: observacoes, peca.tipo via "peca.tipo")
  if (chave === "_exame") {
    for (const [k, v] of Object.entries(valor as Record<string, unknown>)) doc.setIn(k.split(".").map((x) => (/^\d+$/.test(x) ? Number(x) : x)), v);
    aplicados++;
    continue;
  }
  // "peca:itens" / "q1:itens" → substitui a tabela inteira da parte (exames antigos)
  const mp = chave.match(/^(peca|q(\d)):itens$/);
  if (mp) {
    const path = mp[1] === "peca" ? ["peca", "itens"] : ["questoes", Number(mp[2]) - 1, "itens"];
    const node = doc.createNode(valor);
    if (isSeq(node))
      for (const it of node.items)
        if (isMap(it)) {
          const comps = it.get("componentes");
          if (isSeq(comps)) for (const c of comps.items) if (isMap(c)) { c.flow = true; for (const x of c.items) if (isSeq(x.value)) { x.value.flow = true; for (const y of x.value.items) if (isSeq(y)) y.flow = true; } }
        }
    doc.setIn(path, node);
    aplicados++;
    continue;
  }
  // Chave sem ".cN" → substitui campos do item inteiro (ex.: {"componentes": [...]})
  const mi = chave.match(/^(?:q(\d):)?([^.]+(?:\.\d+)?)$/);
  if (mi && !/\.c\w+$/.test(chave)) {
    const [, qi, ni] = mi;
    const lista = (qi ? doc.getIn(["questoes", Number(qi) - 1, "itens"]) : doc.getIn(["peca", "itens"])) as { items: YAMLMap[] };
    const it = lista.items.find((i) => String(i.get("n")) === ni);
    if (!it) throw new Error(`item não encontrado: ${chave}`);
    for (const [k, v] of Object.entries(valor as Record<string, unknown>)) {
      const node = doc.createNode(v);
      if (k === "componentes" && isSeq(node)) for (const c of node.items) if (isMap(c)) { c.flow = true; for (const x of c.items) if (isSeq(x.value)) { x.value.flow = true; for (const y of x.value.items) if (isSeq(y)) y.flow = true; } }
      it.set(k, node);
    }
    aplicados++;
    continue;
  }
  const m = chave.match(/^(?:q(\d):)?(.+)\.(c\w+)$/);
  if (!m) throw new Error(`chave inválida: ${chave}`);
  const [, q, n, cid] = m;
  const itens = (q ? doc.getIn(["questoes", Number(q) - 1, "itens"]) : doc.getIn(["peca", "itens"])) as { items: YAMLMap[] };
  const item = itens.items.find((i) => String(i.get("n")) === n);
  if (!item) throw new Error(`item não encontrado: ${chave}`);
  const comps = item.get("componentes") as { items: YAMLMap[] };
  const comp = comps.items.find((c) => c.get("id") === cid);
  if (!comp) throw new Error(`componente não encontrado: ${chave}`);
  const obj = Array.isArray(valor) ? { termos: valor } : (valor as Record<string, unknown>);
  if ("termos" in obj || "alternativas" in obj || "dispositivo" in obj) {
    for (const k of ["termos", "alternativas", "dispositivo"]) if (!(k in obj) && !(k === "dispositivo" && comp.has("dispositivo") && !("termos" in obj) && !("alternativas" in obj))) comp.delete(k);
  }
  for (const [k, v] of Object.entries(obj)) {
    if (v === null) comp.delete(k);
    else {
      const node = doc.createNode(v);
      if (isSeq(node)) {
        node.flow = true;
        for (const x of node.items) if (isSeq(x)) x.flow = true;
      }
      comp.set(k, node);
    }
  }
  if (isMap(comp)) comp.flow = true;
  aplicados++;
}
writeFileSync(file, doc.toString({ lineWidth: 0, blockQuote: "literal" }));
const restantes = (doc.toString().match(/TODO/g) ?? []).length;
console.log(`${aplicados} componente(s) atualizados · ${restantes} TODO restantes`);
