const TABELA = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

export function crc32(dados: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < dados.length; i++) c = TABELA[(c ^ dados[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export interface EntradaZip {
  nome: string;
  dados: Uint8Array;
}

/** ZIP sem compressão (método "store") por padrão; `comprimir` troca para deflate (método 8). */
export function montarZip(entradas: EntradaZip[], comprimir?: (dados: Uint8Array) => Uint8Array): Blob {
  const agora = new Date();
  const hora = (agora.getHours() << 11) | (agora.getMinutes() << 5) | (agora.getSeconds() >> 1);
  const data = ((agora.getFullYear() - 1980) << 9) | ((agora.getMonth() + 1) << 5) | agora.getDate();
  const codificador = new TextEncoder();
  const partes: Uint8Array[] = [];
  const diretorio: Uint8Array[] = [];
  let deslocamento = 0;
  let tamanhoDiretorio = 0;

  for (const { nome, dados: original } of entradas) {
    const nomeBytes = codificador.encode(nome);
    const crc = crc32(original);
    const dados = comprimir ? comprimir(original) : original;
    const metodo = comprimir ? 8 : 0;

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true);
    local.setUint16(8, metodo, true);
    local.setUint16(10, hora, true);
    local.setUint16(12, data, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, dados.length, true);
    local.setUint32(22, original.length, true);
    local.setUint16(26, nomeBytes.length, true);
    partes.push(new Uint8Array(local.buffer), nomeBytes, dados);

    const central = new DataView(new ArrayBuffer(46));
    central.setUint32(0, 0x02014b50, true);
    central.setUint16(4, 20, true);
    central.setUint16(6, 20, true);
    central.setUint16(8, 0x0800, true);
    central.setUint16(10, metodo, true);
    central.setUint16(12, hora, true);
    central.setUint16(14, data, true);
    central.setUint32(16, crc, true);
    central.setUint32(20, dados.length, true);
    central.setUint32(24, original.length, true);
    central.setUint16(28, nomeBytes.length, true);
    central.setUint32(42, deslocamento, true);
    diretorio.push(new Uint8Array(central.buffer), nomeBytes);
    tamanhoDiretorio += 46 + nomeBytes.length;

    deslocamento += 30 + nomeBytes.length + dados.length;
  }

  const fim = new DataView(new ArrayBuffer(22));
  fim.setUint32(0, 0x06054b50, true);
  fim.setUint16(8, entradas.length, true);
  fim.setUint16(10, entradas.length, true);
  fim.setUint32(12, tamanhoDiretorio, true);
  fim.setUint32(16, deslocamento, true);

  return new Blob([...partes, ...diretorio, new Uint8Array(fim.buffer)] as BlobPart[], { type: "application/zip" });
}
