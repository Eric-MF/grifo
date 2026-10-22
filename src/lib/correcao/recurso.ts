// Recurso automático: o texto dirigido à banca sobre os critérios que o examinando retirou (✂) da tabela. O CONTEÚDO
// depende só dos critérios escolhidos: o item, o critério e as frases da resposta que o comprovam (com a linha). Só a
// REDAÇÃO é sorteada: aberturas, conectivos, frases e fechos variam a cada geração, sem que o conteúdo mude.
import type { Componente, Item } from "../../content/schema.ts";
import { gabaritoComenta, marcasDoComponente } from "./marcas.ts";
import type { Contexto, ResultadoParte } from "./grader.ts";

/** Um critério que a tabela pontuou e que o examinando retirou: o item, o critério e as frases que o comprovam. */
export interface CriterioRetirado {
  /** o número do item na tabela ("1", "2"…) */
  n: string;
  /** o id do critério dentro do item */
  id: string;
  /** o critério da tabela: é o que a banca lê, e o que o recurso cita */
  criterio: string;
  valor: number;
  /** as frases inteiras da resposta que comprovam o critério, com a linha (a partir de 1) */
  frases: { texto: string; linha: number }[];
}

/** Sorteio de 0 (inclusive) a 1 (exclusive): `Math.random` no navegador; uma semente nos testes. */
export type Sorteio = () => number;

