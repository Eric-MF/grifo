import { describe, expect, it } from "vitest";
import { PERSONAGENS } from "@/games/flap-suitcase/progressao";

describe("como conseguir os personagens especiais", () => {
  const especiais = PERSONAGENS.filter((p) => p.secreto);

  it("todo personagem especial tem um resumo de como foi conseguido", () => {
    expect(especiais.length).toBeGreaterThan(0);
    for (const p of especiais) expect(p.comoObter, p.id).toBeTruthy();
  });

  it("o resumo é breve e começa com 'Desbloqueado para'", () => {
    for (const p of especiais) {
      expect(p.comoObter!.startsWith("Desbloqueado para "), p.id).toBe(true);
      expect(p.comoObter!.length, p.id).toBeLessThanOrEqual(90);
    }
  });

  it("os personagens que não são especiais não precisam do resumo", () => {
    expect(PERSONAGENS.filter((p) => !p.secreto && p.comoObter).length).toBe(0);
  });
});
