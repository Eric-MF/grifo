import { describe, expect, it } from "vitest";
import { DUPLO_MS, Gesto, PASSO_PX, SEGURAR_MS, TOLERANCIA_PX, type EventoGesto, type OpcoesGesto, type Relogio } from "../src/lib/gestos.ts";

interface Agendado {
  id: number;
  quando: number;
  f: () => void;
}

/** Um relógio de mentira: o tempo só anda quando `andar` é chamado, e os timers que vencem rodam na ordem. */
class RelogioFalso implements Relogio {
  agora = 0;
  agendados: Agendado[] = [];
  private ultimoId = 0;

  agendar(f: () => void, ms: number) {
    const id = ++this.ultimoId;
    this.agendados.push({ id, quando: this.agora + ms, f });
    return id;
  }

  cancelar(id: unknown) {
    this.agendados = this.agendados.filter((t) => t.id !== id);
  }

  andar(ms: number) {
    this.agora += ms;
    let t = this.proximoVencido();
    while (t) {
      const atual = t;
      this.agendados = this.agendados.filter((x) => x !== atual);
      atual.f();
      t = this.proximoVencido();
    }
  }

  private proximoVencido(): Agendado | undefined {
    let melhor: Agendado | undefined;
    for (const t of this.agendados) {
      if (t.quando <= this.agora && (!melhor || t.quando < melhor.quando)) melhor = t;
    }
    return melhor;
  }
}

/** Um gesto ligado a um relógio de mentira e à lista dos eventos que ele emite. */
function montar(opcoes: OpcoesGesto = {}) {
  const relogio = new RelogioFalso();
  const eventos: EventoGesto[] = [];
  const g = new Gesto(opcoes, (e) => eventos.push(e), relogio);
  return { g, relogio, eventos };
}

describe("o toque sem duplo", () => {
  it("apertar e soltar no mesmo ponto é um toque na hora, sem esperar o tempo", () => {
    const { g, eventos } = montar();
    g.apertar(10, 10);
    g.soltar(10, 10);
    expect(eventos).toEqual([{ tipo: "toque" }]);
  });

  it("mover menos que a tolerância e soltar ainda é um toque", () => {
    const { g, eventos } = montar();
    g.apertar(100, 100);
    g.mover(103, 104);
    g.soltar(103, 104);
    expect(eventos).toEqual([{ tipo: "toque" }]);
  });
});

describe("o toque com duplo", () => {
  it("um toque só espera o tempo do duplo e então sai uma vez", () => {
    const { g, relogio, eventos } = montar({ duplo: true });
    g.apertar(0, 0);
    g.soltar(0, 0);
    expect(eventos).toEqual([]);
    relogio.andar(DUPLO_MS - 1);
    expect(eventos).toEqual([]);
    relogio.andar(1);
    expect(eventos).toEqual([{ tipo: "toque" }]);
  });

  it("um segundo toque dentro do tempo do duplo emite o duplo na hora, e nada mais depois", () => {
    const { g, relogio, eventos } = montar({ duplo: true });
    g.apertar(0, 0);
    g.soltar(0, 0);
    relogio.andar(DUPLO_MS - 1);
    g.apertar(0, 0);
    expect(eventos).toEqual([{ tipo: "duplo" }]);
    g.soltar(0, 0);
    expect(eventos).toEqual([{ tipo: "duplo" }]);
    relogio.andar(DUPLO_MS * 2);
    expect(eventos).toEqual([{ tipo: "duplo" }]);
  });

  it("depois do tempo do duplo, outro toque é um toque novo, não um duplo", () => {
    const { g, relogio, eventos } = montar({ duplo: true });
    g.apertar(0, 0);
    g.soltar(0, 0);
    relogio.andar(DUPLO_MS + 1);
    expect(eventos).toEqual([{ tipo: "toque" }]);
    g.apertar(0, 0);
    g.soltar(0, 0);
    relogio.andar(DUPLO_MS);
    expect(eventos).toEqual([{ tipo: "toque" }, { tipo: "toque" }]);
  });

  it("destruir o botão com um toque pendente faz o toque não sair", () => {
    const { g, relogio, eventos } = montar({ duplo: true });
    g.apertar(0, 0);
    g.soltar(0, 0);
    g.destruir();
    relogio.andar(DUPLO_MS * 2);
    expect(eventos).toEqual([]);
    expect(relogio.agendados).toEqual([]);
  });
});

