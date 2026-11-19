// Código de verificação dos resultados compartilhados.
//
// Formato (v1): carga binária + MAC de 32 bits, em base32 Crockford, seguida de um
// dígito verificador ISO 7064 MOD 37-36. Exibido em grupos de 4: "K7Q2-9MXA-…-C".
//
//   carga simulado: versão(4) tipo(2) exame(7) variante(2) atualizado(1) total(10)
//                   peça(9) modo(3) dia(15) duração(9) impressão(16)          = 78 bits
//   carga jogo v1:  versão(4) tipo(2) jogo(4) pontos(20) nível(2) estilo(4)
//                   acertos(8) perguntas(8) dia(15) impressão(11)             = 78 bits
//   carga jogo v2:  … estilo(4) categorias(4) acertos(8) perguntas(8) dia(15)
//                   impressão(7)                                              = 78 bits
//   carga jogo v3:  versão(4) tipo(2) jogo(4) pontos(17) nível(2) estilo(7)
//                   categorias(4) acertos(8) perguntas(8) dia(15) impressão(7) = 78 bits
//   (v3 abre espaço para até 128 estilos; os pontos ficam limitados a 131.071)
//   (v2 guarda os tipos de pergunta escolhidos; os códigos v1 e v2 continuam válidos)
//
// "impressão" = SHA-256 truncado sobre tudo o que não cabe na carga (texto das
// respostas, notas de cada questão, provedor de IA…); a página de resultado mostra
// o mesmo valor, então qualquer alteração aparece.
//
// Limitação honesta: sem servidor, a chave do MAC está no JavaScript do site.
// Isso impede adulteração casual (editar o HTML, digitar outra nota) e erros de
// digitação, mas não é prova criptográfica. O campo "versão" permite migrar para
// assinatura no servidor sem invalidar códigos antigos.

import { hmacSha256, sha256 } from "./sha256.ts";

const ALFABETO = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford base32
const VERSAO = 1;
const VERSAO_JOGO_CATEGORIAS = 2;
const VERSAO_JOGO_ESTILOS = 3;
/** bits de impressão do código de jogo v2 (com categorias) */
export const BITS_IMPRESSAO_JOGO = 7;
const BITS_CARGA = 78;
const BITS_MAC = 32;
const EPOCH = Date.UTC(2020, 0, 1);

export type ModoCorrecao = "auto" | "anthropic" | "openai" | "gemini" | "openrouter" | "groq" | "mistral" | "deepseek";
const MODOS: ModoCorrecao[] = ["auto", "anthropic", "openai", "gemini", "openrouter", "groq", "mistral", "deepseek"];

export interface DadosSimulado {
  tipo: "simulado";
  exame: number;
  variante: number; // 0 = principal, 1..3 = variantes regionais
  atualizado: boolean;
  total: number; // 0..10, duas casas
  peca: number; // 0..5
  modo: ModoCorrecao;
  data: Date;
  duracaoMin: number;
  impressao: number; // 16 bits
}
export interface DadosJogo {
  tipo: "jogo";
  jogo: number;
  pontos: number;
  nivel: number; // 1..3
  estilo: number;
  acertos: number;
  perguntas: number;
  data: Date;
  impressao: number; // 11 bits (v1) ou 7 bits (v2 e v3)
  /** máscara de 4 bits das categorias de pergunta; presente = código v3 (v2 nos códigos antigos) */
  categorias?: number;
}
type DadosCodigo = DadosSimulado | DadosJogo;

// Chave ofuscada (não é segredo real; ver comentário do topo).
const K = [0x47, 0x72, 0x69, 0x66, 0x6f, 0x2d, 0x4f, 0x41, 0x42, 0x2d, 0x50, 0x65, 0x6e, 0x61, 0x6c];
const MASK = [0x13, 0x37, 0x5a, 0x21, 0x0f, 0x44, 0x6b, 0x19, 0x28, 0x71, 0x3c, 0x55, 0x0d, 0x62, 0x2e];
const chave = () => new Uint8Array(K.map((b, i) => b ^ MASK[i] ^ MASK[(i * 7) % MASK.length]));

