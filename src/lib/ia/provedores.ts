// Provedores de IA para correção com a chave do próprio usuário.
// Para incluir um provedor: adicione uma entrada em PROVEDORES e, se a API não for
// compatível com o formato "chat completions", uma função em chamar().
// As chamadas vão DIRETO do navegador para o provedor — o Grifo não tem servidor.

import type { ProvedorId } from "./types";

interface ProvedorInfo {
  id: ProvedorId;
  nome: string;
  /** Sugestões de modelo (o campo é editável: provedores lançam modelos o tempo todo). */
  modelos: string[];
  ondeObterChave: string;
  formato: "anthropic" | "gemini" | "chat";
  endpoint?: string;
  /** Tipo de response_format aceito (APIs estilo chat completions). */
  json?: "schema" | "object";
}

/** Modelos com fallback de recusa no servidor (Opus 5, Opus 5.5 e Fable 5.1 casam com o prefixo). */
export const temFallback = (modelo: string) => /^claude-(opus-5|fable-5)/.test(modelo);

export const PROVEDORES: ProvedorInfo[] = [
  {
    id: "anthropic",
    nome: "Anthropic (Claude)",
    modelos: ["claude-opus-5", "claude-sonnet-5", "claude-haiku-4-5", "claude-opus-5-5", "claude-fable-5-1"],
    ondeObterChave: "https://console.anthropic.com/settings/keys",
    formato: "anthropic",
  },
  {
    id: "openai",
    nome: "OpenAI",
    modelos: ["gpt-5", "gpt-5-mini"],
    ondeObterChave: "https://platform.openai.com/api-keys",
    formato: "chat",
    endpoint: "https://api.openai.com/v1/chat/completions",
    json: "schema",
  },
  {
    id: "gemini",
    nome: "Google Gemini",
    modelos: ["gemini-2.5-pro", "gemini-2.5-flash"],
    ondeObterChave: "https://aistudio.google.com/app/apikey",
    formato: "gemini",
  },
  {
    id: "openrouter",
    nome: "OpenRouter (vários modelos)",
    modelos: ["anthropic/claude-opus-5", "openai/gpt-5", "google/gemini-2.5-pro"],
    ondeObterChave: "https://openrouter.ai/keys",
    formato: "chat",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    json: "object",
  },
  {
    id: "groq",
    nome: "Groq",
    modelos: ["llama-3.3-70b-versatile"],
    ondeObterChave: "https://console.groq.com/keys",
    formato: "chat",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    json: "object",
  },
  {
    id: "mistral",
    nome: "Mistral",
    modelos: ["mistral-large-latest"],
    ondeObterChave: "https://console.mistral.ai/api-keys",
    formato: "chat",
    endpoint: "https://api.mistral.ai/v1/chat/completions",
    json: "object",
  },
  {
    id: "deepseek",
    nome: "DeepSeek",
    modelos: ["deepseek-chat", "deepseek-reasoner"],
    ondeObterChave: "https://platform.deepseek.com/api_keys",
    formato: "chat",
    endpoint: "https://api.deepseek.com/chat/completions",
    json: "object",
  },
];

export const provedor = (id: ProvedorId) => PROVEDORES.find((p) => p.id === id)!;

export class ErroIA extends Error {
  constructor(
    message: string,
    public tipo: "chave" | "limite" | "cors" | "modelo" | "recusa" | "resposta" | "rede",
  ) {
    super(message);
  }
}

interface Pedido {
  provedor: ProvedorId;
  modelo: string;
  chave: string;
  sistema: string;
  usuario: string;
  schema: Record<string, unknown>;
  signal?: AbortSignal;
}

/** Envia o pedido e devolve o texto JSON da resposta. */
export async function chamar(p: Pedido): Promise<string> {
  const info = provedor(p.provedor);
  if (info.formato === "anthropic") return chamarAnthropic(p);
  if (info.formato === "gemini") return chamarGemini(p);
  return chamarChat(p, info);
}

