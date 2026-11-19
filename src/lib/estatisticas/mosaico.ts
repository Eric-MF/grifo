// O mosaico das peças (treemap): retângulos com a área proporcional ao valor, o mais quadrados possível (o algoritmo
// "squarified", de Bruls, Huizing e van Wijk). Função pura: a página converte os retângulos em porcentagens.

export interface Retangulo {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** O pior formato de uma fileira (a maior razão entre os lados), com a fileira encostada num lado de tamanho `lado`. */
function pior(fileira: number[], lado: number): number {
  const s = fileira.reduce((a, b) => a + b, 0);
  const max = Math.max(...fileira);
  const min = Math.min(...fileira);
  return Math.max((lado * lado * max) / (s * s), (s * s) / (lado * lado * min));
}

/**
 * Os retângulos de cada valor (na mesma ordem), cobrindo a área w × h. Os valores vêm do maior para o menor; zeros e
 * negativos ganham um retângulo vazio.
 */
export function mosaico(valores: number[], w: number, h: number): Retangulo[] {
  const total = valores.reduce((s, v) => s + Math.max(0, v), 0);
  const saida: Retangulo[] = valores.map(() => ({ x: 0, y: 0, w: 0, h: 0 }));
  if (total <= 0 || w <= 0 || h <= 0) return saida;
  const areas = valores.map((v) => (Math.max(0, v) / total) * w * h);
  const ordem = areas.map((_, i) => i).filter((i) => areas[i]! > 0);
  let x = 0;
  let y = 0;
  let largura = w;
  let altura = h;
  let fileira: number[] = [];

  const assentar = () => {
    const s = fileira.reduce((a, i) => a + areas[i]!, 0);
    if (largura >= altura) {
      // coluna encostada à esquerda
      const lw = s / altura;
      let yy = y;
      for (const i of fileira) {
        const hh = areas[i]! / lw;
        saida[i] = { x, y: yy, w: lw, h: hh };
        yy += hh;
      }
      x += lw;
      largura -= lw;
    } else {
      // fileira encostada em cima
      const lh = s / largura;
      let xx = x;
      for (const i of fileira) {
        const ww = areas[i]! / lh;
        saida[i] = { x: xx, y, w: ww, h: lh };
        xx += ww;
      }
      y += lh;
      altura -= lh;
    }
    fileira = [];
  };

  for (let k = 0; k < ordem.length; ) {
    const i = ordem[k]!;
    const lado = Math.min(largura, altura);
    const atual = fileira.map((j) => areas[j]!);
    if (!fileira.length || pior([...atual, areas[i]!], lado) <= pior(atual, lado)) {
      fileira.push(i);
      k++;
    } else assentar();
  }
  if (fileira.length) assentar();
  return saida;
}
