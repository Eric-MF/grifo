// Sobe o site já construído (out/) numa porta local e roda os testes e2e: npm run e2e
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as esperar } from "node:timers/promises";
import { join } from "node:path";

process.chdir(join(import.meta.dirname, "..", ".."));

const PORTA = process.env.E2E_PORT ?? "3101";
const BASE = `http://127.0.0.1:${PORTA}`;
// poderes e fim-de-jogo usam window.__flap (?debug=1), que só existe fora de produção: rodam contra next dev
const TESTES = ["leis", "provas", "quiz-categorias", "treino-recorde", "treino-voz", "tela-acesa", "menu-navegacao", "mobile", "estatisticas"];

const servidor = spawn("npx", ["--yes", "serve", process.env.E2E_OUT ?? "out", "-l", `tcp://127.0.0.1:${PORTA}`], { stdio: "ignore", detached: true });
try {
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(BASE);
      break;
    } catch {
      await esperar(200);
    }
  }
  const falhas = TESTES.filter((t) => spawnSync("node", [`tests/e2e/${t}.mjs`, BASE], { stdio: "inherit" }).status !== 0);
  if (falhas.length) console.error(`e2e com falha: ${falhas.join(", ")}`);
  process.exitCode = falhas.length ? 1 : 0;
} finally {
  process.kill(-servidor.pid);
}