async function chamarAnthropic(p: Pedido): Promise<string> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: p.chave, dangerouslyAllowBrowser: true, maxRetries: 1 });
  // Fallback de recusa no servidor: modelos com classificadores (Opus 5 / Fable 5.1 / Opus 5.5)
  // reexecutam o pedido em outro modelo em vez de devolver a recusa.
  const comFallback = temFallback(p.modelo);
  try {
    const stream = client.beta.messages.stream(
      {
        model: p.modelo,
        max_tokens: 32000,
        system: p.sistema,
        messages: [{ role: "user", content: p.usuario }],
        output_config: { effort: "high", format: { type: "json_schema", schema: p.schema } },
        ...(comFallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
      },
      { signal: p.signal },
    );
    const msg = await stream.finalMessage();
    if (msg.stop_reason === "refusal") throw new ErroIA("O modelo se recusou a corrigir esta resposta.", "recusa");
    if (msg.stop_reason === "max_tokens") throw new ErroIA("A resposta da IA foi cortada (limite de tokens).", "resposta");
    const texto = msg.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    if (!texto) throw new ErroIA("A IA não devolveu texto.", "resposta");
    return texto;
  } catch (e) {
    if (e instanceof ErroIA) throw e;
    if (e instanceof Anthropic.AuthenticationError) throw new ErroIA("Chave da Anthropic inválida.", "chave");
    if (e instanceof Anthropic.PermissionDeniedError) throw new ErroIA("Sua chave não tem permissão para este modelo.", "chave");
    if (e instanceof Anthropic.NotFoundError) throw new ErroIA(`Modelo "${p.modelo}" não encontrado.`, "modelo");
    if (e instanceof Anthropic.RateLimitError) throw new ErroIA("Limite de uso atingido. Tente de novo em instantes.", "limite");
    if (e instanceof Anthropic.BadRequestError) throw new ErroIA(`Pedido recusado pela API: ${e.message}`, "modelo");
    if (e instanceof Anthropic.APIConnectionError) throw new ErroIA("Falha de conexão com a Anthropic.", "rede");
    if (e instanceof Anthropic.APIError) throw new ErroIA(`Erro da API (${e.status}): ${e.message}`, "rede");
    throw e;
  }
}

async function erroHttp(r: Response, nome: string): Promise<never> {
  const corpo = await r.text().catch(() => "");
  if (r.status === 401 || r.status === 403) throw new ErroIA(`Chave do ${nome} inválida ou sem permissão.`, "chave");
  if (r.status === 404) throw new ErroIA(`Modelo não encontrado no ${nome}.`, "modelo");
  if (r.status === 429) throw new ErroIA(`Limite de uso do ${nome} atingido.`, "limite");
  throw new ErroIA(`Erro ${r.status} do ${nome}: ${corpo.slice(0, 200)}`, "rede");
}

async function fetchSeguro(url: string, init: RequestInit, nome: string) {
  try {
    return await fetch(url, init);
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ErroIA(
      `Não foi possível falar com o ${nome} a partir do navegador (rede ou bloqueio CORS do provedor). Tente o OpenRouter, que aceita chamadas do navegador.`,
      "cors",
    );
  }
}

async function chamarChat(p: Pedido, info: ProvedorInfo): Promise<string> {
  const response_format =
    info.json === "schema"
      ? { type: "json_schema", json_schema: { name: "correcao", schema: p.schema, strict: false } }
      : { type: "json_object" };
  const headers: Record<string, string> = { "Content-Type": "application/json", Authorization: `Bearer ${p.chave}` };
  if (info.id === "openrouter") {
    headers["HTTP-Referer"] = "https://www.grifo.com";
    headers["X-Title"] = "Grifo";
  }
  const r = await fetchSeguro(
    info.endpoint!,
    {
      method: "POST",
      headers,
      signal: p.signal,
      body: JSON.stringify({
        model: p.modelo,
        messages: [
          { role: "system", content: p.sistema },
          { role: "user", content: p.usuario },
        ],
        response_format,
      }),
    },
    info.nome,
  );
  if (!r.ok) await erroHttp(r, info.nome);
  const j = await r.json();
  const texto = j?.choices?.[0]?.message?.content;
  if (!texto) throw new ErroIA("A IA não devolveu conteúdo.", "resposta");
  return texto;
}

async function chamarGemini(p: Pedido): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(p.modelo)}:generateContent`;
  const r = await fetchSeguro(
    url,
    {
      method: "POST",
      // chave no header (não na URL), para não aparecer em logs e histórico
      headers: { "Content-Type": "application/json", "x-goog-api-key": p.chave },
      signal: p.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: p.sistema }] },
        contents: [{ role: "user", parts: [{ text: p.usuario }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    },
    "Gemini",
  );
  if (!r.ok) await erroHttp(r, "Gemini");
  const j = await r.json();
  const texto = j?.candidates?.[0]?.content?.parts?.map((x: { text?: string }) => x.text ?? "").join("");
  if (!texto) throw new ErroIA("O Gemini não devolveu conteúdo.", "resposta");
  return texto;
}
