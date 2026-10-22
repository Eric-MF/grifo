"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import indice from "@/content/generated/leis-indice.json";
import { PaginaLeis, type SecaoPedida } from "@/components/leis/PaginaLeis";
import { agregar, lerEventos, maisErrados, type Agregado, type Evento, type NivelErro } from "@/lib/erros";
import { lerJSON } from "@/lib/storage";
import { linkLeitura, salvarVademecum } from "@/lib/leis/vademecum";
import styles from "@/app/(site)/vademecum/vademecum.module.css";

const JANELAS: { dias: number | null; nome: string }[] = [
  { dias: 1, nome: "Último dia" },
  { dias: 7, nome: "Última semana" },
  { dias: 30, nome: "Último mês" },
  { dias: 90, nome: "Últimos 3 meses" },
  { dias: null, nome: "Tudo" },
];
const NIVEIS: { id: NivelErro; nome: string; desc: string }[] = [
  { id: "baixo", nome: "Baixo", desc: "1 erro ou mais" },
  { id: "medio", nome: "Médio", desc: "2 erros ou mais, ou metade das tentativas" },
  { id: "alto", nome: "Alto", desc: "4 erros ou mais, ou 60% das tentativas" },
];
const noLeitor = new Set(indice.map((l) => l.id));
const nomeLei = (id: string) => indice.find((l) => l.id === id)?.nome ?? id.replace(/^lei-(\d+)$/, "Lei $1").toUpperCase();
const artigoId = (a: string) => `art${a}`;
const rotuloArtigo = (a: string) => `Art. ${a.toUpperCase()}`;

export function MinhaLeitura() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [importantes, setImportantes] = useState<string[]>([]);
  const [janela, setJanela] = useState<number | null>(7);
  const [nivel, setNivel] = useState<NivelErro>("medio");
  const [comImportantes, setComImportantes] = useState(true);
  const [agora, setAgora] = useState(0);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- lê localStorage após montar (site estático) */
    setEventos(lerEventos());
    setImportantes(lerJSON<string[]>("grifo:leis:importantes", []));
    setAgora(Date.now());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const errados = useMemo(() => (agora ? maisErrados(agregar(eventos, { janelaDias: janela, agora }), nivel) : []), [eventos, janela, nivel, agora]);

  const porLei = useMemo(() => {
    const m = new Map<string, { erros: Map<string, Agregado>; importantes: Set<string> }>();
    const de = (lei: string) => m.get(lei) ?? (m.set(lei, { erros: new Map(), importantes: new Set() }), m.get(lei)!);
    for (const a of errados) de(a.diploma).erros.set(artigoId(a.artigo), a);
    if (comImportantes)
      for (const k of importantes) {
        const [lei, art] = k.split(":");
        de(lei).importantes.add(art);
      }
    return m;
  }, [errados, importantes, comImportantes]);

  const secoes: SecaoPedida[] = useMemo(
    () =>
      [...porLei]
        .filter(([lei]) => noLeitor.has(lei))
        .map(([lei, { erros, importantes: imp }]) => ({
          lei,
          artigos: new Set([...erros.keys(), ...imp]),
          etiqueta: (art: string) => {
            const e = erros.get(art);
            if (e)
              return (
                <span className={styles.contagem} data-nivel={e.nivel ?? undefined}>
                  {e.erros} erro{e.erros > 1 ? "s" : ""} · {e.acertos} acerto{e.acertos === 1 ? "" : "s"}
                </span>
              );
            return imp.has(art) ? (
              <span className={styles.contagem} data-nivel="importante">
                importante
              </span>
            ) : null;
          },
        })),
    [porLei],
  );
  const fora = [...porLei].filter(([lei]) => !noLeitor.has(lei));
  const total = secoes.reduce((s, x) => s + (x.artigos as Set<string>).size, 0);

  const salvarComoVade = async () => {
    const itens = secoes.map((s) => ({
      lei: s.lei,
      artigos: [...(s.artigos as Set<string>)].map((a) => a.replace(/^art/, "").toUpperCase()).join(", "),
    }));
    const titulo = `Minha leitura · ${new Date().toLocaleDateString("pt-BR")}`;
    salvarVademecum({ id: Date.now().toString(36), titulo, itens, em: Date.now() });
    location.assign(await linkLeitura({ titulo, itens }));
  };

  return (
    <>
      <div className={styles.filtros}>
        <label>
          Nível de erro
          <select value={nivel} onChange={(e) => setNivel(e.target.value as NivelErro)}>
            {NIVEIS.map((n) => (
              <option key={n.id} value={n.id}>
                {n.nome} ({n.desc})
              </option>
            ))}
          </select>
        </label>
        <label>
          Período
          <select value={String(janela)} onChange={(e) => setJanela(e.target.value === "null" ? null : Number(e.target.value))}>
            {JANELAS.map((j) => (
              <option key={String(j.dias)} value={String(j.dias)}>
                {j.nome}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <input type="checkbox" checked={comImportantes} onChange={(e) => setComImportantes(e.target.checked)} /> Incluir os importantes
        </label>
      </div>

      {total === 0 ? (
        <p className="muted">
          Nenhum artigo com esse nível de erro no período. Erros entram aqui quando você responde no <Link href="/treino/">treino</Link>, nos{" "}
          <Link href="/jogos/">jogos</Link> ou entrega um <Link href="/simulados/">simulado</Link>. Experimente um nível mais baixo ou um período maior.
        </p>
      ) : (
        <>
          <div className={styles.acoes}>
            <button type="button" className="btn btn-gold" onClick={salvarComoVade}>
              Salvar como Vade Mecum ({total} artigo{total > 1 ? "s" : ""})
            </button>
            <button type="button" className="btn" onClick={() => window.print()}>
              Imprimir / PDF
            </button>
          </div>
          <PaginaLeis secoes={secoes} />
        </>
      )}
      {fora.length > 0 && (
        <section className={styles.naoImprimir}>
          <h2 style={{ fontSize: "1.2rem" }}>Fora do leitor</h2>
          <ul>
            {fora.map(([lei, { erros }]) => (
              <li key={lei}>
                {nomeLei(lei)}: {[...erros.values()].map((e) => `${rotuloArtigo(e.artigo)} (${e.erros})`).join(", ")}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