class Bits {
  value = 0n;
  size = 0;
  push(v: number, bits: number) {
    const max = 2 ** bits - 1;
    const n = Math.max(0, Math.min(max, Math.round(v)));
    this.value = (this.value << BigInt(bits)) | BigInt(n);
    this.size += bits;
    return this;
  }
}
function reader(value: bigint, size: number) {
  let offset = size;
  return (bits: number) => {
    offset -= bits;
    return Number((value >> BigInt(offset)) & ((1n << BigInt(bits)) - 1n));
  };
}

const diaDe = (d: Date) => Math.floor((d.getTime() - EPOCH) / 86_400_000);
const dataDe = (dia: number) => new Date(EPOCH + dia * 86_400_000);

function carga(d: DadosCodigo): Bits {
  const v3 = d.tipo === "jogo" && d.categorias !== undefined;
  const b = new Bits().push(v3 ? VERSAO_JOGO_ESTILOS : VERSAO, 4);
  if (d.tipo === "simulado") {
    b.push(0, 2).push(d.exame, 7).push(d.variante, 2).push(d.atualizado ? 1 : 0, 1)
      .push(d.total * 100, 10).push(d.peca * 100, 9).push(MODOS.indexOf(d.modo), 3)
      .push(diaDe(d.data), 15).push(d.duracaoMin, 9).push(d.impressao, 16);
  } else if (v3) {
    b.push(1, 2).push(d.jogo, 4).push(d.pontos, 17).push(d.nivel, 2).push(d.estilo, 7).push(d.categorias!, 4)
      .push(d.acertos, 8).push(d.perguntas, 8).push(diaDe(d.data), 15).push(d.impressao, BITS_IMPRESSAO_JOGO);
  } else {
    b.push(1, 2).push(d.jogo, 4).push(d.pontos, 20).push(d.nivel, 2).push(d.estilo, 4)
      .push(d.acertos, 8).push(d.perguntas, 8).push(diaDe(d.data), 15).push(d.impressao, 11);
  }
  if (b.size !== BITS_CARGA) throw new Error(`carga com ${b.size} bits`);
  return b;
}