describe("segurar", () => {
  it("parado pelo tempo de segurar, emite o segurou com o ponto do aperto; soltar parado não é movimento", () => {
    const { g, relogio, eventos } = montar({ segurar: true });
    g.apertar(50, 60);
    relogio.andar(SEGURAR_MS);
    expect(eventos).toEqual([{ tipo: "segurou", x: 50, y: 60 }]);
    g.soltar(50, 60);
    expect(eventos).toEqual([
      { tipo: "segurou", x: 50, y: 60 },
      { tipo: "soltouSegurando", x: 50, y: 60, moveu: false },
    ]);
  });

  it("depois de segurar, andar emite moveuSegurando, e o soltar diz que o dedo andou", () => {
    const { g, relogio, eventos } = montar({ segurar: true });
    g.apertar(50, 60);
    relogio.andar(SEGURAR_MS);
    g.mover(55, 60);
    expect(eventos.at(-1)).toEqual({ tipo: "moveuSegurando", x: 55, y: 60 });
    g.mover(50 + TOLERANCIA_PX + 1, 60);
    expect(eventos.at(-1)).toEqual({ tipo: "moveuSegurando", x: 50 + TOLERANCIA_PX + 1, y: 60 });
    g.soltar(50 + TOLERANCIA_PX + 1, 60);
    expect(eventos).toEqual([
      { tipo: "segurou", x: 50, y: 60 },
      { tipo: "moveuSegurando", x: 55, y: 60 },
      { tipo: "moveuSegurando", x: 50 + TOLERANCIA_PX + 1, y: 60 },
      { tipo: "soltouSegurando", x: 50 + TOLERANCIA_PX + 1, y: 60, moveu: true },
    ]);
    expect(eventos.some((e) => e.tipo === "toque")).toBe(false);
  });

  it("soltar antes do tempo de segurar é um toque", () => {
    const { g, relogio, eventos } = montar({ segurar: true });
    g.apertar(0, 0);
    relogio.andar(SEGURAR_MS - 1);
    g.soltar(0, 0);
    expect(eventos).toEqual([{ tipo: "toque" }]);
  });

  it("segurar sem o botão ter o que fazer ao segurar: segurar mais que o tempo e soltar é um toque", () => {
    const { g, relogio, eventos } = montar();
    g.apertar(0, 0);
    relogio.andar(SEGURAR_MS * 2);
    g.soltar(0, 0);
    expect(eventos).toEqual([{ tipo: "toque" }]);
  });
});

