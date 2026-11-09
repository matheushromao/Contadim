import { execSync } from 'node:child_process';

/** Aplica as migrations no banco de teste antes de rodar a suíte. */
export default function setup(): void {
  const url = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL;
  execSync('pnpm exec prisma migrate deploy', {
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: url },
  });
}
