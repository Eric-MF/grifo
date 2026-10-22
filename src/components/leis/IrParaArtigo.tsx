"use client";

import { useEffect, useId, useRef, useState } from "react";
import indice from "@/content/generated/leis-indice.json";
import { ajustarAlvo, alvoDigitado, buscarTexto, dispDaLinha, faixaDosArtigos, leiDigitada, leiNaBusca, semPalavraSumula, sugerirArtigos, type AlvoDigitado, type ArtigoTexto } from "@/lib/leis/busca";
import { comandosPara, ehComando, type IdComando } from "@/lib/leis/comandos";
import { carregarArtigos } from "@/lib/leis/dados";
import { LISTAS_SUMULAS, ehSumulas } from "@/lib/leis/sumulas";
import styles from "./irPara.module.css";

// os nomes das leis e das listas de súmulas (que não estão no índice das leis)
const NOMES = new Map<string, string>([
  ...indice.map((l): [string, string] => [l.id, l.nome]),
  ...LISTAS_SUMULAS.map((l): [string, string] => [l.id, l.nome]),
]);

const ROMANOS: [number, string][] = [
  [100, "C"],
  [90, "XC"],
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];
function romano(n: number): string {
  let s = "";
  for (const [v, r] of ROMANOS)
    while (n >= v) {
      s += r;
      n -= v;
    }
  return s;
}

/** "art121.p2.i4" → "§ 2º, IV"; "art10.pu" → "parágrafo único"; "art5.i28.aa" → "XXVIII, alínea a". */
export function rotuloDoDispositivo(disp: string): string {
  return disp
    .split(".")
    .slice(1)
    .map((p) => {
      if (p === "pu") return "parágrafo único";
      const m = p.match(/^([pia])(\w+?)(?:-(\w))?$/);
      if (!m) return p;
      const letra = m[3] ? `-${m[3].toUpperCase()}` : "";
      if (m[1] === "p") return `§ ${m[2]}º${letra}`;
      if (m[1] === "i") return `${romano(Number(m[2]))}${letra}`;
      return `alínea ${m[2]}`;
    })
    .join(", ");
}

/**
 * A linha do texto do artigo (uma por bloco) que é o dispositivo: "§ 2º" e depois "IV" para art121.p2.i4. Sem achar,
 * a primeira linha (o caput).
 */
function linhaDoDispositivo(a: ArtigoTexto, disp: string): string {
  const linhas = a[2].split("\n");
  // o arquivo traz o dispositivo de cada linha; o de uma versão anterior, sem eles, é lido pelo começo das linhas
  if (a[3]) return linhas[Math.max(0, linhas.findIndex((_, j) => dispDaLinha(a, j) === disp))] ?? "";
  let k = 0;
  for (const p of disp.split(".").slice(1)) {
    const inicio = p === "pu" ? /^Parágrafo único/i : p.startsWith("p") ? new RegExp(`^§\\s*${p.slice(1).replace(/-.*/, "")}\\D`) : p.startsWith("i") ? new RegExp(`^${romano(Number(p.slice(1).replace(/-.*/, "")))}\\b`) : new RegExp(`^${p.slice(1)}\\)`);
    const achou = linhas.findIndex((l, j) => j >= k && inicio.test(l));
    if (achou < 0) return linhas[0] ?? "";
    k = achou;
  }
  return linhas[k] ?? "";
}

interface Opcao {
  id: string;
  /** para onde vai: o artigo ou o dispositivo dentro dele */
  destino: string;
  rotulo: string;
  antes?: string;
  achado?: string;
  depois: string;
  /** a opção é um comando ("/escuro"), e não um lugar da lei */
  comando?: IdComando;
}

