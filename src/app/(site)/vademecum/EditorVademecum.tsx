"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import indice from "@/content/generated/leis-indice.json";
import { CORES_TEXTO, type CorTexto, type Filtro, type Fonte, type Fundo, type OpcoesTexto } from "@/lib/leis/opcoes";
import { atualizarVade, fotoDaLei } from "@/lib/leis/foto";
import {
  faixas,
  gravarVademecuns,
  lerVademecuns,
  linkLeitura,
  opcoesDoVade,
  OPCOES_VADE_PADRAO,
  salvarVademecum,
  type ErroVade,
  type GrifoVade,
  type ItemVade,
  type OpcoesVade,
  type Vademecum,
} from "@/lib/leis/vademecum";
import styles from "./vademecum.module.css";

const nomeLei = (id: string) => indice.find((l) => l.id === id)?.nome ?? id;
// o vade novo já traz o Código Penal e o de Processo Penal, com a cópia dos grifos e dos erros de cada um
const novo = (): Vademecum => ({
  id: Date.now().toString(36),
  titulo: "Meu Vade Mecum",
  itens: ["cp", "cpp"].map((lei) => ({ lei, grifos: grifosDaLei(lei), errados: errosDaLei(lei) })),
  em: Date.now(),
  opcoes: OPCOES_VADE_PADRAO,
});

/** Cópia dos grifos da lei, como o Vade Mecum a guarda (ver foto.ts). */
const grifosDaLei = (lei: string): GrifoVade[] => fotoDaLei(lei).grifos;
/** Artigos com erro da lei, como o leitor mostra (ver foto.ts). */
const errosDaLei = (lei: string): ErroVade[] => fotoDaLei(lei).errados;

/** Abre um vade salvo com a foto atual de cada lei, e grava essa foto no lugar dele: o que foi grifado depois aparece. */
const abrirVade = (v: Vademecum): Vademecum => {
  const atualizado = atualizarVade(v);
  gravarVademecuns(lerVademecuns().map((x) => (x.id === atualizado.id ? atualizado : x)));
  return atualizado;
};

/** Lista de artigos com erro no formato de faixas ("121, 155, 154-A"). */
const faixasDos = (erros: ErroVade[]) => erros.map((e) => e.artigo).join(", ");

const FONTES: Record<Fonte, string> = { sans: "Sem serifa", serif: "Serifada", mono: "Monoespaçada" };
const FUNDOS: Record<Fundo, string> = { papel: "Papel", branco: "Branco", sepia: "Sépia", verde: "Verde", escuro: "Escuro" };

/** Uma linha de opção: caixa, título e a explicação do que muda. */
function Opcao({ marcada, onChange, titulo, dica }: { marcada: boolean; onChange: (v: boolean) => void; titulo: string; dica: string }) {
  return (
    <label className={styles.opcao}>
      <input type="checkbox" checked={marcada} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <strong>{titulo}</strong>
        <small>{dica}</small>
      </span>
    </label>
  );
}

function Grupo({ titulo, dica, children }: { titulo: string; dica?: string; children: ReactNode }) {
  return (
    <fieldset className={styles.grupo}>
      <legend>{titulo}</legend>
      {dica && <p className={styles.nota}>{dica}</p>}
      {children}
    </fieldset>
  );
}

