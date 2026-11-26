"use client";

// Apaga tudo o que o Grifo guardou neste navegador (as chaves "grifo…" do armazenamento local): progresso, preferências,
// marcações, respostas, chaves de IA lembradas e a escolha dos cookies. Pergunta antes, e recarrega a página.
import { useState } from "react";

export function ApagarDados() {
  const [feito, setFeito] = useState(false);
  const apagar = () => {
    if (!window.confirm("Apagar tudo o que o Grifo guardou neste navegador? O progresso, as marcações, as respostas e as preferências não voltam.")) return;
    try {
      const chaves: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith("grifo")) chaves.push(k);
      }
      for (const k of chaves) localStorage.removeItem(k);
      sessionStorage.clear();
    } catch {
      /* sem armazenamento: não há o que apagar */
    }
    setFeito(true);
    window.setTimeout(() => window.location.reload(), 1200);
  };
  return (
    <p>
      <button type="button" className="btn btn-ghost" onClick={apagar} disabled={feito}>
        {feito ? "Apagado. Recarregando…" : "Apagar os dados do Grifo neste navegador"}
      </button>
    </p>
  );
}
