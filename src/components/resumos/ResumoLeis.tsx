"use client";

// O resumo do "Vade Mecum" no cabeçalho: as leis em que a pessoa parou (cada uma abre no artigo salvo), quantos grifos
// e artigos importantes ela tem e o artigo que mais erra. Sem leitura ainda, o que o Vade Mecum oferece.
import Link from "next/link";
import { useMemo } from "react";
import indice from "@/content/generated/leis-indice.json";
import { agregar, lerEventos, maisErrados } from "@/lib/erros";
import { lerJSON } from "@/lib/storage";
import { ehSumulas, LISTAS_SUMULAS, rotaDaLei } from "@/lib/leis/sumulas";
import type { PropsResumo } from "../LinkComResumo";
import styles from "../ResumoDesempenho.module.css";
import { haQuanto, plural } from "./comum";

// as mesmas chaves do leitor (Leitor.tsx e lib/leis/marcacoes.ts)
const K_POSICOES = "grifo:leitor:posicoes";
const K_IMPORTANTES = "grifo:leis:importantes";
const PREFIXO_MARCAS = "grifo:marcacoes:";

const NOMES = new Map<string, string>([...indice.map((l) => [l.id, l.nome] as const), ...LISTAS_SUMULAS.map((l) => [l.id, l.nome] as const)]);

function ler() {
  const posicoes = Object.entries(lerJSON<Record<string, { art: string; rotulo: string; em: number }>>(K_POSICOES, {}))
    .filter(([lei, p]) => NOMES.has(lei) && p?.em)
    .sort((a, b) => b[1].em - a[1].em);
  // os grifos de todas as leis: uma seleção que atravessa parágrafos conta uma vez
  let grifos = 0;
  let leisComGrifo = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k?.startsWith(PREFIXO_MARCAS)) continue;
      const ms = lerJSON<{ id: string; grupo?: string; cor: string }[]>(k, []);
      const n = new Set(ms.map((m) => m.grupo ?? m.id)).size;
      grifos += n;
      if (n) leisComGrifo++;
    }
  } catch {
    /* sem armazenamento: fica zero */
  }
  const importantes = lerJSON<string[]>(K_IMPORTANTES, []).length;
  const agora = Date.now();
  const errado = maisErrados(agregar(lerEventos(), { janelaDias: null, agora }), "baixo")[0];
  return { posicoes, grifos, leisComGrifo, importantes, errado, agora };
}

export default function ResumoLeis({ onSair }: PropsResumo) {
  const d = useMemo(() => ler(), []);
  const nada = !d.posicoes.length && !d.grifos && !d.importantes;

  return (
    <div className={styles.corpo}>
      <p className={styles.titulo}>
        Vade Mecum <span>{indice.length} leis e as súmulas</span>
      </p>

      {nada ? (
        <p className={styles.texto}>
          O Código Penal, o CPP, a LEP, a Constituição e as leis penais especiais, com as súmulas do STF e do STJ. Grife com as cores das
          peças, anote, busque no índice remissivo e veja quem cita cada artigo. O leitor guarda onde você parou.
        </p>
      ) : (
        <div className={styles.numeros}>
          <div>
            <b>{d.grifos.toLocaleString("pt-BR")}</b>
            <small>{d.grifos === 1 ? "grifo" : "grifos"} em {plural(d.leisComGrifo, "lei", "leis")}</small>
          </div>
          <div>
            <b>{d.importantes}</b>
            <small>{d.importantes === 1 ? "artigo marcado" : "artigos marcados"} como importante</small>
          </div>
          <div>
            <b>{d.posicoes.length}</b>
            <small>{d.posicoes.length === 1 ? "lei lida" : "leis lidas"} neste navegador</small>
          </div>
        </div>
      )}

      {d.posicoes.length > 0 && (
        <div className={styles.bloco}>
          <span className={styles.rotulo}>Continuar de onde parou</span>
          <ul className={styles.lista}>
            {d.posicoes.slice(0, 3).map(([lei, p]) => (
              <li key={lei}>
                <Link href={rotaDaLei(lei)} onClick={onSair}>
                  <span>{NOMES.get(lei)}</span>
                  <small>{haQuanto(p.em, d.agora)}</small>
                  <b>{p.rotulo}</b>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {d.errado && (
        <ul className={styles.pontos}>
          <li>
            <span>Artigo que mais erra</span>
            <Link href={`${rotaDaLei(d.errado.diploma)}#${ehSumulas(d.errado.diploma) ? `s-${d.errado.artigo}` : `art${d.errado.artigo}`}`} onClick={onSair}>
              <b>
                {ehSumulas(d.errado.diploma)
                  ? `Súmula ${d.errado.artigo} · ${NOMES.get(d.errado.diploma)?.replace("Súmulas do ", "") ?? ""}`
                  : `Art. ${d.errado.artigo.toUpperCase()} · ${d.errado.diploma.toUpperCase()}`}{" "}
                · {plural(d.errado.erros, "erro", "erros")}
              </b>
            </Link>
          </li>
        </ul>
      )}

      <p className={styles.acoes}>
        <Link href="/leis/" onClick={onSair}>
          Abrir o Vade Mecum →
        </Link>
      </p>
    </div>
  );
}