export function EditorVademecum() {
  const [salvos, setSalvos] = useState<Vademecum[]>([]);
  const [atual, setAtual] = useState<Vademecum | null>(null);
  const [lei, setLei] = useState(indice[0]?.id ?? "");
  const [filtro, setFiltro] = useState<Filtro>("tudo");
  const [artigos, setArtigos] = useState("");
  const [copiado, setCopiado] = useState("");
  // grifos e erros da lei escolhida: lidos do navegador depois de montar (a página é estática)
  const [dados, setDados] = useState<{ grifos: GrifoVade[]; erros: ErroVade[] }>({ grifos: [], erros: [] });

  useEffect(() => {
    // os vades salvos saem com a foto de agora (grifos e erros feitos depois de salvar aparecem)
    const atualizados = lerVademecuns().map(atualizarVade);
    gravarVademecuns(atualizados);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lê localStorage após montar (site estático)
    setSalvos(atualizados);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lê localStorage após montar (site estático)
    setDados({ grifos: grifosDaLei(lei), erros: errosDaLei(lei) });
  }, [lei, atual]);

  const guardar = (v: Vademecum) => {
    salvarVademecum(v);
    setSalvos(lerVademecuns());
    setAtual(v);
  };
  const mover = (k: number, d: -1 | 1) => {
    if (!atual) return;
    const itens = [...atual.itens];
    [itens[k], itens[k + d]] = [itens[k + d], itens[k]];
    guardar({ ...atual, itens });
  };
  const opcoes = atual ? opcoesDoVade(atual.opcoes) : OPCOES_VADE_PADRAO;
  const mudarOpcoes = (troca: Partial<OpcoesVade>) => atual && guardar({ ...atual, opcoes: { ...opcoes, ...troca } });
  const mudarTexto = (troca: Partial<OpcoesTexto>) => mudarOpcoes({ texto: { ...opcoes.texto, ...troca } });

  const grifosNaLei = dados.grifos;
  const errosNaLei = dados.erros;
  const faixaInvalida = filtro === "tudo" && artigos.trim() !== "" && faixas(artigos) === null;

  // o item novo: a lei, o que entra dela e a cópia dos grifos e dos erros (para o link levar tudo)
  const adicionar = () => {
    if (!atual || faixaInvalida) return;
    const item: ItemVade =
      filtro === "automaticos"
        ? { lei, filtro }
        : filtro === "grifos"
          ? { lei, filtro, grifos: grifosNaLei, errados: errosNaLei }
        : filtro === "erros"
          ? { lei, filtro, artigos: faixasDos(errosNaLei), errados: errosNaLei, grifos: grifosNaLei }
          : { lei, ...(artigos.trim() ? { artigos: artigos.trim() } : {}), grifos: grifosNaLei, errados: errosNaLei };
    guardar({ ...atual, itens: [...atual.itens, item] });
    setArtigos("");
  };

  const copiarLink = async (v: Vademecum) => {
    const url = location.origin + (await linkLeitura(abrirVade(v)));
    await navigator.clipboard?.writeText(url);
    setCopiado(v.id);
  };

  const descricao = (it: ItemVade) => {
    const grifos = it.grifos?.length ?? 0;
    if (it.filtro === "grifos") return `só os grifos · ${grifos} ${grifos === 1 ? "grifo" : "grifos"}`;
    if (it.filtro === "automaticos") return "só os grifos automáticos";
    if (it.filtro === "erros") return `só os erros · ${it.errados?.length ?? 0} ${(it.errados?.length ?? 0) === 1 ? "artigo" : "artigos"}`;
    return it.artigos ? `arts. ${it.artigos}` : "inteira";
  };

  if (atual) {
    return (
      <div className={styles.editor}>
        <label className={styles.titulo}>
          Título
          <input value={atual.titulo} onChange={(e) => guardar({ ...atual, titulo: e.target.value })} />
        </label>

        <ol className={styles.itens}>
          {atual.itens.map((it: ItemVade, k) => (
            <li key={`${it.lei}-${k}`}>
              <span>
                <strong>{nomeLei(it.lei)}</strong>
                <span className="muted"> · {descricao(it)}</span>
              </span>
              <span className={styles.botoes}>
                <button type="button" onClick={() => mover(k, -1)} disabled={k === 0} aria-label="Subir">
                  ↑
                </button>
                <button type="button" onClick={() => mover(k, 1)} disabled={k === atual.itens.length - 1} aria-label="Descer">
                  ↓
                </button>
                <button type="button" onClick={() => guardar({ ...atual, itens: atual.itens.filter((_, i) => i !== k) })} aria-label="Remover">
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ol>

        <form
          className={styles.adicionar}
          onSubmit={(e) => {
            e.preventDefault();
            adicionar();
          }}
        >
          <label>
            Lei
            <select value={lei} onChange={(e) => setLei(e.target.value)}>
              {indice.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
            </select>
          </label>
          <fieldset className={styles.escolha}>
            <legend>O que entra desta lei</legend>
            <label>
              <input type="radio" name="filtro" checked={filtro === "tudo"} onChange={() => setFiltro("tudo")} />
              <span>
                <strong>Artigos escolhidos</strong>
                <small>a lei inteira, ou só alguns artigos</small>
              </span>
            </label>
            <label>
              <input type="radio" name="filtro" checked={filtro === "grifos"} onChange={() => setFiltro("grifos")} />
              <span>
                <strong>Só os meus grifos</strong>
                <small>{grifosNaLei.length ? `${grifosNaLei.length} ${grifosNaLei.length === 1 ? "grifo" : "grifos"} nesta lei` : "nenhum grifo nesta lei ainda"}</small>
              </span>
            </label>
            <label>
              <input type="radio" name="filtro" checked={filtro === "automaticos"} onChange={() => setFiltro("automaticos")} />
              <span>
                <strong>Só os grifos automáticos</strong>
                <small>os temas de prova que o Grifo destaca nesta lei</small>
              </span>
            </label>
            <label>
              <input type="radio" name="filtro" checked={filtro === "erros"} onChange={() => setFiltro("erros")} />
              <span>
                <strong>Só os artigos em que errei</strong>
                <small>{errosNaLei.length ? `${errosNaLei.length} ${errosNaLei.length === 1 ? "artigo" : "artigos"} com erro nesta lei` : "nenhum erro nesta lei ainda"}</small>
              </span>
            </label>
          </fieldset>
          {filtro === "tudo" && (
            <label>
              Artigos (opcional)
              <input value={artigos} onChange={(e) => setArtigos(e.target.value)} placeholder="ex.: 1-120, 155, 157-A" aria-invalid={faixaInvalida} />
            </label>
          )}
          <button type="submit" className="btn btn-sm" disabled={faixaInvalida || (filtro === "erros" && !errosNaLei.length) || (filtro === "grifos" && !grifosNaLei.length)}>
            Adicionar
          </button>
          {faixaInvalida && <p className={styles.erro}>Use números e faixas: 1-120, 155, 157-A.</p>}
        </form>

        <section className={styles.opcoesVade} aria-label="Opções do Vade Mecum">
          <Grupo titulo="Texto e leitura" dica="As mesmas opções da leitura da lei: valem para todas as leis deste Vade Mecum.">
            <div className={styles.linhaOpcao}>
              <label>
                Letra
                <select value={opcoes.texto.fonte} onChange={(e) => mudarTexto({ fonte: e.target.value as Fonte })}>
                  {(Object.keys(FONTES) as Fonte[]).map((f) => (
                    <option key={f} value={f}>
                      {FONTES[f]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Tamanho · {opcoes.texto.tamanho}px
                <input type="range" min={14} max={28} value={opcoes.texto.tamanho} onChange={(e) => mudarTexto({ tamanho: Number(e.target.value) })} />
              </label>
              <label>
                Entrelinha · {opcoes.texto.entrelinha.toFixed(1)}
                <input
                  type="range"
                  min={1.3}
                  max={2.4}
                  step={0.1}
                  value={opcoes.texto.entrelinha}
                  onChange={(e) => mudarTexto({ entrelinha: Number(e.target.value) })}
                />
              </label>
              <label>
                Cor do texto
                <select value={opcoes.texto.corTexto} onChange={(e) => mudarTexto({ corTexto: e.target.value as CorTexto })}>
                  {(Object.keys(CORES_TEXTO) as CorTexto[]).map((c) => (
                    <option key={c} value={c}>
                      {CORES_TEXTO[c].nome}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Fundo
                <select value={opcoes.texto.fundo} onChange={(e) => mudarTexto({ fundo: e.target.value as Fundo })}>
                  {(Object.keys(FUNDOS) as Fundo[]).map((f) => (
                    <option key={f} value={f}>
                      {FUNDOS[f]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <Opcao marcada={opcoes.texto.vide} onChange={(v) => mudarTexto({ vide: v })} titulo="“Vide” (remissões entre parênteses)" dica="Notas como “(Vide EC 132/2023)” e “(Vide art. 5º…)”, que remetem a outro dispositivo. Não são as notas de revogação." />
            <Opcao marcada={opcoes.texto.anotacoes} onChange={(v) => mudarTexto({ anotacoes: v })} titulo="Anotações de redação" dica="“Redação dada pela Lei…”, “Incluído…”, “Revogado…”, abaixo de cada artigo." />
            <Opcao marcada={opcoes.texto.revogados} onChange={(v) => mudarTexto({ revogados: v })} titulo="Texto revogado e redações anteriores" dica="O que já não vale e as redações antigas de cada artigo." />
            <Opcao marcada={opcoes.texto.grifos} onChange={(v) => mudarTexto({ grifos: v })} titulo="Meus grifos no texto" dica="Os trechos que você grifou, com a cor de cada grifo." />
            <Opcao marcada={opcoes.texto.erros} onChange={(v) => mudarTexto({ erros: v })} titulo="Marcar os artigos em que mais errei" dica="Um ● ao lado do artigo para cada erro (até 5)." />
            <Opcao marcada={opcoes.texto.prontos} onChange={(v) => mudarTexto({ prontos: v })} titulo="Grifos prontos do Grifo" dica="Temas de prova destacados pelo Grifo. Não são seus grifos." />
            <Opcao marcada={opcoes.texto.destino === "planalto"} onChange={(v) => mudarTexto({ destino: v ? "planalto" : "grifo" })} titulo="Referências no texto do Planalto" dica="Os “art. N” citados levam ao Planalto, e não ao texto do Grifo." />
          </Grupo>

          <Grupo titulo="Índices" dica="Acrescentados ao Vade Mecum: valem na tela, na impressão e no arquivo.">
            <Opcao
              marcada={opcoes.indices.cronologico}
              onChange={(v) => mudarOpcoes({ indices: { ...opcoes.indices, cronologico: v } })}
              titulo="Índice cronológico"
              dica="As leis na ordem em que foram editadas, antes da primeira lei."
            />
            <Opcao
              marcada={opcoes.indices.remissivo}
              onChange={(v) => mudarOpcoes({ indices: { ...opcoes.indices, remissivo: v } })}
              titulo="Índice alfabético-remissivo"
              dica="Ao fim de cada lei, as palavras-chave com o artigo de cada uma. Disponível para o Código Penal, o de Processo Penal, a Constituição e o CTB."
            />
          </Grupo>

          <Grupo titulo="Impressão / PDF" dica="Só para o papel. Os links “Grifo” e “Planalto” não saem na impressão, porque no papel não há como clicar.">
            <Opcao
              marcada={opcoes.impressao.colunas}
              onChange={(v) => mudarOpcoes({ impressao: { ...opcoes.impressao, colunas: v } })}
              titulo="Três colunas"
              dica="Texto em três colunas por página, como os Vade Mecum impressos. Desligado, a página tem uma coluna."
            />
            <Opcao
              marcada={opcoes.impressao.novaPaginaPorLei}
              onChange={(v) => mudarOpcoes({ impressao: { ...opcoes.impressao, novaPaginaPorLei: v } })}
              titulo="Cada lei em página nova"
              dica="Para separar as leis ao encadernar."
            />
          </Grupo>

          <Grupo titulo="Arquivo baixado" dica="Só para o arquivo .html. Ele abre no navegador, sem o site.">
            <Opcao
              marcada={opcoes.download.links}
              onChange={(v) => mudarOpcoes({ download: { ...opcoes.download, links: v } })}
              titulo="Links “Grifo” e “Planalto”"
              dica="Ao lado de cada artigo, clicáveis no arquivo."
            />
          </Grupo>
        </section>

        <div className={styles.acoes}>
          <button type="button" className="btn btn-gold" disabled={!atual.itens.length} onClick={async () => location.assign(await linkLeitura(atualizarVade(atual)))}>
            Ler, imprimir ou baixar
          </button>
          <button type="button" className="btn" disabled={!atual.itens.length} onClick={() => copiarLink(atual)}>
            {copiado === atual.id ? "Link copiado" : "Copiar link para compartilhar"}
          </button>
          <button type="button" className="btn" onClick={() => setAtual(null)}>
            Voltar à lista
          </button>
        </div>
        <p className="muted">
          Dentro do Vade Mecum, a impressão e o arquivo baixado têm cada um as suas próprias opções, na própria tela.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.editor}>
      <button type="button" className="btn btn-gold" onClick={() => guardar(novo())}>
        Novo Vade Mecum
      </button>
      {salvos.length > 0 && (
        <ul className={styles.salvos}>
          {salvos.map((v) => (
            <li key={v.id}>
              <span>
                <strong>{v.titulo}</strong>
                <span className="muted"> · {v.itens.map((i) => nomeLei(i.lei).split(" (")[0]).join(", ")}</span>
              </span>
              <span className={styles.botoes}>
                <button
                  type="button"
                  onClick={() => {
                    setAtual(abrirVade(v));
                    setSalvos(lerVademecuns());
                  }}
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const aberto = abrirVade(v);
                    setSalvos(lerVademecuns());
                    location.assign(await linkLeitura(aberto));
                  }}
                >
                  Ler
                </button>
                <button type="button" onClick={() => copiarLink(v)}>
                  {copiado === v.id ? "Copiado" : "Link"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    gravarVademecuns(salvos.filter((x) => x.id !== v.id));
                    setSalvos(lerVademecuns());
                  }}
                  aria-label={`Excluir ${v.titulo}`}
                >
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="muted">
        Para montar um com os artigos que você mais erra, use <Link href="/leis/minha-leitura/">Minha leitura</Link>.
      </p>
    </div>
  );
}
