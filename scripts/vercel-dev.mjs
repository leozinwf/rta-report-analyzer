import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

if (!existsSync(".env.local")) {
  process.stderr.write("Arquivo .env.local não encontrado. Copie .env.example e preencha as variáveis.\n");
  process.exit(1);
}

loadEnvFile(".env.local");

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const child = spawn(
  command,
  ["vercel", "dev", "--local", "--local-config", "vercel.dev.json", ...process.argv.slice(2)],
  {
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
  },
);

child.on("error", (error) => {
  process.stderr.write(`Não foi possível iniciar o Vercel CLI: ${error.message}\n`);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