describe("deslizar", () => {
  it("em x, cada mudança de passo emite um deslizou; andar dentro do mesmo passo não emite nada", () => {
    const { g, eventos } = montar({ deslizar: "x" });
    g.apertar(100, 100);
    g.mover(100 + PASSO_PX * 2 + 1, 101);
    expect(eventos).toEqual([{ tipo: "deslizou", eixo: "x", passos: 2, x: 100 + PASSO_PX * 2 + 1, y: 101 }]);
    g.mover(100 + PASSO_PX * 2 + 5, 100);
    expect(eventos).toHaveLength(1);
    g.mover(100 + PASSO_PX * 3, 100);
    expect(eventos.at(-1)).toEqual({ tipo: "deslizou", eixo: "x", passos: 3, x: 100 + PASSO_PX * 3, y: 100 });
  });

  it("em x, voltar para a esquerda do começo dá passos negativos, e soltar diz o último número", () => {
    const { g, eventos } = montar({ deslizar: "x" });
    g.apertar(100, 100);
    g.mover(100 + PASSO_PX * 2, 100);
    g.mover(100 - PASSO_PX * 2, 100);
    expect(eventos.at(-1)).toEqual({ tipo: "deslizou", eixo: "x", passos: -2, x: 100 - PASSO_PX * 2, y: 100 });
    g.soltar(100 - PASSO_PX * 2, 100);
    expect(eventos.at(-1)).toEqual({ tipo: "soltouDeslizando", eixo: "x", passos: -2 });
    expect(eventos.some((e) => e.tipo === "toque")).toBe(false);
  });

  it("depois de começar a deslizar, o segurar não dispara mais", () => {
    const { g, relogio, eventos } = montar({ deslizar: "x", segurar: true });
    g.apertar(100, 100);
    g.mover(100 + PASSO_PX, 100);
    relogio.andar(SEGURAR_MS * 2);
    expect(eventos).toEqual([{ tipo: "deslizou", eixo: "x", passos: 1, x: 100 + PASSO_PX, y: 100 }]);
    g.soltar(100 + PASSO_PX, 100);
    expect(eventos.at(-1)).toEqual({ tipo: "soltouDeslizando", eixo: "x", passos: 1 });
  });

  it("em y, subir (y menor) dá passos positivos e descer dá negativos", () => {
    const { g, eventos } = montar({ deslizar: "y" });
    g.apertar(100, 100);
    g.mover(100, 100 - PASSO_PX * 2 - 1);
    expect(eventos).toEqual([{ tipo: "deslizou", eixo: "y", passos: 2, x: 100, y: 100 - PASSO_PX * 2 - 1 }]);
    g.mover(100, 100 + PASSO_PX);
    expect(eventos.at(-1)).toEqual({ tipo: "deslizou", eixo: "y", passos: -1, x: 100, y: 100 + PASSO_PX });
    g.soltar(100, 100 + PASSO_PX);
    expect(eventos.at(-1)).toEqual({ tipo: "soltouDeslizando", eixo: "y", passos: -1 });
  });

  it("em xy, o primeiro movimento escolhe o eixo pelo lado dominante, e depois o eixo não muda", () => {
    const { g, eventos } = montar({ deslizar: "xy" });
    g.apertar(100, 100);
    g.mover(104, 70);
    expect(eventos).toEqual([{ tipo: "deslizou", eixo: "y", passos: 2, x: 104, y: 70 }]);
    g.mover(140, 70);
    expect(eventos).toHaveLength(1);
  });

  it("em xy, um movimento mais horizontal escolhe x", () => {
    const { g, eventos } = montar({ deslizar: "xy" });
    g.apertar(100, 100);
    g.mover(130, 104);
    expect(eventos).toEqual([{ tipo: "deslizou", eixo: "x", passos: 2, x: 130, y: 104 }]);
  });

  it("em x, mover o dedo mais na vertical que na horizontal, além da tolerância, cancela uma vez e não vira toque", () => {
    const { g, eventos } = montar({ deslizar: "x" });
    g.apertar(100, 100);
    g.mover(102, 130);
    expect(eventos).toEqual([{ tipo: "cancelou" }]);
    g.soltar(102, 130);
    expect(eventos).toEqual([{ tipo: "cancelou" }]);
  });

  it("passoPx muda o tamanho do passo", () => {
    const { g, eventos } = montar({ deslizar: "x", passoPx: 30 });
    g.apertar(100, 100);
    g.mover(161, 100);
    expect(eventos).toEqual([{ tipo: "deslizou", eixo: "x", passos: 2, x: 161, y: 100 }]);

    const padrao = montar({ deslizar: "x" });
    padrao.g.apertar(100, 100);
    padrao.g.mover(161, 100);
    expect(padrao.eventos).toEqual([{ tipo: "deslizou", eixo: "x", passos: 4, x: 161, y: 100 }]);
  });
});

describe("mover sem deslizar", () => {
  it("mover além da tolerância cancela o toque, e soltar não emite toque", () => {
    const { g, eventos } = montar();
    g.apertar(100, 100);
    g.mover(100 + TOLERANCIA_PX + 5, 100);
    expect(eventos).toEqual([{ tipo: "cancelou" }]);
    g.soltar(100 + TOLERANCIA_PX + 5, 100);
    expect(eventos).toEqual([{ tipo: "cancelou" }]);
  });

  it("mover aquém da tolerância não cancela; soltar então é um toque", () => {
    const { g, eventos } = montar({ deslizar: null });
    g.apertar(100, 100);
    g.mover(103, 104);
    expect(eventos).toEqual([]);
    g.soltar(103, 104);
    expect(eventos).toEqual([{ tipo: "toque" }]);
  });
});

describe("cancelar e destruir", () => {
  it("cancelar durante um aperto emite cancelou, e tira o segurar que estava para vir", () => {
    const { g, relogio, eventos } = montar({ segurar: true });
    g.apertar(0, 0);
    g.cancelar();
    expect(eventos).toEqual([{ tipo: "cancelou" }]);
    relogio.andar(SEGURAR_MS * 2);
    expect(eventos).toEqual([{ tipo: "cancelou" }]);
  });

  it("cancelar sem nada em andamento não emite nada", () => {
    const { g, eventos } = montar();
    g.cancelar();
    expect(eventos).toEqual([]);
  });
});
