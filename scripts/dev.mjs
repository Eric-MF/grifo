// `npm run dev`: regera o conteúdo, observa content/ e mantém o `next dev` de pé.
// Ao gravar pelo painel de revisão, o servidor pede (arquivo .cache/reiniciar-dev)
// que este script regere o conteúdo e reinicie o `next dev`.
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, rmSync, existsSync, watch } from "node:fs";
import { join } from "node:path";

const RAIZ = process.cwd();
const CACHE = join(RAIZ, ".cache");
const SINAL = "reiniciar-dev";
const host = process.env.GRIFO_HOST ?? "100.80.118.27";
const porta = process.env.GRIFO_PORT ?? "3100";

const gerar = (args = []) => spawnSync(process.execPath, ["scripts/build-content.ts", ...args], { stdio: "inherit", cwd: RAIZ });

if (gerar().status !== 0) process.exit(1);
spawnSync(process.execPath, ["scripts/gerar-zip-padrao.ts"], { stdio: "inherit", cwd: RAIZ });

const observador = spawn(process.execPath, ["scripts/build-content.ts", "--watch", "--quiet"], { stdio: "inherit", cwd: RAIZ });

let next = null;
let reiniciando = false;
let encerrando = false;

function subir() {
  next = spawn(process.execPath, [join(RAIZ, "node_modules/next/dist/bin/next"), "dev", "-H", host, "-p", porta], { stdio: "inherit", cwd: RAIZ });
  next.on("exit", (code) => {
    if (encerrando) return;
    if (reiniciando) {
      reiniciando = false;
      subir();
      return;
    }
    observador.kill();
    process.exit(code ?? 0);
  });
}

function reiniciar() {
  if (reiniciando || encerrando) return;
  reiniciando = true;
  console.log("[dev] reiniciando o servidor após a gravação");
  setTimeout(() => {
    gerar();
    next.kill("SIGTERM");
  }, 800);
}

mkdirSync(CACHE, { recursive: true });
watch(CACHE, (_, nome) => {
  if (nome !== SINAL || !existsSync(join(CACHE, SINAL))) return;
  rmSync(join(CACHE, SINAL), { force: true });
  reiniciar();
});

function encerrar() {
  encerrando = true;
  observador.kill();
  next?.kill("SIGTERM");
  process.exit(0);
}
process.on("SIGINT", encerrar);
process.on("SIGTERM", encerrar);

subir();