// Abreviaturas que não encerram a frase ("art. 121", "inc. II" não terminam a frase no ponto). "CP", "CPP" e "CC" ficam de
// fora: quase sempre terminam a frase ("…do CPP.").
const ABREVIATURAS = /(?:^|[\s(])(art|arts|inc|incs|al|alin|par|p|pp|pg|n|nos|cf|dl|lei|dr|dra|sr|sra|ex|etc|vol|ed|op|cit|min|cap)$/i;

/** O sinal que encerra uma frase está na posição `i`? (o ponto de uma abreviatura não conta) */
function encerraFrase(texto: string, i: number): boolean {
  const ch = texto[i];
  if (ch === "!" || ch === "?" || ch === ";") return true;
  return ch === "." && !ABREVIATURAS.test(texto.slice(0, i));
}

/** A frase inteira da linha em que está o trecho [ini, fim): do sinal anterior ao sinal seguinte. */
export function fraseNaLinha(linha: string, ini: number, fim: number): string {
  let inicio = 0;
  for (let i = ini - 1; i >= 0; i--) {
    if (encerraFrase(linha, i)) {
      inicio = i + 1;
      break;
    }
  }
  let final = linha.length;
  for (let i = fim; i < linha.length; i++) {
    if (encerraFrase(linha, i)) {
      final = i + 1;
      break;
    }
  }
  return linha.slice(inicio, final).trim();
}

/** As frases de uma linha, cada uma inteira (o sinal que a encerra fica nela). */
function frasesDaLinha(linha: string): string[] {
  const saida: string[] = [];
  let inicio = 0;
  for (let i = 0; i < linha.length; i++) {
    if (encerraFrase(linha, i)) {
      saida.push(linha.slice(inicio, i + 1).trim());
      inicio = i + 1;
    }
  }
  if (inicio < linha.length) saida.push(linha.slice(inicio).trim());
  return saida.filter(Boolean);
}

/**
 * As frases da resposta que comprovam o critério: a primeira frase inteira em que a regra do componente casa (termos ou
 * dispositivo, como na correção). Se a regra só casa com termos espalhados por frases diferentes, valem os trechos
 * marcados, cada um com a frase em que está.
 */
function frasesDoCriterio(d: Componente, linhas: string[], ctx: Contexto): CriterioRetirado["frases"] {
  for (let k = 0; k < linhas.length; k++) {
    const frase = frasesDaLinha(linhas[k]!).find((f) => gabaritoComenta(d, f, ctx));
    if (frase) return [{ texto: frase, linha: k + 1 }];
  }
  const frases: CriterioRetirado["frases"] = [];
  for (const m of marcasDoComponente(d, linhas, ctx)) {
    const texto = fraseNaLinha(linhas[m.linha]!, m.ini, m.fim);
    if (texto && !frases.some((f) => f.texto === texto && f.linha === m.linha + 1)) frases.push({ texto, linha: m.linha + 1 });
  }
  return frases;
}

/** Os critérios que a tabela pontuou (✓) e que a resposta comprova, com as frases que os comprovam. */
export function criteriosPontuados(parte: ResultadoParte, itens: Item[], linhas: string[], ctx: Contexto): CriterioRetirado[] {
  const saida: CriterioRetirado[] = [];
  for (const it of parte.itens) {
    const def = itens.find((x) => x.n === it.n);
    for (const comp of it.componentes) {
      if (comp.obtido <= 0) continue;
      const d = def?.componentes.find((x) => x.id === comp.id);
      if (!d) continue;
      const frases = frasesDoCriterio(d, linhas, ctx);
      if (!frases.length) continue;
      saida.push({ n: it.n, id: comp.id, criterio: comp.rotulo, valor: comp.valor, frases });
    }
  }
  return saida;
}

const escolhe = <T>(lista: readonly T[], sorteio: Sorteio): T => lista[Math.floor(sorteio() * lista.length)]!;

// ---------- redação: variações (o conteúdo acima é o mesmo em todas) ----------

const ABERTURAS = [
  "À Banca Examinadora, interponho recurso contra a correção de {parte}.",
  "Excelentíssima Banca Examinadora, apresento recurso sobre a pontuação atribuída a {parte}.",
  "Ilustres examinadores, dirijo o presente recurso à correção de {parte}.",
  "À Comissão de Correção, interponho recurso quanto à nota de {parte}.",
  "Prezados examinadores, apresento recurso referente à pontuação de {parte}.",
  "Senhores examinadores, recorro da correção de {parte}, nos termos do edital.",
  "À Banca Examinadora, manifesto-me por meio deste recurso sobre a correção de {parte}.",
  "Excelentíssimos membros da Banca, interponho recurso contra a correção de {parte}.",
];

/** Conectivos por posição: o primeiro, o segundo, o terceiro… (a ordem é a da tabela, item a item). */
const ORDEM: readonly (readonly string[])[] = [
  ["Primeiramente", "Em primeiro lugar", "Inicialmente", "Antes de tudo", "De início", "Para começar", "Num primeiro plano", "Em um primeiro momento"],
  ["Segundamente", "Em segundo lugar", "Em seguida", "Na sequência", "Depois", "Adiante", "Num segundo momento", "Logo após"],
  ["Em terceiro lugar", "Terceiramente", "Mais adiante", "Ademais", "Adicionalmente", "Num terceiro momento", "Ainda", "Além disso"],
  ["Em quarto lugar", "Quartamente", "Igualmente", "Outrossim", "Também", "Num quarto momento", "Do mesmo modo", "Por igual"],
];
const ULTIMO = ["Por último", "Por fim", "Finalmente", "Como último ponto", "Ao final", "Para encerrar", "Por derradeiro", "Por último, mas não menos importante"];
const DEPOIS = ["Além disso", "Outro ponto", "Ainda no mesmo sentido", "Em acréscimo", "No mesmo raciocínio", "Ademais"];

/** O primeiro critério de um item: o conectivo, o item e o critério pleiteado. */
const PRIMEIRO: readonly ((c: string, r: CriterioRetirado) => string)[] = [
  (c, r) => `${c}, quanto ao item ${r.n}, critério “${r.criterio}”, pleiteia-se a revisão da pontuação.`,
  (c, r) => `${c}, no item ${r.n}, o critério “${r.criterio}” é objeto deste pleito.`,
  (c, r) => `${c}, o critério “${r.criterio}”, do item ${r.n}, deve ser reexaminado pela banca.`,
  (c, r) => `${c}, sobre o item ${r.n}, requer-se a revisão do critério “${r.criterio}”.`,
  (c, r) => `${c}, relativamente ao item ${r.n} e ao critério “${r.criterio}”, pede-se reexame.`,
  (c, r) => `${c}, no que toca ao item ${r.n} (critério “${r.criterio}”), solicita-se nova análise.`,
  (c, r) => `${c}, a respeito do critério “${r.criterio}” (item ${r.n}), pleiteia-se a revisão.`,
  (c, r) => `${c}, quanto ao item ${r.n}, o critério “${r.criterio}” merece reanálise pela banca.`,
];

/** Os critérios seguintes do mesmo item: a relação com o item fica explícita ("Ainda sobre o item 11, …"). */
const MESMO_ITEM: readonly ((r: CriterioRetirado) => string)[] = [
  (r) => `Ainda sobre o item ${r.n}, pleiteia-se a revisão do critério “${r.criterio}”.`,
  (r) => `Ainda sobre o item ${r.n}, o critério “${r.criterio}” deve ser reexaminado pela banca.`,
  (r) => `Ainda sobre o item ${r.n}, requer-se nova análise do critério “${r.criterio}”.`,
  (r) => `Ainda sobre o item ${r.n}, o critério “${r.criterio}” também merece reanálise.`,
  (r) => `No mesmo item ${r.n}, solicita-se a revisão do critério “${r.criterio}”.`,
];

/** As frases da resposta que comprovam o critério, cada uma entre aspas e com a linha em que começa. */
function listaFrases(r: CriterioRetirado): string {
  const itens = r.frases.map((f) => `“${f.texto}” (linha ${f.linha})`);
  if (itens.length === 1) return itens[0]!;
  return `${itens.slice(0, -1).join("; ")} e ${itens.at(-1)}`;
}

const PROVAS: readonly ((frases: string) => string)[] = [
  (f) => `A resposta traz ${f}, que comprovam o critério.`,
  (f) => `Como se vê na resposta, há ${f}, correspondentes ao critério.`,
  (f) => `Essa resposta contém ${f}, que atendem ao critério.`,
  (f) => `O critério está comprovado: a resposta apresenta ${f}.`,
  (f) => `Na resposta aparece ${f}, o que sustenta o critério.`,
  (f) => `A comprovação do critério está na resposta, em ${f}.`,
];

/** Quando o critério se comprova na mesma passagem que o anterior do item: a passagem não se repete no texto. */
const MESMA_PROVA: readonly string[] = [
  "Essa mesma passagem comprova também este critério.",
  "A mesma passagem da resposta atende a este critério.",
  "Essa passagem, já citada, comprova igualmente o critério.",
];

/** Os pedidos não repetem o nome do critério (já foi dito no início): só o item, quando ajuda. */
const PEDIDOS: readonly ((r: CriterioRetirado) => string)[] = [
  () => `Requer-se, portanto, a reanálise deste critério.`,
  (r) => `Pede-se, assim, que a banca reexamine o critério do item ${r.n}.`,
  () => `Solicita-se, dessa forma, a revisão deste critério.`,
  () => `Por isso, requer-se nova análise do critério indicado.`,
  (r) => `Diante disso, pede-se a revisão do item ${r.n}.`,
];

const FECHOS = [
  "Nestes termos, pede deferimento.",
  "Diante do exposto, aguarda-se o deferimento do recurso.",
  "Sendo o que se tinha a expor, requer-se o acolhimento deste recurso.",
  "Ante o exposto, pede-se a revisão da correção e o deferimento.",
  "Por todo o exposto, requer-se a reavaliação e o deferimento do presente recurso.",
];

/** O conectivo do item na posição k (de n itens): a ordem da tabela, com a variação sorteada. */
function conectivo(k: number, n: number, sorteio: Sorteio): string {
  if (k === 0) return escolhe(ORDEM[0]!, sorteio);
  if (n > 1 && k === n - 1) return escolhe(ULTIMO, sorteio);
  if (k < ORDEM.length) return escolhe(ORDEM[k]!, sorteio);
  return escolhe(DEPOIS, sorteio);
}

/** Os critérios agrupados por item, na ordem da tabela (os de um mesmo item ficam juntos). */
function porItem(criterios: CriterioRetirado[]): CriterioRetirado[][] {
  const grupos: CriterioRetirado[][] = [];
  for (const r of criterios) {
    const ultimo = grupos.at(-1);
    if (ultimo && ultimo[0]!.n === r.n) ultimo.push(r);
    else grupos.push([r]);
  }
  return grupos;
}

const mesmasFrases = (a: CriterioRetirado, b: CriterioRetirado) =>
  a.frases.length === b.frases.length && a.frases.every((f, i) => f.texto === b.frases[i]!.texto && f.linha === b.frases[i]!.linha);

/**
 * O texto do recurso da parte. Com os mesmos critérios, o conteúdo é igual; a redação muda a cada sorteio. Cada critério
 * é citado pelo item e pelo nome da tabela, sem repetir o texto do item. Dois critérios do mesmo item se ligam pelo item.
 */
export function gerarRecurso(tituloParte: string, criterios: CriterioRetirado[], sorteio: Sorteio): string {
  if (!criterios.length) return `Nenhum critério foi retirado em ${tituloParte}.`;
  const paragrafos = [escolhe(ABERTURAS, sorteio).replace("{parte}", tituloParte)];
  const grupos = porItem(criterios);
  grupos.forEach((grupo, g) => {
    grupo.forEach((r, k) => {
      const anterior = grupo[k - 1];
      const inicio = k === 0 ? escolhe(PRIMEIRO, sorteio)(conectivo(g, grupos.length, sorteio), r) : escolhe(MESMO_ITEM, sorteio)(r);
      const prova = anterior && mesmasFrases(anterior, r) ? escolhe(MESMA_PROVA, sorteio) : escolhe(PROVAS, sorteio)(listaFrases(r));
      paragrafos.push([inicio, prova, escolhe(PEDIDOS, sorteio)(r)].join(" "));
    });
  });
  paragrafos.push(escolhe(FECHOS, sorteio));
  return paragrafos.join("\n\n");
}

/** Uma redação diferente da anterior (para o botão "outra redação"): tenta de novo se o sorteio repetir. */
export function gerarRecursoDiferente(tituloParte: string, criterios: CriterioRetirado[], sorteio: Sorteio, anterior?: string): string {
  let texto = gerarRecurso(tituloParte, criterios, sorteio);
  for (let t = 0; t < 20 && texto === anterior; t++) texto = gerarRecurso(tituloParte, criterios, sorteio);
  return texto;
}
