import type { Metadata } from "next";
import Link from "next/link";
import { MinhaLeitura } from "./MinhaLeitura";

export const metadata: Metadata = {
  title: "Minha leitura",
  description: "Os artigos que você mais erra no treino, nos jogos e nos simulados, para ler na lei seca.",
};

export default function MinhaLeituraPage() {
  return (
    <div className="container section">
      <span className="eyebrow">
        <Link href="/leis/">Vade Mecum</Link>
      </span>
      <h1>Minha leitura</h1>
      <p className="lead">
        Os artigos que você mais errou no treino, nos jogos e nos simulados, mais os que você marcou como importantes (☆ no leitor). Escolha o
        nível de erro e o período; tudo fica só no seu navegador.
      </p>
      <MinhaLeitura />
    </div>
  );
}