async function mac(payload: bigint): Promise<number> {
  const bytes = new Uint8Array(10);
  let v = payload;
  for (let i = bytes.length - 1; i >= 0; i--) {
    bytes[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  const sig = hmacSha256(chave(), bytes);
  return ((sig[0] << 24) | (sig[1] << 16) | (sig[2] << 8) | sig[3]) >>> 0;
}

function base32(value: bigint, bits: number): string {
  const chars = Math.ceil(bits / 5);
  let v = value << BigInt(chars * 5 - bits);
  let out = "";
  for (let i = 0; i < chars; i++) {
    out = ALFABETO[Number(v & 31n)] + out;
    v >>= 5n;
  }
  return out;
}
function unbase32(s: string, bits: number): bigint | null {
  let v = 0n;
  for (const ch of s) {
    const i = ALFABETO.indexOf(ch);
    if (i < 0) return null;
    v = (v << 5n) | BigInt(i);
  }
  return v >> BigInt(s.length * 5 - bits);
}

// ISO/IEC 7064 MOD 37-36 (sistema híbrido sobre 0-9A-Z).
const ALNUM = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export function digitoVerificador(s: string): string {
  let p = 36;
  for (const ch of s) {
    let t = (p + ALNUM.indexOf(ch)) % 36;
    if (t === 0) t = 36;
    p = (t * 2) % 37;
  }
  return ALNUM[(37 - p) % 36];
}

/** Normaliza o que o usuário digitou (minúsculas, hífens, O→0, I/L→1 no corpo). */
function limpar(input: string) {
  const s = input.toUpperCase().replace(/[^0-9A-Z]/g, "");
  if (s.length < 2) return null;
  const corpo = s.slice(0, -1).replace(/O/g, "0").replace(/[IL]/g, "1").replace(/U/g, "V");
  return { corpo, dv: s.slice(-1) };
}

function formatar(codigo: string) {
  return codigo.match(/.{1,4}/g)!.join("-");
}

async function finalizar(b: Bits): Promise<string> {
  const m = await mac(b.value);
  const all = (b.value << BigInt(BITS_MAC)) | BigInt(m);
  const corpo = base32(all, BITS_CARGA + BITS_MAC);
  return formatar(corpo + digitoVerificador(corpo));
}

export async function gerarCodigo(d: DadosCodigo): Promise<string> {
  return finalizar(carga(d));
}

/** Gera um código no formato v2 antigo (só para os testes de compatibilidade). */
export async function gerarCodigoV2ParaTeste(d: DadosJogo & { categorias: number }): Promise<string> {
  const b = new Bits().push(2, 4).push(1, 2).push(d.jogo, 4).push(d.pontos, 20).push(d.nivel, 2).push(d.estilo, 4).push(d.categorias, 4)
    .push(d.acertos, 8).push(d.perguntas, 8).push(diaDe(d.data), 15).push(d.impressao, BITS_IMPRESSAO_JOGO);
  return finalizar(b);
}

export type Verificacao =
  | { ok: true; dados: DadosCodigo }
  | { ok: false; motivo: "formato" | "digito" | "assinatura" | "versao" };

export async function verificarCodigo(input: string): Promise<Verificacao> {
  const l = limpar(input);
  const chars = Math.ceil((BITS_CARGA + BITS_MAC) / 5);
  if (!l || l.corpo.length !== chars) return { ok: false, motivo: "formato" };
  if (digitoVerificador(l.corpo) !== l.dv) return { ok: false, motivo: "digito" };
  const all = unbase32(l.corpo, BITS_CARGA + BITS_MAC);
  if (all === null) return { ok: false, motivo: "formato" };
  const payload = all >> BigInt(BITS_MAC);
  const m = Number(all & 0xffffffffn);
  if ((await mac(payload)) !== m) return { ok: false, motivo: "assinatura" };

  const r = reader(payload, BITS_CARGA);
  const versao = r(4);
  if (versao !== VERSAO && versao !== VERSAO_JOGO_CATEGORIAS && versao !== VERSAO_JOGO_ESTILOS) return { ok: false, motivo: "versao" };
  const tipo = r(2);
  if (tipo === 0 && versao !== VERSAO) return { ok: false, motivo: "versao" };
  if (tipo === 0) {
    return {
      ok: true,
      dados: {
        tipo: "simulado",
        exame: r(7),
        variante: r(2),
        atualizado: r(1) === 1,
        total: r(10) / 100,
        peca: r(9) / 100,
        modo: MODOS[r(3)],
        data: dataDe(r(15)),
        duracaoMin: r(9),
        impressao: r(16),
      },
    };
  }
  const jogo = r(4);
  const pontos = r(versao === VERSAO_JOGO_ESTILOS ? 17 : 20);
  const nivel = r(2);
  const estilo = r(versao === VERSAO_JOGO_ESTILOS ? 7 : 4);
  const categorias = versao === VERSAO ? undefined : r(4);
  return {
    ok: true,
    dados: {
      tipo: "jogo",
      jogo,
      pontos,
      nivel,
      estilo,
      acertos: r(8),
      perguntas: r(8),
      data: dataDe(r(15)),
      impressao: r(categorias === undefined ? 11 : BITS_IMPRESSAO_JOGO),
      ...(categorias === undefined ? {} : { categorias }),
    },
  };
}

/** Impressão digital (n bits) de dados arbitrários, via SHA-256. */
export async function impressao(dados: unknown, bits: number): Promise<number> {
  const buf = new TextEncoder().encode(JSON.stringify(dados));
  const h = sha256(buf);
  const v = (h[0] << 16) | (h[1] << 8) | h[2];
  return v >>> (24 - bits);
}

export const impressaoHex = (n: number, bits: number) => n.toString(16).toUpperCase().padStart(Math.ceil(bits / 4), "0");
