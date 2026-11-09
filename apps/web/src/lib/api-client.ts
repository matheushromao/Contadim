import {
  type AuthResponse,
  CSRF_HEADER,
  CSRF_HEADER_VALUE,
  type ErrorCode,
  type ErrorResponse,
} from '@contadim/contracts';

export const API_URL: string = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1';

export type ApiErrorCode = ErrorCode | 'NETWORK_ERROR';

/** Erro da API já no formato padronizado, pronto para mostrar na tela. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Erros de validação por campo (`details` = `[{ path, message }]`). */
  get fieldErrors(): Record<string, string> {
    if (!Array.isArray(this.details)) return {};
    const result: Record<string, string> = {};
    for (const item of this.details as { path?: unknown; message?: unknown }[]) {
      if (typeof item.path === 'string' && typeof item.message === 'string') {
        result[item.path] ??= item.message;
      }
    }
    return result;
  }
}

interface SessionListener {
  onSession: (session: AuthResponse) => void;
  onSessionLost: () => void;
}

/** O access token fica só em memória (nunca em localStorage). */
let accessToken: string | null = null;
let listener: SessionListener | null = null;
let refreshing: Promise<AuthResponse | null> | null = null;

export const session = {
  set(auth: AuthResponse) {
    accessToken = auth.accessToken;
  },
  clear() {
    accessToken = null;
  },
  listen(next: SessionListener) {
    listener = next;
    return () => {
      if (listener === next) listener = null;
    };
  },
};

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as ErrorResponse;
    return new ApiError(response.status, body.error.code, body.error.message, body.error.details);
  } catch {
    return new ApiError(response.status, 'INTERNAL_ERROR', 'Algo deu errado. Tente novamente');
  }
}

async function doRefresh(): Promise<AuthResponse | null> {
  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { [CSRF_HEADER]: CSRF_HEADER_VALUE },
    });
    if (!response.ok) {
      accessToken = null;
      return null;
    }
    const auth = (await response.json()) as AuthResponse;
    accessToken = auth.accessToken;
    listener?.onSession(auth);
    return auth;
  } catch {
    return null;
  }
}

/**
 * Renova a sessão usando o cookie httpOnly. Chamadas simultâneas compartilham a mesma
 * requisição: assim o refresh token nunca é usado duas vezes (o que encerraria a sessão).
 */
export function refreshSession(): Promise<AuthResponse | null> {
  refreshing ??= doRefresh().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
  /** Envia o access token (padrão: true). */
  auth?: boolean;
  /** Header anti-CSRF exigido por refresh e logout. */
  csrf?: boolean;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const search = params.toString();
  return `${API_URL}${path}${search ? `?${search}` : ''}`;
}

/** Cliente HTTP da API: JSON, erros padronizados e renovação automática de sessão. */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, auth = true, csrf = false, signal } = options;

  const send = () => {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;
    if (csrf) headers[CSRF_HEADER] = CSRF_HEADER_VALUE;
    return fetch(buildUrl(path, query), {
      method,
      headers,
      credentials: 'include',
      ...(body !== undefined && { body: JSON.stringify(body) }),
      ...(signal && { signal }),
    });
  };

  let response: Response;
  try {
    response = await send();
    if (response.status === 401 && auth) {
      const renewed = await refreshSession();
      if (!renewed) {
        listener?.onSessionLost();
        throw await toApiError(response);
      }
      response = await send();
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'NETWORK_ERROR', 'Sem conexão com o servidor. Confira sua internet');
  }

  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
