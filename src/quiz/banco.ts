// Sorteio de perguntas com repetição espaçada simples: peças em que o jogador erra
// aparecem mais; perguntas vistas recentemente não se repetem.
import perguntasFixas from "@/content/generated/perguntas.json";
import type { PerguntaFixa } from "@/content/schema";
import { gravarJSON, lerJSON } from "@/lib/storage";
import { GERADORES } from "./geradores";
import { criarRng } from "./rng";
import type { Nivel, Pergunta } from "./types";
import { nomePeca } from "./verificar";

const K = "grifo:quiz";
interface Estado {
  recentes: string[];
  erros: Record<string, number>;
  acertos: Record<string, number>;
}
const ler = (): Estado => lerJSON<Estado>(K, { recentes: [], erros: {}, acertos: {} });

export function gerarPergunta(geradorId: string, seed: number): Pergunta {
  const g = GERADORES.find((x) => x.id === geradorId)!;
  return { ...g.gerar(criarRng(seed)), id: `${g.id}:${seed}`, fonte: "gerada" };
}

const FIXAS = perguntasFixas as PerguntaFixa[];
const fixaParaPergunta = (q: PerguntaFixa): Pergunta => ({
  id: q.id,
  caso: q.caso,
  comando: q.comando,
  resposta: { peca: q.peca, fundamentos: q.fundamentos },
  explicacao: q.explicacao,
  fonte: q.fonte,
  distratores: q.distratores,
});

export function sortearPergunta(): Pergunta {
  const est = ler();
  // ~20% das vezes, uma pergunta fixa (casos de exames reais) ainda não vista recentemente
  const fixasNovas = FIXAS.filter((q) => !est.recentes.includes(q.caso.slice(0, 60)));
  if (fixasNovas.length && Math.random() < 0.2) {
    const q = fixaParaPergunta(fixasNovas[Math.floor(Math.random() * fixasNovas.length)]);
    est.recentes = [q.caso.slice(0, 60), ...est.recentes].slice(0, 80);
    gravarJSON(K, est);
    return q;
  }
  const pesos = GERADORES.map((g) => {
    const e = est.erros[g.peca] ?? 0;
    const a = est.acertos[g.peca] ?? 0;
    return (g.peso ?? 1) * (1 + Math.min(3, e * 0.6)) / (1 + Math.min(2, a * 0.1));
  });
  const total = pesos.reduce((s, p) => s + p, 0);
  for (let tent = 0; tent < 12; tent++) {
    let r = Math.random() * total;
    let i = 0;
    while ((r -= pesos[i]) > 0 && i < pesos.length - 1) i++;
    const p = gerarPergunta(GERADORES[i].id, (Math.random() * 2 ** 31) >>> 0);
    const chaveTexto = p.caso.slice(0, 60);
    if (!est.recentes.includes(chaveTexto)) {
      est.recentes = [chaveTexto, ...est.recentes].slice(0, 80);
      gravarJSON(K, est);
      return p;
    }
  }
  return gerarPergunta(GERADORES[0].id, Date.now() >>> 0);
}

export function registrarResultado(p: Pergunta, acertou: boolean) {
  const est = ler();
  const bucket = acertou ? est.acertos : est.erros;
  bucket[p.resposta.peca] = (bucket[p.resposta.peca] ?? 0) + 1;
  if (acertou && est.erros[p.resposta.peca]) est.erros[p.resposta.peca] = Math.max(0, est.erros[p.resposta.peca] - 0.5);
  gravarJSON(K, est);
}

/** 4 alternativas (nível fácil): a correta + 3 distratores plausíveis, embaralhadas. */
export function alternativas(p: Pergunta): { tipo: string; nome: string }[] {
  const pool = (p.distratores ?? []).filter((d) => d !== p.resposta.peca);
  const escolhidos = pool.sort(() => Math.random() - 0.5).slice(0, 3);
  return [p.resposta.peca, ...escolhidos]
    .map((tipo) => ({ tipo, nome: nomePeca(tipo) }))
    .sort(() => Math.random() - 0.5);
}

