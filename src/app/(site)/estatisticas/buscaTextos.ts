"use client";

// Os textos dos exames para a busca da lista (public/dados/estatisticas/textos.json.gz, gerado no build do conteúdo):
// baixados uma vez, quando a busca passa para os enunciados ou os gabaritos, e normalizados para as opções da busca.
import { useEffect, useMemo, useState } from "react";
import { normalizar, type OpcoesBusca, type TextoNormalizado } from "@/lib/estatisticas/busca";
import { jsonDeGzip } from "@/lib/gzip";

export type TipoTexto = "enunciado" | "gabarito";
export interface TextoExame {
  /** "peca", "q1", "q2"… */
  parte: string;
  tipo: TipoTexto;
  texto: string;
}
export type TextosDosExames = Record<string, TextoExame[]>;
export interface TextoPreparado extends TextoExame {
  norm: TextoNormalizado;
}

let pedido: Promise<TextosDosExames> | null = null;
function baixar(): Promise<TextosDosExames> {
  pedido ??= fetch("/dados/estatisticas/textos.json.gz")
    .then((r) => jsonDeGzip<TextosDosExames>(r))
    .catch((erro) => {
      pedido = null;
      throw erro;
    });
  return pedido;
}

export type EstadoTextos = { estado: "parado" | "carregando" | "erro"; textos: null } | { estado: "pronto"; textos: Map<string, TextoPreparado[]> };

/** Os textos dos exames, prontos para a busca com as `opcoes` (só baixa quando `ativo`). */
export function useTextosDosExames(ativo: boolean, opcoes: OpcoesBusca): EstadoTextos {
  const [brutos, setBrutos] = useState<TextosDosExames | null>(null);
  const [erro, setErro] = useState(false);
  useEffect(() => {
    if (!ativo || brutos) return;
    let vivo = true;
    baixar()
      .then((t) => vivo && setBrutos(t))
      .catch(() => vivo && setErro(true));
    return () => {
      vivo = false;
    };
  }, [ativo, brutos]);
  const chave = `${opcoes.acentos}|${opcoes.maiusculas}`;
  const preparados = useMemo(() => {
    if (!brutos) return null;
    const o = { ...opcoes, palavraInteira: false };
    return new Map(Object.entries(brutos).map(([id, ts]) => [id, ts.map((t) => ({ ...t, norm: normalizar(t.texto, o) }))]));
    // a normalização só depende de acentos e maiúsculas (a chave); a palavra inteira entra na consulta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brutos, chave]);
  if (preparados) return { estado: "pronto", textos: preparados };
  if (erro) return { estado: "erro", textos: null };
  return { estado: ativo ? "carregando" : "parado", textos: null };
}

/** "Peça · enunciado", "Questão 2 · gabarito" */
export const rotuloDoTexto = (t: TextoExame) => `${t.parte === "peca" ? "Peça" : `Questão ${t.parte.slice(1)}`} · ${t.tipo}`;