interface Props {
  inicial: string;
  /** a lei aberta e os artigos dela, na forma em que o texto está ("Redação original" ou não) */
  lei: string;
  artigos: ArtigoTexto[];
  original: boolean;
  /** a página é de súmulas: o número é o da súmula ("s-123"), e só valem os comandos das súmulas */
  sumula: boolean;
  /** executa um comando digitado com a barra ("/telacheia") e fecha a caixa */
  aoComando: (id: IdComando) => void;
  /** leva a leitura até o artigo enquanto o número é digitado (sem fechar a caixa) */
  aoPrever: (destino: string) => void;
  /** vai ao destino escolhido e fecha a caixa */
  aoIr: (destino: string) => void;
  /** abre outra lei no destino ("100 cp" lido no CPP) */
  aoIrLei: (lei: string, destino: string) => void;
  /** fecha a caixa; com `voltar`, a leitura volta para onde estava antes de abrir (Esc) */
  aoFechar: (voltar: boolean) => void;
  /** abre a busca completa (todas as leis) com o texto digitado */
  aoBuscarTudo: (consulta: string) => void;
}

/**
 * Atalho da leitura: digitar um número (ou "/") em qualquer ponto do texto abre esta caixa. Número de artigo (com
 * parágrafo, inciso ou alínea: "121 § 2º IV", "5 XI", "5i38", "5p35") leva a leitura direto até ele; o parágrafo que o
 * artigo não tem vira o inciso de mesmo número. Com o nome de outra lei ("100 cp", "absolvição cpp"), procura nela e
 * abre a lei; com outras letras, procura o texto na lei e vai ao inciso ou parágrafo em que a palavra está. Começando
 * por "/", é um comando ("/telacheia", "/escuro"). Enter vai ao primeiro resultado (ou ao escolhido com as setas); Esc volta.
 */
