import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

/** `.env` único na raiz do monorepo (apps/api/{src,dist}/config → raiz). */
const ROOT_ENV_PATH = fileURLToPath(new URL('../../../../.env', import.meta.url));

/**
 * Carrega o `.env` da raiz do repositório, se existir.
 * Variáveis já definidas no ambiente (Docker, CI, shell) têm prioridade.
 */
export function loadRootEnv(path: string = ROOT_ENV_PATH): void {
  if (!existsSync(path)) return;
  const parsed = parseEnv(readFileSync(path, 'utf8'));
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined && value !== undefined) {
      process.env[key] = value;
    }
  }
}
