import type { Metadata } from "next";
import { EditorVademecum } from "./EditorVademecum";

export const metadata: Metadata = {
  title: "Vade-mécum",
  description: "Monte o seu vade-mécum com as leis (ou só os artigos) que você quer ler, imprima em PDF e compartilhe por link.",
};

export default function VademecumPage() {
  return (
    <div className="container section">
      <span className="eyebrow">Lei seca</span>
      <h1>Meu vade-mécum</h1>
      <p className="lead">
        Junte as leis que você usa, inteiras ou só alguns artigos. Dá para ler aqui, salvar em PDF com links internos e mandar o link para
        outras pessoas: o conteúdo vai no próprio endereço, sem cadastro.
      </p>
      <EditorVademecum />
    </div>
  );
}
