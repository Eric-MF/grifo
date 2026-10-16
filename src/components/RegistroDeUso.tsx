"use client";

import { useEffect } from "react";
import { atualizarConquistas, registrarVisita } from "@/lib/conquistas";

/** Registra cada abertura do site: data da visita (para a ausência longa) e o dia do tema escuro. */
export function RegistroDeUso() {
  useEffect(() => {
    // só o tema escolhido no site conta (data-theme="escuro"), não o do sistema
    const escuro = document.documentElement.getAttribute("data-theme") === "escuro";
    atualizarConquistas((c) => registrarVisita(c, new Date(), escuro));
  }, []);
  return null;
}
