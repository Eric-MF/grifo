import { describe, expect, it } from "vitest";
import { deflateRawSync } from "node:zlib";
import { crc32, montarZip } from "../src/lib/zip";

describe("zip", () => {
  it("crc32 confere com o valor de referência", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });

  it("monta ZIP com cabeçalhos e diretório central", async () => {
    const zip = montarZip([{ nome: "a.pdf", dados: new Uint8Array([1, 2, 3]) }]);
    const b = new Uint8Array(await zip.arrayBuffer());
    const v = new DataView(b.buffer);
    expect(v.getUint32(0, true)).toBe(0x04034b50);
    expect(v.getUint32(b.length - 22, true)).toBe(0x06054b50);
    expect(v.getUint16(b.length - 12, true)).toBe(1);
    expect(b.length).toBe(30 + 5 + 3 + 46 + 5 + 22);
  });

  it("comprime com deflate quando recebe o compressor", async () => {
    const dados = new TextEncoder().encode("abc".repeat(1000));
    const zip = montarZip([{ nome: "a.txt", dados }], (d) => deflateRawSync(d));
    const b = new Uint8Array(await zip.arrayBuffer());
    const v = new DataView(b.buffer);
    expect(v.getUint16(8, true)).toBe(8);
    const csize = v.getUint32(18, true);
    expect(csize).toBeLessThan(dados.length);
    expect(v.getUint32(22, true)).toBe(dados.length);
    expect(v.getUint32(14, true)).toBe(crc32(dados));
  });
});
