export type Trecho = { tipo: "igual" | "mais" | "menos"; texto: string };

/** Diferença linha a linha (maior subsequência comum), aparando o começo e o fim iguais. */
export function diffLinhas(antes: string, depois: string): Trecho[] {
  const a = antes.split("\n");
  const b = depois.split("\n");
  let inicio = 0;
  while (inicio < a.length && inicio < b.length && a[inicio] === b[inicio]) inicio++;
  let fimA = a.length;
  let fimB = b.length;
  while (fimA > inicio && fimB > inicio && a[fimA - 1] === b[fimB - 1]) {
    fimA--;
    fimB--;
  }
  const meioA = a.slice(inicio, fimA);
  const meioB = b.slice(inicio, fimB);
  const n = meioA.length;
  const m = meioB.length;
  const w = m + 1;
  const lcs = new Uint32Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i * w + j] = meioA[i] === meioB[j] ? lcs[(i + 1) * w + j + 1] + 1 : Math.max(lcs[(i + 1) * w + j], lcs[i * w + j + 1]);
    }
  }
  const saida: Trecho[] = a.slice(0, inicio).map((texto) => ({ tipo: "igual", texto }));
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (meioA[i] === meioB[j]) {
      saida.push({ tipo: "igual", texto: meioA[i] });
      i++;
      j++;
    } else if (lcs[(i + 1) * w + j] >= lcs[i * w + j + 1]) {
      saida.push({ tipo: "menos", texto: meioA[i++] });
    } else {
      saida.push({ tipo: "mais", texto: meioB[j++] });
    }
  }
  while (i < n) saida.push({ tipo: "menos", texto: meioA[i++] });
  while (j < m) saida.push({ tipo: "mais", texto: meioB[j++] });
  for (const texto of a.slice(fimA)) saida.push({ tipo: "igual", texto });
  return saida;
}
