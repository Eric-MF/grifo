import type { Metadata } from "next";
import { LerVademecum } from "./LerVademecum";

export const metadata: Metadata = {
  title: "Vade-mécum",
  description: "Leitura e impressão de um vade-mécum montado no Grifo.",
  robots: { index: false },
};

export default function LerVademecumPage() {
  return (
    <div className="container section">
      <LerVademecum />
    </div>
  );
}