export function IrParaArtigo({ inicial, lei, artigos, original, sumula, aoComando, aoPrever, aoIr, aoIrLei, aoFechar, aoBuscarTudo }: Props) {
  const [consulta, setConsulta] = useState(inicial);
  const [escolhida, setEscolhida] = useState(0);
  // artigos da outra lei digitada; null em `artigos` se não foi possível baixar
  const [daOutra, setDaOutra] = useState<{ lei: string; original: boolean; artigos: ArtigoTexto[] | null } | null>(null);
  const caixa = useRef<HTMLDivElement>(null);
  const entrada = useRef<HTMLInputElement>(null);
  const lista = useId();

  const comando = ehComando(consulta);
  // "100 cp": o artigo e a lei; "absolvição cpp": as palavras e a lei. Se a lei é a aberta, fica como se a lei não
  // tivesse sido digitada
  const numero = comando ? null : alvoDigitado(consulta);
  const comLei = comando || numero ? null : leiDigitada(consulta);
  const comTexto = comando || numero || comLei ? null : leiNaBusca(consulta);
  const citada = comLei?.lei ?? comTexto?.lei ?? null;
  const outra = citada && citada !== lei ? citada : null;
  const referencia = comLei?.resto ?? consulta;
  const palavras = comTexto?.resto ?? consulta;
  // a lista do destino é de súmulas: a aberta, ou a outra lei citada ("145 stf" lido no CP). Nela o número é o da
  // súmula: "123" → s-123 (sem parágrafo nem inciso), e a palavra "súmula" antes dele não conta
  const listaSumulas = outra ? ehSumulas(outra) : sumula;
  const numeroDaSumula = listaSumulas ? semPalavraSumula(referencia) : referencia;
  const lido: AlvoDigitado | null = comando || comTexto ? null : alvoDigitado(numeroDaSumula);
  const alvo = lido && listaSumulas ? { art: lido.art.replace(/^art/, "s-") } : lido;
  useEffect(() => {
    if (!outra) return;
    let vivo = true;
    carregarArtigos(outra, original).then(
      (d) => vivo && setDaOutra({ lei: outra, original, artigos: d.artigos }),
      () => vivo && setDaOutra({ lei: outra, original, artigos: null }),
    );
    return () => {
      vivo = false;
    };
  }, [outra, original]);
  const carregada = outra && daOutra?.lei === outra && daOutra.original === original ? daOutra : null;
  const base = outra ? carregada?.artigos : artigos;
  const nomeOutra = outra ? (NOMES.get(outra) ?? outra) : null;

  const exato = alvo ? base?.find((a) => a[0] === alvo.art) : undefined;
  const texto = consulta.trim();
  // o lugar do número digitado: o dispositivo pedido ou, se o artigo não tem o parágrafo, o inciso de mesmo número
  const destinoExato = alvo && exato ? ajustarAlvo(alvo, exato) : null;
  let opcoes: Opcao[] = [];
  if (comando) {
    opcoes = comandosPara(consulta, { sumula }).map((c) => ({ id: `/${c.id}`, destino: "", comando: c.id, rotulo: `/${c.nome}`, depois: c.titulo }));
  } else if (alvo && base) {
    const resto = (listaSumulas ? base.filter((a) => a[0].startsWith(alvo.art)) : sugerirArtigos(referencia, base, 7)).filter((a) => a[0] !== alvo.art);
    const doArtigo = (a: ArtigoTexto, destino = a[0]): Opcao => ({
      id: destino,
      destino,
      rotulo: destino === a[0] ? a[1] : `${a[1]}, ${rotuloDoDispositivo(destino)}`,
      depois: (destino === a[0] ? a[2].slice(a[1].length) : linhaDoDispositivo(a, destino)).replace(/^[\s.\-–:]+/, "").slice(0, 140),
    });
    opcoes = [...(exato && destinoExato ? [doArtigo(exato, destinoExato)] : []), ...resto.slice(0, 6).map((a) => doArtigo(a))];
  } else if (!alvo && texto.length >= 2 && base) {
    // a palavra num inciso ou parágrafo leva a ele, e não ao caput
    opcoes = buscarTexto(palavras, base, 8).map((a) => ({
      id: a.disp ?? a.art,
      destino: a.disp ?? a.art,
      rotulo: a.disp ? `${a.rotulo}, ${rotuloDoDispositivo(a.disp)}` : a.rotulo,
      antes: a.antes,
      achado: a.achado,
      depois: a.depois,
    }));
  }
  const sel = Math.min(escolhida, Math.max(0, opcoes.length - 1));
  const ir = (o: Opcao) => {
    if (o.comando === "comandos") {
      // "/comandos" (ou "/ajuda") mostra a lista inteira, sem fechar a caixa
      setConsulta("/");
      setEscolhida(0);
      entrada.current?.focus();
    } else if (o.comando) aoComando(o.comando);
    else if (outra) aoIrLei(outra, o.destino);
    else aoIr(o.destino);
  };

  // o número leva a leitura até o artigo enquanto se digita (um instante depois da última tecla); na outra lei, não
  const destinoDireto = destinoExato && !outra ? destinoExato : null;
  useEffect(() => {
    if (!destinoDireto) return;
    const t = window.setTimeout(() => aoPrever(destinoDireto), 220);
    return () => window.clearTimeout(t);
  }, [destinoDireto]); // eslint-disable-line react-hooks/exhaustive-deps -- só a mudança do destino conta

  useEffect(() => {
    const el = entrada.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  // a opção escolhida com as setas fica à vista (a lista dos comandos passa da altura da caixa)
  useEffect(() => {
    document.getElementById(`${lista}-${sel}`)?.scrollIntoView({ block: "nearest" });
  }, [lista, sel]);

  // clique fora fecha, e a leitura fica onde está
  useEffect(() => {
    const fora = (e: PointerEvent) => {
      if (!caixa.current?.contains(e.target as Node)) aoFechar(false);
    };
    document.addEventListener("pointerdown", fora, true);
    return () => document.removeEventListener("pointerdown", fora, true);
  }, [aoFechar]);

  const tecla = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      aoFechar(true);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!opcoes.length) return;
      e.preventDefault();
      setEscolhida((sel + (e.key === "ArrowDown" ? 1 : opcoes.length - 1)) % opcoes.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const o = opcoes[sel];
      if (o) ir(o);
    }
  };

  const digitado = numeroDaSumula.trim().replace(/^art(?:igo)?s?\.?\s*/i, "");
  const naOutra = (falta: string) => (!carregada ? `Carregando ${nomeOutra}…` : carregada.artigos ? falta : `Não foi possível abrir ${nomeOutra}. Tente de novo.`);
  const vazio = comando
    ? `Nenhum comando “${texto}”. Digite só / para ver todos.`
    : alvo
      ? outra
        ? naOutra(listaSumulas ? `Nenhuma súmula ${digitado} em ${nomeOutra}.` : `Nenhum artigo ${digitado} em ${nomeOutra}.`)
        : sumula
          ? `Nenhuma súmula ${digitado}.`
          : `Nenhum artigo ${digitado} nesta lei.`
      : texto.length >= 2
        ? outra
          ? naOutra(`Nada com “${palavras}” em ${nomeOutra}.`)
          : `Nada com “${comTexto ? palavras : texto}” ${sumula ? "nas súmulas" : "nesta lei"}.`
        : null;
  // a faixa de artigos da lei aberta ("1-250"), para quem não sabe até onde ela vai
  const faixa = faixaDosArtigos(artigos);

  return (
    <div ref={caixa} className={styles.caixa} role="dialog" aria-label="Ir para o artigo">
      <div className={styles.campo}>
        <svg viewBox="0 0 24 24" aria-hidden>
          <circle cx="11" cy="11" r="6.5" />
          <path d="M16 16l4.5 4.5" />
        </svg>
        <input
          ref={entrada}
          type="search"
          enterKeyHint="go"
          role="combobox"
          aria-expanded={opcoes.length > 0}
          aria-controls={lista}
          aria-activedescendant={opcoes[sel] ? `${lista}-${sel}` : undefined}
          aria-autocomplete="list"
          value={consulta}
          onChange={(e) => {
            setConsulta(e.target.value);
            setEscolhida(0);
          }}
          onKeyDown={tecla}
          placeholder={`${sumula ? "Súmula" : "Artigo"}${faixa ? ` (${faixa})` : ""}, palavras ou /comando`}
          aria-label={sumula ? "Número da súmula, palavras do texto ou comando" : "Número do artigo, palavras do texto ou comando"}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      {nomeOutra && opcoes.length > 0 && (
        <p className={styles.outraLei} aria-hidden>
          {nomeOutra}
        </p>
      )}
      {opcoes.length > 0 ? (
        <ul
          id={lista}
          className={styles.lista}
          role="listbox"
          aria-label={comando ? "Comandos" : nomeOutra ? `Artigos de ${nomeOutra}` : alvo ? "Artigos" : "Artigos com o texto"}
        >
          {opcoes.map((o, k) => (
            <li
              key={o.id}
              id={`${lista}-${k}`}
              role="option"
              aria-selected={k === sel}
              className={`${styles.opcao} ${o.comando ? styles.opcaoComando : ""}`}
              onPointerEnter={() => setEscolhida(k)}
              onClick={() => ir(o)}
            >
              <strong>{o.rotulo}</strong>
              <span>
                {o.antes}
                {o.achado && <mark>{o.achado}</mark>}
                {o.depois}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        vazio && <p className={styles.vazio}>{vazio}</p>
      )}
      <div className={styles.rodape}>
        <span>
          <kbd>Enter</kbd> {comando ? "executa o comando" : outra ? "abre a lei no artigo" : alvo ? "vai ao artigo" : "vai ao primeiro"} · <kbd>↑</kbd>
          <kbd>↓</kbd> escolhem · <kbd>Esc</kbd> volta
        </span>
        {!alvo && !comando && texto.length >= 2 && (
          <button type="button" className={styles.tudo} onClick={() => aoBuscarTudo(consulta)}>
            Buscar em todas as leis
          </button>
        )}
      </div>
    </div>
  );
}
