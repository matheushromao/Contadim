/** localStorage tolerante a falhas (modo privado, bloqueio de cookies etc.). */
export const storage = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Sem persistência: tudo bem, é só uma conveniência.
    }
  },
};

export const LAST_ACCOUNT_KEY = 'contadim:last-account-id';
