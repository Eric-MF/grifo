import type { Metadata } from "next";
import { EditorVademecum } from "./EditorVademecum";

export const metadata: Metadata = {
  title: "Vade Mecum",
  description: "Monte o seu Vade Mecum com as leis (ou só os artigos) que você quer ler, imprima em PDF e compartilhe por link.",
};

export default function VademecumPage() {
  return (
    <div className="container section">
      <span className="eyebrow">Vade Mecum</span>
      <h1>Meu Vade Mecum</h1>
      <p className="lead">
        Junte as leis que você usa, inteiras ou só alguns artigos. Dá para ler aqui, salvar em PDF com links internos e mandar o link para
        outras pessoas: o conteúdo vai no próprio endereço, sem cadastro.
      </p>
      <EditorVademecum />
    </div>
  );
}
