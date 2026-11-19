// Os arquivos .json.gz que o próprio site serve (os textos das provas para a busca, as informações das súmulas). Quase
// sempre chegam como estão, comprimidos, e o navegador os descomprime aqui. Uma hospedagem que os mande com
// "Content-Encoding: gzip" faz o navegador descomprimir antes: então chega o JSON já aberto. Os dois primeiros bytes
// (1f 8b, a marca do gzip) dizem qual é o caso.

/** O JSON de uma resposta de arquivo .json.gz, comprimido ou já descomprimido pelo navegador. */
export async function jsonDeGzip<T>(r: Response): Promise<T> {
  if (!r.ok) throw new Error(`${r.status} em ${r.url}`);
  const bytes = new Uint8Array(await r.arrayBuffer());
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    if (typeof DecompressionStream === "undefined") throw new Error("este navegador não descomprime o arquivo");
    return (await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).json()) as T;
  }
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}
