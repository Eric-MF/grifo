import { describe, expect, it } from "vitest";
import { ehBluetooth, ehEmbutido, ehVirtual, escolherMicrofone, nomeDoMicrofone, semPrefixo, type Microfone } from "../src/lib/fala/microfone.ts";

// Lista parecida com a do Windows: o padrão é o fone Bluetooth, e o mesmo fone aparece com o grupo dele
const windows: Microfone[] = [
  { id: "default", rotulo: "Padrão - Headset (WH-1000XM4 Hands-Free AG Audio)", grupo: "g-bt" },
  { id: "communications", rotulo: "Comunicações - Headset (WH-1000XM4 Hands-Free AG Audio)", grupo: "g-bt" },
  { id: "bt1", rotulo: "Headset (WH-1000XM4 Hands-Free AG Audio)", grupo: "g-bt" },
  { id: "mix", rotulo: "Mixagem estéreo (Realtek(R) Audio)", grupo: "g-rt" },
  { id: "rt", rotulo: "Microfone (Realtek(R) Audio)", grupo: "g-rt2" },
  { id: "arr", rotulo: "Matriz de microfones (Intel® Smart Sound)", grupo: "g-in" },
];

describe("semPrefixo", () => {
  it("tira um prefixo de padrão, em português ou inglês, com hífen ou travessão", () => {
    expect(semPrefixo("Padrão - Headset (WH-1000XM4 Hands-Free AG Audio)")).toBe("Headset (WH-1000XM4 Hands-Free AG Audio)");
    expect(semPrefixo("Default - MacBook Pro Microphone")).toBe("MacBook Pro Microphone");
    expect(semPrefixo("Comunicações – Headset (X)")).toBe("Headset (X)");
  });

  it("nome sem prefixo fica igual", () => {
    expect(semPrefixo("Microfone (Realtek(R) Audio)")).toBe("Microfone (Realtek(R) Audio)");
  });
});

describe("ehBluetooth", () => {
  it.each([
    "Headset (WH-1000XM4 Hands-Free AG Audio)",
    "Padrão - Headset (Galaxy Buds2 Pro)",
    "AirPods de Ana (Bluetooth)",
    "Fones de ouvido (JBL Tune 510BT)",
    "Headset Head Unit (HSP/HFP)",
  ])("“%s” é Bluetooth", (rotulo) => {
    expect(ehBluetooth(rotulo)).toBe(true);
  });

  it.each([
    "Microfone (Realtek(R) Audio)",
    "Matriz de microfones (Tecnologia Intel® Smart Sound para microfones digitais)",
    "MacBook Pro Microphone",
    "Headset Microphone (Logitech USB Headset)",
    "Fake Default Audio Input",
  ])("“%s” não é Bluetooth", (rotulo) => {
    expect(ehBluetooth(rotulo)).toBe(false);
  });
});

describe("ehVirtual", () => {
  it.each(["Mixagem estéreo (Realtek(R) Audio)", "CABLE Output (VB-Audio Virtual Cable)", "Monitor of Built-in Audio Analog Stereo"])(
    "“%s” é virtual",
    (rotulo) => {
      expect(ehVirtual(rotulo)).toBe(true);
    },
  );

  it("microfone de verdade não é virtual", () => {
    expect(ehVirtual("Microfone (Realtek(R) Audio)")).toBe(false);
  });
});

describe("ehEmbutido", () => {
  it.each(["MacBook Pro Microphone", "Matriz de microfones (Intel® Smart Sound)", "Microfone interno (Realtek)", "Webcam HD"])(
    "“%s” é embutido",
    (rotulo) => {
      expect(ehEmbutido(rotulo)).toBe(true);
    },
  );

  it("microfone de fio ou USB não é embutido", () => {
    expect(ehEmbutido("Headset Microphone (Logitech USB Headset)")).toBe(false);
  });
});

describe("escolherMicrofone", () => {
  it("no automático, troca o fone Bluetooth padrão pelo embutido", () => {
    expect(escolherMicrofone(windows, "auto")).toBe("arr");
  });

  it("'padrao' usa o padrão do sistema", () => {
    expect(escolherMicrofone(windows, "padrao")).toBeNull();
  });

  it("um id escolhido que existe é usado", () => {
    expect(escolherMicrofone(windows, "rt")).toBe("rt");
  });

  it("um id que sumiu cai no automático", () => {
    expect(escolherMicrofone(windows, "sumiu")).toBe("arr");
  });

  it("padrão que não é Bluetooth: fica com ele", () => {
    const lista: Microfone[] = [
      { id: "default", rotulo: "Padrão - Microfone (Realtek(R) Audio)", grupo: "g-rt2" },
      { id: "rt", rotulo: "Microfone (Realtek(R) Audio)", grupo: "g-rt2" },
    ];
    expect(escolherMicrofone(lista, "auto")).toBeNull();
  });

  it("só o fone Bluetooth disponível: fica com o padrão", () => {
    const lista: Microfone[] = [
      { id: "default", rotulo: "Padrão - Headset (WH-1000XM4 Hands-Free AG Audio)", grupo: "g-bt" },
      { id: "bt1", rotulo: "Headset (WH-1000XM4 Hands-Free AG Audio)", grupo: "g-bt" },
    ];
    expect(escolherMicrofone(lista, "auto")).toBeNull();
  });

  it("microfone do mesmo aparelho do fone não serve como alternativa", () => {
    const lista: Microfone[] = [
      { id: "default", rotulo: "Padrão - Headset (WH-1000XM4 Hands-Free AG Audio)", grupo: "g-bt" },
      { id: "x", rotulo: "Microfone (Realtek(R) Audio)", grupo: "g-bt" },
    ];
    expect(escolherMicrofone(lista, "auto")).toBeNull();
  });

  it("lista vazia: null", () => {
    expect(escolherMicrofone([], "auto")).toBeNull();
  });

  it("sem entrada 'default': o primeiro microfone real é o padrão", () => {
    const lista: Microfone[] = [
      { id: "bt", rotulo: "Headset (WH-1000XM4 Hands-Free AG Audio)", grupo: "g-bt" },
      { id: "mac", rotulo: "MacBook Pro Microphone", grupo: "g-mac" },
    ];
    expect(escolherMicrofone(lista, "auto")).toBe("mac");
  });
});

describe("nomeDoMicrofone", () => {
  it("mostra o nome sem o prefixo", () => {
    expect(nomeDoMicrofone("Padrão - Headset (X)")).toBe("Headset (X)");
  });

  it("rótulo vazio ganha um nome padrão", () => {
    expect(nomeDoMicrofone("")).toBe("Microfone sem nome");
  });
});
