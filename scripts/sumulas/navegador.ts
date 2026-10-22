// Sessão de navegação para os sites de súmulas: um Chromium do patchright (Playwright sem as marcas de automação),
// saindo pelo proxy do projeto (PJE_PROXY, em ../.env), aquecido com a navegação por outros sites antes do STJ/STF.
// Uma sessão serve a várias páginas. Se a página fica presa numa verificação do Cloudflare, a leitura falha com a
// mensagem (o coletor não tenta contornar essa verificação).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../..", import.meta.url).pathname;

/** Sites comuns visitados antes do STJ e do STF, na mesma sessão. */
const AQUECIMENTO = ["https://www.google.com.br/", "https://pt.wikipedia.org/wiki/Direito_penal", "https://www.gov.br/"];

/** O proxy do projeto (PJE_PROXY, em ../.env), no formato do Playwright; sem ele, o acesso é direto. */
export function lerProxy(): { server: string; username?: string; password?: string } | undefined {
  const env = join(ROOT, "..", ".env");
  if (!existsSync(env)) return undefined;
  const valor = readFileSync(env, "utf8").match(/^PJE_PROXY=(.*)$/m)?.[1].trim().replace(/^['"]|['"]$/g, "");
  if (!valor) return undefined;
  const u = new URL(valor.includes("://") ? valor : `http://${valor}`);
  return { server: `${u.protocol}//${u.host}`, ...(u.username ? { username: decodeURIComponent(u.username), password: decodeURIComponent(u.password) } : {}) };
}

export interface Sessao {
  /** Abre a página e espera até `pronta` reconhecer o HTML; lança erro se não ficar pronta (ex.: verificação do Cloudflare). */
  ler(url: string, pronta: (html: string) => boolean, nome: string): Promise<string>;
  fechar(): Promise<void>;
}

export async function abrirSessao(opcoes: { visivel?: boolean } = {}): Promise<Sessao> {
  const { chromium } = await import("patchright");
  const proxy = lerProxy();
  const navegador = await chromium.launch({ channel: "chromium", headless: !opcoes.visivel, ...(proxy ? { proxy } : {}) });
  const contexto = await navegador.newContext({ locale: "pt-BR", viewport: { width: 1280, height: 900 } });
  const pagina = await contexto.newPage();
  for (const site of AQUECIMENTO) {
    await pagina.goto(site, { waitUntil: "domcontentloaded", timeout: 60_000 }).catch(() => {});
    await pagina.waitForTimeout(2_000 + Math.random() * 2_000);
  }
  return {
    async ler(url, pronta, nome) {
      try {
        await pagina.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
      } catch (erro) {
        const via = proxy ? `pelo proxy do projeto (${proxy.server})` : "direto, sem proxy";
        throw new Error(`não consegui abrir ${nome} ${via}: ${(erro as Error).message.split("\n")[0]}`);
      }
      for (let k = 0; k < 10; k++) {
        const html = await pagina.content();
        if (pronta(html)) return html;
        await pagina.waitForTimeout(2_000);
      }
      const travado = /Um momento|Just a moment|cf-chl|challenge-platform/i.test(await pagina.content());
      throw new Error(
        travado
          ? `${nome} está numa verificação do Cloudflare (${url}); a página não liberou sozinha`
          : `não consegui ler ${nome} (${url}); a página não tem o conteúdo esperado`,
      );
    },
    async fechar() {
      await navegador.close();
    },
  };
}
