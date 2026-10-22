/**
 * Copia texto para a área de transferência. Fora de um contexto seguro (HTTP, como o acesso pelo Tailscale),
 * a API moderna não existe: usa a cópia pela seleção de um campo escondido. Deve ser chamada a partir de um toque
 * ou clique, para o navegador aceitar a cópia.
 */
export async function copiarTexto(texto: string): Promise<boolean> {
  if (window.isSecureContext && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch {
      // cai na cópia pela seleção
    }
  }
  const campo = document.createElement("textarea");
  campo.value = texto;
  campo.setAttribute("readonly", "");
  campo.style.position = "fixed";
  campo.style.opacity = "0";
  document.body.appendChild(campo);
  campo.select();
  campo.setSelectionRange(0, texto.length);
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  campo.remove();
  return ok;
}
