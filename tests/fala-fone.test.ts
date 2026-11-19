import { describe, expect, it } from "vitest";
import { ACOES_DO_FONE, silencioWav } from "../src/lib/fala/fone.ts";

describe("silencioWav", () => {
  it("um WAV de 6 s de silêncio, montado em memória", async () => {
    const b = new Uint8Array(await silencioWav(6, 8000).arrayBuffer());
    const txt = (ini: number, fim: number) => String.fromCharCode(...b.slice(ini, fim));
    expect(b.length).toBe(44 + 48_000);
    expect([txt(0, 4), txt(8, 12), txt(12, 16), txt(36, 40)]).toEqual(["RIFF", "WAVE", "fmt ", "data"]);
    const v = new DataView(b.buffer);
    expect(v.getUint32(24, true)).toBe(8000);
    expect(v.getUint32(40, true)).toBe(48_000);
    // no PCM de 8 bits, o silêncio é 128: nenhuma amostra foge dele
    expect(b.slice(44).every((x) => x === 128)).toBe(true);
  });
});

describe("ações do fone", () => {
  it("o comando de voz vem primeiro (é o padrão dos dois toques) e cada ação aparece uma vez", () => {
    expect(ACOES_DO_FONE[0]![0]).toBe("comando");
    expect(new Set(ACOES_DO_FONE.map(([a]) => a)).size).toBe(ACOES_DO_FONE.length);
  });
});
