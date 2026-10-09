import type { Metadata } from "next";
import { Suspense } from "react";
import { Verificador } from "./Verificador";

export const metadata: Metadata = {
  title: "Verificar nota",
  description: "Confira se a nota de um simulado ou a pontuação de um jogo compartilhada é autêntica.",
};

export default function Page() {
  return (
    <div className="container section" style={{ maxWidth: 760 }}>
      <span className="eyebrow">Verificação</span>
      <h1>Essa nota é de verdade?</h1>
      <p className="lead">
        Todo card de resultado do Grifo traz um código de verificação no rodapé. Digite o código para ver o exame, a nota e a
        data que ele representa. Se alguém alterou a imagem ou o texto, os dados não vão bater.
      </p>
      <Suspense>
        <Verificador />
      </Suspense>
    </div>
  );
}
